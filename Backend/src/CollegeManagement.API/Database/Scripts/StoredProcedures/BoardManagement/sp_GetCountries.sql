DROP PROCEDURE IF EXISTS sp_GetCountries;

CREATE PROCEDURE sp_GetCountries()
BEGIN
    SELECT CountryId, CountryCode, CountryName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM Countries
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END;
