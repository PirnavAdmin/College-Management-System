using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.Data.SqlClient;
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
            var pEmail = new SqlParameter("@Email", otp.Email);
            var pCode = new SqlParameter("@OTPCode", otp.OTPCode);
            var pExpiry = new SqlParameter("@ExpiryTime", otp.ExpiryTime);
            var pIsUsed = new SqlParameter("@IsUsed", otp.IsUsed);

            var result = await _context.Database
                .SqlQueryRaw<decimal>("EXEC dbo.usp_AddOtp @Email, @OTPCode, @ExpiryTime, @IsUsed", pEmail, pCode, pExpiry, pIsUsed)
                .ToListAsync();

            otp.OTPId = (int)result.FirstOrDefault();
        }

        public async Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode)
        {
            var pEmail = new SqlParameter("@Email", email);
            var pCode = new SqlParameter("@OtpCode", otpCode);

            var result = await _context.OTPs
                .FromSqlRaw("EXEC dbo.usp_GetLatestActiveOtp @Email, @OtpCode", pEmail, pCode)
                .ToListAsync();
            return result.FirstOrDefault();
        }

        public async Task UpdateAsync(OTP otp)
        {
            var pOtpId = new SqlParameter("@OTPId", otp.OTPId);
            var pEmail = new SqlParameter("@Email", otp.Email);
            var pCode = new SqlParameter("@OTPCode", otp.OTPCode);
            var pExpiry = new SqlParameter("@ExpiryTime", otp.ExpiryTime);
            var pIsUsed = new SqlParameter("@IsUsed", otp.IsUsed);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.usp_UpdateOtp @OTPId, @Email, @OTPCode, @ExpiryTime, @IsUsed",
                pOtpId, pEmail, pCode, pExpiry, pIsUsed);
        }
    }
}
