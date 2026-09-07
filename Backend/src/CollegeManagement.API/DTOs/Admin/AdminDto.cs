namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
