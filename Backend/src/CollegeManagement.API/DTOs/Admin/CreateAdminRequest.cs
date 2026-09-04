using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Admin
{
    public class CreateAdminRequest
    {
        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;
    }
}
