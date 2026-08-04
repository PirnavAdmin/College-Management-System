using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.Models
{
    public class AcademicYear
    {
        [Key]
        public int AcademicYearId { get; set; }

        [Required]
        [StringLength(50)]
        public string AcademicYearName { get; set; } = string.Empty;

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        [Required]
        public DateOnly AdmissionStartDate { get; set; }

        [Required]
        public DateOnly AdmissionEndDate { get; set; }

        [Required]
        public bool IsActive { get; set; }
    }
}
