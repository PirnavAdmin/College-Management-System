DROP PROCEDURE IF EXISTS sp_GetRevaluationStatus;

DELIMITER //

CREATE PROCEDURE sp_GetRevaluationStatus(
    IN p_RevaluationId INT
)
BEGIN

    SELECT

        rv.RevaluationId,

        rv.ResultId,
        rv.StudentId,
        rv.SubjectId,

        s.RollNo AS RollNumber,
        s.StudentName,

        sub.SubjectName,

        rv.Reason,
        rv.Status,

        rv.OldMarks,
        rv.NewMarks,

        rv.FeePaid,

        rv.RequestedDate,

        rv.ReviewedBy,
        rv.ReviewedDate,

        rv.Remarks,

        rv.CreatedAt,
        rv.UpdatedAt

    FROM Revaluations rv

    LEFT JOIN Students s
        ON s.StudentId = rv.StudentId

    LEFT JOIN Subjects sub
        ON sub.SubjectId = rv.SubjectId

    WHERE rv.RevaluationId = p_RevaluationId;

END //

DELIMITER ;