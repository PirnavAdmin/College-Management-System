using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service interface for Board operations.
    /// </summary>
    public interface IBoardService
    {
        /// <summary>
        /// Searches and filters boards based on the request parameters.
        /// </summary>
        /// <param name="request">Search parameters.</param>
        /// <returns>A list of matching boards.</returns>
        Task<IEnumerable<BoardListResponse>> SearchBoardsAsync(BoardSearchRequest request);

        /// <summary>
        /// Retrieves a single Board details by ID.
        /// </summary>
        /// <param name="boardId">The Board identifier.</param>
        /// <returns>The board details DTO, or null if not found.</returns>
        Task<BoardResponse?> GetBoardByIdAsync(int boardId);

        /// <summary>
        /// Creates a new board after validation.
        /// </summary>
        /// <param name="request">Creation details.</param>
        /// <returns>The created board details.</returns>
        Task<BoardResponse> CreateBoardAsync(CreateBoardRequest request);

        /// <summary>
        /// Updates an existing board after validation.
        /// </summary>
        /// <param name="boardId">The identifier of the board to update.</param>
        /// <param name="request">Updated details.</param>
        /// <returns>The updated board details.</returns>
        Task<BoardResponse?> UpdateBoardAsync(int boardId, UpdateBoardRequest request);

        /// <summary>
        /// Performs soft delete of a board.
        /// </summary>
        /// <param name="boardId">The board identifier.</param>
        /// <returns>True if successfully deleted, otherwise false.</returns>
        Task<bool> DeleteBoardAsync(int boardId);

        /// <summary>
        /// Changes active status of a board.
        /// </summary>
        /// <param name="boardId">The board identifier.</param>
        /// <param name="request">Status change details.</param>
        /// <returns>True if status updated, otherwise false.</returns>
        Task<bool> ChangeBoardStatusAsync(int boardId, ChangeBoardStatusRequest request);

        /// <summary>
        /// Retrieves all active countries.
        /// </summary>
        /// <returns>A list of active countries.</returns>
        Task<IEnumerable<CountryResponse>> GetCountriesAsync();

        /// <summary>
        /// Retrieves active states for a specific country.
        /// </summary>
        /// <param name="countryId">The country identifier.</param>
        /// <returns>A list of active states.</returns>
        Task<IEnumerable<StateResponse>> GetStatesAsync(int countryId);

        /// <summary>
        /// Validates if a board code is available.
        /// </summary>
        /// <param name="request">Validation details.</param>
        /// <returns>Validation status details.</returns>
        Task<ValidateBoardCodeResponse> ValidateBoardCodeAsync(ValidateBoardCodeRequest request);

        /// <summary>
        /// Retrieves all active academic patterns.
        /// </summary>
        /// <returns>A list of active academic patterns.</returns>
        Task<IEnumerable<AcademicPatternResponse>> GetAcademicPatternsAsync();

        /// <summary>
        /// Retrieves all active academic levels.
        /// </summary>
        /// <returns>A list of active academic levels.</returns>
        Task<IEnumerable<AcademicLevelResponse>> GetAcademicLevelsAsync();

        /// <summary>
        /// Retrieves all active grading systems.
        /// </summary>
        /// <returns>A list of active grading systems.</returns>
        Task<IEnumerable<GradingSystemResponse>> GetGradingSystemsAsync();

        
    }
}
