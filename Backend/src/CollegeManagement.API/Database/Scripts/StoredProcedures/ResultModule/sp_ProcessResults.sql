DROP PROCEDURE IF EXISTS sp_ProcessResults;

DELIMITER //

CREATE PROCEDURE sp_ProcessResults(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_PublishDate DATETIME(6)
)
BEGIN

    DECLARE v_PublishDate DATETIME(6);

    DECLARE v_MarksCount INT DEFAULT 0;
    DECLARE v_VerifiedCount INT DEFAULT 0;
    DECLARE v_PendingCount INT DEFAULT 0;
    DECLARE v_UpdatedCount INT DEFAULT 0;
    DECLARE v_InsertedCount INT DEFAULT 0;

    /*
    ============================================================
    1. Process date
    ============================================================
    */

    SET v_PublishDate = COALESCE(
        p_PublishDate,
        UTC_TIMESTAMP(6)
    );


    /*
    ============================================================
    2. Validate input parameters
    ============================================================
    */

    IF p_BoardId IS NULL OR p_BoardId <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid BoardId';

    END IF;


    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicYearId';

    END IF;


    IF p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicLevelId';

    END IF;


    IF p_GroupId IS NULL OR p_GroupId <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid GroupId';

    END IF;


    IF p_ExamId IS NULL OR p_ExamId <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid ExamId';

    END IF;


    /*
    ============================================================
    3. Check whether Marks exist
    ============================================================
    */

    SELECT COUNT(*)
    INTO v_MarksCount

    FROM Marks m

    WHERE m.BoardId = p_BoardId
      AND m.AcademicYearId = p_AcademicYearId
      AND m.AcademicLevelId = p_AcademicLevelId
      AND m.GroupId = p_GroupId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1;


    IF v_MarksCount = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'No active marks found for the selected examination';

    END IF;


    /*
    ============================================================
    4. Count verified and pending marks
    ============================================================
    */

    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN m.IsVerified = 1 THEN 1
                    ELSE 0
                END
            ),
            0
        ),

        COALESCE(
            SUM(
                CASE
                    WHEN m.IsVerified = 0 THEN 1
                    ELSE 0
                END
            ),
            0
        )

    INTO
        v_VerifiedCount,
        v_PendingCount

    FROM Marks m

    WHERE m.BoardId = p_BoardId
      AND m.AcademicYearId = p_AcademicYearId
      AND m.AcademicLevelId = p_AcademicLevelId
      AND m.GroupId = p_GroupId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1;


    /*
    ============================================================
    5. Do not process if marks are not verified
    ============================================================
    */

    IF v_VerifiedCount = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'No verified marks available for processing';

    END IF;


    /*
    ============================================================
    6. UPDATE existing Results
       
       Only unpublished Results can be changed.
       Published results are protected.
    ============================================================
    */

    UPDATE Results r

    INNER JOIN Marks m
        ON r.StudentId = m.StudentId
        AND r.SubjectId = m.SubjectId
        AND r.ExamId = m.ExaminationId
        AND r.BoardId = m.BoardId
        AND r.AcademicYearId = m.AcademicYearId
        AND r.AcademicLevelId = m.AcademicLevelId
        AND r.GroupId = m.GroupId

    SET

        r.InternalMarks =
            IFNULL(m.InternalMarks, 0),

        r.PracticalMarks =
            IFNULL(m.PracticalMarks, 0),

        r.ExternalMarks =
            IFNULL(m.TheoryMarks, 0),

        r.TotalMarks =
            IFNULL(m.InternalMarks, 0)
            + IFNULL(m.PracticalMarks, 0)
            + IFNULL(m.TheoryMarks, 0),

        r.Grade =
            CASE

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= 90
                    THEN 'A+'

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= 80
                    THEN 'A'

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= 70
                    THEN 'B'

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= 60
                    THEN 'C'

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= 50
                    THEN 'D'

                ELSE 'F'

            END,

        r.ResultStatus =
            CASE

                WHEN
                    (
                        IFNULL(m.InternalMarks, 0)
                        + IFNULL(m.PracticalMarks, 0)
                        + IFNULL(m.TheoryMarks, 0)
                    ) >= IFNULL(m.PassingMarks, 35)

                    THEN 'Pass'

                ELSE 'Fail'

            END,

        r.UpdatedAt = v_PublishDate

    WHERE m.BoardId = p_BoardId
      AND m.AcademicYearId = p_AcademicYearId
      AND m.AcademicLevelId = p_AcademicLevelId
      AND m.GroupId = p_GroupId
      AND m.ExaminationId = p_ExamId

      AND m.IsVerified = 1
      AND m.IsActive = 1

      AND r.IsPublished = 0;


    /*
    ============================================================
    7. Capture updated rows
    ============================================================
    */

    SET v_UpdatedCount = ROW_COUNT();


    /*
    ============================================================
    8. INSERT missing Results
       
       Only verified + active Marks are inserted.
    ============================================================
    */

    INSERT INTO Results
    (
        StudentId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ExamId,
        SubjectId,

        InternalMarks,
        PracticalMarks,
        ExternalMarks,
        TotalMarks,

        Grade,
        ResultStatus,

        Rank,

        IsPublished,
        PublishedDate,

        CreatedAt,
        UpdatedAt
    )

    SELECT

        m.StudentId,
        m.BoardId,
        m.AcademicYearId,
        m.AcademicLevelId,
        m.GroupId,
        m.ExaminationId,
        m.SubjectId,

        IFNULL(m.InternalMarks, 0),

        IFNULL(m.PracticalMarks, 0),

        IFNULL(m.TheoryMarks, 0),

        (
            IFNULL(m.InternalMarks, 0)
            + IFNULL(m.PracticalMarks, 0)
            + IFNULL(m.TheoryMarks, 0)
        ),

        /*
        ============================
        Grade
        ============================
        */

        CASE

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= 90
                THEN 'A+'

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= 80
                THEN 'A'

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= 70
                THEN 'B'

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= 60
                THEN 'C'

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= 50
                THEN 'D'

            ELSE 'F'

        END,

        /*
        ============================
        Pass / Fail
        ============================
        */

        CASE

            WHEN
                (
                    IFNULL(m.InternalMarks, 0)
                    + IFNULL(m.PracticalMarks, 0)
                    + IFNULL(m.TheoryMarks, 0)
                ) >= IFNULL(m.PassingMarks, 35)

                THEN 'Pass'

            ELSE 'Fail'

        END,

        /*
        ============================
        Rank
        ============================
        */

        NULL,

        /*
        ============================
        Publishing
        ============================
        */

        0,
        NULL,

        /*
        ============================
        Dates
        ============================
        */

        v_PublishDate,
        v_PublishDate

    FROM Marks m

    WHERE m.BoardId = p_BoardId
      AND m.AcademicYearId = p_AcademicYearId
      AND m.AcademicLevelId = p_AcademicLevelId
      AND m.GroupId = p_GroupId
      AND m.ExaminationId = p_ExamId

      AND m.IsVerified = 1
      AND m.IsActive = 1

      /*
      =========================================
      Do not insert duplicate Result records
      =========================================
      */

      AND NOT EXISTS
      (
          SELECT 1

          FROM Results r

          WHERE r.StudentId = m.StudentId
            AND r.BoardId = m.BoardId
            AND r.AcademicYearId = m.AcademicYearId
            AND r.AcademicLevelId = m.AcademicLevelId
            AND r.GroupId = m.GroupId
            AND r.ExamId = m.ExaminationId
            AND r.SubjectId = m.SubjectId
      );


    /*
    ============================================================
    9. Capture inserted rows
    ============================================================
    */

    SET v_InsertedCount = ROW_COUNT();


    /*
    ============================================================
    10. Return processing summary
    ============================================================
    */

    SELECT

        p_BoardId AS BoardId,

        p_AcademicYearId AS AcademicYearId,

        p_AcademicLevelId AS AcademicLevelId,

        p_GroupId AS GroupId,

        p_ExamId AS ExamId,

        v_MarksCount AS TotalMarksRecords,

        v_VerifiedCount AS VerifiedMarks,

        v_PendingCount AS PendingVerification,

        v_UpdatedCount AS UpdatedResults,

        v_InsertedCount AS InsertedResults,

        (
            v_UpdatedCount + v_InsertedCount
        ) AS TotalProcessed,

        v_PublishDate AS PublishDate;

END //

DELIMITER ;


