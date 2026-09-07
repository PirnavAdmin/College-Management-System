
DROP PROCEDURE IF EXISTS sp_RequestRevaluation;

DELIMITER //

CREATE PROCEDURE sp_RequestRevaluation(
    IN p_ResultId INT,
    IN p_StudentId INT,
    IN p_SubjectId INT,
    IN p_Reason VARCHAR(500)
)
BEGIN

    DECLARE v_OldMarks DECIMAL(5,2);
    DECLARE v_IsPublished TINYINT DEFAULT 0;

    /*
    ==========================================
    Get result
    ==========================================
    */

    SELECT
        TotalMarks,
        IsPublished

    INTO
        v_OldMarks,
        v_IsPublished

    FROM Results

    WHERE ResultId = p_ResultId
      AND StudentId = p_StudentId
      AND SubjectId = p_SubjectId

    LIMIT 1;


    IF v_OldMarks IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Result not found for student and subject';

    END IF;


    /*
    ==========================================
    Revaluation allowed only after publishing
    ==========================================
    */

    IF v_IsPublished <> 1 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Revaluation is allowed only for published results';

    END IF;


    /*
    ==========================================
    Prevent duplicate pending request
    ==========================================
    */

    IF EXISTS
    (
        SELECT 1
        FROM Revaluations

        WHERE ResultId = p_ResultId
          AND StudentId = p_StudentId
          AND SubjectId = p_SubjectId
          AND Status = 'Pending'
    )
    THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'A pending revaluation request already exists';

    END IF;


    /*
    ==========================================
    Insert request
    ==========================================
    */

    INSERT INTO Revaluations
    (
        ResultId,
        StudentId,
        SubjectId,
        Reason,
        Status,
        RequestedDate,
        OldMarks,
        NewMarks,
        FeePaid,
        CreatedAt
    )

    VALUES
    (
        p_ResultId,
        p_StudentId,
        p_SubjectId,
        p_Reason,
        'Pending',
        UTC_TIMESTAMP(6),
        v_OldMarks,
        NULL,
        0,
        UTC_TIMESTAMP(6)
    );


    SELECT
        LAST_INSERT_ID() AS RevaluationId;

END //

DELIMITER ;