using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface INumberSeriesService
    {
        Task<IEnumerable<NumberSeriesDto>> GetAllAsync();
        Task<NumberSeriesDto> GetByCodeOrSlugAsync(string codeOrSlug);
        Task<NumberSeriesDto> UpdateAsync(string codeOrSlug, UpdateNumberSeriesDto dto);
        Task<GenerateNextNumberResponseDto> GenerateNextNumberAsync(string codeOrSlug, GenerateNextNumberRequestDto dto);
        string PreviewPattern(string codeOrSlug, string? pattern, int? numberLength, string? prefix);
    }
}
