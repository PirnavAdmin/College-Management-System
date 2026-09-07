using CollegeManagement.API.DTOs.Faculty.Request;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Faculty.Response
{
    public class FacultyWorkloadResponseDto
    {
        public int FacultyId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FacultyName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int TotalAssignedSubjects { get; set; }
        public int TotalSections { get; set; }
        public int WeeklyClasses { get; set; }
        public decimal TotalWorkloadHours { get; set; }
        public List<FacultySubjectAllocationResponseDto> Allocations { get; set; } = new List<FacultySubjectAllocationResponseDto>();
    }
}
