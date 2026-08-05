using System;

namespace CollegeManagement.API.DTOs.Faculty.Request
{
    public class UpdateFacultyDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Aadhaar { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }
        public string Qualification { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime JoiningDate { get; set; }
        public decimal Experience { get; set; }
        public string Status { get; set; } = "Active";
    }
}
