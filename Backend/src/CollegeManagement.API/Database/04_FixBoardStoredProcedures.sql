-- =============================================================================
-- FIX BOARD MODULE STORED PROCEDURES & COLUMN ALIASES
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. sp_GetGradingSystems
DROP PROCEDURE IF EXISTS sp_GetGradingSystems;
DELIMITER //
CREATE PROCEDURE sp_GetGradingSystems()
BEGIN
    SELECT 
        GradingSystemId, 
        GradingSystemCode, 
        GradingSystemName, 
        Description, 
        DisplayOrder, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM GradingSystems
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END //
DELIMITER ;

-- 2. sp_GetAcademicPatterns
DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;
DELIMITER //
CREATE PROCEDURE sp_GetAcademicPatterns()
BEGIN
    SELECT 
        AcademicPatternId, 
        PatternCode, 
        PatternName, 
        Description, 
        DisplayOrder, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM AcademicPatterns
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END //
DELIMITER ;

-- 3. sp_GetAcademicLevels
DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;
DELIMITER //
CREATE PROCEDURE sp_GetAcademicLevels()
BEGIN
    SELECT 
        AcademicLevelId, 
        LevelCode, 
        LevelName, 
        Description, 
        DisplayOrder, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM AcademicLevels
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END //
DELIMITER ;

-- 4. sp_GetAssessmentTypes
DROP PROCEDURE IF EXISTS sp_GetAssessmentTypes;
DELIMITER //
CREATE PROCEDURE sp_GetAssessmentTypes()
BEGIN
    SELECT 
        AssessmentTypeId, 
        TypeCode, 
        AssessmentTypeName, 
        Description, 
        DisplayOrder, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM AssessmentTypes
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END //
DELIMITER ;
