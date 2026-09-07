DROP PROCEDURE IF EXISTS sp_GetGradingSystems;

CREATE PROCEDURE sp_GetGradingSystems()
BEGIN
    SELECT GradingSystemId, GradingSystemCode, GradingSystemName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM GradingSystems
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, GradingSystemName ASC;
END;
