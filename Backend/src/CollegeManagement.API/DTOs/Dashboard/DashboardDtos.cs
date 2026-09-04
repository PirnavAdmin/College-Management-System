using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Dashboard;

public class DashboardFilterDto
{
    public int? AcademicYearId { get; set; }
    public int? BoardId { get; set; }
    public DateTime? Date { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class DashboardFilterOptionsResponseDto
{
    public IReadOnlyList<DashboardLookupItemDto> AcademicYears { get; set; } = new List<DashboardLookupItemDto>();
    public IReadOnlyList<DashboardLookupItemDto> Boards { get; set; } = new List<DashboardLookupItemDto>();
}

public class DashboardLookupItemDto
{
    public int Id { get; set; }
    public int Value => Id;
    public string Name { get; set; } = string.Empty;
    public string Label => Name;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsCurrent { get; set; }
}

public class DashboardSummaryResponseDto
{
    // Top 5 Primary KPI Cards matching frontend
    public int TotalStudents { get; set; }
    public int TeachingStaff { get; set; }
    public int NonTeachingStaff { get; set; }
    public int TotalGroups { get; set; }
    public int TotalSections { get; set; }

    // Backward compatibility & alias properties
    public int TotalFaculty => TeachingStaff;
    public int FacultyMembers => TeachingStaff;
    public int TeachingFaculty => TeachingStaff;
    public int NonTeachingFaculty => NonTeachingStaff;
    public int NonTeachingStaffCount => NonTeachingStaff;
    public int StudentsCount => TotalStudents;
    public int GroupsCount => TotalGroups;
    public int SectionsCount => TotalSections;

    // Additional context metrics
    public decimal TodayAttendance { get; set; }
    public decimal TodayAttendancePercentage => TodayAttendance;
    public int Admissions { get; set; }
    public int TotalAdmissions => Admissions;
    public string AcademicYear { get; set; } = string.Empty;
    public string AcademicYearName => AcademicYear;
    public int TotalSubjects { get; set; }
    public int UpcomingExams { get; set; }
    public int UpcomingExaminations => UpcomingExams;
}

public class StudentsOverviewResponseDto
{
    public int TotalStudents { get; set; }
    public int ActiveStudents { get; set; }
    public int InactiveStudents { get; set; }
    public int MaleStudents { get; set; }
    public int FemaleStudents { get; set; }
    public int OtherStudents { get; set; }
    public decimal MalePercentage { get; set; }
    public decimal FemalePercentage { get; set; }
    public int FirstYearStudents { get; set; }
    public int SecondYearStudents { get; set; }
    public IReadOnlyList<StudentOverviewDistributionDto> GenderDistribution { get; set; } = new List<StudentOverviewDistributionDto>();
    public IReadOnlyList<StudentOverviewDistributionDto> LevelDistribution { get; set; } = new List<StudentOverviewDistributionDto>();
    public IReadOnlyList<StudentOverviewDistributionDto> Items => GenderDistribution;
}

public class StudentOverviewDistributionDto
{
    public string Category { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Name => Label;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class GroupDistributionItemDto
{
    public int GroupId { get; set; }
    public int Id => GroupId;
    public string GroupName { get; set; } = string.Empty;
    public string Name => GroupName;
    public string GroupCode { get; set; } = string.Empty;
    public string Code => GroupCode;
    public int TotalStudents { get; set; }
    public int StudentCount => TotalStudents;
    public int Count => TotalStudents;
    public decimal Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class GroupDistributionResponseDto
{
    public int TotalStudents { get; set; }
    public IReadOnlyList<GroupDistributionItemDto> Groups { get; set; } = new List<GroupDistributionItemDto>();
    public IReadOnlyList<GroupDistributionItemDto> Items => Groups;
}

public class DailyAttendanceItemDto
{
    public string Date { get; set; } = string.Empty;
    public string FormattedDate { get; set; } = string.Empty;
    public string Day { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public int Total { get; set; }
    public int TotalStudents => Total;
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Leave { get; set; }
    public decimal Percentage { get; set; }
    public decimal AttendancePercentage => Percentage;
}

public class WeeklyAttendanceResponseDto
{
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string DateRange { get; set; } = string.Empty;
    public decimal AveragePercentage { get; set; }
    public int TotalStudents { get; set; }
    public IReadOnlyList<DailyAttendanceItemDto> DailyAttendance { get; set; } = new List<DailyAttendanceItemDto>();
    public IReadOnlyList<DailyAttendanceItemDto> Days => DailyAttendance;
    public IReadOnlyList<DailyAttendanceItemDto> Items => DailyAttendance;
}

public class CertificateTypeSummaryDto
{
    public string Type { get; set; } = string.Empty;
    public string Name => Type;
    public string CertificateType => Type;
    public int Count { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class CertificateRequestsSummaryResponseDto
{
    public int TotalRequests { get; set; }
    public int Total => TotalRequests;
    public int Bonafide { get; set; }
    public int BonafideCertificate => Bonafide;
    public int Study { get; set; }
    public int StudyCertificate => Study;
    public int Conduct { get; set; }
    public int ConductCertificate => Conduct;
    public int Transfer { get; set; }
    public int TransferCertificate => Transfer;
    public int Others { get; set; }
    public int Other => Others;
    public IReadOnlyList<CertificateTypeSummaryDto> Types { get; set; } = new List<CertificateTypeSummaryDto>();
    public IReadOnlyList<CertificateTypeSummaryDto> Items => Types;

    // Workflow counts
    public int GeneratedCount { get; set; }
    public int ReviewedCount { get; set; }
    public int ApprovedCount { get; set; }
    public int IssuedCount { get; set; }
    public int CancelledCount { get; set; }
}

public class RecentActivityItemDto
{
    public long Id { get; set; }
    public long AuditLogId => Id;
    public string Title { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string User => UserName;
    public string EntityName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string TimeAgo { get; set; } = string.Empty;
    public string Time => TimeAgo;
    public string CreatedAt { get; set; } = string.Empty;
    public string BadgeType { get; set; } = "info";
}

public class FacultyWorkloadItemDto
{
    public int FacultyId { get; set; }
    public int StaffId => FacultyId;
    public int Id => FacultyId;
    public string FacultyName { get; set; } = string.Empty;
    public string Name => FacultyName;
    public string StaffName => FacultyName;
    public string Department { get; set; } = "General";
    public string DepartmentName => Department;
    public decimal HoursPerWeek { get; set; }
    public decimal Hours => HoursPerWeek;
    public decimal WeeklyClasses => HoursPerWeek;
    public decimal PeriodCount => HoursPerWeek;
    public decimal Workload => HoursPerWeek;
    public decimal WorkloadHours => HoursPerWeek;
    public decimal TotalHours => HoursPerWeek;
    public int AssignedSubjects { get; set; }
    public int SubjectCount => AssignedSubjects;
    public decimal Count => HoursPerWeek;
    public decimal Value => HoursPerWeek;
}

public class UpcomingExaminationItemDto
{
    public int ExamId { get; set; }
    public int ExaminationId => ExamId;
    public int ScheduleId { get; set; }
    public int Id => ScheduleId > 0 ? ScheduleId : ExamId;
    public string ExamName { get; set; } = string.Empty;
    public string ExamCode { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string SubjectName => Subject;
    public string SubjectCode { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string ExamDate => Date;
    public string StartDate => Date;
    public string FormattedDate => Date;
    public string Time { get; set; } = "10:00 AM - 01:00 PM";
    public string ExamTime => Time;
    public string Hall { get; set; } = "Main Hall";
    public string HallName => Hall;
    public string Invigilator { get; set; } = "Staff In-Charge";
    public string InvigilatorName => Invigilator;
    public string Status { get; set; } = "Scheduled";
    public string PatternName { get; set; } = string.Empty;
    public int? TotalMarks { get; set; }
}

