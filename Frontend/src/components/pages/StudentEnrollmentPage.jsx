import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const groups = { MPC: ["MPC", "MPC with Computer Science"], BiPC: ["BiPC", "BiPC with Biotechnology"], CEC: ["CEC"] };
export default function StudentEnrollmentPage({ id }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [serverStudents, setServerStudents] = useState([]);
  const [form, setForm] = useState({ academicYear: "2026-2027", board: "Board of Intermediate Education", level: "Intermediate 1st Year", group: "MPC", programme: "MPC", section: "A" });
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([apiClient.get(apiEndpoints.students.getById(id)), apiClient.get(apiEndpoints.students.getAll)])
      .then(([{ data }, studentsResponse]) => {
        const record = data?.data ?? data;
        if (!record || typeof record !== "object") throw new Error("Student record was not found.");
        const mapped = {
          ...record,
          id: record.studentId ?? record.id ?? id,
          studentId: record.studentId ?? record.id ?? id,
          name: record.studentName ?? record.fullName ?? record.name ?? "Student",
          admissionNo: record.admissionNo ?? record.admissionNumber ?? "-",
          academicYear: record.academicYearName ?? record.academicYear ?? "2026-2027",
          board: record.boardName ?? record.board ?? "Board of Intermediate Education",
          level: record.academicLevelName ?? record.academicLevel ?? record.levelName ?? "Intermediate 1st Year",
          group: record.groupName ?? record.group ?? "MPC",
          programme: record.programName ?? record.programmeName ?? record.programme ?? "MPC",
          section: record.sectionName ?? record.section ?? "A",
        };
        if (!active) return;
        setStudent(mapped);
        const source = Array.isArray(studentsResponse.data) ? studentsResponse.data : studentsResponse.data?.data ?? studentsResponse.data?.items ?? [];
        setServerStudents(source.map((entry) => ({
          id: entry.studentId ?? entry.id,
          roll: entry.rollNumber ?? entry.rollNo ?? entry.roll ?? "",
          academicYear: entry.academicYearName ?? entry.academicYear ?? "",
          level: entry.academicLevelName ?? entry.academicLevel ?? entry.levelName ?? "",
          group: entry.groupName ?? entry.group ?? "",
          programme: entry.programName ?? entry.programmeName ?? entry.programme ?? "",
          section: entry.sectionName ?? entry.section ?? "",
        })));
        setForm({ academicYear: mapped.academicYear, board: mapped.board, level: mapped.level, group: mapped.group, programme: mapped.programme, section: mapped.section });
      })
      .catch((error) => active && setLoadError(getApiErrorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);
  const roll = useMemo(() => { const scoped = serverStudents.filter((s) => String(s.id) !== String(id) && ["academicYear", "level", "group", "programme", "section"].every((key) => s[key] === form[key])); return String(Math.max(0, ...scoped.map((s) => Number(s.roll) || 0)) + 1).padStart(3, "0"); }, [form, id, serverStudents]);
  if (loading) return <DashboardLayout title="Academic Assignment" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">Loading student record...</div></div></DashboardLayout>;
  if (!student) return <DashboardLayout title="Academic Assignment" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{loadError || "Student record was not found."}</div></div></DashboardLayout>;
  const change = (key) => (event) => { const value = event.target.value; setForm((current) => key === "group" ? { ...current, group: value, programme: groups[value][0] } : { ...current, [key]: value }); };
  const submit = (event) => { event.preventDefault(); setMessage("Academic assignment and roll numbers are saved from Section Allocation so the server remains the single source of truth."); window.setTimeout(() => navigate("/dashboard/section-allocation"), 1200); };
  return <DashboardLayout title="Academic Assignment" subtitle="Assign the admitted student to an academic context." breadcrumb={["People", "Students"]} actions={<Link to={`/dashboard/students/${id}`} className="cms-btn cms-btn-ghost">Back to profile</Link>}><form onSubmit={submit} className="cms-card"><div className="cms-card-body"><div className="cms-profile-hero"><div className="cms-photo">{student.name.split(" ").map((x) => x[0]).join("").slice(0,2)}</div><div><h2>{student.name}</h2><p className="cms-muted">Student ID: {student.studentId} · Admission No: {student.admissionNo}</p></div></div></div><div className="cms-card-head"><h2>Academic Assignment</h2></div><div className="cms-card-body"><div className="cms-form-grid">{[["Academic Year", "academicYear", ["2026-2027", "2025-2026"]], ["Board", "board", ["Board of Intermediate Education"]], ["Academic Level", "level", ["Intermediate 1st Year", "Intermediate 2nd Year"]], ["Group", "group", Object.keys(groups)], ["Programme", "programme", groups[form.group]], ["Section", "section", ["A", "B", "C"]]].map(([label, key, values]) => <label className="cms-field" key={key}><span>{label}</span><select value={form[key]} onChange={change(key)}>{values.map((value) => <option key={value}>{value}</option>)}</select></label>)}</div><div className="student-roll-preview"><span>Generated Roll No</span><strong>{roll}</strong><small>Generated from this academic year, level, group, programme and section.</small></div><button className="cms-btn cms-btn-primary" type="submit">Assign Student</button></div></form><Toast message={message} onClose={() => setMessage("")}/></DashboardLayout>;
}
