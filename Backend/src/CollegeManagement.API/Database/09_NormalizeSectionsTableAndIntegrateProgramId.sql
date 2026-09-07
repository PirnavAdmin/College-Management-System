-- =============================================================================
-- SECTIONS TABLE: GROUP_PROGRAM_ID & RELATIONAL NORMALIZATION SCRIPT
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- STEP 1: Add Missing Foreign Key Columns (GroupProgramId, ProgramId, AcademicLevelId, etc.)
-- -----------------------------------------------------------------------------

-- 1.1 Add GroupProgramId column
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'GroupProgramId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `GroupProgramId` INT NULL AFTER `GroupId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.2 Add ProgramId column
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'ProgramId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `ProgramId` INT NULL AFTER `GroupProgramId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.3 Add AcademicLevelId column
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'AcademicLevelId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `AcademicLevelId` INT NULL AFTER `AcademicYearId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.4 Ensure BoardId column exists
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'BoardId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `BoardId` INT NULL AFTER `SectionId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.5 Ensure GroupId column exists
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'GroupId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `GroupId` INT NULL AFTER `AcademicLevelId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.6 Ensure RoomId column exists
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'RoomId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `RoomId` INT NULL AFTER `SectionName`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.7 Ensure InchargeId column exists
SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'InchargeId');
SET @sql_cmd = IF(@col_exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `InchargeId` INT NULL AFTER `RoomId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- STEP 2: Backfill Foreign Keys from Master Tables (Zero NULLs)
-- -----------------------------------------------------------------------------

-- 2.1 Backfill BoardId
SET @has_board_col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Board');
SET @sql_b = IF(@has_board_col > 0, 
    'UPDATE `Sections` s JOIN `Boards` b ON LOWER(TRIM(b.BoardName)) = LOWER(TRIM(s.Board)) OR LOWER(TRIM(b.BoardCode)) = LOWER(TRIM(s.Board)) SET s.BoardId = b.BoardId WHERE s.BoardId IS NULL OR s.BoardId = 0;',
    'SELECT 1;');
PREPARE stmt FROM @sql_b; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @default_board = (SELECT BoardId FROM `Boards` WHERE IsActive = 1 ORDER BY BoardId ASC LIMIT 1);
UPDATE `Sections` SET BoardId = @default_board WHERE (BoardId IS NULL OR BoardId = 0) AND @default_board IS NOT NULL;

-- 2.2 Backfill AcademicYearId
SET @default_ay = (SELECT AcademicYearId FROM `AcademicYears` WHERE IsActive = 1 ORDER BY AcademicYearId DESC LIMIT 1);
UPDATE `Sections` SET AcademicYearId = @default_ay WHERE (AcademicYearId IS NULL OR AcademicYearId = 0) AND @default_ay IS NOT NULL;

-- 2.3 Backfill GroupId
SET @has_grp_col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Group');
SET @sql_g = IF(@has_grp_col > 0,
    'UPDATE `Sections` s JOIN `Groups` g ON LOWER(TRIM(g.GroupName)) = LOWER(TRIM(s.`Group`)) OR LOWER(TRIM(g.GroupCode)) = LOWER(TRIM(s.`Group`)) SET s.GroupId = g.GroupId WHERE s.GroupId IS NULL OR s.GroupId = 0;',
    'SELECT 1;');
PREPARE stmt FROM @sql_g; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @default_group = (SELECT GroupId FROM `Groups` WHERE IsActive = 1 ORDER BY GroupId ASC LIMIT 1);
UPDATE `Sections` SET GroupId = @default_group WHERE (GroupId IS NULL OR GroupId = 0) AND @default_group IS NOT NULL;

-- 2.4 Backfill AcademicLevelId from AcademicLevels or Group
SET @has_al_col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'AcademicLevel');
SET @sql_al = IF(@has_al_col > 0,
    'UPDATE `Sections` s JOIN `AcademicLevels` al ON LOWER(TRIM(al.LevelName)) = LOWER(TRIM(s.AcademicLevel)) OR LOWER(TRIM(al.LevelCode)) = LOWER(TRIM(s.AcademicLevel)) SET s.AcademicLevelId = al.AcademicLevelId WHERE s.AcademicLevelId IS NULL OR s.AcademicLevelId = 0;',
    'SELECT 1;');
PREPARE stmt FROM @sql_al; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `Sections` s JOIN `Groups` g ON g.GroupId = s.GroupId SET s.AcademicLevelId = g.AcademicLevelId WHERE (s.AcademicLevelId IS NULL OR s.AcademicLevelId = 0) AND g.AcademicLevelId IS NOT NULL;

SET @default_level = (SELECT AcademicLevelId FROM `AcademicLevels` WHERE IsActive = 1 ORDER BY AcademicLevelId ASC LIMIT 1);
UPDATE `Sections` SET AcademicLevelId = @default_level WHERE (AcademicLevelId IS NULL OR AcademicLevelId = 0) AND @default_level IS NOT NULL;

-- 2.5 Backfill ProgramId
SET @has_prog_col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Programme');
SET @sql_p = IF(@has_prog_col > 0,
    'UPDATE `Sections` s JOIN `Programs` p ON LOWER(TRIM(p.ProgramName)) = LOWER(TRIM(s.Programme)) SET s.ProgramId = p.ProgramId WHERE s.ProgramId IS NULL OR s.ProgramId = 0;',
    'SELECT 1;');
PREPARE stmt FROM @sql_p; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.6 Backfill GroupProgramId from GroupPrograms table
UPDATE `Sections` s
JOIN `GroupPrograms` gp ON gp.GroupId = s.GroupId AND gp.ProgramId = s.ProgramId
SET s.GroupProgramId = gp.GroupProgramId
WHERE s.GroupProgramId IS NULL OR s.GroupProgramId = 0;

-- Fallback GroupProgramId from Group's first active GroupProgram
UPDATE `Sections` s
JOIN (
    SELECT GroupId, MIN(GroupProgramId) AS DefaultGPId, MIN(ProgramId) AS DefaultProgId
    FROM `GroupPrograms`
    WHERE IsActive = 1
    GROUP BY GroupId
) def_gp ON def_gp.GroupId = s.GroupId
SET s.GroupProgramId = def_gp.DefaultGPId,
    s.ProgramId = IFNULL(s.ProgramId, def_gp.DefaultProgId)
WHERE s.GroupProgramId IS NULL OR s.GroupProgramId = 0;

-- Global default GroupProgramId and ProgramId if still NULL
SET @default_gp = (SELECT GroupProgramId FROM `GroupPrograms` WHERE IsActive = 1 ORDER BY GroupProgramId ASC LIMIT 1);
SET @default_prog = (SELECT ProgramId FROM `GroupPrograms` WHERE GroupProgramId = @default_gp);
UPDATE `Sections` 
SET GroupProgramId = @default_gp, 
    ProgramId = IFNULL(ProgramId, @default_prog) 
WHERE (GroupProgramId IS NULL OR GroupProgramId = 0) AND @default_gp IS NOT NULL;

-- 2.7 Backfill RoomId
SET @has_room_col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'RoomNumber');
SET @sql_r = IF(@has_room_col > 0,
    'UPDATE `Sections` s JOIN `Rooms` r ON LOWER(TRIM(r.RoomNumber)) = LOWER(TRIM(s.RoomNumber)) OR LOWER(TRIM(r.RoomName)) = LOWER(TRIM(s.RoomNumber)) SET s.RoomId = r.RoomId WHERE (s.RoomId IS NULL OR s.RoomId = 0) AND s.RoomNumber IS NOT NULL AND s.RoomNumber != "";',
    'SELECT 1;');
PREPARE stmt FROM @sql_r; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @default_room = (SELECT RoomId FROM `Rooms` WHERE IsActive = 1 ORDER BY RoomId ASC LIMIT 1);
UPDATE `Sections` SET RoomId = @default_room WHERE (RoomId IS NULL OR RoomId = 0) AND @default_room IS NOT NULL;

-- 2.8 Backfill InchargeId
SET @has_ct = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'ClassTeacherId');
SET @sql_ct = IF(@has_ct > 0, 'UPDATE `Sections` SET InchargeId = ClassTeacherId WHERE (InchargeId IS NULL OR InchargeId = 0) AND ClassTeacherId IS NOT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql_ct; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @default_staff = (SELECT Id FROM `Staff` WHERE IsDeleted = 0 AND StaffType = 'Teaching' ORDER BY Id ASC LIMIT 1);
UPDATE `Sections` SET InchargeId = @default_staff WHERE (InchargeId IS NULL OR InchargeId = 0) AND @default_staff IS NOT NULL;


-- -----------------------------------------------------------------------------
-- STEP 3: Drop Redundant String Columns
-- -----------------------------------------------------------------------------

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Board');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `Board`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Group');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `Group`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'Programme');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `Programme`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'AcademicLevel');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `AcademicLevel`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'RoomNumber');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `RoomNumber`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Sections' AND column_name = 'ClassTeacherId');
SET @sql_cmd = IF(@col_exist > 0, 'ALTER TABLE `Sections` DROP COLUMN `ClassTeacherId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- STEP 4: Add Indexes (Clean & Safe Dynamic Execution)
-- -----------------------------------------------------------------------------

-- 4.1 Index BoardId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_BoardId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_BoardId` ON `Sections` (`BoardId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.2 Index AcademicYearId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_AcademicYearId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_AcademicYearId` ON `Sections` (`AcademicYearId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.3 Index AcademicLevelId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_AcademicLevelId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_AcademicLevelId` ON `Sections` (`AcademicLevelId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.4 Index GroupId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_GroupId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_GroupId` ON `Sections` (`GroupId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.5 Index GroupProgramId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_GroupProgramId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_GroupProgramId` ON `Sections` (`GroupProgramId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.6 Index ProgramId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_ProgramId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_ProgramId` ON `Sections` (`ProgramId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.7 Index RoomId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_RoomId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_RoomId` ON `Sections` (`RoomId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.8 Index InchargeId
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Sections' AND index_name = 'IX_Sections_InchargeId');
SET @sql_idx = IF(@idx_exist = 0, 'CREATE INDEX `IX_Sections_InchargeId` ON `Sections` (`InchargeId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- STEP 5: Stored Procedures for Section Module
-- -----------------------------------------------------------------------------

-- 5.1 sp_GetAllSections
DROP PROCEDURE IF EXISTS `sp_GetAllSections`;
DELIMITER //
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
    FROM Sections s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN GroupPrograms gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN Rooms r ON r.RoomId = s.RoomId
    LEFT JOIN Staffs st ON st.Id = s.InchargeId
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
END //
DELIMITER ;

-- 5.2 sp_GetSectionById
DROP PROCEDURE IF EXISTS `sp_GetSectionById`;
DELIMITER //
CREATE PROCEDURE `sp_GetSectionById`(IN p_SectionId INT)
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
    FROM Sections s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN GroupPrograms gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN Rooms r ON r.RoomId = s.RoomId
    LEFT JOIN Staffs st ON st.Id = s.InchargeId
    WHERE s.SectionId = p_SectionId;
END //
DELIMITER ;

-- 5.3 sp_CreateSection
DROP PROCEDURE IF EXISTS `sp_CreateSection`;
DELIMITER //
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

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
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
END //
DELIMITER ;

-- 5.4 sp_UpdateSection
DROP PROCEDURE IF EXISTS `sp_UpdateSection`;
DELIMITER //
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

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
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
END //
DELIMITER ;

-- 5.5 sp_DeleteSection
DROP PROCEDURE IF EXISTS `sp_DeleteSection`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteSection`(IN p_SectionId INT)
BEGIN
    DELETE FROM `Sections` WHERE SectionId = p_SectionId;
END //
DELIMITER ;

-- 5.6 sp_GetSectionsByGroupId
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupId`;
DELIMITER //
CREATE PROCEDURE `sp_GetSectionsByGroupId`(IN p_GroupId INT)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, p_GroupId, NULL, NULL, NULL, 1);
END //
DELIMITER ;

-- 5.7 sp_GetSectionsByGroupProgramId
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupProgramId`;
DELIMITER //
CREATE PROCEDURE `sp_GetSectionsByGroupProgramId`(IN p_GroupProgramId INT)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, NULL, p_GroupProgramId, NULL, NULL, 1);
END //
DELIMITER ;

SET SQL_SAFE_UPDATES = 1;
