using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Board database operations using Dapper and MySQL Stored Procedures.
    /// </summary>
    public class BoardRepository : IBoardRepository
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="BoardRepository"/> class.
        /// </summary>
        /// <param name="context">The database context.</param>
        public BoardRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        /// <summary>
        /// Creates a new Board in the database using sp_CreateBoard.
        /// </summary>
        public async Task<Board> CreateBoardAsync(Board board)
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_CreateBoard",
                new
                {
                    p_BoardName = board.BoardName,
                    p_BoardCode = board.BoardCode,
                    p_Description = board.Description,
                    p_CountryId = board.CountryId,
                    p_StateId = board.StateId,
                    p_AcademicPatternId = board.AcademicPatternId,
                    p_GradingSystemId = board.GradingSystemId,
                    p_InternalAssessment = board.InternalAssessment,
                    p_PracticalExams = board.PracticalExams,
                    p_BoardExams = board.BoardExams,
                    p_PassPercentage = board.PassPercentage,
                    p_RankCalculation = board.RankCalculation,
                    p_IsActive = board.IsActive
                },
                commandType: CommandType.StoredProcedure);

            var created = multi.Read<Board, Country, State, AcademicPattern, GradingSystem, Board>(
                (b, c, s, ap, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.AcademicPattern = ap;
                    b.GradingSystem = gs;
                    return b;
                },
                splitOn: "CountryId,StateId,AcademicPatternId,GradingSystemId"
            ).FirstOrDefault();
            multi.Dispose();

            if (created == null)
            {
                throw new InvalidOperationException("Failed to create board.");
            }

            await Connection.ExecuteAsync(
                "UPDATE Boards SET BoardType = @BoardType WHERE BoardId = @BoardId",
                new { board.BoardType, created.BoardId });
            created.BoardType = board.BoardType;

            return created;
        }

        /// <summary>
        /// Updates an existing Board in the database using sp_UpdateBoard.
        /// </summary>
        public async Task<Board?> UpdateBoardAsync(Board board)
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_UpdateBoard",
                new
                {
                    p_BoardId = board.BoardId,
                    p_BoardName = board.BoardName,
                    p_BoardCode = board.BoardCode,
                    p_Description = board.Description,
                    p_CountryId = board.CountryId,
                    p_StateId = board.StateId,
                    p_AcademicPatternId = board.AcademicPatternId,
                    p_GradingSystemId = board.GradingSystemId,
                    p_InternalAssessment = board.InternalAssessment,
                    p_PracticalExams = board.PracticalExams,
                    p_BoardExams = board.BoardExams,
                    p_PassPercentage = board.PassPercentage,
                    p_RankCalculation = board.RankCalculation,
                    p_IsActive = board.IsActive
                },
                commandType: CommandType.StoredProcedure);

            var updated = multi.Read<Board, Country, State, AcademicPattern, GradingSystem, Board>(
                (b, c, s, ap, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.AcademicPattern = ap;
                    b.GradingSystem = gs;
                    return b;
                },
                splitOn: "CountryId,StateId,AcademicPatternId,GradingSystemId"
            ).FirstOrDefault();
            multi.Dispose();

            if (updated != null)
            {
                await Connection.ExecuteAsync(
                    "UPDATE Boards SET BoardType = @BoardType WHERE BoardId = @BoardId",
                    new { board.BoardType, board.BoardId });
                updated.BoardType = board.BoardType;
            }

            return updated;
        }

        /// <summary>
        /// Soft deletes a Board using sp_DeleteBoard.
        /// </summary>
        public async Task<bool> DeleteBoardAsync(int boardId)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_DeleteBoard",
                new { p_BoardId = boardId },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        /// <summary>
        /// Retrieves a Board by ID, mapping relationships from multi-result set using sp_GetBoardById.
        /// </summary>
        public async Task<Board?> GetBoardByIdAsync(int boardId)
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetBoardById",
                new { p_BoardId = boardId },
                commandType: CommandType.StoredProcedure);

            var board = multi.Read<Board, Country, State, AcademicPattern, GradingSystem, Board>(
                (b, c, s, ap, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.AcademicPattern = ap;
                    b.GradingSystem = gs;
                    return b;
                },
                splitOn: "CountryId,StateId,AcademicPatternId,GradingSystemId"
            ).FirstOrDefault();

            if (board != null)
            {
                var academicLevels = multi.Read<BoardAcademicLevel, AcademicLevel, BoardAcademicLevel>(
                    (bal, al) =>
                    {
                        bal.AcademicLevel = al;
                        bal.Board = board;
                        return bal;
                    },
                    splitOn: "AcademicLevelId"
                ).ToList();

                board.BoardAcademicLevels = academicLevels;
                multi.Dispose();
                board.BoardType = await Connection.QuerySingleOrDefaultAsync<string>(
                    "SELECT BoardType FROM Boards WHERE BoardId = @BoardId",
                    new { boardId }) ?? string.Empty;
            }

            return board;
        }

        /// <summary>
        /// Retrieves filtered list of Boards using sp_GetBoards.
        /// </summary>
        public async Task<List<Board>> GetBoardsAsync(BoardSearchRequest request)
        {
            var result = await Connection.QueryAsync<Board, Country, State, AcademicPattern, GradingSystem, Board>(
                "sp_GetBoards",
                (b, c, s, ap, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.AcademicPattern = ap;
                    b.GradingSystem = gs;
                    return b;
                },
                new
                {
                    p_BoardName = string.IsNullOrWhiteSpace(request.BoardName) ? null : request.BoardName.Trim(),
                    p_BoardCode = string.IsNullOrWhiteSpace(request.BoardCode) ? null : request.BoardCode.Trim(),
                    p_CountryId = request.CountryId,
                    p_StateId = request.StateId,
                    p_Status = request.Status
                },
                splitOn: "CountryId,StateId,AcademicPatternId,GradingSystemId",
                commandType: CommandType.StoredProcedure);

            var boards = result.ToList();
            foreach (var board in boards)
            {
                board.BoardType = await Connection.QuerySingleOrDefaultAsync<string>(
                    "SELECT BoardType FROM Boards WHERE BoardId = @BoardId",
                    new { board.BoardId }) ?? string.Empty;
            }

            return boards;
        }

        /// <summary>
        /// Changes status of a Board using sp_ChangeBoardStatus.
        /// </summary>
        public async Task<bool> ChangeBoardStatusAsync(int boardId, bool status)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_ChangeBoardStatus",
                new { p_BoardId = boardId, p_Status = status },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        /// <summary>
        /// Checks duplicate board code using sp_ValidateBoardCode.
        /// </summary>
        public async Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_ValidateBoardCode",
                new { p_BoardCode = boardCode, p_ExcludeBoardId = boardId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Retrieves active countries using sp_GetCountries.
        /// </summary>
        public async Task<List<Country>> GetCountriesAsync()
        {
            var result = await Connection.QueryAsync<Country>(
                "sp_GetCountries",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Retrieves active states for a country using sp_GetStatesByCountry.
        /// </summary>
        public async Task<List<State>> GetStatesByCountryAsync(int countryId)
        {
            var result = await Connection.QueryAsync<State>(
                "sp_GetStatesByCountry",
                new { p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Retrieves active academic patterns using sp_GetAcademicPatterns.
        /// </summary>
        public async Task<List<AcademicPattern>> GetAcademicPatternsAsync()
        {
            var result = await Connection.QueryAsync<AcademicPattern>(
                "sp_GetAcademicPatterns",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Retrieves active academic levels using sp_GetAcademicLevels.
        /// </summary>
        public async Task<List<AcademicLevel>> GetAcademicLevelsAsync()
        {
            var result = await Connection.QueryAsync<AcademicLevel>(
                "sp_GetAcademicLevels",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Retrieves active grading systems using sp_GetGradingSystems.
        /// </summary>
        public async Task<List<GradingSystem>> GetGradingSystemsAsync()
        {
            var result = await Connection.QueryAsync<GradingSystem>(
                "sp_GetGradingSystems",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Replaces academic levels mapping for a board using sp_ReplaceBoardAcademicLevels.
        /// </summary>
        public async Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds)
        {
            var idsString = academicLevelIds != null && academicLevelIds.Any()
                ? string.Join(",", academicLevelIds.Distinct())
                : null;

            await Connection.ExecuteAsync(
                "sp_ReplaceBoardAcademicLevels",
                new { p_BoardId = boardId, p_AcademicLevelIds = idsString },
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Checks if an academic level exists using sp_AcademicLevelExists.
        /// </summary>
        public async Task<bool> AcademicLevelExistsAsync(int academicLevelId)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_AcademicLevelExists",
                new { p_AcademicLevelId = academicLevelId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Checks if a country exists using sp_CountryExists.
        /// </summary>
        public async Task<bool> CountryExistsAsync(int countryId)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_CountryExists",
                new { p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Checks if a state exists using sp_StateExists.
        /// </summary>
        public async Task<bool> StateExistsAsync(int stateId)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_StateExists",
                new { p_StateId = stateId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Checks if an academic pattern exists using sp_AcademicPatternExists.
        /// </summary>
        public async Task<bool> AcademicPatternExistsAsync(int academicPatternId)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_AcademicPatternExists",
                new { p_AcademicPatternId = academicPatternId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Checks if a grading system exists using sp_GradingSystemExists.
        /// </summary>
        public async Task<bool> GradingSystemExistsAsync(int gradingSystemId)
        {
            var exists = await Connection.ExecuteScalarAsync<int>(
                "sp_GradingSystemExists",
                new { p_GradingSystemId = gradingSystemId },
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        /// <summary>
        /// Checks if a state belongs to a country using sp_StateBelongsToCountry.
        /// </summary>
        public async Task<bool> StateBelongsToCountryAsync(int stateId, int countryId)
        {
            var belongs = await Connection.ExecuteScalarAsync<int>(
                "sp_StateBelongsToCountry",
                new { p_StateId = stateId, p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);

            return belongs > 0;
        }

        /// <summary>
        /// Checks if all academic levels exist using sp_AcademicLevelExists.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            var ids = academicLevelIds.Distinct().ToList();
            if (!ids.Any())
            {
                return true;
            }

            foreach (var id in ids)
            {
                var exists = await Connection.ExecuteScalarAsync<int>(
                    "sp_AcademicLevelExists",
                    new { p_AcademicLevelId = id },
                    commandType: CommandType.StoredProcedure);

                if (exists == 0)
                {
                    return false;
                }
            }

            return true;
        }
    }
}
