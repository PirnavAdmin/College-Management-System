using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for Board operations, handling validations and DTO mappings.
    /// </summary>
    public class BoardService : IBoardService
    {
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="BoardService"/> class.
        /// </summary>
        /// <param name="boardRepository">The board repository dependency.</param>
        /// <param name="mapper">The AutoMapper instance.</param>
        public BoardService(IBoardRepository boardRepository, IMapper mapper)
        {
            _boardRepository = boardRepository;
            _mapper = mapper;
        }

        #region Core Board Actions

        /// <summary>
        /// Searches and returns boards.
        /// </summary>
        public async Task<IEnumerable<BoardListResponse>> SearchBoardsAsync(BoardSearchRequest request)
        {
            var boards = await _boardRepository.GetBoardsAsync(request);
            return _mapper.Map<IEnumerable<BoardListResponse>>(boards);
        }

        /// <summary>
        /// Retrieves board details by identifier.
        /// </summary>
        public async Task<BoardResponse?> GetBoardByIdAsync(int boardId)
        {
            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            return board == null ? null : _mapper.Map<BoardResponse>(board);
        }

        /// <summary>
        /// Validates request details and creates a new Board.
        /// </summary>
        public async Task<BoardResponse> CreateBoardAsync(CreateBoardRequest request)
        {
            await ValidateCreateRequestAsync(request);

            var board = _mapper.Map<Board>(request);
            var savedBoard = await _boardRepository.CreateBoardAsync(board);

            await _boardRepository.ReplaceAcademicLevelsAsync(savedBoard.BoardId, request.AcademicLevelIds);

            var fullyLoadedBoard = await _boardRepository.GetBoardByIdAsync(savedBoard.BoardId);
            if (fullyLoadedBoard == null)
            {
                throw new InvalidOperationException("Unable to retrieve the saved board.");
            }

            return _mapper.Map<BoardResponse>(fullyLoadedBoard);
        }

        /// <summary>
        /// Validates request details and updates an existing Board.
        /// </summary>
        public async Task<BoardResponse?> UpdateBoardAsync(int boardId, UpdateBoardRequest request)
        {
            await ValidateUpdateRequestAsync(boardId, request);

            var boardToUpdate = _mapper.Map<Board>(request);
            boardToUpdate.BoardId = boardId;

            var updatedBoard = await _boardRepository.UpdateBoardAsync(boardToUpdate);
            if (updatedBoard == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            await _boardRepository.ReplaceAcademicLevelsAsync(boardId, request.AcademicLevelIds);

            var fullyLoadedBoard = await _boardRepository.GetBoardByIdAsync(boardId);
            if (fullyLoadedBoard == null)
            {
                throw new InvalidOperationException("Unable to retrieve the saved board.");
            }

            return _mapper.Map<BoardResponse>(fullyLoadedBoard);
        }

        /// <summary>
        /// Soft deletes a board.
        /// </summary>
        public async Task<bool> DeleteBoardAsync(int boardId)
        {
            var deleted = await _boardRepository.DeleteBoardAsync(boardId);
            if (!deleted)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }
            return true;
        }

        /// <summary>
        /// Changes status of a board.
        /// </summary>
        public async Task<bool> ChangeBoardStatusAsync(int boardId, ChangeBoardStatusRequest request)
        {
            var updated = await _boardRepository.ChangeBoardStatusAsync(boardId, request.Status);
            if (!updated)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }
            return true;
        }

        /// <summary>
        /// Validates if a board code is available.
        /// </summary>
        public async Task<ValidateBoardCodeResponse> ValidateBoardCodeAsync(ValidateBoardCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardCode))
            {
                throw new ValidationException("Board code is required.");
            }

            var exists = await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode, request.BoardId);
            return new ValidateBoardCodeResponse
            {
                IsValid = !exists,
                Message = exists ? "Board code already exists" : "Board code is available"
            };
        }

        #endregion

        #region Lookup Actions

        /// <summary>
        /// Retrieves all active countries.
        /// </summary>
        public async Task<IEnumerable<CountryResponse>> GetCountriesAsync()
        {
            var countries = await _boardRepository.GetCountriesAsync();
            return _mapper.Map<IEnumerable<CountryResponse>>(countries);
        }

        /// <summary>
        /// Retrieves active states for a country.
        /// </summary>
        public async Task<IEnumerable<StateResponse>> GetStatesAsync(int countryId)
        {
            var states = await _boardRepository.GetStatesByCountryAsync(countryId);
            return _mapper.Map<IEnumerable<StateResponse>>(states);
        }

        /// <summary>
        /// Retrieves active academic patterns.
        /// </summary>
        public async Task<IEnumerable<AcademicPatternResponse>> GetAcademicPatternsAsync()
        {
            var patterns = await _boardRepository.GetAcademicPatternsAsync();
            return _mapper.Map<IEnumerable<AcademicPatternResponse>>(patterns);
        }

        /// <summary>
        /// Retrieves active academic levels.
        /// </summary>
        public async Task<IEnumerable<AcademicLevelResponse>> GetAcademicLevelsAsync()
        {
            var levels = await _boardRepository.GetAcademicLevelsAsync();
            return _mapper.Map<IEnumerable<AcademicLevelResponse>>(levels);
        }

        /// <summary>
        /// Retrieves active grading systems.
        /// </summary>
        public async Task<IEnumerable<GradingSystemResponse>> GetGradingSystemsAsync()
        {
            var systems = await _boardRepository.GetGradingSystemsAsync();
            return _mapper.Map<IEnumerable<GradingSystemResponse>>(systems);
        }

        /// <summary>
        /// Checks if all active academic levels exist.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            return await _boardRepository.AcademicLevelsExistAsync(academicLevelIds);
        }

        #endregion

        #region Private Validation Helper Methods

        /// <summary>
        /// Validates board name and board code inputs.
        /// </summary>
        private static void ValidateRequiredFields(string boardName, string boardCode)
        {
            if (string.IsNullOrWhiteSpace(boardName))
            {
                throw new ValidationException("Board name is required.");
            }

            if (string.IsNullOrWhiteSpace(boardCode))
            {
                throw new ValidationException("Board code is required.");
            }
        }

        /// <summary>
        /// Performs full validation checking on creation request values.
        /// </summary>
        private async Task ValidateCreateRequestAsync(CreateBoardRequest request)
        {
            ValidateRequiredFields(request.BoardName, request.BoardCode);

            if (await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode))
            {
               throw new ConflictException($"Board code '{request.BoardCode}' already exists.");
            }

            await ValidateLookupDataAsync(request.CountryId, request.StateId, request.AcademicPatternId, request.GradingSystemId);
            await ValidateAcademicLevelsAsync(request.AcademicLevelIds);
        }

        /// <summary>
        /// Performs full validation checking on update request values.
        /// </summary>
        private async Task ValidateUpdateRequestAsync(int boardId, UpdateBoardRequest request)
        {
            ValidateRequiredFields(request.BoardName, request.BoardCode);

            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            if (await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode, boardId))
            {
                throw new ConflictException("Board code already exists.");
            }

            await ValidateLookupDataAsync(request.CountryId, request.StateId, request.AcademicPatternId, request.GradingSystemId);
            await ValidateAcademicLevelsAsync(request.AcademicLevelIds);
        }

        /// <summary>
        /// Validates metadata relationships and lookup existences.
        /// </summary>
        private async Task ValidateLookupDataAsync(int countryId, int? stateId, int academicPatternId, int gradingSystemId)
        {
            if (!await _boardRepository.CountryExistsAsync(countryId))
            {
                throw new NotFoundException($"Country with ID {countryId} was not found.");
            }

            if (stateId.HasValue)
            {
                if (!await _boardRepository.StateExistsAsync(stateId.Value))
                {
                    throw new NotFoundException($"State with ID {stateId} was not found.");
                }

                if (!await _boardRepository.StateBelongsToCountryAsync(stateId.Value, countryId))
                {
                    throw new ValidationException($"State with ID {stateId} does not belong to Country with ID {countryId}.");
                }
            }

            if (!await _boardRepository.AcademicPatternExistsAsync(academicPatternId))
            {
                throw new NotFoundException($"Academic pattern with ID {academicPatternId} was not found.");
            }

            if (!await _boardRepository.GradingSystemExistsAsync(gradingSystemId))
            {
                throw new NotFoundException($"Grading system with ID {gradingSystemId} was not found.");
            }
        }

        /// <summary>
        /// Validates academic levels presence and unique existences.
        /// </summary>
        private async Task ValidateAcademicLevelsAsync(List<int> academicLevelIds)
        {
            if (academicLevelIds == null || !academicLevelIds.Any())
            {
                throw new ValidationException("At least one academic level is required.");
            }

            var allExist = await _boardRepository.AcademicLevelsExistAsync(academicLevelIds);
            if (!allExist)
            {
                foreach (var levelId in academicLevelIds.Distinct())
                {
                    if (!await _boardRepository.AcademicLevelExistsAsync(levelId))
                    {
                        throw new NotFoundException($"Academic level with ID {levelId} was not found.");
                    }
                }
            }
        }

        #endregion
    }
}
