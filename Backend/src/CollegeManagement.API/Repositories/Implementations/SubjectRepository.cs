using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories
{
    public class SubjectRepository : ISubjectRepository
    {
        private readonly AppDbContext _context;

        public SubjectRepository(AppDbContext context)
        {
            _context = context;
        }

        // ==========================
        // GET ALL
        // ==========================
        public async Task<IEnumerable<Subject>> GetAllAsync()
        {
            return await _context.Subjects
                .FromSqlRaw("EXEC sp_GetAllSubjects")
                .AsNoTracking()
                .ToListAsync();
        }

        // ==========================
        // GET BY ID
        // ==========================
        public async Task<Subject?> GetByIdAsync(int subjectId)
        {
            var result = await _context.Subjects
                .FromSqlInterpolated($"EXEC sp_GetSubjectById {subjectId}")
                .AsNoTracking()
                .ToListAsync();

            return result.FirstOrDefault();
        }

        // ==========================
        // CREATE
        // ==========================
        public async Task<Subject> CreateAsync(Subject subject)
        {
            var result = await _context.Subjects
                .FromSqlInterpolated($@"
EXEC sp_AddSubject
    {subject.Board},
    {subject.Group},
    {subject.AcademicLevel},
    {subject.SubjectName},
    {subject.SubjectCode},
    {subject.SubjectType},
    {subject.Theory},
    {subject.Practical},
    {subject.Language},
    {subject.Elective},
    {subject.InternalMarks},
    {subject.PracticalMarks},
    {subject.ExternalMarks},
    {subject.TotalMarks},
    {subject.PassingMarks}")
                .ToListAsync();

            return result.First();
        }

        // ==========================
        // UPDATE
        // ==========================
        public async Task<Subject?> UpdateAsync(int subjectId, Subject subject)
        {
            var result = await _context.Subjects
                .FromSqlInterpolated($@"
EXEC sp_UpdateSubject
    {subjectId},
    {subject.Board},
    {subject.Group},
    {subject.AcademicLevel},
    {subject.SubjectName},
    {subject.SubjectCode},
    {subject.SubjectType},
    {subject.Theory},
    {subject.Practical},
    {subject.Language},
    {subject.Elective},
    {subject.InternalMarks},
    {subject.PracticalMarks},
    {subject.ExternalMarks},
    {subject.TotalMarks},
    {subject.PassingMarks}")
                .ToListAsync();

            return result.FirstOrDefault();
        }

        // ==========================
        // DELETE
        // ==========================
        public async Task<bool> DeleteAsync(int subjectId)
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"EXEC sp_DeleteSubject {subjectId}");

            return true;
        }

        // ==========================
        // GET BY GROUP
        // ==========================
        public async Task<IEnumerable<Subject>> GetByGroupAsync(string group)
        {
            return await _context.Subjects
                .FromSqlInterpolated($"EXEC sp_GetSubjectsByGroup {group}")
                .AsNoTracking()
                .ToListAsync();
        }
    }
}