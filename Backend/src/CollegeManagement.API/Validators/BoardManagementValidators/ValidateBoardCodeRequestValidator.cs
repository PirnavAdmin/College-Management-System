using CollegeManagement.API.DTOs.Board.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.BoardManagementValidators
{
    /// <summary>
    /// Validator for <see cref="ValidateBoardCodeRequest"/> to validate board code checking format.
    /// </summary>
    public class ValidateBoardCodeRequestValidator : AbstractValidator<ValidateBoardCodeRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ValidateBoardCodeRequestValidator"/> class.
        /// </summary>
        public ValidateBoardCodeRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.BoardCode)
                .NotEmpty().WithMessage("Board code is required.")
                .Length(2, 50).WithMessage("Board code must be between 2 and 50 characters.")
                .Matches(@"^[A-Za-z0-9_-]+$").WithMessage("Board code can only contain letters, numbers, hyphens, and underscores.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Board ID must be greater than 0.")
                .When(x => x.BoardId.HasValue);
        }
    }
}
