using CollegeManagement.API.DTOs.Groups;

namespace CollegeManagement.API.Services
{
    public interface IGroupService
    {

        Task<GroupResponse?> GetByIdAsync(int groupId);

        Task<List<GroupListItemDto>> GetByBoardAsync(string board);

        Task<GroupResponse> CreateAsync(
            CreateGroupRequest request);

        Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request);

        Task<bool> DeleteAsync(int groupId);

        Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null);
    }
}