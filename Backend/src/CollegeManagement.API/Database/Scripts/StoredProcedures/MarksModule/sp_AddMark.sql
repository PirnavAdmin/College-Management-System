DROP PROCEDURE IF EXISTS `sp_AddMark`;
DELIMITER //
CREATE PROCEDURE `sp_AddMark`(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_RollNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_InternalMarks INT,
    IN p_PracticalMarks INT,
    IN p_TheoryMarks INT,
    IN p_PassingMarks INT
)
BEGIN
    DECLARE v_TotalMarks INT;
    DECLARE v_MarkId INT;
    
    SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    
    INSERT INTO `Marks` (
        Board, AcademicYearId, AcademicLevel, GroupId, SectionId, 
        ExaminationId, SubjectId, StudentId, RollNo, StudentName, 
        InternalMarks, PracticalMarks, TheoryMarks, TotalMarks, PassingMarks, 
        IsVerified, IsPublished, IsActive, CreatedAt
    )
    VALUES (
        p_Board, p_AcademicYearId, p_AcademicLevel, p_GroupId, p_SectionId, 
        p_ExaminationId, p_SubjectId, p_StudentId, p_RollNo, p_StudentName, 
        IFNULL(p_InternalMarks, 0), IFNULL(p_PracticalMarks, 0), IFNULL(p_TheoryMarks, 0), 
        v_TotalMarks, IFNULL(p_PassingMarks, 0), 0, 0, 1, UTC_TIMESTAMP()
    );
    
    SET v_MarkId = LAST_INSERT_ID();
    CALL sp_GetMarkById(v_MarkId);
END //
DELIMITER ;