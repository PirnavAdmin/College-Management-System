using CollegeManagement.API.DTOs;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _service;

        public SubjectsController(ISubjectService service)
        {
            _service = service;
        }

        // ==========================
        // GET ALL SUBJECTS
        // ==========================
        [HttpGet]
        public async Task<IActionResult> GetAllSubjects()
        {
            var subjects = await _service.GetAllAsync();
            return Ok(subjects);
        }

        // ==========================
        // GET SUBJECT BY ID
        // ==========================
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSubjectById(int id)
        {
            var subject = await _service.GetByIdAsync(id);

            if (subject == null)
                return NotFound(new
                {
                    message = "Subject not found."
                });

            return Ok(subject);
        }

        // ==========================
        // GET SUBJECTS BY GROUP
        // ==========================
        [HttpGet("group/{group}")]
        public async Task<IActionResult> GetSubjectsByGroup(string group)
        {
            var subjects = await _service.GetByGroupAsync(group);

            return Ok(subjects);
        }

        // ==========================
        // CREATE SUBJECT
        // ==========================
        [HttpPost]
        public async Task<IActionResult> CreateSubject(CreateSubjectDto dto)
        {
            var subject = await _service.CreateAsync(dto);

            return CreatedAtAction(
                nameof(GetSubjectById),
                new { id = subject.SubjectId },
                subject);
        }

        // ==========================
        // UPDATE SUBJECT
        // ==========================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(int id, UpdateSubjectDto dto)
        {
            var subject = await _service.UpdateAsync(id, dto);

            if (subject == null)
            {
                return NotFound(new
                {
                    message = "Subject not found."
                });
            }

            return Ok(subject);
        }

        // ==========================
        // DELETE SUBJECT
        // ==========================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var deleted = await _service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Subject not found."
                });
            }

            return Ok(new
            {
                message = "Subject deleted successfully."
            });
        }
    }
}