using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.DTOs.Staff
{
    public class SendProfileLinkRequestDto
    {
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public int ValidityDays { get; set; } = 7;
        public string? CustomMessage { get; set; }
    }

    public class SendProfileLinkResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string ProfileLink { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class StaffProfileFullDto
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
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

        // Contact & Address
        public string? CurrentAddress { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Country { get; set; } = "India";

        // Professional / Employment
        public string Qualification { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int? DesignationId { get; set; }
        public string StaffType { get; set; } = "Teaching";
        public string Department { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? BoardName { get; set; }
        public int? BoardId { get; set; }
        public DateTime JoiningDate { get; set; }
        public decimal Experience { get; set; }
        public string? EmploymentType { get; set; } = "Full Time";
        public string Status { get; set; } = "Active";
        public string? PhotoPath { get; set; }
        public string? PhotoUrl { get; set; }

        // Lifecycle & Status
        public string ProfileStatus { get; set; } = "PendingLink";
        public int ProfileCompletionPercentage { get; set; } = 30;
        public string? ProfileLinkToken { get; set; }
        public DateTime? ProfileLinkSentAt { get; set; }
        public DateTime? ProfileLinkExpiresAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CorrectionRequestedAt { get; set; }
        public string? CorrectionNotes { get; set; }

        // Structured Sub-sections
        public List<StaffEducationItem> EducationList { get; set; } = new();
        public List<StaffExperienceItem> ExperienceList { get; set; } = new();
        public List<StaffDocumentItem> DocumentsList { get; set; } = new();
        public StaffBankDetails BankDetails { get; set; } = new();
        public StaffEmergencyContact EmergencyContact { get; set; } = new();
    }

    public class UpdateStaffProfileSectionDto
    {
        public string SectionName { get; set; } = string.Empty; // "Personal", "Address", "Education", "Experience", "Documents", "Bank", "Emergency", "Employment"
        
        public UpdateStaffPersonalDetailsDto? Personal { get; set; }
        public UpdateStaffAddressDto? Address { get; set; }
        public List<StaffEducationItem>? Education { get; set; }
        public List<StaffExperienceItem>? Experience { get; set; }
        public StaffBankDetails? Bank { get; set; }
        public StaffEmergencyContact? Emergency { get; set; }
        public UpdateStaffEmploymentDetailsDto? Employment { get; set; }
    }

    public class UpdateStaffPersonalDetailsDto
    {
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        public string? FatherOrHusbandName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nationality { get; set; }
        public string? Aadhaar { get; set; }
        public string? PanNumber { get; set; }
        public string? BloodGroup { get; set; }
    }

    public class UpdateStaffAddressDto
    {
        public string? AlternateMobile { get; set; }
        public string? CurrentAddress { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Country { get; set; }
    }

    public class UpdateStaffEmploymentDetailsDto
    {
        public int? DepartmentId { get; set; }
        public string? Department { get; set; }
        public int? DesignationId { get; set; }
        public string? Designation { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string? Qualification { get; set; }
        public decimal? Experience { get; set; }
        public string? EmploymentType { get; set; }
        public string? Status { get; set; }
    }

    public class AdminReviewStaffDto
    {
        [Required]
        public string Action { get; set; } = "Approve"; // "Approve" | "RequestCorrection"
        public string? CorrectionNotes { get; set; }
    }

    public class UploadStaffDocumentDto
    {
        [Required(ErrorMessage = "Document type is required.")]
        public string DocumentType { get; set; } = string.Empty;

        [Required(ErrorMessage = "Document file is required.")]
        public Microsoft.AspNetCore.Http.IFormFile File { get; set; } = null!;
    }
}
