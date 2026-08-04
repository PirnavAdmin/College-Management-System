using CollegeManagement.API.DTOs;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _repository;

        public SubjectService(ISubjectRepository repository)
        {
            _repository = repository;
        }

        // ==========================
        // GET ALL
        // ==========================
        public async Task<IEnumerable<Subject>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        // ==========================
        // GET BY ID
        // ==========================
        public async Task<Subject?> GetByIdAsync(int subjectId)
        {
            return await _repository.GetByIdAsync(subjectId);
        }

        // ==========================
        // CREATE
        // ==========================
        public async Task<Subject> CreateAsync(CreateSubjectDto dto)
        {
            var subject = new Subject
            {
                Board = dto.Board,
                Group = dto.Group,
                AcademicLevel = dto.AcademicLevel,
                SubjectName = dto.SubjectName,
                SubjectCode = dto.SubjectCode,
                SubjectType = dto.SubjectType,
                Theory = dto.Theory,
                Practical = dto.Practical,
                Language = dto.Language,
                Elective = dto.Elective,
                InternalMarks = dto.InternalMarks,
                PracticalMarks = dto.PracticalMarks,
                ExternalMarks = dto.ExternalMarks,
                TotalMarks = dto.TotalMarks,
                PassingMarks = dto.PassingMarks
            };

            return await _repository.CreateAsync(subject);
        }

        // ==========================
        // UPDATE
        // ==========================
        public async Task<Subject?> UpdateAsync(int subjectId, UpdateSubjectDto dto)
        {
            var existing = await _repository.GetByIdAsync(subjectId);

            if (existing == null)
                return null;

            existing.Board = dto.Board;
            existing.Group = dto.Group;
            existing.AcademicLevel = dto.AcademicLevel;
            existing.SubjectName = dto.SubjectName;
            existing.SubjectCode = dto.SubjectCode;
            existing.SubjectType = dto.SubjectType;
            existing.Theory = dto.Theory;
            existing.Practical = dto.Practical;
            existing.Language = dto.Language;
            existing.Elective = dto.Elective;
            existing.InternalMarks = dto.InternalMarks;
            existing.PracticalMarks = dto.PracticalMarks;
            existing.ExternalMarks = dto.ExternalMarks;
            existing.TotalMarks = dto.TotalMarks;
            existing.PassingMarks = dto.PassingMarks;

            return await _repository.UpdateAsync(subjectId, existing);
        }

        // ==========================
        // DELETE
        // ==========================
        public async Task<bool> DeleteAsync(int subjectId)
        {
            var existing = await _repository.GetByIdAsync(subjectId);

            if (existing == null)
                return false;

            return await _repository.DeleteAsync(subjectId);
        }

        // ==========================
        // GET BY GROUP
        // ==========================
        public async Task<IEnumerable<Subject>> GetByGroupAsync(string group)
        {
            return await _repository.GetByGroupAsync(group);
        }
    }
}