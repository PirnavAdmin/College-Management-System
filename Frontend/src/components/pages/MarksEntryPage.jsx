import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Pencil, Save } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { marks as marksData, options, examinations } from "@/data/mockData.js";
import "./MarksEntryPage.css";

// Fallback Data definitions
const FALLBACK_BOARDS = [{ boardId: 1, boardName: "BIE Telangana", status: true }, { boardId: 2, boardName: "BIE Andhra Pradesh", status: true }, { boardId: 3, boardName: "CBSE", status: true }, { boardId: 4, boardName: "ICSE", status: true }];
const FALLBACK_ACADEMIC_YEARS = [{ id: 1, year: "2025-2026" }, { id: 2, year: "2026-2027" }];
const FALLBACK_GROUPS = [{ id: 1, groupName: "MPC" }, { id: 2, groupName: "BiPC" }, { id: 3, groupName: "CEC" }, { id: 4, groupName: "MEC" }];
const FALLBACK_SECTIONS = [{ id: 1, sectionName: "Section A" }, { id: 2, sectionName: "Section B" }];
const FALLBACK_EXAMS = [{ id: 1, examName: "Semester I" }, { id: 2, examName: "Semester II" }, { id: 3, examName: "Midterm Examination" }];
const FALLBACK_SUBJECTS = [{ subjectId: 1, subjectName: "Mathematics", subjectCode: "MATH101", passingMarks: 35 }, { subjectId: 2, subjectName: "Physics", subjectCode: "PHY101", passingMarks: 35 }, { subjectId: 3, subjectName: "Chemistry", subjectCode: "CHEM101", passingMarks: 35 }];
const FALLBACK_STUDENTS = [{ studentId: 101, rollNo: "UG2026001", studentName: "Rahul Kumar" }, { studentId: 102, rollNo: "UG2026002", studentName: "Sai Kiran" }, { studentId: 103, rollNo: "UG2026003", studentName: "Ananya Reddy" }].map((s) => ({ ...s, markId: null, internalMarks: "", practicalMarks: "", theoryMarks: "", passingMarks: 35, verified: false }));
const ACADEMIC_LEVELS = [{ id: "Intermediate-first-year", label: "Intermediate First Year" }, { id: "Intermediate-second-year", label: "Intermediate Second Year" }];
const blankFilters = { board: "", academicYearId: "", academicLevel: "", groupId: "", sectionId: "", examinationId: "", subjectId: "" };
const fieldLabels = { board: "Board", academicYearId: "Academic Year", academicLevel: "Academic Level", groupId: "Group", sectionId: "Section", examinationId: "Examination", subjectId: "Subject" };

const totalOf = (s) => (Number(s.internalMarks) || 0) + (Number(s.practicalMarks) || 0) + (Number(s.theoryMarks) || 0);
const isComplete = (s) => s.internalMarks !== "" && s.practicalMarks !== "" && s.theoryMarks !== "";
const gradeOf = (total) => total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";
const validateMark = (value, maximum) => value === "" || value === null || value === undefined ? "Required" : !/^\d+$/.test(String(value)) ? "Whole numbers only" : Number(value) > maximum ? `0-${maximum} max` : "";
const markErrors = (s) => ({ internalMarks: s.internalMarks === "" ? "" : validateMark(s.internalMarks, 30), practicalMarks: s.practicalMarks === "" ? "" : validateMark(s.practicalMarks, 30), theoryMarks: s.theoryMarks === "" ? "" : validateMark(s.theoryMarks, 40) });
const isStudentValid = (s) => Object.values(markErrors(s)).every((error) => !error);
const extractArray = (response) => Array.isArray(response) ? response : ["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key])) ? response[["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key]))] : null;
const temporaryDataToast = () => toast.warn("Using temporary data. API unavailable.", { toastId: "temporary-api-data" });
const asValue = (value) => value === null || value === undefined ? "" : String(value);

function GradeBadge({ total, complete }) {
  const tone = !complete ? "cms-badge-inactive" : total >= 90 ? "cms-badge-active" : total >= 40 ? "cms-badge-warn" : "cms-badge-danger";
  return <span className={`cms-badge ${tone}`}>{complete ? gradeOf(total) : "—"}</span>;
}

function StatusBadge({ verified }) {
  return <span className={`cms-badge ${verified ? "cms-badge-active" : "cms-badge-warn"}`}>{verified ? "Verified" : "Pending"}</span>;
}

