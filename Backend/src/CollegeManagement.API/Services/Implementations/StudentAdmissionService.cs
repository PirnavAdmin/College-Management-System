using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentAdmissionService
        : IStudentAdmissionService
    {
        private readonly IStudentAdmissionRepository _repository;
        private readonly IWebHostEnvironment _environment;

        public StudentAdmissionService(
            IStudentAdmissionRepository repository,
            IWebHostEnvironment environment)
        {
            _repository = repository;
            _environment = environment;
        }


        // =====================================================
        // CREATE ADMISSION
        // =====================================================

        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateCreateRequest(request);

            // ---------------------------------------------
            // Save only Student Photo
            // ---------------------------------------------

            var photoPath = await SaveStudentPhotoAsync(
                request.StudentPhoto);

            // ---------------------------------------------
            // Create Admission
            // ---------------------------------------------

            return await _repository.CreateAsync(
                request,
                photoPath);
        }


        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<StudentAdmissionResponseDto?>
            GetByIdAsync(int admissionId)
        {
            if (admissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            return await _repository.GetByIdAsync(
                admissionId);
        }


        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<IEnumerable<StudentAdmissionResponseDto>>
            GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }


        // =====================================================
        // UPDATE
        // =====================================================

        public async Task<StudentAdmissionResponseDto?>
            UpdateAsync(
                int admissionId,
                UpdateStudentAdmissionRequest request)
        {
            if (admissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateUpdateRequest(request);

            string? photoPath = null;

            // Photo only if user uploads a new one
            if (request.StudentPhoto != null &&
                request.StudentPhoto.Length > 0)
            {
                photoPath = await SaveStudentPhotoAsync(
                    request.StudentPhoto);
            }

            return await _repository.UpdateAsync(
                admissionId,
                request,
                photoPath);
        }


        //bloodgroup//
        public async Task<IEnumerable<string>> GetBloodGroupsAsync()
        {
            return await _repository.GetBloodGroupsAsync();
        }


        // =====================================================
        // VERIFY
        // =====================================================

        public async Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            return await _repository.VerifyAsync(
                request);
        }

        //generate//

        // =====================================================
        // GENERATE ADMISSION NUMBER
        // =====================================================

        public async Task<string> GenerateAdmissionNumberAsync()
        {
            return await _repository.GenerateAdmissionNumberAsync();
        }

        // =====================================================
        // APPROVE
        // =====================================================

        public async Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            return await _repository.ApproveAsync(
                request);
        }


        // =====================================================
        // REJECT
        // =====================================================

        public async Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (string.IsNullOrWhiteSpace(
                    request.RejectionReason))
            {
                throw new ArgumentException(
                    "Rejection reason is required.");
            }

            return await _repository.RejectAsync(
                request);
        }


        // =====================================================
        // SINGLE SECTION ALLOCATION
        // =====================================================

        public async Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            return await _repository
                .AllocateSectionAsync(request);
        }


        // =====================================================
        // BULK SECTION ALLOCATION
        // =====================================================

        public async Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            if (request.AdmissionIds == null ||
                request.AdmissionIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one admission must be selected.");
            }

            return await _repository
                .BulkAllocateSectionAsync(request);
        }


        // =====================================================
        // BULK ROLL NUMBER ALLOCATION
        // =====================================================

        public async Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            if (request.StartingRollNumber <= 0)
                throw new ArgumentException(
                    "Starting roll number must be greater than zero.");

            if (request.AdmissionIds == null ||
                request.AdmissionIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one admission must be selected.");
            }

            return await _repository
                .BulkAllocateRollNumbersAsync(request);
        }


        // =====================================================
        // CREATE VALIDATION
        // =====================================================

        private static void ValidateCreateRequest(
            CreateStudentAdmissionRequest request)
        {
            if (request.BoardId <= 0)
                throw new ArgumentException(
                    "Board is required.");

            if (request.AcademicYearId <= 0)
                throw new ArgumentException(
                    "Academic Year is required.");

            if (request.AcademicLevelId <= 0)
                throw new ArgumentException(
                    "Academic Level is required.");

            if (request.GroupId <= 0)
                throw new ArgumentException(
                    "Group is required.");

            if (request.ProgramId <= 0)
                throw new ArgumentException(
                    "Program is required.");

            if (string.IsNullOrWhiteSpace(
                    request.FirstName))
            {
                throw new ArgumentException(
                    "First name is required.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.Gender))
            {
                throw new ArgumentException(
                    "Gender is required.");
            }

            if (request.DateOfBirth == default)
                throw new ArgumentException(
                    "Date of birth is required.");

            if (request.StudentPhoto == null ||
                request.StudentPhoto.Length == 0)
            {
                throw new ArgumentException(
                    "Student photo is required.");
            }
        }


        // =====================================================
        // UPDATE VALIDATION
        // =====================================================

        private static void ValidateUpdateRequest(
            UpdateStudentAdmissionRequest request)
        {
            if (request.BoardId <= 0)
                throw new ArgumentException(
                    "Board is required.");

            if (request.AcademicYearId <= 0)
                throw new ArgumentException(
                    "Academic Year is required.");

            if (request.AcademicLevelId <= 0)
                throw new ArgumentException(
                    "Academic Level is required.");

            if (request.GroupId <= 0)
                throw new ArgumentException(
                    "Group is required.");

            if (request.ProgramId <= 0)
                throw new ArgumentException(
                    "Program is required.");

            if (string.IsNullOrWhiteSpace(
                    request.FirstName))
            {
                throw new ArgumentException(
                    "First name is required.");
            }
        }


        // =====================================================
        // SAVE STUDENT PHOTO
        // =====================================================

        private async Task<string> SaveStudentPhotoAsync(
            IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException(
                    "Student photo is required.");

            var extension =
                Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

            var allowedExtensions = new[]
            {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp"
            };

            if (!allowedExtensions.Contains(extension))
            {
                throw new ArgumentException(
                    "Only JPG, JPEG, PNG and WEBP photos are allowed.");
            }

            const long maxFileSize = 5 * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                throw new ArgumentException(
                    "Student photo must be less than 5 MB.");
            }

            var folder = Path.Combine(
                _environment.WebRootPath ?? "wwwroot",
                "uploads",
                "student-photos");

            Directory.CreateDirectory(folder);

            var fileName =
                $"{Guid.NewGuid():N}{extension}";

            var fullPath =
                Path.Combine(folder, fileName);

            await using var stream =
                new FileStream(
                    fullPath,
                    FileMode.Create);

            await file.CopyToAsync(stream);

            return
                $"/uploads/student-photos/{fileName}";
        }
    }
}