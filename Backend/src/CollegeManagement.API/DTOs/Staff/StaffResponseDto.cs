using System;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffResponseDto
    {
        public int Id { get; set; }
        public int StaffId => Id;
        public int FacultyId => Id;
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName => string.IsNullOrWhiteSpace(MiddleName) ? $"{FirstName} {LastName}".Trim() : $"{FirstName} {MiddleName} {LastName}".Trim();
        public string? FatherOrHusbandName { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nationality { get; set; } = "Indian";
        public string? Aadhaar { get; set; }
        public string? PanNumber { get; set; }
        public string Mobile { get; set; } = string.Empty;
        public string? AlternateMobile { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }

        public string? CurrentAddress { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Country { get; set; } = "India";

        public string Qualification { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int? DesignationId { get; set; }
        public string StaffType { get; set; } = "Teaching";
        public string FacultyType => StaffType;
        public int? DepartmentId { get; set; }
        public string Department { get; set; } = string.Empty;
        public int? BoardId { get; set; }
        public string? BoardName { get; set; }
        public string? Board => BoardName;
        public DateTime JoiningDate { get; set; }
        public decimal Experience { get; set; }
        public string? EmploymentType { get; set; } = "Full Time";
        public string Status { get; set; } = "Active";
        public string? PhotoPath { get; set; }

        public string ProfileStatus { get; set; } = "PendingLink";
        public int ProfileCompletionPercentage { get; set; } = 30;
        public string? ProfileLinkToken { get; set; }
        public DateTime? ProfileLinkSentAt { get; set; }
        public DateTime? ProfileLinkExpiresAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CorrectionRequestedAt { get; set; }
        public string? CorrectionNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
