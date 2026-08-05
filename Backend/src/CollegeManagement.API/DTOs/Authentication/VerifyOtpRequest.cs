namespace CollegeManagement.API.DTOs.Authentication
{
    public class VerifyOtpRequest
    {
        public required string Email { get; set; }

        public required string Otp { get; set; }
    }
}