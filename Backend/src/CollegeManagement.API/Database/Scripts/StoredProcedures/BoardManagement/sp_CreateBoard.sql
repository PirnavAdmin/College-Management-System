DROP PROCEDURE IF EXISTS sp_CreateBoard;

CREATE PROCEDURE sp_CreateBoard(
    IN p_BoardName VARCHAR(100),
    IN p_BoardCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_CountryId INT,
    IN p_StateId INT,
    IN p_AcademicPatternId INT,
    IN p_GradingSystemId INT,
    IN p_InternalAssessment BOOLEAN,
    IN p_PracticalExams BOOLEAN,
    IN p_BoardExams BOOLEAN,
    IN p_PassPercentage DECIMAL(5,2),
    IN p_RankCalculation BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_BoardId INT;

    INSERT INTO Boards (
        BoardName, BoardCode, Description, CountryId, StateId, AcademicPatternId, GradingSystemId, 
        InternalAssessment, PracticalExams, BoardExams, PassPercentage, RankCalculation, IsActive, CreatedAt
    ) VALUES (
        p_BoardName, TRIM(p_BoardCode), p_Description, p_CountryId, p_StateId, p_AcademicPatternId, p_GradingSystemId,
        p_InternalAssessment, p_PracticalExams, p_BoardExams, p_PassPercentage, p_RankCalculation, IFNULL(p_IsActive, 1), UTC_TIMESTAMP()
    );
    
    SET v_BoardId = LAST_INSERT_ID();

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
    WHERE b.BoardId = v_BoardId;
END;
