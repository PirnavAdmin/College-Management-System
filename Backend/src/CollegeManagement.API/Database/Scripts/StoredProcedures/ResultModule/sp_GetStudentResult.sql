DROP PROCEDURE IF EXISTS sp_GetStudentResult;

DELIMITER //

CREATE PROCEDURE sp_GetStudentResult(
    IN p_StudentId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    DECLARE v_ResultCount INT DEFAULT 0;

    /* ============================================================
       1. Validate parameters
       ============================================================ */

    IF p_StudentId IS NULL OR p_StudentId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid StudentId';
    END IF;

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


    /* ============================================================
       2. Check whether result exists
       ============================================================ */

    SELECT COUNT(*)
    INTO v_ResultCount

    FROM Results r

    WHERE r.StudentId = p_StudentId
      AND r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId;


    IF v_ResultCount = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'No result found for the selected student';

    END IF;


    /* ============================================================
       3. Student Header + Overall Summary
       ============================================================ */

    SELECT

        s.StudentId,

        s.StudentName,

        s.RollNo AS RollNumber,

        g.GroupName,

        e.ExamId,

        e.ExamCode,

        e.ExamName,

        /*
        Section

        Replace this with the actual Section column once
        the Students/Groups schema confirms its location.
        */

        NULL AS SectionName,

        /*
        ============================================================
        Grand Total
        ============================================================
        */

        SUM(
            IFNULL(r.TotalMarks, 0)
        ) AS GrandTotal,

        /*
        ============================================================
        Maximum Marks

        Get maximum marks from Subjects.TotalMarks.
        ============================================================
        */

        SUM(
            IFNULL(sub.TotalMarks, 0)
        ) AS MaximumMarks,

        /*
        ============================================================
        Percentage
        ============================================================
        */

        ROUND(
            (
                SUM(IFNULL(r.TotalMarks, 0))
                /
                NULLIF(
                    SUM(IFNULL(sub.TotalMarks, 0)),
                    0
                )
            ) * 100,
            2
        ) AS Percentage,

        /*
        ============================================================
        Overall Grade
        ============================================================
        */

        CASE

            WHEN
                (
                    SUM(IFNULL(r.TotalMarks, 0))
                    /
                    NULLIF(
                        SUM(IFNULL(sub.TotalMarks, 0)),
                        0
                    )
                ) * 100 >= 90
                THEN 'A+'

            WHEN
                (
                    SUM(IFNULL(r.TotalMarks, 0))
                    /
                    NULLIF(
                        SUM(IFNULL(sub.TotalMarks, 0)),
                        0
                    )
                ) * 100 >= 80
                THEN 'A'

            WHEN
                (
                    SUM(IFNULL(r.TotalMarks, 0))
                    /
                    NULLIF(
                        SUM(IFNULL(sub.TotalMarks, 0)),
                        0
                    )
                ) * 100 >= 70
                THEN 'B'

            WHEN
                (
                    SUM(IFNULL(r.TotalMarks, 0))
                    /
                    NULLIF(
                        SUM(IFNULL(sub.TotalMarks, 0)),
                        0
                    )
                ) * 100 >= 60
                THEN 'C'

            WHEN
                (
                    SUM(IFNULL(r.TotalMarks, 0))
                    /
                    NULLIF(
                        SUM(IFNULL(sub.TotalMarks, 0)),
                        0
                    )
                ) * 100 >= 50
                THEN 'D'

            ELSE 'F'

        END AS OverallGrade,

        /*
        ============================================================
        Final Result
        ============================================================
        */

        CASE

            WHEN SUM(
                CASE
                    WHEN r.ResultStatus = 'Fail'
                    THEN 1
                    ELSE 0
                END
            ) > 0

            THEN 'FAIL'

            ELSE 'PASS'

        END AS FinalResult,

        /*
        ============================================================
        Published / Draft
        ============================================================
        */

        CASE

            WHEN MIN(r.IsPublished) = 1
            THEN 'Published'

            ELSE 'Draft'

        END AS ResultStatus,

        MAX(r.PublishedDate) AS PublishedDate

    FROM Results r

    INNER JOIN Students s
        ON s.StudentId = r.StudentId

    LEFT JOIN `Groups` g
        ON g.GroupId = r.GroupId

    INNER JOIN Examinations e
        ON e.ExamId = r.ExamId

    INNER JOIN Subjects sub
        ON sub.SubjectId = r.SubjectId

    WHERE r.StudentId = p_StudentId
      AND r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId

    GROUP BY

        s.StudentId,
        s.StudentName,
        s.RollNo,
        g.GroupName,
        e.ExamId,
        e.ExamCode,
        e.ExamName;


    /* ============================================================
       4. Subject-wise Marks
       ============================================================ */

    SELECT

        r.SubjectId,

        sub.SubjectName,

        sub.SubjectCode,

        /*
        Student's actual Theory marks
        */

        IFNULL(r.ExternalMarks, 0) AS Theory,

        /*
        Student's actual Practical marks
        */

        IFNULL(r.PracticalMarks, 0) AS Practical,

        /*
        Student's actual Internal marks
        */

        IFNULL(r.InternalMarks, 0) AS Internal,

        /*
        Student's actual Total
        */

        IFNULL(r.TotalMarks, 0) AS TotalMarks,

        /*
        Subject maximum marks
        */

        IFNULL(sub.TotalMarks, 0) AS MaximumMarks,

        /*
        Student grade
        */

        r.Grade,

        /*
        Pass / Fail
        */

        r.ResultStatus,

        /*
        Published / Draft
        */

        r.IsPublished

    FROM Results r

    INNER JOIN Subjects sub
        ON sub.SubjectId = r.SubjectId

    WHERE r.StudentId = p_StudentId
      AND r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId

    ORDER BY r.SubjectId;


    /* ============================================================
       5. Class Rank
       ============================================================ */

    SELECT

        StudentId,

        ClassRank

    FROM
    (
        SELECT

            r.StudentId,

            RANK() OVER
            (
                ORDER BY
                    SUM(IFNULL(r.TotalMarks, 0)) DESC
            ) AS ClassRank

        FROM Results r

        WHERE r.BoardId = p_BoardId
          AND r.AcademicYearId = p_AcademicYearId
          AND r.AcademicLevelId = p_AcademicLevelId
          AND r.GroupId = p_GroupId
          AND r.ExamId = p_ExamId

          AND r.IsPublished = 1

        GROUP BY r.StudentId

    ) ranked

    WHERE ranked.StudentId = p_StudentId;

END //

DELIMITER ;