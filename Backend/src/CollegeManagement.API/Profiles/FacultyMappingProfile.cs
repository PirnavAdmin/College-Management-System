using AutoMapper;
using CollegeManagement.API.DTOs.Faculty.Request;
using CollegeManagement.API.DTOs.Faculty.Response;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Profiles
{
    public class FacultyMappingProfile : Profile
    {
        public FacultyMappingProfile()
        {
            // CreateFacultyDto -> Faculty Entity
            CreateMap<CreateFacultyDto, Faculty>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.Status) ? "Active" : src.Status))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.PhotoPath, opt => opt.Ignore())
                .ForMember(dest => dest.Id, opt => opt.Ignore());

            // UpdateFacultyDto -> Faculty Entity
            CreateMap<UpdateFacultyDto, Faculty>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
                .ForMember(dest => dest.EmployeeId, opt => opt.Ignore())
                // .ForMember(dest => dest.Username, opt => opt.Ignore())
                // .ForMember(dest => dest.Password, opt => opt.Ignore())
                .ForMember(dest => dest.PhotoPath, opt => opt.Ignore())
                .ForMember(dest => dest.Id, opt => opt.Ignore());

            // Faculty Entity -> FacultyResponseDto
            CreateMap<Faculty, FacultyResponseDto>();

            // AssignSubjectDto -> FacultySubjectAllocation Entity
            CreateMap<AssignSubjectDto, FacultySubjectAllocation>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.Id, opt => opt.Ignore());

            // UpdateSubjectAllocationDto -> FacultySubjectAllocation Entity
            CreateMap<UpdateSubjectAllocationDto, FacultySubjectAllocation>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => System.DateTime.UtcNow))
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.FacultyId, opt => opt.Ignore());

            // FacultySubjectAllocation Entity -> FacultySubjectAllocationResponseDto
            CreateMap<FacultySubjectAllocation, FacultySubjectAllocationResponseDto>()
                .ForMember(dest => dest.FacultyName, opt => opt.MapFrom(src => src.Faculty != null ? $"{src.Faculty.FirstName} {src.Faculty.LastName}".Trim() : string.Empty));
        }
    }
}
