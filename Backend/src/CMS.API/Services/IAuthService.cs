using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Services
{
    public interface IAuthService
    {
        Task<AuthResult> LoginAsync(LoginRequest request);
        Task<AuthResult> RegisterAsync(RegisterRequest request);
        Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request);
        Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
