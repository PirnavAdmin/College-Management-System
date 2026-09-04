DROP PROCEDURE IF EXISTS sp_ReplaceBoardAcademicLevels;

CREATE PROCEDURE sp_ReplaceBoardAcademicLevels(
    IN p_BoardId INT,
    IN p_AcademicLevelIds TEXT
)
BEGIN
    DECLARE v_IdString TEXT;
    DECLARE v_IdVal INT;

    DELETE FROM BoardAcademicLevels 
    WHERE BoardId = p_BoardId;

    IF p_AcademicLevelIds IS NOT NULL AND TRIM(p_AcademicLevelIds) != '' THEN
        SET v_IdString = p_AcademicLevelIds;
        WHILE LOCATE(',', v_IdString) > 0 DO
            SET v_IdVal = CAST(SUBSTRING_INDEX(v_IdString, ',', 1) AS SIGNED);
            SET v_IdString = SUBSTRING(v_IdString, LOCATE(',', v_IdString) + 1);
            
            INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
            VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
        END WHILE;
        
        IF TRIM(v_IdString) != '' THEN
            SET v_IdVal = CAST(v_IdString AS SIGNED);
            INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
            VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
        END IF;
    END IF;
END;
