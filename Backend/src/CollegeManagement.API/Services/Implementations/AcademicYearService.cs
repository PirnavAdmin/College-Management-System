using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations
{
    public class AcademicYearService : IAcademicYearService
    {
        private readonly IAcademicYearRepository _repository;

        public AcademicYearService(IAcademicYearRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync()
        {
            var years = await _repository.GetAllAsync();
            return years.Select(MapToResponseDto);
        }

        public async Task<AcademicYearResponseDto?> GetByIdAsync(int id)
        {
            var year = await _repository.GetByIdAsync(id);
            return year == null ? null : MapToResponseDto(year);
        }

        public async Task<AcademicYearResponseDto> CreateAsync(CreateAcademicYearDto dto)
        {
            ValidateDates(dto.StartDate, dto.EndDate, dto.AdmissionStartDate, dto.AdmissionEndDate);

            var academicYear = new AcademicYear
            {
                AcademicYearName = dto.AcademicYearName,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                AdmissionStartDate = dto.AdmissionStartDate,
                AdmissionEndDate = dto.AdmissionEndDate,
                IsActive = dto.IsActive
            };

            await _repository.AddAsync(academicYear);

            if (academicYear.IsActive)
            {
                await _repository.DeactivateAllExceptAsync(academicYear.AcademicYearId);
                // Reload entity
                academicYear = await _repository.GetByIdAsync(academicYear.AcademicYearId) ?? academicYear;
            }

            return MapToResponseDto(academicYear);
        }

        public async Task<AcademicYearResponseDto?> UpdateAsync(int id, UpdateAcademicYearDto dto)
        {
            ValidateDates(dto.StartDate, dto.EndDate, dto.AdmissionStartDate, dto.AdmissionEndDate);

            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return null;
            }

            academicYear.AcademicYearName = dto.AcademicYearName;
            academicYear.StartDate = dto.StartDate;
            academicYear.EndDate = dto.EndDate;
            academicYear.AdmissionStartDate = dto.AdmissionStartDate;
            academicYear.AdmissionEndDate = dto.AdmissionEndDate;
            academicYear.IsActive = dto.IsActive;

            await _repository.UpdateAsync(academicYear);

            if (academicYear.IsActive)
            {
                await _repository.DeactivateAllExceptAsync(academicYear.AcademicYearId);
                // Reload entity
                academicYear = await _repository.GetByIdAsync(academicYear.AcademicYearId) ?? academicYear;
            }

            return MapToResponseDto(academicYear);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return false;
            }

            await _repository.DeleteAsync(academicYear);
            return true;
        }

        public async Task<bool> ActivateAsync(int id)
        {
            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return false;
            }

            academicYear.IsActive = true;
            await _repository.UpdateAsync(academicYear);
            await _repository.DeactivateAllExceptAsync(academicYear.AcademicYearId);

            return true;
        }

        private void ValidateDates(DateOnly? start, DateOnly? end, DateOnly admissionStart, DateOnly admissionEnd)
        {
            if (start.HasValue && end.HasValue && start.Value >= end.Value)
            {
                throw new ArgumentException("Start Date must be before End Date.");
            }
            if (admissionStart >= admissionEnd)
            {
                throw new ArgumentException("Admission Start Date must be before Admission End Date.");
            }
        }

        private AcademicYearResponseDto MapToResponseDto(AcademicYear ay)
        {
            return new AcademicYearResponseDto
            {
                AcademicYearId = ay.AcademicYearId,
                AcademicYearName = ay.AcademicYearName,
                StartDate = ay.StartDate,
                EndDate = ay.EndDate,
                AdmissionStartDate = ay.AdmissionStartDate,
                AdmissionEndDate = ay.AdmissionEndDate,
                IsActive = ay.IsActive,
                Status = ay.IsActive ? "Active" : "Inactive"
            };
        }
    }
}
