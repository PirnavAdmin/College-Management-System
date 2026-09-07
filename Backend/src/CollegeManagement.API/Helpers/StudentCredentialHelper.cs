using System;

namespace CollegeManagement.API.Helpers
{
    public static class StudentCredentialHelper
    {
        /// <summary>
        /// Generates the deterministic onboarding initial password for a student based on Date of Birth:
        /// Format: Student@{DOB:ddMMyyyy} (e.g. Student@15082008)
        /// </summary>
        public static string GenerateInitialPassword(DateTime dateOfBirth)
        {
            return $"Student@{dateOfBirth:ddMMyyyy}";
        }

        /// <summary>
        /// Hashes the deterministic initial password using the project's standard BCrypt PasswordHasher.
        /// </summary>
        public static string GenerateInitialPasswordHash(DateTime dateOfBirth)
        {
            var initialPassword = GenerateInitialPassword(dateOfBirth);
            return PasswordHasher.HashPassword(initialPassword);
        }
    }
}