function SelectField({ label, name, value, onChange, onBlur, error, disabled, children }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`marks-${name}`}>{label}</label>
      <select id={`marks-${name}`} value={value} onChange={(event) => onChange(name, event.target.value)} onBlur={() => onBlur(name)} disabled={disabled}>
        {children}
      </select>
      {error ? <small className="cms-error">{error}</small> : null}
    </div>
  );
}

function StudentTable({ students, editingIds, rowErrors, changeMark, editRow, saveRow, activeTab, selectedVerifyIds, toggleVerifyStudent }) {
  return (
    <table className={`cms-table ${activeTab === "verify" ? "marks-verify-table" : ""}`}>
      <thead><tr>
        <th>Select</th>
        <th>Student</th><th>Internal</th><th>Practical</th><th>Theory</th><th>Total</th><th>Grade</th><th>Status</th>
        {activeTab === "verify" ? <th>Actions</th> : null}
      </tr></thead>
      <tbody>
        {students.length ? students.map((student) => {
          const complete = isComplete(student);
          const total = totalOf(student);
          const editable = editingIds.has(student.studentId) && !student.verified && !student.submitted && (activeTab === "entry" || student.markId);
          const eligible = !student.verified && complete && isStudentValid(student) && student.markId && !editingIds.has(student.studentId);
          const readyForVerification = complete && isStudentValid(student) && !student.verified && !student.submitted;
          return <tr key={student.studentId}>
            <td className="cms-number-cell">{activeTab === "entry"
              ? <input type="checkbox" checked={readyForVerification} disabled={!readyForVerification} onChange={() => {}} aria-label={`Ready for verification: ${student.studentName}`} />
              : <input type="checkbox" checked={selectedVerifyIds.has(student.studentId)} disabled={!eligible} onChange={() => toggleVerifyStudent(student.studentId)} aria-label={`Select ${student.studentName} for verification`} />}
            </td>
            <td><div className="marks-student-info"><strong>{student.studentName}</strong><span className="marks-roll-number">{student.rollNo}</span>{student.submitted ? <span>Submitted</span> : null}</div></td>
            {["internalMarks", "practicalMarks", "theoryMarks"].map((field) => <td className="cms-marks-cell" key={field}>
              <input className={`cms-mini-input cms-marks-input ${rowErrors?.[student.studentId]?.[field] ? "cms-input-error" : ""}`} type="text" inputMode="numeric" value={student[field]} disabled={!editable} onChange={(event) => changeMark(student.studentId, field, event.target.value)} aria-label={`${field} for ${student.studentName}`} />
              {rowErrors?.[student.studentId]?.[field] ? <small className="cms-error">{rowErrors[student.studentId][field]}</small> : null}
            </td>)}
            <td className="cms-strong cms-number-cell">{total}</td><td className="cms-number-cell"><GradeBadge total={total} complete={complete} /></td><td className="cms-number-cell"><StatusBadge verified={student.verified} /></td>
            {activeTab === "verify" ? <td className="cms-number-cell"><div className="cms-actions marks-row-actions">
              {editable && student.markId ? <button type="button" className="cms-action-btn marks-save-action" onClick={() => saveRow(student.studentId)} aria-label={`Save ${student.studentName}`} title="Save marks"><Save size={16} /></button> : null}
              {!editable && student.markId && !student.verified && !student.submitted ? <button type="button" className="cms-action-btn marks-edit-action" onClick={() => editRow(student.studentId)} aria-label={`Edit ${student.studentName}`} title="Edit marks"><Pencil size={16} /></button> : null}
            </div></td> : null}
          </tr>;
        }) : <tr><td className="cms-empty" colSpan={activeTab === "verify" ? 9 : 8}>No students match the current search.</td></tr>}
      </tbody>
    </table>
  );
}


