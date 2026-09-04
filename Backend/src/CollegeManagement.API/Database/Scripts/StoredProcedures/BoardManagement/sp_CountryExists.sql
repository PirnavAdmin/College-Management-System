DROP PROCEDURE IF EXISTS sp_CountryExists;

CREATE PROCEDURE sp_CountryExists(
    IN p_CountryId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM Countries 
        WHERE CountryId = p_CountryId AND IsActive = 1
    ) AS CountryExists;
END;
