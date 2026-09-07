-- =============================================================================
-- MARKS & EVALUATION MODULE: TABLE SCHEMA & STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. Create Marks table if not exists
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Marks` (
    `MarkId` INT NOT NULL AUTO_INCREMENT,
    `Board` VARCHAR(100) NULL,
    `BoardId` INT NULL,
    `AcademicYearId` INT NOT NULL DEFAULT 1,
    `AcademicLevel` VARCHAR(50) NULL,
    `AcademicLevelId` INT NULL,
    `GroupId` INT NOT NULL DEFAULT 1,
    `SectionId` INT NOT NULL DEFAULT 1,
    `ExaminationId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `RollNo` VARCHAR(50) NULL,
    `StudentName` VARCHAR(150) NULL,
    `FacultyId` INT NULL,
    `InternalMarks` INT NOT NULL DEFAULT 0,
    `PracticalMarks` INT NOT NULL DEFAULT 0,
    `TheoryMarks` INT NOT NULL DEFAULT 0,
    `TotalMarks` INT NOT NULL DEFAULT 0,
    `PassingMarks` INT NOT NULL DEFAULT 35,
    `IsAbsent` TINYINT(1) NOT NULL DEFAULT 0,
    `Remarks` VARCHAR(250) NULL,
    `IsVerified` TINYINT(1) NOT NULL DEFAULT 0,
    `IsPublished` TINYINT(1) NOT NULL DEFAULT 0,
    `Status` INT NOT NULL DEFAULT 1 COMMENT '1=SUBMITTED, 2=VERIFIED, 3=APPROVED, 4=REJECTED',
    `IsLocked` TINYINT(1) NOT NULL DEFAULT 0,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `VerifiedBy` VARCHAR(100) NULL,
    `VerifiedAt` DATETIME(6) NULL,
    `ApprovedBy` INT NULL,
    `ApprovedAt` DATETIME(6) NULL,
    `PublishedAt` DATETIME(6) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`MarkId`),
    KEY `IX_Marks_StudentId` (`StudentId`),
    KEY `IX_Marks_SubjectId` (`SubjectId`),
    KEY `IX_Marks_SectionId` (`SectionId`),
    KEY `IX_Marks_ExaminationId` (`ExaminationId`),
    KEY `IX_Marks_GroupId` (`GroupId`),
    KEY `IX_Marks_AcademicYearId` (`AcademicYearId`),
    KEY `IX_Marks_Status` (`Status`),
    KEY `IX_Marks_CompositeContext` (`SubjectId`, `SectionId`, `ExaminationId`, `IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. Safely add missing columns to Marks table if legacy schema exists
-- -----------------------------------------------------------------------------
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'Board');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `Board` VARCHAR(100) NULL AFTER `MarkId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'BoardId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `BoardId` INT NULL AFTER `Board`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'AcademicYearId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `AcademicYearId` INT NOT NULL DEFAULT 1 AFTER `BoardId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'AcademicLevel');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `AcademicLevel` VARCHAR(50) NULL AFTER `AcademicYearId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'AcademicLevelId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `AcademicLevelId` INT NULL AFTER `AcademicLevel`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'GroupId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `GroupId` INT NOT NULL DEFAULT 1 AFTER `AcademicLevelId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'SectionId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `SectionId` INT NOT NULL DEFAULT 1 AFTER `GroupId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'RollNo');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `RollNo` VARCHAR(50) NULL AFTER `StudentId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'StudentName');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `StudentName` VARCHAR(150) NULL AFTER `RollNo`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'FacultyId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `FacultyId` INT NULL AFTER `StudentName`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'InternalMarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `InternalMarks` INT NOT NULL DEFAULT 0 AFTER `FacultyId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'PracticalMarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `PracticalMarks` INT NOT NULL DEFAULT 0 AFTER `InternalMarks`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'TheoryMarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `TheoryMarks` INT NOT NULL DEFAULT 0 AFTER `PracticalMarks`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'TotalMarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `TotalMarks` INT NOT NULL DEFAULT 0 AFTER `TheoryMarks`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'PassingMarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `PassingMarks` INT NOT NULL DEFAULT 35 AFTER `TotalMarks`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'Status');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `Status` INT NOT NULL DEFAULT 1 AFTER `IsPublished`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'IsLocked');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `IsLocked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `Status`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'VerifiedBy');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `VerifiedBy` VARCHAR(100) NULL AFTER `IsActive`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'VerifiedAt');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `VerifiedAt` DATETIME(6) NULL AFTER `VerifiedBy`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'ApprovedBy');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `ApprovedBy` INT NULL AFTER `VerifiedAt`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marks' AND COLUMN_NAME = 'ApprovedAt');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Marks` ADD COLUMN `ApprovedAt` DATETIME(6) NULL AFTER `ApprovedBy`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- 3. sp_GetAllMarks
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllMarks`;
DELIMITER //
CREATE PROCEDURE `sp_GetAllMarks`()
BEGIN
    SELECT 
        m.MarkId, m.Board, m.BoardId, m.AcademicYearId, m.AcademicLevel, m.AcademicLevelId,
        m.GroupId, m.SectionId, m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName,
        m.FacultyId, m.InternalMarks, m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks,
        m.IsAbsent, m.Remarks, m.IsVerified, m.IsPublished, m.Status, m.IsLocked,
        m.VerifiedBy, m.VerifiedAt, m.ApprovedBy, m.ApprovedAt, m.PublishedAt,
        m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.IsActive = 1 
    ORDER BY m.MarkId DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_GetMarkById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMarkById`;
