DROP PROCEDURE IF EXISTS sp_UpdateResult;

DELIMITER //

CREATE PROCEDURE sp_UpdateResult(
    IN p_ResultId INT,
    IN p_InternalMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_UpdatedAt DATETIME(6)
)
BEGIN

    UPDATE Results
    SET
        InternalMarks = p_InternalMarks,
        PracticalMarks = p_PracticalMarks,
        ExternalMarks = p_ExternalMarks,

        TotalMarks =
            IFNULL(p_InternalMarks, 0)
            + IFNULL(p_PracticalMarks, 0)
            + IFNULL(p_ExternalMarks, 0),

        Grade =
            CASE
                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 90 THEN 'A+'

                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 80 THEN 'A'

                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 70 THEN 'B'

                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 60 THEN 'C'

                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 50 THEN 'D'

                ELSE 'F'
            END,

        ResultStatus =
            CASE
                WHEN (
                    IFNULL(p_InternalMarks, 0)
                    + IFNULL(p_PracticalMarks, 0)
                    + IFNULL(p_ExternalMarks, 0)
                ) >= 35
                THEN 'Pass'
                ELSE 'Fail'
            END,

        UpdatedAt = COALESCE(p_UpdatedAt, UTC_TIMESTAMP())

    WHERE ResultId = p_ResultId
      AND IsPublished = 0;

    SELECT ROW_COUNT() AS AffectedRows;

END //

DELIMITER ;
