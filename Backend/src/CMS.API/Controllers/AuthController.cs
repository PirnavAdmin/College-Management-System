using CollegeManagement.API.DTOs;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;

        public AuthController(IAuthService authService, IEmailService emailService)
        {
            _authService = authService;
            _emailService = emailService;
        }

        /// <summary>
        /// Authenticates the user. Validates the provided Email/Mobile and Password, and ensures
        /// that the user belongs to the requested Role (e.g., Super Admin, Admin, Teacher, Student).
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (!result.Status)
            {
                return Unauthorized(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message,
                AccessToken = result.AccessToken,
                UserId = result.UserId,
                Name = result.Name,
                Role = result.Role
            });
        }

        /// <summary>
        /// Registers a new user.
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message,
                UserId = result.UserId,
                Name = result.Name,
                Role = result.Role
            });
        }

        // Forgot Password API
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
        {
            var result = await _authService.ForgotPasswordAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            try
            {
                await _emailService.SendEmailAsync(
                    request.Email,
                    "Password Reset OTP",
                    $@"
                    <h2>College Management System</h2>
                    <p>Your OTP for password reset is:</p>
                    <h1>{result.Otp}</h1>
                    <p>This OTP is valid for 5 minutes.</p>");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Status = false,
                    Message = "Failed to send email: " + ex.Message
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "OTP has been sent to your registered email.",
                Otp = result.Otp
            });
        }

        // Verify OTP API
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
        {
            var result = await _authService.VerifyOtpAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message
            });
        }

        // Reset Password API
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            var result = await _authService.ResetPasswordAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            try
            {
                await _emailService.SendEmailAsync(
                    request.Email,
                    "Password Changed Successfully",
                    @"
                    <h2>College Management System</h2>
                    <p>Your password has been changed successfully.</p>
                    <p>If you did not make this change, please contact administration immediately.</p>");
            }
            catch (Exception)
            {
                return Ok(new
                {
                    Status = true,
                    Message = "Password Reset Successfully. Note: Notification email could not be sent."
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message
            });
        }
    }
}