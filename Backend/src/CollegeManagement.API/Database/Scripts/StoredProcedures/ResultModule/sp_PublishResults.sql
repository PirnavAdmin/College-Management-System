DROP PROCEDURE IF EXISTS sp_PublishResults;
DELIMITER //

CREATE PROCEDURE sp_PublishResults(
     IN p_BoardId INT,
     IN p_AcademicYearId INT,
     IN p_AcademicLevelId INT,
     IN p_GroupId INT,
     IN p_ExamId INT,
     IN p_PublishDate DATETIME(6)
 )
BEGIN
     UPDATE Results
     SET
         IsPublished = 1,
         PublishedDate = COALESCE(p_PublishDate, UTC_TIMESTAMP()),
         UpdatedAt = UTC_TIMESTAMP()
     WHERE BoardId = p_BoardId
       AND AcademicYearId = p_AcademicYearId
       AND AcademicLevelId = p_AcademicLevelId
       AND GroupId = p_GroupId
       AND ExamId = p_ExamId;

     SELECT ROW_COUNT() AS AffectedRows;
END //


-- DROP PROCEDURE IF EXISTS sp_PublishResults;
-- DELIMITER //

-- CREATE PROCEDURE sp_PublishResults(
--     IN p_BoardId INT,
--     IN p_AcademicYearId INT,
--     IN p_AcademicLevelId INT,
--     IN p_GroupId INT,
--     IN p_ExamId INT,
--     IN p_PublishDate DATETIME(6)
-- )
-- BEGIN
--     UPDATE Results
--     SET
--         IsPublished = 1,
--         PublishedDate = COALESCE(p_PublishDate, UTC_TIMESTAMP()),
--         UpdatedAt = UTC_TIMESTAMP()
--     WHERE BoardId = p_BoardId
--       AND AcademicYearId = p_AcademicYearId
--       AND AcademicLevelId = p_AcademicLevelId
--       AND GroupId = p_GroupId
--       AND ExamId = p_ExamId;

--     SELECT ROW_COUNT() AS AffectedRows;
-- END //

-- DELIMITER ;

DELIMITER ;

