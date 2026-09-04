using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _departmentRepository;

        public DepartmentService(IDepartmentRepository departmentRepository)
        {
            _departmentRepository = departmentRepository;
        }

        public async Task<IEnumerable<Department>> GetActiveDepartmentsAsync()
        {
            return await _departmentRepository.GetActiveDepartmentsAsync();
        }

        public async Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null)
        {
            return await _departmentRepository.GetDepartmentsAsync(staffType);
        }

        public async Task<Department> CreateDepartmentAsync(Department department)
        {
            return await _departmentRepository.AddDepartmentAsync(department);
        }
    }
}

