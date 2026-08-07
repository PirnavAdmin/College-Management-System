import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "./MarksEntry.css";

const FALLBACK_BOARDS = [
  { boardId: 1, boardName: "BIE Telangana", status: true },
  { boardId: 2, boardName: "BIE Andhra Pradesh", status: true },
  { boardId: 3, boardName: "CBSE", status: true },
  { boardId: 4, boardName: "ICSE", status: true },
  { boardId: 5, boardName: "OTHERS", status: true },

];

const FALLBACK_SUBJECTS = {
  MPC: [
    { subjectId: 1, subjectName: "Mathematics", subjectCode: "MATH101", group: "MPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
    { subjectId: 2, subjectName: "Physics", subjectCode: "PHY101", group: "MPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
    { subjectId: 3, subjectName: "Chemistry", subjectCode: "CHEM101", group: "MPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
  ],
  BiPC: [
    { subjectId: 4, subjectName: "Botany", subjectCode: "BOT101", group: "BiPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
    { subjectId: 5, subjectName: "Zoology", subjectCode: "ZOO101", group: "BiPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
    { subjectId: 3, subjectName: "Chemistry", subjectCode: "CHEM101", group: "BiPC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 },
  ],
  CEC: [{ subjectId: 6, subjectName: "Economics", subjectCode: "ECO101", group: "CEC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 }],
  MEC: [{ subjectId: 1, subjectName: "Mathematics", subjectCode: "MATH101", group: "MEC", academicLevel: "UG", subjectType: "Theory", maximumMarks: 100, passingMarks: 35 }],
};

const STUDENTS = [
  [1, "UG2026001", "Rahul Kumar"], [2, "UG2026002", "Sai Kiran"], [3, "UG2026003", "Ananya Reddy"], [4, "UG2026004", "Vikram Singh"], [5, "UG2026005", "Meera Nair"], [6, "UG2026006", "Karthik Rao"],
].map(([id, rollNo, studentName]) => ({ id, rollNo, studentName, internal: "", practical: "", theory: "", verified: false }));

const OPTIONS = {
  academicYear: [["2025-26", "2025 - 2026"], ["2026-27", "2026 - 2027"]],
  academicLevel: [["Intermediate-first-year", "Intermediate First Year"], ["Intermediate-second-year", "Intermediate Second Year"]],
  group: [["MPC", "MPC"], ["BiPC", "BiPC"], ["CEC", "CEC"], ["MEC", "MEC"]],
  section: [["A", "Section A"], ["B", "Section B"], ["C", "Section C"]],
  examination: [["semester-1", "Semester I"], ["semester-2", "Semester II"], ["midterm", "Midterm Examination"]],
};

const blankFilters = { board: "", academicYear: "", academicLevel: "", group: "", section: "", examination: "", subject: "" };
const fieldLabels = { board: "Board", academicYear: "Academic Year", academicLevel: "Academic Level", group: "Group", section: "Section", examination: "Examination", subject: "Subject" };
const totalOf = (student) => [student.internal, student.practical, student.theory].reduce((sum, mark) => sum + (Number(mark) || 0), 0);
const isComplete = (student) => [student.internal, student.practical, student.theory].every((mark) => mark !== "");
const gradeOf = (total) => total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";

const validateMark = (value, maximum) => {
  if (value === "") return "Required";
  if (!/^\d+$/.test(value)) return "Only whole numbers allowed";
  return Number(value) > maximum ? `0-${maximum} only` : "";
};
const hasAnyMarks = (student) => [student.internal, student.practical, student.theory].some((mark) => mark !== "");
const markErrors = (student) => ({
  internal: student.internal === "" ? "" : validateMark(student.internal, 30),
  practical: student.practical === "" ? "" : validateMark(student.practical, 30),
  theory: student.theory === "" ? "" : validateMark(student.theory, 40),
});
const isStudentValid = (student) => Object.values(markErrors(student)).every((error) => !error);
const canAutoSelect = (student) => isComplete(student) && isStudentValid(student);

function GradeBadge({ total, complete }) { return <span className={`gradeBadge ${complete ? "" : "isEmpty"}`}>{complete ? gradeOf(total) : "—"}</span>; }
function StatusBadge({ verified }) { return <span className={`statusBadge ${verified ? "statusVerified" : "statusPending"}`}>{verified ? "Verified" : "Pending"}</span>; }

export default function MarksEntry() {
  const [boards, setBoards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState(blankFilters);
  const [filterErrors, setFilterErrors] = useState({});
  const [students, setStudents] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [editingIds, setEditingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("entry");
  const [search, setSearch] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/boards")
      .then((response) => {
        if (!response.ok)
          throw new Error("Unable to load boards");
        return response.json();
      })
      .then((data) => {
        const result = Array.isArray(data) ? data.filter((board) => board.status) : [];
        if (!result.length) throw new Error("No active boards returned");
        if (active) setBoards(result);
      })
      .catch(() => {
        if (active) {
          setBoards(FALLBACK_BOARDS);
          toast.info("Board service unavailable — showing fallback data.");
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!filters.group) { setSubjects([]); return undefined; }
    let active = true;
    fetch(`/api/v1/subjects/group/${encodeURIComponent(filters.group)}`)
      .then((response) => { if (!response.ok) throw new Error("Unable to load subjects"); return response.json(); })
      .then((data) => {
        if (!Array.isArray(data) || !data.length) throw new Error("No subjects returned");
        if (active) setSubjects(data);
      })
      .catch(() => {
        if (active) {
          setSubjects(FALLBACK_SUBJECTS[filters.group] || []);
          toast.info("Subject service unavailable — showing fallback data.");
        }
      });
    return () => { active = false; };
  }, [filters.group]);

  const allFiltersSelected = useMemo(() => Object.values(filters).every(Boolean), [filters]);
  const visibleStudents = useMemo(() => {

    const term = search.trim().toLowerCase();
    return term ?
      students.filter((student) => student.rollNo.toLowerCase().includes(term) || student.studentName.toLowerCase().includes(term))
      : students;
  }, [search, students]);

  const stats = useMemo(() => {
    const entered = students.filter(isComplete);
    const totals = entered.map(totalOf);
    return {
      total: students.length,
      entered: entered.length,
      verified: students.filter((student) => student.verified).length,
      pending: students.filter((student) => !student.verified).length,
      average: totals.length ? Math.round(totals.reduce((sum, total) => sum + total, 0) / totals.length) : 0,
      highest: totals.length ? Math.max(...totals) : 0
    };
  }, [students]);

  const changeFilter = useCallback((name, value) => {
    setFilters((current) => (
      {
        ...current,
        [name]: value,
        ...(name === "group" ? { subject: "" }
          : {})
      }));
    setFilterErrors((current) => (
      {
        ...current,
        [name]: undefined,
        ...(name === "group" ? { subject: undefined }
          : {})
      }));
  }, []);

  const validateFilter = useCallback((name) => {
    setFilterErrors((current) => ({
      ...current,
      [name]: filters[name]
        ? undefined
        : `Select ${fieldLabels[name]}`
    }));
  }, [filters]);

  const checkStudents = useCallback(() => {
    const errors = Object.fromEntries(Object.entries(filters).filter(([, value]) => !value).map(([name]) => [name, `Select ${fieldLabels[name]}`]));
    setFilterErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Complete all assessment filters first.");
      return;
    }
    setStudents(STUDENTS.map((student) => ({ ...student })));
    setRowErrors({});
    setEditingIds(
      new Set(STUDENTS.map(student => student.id))
    );
    setIsSaved(false);
    setSelectedIds([]);
    setSearch("");
    setActiveTab("entry");
    toast.success("Students loaded for evaluation.");
  }, [filters]);

  const changeMark = useCallback((id, field, value) => {
    if (value !== "" && !/^\d*$/.test(value)) return;
    const currentStudent = students.find((student) => student.id === id);
    const updatedStudent = { ...currentStudent, [field]: value, verified: currentStudent[field] !== value ? false : currentStudent.verified };
    setStudents((current) => current.map((student) => student.id === id
      ? updatedStudent
      : student));
    setSelectedIds((current) => canAutoSelect(updatedStudent)
      ? [...new Set([...current, id])]
      : current.filter((item) => item !== id));
    setRowErrors((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value === "" ? "" : validateMark(value, field === "theory" ? 40 : 30)
      }
    }));
  }, [students]);

  const saveRow = useCallback((id) => {
    const student = students.find(
      (item) => item.id === id
    );
    const errors = {
      internal: validateMark(student.internal, 30),
      practical: validateMark(student.practical, 30),
      theory: validateMark(student.theory, 40)
    };
    setRowErrors((current) => ({
      ...current,
      [id]: errors
    }));
    if (Object.values(errors).some(Boolean)) {
      toast.error(
        "Correct the mark validation errors before saving."
      );
      return;
    }
    setEditingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    toast.success("Marks saved.");
  }, [students]);

  const toggleSelection = useCallback((id) => setSelectedIds((current) => current.includes(id) ?
    current.filter((item) => item !== id) :
    [...current, id]), []);

  const toggleAll = useCallback(() => {
    const ids = visibleStudents.map((student) => student.id);
    setSelectedIds((current) => ids.every((id) => current.includes(id))
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])]);
  }, [visibleStudents]);

  const verifySelected = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Select at least one student to verify.");
      return;
    }
    const incomplete = students.filter((student) => selectedIds.includes(student.id) && !canAutoSelect(student));

    if (incomplete.length) {
      toast.error("Marks must be entered for every selected student before verification.");
      return;
    }
    setStudents((current) => current.map((student) => selectedIds.includes(student.id)
      ? { ...student, verified: true } : student)
    );
    toast.success("Selected students verified.");
  }, [selectedIds, students]);

  const editSelected = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Select at least one student to edit.");
      return;
    }
    setEditingIds((current) => new Set([...current, ...selectedIds]));
  }, [selectedIds]);

  const saveSelected = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Select at least one student to save.");
      return;
    }
    const selected = students.filter((student) =>
      selectedIds.includes(student.id)
    );
    const errors = {};
    selected.forEach((student) => {
      errors[student.id] = markErrors(student);
    });

    setRowErrors((current) => ({
      ...current,
      ...errors,
    }));

    if (
      Object.values(errors).some((row) =>
        Object.values(row).some(Boolean)
      )
    ) {
      toast.error("Correct the mark validation errors before saving.");
      return;
    }
    setEditingIds((current) => {
      const next = new Set(current);
      selectedIds.forEach((id) => next.delete(id));
      return next;
    });
    toast.success("Marks saved.");
  }, [selectedIds, students]);

  const saveAllMarks = useCallback(() => {
    const errors = {};

    students.forEach((student) => {
      errors[student.id] = markErrors(student);
    });

    setRowErrors(errors);

    const hasErrors = Object.values(errors).some((row) =>
      Object.values(row).some(Boolean)
    );

    setEditingIds(new Set(students
      .filter((student) => !hasAnyMarks(student) || !isStudentValid(student))
      .map((student) => student.id)));
    setIsSaved(true);

    if (hasErrors) toast.error("Fix validation errors first");
    else toast.success("Entered marks saved successfully");
  }, [students]);

  const editAllMarks = useCallback(() => {
    setEditingIds(
      new Set(students.map((student) => student.id))
    );

    setIsSaved(false);
  }, [students]);



  const verifyStudent = useCallback((id) => {
    const student = students.find((item) => item.id === id);
    if (!isComplete(student)) {
      toast.error("Enter all marks before verification.");
      return;
    }
    setStudents((current) => current.map((item) => item.id === id
      ? { ...item, verified: true }
      : item
    ));
    toast.success("Student verified.");
  }, [students]);

  const submitEvaluation = useCallback(() => {
    if (!students.length) {
      toast.error("Load students before submitting.");
      return;
    }
    if (!students.some(hasAnyMarks)) {
      toast.error("Enter marks before submitting.");
      return;
    }
    toast.success("Evaluation submitted successfully.");
  }, [students]);

  const clearMarks = useCallback(() => {
    setStudents((current) => current.map((student) => ({
      ...student, internal: "",
      practical: "",
      theory: "",
      verified: false
    })));
    setRowErrors({});
    setEditingIds(new Set());
    setSelectedIds([]);
    setDeleteOpen(false);
    toast.warning("All marks cleared successfully.");
  }, []);

  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((student) => selectedIds.includes(student.id));

  return <section className="marksEntry" aria-label="Marks entry module">
    <div className="marksCard filterCard">
      <div className="sectionHeading">
        <div>
          <h2> Assessment details</h2>
          <p>All fields are required before students can be loaded.</p>
        </div>
        <button className="marksButton primary" type="button"
          disabled={!allFiltersSelected}
          onClick={checkStudents}>Check Students
        </button>
      </div>
      <div className="marksFilterGrid">
        <SelectField label="Board" name="board" value={filters.board} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.board}>
          <option value="">Select board</option>
          {boards.map((board) =>
            <option key={board.boardId}
              value={board.boardId}>{board.boardName}
            </option>)}
        </SelectField>
        {Object.entries(OPTIONS).map(([name, options]) =>
          <SelectField key={name}
            label={fieldLabels[name]}
            name={name}
            value={filters[name]}
            onChange={changeFilter}
            onBlur={validateFilter}
            error={filterErrors[name]}>
            <option value="">Select {fieldLabels[name]}</option>{options.map(([value, label]) =>
              <option key={value} value={value}>
                {label}
              </option>)}
          </SelectField>
        )}
        <SelectField label="Subject" name="subject" value={filters.subject} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.subject} disabled={!filters.group}>
          <option value="">Select subject</option>
          {subjects.map((subject) =>
            <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}
              ({subject.subjectCode})
            </option>)}
        </SelectField>
      </div>
    </div>
    {students.length > 0 && <>
      <div className="statsGrid">{[["Total Students", stats.total],
      ["Marks Entered", stats.entered],
      ["Verified Students", stats.verified],
      ["Pending Students", stats.pending],
      ["Average Marks", stats.average],
      ["Highest Marks", stats.highest]].map(([label, value]) =>
        <div className="statTile" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>)}
      </div>
      <div className="marksCard">
        <div className="tabBar">
          <button className={activeTab === "entry" ? "active" : ""}
            onClick={() => setActiveTab("entry")}
            type="button">Marks Entry
          </button>
          <button className={activeTab === "verify" ? "active" : ""}
            onClick={() => setActiveTab("verify")}
            type="button">Verification
            <span>
              {stats.verified}/{stats.total}
            </span>
          </button>
        </div>
        <div className="tableToolbar">
          <label className="searchField">Search students
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Roll number or student name" />
          </label>
          <div className="toolbarActions">
            {activeTab === "entry" && (
              <>
                <button
                  type="button"
                  className="marksButton secondary"
                  onClick={editAllMarks}
                >
                  Edit All
                </button>

                <button
                  type="button"
                  className="marksButton primary"
                  onClick={saveAllMarks}
                >
                  Save All
                </button>
              </>
            )}
            {activeTab === "verify" &&
            <div className="verifyActions">
              <button type="button" className="marksButton secondary" onClick={editSelected}>Edit Selected
              </button>
              <button type="button" className="marksButton secondary" onClick={saveSelected}>Save Selected
              </button>
              <button type="button" className="marksButton success" onClick={verifySelected}>Verify Selected
              </button>
            </div>}
          </div>
        </div>
        <CompactStudentTable
          students={visibleStudents}
          activeTab={activeTab}
          selectedIds={selectedIds}
          allSelected={allVisibleSelected}
          toggleAll={() => {}}
          toggleSelection={() => {}}
          editingIds={editingIds}
          rowErrors={rowErrors}
          changeMark={changeMark}
        />

      </div>
      <div className="marksCard footerActions">
        <p>Only complete, verified marks can be submitted.</p>
        <div>
          <button type="button"
            className="marksButton dangerOutline"
            onClick={() => setDeleteOpen(true)}>Clear All Marks
          </button>
          <button type="button" className="marksButton primary" 
          onClick={submitEvaluation}>Submit Evaluation
          </button>
        </div>
      </div>
    </>}
    {deleteOpen &&
      <div className="modalOverlay" role="presentation">
        <div className="deleteModal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <h2 id="delete-title">Clear all marks?</h2>
          <p>Are you sure you want to clear all entered marks? This cannot be undone.</p>
          <div>
            <button type="button" className="marksButton secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="marksButton danger" onClick={clearMarks}>
              Clear</button>
          </div>
        </div>
      </div>}
    <ToastContainer position="bottom-right" theme="colored" newestOnTop closeOnClick />
  </section>;
}

