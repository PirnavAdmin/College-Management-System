using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Faculty.Request;
using CollegeManagement.API.DTOs.Faculty.Response;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/faculty")]
    [Produces("application/json")]
    public class FacultySubjectAllocationController : ControllerBase
    {
        private readonly IFacultyService _facultyService;

        public FacultySubjectAllocationController(IFacultyService facultyService)
        {
            _facultyService = facultyService;
        }

        /// <summary>
        /// 1. POST /api/v1/faculty/assign-subject
        /// Assign a subject to a faculty member.
        /// </summary>
        [HttpPost("assign-subject")]
        [ProducesResponseType(typeof(FacultySubjectAllocationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> AssignSubject([FromBody] AssignSubjectDto dto)
        {
            var result = await _facultyService.AssignSubjectAsync(dto);
            return CreatedAtAction("GetFacultyById", "Faculty", new { id = dto.FacultyId }, result);
        }

        /// <summary>
        /// 2. PUT /api/v1/faculty/assign-subject/{id:int}
        /// Update an existing subject allocation.
        /// </summary>
        [HttpPut("assign-subject/{id:int}")]
        [ProducesResponseType(typeof(FacultySubjectAllocationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateSubjectAllocation(int id, [FromBody] UpdateSubjectAllocationDto dto)
        {
            var result = await _facultyService.UpdateSubjectAllocationAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 3. DELETE /api/v1/faculty/assign-subject/{id:int}
        /// Delete a subject allocation record.
        /// </summary>
        [HttpDelete("assign-subject/{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteSubjectAllocation(int id)
        {
            await _facultyService.DeleteSubjectAllocationAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 4. GET /api/v1/faculty/workload/{facultyId:int}
        /// Get summary workload details and subject allocations for a faculty member.
        /// </summary>
        [HttpGet("workload/{facultyId:int}")]
        [ProducesResponseType(typeof(FacultyWorkloadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFacultyWorkload(int facultyId)
        {
            var result = await _facultyService.GetFacultyWorkloadAsync(facultyId);
            return Ok(result);
        }
    }
}
