using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs
{
    public class RegisterRequest
    {
        [Required]
        public string Role { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Phone]
        [StringLength(15)]
        public string MobileNumber { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare(nameof(Password), ErrorMessage = "Password and Confirm Password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
