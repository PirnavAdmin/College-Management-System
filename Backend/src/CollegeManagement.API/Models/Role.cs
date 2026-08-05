using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a user role in the college management system (e.g., "Super Admin", "Admin", "Teacher", "Student").
    /// </summary>
    public class Role
    {
        [Key]
        public int RoleId { get; set; }

        /// <summary>
        /// The name of the role. Must be unique.
        /// </summary>
        [Required]
        [StringLength(50)]
        public string RoleName { get; set; } = string.Empty;

        // Navigation Property
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}