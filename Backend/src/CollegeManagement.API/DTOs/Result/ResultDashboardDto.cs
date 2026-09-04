namespace CollegeManagement.API.DTOs.Result
{
    public class ResultDashboardDto
    {
        public int TotalResults { get; set; }
        public int ProcessedResults { get; set; }
        public int PublishedResults { get; set; }
        public int PendingResults { get; set; }
        public int PassedStudents { get; set; }
        public int FailedStudents { get; set; }
        public decimal PassPercentage { get; set; }
    }
}

