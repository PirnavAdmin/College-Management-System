import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Search, UserRoundCheck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import { allStudents } from "@/data/studentManagementData.js";
import "./StudentManagementPage.css";

export const pageConfig = { title: "Student Management", rows: [], fields: [] };
export default function StudentManagementPage() {
  const [query, setQuery] = useState("");
  const students = allStudents();
  const rows = useMemo(() => students.filter((student) => `${student.name} ${student.studentId} ${student.admissionNo} ${student.roll || ""} ${student.mobile}`.toLowerCase().includes(query.toLowerCase())), [students, query]);
  return <DashboardLayout title="Student Management" subtitle="Manage student academic enrollment without duplicating admission records." breadcrumb={["People"]} actions={<Link className="cms-btn cms-btn-primary" to="/dashboard/admission"><Plus size={16}/> Add / Enroll Student</Link>}>
    <section className="cms-card"><div className="cms-card-body"><label className="student-management-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, ID, admission no, roll no or mobile" /></label></div>
      <div className="cms-table-wrap"><table className="cms-table"><thead><tr>{["Student ID", "Admission No", "Student Name", "Academic Year", "Academic Level", "Group", "Programme", "Section", "Roll No", "Status", "Actions"].map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{rows.length ? rows.map((s) => <tr key={s.id}><td>{s.studentId}</td><td>{s.admissionNo}</td><td className="cms-font-semibold">{s.name}</td><td>{s.academicYear || "—"}</td><td>{s.level || "—"}</td><td>{s.group || "—"}</td><td>{s.programme || "—"}</td><td>{s.section ? `Section ${s.section}` : "—"}</td><td>{s.roll || "—"}</td><td><StatusBadge value={s.status || "Pending assignment"}/></td><td><div className="student-action-buttons"><Link to={`/dashboard/students/${s.id}`}><Eye size={16}/> View</Link><Link to={`/dashboard/students/${s.id}/enroll`}><UserRoundCheck size={16}/>{s.roll ? "Edit" : "Assign"}</Link></div></td></tr>) : <tr><td colSpan="11"><div className="cms-empty">No students match your search.</div></td></tr>}</tbody></table></div></section>
  </DashboardLayout>;
}
