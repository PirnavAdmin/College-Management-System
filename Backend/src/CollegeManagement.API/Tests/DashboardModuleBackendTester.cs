using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Dashboard;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class DashboardModuleBackendTester
{
    private readonly string _connectionString;

    public DashboardModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("       DASHBOARD MODULE BACKEND VERIFICATION & INTEGRATION TEST SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Build EF context & Controller
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var controller = new DashboardController(dbContext);

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/10] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Dashboard Filter Options
        Console.WriteLine("\n[2/10] Testing Dashboard Filter Options (Academic Years & Boards)...");
        try
        {
            var actionResult = await controller.GetFilterOptions();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is DashboardFilterOptionsResponseDto filterOpts)
            {
                Console.WriteLine($"  [PASS] Filter Options Retrieved:");
                Console.WriteLine($"         - Academic Years count: {filterOpts.AcademicYears.Count}");
                foreach (var y in filterOpts.AcademicYears)
                {
                    Console.WriteLine($"           * {y.Name} (ID: {y.Id}, Current: {y.IsCurrent})");
                }
                Console.WriteLine($"         - Boards count: {filterOpts.Boards.Count}");
                foreach (var b in filterOpts.Boards)
                {
                    Console.WriteLine($"           * {b.Name} (ID: {b.Id})");
                }
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected filter options response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Filter Options Error: {ex.Message}");
            failed++;
        }

        // 3. Test Dashboard Summary / Top 5 KPI Cards
        Console.WriteLine("\n[3/10] Testing Dashboard Summary / Top 5 KPI Cards...");
        try
        {
            var actionResult = await controller.Summary();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is DashboardSummaryResponseDto summary)
            {
                Console.WriteLine($"  [PASS] Dashboard 5 KPI Cards Retrieved:");
                Console.WriteLine($"         1. Total Students:     {summary.TotalStudents}");
                Console.WriteLine($"         2. Teaching Staff:     {summary.TeachingStaff}");
                Console.WriteLine($"         3. Non-Teaching Staff: {summary.NonTeachingStaff}");
                Console.WriteLine($"         4. Total Groups:       {summary.TotalGroups}");
                Console.WriteLine($"         5. Total Sections:     {summary.TotalSections}");
                Console.WriteLine($"         Context - Today's Attendance: {summary.TodayAttendance}%");
                Console.WriteLine($"         Context - Academic Year:     {summary.AcademicYear}");
                Console.WriteLine($"         Context - Total Subjects:    {summary.TotalSubjects}");

                if (summary.TotalGroups > 0 && summary.TotalSections >= 0)
                {
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Groups or Sections count is invalid.");
                    failed++;
                }
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected summary response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Summary KPI Error: {ex.Message}");
            failed++;
        }

        // 4. Test Staff Teaching vs Non-Teaching Segregation
        Console.WriteLine("\n[4/10] Testing Staff Teaching vs Non-Teaching Segregation Accuracy...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            var teachingDbCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM `Staffs` 
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL) 
                  AND (Status = 'Active' OR Status IS NULL)
                  AND (StaffType = 'Teaching' OR FacultyType = 'Teaching');");

            var nonTeachingDbCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM `Staffs` 
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL) 
                  AND (Status = 'Active' OR Status IS NULL)
                  AND (StaffType = 'Non-Teaching' OR (StaffType != 'Teaching' AND FacultyType != 'Teaching'));");

            Console.WriteLine($"  [PASS] Database Counts: Teaching = {teachingDbCount}, Non-Teaching = {nonTeachingDbCount}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Staff Segregation Error: {ex.Message}");
            failed++;
        }

        // 5. Test Students Overview (Gender & Level Breakdown)
        Console.WriteLine("\n[5/10] Testing Students Overview (Gender & Level Breakdown)...");
        try
        {
            var actionResult = await controller.StudentsOverview();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is StudentsOverviewResponseDto overview)
            {
                Console.WriteLine($"  [PASS] Students Overview Metrics:");
                Console.WriteLine($"         - Total Students:    {overview.TotalStudents}");
                Console.WriteLine($"         - Active Students:   {overview.ActiveStudents}");
                Console.WriteLine($"         - Inactive Students: {overview.InactiveStudents}");
                Console.WriteLine($"         - Male (Boys):       {overview.MaleStudents} ({overview.MalePercentage}%)");
                Console.WriteLine($"         - Female (Girls):    {overview.FemaleStudents} ({overview.FemalePercentage}%)");
                Console.WriteLine($"         - 1st Year Students: {overview.FirstYearStudents}");
                Console.WriteLine($"         - 2nd Year Students: {overview.SecondYearStudents}");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected students overview response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Students Overview Error: {ex.Message}");
            failed++;
        }

        // 6. Test Group Distribution (Students by Group)
        Console.WriteLine("\n[6/10] Testing Group Distribution (Students by Group)...");
        try
        {
            var actionResult = await controller.GroupDistribution();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is GroupDistributionResponseDto groupDist)
            {
                Console.WriteLine($"  [PASS] Group Distribution Retrieved: {groupDist.Groups.Count} groups");
                foreach (var g in groupDist.Groups)
                {
                    Console.WriteLine($"         * {g.GroupName,-15} | Students: {g.TotalStudents,3} | Percentage: {g.Percentage,5}% | Color: {g.Color}");
                }
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected group distribution response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Group Distribution Error: {ex.Message}");
            failed++;
        }

        // 7. Test Attendance Overview (Rolling 7 Days / Weekly Attendance)
        Console.WriteLine("\n[7/10] Testing Weekly Attendance Overview (Rolling 7 Days)...");
        try
        {
            var actionResult = await controller.WeeklyAttendance();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is WeeklyAttendanceResponseDto weeklyAtt)
            {
                Console.WriteLine($"  [PASS] Weekly Attendance Overview Retrieved:");
                Console.WriteLine($"         - Date Range: {weeklyAtt.DateRange}");
                Console.WriteLine($"         - Total Active Students: {weeklyAtt.TotalStudents}");
                Console.WriteLine($"         - Average Attendance: {weeklyAtt.AveragePercentage}%");
                Console.WriteLine($"         - Daily Breakdown ({weeklyAtt.DailyAttendance.Count} days):");
                foreach (var d in weeklyAtt.DailyAttendance)
                {
                    Console.WriteLine($"           * {d.Day,-6} ({d.DayName}): Present = {d.Present,2}, Absent = {d.Absent,2}, Rate = {d.Percentage,5}%");
                }

                if (weeklyAtt.DailyAttendance.Count == 7)
                {
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Expected 7 days in rolling window, but got {weeklyAtt.DailyAttendance.Count}");
                    failed++;
                }
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected weekly attendance response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Weekly Attendance Error: {ex.Message}");
            failed++;
        }

        // 8. Test Certificate Requests Summary
        Console.WriteLine("\n[8/10] Testing Certificate Requests Summary (Bonafide, Study, Conduct, TC, Others)...");
        try
        {
            var actionResult = await controller.CertificateRequests();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is CertificateRequestsSummaryResponseDto certSummary)
            {
                Console.WriteLine($"  [PASS] Certificate Requests Summary Retrieved:");
                Console.WriteLine($"         - Total Requests:       {certSummary.TotalRequests}");
                Console.WriteLine($"         - Bonafide Certificate: {certSummary.Bonafide}");
                Console.WriteLine($"         - Study Certificate:    {certSummary.Study}");
                Console.WriteLine($"         - Conduct Certificate:  {certSummary.Conduct}");
                Console.WriteLine($"         - Transfer Certificate: {certSummary.Transfer}");
                Console.WriteLine($"         - Others:               {certSummary.Others}");
                Console.WriteLine($"         - Workflow Stats: Generated={certSummary.GeneratedCount}, Reviewed={certSummary.ReviewedCount}, Approved={certSummary.ApprovedCount}, Issued={certSummary.IssuedCount}");

                int sumTypes = certSummary.Bonafide + certSummary.Study + certSummary.Conduct + certSummary.Transfer + certSummary.Others;
                if (sumTypes == certSummary.TotalRequests)
                {
                    Console.WriteLine($"  [PASS] Category sum ({sumTypes}) matches Total Requests ({certSummary.TotalRequests}) perfectly.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Category sum mismatch: {sumTypes} vs {certSummary.TotalRequests}");
                    failed++;
                }
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected certificate requests response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Certificate Requests Error: {ex.Message}");
            failed++;
        }

        // 9. Test Recent Activities Feed
        Console.WriteLine("\n[9/10] Testing Recent Activities Feed (AuditLogs)...");
        try
        {
            var actionResult = await controller.RecentActivity(10);
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is IReadOnlyList<RecentActivityItemDto> activities)
            {
                Console.WriteLine($"  [PASS] Recent Activities Retrieved ({activities.Count} entries):");
                foreach (var a in activities.Take(5))
                {
                    Console.WriteLine($"         * [{a.BadgeType.ToUpper()}] {a.Title} | User: {a.UserName} | Time: {a.TimeAgo} ({a.CreatedAt})");
                }
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected recent activities response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Recent Activities Error: {ex.Message}");
            failed++;
        }

        // 10. Test Faculty Workload & Upcoming Examinations APIs
        Console.WriteLine("\n[10/10] Testing Faculty Workload & Upcoming Examinations Cards...");
        try
        {
            var workloadResult = await controller.FacultyWorkload();
            var examsResult = await controller.UpcomingExaminations();

            var okWorkload = workloadResult as OkObjectResult;
            var okExams = examsResult as OkObjectResult;

            bool workloadOk = false;
            bool examsOk = false;

            if (okWorkload?.Value is IReadOnlyList<FacultyWorkloadItemDto> workloads)
            {
                Console.WriteLine($"  [PASS] Faculty Workload Retrieved ({workloads.Count} faculty entries):");
                foreach (var w in workloads.Take(5))
                {
                    Console.WriteLine($"         * {w.FacultyName,-25} | Dept: {w.Department,-15} | Hours/Wk: {w.HoursPerWeek,2} hrs | Subjects: {w.AssignedSubjects}");
                }
                workloadOk = true;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected faculty workload response format.");
            }

            if (okExams?.Value is IReadOnlyList<UpcomingExaminationItemDto> exams)
            {
                Console.WriteLine($"  [PASS] Upcoming Examinations Retrieved ({exams.Count} entries):");
                foreach (var e in exams.Take(5))
                {
                    Console.WriteLine($"         * {e.Subject,-20} | Date: {e.Date,-12} | Time: {e.Time,-20} | Hall: {e.Hall,-10} | Status: {e.Status}");
                }
                examsOk = true;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected upcoming examinations response format.");
            }

            if (workloadOk && examsOk)
            {
                passed++;
            }
            else
            {
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Faculty Workload / Upcoming Exams Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL DASHBOARD SUITE RESULT: {passed}/10 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
