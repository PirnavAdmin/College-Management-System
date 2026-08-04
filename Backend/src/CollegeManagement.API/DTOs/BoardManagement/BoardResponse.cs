using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    public class BoardResponse
    {
        public int BoardId { get; set; }

        public string BoardName { get; set; } = string.Empty;

        public string BoardCode { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int CountryId { get; set; }

        public string CountryName { get; set; } = string.Empty;

        public int? StateId { get; set; }

        public string? StateName { get; set; }

        public int AcademicPatternId { get; set; }

        public string AcademicPatternName { get; set; } = string.Empty;

        public List<int> AcademicLevelIds { get; set; } = [];

        public List<string> AcademicLevelNames { get; set; } = [];

        public bool InternalAssessment { get; set; }

        public bool PracticalExams { get; set; }

        public bool BoardExams { get; set; }

        public decimal PassPercentage { get; set; }

        public int GradingSystemId { get; set; }

        public string GradingSystemName { get; set; } = string.Empty;

        public bool RankCalculation { get; set; }

        public bool Status { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
