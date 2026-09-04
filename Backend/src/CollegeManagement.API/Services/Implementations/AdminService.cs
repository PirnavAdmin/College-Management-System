using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CollegeManagement.API.Services.Implementations
{
    public class AdminService : IAdminService
    {
        private readonly IAdminRepository _adminRepository;
        private readonly IOtpRepository _otpRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            IAdminRepository adminRepository,
            IOtpRepository otpRepository,
            IConfiguration configuration,
            ILogger<AdminService> logger)
        {
            _adminRepository = adminRepository;
            _otpRepository = otpRepository;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<IEnumerable<AdminDto>> GetAllAdminsAsync()
        {
            var admins = await _adminRepository.GetAllAsync();
            return admins.Select(a => new AdminDto
            {
                Id = a.Id,
                Email = a.Email,
                IsActive = a.IsActive
            });
        }

        public async Task<AdminDto?> GetAdminByIdAsync(int id)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null) return null;

            return new AdminDto
            {
                Id = admin.Id,
                Email = admin.Email,
                IsActive = admin.IsActive
            };
        }

        public async Task<AuthResult> LoginAsync(AdminLoginRequest request)
        {
            var admin = await _adminRepository.GetByEmailAsync(request.Email);

            if (admin == null || !PasswordHasher.VerifyPassword(request.Password, admin.Password))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Email or Password"
                };
            }

            if (!admin.IsActive)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Admin account is deactivated"
                };
            }

            // Generate real JWT token
            var tokenHandler = new JwtSecurityTokenHandler();
            var keyStr = _configuration["JwtSettings:Key"] ?? "a_very_long_secure_secret_key_of_at_least_32_characters_long";
            var key = Encoding.UTF8.GetBytes(keyStr);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
                    new Claim(ClaimTypes.Email, admin.Email),
                    new Claim(ClaimTypes.Role, "Admin")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = _configuration["JwtSettings:Issuer"],
                Audience = _configuration["JwtSettings:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return new AuthResult
            {
                Status = true,
                Message = "Login successful",
                AccessToken = tokenString,
                UserId = admin.Id,
                Name = admin.Email.Split('@')[0],
                Role = "Admin"
            };
        }

        public async Task<AdminDto> CreateAdminAsync(CreateAdminRequest request)
        {
            var existing = await _adminRepository.GetByEmailAsync(request.Email);
            if (existing != null)
            {
                throw new InvalidOperationException("Email is already registered.");
            }

            var admin = new Admin
            {
                Email = request.Email,
                Password = PasswordHasher.HashPassword(request.Password),
                IsActive = true
            };

            var id = await _adminRepository.AddAsync(admin);
            admin.Id = id;

            return new AdminDto
            {
                Id = admin.Id,
                Email = admin.Email,
                IsActive = admin.IsActive
            };
        }

        public async Task<bool> UpdateStatusAsync(int id, bool isActive)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null) return false;

            await _adminRepository.UpdateStatusAsync(id, isActive);
            return true;
        }

        public async Task<bool> ChangePasswordAsync(int currentAdminId, ChangePasswordRequest request)
        {
            var admin = await _adminRepository.GetByIdAsync(currentAdminId);
            if (admin == null) return false;

            if (!PasswordHasher.VerifyPassword(request.OldPassword, admin.Password))
            {
                throw new ArgumentException("Old password is incorrect.");
            }

            var newPasswordHash = PasswordHasher.HashPassword(request.NewPassword);
            await _adminRepository.UpdatePasswordAsync(currentAdminId, newPasswordHash);
            return true;
        }

        public async Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var admin = await _adminRepository.GetByEmailAsync(request.Email);
            if (admin == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Admin email address is not registered."
                };
            }

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new OTP
            {
                Email = request.Email,
                OTPCode = otpCode,
                ExpiryTime = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false
            };

            await _otpRepository.AddAsync(otp);

            _logger.LogInformation("Admin OTP generated for {Email}: {Otp}", request.Email, otpCode);

            return new AuthResult
            {
                Status = true,
                Message = "OTP has been generated successfully.",
                Otp = otpCode
            };
        }

        public async Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request)
        {
            var otpRecord = await _otpRepository.GetLatestActiveOtpAsync(request.Email, request.Otp);

            if (otpRecord == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            return new AuthResult
            {
                Status = true,
                Message = "OTP Verified Successfully"
            };
        }

        public async Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request)
        {
            if (request.Password != request.ConfirmPassword)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Password and Confirm Password do not match"
                };
            }

            var otpRecord = await _otpRepository.GetLatestActiveOtpAsync(request.Email, request.OTP);

            if (otpRecord == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            var admin = await _adminRepository.GetByEmailAsync(request.Email);
            if (admin == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Admin account not found"
                };
            }

            var newPasswordHash = PasswordHasher.HashPassword(request.Password);
            otpRecord.IsUsed = true;

            await _adminRepository.UpdatePasswordAsync(admin.Id, newPasswordHash);
            await _otpRepository.UpdateAsync(otpRecord);

            return new AuthResult
            {
                Status = true,
                Message = "Admin Password Reset Successfully"
            };
        }
    }
}
