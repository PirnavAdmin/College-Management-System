using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Subjects")]
    public class Subject
    {
        [Key]
        public int SubjectId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Board { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Group { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string SubjectName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SubjectCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SubjectType { get; set; } = string.Empty;

        public bool Theory { get; set; }

        public bool Practical { get; set; }

        public bool Language { get; set; }

        public bool Elective { get; set; }

        public int InternalMarks { get; set; }

        public int PracticalMarks { get; set; }

        public int ExternalMarks { get; set; }

        public int TotalMarks { get; set; }

        public int PassingMarks { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}