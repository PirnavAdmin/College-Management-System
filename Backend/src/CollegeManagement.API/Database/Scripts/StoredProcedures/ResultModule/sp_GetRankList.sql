DROP PROCEDURE IF EXISTS sp_GetRankList;
DELIMITER //

CREATE PROCEDURE sp_GetRankList()
BEGIN
    SELECT
        RANK() OVER (
            ORDER BY SUM(r.TotalMarks) DESC
        ) AS Rank,

        s.StudentId,
        s.StudentName,
        s.RollNo AS RollNumber,

        g.GroupName,
        e.ExamName,

        SUM(r.TotalMarks) AS TotalMarks,

        ROUND(AVG(r.TotalMarks), 2) AS Percentage,

        CASE
            WHEN AVG(r.TotalMarks) >= 90 THEN 'A+'
            WHEN AVG(r.TotalMarks) >= 80 THEN 'A'
            WHEN AVG(r.TotalMarks) >= 70 THEN 'B'
            WHEN AVG(r.TotalMarks) >= 60 THEN 'C'
            WHEN AVG(r.TotalMarks) >= 50 THEN 'D'
            ELSE 'F'
        END AS Grade

    FROM Results r

    INNER JOIN Students s
        ON s.StudentId = r.StudentId

    LEFT JOIN `Groups` g
        ON g.GroupId = r.GroupId

    LEFT JOIN Examinations e
        ON e.ExamId = r.ExamId

    WHERE r.IsPublished = 1

    GROUP BY
        s.StudentId,
        s.StudentName,
        s.RollNo,
        g.GroupName,
        e.ExamName

    ORDER BY TotalMarks DESC;
END //

DELIMITER ;