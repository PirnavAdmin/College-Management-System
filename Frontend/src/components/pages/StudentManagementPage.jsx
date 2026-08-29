import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Search, UserRoundCheck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import { allStudents } from "@/data/studentManagementData.js";
import "./StudentManagementPage.css";

export const pageConfig = { title: "Student Management", rows: [], fields: [] };
export default function StudentManagementPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ academicYear: "", level: "", group: "", programme: "", section: "", status: "" });
  const students = allStudents();
  const rows = useMemo(() => students.filter((student) => `${student.name} ${student.studentId} ${student.admissionNo} ${student.roll || ""} ${student.mobile}`.toLowerCase().includes(query.toLowerCase()) && Object.entries(filters).every(([key, value]) => !value || String(student[key] || "") === value)), [students, query, filters]);
  const values = (key) => [...new Set(students.map((student) => student[key]).filter(Boolean))];
  return <DashboardLayout title="Student Management" subtitle="View students with completed admission and academic placement." breadcrumb={["People"]} actions={<Link className="cms-btn cms-btn-primary" to="/dashboard/section-allocation">Section Allocation</Link>}>
    <section className="student-summary"><div><span>Total Students</span><strong>{students.length}</strong></div><div><span>Section Allocated</span><strong>{students.filter((s) => s.section).length}</strong></div><div><span>Roll Number Allocated</span><strong>{students.filter((s) => s.roll).length}</strong></div><div><span>Pending Allocation</span><strong>{students.filter((s) => !s.section || !s.roll).length}</strong></div></section>
    <section className="cms-card"><div className="cms-card-body"><label className="student-management-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, ID, admission no, roll no or mobile" /></label></div>
      <div className="student-management-filters">{[["Academic Year", "academicYear"], ["Academic Level", "level"], ["Group", "group"], ["Programme", "programme"], ["Section", "section"], ["Status", "status"]].map(([label, key]) => <label className="cms-field" key={key}><span>{label}</span><select value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}><option value="">All {label}s</option>{values(key).map((value) => <option key={value}>{value}</option>)}</select></label>)}</div>
      <div className="cms-table-wrap"><table className="cms-table"><thead><tr>{["Student ID", "Admission No", "Student Name", "Academic Year", "Academic Level", "Group", "Programme", "Section", "Roll No", "Status", "Actions"].map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{rows.length ? rows.map((s) => <tr key={s.id}><td>{s.studentId}</td><td>{s.admissionNo}</td><td className="cms-font-semibold">{s.name}</td><td>{s.academicYear || "—"}</td><td>{s.level || "—"}</td><td>{s.group || "—"}</td><td>{s.programme || "—"}</td><td>{s.section ? `Section ${s.section}` : "—"}</td><td>{s.roll || "—"}</td><td><StatusBadge value={s.status || "Pending assignment"}/></td><td><div className="student-action-buttons"><Link to={`/dashboard/students/${s.id}`}><Eye size={16}/> View</Link><Link to={`/dashboard/students/${s.id}/enroll`}><UserRoundCheck size={16}/>{s.roll ? "Edit" : "Assign"}</Link></div></td></tr>) : <tr><td colSpan="11"><div className="cms-empty">No students match your search.</div></td></tr>}</tbody></table></div></section>
  </DashboardLayout>;
}
