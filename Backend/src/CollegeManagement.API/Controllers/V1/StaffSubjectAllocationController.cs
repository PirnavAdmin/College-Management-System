using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class StaffSubjectAllocationController : ControllerBase
    {
        private readonly IStaffService _staffService;
        private readonly AppDbContext _db;

        public StaffSubjectAllocationController(IStaffService staffService, AppDbContext db)
        {
            _staffService = staffService;
            _db = db;
        }

        /// <summary>
        /// 0. GET /api/v1/staff/available-subjects?staffId=97&amp;department=Chemistry
        /// Gets subjects filtered by staff member's department to prevent clutter in Step 2.
        /// </summary>
        [HttpGet("available-subjects")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableSubjects(
            [FromQuery] int? staffId = null,
            [FromQuery] string? department = null,
            CancellationToken ct = default)
        {
            string? deptName = department?.Trim();

            if (string.IsNullOrWhiteSpace(deptName) && staffId.HasValue && staffId.Value > 0)
            {
                var staff = await _db.Staffs
                    .AsNoTracking()
                    .Include(s => s.DepartmentRef)
                    .FirstOrDefaultAsync(s => s.Id == staffId.Value, ct);

                if (staff != null)
                {
                    deptName = staff.DepartmentRef?.DepartmentName ?? staff.Department;
                }
            }

            var query = _db.Subjects.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(deptName) && !deptName.Equals("General", StringComparison.OrdinalIgnoreCase))
            {
                // Filter subjects that belong to or mention the department (e.g., Chemistry, Physics, Mathematics)
                var deptClean = deptName.ToLowerInvariant();
                var filtered = await query
                    .Where(s => s.SubjectName.ToLower().Contains(deptClean) || (s.SubjectCode != null && s.SubjectCode.ToLower().Contains(deptClean)))
                    .OrderBy(s => s.SubjectName)
                    .Select(s => new
                    {
                        id = s.SubjectId,
                        subjectId = s.SubjectId,
                        name = s.SubjectName,
                        subjectName = s.SubjectName,
                        code = s.SubjectCode,
                        subjectCode = s.SubjectCode,
                        type = s.SubjectType,
                        subjectType = s.SubjectType,
                        boardId = s.BoardId,
                        groupId = s.GroupId,
                        department = deptName
                    })
                    .ToListAsync(ct);

                if (filtered.Any())
                {
                    return Ok(filtered);
                }
            }

            // Fallback: Return all active subjects
            var allSubjects = await query
                .OrderBy(s => s.SubjectName)
                .Select(s => new
                {
                    id = s.SubjectId,
                    subjectId = s.SubjectId,
                    name = s.SubjectName,
                    subjectName = s.SubjectName,
                    code = s.SubjectCode,
                    subjectCode = s.SubjectCode,
                    type = s.SubjectType,
                    subjectType = s.SubjectType,
                    boardId = s.BoardId,
                    groupId = s.GroupId,
                    department = deptName ?? "General"
                })
                .ToListAsync(ct);

            return Ok(allSubjects);
        }

        /// <summary>
        /// 1. POST /api/v1/staff/assign-subject
        /// Assign a subject to a teaching staff member.
        /// </summary>
        [HttpPost("assign-subject")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffSubjectAllocationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> AssignSubject([FromBody] AssignStaffSubjectDto dto)
        {
            var result = await _staffService.AssignSubjectAsync(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }

        /// <summary>
        /// 2. PUT /api/v1/staff/assign-subject/{id:int}
        /// Update an existing subject allocation.
        /// </summary>
        [HttpPut("assign-subject/{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffSubjectAllocationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateSubjectAllocation(int id, [FromBody] UpdateStaffSubjectAllocationDto dto)
        {
            var result = await _staffService.UpdateSubjectAllocationAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 3. DELETE /api/v1/staff/assign-subject/{id:int}
        /// Delete a subject allocation record.
        /// </summary>
        [HttpDelete("assign-subject/{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteSubjectAllocation(int id)
        {
            await _staffService.DeleteSubjectAllocationAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 4. GET /api/v1/staff/{staffId:int}/subject-allocations
        /// Get all subject allocations for a specific staff member.
        /// </summary>
        [HttpGet("{staffId:int}/subject-allocations")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(System.Collections.Generic.List<StaffSubjectAllocationResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffSubjectAllocations(int staffId)
        {
            var result = await _staffService.GetStaffSubjectAllocationsAsync(staffId);
            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/staff/workload/{staffId:int}
        /// Get summary workload details and subject allocations for a staff member.
        /// </summary>
        [HttpGet("workload/{staffId:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffWorkloadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffWorkload(int staffId)
        {
            var result = await _staffService.GetStaffWorkloadAsync(staffId);
            return Ok(result);
        }
    }
}
