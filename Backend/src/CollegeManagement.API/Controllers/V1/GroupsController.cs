using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Exceptions;
using MySqlConnector;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/groups")]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupRepository _groupRepository;

        public GroupsController(
            IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetGroups()
        {
            var result = await _groupRepository.GetAllAsync();
            return Ok(result);
        }
        [HttpGet("{groupId:int}")]
        public async Task<IActionResult> GetGroup(
            int groupId)
        {
            if (groupId <= 0)
            {
                throw new ValidationException("Valid GroupId is required");
            }

            var group =
                await _groupRepository.GetByIdAsync(groupId);

            if (group == null)
            {
                throw new NotFoundException("Group not found");
            }

            return Ok(group);
        }

        [HttpGet("board/{board}")]
        public async Task<IActionResult> GetGroupsByBoard(
            string board)
        {
            if (string.IsNullOrWhiteSpace(board))
            {
                throw new ValidationException("Board is required");
            }

            var groups =
                await _groupRepository.GetByBoardAsync(board);

            return Ok(groups);
        }

        [HttpPost]
        public async Task<IActionResult> CreateGroup(
            [FromBody] CreateGroupRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                var group =
                    await _groupRepository.CreateAsync(request);

                return CreatedAtAction(
                    nameof(GetGroup),
                    new
                    {
                        groupId = group.GroupId
                    },
                    new
                    {
                        message = "Group created successfully",
                        data = group
                    });
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        [HttpPut("{groupId:int}")]
        public async Task<IActionResult> UpdateGroup(
            int groupId,
            [FromBody] UpdateGroupRequest request)
        {
            if (groupId <= 0)
            {
                throw new ValidationException("Valid GroupId is required");
            }

            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                var group =
                    await _groupRepository.UpdateAsync(
                        groupId,
                        request);

                if (group == null)
                {
                    throw new NotFoundException("Group not found");
                }

                return Ok(new
                {
                    message = "Group updated successfully",
                    data = group
                });
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        [HttpDelete("{groupId:int}")]
        public async Task<IActionResult> DeleteGroup(
            int groupId)
        {
            if (groupId <= 0)
            {
                throw new ValidationException("Valid GroupId is required");
            }

            try
            {
                var deleted =
                    await _groupRepository.DeleteAsync(groupId);

                if (!deleted)
                {
                    throw new NotFoundException("Group not found");
                }

                return Ok(new
                {
                    message = "Group deleted successfully"
                });
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        [HttpGet("validate-code")]
        public async Task<IActionResult> ValidateGroupCode(
            [FromQuery] string groupCode,
            [FromQuery] int? excludeGroupId = null)
        {
            if (string.IsNullOrWhiteSpace(groupCode))
            {
                throw new ValidationException("Group code is required");
            }

            var exists =
                await _groupRepository.GroupCodeExistsAsync(
                    groupCode,
                    excludeGroupId);

            return Ok(new
            {
                groupCode,
                exists,
                isAvailable = !exists
            });
        }

        private static void HandleException(MySqlException exception)
        {
            var message = exception.Message;
            if (message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException(message);
            }
            if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException(message);
            }
            throw new ValidationException(message);
        }
    }
}