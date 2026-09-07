DROP PROCEDURE IF EXISTS sp_GetResults;

DELIMITER //

CREATE PROCEDURE sp_GetResults(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_Search VARCHAR(150),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN

    DECLARE v_Offset INT DEFAULT 0;

    /* =========================================================
       Validate parameters
       ========================================================= */

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


    /* =========================================================
       Pagination
       ========================================================= */

    IF p_PageNumber IS NULL OR p_PageNumber < 1 THEN
        SET p_PageNumber = 1;
    END IF;

    IF p_PageSize IS NULL OR p_PageSize < 1 THEN
        SET p_PageSize = 10;
    END IF;

    SET v_Offset = (p_PageNumber - 1) * p_PageSize;


    /* =========================================================
       1. Total Records
       ========================================================= */

    SELECT COUNT(DISTINCT r.StudentId)
    AS TotalRecords

    FROM Results r

    INNER JOIN Students s
        ON s.StudentId = r.StudentId

    WHERE r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId

      AND
      (
          p_Search IS NULL
          OR p_Search = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
      );


    /* =========================================================
       2. Result Data
       ========================================================= */

    SELECT

        r.ResultId,

        r.StudentId,

        s.StudentName,

        s.RollNo AS RollNumber,

        r.BoardId,
        b.BoardName,

        r.AcademicYearId,
        ay.AcademicYearName,

        r.AcademicLevelId,
        al.LevelName AS AcademicLevel,

        r.GroupId,
        g.GroupName,

        r.ExamId,
        e.ExamName,

        r.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,

        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,

        r.TotalMarks,

        sub.TotalMarks AS MaximumMarks,
        sub.PassingMarks,

        r.Grade,
        r.ResultStatus,

        r.Rank,

        r.IsPublished,
        r.PublishedDate,

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

      AND
      (
          p_Search IS NULL
          OR p_Search = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
      )

    ORDER BY
        s.StudentName,
        r.StudentId,
        r.SubjectId

    LIMIT v_Offset, p_PageSize;

END //

DELIMITER ;