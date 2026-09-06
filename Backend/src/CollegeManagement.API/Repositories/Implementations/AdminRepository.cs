using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using System.Data;
using System.Linq;
using System;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AdminRepository : IAdminRepository
    {
        private readonly AppDbContext _context;

        public AdminRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Admin>> GetAllAsync()
        {
            try
            {
                return await Connection.QueryAsync<Admin>("sp_GetAllAdmins", commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Admins.ToListAsync();
            }
        }

        public async Task<Admin?> GetByIdAsync(int id)
        {
            try
            {
                return await Connection.QueryFirstOrDefaultAsync<Admin>("sp_GetAdminById", new { p_Id = id }, commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Admins.FirstOrDefaultAsync(a => a.Id == id);
            }
        }

        public async Task<Admin?> GetByEmailAsync(string email)
        {
            try
            {
                return await Connection.QueryFirstOrDefaultAsync<Admin>("sp_GetAdminByEmail", new { p_Email = email }, commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Admins.FirstOrDefaultAsync(a => a.Email == email);
            }
        }

        public async Task<int> AddAsync(Admin admin)
        {
            try
            {
                var id = await Connection.ExecuteScalarAsync<int>("sp_CreateAdmin", 
                    new { p_Email = admin.Email, p_Password = admin.Password, p_IsActive = admin.IsActive }, 
                    commandType: CommandType.StoredProcedure);
                admin.Id = id;
                return id;
            }
            catch
            {
                _context.Admins.Add(admin);
                await _context.SaveChangesAsync();
                return admin.Id;
            }
        }

        public async Task UpdateStatusAsync(int id, bool isActive)
        {
            try
            {
                await Connection.ExecuteAsync("sp_UpdateAdminStatus", 
                    new { p_Id = id, p_IsActive = isActive }, 
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var admin = await _context.Admins.FindAsync(id);
                if (admin != null)
                {
                    admin.IsActive = isActive;
                    await _context.SaveChangesAsync();
                }
            }
        }

        public async Task UpdatePasswordAsync(int id, string newPasswordHash)
        {
            try
            {
                await Connection.ExecuteAsync("sp_ChangeAdminPassword", 
                    new { p_Id = id, p_Password = newPasswordHash }, 
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var admin = await _context.Admins.FindAsync(id);
                if (admin != null)
                {
                    admin.Password = newPasswordHash;
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}
