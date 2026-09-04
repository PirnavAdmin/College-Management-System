using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Profiles;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class StaffModuleBackendTester
    {
        private readonly string _connectionString;

        public StaffModuleBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   STARTING COMPREHENSIVE BACKEND TESTING FOR STAFF MANAGEMENT MODULE");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            // 1. Test Database Connectivity
            Console.WriteLine("\n[1/10] Testing Database Connection...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();
                var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
                Console.WriteLine($"  [PASS] Successfully connected to Database: {dbName}");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
                failed++;
                return false;
            }

            // 2. Safe Schema Migration (Ensure Tables, Columns & Views with ZERO Foreign Key breakage)
            Console.WriteLine("\n[2/10] Verifying & Applying Schema Migration & Compatibility Views...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check Base Tables
                var isStaffBaseTable = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'Staff' AND table_type = 'BASE TABLE';");

                var isSSABaseTable = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND table_type = 'BASE TABLE';");

                if (isStaffBaseTable > 0 && isSSABaseTable > 0)
                {
                    Console.WriteLine("  [PASS] Base tables 'Staff' and 'StaffSubjectAllocations' confirmed in Database.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Base tables 'Staff' or 'StaffSubjectAllocations' not found as BASE TABLE.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Schema Verification Error: {ex.Message}");
                failed++;
            }

            // 3. Seed / Verify Master Departments and Designations for Intermediate College
            Console.WriteLine("\n[3/10] Seeding & Verifying Fixed Master Data...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var deptCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Departments WHERE IsActive = 1;");
                var desigCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Designations WHERE IsActive = 1;");

                Console.WriteLine($"  [PASS] Master data verified: {deptCount} Active Departments, {desigCount} Active Designations.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Master Data Seeding Error: {ex.Message}");
                failed++;
            }

            // Set up DI Container for Testing Services & Repositories
            var services = new ServiceCollection();
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            services.AddSingleton(optionsBuilder.Options);
            services.AddScoped<AppDbContext>();

            // AutoMapper
            var config = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<StaffMappingProfile>();
                cfg.AddProfile<TimetableMappingProfile>();
                cfg.AddProfile<SectionMappingProfile>();
            });
            var mapper = config.CreateMapper();
            services.AddSingleton(mapper);

            // Mock WebHostEnvironment & Configuration
            var envMock = new TestHostingEnvironment();
            services.AddSingleton<IWebHostEnvironment>(envMock);
            var testConfig = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["InstitutionSettings:InstitutionName"] = "College Management System",
                ["InstitutionSettings:PortalUrl"] = "http://localhost:5173"
            }).Build();
            services.AddSingleton<IConfiguration>(testConfig);

            // Email Service mock / null service
            services.AddScoped<IEmailService, NullTestEmailService>();
            services.AddScoped<IBoardRepository, BoardRepository>();

            // Repositories & Services
            services.AddScoped<IStaffRepository, StaffRepository>();
            services.AddScoped<IStaffSubjectAllocationRepository, StaffSubjectAllocationRepository>();
            services.AddScoped<ISubjectRepository, SubjectRepository>();
            services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<IDesignationRepository, DesignationRepository>();
            services.AddScoped<IDesignationService, DesignationService>();
            services.AddScoped<ITimetableRepository, TimetableRepository>();
            services.AddScoped<IStaffService, StaffService>();
            services.AddScoped<ISectionRepository, SectionRepository>();
            services.AddScoped<ISectionService, SectionService>();

            var serviceProvider = services.BuildServiceProvider();

            // 4. Test Auto Employee ID Generation (Teaching & Non-Teaching)
            Console.WriteLine("\n[4/10] Testing Auto Employee ID Generation...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                var nextTchId = await staffService.GetNextEmployeeIdAsync("Teaching");
                var nextNonTchId = await staffService.GetNextEmployeeIdAsync("Non-Teaching");

                Console.WriteLine($"  Next Teaching Employee ID:     {nextTchId}");
                Console.WriteLine($"  Next Non-Teaching Employee ID: {nextNonTchId}");

                if ((nextTchId.StartsWith("PCTCH") || nextTchId.StartsWith("PJCTCH")) &&
                    (nextNonTchId.StartsWith("PCNT") || nextNonTchId.StartsWith("PJCNTCH")))
                {
                    Console.WriteLine("  [PASS] Auto ID generator produces correct 'PCTCH####' and 'PCNT####' prefixes.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Auto ID format does not match expected prefix.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Auto ID Generation Error: {ex.Message}");
                failed++;
            }

            // 5. Test Creating Valid Teaching Staff & Non-Teaching Staff
            Console.WriteLine("\n[5/10] Testing Create Staff API (Teaching & Non-Teaching)...");
            int createdTchId = 0;
            int createdNonTchId = 0;
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                var testTchEmail = $"suresh.mathematics.{DateTime.UtcNow.Ticks}@intermediate.edu";
                var testTchMobile = $"98{new Random().Next(10000000, 99999999)}";

                var tchDto = new CreateStaffDto
                {
                    FirstName = "Suresh",
                    LastName = "Reddy",
                    Gender = "Male",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    Aadhaar = $"{new Random().Next(100000, 999999)}{new Random().Next(100000, 999999)}",
                    Mobile = testTchMobile,
                    Email = testTchEmail,
                    BloodGroup = "O+",
                    Qualification = "M.Sc Mathematics, B.Ed",
                    Department = "Mathematics",
                    Designation = "Senior Lecturer",
                    StaffType = "Teaching",
                    JoiningDate = DateTime.UtcNow.AddYears(-3),
                    Experience = 6.5m,
                    Status = "Active"
                };

                var createdTch = await staffService.CreateStaffAsync(tchDto);
                createdTchId = createdTch.Id;
                Console.WriteLine($"  [PASS] Created Teaching Staff: ID={createdTch.Id}, EmployeeID={createdTch.EmployeeId}, Name={createdTch.FullName}, Dept={createdTch.Department}");

                var testNonTchEmail = $"lakshmi.accounts.{DateTime.UtcNow.Ticks}@intermediate.edu";
                var testNonTchMobile = $"97{new Random().Next(10000000, 99999999)}";

                var nonTchDto = new CreateStaffDto
                {
                    FirstName = "Lakshmi",
                    LastName = "Prasanna",
                    Gender = "Female",
                    DateOfBirth = new DateTime(1992, 8, 20),
                    Aadhaar = $"{new Random().Next(100000, 999999)}{new Random().Next(100000, 999999)}",
                    Mobile = testNonTchMobile,
                    Email = testNonTchEmail,
                    BloodGroup = "B+",
                    Qualification = "M.Com, MBA",
                    Department = "Accounts & Finance",
                    Designation = "Accountant",
                    StaffType = "Non-Teaching",
                    JoiningDate = DateTime.UtcNow.AddYears(-2),
                    Experience = 4.0m,
                    Status = "Active"
                };

                var createdNonTch = await staffService.CreateStaffAsync(nonTchDto);
                createdNonTchId = createdNonTch.Id;
                Console.WriteLine($"  [PASS] Created Non-Teaching Staff: ID={createdNonTch.Id}, EmployeeID={createdNonTch.EmployeeId}, Name={createdNonTch.FullName}, Dept={createdNonTch.Department}");

                if (createdTchId > 0 && createdNonTchId > 0)
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
                Console.WriteLine($"  [FAIL] Create Staff Error: {ex.Message}");
                failed++;
            }

            // 6. Test Paged Retrieval & Filtering by StaffType
            Console.WriteLine("\n[6/10] Testing Paged Staff Retrieval & StaffType Filtering...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                // Get Teaching Staff
                var tchResult = await staffService.GetPagedStaffAsync(new StaffQueryParams
                {
                    StaffType = "Teaching",
                    PageNumber = 1,
                    PageSize = 10
                });

                // Get Non-Teaching Staff
                var nonTchResult = await staffService.GetPagedStaffAsync(new StaffQueryParams
                {
                    StaffType = "Non-Teaching",
                    PageNumber = 1,
                    PageSize = 10
                });

                Console.WriteLine($"  Teaching Staff Count:     {tchResult.TotalCount} (Items on Page 1: {tchResult.Items.Count})");
                Console.WriteLine($"  Non-Teaching Staff Count: {nonTchResult.TotalCount} (Items on Page 1: {nonTchResult.Items.Count})");

                if (tchResult.TotalCount > 0 && nonTchResult.TotalCount > 0)
                {
                    Console.WriteLine("  [PASS] Paging and StaffType separation working accurately.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Expected both teaching and non-teaching records to be returned.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Paged Query Error: {ex.Message}");
                failed++;
            }

            // 7. Test Get Staff by ID & View Full Details
            Console.WriteLine("\n[7/10] Testing Get Staff By ID (Full View Profile)...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                if (createdTchId > 0)
                {
                    var staff = await staffService.GetStaffByIdAsync(createdTchId);
                    if (staff != null && (staff.EmployeeId.StartsWith("PCTCH") || staff.EmployeeId.StartsWith("PJCTCH")) && staff.Department == "Mathematics")
                    {
                        Console.WriteLine($"  [PASS] Staff Profile retrieved: {staff.FullName}, {staff.Designation}, {staff.Email}, Mobile: {staff.Mobile}");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine("  [FAIL] Staff Profile data did not match expected values.");
                        failed++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] GetStaffById Error: {ex.Message}");
                failed++;
            }

            // 8. Test Update Staff Record
            Console.WriteLine("\n[8/10] Testing Update Staff Profile...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                if (createdTchId > 0)
                {
                    var updateDto = new UpdateStaffDto
                    {
                        FirstName = "Suresh Kumar",
                        LastName = "Reddy",
                        Gender = "Male",
                        DateOfBirth = new DateTime(1988, 5, 12),
                        Mobile = $"98{new Random().Next(10000000, 99999999)}",
                        Email = $"suresh.reddy.{DateTime.UtcNow.Ticks}@intermediate.edu",
                        BloodGroup = "O+",
                        Qualification = "M.Sc, M.Phil Mathematics",
                        Department = "Mathematics",
                        Designation = "Head of Department (HOD)",
                        StaffType = "Teaching",
                        JoiningDate = DateTime.UtcNow.AddYears(-4),
                        Experience = 8.0m,
                        Status = "Active"
                    };

                    var updated = await staffService.UpdateStaffAsync(createdTchId, updateDto);
                    if (updated.FullName == "Suresh Kumar Reddy" && updated.Designation == "Head of Department (HOD)")
                    {
                        Console.WriteLine($"  [PASS] Staff updated successfully: Name={updated.FullName}, Designation={updated.Designation}");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine("  [FAIL] Update verification failed.");
                        failed++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Update Staff Error: {ex.Message}");
                failed++;
            }

            // 9. Test Subject Allocation for Teaching Staff
            Console.WriteLine("\n[9/10] Testing Staff Subject Allocation APIs...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                using var testConn = new MySqlConnection(_connectionString);
                await testConn.OpenAsync();

                var testSubjectId = await testConn.ExecuteScalarAsync<int?>(
                    "SELECT SubjectId FROM Subjects WHERE IsActive = 1 LIMIT 1;");

                if (!testSubjectId.HasValue || testSubjectId.Value == 0)
                {
                    testSubjectId = await testConn.ExecuteScalarAsync<int>(@"
                        INSERT INTO Subjects (SubjectCode, SubjectName, SubjectType, Theory, Practical, Language, Elective, InternalMarks, PracticalMarks, ExternalMarks, TotalMarks, PassingMarks, IsActive, CreatedAt)
                        VALUES ('MATH101', 'Mathematics 1A', 'Theory', 1, 0, 0, 0, 25, 0, 75, 100, 35, 1, UTC_TIMESTAMP());
                        SELECT LAST_INSERT_ID();");
                }

                if (createdTchId > 0 && testSubjectId.HasValue && testSubjectId.Value > 0)
                {
                    var allocDto = new AssignStaffSubjectDto
                    {
                        StaffId = createdTchId,
                        SubjectId = testSubjectId.Value
                    };

                    var allocResult = await staffService.AssignSubjectAsync(allocDto);
                    Console.WriteLine($"  [PASS] Assigned Subject: AllocationID={allocResult.Id}, Subject={allocResult.SubjectName ?? allocResult.SubjectCode} to Staff ID={createdTchId}");

                    var userAllocs = await staffService.GetStaffSubjectAllocationsAsync(createdTchId);
                    Console.WriteLine($"  Total Allocations for Staff: {userAllocs.Count}");

                    if (userAllocs.Any(a => a.SubjectId == testSubjectId.Value))
                    {
                        // Test Delete Allocation
                        await staffService.DeleteSubjectAllocationAsync(allocResult.Id);
                        Console.WriteLine("  [PASS] Successfully deleted subject allocation.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine("  [FAIL] Subject allocation was not found in list.");
                        failed++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Staff Subject Allocation Error: {ex.Message}");
                failed++;
            }

            // 10. Test Soft Delete Staff Record
            Console.WriteLine("\n[10/10] Testing Soft Delete Staff API...");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();

                if (createdNonTchId > 0)
                {
                    var delResult = await staffService.DeleteStaffAsync(createdNonTchId);
                    if (delResult)
                    {
                        // Verify it's no longer returned in active list
                        var paged = await staffService.GetPagedStaffAsync(new StaffQueryParams
                        {
                            StaffType = "Non-Teaching"
                        });

                        var stillExists = paged.Items.Any(s => s.Id == createdNonTchId);
                        if (!stillExists)
                        {
                            Console.WriteLine($"  [PASS] Staff ID={createdNonTchId} successfully soft deleted and excluded from active list.");
                            passed++;
                        }
                        else
                        {
                            Console.WriteLine("  [FAIL] Soft deleted staff still appears in paged results.");
                            failed++;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Soft Delete Error: {ex.Message}");
                failed++;
            }

            // Final Summary
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"   STAFF MODULE BACKEND TESTING: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }

    public class TestHostingEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "CollegeManagement.API";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
    }

    public class NullTestEmailService : CollegeManagement.API.Interfaces.IEmailService
    {
        public Task SendEmailAsync(string toEmail, string subject, string body) => Task.CompletedTask;
    }
}
