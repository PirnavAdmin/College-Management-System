DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;

CREATE PROCEDURE sp_GetAcademicPatterns()
BEGIN
    SELECT AcademicPatternId, PatternCode, PatternName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM AcademicPatterns
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, PatternName ASC;
END;
