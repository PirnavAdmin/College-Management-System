using CollegeManagement.API.DTOs.StudentAdmission;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStudentAdmissionRepository
    {
        // =====================================================
        // ADMISSION
        // =====================================================

        Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request,
            string? studentPhoto);

        Task<StudentAdmissionResponseDto?> GetByIdAsync(
            int admissionId);

        Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync();

        Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto);



        //bloodgroup//
        public Task<IEnumerable<string>> GetBloodGroupsAsync()
        {
            IEnumerable<string> bloodGroups = new[]
            {
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-"
    };

            return Task.FromResult(bloodGroups);
        }
        //generate//
        Task<string> GenerateAdmissionNumberAsync();


        // =====================================================
        // VERIFY / APPROVE / REJECT
        // =====================================================

        Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request);

        Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request);

        Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request);


        // =====================================================
        // SECTION ALLOCATION
        // =====================================================

        Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request);

        Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request);


        // =====================================================
        // ROLL NUMBER ALLOCATION
        // =====================================================

        Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request);
    }


    }