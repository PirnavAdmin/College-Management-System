using Asp.Versioning;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/students")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _service;
        private readonly IStudentExportService _exportService;
        private readonly IStudentImportService _importService;

        public StudentsController(
            IStudentService service,
            IStudentExportService exportService,
            IStudentImportService importService)
        {
            _service = service;
            _exportService = exportService;
            _importService = importService;
        }


        // =========================================================
        // GET ALL STUDENTS
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var students = await _service.GetAllAsync();

            return Ok(students);
        }


        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        [HttpGet("{studentId:int}")]
        public async Task<IActionResult> GetById(int studentId)
        {
            var student = await _service.GetByIdAsync(studentId);

            if (student == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(student);
        }


        // =========================================================
        // CREATE STUDENT
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.CreateAsync(request);

            return Ok(result);
        }


        // =========================================================
        // UPDATE STUDENT
        // =========================================================

        [HttpPut("{studentId:int}")]
        public async Task<IActionResult> Update(
            int studentId,
            [FromBody] UpdateStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.UpdateAsync(
                studentId,
                request);

            if (result == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(result);
        }


        // =========================================================
        // DELETE STUDENT
        // =========================================================

        [HttpDelete("{studentId:int}")]
        public async Task<IActionResult> Delete(
            int studentId)
        {
            var result = await _service.DeleteAsync(studentId);

            if (!result)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(new
            {
                message = "Student deleted successfully"
            });
        }


        // =========================================================
        // GET STUDENT PROFILE
        // =========================================================

        [HttpGet("{studentId:int}/profile")]
        public async Task<IActionResult> GetProfile(
            int studentId)
        {
            var profile = await _service.GetProfileAsync(
                studentId);

            if (profile == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(profile);
        }


        // =========================================================
        // UPDATE STUDENT PROFILE
        // =========================================================

        [HttpPut("{studentId:int}/profile")]
        public async Task<IActionResult> UpdateProfile(
            int studentId,
            [FromBody] StudentProfileDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var profile = await _service.UpdateProfileAsync(
                studentId,
                request);

            if (profile == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(profile);
        }


        // =========================================================
        // CHANGE SECTION
        // =========================================================

        [HttpPut("{studentId:int}/section")]
        public async Task<IActionResult> ChangeSection(
            int studentId,
            [FromBody] ChangeSectionRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.ChangeSectionAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Section update failed"
                });

            return Ok(new
            {
                message = "Student section updated successfully"
            });
        }


        // =========================================================
        // CHANGE GROUP
        // =========================================================

        [HttpPut("{studentId:int}/group")]
        public async Task<IActionResult> ChangeGroup(
            int studentId,
            [FromBody] ChangeGroupRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.ChangeGroupAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Group update failed"
                });

            return Ok(new
            {
                message = "Student group updated successfully"
            });
        }


        // =========================================================
        // TRANSFER STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/transfer")]
        public async Task<IActionResult> Transfer(
            int studentId,
            [FromBody] TransferStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.TransferAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Student transfer failed"
                });

            return Ok(new
            {
                message = "Student transferred successfully"
            });
        }


        // =========================================================
        // SUSPEND STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/suspend")]
        public async Task<IActionResult> Suspend(
            int studentId,
            [FromBody] SuspendStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.SuspendAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Student suspension failed"
                });

            return Ok(new
            {
                message = "Student suspended successfully"
            });
        }


        // =========================================================
        // ACTIVATE STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/activate")]
        public async Task<IActionResult> Activate(
            int studentId)
        {
            var result = await _service.ActivateAsync(
                studentId);

            if (!result)
                return BadRequest(new
                {
                    message = "Student activation failed"
                });

            return Ok(new
            {
                message = "Student activated successfully"
            });
        }


        // =========================================================
        // RESET PASSWORD
        // =========================================================

        [HttpPost("{studentId:int}/reset-password")]
        public async Task<IActionResult> ResetPassword(
            int studentId)
        {
            var result = await _service.ResetPasswordAsync(
                studentId);

            if (!result)
                return BadRequest(new
                {
                    message = "Password reset failed"
                });

            return Ok(new
            {
                message = "Student password reset successfully"
            });
        }


        // =========================================================
        // STUDENT DASHBOARD
        // =========================================================

        [HttpGet("{studentId:int}/dashboard")]
        public async Task<IActionResult> GetDashboard(
            int studentId)
        {
            var dashboard = await _service.GetDashboardAsync(
                studentId);

            if (dashboard == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(dashboard);
        }


        // =========================================================
        // SEARCH STUDENTS
        // =========================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] bool? isActive)
        {
            var students = await _service.SearchAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                sectionId,
                isActive);

            return Ok(students);
        }


        // =========================================================
        // GET STUDENTS BY GROUP
        // =========================================================

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(
            int groupId)
        {
            var students = await _service.GetByGroupAsync(
                groupId);

            return Ok(students);
        }


        // =========================================================
        // GET STUDENTS BY SECTION
        // =========================================================

        [HttpGet("section/{sectionId:int}")]
        public async Task<IActionResult> GetBySection(
            int sectionId)
        {
            var students = await _service.GetBySectionAsync(
                sectionId);

            return Ok(students);
        }


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            var students = await _service.GetActiveAsync();

            return Ok(students);
        }


        // =========================================================
        // CHECK EMAIL
        // =========================================================

        [HttpGet("check-email")]
        public async Task<IActionResult> EmailExists(
            [FromQuery] string email,
            [FromQuery] int? excludeStudentId = null)
        {
            var exists = await _service.EmailExistsAsync(
                email,
                excludeStudentId);

            return Ok(new
            {
                exists
            });
        }


        // =========================================================
        // CHECK MOBILE
        // =========================================================

        [HttpGet("check-mobile")]
        public async Task<IActionResult> MobileExists(
            [FromQuery] string mobile,
            [FromQuery] int? excludeStudentId = null)
        {
            var exists = await _service.MobileExistsAsync(
                mobile,
                excludeStudentId);

            return Ok(new
            {
                exists
            });
        }
    

        // =========================================================
        // EXPORT INDIVIDUAL STUDENT PROFILE PDF
        // =========================================================

        /// <summary>
        /// Exports an individual student's profile as a PDF document.
        /// </summary>
        /// <param name="studentId">The unique ID of the student.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>A binary PDF stream.</returns>
        [HttpGet("{studentId:int}/export/pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportProfilePdf(
            int studentId,
            CancellationToken ct = default)
        {
            try
            {
                var (pdfBytes, fileName) = await _exportService.ExportStudentProfilePdfAsync(studentId, ct);
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    
        // =========================================================
        // EXPORT ALL OR FILTERED STUDENTS EXCEL
        // =========================================================

        /// <summary>
        /// Exports all or filtered students to an Excel spreadsheet (.xlsx).
        /// </summary>
        /// <param name="filter">Optional query filters.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>An Excel binary stream.</returns>
        [HttpGet("export/excel")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] StudentExportFilterDto filter,
            CancellationToken ct = default)
        {
            try
            {
                var (excelBytes, fileName) = await _exportService.ExportStudentsToExcelAsync(filter, ct);
                return File(
                    excelBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // LEGACY STUDENT BULK IMPORT — TEMPLATE GENERATION
        // =========================================================

        /// <summary>
        /// Downloads the official 56-column Excel template for bulk legacy student import.
        /// </summary>
        [HttpGet("import/template")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadImportTemplate(CancellationToken ct)
        {
            var excelBytes = await _importService.GenerateTemplateAsync(ct);
            var fileName = $"Legacy_Student_Import_Template_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
            return File(
                excelBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — DRY-RUN VALIDATION
        // =========================================================

        /// <summary>
        /// Validates the uploaded legacy student Excel spreadsheet without inserting records into the database.
        /// </summary>
        [HttpPost("import/validate")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ValidateImportExcel(IFormFile file, CancellationToken ct)
        {
            var result = await _importService.ValidateExcelAsync(file, ct);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — EXECUTE IMPORT
        // =========================================================

        /// <summary>
        /// Validates and imports legacy students directly into the Students table.
        /// </summary>
        [HttpPost("import/excel")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ImportExcel(
            IFormFile file,
            [FromQuery] bool allowPartial = false,
            CancellationToken ct = default)
        {
            var result = await _importService.ImportExcelAsync(file, allowPartial, ct);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — CREDENTIALS PDF (CATEGORY A)
        // =========================================================

        /// <summary>
        /// Generates a printable PDF of onboarding credential slips for legacy imported students.
        /// </summary>
        [HttpGet("import/credentials-pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadCredentialsPdf(
            [FromQuery] StudentCredentialPdfFilterDto filter,
            CancellationToken ct = default)
        {
            var pdfBytes = await _importService.GenerateCredentialsPdfAsync(filter, ct);
            var fileName = $"Legacy_Student_Credentials_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }


        // =========================================================
        // COMMON STUDENT PHOTO UPLOAD (CATEGORY B — ALL STUDENTS)
        // =========================================================

        /// <summary>
        /// Uploads or replaces a student's profile photograph. Available for all students.
        /// </summary>
        [HttpPost("{studentId:int}/photo")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentPhotoUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadPhoto(
            int studentId,
            IFormFile file,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _service.UploadPhotoAsync(studentId, file, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        // =========================================================
        // COMMON STUDENT DOCUMENT UPLOAD (CATEGORY B — ALL STUDENTS)
        // =========================================================

        /// <summary>
        /// Uploads or replaces a student document certificate. Available for all students.
        /// Supported types: BirthCertificate, TransferCertificate, StudyCertificate, AadhaarDocument,
        /// CommunityCertificate, IncomeCertificate, CasteCertificate, TenthCertificate, MarksMemo.
        /// </summary>
        [HttpPost("{studentId:int}/documents")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentDocumentUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadDocument(
            int studentId,
            [FromForm] string documentType,
            IFormFile file,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _service.UploadDocumentAsync(studentId, documentType, file, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

    }
}