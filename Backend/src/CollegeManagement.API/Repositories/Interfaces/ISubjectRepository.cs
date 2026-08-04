using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories
{
    public interface ISubjectRepository
    {
        Task<IEnumerable<Subject>> GetAllAsync();

        Task<Subject?> GetByIdAsync(int subjectId);

        Task<Subject> CreateAsync(Subject subject);

        Task<Subject?> UpdateAsync(int subjectId, Subject subject);

        Task<bool> DeleteAsync(int subjectId);

        Task<IEnumerable<Subject>> GetByGroupAsync(string group);
    }
}