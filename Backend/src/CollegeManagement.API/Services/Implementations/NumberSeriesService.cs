using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class NumberSeriesService : INumberSeriesService
    {
        private readonly INumberSeriesRepository _repository;
        private static readonly object _seqLock = new();

        public NumberSeriesService(INumberSeriesRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<NumberSeriesDto>> GetAllAsync()
        {
            var entities = await _repository.GetAllAsync();
            return entities.Select(MapToDto).ToList();
        }

        public async Task<NumberSeriesDto> GetByCodeOrSlugAsync(string codeOrSlug)
        {
            var entity = await _repository.GetByCodeOrSlugAsync(codeOrSlug);
            if (entity == null)
            {
                throw new NotFoundException($"Number series '{codeOrSlug}' not found.");
            }
            return MapToDto(entity);
        }

        public async Task<NumberSeriesDto> UpdateAsync(string codeOrSlug, UpdateNumberSeriesDto dto)
        {
            var entity = await _repository.GetByCodeOrSlugAsync(codeOrSlug);
            if (entity == null)
            {
                throw new NotFoundException($"Number series '{codeOrSlug}' not found.");
            }

            if (dto.Prefix != null) entity.Prefix = dto.Prefix.Trim();
            if (!string.IsNullOrWhiteSpace(dto.FormatPattern)) entity.FormatPattern = dto.FormatPattern.Trim();
            if (dto.NumberLength.HasValue && dto.NumberLength.Value > 0) entity.NumberLength = dto.NumberLength.Value;
            if (dto.StartNumber.HasValue && dto.StartNumber.Value > 0) entity.StartNumber = dto.StartNumber.Value;
            if (dto.Description != null) entity.Description = dto.Description.Trim();

            await _repository.UpdateAsync(entity);
            return MapToDto(entity);
        }

        public async Task<GenerateNextNumberResponseDto> GenerateNextNumberAsync(string codeOrSlug, GenerateNextNumberRequestDto dto)
        {
            var entity = await _repository.GetByCodeOrSlugAsync(codeOrSlug);
            if (entity == null)
            {
                throw new NotFoundException($"Number series '{codeOrSlug}' not found.");
            }

            int nextSeq;
            lock (_seqLock)
            {
                if (entity.CurrentSequence < entity.StartNumber)
                {
                    entity.CurrentSequence = entity.StartNumber;
                }
                else
                {
                    entity.CurrentSequence += 1;
                }
                nextSeq = entity.CurrentSequence;
            }

            await _repository.UpdateAsync(entity);

            var generated = FormatNumber(entity.FormatPattern, entity.Prefix, entity.NumberLength, nextSeq, dto);

            return new GenerateNextNumberResponseDto
            {
                SeriesCode = entity.SeriesCode,
                GeneratedNumber = generated,
                SequenceNumber = nextSeq,
                GeneratedAt = DateTime.UtcNow
            };
        }

        public string PreviewPattern(string codeOrSlug, string? pattern, int? numberLength, string? prefix)
        {
            var p = !string.IsNullOrWhiteSpace(pattern) ? pattern.Trim() : "PCTCH{SEQ}";
            var len = numberLength ?? 4;
            var pre = prefix ?? "";
            return FormatNumber(p, pre, len, 1, new GenerateNextNumberRequestDto
            {
                Board = "BIEAP",
                Dept = "MATH",
                Type = "TCH",
                Staff = "FAC",
                Desig = "HOD",
                Cert = "CND",
                AcademicYear = DateTime.UtcNow.Year.ToString()
            });
        }

        private static string FormatNumber(string pattern, string prefix, int length, int sequence, GenerateNextNumberRequestDto? context)
        {
            if (string.IsNullOrWhiteSpace(pattern)) return $"{prefix}{sequence.ToString().PadLeft(length, '0')}";

            var now = DateTime.UtcNow;
            var seqStr = sequence.ToString().PadLeft(Math.Max(1, length), '0');

            var result = pattern;
            result = Regex.Replace(result, @"\{PREFIX\}", prefix ?? "", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{SEQ\}", seqStr, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YYYY\}", now.ToString("yyyy"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YY\}", now.ToString("yy"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YEAR\}", now.ToString("yyyy"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{MM\}", now.ToString("MM"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{DD\}", now.ToString("dd"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YYYYMMDD\}", now.ToString("yyyyMMdd"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{RANDOM\}", Guid.NewGuid().ToString("N").Substring(0, Math.Max(4, length)).ToUpper(), RegexOptions.IgnoreCase);

            result = Regex.Replace(result, @"\{DEPT\}", !string.IsNullOrWhiteSpace(context?.Dept) ? context.Dept : "MATH", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{DESIG\}", !string.IsNullOrWhiteSpace(context?.Desig) ? context.Desig : "HOD", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{STAFF\}", !string.IsNullOrWhiteSpace(context?.Staff) ? context.Staff : "TCH", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{TYPE\}", !string.IsNullOrWhiteSpace(context?.Type) ? context.Type : "TC", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{CERT\}", !string.IsNullOrWhiteSpace(context?.Cert) ? context.Cert : "CND", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{BOARD\}", !string.IsNullOrWhiteSpace(context?.Board) ? context.Board : "BIEAP", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{AY\}", !string.IsNullOrWhiteSpace(context?.AcademicYear) ? context.AcademicYear : now.ToString("yyyy"), RegexOptions.IgnoreCase);

            return result;
        }

        private static NumberSeriesDto MapToDto(NumberSeries entity)
        {
            var preview = FormatNumber(entity.FormatPattern, entity.Prefix, entity.NumberLength, Math.Max(1, entity.CurrentSequence), null);
            var (placeholders, samples) = GetMetadata(entity.Slug);

            return new NumberSeriesDto
            {
                Id = entity.Id,
                SeriesCode = entity.SeriesCode,
                Slug = entity.Slug,
                SeriesName = entity.SeriesName,
                Prefix = entity.Prefix,
                FormatPattern = entity.FormatPattern,
                NumberLength = entity.NumberLength,
                StartNumber = entity.StartNumber,
                CurrentSequence = entity.CurrentSequence,
                Description = entity.Description,
                IsActive = entity.IsActive,
                LivePreview = preview,
                CurrentExample = preview,
                AvailablePlaceholders = placeholders,
                SampleFormats = samples,
                UpdatedAt = entity.UpdatedAt
            };
        }

        private static (List<string> placeholders, List<NumberSeriesSampleFormatDto> samples) GetMetadata(string slug)
        {
            var year = DateTime.UtcNow.Year.ToString();

            return slug switch
            {
                "employee-id" => (
                    new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}" },
                    new List<NumberSeriesSampleFormatDto>
                    {
                        new() { Pattern = "PCTCH{SEQ}", Example = "PCTCH0001" },
                        new() { Pattern = "EMP-{YYYY}-{SEQ}", Example = $"EMP-{year}-0001" },
                        new() { Pattern = "FAC-{DEPT}-{SEQ}", Example = "FAC-MATH-0001" }
                    }
                ),
                "admission-no" => (
                    new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{AY}", "{BOARD}" },
                    new List<NumberSeriesSampleFormatDto>
                    {
                        new() { Pattern = "ADM-{SEQ}", Example = "ADM-01" },
                        new() { Pattern = "ADM-{AY}-{SEQ}", Example = $"ADM-{year}-0001" },
                        new() { Pattern = "ADM-{BOARD}-{SEQ}", Example = "ADM-BIEAP-0001" }
                    }
                ),
                "certificate-number" => (
                    new List<string> { "{CERT}", "{TYPE}", "{YEAR}", "{SEQ}", "{RANDOM}" },
                    new List<NumberSeriesSampleFormatDto>
                    {
                        new() { Pattern = "CND-{YEAR}-{RANDOM}", Example = $"CND-{year}-82FC40" },
                        new() { Pattern = "CERT-{YEAR}-{SEQ}", Example = $"CERT-{year}-000001" },
                        new() { Pattern = "TC-{YEAR}-{RANDOM}", Example = $"TC-{year}-A94F12" }
                    }
                ),
                "receipt-no" => (
                    new List<string> { "{PREFIX}", "{YYYYMMDD}", "{YYYY}", "{MM}", "{DD}", "{SEQ}" },
                    new List<NumberSeriesSampleFormatDto>
                    {
                        new() { Pattern = "FEE-{YYYYMMDD}-{SEQ}", Example = $"FEE-{DateTime.UtcNow:yyyyMMdd}-000011" },
                        new() { Pattern = "RCP-{YYYY}-{SEQ}", Example = $"RCP-{year}-000001" },
                        new() { Pattern = "FEE-{SEQ}", Example = "FEE-000001" }
                    }
                ),
                _ => (
                    new List<string> { "{SEQ}", "{YYYY}", "{MM}", "{DD}", "{PREFIX}" },
                    new List<NumberSeriesSampleFormatDto>
                    {
                        new() { Pattern = "DOC-{YYYY}-{SEQ}", Example = $"DOC-{year}-0001" }
                    }
                )
            };
        }
    }
}
