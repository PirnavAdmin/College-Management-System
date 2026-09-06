DROP PROCEDURE IF EXISTS sp_UpdateSection;
DELIMITER //
CREATE PROCEDURE sp_UpdateSection(
    IN p_SectionId INT,
    IN p_Board VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Group VARCHAR(100),
    IN p_GroupId INT,
    IN p_Programme VARCHAR(100),
    IN p_AcademicLevel VARCHAR(50),
    IN p_SectionName VARCHAR(50),
    IN p_RoomNumber VARCHAR(50),
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1),
    IN p_RoomId INT
)
BEGIN
    UPDATE Sections
    SET Board = p_Board,
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = p_AcademicYearId,
        `Group` = p_Group,
        GroupId = COALESCE(p_GroupId, GroupId),
        Programme = COALESCE(p_Programme, ''),
        AcademicLevel = p_AcademicLevel,
        SectionName = p_SectionName,
        RoomNumber = p_RoomNumber,
        InchargeId = p_InchargeId,
        MaximumStrength = p_MaximumStrength,
        IsActive = p_IsActive,
        RoomId = p_RoomId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SectionId = p_SectionId;
END //
DELIMITER ;
