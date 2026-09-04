namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the attendance status of a student.
    /// </summary>
    public enum AttendanceStatus : byte
    {
        /// <summary>
        /// The student is present for the class.
        /// </summary>
        Present = 1,

        /// <summary>
        /// The student is absent for the class.
        /// </summary>
        Absent = 2,

        /// <summary>
        /// The student arrived late for the class.
        /// </summary>
        Late = 3,

        /// <summary>
        /// The student is on approved leave.
        /// </summary>
        Leave = 4
    }
}
