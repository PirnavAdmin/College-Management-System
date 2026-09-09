using System;
using System.Collections.Generic;
using System.Linq;
<<<<<<< HEAD
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NumberSeries;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
=======
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Settings;
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class NumberSeriesService : INumberSeriesService
    {
        private readonly INumberSeriesRepository _repository;
<<<<<<< HEAD
        private static readonly object _seqLock = new();
=======
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8

        public NumberSeriesService(INumberSeriesRepository repository)
        {
            _repository = repository;
        }

<<<<<<< HEAD
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
=======
        public static string NormalizeSeriesCode(string codeOrSlug)
        {
            if (string.IsNullOrWhiteSpace(codeOrSlug)) return string.Empty;

            var cleaned = codeOrSlug.Trim().ToLowerInvariant().Replace("_", "-");

            return cleaned switch
            {
                "employee-id" or "employee" or "employeeid" or "emp" => "EMPLOYEE_ID",
                "admission-no" or "admission" or "admissionno" or "adm" => "ADMISSION_NO",
                "certificate-number" or "certificate-no" or "certificateno" or "certificate" or "cert" => "CERTIFICATE_NO",
                "receipt-no" or "receipt" or "receiptno" or "fee-receipt" or "fee" => "RECEIPT_NO",
                _ => codeOrSlug.Trim().ToUpperInvariant().Replace("-", "_")
            };
        }

        public static string GetSlug(string seriesCode)
        {
            return seriesCode.ToUpperInvariant() switch
            {
                "EMPLOYEE_ID" => "employee-id",
                "ADMISSION_NO" => "admission-no",
                "CERTIFICATE_NO" => "certificate-number",
                "RECEIPT_NO" => "receipt-no",
                _ => seriesCode.ToLowerInvariant().Replace("_", "-")
            };
        }

        public async Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync()
        {
            var entities = await _repository.GetAllAsync();
            var dtos = new List<NumberSeriesResponseDto>();

            foreach (var entity in entities)
            {
                dtos.Add(MapToDto(entity));
            }

            return dtos;
        }

        public async Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GetByCodeAsync(code);
            if (entity == null) return null;

            return MapToDto(entity);
        }

        public async Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var existing = await _repository.GetByCodeAsync(code);
            if (existing == null) return null;

            var updated = await _repository.UpdateByCodeAsync(
                code,
                dto.Prefix?.Trim() ?? string.Empty,
                dto.FormatPattern?.Trim() ?? string.Empty,
                dto.NumberLength < 1 ? 4 : dto.NumberLength,
                dto.StartNumber < 1 ? 1 : dto.StartNumber,
                dto.Description?.Trim());

            if (updated == null) return null;

            return MapToDto(updated);
        }

        public async Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GenerateNextSequenceAsync(code);
            if (entity == null) return null;

            var generatedNumber = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: entity.CurrentSequence,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: context,
                referenceDate: DateTime.Now,
                isPreview: false);

            return new GenerateNumberSeriesResponseDto
            {
                SeriesCode = entity.SeriesCode,
                GeneratedNumber = generatedNumber,
                SequenceNumber = entity.CurrentSequence,
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
                GeneratedAt = DateTime.UtcNow
            };
        }

<<<<<<< HEAD
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
=======
        public async Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GetByCodeAsync(code);

            var activePattern = pattern ?? entity?.FormatPattern ?? "{PREFIX}{SEQ}";
            var activeLength = numberLength ?? entity?.NumberLength ?? 4;
            var activePrefix = prefix ?? entity?.Prefix ?? "";
            var curSeq = entity?.CurrentSequence ?? 0;
            var startNum = entity?.StartNumber ?? 1;

            var nextSeq = curSeq < startNum ? startNum : curSeq + 1;

            return NumberSeriesPatternEvaluator.Evaluate(
                pattern: activePattern,
                sequenceNumber: nextSeq,
                numberLength: activeLength,
                prefix: activePrefix,
                context: null,
                referenceDate: DateTime.Now,
                isPreview: true);
        }

        private NumberSeriesResponseDto MapToDto(NumberSeriesConfiguration entity)
        {
            var nextSeq = entity.CurrentSequence < entity.StartNumber
                ? entity.StartNumber
                : entity.CurrentSequence + 1;

            var livePreview = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: nextSeq,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: null,
                referenceDate: DateTime.Now,
                isPreview: true);

            var curSeqToUse = entity.CurrentSequence > 0 ? entity.CurrentSequence : entity.StartNumber;
            var currentExample = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: curSeqToUse,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: null,
                referenceDate: DateTime.Now,
                isPreview: true);

            return new NumberSeriesResponseDto
            {
                Id = entity.Id,
                SeriesCode = entity.SeriesCode,
                Slug = GetSlug(entity.SeriesCode),
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
                SeriesName = entity.SeriesName,
                Prefix = entity.Prefix,
                FormatPattern = entity.FormatPattern,
                NumberLength = entity.NumberLength,
                StartNumber = entity.StartNumber,
                CurrentSequence = entity.CurrentSequence,
                Description = entity.Description,
                IsActive = entity.IsActive,
<<<<<<< HEAD
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
=======
                LivePreview = livePreview,
                CurrentExample = currentExample,
                AvailablePlaceholders = NumberSeriesPatternEvaluator.GetAvailablePlaceholders(entity.SeriesCode),
                SampleFormats = NumberSeriesPatternEvaluator.GetSampleFormats(entity.SeriesCode),
                UpdatedAt = entity.UpdatedAt
            };
        }
>>>>>>> 7ac09dd247fbe6236b709f052f14108caccb39f8
    }
}
