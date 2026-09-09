<<<<<<< HEAD
﻿using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
=======
using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
<<<<<<< HEAD
    [Route("api/v1/settings/number-series")]
    [Route("api/v1/number-series")]
    [AllowAnonymous]
    public class NumberSeriesController : ControllerBase
    {
        private readonly INumberSeriesService _service;

        public NumberSeriesController(INumberSeriesService service)
        {
            _service = service;
=======
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/settings/number-series")]
    [Route("api/v{version:apiVersion}/number-series")]
    [EnableCors("AllowFrontend")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class NumberSeriesController : ControllerBase
    {
        private readonly INumberSeriesService _numberSeriesService;

        public NumberSeriesController(INumberSeriesService numberSeriesService)
        {
            _numberSeriesService = numberSeriesService;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
        }

        /// <summary>
        /// 1. GET /api/v1/settings/number-series
        /// Returns list of configurations for all supported number series.
        /// </summary>
        [HttpGet]
<<<<<<< HEAD
        [ProducesResponseType(typeof(IEnumerable<NumberSeriesDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
=======
        [ProducesResponseType(typeof(IEnumerable<NumberSeriesResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _numberSeriesService.GetAllSeriesAsync();
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/settings/number-series/{seriesCode}
        /// Returns configuration object + dynamically parsed livePreview string for a specific series.
<<<<<<< HEAD
        /// </summary>
        [HttpGet("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByCode(string seriesCode)
        {
            var result = await _service.GetByCodeOrSlugAsync(seriesCode);
=======
        /// Supports code (e.g., EMPLOYEE_ID) or slug (e.g., employee-id, admission-no, certificate-number, receipt-no).
        /// </summary>
        [HttpGet("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByCode(string seriesCode)
        {
            var result = await _numberSeriesService.GetSeriesByCodeAsync(seriesCode);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
            return Ok(result);
        }

        /// <summary>
        /// 3. PUT /api/v1/settings/number-series/{seriesCode}
        /// Updates configuration: prefix, formatPattern, numberLength, startNumber, description.
        /// </summary>
        [HttpPut("{seriesCode}")]
<<<<<<< HEAD
        [ProducesResponseType(typeof(NumberSeriesDto), StatusCodes.Status200OK)]
=======
        [ProducesResponseType(typeof(NumberSeriesResponseDto), StatusCodes.Status200OK)]
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string seriesCode, [FromBody] UpdateNumberSeriesDto dto)
        {
<<<<<<< HEAD
            var result = await _service.UpdateAsync(seriesCode, dto);
=======
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _numberSeriesService.UpdateSeriesAsync(seriesCode, dto);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }

>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
            return Ok(result);
        }

        /// <summary>
        /// 4. POST /api/v1/settings/number-series/{seriesCode}/generate-next
        /// Executes thread-safe atomic sequence increment and returns the newly generated sequence ID.
        /// </summary>
        [HttpPost("{seriesCode}/generate-next")]
<<<<<<< HEAD
        [ProducesResponseType(typeof(GenerateNextNumberResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GenerateNext(string seriesCode, [FromBody] GenerateNextNumberRequestDto dto)
        {
            var result = await _service.GenerateNextNumberAsync(seriesCode, dto);
=======
        [ProducesResponseType(typeof(GenerateNumberSeriesResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GenerateNext(string seriesCode, [FromBody] GenerateNumberSeriesRequestDto? context = null)
        {
            var result = await _numberSeriesService.GenerateNextNumberAsync(seriesCode, context);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }

>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/settings/number-series/{seriesCode}/preview
        /// Dynamic on-the-fly preview calculation for UI typing without persisting changes.
        /// </summary>
        [HttpGet("{seriesCode}/preview")]
<<<<<<< HEAD
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        public IActionResult Preview(string seriesCode, [FromQuery] string? pattern, [FromQuery] int? numberLength, [FromQuery] string? prefix)
        {
            var result = _service.PreviewPattern(seriesCode, pattern, numberLength, prefix);
            return Ok(result);
=======
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPreview(
            string seriesCode,
            [FromQuery] string? pattern = null,
            [FromQuery] int? numberLength = null,
            [FromQuery] string? prefix = null)
        {
            var preview = await _numberSeriesService.GetLivePreviewAsync(seriesCode, pattern, numberLength, prefix);
            return Ok(new { seriesCode, preview });
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
        }
    }
}
