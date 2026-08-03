using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.AcademicYear
{
    public class CreateAcademicYearDto
    {
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

        public bool IsActive { get; set; } = false;
    }
}
