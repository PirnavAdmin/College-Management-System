DROP PROCEDURE IF EXISTS `sp_GetMarkById`;
DELIMITER //
CREATE PROCEDURE `sp_GetMarkById`(IN p_MarkId INT)
BEGIN
    SELECT 
        m.MarkId, m.Board, m.AcademicYearId, m.AcademicLevel, m.GroupId, m.SectionId,
        m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName, m.InternalMarks,
        m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks, m.IsVerified,
        m.IsPublished, m.VerifiedBy, m.VerifiedAt, m.PublishedAt, m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.MarkId = p_MarkId AND m.IsActive = 1 
    LIMIT 1;
END //
DELIMITER ;