using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class CreateStaffDto
    {
        [StringLength(50)]
        public string? EmployeeId { get; set; }

        [Required(ErrorMessage = "First name is required.")]
        [StringLength(100, ErrorMessage = "First name cannot exceed 100 characters.")]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? MiddleName { get; set; }

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(100, ErrorMessage = "Last name cannot exceed 100 characters.")]
        public string LastName { get; set; } = string.Empty;

        [StringLength(150)]
        public string? FatherOrHusbandName { get; set; }

        [Required(ErrorMessage = "Gender is required.")]
        [StringLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required(ErrorMessage = "Date of birth is required.")]
        public DateTime DateOfBirth { get; set; }

        [StringLength(20)]
        public string? MaritalStatus { get; set; }

        [StringLength(50)]
        public string? Nationality { get; set; } = "Indian";

        [StringLength(20, ErrorMessage = "Aadhaar number must not exceed 20 characters.")]
        public string? Aadhaar { get; set; }

        [StringLength(20)]
        public string? PanNumber { get; set; }

        [Required(ErrorMessage = "Mobile number is required.")]
        [StringLength(15, ErrorMessage = "Mobile number cannot exceed 15 digits.")]
        public string Mobile { get; set; } = string.Empty;

        [StringLength(15)]
        public string? AlternateMobile { get; set; }

        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [StringLength(10)]
        public string? BloodGroup { get; set; }

        // Contact & Address
        [StringLength(255)]
        public string? CurrentAddress { get; set; }

        [StringLength(255)]
        public string? PermanentAddress { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(100)]
        public string? District { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(20)]
        public string? Pincode { get; set; }

        [StringLength(100)]
        public string? Country { get; set; } = "India";

        [StringLength(100)]
        public string? Qualification { get; set; } = "Bachelor's Degree";

        [StringLength(100)]
        public string? Designation { get; set; }

        public int? DesignationId { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Teaching";

        public int? DepartmentId { get; set; }

        [StringLength(100)]
        public string? Department { get; set; }

        public int? BoardId { get; set; }

        [StringLength(100)]
        public string? BoardName { get; set; }

        public string? Board
        {
            get => BoardName;
            set => BoardName = value;
        }

        public DateTime? JoiningDate { get; set; }

        public decimal Experience { get; set; } = 0.0m;

        [StringLength(50)]
        public string? EmploymentType { get; set; } = "Full Time";

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? PhotoPath { get; set; }

        // Optional JSON Initializers
        public string? EducationJson { get; set; }
        public string? ExperienceJson { get; set; }
        public string? BankDetailsJson { get; set; }
        public string? EmergencyContactJson { get; set; }
    }
}
