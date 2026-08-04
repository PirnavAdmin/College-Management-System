using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.Data.SqlClient;
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
            var param = new SqlParameter("@EmailOrPhone", emailOrPhone);
            var result = await _context.Users
                .FromSqlRaw("EXEC dbo.usp_GetUserByEmailOrPhone @EmailOrPhone", param)
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
            var param = new SqlParameter("@Email", email);
            var result = await _context.Users
                .FromSqlRaw("EXEC dbo.usp_GetUserByEmail @Email", param)
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
            var pFullName = new SqlParameter("@FullName", user.FullName);
            var pEmail = new SqlParameter("@Email", user.Email);
            var pPhone = new SqlParameter("@PhoneNumber", user.PhoneNumber);
            var pPass = new SqlParameter("@PasswordHash", user.PasswordHash);
            var pRoleId = new SqlParameter("@RoleId", user.RoleId);

            var result = await _context.Database
                .SqlQueryRaw<decimal>("EXEC dbo.usp_AddUser @FullName, @Email, @PhoneNumber, @PasswordHash, @RoleId",
                    pFullName, pEmail, pPhone, pPass, pRoleId)
                .ToListAsync();

            user.UserId = (int)result.FirstOrDefault();
        }

        public async Task UpdateAsync(User user)
        {
            var pUserId = new SqlParameter("@UserId", user.UserId);
            var pFullName = new SqlParameter("@FullName", user.FullName);
            var pEmail = new SqlParameter("@Email", user.Email);
            var pPhone = new SqlParameter("@PhoneNumber", user.PhoneNumber);
            var pPass = new SqlParameter("@PasswordHash", user.PasswordHash);
            var pRoleId = new SqlParameter("@RoleId", user.RoleId);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.usp_UpdateUser @UserId, @FullName, @Email, @PhoneNumber, @PasswordHash, @RoleId",
                pUserId, pFullName, pEmail, pPhone, pPass, pRoleId);
        }

        public async Task<Role?> GetRoleByNameAsync(string roleName)
        {
            var param = new SqlParameter("@RoleName", roleName);
            var result = await _context.Roles
                .FromSqlRaw("EXEC dbo.usp_GetRoleByName @RoleName", param)
                .ToListAsync();
            return result.FirstOrDefault();
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = await _context.Users
                .FromSqlRaw("EXEC dbo.usp_GetAllUsers")
                .ToListAsync();

            foreach (var user in users)
            {
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            }
            return users;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            var param = new SqlParameter("@UserId", id);
            var result = await _context.Users
                .FromSqlRaw("EXEC dbo.usp_GetUserById @UserId", param)
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
