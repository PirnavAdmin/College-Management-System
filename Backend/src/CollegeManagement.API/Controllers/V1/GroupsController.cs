using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

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
        public async Task<IActionResult> GetGroups(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? board = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] string? academicLevel = null,
            [FromQuery] bool? isActive = null)
        {
            if (pageNumber < 1)
            {
                pageNumber = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                pageSize = 20;
            }

            var result = await _groupRepository.GetAllAsync(
                pageNumber,
                pageSize,
                search,
                board,
                academicYearId,
                academicLevel,
                isActive);

            return Ok(result);
        }

        [HttpGet("{groupId:int}")]
        public async Task<IActionResult> GetGroup(
            int groupId)
        {
            if (groupId <= 0)
            {
                return BadRequest(new
                {
                    message = "Valid GroupId is required"
                });
            }

            var group =
                await _groupRepository.GetByIdAsync(groupId);

            if (group == null)
            {
                return NotFound(new
                {
                    message = "Group not found"
                });
            }

            return Ok(group);
        }

        [HttpGet("board/{board}")]
        public async Task<IActionResult> GetGroupsByBoard(
            string board)
        {
            if (string.IsNullOrWhiteSpace(board))
            {
                return BadRequest(new
                {
                    message = "Board is required"
                });
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
            catch (SqlException ex)
            {
                return BadRequest(new
                {
                    message = GetSqlErrorMessage(ex)
                });
            }
        }

        [HttpPut("{groupId:int}")]
        public async Task<IActionResult> UpdateGroup(
            int groupId,
            [FromBody] UpdateGroupRequest request)
        {
            if (groupId <= 0)
            {
                return BadRequest(new
                {
                    message = "Valid GroupId is required"
                });
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
                    return NotFound(new
                    {
                        message = "Group not found"
                    });
                }

                return Ok(new
                {
                    message = "Group updated successfully",
                    data = group
                });
            }
            catch (SqlException ex)
            {
                return BadRequest(new
                {
                    message = GetSqlErrorMessage(ex)
                });
            }
        }

        [HttpDelete("{groupId:int}")]
        public async Task<IActionResult> DeleteGroup(
            int groupId)
        {
            if (groupId <= 0)
            {
                return BadRequest(new
                {
                    message = "Valid GroupId is required"
                });
            }

            try
            {
                var deleted =
                    await _groupRepository.DeleteAsync(groupId);

                if (!deleted)
                {
                    return NotFound(new
                    {
                        message = "Group not found"
                    });
                }

                return Ok(new
                {
                    message = "Group deleted successfully"
                });
            }
            catch (SqlException ex)
            {
                return BadRequest(new
                {
                    message = GetSqlErrorMessage(ex)
                });
            }
        }

        [HttpGet("validate-code")]
        public async Task<IActionResult> ValidateGroupCode(
            [FromQuery] string groupCode,
            [FromQuery] int? excludeGroupId = null)
        {
            if (string.IsNullOrWhiteSpace(groupCode))
            {
                return BadRequest(new
                {
                    message = "Group code is required"
                });
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

        private static string GetSqlErrorMessage(
            SqlException exception)
        {
            return exception.Number switch
            {
                50001 => "Board is required",
                50002 => "Valid AcademicYearId is required",
                50003 => "Academic level is required",
                50004 => "Group name is required",
                50005 => "Group code is required",
                50006 => "Group code already exists",
                50007 => "Group not found",
                _ => exception.Message
            };
        }
    }
}