namespace CollegeManagement.API.DTOs.Board.Requests
{
    public class CreateBoardRequest
    {
        public string BoardName { get; set; } = string.Empty;

        public string BoardCode { get; set; } = string.Empty;

        public string BoardType { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int CountryId { get; set; }

        public int? StateId { get; set; }

        public int AcademicPatternId { get; set; }

        public List<int> AcademicLevelIds { get; set; } = [];

        public bool InternalAssessment { get; set; }

        public bool PracticalExams { get; set; }

        public bool BoardExams { get; set; }

        public decimal PassPercentage { get; set; }

        public int GradingSystemId { get; set; }

        public bool RankCalculation { get; set; }

        public bool Status { get; set; }
    }
}
