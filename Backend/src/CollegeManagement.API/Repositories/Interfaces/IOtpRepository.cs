using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IOtpRepository
    {
        Task AddAsync(OTP otp);
        Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode);
        Task UpdateAsync(OTP otp);
    }
}
