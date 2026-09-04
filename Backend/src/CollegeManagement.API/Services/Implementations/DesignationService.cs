using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class DesignationService : IDesignationService
    {
        private readonly IDesignationRepository _designationRepository;
        private readonly IMapper _mapper;

        public DesignationService(IDesignationRepository designationRepository, IMapper mapper)
        {
            _designationRepository = designationRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DesignationResponseDto>> GetAllAsync(bool includeInactive = false, string? staffType = null)
        {
            var entities = await _designationRepository.GetAllAsync(includeInactive, staffType);
            return _mapper.Map<IEnumerable<DesignationResponseDto>>(entities);
        }


        public async Task<DesignationResponseDto?> GetByIdAsync(int id)
        {
            var entity = await _designationRepository.GetByIdAsync(id);
            if (entity == null) return null;
            return _mapper.Map<DesignationResponseDto>(entity);
        }

        public async Task<DesignationResponseDto> CreateAsync(CreateDesignationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ValidationException("Designation name is required.");

            string trimmedName = dto.Name.Trim();

            if (!await _designationRepository.IsNameUniqueAsync(trimmedName))
                throw new ConflictException($"Designation with name '{trimmedName}' already exists.");

            var entity = _mapper.Map<Designation>(dto);
            entity.Name = trimmedName;
            entity.StaffType = !string.IsNullOrWhiteSpace(dto.StaffType) ? dto.StaffType.Trim() : "Both";
            entity.CreatedAt = DateTime.UtcNow;

            var created = await _designationRepository.AddAsync(entity);
            return _mapper.Map<DesignationResponseDto>(created);
        }

        public async Task<DesignationResponseDto?> UpdateAsync(int id, UpdateDesignationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ValidationException("Designation name is required.");

            var existing = await _designationRepository.GetByIdAsync(id);
            if (existing == null) return null;

            string trimmedName = dto.Name.Trim();

            if (!await _designationRepository.IsNameUniqueAsync(trimmedName, id))
                throw new ConflictException($"Designation with name '{trimmedName}' already exists.");

            existing.Name = trimmedName;
            if (!string.IsNullOrWhiteSpace(dto.StaffType))
            {
                existing.StaffType = dto.StaffType.Trim();
            }
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _designationRepository.UpdateAsync(existing);
            return _mapper.Map<DesignationResponseDto>(existing);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _designationRepository.GetByIdAsync(id);
            if (existing == null) return false;

            if (await _designationRepository.IsAssignedToStaffAsync(id))
            {
                throw new InvalidOperationException($"Cannot delete designation '{existing.Name}' because it is assigned to one or more staff members. Deactivate it instead.");
            }

            await _designationRepository.DeleteAsync(id);
            return true;
        }
    }
}
