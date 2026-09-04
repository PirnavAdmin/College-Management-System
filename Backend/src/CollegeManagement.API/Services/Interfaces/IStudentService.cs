using CollegeManagement.API.DTOs.Students;

namespace CollegeManagement.API.Services
{
    public interface IStudentService
    {
        // =========================================================
        // STUDENT CRUD
        // =========================================================

        Task<List<StudentListItemDto>> GetAllAsync();

        Task<StudentResponse?> GetByIdAsync(
            int studentId);

        Task<StudentResponse> CreateAsync(
            CreateStudentRequest request);

        Task<StudentResponse?> UpdateAsync(
            int studentId,
            UpdateStudentRequest request);

        Task<bool> DeleteAsync(
            int studentId);


        // =========================================================
        // STUDENT PROFILE
        // =========================================================

        Task<StudentProfileDto?> GetProfileAsync(
            int studentId);

        Task<StudentProfileDto?> UpdateProfileAsync(
            int studentId,
            StudentProfileDto request);


        // =========================================================
        // ACADEMIC OPERATIONS
        // =========================================================

        Task<bool> ChangeSectionAsync(
            int studentId,
            ChangeSectionRequest request);

        Task<bool> ChangeGroupAsync(
            int studentId,
            ChangeGroupRequest request);

        Task<bool> TransferAsync(
            int studentId,
            TransferStudentRequest request);


        // =========================================================
        // STUDENT STATUS
        // =========================================================

        Task<bool> SuspendAsync(
            int studentId,
            SuspendStudentRequest request);

        Task<bool> ActivateAsync(
            int studentId);


        // =========================================================
        // AUTHENTICATION
        // =========================================================

        Task<StudentPhotoUploadResultDto> UploadPhotoAsync(int studentId, Microsoft.AspNetCore.Http.IFormFile file, System.Threading.CancellationToken ct = default);
        Task<StudentDocumentUploadResultDto> UploadDocumentAsync(int studentId, string documentType, Microsoft.AspNetCore.Http.IFormFile file, System.Threading.CancellationToken ct = default);
        Task<bool> ResetPasswordAsync(
            int studentId);


        // =========================================================
        // DASHBOARD
        // =========================================================

        Task<StudentDashboardDto?> GetDashboardAsync(
            int studentId);


        // =========================================================
        // SEARCH / FILTER
        // =========================================================

        Task<List<StudentListItemDto>> SearchAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            int? sectionId,
            bool? isActive);


        // =========================================================
        // GET BY GROUP
        // =========================================================

        Task<List<StudentListItemDto>> GetByGroupAsync(
            int groupId);


        // =========================================================
        // GET BY SECTION
        // =========================================================

        Task<List<StudentListItemDto>> GetBySectionAsync(
            int sectionId);


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        Task<List<StudentListItemDto>> GetActiveAsync();


        // =========================================================
        // VALIDATION
        // =========================================================

        Task<bool> EmailExistsAsync(
            string email,
            int? excludeStudentId = null);

        Task<bool> MobileExistsAsync(
            string mobile,
            int? excludeStudentId = null);
    }
}