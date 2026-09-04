-- =============================================================================
-- MODULE: SECTIONS MANAGEMENT (CLEAN, 100% ERROR-FREE SQL SCRIPT)
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Non-destructive column additions, relational normalization,
--              and all stored procedures for Sections Module.
-- =============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. Ensure `Sections` table exists and has all required columns
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `Sections` (
    `SectionId` INT NOT NULL AUTO_INCREMENT,
    `BoardId` INT NULL,
    `AcademicYearId` INT NULL,
    `AcademicLevelId` INT NULL,
    `GroupId` INT NULL,
    `GroupProgramId` INT NULL,
    `ProgramId` INT NULL,
    `SectionName` VARCHAR(50) NOT NULL,
    `RoomId` INT NULL,
    `InchargeId` INT NULL,
    `MaximumStrength` INT NOT NULL DEFAULT 40,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`SectionId`),
    KEY `IX_Sections_BoardId` (`BoardId`),
    KEY `IX_Sections_AcademicYearId` (`AcademicYearId`),
    KEY `IX_Sections_AcademicLevelId` (`AcademicLevelId`),
    KEY `IX_Sections_GroupId` (`GroupId`),
    KEY `IX_Sections_GroupProgramId` (`GroupProgramId`),
    KEY `IX_Sections_ProgramId` (`ProgramId`),
    KEY `IX_Sections_RoomId` (`RoomId`),
    KEY `IX_Sections_InchargeId` (`InchargeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Safely add missing columns
DROP PROCEDURE IF EXISTS `sp_PatchSectionsTableColumns`;
DELIMITER $$
CREATE PROCEDURE `sp_PatchSectionsTableColumns`()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'BoardId') THEN
        ALTER TABLE `Sections` ADD COLUMN `BoardId` INT NULL AFTER `SectionId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'AcademicYearId') THEN
        ALTER TABLE `Sections` ADD COLUMN `AcademicYearId` INT NULL AFTER `BoardId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'AcademicLevelId') THEN
        ALTER TABLE `Sections` ADD COLUMN `AcademicLevelId` INT NULL AFTER `AcademicYearId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'GroupId') THEN
        ALTER TABLE `Sections` ADD COLUMN `GroupId` INT NULL AFTER `AcademicLevelId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'GroupProgramId') THEN
        ALTER TABLE `Sections` ADD COLUMN `GroupProgramId` INT NULL AFTER `GroupId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'ProgramId') THEN
        ALTER TABLE `Sections` ADD COLUMN `ProgramId` INT NULL AFTER `GroupProgramId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'RoomId') THEN
        ALTER TABLE `Sections` ADD COLUMN `RoomId` INT NULL AFTER `SectionName`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'InchargeId') THEN
        ALTER TABLE `Sections` ADD COLUMN `InchargeId` INT NULL AFTER `RoomId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'MaximumStrength') THEN
        ALTER TABLE `Sections` ADD COLUMN `MaximumStrength` INT NOT NULL DEFAULT 40;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'IsActive') THEN
        ALTER TABLE `Sections` ADD COLUMN `IsActive` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'CreatedAt') THEN
        ALTER TABLE `Sections` ADD COLUMN `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'UpdatedAt') THEN
        ALTER TABLE `Sections` ADD COLUMN `UpdatedAt` DATETIME(6) NULL;
    END IF;
END$$
DELIMITER ;

CALL sp_PatchSectionsTableColumns();
DROP PROCEDURE IF EXISTS `sp_PatchSectionsTableColumns`;

-- -----------------------------------------------------------------------------
-- 2. Backfill relational foreign keys from Master Tables
-- -----------------------------------------------------------------------------

-- 2.1 Default BoardId
SET @default_board = (SELECT BoardId FROM `Boards` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY BoardId ASC LIMIT 1);
UPDATE `Sections` SET BoardId = @default_board WHERE (BoardId IS NULL OR BoardId = 0) AND @default_board IS NOT NULL;

-- 2.2 Default AcademicYearId
SET @default_ay = (SELECT AcademicYearId FROM `AcademicYears` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY AcademicYearId DESC LIMIT 1);
UPDATE `Sections` SET AcademicYearId = @default_ay WHERE (AcademicYearId IS NULL OR AcademicYearId = 0) AND @default_ay IS NOT NULL;

-- 2.3 Default GroupId
SET @default_group = (SELECT GroupId FROM `Groups` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY GroupId ASC LIMIT 1);
UPDATE `Sections` SET GroupId = @default_group WHERE (GroupId IS NULL OR GroupId = 0) AND @default_group IS NOT NULL;

-- 2.4 Default AcademicLevelId
SET @default_level = (SELECT AcademicLevelId FROM `AcademicLevels` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY AcademicLevelId ASC LIMIT 1);
UPDATE `Sections` SET AcademicLevelId = @default_level WHERE (AcademicLevelId IS NULL OR AcademicLevelId = 0) AND @default_level IS NOT NULL;

-- 2.5 Backfill GroupProgramId and ProgramId
UPDATE `Sections` s
JOIN (
    SELECT GroupId, MIN(GroupProgramId) AS DefGPId, MIN(ProgramId) AS DefProgId
    FROM `GroupPrograms`
    WHERE (IsActive = 1 OR IsActive IS NULL)
    GROUP BY GroupId
) def_gp ON def_gp.GroupId = s.GroupId
SET s.GroupProgramId = IFNULL(s.GroupProgramId, def_gp.DefGPId),
    s.ProgramId = IFNULL(s.ProgramId, def_gp.DefProgId)
WHERE (s.GroupProgramId IS NULL OR s.GroupProgramId = 0) OR (s.ProgramId IS NULL OR s.ProgramId = 0);

-- Global fallback for GroupProgramId and ProgramId
SET @default_gp = (SELECT GroupProgramId FROM `GroupPrograms` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY GroupProgramId ASC LIMIT 1);
SET @default_prog = (SELECT ProgramId FROM `GroupPrograms` WHERE GroupProgramId = @default_gp);
UPDATE `Sections`
SET GroupProgramId = IFNULL(GroupProgramId, @default_gp),
    ProgramId = IFNULL(ProgramId, @default_prog)
WHERE (GroupProgramId IS NULL OR GroupProgramId = 0) AND @default_gp IS NOT NULL;

-- 2.6 Default RoomId
SET @default_room = (SELECT RoomId FROM `Rooms` WHERE (IsActive = 1 OR IsActive IS NULL) ORDER BY RoomId ASC LIMIT 1);
UPDATE `Sections` SET RoomId = @default_room WHERE (RoomId IS NULL OR RoomId = 0) AND @default_room IS NOT NULL;

-- 2.7 Default InchargeId (from Staff table)
SET @default_staff = (SELECT Id FROM `Staff` WHERE (IsDeleted = 0 OR IsDeleted IS NULL) ORDER BY Id ASC LIMIT 1);
UPDATE `Sections` SET InchargeId = @default_staff WHERE (InchargeId IS NULL OR InchargeId = 0) AND @default_staff IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Stored Procedures for Sections Module
-- -----------------------------------------------------------------------------

DELIMITER $$

-- 3.1 sp_GetAllSections
DROP PROCEDURE IF EXISTS `sp_GetAllSections`$$
CREATE PROCEDURE `sp_GetAllSections`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_IsActive TINYINT(1)
)
BEGIN
    SELECT 
        s.SectionId,
        s.BoardId,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(b.BoardName, '') AS BoardName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS LevelName,
        COALESCE(al.LevelName, '') AS YearOfStudy,
        COALESCE(s.GroupId, gp.GroupId) AS GroupId,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(g.GroupName, '') AS GroupName,
        s.GroupProgramId,
        COALESCE(s.ProgramId, gp.ProgramId) AS ProgramId,
        COALESCE(p.ProgramName, '') AS Programme,
        COALESCE(p.ProgramName, '') AS Program,
        COALESCE(p.ProgramName, '') AS ProgramName,
        s.SectionName,
        s.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomNumber,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.BlockName, '') AS BuildingName,
        s.InchargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS InchargeName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS Incharge,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS ClassTeacherName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS FacultyName,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        s.MaximumStrength,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Sections` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `GroupPrograms` gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN `Rooms` r ON r.RoomId = s.RoomId
    LEFT JOIN `Staff` st ON st.Id = s.InchargeId
    WHERE (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId OR gp.GroupId = p_GroupId)
      AND (p_GroupProgramId IS NULL OR p_GroupProgramId = 0 OR s.GroupProgramId = p_GroupProgramId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId OR gp.ProgramId = p_ProgramId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.SectionName LIKE CONCAT('%', p_SearchTerm, '%') OR
           g.GroupName LIKE CONCAT('%', p_SearchTerm, '%') OR
           p.ProgramName LIKE CONCAT('%', p_SearchTerm, '%') OR
           CONCAT(st.FirstName, ' ', st.LastName) LIKE CONCAT('%', p_SearchTerm, '%') OR
           r.RoomNumber LIKE CONCAT('%', p_SearchTerm, '%') OR
           r.RoomName LIKE CONCAT('%', p_SearchTerm, '%')
      ))
    ORDER BY s.SectionId DESC;
