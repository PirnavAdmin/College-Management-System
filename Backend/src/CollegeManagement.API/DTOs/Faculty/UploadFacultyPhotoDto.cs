using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Faculty.Request
{
    public class UploadFacultyPhotoDto
    {
        [Required]
        public int FacultyId { get; set; }

        [Required]
        public IFormFile Photo { get; set; } = null!;
    }
}
