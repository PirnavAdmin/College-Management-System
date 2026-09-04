DROP PROCEDURE IF EXISTS sp_GetExaminations;
DELIMITER //
CREATE PROCEDURE sp_GetExaminations()
BEGIN
    SELECT 
        e.ExamId,
        COALESCE(e.ExamCode, CONCAT('EXM-', YEAR(e.StartDate), '-', LPAD(e.ExamId, 3, '0'))) AS ExamCode,
        e.ExamName,
        e.BoardId,
        b.BoardName,
        e.AcademicYearId,
        ay.AcademicYearName,
        e.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        e.GroupId,
        g.GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, 'All Programs') AS ProgramName,
        e.AssessmentTypeId,
        at.AssessmentTypeName AS ExamType,
        e.StartDate,
        e.EndDate,
        e.Description,
        e.Status,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        (
            SELECT COUNT(*) 
            FROM Subjects s 
            WHERE s.IsActive = 1 
              AND s.BoardId = e.BoardId 
              AND s.AcademicLevelId = e.AcademicLevelId 
              AND s.GroupId = e.GroupId
        ) AS TotalEligibleSubjects,
        (
            SELECT COUNT(*) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.IsActive = 1
    ORDER BY e.ExamId DESC;
END //
DELIMITER ;
