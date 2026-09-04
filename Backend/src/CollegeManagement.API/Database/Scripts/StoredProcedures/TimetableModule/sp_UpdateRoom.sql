DROP PROCEDURE IF EXISTS sp_UpdateRoom;
DELIMITER //
CREATE PROCEDURE sp_UpdateRoom(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Rooms
    SET RoomNumber = p_RoomCode,
        RoomCode = p_RoomCode,
        RoomName = COALESCE(p_RoomName, p_RoomCode),
        BlockName = p_Building,
        Floor = p_Floor,
        Capacity = p_Capacity,
        RoomType = p_RoomType,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;
