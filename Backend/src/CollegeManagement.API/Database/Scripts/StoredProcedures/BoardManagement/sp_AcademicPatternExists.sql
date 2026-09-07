DROP PROCEDURE IF EXISTS sp_AcademicPatternExists;

CREATE PROCEDURE sp_AcademicPatternExists(
    IN p_AcademicPatternId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM AcademicPatterns 
        WHERE AcademicPatternId = p_AcademicPatternId AND IsActive = 1
    ) AS PatternExists;
END;
