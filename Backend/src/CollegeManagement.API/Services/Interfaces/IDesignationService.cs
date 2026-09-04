using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDesignationService
    {
        Task<IEnumerable<DesignationResponseDto>> GetAllAsync(bool includeInactive = false, string? staffType = null);
        Task<DesignationResponseDto?> GetByIdAsync(int id);
        Task<DesignationResponseDto> CreateAsync(CreateDesignationDto dto);
        Task<DesignationResponseDto?> UpdateAsync(int id, UpdateDesignationDto dto);
        Task<bool> DeleteAsync(int id);
    }
}

