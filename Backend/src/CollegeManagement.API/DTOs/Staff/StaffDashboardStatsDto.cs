using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffDashboardStatsDto
    {
        public int TotalStaff { get; set; }
        public int TeachingStaff { get; set; }
        public int NonTeachingStaff { get; set; }
        public int PendingProfileCompletion { get; set; }
        public int CompletedProfiles { get; set; }

        // Breakdown for Profile Completion Overview chart
        public int Completed { get; set; }
        public int Pending { get; set; }
        public int InProgress { get; set; }
        public int NeedsCorrection { get; set; }
        public int Submitted { get; set; }
    }
}
