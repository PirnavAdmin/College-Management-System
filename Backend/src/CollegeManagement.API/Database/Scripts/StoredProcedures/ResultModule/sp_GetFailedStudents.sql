DROP PROCEDURE IF EXISTS sp_GetFailedStudents;
DELIMITER //

CREATE PROCEDURE sp_GetFailedStudents()
BEGIN
    SELECT
        r.StudentId,

        s.AdmissionNo AS AdmissionNumber,
        s.RollNo AS RollNumber,
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
        r.Grade,
        r.ResultStatus,
        r.Rank,
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

    WHERE r.ResultStatus = 'Fail'
      AND r.IsPublished = 1

    ORDER BY s.RollNo;
END //

DELIMITER ;