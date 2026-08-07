import { useEffect, useState } from "react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./PromoteStudents.css";

const PROMOTIONS_STORAGE_KEY = "cms_promotions";
const STUDENTS_STORAGE_KEY = "cms_promotion_students";
const ACADEMIC_YEARS = ["2024-2025", "2025-2026", "2026-2027"];
const ACADEMIC_LEVELS = ["Intermediate First Year", "Intermediate Second Year"];
const BOARDS = ["Andhra Pradesh Board of Intermediate Education (BIEAP)", "Telangana State Board of Intermediate Education (TSBIE)", "CBSE", "Other"];
const GROUPS = ["MPC", "BiPC", "MEC", "CEC", "HEC"];
const SECTIONS = ["A", "B", "C"];
const DEMO_STUDENTS = [
  { id: "STU-1001", admissionNo: "ADM-2025-001", rollNumber: "MPC-01", studentName: "Ravi Kumar", currentYear: "Intermediate First Year", group: "MPC", section: "A", attendance: 92, result: "Pass" },
  { id: "STU-1002", admissionNo: "ADM-2025-002", rollNumber: "MPC-02", studentName: "Priya Sharma", currentYear: "Intermediate First Year", group: "MPC", section: "A", attendance: 88, result: "Pass" },
  { id: "STU-1003", admissionNo: "ADM-2025-003", rollNumber: "MPC-03", studentName: "Suresh Reddy", currentYear: "Intermediate First Year", group: "MPC", section: "B", attendance: 79, result: "Pass" },
  { id: "STU-1004", admissionNo: "ADM-2025-004", rollNumber: "BPC-01", studentName: "Anjali Devi", currentYear: "Intermediate First Year", group: "BiPC", section: "A", attendance: 95, result: "Pass" },
  { id: "STU-1005", admissionNo: "ADM-2025-005", rollNumber: "BPC-02", studentName: "Karthik Rao", currentYear: "Intermediate First Year", group: "BiPC", section: "B", attendance: 83, result: "Pass" },
  { id: "STU-1006", admissionNo: "ADM-2025-006", rollNumber: "MEC-01", studentName: "Meghana Das", currentYear: "Intermediate First Year", group: "MEC", section: "A", attendance: 74, result: "Pass" },
  { id: "STU-1007", admissionNo: "ADM-2025-007", rollNumber: "CEC-01", studentName: "Vikram Singh", currentYear: "Intermediate First Year", group: "CEC", section: "C", attendance: 89, result: "Fail" },
  { id: "STU-1008", admissionNo: "ADM-2025-008", rollNumber: "HEC-01", studentName: "Nandini Roy", currentYear: "Intermediate First Year", group: "HEC", section: "A", attendance: 91, result: "Pass" },
];

const initialForm = {
  academicYear: "",
  currentAcademicLevel: "",
  promoteTo: "",
  board: "",
  group: "",
  section: "",
  promotionDate: "",
  remarks: "",
  promoteAll: false,
};

const initialStudentFilters = { search: "", group: "", section: "", result: "", attendance: "" };

