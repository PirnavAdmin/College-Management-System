DROP PROCEDURE IF EXISTS sp_GetRooms;
DELIMITER //
CREATE PROCEDURE sp_GetRooms()
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
    ORDER BY COALESCE(RoomCode, RoomNumber) ASC;
END //
DELIMITER ;
