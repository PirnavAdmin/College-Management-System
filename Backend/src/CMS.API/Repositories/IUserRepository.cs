using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone);
        Task<User?> GetByEmailAsync(string email);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task<Role?> GetRoleByNameAsync(string roleName);
    }
}
