using System;

namespace CollegeManagement.API.Models
{
    public class HallTicket
    {
        public int HallTicketId { get; set; }
        public int ExaminationId { get; set; }
        public int StudentId { get; set; }
        public int BatchId { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        public Examination? Examination { get; set; }
        public User? Student { get; set; } // Map to User if Student isn't a standalone model
    }
}