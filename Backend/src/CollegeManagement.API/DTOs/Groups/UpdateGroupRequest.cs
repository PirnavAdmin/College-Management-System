using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Groups
{
    public class UpdateGroupRequest
    {
        [Required(ErrorMessage = "Board is required")]
        [MaxLength(100)]
        public string Board { get; set; } = string.Empty;

        [Range(1, int.MaxValue,
            ErrorMessage = "Valid AcademicYearId is required")]
        public int AcademicYearId { get; set; }

        [Required(ErrorMessage = "Academic level is required")]
        [MaxLength(50)]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required(ErrorMessage = "Group name is required")]
        [MaxLength(100)]
        public string GroupName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Group code is required")]
        [MaxLength(30)]
        public string GroupCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; }
    }
}