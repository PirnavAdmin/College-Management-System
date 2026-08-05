namespace CollegeManagement.API.Models.BaseEntity
{
    public abstract class BaseEntity
    {
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
