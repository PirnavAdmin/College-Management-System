DROP PROCEDURE IF EXISTS sp_DownloadResultsPdf;

DELIMITER //

CREATE PROCEDURE sp_DownloadResultsPdf(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    /* ============================================================
       1. Validate Board
       ============================================================ */

    IF p_BoardId IS NULL OR p_BoardId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid BoardId';
    END IF;


    /* ============================================================
       2. Validate Academic Year
       ============================================================ */

    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicYearId';
    END IF;


    /* ============================================================
       3. Validate Academic Level
       ============================================================ */

    IF p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicLevelId';
    END IF;


    /* ============================================================
       4. Validate Group
       ============================================================ */

    IF p_GroupId IS NULL OR p_GroupId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid GroupId';
    END IF;


    /* ============================================================
       5. Validate Examination
       ============================================================ */

    IF p_ExamId IS NULL OR p_ExamId <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid ExamId';
    END IF;


    /* ============================================================
       6. Return Results for PDF
       ============================================================ */

    SELECT

        r.ResultId,

        /* Student */
        r.StudentId,
        s.StudentName,
        s.RollNo AS RollNumber,

        /* Board */
        r.BoardId,
        b.BoardName,

        /* Academic Year */
        r.AcademicYearId,
        ay.AcademicYearName,

        /* Academic Level */
        r.AcademicLevelId,
        al.LevelName AS AcademicLevel,

        /* Group */
        r.GroupId,
        g.GroupName,

        /* Examination */
        r.ExamId,
        e.ExamCode,
        e.ExamName,

        /* Subject */
        r.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,

        /* Marks */
        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,

        /* Maximum / Passing Marks */
        sub.TotalMarks AS MaximumMarks,
        sub.PassingMarks,

        /* Result */
        r.Grade,
        r.ResultStatus,
        r.Rank,

        /* Publishing */
        r.IsPublished,
        r.PublishedDate,

        /* Dates */
        r.CreatedAt,
        r.UpdatedAt

    FROM Results r

    INNER JOIN Students s
        ON s.StudentId = r.StudentId

    LEFT JOIN Boards b
        ON b.BoardId = r.BoardId

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = r.AcademicYearId

    LEFT JOIN AcademicLevels al
        ON al.AcademicLevelId = r.AcademicLevelId

    LEFT JOIN `Groups` g
        ON g.GroupId = r.GroupId

    LEFT JOIN Examinations e
        ON e.ExamId = r.ExamId

    LEFT JOIN Subjects sub
        ON sub.SubjectId = r.SubjectId

    WHERE r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId

    ORDER BY
        s.StudentName,
        r.SubjectId;

END //

DELIMITER ;