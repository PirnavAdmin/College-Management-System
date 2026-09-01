using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a Board in the College Management System.
    /// </summary>
    [Table("Boards")]
    public class Board
    {
        /// <summary>
        /// Gets or sets the unique identifier of the board.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the unique board code.
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string BoardCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the board name.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string BoardName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string BoardType { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the board description.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets the country identifier.
        /// </summary>
        [Required]
        public int CountryId { get; set; }

        /// <summary>
        /// Gets or sets the state identifier.
        /// </summary>
        public int? StateId { get; set; }

        /// <summary>
        /// Gets or sets the academic pattern identifier.
        /// </summary>
        [Required]
        public int AcademicPatternId { get; set; }

        /// <summary>
        /// Gets or sets the grading system identifier.
        /// </summary>
        [Required]
        public int GradingSystemId { get; set; }

        /// <summary>
        /// Gets or sets the internal assessment details.
        /// </summary>
       
        public bool InternalAssessment { get; set; }

        /// <summary>
        /// Gets or sets the practical exam details.
        /// </summary>
        
        public bool PracticalExams { get; set; }

        /// <summary>
        /// Gets or sets the board exam details.
        /// </summary>
       
        public bool BoardExams { get; set; }

        /// <summary>
        /// Gets or sets the minimum pass percentage.
        /// </summary>
       
        public bool PassPercentage { get; set; }

        /// <summary>
        /// Gets or sets the rank calculation details.
        /// </summary>
        [MaxLength(100)]
        public bool RankCalculation { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the board is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the created date.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the updated date.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties

        [ForeignKey(nameof(CountryId))]
        public virtual Country Country { get; set; } = null!;

        [ForeignKey(nameof(StateId))]
        public virtual State? State { get; set; }

        [ForeignKey(nameof(AcademicPatternId))]
        public virtual AcademicPattern AcademicPattern { get; set; } = null!;

        [ForeignKey(nameof(GradingSystemId))]
        public virtual GradingSystem GradingSystem { get; set; } = null!;

        /// <summary>
        /// Gets or sets the academic levels mapped to the board.
        /// </summary>
        public virtual ICollection<BoardAcademicLevel> BoardAcademicLevels { get; set; }
            = new List<BoardAcademicLevel>();
    }
}
