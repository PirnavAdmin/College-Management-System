using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IFacultyRepository
    {
        Task<Faculty?> GetByIdAsync(int id);
        Task<Faculty?> GetByEmployeeIdAsync(string employeeId);
        Task<Faculty?> GetByEmailAsync(string email);
        Task<Faculty?> GetByMobileAsync(string mobile);
        Task<Faculty?> GetByAadhaarAsync(string aadhaar);
        Task<Faculty?> GetByUsernameAsync(string username);
        Task<string?> GetPhotoPathAsync(int id);

        // Uniqueness checks (excluding specific Faculty Id during Updates)
        Task<bool> IsEmployeeIdUniqueAsync(string employeeId, int? excludeId = null);
        Task<bool> IsEmailUniqueAsync(string email, int? excludeId = null);
        Task<bool> IsMobileUniqueAsync(string mobile, int? excludeId = null);
        Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeId = null);
        Task<bool> IsUsernameUniqueAsync(string username, int? excludeId = null);

        Task<(List<Faculty> Items, int TotalCount)> GetPagedFacultiesAsync(FacultyQueryParams queryParams);
        Task<Faculty> AddAsync(Faculty faculty);
        Task UpdateAsync(Faculty faculty);
        Task UpdatePhotoPathAsync(int id, string photoPath);
        Task SoftDeleteAsync(Faculty faculty);
    }
}
