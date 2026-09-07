DROP PROCEDURE IF EXISTS sp_GetResultAnalysis;
DELIMITER //

CREATE PROCEDURE sp_GetResultAnalysis()
BEGIN
    SELECT
        COUNT(*) AS TotalResults,
        ROUND(AVG(TotalMarks), 2) AS AverageMarks,
        MAX(TotalMarks) AS HighestMarks,
        MIN(TotalMarks) AS LowestMarks,

        SUM(
            CASE
                WHEN ResultStatus = 'Pass' THEN 1
                ELSE 0
            END
        ) AS PassedResults,

        SUM(
            CASE
                WHEN ResultStatus = 'Fail' THEN 1
                ELSE 0
            END
        ) AS FailedResults

    FROM Results

    WHERE IsPublished = 1;
END //

DELIMITER ;