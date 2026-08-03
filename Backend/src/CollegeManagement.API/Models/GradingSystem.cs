using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a grading system used by boards.
    /// </summary>
    [Table("GradingSystems")]
    public class GradingSystem
    {
        /// <summary>
        /// Gets or sets the unique identifier of the grading system.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int GradingSystemId { get; set; }

        /// <summary>
        /// Gets or sets the grading system code.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string GradingSystemCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the grading system name.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string GradingSystemName { get; set; } = string.Empty;

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
        /// Gets or sets whether the grading system is active.
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
        /// Gets or sets the boards using this grading system.
        /// </summary>
        public virtual ICollection<Board> Boards { get; set; } = new List<Board>();
    }
}