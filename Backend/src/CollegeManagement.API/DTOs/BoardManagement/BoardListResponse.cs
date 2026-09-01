using System;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    public class BoardListResponse
    {
        public int BoardId { get; set; }

        public string BoardName { get; set; } = string.Empty;

        public string BoardCode { get; set; } = string.Empty;

        public string BoardType { get; set; } = string.Empty;

        public int CountryId { get; set; }

        public string CountryName { get; set; } = string.Empty;

        public int? StateId { get; set; }

        public string? StateName { get; set; }

        public string AcademicPatternName { get; set; } = string.Empty;

        public bool Status { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