function SelectField({ label, name, value, onChange, onBlur, error, children, disabled = false }) { return <label className="filterField">{label}<select value={value} disabled={disabled} onBlur={() => onBlur(name)} onChange={(event) => onChange(name, event.target.value)}>{children}</select>{error && <small>{error}</small>}</label>; }
function CompactStudentTable({ students, selectedIds, allSelected, toggleAll, toggleSelection, editingIds, rowErrors, changeMark }) {
  return <div className="marksTableWrap"><table className="marksTable compactMarksTable"><thead><tr><th><input aria-label="Select all visible students" type="checkbox" checked={allSelected} onChange={toggleAll} /></th><th>Student Name</th><th>Internal <small>/30</small></th><th>Practical <small>/30</small></th><th>Theory <small>/40</small></th><th>Total</th><th>Grade</th><th>Status</th></tr></thead><tbody>{students.length ? students.map((student) => { const editing = editingIds.has(student.id); const complete = isComplete(student); return <tr key={student.id}><td data-label="Select"><input aria-label={`Select ${student.studentName}`} type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelection(student.id)} /></td><td data-label="Student Name"><div className="studentInfo"><strong>{student.studentName}</strong><span>{student.rollNo}</span></div></td>{["internal", "practical", "theory"].map((field) => <td key={field} data-label={`${field[0].toUpperCase()}${field.slice(1)} Marks`}><input className={rowErrors[student.id]?.[field] ? "invalid" : ""} aria-label={`${field} marks for ${student.studentName}`} disabled={!editing} inputMode="numeric" value={student[field]} onChange={(event) => changeMark(student.id, field, event.target.value)} />{rowErrors[student.id]?.[field] && <small className="markError">{rowErrors[student.id][field]}</small>}</td>)}<td data-label="Total">{complete ? totalOf(student) : "—"}</td><td data-label="Grade"><GradeBadge complete={complete} total={totalOf(student)} /></td><td data-label="Status"><StatusBadge verified={student.verified} /></td></tr>; }) : <tr><td colSpan="8" className="emptyTable">No students match your search.</td></tr>}</tbody></table></div>;
}
function StudentTable({ students, activeTab, selectedIds, allSelected, toggleAll, toggleSelection, editingIds, setEditingIds, rowErrors, changeMark, saveRow, verifyStudent }) { return <div className="marksTableWrap"><table className="marksTable"><thead><tr><th><input aria-label="Select all visible students" type="checkbox" checked={allSelected} onChange={toggleAll} /></th><th>Roll No</th><th>Student Name</th><th>Internal <small>/30</small></th><th>Practical <small>/30</small></th><th>Theory <small>/40</small></th><th>Total</th><th>Grade</th><th>Status</th><th>Action</th></tr></thead><tbody>{students.length ? students.map((student) => { const editing = editingIds.has(student.id); const complete = isComplete(student); return <tr key={student.id}><td><input aria-label={`Select ${student.studentName}`} type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelection(student.id)} /></td><td>{student.rollNo}</td><td><strong>{student.studentName}</strong></td>{["internal", "practical", "theory"].map((field) => <td key={field}><input className={rowErrors[student.id]?.[field] ? "invalid" : ""} aria-label={`${field} marks for ${student.studentName}`} disabled={!editing} inputMode="numeric" value={student[field]} onChange={(event) => changeMark(student.id, field, event.target.value)} />{rowErrors[student.id]?.[field] && <small className="markError">{rowErrors[student.id][field]}</small>}</td>)}<td>{complete ? totalOf(student) : "—"}</td><td><GradeBadge complete={complete} total={totalOf(student)} /></td><td><StatusBadge verified={student.verified} /></td><td><div className="rowActions"><button type="button" className="rowButton" onClick={() => editing ? saveRow(student.id) : setEditingIds((current) => new Set(current).add(student.id))}>{editing ? "Save" : "Edit"}</button>{activeTab === "verify" && <button type="button" className="rowButton verifyRow" onClick={() => verifyStudent(student.id)}>Verify</button>}</div></td></tr>; }) : <tr><td colSpan="10" className="emptyTable">No students match your search.</td></tr>}</tbody></table></div>; }
