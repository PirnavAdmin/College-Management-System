using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CreateExaminationRequest
    {
        public string? ExamCode { get; set; }

        [Required]
        public string ExamName { get; set; } = string.Empty;

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public string? AcademicLevel { get; set; }

        [Required]
        public int GroupId { get; set; }

        public int? ProgramId { get; set; }

        public int AssessmentTypeId { get; set; }

        public string? ExamType { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        public string? ExamPattern { get; set; }
        public string? ExamPatternId { get => ExamPattern; set => ExamPattern = value; }

        public int? TotalMarks { get; set; }

        public decimal? PassPercentage { get; set; }

        public string? Description { get; set; }

        public string Status { get; set; } = "DRAFT";

        public List<int>? AllocatedSubjectIds { get; set; } = new();
    }
}