export default function PromoteStudents() {
  const [form, setForm] = useState(initialForm);
  const [studentFilters, setStudentFilters] = useState(initialStudentFilters);
  const [students, setStudents] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setStudents(readStudents());
    setPromotions(readStorage(PROMOTIONS_STORAGE_KEY));
  }, []);

  const promotedStudentIds = new Set(promotions.map((promotion) => promotion.studentId));
  const eligibleStudents = students.filter((student) => {
    const isEligible = student.result === "Pass" && student.attendance >= 75 && !promotedStudentIds.has(student.id);
    const matchesForm = (!form.currentAcademicLevel || student.currentYear === form.currentAcademicLevel) && (!form.group || student.group === form.group);
    const matchesFilters = (!studentFilters.search || `${student.studentName} ${student.admissionNo}`.toLowerCase().includes(studentFilters.search.toLowerCase())) && (!studentFilters.group || student.group === studentFilters.group) && (!studentFilters.section || student.section === studentFilters.section) && (!studentFilters.result || student.result === studentFilters.result) && (!studentFilters.attendance || (studentFilters.attendance === "75+" ? student.attendance >= 75 : student.attendance < 75));
    return isEligible && matchesForm && matchesFilters;
  });
  const allStudentsSelected = eligibleStudents.length > 0 && selectedStudentIds.length === eligibleStudents.length;
  const alreadyPromoted = promotedStudentIds.size;
  const pendingStudents = Math.max(eligibleStudents.length - selectedStudentIds.length, 0);
  const promotionHistory = Object.values(promotions.reduce((history, promotion) => {
    if (!history[promotion.promotionId]) {
      history[promotion.promotionId] = {
        promotionDate: promotion.promotionDate,
        academicYear: promotion.academicYear,
        promotedFrom: `${promotion.fromLevel} ${promotion.group}`,
        promotedTo: `${promotion.toLevel} ${promotion.group}`,
        totalStudents: 0,
        status: promotion.status,
      };
    }
    history[promotion.promotionId].totalStudents += 1;
    return history;
  }, {}));

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSuccessMessage("");
  };

  const updateStudentFilter = (field, value) => {
    setStudentFilters((current) => ({ ...current, [field]: value }));
    setSelectedStudentIds([]);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  };

  const toggleAllStudents = () => {
    setSelectedStudentIds(allStudentsSelected ? [] : eligibleStudents.map((student) => student.id));
  };

  const togglePromoteAll = (checked) => {
    updateForm("promoteAll", checked);
    setSelectedStudentIds(checked ? eligibleStudents.map((student) => student.id) : []);
  };

  const validate = () => {
    const nextErrors = {};
    ["academicYear", "currentAcademicLevel", "promoteTo", "board", "group", "section", "promotionDate"].forEach((field) => {
      if (!form[field]) nextErrors[field] = "This field is required.";
    });
    if (!selectedStudentIds.length) nextErrors.students = "Select at least one eligible student.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const promotionMessage = () => `You are promoting\n\n${selectedStudentIds.length} students\n\nFrom\n${form.currentAcademicLevel} ${form.group}\n\nTo\n${form.promoteTo} ${form.group}\n\nContinue?`;

  const handlePreview = () => {
    if (!validate()) return;
    window.confirm(promotionMessage());
  };

  const handlePromote = () => {
    if (!validate() || !window.confirm(promotionMessage())) return;

    const selectedStudents = eligibleStudents.filter((student) => selectedStudentIds.includes(student.id));
    const promotionId = createPromotionId();
    const newPromotions = selectedStudents.map((student) => ({
      promotionId,
      studentId: student.id,
      studentName: student.studentName,
      academicYear: form.academicYear,
      fromLevel: form.currentAcademicLevel,
      toLevel: form.promoteTo,
      group: form.group,
      section: form.section,
      promotionDate: form.promotionDate,
      status: "Promoted",
    }));
    const nextPromotions = [...promotions, ...newPromotions];

    localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(nextPromotions));
    setPromotions(nextPromotions);
    setSelectedStudentIds([]);
    setSuccessMessage("Students promoted successfully.");
  };

  const handleReset = () => {
    setForm(initialForm);
    setStudentFilters(initialStudentFilters);
    setSelectedStudentIds([]);
    setErrors({});
    setSuccessMessage("");
  };

  return (
    <section className="promoteStudents">
      <PageHeader title="Promotion Management" subtitle="Dashboard / Examination / Promotion Management" />
      {successMessage ? <div className="promotionToast">{successMessage}</div> : null}

      <form className="promoteStudentsForm" noValidate onSubmit={(event) => event.preventDefault()}>
        <Card className="promotionDetailsCard">
          <SectionTitle title="Promotion Details" />
          <div className="promotionFilterGrid">
            <SelectField label="Academic Year" field="academicYear" placeholder="Select academic year" options={ACADEMIC_YEARS} values={form} errors={errors} onChange={updateForm} />
            <SelectField label="Current Academic Level" field="currentAcademicLevel" placeholder="Select current level" options={ACADEMIC_LEVELS} values={form} errors={errors} onChange={updateForm} />
            <SelectField label="Promote To" field="promoteTo" placeholder="Select next level" options={ACADEMIC_LEVELS} values={form} errors={errors} onChange={updateForm} />
            <SelectField label="Board" field="board" placeholder="Select board" options={BOARDS} values={form} errors={errors} onChange={updateForm} />
            <SelectField label="Group" field="group" placeholder="Select group" options={GROUPS} values={form} errors={errors} onChange={updateForm} />
            <SelectField label="Section" field="section" placeholder="Select section" options={SECTIONS} values={form} errors={errors} onChange={updateForm} />
            <DateField label="Promotion Date" field="promotionDate" values={form} errors={errors} onChange={updateForm} />
            <FormField label="Remarks" error={errors.remarks}><textarea className="textarea" value={form.remarks} onChange={(event) => updateForm("remarks", event.target.value)} placeholder="Add optional remarks" rows="1" /></FormField>
          </div>
          <label className="promotionAllControl"><input type="checkbox" checked={form.promoteAll} onChange={(event) => togglePromoteAll(event.target.checked)} /> Promote all eligible students</label>
          {errors.students ? <span className="field-error">{errors.students}</span> : null}
          <div className="promotionActions">
            <Button type="button" onClick={handleReset}>Reset</Button>
            <Button type="button" onClick={handlePreview}>Preview Promotion</Button>
            <Button type="button" variant="primary" onClick={handlePromote}>Promote Students</Button>
          </div>
        </Card>

        <Card className="eligibleStudentsCard" padded={false}>
          <div className="eligibleStudentsHeader">
            <div><SectionTitle title="Eligible Students" /><p>Only students with a pass result and at least 75% attendance are shown.</p></div>
            <label className="selectAllControl"><input type="checkbox" checked={allStudentsSelected} onChange={toggleAllStudents} /> Select All</label>
          </div>
          <div className="promotionStudentFilters">
            <input className="input promotionSearch" type="search" value={studentFilters.search} onChange={(event) => updateStudentFilter("search", event.target.value)} placeholder="Search by Name / Admission No" />
            <FilterSelect label="All Groups" field="group" options={GROUPS} filters={studentFilters} onChange={updateStudentFilter} />
            <FilterSelect label="All Sections" field="section" options={SECTIONS} filters={studentFilters} onChange={updateStudentFilter} />
            <FilterSelect label="All Results" field="result" options={["Pass", "Fail"]} filters={studentFilters} onChange={updateStudentFilter} />
            <FilterSelect label="Attendance" field="attendance" options={["75+", "Below 75"]} filters={studentFilters} onChange={updateStudentFilter} />
          </div>
          <DataTable
            columns={[
              { key: "selection", label: <input aria-label="Select all students" type="checkbox" checked={allStudentsSelected} onChange={toggleAllStudents} />, render: (row) => <input aria-label={`Select ${row.studentName}`} type="checkbox" checked={selectedStudentIds.includes(row.id)} onChange={() => toggleStudent(row.id)} /> },
              { key: "id", label: "Student ID" },
              { key: "admissionNo", label: "Admission No" },
              { key: "rollNumber", label: "Roll Number" },
              { key: "studentName", label: "Student Name", render: (row) => <strong>{row.studentName}</strong> },
              { key: "currentYear", label: "Current Year" },
              { key: "group", label: "Current Group" },
              { key: "section", label: "Current Section" },
              { key: "attendance", label: "Attendance %", render: (row) => `${row.attendance}%` },
              { key: "result", label: "Result", render: (row) => <StatusBadge status={row.result} /> },
              { key: "promotionStatus", label: "Promotion Status", render: () => <StatusBadge status="Eligible" /> },
              { key: "action", label: "Action", render: (row) => <Button type="button" onClick={() => window.alert(`${row.studentName}\nAdmission No: ${row.admissionNo}`)}>View Profile</Button> },
            ]}
            rows={eligibleStudents}
            empty={<EmptyState title="No eligible students" message="No students match the current filters." />}
          />
        </Card>

        <section className="promotionSummary" aria-label="Promotion summary">
          <SummaryCard label="Eligible Students" value={eligibleStudents.length} />
          <SummaryCard label="Selected Students" value={selectedStudentIds.length} tone="success" />
          <SummaryCard label="Already Promoted" value={alreadyPromoted} tone="accent" />
          <SummaryCard label="Pending Students" value={pendingStudents} tone="warning" />
        </section>

        <Card className="promotionHistoryCard" padded={false}>
          <div className="promotionHistoryHeader"><SectionTitle title="Promotion History" /></div>
          <DataTable
            columns={[
              { key: "promotionDate", label: "Promotion Date", render: (row) => formatDate(row.promotionDate) },
              { key: "academicYear", label: "Academic Year" },
              { key: "promotedFrom", label: "Promoted From" },
              { key: "promotedTo", label: "Promoted To" },
              { key: "totalStudents", label: "Total Students" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={promotionHistory}
            empty={<EmptyState title="No promotion history" message="Completed promotions will appear here." />}
          />
        </Card>
      </form>
    </section>
  );
}

function SectionTitle({ title }) { return <h2 className="promotionSectionTitle">{title}</h2>; }
function SummaryCard({ label, value, tone = "default" }) { return <Card className={`promotionMetric promotionMetric-${tone}`}><span>{label}</span><strong>{value}</strong></Card>; }
function StatusBadge({ status }) { return <span className={`promotionStatus promotionStatus-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }

function SelectField({ label, field, placeholder, options, values, errors, onChange }) {
  return <FormField label={<>{label} <b>*</b></>} error={errors[field]}><select className="select" value={values[field]} onChange={(event) => onChange(field, event.target.value)} required><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormField>;
}

function DateField({ label, field, values, errors, onChange }) {
  return <FormField label={<>{label} <b>*</b></>} error={errors[field]}><input className="input" type="date" value={values[field]} onChange={(event) => onChange(field, event.target.value)} required /></FormField>;
}

function FilterSelect({ label, field, options, filters, onChange }) {
  return <select className="select" value={filters[field]} onChange={(event) => onChange(field, event.target.value)}><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function readStudents() {
  const storedStudents = readStorage(STUDENTS_STORAGE_KEY);
  if (storedStudents.length) return storedStudents;
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(DEMO_STUDENTS));
  return DEMO_STUDENTS;
}

function readStorage(key) {
  try { const data = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(data) ? data : []; } catch { return []; }
}

function createPromotionId() { return `PROM-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`; }
function formatDate(value) { if (!value) return ""; const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
