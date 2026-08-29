import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import "./StudentManagementPage.css";

const YEARS = ["2026-2027", "2025-2026"];
const BOARDS = ["Board of Intermediate Education, Andhra Pradesh", "Telangana Board of Intermediate Education"];
const LEVELS = ["Intermediate 1st Year", "Intermediate 2nd Year"];
const GROUPS = { MPC: ["MPC - Regular", "MPC - JEE Main", "MPC - JEE Advanced"], BiPC: ["BiPC - Regular", "BiPC - NEET"] };
const SECTIONS = { "MPC - Regular": ["A", "B", "C"], "MPC - JEE Main": ["A", "B"], "MPC - JEE Advanced": ["A"], "BiPC - Regular": ["A", "B"], "BiPC - NEET": ["A"] };
const INITIAL = [
  { id: 1, name: "Rahul Kumar", admissionNo: "ADM-2026-0541", group: "MPC", programme: "MPC - Regular", section: "", roll: "", status: "Pending allocation" },
  { id: 2, name: "Priya Sharma", admissionNo: "ADM-2026-0542", group: "MPC", programme: "MPC - Regular", section: "", roll: "", status: "Pending allocation" },
  { id: 3, name: "Arjun Reddy", admissionNo: "ADM-2026-0543", group: "MPC", programme: "MPC - JEE Main", section: "", roll: "", status: "Pending allocation" },
  { id: 4, name: "Sana Fatima", admissionNo: "ADM-2026-0544", group: "BiPC", programme: "BiPC - Regular", section: "", roll: "", status: "Pending allocation" },
];

export default function SectionAllocationPage() {
  const [context, setContext] = useState({ board: BOARDS[0], year: YEARS[0], level: LEVELS[0], group: "MPC", programme: "MPC - Regular", section: "A" });
  const [students, setStudents] = useState(INITIAL);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const programmes = GROUPS[context.group] || [];
  const sections = SECTIONS[context.programme] || [];
  const scoped = useMemo(() => students.filter((student) => student.group === context.group && student.programme === context.programme), [context.group, context.programme, students]);
  const update = (key, value) => setContext((current) => ({ ...current, [key]: value, ...(key === "group" ? { programme: GROUPS[value]?.[0] || "", section: "" } : {}), ...(key === "programme" ? { section: "" } : {}) }));
  const allocate = () => {
    if (!context.year || !context.level || !context.group || !context.programme || !context.section) return setMessage("Select Academic Year, Academic Level, Group, Programme and Section.");
    const capacity = 2;
    const current = scoped.filter((student) => student.section === context.section).length;
    if (current >= capacity) return setMessage(`Section ${context.section} is full. Choose another section.`);
    let remaining = capacity - current;
    setStudents((rows) => rows.map((student) => {
      if (!remaining || student.group !== context.group || student.programme !== context.programme || student.section === context.section) return student;
      remaining -= 1;
      return { ...student, section: context.section, status: "Section Allocated", roll: "" };
    }));
    setMessage("Section allocation saved successfully.");
  };
  const generateRolls = () => {
    const allocated = scoped.filter((student) => student.section === context.section && ["Section Allocated", "Roll pending", "Active", "Roll Allocated"].includes(student.status));
    if (!allocated.length) return setMessage("Allocate students to a section before generating roll numbers.");
    const prefix = `${context.group}-${context.programme.replace(/^.*?-\s*/, "").replace(/\s+/g, "-").toUpperCase()}-${context.section}`;
    allocated.sort((a, b) => a.admissionNo.localeCompare(b.admissionNo, undefined, { numeric: true }));
    setStudents((rows) => rows.map((student) => {
      const index = allocated.findIndex((item) => item.id === student.id);
      return index < 0 ? student : { ...student, roll: `${prefix}-${String(index + 1).padStart(3, "0")}`, status: "Roll Allocated" };
    }));
    setMessage("Roll numbers generated successfully.");
  };
  const saveEdit = () => {
    if (!editing.programme || !editing.section || !(SECTIONS[editing.programme] || []).includes(editing.section)) return setMessage("Choose a valid Programme and Section combination.");
    setStudents((rows) => rows.map((student) => student.id === editing.id ? { ...student, programme: editing.programme, section: editing.section, roll: "", status: "Roll pending" } : student));
    setEditing(null); setMessage("Placement changed. Roll number regeneration is required.");
  };
  return <DashboardLayout title="Section Allocation" subtitle="Allocate admitted students by admission order before generating roll numbers." breadcrumb={["People", "Section Allocation"]} actions={<Link className="cms-btn cms-btn-ghost" to="/dashboard/students">Student Management</Link>}>
    <section className="cms-card"><div className="cms-card-head"><div><h2>Section Allocation</h2><p>Use admission order only. Students shown here represent completed admissions.</p></div></div><div className="cms-card-body student-management-filters">{[["Board", "board", BOARDS], ["Academic Year", "year", YEARS], ["Academic Level", "level", LEVELS], ["Group", "group", Object.keys(GROUPS)], ["Programme", "programme", programmes], ["Section", "section", sections]].map(([label, key, options]) => <label className="cms-field" key={key}><span>{label}</span><select value={context[key]} onChange={(event) => update(key, event.target.value)}><option value="">Select {label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div><div className="student-management-actions"><button className="cms-btn cms-btn-primary" onClick={allocate}>Save Section Allocation</button><button className="cms-btn cms-btn-ghost" onClick={generateRolls}>Generate Roll Numbers</button></div></section>
    <section className="cms-card"><div className="cms-card-head"><div><h2>Students</h2><p>{scoped.length} students in the selected Group and Programme.</p></div></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Student Name</th><th>Admission No.</th><th>Programme</th><th>Current Section</th><th>Allocation Section</th><th>Roll No.</th><th>Status</th><th>Action</th></tr></thead><tbody>{scoped.length ? scoped.map((student) => <tr key={student.id}><td className="cms-font-semibold">{student.name}</td><td>{student.admissionNo}</td><td>{student.programme}</td><td>{student.section || "Pending"}</td><td>{context.section || "-"}</td><td>{student.roll || "Pending"}</td><td><StatusBadge value={student.status} /></td><td><button className="cms-action-link" onClick={() => setEditing(student)}>Edit</button></td></tr>) : <tr><td colSpan="8"><div className="cms-empty">No admitted students found for this Group and Programme.</div></td></tr>}</tbody></table></div></section>
    {editing ? <Modal title="Change Programme / Section" onClose={() => setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={saveEdit}>Confirm Change</button></>}><p><strong>{editing.name}</strong> · {editing.admissionNo}</p><p>Current: {editing.programme} · Section {editing.section || "Pending"} · Roll {editing.roll || "Pending"}</p><div className="cms-form-grid"><label className="cms-field"><span>New Programme</span><select value={editing.programme} onChange={(event) => setEditing({ ...editing, programme: event.target.value, section: "" })}>{programmes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="cms-field"><span>New Section</span><select value={editing.section} onChange={(event) => setEditing({ ...editing, section: event.target.value })}><option value="">Select Section</option>{(SECTIONS[editing.programme] || []).map((item) => <option key={item}>{item}</option>)}</select></label></div></Modal> : null}<Toast message={message} onClose={() => setMessage("")} />
  </DashboardLayout>;
}
