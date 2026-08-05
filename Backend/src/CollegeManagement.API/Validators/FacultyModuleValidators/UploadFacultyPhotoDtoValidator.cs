using System.IO;
using System.Linq;
using CollegeManagement.API.DTOs.Faculty.Request;
using FluentValidation;

namespace CollegeManagement.API.Validators.FacultyModuleValidators
{
    public class UploadFacultyPhotoDtoValidator : AbstractValidator<UploadFacultyPhotoDto>
    {
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public UploadFacultyPhotoDtoValidator()
        {
            RuleFor(x => x.FacultyId)
                .GreaterThan(0).WithMessage("Valid Faculty ID is required.");

            RuleFor(x => x.Photo)
                .NotNull().WithMessage("Photo file is required.")
                .Must(photo => photo != null && photo.Length > 0).WithMessage("Photo file cannot be empty.")
                .Must(photo => photo != null && photo.Length <= MaxFileSizeBytes).WithMessage("Photo file size cannot exceed 5 MB.")
                .Must(photo =>
                {
                    if (photo == null) return false;
                    var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
                    return AllowedExtensions.Contains(extension);
                }).WithMessage("Invalid image format. Allowed formats: .jpg, .jpeg, .png, .webp");
        }
    }
}
