using CollegeManagement.API.DTOs;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Services
{
    public interface ISubjectService
    {
        Task<IEnumerable<Subject>> GetAllAsync();

        Task<Subject?> GetByIdAsync(int subjectId);

        Task<Subject> CreateAsync(CreateSubjectDto dto);

        Task<Subject?> UpdateAsync(int subjectId, UpdateSubjectDto dto);

        Task<bool> DeleteAsync(int subjectId);

        Task<IEnumerable<Subject>> GetByGroupAsync(string group);
    }
}