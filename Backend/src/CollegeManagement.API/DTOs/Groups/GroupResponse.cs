namespace CollegeManagement.API.DTOs.Groups
{
    public class GroupResponse
    {
        public int GroupId { get; set; }

        public string Board { get; set; } = string.Empty;

        public int AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public string AcademicLevel { get; set; } = string.Empty;

        public string GroupName { get; set; } = string.Empty;

        public string GroupCode { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int TotalSubjects { get; set; }

        public bool IsActive { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}