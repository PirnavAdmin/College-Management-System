using CollegeManagement.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAdminRepository
    {
        Task<IEnumerable<Admin>> GetAllAsync();
        Task<Admin?> GetByIdAsync(int id);
        Task<Admin?> GetByEmailAsync(string email);
        Task<int> AddAsync(Admin admin);
        Task UpdateStatusAsync(int id, bool isActive);
        Task UpdatePasswordAsync(int id, string newPasswordHash);
    }
}
