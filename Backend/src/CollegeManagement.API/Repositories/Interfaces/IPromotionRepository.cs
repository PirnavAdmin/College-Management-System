using CollegeManagement.API.DTOs.Promotion;
namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPromotionRepository
    {
        Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(PromotionEligibilityQuery query);
        Task<PromotionPreviewResponse> PreviewAsync(PromotionPreviewRequest request);
        Task<PromotionExecutionResponse> PromoteStudentsAsync(PromoteStudentsRequest request);
        Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(PromotionHistoryQuery query);
        Task<RollbackResponse> RollbackAsync(RollbackPromotionRequest request);
        Task<PromotionHistoryDto?> PromoteSingleStudentAsync(int studentId, PromoteSingleStudentRequest request);
        Task<AllocationResponse> AllocateGroupAsync(GroupAllocationRequest request);
        Task<AllocationResponse> AllocateSectionAsync(SectionAllocationRequest request);
        Task<PromotionReportResponse> GetPromotionReportAsync(PromotionReportQuery query);
    }
}
