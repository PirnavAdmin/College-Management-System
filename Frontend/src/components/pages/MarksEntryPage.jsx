import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Check as FiCheck, Pencil as FiEdit2, Save as FiSave, Trash2 as FiTrash2 } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout";
import "./MarksEntryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || " ";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    "ngrok-skip-browser-warning": "true"
  };
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = data?.message ?? data?.title ?? (typeof data === "string" ? data : "API request failed");
    throw new Error(message);
  }
  return data;
};

const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

// Fallback Data definitions
const FALLBACK_ACADEMIC_YEARS = [
  { id: 1, year: "2025-2026" },
  { id: 2, year: "2026-2027" }
];
const FALLBACK_SECTIONS = [
  { id: 1, sectionName: "Section A" },
  { id: 2, sectionName: "Section B" }
];
const FALLBACK_SUBJECTS = [
  { subjectId: 1, subjectName: "Mathematics", subjectCode: "MATH101", passingMarks: 35 },
  { subjectId: 2, subjectName: "Physics", subjectCode: "PHY101", passingMarks: 35 },
  { subjectId: 3, subjectName: "Chemistry", subjectCode: "CHEM101", passingMarks: 35 }
];
const FALLBACK_STUDENTS = [
  { studentId: 101, rollNo: "UG2026001", studentName: "Rahul Kumar" },
  { studentId: 102, rollNo: "UG2026002", studentName: "Sai Kiran" },
  { studentId: 103, rollNo: "UG2026003", studentName: "Ananya Reddy" }
].map((s) => ({
  ...s,
  markId: null,
  internalMarks: "",
  practicalMarks: "",
  theoryMarks: "",
  passingMarks: 35,
  verified: false
}));

const blankFilters = {
  board: "",
  academicYearId: "",
  academicLevel: "",
  groupId: "",
  sectionId: "",
  examinationId: "",
  subjectId: ""
};
const fieldLabels = {
  board: "Board",
  academicYearId: "Academic Year",
  academicLevel: "Academic Level",
  groupId: "Group",
  sectionId: "Section",
  examinationId: "Examination",
  subjectId: "Subject"
};

const totalOf = (s) =>
  (Number(s.internalMarks) || 0) + (Number(s.practicalMarks) || 0) + (Number(s.theoryMarks) || 0);
const isComplete = (s) => s.internalMarks !== "" && s.practicalMarks !== "" && s.theoryMarks !== "";
const gradeOf = (total) =>
  total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";
const validateMark = (value, maximum) =>
  value === "" || value === null || value === undefined
    ? "Required"
    : !/^\d+$/.test(String(value))
    ? "Whole numbers only"
    : Number(value) > maximum
    ? `0-${maximum} max`
    : "";
