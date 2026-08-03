using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Implementations;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
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

        /// <summary>
        /// Retrieves a list of all registered users in the system.
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult> GetUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(new
            {
                Status = true,
                Message = "Users retrieved successfully.",
                Data = users
            });
        }

        /// <summary>
        /// Retrieves a single user by their UserId.
        /// </summary>
        [HttpGet("user/{id}")]
        public async Task<ActionResult> GetUserById(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"User with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "User details retrieved successfully.",
                Data = user
            });
        }
    }
}