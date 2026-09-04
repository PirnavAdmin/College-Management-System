DROP PROCEDURE IF EXISTS sp_ValidateSectionName;
DELIMITER //
CREATE PROCEDURE sp_ValidateSectionName(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_Group VARCHAR(100),
    IN p_Programme VARCHAR(100),
    IN p_AcademicLevel VARCHAR(50),
    IN p_SectionName VARCHAR(50),
    IN p_ExcludeSectionId INT
)
BEGIN
    SELECT COUNT(1) 
    FROM Sections 
    WHERE Board = p_Board
      AND AcademicYearId = p_AcademicYearId
      AND `Group` = p_Group
      AND (Programme = p_Programme OR (Programme IS NULL AND p_Programme = '') OR (Programme = '' AND p_Programme IS NULL))
      AND AcademicLevel = p_AcademicLevel
      AND SectionName = p_SectionName
      AND (p_ExcludeSectionId IS NULL OR SectionId <> p_ExcludeSectionId);
END //
DELIMITER ;
