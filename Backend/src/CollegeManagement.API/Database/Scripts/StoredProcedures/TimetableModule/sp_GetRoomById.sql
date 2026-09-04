DROP PROCEDURE IF EXISTS sp_GetRoomById;
DELIMITER //
CREATE PROCEDURE sp_GetRoomById(IN p_RoomId INT)
BEGIN
    SELECT 
        RoomId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Rooms
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;
