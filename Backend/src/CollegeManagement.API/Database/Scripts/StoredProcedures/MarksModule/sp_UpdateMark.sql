DROP PROCEDURE IF EXISTS `sp_UpdateMark`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateMark`(
    IN p_MarkId INT, 
    IN p_InternalMarks INT, 
    IN p_PracticalMarks INT, 
    IN p_TheoryMarks INT, 
    IN p_PassingMarks INT
)
BEGIN
    DECLARE v_TotalMarks INT;
    SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    
    UPDATE `Marks`
    SET InternalMarks = IFNULL(p_InternalMarks, 0), 
        PracticalMarks = IFNULL(p_PracticalMarks, 0),
        TheoryMarks = IFNULL(p_TheoryMarks, 0), 
        TotalMarks = v_TotalMarks, 
        PassingMarks = IFNULL(p_PassingMarks, 0),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE MarkId = p_MarkId AND IsActive = 1;
    
    CALL sp_GetMarkById(p_MarkId);
END //
DELIMITER ;