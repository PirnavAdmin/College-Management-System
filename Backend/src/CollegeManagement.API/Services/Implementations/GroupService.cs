using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class GroupService : IGroupService
    {
        private readonly IGroupRepository _groupRepository;

        public GroupService(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }


        public async Task<PagedGroupResponse> GetAllAsync(
            int pageNumber,
            int pageSize,
            string? search,
            string? board,
            int? academicYearId,
            string? academicLevel,
            bool? isActive)
        {
            return await _groupRepository.GetAllAsync(
                pageNumber,
                pageSize,
                search,
                board,
                academicYearId,
                academicLevel,
                isActive
            );
        }


        public async Task<GroupResponse?> GetByIdAsync(int groupId)
        {
            return await _groupRepository.GetByIdAsync(groupId);
        }


        public async Task<List<GroupListItemDto>> GetByBoardAsync(string board)
        {
            return await _groupRepository.GetByBoardAsync(board);
        }


        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            return await _groupRepository.CreateAsync(request);
        }


        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            return await _groupRepository.UpdateAsync(
                groupId,
                request
            );
        }


        public async Task<bool> DeleteAsync(int groupId)
        {
            return await _groupRepository.DeleteAsync(groupId);
        }


        public async Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null)
        {
            return await _groupRepository.GroupCodeExistsAsync(
                groupCode,
                excludeGroupId
            );
        }
    }
}