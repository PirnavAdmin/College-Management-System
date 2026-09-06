using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.Authorization;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/promotions")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class PromotionsController : ControllerBase
    {
        private readonly IPromotionService _service;
        public PromotionsController(IPromotionService service) => _service = service;

        [HttpGet("eligible")]
        [HttpGet("eligible-students")]
        public async Task<IActionResult> GetEligible([FromQuery] PromotionEligibilityQuery query) => Ok(await _service.GetEligibleStudentsAsync(query));

        [HttpPost("preview")]
        public async Task<IActionResult> Preview([FromBody] PromotionPreviewRequest request) => Ok(await _service.PreviewAsync(request));

        [HttpPost]
        public async Task<IActionResult> Promote([FromBody] PromoteStudentsRequest request) => Ok(await _service.PromoteStudentsAsync(request));

        [HttpGet("history")]
        public async Task<IActionResult> History([FromQuery] PromotionHistoryQuery query) => Ok(await _service.GetHistoryAsync(query));

        [HttpPost("rollback")]
        public async Task<IActionResult> Rollback([FromBody] RollbackPromotionRequest request) => Ok(await _service.RollbackAsync(request));

        [HttpPost("student/{studentId:int}")]
        public async Task<IActionResult> PromoteSingle(int studentId, [FromBody] PromoteSingleStudentRequest request) => Ok(await _service.PromoteSingleStudentAsync(studentId, request));

        [HttpPatch("group-allocation")]
        public async Task<IActionResult> GroupAllocation([FromBody] GroupAllocationRequest request) => Ok(await _service.AllocateGroupAsync(request));

        [HttpPatch("section-allocation")]
        public async Task<IActionResult> SectionAllocation([FromBody] SectionAllocationRequest request) => Ok(await _service.AllocateSectionAsync(request));

        [HttpGet("report")]
        public async Task<IActionResult> Report([FromQuery] PromotionReportQuery query) => Ok(await _service.GetPromotionReportAsync(query));
    }
}
