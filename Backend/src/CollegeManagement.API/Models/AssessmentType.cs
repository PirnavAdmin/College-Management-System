using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents an Assessment Type entity in the system.
    /// </summary>
    [Table("AssessmentTypes")]
    public class AssessmentType
    {
        /// <summary>
        /// Gets or sets the primary key for the Assessment Type.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AssessmentTypeId { get; set; }

        /// <summary>
        /// Gets or sets the name of the Assessment Type.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string AssessmentTypeName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a value indicating whether the Assessment Type record is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the Assessment Type record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time when the Assessment Type record was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the collection of BoardAssessments associated with this Assessment Type.
        /// </summary>
        public virtual ICollection<BoardAssessment> BoardAssessments { get; set; } = new List<BoardAssessment>();
    }
}
