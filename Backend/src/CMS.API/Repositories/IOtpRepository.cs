using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories
{
    public interface IOtpRepository
    {
        Task AddAsync(OTP otp);
        Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode);
        Task UpdateAsync(OTP otp);
    }
}
