using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class FacultyRepository : IFacultyRepository
    {
        private readonly AppDbContext _context;

        public FacultyRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<Faculty?> GetByIdAsync(int id)
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetFacultyById",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);

            var faculty = await multi.ReadFirstOrDefaultAsync<Faculty>();
            if (faculty != null)
            {
                var allocations = (await multi.ReadAsync<FacultySubjectAllocation>()).ToList();
                faculty.FacultySubjectAllocations = allocations;
            }

            return faculty;
        }

        public async Task<Faculty?> GetByEmployeeIdAsync(string employeeId)
        {
            return await Connection.QueryFirstOrDefaultAsync<Faculty>(
                "sp_GetFacultyByEmployeeId",
                new { p_EmployeeId = employeeId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Faculty?> GetByEmailAsync(string email)
        {
            return await Connection.QueryFirstOrDefaultAsync<Faculty>(
                "sp_GetFacultyByEmail",
                new { p_Email = email },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Faculty?> GetByMobileAsync(string mobile)
        {
            return await Connection.QueryFirstOrDefaultAsync<Faculty>(
                "sp_GetFacultyByMobile",
                new { p_Mobile = mobile },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Faculty?> GetByAadhaarAsync(string aadhaar)
        {
            return await Connection.QueryFirstOrDefaultAsync<Faculty>(
                "sp_GetFacultyByAadhaar",
                new { p_Aadhaar = aadhaar },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Faculty?> GetByUsernameAsync(string username)
        {
            return await Connection.QueryFirstOrDefaultAsync<Faculty>(
                "sp_GetFacultyByUsername",
                new { p_Username = username },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<string?> GetPhotoPathAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<string?>(
                "sp_GetFacultyPhotoPath",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> IsEmployeeIdUniqueAsync(string employeeId, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckEmployeeIdUnique",
                new { p_EmployeeId = employeeId, p_ExcludeId = excludeId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<bool> IsEmailUniqueAsync(string email, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckEmailUnique",
                new { p_Email = email, p_ExcludeId = excludeId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<bool> IsMobileUniqueAsync(string mobile, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckMobileUnique",
                new { p_Mobile = mobile, p_ExcludeId = excludeId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckAadhaarUnique",
                new { p_Aadhaar = aadhaar, p_ExcludeId = excludeId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<bool> IsUsernameUniqueAsync(string username, int? excludeId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckUsernameUnique",
                new { p_Username = username, p_ExcludeId = excludeId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<(List<Faculty> Items, int TotalCount)> GetPagedFacultiesAsync(FacultyQueryParams queryParams)
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetPagedFaculties",
                new
                {
                    p_SearchTerm = queryParams.SearchTerm,
                    p_Department = queryParams.Department,
                    p_Designation = queryParams.Designation,
                    p_Status = queryParams.Status,
                    p_SortBy = queryParams.SortBy,
                    p_SortOrder = queryParams.SortOrder,
                    p_PageNumber = queryParams.PageNumber,
                    p_PageSize = queryParams.PageSize
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var items = (await multi.ReadAsync<Faculty>()).ToList();

            return (items, totalCount);
        }

        public async Task<Faculty> AddAsync(Faculty faculty)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateFaculty",
                new
                {
                    p_EmployeeId = faculty.EmployeeId,
                    p_FirstName = faculty.FirstName,
                    p_LastName = faculty.LastName,
                    p_Gender = faculty.Gender,
                    p_DateOfBirth = faculty.DateOfBirth,
                    p_Aadhaar = faculty.Aadhaar,
                    p_Mobile = faculty.Mobile,
                    p_Email = faculty.Email,
                    p_BloodGroup = faculty.BloodGroup,
                    p_Qualification = faculty.Qualification,
                    p_Designation = faculty.Designation,
                    p_Department = faculty.Department,
                    p_JoiningDate = faculty.JoiningDate,
                    p_Experience = faculty.Experience,
                    p_Username = faculty.Email,
                    p_Password = "",
                    p_Status = faculty.Status,
                    p_PhotoPath = faculty.PhotoPath
                },
                commandType: CommandType.StoredProcedure);

            faculty.Id = id;
            return faculty;
        }

        public async Task UpdateAsync(Faculty faculty)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateFaculty",
                new
                {
                    p_Id = faculty.Id,
                    p_FirstName = faculty.FirstName,
                    p_LastName = faculty.LastName,
                    p_Gender = faculty.Gender,
                    p_DateOfBirth = faculty.DateOfBirth,
                    p_Aadhaar = faculty.Aadhaar,
                    p_Mobile = faculty.Mobile,
                    p_Email = faculty.Email,
                    p_BloodGroup = faculty.BloodGroup,
                    p_Qualification = faculty.Qualification,
                    p_Designation = faculty.Designation,
                    p_Department = faculty.Department,
                    p_JoiningDate = faculty.JoiningDate,
                    p_Experience = faculty.Experience,
                    p_Status = faculty.Status,
                    p_PhotoPath = faculty.PhotoPath
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task UpdatePhotoPathAsync(int id, string photoPath)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateFacultyPhotoPath",
                new
                {
                    p_Id = id,
                    p_PhotoPath = photoPath
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task SoftDeleteAsync(Faculty faculty)
        {
            await Connection.ExecuteAsync(
                "sp_SoftDeleteFaculty",
                new { p_Id = faculty.Id },
                commandType: CommandType.StoredProcedure);
        }
    }
}
