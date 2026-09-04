using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;
        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone)
        {
            var term = emailOrPhone?.Trim() ?? string.Empty;
            User? user = null;
            try
            {
                user = await Connection.QueryFirstOrDefaultAsync<User>(
                    "usp_GetUserByEmailOrPhone",
                    new { p_EmailOrPhone = term },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                // Fallback to LINQ
            }

            if (user == null)
            {
                user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Email == term || u.PhoneNumber == term);
            }

            if (user == null)
            {
                var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Email == term);
                if (admin != null)
                {
                    var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin") ?? new Role { RoleId = 1, RoleName = "Admin" };
                    user = new User
                    {
                        UserId = admin.Id,
                        FullName = admin.Email,
                        Email = admin.Email,
                        PasswordHash = admin.Password,
                        RoleId = adminRole.RoleId,
                        Role = adminRole
                    };
                }
            }

            if (user == null)
            {
                var faculty = await _context.Faculties.FirstOrDefaultAsync(f => (f.Email == term || f.Mobile == term || f.EmployeeId == term) && !f.IsDeleted);
                if (faculty != null)
                {
                    var facultyRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Faculty") ?? new Role { RoleId = 2, RoleName = "Faculty" };
                    user = new User
                    {
                        UserId = faculty.Id,
                        FullName = $"{faculty.FirstName} {faculty.LastName}".Trim(),
                        Email = faculty.Email,
                        PhoneNumber = faculty.Mobile,
                        PasswordHash = string.Empty,
                        RoleId = facultyRole.RoleId,
                        Role = facultyRole
                    };
                }
            }

            if (user == null)
            {
                var student = await _context.Students.FirstOrDefaultAsync(s => (s.Email == term || s.MobileNumber == term || s.AdmissionNo == term || s.RollNo == term) && s.IsActive);
                if (student != null)
                {
                    var studentRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Student") ?? new Role { RoleId = 3, RoleName = "Student" };
                    user = new User
                    {
                        UserId = student.StudentId,
                        FullName = student.StudentName,
                        Email = student.Email,
                        PhoneNumber = student.MobileNumber,
                        PasswordHash = student.PasswordHash ?? string.Empty,
                        RoleId = studentRole.RoleId,
                        Role = studentRole
                    };
                }
            }

            if (user != null && user.Role == null)
            {
                user.Role = await _context.Roles.FindAsync(user.RoleId) ?? new Role { RoleId = user.RoleId, RoleName = "User" };
            }

            return user;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var user = await Connection.QueryFirstOrDefaultAsync<User>(
                "usp_GetUserByEmail",
                new { p_Email = email },
                commandType: CommandType.StoredProcedure);
            if (user != null)
            {
                user.Role = await _context.Roles.FindAsync(user.RoleId) ?? null!;
            }
            return user;
        }

        public async Task AddAsync(User user)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "usp_AddUser",
                new
                {
                    p_FullName = user.FullName,
                    p_Email = user.Email,
                    p_PhoneNumber = user.PhoneNumber,
                    p_PasswordHash = user.PasswordHash,
                    p_RoleId = user.RoleId
                },
                commandType: CommandType.StoredProcedure);
            user.UserId = id;
        }

        public async Task UpdateAsync(User user)
        {
            await Connection.ExecuteAsync(
                "usp_UpdateUser",
                new
                {
                    p_UserId = user.UserId,
                    p_FullName = user.FullName,
                    p_Email = user.Email,
                    p_PhoneNumber = user.PhoneNumber,
                    p_PasswordHash = user.PasswordHash,
                    p_RoleId = user.RoleId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Role?> GetRoleByNameAsync(string roleName)
        {
            return await Connection.QueryFirstOrDefaultAsync<Role>(
                "usp_GetRoleByName",
                new { p_RoleName = roleName },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = await Connection.QueryAsync<User>(
                "usp_GetAllUsers",
                commandType: CommandType.StoredProcedure);
            var userList = users.ToList();
            foreach (var user in userList)
            {
                user.Role = await _context.Roles.FindAsync(user.RoleId) ?? null!;
            }
            return userList;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            var user = await Connection.QueryFirstOrDefaultAsync<User>(
                "usp_GetUserById",
                new { p_UserId = id },
                commandType: CommandType.StoredProcedure);
            if (user != null)
            {
                user.Role = await _context.Roles.FindAsync(user.RoleId) ?? null!;
            }
            return user;
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "DELETE FROM Users WHERE UserId = @UserId",
                    new { UserId = id },
                    commandType: CommandType.Text);
            }
            catch
            {
                var user = await _context.Users.FindAsync(id);
                if (user != null)
                {
                    _context.Users.Remove(user);
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}
