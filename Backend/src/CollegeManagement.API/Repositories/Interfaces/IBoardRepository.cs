using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    /// <summary>
    /// Repository interface for Board database operations.
    /// </summary>
    public interface IBoardRepository
    {
        /// <summary>
        /// Creates a new Board in the database.
        /// </summary>
        Task<Board> CreateBoardAsync(Board board);

        /// <summary>
        /// Updates an existing Board in the database.
        /// </summary>
        Task<Board?> UpdateBoardAsync(Board board);

        /// <summary>
        /// Performs soft delete of a Board.
        /// </summary>
        Task<bool> DeleteBoardAsync(int boardId);

        /// <summary>
        /// Retrieves a Board by ID including relations.
        /// </summary>
        Task<Board?> GetBoardByIdAsync(int boardId);

        /// <summary>
        /// Retrieves filtered list of Boards.
        /// </summary>
        Task<List<Board>> GetBoardsAsync(BoardSearchRequest request);

        /// <summary>
        /// Changes status of a Board.
        /// </summary>
        Task<bool> ChangeBoardStatusAsync(int boardId, bool status);

        /// <summary>
        /// Checks duplicate board code.
        /// </summary>
        Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null);

        /// <summary>
        /// Retrieves active countries.
        /// </summary>
        Task<List<Country>> GetCountriesAsync();

        /// <summary>
        /// Retrieves active states for a country.
        /// </summary>
        Task<List<State>> GetStatesByCountryAsync(int countryId);

        /// <summary>
        /// Retrieves active academic patterns.
        /// </summary>
        Task<List<AcademicPattern>> GetAcademicPatternsAsync();

        /// <summary>
        /// Retrieves active academic levels.
        /// </summary>
        Task<List<AcademicLevel>> GetAcademicLevelsAsync();

        /// <summary>
        /// Retrieves active grading systems.
        /// </summary>
        Task<List<GradingSystem>> GetGradingSystemsAsync();

        /// <summary>
        /// Replaces academic levels mapping for a board.
        /// </summary>
        Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds);

        /// <summary>
        /// Checks if an academic level exists.
        /// </summary>
        Task<bool> AcademicLevelExistsAsync(int academicLevelId);

        /// <summary>
        /// Checks if a country exists.
        /// </summary>
        Task<bool> CountryExistsAsync(int countryId);

        /// <summary>
        /// Checks if a state exists.
        /// </summary>
        Task<bool> StateExistsAsync(int stateId);

        /// <summary>
        /// Checks if an academic pattern exists.
        /// </summary>
        Task<bool> AcademicPatternExistsAsync(int academicPatternId);

        /// <summary>
        /// Checks if a grading system exists.
        /// </summary>
        Task<bool> GradingSystemExistsAsync(int gradingSystemId);

        /// <summary>
        /// Checks if a state belongs to a country.
        /// </summary>
        Task<bool> StateBelongsToCountryAsync(int stateId, int countryId);

        /// <summary>
        /// Checks if all academic levels exist.
        /// </summary>
        Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds);
    }
}