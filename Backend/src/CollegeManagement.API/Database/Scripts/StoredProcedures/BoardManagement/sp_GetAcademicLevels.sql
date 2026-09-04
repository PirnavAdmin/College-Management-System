DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;

CREATE PROCEDURE sp_GetAcademicLevels()
BEGIN
    SELECT AcademicLevelId, LevelCode, LevelName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM AcademicLevels
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, LevelName ASC;
END;
