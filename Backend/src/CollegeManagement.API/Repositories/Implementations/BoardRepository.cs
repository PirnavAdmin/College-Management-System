using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Board operations using Entity Framework Core.
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

        #region Write Operations

        /// <summary>
        /// Creates a new Board in the database.
        /// </summary>
        /// <param name="board">The Board entity to create.</param>
        /// <returns>The created Board entity.</returns>
        public async Task<Board> CreateBoardAsync(Board board)
        {
            await _context.Boards.AddAsync(board);
            await _context.SaveChangesAsync();
            return board;
        }

        /// <summary>
        /// Updates an existing Board in the database.
        /// </summary>
        /// <param name="board">The Board entity containing updated values.</param>
        /// <returns>The updated Board entity, or null if not found.</returns>
        public async Task<Board?> UpdateBoardAsync(Board board)
        {
            var existing = await _context.Boards
                .FirstOrDefaultAsync(b => b.BoardId == board.BoardId);

            if (existing == null)
            {
                return null;
            }

            // Update scalar properties
            existing.BoardName = board.BoardName;
            existing.BoardCode = board.BoardCode;
            existing.Description = board.Description;
            existing.CountryId = board.CountryId;
            existing.StateId = board.StateId;
            existing.AcademicPatternId = board.AcademicPatternId;
            existing.GradingSystemId = board.GradingSystemId;
            existing.InternalAssessment = board.InternalAssessment;
            existing.PracticalExams = board.PracticalExams;
            existing.BoardExams = board.BoardExams;
            existing.PassPercentage = board.PassPercentage;
            existing.RankCalculation = board.RankCalculation;
            existing.IsActive = board.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Performs a soft delete on a Board.
        /// </summary>
        /// <param name="boardId">The identifier of the Board to delete.</param>
        /// <returns>True if deleted successfully, otherwise false.</returns>
        public async Task<bool> DeleteBoardAsync(int boardId)
        {
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == boardId);
            if (board == null)
            {
                return false;
            }

            board.IsActive = false;
            board.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Changes the active status of a Board.
        /// </summary>
        /// <param name="boardId">The identifier of the Board.</param>
        /// <param name="status">The new status value.</param>
        /// <returns>True if updated successfully, otherwise false.</returns>
        public async Task<bool> ChangeBoardStatusAsync(int boardId, bool status)
        {
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == boardId);
            if (board == null)
            {
                return false;
            }

            board.IsActive = status;
            board.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        #endregion

        #region Read Operations

        /// <summary>
        /// Retrieves a Board by its identifier, including navigation properties.
        /// </summary>
        /// <param name="boardId">The identifier of the Board.</param>
        /// <returns>The Board entity if found, otherwise null.</returns>
        public async Task<Board?> GetBoardByIdAsync(int boardId)
        {
            return await _context.Boards
                .AsNoTracking()
                .Include(b => b.Country)
                .Include(b => b.State)
                .Include(b => b.AcademicPattern)
                .Include(b => b.GradingSystem)
                .Include(b => b.BoardAcademicLevels)
                    .ThenInclude(bal => bal.AcademicLevel)
                .FirstOrDefaultAsync(b => b.BoardId == boardId);
        }

        /// <summary>
        /// Searches and filters Boards from the database based on search criteria.
        /// </summary>
        /// <param name="request">The search criteria.</param>
        /// <returns>A list of matching Board entities.</returns>
        public async Task<List<Board>> GetBoardsAsync(BoardSearchRequest request)
        {
            var query = _context.Boards
                .AsNoTracking();
                // .AsQueryable();

            // Apply Filters
            if (!string.IsNullOrWhiteSpace(request.BoardName))
            {
                query = query.Where(b => EF.Functions.Like(b.BoardName, $"%{request.BoardName}%"));
            }

            if (!string.IsNullOrWhiteSpace(request.BoardCode))
            {
                query = query.Where(b => EF.Functions.Like(b.BoardCode, $"%{request.BoardCode}%"));
            }

            if (request.CountryId.HasValue)
            {
                query = query.Where(b => b.CountryId == request.CountryId.Value);
            }

            if (request.StateId.HasValue)
            {
                query = query.Where(b => b.StateId == request.StateId.Value);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(b => b.IsActive == request.Status.Value);
            }

            // Default Sorting by Board Name
            query = query.OrderBy(b => b.BoardName);

            return await query.ToListAsync();
        }

        /// <summary>
        /// Checks if a Board Code already exists, excluding a specific Board ID for updates.
        /// </summary>
        /// <param name="boardCode">The board code to check.</param>
        /// <param name="boardId">The board ID to exclude (optional).</param>
        /// <returns>True if code exists, otherwise false.</returns>
        public async Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null)
        {
            return await _context.Boards
                .AsNoTracking()
                .AnyAsync(b => b.BoardCode == boardCode && (boardId == null || b.BoardId != boardId));
        }

        #endregion

        #region Lookup Operations

        /// <summary>
        /// Retrieves all active countries, ordered by display order.
        /// </summary>
        /// <returns>A list of active Country entities.</returns>
        public async Task<List<Country>> GetCountriesAsync()
        {
            return await _context.Countries
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves active states for a given country.
        /// </summary>
        /// <param name="countryId">The identifier of the Country.</param>
        /// <returns>A list of active State entities.</returns>
        public async Task<List<State>> GetStatesByCountryAsync(int countryId)
        {
            return await _context.States
                .AsNoTracking()
                .Where(s => s.CountryId == countryId && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ThenBy(s => s.StateName)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves all active academic patterns.
        /// </summary>
        /// <returns>A list of active AcademicPattern entities.</returns>
        public async Task<List<AcademicPattern>> GetAcademicPatternsAsync()
        {
            return await _context.AcademicPatterns
                .AsNoTracking()
                .Where(ap => ap.IsActive)
                .OrderBy(ap => ap.DisplayOrder)
                .ThenBy(ap => ap.PatternName)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves all active academic levels.
        /// </summary>
        /// <returns>A list of active AcademicLevel entities.</returns>
        public async Task<List<AcademicLevel>> GetAcademicLevelsAsync()
        {
            return await _context.AcademicLevels
                .AsNoTracking()
                .Where(al => al.IsActive)
                .OrderBy(al => al.DisplayOrder)
                .ThenBy(al => al.LevelName)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves all active grading systems.
        /// </summary>
        /// <returns>A list of active GradingSystem entities.</returns>
        public async Task<List<GradingSystem>> GetGradingSystemsAsync()
        {
            return await _context.GradingSystems
                .AsNoTracking()
                .Where(gs => gs.IsActive)
                .OrderBy(gs => gs.DisplayOrder)
                .ThenBy(gs => gs.GradingSystemName)
                .ToListAsync();
        }

        /// <summary>
        /// Checks if a country exists and is active.
        /// </summary>
        public async Task<bool> CountryExistsAsync(int countryId)
        {
            return await _context.Countries
                .AsNoTracking()
                .AnyAsync(c => c.CountryId == countryId && c.IsActive);
        }

        /// <summary>
        /// Checks if a state exists and is active.
        /// </summary>
        public async Task<bool> StateExistsAsync(int stateId)
        {
            return await _context.States
                .AsNoTracking()
                .AnyAsync(s => s.StateId == stateId && s.IsActive);
        }

        /// <summary>
        /// Checks if an academic pattern exists and is active.
        /// </summary>
        public async Task<bool> AcademicPatternExistsAsync(int academicPatternId)
        {
            return await _context.AcademicPatterns
                .AsNoTracking()
                .AnyAsync(ap => ap.AcademicPatternId == academicPatternId && ap.IsActive);
        }

        /// <summary>
        /// Checks if a grading system exists and is active.
        /// </summary>
        public async Task<bool> GradingSystemExistsAsync(int gradingSystemId)
        {
            return await _context.GradingSystems
                .AsNoTracking()
                .AnyAsync(gs => gs.GradingSystemId == gradingSystemId && gs.IsActive);
        }

        /// <summary>
        /// Checks if an academic level exists and is active.
        /// </summary>
        public async Task<bool> AcademicLevelExistsAsync(int academicLevelId)
        {
            return await _context.AcademicLevels
                .AsNoTracking()
                .AnyAsync(al => al.AcademicLevelId == academicLevelId && al.IsActive);
        }

        /// <summary>
        /// Replaces the academic levels mapped to a board.
        /// </summary>
        public async Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds)
        {
            // 1. Remove existing relationships
            var existingMappings = await _context.BoardAcademicLevels
                .Where(bal => bal.BoardId == boardId)
                .ToListAsync();
            _context.BoardAcademicLevels.RemoveRange(existingMappings);

            // 2. Add new relationships
            if (academicLevelIds?.Any() == true)
            {
                foreach (var levelId in academicLevelIds.Distinct())
                {
                    _context.BoardAcademicLevels.Add(new BoardAcademicLevel
                    {
                        BoardId = boardId,
                        AcademicLevelId = levelId
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Checks if a state belongs to a country and is active.
        /// </summary>
        public async Task<bool> StateBelongsToCountryAsync(int stateId, int countryId)
        {
            return await _context.States
                .AsNoTracking()
                .AnyAsync(s => s.StateId == stateId && s.CountryId == countryId && s.IsActive);
        }

        /// <summary>
        /// Checks if all active academic levels exist.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            var ids = academicLevelIds.Distinct().ToList();
            if (!ids.Any())
            {
                return true;
            }

            var count = await _context.AcademicLevels
                .AsNoTracking()
                .CountAsync(al => ids.Contains(al.AcademicLevelId) && al.IsActive);

            return count == ids.Count;
        }

        #endregion
    }
}
