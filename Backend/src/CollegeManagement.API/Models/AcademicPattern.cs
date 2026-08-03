using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents an academic pattern in the system.
    /// </summary>
    [Table("AcademicPatterns")]
    public class AcademicPattern
    {
        /// <summary>
        /// Gets or sets the unique identifier.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AcademicPatternId { get; set; }

        /// <summary>
        /// Gets or sets the academic pattern code.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string PatternCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the academic pattern name.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string PatternName { get; set; } = string.Empty;

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
        /// Gets or sets whether the academic pattern is active.
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
        /// Gets or sets the boards using this academic pattern.
        /// </summary>
        public virtual ICollection<Board> Boards { get; set; }
            = new List<Board>();
    }
}