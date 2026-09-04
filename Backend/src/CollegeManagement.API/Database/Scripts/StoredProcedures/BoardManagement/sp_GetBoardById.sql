DROP PROCEDURE IF EXISTS sp_GetBoardById;

CREATE PROCEDURE sp_GetBoardById(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.InternalAssessment, b.PracticalExams, b.BoardExams, b.PassPercentage, b.RankCalculation, b.IsActive, b.CreatedAt, b.UpdatedAt,
        c.CountryId, c.CountryCode, c.CountryName,
        s.StateId, s.StateCode, s.StateName,
        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
    FROM Boards b
    INNER JOIN Countries c ON b.CountryId = c.CountryId
    LEFT JOIN States s ON b.StateId = s.StateId
    INNER JOIN AcademicPatterns ap ON b.AcademicPatternId = ap.AcademicPatternId
    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
    WHERE b.BoardId = p_BoardId;

    SELECT 
        bal.BoardAcademicLevelId, bal.BoardId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
        al.AcademicLevelId, al.LevelCode, al.LevelName
    FROM BoardAcademicLevels bal
    INNER JOIN AcademicLevels al ON bal.AcademicLevelId = al.AcademicLevelId
    WHERE bal.BoardId = p_BoardId;
END;