const markErrors = (s) => ({
  internalMarks: s.internalMarks === "" ? "" : validateMark(s.internalMarks, 30),
  practicalMarks: s.practicalMarks === "" ? "" : validateMark(s.practicalMarks, 30),
  theoryMarks: s.theoryMarks === "" ? "" : validateMark(s.theoryMarks, 40)
});
const isStudentValid = (s) => Object.values(markErrors(s)).every((error) => !error);
const extractArray = (response) =>
  Array.isArray(response)
    ? response
    : ["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key]))
    ? response[["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key]))]
    : null;
const asValue = (value) => (value === null || value === undefined ? "" : String(value));

function GradeBadge({ total, complete }) {
  const grade = complete ? gradeOf(total) : "—";
  return (
    <span className={`cms-badge-grade ${complete ? `cms-grade-${grade.toLowerCase().replace("+", "-plus")}` : "cms-is-empty"}`}>
      {grade}
    </span>
  );
}

function StatusBadge({ verified }) {
  return (
    <span className={`cms-badge-status ${verified ? "cms-status-verified" : "cms-status-pending"}`}>
      <span className="cms-badge-dot" />
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

export default function MarksEntry() {
  const [filters, setFilters] = useState(blank), [ready, setReady] = useState(false), [tab, setTab] = useState("evaluations"), [evaluations, setEvaluations] = useState(TEMP_EVALUATIONS), [evaluation, setEvaluation] = useState(null), [editing, setEditing] = useState(false), [rows, setRows] = useState([]);
  const subjects = GROUP_SUBJECTS[filters.group || "MPC"];
  const change = (key, value) => setFilters((p) => ({ ...p, [key]: value, ...(key === "board" ? { academicYear: "", academicLevel: "", group: "", section: "", examination: "" } : {}), ...(key === "academicYear" ? { academicLevel: "", group: "", section: "", examination: "" } : {}), ...(key === "academicLevel" ? { group: "", section: "", examination: "" } : {}), ...(key === "group" ? { section: "", examination: "" } : {}), ...(key === "section" ? { examination: "" } : {}) }));
  const open = (item) => { const practical = PRACTICAL_SUBJECTS.includes(item.subjectName); setRows(TEMP_RESULTS.map((x, i) => ({ ...x, internal: 20 + i, theory: practical ? 60 + i * 3 : 65 + i * 3, practical: practical ? 18 + i : 0 }))); setEditing(false); setEvaluation(item); };
  const status = (id, s) => { setEvaluations((old) => old.map((x) => x.evaluationId === id ? { ...x, status: s } : x)); setEvaluation((current) => current?.evaluationId === id ? { ...current, status: s } : current); };
  const updateMark = (i, k, v) => /^\d*$/.test(v) && setRows((old) => old.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return <DashboardLayout title="Academic Evaluation" subtitle="Review, verify and approve faculty submitted evaluations." breadcrumb={["Examinations"]}>
    <section className="cms-marks-entry cms-anim-up"><div className="cms-card cms-card-filter">
    <div className="cms-section-heading"><div><h2>Evaluation Filters</h2><p>Choose the academic context before reviewing faculty submissions.</p></div><button className="cms-btn cms-btn-primary" onClick={() => Object.values(filters).every(Boolean) && setReady(true)}>Fetch Evaluation Data</button></div><div className="cms-filter-grid"><Select label="Board" value={filters.board} onChange={(v) => change("board", v)}/><Select label="Academic Year" value={filters.academicYear} disabled={!filters.board} onChange={(v) => change("academicYear", v)}/><Select label="Academic Level" value={filters.academicLevel} disabled={!filters.academicYear} onChange={(v) => change("academicLevel", v)}/><Select label="Group" value={filters.group} disabled={!filters.academicLevel} onChange={(v) => change("group", v)}/><Select label="Section" value={filters.section} disabled={!filters.group} onChange={(v) => change("section", v)}/><Select label="Examination" value={filters.examination} disabled={!filters.section} onChange={(v) => change("examination", v)}/></div></div>{ready ? <><Summary evaluations={evaluations}/><div className="cms-card"><div className="cms-table-toolbar"><div className="cms-tab-bar">{[["evaluations", "Evaluations"], ["marks", "Student Subject Marks"]].map(([a, b]) => <button className={`cms-tab-btn ${tab === a ? "cms-active" : ""}`} key={a} onClick={() => setTab(a)}>{b}</button>)}</div></div>{tab === "evaluations" ? <EvaluationTable items={evaluations} open={open}/> : <MarksTable items={TEMP_STUDENT_MARKS} subjects={subjects}/>}</div></> : <div className="cms-card cms-empty-table">Select all filters and fetch evaluation data </div>}{evaluation && <EvaluationModal item={evaluation} filters={filters} rows={rows} editing={editing} setEditing={setEditing} updateMark={updateMark} updateStatus={status} close={() => setEvaluation(null)}/>}</section></DashboardLayout>;
}
function EvaluationTable({ items, open }) { return <Table headers={["Subject", "Faculty", "Students", "Status"]}>{items.map((x) => <tr className="cms-clickable-row" key={x.evaluationId} onClick={() => open(x)}><td>{x.subjectName}</td><td>{x.facultyName}</td><td>{x.studentsCount}</td><td><Badge status={x.status}/></td></tr>)}</Table> }
function MarksTable({ items, subjects }) { return <Table cards headers={["Roll No", "Student", ...subjects, "Total", "Grade"]}>{items.map((x) => <tr key={x.studentId}><td data-label="Roll No">{x.rollNo}</td><td data-label="Student">{x.studentName}</td>{subjects.map((s) => <td data-label={s} key={s}>{x.subjects[s] ?? "—"}</td>)}<td data-label="Total">{x.total} / {subjects.length * MAX_MARKS_PER_SUBJECT}</td><td data-label="Grade">{x.grade}</td></tr>)}</Table> }
function Table({ headers, children, cards }) { return <div className={`cms-table-container cms-table-wrap ${cards ? "cms-responsive-cards" : ""}`}><table className="cms-table"><thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{children}</tbody></table></div> }
function EvaluationModal({ item, filters, rows, editing, setEditing, updateMark, updateStatus, close }) { const practical = PRACTICAL_SUBJECTS.includes(item.subjectName), editable = ["SUBMITTED", "VERIFIED"].includes(item.status); return <Modal title={`${item.subjectName} Evaluation`} close={close}><Details item={item} filters={filters}/><Table headers={["Roll No", "Student Name", "Internal", "Theory", ...(practical ? ["Practical"] : []), "Total", "Grade"]}>{rows.map((x,i) => { const cell=(k)=><td key={k}>{editing && editable ? <input className="cms-mark-input" value={x[k]} onChange={(e)=>updateMark(i,k,e.target.value)}/> : x[k]}</td>, t=totalOf(x); return <tr key={x.studentId}><td>{x.rollNo}</td><td>{x.studentName}</td>{cell("internal")}{cell("theory")}{practical&&cell("practical")}<td>{t} / {MAX_MARKS_PER_SUBJECT}</td><td>{gradeOf(t)}</td></tr>})}</Table><div className="cms-modal-actions cms-sticky-actions">{editable&&<button className="cms-btn cms-btn-secondary" title="Edit" onClick={()=>setEditing(!editing)}><FiEdit2/> Edit</button>}{editing&&editable&&<button className="cms-btn cms-btn-primary" title="Save Changes" onClick={()=>setEditing(false)}><FiSave/> Save Changes</button>}{item.status==="SUBMITTED"&&<><button className="cms-btn cms-btn-success" title="Verify" onClick={()=>updateStatus(item.evaluationId,"VERIFIED")}><FiShield/> Verify</button><button className="cms-btn cms-btn-danger" title="Reject" onClick={()=>updateStatus(item.evaluationId,"REJECTED")}><FiXCircle/> Reject</button></>}{item.status==="VERIFIED"&&<button className="cms-btn cms-btn-primary" title="Approve" onClick={()=>updateStatus(item.evaluationId,"APPROVED")}><FiCheckCircle/> Approve</button>}</div></Modal> }
function Details({ item, filters }) { return <div className="cms-detail-grid">{[["Student Name",item.studentName],["Faculty",item.facultyName],["Roll Number",item.rollNo],["Group",item.group||filters.group],["Section",filters.section],["Examination",filters.examination]].filter(([,v])=>v).map(([a,b])=><div key={a}><strong>{a}</strong><p>{b}</p></div>)}</div> }
function ResultModal({ item, filters, close }) { const marks=TEMP_STUDENT_MARKS.find(x=>x.studentId===item.studentId); return <Modal title="Student Result" close={close} className="cms-result-modal"><Details item={item} filters={filters}/><SubjectRows rows={Object.entries(marks.subjects)}/><ResultSummary item={item}/></Modal> }
function SheetModal({ item, filters, subjects, close }) { const r=TEMP_RESULTS.find(x=>x.studentId===item.studentId); return <Modal title="Full Marksheet" close={close} className="cms-marksheet-modal"><Details item={item} filters={filters}/><SubjectRows rows={subjects.map(s=>[s,item.subjects[s]??0])}/><ResultSummary item={{...r,totalMarks:item.total,grade:item.grade}}/></Modal> }
function SubjectRows({ rows }) { return <Table headers={["Subject","Marks","Grade"]}>{rows.map(([s,m])=><tr key={s}><td>{s}</td><td>{m}</td><td>{gradeOf(m)}</td></tr>)}</Table> }
function ResultSummary({ item }) { return <div className="cms-summary-grid">{[["Total Marks",item.totalMarks],["Percentage",`${item.percentage}%`],["Grade",item.grade],["Result",item.result]].map(([a,b])=><div className="cms-stat-card" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div> }
