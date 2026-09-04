DROP PROCEDURE IF EXISTS sp_CreateSection;
DELIMITER //
CREATE PROCEDURE sp_CreateSection(
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
    INSERT INTO Sections (
        Board, BoardId, AcademicYearId, `Group`, GroupId, Programme, AcademicLevel, 
        SectionName, RoomNumber, InchargeId, MaximumStrength, IsActive, RoomId, CreatedAt
    )
    VALUES (
        p_Board, p_BoardId, p_AcademicYearId, p_Group, p_GroupId, COALESCE(p_Programme, ''), p_AcademicLevel, 
        p_SectionName, p_RoomNumber, p_InchargeId, p_MaximumStrength, p_IsActive, p_RoomId, UTC_TIMESTAMP()
    );
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;
