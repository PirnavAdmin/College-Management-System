using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/settings/number-series")]
    [Route("api/v1/number-series")]
    [AllowAnonymous]
    public class NumberSeriesController : ControllerBase
    {
        private readonly INumberSeriesService _service;

        public NumberSeriesController(INumberSeriesService service)
        {
            _service = service;
        }

        /// <summary>
        /// 1. GET /api/v1/settings/number-series
        /// Returns list of configurations for all supported number series.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<NumberSeriesDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/settings/number-series/{seriesCode}
        /// Returns configuration object + dynamically parsed livePreview string for a specific series.
        /// </summary>
        [HttpGet("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByCode(string seriesCode)
        {
            var result = await _service.GetByCodeOrSlugAsync(seriesCode);
            return Ok(result);
        }

        /// <summary>
        /// 3. PUT /api/v1/settings/number-series/{seriesCode}
        /// Updates configuration: prefix, formatPattern, numberLength, startNumber, description.
        /// </summary>
        [HttpPut("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string seriesCode, [FromBody] UpdateNumberSeriesDto dto)
        {
            var result = await _service.UpdateAsync(seriesCode, dto);
            return Ok(result);
        }

        /// <summary>
        /// 4. POST /api/v1/settings/number-series/{seriesCode}/generate-next
        /// Executes thread-safe atomic sequence increment and returns the newly generated sequence ID.
        /// </summary>
        [HttpPost("{seriesCode}/generate-next")]
        [ProducesResponseType(typeof(GenerateNextNumberResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GenerateNext(string seriesCode, [FromBody] GenerateNextNumberRequestDto dto)
        {
            var result = await _service.GenerateNextNumberAsync(seriesCode, dto);
            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/settings/number-series/{seriesCode}/preview
        /// Dynamic on-the-fly preview calculation for UI typing without persisting changes.
        /// </summary>
        [HttpGet("{seriesCode}/preview")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        public IActionResult Preview(string seriesCode, [FromQuery] string? pattern, [FromQuery] int? numberLength, [FromQuery] string? prefix)
        {
            var result = _service.PreviewPattern(seriesCode, pattern, numberLength, prefix);
            return Ok(result);
        }
    }
}
