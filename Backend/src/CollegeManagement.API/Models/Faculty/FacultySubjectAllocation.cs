using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Faculty
{
    public class FacultySubjectAllocation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int FacultyId { get; set; }

        [Required]
        [StringLength(100)]
        public string Board { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Group { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Section { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Subject { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation Property
        [ForeignKey(nameof(FacultyId))]
        public Faculty Faculty { get; set; } = null!;
    }
}
