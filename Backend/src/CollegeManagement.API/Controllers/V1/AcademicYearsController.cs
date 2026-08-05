using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Implementations;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-years")]
    [Produces("application/json")]
    [Authorize]
    public class AcademicYearsController : ControllerBase
    {
        private readonly IAcademicYearService _service;

        public AcademicYearsController(IAcademicYearService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(new
            {
                Status = true,
                Message = "Academic years retrieved successfully.",
                Data = result
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Academic year with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "Academic year details retrieved successfully.",
                Data = result
            });
        }

        [HttpPost]
        public async Task<ActionResult> Create(CreateAcademicYearDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.AcademicYearId }, new
                {
                    Status = true,
                    Message = "Academic year created successfully.",
                    Data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, UpdateAcademicYearDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(id, dto);
                if (result == null)
                {
                    return NotFound(new
                    {
                        Status = false,
                        Message = $"Academic year with ID {id} not found."
                    });
                }
                return Ok(new
                {
                    Status = true,
                    Message = "Academic year updated successfully.",
                    Data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Academic year with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "Academic year deleted successfully."
            });
        }

        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> Activate(int id)
        {
            var success = await _service.ActivateAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Academic year with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "Academic year activated successfully."
            });
        }
    }
}
