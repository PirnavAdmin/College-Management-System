using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models;

[Table("Certificates")]
public class Certificate
{
    [Key]
    public int CertificateId { get; set; }

    [Required]
    [MaxLength(40)]
    public string CertificateNumber { get; set; } = string.Empty;

    [Required]
    public int StudentId { get; set; }

    [Required]
    [MaxLength(30)]
    public string AdmissionNo { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string StudentName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? AcademicLevel { get; set; }

    [MaxLength(50)]
    public string? AcademicYear { get; set; }

    [Required]
    [MaxLength(100)]
    public string CertificateType { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Purpose { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Generated";

    public DateTime GeneratedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? IssuedAt { get; set; }

    [MaxLength(150)]
    public string? IssuedBy { get; set; }

    public bool IsActive { get; set; } = true;

    [ForeignKey(nameof(StudentId))]
    public Student? Student { get; set; }
}