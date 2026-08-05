using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace CollegeManagement.API.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IOtpRepository _otpRepository;
        private readonly ILogger<AuthService> _logger;
        private readonly IConfiguration _configuration;

        public AuthService(
            IUserRepository userRepository,
            IOtpRepository otpRepository,
            ILogger<AuthService> logger,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _otpRepository = otpRepository;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailOrPhoneAsync(request.EmailOrMobile);

            if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Email/Mobile or Password"
                };
            }

            // Validate that the user's actual role in the database matches the requested Role parameter (case-insensitive).
            // If the user does not have this role, the login attempt is rejected.
            /*
            if (!user.Role.RoleName.Equals(request.Role, StringComparison.OrdinalIgnoreCase))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Role"
                };
            }
            */
            // Generate real JWT token
            var tokenHandler = new JwtSecurityTokenHandler();
            var keyStr = _configuration["JwtSettings:Key"] ?? "a_very_long_secure_secret_key_of_at_least_32_characters_long";
            var key = Encoding.UTF8.GetBytes(keyStr);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.RoleName),
                    new Claim(ClaimTypes.Name, user.FullName)
                }),
                Expires = DateTime.UtcNow.AddMinutes(double.Parse(_configuration["JwtSettings:DurationInMinutes"] ?? "120")),
                Issuer = _configuration["JwtSettings:Issuer"],
                Audience = _configuration["JwtSettings:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return new AuthResult
            {
                Status = true,
                Message = "Login Successful",
                AccessToken = tokenString,
                UserId = user.UserId,
                Name = user.FullName,
                Role = user.Role.RoleName
            };
        }

        public async Task<AuthResult> RegisterAsync(RegisterRequest request)
        {
            if (request.Password != request.ConfirmPassword)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Password and Confirm Password do not match"
                };
            }

            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Email address is already registered."
                };
            }

            var role = await _userRepository.GetRoleByNameAsync(request.Role);
            if (role == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Selected role is invalid."
                };
            }

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.MobileNumber,
                PasswordHash = PasswordHasher.HashPassword(request.Password),
                RoleId = role.RoleId
            };

            await _userRepository.AddAsync(user);

            return new AuthResult
            {
                Status = true,
                Message = "Registration Successful",
                UserId = user.UserId,
                Name = user.FullName,
                Role = role.RoleName
            };
        }

        public async Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Email address is not registered."
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

            _logger.LogInformation("OTP generated for {Email}: {Otp}", request.Email, otpCode);

            return new AuthResult
            {
                Status = true,
                Message = $"OTP has been sent to {request.Email}",
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

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "User not found"
                };
            }

            user.PasswordHash = PasswordHasher.HashPassword(request.Password);
            otpRecord.IsUsed = true;

            // Save updates via repositories
            await _userRepository.UpdateAsync(user);
            await _otpRepository.UpdateAsync(otpRecord);

            return new AuthResult
            {
                Status = true,
                Message = "Password Reset Successfully"
            };
        }

        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return users.Select(u => new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                RoleName = u.Role?.RoleName ?? string.Empty
            }).ToList();
        }

        public async Task<UserDto?> GetUserByIdAsync(int id)
        {
            var u = await _userRepository.GetByIdAsync(id);
            if (u == null) return null;

            return new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                RoleName = u.Role?.RoleName ?? string.Empty
            };
        }
    }
}
