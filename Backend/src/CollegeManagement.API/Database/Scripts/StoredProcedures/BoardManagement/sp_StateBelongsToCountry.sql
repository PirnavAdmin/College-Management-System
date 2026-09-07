DROP PROCEDURE IF EXISTS sp_StateBelongsToCountry;

CREATE PROCEDURE sp_StateBelongsToCountry(
    IN p_StateId INT,
    IN p_CountryId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM States 
        WHERE StateId = p_StateId AND CountryId = p_CountryId AND IsActive = 1
    ) AS Belongs;
END;
