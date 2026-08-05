using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents an Academic Level in the system.
    /// </summary>
    [Table("AcademicLevels")]
    public class AcademicLevel
    {
        /// <summary>
        /// Gets or sets the unique identifier of the academic level.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the academic level code.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string LevelCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the academic level name.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string LevelName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the description.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets the display order.
        /// </summary>
        public int DisplayOrder { get; set; } = 1;

        /// <summary>
        /// Gets or sets whether the academic level is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the record creation date.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the last updated date.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the board mappings.
        /// </summary>
        public virtual ICollection<BoardAcademicLevel> BoardAcademicLevels { get; set; }
            = new List<BoardAcademicLevel>();
    }
}