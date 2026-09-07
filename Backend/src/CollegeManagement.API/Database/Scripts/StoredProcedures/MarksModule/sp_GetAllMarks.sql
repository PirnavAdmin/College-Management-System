DROP PROCEDURE IF EXISTS `sp_GetAllMarks`;
DELIMITER //
CREATE PROCEDURE `sp_GetAllMarks`()
BEGIN
    SELECT 
        m.MarkId, m.Board, m.AcademicYearId, m.AcademicLevel, m.GroupId, m.SectionId,
        m.ExaminationId, m.SubjectId, m.StudentId, m.RollNo, m.StudentName, m.InternalMarks,
        m.PracticalMarks, m.TheoryMarks, m.TotalMarks, m.PassingMarks, m.IsVerified,
        m.IsPublished, m.VerifiedBy, m.VerifiedAt, m.PublishedAt, m.IsActive, m.CreatedAt, m.UpdatedAt
    FROM `Marks` m 
    WHERE m.IsActive = 1 
    ORDER BY m.MarkId DESC;
END //
DELIMITER ;