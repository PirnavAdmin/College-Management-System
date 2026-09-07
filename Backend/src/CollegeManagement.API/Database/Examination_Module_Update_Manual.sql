-- ====================================================================================
-- College Management System - Examination Module Database Script
-- SAFE / NON-DESTRUCTIVE - Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- 1. SAFE UPDATE TO Examinations TABLE (Adds missing columns if not present)
SET @dbname = DATABASE();

-- Add ExamCode column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'Examinations'
      AND COLUMN_NAME = 'ExamCode'
  ) > 0,
  'SELECT 1 /* ExamCode already exists */',
  'ALTER TABLE `Examinations` ADD COLUMN `ExamCode` VARCHAR(50) NULL AFTER `ExamId`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add ProgramId column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'Examinations'
      AND COLUMN_NAME = 'ProgramId'
  ) > 0,
  'SELECT 1 /* ProgramId already exists */',
  'ALTER TABLE `Examinations` ADD COLUMN `ProgramId` INT NULL AFTER `GroupId`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add Description column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'Examinations'
      AND COLUMN_NAME = 'Description'
  ) > 0,
  'SELECT 1 /* Description already exists */',
  'ALTER TABLE `Examinations` ADD COLUMN `Description` VARCHAR(500) NULL AFTER `EndDate`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- 2. SAFE UPDATE TO ExamSchedules TABLE (Adds missing columns if not present)

-- Add StartTime column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'StartTime'
  ) > 0,
  'SELECT 1 /* StartTime already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `StartTime` TIME NULL AFTER `ExamDate`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add EndTime column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'EndTime'
  ) > 0,
  'SELECT 1 /* EndTime already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `EndTime` TIME NULL AFTER `StartTime`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add Hall column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'Hall'
  ) > 0,
  'SELECT 1 /* Hall already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `Hall` VARCHAR(100) NULL AFTER `EndTime`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add Invigilator column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'Invigilator'
  ) > 0,
  'SELECT 1 /* Invigilator already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `Invigilator` VARCHAR(150) NULL AFTER `Hall`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add ExamMode column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'ExamMode'
  ) > 0,
  'SELECT 1 /* ExamMode already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `ExamMode` VARCHAR(50) NOT NULL DEFAULT \'Written\' AFTER `Invigilator`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add IsActive column to ExamSchedules if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'IsActive'
  ) > 0,
  'SELECT 1 /* IsActive already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `IsActive` TINYINT(1) NOT NULL DEFAULT 1;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add CreatedAt column to ExamSchedules if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'CreatedAt'
  ) > 0,
  'SELECT 1 /* CreatedAt already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add UpdatedAt column to ExamSchedules if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'UpdatedAt'
  ) > 0,
  'SELECT 1 /* UpdatedAt already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `UpdatedAt` DATETIME(6) NULL;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ====================================================================================
-- 3. STORED PROCEDURE: sp_GetExaminations (Enriched with ExamCode, Program, Level, etc.)
-- ====================================================================================
DROP PROCEDURE IF EXISTS sp_GetExaminations;
DELIMITER //
CREATE PROCEDURE sp_GetExaminations()
BEGIN
    SELECT 
        e.ExamId,
        COALESCE(e.ExamCode, CONCAT('EXM-', YEAR(e.StartDate), '-', LPAD(e.ExamId, 3, '0'))) AS ExamCode,
        e.ExamName,
        e.BoardId,
        b.BoardName,
        e.AcademicYearId,
        ay.AcademicYearName,
        e.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        e.GroupId,
        g.GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, 'All Programs') AS ProgramName,
        e.AssessmentTypeId,
        at.AssessmentTypeName AS ExamType,
        e.StartDate,
        e.EndDate,
        e.Description,
        e.Status,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        (
            SELECT COUNT(*) 
            FROM Subjects s 
            WHERE s.IsActive = 1 
              AND s.BoardId = e.BoardId 
              AND s.AcademicLevelId = e.AcademicLevelId 
              AND s.GroupId = e.GroupId
        ) AS TotalEligibleSubjects,
        (
            SELECT COUNT(*) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.IsActive = 1
    ORDER BY e.ExamId DESC;
END //
DELIMITER ;


-- ====================================================================================
-- 4. STORED PROCEDURE: sp_Report_Examinations (Enriched for Comprehensive Reporting)
-- ====================================================================================
DROP PROCEDURE IF EXISTS sp_Report_Examinations;
DELIMITER //
CREATE PROCEDURE sp_Report_Examinations(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        e.ExamId AS ExaminationId,
        COALESCE(e.ExamCode, CONCAT('EXM-', YEAR(e.StartDate), '-', LPAD(e.ExamId, 3, '0'))) AS ExamCode,
        e.ExamName,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(p.ProgramName, 'All Programs') AS ProgramName,
        COALESCE(at.AssessmentTypeName, 'Standard') AS ExamType,
        DATE_FORMAT(e.StartDate, '%Y-%m-%d') AS StartDate,
        DATE_FORMAT(e.EndDate, '%Y-%m-%d') AS EndDate,
        e.Status,
        (
            SELECT COUNT(*) 
            FROM Subjects sub 
            WHERE sub.IsActive = 1 
              AND sub.BoardId = e.BoardId 
              AND sub.AcademicLevelId = e.AcademicLevelId 
              AND sub.GroupId = e.GroupId
        ) AS TotalEligibleSubjects,
        (
            SELECT COUNT(*) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount,
        (
            SELECT COUNT(*) 
            FROM Students st 
            WHERE st.IsActive = 1 
              AND st.BoardId = e.BoardId 
              AND st.AcademicYearId = e.AcademicYearId 
              AND st.GroupId = e.GroupId
        ) AS TotalEligibleStudents,
        (
            SELECT COUNT(DISTINCT ht.StudentId) 
            FROM HallTickets ht 
            WHERE ht.ExamId = e.ExamId
        ) AS HallTicketsGeneratedCount,
        COUNT(DISTINCT r.ResultId) AS ResultCount,
        COUNT(DISTINCT CASE WHEN r.IsPublished = 1 THEN r.ResultId END) AS PublishedCount,
        COALESCE(ROUND((COUNT(DISTINCT CASE WHEN r.IsPassed = 1 THEN r.ResultId END) * 100.0) / NULLIF(COUNT(DISTINCT r.ResultId), 0), 2), 0) AS PassPercentage
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    LEFT JOIN Results r ON r.ExamId = e.ExamId
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    WHERE e.IsActive = 1
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND (p_FromDate IS NULL OR e.StartDate >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR e.EndDate <= DATE(p_ToDate))
    GROUP BY 
        e.ExamId, e.ExamCode, e.ExamName, b.BoardName, ay.AcademicYearName, 
        al.LevelName, g.GroupName, p.ProgramName, at.AssessmentTypeName, 
        e.StartDate, e.EndDate, e.Status, e.BoardId, e.AcademicLevelId, e.GroupId, e.AcademicYearId
    ORDER BY e.StartDate DESC;
END //
DELIMITER ;
