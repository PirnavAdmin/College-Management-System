using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/designations")]
    [Authorize]
    [Produces("application/json")]
    public class DesignationController : ControllerBase
    {
        private readonly IDesignationService _designationService;

        public DesignationController(IDesignationService designationService)
        {
            _designationService = designationService;
        }

        /// <summary>
        /// 1. GET /api/v1/designations
        /// Get list of designations (defaults to active only, optional staffType).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<DesignationResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false, [FromQuery] string? staffType = null)
        {
            var result = await _designationService.GetAllAsync(includeInactive, staffType);
            return Ok(result);
        }


        /// <summary>
        /// 2. GET /api/v1/designations/{id}
        /// Get single designation by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _designationService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"Designation with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// 3. POST /api/v1/designations
        /// Create a new unique designation.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] CreateDesignationDto dto)
        {
            var result = await _designationService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// 4. PUT /api/v1/designations/{id}
        /// Update an existing designation.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDesignationDto dto)
        {
            var result = await _designationService.UpdateAsync(id, dto);
            if (result == null) return NotFound(new { message = $"Designation with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// 5. DELETE /api/v1/designations/{id}
        /// Delete a designation (fails if assigned to faculties).
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _designationService.DeleteAsync(id);
            if (!success) return NotFound(new { message = $"Designation with ID {id} not found." });
            return NoContent();
        }
    }
}
