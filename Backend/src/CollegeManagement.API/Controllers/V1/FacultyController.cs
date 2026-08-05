using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Faculty;
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
    public class FacultyController : ControllerBase
    {
        private readonly IFacultyService _facultyService;

        public FacultyController(IFacultyService facultyService)
        {
            _facultyService = facultyService;
        }

        /// <summary>
        /// 1. GET /api/v1/faculty
        /// Get paged, searched, filtered, and sorted list of faculties.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PagedResult<FacultyResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetFaculties([FromQuery] FacultyQueryParams queryParams)
        {
            var result = await _facultyService.GetPagedFacultiesAsync(queryParams);
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/faculty/{id}
        /// Get detailed faculty record by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(FacultyResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFacultyById(int id)
        {
            var result = await _facultyService.GetFacultyByIdAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// 3. POST /api/v1/faculty
        /// Create a new faculty member record.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(FacultyResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateFaculty([FromBody] CreateFacultyDto dto)
        {
            var result = await _facultyService.CreateFacultyAsync(dto);
            return CreatedAtAction(nameof(GetFacultyById), new { id = result.Id }, result);
        }

        /// <summary>
        /// 4. PUT /api/v1/faculty/{id}
        /// Update an existing faculty member record.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(FacultyResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateFaculty(int id, [FromBody] UpdateFacultyDto dto)
        {
            var result = await _facultyService.UpdateFacultyAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 5. DELETE /api/v1/faculty/{id}
        /// Soft delete a faculty member record.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteFaculty(int id)
        {
            await _facultyService.DeleteFacultyAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 6. POST /api/v1/faculty/upload-photo
        /// Upload/replace a faculty member profile photo.
        /// </summary>
        [HttpPost("upload-photo")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(FacultyResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadPhoto([FromForm] UploadFacultyPhotoDto dto)
        {
            var result = await _facultyService.UploadPhotoAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7. GET /api/v1/faculty/photo/{id}
        /// Preview/stream faculty member profile photo.
        /// </summary>
        [HttpGet("photo/{id:int}")]
        [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFacultyPhoto(int id)
        {
            var (physicalPath, contentType) = await _facultyService.GetPhotoAsync(id);
            return PhysicalFile(physicalPath, contentType);
        }
    }
}
