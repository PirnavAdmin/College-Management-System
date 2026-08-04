namespace CollegeManagement.API.DTOs.Board.Responses
{
    public class ValidateBoardCodeResponse
    {
        public bool IsValid { get; set; }

        public string? Message { get; set; }
    }
}
