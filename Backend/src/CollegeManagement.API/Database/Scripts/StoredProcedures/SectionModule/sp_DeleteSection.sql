DROP PROCEDURE IF EXISTS sp_DeleteSection;
DELIMITER //
CREATE PROCEDURE sp_DeleteSection(IN p_SectionId INT)
BEGIN
    DELETE FROM Sections WHERE SectionId = p_SectionId;
END //
DELIMITER ;
