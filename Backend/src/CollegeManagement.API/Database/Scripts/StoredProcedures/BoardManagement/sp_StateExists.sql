DROP PROCEDURE IF EXISTS sp_StateExists;

CREATE PROCEDURE sp_StateExists(
    IN p_StateId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM States 
        WHERE StateId = p_StateId AND IsActive = 1
    ) AS StateExists;
END;
