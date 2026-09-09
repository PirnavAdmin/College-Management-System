<<<<<<< HEAD
﻿using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;
=======
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8

namespace CollegeManagement.API.Services.Interfaces
{
    public interface INumberSeriesService
    {
<<<<<<< HEAD
        Task<IEnumerable<NumberSeriesDto>> GetAllAsync();
        Task<NumberSeriesDto> GetByCodeOrSlugAsync(string codeOrSlug);
        Task<NumberSeriesDto> UpdateAsync(string codeOrSlug, UpdateNumberSeriesDto dto);
        Task<GenerateNextNumberResponseDto> GenerateNextNumberAsync(string codeOrSlug, GenerateNextNumberRequestDto dto);
        string PreviewPattern(string codeOrSlug, string? pattern, int? numberLength, string? prefix);
=======
        Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync();
        Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug);
        Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto);
        Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null);
        Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null);
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
    }
}
