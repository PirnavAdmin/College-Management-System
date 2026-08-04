namespace CollegeManagement.API.DTOs.Board.Requests
{
    public class ValidateBoardCodeRequest
    {
        public string BoardCode { get; set; } = string.Empty;

        public int? BoardId { get; set; }
    }
}
