using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class UpdateExaminationRequest
    {
        public string? ExamCode { get; set; }
        public string? ExamName { get; set; }
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public string? AcademicLevel { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? AssessmentTypeId { get; set; }
        public string? ExamType { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? ExamPattern { get; set; }
        public string? ExamPatternId { get => ExamPattern; set => ExamPattern = value; }
        public int? TotalMarks { get; set; }
        public decimal? PassPercentage { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
    }
}