export default function MarksEntryPage() {
 const [boards, setBoards] = useState([]); const [academicYears, setAcademicYears] = useState([]); const [groups, setGroups] = useState([]); const [sections, setSections] = useState([]); const [exams, setExams] = useState([]); const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState(blankFilters); const [filterErrors, setFilterErrors] = useState({}); const [students, setStudents] = useState([]); const [rowErrors, setRowErrors] = useState({}); const [editingIds, setEditingIds] = useState(new Set()); const [selectedVerifyIds, setSelectedVerifyIds] = useState(new Set()); const [activeTab, setActiveTab] = useState("entry"); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false);

  const loadOptions = useCallback(async (url, fallback, setOptions) => {
    try {
      const response = await fetch(url); const items = response.ok ? extractArray(await response.json()) : null;
      if (!items?.length) throw new Error("No usable data");
      setOptions(items);
    } catch { setOptions(fallback); temporaryDataToast(); }
  }, []);

  useEffect(() => {
    loadOptions("/api/v1/boards", FALLBACK_BOARDS, setBoards); loadOptions("/api/v1/academic-years", FALLBACK_ACADEMIC_YEARS, setAcademicYears); loadOptions("/api/v1/groups", FALLBACK_GROUPS, setGroups); loadOptions("/api/v1/exams", FALLBACK_EXAMS, setExams);
  }, [loadOptions]);
  useEffect(() => {
    if (!filters.groupId) { setSections([]); setSubjects([]); return; }
    loadOptions(`/api/v1/sections/group/${filters.groupId}`, FALLBACK_SECTIONS, setSections); loadOptions(`/api/v1/subjects/group/${filters.groupId}`, FALLBACK_SUBJECTS, setSubjects);
  }, [filters.groupId, loadOptions]);

  const allFiltersSelected = useMemo(() => Object.values(filters).every(Boolean), [filters]);
  const visibleStudents = useMemo(() => { const term = search.trim().toLowerCase(); if (!term) return students; const rank = (student) => { const rollNo = student.rollNo.toLowerCase(); const studentName = student.studentName.toLowerCase(); return rollNo === term ? 0 : rollNo.startsWith(term) ? 1 : studentName.startsWith(term) ? 2 : studentName.includes(term) ? 3 : 4; }; return students.filter((student) => rank(student) < 4).sort((a, b) => rank(a) - rank(b)); }, [search, students]);
  const stats = useMemo(() => { const entered = students.filter(isComplete); const totals = entered.map(totalOf); return { total: students.length, entered: entered.length, verified: students.filter((s) => s.verified).length, pending: students.filter((s) => !s.verified).length, average: totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 0, highest: totals.length ? Math.max(...totals, 0) : 0 }; }, [students]);
  const submitBlocker = useMemo(() => !students.length ? "Load student records before submitting." : !students.some((student) => student.verified && !student.submitted) ? "Verify at least one student before submission." : "", [students]);
  const mapStudent = useCallback((student, mark = {}) => ({ studentId: student.studentId ?? student.student_id ?? student.id ?? mark.studentId ?? mark.student_id, rollNo: student.rollNo ?? student.roll_no ?? mark.rollNo ?? mark.roll_no ?? "—", studentName: student.studentName ?? student.student_name ?? student.name ?? mark.studentName ?? mark.student_name ?? "Student", markId: mark.markId ?? mark.mark_id ?? mark.id ?? null, internalMarks: asValue(mark.internalMarks ?? mark.internal_marks ?? student.internalMarks ?? student.internal_marks), practicalMarks: asValue(mark.practicalMarks ?? mark.practical_marks ?? student.practicalMarks ?? student.practical_marks), theoryMarks: asValue(mark.theoryMarks ?? mark.theory_marks ?? student.theoryMarks ?? student.theory_marks), passingMarks: Number(mark.passingMarks ?? mark.passing_marks ?? student.passingMarks ?? student.passing_marks) || 35, verified: Boolean(mark.verified ?? mark.isVerified ?? mark.is_verified ?? student.verified), submitted: Boolean(mark.submitted ?? mark.isSubmitted ?? mark.is_submitted ?? student.submitted) }), []);

  const changeFilter = useCallback((name, value) => { setFilters((previous) => ({ ...previous, [name]: value, ...(name === "groupId" ? { subjectId: "", sectionId: "" } : {}) })); setFilterErrors((previous) => ({ ...previous, [name]: undefined })); }, []);
  const validateFilter = useCallback((name) => setFilterErrors((previous) => ({ ...previous, [name]: filters[name] ? undefined : `Select ${fieldLabels[name]}` })), [filters]);

  const checkStudents = useCallback(async () => {
    const errors = Object.fromEntries(Object.entries(filters).filter(([, value]) => !value).map(([name]) => [name, `Select ${fieldLabels[name]}`])); setFilterErrors(errors); if (Object.keys(errors).length) { toast.error("Please complete all assessment filters."); return; }
    setLoading(true); setRowErrors({}); setSelectedVerifyIds(new Set()); setSearch(""); setActiveTab("entry");
    try {
      const response = await fetch(`/api/v1/marks/exam/${filters.examinationId}`); const records = response.ok ? extractArray(await response.json()) : null;
      if (!records?.length) throw new Error("No usable data");
      const loaded = records.map((record) => mapStudent(record, record)).filter((student) => student.studentId !== undefined);
      if (!loaded.length) throw new Error("Missing student fields");
      setStudents(loaded); setEditingIds(new Set(loaded.filter((student) => !student.markId && !student.verified).map((student) => student.studentId))); toast.success("Students loaded successfully.");
    } catch {
      const fallback = FALLBACK_STUDENTS.map((student) => ({ ...student })); setStudents(fallback); setEditingIds(new Set(fallback.map((student) => student.studentId))); temporaryDataToast();
    } finally { setLoading(false); }
  }, [filters, mapStudent]);

  const changeMark = useCallback((studentId, field, value) => { if (value !== "" && !/^\d*$/.test(value)) return; setStudents((previous) => previous.map((student) => student.studentId === studentId && !student.verified && !student.submitted ? { ...student, [field]: value, verified: false } : student)); setRowErrors((previous) => ({ ...previous, [studentId]: { ...previous[studentId], [field]: value === "" ? "" : validateMark(value, field === "theoryMarks" ? 40 : 30) } })); }, []);
  const payloadFor = useCallback((records) => ({ marks: records.map((student) => ({ board: String(filters.board), academicYearId: Number(filters.academicYearId), academicLevel: String(filters.academicLevel), groupId: Number(filters.groupId), sectionId: Number(filters.sectionId), examinationId: Number(filters.examinationId), subjectId: Number(filters.subjectId), studentId: Number(student.studentId), rollNo: String(student.rollNo), studentName: String(student.studentName), internalMarks: Number(student.internalMarks) || 0, practicalMarks: Number(student.practicalMarks) || 0, theoryMarks: Number(student.theoryMarks) || 0, passingMarks: Number(student.passingMarks) || 35 })) }), [filters]);
  const saveMarks = useCallback(async (ids) => {
    const records = students.filter((student) => ids.includes(student.studentId)); if (!records.length) { toast.error("No student records available to save."); return false; }
    const errors = Object.fromEntries(records.map((student) => [student.studentId, markErrors(student)])); setRowErrors((previous) => ({ ...previous, ...errors }));
    if (Object.values(errors).some((row) => Object.values(row).some(Boolean))) { toast.error("Please fix all mark validation errors."); return false; }
    try { const response = await fetch("/api/v1/marks/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(records)) }); if (!response.ok) throw new Error("API failure"); toast.success("Marks saved successfully to server."); }
    catch { toast.warn("Saved locally (API endpoint offline)."); }
    setStudents((previous) => previous.map((student) => ids.includes(student.studentId) ? { ...student, markId: student.markId || `local-${student.studentId}` } : student)); setSelectedVerifyIds((previous) => new Set([...previous, ...records.filter((student) => isComplete(student) && isStudentValid(student)).map((student) => student.studentId)])); setEditingIds((previous) => { const next = new Set(previous); ids.forEach((id) => next.delete(id)); return next; }); return true;
  }, [payloadFor, students]);
  const saveAllMarks = useCallback(() => saveMarks([...editingIds]), [editingIds, saveMarks]);
  const editRow = useCallback((id) => setEditingIds((previous) => new Set([...previous, id])), []);
  const editAll = useCallback(() => setEditingIds(new Set(students.filter((student) => !student.verified && !student.submitted).map((student) => student.studentId))), [students]);
  const verifyAllEligible = useCallback(async () => {
    const eligible = students.filter((student) => selectedVerifyIds.has(student.studentId) && !student.verified && isComplete(student) && isStudentValid(student) && student.markId && !editingIds.has(student.studentId));
    const skipped = students.filter((student) => !student.verified).length - eligible.length;
    if (!eligible.length) { toast.error("No eligible saved students are ready for verification."); return; }
    const verifyPayload = { examinationId: Number(filters.examinationId), subjectId: Number(filters.subjectId), sectionId: Number(filters.sectionId), verifiedBy: "Evaluator", studentIds: eligible.map((student) => Number(student.studentId)) };
    try { const response = await fetch("/api/v1/marks/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(verifyPayload) }); if (!response.ok) throw new Error("API failure"); } catch { toast.info("Verification API unavailable; eligible rows were verified locally."); }
    const eligibleIds = new Set(eligible.map((student) => student.studentId));
    setStudents((previous) => previous.map((student) => eligibleIds.has(student.studentId) ? { ...student, verified: true } : student)); setSelectedVerifyIds(new Set());
    toast.success(`Verified: ${eligible.length}. Skipped: ${skipped}.`);
  }, [editingIds, filters, selectedVerifyIds, students]);
  const eligibleVerifyIds = useMemo(() => students.filter((student) => !student.verified && isComplete(student) && isStudentValid(student) && student.markId && !editingIds.has(student.studentId)).map((student) => student.studentId), [editingIds, students]);
  useEffect(() => {
    setSelectedVerifyIds((previous) => new Set([...previous].filter((id) => eligibleVerifyIds.includes(id))));
  }, [eligibleVerifyIds]);
  const toggleVerifyStudent = useCallback((id) => setSelectedVerifyIds((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }), []);
  const submitEvaluation = useCallback(async () => { if (submitBlocker) { toast.error(submitBlocker); return; } const verifiedStudents = students.filter((student) => student.verified && !student.submitted); try { const response = await fetch("/api/v1/marks/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(verifiedStudents)) }); if (!response.ok) throw new Error("API failure"); toast.success("Evaluation submitted and stored successfully."); } catch { toast.success("Evaluation submitted successfully (Local mode)."); } setStudents((previous) => previous.map((student) => student.verified && !student.submitted ? { ...student, submitted: true } : student)); }, [payloadFor, students, submitBlocker]);
  const clearMarks = useCallback(() => { setStudents((previous) => previous.map((student) => student.submitted ? student : { ...student, markId: null, internalMarks: "", practicalMarks: "", theoryMarks: "", verified: false })); setEditingIds(new Set(students.filter((student) => !student.submitted).map((student) => student.studentId))); setRowErrors({}); setDeleteOpen(false); toast.warning("All editable marks cleared."); }, [students]);


  return (
    <DashboardLayout title="Marks Entry" subtitle="Enter internal, practical and theory marks." breadcrumb={["Examinations"]}>
      <div className="cms-content cms-page marks-entry-page" aria-label="Marks entry module">
        <section className="cms-card cms-anim-up cms-assessment-card">
          <div className="cms-card-head cms-page-head cms-section-header">
            <div><h2>Assessment Details</h2><p>All filter selections are required before loading student records.</p></div>
            <button className="cms-btn cms-btn-primary" type="button" disabled={!allFiltersSelected || loading} onClick={checkStudents}>
              {loading ? "Loading..." : "Check Students"}
            </button>
          </div>
          <div className="cms-card-body">
            <div className="cms-filters cms-filter-grid marks-filter-grid">
        <SelectField label="Board" name="board"
          value={filters.board}
          onChange={changeFilter}
          onBlur={validateFilter}
          error={filterErrors.board}>
          <option value="">Select Board</option>
          {boards.map((b) =>
            <option key={b.boardId ?? b.id} value={b.boardId ?? b.id}>
              {b.boardName ?? b.name}
            </option>
          )}</SelectField>
        <SelectField label="Academic Year" name="academicYearId"
          value={filters.academicYearId}
          onChange={changeFilter}
          onBlur={validateFilter}
          error={filterErrors.academicYearId}>
          <option value="">Select Academic Year</option>
          {academicYears.map((year) =>
            <option key={year.id ?? year.academicYearId}
              value={year.id ?? year.academicYearId}>
              {year.year ?? year.name}
            </option>
          )}
        </SelectField>
        <SelectField label="Academic Level"
          name="academicLevel"
          value={filters.academicLevel}
          onChange={changeFilter}
          onBlur={validateFilter}
          error={filterErrors.academicLevel}>
          <option value="">Select Academic Level</option>
          {ACADEMIC_LEVELS.map((level) =>
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          )}</SelectField>
        <SelectField label="Group"
          name="groupId" value={filters.groupId}
          onChange={changeFilter}
          onBlur={validateFilter}
          error={filterErrors.groupId}>
          <option value="">Select Group</option>
          {groups.map((group) =>
            <option key={group.id ?? group.groupId}
              value={group.id ?? group.groupId}>
              {group.groupName ?? group.name}
            </option>
          )}</SelectField>
        <SelectField label="Section"
          name="sectionId" value={filters.sectionId}
          onChange={changeFilter} onBlur={validateFilter}
          error={filterErrors.sectionId}
          disabled={!filters.groupId}>
          <option value="">Select Section</option>
          {sections.map((section) =>
            <option key={section.id ?? section.sectionId}
              value={section.id ?? section.sectionId}>
              {section.sectionName ?? section.name}
            </option>
          )}
        </SelectField>
        <SelectField label="Examination"
          name="examinationId" value={filters.examinationId}
          onChange={changeFilter}
          onBlur={validateFilter}
          error={filterErrors.examinationId}>
          <option value="">Select Examination</option>
          {exams.map((exam) =>
            <option key={exam.id ?? exam.examinationId}
              value={exam.id ?? exam.examinationId}>
              {exam.examName ?? exam.name}
            </option>
          )}</SelectField>
        <SelectField label="Subject"
          name="subjectId" value={filters.subjectId}
          onChange={changeFilter} onBlur={validateFilter}
          error={filterErrors.subjectId} disabled={!filters.groupId}>
          <option value="">Select Subject</option>
          {subjects.map((subject) =>
            <option key={subject.subjectId ?? subject.id}
              value={subject.subjectId ?? subject.id}>
              {subject.subjectName ?? subject.name}
              ({subject.subjectCode ?? subject.code ?? "—"})
            </option>
          )}</SelectField>
            </div>
          </div>
        </section>
        {students.length > 0 && <>
        <div className="cms-stats-grid marks-stats-grid">
          {[["Total Students", stats.total],
          ["Marks Entered", stats.entered],
          ["Verified Students", stats.verified],
          ["Pending Students", stats.pending],
          ["Average Marks", stats.average],
          ["Highest Marks", stats.highest]].map(([label, value]) =>
            <div className="cms-stat" key={label}>
              <span className="cms-stat-label">{label}</span>
              <strong className="cms-stat-value">{value}</strong>
            </div>
          )}
        </div>
        <div className="cms-card">
          <div className="cms-toolbar marks-toolbar">
            <div className="cms-actions cms-tabs marks-tabs">
            <button className={`cms-btn ${activeTab === "entry" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => setActiveTab("entry")}
              type="button">Marks Entry
            </button>
            <button className={`cms-btn ${activeTab === "verify" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => setActiveTab("verify")}
              type="button">Verification <span>
                {stats.verified}/{stats.total}
              </span>
            </button>
            </div>
            <div className="cms-search-wrap"><div className="cms-search marks-search">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by roll number or student name" aria-label="Search students" />
            </div></div>
            <div className="cms-toolbar-right cms-toolbar-actions marks-toolbar-actions">{activeTab === "entry" ?
              <button type="button" className="cms-btn cms-btn-primary"
                onClick={editingIds.size ? saveAllMarks : editAll}>
                {editingIds.size ? "Save Changes" : "Edit Marks"}
              </button>
              : <button type="button" className="cms-btn cms-btn-primary" onClick={verifyAllEligible}>Verify Eligible Students
              </button>
            }
            </div>
          </div>
          <div className="cms-table-wrap marks-table-wrap">
            <StudentTable students={visibleStudents}
            editingIds={editingIds}
            rowErrors={rowErrors}
            changeMark={changeMark}
            editRow={editRow}
            saveRow={(id) => saveMarks([id])}
            activeTab={activeTab}
            selectedVerifyIds={selectedVerifyIds}
            toggleVerifyStudent={toggleVerifyStudent} /></div>
        </div>
        <div className="cms-card marks-footer"><div className="cms-toolbar">
          <div className="marks-footer-message">{submitBlocker || "Only complete and verified marks can be submitted."}</div>
          <div className="cms-toolbar-right marks-footer-actions">
            <button type="button" className="cms-btn cms-btn-danger"
              onClick={() => setDeleteOpen(true)}>
              Clear All Marks
            </button>
            <button type="button" className="cms-btn cms-btn-primary"
              disabled={Boolean(submitBlocker)}
              title={submitBlocker}
              onClick={submitEvaluation}>Submit Evaluation
            </button>
          </div>
        </div></div>
      </>}
    {deleteOpen && <div className="cms-overlay cms-modal-overlay" role="presentation">
      <div className="cms-modal sm marks-delete-modal" role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title">
        <div className="cms-modal-head"><h3 id="delete-title">Clear all marks?</h3></div>
        <div className="cms-modal-body"><p>Are you sure you want to clear all entered marks? This action cannot be undone.</p></div>
        <div className="cms-modal-foot">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-danger" onClick={clearMarks}>Clear
          </button>
        </div>
      </div>
    </div>
    }
        <ToastContainer position="bottom-right" theme="colored" newestOnTop closeOnClick />
      </div>
    </DashboardLayout>
  );
}


