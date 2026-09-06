using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Board database operations using Entity Framework Core.
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

        /// <summary>
        /// Starts a database transaction.
        /// </summary>
        public async Task<IDbTransaction> BeginTransactionAsync()
        {
            var efTransaction = await _context.Database.BeginTransactionAsync();
            return efTransaction.GetDbTransaction();
        }

        /// <summary>
        /// Creates a new Board in the database.
        /// </summary>
        public async Task<Board> CreateBoardAsync(Board board, IDbTransaction? transaction = null)
        {
            await _context.Boards.AddAsync(board);
            await _context.SaveChangesAsync();
            return board;
        }

        /// <summary>
        /// Updates an existing Board in the database with optimistic concurrency.
        /// </summary>
        public async Task<(Board? Board, int AffectedRows)> UpdateBoardAsync(Board board, uint expectedVersion, IDbTransaction? transaction = null)
        {
            var existing = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == board.BoardId);
            if (existing == null)
            {
                return (null, 0);
            }

            existing.BoardCode = board.BoardCode;
            existing.BoardName = board.BoardName;
            existing.BoardType = board.BoardType;
            existing.Description = board.Description;
            existing.CountryId = board.CountryId;
            existing.StateId = board.StateId;
            existing.GradingSystemId = board.GradingSystemId;
            existing.IsActive = board.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return (existing, 1);
        }

        /// <summary>
        /// Performs soft delete of a Board using optimistic concurrency.
        /// </summary>
        public async Task<int> DeleteBoardAsync(int boardId, uint expectedVersion, IDbTransaction? transaction = null)
        {
            var existing = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == boardId);
            if (existing == null)
            {
                return 0;
            }

            existing.IsActive = false;
            existing.UpdatedAt = DateTime.UtcNow;
            return await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Retrieves a Board by ID including relations.
        /// </summary>
        public async Task<Board?> GetBoardByIdAsync(int boardId, IDbTransaction? transaction = null)
        {
            return await _context.Boards
                .Include(b => b.Country)
                .Include(b => b.State)
                .Include(b => b.GradingSystem)
                .Include(b => b.BoardAcademicLevels)
                    .ThenInclude(bal => bal.AcademicLevel)
                .FirstOrDefaultAsync(b => b.BoardId == boardId);
        }

        /// <summary>
        /// Retrieves filtered list of Boards with pagination, searching, and sorting.
        /// </summary>
        public async Task<(List<Board> Items, int TotalCount)> GetBoardsAsync(BoardSearchRequest request)
        {
            var query = _context.Boards
                .Include(x => x.Country)
                .Include(x => x.State)
                .Include(x => x.GradingSystem)
                .Include(x => x.BoardAcademicLevels)
                    .ThenInclude(bal => bal.AcademicLevel)
                .AsNoTracking()
                .AsQueryable();

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.IsActive == request.Status.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.BoardName.ToLower().Contains(term) ||
                    x.BoardCode.ToLower().Contains(term) ||
                    x.BoardType.ToLower().Contains(term) ||
                    (x.State != null && x.State.StateName.ToLower().Contains(term)) ||
                    (x.Description != null && x.Description.ToLower().Contains(term)) ||
                    x.BoardAcademicLevels.Any(bal => bal.AcademicLevel != null && bal.AcademicLevel.LevelName.ToLower().Contains(term)));
            }

            int totalCount = await query.CountAsync();

            int pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;
            int skip = (pageNumber - 1) * pageSize;

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        /// <summary>
        /// Changes status of a Board.
        /// </summary>
        public async Task<int> ChangeBoardStatusAsync(int boardId, uint expectedVersion, bool status, IDbTransaction? transaction = null)
        {
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == boardId);
            if (board == null) return 0;

            board.IsActive = status;
            board.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return 1;
        }

        /// <summary>
        /// Checks duplicate board code.
        /// </summary>
        public async Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null)
        {
            var code = boardCode.Trim().ToLower();
            return await _context.Boards
                .AsNoTracking()
                .AnyAsync(b => b.BoardCode.ToLower() == code && (!boardId.HasValue || b.BoardId != boardId.Value));
        }

        /// <summary>
        /// Retrieves active countries.
        /// </summary>
        public async Task<List<Country>> GetCountriesAsync()
        {
            return await _context.Countries
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.CountryName)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves active states for a country.
        /// </summary>
        public async Task<List<State>> GetStatesByCountryAsync(int countryId)
        {
            var query = _context.States.AsNoTracking().Where(x => x.IsActive);
            if (countryId > 0)
            {
                query = query.Where(x => x.CountryId == countryId);
            }

            var states = await query
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.StateName)
                .ToListAsync();

            return states
                .GroupBy(x => x.StateName.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();
        }

        /// <summary>
        /// Retrieves active academic levels with zero duplicates guaranteed, optionally filtered by boardId.
        /// </summary>
        public async Task<List<AcademicLevel>> GetAcademicLevelsAsync(int? boardId = null)
        {
            var query = _context.AcademicLevels
                .AsNoTracking()
                .Where(x => x.IsActive);

            if (boardId.HasValue && boardId.Value > 0)
            {
                var mappedLevelIds = await _context.BoardAcademicLevels
                    .Where(b => b.BoardId == boardId.Value)
                    .Select(b => b.AcademicLevelId)
                    .ToListAsync();

                if (mappedLevelIds.Any())
                {
                    query = query.Where(x => mappedLevelIds.Contains(x.AcademicLevelId));
                }
            }

            var levels = await query
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.LevelName)
                .ToListAsync();

            return levels
                .GroupBy(x => x.LevelName.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();
        }

        /// <summary>
        /// Retrieves active grading systems.
        /// </summary>
        public async Task<List<GradingSystem>> GetGradingSystemsAsync()
        {
            return await _context.GradingSystems
                .AsNoTracking()
                .Where(x => x.IsActive)
                .ToListAsync();
        }

        /// <summary>
        /// Replaces academic levels mapping for a board.
        /// </summary>
        public async Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds, IDbTransaction? transaction = null)
        {
            var existingMappings = await _context.BoardAcademicLevels
                .Where(x => x.BoardId == boardId)
                .ToListAsync();

            _context.BoardAcademicLevels.RemoveRange(existingMappings);

            if (academicLevelIds != null && academicLevelIds.Any())
            {
                var newMappings = academicLevelIds.Select(levelId => new BoardAcademicLevel
                {
                    BoardId = boardId,
                    AcademicLevelId = levelId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });

                await _context.BoardAcademicLevels.AddRangeAsync(newMappings);
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Checks if an academic level exists.
        /// </summary>
        public async Task<bool> AcademicLevelExistsAsync(int academicLevelId)
        {
            return await _context.AcademicLevels.AsNoTracking().AnyAsync(x => x.AcademicLevelId == academicLevelId && x.IsActive);
        }

        /// <summary>
        /// Checks if a country exists.
        /// </summary>
        public async Task<bool> CountryExistsAsync(int countryId)
        {
            return await _context.Countries.AsNoTracking().AnyAsync(x => x.CountryId == countryId && x.IsActive);
        }

        /// <summary>
        /// Checks if a state exists.
        /// </summary>
        public async Task<bool> StateExistsAsync(int stateId)
        {
            return await _context.States.AsNoTracking().AnyAsync(x => x.StateId == stateId && x.IsActive);
        }

        /// <summary>
        /// Checks if a grading system exists.
        /// </summary>
        public async Task<bool> GradingSystemExistsAsync(int gradingSystemId)
        {
            return await _context.GradingSystems.AsNoTracking().AnyAsync(x => x.GradingSystemId == gradingSystemId && x.IsActive);
        }

        /// <summary>
        /// Checks if a state belongs to a country.
        /// </summary>
        public async Task<bool> StateBelongsToCountryAsync(int stateId, int countryId)
        {
            return await _context.States.AsNoTracking().AnyAsync(x => x.StateId == stateId && x.CountryId == countryId && x.IsActive);
        }

        /// <summary>
        /// Checks if all academic levels exist.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            if (academicLevelIds == null || !academicLevelIds.Any()) return true;
            var ids = academicLevelIds.Distinct().ToList();
            var count = await _context.AcademicLevels.AsNoTracking().CountAsync(x => ids.Contains(x.AcademicLevelId) && x.IsActive);
            return count == ids.Count;
        }

        /// <inheritdoc />
        public async Task<BoardSummaryResponse> GetDashboardSummaryAsync()
        {
            var total = await _context.Boards.CountAsync();
            var active = await _context.Boards.CountAsync(x => x.IsActive);
            var inactive = await _context.Boards.CountAsync(x => !x.IsActive);

            var recentlyCreatedBoards = await _context.Boards
                .Include(b => b.Country)
                .OrderByDescending(b => b.CreatedAt)
                .Take(5)
                .Select(b => new BoardRecentActivityDto
                {
                    BoardId = b.BoardId,
                    BoardCode = b.BoardCode,
                    BoardName = b.BoardName,
                    CountryName = b.Country != null ? b.Country.CountryName : string.Empty,
                    Status = b.IsActive,
                    CreatedAt = b.CreatedAt,
                    UpdatedAt = b.UpdatedAt
                })
                .ToListAsync();

            return new BoardSummaryResponse
            {
                TotalBoards = total,
                ActiveBoards = active,
                InactiveBoards = inactive,
                RecentlyCreated = recentlyCreatedBoards,
                RecentlyUpdated = new List<BoardRecentActivityDto>()
            };
        }

        /// <inheritdoc />
        public async Task<List<Board>> GetBoardsForExportAsync(BoardExportRequest request)
        {
            var query = _context.Boards
                .Include(x => x.Country)
                .Include(x => x.State)
                .Include(x => x.GradingSystem)
                .Include(x => x.BoardAcademicLevels)
                    .ThenInclude(bal => bal.AcademicLevel)
                .AsNoTracking()
                .AsQueryable();

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.IsActive == request.Status.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.BoardName.ToLower().Contains(term) ||
                    x.BoardCode.ToLower().Contains(term) ||
                    x.BoardType.ToLower().Contains(term) ||
                    (x.State != null && x.State.StateName.ToLower().Contains(term)) ||
                    (x.Description != null && x.Description.ToLower().Contains(term)) ||
                    x.BoardAcademicLevels.Any(bal => bal.AcademicLevel != null && bal.AcademicLevel.LevelName.ToLower().Contains(term)));
            }

            return await query.OrderBy(x => x.BoardName).ToListAsync();
        }
    }
}
