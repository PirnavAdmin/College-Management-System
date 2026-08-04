using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
namespace CollegeManagement.API.Repositories.Implementations
{
    public class AcademicYearRepository : IAcademicYearRepository
    {
        private readonly AppDbContext _context;
        public AcademicYearRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<AcademicYear>> GetAllAsync()
        {
            return await _context.AcademicYears
                .FromSqlRaw("CALL usp_GetAllAcademicYears()")
                .ToListAsync();
        }
        public async Task<AcademicYear?> GetByIdAsync(int id)
        {
            var result = await _context.AcademicYears
                .FromSqlRaw("CALL usp_GetAcademicYearById({0})", id)
                .ToListAsync();
            return result.FirstOrDefault();
        }
        public async Task AddAsync(AcademicYear academicYear)
        {
            var result = await _context.Database
                .SqlQueryRaw<long>("CALL usp_AddAcademicYear({0}, {1}, {2}, {3}, {4}, {5})",
                    academicYear.AcademicYearName, academicYear.StartDate, academicYear.EndDate,
                    academicYear.AdmissionStartDate, academicYear.AdmissionEndDate, academicYear.IsActive)
                .ToListAsync();
            academicYear.AcademicYearId = (int)result.FirstOrDefault();
        }
        public async Task UpdateAsync(AcademicYear academicYear)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "CALL usp_UpdateAcademicYear({0}, {1}, {2}, {3}, {4}, {5}, {6})",
                academicYear.AcademicYearId, academicYear.AcademicYearName, academicYear.StartDate, academicYear.EndDate,
                academicYear.AdmissionStartDate, academicYear.AdmissionEndDate, academicYear.IsActive);
        }
        public async Task DeleteAsync(AcademicYear academicYear)
        {
            await _context.Database.ExecuteSqlRawAsync("CALL usp_DeleteAcademicYear({0})", academicYear.AcademicYearId);
        }
        public async Task DeactivateAllExceptAsync(int activeId)
        {
            await _context.Database.ExecuteSqlRawAsync("CALL usp_DeactivateAllExcept({0})", activeId);
        }
    }
}
