using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffRepository : IStaffRepository
    {
        private readonly AppDbContext _context;

        public StaffRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<Staff?> GetByIdAsync(int id)
        {
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        }

        public async Task<Staff?> GetByEmployeeIdAsync(string employeeId)
        {
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && !s.IsDeleted);
        }

        public async Task<Staff?> GetByEmailAsync(string email)
        {
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .FirstOrDefaultAsync(s => s.Email == email && !s.IsDeleted);
        }

        public async Task<Staff?> GetByMobileAsync(string mobile)
        {
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .FirstOrDefaultAsync(s => s.Mobile == mobile && !s.IsDeleted);
        }

        public async Task<Staff?> GetByAadhaarAsync(string aadhaar)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return null;
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .FirstOrDefaultAsync(s => s.Aadhaar == aadhaar && !s.IsDeleted);
        }

        public async Task<Staff?> GetByTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .FirstOrDefaultAsync(s => s.ProfileLinkToken == token && !s.IsDeleted);
        }

        public async Task<string?> GetPhotoPathAsync(int id)
        {
            return await _context.Staffs
                .Where(s => s.Id == id && !s.IsDeleted)
                .Select(s => s.PhotoPath)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> IsEmployeeIdUniqueAsync(string employeeId, int? excludeId = null)
        {
            var query = _context.Staffs.Where(s => s.EmployeeId == employeeId && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsEmailUniqueAsync(string email, int? excludeId = null)
        {
            var query = _context.Staffs.Where(s => s.Email == email && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsMobileUniqueAsync(string mobile, int? excludeId = null)
        {
            var query = _context.Staffs.Where(s => s.Mobile == mobile && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return true;
            var query = _context.Staffs.Where(s => s.Aadhaar == aadhaar && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<(List<Staff> Items, int TotalCount)> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            var query = _context.Staffs
                .AsNoTracking()
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Where(s => !s.IsDeleted);

            // Search Term (EmployeeId, Name, Email, Mobile)
            if (!string.IsNullOrWhiteSpace(queryParams.SearchTerm))
            {
                var term = queryParams.SearchTerm.Trim();
                query = query.Where(s =>
                    s.FirstName.Contains(term) ||
                    s.LastName.Contains(term) ||
                    (s.MiddleName != null && s.MiddleName.Contains(term)) ||
                    s.EmployeeId.Contains(term) ||
                    s.Email.Contains(term) ||
                    s.Mobile.Contains(term));
            }

            // Department filter (ID or Name)
            if (queryParams.DepartmentId.HasValue && queryParams.DepartmentId.Value > 0)
            {
                query = query.Where(s => s.DepartmentId == queryParams.DepartmentId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.Department) && !queryParams.Department.Equals("All Departments", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.DepartmentRef != null && (s.DepartmentRef.DepartmentName == queryParams.Department || s.DepartmentRef.DepartmentCode == queryParams.Department));
            }

            // Designation filter (ID or Name)
            if (queryParams.DesignationId.HasValue && queryParams.DesignationId.Value > 0)
            {
                query = query.Where(s => s.DesignationId == queryParams.DesignationId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.Designation) && !queryParams.Designation.Equals("All Designations", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Designation == queryParams.Designation || (s.DesignationRef != null && s.DesignationRef.Name == queryParams.Designation));
            }

            // Board filter
            if (queryParams.BoardId.HasValue && queryParams.BoardId.Value > 0)
            {
                query = query.Where(s => s.BoardId == queryParams.BoardId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.BoardName) && !queryParams.BoardName.Equals("All Boards", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.BoardRef != null && s.BoardRef.BoardName == queryParams.BoardName);
            }

            // Staff Type filter (Teaching / Non-Teaching)
            if (!string.IsNullOrWhiteSpace(queryParams.StaffType) && !queryParams.StaffType.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.StaffType == queryParams.StaffType);
            }

            // Employment Status filter (Active / Inactive)
            if (!string.IsNullOrWhiteSpace(queryParams.Status) && !queryParams.Status.Equals("All Status", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Status == queryParams.Status);
            }

            // Profile Status filter (Completed, PendingLink, LinkSent, InProgress, NeedsCorrection, Submitted)
            if (!string.IsNullOrWhiteSpace(queryParams.ProfileStatus) && !queryParams.ProfileStatus.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (queryParams.ProfileStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "Completed" || s.ProfileStatus == "Approved");
                }
                else if (queryParams.ProfileStatus.Equals("Pending", StringComparison.OrdinalIgnoreCase) || queryParams.ProfileStatus.Equals("Pending Profile Completion", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus != "Completed" && s.ProfileStatus != "Approved");
                }
                else
                {
                    query = query.Where(s => s.ProfileStatus == queryParams.ProfileStatus);
                }
            }

            // Pending Sub-tab filter (LinkSent, InProgress, NeedsCorrection, Submitted)
            if (!string.IsNullOrWhiteSpace(queryParams.PendingSubTab))
            {
                var subTab = queryParams.PendingSubTab.Trim();
                if (subTab.Equals("LinkSent", StringComparison.OrdinalIgnoreCase) || subTab.Equals("Link Sent", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "LinkSent" || s.ProfileStatus == "PendingLink" || s.ProfileStatus == null);
                }
                else if (subTab.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || subTab.Equals("In Progress", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "InProgress");
                }
                else if (subTab.Equals("NeedsCorrection", StringComparison.OrdinalIgnoreCase) || subTab.Equals("Needs Correction", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "NeedsCorrection");
                }
                else if (subTab.Equals("Submitted", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "Submitted");
                }
            }

            var totalCount = await query.CountAsync();

            // Sorting
            query = (queryParams.SortBy?.ToLowerInvariant(), queryParams.SortOrder?.ToUpperInvariant()) switch
            {
                ("firstname", "ASC") => query.OrderBy(s => s.FirstName),
                ("firstname", _) => query.OrderByDescending(s => s.FirstName),
                ("employeeid", "ASC") => query.OrderBy(s => s.EmployeeId),
                ("employeeid", _) => query.OrderByDescending(s => s.EmployeeId),
                ("joiningdate", "ASC") => query.OrderBy(s => s.JoiningDate),
                ("joiningdate", _) => query.OrderByDescending(s => s.JoiningDate),
                ("profilecompletionpercentage", "ASC") => query.OrderBy(s => s.ProfileCompletionPercentage),
                ("profilecompletionpercentage", _) => query.OrderByDescending(s => s.ProfileCompletionPercentage),
                ("id", "ASC") => query.OrderBy(s => s.Id),
                _ => query.OrderByDescending(s => s.Id)
            };

            var items = await query
                .Skip((queryParams.PageNumber - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .ToListAsync();

            // Populate navigation names
            foreach (var item in items)
            {
                if (item.DepartmentRef != null) item.Department = item.DepartmentRef.DepartmentName;
                if (item.BoardRef != null) item.BoardName = item.BoardRef.BoardName;
                if (item.DesignationRef != null && string.IsNullOrWhiteSpace(item.Designation)) item.Designation = item.DesignationRef.Name;
            }

            return (items, totalCount);
        }

        public async Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null)
        {
            var query = _context.Staffs.AsNoTracking().Where(s => !s.IsDeleted && s.Status == "Active");
            if (!string.IsNullOrWhiteSpace(staffType))
            {
                query = query.Where(s => s.StaffType == staffType);
            }

            return await query
                .OrderBy(s => s.FirstName)
                .Select(s => new StaffDropdownDto
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    FullName = $"{s.FirstName} {s.LastName}".Trim(),
                    Designation = s.Designation,
                    Department = s.DepartmentRef != null ? s.DepartmentRef.DepartmentName : s.Department,
                    StaffType = s.StaffType
                })
                .ToListAsync();
        }

        public async Task<string> GenerateNextEmployeeIdAsync(string staffType)
        {
            var isTeaching = !string.Equals(staffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase);
            var prefix = isTeaching ? "PCTCH" : "PCNT";

            // Find maximum existing sequential numeric suffix
            var existingIds = await _context.Staffs
                .Where(s => s.EmployeeId.StartsWith(prefix))
                .Select(s => s.EmployeeId)
                .ToListAsync();

            int maxNumber = 0;
            foreach (var id in existingIds)
            {
                var numPart = id.Substring(prefix.Length);
                if (int.TryParse(numPart, out int parsedNum) && parsedNum > maxNumber)
                {
                    maxNumber = parsedNum;
                }
            }

            return $"{prefix}{(maxNumber + 1):D4}";
        }

        public async Task<StaffDashboardStatsDto> GetDashboardStatsAsync()
        {
            var activeStaff = await _context.Staffs
                .AsNoTracking()
                .Where(s => !s.IsDeleted)
                .ToListAsync();

            var totalStaff = activeStaff.Count;
            var teachingStaff = activeStaff.Count(s => string.Equals(s.StaffType, "Teaching", StringComparison.OrdinalIgnoreCase));
            var nonTeachingStaff = activeStaff.Count(s => string.Equals(s.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase));
            
            var completedCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "Completed", StringComparison.OrdinalIgnoreCase) || string.Equals(s.ProfileStatus, "Approved", StringComparison.OrdinalIgnoreCase));
            var pendingCount = totalStaff - completedCount;

            var inProgressCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "InProgress", StringComparison.OrdinalIgnoreCase));
            var needsCorrectionCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "NeedsCorrection", StringComparison.OrdinalIgnoreCase));
            var submittedCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "Submitted", StringComparison.OrdinalIgnoreCase));
            var linkSentCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "LinkSent", StringComparison.OrdinalIgnoreCase) || string.Equals(s.ProfileStatus, "PendingLink", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(s.ProfileStatus));

            return new StaffDashboardStatsDto
            {
                TotalStaff = totalStaff,
                TeachingStaff = teachingStaff,
                NonTeachingStaff = nonTeachingStaff,
                PendingProfileCompletion = pendingCount,
                CompletedProfiles = completedCount,
                
                Completed = completedCount,
                Pending = linkSentCount,
                InProgress = inProgressCount,
                NeedsCorrection = needsCorrectionCount,
                Submitted = submittedCount
            };
        }

        public async Task<Staff> AddAsync(Staff staff)
        {
            _context.Staffs.Add(staff);
            await _context.SaveChangesAsync();
            return staff;
        }

        public async Task AddRangeAsync(IEnumerable<Staff> staffs)
        {
            _context.Staffs.AddRange(staffs);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Staff staff)
        {
            staff.UpdatedAt = DateTime.UtcNow;
            _context.Staffs.Update(staff);
            await _context.SaveChangesAsync();
        }

        public async Task UpdatePhotoPathAsync(int id, string photoPath)
        {
            var staff = await _context.Staffs.FindAsync(id);
            if (staff != null)
            {
                staff.PhotoPath = photoPath;
                staff.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task SoftDeleteAsync(Staff staff)
        {
            staff.IsDeleted = true;
            staff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task BulkUpdateLinkSentAsync(List<int> staffIds, DateTime sentAt, DateTime expiresAt)
        {
            var staffs = await _context.Staffs.Where(s => staffIds.Contains(s.Id) && !s.IsDeleted).ToListAsync();
            foreach (var staff in staffs)
            {
                if (string.IsNullOrWhiteSpace(staff.ProfileLinkToken))
                {
                    staff.ProfileLinkToken = Guid.NewGuid().ToString("N");
                }
                staff.ProfileLinkSentAt = sentAt;
                staff.ProfileLinkExpiresAt = expiresAt;
                if (staff.ProfileStatus == "PendingLink" || string.IsNullOrWhiteSpace(staff.ProfileStatus))
                {
                    staff.ProfileStatus = "LinkSent";
                }
                staff.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        public async Task UpdateProfileStatusAsync(int staffId, string profileStatus, int completionPercentage, string? correctionNotes = null)
        {
            var staff = await _context.Staffs.FindAsync(staffId);
            if (staff != null)
            {
                staff.ProfileStatus = profileStatus;
                staff.ProfileCompletionPercentage = completionPercentage;
                if (correctionNotes != null)
                {
                    staff.CorrectionNotes = correctionNotes;
                    staff.CorrectionRequestedAt = DateTime.UtcNow;
                }
                if (profileStatus == "Submitted")
                {
                    staff.SubmittedAt = DateTime.UtcNow;
                }
                else if (profileStatus == "Completed" || profileStatus == "Approved")
                {
                    staff.ApprovedAt = DateTime.UtcNow;
                }
                staff.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}
