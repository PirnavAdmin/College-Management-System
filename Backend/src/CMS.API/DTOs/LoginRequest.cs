namespace CollegeManagement.API.DTOs
{
    public class LoginRequest
    {
        /// <summary>
        /// The role the user is logging in as (e.g., "Super Admin", "Admin", "Teacher", "Student").
        /// </summary>
        /*public required string Role { get; set; }*/
        public required string EmailOrMobile { get; set; }

        public required string Password { get; set; }
    }
}