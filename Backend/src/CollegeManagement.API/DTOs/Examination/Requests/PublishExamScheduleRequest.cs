using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class PublishExamScheduleRequest
    {
        public List<int> ScheduleIds { get; set; } = new();
        public bool NotifyStudents { get; set; }
    }
}