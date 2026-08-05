using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
namespace CollegeManagement.API.Repositories.Implementations
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;
        public UserRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone)
        {
            var result = await _context.Users
                .FromSqlRaw("CALL usp_GetUserByEmailOrPhone({0})", emailOrPhone)
                .ToListAsync();
            var user = result.FirstOrDefault();
            if (user != null)
            {
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            }
            return user;
        }
        public async Task<User?> GetByEmailAsync(string email)
        {
            var result = await _context.Users
                .FromSqlRaw("CALL usp_GetUserByEmail({0})", email)
                .ToListAsync();
            var user = result.FirstOrDefault();
            if (user != null)
            {
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            }
            return user;
        }
        public async Task AddAsync(User user)
        {
            var result = await _context.Database
                .SqlQueryRaw<long>("CALL usp_AddUser({0}, {1}, {2}, {3}, {4})",
                    user.FullName, user.Email, user.PhoneNumber, user.PasswordHash, user.RoleId)
                .ToListAsync();
            user.UserId = (int)result.FirstOrDefault();
        }
        public async Task UpdateAsync(User user)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "CALL usp_UpdateUser({0}, {1}, {2}, {3}, {4}, {5})",
                user.UserId, user.FullName, user.Email, user.PhoneNumber, user.PasswordHash, user.RoleId);
        }
        public async Task<Role?> GetRoleByNameAsync(string roleName)
        {
            var result = await _context.Roles
                .FromSqlRaw("CALL usp_GetRoleByName({0})", roleName)
                .ToListAsync();
            return result.FirstOrDefault();
        }
        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = await _context.Users
                .FromSqlRaw("CALL usp_GetAllUsers()")
                .ToListAsync();
            foreach (var user in users)
            {
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            }
            return users;
        }
        public async Task<User?> GetByIdAsync(int id)
        {
            var result = await _context.Users
                .FromSqlRaw("CALL usp_GetUserById({0})", id)
                .ToListAsync();
            var user = result.FirstOrDefault();
            if (user != null)
            {
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            }
            return user;
        }
    }
}
