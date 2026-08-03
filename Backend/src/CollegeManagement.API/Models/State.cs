using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a state in the system.
    /// </summary>
    [Table("States")]
    public class State
    {
        /// <summary>
        /// Gets or sets the unique identifier.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StateId { get; set; }

        /// <summary>
        /// Gets or sets the state code.
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string StateCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the state name.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string StateName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the country identifier.
        /// </summary>
        [Required]
        public int CountryId { get; set; }

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
        /// Gets or sets whether the state is active.
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
        /// Gets or sets the associated country.
        /// </summary>
        [ForeignKey(nameof(CountryId))]
        public virtual Country Country { get; set; } = null!;

        /// <summary>
        /// Gets or sets the boards belonging to this state.
        /// </summary>
        public virtual ICollection<Board> Boards { get; set; } = new List<Board>();
    }
}