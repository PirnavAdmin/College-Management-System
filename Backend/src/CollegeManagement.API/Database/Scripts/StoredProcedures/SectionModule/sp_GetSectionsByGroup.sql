DROP PROCEDURE IF EXISTS sp_GetSectionsByGroup;
DELIMITER //
CREATE PROCEDURE sp_GetSectionsByGroup(IN p_GroupId INT)
BEGIN
    SELECT 
        s.SectionId,
        s.BoardId,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(b.BoardName, '') AS BoardName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS LevelName,
        COALESCE(al.LevelName, '') AS YearOfStudy,
        COALESCE(s.GroupId, gp.GroupId) AS GroupId,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(g.GroupName, '') AS GroupName,
        s.GroupProgramId,
        COALESCE(s.ProgramId, gp.ProgramId) AS ProgramId,
        COALESCE(p.ProgramName, '') AS Programme,
        COALESCE(p.ProgramName, '') AS Program,
        COALESCE(p.ProgramName, '') AS ProgramName,
        s.SectionName,
        s.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomNumber,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.BlockName, '') AS BuildingName,
        s.InchargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS InchargeName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS Incharge,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS ClassTeacherName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS FacultyName,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        s.MaximumStrength,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM Sections s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN GroupPrograms gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN Rooms r ON r.RoomId = s.RoomId
    LEFT JOIN Staffs st ON st.Id = s.InchargeId
    WHERE s.GroupId = p_GroupId OR gp.GroupId = p_GroupId
    ORDER BY s.SectionName ASC;
END //
DELIMITER ;
