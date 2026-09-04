using System;
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
    public class StaffAttendanceController : ControllerBase
    {
        private readonly IStaffAttendanceService _service;

        public StaffAttendanceController(IStaffAttendanceService service)
        {
            _service = service;
        }

        /// <summary>
        /// Loads staff members for specified Date, Department, and StaffType (Teaching / Non-Teaching).
        /// </summary>
        [HttpPost("load")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> LoadStaff([FromBody] LoadStaffAttendanceRequest request)
        {
            var result = await _service.LoadStaffAttendanceAsync(request);
            return Ok(new { Status = true, Message = "Staff list loaded successfully.", Data = result });
        }

        /// <summary>
        /// Bulk saves/submits staff attendance records.
        /// </summary>
        [HttpPost("bulk")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BulkSave([FromBody] BulkSaveStaffAttendanceRequest request)
        {
            var userId = GetCurrentUserId();
            var count = await _service.BulkSaveStaffAttendanceAsync(request, userId);
            return Ok(new { Status = true, Message = $"Staff attendance saved successfully for {count} members.", Data = count });
        }

        /// <summary>
        /// Updates a single staff attendance record.
        /// </summary>
        [HttpPut("update")]
        [Authorize(Roles = "Admin,College Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateStaffAttendance([FromBody] UpdateStaffAttendanceRequest request)
        {
            var userId = GetCurrentUserId();
            await _service.UpdateStaffAttendanceAsync(request, userId);
            return Ok(new { Status = true, Message = "Staff attendance updated successfully.", Data = true });
        }

        /// <summary>
        /// Retrieves staff details for the Staff Details popup modal.
        /// </summary>
        [HttpGet("staff/{facultyId}/details")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffDetails(int facultyId, [FromQuery] DateTime date)
        {
            var result = await _service.GetStaffDetailsAsync(facultyId, date);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = $"Staff member with ID {facultyId} not found." });
            }
            return Ok(new { Status = true, Message = "Staff details retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via GET query string.
        /// </summary>
        [HttpGet("monthly-report")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGridGet([FromQuery] StaffMonthlyReportRequest request)
        {
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via POST body.
        /// </summary>
        [HttpPost("monthly-report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGrid([FromBody] StaffMonthlyReportRequest request)
        {
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to CSV format.
        /// </summary>
        [HttpGet("monthly-report/export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyCsv([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToCsvAsync(request);
            return File(bytes, "text/csv", $"StaffMonthlyReport_{request.StaffType}_{request.Year}_{request.Month:D2}.csv");
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to Excel format.
        /// </summary>
        [HttpGet("monthly-report/export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyExcel([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToExcelAsync(request);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StaffMonthlyReport_{request.StaffType}_{request.Year}_{request.Month:D2}.xlsx");
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


    }
}
