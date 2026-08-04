namespace CollegeManagement.API.DTOs.Subject
{
    public class CreateSubjectDto
    {
        public string Board { get; set; } = string.Empty;

        public string Group { get; set; } = string.Empty;

        public string AcademicLevel { get; set; } = string.Empty;

        public string SubjectName { get; set; } = string.Empty;

        public string SubjectCode { get; set; } = string.Empty;

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
    }
}