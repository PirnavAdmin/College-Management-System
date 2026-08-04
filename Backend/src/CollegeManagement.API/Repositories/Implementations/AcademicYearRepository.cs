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
                .FromSqlRaw("EXEC dbo.usp_GetAllAcademicYears")
                .ToListAsync();
        }

        public async Task<AcademicYear?> GetByIdAsync(int id)
        {
            var param = new SqlParameter("@AcademicYearId", id);
            var result = await _context.AcademicYears
                .FromSqlRaw("EXEC dbo.usp_GetAcademicYearById @AcademicYearId", param)
                .ToListAsync();
            return result.FirstOrDefault();
        }

        public async Task AddAsync(AcademicYear academicYear)
        {
            var pName = new SqlParameter("@AcademicYearName", academicYear.AcademicYearName);
            var pStart = new SqlParameter("@StartDate", academicYear.StartDate);
            var pEnd = new SqlParameter("@EndDate", academicYear.EndDate);
            var pAdStart = new SqlParameter("@AdmissionStartDate", academicYear.AdmissionStartDate);
            var pAdEnd = new SqlParameter("@AdmissionEndDate", academicYear.AdmissionEndDate);
            var pIsActive = new SqlParameter("@IsActive", academicYear.IsActive);

            var result = await _context.Database
                .SqlQueryRaw<decimal>("EXEC dbo.usp_AddAcademicYear @AcademicYearName, @StartDate, @EndDate, @AdmissionStartDate, @AdmissionEndDate, @IsActive",
                    pName, pStart, pEnd, pAdStart, pAdEnd, pIsActive)
                .ToListAsync();

            academicYear.AcademicYearId = (int)result.FirstOrDefault();
        }

        public async Task UpdateAsync(AcademicYear academicYear)
        {
            var pId = new SqlParameter("@AcademicYearId", academicYear.AcademicYearId);
            var pName = new SqlParameter("@AcademicYearName", academicYear.AcademicYearName);
            var pStart = new SqlParameter("@StartDate", academicYear.StartDate);
            var pEnd = new SqlParameter("@EndDate", academicYear.EndDate);
            var pAdStart = new SqlParameter("@AdmissionStartDate", academicYear.AdmissionStartDate);
            var pAdEnd = new SqlParameter("@AdmissionEndDate", academicYear.AdmissionEndDate);
            var pIsActive = new SqlParameter("@IsActive", academicYear.IsActive);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.usp_UpdateAcademicYear @AcademicYearId, @AcademicYearName, @StartDate, @EndDate, @AdmissionStartDate, @AdmissionEndDate, @IsActive",
                pId, pName, pStart, pEnd, pAdStart, pAdEnd, pIsActive);
        }

        public async Task DeleteAsync(AcademicYear academicYear)
        {
            var param = new SqlParameter("@AcademicYearId", academicYear.AcademicYearId);
            await _context.Database.ExecuteSqlRawAsync("EXEC dbo.usp_DeleteAcademicYear @AcademicYearId", param);
        }

        public async Task DeactivateAllExceptAsync(int activeId)
        {
            var param = new SqlParameter("@ActiveId", activeId);
            await _context.Database.ExecuteSqlRawAsync("EXEC dbo.usp_DeactivateAllExcept @ActiveId", param);
        }
    }
}
