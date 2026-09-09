<<<<<<< HEAD
﻿using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
=======
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NumberSeriesRepository : INumberSeriesRepository
    {
        private readonly AppDbContext _context;
<<<<<<< HEAD
        private static readonly ConcurrentDictionary<string, NumberSeries> _memoryStore = new(StringComparer.OrdinalIgnoreCase);
        private static bool _seeded = false;
        private static readonly object _seedLock = new();
=======
        private static bool _isInitialized = false;
        private static readonly object _initLock = new();
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8

        public NumberSeriesRepository(AppDbContext context)
        {
            _context = context;
<<<<<<< HEAD
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
=======
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task EnsureTableAndSeedsAsync()
        {
            if (_isInitialized) return;

            var conn = await GetOpenConnectionAsync();

            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS `NumberSeriesConfigurations` (
                    `Id` INT AUTO_INCREMENT PRIMARY KEY,
                    `SeriesCode` VARCHAR(50) NOT NULL UNIQUE,
                    `SeriesName` VARCHAR(100) NOT NULL,
                    `Prefix` VARCHAR(20) NOT NULL,
                    `FormatPattern` VARCHAR(100) NOT NULL,
                    `NumberLength` INT NOT NULL DEFAULT 4,
                    `StartNumber` INT NOT NULL DEFAULT 1,
                    `CurrentSequence` INT NOT NULL DEFAULT 0,
                    `Description` VARCHAR(500) NULL,
                    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_numseries_code` (`SeriesCode`),
                    INDEX `idx_numseries_active` (`IsActive`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            await conn.ExecuteAsync(createTableSql);

            var seedSql = @"
                INSERT IGNORE INTO `NumberSeriesConfigurations` 
                    (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`)
                VALUES 
                    ('EMPLOYEE_ID', 'Employee ID', 'PCTCH', 'PCTCH{SEQ}', 4, 1, 39, 'Configure employee ID format for teaching and non-teaching staff.', 1),
                    ('ADMISSION_NO', 'Admission No.', 'ADM', 'ADM-{SEQ}', 2, 1, 17, 'Configure admission number format for students.', 1),
                    ('CERTIFICATE_NO', 'Certificate Number', 'CND', 'CND-{YEAR}-{RANDOM}', 6, 1, 1, 'Configure certificate number format for generated certificates.', 1),
                    ('RECEIPT_NO', 'Receipt No.', 'FEE', 'FEE-{YYYYMMDD}-{SEQ}', 6, 1, 11, 'Configure receipt number format for fee collections.', 1);";

            await conn.ExecuteAsync(seedSql);
            _isInitialized = true;
        }

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync()
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                var result = await conn.QueryAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesConfigurations",
                    commandType: CommandType.StoredProcedure);

                if (result != null && result.Any())
                {
                    return result;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
                }
            }
            catch
            {
<<<<<<< HEAD
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
=======
                // Fallback to direct query if SP not yet created in MySQL
            }

            var query = @"
                SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                       `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                       `IsActive`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `IsActive` = 1
                ORDER BY `Id` ASC;";

            return await conn.QueryAsync<NumberSeriesConfiguration>(query);
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                var result = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesByCode",
                    new { p_SeriesCode = seriesCode },
                    commandType: CommandType.StoredProcedure);

                if (result != null)
                {
                    return result;
                }
            }
            catch
            {
                // Fallback to direct query
            }

            var query = @"
                SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                       `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                       `IsActive`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `SeriesCode` = @SeriesCode
                LIMIT 1;";

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(query, new { SeriesCode = seriesCode });
        }

        public async Task<NumberSeriesConfiguration?> UpdateByCodeAsync(
            string seriesCode,
            string prefix,
            string formatPattern,
            int numberLength,
            int startNumber,
            string? description)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                await conn.ExecuteAsync(
                    "sp_UpdateNumberSeriesByCode",
                    new
                    {
                        p_SeriesCode = seriesCode,
                        p_Prefix = prefix,
                        p_FormatPattern = formatPattern,
                        p_NumberLength = numberLength,
                        p_StartNumber = startNumber,
                        p_Description = description
                    },
                    commandType: CommandType.StoredProcedure);

                return await GetByCodeAsync(seriesCode);
            }
            catch
            {
                // Fallback to direct SQL execution
                var updateSql = @"
                    UPDATE `NumberSeriesConfigurations`
                    SET `Prefix` = @Prefix,
                        `FormatPattern` = @FormatPattern,
                        `NumberLength` = @NumberLength,
                        `StartNumber` = @StartNumber,
                        `Description` = @Description,
                        `UpdatedAt` = CURRENT_TIMESTAMP
                    WHERE `SeriesCode` = @SeriesCode;";

                await conn.ExecuteAsync(updateSql, new
                {
                    SeriesCode = seriesCode,
                    Prefix = prefix,
                    FormatPattern = formatPattern,
                    NumberLength = numberLength,
                    StartNumber = startNumber,
                    Description = description
                });

                return await GetByCodeAsync(seriesCode);
            }
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                await conn.ExecuteAsync(
                    "sp_GenerateNextNumberSeries",
                    new { p_SeriesCode = seriesCode },
                    commandType: CommandType.StoredProcedure);

                return await GetByCodeAsync(seriesCode);
            }
            catch
            {
                // Fallback to atomic SQL transaction
                using var tran = await conn.BeginTransactionAsync();
                try
                {
                    var selectSql = @"
                        SELECT `CurrentSequence`, `StartNumber`
                        FROM `NumberSeriesConfigurations`
                        WHERE `SeriesCode` = @SeriesCode
                        FOR UPDATE;";

                    var current = await conn.QueryFirstOrDefaultAsync<(int CurrentSequence, int StartNumber)>(
                        selectSql, new { SeriesCode = seriesCode }, transaction: tran);

                    var nextSeq = current.CurrentSequence < current.StartNumber
                        ? current.StartNumber
                        : current.CurrentSequence + 1;

                    var updateSql = @"
                        UPDATE `NumberSeriesConfigurations`
                        SET `CurrentSequence` = @NextSeq,
                            `UpdatedAt` = CURRENT_TIMESTAMP
                        WHERE `SeriesCode` = @SeriesCode;";

                    await conn.ExecuteAsync(updateSql, new { SeriesCode = seriesCode, NextSeq = nextSeq }, transaction: tran);
                    await tran.CommitAsync();

                    return await GetByCodeAsync(seriesCode);
                }
                catch
                {
                    await tran.RollbackAsync();
                    throw;
                }
            }
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
        }
    }
}
