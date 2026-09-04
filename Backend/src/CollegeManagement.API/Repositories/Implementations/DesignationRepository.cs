using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class DesignationRepository : IDesignationRepository
    {
        private readonly AppDbContext _context;

        public DesignationRepository(AppDbContext context)
        {
            _context = context;
        }

        private bool IsRelational => _context.Database.ProviderName != null && !_context.Database.ProviderName.Contains("InMemory");

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Designation>> GetAllAsync(bool includeInactive = false, string? staffType = null)
        {
            if (IsRelational)
            {
                try
                {
                    return await Connection.QueryAsync<Designation>(
                        "sp_GetDesignations",
                        new
                        {
                            p_IncludeInactive = includeInactive ? 1 : 0,
                            p_StaffType = staffType
                        },
                        commandType: CommandType.StoredProcedure);
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            var query = _context.Designations.Where(d => includeInactive || d.IsActive);
            if (!string.IsNullOrWhiteSpace(staffType) && !string.Equals(staffType, "All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(d => d.StaffType == "Both" || d.StaffType == staffType.Trim());
            }
            return await query.OrderBy(d => d.Name).ToListAsync();
        }

        public async Task<Designation?> GetByIdAsync(int id)
        {
            if (IsRelational)
            {
                try
                {
                    return await Connection.QueryFirstOrDefaultAsync<Designation>(
                        "sp_GetDesignationById",
                        new { p_Id = id },
                        commandType: CommandType.StoredProcedure);
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            return await _context.Designations.FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<Designation?> GetByNameAsync(string name)
        {
            if (IsRelational)
            {
                try
                {
                    return await Connection.QueryFirstOrDefaultAsync<Designation>(
                        "sp_GetDesignationByName",
                        new { p_Name = name.Trim() },
                        commandType: CommandType.StoredProcedure);
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            var trimmed = name.Trim().ToLower();
            return await _context.Designations.FirstOrDefaultAsync(d => d.Name.ToLower() == trimmed);
        }

        public async Task<bool> IsNameUniqueAsync(string name, int? excludeId = null)
        {
            if (IsRelational)
            {
                try
                {
                    int count = await Connection.ExecuteScalarAsync<int>(
                        "sp_CheckDesignationNameUnique",
                        new { p_Name = name.Trim(), p_ExcludeId = excludeId },
                        commandType: CommandType.StoredProcedure);
                    return count == 0;
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            var trimmed = name.Trim().ToLower();
            return !await _context.Designations.AnyAsync(d => d.Name.ToLower() == trimmed && (excludeId == null || d.Id != excludeId));
        }

        public async Task<bool> IsAssignedToFacultyAsync(int designationId)
        {
            return await IsAssignedToStaffAsync(designationId);
        }

        public async Task<bool> IsAssignedToStaffAsync(int designationId)
        {
            if (IsRelational)
            {
                try
                {
                    int count = await Connection.ExecuteScalarAsync<int>(
                        "sp_CheckDesignationAssignedToStaff",
                        new { p_DesignationId = designationId },
                        commandType: CommandType.StoredProcedure);
                    return count > 0;
                }
                catch
                {
                    try
                    {
                        int count = await Connection.ExecuteScalarAsync<int>(
                            "sp_CheckDesignationAssignedToFaculty",
                            new { p_DesignationId = designationId },
                            commandType: CommandType.StoredProcedure);
                        return count > 0;
                    }
                    catch
                    {
                        // Fallback to EF Core
                    }
                }
            }

            return await _context.Staffs.AnyAsync(s => s.DesignationId == designationId && !s.IsDeleted);
        }

        public async Task<Designation> AddAsync(Designation designation)
        {
            if (IsRelational)
            {
                try
                {
                    int id = await Connection.ExecuteScalarAsync<int>(
                        "sp_CreateDesignation",
                        new
                        {
                            p_Name = designation.Name.Trim(),
                            p_StaffType = designation.StaffType ?? "Both",
                            p_IsActive = designation.IsActive ? 1 : 0
                        },
                        commandType: CommandType.StoredProcedure);

                    designation.Id = id;
                    return designation;
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            _context.Designations.Add(designation);
            await _context.SaveChangesAsync();
            return designation;
        }

        public async Task UpdateAsync(Designation designation)
        {
            if (IsRelational)
            {
                try
                {
                    await Connection.ExecuteAsync(
                        "sp_UpdateDesignation",
                        new
                        {
                            p_Id = designation.Id,
                            p_Name = designation.Name.Trim(),
                            p_StaffType = designation.StaffType ?? "Both",
                            p_IsActive = designation.IsActive ? 1 : 0
                        },
                        commandType: CommandType.StoredProcedure);

                    return;
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            _context.Designations.Update(designation);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            if (IsRelational)
            {
                try
                {
                    await Connection.ExecuteAsync(
                        "sp_DeleteDesignation",
                        new { p_Id = id },
                        commandType: CommandType.StoredProcedure);

                    return;
                }
                catch
                {
                    // Fallback to EF Core
                }
            }

            var entity = await _context.Designations.FindAsync(id);
            if (entity != null)
            {
                _context.Designations.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }
    }
}
