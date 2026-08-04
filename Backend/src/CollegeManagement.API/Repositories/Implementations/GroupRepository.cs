using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories
{
    public class GroupRepository : IGroupRepository
    {
        private readonly AppDbContext _context;

        public GroupRepository(AppDbContext context)
        {
            _context = context;
        }

        private SqlConnection CreateConnection()
        {
            var connectionString =
                _context.Database.GetConnectionString();

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "Database connection string not found.");
            }

            return new SqlConnection(connectionString);
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
            var response = new PagedGroupResponse
            {
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_GetAll",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter("@PageNumber", SqlDbType.Int)
                {
                    Value = pageNumber
                });

            command.Parameters.Add(
                new SqlParameter("@PageSize", SqlDbType.Int)
                {
                    Value = pageSize
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@Search",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = string.IsNullOrWhiteSpace(search)
                        ? DBNull.Value
                        : search.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@Board",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = string.IsNullOrWhiteSpace(board)
                        ? DBNull.Value
                        : board.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicYearId",
                    SqlDbType.Int)
                {
                    Value = academicYearId.HasValue
                        ? academicYearId.Value
                        : DBNull.Value
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicLevel",
                    SqlDbType.VarChar,
                    50)
                {
                    Value =
                        string.IsNullOrWhiteSpace(
                            academicLevel)
                            ? DBNull.Value
                            : academicLevel.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@IsActive",
                    SqlDbType.Bit)
                {
                    Value = isActive.HasValue
                        ? isActive.Value
                        : DBNull.Value
                });

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                response.Items.Add(
                    MapGroupListItem(reader));
            }

            if (await reader.NextResultAsync() &&
                await reader.ReadAsync())
            {
                response.TotalCount =
                    reader.GetInt32(
                        reader.GetOrdinal("TotalCount"));
            }

            return response;
        }

        public async Task<GroupResponse?> GetByIdAsync(
            int groupId)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_GetById",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter("@GroupIdParam", SqlDbType.Int)
                {
                    Value = groupId
                });

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            return MapGroupResponse(reader);
        }

        public async Task<List<GroupListItemDto>>
            GetByBoardAsync(string board)
        {
            var groups = new List<GroupListItemDto>();

            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_GetByBoard",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter(
                    "@Board",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = board.Trim()
                });

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                groups.Add(MapGroupListItem(reader));
            }

            return groups;
        }

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_Create",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            AddCreateParameters(command, request);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                throw new InvalidOperationException(
                    "Group was created, but no response was returned.");
            }

            return MapGroupResponse(reader);
        }

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_Update",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter("@GroupId", SqlDbType.Int)
                {
                    Value = groupId
                });

            AddUpdateParameters(command, request);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            return MapGroupResponse(reader);
        }

        public async Task<bool> DeleteAsync(int groupId)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_Delete",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter("@GroupIdParam", SqlDbType.Int)
                {
                    Value = groupId
                });

            await using var reader =
                await command.ExecuteReaderAsync();

            return await reader.ReadAsync();
        }

        public async Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "sp_Groups_ValidateCode",
                connection);

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(
                new SqlParameter(
                    "@GroupCode",
                    SqlDbType.VarChar,
                    30)
                {
                    Value = groupCode.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@ExcludeGroupId",
                    SqlDbType.Int)
                {
                    Value = excludeGroupId.HasValue
                        ? excludeGroupId.Value
                        : DBNull.Value
                });

            var result = await command.ExecuteScalarAsync();

            return result != null &&
                   result != DBNull.Value &&
                   Convert.ToBoolean(result);
        }

        private static void AddCreateParameters(
            SqlCommand command,
            CreateGroupRequest request)
        {
            command.Parameters.Add(
                new SqlParameter(
                    "@Board",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = request.Board.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicYearId",
                    SqlDbType.Int)
                {
                    Value = request.AcademicYearId
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicLevel",
                    SqlDbType.VarChar,
                    50)
                {
                    Value = request.AcademicLevel.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@GroupName",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = request.GroupName.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@GroupCode",
                    SqlDbType.VarChar,
                    30)
                {
                    Value = request.GroupCode.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@Description",
                    SqlDbType.VarChar,
                    500)
                {
                    Value =
                        string.IsNullOrWhiteSpace(
                            request.Description)
                            ? DBNull.Value
                            : request.Description.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@IsActive",
                    SqlDbType.Bit)
                {
                    Value = request.IsActive
                });
        }

        private static void AddUpdateParameters(
            SqlCommand command,
            UpdateGroupRequest request)
        {
            command.Parameters.Add(
                new SqlParameter(
                    "@Board",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = request.Board.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicYearId",
                    SqlDbType.Int)
                {
                    Value = request.AcademicYearId
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@AcademicLevel",
                    SqlDbType.VarChar,
                    50)
                {
                    Value = request.AcademicLevel.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@GroupName",
                    SqlDbType.VarChar,
                    100)
                {
                    Value = request.GroupName.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@GroupCode",
                    SqlDbType.VarChar,
                    30)
                {
                    Value = request.GroupCode.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@Description",
                    SqlDbType.VarChar,
                    500)
                {
                    Value =
                        string.IsNullOrWhiteSpace(
                            request.Description)
                            ? DBNull.Value
                            : request.Description.Trim()
                });

            command.Parameters.Add(
                new SqlParameter(
                    "@IsActive",
                    SqlDbType.Bit)
                {
                    Value = request.IsActive
                });
        }

        private static GroupListItemDto MapGroupListItem(
            SqlDataReader reader)
        {
            return new GroupListItemDto
            {
                GroupId = GetInt32(reader, "GroupId"),
                Board = GetString(reader, "Board"),
                AcademicYearId =
                    GetInt32(reader, "AcademicYearId"),
                AcademicYearName = null,
                AcademicLevel =
                    GetString(reader, "AcademicLevel"),
                GroupName =
                    GetString(reader, "GroupName"),
                GroupCode =
                    GetString(reader, "GroupCode"),
                Description =
                    GetNullableString(
                        reader,
                        "Description"),
                TotalSubjects = 0,
                IsActive =
                    GetBoolean(reader, "IsActive"),
                Status =
                    GetString(reader, "Status"),
                CreatedAt =
                    GetDateTime(reader, "CreatedAt"),
                UpdatedAt =
                    GetNullableDateTime(
                        reader,
                        "UpdatedAt")
            };
        }

        private static GroupResponse MapGroupResponse(
            SqlDataReader reader)
        {
            return new GroupResponse
            {
                GroupId = GetInt32(reader, "GroupId"),
                Board = GetString(reader, "Board"),
                AcademicYearId =
                    GetInt32(reader, "AcademicYearId"),
                AcademicYearName = null,
                AcademicLevel =
                    GetString(reader, "AcademicLevel"),
                GroupName =
                    GetString(reader, "GroupName"),
                GroupCode =
                    GetString(reader, "GroupCode"),
                Description =
                    GetNullableString(
                        reader,
                        "Description"),
                TotalSubjects = 0,
                IsActive =
                    GetBoolean(reader, "IsActive"),
                Status =
                    GetString(reader, "Status"),
                CreatedAt =
                    GetDateTime(reader, "CreatedAt"),
                UpdatedAt =
                    GetNullableDateTime(
                        reader,
                        "UpdatedAt")
            };
        }

        private static int GetInt32(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.GetInt32(ordinal);
        }

        private static string GetString(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);

            return reader.IsDBNull(ordinal)
                ? string.Empty
                : reader.GetString(ordinal);
        }

        private static string? GetNullableString(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);

            return reader.IsDBNull(ordinal)
                ? null
                : reader.GetString(ordinal);
        }

        private static bool GetBoolean(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.GetBoolean(ordinal);
        }

        private static DateTime GetDateTime(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.GetDateTime(ordinal);
        }

        private static DateTime? GetNullableDateTime(
            SqlDataReader reader,
            string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);

            return reader.IsDBNull(ordinal)
                ? null
                : reader.GetDateTime(ordinal);
        }
    }
}