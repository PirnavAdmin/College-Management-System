DROP PROCEDURE IF EXISTS sp_DownloadMemo;

DELIMITER //

CREATE PROCEDURE sp_DownloadMemo(
    IN p_StudentId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    /* =========================================================
       1. Validate Student
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid StudentId. Student not found.';
    END IF;


    /* =========================================================
       2. Validate Board
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM Boards
        WHERE BoardId = p_BoardId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid BoardId. Board not found.';
    END IF;


    /* =========================================================
       3. Validate Academic Year
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM AcademicYears
        WHERE AcademicYearId = p_AcademicYearId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicYearId. Academic year not found.';
    END IF;


    /* =========================================================
       4. Validate Academic Level
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM AcademicLevels
        WHERE AcademicLevelId = p_AcademicLevelId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid AcademicLevelId. Academic level not found.';
    END IF;


    /* =========================================================
       5. Validate Group
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM `Groups`
        WHERE GroupId = p_GroupId
          AND AcademicYearId = p_AcademicYearId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid GroupId. Group not found.';
    END IF;


    /* =========================================================
       6. Validate Examination
       ========================================================= */

    IF NOT EXISTS (
        SELECT 1
        FROM Examinations
        WHERE ExamId = p_ExamId
          AND BoardId = p_BoardId
          AND AcademicYearId = p_AcademicYearId
          AND AcademicLevelId = p_AcademicLevelId
          AND GroupId = p_GroupId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid ExamId. Examination not found.';
    END IF;


    /* =========================================================
       7. Get Published Result Memo
       ========================================================= */

    SELECT
        r.ResultId,

        s.RollNo AS RollNumber,
        r.StudentId,
        s.StudentName,

        r.BoardId,
        b.BoardName,

        r.AcademicYearId,
        ay.AcademicYearName AS AcademicYear,

        r.AcademicLevelId,
        al.LevelName AS AcademicLevel,

        r.GroupId,
        g.GroupName,

        r.ExamId,
        e.ExamName,

        r.SubjectId,
        sub.SubjectName,

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
        r.PublishedDate

    FROM Results r

    LEFT JOIN Students s
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

    WHERE r.StudentId = p_StudentId
      AND r.BoardId = p_BoardId
      AND r.AcademicYearId = p_AcademicYearId
      AND r.AcademicLevelId = p_AcademicLevelId
      AND r.GroupId = p_GroupId
      AND r.ExamId = p_ExamId
      AND r.IsPublished = 1

    ORDER BY r.ResultId DESC;

END //

DELIMITER ;