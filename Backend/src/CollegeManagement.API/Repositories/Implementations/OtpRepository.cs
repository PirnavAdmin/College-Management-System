using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class OtpRepository : IOtpRepository
    {
        private readonly AppDbContext _context;
        public OtpRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task AddAsync(OTP otp)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "usp_AddOtp",
                new
                {
                    p_Email = otp.Email,
                    p_OTPCode = otp.OTPCode,
                    p_ExpiryTime = otp.ExpiryTime,
                    p_IsUsed = otp.IsUsed
                },
                commandType: CommandType.StoredProcedure);
            otp.OTPId = id;
        }

        public async Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode)
        {
            return await Connection.QueryFirstOrDefaultAsync<OTP>(
                "usp_GetLatestActiveOtp",
                new { p_Email = email, p_OTPCode = otpCode },
                commandType: CommandType.StoredProcedure);
        }

        public async Task UpdateAsync(OTP otp)
        {
            await Connection.ExecuteAsync(
                "usp_UpdateOtp",
                new
                {
                    p_OTPId = otp.OTPId,
                    p_Email = otp.Email,
                    p_OTPCode = otp.OTPCode,
                    p_ExpiryTime = otp.ExpiryTime,
                    p_IsUsed = otp.IsUsed
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}
