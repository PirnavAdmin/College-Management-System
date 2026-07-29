using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories
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
            _context.OTPs.Add(otp);
            await _context.SaveChangesAsync();
        }

        public async Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode)
        {
            return await _context.OTPs
                .Where(o => o.Email == email && o.OTPCode == otpCode && !o.IsUsed && o.ExpiryTime > DateTime.UtcNow)
                .OrderByDescending(o => o.ExpiryTime)
                .FirstOrDefaultAsync();
        }

        public async Task UpdateAsync(OTP otp)
        {
            _context.OTPs.Update(otp);
            await _context.SaveChangesAsync();
        }
    }
}
