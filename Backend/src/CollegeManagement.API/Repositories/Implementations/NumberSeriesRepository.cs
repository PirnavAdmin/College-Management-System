using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NumberSeriesRepository : INumberSeriesRepository
    {
        private readonly AppDbContext _context;
        private static readonly ConcurrentDictionary<string, NumberSeries> _memoryStore = new(StringComparer.OrdinalIgnoreCase);
        private static bool _seeded = false;
        private static readonly object _seedLock = new();

        public NumberSeriesRepository(AppDbContext context)
        {
            _context = context;
            EnsureMemorySeed();
        }

        private void EnsureMemorySeed()
        {
            if (_seeded) return;
            lock (_seedLock)
            {
                if (_seeded) return;
                var initial = new List<NumberSeries>
                {
                    new NumberSeries
                    {
                        Id = 1,
                        SeriesCode = "EMPLOYEE_ID",
                        Slug = "employee-id",
                        SeriesName = "Employee ID",
                        Prefix = "PCTCH",
                        FormatPattern = "PCTCH{SEQ}",
                        NumberLength = 4,
                        StartNumber = 1,
                        CurrentSequence = 39,
                        Description = "Configure employee ID format for teaching and non-teaching staff.",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new NumberSeries
                    {
                        Id = 2,
                        SeriesCode = "ADMISSION_NO",
                        Slug = "admission-no",
                        SeriesName = "Admission No.",
                        Prefix = "ADM",
                        FormatPattern = "ADM-{SEQ}",
                        NumberLength = 2,
                        StartNumber = 1,
                        CurrentSequence = 17,
                        Description = "Configure admission number format for students.",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new NumberSeries
                    {
                        Id = 3,
                        SeriesCode = "CERTIFICATE_NUMBER",
                        Slug = "certificate-number",
                        SeriesName = "Certificate Number",
                        Prefix = "CND",
                        FormatPattern = "CND-{YEAR}-{RANDOM}",
                        NumberLength = 6,
                        StartNumber = 1,
                        CurrentSequence = 439,
                        Description = "Configure certificate number format for generated certificates.",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new NumberSeries
                    {
                        Id = 4,
                        SeriesCode = "RECEIPT_NO",
                        Slug = "receipt-no",
                        SeriesName = "Receipt No.",
                        Prefix = "FEE",
                        FormatPattern = "FEE-{YYYYMMDD}-{SEQ}",
                        NumberLength = 6,
                        StartNumber = 1,
                        CurrentSequence = 11,
                        Description = "Configure receipt number format for fee collections.",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };

                foreach (var item in initial)
                {
                    _memoryStore[item.SeriesCode] = item;
                    _memoryStore[item.Slug] = item;
                }
                _seeded = true;
            }
        }

        public async Task EnsureSeedAsync()
        {
            try
            {
                if (await _context.Set<NumberSeries>().AnyAsync()) return;
                var initial = _memoryStore.Values.DistinctBy(x => x.SeriesCode).ToList();
                await _context.Set<NumberSeries>().AddRangeAsync(initial);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Fallback to in-memory store gracefully
            }
        }

        public async Task<IEnumerable<NumberSeries>> GetAllAsync()
        {
            try
            {
                var list = await _context.Set<NumberSeries>().AsNoTracking().ToListAsync();
                if (list != null && list.Count > 0)
                {
                    return list;
                }
            }
            catch
            {
                // Use in-memory store
            }

            return _memoryStore.Values.DistinctBy(x => x.SeriesCode).OrderBy(x => x.Id).ToList();
        }

        public async Task<NumberSeries?> GetByCodeOrSlugAsync(string codeOrSlug)
        {
            if (string.IsNullOrWhiteSpace(codeOrSlug)) return null;
            var key = codeOrSlug.Trim();

            try
            {
                var entity = await _context.Set<NumberSeries>()
                    .FirstOrDefaultAsync(x => x.SeriesCode == key || x.Slug == key || x.SeriesCode.ToLower() == key.ToLower() || x.Slug.ToLower() == key.ToLower());
                if (entity != null) return entity;
            }
            catch
            {
                // Use in-memory store
            }

            if (_memoryStore.TryGetValue(key, out var memEntity))
            {
                return memEntity;
            }

            return _memoryStore.Values.FirstOrDefault(x => 
                string.Equals(x.SeriesCode, key, StringComparison.OrdinalIgnoreCase) || 
                string.Equals(x.Slug, key, StringComparison.OrdinalIgnoreCase));
        }

        public async Task<NumberSeries> UpdateAsync(NumberSeries entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;

            try
            {
                _context.Set<NumberSeries>().Update(entity);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // In-memory update
            }

            _memoryStore[entity.SeriesCode] = entity;
            _memoryStore[entity.Slug] = entity;
            return entity;
        }

        public async Task<NumberSeries> AddAsync(NumberSeries entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.Set<NumberSeries>().AddAsync(entity);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // In-memory add
                if (entity.Id <= 0) entity.Id = _memoryStore.Count + 1;
            }

            _memoryStore[entity.SeriesCode] = entity;
            _memoryStore[entity.Slug] = entity;
            return entity;
        }
    }
}
