namespace CollegeManagement.API.DTOs.Board.Requests
{
    public class BoardSearchRequest
    {
        public string? BoardName { get; set; }

        public string? BoardCode { get; set; }

        public int? CountryId { get; set; }

        public int? StateId { get; set; }

        public bool? Status { get; set; }
    }
}
