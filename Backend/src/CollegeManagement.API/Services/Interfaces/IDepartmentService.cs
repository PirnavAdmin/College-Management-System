using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<Department>> GetActiveDepartmentsAsync();
        Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null);
        Task<Department> CreateDepartmentAsync(Department department);
    }
}