DELIMITER //
CREATE PROCEDURE `sp_GetMarkById`(IN p_MarkId INT)
BEGIN
    SELECT 
        m.MarkId, m.Board, m.BoardId, m.AcademicYearId, m.AcademicLevel, m.AcademicLevelId,
        m.GroupId, m.SectionId, m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName,
        m.FacultyId, m.InternalMarks, m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks,
        m.IsAbsent, m.Remarks, m.IsVerified, m.IsPublished, m.Status, m.IsLocked,
        m.VerifiedBy, m.VerifiedAt, m.ApprovedBy, m.ApprovedAt, m.PublishedAt,
        m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.MarkId = p_MarkId AND m.IsActive = 1 
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_GetMarksByStudent
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMarksByStudent`;
DELIMITER //
CREATE PROCEDURE `sp_GetMarksByStudent`(IN p_StudentId INT)
BEGIN
    SELECT 
        m.MarkId, m.Board, m.BoardId, m.AcademicYearId, m.AcademicLevel, m.AcademicLevelId,
        m.GroupId, m.SectionId, m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName,
        m.FacultyId, m.InternalMarks, m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks,
        m.IsAbsent, m.Remarks, m.IsVerified, m.IsPublished, m.Status, m.IsLocked,
        m.VerifiedBy, m.VerifiedAt, m.ApprovedBy, m.ApprovedAt, m.PublishedAt,
        m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.StudentId = p_StudentId AND m.IsActive = 1 
    ORDER BY m.ExaminationId, m.SubjectId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_GetMarksBySubject
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMarksBySubject`;
DELIMITER //
CREATE PROCEDURE `sp_GetMarksBySubject`(IN p_SubjectId INT)
BEGIN
    SELECT 
        m.MarkId, m.Board, m.BoardId, m.AcademicYearId, m.AcademicLevel, m.AcademicLevelId,
        m.GroupId, m.SectionId, m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName,
        m.FacultyId, m.InternalMarks, m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks,
        m.IsAbsent, m.Remarks, m.IsVerified, m.IsPublished, m.Status, m.IsLocked,
        m.VerifiedBy, m.VerifiedAt, m.ApprovedBy, m.ApprovedAt, m.PublishedAt,
        m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.SubjectId = p_SubjectId AND m.IsActive = 1 
    ORDER BY m.RollNo;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_GetMarksByExam
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMarksByExam`;
DELIMITER //
CREATE PROCEDURE `sp_GetMarksByExam`(IN p_ExaminationId INT)
BEGIN
    SELECT 
        m.MarkId, m.Board, m.BoardId, m.AcademicYearId, m.AcademicLevel, m.AcademicLevelId,
        m.GroupId, m.SectionId, m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName,
        m.FacultyId, m.InternalMarks, m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks,
        m.IsAbsent, m.Remarks, m.IsVerified, m.IsPublished, m.Status, m.IsLocked,
        m.VerifiedBy, m.VerifiedAt, m.ApprovedBy, m.ApprovedAt, m.PublishedAt,
        m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.ExaminationId = p_ExaminationId AND m.IsActive = 1 
    ORDER BY m.SubjectId, m.RollNo;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_AddMark
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AddMark`;
DELIMITER //
CREATE PROCEDURE `sp_AddMark`(
    IN p_Board VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_RollNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_InternalMarks INT,
    IN p_PracticalMarks INT,
    IN p_TheoryMarks INT,
    IN p_PassingMarks INT,
    IN p_IsAbsent TINYINT(1),
    IN p_Remarks VARCHAR(250)
)
BEGIN
    DECLARE v_TotalMarks INT;
    DECLARE v_MarkId INT;
    
    SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    
    INSERT INTO `Marks` (
        Board, BoardId, AcademicYearId, AcademicLevel, AcademicLevelId, GroupId, SectionId, 
        ExaminationId, SubjectId, StudentId, FacultyId, RollNo, StudentName, 
        InternalMarks, PracticalMarks, TheoryMarks, TotalMarks, PassingMarks, 
        IsAbsent, Remarks, IsVerified, IsPublished, Status, IsLocked, IsActive, CreatedAt
    )
    VALUES (
        p_Board, p_BoardId, p_AcademicYearId, p_AcademicLevel, p_AcademicLevelId, p_GroupId, p_SectionId, 
        p_ExaminationId, p_SubjectId, p_StudentId, p_FacultyId, p_RollNo, p_StudentName, 
        IFNULL(p_InternalMarks, 0), IFNULL(p_PracticalMarks, 0), IFNULL(p_TheoryMarks, 0), 
        v_TotalMarks, IFNULL(p_PassingMarks, 35), 
        IFNULL(p_IsAbsent, 0), p_Remarks, 0, 0, 1, 0, 1, UTC_TIMESTAMP()
    );
    
    SET v_MarkId = LAST_INSERT_ID();
    CALL sp_GetMarkById(v_MarkId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_UpdateMark
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateMark`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateMark`(
    IN p_MarkId INT, 
    IN p_InternalMarks INT, 
    IN p_PracticalMarks INT, 
    IN p_TheoryMarks INT, 
    IN p_PassingMarks INT,
    IN p_IsAbsent TINYINT(1),
    IN p_Remarks VARCHAR(250)
)
BEGIN
    DECLARE v_TotalMarks INT;
    SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    
    UPDATE `Marks`
    SET InternalMarks = IFNULL(p_InternalMarks, 0), 
        PracticalMarks = IFNULL(p_PracticalMarks, 0),
        TheoryMarks = IFNULL(p_TheoryMarks, 0), 
        TotalMarks = v_TotalMarks, 
        PassingMarks = IFNULL(p_PassingMarks, 35),
        IsAbsent = IFNULL(p_IsAbsent, 0),
        Remarks = p_Remarks,
        Status = 1, -- Reset to SUBMITTED on modification
        UpdatedAt = UTC_TIMESTAMP()
    WHERE MarkId = p_MarkId AND IsActive = 1;
    
    CALL sp_GetMarkById(p_MarkId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_DeleteMark & sp_RestoreMark
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteMark`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteMark`(IN p_MarkId INT)
BEGIN
    UPDATE `Marks` SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE MarkId = p_MarkId AND IsActive = 1;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_RestoreMark`;
DELIMITER //
CREATE PROCEDURE `sp_RestoreMark`(IN p_MarkId INT)
BEGIN
    UPDATE `Marks` SET IsActive = 1, UpdatedAt = UTC_TIMESTAMP() WHERE MarkId = p_MarkId;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_VerifyMarks
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_VerifyMarks`;
DELIMITER //
CREATE PROCEDURE `sp_VerifyMarks`(IN p_ExaminationId INT, IN p_SubjectId INT, IN p_SectionId INT, IN p_VerifiedBy VARCHAR(100))
BEGIN
    UPDATE `Marks`
    SET IsVerified = 1, 
        Status = 2, -- VERIFIED
        VerifiedBy = TRIM(p_VerifiedBy), 
        VerifiedAt = UTC_TIMESTAMP(), 
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExaminationId = p_ExaminationId 
      AND (p_SubjectId IS NULL OR SubjectId = p_SubjectId)
      AND (p_SectionId IS NULL OR SectionId = p_SectionId) 
      AND IsActive = 1;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 12. sp_PublishMarks
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PublishMarks`;
DELIMITER //
CREATE PROCEDURE `sp_PublishMarks`(IN p_ExaminationId INT, IN p_SubjectId INT, IN p_SectionId INT)
BEGIN
    UPDATE `Marks`
    SET IsPublished = 1, 
        PublishedAt = UTC_TIMESTAMP(), 
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExaminationId = p_ExaminationId 
      AND (p_SubjectId IS NULL OR SubjectId = p_SubjectId)
      AND (p_SectionId IS NULL OR SectionId = p_SectionId) 
      AND IsActive = 1;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_UpdateEvaluationStatus
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateEvaluationStatus`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateEvaluationStatus`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_TargetStatus INT,
    IN p_UserId INT,
    IN p_Remarks VARCHAR(250)
)
BEGIN
    UPDATE `Marks`
    SET Status = p_TargetStatus,
        Remarks = COALESCE(p_Remarks, Remarks),
        IsVerified = IF(p_TargetStatus = 2, 1, IsVerified),
        VerifiedBy = IF(p_TargetStatus = 2, CAST(p_UserId AS CHAR), VerifiedBy),
        VerifiedAt = IF(p_TargetStatus = 2, UTC_TIMESTAMP(), VerifiedAt),
        ApprovedBy = IF(p_TargetStatus = 3, p_UserId, ApprovedBy),
        ApprovedAt = IF(p_TargetStatus = 3, UTC_TIMESTAMP(), ApprovedAt),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SubjectId = p_SubjectId
      AND (p_SectionId IS NULL OR SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR ExaminationId = p_ExaminationId)
      AND IsActive = 1;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;
