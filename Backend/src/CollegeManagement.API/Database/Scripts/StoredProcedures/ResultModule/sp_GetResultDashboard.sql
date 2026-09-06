DROP PROCEDURE IF EXISTS sp_GetResultDashboard;

DELIMITER //

CREATE PROCEDURE sp_GetResultDashboard(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    SELECT

        COUNT(DISTINCT m.StudentId)
            AS TotalStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NOT NULL
                THEN m.StudentId
            END
        ) AS ProcessedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NULL
                THEN m.StudentId
            END
        ) AS PendingStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.IsPublished = 1
                THEN r.StudentId
            END
        ) AS PublishedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultStatus = 'Pass'
                THEN r.StudentId
            END
        ) AS PassedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultStatus = 'Fail'
                THEN r.StudentId
            END
        ) AS FailedStudents,

        ROUND(
            COUNT(DISTINCT
                CASE
                    WHEN r.ResultStatus = 'Pass'
                    THEN r.StudentId
                END
            ) * 100.0
            /
            NULLIF(
                COUNT(DISTINCT r.StudentId),
                0
            ),
            2
        ) AS PassPercentage,

        ROUND(
            AVG(r.TotalMarks),
            2
        ) AS AverageMarks,

        MAX(r.TotalMarks) AS HighestMarks,

        MIN(r.TotalMarks) AS LowestMarks

    FROM Marks m

    LEFT JOIN Results r
        ON r.StudentId = m.StudentId
        AND r.BoardId = m.BoardId
        AND r.AcademicYearId = m.AcademicYearId
        AND r.AcademicLevelId = m.AcademicLevelId
        AND r.GroupId = m.GroupId
        AND r.ExamId = m.ExaminationId
        AND r.SubjectId = m.SubjectId

    WHERE m.BoardId = p_BoardId
      AND m.AcademicYearId = p_AcademicYearId
      AND m.AcademicLevelId = p_AcademicLevelId
      AND m.GroupId = p_GroupId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1;

END //

DELIMITER ;