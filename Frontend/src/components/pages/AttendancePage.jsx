import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { attendanceRoster, sections as mockSections } from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AttendancePage.css";

const marksList = ["Present", "Absent", "Late", "Leave"];

const unwrapList = (data) => (Array.isArray(data) ? data : data?.data || data?.items || []);

const mapNameId = (items, idKeys, nameKeys) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined);
    const name = nameKeys.map((k) => it[k]).find((v) => v !== undefined && v !== "");
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
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
    const load = async () => {
      setLookupsLoading(true);
      try {
        const [b, y, l, g, s, f] = await Promise.all([
          apiClient.get(apiEndpoints.boards.getAll),
          apiClient.get(apiEndpoints.academicYears.getAll),
          apiClient.get(apiEndpoints.boards.academicLevels),
          apiClient.get(apiEndpoints.groups.getAll),
          apiClient.get(apiEndpoints.subjects.getAll),
          apiClient.get(apiEndpoints.faculty.getAll),
        ]);
        if (!mounted) return;

        const bMapped = mapNameId(unwrapList(b.data), ["boardId", "id"], ["boardName", "name"]);
        setBoards(bMapped.names);
        setBoardMap(bMapped.map);

        const yMapped = mapNameId(unwrapList(y.data), ["academicYearId", "id"], ["academicYearName", "name"]);
        setYears(yMapped.names);
        setYearMap(yMapped.map);

        const lMapped = mapNameId(unwrapList(l.data), ["academicLevelId", "id"], ["levelName", "name"]);
        setLevels(lMapped.names);
        setLevelMap(lMapped.map);

        const gMapped = mapNameId(unwrapList(g.data), ["groupId", "id"], ["groupName", "name"]);
        setGroups(gMapped.names);
        setGroupMap(gMapped.map);

        const sMapped = mapNameId(unwrapList(s.data), ["subjectId", "id"], ["subjectName", "name"]);
        setSubjects(sMapped.names);
        setSubjectMap(sMapped.map);

        const fMapped = mapNameId(unwrapList(f.data), ["id", "facultyId"], ["fullName", "name"]);
        setFaculty(fMapped.names);
        setFacultyMap(fMapped.map);
      } catch (err) {
        setToast("Failed to load filter options. Please refresh and try again.");
      } finally {
        if (mounted) setLookupsLoading(false);
      }
    };
    load();
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
        const mapped = mapNameId(unwrapList(res.data), ["sectionId", "id"], ["sectionName", "name"]);
        if (mapped.names.length) {
          setSections(mapped.names);
          setSectionMap(mapped.map);
        } else {
          const fallback = mockSections.filter((s) => s.group === filters.group).map((s) => s.name);
          const fallbackMap = {};
          fallback.forEach((name, index) => (fallbackMap[name] = index + 1));
          setSections(fallback);
          setSectionMap(fallbackMap);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = mockSections.filter((s) => s.group === filters.group).map((s) => s.name);
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

  const load = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };
  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast("Attendance saved successfully");
    }, 600);
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
                <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
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
            <table className="cms-table">
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