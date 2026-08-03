using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents the association between a Board and an Academic Level.
    /// </summary>
    [Table("BoardAcademicLevels")]
    public class BoardAcademicLevel
    {
        /// <summary>
        /// Gets or sets the primary key for the BoardAcademicLevel relationship record.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int BoardAcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the foreign key reference to the associated Board.
        /// </summary>
        [Required]
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the foreign key reference to the associated Academic Level.
        /// </summary>
        [Required]
        public int AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the BoardAcademicLevel record is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the BoardAcademicLevel record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time when the BoardAcademicLevel record was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the associated Board navigation property.
        /// </summary>
        [ForeignKey(nameof(BoardId))]
        public virtual Board Board { get; set; } = null!;

        /// <summary>
        /// Gets or sets the associated Academic Level navigation property.
        /// </summary>
        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel AcademicLevel { get; set; } = null!;
    }
}