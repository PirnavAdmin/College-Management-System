using CollegeManagement.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAcademicYearRepository
    {
        Task<IEnumerable<AcademicYear>> GetAllAsync();
        Task<AcademicYear?> GetByIdAsync(int id);
        Task AddAsync(AcademicYear academicYear);
        Task UpdateAsync(AcademicYear academicYear);
        Task DeleteAsync(AcademicYear academicYear);
        Task DeactivateAllExceptAsync(int activeId);
    }
}