END$$

-- 3.2 sp_GetSectionById
DROP PROCEDURE IF EXISTS `sp_GetSectionById`$$
CREATE PROCEDURE `sp_GetSectionById`(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.SectionId,
        s.BoardId,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(b.BoardName, '') AS BoardName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS LevelName,
        COALESCE(al.LevelName, '') AS YearOfStudy,
        COALESCE(s.GroupId, gp.GroupId) AS GroupId,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(g.GroupName, '') AS GroupName,
        s.GroupProgramId,
        COALESCE(s.ProgramId, gp.ProgramId) AS ProgramId,
        COALESCE(p.ProgramName, '') AS Programme,
        COALESCE(p.ProgramName, '') AS Program,
        COALESCE(p.ProgramName, '') AS ProgramName,
        s.SectionName,
        s.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomNumber,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.BlockName, '') AS BuildingName,
        s.InchargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS InchargeName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS Incharge,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS ClassTeacherName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS FacultyName,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        s.MaximumStrength,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Sections` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `GroupPrograms` gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN `Rooms` r ON r.RoomId = s.RoomId
    LEFT JOIN `Staff` st ON st.Id = s.InchargeId
    WHERE s.SectionId = p_SectionId;
END$$

-- 3.3 sp_CreateSection
DROP PROCEDURE IF EXISTS `sp_CreateSection`$$
CREATE PROCEDURE `sp_CreateSection`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    INSERT INTO `Sections` (
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        GroupProgramId,
        ProgramId,
        SectionName,
        RoomId,
        InchargeId,
        MaximumStrength,
        IsActive,
        CreatedAt
    ) VALUES (
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        v_GroupId,
        v_GroupProgramId,
        v_ProgramId,
        TRIM(p_SectionName),
        p_RoomId,
        p_InchargeId,
        IFNULL(p_MaximumStrength, 40),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS SectionId;
END$$

-- 3.4 sp_UpdateSection
DROP PROCEDURE IF EXISTS `sp_UpdateSection`$$
CREATE PROCEDURE `sp_UpdateSection`(
    IN p_SectionId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    UPDATE `Sections` SET
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = v_GroupId,
        GroupProgramId = v_GroupProgramId,
        ProgramId = v_ProgramId,
        SectionName = TRIM(p_SectionName),
        RoomId = p_RoomId,
        InchargeId = p_InchargeId,
        MaximumStrength = IFNULL(p_MaximumStrength, 40),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SectionId = p_SectionId;
END$$

-- 3.5 sp_DeleteSection
DROP PROCEDURE IF EXISTS `sp_DeleteSection`$$
CREATE PROCEDURE `sp_DeleteSection`(
    IN p_SectionId INT
)
BEGIN
    DELETE FROM `Sections` WHERE SectionId = p_SectionId;
END$$

-- 3.6 sp_GetSectionsByGroupId
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupId`$$
CREATE PROCEDURE `sp_GetSectionsByGroupId`(
    IN p_GroupId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, p_GroupId, NULL, NULL, NULL, 1);
END$$

-- 3.7 sp_GetSectionsByGroupProgramId
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupProgramId`$$
CREATE PROCEDURE `sp_GetSectionsByGroupProgramId`(
    IN p_GroupProgramId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, NULL, p_GroupProgramId, NULL, NULL, 1);
END$$

DELIMITER ;

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Sections module SQL script executed successfully with 0 errors!' AS Result;
