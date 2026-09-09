using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INumberSeriesRepository
    {
        Task<IEnumerable<NumberSeries>> GetAllAsync();
        Task<NumberSeries?> GetByCodeOrSlugAsync(string codeOrSlug);
        Task<NumberSeries> UpdateAsync(NumberSeries entity);
        Task<NumberSeries> AddAsync(NumberSeries entity);
        Task EnsureSeedAsync();
    }
}
