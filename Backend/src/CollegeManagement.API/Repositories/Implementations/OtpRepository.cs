using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
namespace CollegeManagement.API.Repositories.Implementations
{
    public class OtpRepository : IOtpRepository
    {
        private readonly AppDbContext _context;
        public OtpRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task AddAsync(OTP otp)
        {
            var result = await _context.Database
                .SqlQueryRaw<long>("CALL usp_AddOtp({0}, {1}, {2}, {3})",
                    otp.Email, otp.OTPCode, otp.ExpiryTime, otp.IsUsed)
                .ToListAsync();
            otp.OTPId = (int)result.FirstOrDefault();
        }
        public async Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode)
        {
            var result = await _context.OTPs
                .FromSqlRaw("CALL usp_GetLatestActiveOtp({0}, {1})", email, otpCode)
                .ToListAsync();
            return result.FirstOrDefault();
        }
        public async Task UpdateAsync(OTP otp)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "CALL usp_UpdateOtp({0}, {1}, {2}, {3}, {4})",
                otp.OTPId, otp.Email, otp.OTPCode, otp.ExpiryTime, otp.IsUsed);
        }
    }
}
