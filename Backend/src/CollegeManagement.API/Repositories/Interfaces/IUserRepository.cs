using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone);
        Task<User?> GetByEmailAsync(string email);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task<Role?> GetRoleByNameAsync(string roleName);
        Task<List<User>> GetAllUsersAsync();
        Task<User?> GetByIdAsync(int id);
        Task DeleteAsync(int id);
    }
}
