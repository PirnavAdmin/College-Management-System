DROP PROCEDURE IF EXISTS sp_ValidateBoardCode;

CREATE PROCEDURE sp_ValidateBoardCode(
    IN p_BoardCode VARCHAR(30),
    IN p_ExcludeBoardId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM Boards 
        WHERE BoardCode = TRIM(p_BoardCode)
          AND (p_ExcludeBoardId IS NULL OR BoardId <> p_ExcludeBoardId)
    ) AS CodeExists;
END;
