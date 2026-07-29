namespace CollegeManagement.API.DTOs
{
    public class VerifyOtpRequest
    {
        public required string Email { get; set; }

        public required string Otp { get; set; }
    }
}