DROP PROCEDURE IF EXISTS sp_AcademicLevelExists;

CREATE PROCEDURE sp_AcademicLevelExists(
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM AcademicLevels 
        WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1
    ) AS LevelExists;
END;
