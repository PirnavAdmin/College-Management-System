import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { attendanceRoster, sections as mockSections } from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AttendancePage.css";

const marksList = ["Present", "Absent", "Late", "Leave"];
const defaultSectionNames = ["Section A", "Section B"];

// Maps UI labels to the numeric status codes the backend expects.
// Confirm against the AttendanceStatus enum in Swagger's "Schemas" section.
const statusMap = { Present: 1, Absent: 2, Late: 3, Leave: 4 };
const reverseStatusMap = { 1: "Present", 2: "Absent", 3: "Late", 4: "Leave" };

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.data || data?.Data || data?.items || data?.Items || [];
};

const mapNameId = (items, idKeys, nameKeys) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined && v !== null);
    const name = nameKeys.map((k) => it[k]).find((v) => v !== undefined && v !== null && v !== "");
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
};

const getFallbackSections = (groupName) => {
  const matchingSections = mockSections
    .filter((section) => section.group === groupName)
    .map((section) => section.name);
  return matchingSections.length ? matchingSections : defaultSectionNames;
};

export default function AttendancePage() {
  const [filters, setFilters] = useState({ date: "2025-01-15" });
  const [rows, setRows] = useState(attendanceRoster);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [boards, setBoards] = useState([]);
  const [boardMap, setBoardMap] = useState({});
  const [years, setYears] = useState([]);
  const [yearMap, setYearMap] = useState({});
  const [levels, setLevels] = useState([]);
  const [levelMap, setLevelMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [sections, setSections] = useState([]);
  const [sectionMap, setSectionMap] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [subjectMap, setSubjectMap] = useState({});
  const [faculty, setFaculty] = useState([]);
  const [facultyMap, setFacultyMap] = useState({});
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      setLookupsLoading(true);
      try {
        const results = await Promise.allSettled([
          apiClient.get(apiEndpoints.boards.getAll),
          apiClient.get(apiEndpoints.academicYears.getAll),
          apiClient.get(apiEndpoints.boards.academicLevels),
          apiClient.get(apiEndpoints.groups.getAll),
          apiClient.get(apiEndpoints.subjects.getAll),
          apiClient.get(apiEndpoints.faculty.getAll),
        ]);
        if (!mounted) return;

        const loadOptions = (index, setNames, setMap, idKeys, nameKeys) => {
          const result = results[index];
          if (result.status !== "fulfilled") return false;
          const mapped = mapNameId(unwrapList(result.value.data), idKeys, nameKeys);
          setNames(mapped.names);
          setMap(mapped.map);
          return true;
        };

        const succeeded = [
          loadOptions(0, setBoards, setBoardMap, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]),
          loadOptions(1, setYears, setYearMap, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]),
          loadOptions(2, setLevels, setLevelMap, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "name", "Name"]),
          loadOptions(3, setGroups, setGroupMap, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]),
          loadOptions(4, setSubjects, setSubjectMap, ["subjectId", "SubjectId", "id", "Id"], ["subjectName", "SubjectName", "name", "Name"]),
          loadOptions(5, setFaculty, setFacultyMap, ["id", "Id", "facultyId", "FacultyId"], ["fullName", "FullName", "name", "Name"]),
        ];
        if (succeeded.some((success) => !success)) {
          setToast("Some filter options could not be loaded. The available dropdowns can still be used.");
        }
      } catch {
        setToast("Failed to load filter options. Please refresh and try again.");
      } finally {
        if (mounted) setLookupsLoading(false);
      }
    };
    loadLookups();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const groupId = groupMap[filters.group];
    if (!groupId) {
      setSections([]);
      setSectionMap({});
      return;
    }
    apiClient
      .get(apiEndpoints.sections.byGroup(groupId))
      .then((res) => {
        if (!mounted) return;
        const mapped = mapNameId(res.data, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
        if (mapped.names.length) {
          setSections(mapped.names);
          setSectionMap(mapped.map);
        } else {
          const fallback = getFallbackSections(filters.group);
          const fallbackMap = {};
          fallback.forEach((name, index) => (fallbackMap[name] = index + 1));
          setSections(fallback);
          setSectionMap(fallbackMap);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = getFallbackSections(filters.group);
        const fallbackMap = {};
        fallback.forEach((name, index) => (fallbackMap[name] = index + 1));
        setSections(fallback);
        setSectionMap(fallbackMap);
      });
    return () => (mounted = false);
  }, [filters.group, groupMap]);

  const filterFields = [
    { name: "date", label: "Date", type: "date" },
    { name: "board", label: "Board", type: "select", options: boards },
    { name: "year", label: "Academic Year", type: "select", options: years },
    { name: "level", label: "Academic Level", type: "select", options: levels },
    { name: "group", label: "Group", type: "select", options: groups },
    { name: "section", label: "Section", type: "select", options: sections },
    { name: "subject", label: "Subject", type: "select", options: subjects },
    { name: "faculty", label: "Faculty", type: "select", options: faculty },
  ];

  const setMark = (id, mark) => setRows((r) => r.map((x) => (x.id === id ? { ...x, mark } : x)));
  const markAll = () => {
    setRows((r) => r.map((x) => ({ ...x, mark: "Present" })));
    setToast("All students marked present");
  };

  const load = async () => {
    setLoading(true);
    try {
      const payload = {
        boardId: boardMap[filters.board] || 0,
        academicYearId: yearMap[filters.year] || 0,
        academicLevelId: levelMap[filters.level] || 0,
        groupId: groupMap[filters.group] || 0,
        sectionId: sectionMap[filters.section] || 0,
        subjectId: subjectMap[filters.subject] || 0,
        facultyId: facultyMap[filters.faculty] || 0,
        fromDate: filters.date,
        toDate: filters.date,
        pageNumber: 1,
        pageSize: 200,
      };
      const res = await apiClient.post(apiEndpoints.attendance.students, payload);
      const list = unwrapList(res.data).map((s) => ({
        id: s.studentId,
        roll: s.rollNumber,
        name: s.studentName,
        mark: s.isAttendanceMarked ? (reverseStatusMap[s.status] || "Present") : "Present",
      }));
      setRows(list);
    } catch (err) {
      setToast("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        attendanceDate: filters.date,
        boardId: boardMap[filters.board] || 0,
        academicYearId: yearMap[filters.year] || 0,
        academicLevelId: levelMap[filters.level] || 0,
        groupId: groupMap[filters.group] || 0,
        sectionId: sectionMap[filters.section] || 0,
        subjectId: subjectMap[filters.subject] || 0,
        facultyId: facultyMap[filters.faculty] || 0,
        students: rows.map((r) => ({
          studentId: r.id,
          status: statusMap[r.mark],
          remarks: "",
        })),
      };
      await apiClient.post(apiEndpoints.attendance.bulk, payload);
      setToast("Attendance saved successfully");
    } catch (err) {
      setToast("Failed to save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const summary = marksList.map((m) => ({ m, n: rows.filter((r) => r.mark === m).length }));

  return (
    <DashboardLayout title="Attendance Management" subtitle="Mark daily subject-wise attendance." breadcrumb={["Operations"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          {lookupsLoading ? (
            <Loader label="Loading filter options..." />
          ) : (
            <div className="cms-filters">
              {filterFields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  value={filters[f.name]}
                  onChange={(name, value) => setFilters((previous) => (
                    name === "group"
                      ? { ...previous, group: value, section: "" }
                      : { ...previous, [name]: value }
                  ))}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={load}>Load Students</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({ date: filters.date })}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Student Attendance</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {summary.map((s) => (
              <span key={s.m} className="cms-badge cms-badge-info">{s.m}: {s.n}</span>
            ))}
            <button className="cms-btn cms-btn-ghost" onClick={markAll}>Mark All Present</button>
          </div>
        </div>
        {loading ? (
          <Loader label="Loading students..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table cms-attendance-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    <td>
                      <div className="cms-radio-row">
                        {marksList.map((m) => (
                          <label key={m} className={`cms-radio ${r.mark === m ? `on-${m.toLowerCase()}` : ""}`}>
                            <input type="radio" name={`att-${r.id}`} checked={r.mark === m} onChange={() => setMark(r.id, m)} />
                            {m}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={() => setRows(attendanceRoster)}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Attendance"}</button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}