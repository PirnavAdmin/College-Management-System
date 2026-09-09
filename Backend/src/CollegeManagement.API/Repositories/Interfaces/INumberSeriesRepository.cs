<<<<<<< HEAD
﻿using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;
=======
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Settings;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INumberSeriesRepository
    {
<<<<<<< HEAD
        Task<IEnumerable<NumberSeries>> GetAllAsync();
        Task<NumberSeries?> GetByCodeOrSlugAsync(string codeOrSlug);
        Task<NumberSeries> UpdateAsync(NumberSeries entity);
        Task<NumberSeries> AddAsync(NumberSeries entity);
        Task EnsureSeedAsync();
=======
        Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync();
        Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode);
        Task<NumberSeriesConfiguration?> UpdateByCodeAsync(string seriesCode, string prefix, string formatPattern, int numberLength, int startNumber, string? description);
        Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode);
        Task EnsureTableAndSeedsAsync();
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
    }
}
