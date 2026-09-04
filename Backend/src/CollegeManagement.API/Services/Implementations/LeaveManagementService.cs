using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveManagementService : ILeaveManagementService
    {
        private readonly CollegeManagement.API.Data.AppDbContext _context;

        public LeaveManagementService(CollegeManagement.API.Data.AppDbContext context)
        {
            _context = context;
        }

        public async Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId)
        {
            var leave = new CollegeManagement.API.Models.StaffLeaveRequest
            {
                StaffId = request.StaffId,
                LeaveType = request.LeaveType,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Reason = request.Reason,
                DepartmentId = request.DepartmentId,
                AcademicYearId = request.AcademicYearId,
                Status = CollegeManagement.API.Enums.LeaveStatus.Pending,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.StaffLeaveRequests.Add(leave);
            await _context.SaveChangesAsync();

            return await GetStaffLeaveByIdAsync(leave.StaffLeaveRequestId);
        }

        public async Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var leave = await _context.StaffLeaveRequests
                        .FromSqlInterpolated($"SELECT * FROM StaffLeaveRequests WHERE StaffLeaveRequestId = {leaveRequestId} FOR UPDATE")
                        .Include(l => l.Staff)
                        .FirstOrDefaultAsync();
                        
                    if (leave == null) throw new CollegeManagement.API.Exceptions.NotFoundException("Leave request not found");

                    if (leave.Status != CollegeManagement.API.Enums.LeaveStatus.Pending && request.Status != CollegeManagement.API.Enums.LeaveStatus.Pending)
                    {
                        if (leave.Status == request.Status) 
                            throw new CollegeManagement.API.Exceptions.ConflictException($"Leave request is already {leave.Status}.");
                        else
                            throw new CollegeManagement.API.Exceptions.ConflictException($"Leave request was already processed and is now {leave.Status}.");
                    }

                    var oldStatus = leave.Status;
                    leave.Status = request.Status;
                    if (request.Status == CollegeManagement.API.Enums.LeaveStatus.Rejected)
                    {
                        leave.RejectionReason = request.RejectionReason;

                        // Create Audit History for Rejection
                        var userName = _context.Users.Where(u => u.UserId == userId).Select(u => u.FullName).FirstOrDefault() ?? "Admin";
                        _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                        {
                            EntityType = "Staff",
                            EntityId = leave.StaffLeaveRequestId, // using leave ID since no attendance record created
                            FacultyId = leave.StaffId,
                            AttendanceDate = leave.StartDate.Date,
                            OldStatus = null,
                            NewStatus = 0, // Fallback for Rejection
                            Action = "REJECT",
                            Description = "Leave Rejected: " + request.RejectionReason,
                            ModifiedByUserId = userId,
                            ModifiedByUserName = userName,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                                        // Auto-cancel active timetable substitutions if leave is rejected or revoked
                    if (request.Status != CollegeManagement.API.Enums.LeaveStatus.Approved)
                    {
                        var activeSubstitutions = await _context.TimetableSubstitutions
                            .Where(ts => ts.StaffLeaveRequestId == leaveRequestId && ts.Status == "Active")
                            .ToListAsync();

                        foreach (var sub in activeSubstitutions)
                        {
                            sub.Status = "Cancelled";
                            sub.Remarks = (sub.Remarks ?? "") + " | Auto-cancelled due to leave rejection/revocation";
                            sub.UpdatedByUserId = userId;
                            sub.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    leave.ApprovedByUserId = userId;
                    leave.ApprovedAt = DateTime.UtcNow;
                    leave.UpdatedAt = DateTime.UtcNow;

                    // If approved, create or update StaffAttendance for each day in the date range
                    if (request.Status == CollegeManagement.API.Enums.LeaveStatus.Approved && oldStatus != CollegeManagement.API.Enums.LeaveStatus.Approved)
                    {
                        var userName = _context.Users.Where(u => u.UserId == userId).Select(u => u.FullName).FirstOrDefault() ?? "Admin";
                        for (var date = leave.StartDate.Date; date <= leave.EndDate.Date; date = date.AddDays(1))
                        {
                            // Skip Sundays as per existing project convention
                            if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                            var staffType = leave.Staff.StaffType.Equals("Teaching", StringComparison.OrdinalIgnoreCase) 
                                ? CollegeManagement.API.Enums.StaffType.Teaching 
                                : CollegeManagement.API.Enums.StaffType.NonTeaching;

                            // Find or create session
                            var session = await _context.StaffAttendanceSessions
                                .FirstOrDefaultAsync(s => s.AttendanceDate.Date == date && s.StaffType == staffType && s.DepartmentId == leave.Staff.DepartmentId);
                                
                            if (session == null)
                            {
                                session = new CollegeManagement.API.Models.StaffAttendanceSession
                                {
                                    AttendanceDate = date,
                                    StaffType = staffType,
                                    DepartmentId = leave.Staff.DepartmentId,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedByUserId = userId,
                                    IsActive = true
                                };
                                _context.StaffAttendanceSessions.Add(session);
                                await _context.SaveChangesAsync();
                            }

                            var existingAttendance = await _context.StaffAttendances
                                .FirstOrDefaultAsync(a => a.FacultyId == leave.StaffId && a.StaffSessionId == session.StaffSessionId);

                            if (existingAttendance == null)
                            {
                                var newAtt = new CollegeManagement.API.Models.StaffAttendance
                                {
                                    FacultyId = leave.StaffId,
                                    StaffSessionId = session.StaffSessionId,
                                    Status = CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Remarks = "Leave Approved: " + leave.Reason,
                                    VerificationMethod = CollegeManagement.API.Enums.VerificationMethod.Manual,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedByUserId = userId,
                                    IsActive = true
                                };
                                _context.StaffAttendances.Add(newAtt);
                                await _context.SaveChangesAsync();

                                _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                                {
                                    EntityType = "Staff",
                                    EntityId = newAtt.StaffAttendanceId,
                                    FacultyId = leave.StaffId,
                                    AttendanceDate = date,
                                    OldStatus = null,
                                    NewStatus = (byte)CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Action = "CREATE",
                                    Description = "Leave Approved",
                                    ModifiedByUserId = userId,
                                    ModifiedByUserName = userName,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                            else
                            {
                                var oldAttStatus = existingAttendance.Status;
                                existingAttendance.Status = CollegeManagement.API.Enums.AttendanceStatus.Leave;
                                existingAttendance.Remarks = "Leave Approved: " + leave.Reason;
                                existingAttendance.UpdatedAt = DateTime.UtcNow;
                                
                                _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                                {
                                    EntityType = "Staff",
                                    EntityId = existingAttendance.StaffAttendanceId,
                                    FacultyId = leave.StaffId,
                                    AttendanceDate = date,
                                    OldStatus = (byte)oldAttStatus,
                                    NewStatus = (byte)CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Action = "UPDATE",
                                    Description = "Leave Approved",
                                    ModifiedByUserId = userId,
                                    ModifiedByUserName = userName,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return await GetStaffLeaveByIdAsync(leave.StaffLeaveRequestId);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? staffId = null, int? departmentId = null, CollegeManagement.API.Enums.LeaveStatus? status = null)
        {
            var query = _context.StaffLeaveRequests.Where(l => l.IsActive);
            
            if (staffId.HasValue) query = query.Where(l => l.StaffId == staffId);
            if (departmentId.HasValue) query = query.Where(l => l.DepartmentId == departmentId);
            if (status.HasValue) query = query.Where(l => l.Status == status);

            var list = await query
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new StaffLeaveResponse
                {
                    StaffLeaveRequestId = l.StaffLeaveRequestId,
                    StaffId = l.StaffId,
                    StaffName = l.Staff.FirstName + " " + l.Staff.LastName,
                    LeaveType = l.LeaveType,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Reason = l.Reason,
                    Status = l.Status,
                    RejectionReason = l.RejectionReason,
                    ApprovedByUserId = l.ApprovedByUserId,
                    ApprovedByUserName = l.ApprovedByUser != null ? l.ApprovedByUser.FullName : null,
                    ApprovedAt = l.ApprovedAt,
                    CreatedAt = l.CreatedAt
                }).ToListAsync();
                
            return list;
        }

        private async Task<StaffLeaveResponse> GetStaffLeaveByIdAsync(int id)
        {
            var result = await _context.StaffLeaveRequests
                .Where(l => l.StaffLeaveRequestId == id)
                .Select(l => new StaffLeaveResponse
                {
                    StaffLeaveRequestId = l.StaffLeaveRequestId,
                    StaffId = l.StaffId,
                    StaffName = l.Staff.FirstName + " " + l.Staff.LastName,
                    LeaveType = l.LeaveType,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Reason = l.Reason,
                    Status = l.Status,
                    RejectionReason = l.RejectionReason,
                    ApprovedByUserId = l.ApprovedByUserId,
                    ApprovedByUserName = l.ApprovedByUser != null ? l.ApprovedByUser.FullName : null,
                    ApprovedAt = l.ApprovedAt,
                    CreatedAt = l.CreatedAt
                }).FirstOrDefaultAsync();
                
            return result!;
        }
    }
}
