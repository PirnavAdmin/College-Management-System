DROP PROCEDURE IF EXISTS sp_GetStatesByCountry;

CREATE PROCEDURE sp_GetStatesByCountry(
    IN p_CountryId INT
)
BEGIN
    SELECT StateId, StateCode, StateName, CountryId, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM States
    WHERE CountryId = p_CountryId AND IsActive = 1
    ORDER BY DisplayOrder ASC, StateName ASC;
END;
