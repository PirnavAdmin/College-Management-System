-- Delete Mark (Soft Delete)
DROP PROCEDURE IF EXISTS `sp_DeleteMark`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteMark`(IN p_MarkId INT)
BEGIN
    UPDATE `Marks` SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE MarkId = p_MarkId AND IsActive = 1;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- Restore Mark
DROP PROCEDURE IF EXISTS `sp_RestoreMark`;
DELIMITER //
CREATE PROCEDURE `sp_RestoreMark`(IN p_MarkId INT)
BEGIN
    UPDATE `Marks` SET IsActive = 1, UpdatedAt = UTC_TIMESTAMP() WHERE MarkId = p_MarkId;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;