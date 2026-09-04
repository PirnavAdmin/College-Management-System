using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [EnableCors("AllowFrontend")]
    [Authorize(Roles = "Faculty,Admin,College Admin,Super Admin,HOD")]
    [Produces("application/json")]
    public class LeaveManagementController : ControllerBase
    {
        private readonly ILeaveManagementService _service;

        public LeaveManagementController(ILeaveManagementService service)
        {
            _service = service;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return 1;
            }
            return userId;
        }

        [HttpPost("leave")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateStaffLeave([FromBody] CreateStaffLeaveRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _service.CreateStaffLeaveRequestAsync(request, userId);
            return Ok(new { Status = true, Message = "Staff leave requested successfully.", Data = result });
        }

        [HttpPost("leave/{leaveRequestId}/action")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActionStaffLeave(int leaveRequestId, [FromBody] StaffLeaveActionRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _service.ActionStaffLeaveRequestAsync(leaveRequestId, request, userId);
            return Ok(new { Status = true, Message = $"Staff leave {request.Status} successfully.", Data = result });
        }

        [HttpGet("leave")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffLeaves([FromQuery] int? staffId, [FromQuery] int? departmentId, [FromQuery] CollegeManagement.API.Enums.LeaveStatus? status)
        {
            var result = await _service.GetStaffLeaveRequestsAsync(staffId, departmentId, status);
            return Ok(new { Status = true, Message = "Staff leaves retrieved successfully.", Data = result });
        }
    }
}
