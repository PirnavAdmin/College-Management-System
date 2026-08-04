using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;

namespace CollegeManagement.API.Repositories
{
    public class GroupRepository : IGroupRepository
    {
        private readonly AppDbContext _context;

        public GroupRepository(AppDbContext context)
        {
            _context = context;
        }


        public async Task<List<GroupListItemDto>> GetAllAsync()
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<GroupListItemDto>(
                "sp_GetAllGroups",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }
        public async Task<GroupResponse?> GetByIdAsync(
            int groupId)
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                "sp_GetGroupById",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<List<GroupListItemDto>> GetByBoardAsync(
            string board)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<GroupListItemDto>(
                "sp_GetGroupsByBoard",
                new { p_Board = string.IsNullOrWhiteSpace(board) ? null : board.Trim() },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                "sp_CreateGroup",
                new
                {
                    p_Board = request.Board,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevel = request.AcademicLevel,
                    p_GroupName = request.GroupName,
                    p_GroupCode = request.GroupCode,
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure);

            if (result == null)
            {
                throw new InvalidOperationException("Group was created, but no response was returned.");
            }

            return result;
        }

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                "sp_UpdateGroup",
                new
                {
                    p_GroupId = groupId,
                    p_Board = request.Board,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevel = request.AcademicLevel,
                    p_GroupName = request.GroupName,
                    p_GroupCode = request.GroupCode,
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> DeleteAsync(
            int groupId)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.ExecuteScalarAsync<int>(
                "sp_DeleteGroup",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure);

            return result > 0;
        }

        public async Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null)
        {
            var connection = _context.Database.GetDbConnection();

            var exists = await connection.ExecuteScalarAsync<int>(
                "sp_ValidateGroupCode",
                new
                {
                    p_GroupCode = groupCode,
                    p_ExcludeGroupId = excludeGroupId
                },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }
    }
}