using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAcademicYearService
    {
        Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync();
        Task<AcademicYearResponseDto?> GetByIdAsync(int id);
        Task<AcademicYearResponseDto> CreateAsync(CreateAcademicYearDto dto);
        Task<AcademicYearResponseDto?> UpdateAsync(int id, UpdateAcademicYearDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ActivateAsync(int id);
    }
}
