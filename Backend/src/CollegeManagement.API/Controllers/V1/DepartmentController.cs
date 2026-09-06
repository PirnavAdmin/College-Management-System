using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Models;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/departments")]
    [EnableCors("AllowFrontend")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class DepartmentController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public DepartmentController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Department>>> GetDepartments([FromQuery] string? staffType = null)
        {
            var departments = await _departmentService.GetDepartmentsAsync(staffType);
            return Ok(departments);
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(Department), StatusCodes.Status201Created)]
        public async Task<ActionResult<Department>> CreateDepartment([FromBody] Department department)
        {
            if (string.IsNullOrWhiteSpace(department.DepartmentName))
            {
                return BadRequest(new { message = "Department name is required." });
            }

            var created = await _departmentService.CreateDepartmentAsync(department);
            return CreatedAtAction(nameof(GetDepartments), new { id = created.DepartmentId }, created);
        }
    }
}

