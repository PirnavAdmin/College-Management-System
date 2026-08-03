using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Groups")]
    public class Group
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int GroupId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Board { get; set; } = string.Empty;

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string GroupName { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string GroupCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}