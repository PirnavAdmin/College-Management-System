namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class ExaminationStatusResponse
    {
        public int ExaminationId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ActionReason { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}