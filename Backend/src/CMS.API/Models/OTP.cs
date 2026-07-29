using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.Models
{
    public class OTP
    {
        [Key]
        public int OTPId { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(6)]
        public string OTPCode { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiryTime { get; set; }

        [Required]
        public bool IsUsed { get; set; } = false;
    }
}