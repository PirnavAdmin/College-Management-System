using System.Data;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class FacultySubjectAllocationRepository : IFacultySubjectAllocationRepository
    {
        private readonly AppDbContext _context;

        public FacultySubjectAllocationRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<FacultySubjectAllocation?> GetByIdAsync(int id)
        {
            var result = await Connection.QueryAsync<FacultySubjectAllocation, Faculty, FacultySubjectAllocation>(
                "sp_GetSubjectAllocationById",
                (allocation, faculty) =>
                {
                    allocation.Faculty = faculty;
                    return allocation;
                },
                new { p_Id = id },
                commandType: CommandType.StoredProcedure,
                splitOn: "Id");

            return result.FirstOrDefault();
        }

        public async Task<List<FacultySubjectAllocation>> GetByFacultyIdAsync(int facultyId)
        {
            var result = await Connection.QueryAsync<FacultySubjectAllocation, Faculty, FacultySubjectAllocation>(
                "sp_GetSubjectAllocationsByFacultyId",
                (allocation, faculty) =>
                {
                    allocation.Faculty = faculty;
                    return allocation;
                },
                new { p_FacultyId = facultyId },
                commandType: CommandType.StoredProcedure,
                splitOn: "Id");

            return result.ToList();
        }

        public async Task<bool> ExistsAllocationAsync(int facultyId, string board, string academicYear, string group, string academicLevel, string section, string subject, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckDuplicateSubjectAllocation",
                new
                {
                    p_FacultyId = facultyId,
                    p_Board = board,
                    p_AcademicYear = academicYear,
                    p_Group = group,
                    p_AcademicLevel = academicLevel,
                    p_Section = section,
                    p_Subject = subject,
                    p_ExcludeId = excludeId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<FacultySubjectAllocation> AddAsync(FacultySubjectAllocation allocation)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateSubjectAllocation",
                new
                {
                    p_FacultyId = allocation.FacultyId,
                    p_Board = "", // allocation.Board,
                    p_AcademicYear = "", // allocation.AcademicYear,
                    p_Group = "", // allocation.Group,
                    p_AcademicLevel = "", // allocation.AcademicLevel,
                    p_Section = "", // allocation.Section,
                    p_Subject = "", // allocation.Subject
                },
                commandType: CommandType.StoredProcedure);

            allocation.Id = id;
            return allocation;
        }

        public async Task UpdateAsync(FacultySubjectAllocation allocation)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateSubjectAllocation",
                new
                {
                    p_Id = allocation.Id,
                    p_Board = "", // allocation.Board,
                    p_AcademicYear = "", // allocation.AcademicYear,
                    p_Group = "", // allocation.Group,
                    p_AcademicLevel = "", // allocation.AcademicLevel,
                    p_Section = "", // allocation.Section,
                    p_Subject = "", // allocation.Subject
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(FacultySubjectAllocation allocation)
        {
            await Connection.ExecuteAsync(
                "sp_DeleteSubjectAllocation",
                new { p_Id = allocation.Id },
                commandType: CommandType.StoredProcedure);
        }
    }
}
