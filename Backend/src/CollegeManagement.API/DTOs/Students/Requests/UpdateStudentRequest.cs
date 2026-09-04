using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class UpdateStudentRequest
    {
        [MaxLength(150)]
        public string? StudentName { get; set; }

        [MaxLength(500)]
        public string? Photo { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? MobileNumber { get; set; }

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        // Address
        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(20)]
        public string? Pincode { get; set; }

        // Parents
        [MaxLength(150)]
        public string? FatherName { get; set; }

        [MaxLength(100)]
        public string? FatherOccupation { get; set; }

        [MaxLength(20)]
        public string? FatherMobile { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? FatherEmail { get; set; }

        [MaxLength(150)]
        public string? MotherName { get; set; }

        [MaxLength(100)]
        public string? MotherOccupation { get; set; }

        [MaxLength(20)]
        public string? MotherMobile { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? MotherEmail { get; set; }

        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [MaxLength(20)]
        public string? GuardianMobile { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? GuardianEmail { get; set; }

        public decimal? AnnualIncome { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }
}
