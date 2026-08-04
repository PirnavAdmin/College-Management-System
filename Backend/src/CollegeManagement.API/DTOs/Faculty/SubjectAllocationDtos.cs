namespace CollegeManagement.API.DTOs.Faculty.Request
{
    public class AssignSubjectDto
    {
        public int FacultyId { get; set; }
        public string Board { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;
        public string AcademicLevel { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
    }

    public class UpdateSubjectAllocationDto
    {
        public string Board { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;
        public string AcademicLevel { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
    }

    public class FacultySubjectAllocationResponseDto
    {
        public int Id { get; set; }
        public int FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public string Board { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;
        public string AcademicLevel { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
