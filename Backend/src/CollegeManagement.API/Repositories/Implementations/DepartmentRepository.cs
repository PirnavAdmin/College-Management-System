using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class DepartmentRepository : IDepartmentRepository
    {
        private readonly AppDbContext _context;

        public DepartmentRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Department>> GetActiveDepartmentsAsync()
        {
            return await GetDepartmentsAsync(null);
        }

        public async Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null)
        {
            try
            {
                return await Connection.QueryAsync<Department>(
                    "sp_GetDepartments",
                    new { p_StaffType = staffType },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var query = _context.Departments.Where(d => d.IsActive);
                if (!string.IsNullOrWhiteSpace(staffType) && !string.Equals(staffType, "All", System.StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(d => d.StaffType == "Both" || d.StaffType == staffType.Trim());
                }
                return await query.OrderBy(d => d.DepartmentName).ToListAsync();
            }
        }

        public async Task<Department> AddDepartmentAsync(Department department)
        {
            try
            {
                var id = await Connection.ExecuteScalarAsync<int>(
                    "sp_CreateDepartment",
                    new
                    {
                        p_DepartmentName = department.DepartmentName,
                        p_DepartmentCode = department.DepartmentCode,
                        p_StaffType = department.StaffType,
                        p_Description = department.Description
                    },
                    commandType: CommandType.StoredProcedure);

                department.DepartmentId = id;
                return department;
            }
            catch
            {
                await _context.Departments.AddAsync(department);
                await _context.SaveChangesAsync();
                return department;
            }
        }
    }
}

