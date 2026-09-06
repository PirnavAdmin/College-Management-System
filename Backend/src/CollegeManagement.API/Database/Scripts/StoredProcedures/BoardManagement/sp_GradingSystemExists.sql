DROP PROCEDURE IF EXISTS sp_GradingSystemExists;

CREATE PROCEDURE sp_GradingSystemExists(
    IN p_GradingSystemId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM GradingSystems 
        WHERE GradingSystemId = p_GradingSystemId AND IsActive = 1
    ) AS SystemExists;
END;
