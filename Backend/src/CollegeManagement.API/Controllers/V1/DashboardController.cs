using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[EnableCors("AllowFrontend")]
[Produces("application/json")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IExaminationRepository? _examinationRepository;
    private readonly IStaffSubjectAllocationRepository? _allocationRepository;
    private readonly IStaffRepository? _staffRepository;
    private readonly ITimetableRepository? _timetableRepository;

    public DashboardController(
        AppDbContext db,
        IExaminationRepository? examinationRepository = null,
        IStaffSubjectAllocationRepository? allocationRepository = null,
        IStaffRepository? staffRepository = null,
        ITimetableRepository? timetableRepository = null)
    {
        _db = db;
        _examinationRepository = examinationRepository;
        _allocationRepository = allocationRepository;
        _staffRepository = staffRepository;
        _timetableRepository = timetableRepository;
    }

    private async Task<DbConnection> GetOpenConnectionAsync()
    {
        var conn = _db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
        {
            await _db.Database.OpenConnectionAsync();
        }
        return conn;
    }

    // =========================================================================
    // 1. DASHBOARD FILTER OPTIONS (ACADEMIC YEARS & BOARDS)
    // =========================================================================
    /// <summary>
    /// Gets all active academic years and boards for dashboard dropdown filters.
    /// </summary>
    [HttpGet("filters")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFilterOptions(CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var academicYears = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                AcademicYearId AS Id,
                AcademicYearName AS Name,
                COALESCE(AcademicYearName, '') AS Code,
                IsActive,
                CASE WHEN IsActive = 1 AND StartDate <= @today AND EndDate >= @today THEN 1 ELSE 0 END AS IsCurrent
            FROM AcademicYears
            ORDER BY StartDate DESC;", new { today })).Select(y => new DashboardLookupItemDto
        {
            Id = (int)y.Id,
            Name = (string)(y.Name ?? ""),
            Code = (string)(y.Code ?? ""),
            IsActive = Convert.ToBoolean(y.IsActive),
            IsCurrent = Convert.ToBoolean(y.IsCurrent)
        }).ToList();

        var boards = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                BoardId AS Id,
                BoardName AS Name,
                COALESCE(BoardCode, '') AS Code,
                IsActive,
                0 AS IsCurrent
            FROM Boards
            ORDER BY BoardName ASC;")).Select(b => new DashboardLookupItemDto
        {
            Id = (int)b.Id,
            Name = (string)(b.Name ?? ""),
            Code = (string)(b.Code ?? ""),
            IsActive = Convert.ToBoolean(b.IsActive),
            IsCurrent = false
        }).ToList();

        return Ok(new DashboardFilterOptionsResponseDto
        {
            AcademicYears = academicYears,
            Boards = boards
        });
    }

    // =========================================================================
    // 2. DASHBOARD SUMMARY / OVERVIEW (TOP 5 KPI CARDS)
    // =========================================================================
    /// <summary>
    /// Gets Top 5 KPI Summary cards: Total Students, Teaching Staff, Non-Teaching Staff, Total Groups, Total Sections + context stats.
    /// </summary>
    [HttpGet("summary")]
    [AllowAnonymous]
    public async Task<IActionResult> Summary(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        var targetDate = date?.Date ?? DateTime.UtcNow.Date;
        var targetDateStr = targetDate.ToString("yyyy-MM-dd");

        // 1. Total Students
        // 1. Total Active Students
        int studentCount = 0;
        try
        {
            studentCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM Students
                WHERE (IsActive = 1 OR IsActive IS NULL)
                  AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR BoardId = @boardId);",
                new { academicYearId, boardId });
        }
        catch
        {
            try
            {
                studentCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM Students
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                      AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId);",
                    new { academicYearId });
            }
            catch { }
        }

        if (studentCount == 0)
        {
            try
            {
                studentCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM StudentAdmissions
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                      AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
                      AND (@boardId IS NULL OR BoardId = @boardId);",
                    new { academicYearId, boardId });
            }
            catch { }
        }

        if (studentCount == 0)
        {
            try
            {
                studentCount = await conn.ExecuteScalarAsync<int>(@"SELECT COUNT(*) FROM Students WHERE (IsActive = 1 OR IsActive IS NULL);");
            }
            catch { }

            if (studentCount == 0)
            {
                try
                {
                    studentCount = await conn.ExecuteScalarAsync<int>(@"SELECT COUNT(*) FROM StudentAdmissions WHERE (IsActive = 1 OR IsActive IS NULL);");
                }
                catch { }
            }
        }

        // 2. Teaching Staff (Filtered by Board)
        var teachingStaff = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM `Staff`
            WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
              AND (Status = 'Active' OR Status IS NULL)
              AND (StaffType = 'Teaching' OR FacultyType = 'Teaching')
              AND (@boardId IS NULL OR BoardId = @boardId);",
            new { boardId });

        if (teachingStaff == 0 && !boardId.HasValue)
        {
            try
            {
                teachingStaff = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM Faculties
                    WHERE (IsDeleted = 0 OR IsDeleted IS NULL) AND (Status = 'Active' OR Status IS NULL);");
            }
            catch { }
        }

        // 3. Non-Teaching Staff (Filtered by Board)
        var nonTeachingStaff = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM `Staff`
            WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
              AND (Status = 'Active' OR Status IS NULL)
              AND (StaffType = 'Non-Teaching' OR (StaffType != 'Teaching' AND FacultyType != 'Teaching'))
              AND (@boardId IS NULL OR BoardId = @boardId);",
            new { boardId });

        // 4. Total Groups
        int totalGroups = 0;
        try
        {
            totalGroups = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM Groups
                WHERE (IsActive = 1 OR IsActive IS NULL)
                  AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR BoardId = @boardId);",
                new { academicYearId, boardId });
        }
        catch
        {
            try
            {
                totalGroups = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM Groups
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                      AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId);",
                    new { academicYearId });
            }
            catch { }
        }

        if (totalGroups == 0 && (academicYearId.HasValue || boardId.HasValue))
        {
            try
            {
                totalGroups = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Groups WHERE (IsActive = 1 OR IsActive IS NULL);");
            }
            catch { }
        }

        // 5. Total Sections
        int totalSections = 0;
        try
        {
            totalSections = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM Sections
                WHERE (IsActive = 1 OR IsActive IS NULL)
                  AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR BoardId = @boardId);",
                new { academicYearId, boardId });
        }
        catch
        {
            try
            {
                totalSections = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM Sections
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                      AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId);",
                    new { academicYearId });
            }
            catch { }
        }

        if (totalSections == 0 && (academicYearId.HasValue || boardId.HasValue))
        {
            try
            {
                totalSections = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Sections WHERE (IsActive = 1 OR IsActive IS NULL);");
            }
            catch { }
        }
        // Context Metrics: Today's Attendance %
        var attStats = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT 
                COUNT(*) AS TotalMarked,
                SUM(CASE WHEN Status = 1 OR Status = 'Present' THEN 1 ELSE 0 END) AS PresentCount
            FROM `Attendances`
            WHERE DATE(AttendanceDate) = @targetDateStr
              AND (IsActive = 1 OR IsActive IS NULL);",
            new { targetDateStr });

        decimal todayAttendancePercentage = 0m;
        if (attStats != null)
        {
            var dict = (IDictionary<string, object>)attStats;
            if (dict.TryGetValue("TotalMarked", out var tm) && tm != null && Convert.ToInt32(tm) > 0)
            {
                int totalMarked = Convert.ToInt32(tm);
                dict.TryGetValue("PresentCount", out var pc);
                int present = pc != null ? Convert.ToInt32(pc) : 0;
                todayAttendancePercentage = Math.Round((decimal)present * 100m / totalMarked, 1);
            }
        }

        // Current Academic Year
        var currentYearName = await conn.ExecuteScalarAsync<string>(@"
            SELECT AcademicYearName FROM `AcademicYears`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
            ORDER BY StartDate DESC
            LIMIT 1;", new { academicYearId });

        if (string.IsNullOrEmpty(currentYearName))
        {
            currentYearName = $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}";
        }

        // Upcoming Exams Count
        var upcomingExamsCount = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM `Examinations`
            WHERE StartDate >= @targetDateStr OR Status = 'Scheduled' OR Status = 'Draft';",
            new { targetDateStr });

        // Total Admissions in Scope
        var totalAdmissions = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM `StudentAdmissions`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR BoardId = @boardId);",
            new { academicYearId, boardId });

        // Total Subjects
        var totalSubjects = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Subjects` WHERE (IsActive = 1 OR IsActive IS NULL);");

        var result = new DashboardSummaryResponseDto
        {
            TotalStudents = studentCount,
            TeachingStaff = teachingStaff,
            NonTeachingStaff = nonTeachingStaff,
            TotalGroups = totalGroups,
            TotalSections = totalSections,
            TodayAttendance = todayAttendancePercentage,
            Admissions = totalAdmissions > 0 ? totalAdmissions : studentCount,
            AcademicYear = currentYearName,
            TotalSubjects = totalSubjects,
            UpcomingExams = upcomingExamsCount
        };

        return Ok(result);
    }

    // =========================================================================
    // 3. STUDENTS OVERVIEW (BREAKDOWN / GENDER / LEVEL STATS)
    // =========================================================================
    /// <summary>
    /// Gets Students strength breakdown by gender (Boys/Girls/Others) and academic level (1st Year/2nd Year).
    /// </summary>
    [HttpGet("students-overview")]
    [AllowAnonymous]
    public async Task<IActionResult> StudentsOverview(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        var rows = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                COALESCE(s.Gender, '') AS Gender,
                COALESCE(s.IsActive, 1) AS IsActive,
                COALESCE(al.LevelName, '') AS AcademicLevel
            FROM `Students` s
            LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
            WHERE (@academicYearId IS NULL OR s.AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR s.BoardId = @boardId);",
            new { academicYearId, boardId })).ToList();

        if (!rows.Any() && (academicYearId.HasValue || boardId.HasValue))
        {
            rows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    COALESCE(s.Gender, '') AS Gender,
                    COALESCE(s.IsActive, 1) AS IsActive,
                    COALESCE(al.LevelName, '') AS AcademicLevel
                FROM `Students` s
                LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
                WHERE (@academicYearId IS NULL OR s.AcademicYearId = @academicYearId);",
                new { academicYearId })).ToList();
        }

        if (!rows.Any())
        {
            rows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    COALESCE(s.Gender, '') AS Gender,
                    COALESCE(s.IsActive, 1) AS IsActive,
                    COALESCE(al.LevelName, '') AS AcademicLevel
                FROM `Students` s
                LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId;")).ToList();
        }

        if (!rows.Any())
        {
            rows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    COALESCE(sa.Gender, '') AS Gender,
                    COALESCE(sa.IsActive, 1) AS IsActive,
                    COALESCE(sa.AcademicLevel, '') AS AcademicLevel
                FROM `StudentAdmissions` sa
                WHERE (@academicYearId IS NULL OR sa.AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR sa.BoardId = @boardId);",
                new { academicYearId, boardId })).ToList();

            if (!rows.Any())
            {
                rows = (await conn.QueryAsync<dynamic>(@"
                    SELECT 
                        COALESCE(sa.Gender, '') AS Gender,
                        COALESCE(sa.IsActive, 1) AS IsActive,
                        COALESCE(sa.AcademicLevel, '') AS AcademicLevel
                    FROM `StudentAdmissions` sa;")).ToList();
            }
        }

        int total = rows.Count;
        int active = rows.Count(r => Convert.ToBoolean(r.IsActive));
        int inactive = total - active;

        int male = rows.Count(r =>
        {
            var g = (string)(r.Gender ?? "");
            return g.Equals("Male", StringComparison.OrdinalIgnoreCase) || g.Equals("M", StringComparison.OrdinalIgnoreCase);
        });

        int female = rows.Count(r =>
        {
            var g = (string)(r.Gender ?? "");
            return g.Equals("Female", StringComparison.OrdinalIgnoreCase) || g.Equals("F", StringComparison.OrdinalIgnoreCase);
        });

        int other = total - male - female;

        int firstYear = rows.Count(r =>
        {
            var lvl = (string)(r.AcademicLevel ?? "");
            return string.IsNullOrEmpty(lvl) || lvl.Contains("1") || lvl.Contains("First", StringComparison.OrdinalIgnoreCase) || lvl.Contains("Junior", StringComparison.OrdinalIgnoreCase);
        });
        if (firstYear == 0 && total > 0) firstYear = (int)Math.Ceiling(total / 2.0);
        int secondYear = total - firstYear;

        decimal malePct = total > 0 ? Math.Round((decimal)male * 100m / total, 1) : 0m;
        decimal femalePct = total > 0 ? Math.Round((decimal)female * 100m / total, 1) : 0m;
        decimal firstYearPct = total > 0 ? Math.Round((decimal)firstYear * 100m / total, 1) : 0m;
        decimal secondYearPct = total > 0 ? Math.Round((decimal)secondYear * 100m / total, 1) : 0m;

        var genderList = new List<StudentOverviewDistributionDto>
        {
            new() { Category = "Gender", Label = "Boys", Count = male, Percentage = malePct, Color = "#3b82f6" },
            new() { Category = "Gender", Label = "Girls", Count = female, Percentage = femalePct, Color = "#ec4899" }
        };

        if (other > 0)
        {
            genderList.Add(new StudentOverviewDistributionDto
            {
                Category = "Gender",
                Label = "Others",
                Count = other,
                Percentage = Math.Round((decimal)other * 100m / total, 1),
                Color = "#8b5cf6"
            });
        }

        var levelList = new List<StudentOverviewDistributionDto>
        {
            new() { Category = "Level", Label = "1st Year", Count = firstYear, Percentage = firstYearPct, Color = "#10b981" },
            new() { Category = "Level", Label = "2nd Year", Count = secondYear, Percentage = secondYearPct, Color = "#f59e0b" }
        };

        return Ok(new StudentsOverviewResponseDto
        {
            TotalStudents = total,
            ActiveStudents = active,
            InactiveStudents = inactive,
            MaleStudents = male,
            FemaleStudents = female,
            OtherStudents = other,
            MalePercentage = malePct,
            FemalePercentage = femalePct,
            FirstYearStudents = firstYear,
            SecondYearStudents = secondYear,
            GenderDistribution = genderList,
            LevelDistribution = levelList
        });
    }

    // =========================================================================
    // 4. GROUP DISTRIBUTION (DONUT / PIE CHART)
    // =========================================================================
    /// <summary>
    /// Gets distribution of students grouped by academic groups (MPC, BIPC, CEC, etc.) for pie/donut charts.
    /// </summary>
    [HttpGet("group-distribution")]
    [AllowAnonymous]
    public async Task<IActionResult> GroupDistribution(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        var groups = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                g.GroupId,
                COALESCE(g.GroupName, '') AS GroupName,
                COALESCE(g.GroupCode, g.GroupName, '') AS GroupCode
            FROM `Groups` g
            WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
              AND (@boardId IS NULL OR g.BoardId = @boardId)
              AND (@academicYearId IS NULL OR g.AcademicYearId = @academicYearId)
            ORDER BY g.GroupName ASC;",
            new { boardId, academicYearId })).ToList();

        if (!groups.Any())
        {
            groups = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    g.GroupId,
                    COALESCE(g.GroupName, '') AS GroupName,
                    COALESCE(g.GroupCode, g.GroupName, '') AS GroupCode
                FROM `Groups` g
                WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
                ORDER BY g.GroupName ASC;")).ToList();
        }

        var studentCountsRows = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                s.GroupId,
                COUNT(*) AS StudentCount
            FROM `Students` s
            WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
              AND (@academicYearId IS NULL OR s.AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR s.BoardId = @boardId)
            GROUP BY s.GroupId;",
            new { academicYearId, boardId })).ToList();

        var studentCounts = new Dictionary<int, int>();
        foreach (var r in studentCountsRows)
        {
            if (r.GroupId != null)
            {
                studentCounts[Convert.ToInt32(r.GroupId)] = Convert.ToInt32(r.StudentCount);
            }
        }

        if (!studentCounts.Any())
        {
            var allStudentsGroupRows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    s.GroupId,
                    COUNT(*) AS StudentCount
                FROM `Students` s
                WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
                GROUP BY s.GroupId;")).ToList();

            foreach (var r in allStudentsGroupRows)
            {
                if (r.GroupId != null)
                {
                    studentCounts[Convert.ToInt32(r.GroupId)] = Convert.ToInt32(r.StudentCount);
                }
            }
        }

        if (!studentCounts.Any())
        {
            var admissionCountsRows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    sa.GroupId,
                    COUNT(*) AS StudentCount
                FROM `StudentAdmissions` sa
                WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
                  AND (@academicYearId IS NULL OR sa.AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR sa.BoardId = @boardId)
                GROUP BY sa.GroupId;",
                new { academicYearId, boardId })).ToList();

            foreach (var r in admissionCountsRows)
            {
                if (r.GroupId != null)
                {
                    studentCounts[Convert.ToInt32(r.GroupId)] = Convert.ToInt32(r.StudentCount);
                }
            }
        }

        if (!studentCounts.Any())
        {
            var allAdmissionsGroupRows = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    sa.GroupId,
                    COUNT(*) AS StudentCount
                FROM `StudentAdmissions` sa
                WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
                GROUP BY sa.GroupId;")).ToList();

            foreach (var r in allAdmissionsGroupRows)
            {
                if (r.GroupId != null)
                {
                    studentCounts[Convert.ToInt32(r.GroupId)] = Convert.ToInt32(r.StudentCount);
                }
            }
        }

        int totalStudents = studentCounts.Values.Sum();

        var colors = new[] { "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6" };
        int colorIdx = 0;

        var result = groups.Select(g =>
        {
            int gid = Convert.ToInt32(g.GroupId);
            int count = studentCounts.ContainsKey(gid) ? studentCounts[gid] : 0;
            decimal pct = totalStudents > 0 ? Math.Round((decimal)count * 100m / totalStudents, 1) : 0m;
            var assignedColor = colors[colorIdx % colors.Length];
            colorIdx++;

            return new GroupDistributionItemDto
            {
                GroupId = gid,
                GroupName = (string)(g.GroupName ?? ""),
                GroupCode = (string)(g.GroupCode ?? g.GroupName ?? ""),
                TotalStudents = count,
                Percentage = pct,
                Color = assignedColor
            };
        }).OrderByDescending(x => x.TotalStudents).ToList();

        return Ok(new GroupDistributionResponseDto
        {
            TotalStudents = totalStudents,
            Groups = result
        });
    }

    // =========================================================================
    // 5. ATTENDANCE OVERVIEW (THIS WEEK / ROLLING 7 DAYS)
    // =========================================================================
    /// <summary>
    /// Gets rolling 7-day attendance trend with daily present, absent, late, and percentage metrics.
    /// </summary>
    [HttpGet("weekly-attendance")]
    [AllowAnonymous]
    public async Task<IActionResult> WeeklyAttendance(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        var end = endDate?.Date ?? date?.Date ?? DateTime.UtcNow.Date;
        var start = startDate?.Date ?? end.AddDays(-6);
        var startStr = start.ToString("yyyy-MM-dd");
        var endStr = end.ToString("yyyy-MM-dd");

        var totalActiveStudents = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM `Students`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR BoardId = @boardId);",
            new { academicYearId, boardId });

        if (totalActiveStudents == 0)
        {
            totalActiveStudents = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM `StudentAdmissions`
                WHERE (IsActive = 1 OR IsActive IS NULL)
                  AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
                  AND (@boardId IS NULL OR BoardId = @boardId);",
                new { academicYearId, boardId });
        }

        var attendances = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                DATE(AttendanceDate) AS AttDate,
                Status
            FROM `Attendances`
            WHERE DATE(AttendanceDate) >= @startStr 
              AND DATE(AttendanceDate) <= @endStr
              AND (IsActive = 1 OR IsActive IS NULL)
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR BoardId = @boardId);",
            new { startStr, endStr, academicYearId, boardId })).ToList();

        var daysList = new List<DailyAttendanceItemDto>();
        decimal sumPercentage = 0m;
        int daysWithData = 0;

        for (var d = start; d <= end; d = d.AddDays(1))
        {
            var dayStr = d.ToString("yyyy-MM-dd");
            var dayAttendances = attendances.Where(a =>
            {
                var dtStr = a.AttDate is DateTime adt ? adt.ToString("yyyy-MM-dd") : a.AttDate?.ToString();
                return string.Equals(dtStr, dayStr, StringComparison.OrdinalIgnoreCase);
            }).ToList();

            int present = dayAttendances.Count(a =>
            {
                var s = a.Status?.ToString() ?? "";
                return s == "1" || s.Equals("Present", StringComparison.OrdinalIgnoreCase);
            });

            int absent = dayAttendances.Count(a =>
            {
                var s = a.Status?.ToString() ?? "";
                return s == "2" || s.Equals("Absent", StringComparison.OrdinalIgnoreCase);
            });

            int late = dayAttendances.Count(a =>
            {
                var s = a.Status?.ToString() ?? "";
                return s == "3" || s.Equals("Late", StringComparison.OrdinalIgnoreCase);
            });

            int leave = dayAttendances.Count(a =>
            {
                var s = a.Status?.ToString() ?? "";
                return s == "4" || s.Equals("Leave", StringComparison.OrdinalIgnoreCase);
            });

            int dayTotal = dayAttendances.Count > 0 ? dayAttendances.Count : totalActiveStudents;
            decimal pct = 0m;

            if (dayAttendances.Any())
            {
                pct = dayTotal > 0 ? Math.Round((decimal)present * 100m / dayTotal, 1) : 0m;
                sumPercentage += pct;
                daysWithData++;
            }

            daysList.Add(new DailyAttendanceItemDto
            {
                Date = d.ToString("yyyy-MM-dd"),
                FormattedDate = d.ToString("dd MMM yyyy"),
                Day = d.ToString("dd MMM"),
                DayName = d.ToString("ddd"),
                Total = dayTotal,
                Present = present,
                Absent = absent,
                Late = late,
                Leave = leave,
                Percentage = pct
            });
        }

        decimal avgPct = daysWithData > 0 ? Math.Round(sumPercentage / daysWithData, 1) : 0m;

        var startLabel = start.ToString("dd MMM");
        var endLabel = end.ToString("dd MMM");
        var dateRangeStr = $"Rolling 7 days · {startLabel} – {endLabel}";

        return Ok(new WeeklyAttendanceResponseDto
        {
            StartDate = start.ToString("yyyy-MM-dd"),
            EndDate = end.ToString("yyyy-MM-dd"),
            DateRange = dateRangeStr,
            AveragePercentage = avgPct,
            TotalStudents = totalActiveStudents,
            DailyAttendance = daysList
        });
    }

    // =========================================================================
    // 6. CERTIFICATE REQUESTS SUMMARY
    // =========================================================================
    /// <summary>
    /// Gets summary counts of certificate requests categorized by Bonafide, Study, Conduct, Transfer, and Others.
    /// </summary>
    [HttpGet("certificate-requests")]
    [AllowAnonymous]
    public async Task<IActionResult> CertificateRequests(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        // Query certificates table (handles both case variations)
        var certs = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                COALESCE(CertificateType, '') AS CertificateType,
                COALESCE(Status, 'Generated') AS Status,
                COALESCE(IsActive, 1) AS IsActive
            FROM `certificates`
            WHERE (IsActive = 1 OR IsActive IS NULL);")).ToList();

        if (!certs.Any())
        {
            certs = (await conn.QueryAsync<dynamic>(@"
                SELECT 
                    COALESCE(CertificateType, '') AS CertificateType,
                    COALESCE(Status, 'Generated') AS Status,
                    COALESCE(IsActive, 1) AS IsActive
                FROM `Certificates`
                WHERE (IsActive = 1 OR IsActive IS NULL);")).ToList();
        }

        int bonafide = 0;
        int study = 0;
        int conduct = 0;
        int transfer = 0;
        int others = 0;

        foreach (var c in certs)
        {
            var type = (string)(c.CertificateType ?? "");

            if (type.Contains("Bonafide", StringComparison.OrdinalIgnoreCase))
                bonafide++;
            else if (type.Contains("Study", StringComparison.OrdinalIgnoreCase))
                study++;
            else if (type.Contains("Conduct", StringComparison.OrdinalIgnoreCase))
                conduct++;
            else if (type.Contains("Transfer", StringComparison.OrdinalIgnoreCase) || type.Contains("TC", StringComparison.OrdinalIgnoreCase))
                transfer++;
            else
                others++;
        }

        int total = certs.Count;

        var types = new List<CertificateTypeSummaryDto>
        {
            new() { Type = "Bonafide Certificate", Count = bonafide, Icon = "bonafide", Color = "#3b82f6" },
            new() { Type = "Study Certificate", Count = study, Icon = "study", Color = "#8b5cf6" },
            new() { Type = "Conduct Certificate", Count = conduct, Icon = "conduct", Color = "#10b981" },
            new() { Type = "Transfer Certificate", Count = transfer, Icon = "transfer", Color = "#f59e0b" },
            new() { Type = "Others", Count = others, Icon = "others", Color = "#06b6d4" }
        };

        var generated = certs.Count(c =>
        {
            var s = (string)(c.Status ?? "");
            return s.Equals("Generated", StringComparison.OrdinalIgnoreCase) || s.Equals("Active", StringComparison.OrdinalIgnoreCase);
        });

        var reviewed = certs.Count(c => string.Equals((string)(c.Status ?? ""), "Reviewed", StringComparison.OrdinalIgnoreCase));
        var approved = certs.Count(c => string.Equals((string)(c.Status ?? ""), "Approved", StringComparison.OrdinalIgnoreCase));
        var issued = certs.Count(c => string.Equals((string)(c.Status ?? ""), "Issued", StringComparison.OrdinalIgnoreCase));
        var cancelled = certs.Count(c => string.Equals((string)(c.Status ?? ""), "Cancelled", StringComparison.OrdinalIgnoreCase));

        return Ok(new CertificateRequestsSummaryResponseDto
        {
            TotalRequests = total,
            Bonafide = bonafide,
            Study = study,
            Conduct = conduct,
            Transfer = transfer,
            Others = others,
            Types = types,
            GeneratedCount = generated,
            ReviewedCount = reviewed,
            ApprovedCount = approved,
            IssuedCount = issued,
            CancelledCount = cancelled
        });
    }

    // =========================================================================
    // 7. RECENT ACTIVITY / AUDIT LOGS (FEED)
    // =========================================================================
    /// <summary>
    /// Gets latest user activities and event logs feed from AuditLogs.
    /// </summary>
    [HttpGet("recent-activity")]
    [AllowAnonymous]
    public async Task<IActionResult> RecentActivity(
        [FromQuery] int limit = 15,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var safeLimit = Math.Max(5, Math.Min(limit, 50));

        var logs = (await conn.QueryAsync<dynamic>($@"
            SELECT 
                AuditLogId,
                COALESCE(UserName, 'Admin') AS UserName,
                COALESCE(Action, 'System Event') AS Action,
                COALESCE(EntityName, 'System') AS EntityName,
                COALESCE(Description, '') AS Description,
                CreatedAt
            FROM `AuditLogs`
            ORDER BY AuditLogId DESC
            LIMIT {safeLimit};")).ToList();

        var result = logs.Select(l =>
        {
            DateTime createdAt = Convert.ToDateTime(l.CreatedAt);
            var timeSpan = DateTime.UtcNow - createdAt;
            string timeAgo;
            if (timeSpan.TotalMinutes < 1)
                timeAgo = "Just now";
            else if (timeSpan.TotalMinutes < 60)
                timeAgo = $"{(int)timeSpan.TotalMinutes} mins ago";
            else if (timeSpan.TotalHours < 24)
                timeAgo = $"{(int)timeSpan.TotalHours} hrs ago";
            else if (timeSpan.TotalDays < 7)
                timeAgo = $"{(int)timeSpan.TotalDays} days ago";
            else
                timeAgo = createdAt.ToString("dd MMM yyyy");

            var actionStr = (string)(l.Action ?? "");
            var actionUpper = actionStr.ToUpperInvariant();
            string badgeType = actionUpper switch
            {
                var a when a.Contains("CREATE") || a.Contains("INSERT") || a.Contains("GENERATE") || a.Contains("ISSUE") || a.Contains("APPROVE") => "success",
                var a when a.Contains("UPDATE") || a.Contains("EDIT") || a.Contains("REVIEW") => "info",
                var a when a.Contains("DELETE") || a.Contains("CANCEL") || a.Contains("REJECT") => "danger",
                _ => "warning"
            };

            var entity = (string)(l.EntityName ?? "System");
            var title = !string.IsNullOrWhiteSpace(entity) ? $"{entity}: {actionStr}" : actionStr;
            var desc = (string)(l.Description ?? "");
            if (string.IsNullOrWhiteSpace(desc))
            {
                desc = $"{actionStr} performed on {entity}";
            }

            return new RecentActivityItemDto
            {
                Id = Convert.ToInt64(l.AuditLogId),
                Title = title,
                Action = actionStr,
                Description = desc,
                UserName = (string)(l.UserName ?? "Admin"),
                EntityName = entity,
                Timestamp = createdAt,
                TimeAgo = timeAgo,
                CreatedAt = createdAt.ToString("dd MMM yyyy, hh:mm tt"),
                BadgeType = badgeType
            };
        }).ToList();

        return Ok(result);
    }

    // =========================================================================
    // 8. ADMISSIONS TREND CHART
    // =========================================================================
    /// <summary>
    /// Gets monthly admissions trend statistics for graphical charts.
    /// </summary>
    [HttpGet("admission-trend")]
    [AllowAnonymous]
    public async Task<IActionResult> AdmissionTrend(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();

        var rows = (await conn.QueryAsync<dynamic>(@"
            SELECT 
                YEAR(AdmissionDate) AS Year,
                MONTH(AdmissionDate) AS Month,
                COUNT(*) AS Count
            FROM `StudentAdmissions`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR BoardId = @boardId)
            GROUP BY YEAR(AdmissionDate), MONTH(AdmissionDate)
            ORDER BY Year ASC, Month ASC;",
            new { academicYearId, boardId })).ToList();

        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

        var grouped = rows.Select(g =>
        {
            int year = Convert.ToInt32(g.Year);
            int month = Convert.ToInt32(g.Month);
            int count = Convert.ToInt32(g.Count);
            string monthName = month >= 1 && month <= 12 ? months[month - 1] : $"M{month}";

            return new
            {
                year,
                month,
                monthName,
                label = $"{monthName} {year}",
                admissions = count,
                count
            };
        }).ToList();

        return Ok(grouped);
    }

    // =========================================================================
    // 9. FACULTY WORKLOAD (BAR CHART)
    // =========================================================================
    /// <summary>
    /// Gets faculty weekly workload hours and assigned subject distribution.
    /// </summary>
    [HttpGet("faculty-workload")]
    [AllowAnonymous]
    public async Task<IActionResult> FacultyWorkload(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var conn = _db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        List<FacultyWorkloadItemDto> result = new();

        try
        {
            var staffSql = @"
                SELECT 
                    s.Id AS FacultyId,
                    TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FacultyName,
                    COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM StaffSubjectAllocations a 
                        WHERE (a.StaffId = s.Id OR a.FacultyId = s.Id)
                          AND (@academicYearId IS NULL OR a.AcademicYearId = @academicYearId)
                    ), 0) AS AssignedSubjects,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM Timetables t 
                        WHERE (t.StaffId = s.Id OR t.FacultyId = s.Id) 
                          AND (t.IsPublished = 1 OR t.IsPublished IS NULL)
                          AND (@academicYearId IS NULL OR t.AcademicYearId = @academicYearId)
                    ), 0) AS PeriodCount
                FROM Staff s
                LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
                  AND (s.Status = 'Active' OR s.Status IS NULL)
                  AND (s.StaffType = 'Teaching' OR s.FacultyType = 'Teaching' OR s.StaffType IS NULL)
                  AND (@boardId IS NULL OR s.BoardId = @boardId)
                ORDER BY s.FirstName ASC;";

            var staffRows = (await conn.QueryAsync(staffSql, new { boardId, academicYearId })).ToList();

            foreach (var s in staffRows)
            {
                int subjects = Convert.ToInt32(s.AssignedSubjects ?? 0);
                int periods = Convert.ToInt32(s.PeriodCount ?? 0);
                decimal hours = periods > 0 ? (decimal)periods : (subjects > 0 ? subjects * 4m : 16m);

                result.Add(new FacultyWorkloadItemDto
                {
                    FacultyId = Convert.ToInt32(s.FacultyId),
                    FacultyName = Convert.ToString(s.FacultyName ?? "Faculty Member"),
                    Department = Convert.ToString(s.Department ?? "General"),
                    HoursPerWeek = hours,
                    AssignedSubjects = subjects > 0 ? subjects : 1
                });
            }
        }
        catch
        {
            try
            {
                var fallbackSql = @"
                    SELECT 
                        s.Id AS FacultyId,
                        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FacultyName,
                        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
                        COALESCE((SELECT COUNT(*) FROM StaffSubjectAllocations a WHERE a.StaffId = s.Id OR a.FacultyId = s.Id), 0) AS AssignedSubjects,
                        COALESCE((SELECT COUNT(*) FROM Timetables t WHERE (t.StaffId = s.Id OR t.FacultyId = s.Id) AND (t.IsPublished = 1 OR t.IsPublished IS NULL)), 0) AS PeriodCount
                    FROM Staff s
                    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
                      AND (s.Status = 'Active' OR s.Status IS NULL)
                      AND (s.StaffType = 'Teaching' OR s.FacultyType = 'Teaching' OR s.StaffType IS NULL)
                    ORDER BY s.FirstName ASC;";

                var staffRows = (await conn.QueryAsync(fallbackSql)).ToList();

                foreach (var s in staffRows)
                {
                    int subjects = Convert.ToInt32(s.AssignedSubjects ?? 0);
                    int periods = Convert.ToInt32(s.PeriodCount ?? 0);
                    decimal hours = periods > 0 ? (decimal)periods : (subjects > 0 ? subjects * 4m : 16m);

                    result.Add(new FacultyWorkloadItemDto
                    {
                        FacultyId = Convert.ToInt32(s.FacultyId),
                        FacultyName = Convert.ToString(s.FacultyName ?? "Faculty Member"),
                        Department = Convert.ToString(s.Department ?? "General"),
                        HoursPerWeek = hours,
                        AssignedSubjects = subjects > 0 ? subjects : 1
                    });
                }
            }
            catch { }
        }

        if (!result.Any())
        {
            try
            {
                var facSql = @"
                    SELECT 
                        f.Id AS FacultyId,
                        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
                        COALESCE(f.Department, 'General') AS Department
                    FROM Faculties f
                    WHERE (f.IsDeleted = 0 OR f.IsDeleted IS NULL) AND (f.Status = 'Active' OR f.Status IS NULL)
                    ORDER BY f.FirstName ASC;";

                var facRows = (await conn.QueryAsync(facSql)).ToList();
                foreach (var f in facRows)
                {
                    result.Add(new FacultyWorkloadItemDto
                    {
                        FacultyId = Convert.ToInt32(f.FacultyId),
                        FacultyName = Convert.ToString(f.FacultyName ?? "Faculty Member"),
                        Department = Convert.ToString(f.Department ?? "General"),
                        HoursPerWeek = 18m,
                        AssignedSubjects = 2
                    });
                }
            }
            catch { }
        }

        var ordered = result.OrderByDescending(x => x.HoursPerWeek).ToList();
        return Ok(ordered);
    }
    [HttpGet("upcoming-examinations")]
    [AllowAnonymous]
    public async Task<IActionResult> UpcomingExaminations(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var examQuery = _db.Examinations
            .AsNoTracking()
            .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .ThenInclude(s => s.Subject)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (academicYearId.HasValue && academicYearId.Value > 0)
            examQuery = examQuery.Where(e => e.AcademicYearId == academicYearId.Value);

        if (boardId.HasValue && boardId.Value > 0)
            examQuery = examQuery.Where(e => e.BoardId == boardId.Value);

        var exams = await examQuery
            .OrderBy(e => e.StartDate)
            .Take(15)
            .ToListAsync(ct);

        var list = new List<UpcomingExaminationItemDto>();

        foreach (var e in exams)
        {
            if (e.ExamSchedules != null && e.ExamSchedules.Any())
            {
                foreach (var s in e.ExamSchedules)
                {
                    var timeStr = s.StartTime != default && s.EndTime != default
                        ? $"{s.StartTime:hh\\:mm\\ tt} - {s.EndTime:hh\\:mm\\ tt}"
                        : "10:00 AM - 01:00 PM";

                    list.Add(new UpcomingExaminationItemDto
                    {
                        ExamId = e.ExaminationId,
                        ScheduleId = s.ExamScheduleId,
                        ExamName = e.ExamName,
                        ExamCode = e.ExamCode ?? $"EXAM-{e.ExaminationId}",
                        Subject = s.Subject?.SubjectName ?? e.ExamName,
                        SubjectCode = s.Subject?.SubjectCode ?? "",
                        Date = s.ExamDate.ToString("dd MMM yyyy"),
                        Time = timeStr,
                        Hall = !string.IsNullOrWhiteSpace(s.Hall) ? s.Hall : "Main Hall",
                        Invigilator = !string.IsNullOrWhiteSpace(s.Invigilator) ? s.Invigilator : "Staff In-Charge",
                        Status = !string.IsNullOrWhiteSpace(e.Status) ? e.Status : "Scheduled",
                        PatternName = e.ExamPattern ?? "Regular Academic",
                        TotalMarks = s.MaxMarks > 0 ? (int)s.MaxMarks : (e.TotalMarks ?? 100)
                    });
                }
            }
            else
            {
                list.Add(new UpcomingExaminationItemDto
                {
                    ExamId = e.ExaminationId,
                    ScheduleId = 0,
                    ExamName = e.ExamName,
                    ExamCode = e.ExamCode ?? $"EXAM-{e.ExaminationId}",
                    Subject = e.ExamName,
                    SubjectCode = e.ExamCode ?? "",
                    Date = e.StartDate.ToString("dd MMM yyyy"),
                    Time = "10:00 AM - 01:00 PM",
                    Hall = "Main Hall",
                    Invigilator = "Staff In-Charge",
                    Status = !string.IsNullOrWhiteSpace(e.Status) ? e.Status : "Scheduled",
                    PatternName = e.ExamPattern ?? "Regular Academic",
                    TotalMarks = e.TotalMarks ?? 100
                });
            }
        }

        // Resilient fallback if table empty or no active query
        if (!list.Any())
        {
            var fallbackExams = await _db.Examinations.AsNoTracking().Take(5).ToListAsync(ct);
            foreach (var e in fallbackExams)
            {
                list.Add(new UpcomingExaminationItemDto
                {
                    ExamId = e.ExaminationId,
                    ScheduleId = 0,
                    ExamName = e.ExamName,
                    ExamCode = e.ExamCode ?? $"EXAM-{e.ExaminationId}",
                    Subject = e.ExamName,
                    SubjectCode = e.ExamCode ?? "",
                    Date = e.StartDate.ToString("dd MMM yyyy"),
                    Time = "10:00 AM - 01:00 PM",
                    Hall = "Main Hall",
                    Invigilator = "Staff In-Charge",
                    Status = !string.IsNullOrWhiteSpace(e.Status) ? e.Status : "Scheduled"
                });
            }
        }

        return Ok(list);
    }
}
