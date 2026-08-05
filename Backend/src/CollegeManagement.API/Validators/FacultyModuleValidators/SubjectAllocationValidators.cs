using CollegeManagement.API.DTOs.Faculty.Request;
using FluentValidation;

namespace CollegeManagement.API.Validators.FacultyModuleValidators
{
    public class AssignSubjectDtoValidator : AbstractValidator<AssignSubjectDto>
    {
        public AssignSubjectDtoValidator()
        {
            RuleFor(x => x.FacultyId)
                .GreaterThan(0).WithMessage("Valid Faculty ID is required.");

            RuleFor(x => x.Board)
                .NotEmpty().WithMessage("Board is required.")
                .MaximumLength(100).WithMessage("Board cannot exceed 100 characters.");

            RuleFor(x => x.AcademicYear)
                .NotEmpty().WithMessage("Academic year is required.")
                .MaximumLength(50).WithMessage("Academic year cannot exceed 50 characters.");

            RuleFor(x => x.Group)
                .NotEmpty().WithMessage("Group is required.")
                .MaximumLength(100).WithMessage("Group cannot exceed 100 characters.");

            RuleFor(x => x.AcademicLevel)
                .NotEmpty().WithMessage("Academic level is required.")
                .MaximumLength(50).WithMessage("Academic level cannot exceed 50 characters.");

            RuleFor(x => x.Section)
                .NotEmpty().WithMessage("Section is required.")
                .MaximumLength(50).WithMessage("Section cannot exceed 50 characters.");

            RuleFor(x => x.Subject)
                .NotEmpty().WithMessage("Subject is required.")
                .MaximumLength(100).WithMessage("Subject cannot exceed 100 characters.");
        }
    }

    public class UpdateSubjectAllocationDtoValidator : AbstractValidator<UpdateSubjectAllocationDto>
    {
        public UpdateSubjectAllocationDtoValidator()
        {
            RuleFor(x => x.Board)
                .NotEmpty().WithMessage("Board is required.")
                .MaximumLength(100).WithMessage("Board cannot exceed 100 characters.");

            RuleFor(x => x.AcademicYear)
                .NotEmpty().WithMessage("Academic year is required.")
                .MaximumLength(50).WithMessage("Academic year cannot exceed 50 characters.");

            RuleFor(x => x.Group)
                .NotEmpty().WithMessage("Group is required.")
                .MaximumLength(100).WithMessage("Group cannot exceed 100 characters.");

            RuleFor(x => x.AcademicLevel)
                .NotEmpty().WithMessage("Academic level is required.")
                .MaximumLength(50).WithMessage("Academic level cannot exceed 50 characters.");

            RuleFor(x => x.Section)
                .NotEmpty().WithMessage("Section is required.")
                .MaximumLength(50).WithMessage("Section cannot exceed 50 characters.");

            RuleFor(x => x.Subject)
                .NotEmpty().WithMessage("Subject is required.")
                .MaximumLength(100).WithMessage("Subject cannot exceed 100 characters.");
        }
    }
}
