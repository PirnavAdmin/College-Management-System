DROP PROCEDURE IF EXISTS sp_ChangeBoardStatus;

CREATE PROCEDURE sp_ChangeBoardStatus(
    IN p_BoardId INT,
    IN p_ExpectedVersion INT,
    IN p_Status BOOLEAN,
    OUT p_AffectedRows INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Boards WHERE BoardId = p_BoardId) THEN
        SET p_AffectedRows = -1;
    ELSE
        UPDATE Boards
        SET IsActive = p_Status,
            RowVersion = RowVersion + 1,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE BoardId = p_BoardId AND RowVersion = p_ExpectedVersion;

        SET p_AffectedRows = ROW_COUNT();
    END IF;
END;
