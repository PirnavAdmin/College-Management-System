using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.DTOs.Faculty.Request;
using CollegeManagement.API.DTOs.Faculty.Response;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace CollegeManagement.API.Services.Implementations
{
    public class FacultyService : IFacultyService
    {
        private readonly IFacultyRepository _facultyRepository;
        private readonly IFacultySubjectAllocationRepository _allocationRepository;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;

        private const int StandardWeeklyClassesPerSubject = 4;
        private const decimal HoursPerClassPeriod = 1.0m;
        private const long MaxPhotoFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] AllowedPhotoExtensions = { ".jpg", ".jpeg", ".png" };

        public FacultyService(
            IFacultyRepository facultyRepository,
            IFacultySubjectAllocationRepository allocationRepository,
            IMapper mapper,
            IWebHostEnvironment environment)
        {
            _facultyRepository = facultyRepository;
            _allocationRepository = allocationRepository;
            _mapper = mapper;
            _environment = environment;
        }

        public async Task<PagedResult<FacultyResponseDto>> GetPagedFacultiesAsync(FacultyQueryParams queryParams)
        {
            var (faculties, totalCount) = await _facultyRepository.GetPagedFacultiesAsync(queryParams);
            var dtos = _mapper.Map<List<FacultyResponseDto>>(faculties);

            return new PagedResult<FacultyResponseDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                PageNumber = queryParams.PageNumber,
                PageSize = queryParams.PageSize
            };
        }

        public async Task<FacultyResponseDto?> GetFacultyByIdAsync(int id)
        {
            var faculty = await _facultyRepository.GetByIdAsync(id);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with ID {id} not found.");

            return _mapper.Map<FacultyResponseDto>(faculty);
        }

        public async Task<FacultyResponseDto?> GetFacultyByEmployeeIdAsync(string employeeId)
        {
            var faculty = await _facultyRepository.GetByEmployeeIdAsync(employeeId);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with Employee ID '{employeeId}' not found.");

            return _mapper.Map<FacultyResponseDto>(faculty);
        }

        public async Task<FacultyResponseDto> CreateFacultyAsync(CreateFacultyDto dto)
        {
            // 1. Uniqueness Checks
            if (!await _facultyRepository.IsEmployeeIdUniqueAsync(dto.EmployeeId))
                throw new ConflictException($"Employee ID '{dto.EmployeeId}' is already registered.");

            if (!await _facultyRepository.IsEmailUniqueAsync(dto.Email))
                throw new ConflictException($"Email '{dto.Email}' is already registered.");

            if (!await _facultyRepository.IsMobileUniqueAsync(dto.Mobile))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered.");

            if (!await _facultyRepository.IsAadhaarUniqueAsync(dto.Aadhaar))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered.");

            if (!await _facultyRepository.IsUsernameUniqueAsync(dto.Username))
                throw new ConflictException($"Username '{dto.Username}' is already taken.");

            // 2. Map & Hash Password
            var faculty = _mapper.Map<Faculty>(dto);
            // faculty.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // 3. Persist Entity
            var createdFaculty = await _facultyRepository.AddAsync(faculty);
            return _mapper.Map<FacultyResponseDto>(createdFaculty);
        }

        public async Task<FacultyResponseDto> UpdateFacultyAsync(int id, UpdateFacultyDto dto)
        {
            var existingFaculty = await _facultyRepository.GetByIdAsync(id);
            if (existingFaculty == null)
                throw new NotFoundException($"Faculty record with ID {id} not found.");

            // Uniqueness checks (excluding current Faculty ID)
            if (!await _facultyRepository.IsEmailUniqueAsync(dto.Email, id))
                throw new ConflictException($"Email '{dto.Email}' is already registered by another faculty.");

            if (!await _facultyRepository.IsMobileUniqueAsync(dto.Mobile, id))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered by another faculty.");

            if (!await _facultyRepository.IsAadhaarUniqueAsync(dto.Aadhaar, id))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered by another faculty.");

            // Update allowed fields via AutoMapper
            _mapper.Map(dto, existingFaculty);

            await _facultyRepository.UpdateAsync(existingFaculty);
            return _mapper.Map<FacultyResponseDto>(existingFaculty);
        }

        public async Task<bool> DeleteFacultyAsync(int id)
        {
            var faculty = await _facultyRepository.GetByIdAsync(id);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with ID {id} not found.");

            await _facultyRepository.SoftDeleteAsync(faculty);
            return true;
        }

        public async Task<FacultyResponseDto> UploadPhotoAsync(UploadFacultyPhotoDto dto)
        {
            var faculty = await _facultyRepository.GetByIdAsync(dto.FacultyId);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with ID {dto.FacultyId} not found.");

            // 1. File Validation
            if (dto.Photo == null || dto.Photo.Length == 0)
                throw new ValidationException("Photo file is required.");

            if (dto.Photo.Length > MaxPhotoFileSizeBytes)
                throw new ValidationException("Photo file size cannot exceed 5 MB.");

            var fileExtension = Path.GetExtension(dto.Photo.FileName).ToLowerInvariant();
            if (!AllowedPhotoExtensions.Contains(fileExtension))
                throw new ValidationException("Invalid image format. Allowed formats: .jpg, .jpeg, .png.");

            var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(webRootPath, "uploads", "faculty-photos");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // 2. Delete Existing Photo File from Storage if present
            if (!string.IsNullOrWhiteSpace(faculty.PhotoPath))
            {
                var existingRelativePath = faculty.PhotoPath.TrimStart('/', '\\');
                var existingPhysicalPath = Path.Combine(webRootPath, existingRelativePath);
                if (File.Exists(existingPhysicalPath))
                {
                    File.Delete(existingPhysicalPath);
                }
            }

            // 3. Save New Photo File
            var uniqueFileName = $"faculty_{faculty.Id}_{Guid.NewGuid():N}{fileExtension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.Photo.CopyToAsync(stream);
            }

            // 4. Save Relative Path in Database via Stored Procedure
            var photoRelativePath = $"/uploads/faculty-photos/{uniqueFileName}";
            await _facultyRepository.UpdatePhotoPathAsync(faculty.Id, photoRelativePath);

            // 5. Reload updated Faculty entity directly from database to verify and return persisted state
            var updatedFaculty = await _facultyRepository.GetByIdAsync(faculty.Id);
            if (updatedFaculty == null)
                throw new NotFoundException($"Faculty record with ID {faculty.Id} not found.");

            return _mapper.Map<FacultyResponseDto>(updatedFaculty);
        }

        public async Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id)
        {
            var photoPath = await _facultyRepository.GetPhotoPathAsync(id);
            if (string.IsNullOrWhiteSpace(photoPath))
            {
                throw new NotFoundException($"Photo for faculty ID {id} not found.");
            }

            var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var relativePath = photoPath.TrimStart('/', '\\');
            var physicalPath = Path.Combine(webRootPath, relativePath);

            if (!File.Exists(physicalPath))
            {
                throw new NotFoundException($"Photo file for faculty ID {id} not found on disk.");
            }

            var extension = Path.GetExtension(physicalPath).ToLowerInvariant();
            var contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            return (physicalPath, contentType);
        }

        public async Task<FacultySubjectAllocationResponseDto> AssignSubjectAsync(AssignSubjectDto dto)
        {
            // Verify Faculty Exists
            var faculty = await _facultyRepository.GetByIdAsync(dto.FacultyId);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with ID {dto.FacultyId} not found.");

            // Prevent Duplicate Subject Allocation
            if (await _allocationRepository.ExistsAllocationAsync(dto.FacultyId, dto.Board, dto.AcademicYear, dto.Group, dto.AcademicLevel, dto.Section, dto.Subject))
                throw new ConflictException($"Subject '{dto.Subject}' is already allocated to Faculty ID {dto.FacultyId} for Section '{dto.Section}' in Group '{dto.Group}'.");

            var allocation = new FacultySubjectAllocation
            {
                FacultyId = dto.FacultyId,
                // Board = dto.Board,
                // AcademicYear = dto.AcademicYear,
                // Group = dto.Group,
                // AcademicLevel = dto.AcademicLevel,
                // Section = dto.Section,
                // Subject = dto.Subject
            };

            var createdAllocation = await _allocationRepository.AddAsync(allocation);
            var resultDto = _mapper.Map<FacultySubjectAllocationResponseDto>(createdAllocation);
            resultDto.FacultyName = $"{faculty.FirstName} {faculty.LastName}".Trim();
            return resultDto;
        }

        public async Task<FacultySubjectAllocationResponseDto> UpdateSubjectAllocationAsync(int id, UpdateSubjectAllocationDto dto)
        {
            var existingAllocation = await _allocationRepository.GetByIdAsync(id);
            if (existingAllocation == null)
                throw new NotFoundException($"Subject Allocation record with ID {id} not found.");

            // Check Duplicate (excluding current allocation id)
            if (await _allocationRepository.ExistsAllocationAsync(existingAllocation.FacultyId, dto.Board, dto.AcademicYear, dto.Group, dto.AcademicLevel, dto.Section, dto.Subject, id))
                throw new ConflictException($"Subject '{dto.Subject}' is already allocated for Section '{dto.Section}' in Group '{dto.Group}'.");

            // existingAllocation.Board = dto.Board;
            // existingAllocation.AcademicYear = dto.AcademicYear;
            // existingAllocation.Group = dto.Group;
            // existingAllocation.AcademicLevel = dto.AcademicLevel;
            // existingAllocation.Section = dto.Section;
            // existingAllocation.Subject = dto.Subject;

            await _allocationRepository.UpdateAsync(existingAllocation);

            var updatedAllocation = await _allocationRepository.GetByIdAsync(id);
            return _mapper.Map<FacultySubjectAllocationResponseDto>(updatedAllocation);
        }

        public async Task<bool> DeleteSubjectAllocationAsync(int id)
        {
            var existingAllocation = await _allocationRepository.GetByIdAsync(id);
            if (existingAllocation == null)
                throw new NotFoundException($"Subject Allocation record with ID {id} not found.");

            await _allocationRepository.DeleteAsync(existingAllocation);
            return true;
        }

        public async Task<FacultyWorkloadResponseDto?> GetFacultyWorkloadAsync(int facultyId)
        {
            var faculty = await _facultyRepository.GetByIdAsync(facultyId);
            if (faculty == null)
                throw new NotFoundException($"Faculty record with ID {facultyId} not found.");

            var allocations = await _allocationRepository.GetByFacultyIdAsync(facultyId);
            var allocationDtos = _mapper.Map<List<FacultySubjectAllocationResponseDto>>(allocations);

            int totalAssignedSubjects = 0; // allocations.Select(a => a.SubjectId).Distinct().Count();
            int totalSections = 0;
            int weeklyClasses = allocations.Count * StandardWeeklyClassesPerSubject;
            decimal totalWorkloadHours = weeklyClasses * HoursPerClassPeriod;

            return new FacultyWorkloadResponseDto
            {
                FacultyId = faculty.Id,
                FacultyName = $"{faculty.FirstName} {faculty.LastName}".Trim(),
                EmployeeId = faculty.EmployeeId,
                Department = faculty.Department,
                Designation = faculty.Designation,
                TotalAssignedSubjects = totalAssignedSubjects,
                TotalSections = totalSections,
                WeeklyClasses = weeklyClasses,
                TotalWorkloadHours = totalWorkloadHours,
                Allocations = allocationDtos
            };
        }
    }
}
