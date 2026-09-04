using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AutoMapper;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffService : IStaffService
    {
        private readonly IStaffRepository _staffRepository;
        private readonly IStaffSubjectAllocationRepository _allocationRepository;
        private readonly ISubjectRepository _subjectRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITimetableRepository _timetableRepository;
        private readonly IDesignationRepository _designationRepository;
        private readonly IBoardRepository _boardRepository;
        private readonly IEmailService _emailService;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        private const decimal HoursPerClassPeriod = 1.0m;
        private const long MaxPhotoFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private const long MaxDocFileSizeBytes = 10 * 1024 * 1024; // 10 MB
        private static readonly string[] AllowedPhotoExtensions = { ".jpg", ".jpeg", ".png" };
        private static readonly string[] AllowedDocExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };

        public StaffService(
            IStaffRepository staffRepository,
            IStaffSubjectAllocationRepository allocationRepository,
            ISubjectRepository subjectRepository,
            IDepartmentRepository departmentRepository,
            ITimetableRepository timetableRepository,
            IDesignationRepository designationRepository,
            IBoardRepository boardRepository,
            IEmailService emailService,
            IMapper mapper,
            IWebHostEnvironment environment,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _staffRepository = staffRepository;
            _allocationRepository = allocationRepository;
            _subjectRepository = subjectRepository;
            _departmentRepository = departmentRepository;
            _timetableRepository = timetableRepository;
            _designationRepository = designationRepository;
            _boardRepository = boardRepository;
            _emailService = emailService;
            _mapper = mapper;
            _environment = environment;
            _configuration = configuration;
        }

        public async Task<PagedResult<StaffResponseDto>> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            var (staffs, totalCount) = await _staffRepository.GetPagedStaffAsync(queryParams);
            var dtos = _mapper.Map<List<StaffResponseDto>>(staffs);

            return new PagedResult<StaffResponseDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                PageNumber = queryParams.PageNumber,
                PageSize = queryParams.PageSize
            };
        }

        public async Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null)
        {
            return await _staffRepository.GetStaffDropdownAsync(staffType);
        }

        public async Task<StaffResponseDto?> GetStaffByIdAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffResponseDto?> GetStaffByEmployeeIdAsync(string employeeId)
        {
            var staff = await _staffRepository.GetByEmployeeIdAsync(employeeId);
            if (staff == null)
                throw new NotFoundException($"Staff record with Employee ID {employeeId} not found.");

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffProfileFullDto> GetStaffProfileFullAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> GetStaffProfileByTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                throw new ValidationException("Token cannot be empty.");

            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile link token.");

            return MapToFullProfileDto(staff);
        }

        public async Task<string> GetNextEmployeeIdAsync(string staffType)
        {
            return await _staffRepository.GenerateNextEmployeeIdAsync(staffType);
        }

        public async Task<StaffDashboardStatsDto> GetDashboardStatsAsync()
        {
            return await _staffRepository.GetDashboardStatsAsync();
        }

        public async Task<StaffResponseDto> CreateStaffAsync(CreateStaffDto dto)
        {
            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? "Teaching" : dto.StaffType.Trim();

            // Auto generate Employee ID if not supplied or empty
            string employeeId = dto.EmployeeId?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(employeeId))
            {
                employeeId = await _staffRepository.GenerateNextEmployeeIdAsync(staffType);
            }

            // Uniqueness Validations
            if (!await _staffRepository.IsEmployeeIdUniqueAsync(employeeId))
                throw new ConflictException($"Employee ID '{employeeId}' is already registered.");

            if (!await _staffRepository.IsEmailUniqueAsync(dto.Email))
                throw new ConflictException($"Email address '{dto.Email}' is already registered.");

            if (!await _staffRepository.IsMobileUniqueAsync(dto.Mobile))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered.");

            if (!string.IsNullOrWhiteSpace(dto.Aadhaar) && !await _staffRepository.IsAadhaarUniqueAsync(dto.Aadhaar))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered.");

            // Department resolution
            int? resolvedDepartmentId = dto.DepartmentId;
            string deptName = dto.Department?.Trim() ?? string.Empty;

            if (resolvedDepartmentId.HasValue && resolvedDepartmentId.Value > 0)
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var found = depts.FirstOrDefault(d => d.DepartmentId == resolvedDepartmentId.Value);
                if (found != null)
                {
                    deptName = found.DepartmentName;
                }
            }
            else if (!string.IsNullOrWhiteSpace(deptName))
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var dept = depts?.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));

                if (dept != null)
                {
                    resolvedDepartmentId = dept.DepartmentId;
                    deptName = dept.DepartmentName;
                }
                else
                {
                    var newDept = new Department
                    {
                        DepartmentName = deptName,
                        DepartmentCode = $"DEP_{deptName.Substring(0, Math.Min(8, deptName.Length)).ToUpper().Replace(" ", "")}",
                        StaffType = staffType,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    var createdDept = await _departmentRepository.AddDepartmentAsync(newDept);
                    resolvedDepartmentId = createdDept.DepartmentId;
                }
            }

            if (!resolvedDepartmentId.HasValue || resolvedDepartmentId.Value <= 0)
            {
                var depts = (await _departmentRepository.GetDepartmentsAsync()).ToList();
                var defaultDept = depts.FirstOrDefault(d => string.Equals(d.StaffType, staffType, StringComparison.OrdinalIgnoreCase)) ?? depts.FirstOrDefault();
                if (defaultDept != null)
                {
                    resolvedDepartmentId = defaultDept.DepartmentId;
                    deptName = defaultDept.DepartmentName;
                }
            }

            // Designation resolution
            int? resolvedDesignationId = dto.DesignationId;
            string resolvedDesignationName = dto.Designation?.Trim() ?? string.Empty;

            if (resolvedDesignationId.HasValue && resolvedDesignationId.Value > 0)
            {
                var desig = await _designationRepository.GetByIdAsync(resolvedDesignationId.Value);
                if (desig != null)
                {
                    resolvedDesignationName = desig.Name;
                }
            }
            else if (!string.IsNullOrWhiteSpace(resolvedDesignationName))
            {
                var desig = await _designationRepository.GetByNameAsync(resolvedDesignationName);
                if (desig != null)
                {
                    resolvedDesignationId = desig.Id;
                    resolvedDesignationName = desig.Name;
                }
                else
                {
                    var newDesig = new Designation
                    {
                        Name = resolvedDesignationName,
                        StaffType = staffType,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    var createdDesig = await _designationRepository.AddAsync(newDesig);
                    resolvedDesignationId = createdDesig.Id;
                }
            }

            if (!resolvedDesignationId.HasValue || resolvedDesignationId.Value <= 0)
            {
                var desigs = (await _designationRepository.GetAllAsync()).ToList();
                var defaultDesig = desigs.FirstOrDefault(d => string.Equals(d.StaffType, staffType, StringComparison.OrdinalIgnoreCase)) ?? desigs.FirstOrDefault();
                if (defaultDesig != null)
                {
                    resolvedDesignationId = defaultDesig.Id;
                    resolvedDesignationName = defaultDesig.Name;
                }
            }

            var staff = _mapper.Map<Staff>(dto);
            staff.EmployeeId = employeeId;
            staff.StaffType = staffType;
            staff.DepartmentId = resolvedDepartmentId;
            staff.Department = deptName;
            staff.DesignationId = resolvedDesignationId;
            staff.Designation = resolvedDesignationName;
            staff.BoardId = dto.BoardId;
            staff.BoardName = dto.BoardName ?? dto.Board;
            staff.ProfileStatus = "PendingLink";
            staff.ProfileCompletionPercentage = 30;
            staff.ProfileLinkToken = Guid.NewGuid().ToString("N");
            staff.JoiningDate = dto.JoiningDate ?? DateTime.UtcNow;

            var createdStaff = await _staffRepository.AddAsync(staff);
            createdStaff.Department = deptName;
            return _mapper.Map<StaffResponseDto>(createdStaff);
        }

        public async Task<StaffResponseDto> UpdateStaffAsync(int id, UpdateStaffDto dto)
        {
            var existingStaff = await _staffRepository.GetByIdAsync(id);
            if (existingStaff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            // Uniqueness Validations
            if (!await _staffRepository.IsEmailUniqueAsync(dto.Email, id))
                throw new ConflictException($"Email address '{dto.Email}' is already registered to another staff member.");

            if (!await _staffRepository.IsMobileUniqueAsync(dto.Mobile, id))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered to another staff member.");

            if (!string.IsNullOrWhiteSpace(dto.Aadhaar) && !await _staffRepository.IsAadhaarUniqueAsync(dto.Aadhaar, id))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered to another staff member.");

            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? existingStaff.StaffType : dto.StaffType.Trim();

            // Department resolution
            int? resolvedDepartmentId = dto.DepartmentId;
            string deptName = dto.Department?.Trim() ?? string.Empty;

            if (resolvedDepartmentId.HasValue && resolvedDepartmentId.Value > 0)
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var found = depts.FirstOrDefault(d => d.DepartmentId == resolvedDepartmentId.Value);
                if (found != null)
                {
                    deptName = found.DepartmentName;
                }
            }
            else if (!string.IsNullOrWhiteSpace(deptName))
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var dept = depts?.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));

                if (dept != null)
                {
                    resolvedDepartmentId = dept.DepartmentId;
                    deptName = dept.DepartmentName;
                }
            }
            else
            {
                resolvedDepartmentId = existingStaff.DepartmentId;
                deptName = existingStaff.Department;
            }

            // Designation resolution
            int? resolvedDesignationId = dto.DesignationId;
            string resolvedDesignationName = dto.Designation?.Trim() ?? string.Empty;

            if (resolvedDesignationId.HasValue && resolvedDesignationId.Value > 0)
            {
                var desig = await _designationRepository.GetByIdAsync(resolvedDesignationId.Value);
                if (desig != null)
                {
                    resolvedDesignationName = desig.Name;
                }
            }
            else if (!string.IsNullOrWhiteSpace(resolvedDesignationName))
            {
                var desig = await _designationRepository.GetByNameAsync(resolvedDesignationName);
                if (desig != null)
                {
                    resolvedDesignationId = desig.Id;
                    resolvedDesignationName = desig.Name;
                }
            }
            else
            {
                resolvedDesignationId = existingStaff.DesignationId;
                resolvedDesignationName = existingStaff.Designation;
            }

            _mapper.Map(dto, existingStaff);
            existingStaff.StaffType = staffType;
            existingStaff.DepartmentId = resolvedDepartmentId;
            existingStaff.Department = deptName;
            existingStaff.DesignationId = resolvedDesignationId;
            existingStaff.Designation = resolvedDesignationName;
            existingStaff.BoardId = dto.BoardId ?? existingStaff.BoardId;
            existingStaff.BoardName = dto.BoardName ?? dto.Board ?? existingStaff.BoardName;

            if (dto.JoiningDate.HasValue)
            {
                existingStaff.JoiningDate = dto.JoiningDate.Value;
            }

            // Recalculate percentage
            existingStaff.ProfileCompletionPercentage = CalculateCompletionPercentage(existingStaff);

            await _staffRepository.UpdateAsync(existingStaff);
            return _mapper.Map<StaffResponseDto>(existingStaff);
        }

        public async Task<bool> DeleteStaffAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            await _staffRepository.SoftDeleteAsync(staff);
            return true;
        }

        public async Task<SendProfileLinkResponseDto> SendProfileLinkAsync(int id, SendProfileLinkRequestDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var validityDays = dto.ValidityDays > 0 ? dto.ValidityDays : 7;
            var token = string.IsNullOrWhiteSpace(staff.ProfileLinkToken) ? Guid.NewGuid().ToString("N") : staff.ProfileLinkToken;
            var sentAt = DateTime.UtcNow;
            var expiresAt = sentAt.AddDays(validityDays);

            staff.ProfileLinkToken = token;
            staff.ProfileLinkSentAt = sentAt;
            staff.ProfileLinkExpiresAt = expiresAt;
            if (staff.ProfileStatus == "PendingLink" || string.IsNullOrWhiteSpace(staff.ProfileStatus))
            {
                staff.ProfileStatus = "LinkSent";
            }
            await _staffRepository.UpdateAsync(staff);

            var toEmail = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : staff.Email;
            var staffFullName = string.IsNullOrWhiteSpace(staff.MiddleName) ? $"{staff.FirstName} {staff.LastName}".Trim() : $"{staff.FirstName} {staff.MiddleName} {staff.LastName}".Trim();

            var institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? (!string.IsNullOrWhiteSpace(staff.BoardName) ? staff.BoardName : "College Management System");
            var portalBase = _configuration["InstitutionSettings:PortalUrl"] ?? "http://localhost:5173";
            var profileUrl = $"{portalBase.TrimEnd('/')}/staff-portal/{token}";

            // Send Email Notification
            try
            {
                if (!string.IsNullOrWhiteSpace(toEmail))
                {
                    var emailBody = $@"
                    <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;"">
                        <div style=""background-color: #2e7d32; color: white; padding: 20px; text-align: center;"">
                            <h2 style=""margin: 0; font-size: 22px; text-transform: uppercase;"">{institutionName}</h2>
                            <p style=""margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;"">Complete Your Staff Profile</p>
                        </div>
                        <div style=""padding: 24px; color: #333333; line-height: 1.6;"">
                            <p style=""font-size: 16px; margin-top: 0;"">Dear <strong>{staffFullName}</strong> ({staff.EmployeeId}),</p>
                            <p>{dto.CustomMessage ?? $"You are invited to complete your official staff profile for {institutionName}. Please use the secure link below to fill your personal, address, qualification, and document details."}</p>
                            <div style=""text-align: center; margin: 30px 0;"">
                                <a href=""{profileUrl}"" style=""background-color: #2e7d32; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 15px;"">Complete Your Profile</a>
                            </div>
                            <p style=""font-size: 13px; color: #666666;"">This link is valid for <strong>{validityDays} days</strong> (Expires on {expiresAt:dd MMM yyyy}).</p>
                            <hr style=""border: none; border-top: 1px solid #eee; margin: 20px 0;"" />
                            <p style=""font-size: 12px; color: #888888; margin-bottom: 0;"">Regards,<br /><strong>{institutionName} Administration</strong></p>
                        </div>
                    </div>";

                    await _emailService.SendEmailAsync(toEmail, $"Complete Your Staff Profile - {institutionName}", emailBody);
                }
            }
            catch
            {
                // Fallback gracefully without failing link generation
            }

            return new SendProfileLinkResponseDto
            {
                Success = true,
                Message = "Profile completion link sent successfully.",
                Token = token,
                ProfileLink = profileUrl,
                SentAt = sentAt,
                ExpiresAt = expiresAt
            };
        }

        public async Task<StaffBulkSendResultDto> BulkSendProfileLinksAsync(StaffBulkSendLinksDto dto)
        {
            var result = new StaffBulkSendResultDto
            {
                TotalRequested = dto.StaffIds.Count
            };

            var validityDays = dto.ValidityDays > 0 ? dto.ValidityDays : 7;
            var sentAt = DateTime.UtcNow;
            var expiresAt = sentAt.AddDays(validityDays);

            foreach (var id in dto.StaffIds)
            {
                try
                {
                    await SendProfileLinkAsync(id, new SendProfileLinkRequestDto
                    {
                        ValidityDays = validityDays,
                        CustomMessage = dto.CustomMessage
                    });
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Messages.Add($"Staff ID {id}: {ex.Message}");
                }
            }

            return result;
        }

        public async Task<StaffProfileFullDto> SaveProfileDraftAsync(int id, UpdateStaffProfileSectionDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            ApplySectionUpdate(staff, dto);

            // Calculate percentage
            var percentage = CalculateCompletionPercentage(staff);
            staff.ProfileCompletionPercentage = percentage;

            // 30% Threshold Workflow Rule:
            if (percentage > 30 && (staff.ProfileStatus == "PendingLink" || staff.ProfileStatus == "LinkSent" || string.IsNullOrWhiteSpace(staff.ProfileStatus)))
            {
                staff.ProfileStatus = "InProgress";
            }

            await _staffRepository.UpdateAsync(staff);
            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> SaveProfileDraftByTokenAsync(string token, UpdateStaffProfileSectionDto dto)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await SaveProfileDraftAsync(staff.Id, dto);
        }

        public async Task<StaffProfileFullDto> SubmitProfileAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            staff.ProfileStatus = "Submitted";
            staff.SubmittedAt = DateTime.UtcNow;
            staff.ProfileCompletionPercentage = 100;
            await _staffRepository.UpdateAsync(staff);

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> SubmitProfileByTokenAsync(string token)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await SubmitProfileAsync(staff.Id);
        }

        public async Task<StaffResponseDto> AdminReviewProfileAsync(int id, AdminReviewStaffDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            if (string.Equals(dto.Action, "Approve", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "Completed";
                staff.ApprovedAt = DateTime.UtcNow;
                staff.CorrectionNotes = null;
            }
            else if (string.Equals(dto.Action, "RequestCorrection", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "NeedsCorrection";
                staff.CorrectionRequestedAt = DateTime.UtcNow;
                staff.CorrectionNotes = dto.CorrectionNotes?.Trim();
            }
            else
            {
                throw new ValidationException($"Invalid review action '{dto.Action}'. Supported actions: 'Approve', 'RequestCorrection'.");
            }

            await _staffRepository.UpdateAsync(staff);
            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffProfileFullDto> UploadDocumentAsync(int staffId, string documentType, IFormFile file)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {staffId} not found.");

            if (file == null || file.Length == 0)
                throw new ValidationException("Please choose a file to upload.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedDocExtensions.Contains(ext))
                throw new ValidationException($"Invalid file type '{ext}'. Only PDF and image files are accepted.");

            if (file.Length > MaxDocFileSizeBytes)
                throw new ValidationException("File size exceeds maximum allowed limit of 10 MB.");

            var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "staff-documents");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            var safeDocType = documentType.Replace(" ", "").Replace("/", "");
            var fileName = $"staff_{staffId}_{safeDocType}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var physicalPath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"/uploads/staff-documents/{fileName}";

            var docList = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            // Remove existing item of same documentType if present
            docList.RemoveAll(d => string.Equals(d.DocumentType, documentType, StringComparison.OrdinalIgnoreCase));

            docList.Add(new StaffDocumentItem
            {
                DocumentType = documentType,
                DocumentName = file.FileName,
                FileName = fileName,
                FilePath = relativePath,
                FileType = ext.TrimStart('.').ToUpper(),
                FileSizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            });

            staff.DocumentsJson = JsonSerializer.Serialize(docList);
            staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);
            await _staffRepository.UpdateAsync(staff);

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> UploadDocumentByTokenAsync(string token, string documentType, IFormFile file)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await UploadDocumentAsync(staff.Id, documentType, file);
        }

        public async Task<StaffProfileFullDto> DeleteDocumentAsync(int staffId, string documentType)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {staffId} not found.");

            var docList = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            var item = docList.FirstOrDefault(d => string.Equals(d.DocumentType, documentType, StringComparison.OrdinalIgnoreCase));
            if (item != null)
            {
                // Attempt to delete physical file
                try
                {
                    var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var physicalPath = Path.Combine(webRoot, item.FilePath.TrimStart('/'));
                    if (File.Exists(physicalPath))
                    {
                        File.Delete(physicalPath);
                    }
                }
                catch { }

                docList.Remove(item);
                staff.DocumentsJson = JsonSerializer.Serialize(docList);
                staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);
                await _staffRepository.UpdateAsync(staff);
            }

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> DeleteDocumentByTokenAsync(string token, string documentType)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await DeleteDocumentAsync(staff.Id, documentType);
        }

        public async Task<StaffImportResultDto> ImportStaffFromExcelAsync(IFormFile file, string? defaultStaffType = null)
        {
            if (file == null || file.Length == 0)
                throw new ValidationException("Please upload a valid Excel file (.xlsx).");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new ValidationException("Unsupported file format. Please upload an Excel workbook (.xlsx).");

            var result = new StaffImportResultDto();
            var departments = (await _departmentRepository.GetDepartmentsAsync()).ToList();
            var designations = (await _designationRepository.GetAllAsync()).ToList();
            var boards = (await _boardRepository.GetBoardsForExportAsync(new BoardExportRequest())).ToList();

            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
                throw new ValidationException("Excel file contains no worksheets.");

            var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();
            if (rows == null || rows.Count < 2)
                throw new ValidationException("Excel worksheet is empty or missing data rows.");

            // Read header row
            var headerRow = rows[0];
            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (int col = 1; col <= headerRow.Cells().Count(); col++)
            {
                var val = headerRow.Cell(col).GetString().Trim();
                if (!string.IsNullOrWhiteSpace(val) && !headerMap.ContainsKey(val))
                {
                    headerMap[val] = col;
                }
            }

            // Helper to get cell value
            string GetVal(IXLRangeRow row, params string[] names)
            {
                foreach (var name in names)
                {
                    if (headerMap.TryGetValue(name, out int colIdx))
                    {
                        var cellVal = row.Cell(colIdx).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(cellVal)) return cellVal;
                    }
                }
                return string.Empty;
            }

            result.TotalRowsRead = rows.Count - 1;
            var toAdd = new List<Staff>();

            for (int i = 1; i < rows.Count; i++)
            {
                var rowNumber = i + 1;
                var row = rows[i];

                var empId = GetVal(row, "Employee ID", "EmployeeId", "EmpId", "Employee_ID");
                var fName = GetVal(row, "First Name", "FirstName", "First_Name", "Name");
                var mName = GetVal(row, "Middle Name", "MiddleName", "Middle_Name");
                var lName = GetVal(row, "Last Name", "LastName", "Last_Name", "Surname");
                var sType = GetVal(row, "Staff Type", "StaffType", "Staff_Type", "FacultyType");
                var deptName = GetVal(row, "Department", "DepartmentName", "Dept");
                var desigName = GetVal(row, "Designation", "DesignationName", "Role");
                var boardName = GetVal(row, "Board", "Board Name", "BoardName");
                var gender = GetVal(row, "Gender", "Sex");
                var dobStr = GetVal(row, "Date of Birth", "DateOfBirth", "DOB");
                var mobile = GetVal(row, "Mobile", "Mobile Number", "Phone", "MobileNumber");
                var email = GetVal(row, "Email", "Email Address", "EmailAddress");
                var joinStr = GetVal(row, "Joining Date", "JoiningDate", "Date of Joining", "DateOfJoining");
                var expStr = GetVal(row, "Experience", "Experience (Years)", "ExperienceYears");
                var status = GetVal(row, "Status", "Employment Status");

                // Determine staff type
                if (string.IsNullOrWhiteSpace(sType))
                {
                    sType = !string.IsNullOrWhiteSpace(defaultStaffType) ? defaultStaffType : "Teaching";
                }
                else if (sType.IndexOf("non", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    sType = "Non-Teaching";
                }
                else
                {
                    sType = "Teaching";
                }

                // Row Validations
                if (string.IsNullOrWhiteSpace(fName))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, ErrorMessage = "First Name is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Valid Email address is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Mobile number is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Uniqueness check in DB & in current batch
                if (toAdd.Any(x => x.Email.Equals(email, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmailUniqueAsync(email))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Email '{email}' is already registered." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (toAdd.Any(x => x.Mobile == mobile) || !await _staffRepository.IsMobileUniqueAsync(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Mobile '{mobile}' is already registered." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Auto-generate employee ID if empty or validate uniqueness
                if (string.IsNullOrWhiteSpace(empId))
                {
                    empId = await _staffRepository.GenerateNextEmployeeIdAsync(sType);
                }
                else if (toAdd.Any(x => x.EmployeeId == empId) || !await _staffRepository.IsEmployeeIdUniqueAsync(empId))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, EmployeeId = empId, StaffName = fName, ErrorMessage = $"Employee ID '{empId}' already exists." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Department Resolution
                int? deptId = null;
                if (!string.IsNullOrWhiteSpace(deptName))
                {
                    var foundDept = departments.FirstOrDefault(d =>
                        string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));
                    if (foundDept != null)
                    {
                        deptId = foundDept.DepartmentId;
                        deptName = foundDept.DepartmentName;
                    }
                    else
                    {
                        // Dynamically create department
                        var newDept = new Department
                        {
                            DepartmentName = deptName,
                            DepartmentCode = $"DEP_{deptName.Substring(0, Math.Min(8, deptName.Length)).ToUpper().Replace(" ", "")}",
                            StaffType = sType,
                            IsActive = true
                        };
                        var created = await _departmentRepository.AddDepartmentAsync(newDept);
                        deptId = created.DepartmentId;
                        departments.Add(created);
                    }
                }

                // Designation Resolution
                int? desigId = null;
                if (!string.IsNullOrWhiteSpace(desigName))
                {
                    var foundDesig = designations.FirstOrDefault(d => string.Equals(d.Name, desigName, StringComparison.OrdinalIgnoreCase));
                    if (foundDesig != null)
                    {
                        desigId = foundDesig.Id;
                        desigName = foundDesig.Name;
                    }
                    else
                    {
                        var newDesig = new Designation
                        {
                            Name = desigName,
                            StaffType = sType,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        var created = await _designationRepository.AddAsync(newDesig);
                        desigId = created.Id;
                        designations.Add(created);
                    }
                }

                // Board Resolution
                int? boardId = null;
                if (!string.IsNullOrWhiteSpace(boardName))
                {
                    var foundBoard = boards.FirstOrDefault(b =>
                        string.Equals(b.BoardName, boardName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(b.BoardCode, boardName, StringComparison.OrdinalIgnoreCase));
                    if (foundBoard != null)
                    {
                        boardId = foundBoard.BoardId;
                        boardName = foundBoard.BoardName;
                    }
                }

                // Dates parsing
                var dob = DateTime.TryParse(dobStr, out var parsedDob) ? parsedDob : new DateTime(1990, 1, 1);
                var joinDate = DateTime.TryParse(joinStr, out var parsedJoin) ? parsedJoin : DateTime.UtcNow;
                decimal.TryParse(expStr, out var exp);

                var staff = new Staff
                {
                    EmployeeId = empId,
                    FirstName = fName,
                    MiddleName = mName,
                    LastName = string.IsNullOrWhiteSpace(lName) ? "." : lName,
                    StaffType = sType,
                    DepartmentId = deptId,
                    Department = deptName ?? "",
                    DesignationId = desigId,
                    Designation = desigName ?? (sType == "Teaching" ? "Lecturer" : "Office Assistant"),
                    BoardId = boardId,
                    BoardName = boardName,
                    Gender = string.IsNullOrWhiteSpace(gender) ? "Male" : gender,
                    DateOfBirth = dob,
                    Mobile = mobile,
                    Email = email,
                    JoiningDate = joinDate,
                    Experience = exp,
                    Status = string.IsNullOrWhiteSpace(status) ? "Active" : status,
                    ProfileStatus = "PendingLink",
                    ProfileCompletionPercentage = 30,
                    ProfileLinkToken = Guid.NewGuid().ToString("N"),
                    CreatedAt = DateTime.UtcNow
                };

                toAdd.Add(staff);
                if (sType == "Teaching") result.TeachingImported++;
                else result.NonTeachingImported++;
            }

            if (toAdd.Count > 0)
            {
                await _staffRepository.AddRangeAsync(toAdd);
                result.Success = true;
                result.SummaryMessage = $"Successfully imported {toAdd.Count} staff members ({result.TeachingImported} Teaching, {result.NonTeachingImported} Non-Teaching).";
            }
            else
            {
                result.Success = false;
                result.SummaryMessage = "No valid staff records could be imported from the Excel file.";
            }

            return result;
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> ExportStaffExcelAsync(StaffQueryParams queryParams)
        {
            queryParams.PageSize = 10000;
            queryParams.PageNumber = 1;

            var paged = await _staffRepository.GetPagedStaffAsync(queryParams);
            var items = paged.Items;

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Staff Directory");

            // Header Row
            var headers = new[]
            {
                "Employee ID", "First Name", "Middle Name", "Last Name", "Staff Type",
                "Department", "Designation", "Board", "Gender", "Date of Birth",
                "Mobile", "Alternate Mobile", "Email", "Joining Date", "Experience (Years)",
                "Employment Type", "Status", "Profile Status", "Completion %", "City", "State"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2E7D32");
                cell.Style.Font.FontColor = XLColor.White;
            }

            int rowIdx = 2;
            foreach (var s in items)
            {
                worksheet.Cell(rowIdx, 1).Value = s.EmployeeId;
                worksheet.Cell(rowIdx, 2).Value = s.FirstName;
                worksheet.Cell(rowIdx, 3).Value = s.MiddleName ?? "";
                worksheet.Cell(rowIdx, 4).Value = s.LastName;
                worksheet.Cell(rowIdx, 5).Value = s.StaffType;
                worksheet.Cell(rowIdx, 6).Value = s.Department;
                worksheet.Cell(rowIdx, 7).Value = s.Designation;
                worksheet.Cell(rowIdx, 8).Value = s.BoardName ?? s.Board ?? "";
                worksheet.Cell(rowIdx, 9).Value = s.Gender;
                worksheet.Cell(rowIdx, 10).Value = s.DateOfBirth.ToString("yyyy-MM-dd");
                worksheet.Cell(rowIdx, 11).Value = s.Mobile;
                worksheet.Cell(rowIdx, 12).Value = s.AlternateMobile ?? "";
                worksheet.Cell(rowIdx, 13).Value = s.Email;
                worksheet.Cell(rowIdx, 14).Value = s.JoiningDate.ToString("yyyy-MM-dd");
                worksheet.Cell(rowIdx, 15).Value = (double)s.Experience;
                worksheet.Cell(rowIdx, 16).Value = s.EmploymentType ?? "Full Time";
                worksheet.Cell(rowIdx, 17).Value = s.Status;
                worksheet.Cell(rowIdx, 18).Value = s.ProfileStatus;
                worksheet.Cell(rowIdx, 19).Value = s.ProfileCompletionPercentage;
                worksheet.Cell(rowIdx, 20).Value = s.City ?? "";
                worksheet.Cell(rowIdx, 21).Value = s.State ?? "";
                rowIdx++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var bytes = stream.ToArray();
            var filename = $"Staff_Export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
            return (bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateTemplateExcelAsync(string? staffType = null)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Staff Import Template");

            var headers = new[]
            {
                "Employee ID", "First Name", "Middle Name", "Last Name", "Staff Type",
                "Department", "Designation", "Board", "Gender", "Date of Birth",
                "Mobile", "Email", "Joining Date", "Experience (Years)", "Status"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2E7D32");
                cell.Style.Font.FontColor = XLColor.White;
            }

            // Sample rows
            var sType1 = !string.IsNullOrWhiteSpace(staffType) ? staffType : "Teaching";
            var sType2 = !string.IsNullOrWhiteSpace(staffType) ? staffType : "Non-Teaching";

            worksheet.Cell(2, 1).Value = "PCTCH0001";
            worksheet.Cell(2, 2).Value = "Rahul";
            worksheet.Cell(2, 3).Value = "Kumar";
            worksheet.Cell(2, 4).Value = "Sharma";
            worksheet.Cell(2, 5).Value = sType1;
            worksheet.Cell(2, 6).Value = "Mathematics";
            worksheet.Cell(2, 7).Value = "Lecturer";
            worksheet.Cell(2, 8).Value = "Board of Intermediate Education";
            worksheet.Cell(2, 9).Value = "Male";
            worksheet.Cell(2, 10).Value = "1990-05-15";
            worksheet.Cell(2, 11).Value = "9876543210";
            worksheet.Cell(2, 12).Value = "rahul.sharma@example.com";
            worksheet.Cell(2, 13).Value = "2024-06-01";
            worksheet.Cell(2, 14).Value = 4.5;
            worksheet.Cell(2, 15).Value = "Active";

            worksheet.Cell(3, 1).Value = "PCNT0001";
            worksheet.Cell(3, 2).Value = "Priya";
            worksheet.Cell(3, 3).Value = "";
            worksheet.Cell(3, 4).Value = "Reddy";
            worksheet.Cell(3, 5).Value = sType2;
            worksheet.Cell(3, 6).Value = "Administration";
            worksheet.Cell(3, 7).Value = "Administrative Officer";
            worksheet.Cell(3, 8).Value = "Board of Intermediate Education";
            worksheet.Cell(3, 9).Value = "Female";
            worksheet.Cell(3, 10).Value = "1992-08-20";
            worksheet.Cell(3, 11).Value = "9876543211";
            worksheet.Cell(3, 12).Value = "priya.reddy@example.com";
            worksheet.Cell(3, 13).Value = "2024-06-01";
            worksheet.Cell(3, 14).Value = 3.0;
            worksheet.Cell(3, 15).Value = "Active";

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var bytes = stream.ToArray();
            var filename = $"Staff_Import_Template_{staffType ?? "Universal"}.xlsx";
            return (bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateProfilePdfAsync(int id)
        {
            var profile = await GetStaffProfileFullAsync(id);
            var fullName = string.IsNullOrWhiteSpace(profile.MiddleName) ? $"{profile.FirstName} {profile.LastName}".Trim() : $"{profile.FirstName} {profile.MiddleName} {profile.LastName}".Trim();

            var institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? (!string.IsNullOrWhiteSpace(profile.BoardName) ? profile.BoardName : "College Management System");

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(25);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Helvetica"));

                    // Header
                    page.Header().Column(col =>
                    {
                        col.Item().Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text(institutionName.ToUpperInvariant()).Bold().FontSize(18).FontColor(Colors.Green.Darken2);
                                c.Item().Text("Staff Member Official Profile Summary").FontSize(10).FontColor(Colors.Grey.Darken1);
                            });
                            r.ConstantItem(120).AlignRight().Column(c =>
                            {
                                c.Item().Text($"Employee ID: {profile.EmployeeId}").Bold().FontSize(10);
                                c.Item().Text($"Status: {profile.Status}").FontColor(Colors.Green.Darken1);
                            });
                        });
                        col.Item().PaddingTop(5).PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                    });

                    // Content
                    page.Content().Column(col =>
                    {
                        // Basic & Employment Card
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(r =>
                        {
                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Basic Information").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Full Name: {fullName}");
                                c.Item().Text($"Gender: {profile.Gender} | DOB: {profile.DateOfBirth:yyyy-MM-dd}");
                                c.Item().Text($"Aadhaar: {profile.Aadhaar ?? "—"} | PAN: {profile.PanNumber ?? "—"}");
                                c.Item().Text($"Mobile: {profile.Mobile} | Email: {profile.Email}");
                                c.Item().Text($"Marital Status: {profile.MaritalStatus ?? "—"} | Nationality: {profile.Nationality ?? "Indian"}");
                            });

                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Employment Details").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Staff Type: {profile.StaffType}");
                                c.Item().Text($"Department: {profile.Department}");
                                c.Item().Text($"Designation: {profile.Designation}");
                                c.Item().Text($"Board: {profile.BoardName ?? "—"}");
                                c.Item().Text($"Joining Date: {profile.JoiningDate:yyyy-MM-dd} | Exp: {profile.Experience} Yrs");
                                c.Item().Text($"Employment Type: {profile.EmploymentType ?? "Full Time"}");
                            });
                        });

                        col.Item().PaddingTop(10);

                        // Address & Emergency Contact
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(r =>
                        {
                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Contact & Address").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Current Address: {profile.CurrentAddress ?? "—"}");
                                c.Item().Text($"City: {profile.City ?? "—"} | District: {profile.District ?? "—"}");
                                c.Item().Text($"State: {profile.State ?? "—"} | PIN: {profile.Pincode ?? "—"}");
                            });

                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Emergency Contact").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Contact Name: {profile.EmergencyContact?.ContactName ?? "—"}");
                                c.Item().Text($"Relationship: {profile.EmergencyContact?.Relationship ?? "—"}");
                                c.Item().Text($"Mobile: {profile.EmergencyContact?.Mobile ?? "—"}");
                            });
                        });

                        col.Item().PaddingTop(10);

                        // Education List
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Educational Qualifications").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                            if (profile.EducationList != null && profile.EducationList.Count > 0)
                            {
                                c.Item().PaddingTop(3).Table(t =>
                                {
                                    t.ColumnsDefinition(cd =>
                                    {
                                        cd.RelativeColumn(2);
                                        cd.RelativeColumn(3);
                                        cd.ConstantColumn(60);
                                        cd.ConstantColumn(60);
                                    });
                                    t.Header(h =>
                                    {
                                        h.Cell().Text("Degree / Level").Bold();
                                        h.Cell().Text("Institution / University").Bold();
                                        h.Cell().Text("Year").Bold();
                                        h.Cell().Text("Grade/%").Bold();
                                    });
                                    foreach (var edu in profile.EducationList)
                                    {
                                        t.Cell().Text($"{edu.Level} {edu.Degree}".Trim());
                                        t.Cell().Text($"{edu.Institution} {edu.BoardUniversity}".Trim());
                                        t.Cell().Text(edu.PassingYear ?? "");
                                        t.Cell().Text(edu.PercentageCgpa ?? "");
                                    }
                                });
                            }
                            else
                            {
                                c.Item().PaddingTop(3).Text($"Highest Qualification: {profile.Qualification}");
                            }
                        });

                        col.Item().PaddingTop(10);

                        // Bank Details
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Bank & Financial Information").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                            c.Item().PaddingTop(3).Row(r =>
                            {
                                r.RelativeItem().Text($"Bank: {profile.BankDetails?.BankName ?? "—"}");
                                r.RelativeItem().Text($"Account No: {profile.BankDetails?.AccountNumber ?? "—"}");
                                r.RelativeItem().Text($"IFSC: {profile.BankDetails?.IfscCode ?? "—"}");
                                r.RelativeItem().Text($"Branch: {profile.BankDetails?.Branch ?? "—"}");
                            });
                        });
                    });

                    // Footer
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Generated on ");
                        x.Span(DateTime.UtcNow.ToString("dd MMM yyyy, hh:mm tt"));
                        x.Span($" | {institutionName}");
                    });
                });
            });

            using var ms = new MemoryStream();
            doc.GeneratePdf(ms);
            var bytes = ms.ToArray();
            var filename = $"Staff_Profile_{profile.EmployeeId}_{DateTime.UtcNow:yyyyMMdd}.pdf";
            return (bytes, "application/pdf", filename);
        }

        public async Task<StaffResponseDto> UploadPhotoAsync(UploadStaffPhotoDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {dto.StaffId} not found.");

            if (dto.Photo == null || dto.Photo.Length == 0)
                throw new ValidationException("Please choose a photo file.");

            var ext = Path.GetExtension(dto.Photo.FileName).ToLowerInvariant();
            if (!AllowedPhotoExtensions.Contains(ext))
                throw new ValidationException("Only JPEG and PNG photos are accepted.");

            var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "staff-photos");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            var fileName = $"photo_staff_{staff.Id}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var physicalPath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await dto.Photo.CopyToAsync(stream);
            }

            staff.PhotoPath = $"/uploads/staff-photos/{fileName}";
            await _staffRepository.UpdateAsync(staff);
            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id)
        {
            var photoPath = await _staffRepository.GetPhotoPathAsync(id);
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            if (!string.IsNullOrWhiteSpace(photoPath))
            {
                var fullPath = Path.Combine(webRoot, photoPath.TrimStart('/'));
                if (File.Exists(fullPath))
                {
                    var ext = Path.GetExtension(fullPath).ToLowerInvariant();
                    var contentType = ext == ".png" ? "image/png" : "image/jpeg";
                    return (fullPath, contentType);
                }
            }

            // Return default avatar placeholder
            var defaultAvatar = Path.Combine(webRoot, "images", "default-avatar.png");
            if (File.Exists(defaultAvatar))
            {
                return (defaultAvatar, "image/png");
            }

            throw new NotFoundException("No photo available.");
        }

        public async Task<StaffSubjectAllocationResponseDto> AssignSubjectAsync(AssignStaffSubjectDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null) throw new NotFoundException($"Staff with ID {dto.StaffId} not found.");

            var subject = await _subjectRepository.GetByIdAsync(dto.SubjectId);
            if (subject == null) throw new NotFoundException($"Subject with ID {dto.SubjectId} not found.");

            var allocation = _mapper.Map<StaffSubjectAllocation>(dto);
            var created = await _allocationRepository.AddAsync(allocation);
            created.Staff = staff;
            created.Subject = subject;

            return _mapper.Map<StaffSubjectAllocationResponseDto>(created);
        }

        public async Task<StaffSubjectAllocationResponseDto> UpdateSubjectAllocationAsync(int id, UpdateStaffSubjectAllocationDto dto)
        {
            var allocation = await _allocationRepository.GetByIdAsync(id);
            if (allocation == null) throw new NotFoundException($"Subject allocation with ID {id} not found.");

            _mapper.Map(dto, allocation);
            await _allocationRepository.UpdateAsync(allocation);
            return _mapper.Map<StaffSubjectAllocationResponseDto>(allocation);
        }

        public async Task<bool> DeleteSubjectAllocationAsync(int id)
        {
            var allocation = await _allocationRepository.GetByIdAsync(id);
            if (allocation == null) throw new NotFoundException($"Subject allocation with ID {id} not found.");

            await _allocationRepository.DeleteAsync(allocation);
            return true;
        }

        public async Task<List<StaffSubjectAllocationResponseDto>> GetStaffSubjectAllocationsAsync(int staffId)
        {
            var list = await _allocationRepository.GetByStaffIdAsync(staffId);
            return _mapper.Map<List<StaffSubjectAllocationResponseDto>>(list);
        }

        public async Task<StaffWorkloadResponseDto?> GetStaffWorkloadAsync(int staffId)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null) throw new NotFoundException($"Staff with ID {staffId} not found.");

            var allocations = await _allocationRepository.GetByStaffIdAsync(staffId);
            return new StaffWorkloadResponseDto
            {
                StaffId = staff.Id,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                EmployeeId = staff.EmployeeId,
                TotalAllocatedSubjects = allocations.Count,
                TotalAllocatedWeeklyHours = allocations.Count * 4,
                Status = "Normal"
            };
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================

        private StaffProfileFullDto MapToFullProfileDto(Staff staff)
        {
            var dto = _mapper.Map<StaffProfileFullDto>(staff);
            dto.FullName = string.IsNullOrWhiteSpace(staff.MiddleName) ? $"{staff.FirstName} {staff.LastName}".Trim() : $"{staff.FirstName} {staff.MiddleName} {staff.LastName}".Trim();
            if (!string.IsNullOrWhiteSpace(staff.PhotoPath))
            {
                dto.PhotoUrl = $"/api/v1/staff/photo/{staff.Id}";
            }
            if (staff.DepartmentRef != null) dto.Department = staff.DepartmentRef.DepartmentName;
            if (staff.BoardRef != null) dto.BoardName = staff.BoardRef.BoardName;
            if (staff.DesignationRef != null && string.IsNullOrWhiteSpace(dto.Designation)) dto.Designation = staff.DesignationRef.Name;

            return dto;
        }

        private static void ApplySectionUpdate(Staff staff, UpdateStaffProfileSectionDto dto)
        {
            if (dto.Personal != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Personal.FirstName)) staff.FirstName = dto.Personal.FirstName.Trim();
                if (dto.Personal.MiddleName != null) staff.MiddleName = dto.Personal.MiddleName.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Personal.LastName)) staff.LastName = dto.Personal.LastName.Trim();
                if (dto.Personal.FatherOrHusbandName != null) staff.FatherOrHusbandName = dto.Personal.FatherOrHusbandName.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Personal.Gender)) staff.Gender = dto.Personal.Gender.Trim();
                if (dto.Personal.DateOfBirth.HasValue) staff.DateOfBirth = dto.Personal.DateOfBirth.Value;
                if (dto.Personal.MaritalStatus != null) staff.MaritalStatus = dto.Personal.MaritalStatus.Trim();
                if (dto.Personal.Nationality != null) staff.Nationality = dto.Personal.Nationality.Trim();
                if (dto.Personal.Aadhaar != null) staff.Aadhaar = dto.Personal.Aadhaar.Trim();
                if (dto.Personal.PanNumber != null) staff.PanNumber = dto.Personal.PanNumber.Trim();
                if (dto.Personal.BloodGroup != null) staff.BloodGroup = dto.Personal.BloodGroup.Trim();
            }

            if (dto.Address != null)
            {
                if (dto.Address.AlternateMobile != null) staff.AlternateMobile = dto.Address.AlternateMobile.Trim();
                if (dto.Address.CurrentAddress != null) staff.CurrentAddress = dto.Address.CurrentAddress.Trim();
                if (dto.Address.PermanentAddress != null) staff.PermanentAddress = dto.Address.PermanentAddress.Trim();
                if (dto.Address.City != null) staff.City = dto.Address.City.Trim();
                if (dto.Address.District != null) staff.District = dto.Address.District.Trim();
                if (dto.Address.State != null) staff.State = dto.Address.State.Trim();
                if (dto.Address.Pincode != null) staff.Pincode = dto.Address.Pincode.Trim();
                if (dto.Address.Country != null) staff.Country = dto.Address.Country.Trim();
            }

            if (dto.Education != null)
            {
                staff.EducationJson = JsonSerializer.Serialize(dto.Education);
                var first = dto.Education.FirstOrDefault();
                if (first != null && !string.IsNullOrWhiteSpace(first.Degree))
                {
                    staff.Qualification = first.Degree;
                }
            }

            if (dto.Experience != null)
            {
                staff.ExperienceJson = JsonSerializer.Serialize(dto.Experience);
                var total = dto.Experience.Sum(e => e.TotalYears);
                if (total > 0) staff.Experience = total;
            }

            if (dto.Bank != null)
            {
                staff.BankDetailsJson = JsonSerializer.Serialize(dto.Bank);
                if (!string.IsNullOrWhiteSpace(dto.Bank.PanNumber))
                {
                    staff.PanNumber = dto.Bank.PanNumber.Trim();
                }
            }

            if (dto.Emergency != null)
            {
                staff.EmergencyContactJson = JsonSerializer.Serialize(dto.Emergency);
            }

            if (dto.Employment != null)
            {
                if (dto.Employment.DepartmentId.HasValue) staff.DepartmentId = dto.Employment.DepartmentId.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.Department)) staff.Department = dto.Employment.Department.Trim();
                if (dto.Employment.DesignationId.HasValue) staff.DesignationId = dto.Employment.DesignationId.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.Designation)) staff.Designation = dto.Employment.Designation.Trim();
                if (dto.Employment.JoiningDate.HasValue) staff.JoiningDate = dto.Employment.JoiningDate.Value;
                if (dto.Employment.Experience.HasValue) staff.Experience = dto.Employment.Experience.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.EmploymentType)) staff.EmploymentType = dto.Employment.EmploymentType.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Employment.Status)) staff.Status = dto.Employment.Status.Trim();
            }
        }

        private static int CalculateCompletionPercentage(Staff staff)
        {
            int score = 0;

            // 1. Basic & Personal Details (20%)
            if (!string.IsNullOrWhiteSpace(staff.FirstName) && !string.IsNullOrWhiteSpace(staff.LastName) && !string.IsNullOrWhiteSpace(staff.Gender) && staff.DateOfBirth > DateTime.MinValue)
            {
                score += 15;
            }
            if (!string.IsNullOrWhiteSpace(staff.Aadhaar) || !string.IsNullOrWhiteSpace(staff.PanNumber) || !string.IsNullOrWhiteSpace(staff.FatherOrHusbandName))
            {
                score += 5;
            }

            // 2. Contact & Address (15%)
            if (!string.IsNullOrWhiteSpace(staff.CurrentAddress) || !string.IsNullOrWhiteSpace(staff.PermanentAddress))
            {
                score += 8;
            }
            if (!string.IsNullOrWhiteSpace(staff.City) && !string.IsNullOrWhiteSpace(staff.State) && !string.IsNullOrWhiteSpace(staff.Pincode))
            {
                score += 7;
            }

            // 3. Educational Qualifications (15%)
            var edu = DeserializeList<StaffEducationItem>(staff.EducationJson);
            if (edu.Count > 0 || !string.IsNullOrWhiteSpace(staff.Qualification))
            {
                score += 15;
            }

            // 4. Experience (10%)
            var exp = DeserializeList<StaffExperienceItem>(staff.ExperienceJson);
            if (exp.Count > 0 || staff.Experience > 0)
            {
                score += 10;
            }
            else
            {
                score += 10; // Treat 0 exp as Fresher filled
            }

            // 5. Documents Upload (15%)
            var docs = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            if (docs.Count >= 2)
            {
                score += 15;
            }
            else if (docs.Count == 1)
            {
                score += 8;
            }

            // 6. Bank Details (15%)
            var bank = DeserializeObject<StaffBankDetails>(staff.BankDetailsJson);
            if (bank != null && !string.IsNullOrWhiteSpace(bank.AccountNumber) && !string.IsNullOrWhiteSpace(bank.IfscCode))
            {
                score += 15;
            }

            // 7. Emergency Contact (10%)
            var emergency = DeserializeObject<StaffEmergencyContact>(staff.EmergencyContactJson);
            if (emergency != null && !string.IsNullOrWhiteSpace(emergency.ContactName) && !string.IsNullOrWhiteSpace(emergency.Mobile))
            {
                score += 10;
            }

            return Math.Min(100, Math.Max(30, score));
        }

        private static List<T> DeserializeList<T>(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<T>();
            try
            {
                return JsonSerializer.Deserialize<List<T>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<T>();
            }
            catch
            {
                return new List<T>();
            }
        }

        private static T? DeserializeObject<T>(string? json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }
    }
}
