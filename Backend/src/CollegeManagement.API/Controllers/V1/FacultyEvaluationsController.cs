using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/faculty/evaluations")]
    public class FacultyEvaluationsController : ControllerBase
    {
        private readonly IEvaluationService _evaluationService;
        private readonly ILogger<FacultyEvaluationsController> _logger;

        public FacultyEvaluationsController(
            IEvaluationService evaluationService,
            ILogger<FacultyEvaluationsController> logger)
        {
            _evaluationService = evaluationService;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves list of evaluations assigned to the faculty (or filterable by faculty/exam/status).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<FacultyAssignedEvaluationDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetFacultyEvaluations(
            [FromQuery] int? facultyId,
            [FromQuery] string? status,
            [FromQuery] string? examinationStatus)
        {
            var effectiveFacultyId = facultyId ?? GetCurrentUserId();
            var result = await _evaluationService.GetFacultyEvaluationsAsync(effectiveFacultyId, status, examinationStatus);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves student marks entry sheet and maxima details for an evaluation.
        /// </summary>
        [HttpGet("{evaluationId}/students")]
        [ProducesResponseType(typeof(FacultyEvaluationStudentsResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetEvaluationStudents([FromRoute] string evaluationId)
        {
            var facultyId = GetCurrentUserId();
            var result = await _evaluationService.GetFacultyEvaluationStudentsAsync(evaluationId, facultyId);
            if (result == null) return NotFound(new { message = "Evaluation record not found." });
            return Ok(result);
        }

        /// <summary>
        /// Saves draft or corrected student marks for an evaluation.
        /// </summary>
        [HttpPut("{evaluationId}/marks")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SaveDraftMarks(
            [FromRoute] string evaluationId,
            [FromBody] SaveFacultyMarksRequestDto request)
        {
            var facultyId = GetCurrentUserId();
            var success = await _evaluationService.SaveFacultyDraftMarksAsync(evaluationId, request, facultyId);
            if (!success) return BadRequest(new { message = "Failed to save marks." });
            return Ok(new { success = true, message = "Draft marks saved successfully." });
        }

        /// <summary>
        /// Submits an evaluation for administrative verification (transitions DRAFT -> SUBMITTED).
        /// </summary>
        [HttpPost("{evaluationId}/submit")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SubmitEvaluation([FromRoute] string evaluationId)
        {
            var facultyId = GetCurrentUserId();
            var success = await _evaluationService.SubmitFacultyEvaluationAsync(evaluationId, facultyId);
            if (!success) return BadRequest(new { message = "Failed to submit evaluation." });
            return Ok(new { success = true, message = "Evaluation submitted successfully for verification." });
        }

        /// <summary>
        /// Resubmits a previously rejected evaluation with correction notes (transitions REJECTED -> SUBMITTED).
        /// </summary>
        [HttpPost("{evaluationId}/resubmit")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResubmitEvaluation(
            [FromRoute] string evaluationId,
            [FromBody] ResubmitEvaluationRequestDto request)
        {
            var facultyId = GetCurrentUserId();
            var success = await _evaluationService.ResubmitFacultyEvaluationAsync(evaluationId, request, facultyId);
            if (!success) return BadRequest(new { message = "Failed to resubmit evaluation." });
            return Ok(new { success = true, message = "Evaluation resubmitted successfully for verification." });
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id") ?? User.FindFirst("sub");
            if (claim != null && int.TryParse(claim.Value, out int id))
            {
                return id;
            }
            return null;
        }
    }
}
