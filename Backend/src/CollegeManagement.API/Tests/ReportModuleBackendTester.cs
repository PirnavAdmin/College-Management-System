using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class ReportModuleBackendTester
{
    private readonly string _connectionString;

    public ReportModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("     REPORTS & ANALYTICS MODULE BACKEND VERIFICATION & INTEGRATION SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Build EF context & Repository
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var repo = new ReportRepository(dbContext);
        var service = new ReportService(repo);
        var filter = new ReportFilterDto();

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

        // 2. Test Reports Overview / Dashboard (10 Metrics)
        Console.WriteLine("\n[2/10] Testing Reports Dashboard / Overview (10 Metrics)...");
        try
        {
            var dashboard = await service.DashboardAsync(filter);
            Console.WriteLine($"  [PASS] Dashboard Metrics Retrieved:");
            Console.WriteLine($"         - Admissions: {dashboard.Admissions}");
            Console.WriteLine($"         - Attendance: {dashboard.Attendance}%");
            Console.WriteLine($"         - Fee Collection: ₹{dashboard.FeeCollection:N2}");
            Console.WriteLine($"         - Due Fees: ₹{dashboard.DueFees:N2}");
            Console.WriteLine($"         - Examinations: {dashboard.Examinations}");
            Console.WriteLine($"         - Results Published: {dashboard.ResultsPublished}");
            Console.WriteLine($"         - Staff Workload: {dashboard.FacultyWorkload} hrs");
            Console.WriteLine($"         - Student Strength: {dashboard.StudentStrength}");
            Console.WriteLine($"         - Pass Percentage: {dashboard.PassPercentage}%");
            Console.WriteLine($"         - Toppers Identified: {dashboard.ToppersIdentified}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Dashboard Error: {ex.Message}");
            failed++;
        }

        // 3. Test Admissions Details Report
        Console.WriteLine("\n[3/10] Testing Admissions Report (sp_Report_Admissions)...");
        try
        {
            var admissions = await service.AdmissionsAsync(filter);
            Console.WriteLine($"  [PASS] Admissions Report Success. Records: {admissions.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Admissions Report Error: {ex.Message}");
            failed++;
        }

        // 4. Test Student Strength Report
        Console.WriteLine("\n[4/10] Testing Student Strength Report (sp_Report_StudentStrength)...");
        try
        {
            var strength = await service.StudentStrengthAsync(filter);
            Console.WriteLine($"  [PASS] Student Strength Success. Records: {strength.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Student Strength Error: {ex.Message}");
            failed++;
        }

        // 5. Test Attendance & Staff Attendance Reports
        Console.WriteLine("\n[5/10] Testing Attendance & Staff Attendance Reports...");
        try
        {
            var att = await service.AttendanceAsync(filter);
            var staffAtt = await service.FacultyAttendanceAsync(filter);
            Console.WriteLine($"  [PASS] Attendance Records: {att.Count}, Staff Attendance Records: {staffAtt.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Attendance Report Error: {ex.Message}");
            failed++;
        }

        // 6. Test Fee Collection & Due Fees Reports
        Console.WriteLine("\n[6/10] Testing Fee Collection & Outstanding Due Fees Reports...");
        try
        {
            var feeCol = await service.FeeCollectionAsync(filter);
            var dueFees = await service.OutstandingFeesAsync(filter);
            Console.WriteLine($"  [PASS] Fee Collections: {feeCol.Count}, Outstanding Due Accounts: {dueFees.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Fee Reports Error: {ex.Message}");
            failed++;
        }

        // 7. Test Examinations & Results Reports
        Console.WriteLine("\n[7/10] Testing Examinations & Published Results Reports...");
        try
        {
            var exams = await service.ExaminationsAsync(filter);
            var results = await service.ResultsAsync(filter);
            Console.WriteLine($"  [PASS] Exams: {exams.Count}, Results Groups: {results.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Examinations / Results Error: {ex.Message}");
            failed++;
        }

        // 8. Test Pass Percentage & Toppers Leaderboard
        Console.WriteLine("\n[8/10] Testing Pass Percentage & Toppers Leaderboard Reports...");
        try
        {
            var passPerc = await service.PassPercentageAsync(filter);
            var toppers = await service.ToppersAsync(filter);
            Console.WriteLine($"  [PASS] Pass Percentage Records: {passPerc.Count}, Toppers Identified: {toppers.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Toppers / Pass % Error: {ex.Message}");
            failed++;
        }

        // 9. Test Staff Workload Report
        Console.WriteLine("\n[9/10] Testing Staff / Faculty Workload Report...");
        try
        {
            var workload = await service.FacultyWorkloadAsync(filter);
            Console.WriteLine($"  [PASS] Staff Workload Records: {workload.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Staff Workload Error: {ex.Message}");
            failed++;
        }

        // 10. Test PDF & Excel Export Generation
        Console.WriteLine("\n[10/10] Testing PDF & Excel Export Engines (QuestPDF & ClosedXML)...");
        try
        {
            var pdfResult = await service.ExportAsync("dashboard", filter, true);
            var excelResult = await service.ExportAsync("dashboard", filter, false);
            Console.WriteLine($"  [PASS] PDF Export: {pdfResult.FileName} ({pdfResult.Content.Length} bytes)");
            Console.WriteLine($"  [PASS] Excel Export: {excelResult.FileName} ({excelResult.Content.Length} bytes)");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Export Generation Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL REPORT SUITE RESULT: {passed}/10 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
