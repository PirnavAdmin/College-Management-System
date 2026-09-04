DROP PROCEDURE IF EXISTS sp_CreateRoom;
DELIMITER //
CREATE PROCEDURE sp_CreateRoom(
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Rooms (
        RoomNumber,
        RoomCode,
        RoomName,
        BlockName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt
    )
    VALUES (
        p_RoomCode,
        p_RoomCode,
        COALESCE(p_RoomName, p_RoomCode),
        p_Building,
        p_Floor,
        IFNULL(p_Capacity, 60),
        IFNULL(p_RoomType, 'Classroom'),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;
