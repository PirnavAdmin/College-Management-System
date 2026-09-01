using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<OTP> OTPs { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<State> States { get; set; }
        public DbSet<AcademicPattern> AcademicPatterns { get; set; }
        public DbSet<AcademicLevel> AcademicLevels { get; set; }
        public DbSet<GradingSystem> GradingSystems { get; set; }
        public DbSet<AssessmentType> AssessmentTypes { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<BoardAcademicLevel> BoardAcademicLevels { get; set; }
        public DbSet<BoardAssessment> BoardAssessments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            #region User
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
            #endregion

            #region Role
            modelBuilder.Entity<Role>()
                .HasIndex(r => r.RoleName)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
            #endregion

            #region Subject
            modelBuilder.Entity<Subject>()
                .HasIndex(s => s.SubjectCode)
                .IsUnique();
            #endregion

            #region Group
            modelBuilder.Entity<Group>()
                .HasKey(g => g.GroupId);

            modelBuilder.Entity<Group>()
                .Property(g => g.Board)
                .HasMaxLength(100)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.AcademicLevel)
                .HasMaxLength(50)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.GroupName)
                .HasMaxLength(100)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.GroupCode)
                .HasMaxLength(30)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.Description)
                .HasMaxLength(500);

            modelBuilder.Entity<Group>()
                .Property(g => g.IsActive)
                .HasDefaultValue(true);

            modelBuilder.Entity<Group>()
                .Property(g => g.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Group>()
                .Property(g => g.UpdatedAt)
                .IsRequired(false);

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.GroupCode)
                .IsUnique();

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.Board);

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.AcademicYearId);

            modelBuilder.Entity<Group>()
                .HasIndex(g => new
                {
                    g.Board,
                    g.AcademicYearId,
                    g.IsActive
                });
            #endregion

            #region Country
            modelBuilder.Entity<Country>(entity =>
            {
                entity.HasKey(c => c.CountryId);

                entity.Property(c => c.CountryCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(c => c.CountryName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(c => c.Description)
                    .HasMaxLength(500);

                entity.Property(c => c.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(c => c.IsActive)
                    .HasDefaultValue(true);

                entity.Property(c => c.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(c => c.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(c => c.CountryCode)
                    .IsUnique();

                entity.HasIndex(c => c.CountryName)
                    .IsUnique();

                entity.HasIndex(c => c.IsActive);
            });
            #endregion

            #region State
            modelBuilder.Entity<State>(entity =>
            {
                entity.HasKey(s => s.StateId);

                entity.Property(s => s.StateCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(s => s.StateName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(s => s.Description)
                    .HasMaxLength(500);

                entity.Property(s => s.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(s => s.IsActive)
                    .HasDefaultValue(true);

                entity.Property(s => s.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(s => s.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(s => s.CountryId);
                entity.HasIndex(s => s.IsActive);

                entity.HasIndex(s => new { s.CountryId, s.StateCode })
                    .IsUnique();

                entity.HasIndex(s => new { s.CountryId, s.StateName })
                    .IsUnique();

                entity.HasOne(s => s.Country)
                    .WithMany(c => c.States)
                    .HasForeignKey(s => s.CountryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region AcademicPattern
            modelBuilder.Entity<AcademicPattern>(entity =>
            {
                entity.HasKey(ap => ap.AcademicPatternId);

                entity.Property(ap => ap.PatternCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(ap => ap.PatternName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(ap => ap.Description)
                    .HasMaxLength(500);

                entity.Property(ap => ap.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(ap => ap.IsActive)
                    .HasDefaultValue(true);

                entity.Property(ap => ap.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(ap => ap.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(ap => ap.PatternCode)
                    .IsUnique();

                entity.HasIndex(ap => ap.PatternName)
                    .IsUnique();
            });
            #endregion

            #region AcademicLevel
            modelBuilder.Entity<AcademicLevel>(entity =>
            {
                entity.HasKey(al => al.AcademicLevelId);

                entity.Property(al => al.LevelCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(al => al.LevelName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(al => al.Description)
                    .HasMaxLength(500);

                entity.Property(al => al.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(al => al.IsActive)
                    .HasDefaultValue(true);

                entity.Property(al => al.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(al => al.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(al => al.LevelCode)
                    .IsUnique();

                entity.HasIndex(al => al.LevelName)
                    .IsUnique();
            });
            #endregion

            #region GradingSystem
            modelBuilder.Entity<GradingSystem>(entity =>
            {
                entity.HasKey(gs => gs.GradingSystemId);

                entity.Property(gs => gs.GradingSystemCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(gs => gs.GradingSystemName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(gs => gs.Description)
                    .HasMaxLength(500);

                entity.Property(gs => gs.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(gs => gs.IsActive)
                    .HasDefaultValue(true);

                entity.Property(gs => gs.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(gs => gs.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(gs => gs.GradingSystemCode)
                    .IsUnique();

                entity.HasIndex(gs => gs.GradingSystemName)
                    .IsUnique();
            });
            #endregion

            #region AssessmentType
            modelBuilder.Entity<AssessmentType>(entity =>
            {
                entity.HasKey(at => at.AssessmentTypeId);

                entity.Property(at => at.AssessmentTypeName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(at => at.IsActive)
                    .HasDefaultValue(true);

                entity.Property(at => at.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(at => at.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(at => at.AssessmentTypeName)
                    .IsUnique();
            });
            #endregion

            #region Board
            modelBuilder.Entity<Board>(entity =>
            {
                entity.HasKey(b => b.BoardId);

                entity.Property(b => b.BoardCode)
                    .IsRequired()
                    .HasMaxLength(30);

                entity.Property(b => b.BoardName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(b => b.BoardType)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(b => b.Description)
                    .HasMaxLength(500);

                entity.Property(b => b.PassPercentage)
                    .HasConversion(
                        v => v ? 1.0m : 0.0m,
                        v => v > 0m)
                    .HasColumnType("decimal(5,2)")
                    .IsRequired();

                entity.Property(b => b.IsActive)
                    .HasDefaultValue(true);

                entity.Property(b => b.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(b => b.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(b => b.BoardCode)
                    .IsUnique();

                entity.HasIndex(b => b.BoardName);
                entity.HasIndex(b => b.CountryId);
                entity.HasIndex(b => b.StateId);
                entity.HasIndex(b => b.AcademicPatternId);
                entity.HasIndex(b => b.GradingSystemId);
                entity.HasIndex(b => b.IsActive);

                entity.HasOne(b => b.Country)
                    .WithMany(c => c.Boards)
                    .HasForeignKey(b => b.CountryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.State)
                    .WithMany(s => s.Boards)
                    .HasForeignKey(b => b.StateId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.AcademicPattern)
                    .WithMany(ap => ap.Boards)
                    .HasForeignKey(b => b.AcademicPatternId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.GradingSystem)
                    .WithMany(gs => gs.Boards)
                    .HasForeignKey(b => b.GradingSystemId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region BoardAcademicLevel
            modelBuilder.Entity<BoardAcademicLevel>(entity =>
            {
                entity.HasKey(bal => bal.BoardAcademicLevelId);

                entity.Property(bal => bal.IsActive)
                    .HasDefaultValue(true);

                entity.Property(bal => bal.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(bal => bal.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(bal => bal.BoardId);
                entity.HasIndex(bal => bal.AcademicLevelId);

                entity.HasIndex(bal => new { bal.BoardId, bal.AcademicLevelId })
                    .IsUnique();

                entity.HasOne(bal => bal.Board)
                    .WithMany(b => b.BoardAcademicLevels)
                    .HasForeignKey(bal => bal.BoardId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(bal => bal.AcademicLevel)
                    .WithMany(al => al.BoardAcademicLevels)
                    .HasForeignKey(bal => bal.AcademicLevelId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            #endregion

            #region BoardAssessment
            modelBuilder.Entity<BoardAssessment>(entity =>
            {
                entity.HasKey(ba => ba.BoardAssessmentId);

                entity.Property(ba => ba.Weightage)
                    .HasColumnType("decimal(5,2)")
                    .IsRequired();

                entity.Property(ba => ba.IsMandatory)
                    .HasDefaultValue(false);

                entity.Property(ba => ba.IsActive)
                    .HasDefaultValue(true);

                entity.Property(ba => ba.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(ba => ba.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(ba => ba.BoardId);
                entity.HasIndex(ba => ba.AssessmentTypeId);
                entity.HasIndex(ba => ba.IsActive);

                entity.HasIndex(ba => new { ba.BoardId, ba.AssessmentTypeId })
                    .IsUnique();

                entity.HasOne(ba => ba.Board)
                    .WithMany()
                    .HasForeignKey(ba => ba.BoardId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(ba => ba.AssessmentType)
                    .WithMany(at => at.BoardAssessments)
                    .HasForeignKey(ba => ba.AssessmentTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            #endregion
        }
    }
}
