using System;

namespace CollegeManagement.API.DTOs.AcademicYear
{
    public class AcademicYearResponseDto
    {
        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public DateOnly AdmissionStartDate { get; set; }
        public DateOnly AdmissionEndDate { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
