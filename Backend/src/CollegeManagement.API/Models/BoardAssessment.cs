using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents the mapping between a Board and an Assessment Type.
    /// Stores assessment settings applicable for a specific board.
    /// </summary>
    [Table("BoardAssessments")]
    public class BoardAssessment
    {
        /// <summary>
        /// Gets or sets the unique identifier for the Board Assessment.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int BoardAssessmentId { get; set; }

        /// <summary>
        /// Gets or sets the associated Board identifier.
        /// </summary>
        [Required]
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the associated Assessment Type identifier.
        /// </summary>
        [Required]
        public int AssessmentTypeId { get; set; }

        /// <summary>
        /// Gets or sets the weightage allocated for this assessment.
        /// </summary>
        [Range(0, 100)]
        public decimal Weightage { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this assessment is mandatory.
        /// </summary>
        public bool IsMandatory { get; set; } = false;

        /// <summary>
        /// Gets or sets a value indicating whether this record is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time when the record was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the associated Board.
        /// </summary>
        [ForeignKey(nameof(BoardId))]
        public virtual Board Board { get; set; } = null!;

        /// <summary>
        /// Gets or sets the associated Assessment Type.
        /// </summary>
        [ForeignKey(nameof(AssessmentTypeId))]
        public virtual AssessmentType AssessmentType { get; set; } = null!;
    }
}
