using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.DTOs.Faculty.Request;
using CollegeManagement.API.DTOs.Faculty.Response;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IFacultyService
    {
        Task<PagedResult<FacultyResponseDto>> GetPagedFacultiesAsync(FacultyQueryParams queryParams);
        Task<FacultyResponseDto?> GetFacultyByIdAsync(int id);
        Task<FacultyResponseDto?> GetFacultyByEmployeeIdAsync(string employeeId);
        Task<FacultyResponseDto> CreateFacultyAsync(CreateFacultyDto dto);
        Task<FacultyResponseDto> UpdateFacultyAsync(int id, UpdateFacultyDto dto);
        Task<bool> DeleteFacultyAsync(int id);
        Task<FacultyResponseDto> UploadPhotoAsync(UploadFacultyPhotoDto dto);
        Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id);

        Task<FacultySubjectAllocationResponseDto> AssignSubjectAsync(AssignSubjectDto dto);
        Task<FacultySubjectAllocationResponseDto> UpdateSubjectAllocationAsync(int id, UpdateSubjectAllocationDto dto);
        Task<bool> DeleteSubjectAllocationAsync(int id);

        Task<FacultyWorkloadResponseDto?> GetFacultyWorkloadAsync(int facultyId);
    }
}
