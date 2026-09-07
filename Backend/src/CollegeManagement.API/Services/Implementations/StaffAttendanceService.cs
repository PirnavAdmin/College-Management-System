using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffAttendanceService : IStaffAttendanceService
    {
        private readonly IStaffAttendanceRepository _repository;
        private readonly CollegeManagement.API.Data.AppDbContext _context;

        public StaffAttendanceService(IStaffAttendanceRepository repository, CollegeManagement.API.Data.AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<IEnumerable<StaffAttendanceItemResponse>> LoadStaffAttendanceAsync(LoadStaffAttendanceRequest request)
        {
            return await _repository.LoadStaffAttendanceAsync(request);
        }

        public async Task<int> BulkSaveStaffAttendanceAsync(BulkSaveStaffAttendanceRequest request, int? currentUserId)
        {
            if (request.StaffAttendances == null || !request.StaffAttendances.Any())
            {
                throw new ArgumentException("At least one staff attendance record is required to save.");
            }

            return await _repository.BulkSaveStaffAttendanceAsync(request, currentUserId);
        }

        public async Task<bool> UpdateStaffAttendanceAsync(UpdateStaffAttendanceRequest request, int? currentUserId)
        {
            return await _repository.UpdateStaffAttendanceAsync(request, currentUserId);
        }

        public async Task<StaffDetailsResponse?> GetStaffDetailsAsync(int facultyId, DateTime date)
        {
            return await _repository.GetStaffDetailsAsync(facultyId, date);
        }

        public async Task<StaffMonthlyReportResponse> GetStaffMonthlyReportGridAsync(StaffMonthlyReportRequest request)
        {
            return await _repository.GetStaffMonthlyReportGridAsync(request);
        }

        public async Task<byte[]> ExportStaffMonthlyReportToCsvAsync(StaffMonthlyReportRequest request)
        {
            var report = await _repository.GetStaffMonthlyReportGridAsync(request);
            var sb = new StringBuilder();

            // Header line
            var headers = new List<string> { "Employee ID", "Staff Name", "Department" };
            foreach (var h in report.DayHeaders)
            {
                headers.Add($"{h.DayNumber} ({h.DayName})");
            }
            headers.AddRange(new[] { "Present", "Absent", "Late", "Leave", "Percentage" });
            sb.AppendLine(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Rows
            foreach (var row in report.StaffRows)
            {
                var line = new List<string>
                {
                    $"\"{row.EmployeeId}\"",
                    $"\"{row.StaffName}\"",
                    $"\"{row.DepartmentName}\""
                };
                foreach (var st in row.DailyStatus)
                {
                    line.Add($"\"{st}\"");
                }
                line.Add($"\"{row.PresentCount}\"");
                line.Add($"\"{row.AbsentCount}\"");
                line.Add($"\"{row.LateCount}\"");
                line.Add($"\"{row.LeaveCount}\"");
                line.Add($"\"{row.Percentage}%\".");
                sb.AppendLine(string.Join(",", line));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportStaffMonthlyReportToExcelAsync(StaffMonthlyReportRequest request)
        {
            var report = await _repository.GetStaffMonthlyReportGridAsync(request);
            var dataList = new List<Dictionary<string, object>>();

            foreach (var r in report.StaffRows)
            {
                var dict = new Dictionary<string, object>
                {
                    { "Employee ID", r.EmployeeId },
                    { "Staff Name", r.StaffName },
                    { "Department", r.DepartmentName }
                };

                for (int i = 0; i < report.DayHeaders.Count; i++)
                {
                    var dh = report.DayHeaders[i];
                    dict[$"Day {dh.DayNumber} ({dh.DayName})"] = r.DailyStatus.Count > i ? r.DailyStatus[i] : "-";
                }

                dict["Present"] = r.PresentCount;
                dict["Absent"] = r.AbsentCount;
                dict["Late"] = r.LateCount;
                dict["Leave"] = r.LeaveCount;
                dict["Percentage"] = $"{r.Percentage}%";

                dataList.Add(dict);
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Staff Monthly Report");
            return ms.ToArray();
        }

    }
}
