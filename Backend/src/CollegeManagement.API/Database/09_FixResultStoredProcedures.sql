-- =============================================================================
-- STORED PROCEDURES FOR RESULT MODULE
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. sp_GetResults
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetResults;
DELIMITER //
CREATE PROCEDURE sp_GetResults()
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        r.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        r.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        r.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        r.TotalMarks,
        r.ObtainedMarks,
        r.Percentage,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.PublishedDate,
        r.IsPublished,
        r.Remarks,
        r.CreatedAt,
        r.UpdatedAt
    FROM Results r
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    LEFT JOIN Examinations e ON e.ExamId = r.ExamId
    LEFT JOIN Boards b ON b.BoardId = r.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = r.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = r.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    ORDER BY r.ResultId DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_GetStudentResult
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStudentResult;
DELIMITER //
CREATE PROCEDURE sp_GetStudentResult(IN p_StudentId INT)
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        r.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        r.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        r.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        r.TotalMarks,
        r.ObtainedMarks,
        r.Percentage,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.PublishedDate,
        r.IsPublished,
        r.Remarks,
        r.CreatedAt,
        r.UpdatedAt
    FROM Results r
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    LEFT JOIN Examinations e ON e.ExamId = r.ExamId
    LEFT JOIN Boards b ON b.BoardId = r.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = r.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = r.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    WHERE r.StudentId = p_StudentId
    ORDER BY r.ResultId DESC
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_GetRankList
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetRankList;
DELIMITER //
CREATE PROCEDURE sp_GetRankList()
BEGIN
    SELECT 
        r.Rank,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNo,
        r.ObtainedMarks,
        r.TotalMarks,
        r.Percentage,
        r.Grade,
        r.ResultStatus
    FROM Results r
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    WHERE r.ResultStatus = 'Pass' OR r.ResultStatus = 'Passed'
    ORDER BY r.Rank ASC, r.Percentage DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_GetFailedStudents
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFailedStudents;
DELIMITER //
CREATE PROCEDURE sp_GetFailedStudents()
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.TotalMarks,
        r.ObtainedMarks,
        r.Percentage,
        r.Grade,
        r.ResultStatus
    FROM Results r
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    LEFT JOIN Examinations e ON e.ExamId = r.ExamId
    WHERE r.ResultStatus = 'Fail' OR r.ResultStatus = 'Failed'
    ORDER BY s.StudentName ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_GetResultStatistics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetResultStatistics;
DELIMITER //
CREATE PROCEDURE sp_GetResultStatistics()
BEGIN
    SELECT 
        COUNT(*) AS TotalStudents,
        SUM(CASE WHEN r.ResultStatus IN ('Pass', 'Passed') THEN 1 ELSE 0 END) AS TotalPassed,
        SUM(CASE WHEN r.ResultStatus IN ('Fail', 'Failed') THEN 1 ELSE 0 END) AS TotalFailed,
        COALESCE(ROUND((SUM(CASE WHEN r.ResultStatus IN ('Pass', 'Passed') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2), 0) AS PassPercentage,
        COALESCE(AVG(r.Percentage), 0) AS AveragePercentage,
        COALESCE(MAX(r.Percentage), 0) AS HighestPercentage
    FROM Results r;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_GetResultAnalysis
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetResultAnalysis;
DELIMITER //
CREATE PROCEDURE sp_GetResultAnalysis()
BEGIN
    SELECT 
        r.Grade,
        COUNT(*) AS StudentCount,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM Results)) * 100, 2) AS GradePercentage
    FROM Results r
    GROUP BY r.Grade
    ORDER BY r.Grade ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_DownloadMemo
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DownloadMemo;
DELIMITER //
CREATE PROCEDURE sp_DownloadMemo(IN p_StudentId INT)
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.TotalMarks,
        r.ObtainedMarks,
        r.Percentage,
        r.Grade,
        r.ResultStatus,
        r.PublishedDate
    FROM Results r
    LEFT JOIN Students s ON s.StudentId = r.StudentId
    LEFT JOIN Examinations e ON e.ExamId = r.ExamId
    WHERE r.StudentId = p_StudentId
    ORDER BY r.ResultId DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_ProcessResults
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ProcessResults;
DELIMITER //
CREATE PROCEDURE sp_ProcessResults(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN
    SELECT 1 AS Success;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_PublishResults
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PublishResults;
DELIMITER //
CREATE PROCEDURE sp_PublishResults(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_PublishDate DATETIME
)
BEGIN
    UPDATE Results
    SET IsPublished = 1,
        PublishedDate = IFNULL(p_PublishDate, UTC_TIMESTAMP()),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE (p_BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR ExamId = p_ExamId);
    SELECT ROW_COUNT();
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_RequestRevaluation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_RequestRevaluation;
DELIMITER //
CREATE PROCEDURE sp_RequestRevaluation(
    IN p_ResultId INT,
    IN p_StudentId INT,
    IN p_SubjectId INT,
    IN p_Reason VARCHAR(500)
)
BEGIN
    INSERT INTO Revaluations (ResultId, StudentId, SubjectId, Reason, RequestDate, Status, CreatedAt)
    VALUES (p_ResultId, p_StudentId, p_SubjectId, p_Reason, UTC_TIMESTAMP(), 'Pending', UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_GetRevaluations
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetRevaluations;
DELIMITER //
CREATE PROCEDURE sp_GetRevaluations()
BEGIN
    SELECT 
        rev.RevaluationId,
        rev.ResultId,
        rev.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        rev.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        rev.Reason,
        rev.RequestDate,
        rev.Status,
        rev.CreatedAt
    FROM Revaluations rev
    LEFT JOIN Students s ON s.StudentId = rev.StudentId
    LEFT JOIN Subjects sub ON sub.SubjectId = rev.SubjectId
    ORDER BY rev.RevaluationId DESC;
END //
DELIMITER ;
