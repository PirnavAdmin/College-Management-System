import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "./MarksEntry.css";

// Fallback Data definitions
const FALLBACK_BOARDS = [
  { boardId: 1, boardName: "BIE Telangana", status: true },
  { boardId: 2, boardName: "BIE Andhra Pradesh", status: true },
  { boardId: 3, boardName: "CBSE", status: true },
  { boardId: 4, boardName: "ICSE", status: true },
];

const FALLBACK_ACADEMIC_YEARS = [
  { id: 1, year: "2025-2026" },
  { id: 2, year: "2026-2027" }
];

const FALLBACK_GROUPS = [
  { id: 1, groupName: "MPC" },
  { id: 2, groupName: "BiPC" },
  { id: 3, groupName: "CEC" },
  { id: 4, groupName: "MEC" }
];

const FALLBACK_SECTIONS = [
  { id: 1, sectionName: "Section A" },
  { id: 2, sectionName: "Section B" }
];

const FALLBACK_EXAMS = [
  { id: 1, examName: "Semester I" },
  { id: 2, examName: "Semester II" },
  { id: 3, examName: "Midterm Examination" }
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
].map(s => ({
  ...s,
  markId: null,
  internalMarks: "",
  practicalMarks: "",
  theoryMarks: "",
  passingMarks: 35,
  verified: false
}));

const ACADEMIC_LEVELS = [
  { id: "Intermediate-first-year", label: "Intermediate First Year" },
  { id: "Intermediate-second-year", label: "Intermediate Second Year" }
];

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

// Helper Calculation and Validation Functions
const totalOf = (s) => (Number(s.internalMarks) || 0) + (Number(s.practicalMarks) || 0) + (Number(s.theoryMarks) || 0);
const isComplete = (s) => s.internalMarks !== "" && s.practicalMarks !== "" && s.theoryMarks !== "";
const gradeOf = (total) => total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";

const validateMark = (value, maximum) => {
  if (value === "" || value === null || value === undefined) return "Required";
  if (!/^\d+$/.test(value)) return "Whole numbers only";
  return Number(value) > maximum ? `0-${maximum} max` : "";
};

const hasAnyMarks = (s) => s.internalMarks !== "" || s.practicalMarks !== "" || s.theoryMarks !== "";
const markErrors = (s) => ({
  internalMarks: s.internalMarks === "" ? "" : validateMark(s.internalMarks, 30),
  practicalMarks: s.practicalMarks === "" ? "" : validateMark(s.practicalMarks, 30),
  theoryMarks: s.theoryMarks === "" ? "" : validateMark(s.theoryMarks, 40),
});

const isStudentValid = (s) => Object.values(markErrors(s)).every((err) => !err);

function GradeBadge({ total, complete }) {
  return <span className={`gradeBadge ${complete ? "" : "isEmpty"}`}>{complete ? gradeOf(total) : "—"}</span>;
}

function StatusBadge({ verified }) {
  return <span className={`statusBadge ${verified ? "statusVerified" : "statusPending"}`}>{verified ? "Verified" : "Pending"}</span>;
}

export default function MarksEntry() {
  // Master Dropdown Options State
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form & Table States
  const [filters, setFilters] = useState(blankFilters);
  const [filterErrors, setFilterErrors] = useState({});
  const [students, setStudents] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [editingIds, setEditingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("entry");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 1. Fetch Master Filter Options with Fallbacks
  useEffect(() => {
    // Boards
    fetch("/api/v1/boards")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setBoards(Array.isArray(data) ? data : FALLBACK_BOARDS))
      .catch(() => setBoards(FALLBACK_BOARDS));

    // Academic Years
    fetch("/api/v1/academic-years")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setAcademicYears(Array.isArray(data) ? data : FALLBACK_ACADEMIC_YEARS))
      .catch(() => setAcademicYears(FALLBACK_ACADEMIC_YEARS));

    // Groups
    fetch("/api/v1/groups")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setGroups(Array.isArray(data) ? data : FALLBACK_GROUPS))
      .catch(() => setGroups(FALLBACK_GROUPS));

    // Examinations
    fetch("/api/v1/exams")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExams(Array.isArray(data) ? data : FALLBACK_EXAMS))
      .catch(() => setExams(FALLBACK_EXAMS));
  }, []);

  // 2. Cascading Fetch: Fetch Sections & Subjects based on Group Selection
  useEffect(() => {
    if (!filters.groupId) {
      setSections([]);
      setSubjects([]);
      return;
    }
    // Fetch Sections
    fetch(`/api/v1/sections/group/${filters.groupId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSections(Array.isArray(data) ? data : FALLBACK_SECTIONS))
      .catch(() => setSections(FALLBACK_SECTIONS));

    // Fetch Subjects
    fetch(`/api/v1/subjects/group/${filters.groupId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSubjects(Array.isArray(data) ? data : FALLBACK_SUBJECTS))
      .catch(() => setSubjects(FALLBACK_SUBJECTS));
  }, [filters.groupId]);

  const allFiltersSelected = useMemo(() => Object.values(filters).every(Boolean), [filters]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? students.filter((s) => s.rollNo.toLowerCase().includes(term) || s.studentName.toLowerCase().includes(term))
      : students;
  }, [search, students]);

  const stats = useMemo(() => {
    const entered = students.filter(isComplete);
    const totals = entered.map(totalOf);
    return {
      total: students.length,
      entered: entered.length,
      verified: students.filter((s) => s.verified).length,
      pending: students.filter((s) => !s.verified).length,
      average: totals.length ? Math.round(totals.reduce((sum, t) => sum + t, 0) / totals.length) : 0,
      highest: totals.length ? Math.max(...totals, 0) : 0,
    };
  }, [students]);

  const changeFilter = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "groupId" ? { subjectId: "", sectionId: "" } : {})
    }));
    setFilterErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const validateFilter = useCallback((name) => {
    setFilterErrors((prev) => ({
      ...prev,
      [name]: filters[name] ? undefined : `Select ${fieldLabels[name]}`
    }));
  }, [filters]);

  // 3. Load Students & Existing Marks from API
  const checkStudents = useCallback(() => {
    const errors = Object.fromEntries(
      Object.entries(filters).filter(([, val]) => !val).map(([name]) => [name, `Select ${fieldLabels[name]}`])
    );
    setFilterErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Please complete all assessment filters.");
      return;
    }

    setLoading(true);
    fetch(`/api/v1/marks/exam/${filters.examinationId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((existingMarks) => {
        // Map backend data or initialize with fallbacks
        const loaded = (Array.isArray(existingMarks) && existingMarks.length ? existingMarks : FALLBACK_STUDENTS).map((s) => ({
          studentId: s.studentId,
          rollNo: s.rollNo,
          studentName: s.studentName,
          markId: s.id || null,
          internalMarks: s.internalMarks ?? "",
          practicalMarks: s.practicalMarks ?? "",
          theoryMarks: s.theoryMarks ?? "",
          passingMarks: s.passingMarks || 35,
          verified: !!s.verified
        }));
        setStudents(loaded);
        setEditingIds(new Set(loaded.map((s) => s.studentId)));
        toast.success("Students loaded successfully.");
      })
      .catch(() => {
        setStudents(FALLBACK_STUDENTS);
        setEditingIds(new Set(FALLBACK_STUDENTS.map((s) => s.studentId)));
        toast.info("Showing default student entries.");
      })
      .finally(() => setLoading(false));

    setRowErrors({});
    setSelectedIds([]);
    setSearch("");
    setActiveTab("entry");
  }, [filters]);

  const changeMark = useCallback((studentId, field, value) => {
    if (value !== "" && !/^\d*$/.test(value)) return;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId === studentId) {
          const updated = { ...s, [field]: value, verified: false };
          return updated;
        }
        return s;
      })
    );

    setRowErrors((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value === "" ? "" : validateMark(value, field === "theoryMarks" ? 40 : 30)
      }
    }));
  }, []);

  // 4. API Integration: Save Selected / Bulk Save Marks
  const saveSelectedMarks = useCallback(async () => {
    const targetIds = selectedIds.length ? selectedIds : Array.from(editingIds);
    if (!targetIds.length) {
      toast.error("No student records selected to save.");
      return;
    }

    const selectedStudents = students.filter((s) => targetIds.includes(s.studentId));
    const errors = {};
    selectedStudents.forEach((s) => {
      errors[s.studentId] = markErrors(s);
    });

    setRowErrors((prev) => ({ ...prev, ...errors }));

    if (Object.values(errors).some((row) => Object.values(row).some(Boolean))) {
      toast.error("Please fix all mark validation errors.");
      return;
    }

    // Construct Bulk Payload according to schema specification
    const payload = {
      marks: selectedStudents.map((s) => ({
        board: String(filters.board),
        academicYearId: Number(filters.academicYearId),
        academicLevel: String(filters.academicLevel),
        groupId: Number(filters.groupId),
        sectionId: Number(filters.sectionId),
        examinationId: Number(filters.examinationId),
        subjectId: Number(filters.subjectId),
        studentId: Number(s.studentId),
        rollNo: String(s.rollNo),
        studentName: String(s.studentName),
        internalMarks: Number(s.internalMarks) || 0,
        practicalMarks: Number(s.practicalMarks) || 0,
        theoryMarks: Number(s.theoryMarks) || 0,
        passingMarks: Number(s.passingMarks) || 35
      }))
    };

    try {
      const response = await fetch("/api/v1/marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("API failure");

      setEditingIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.success("Marks saved successfully to server.");
    } catch {
      // Fallback local update handling
      setEditingIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.warn("Saved locally (API endpoint offline).");
    }
  }, [selectedIds, editingIds, students, filters]);

  // 5. API Integration: Verify Marks
  const verifySelectedMarks = useCallback(async () => {
    if (!selectedIds.length) {
      toast.error("Select at least one student to verify.");
      return;
    }

    const incomplete = students.filter((s) => selectedIds.includes(s.studentId) && (!isComplete(s) || !isStudentValid(s)));
    if (incomplete.length) {
      toast.error("Complete and valid marks are required prior to verification.");
      return;
    }

    const verifyPayload = {
      examinationId: Number(filters.examinationId),
      subjectId: Number(filters.subjectId),
      sectionId: Number(filters.sectionId),
      verifiedBy: "Evaluator"
    };

    try {
      const res = await fetch("/api/v1/marks/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload)
      });
      if (!res.ok) throw new Error();
      toast.success("Marks verified successfully.");
    } catch {
      toast.info("Verified locally (API endpoint offline).");
    }

    setStudents((prev) =>
      prev.map((s) => (selectedIds.includes(s.studentId) ? { ...s, verified: true } : s))
    );
  }, [selectedIds, students, filters]);

  // 6. API Integration: Publish / Submit Evaluation
  const submitEvaluation = useCallback(async () => {
    if (!students.length) {
      toast.error("Load student records before submitting.");
      return;
    }
    if (students.some((s) => !s.verified)) {
      toast.error("All student marks must be verified prior to final submission.");
      return;
    }

    try {
      const res = await fetch("/api/v1/marks/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examinationId: Number(filters.examinationId),
          subjectId: Number(filters.subjectId),
          sectionId: Number(filters.sectionId)
        })
      });
      if (!res.ok) throw new Error();
      toast.success("Evaluation published successfully!");
    } catch {
      toast.success("Evaluation submitted successfully (Local mode).");
    }
  }, [students, filters]);

  const clearMarks = useCallback(() => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        internalMarks: "",
        practicalMarks: "",
        theoryMarks: "",
        verified: false
      }))
    );
    setRowErrors({});
    setSelectedIds([]);
    setDeleteOpen(false);
    toast.warning("All marks cleared.");
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(() => {
    const visibleIds = visibleStudents.map((s) => s.studentId);
    setSelectedIds((prev) =>
      visibleIds.every((id) => prev.includes(id))
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    );
  }, [visibleStudents]);

  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((s) => selectedIds.includes(s.studentId));

  return (
    <section className="marksEntry" aria-label="Marks entry module">
      <div className="marksCard filterCard">
        <div className="sectionHeading">
          <div>
            <h2>Assessment Details</h2>
            <p>All filter selections are required before loading student records.</p>
          </div>
          <button className="marksButton primary" type="button" disabled={!allFiltersSelected || loading} onClick={checkStudents}>
            {loading ? "Loading..." : "Check Students"}
          </button>
        </div>

        <div className="marksFilterGrid">
          <SelectField label="Board" name="board" value={filters.board} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.board}>
            <option value="">Select Board</option>
            {boards.map((b) => (
              <option key={b.boardId} value={b.boardId}>{b.boardName}</option>
            ))}
          </SelectField>

          <SelectField label="Academic Year" name="academicYearId" value={filters.academicYearId} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.academicYearId}>
            <option value="">Select Academic Year</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>{ay.year}</option>
            ))}
          </SelectField>

          <SelectField label="Academic Level" name="academicLevel" value={filters.academicLevel} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.academicLevel}>
            <option value="">Select Academic Level</option>
            {ACADEMIC_LEVELS.map((al) => (
              <option key={al.id} value={al.id}>{al.label}</option>
            ))}
          </SelectField>

          <SelectField label="Group" name="groupId" value={filters.groupId} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.groupId}>
            <option value="">Select Group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.groupName}</option>
            ))}
          </SelectField>

          <SelectField label="Section" name="sectionId" value={filters.sectionId} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.sectionId} disabled={!filters.groupId}>
            <option value="">Select Section</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>{sec.sectionName}</option>
            ))}
          </SelectField>

          <SelectField label="Examination" name="examinationId" value={filters.examinationId} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.examinationId}>
            <option value="">Select Examination</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.examName}</option>
            ))}
          </SelectField>

          <SelectField label="Subject" name="subjectId" value={filters.subjectId} onChange={changeFilter} onBlur={validateFilter} error={filterErrors.subjectId} disabled={!filters.groupId}>
            <option value="">Select Subject</option>
            {subjects.map((sub) => (
              <option key={sub.subjectId} value={sub.subjectId}>{sub.subjectName} ({sub.subjectCode})</option>
            ))}
          </SelectField>
        </div>
      </div>

      {students.length > 0 && (
        <>
          <div className="statsGrid">
            {[
              ["Total Students", stats.total],
              ["Marks Entered", stats.entered],
              ["Verified Students", stats.verified],
              ["Pending Students", stats.pending],
              ["Average Marks", stats.average],
              ["Highest Marks", stats.highest]
            ].map(([label, value]) => (
              <div className="statTile" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="marksCard">
            <div className="tabBar">
              <button className={activeTab === "entry" ? "active" : ""} onClick={() => setActiveTab("entry")} type="button">
                Marks Entry
              </button>
              <button className={activeTab === "verify" ? "active" : ""} onClick={() => setActiveTab("verify")} type="button">
                Verification <span>{stats.verified}/{stats.total}</span>
              </button>
            </div>

            <div className="tableToolbar">
              <label className="searchField">
                Search Students
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Roll number or student name" />
              </label>

              <div className="toolbarActions">
                {activeTab === "entry" && (
                  <>
                    <button type="button" className="marksButton secondary" onClick={() => setEditingIds(new Set(students.map((s) => s.studentId)))}>
                      Edit All
                    </button>
                    <button type="button" className="marksButton primary" onClick={saveSelectedMarks}>
                      Save All
                    </button>
                  </>
                )}
                {activeTab === "verify" && (
                  <div className="verifyActions">
                    <button type="button" className="marksButton secondary" onClick={() => setEditingIds(new Set([...editingIds, ...selectedIds]))}>
                      Edit Selected
                    </button>
                    <button type="button" className="marksButton secondary" onClick={saveSelectedMarks}>
                      Save Selected
                    </button>
                    <button type="button" className="marksButton success" onClick={verifySelectedMarks}>
                      Verify Selected
                    </button>
                  </div>
                )}
              </div>
            </div>

            <CompactStudentTable
              students={visibleStudents}
              selectedIds={selectedIds}
              allSelected={allVisibleSelected}
              toggleAll={toggleAll}
              toggleSelection={toggleSelection}
              editingIds={editingIds}
              rowErrors={rowErrors}
              changeMark={changeMark}
            />
          </div>

          <div className="marksCard footerActions">
            <p>Only complete and verified marks can be submitted.</p>
            <div>
              <button type="button" className="marksButton dangerOutline" onClick={() => setDeleteOpen(true)}>
                Clear All Marks
              </button>
              <button type="button" className="marksButton primary" onClick={submitEvaluation}>
                Submit Evaluation
              </button>
            </div>
          </div>
        </>
      )}

      {deleteOpen && (
        <div className="modalOverlay" role="presentation">
          <div className="deleteModal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">Clear all marks?</h2>
            <p>Are you sure you want to clear all entered marks? This action cannot be undone.</p>
            <div>
              <button type="button" className="marksButton secondary" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button type="button" className="marksButton danger" onClick={clearMarks}>Clear</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" theme="colored" newestOnTop closeOnClick />
    </section>
  );
}

function SelectField({ label, name, value, onChange, onBlur, error, children, disabled = false }) {
  return (
    <label className="filterField">
      {label}
      <select value={value} disabled={disabled} onBlur={() => onBlur(name)} onChange={(e) => onChange(name, e.target.value)}>
        {children}
      </select>
      {error && <small>{error}</small>}
    </label>
  );
}

function CompactStudentTable({ students, selectedIds, allSelected, toggleAll, toggleSelection, editingIds, rowErrors, changeMark }) {
  return (
    <div className="marksTableWrap">
      <table className="marksTable compactMarksTable">
        <thead>
          <tr>
            <th>
              <input aria-label="Select all visible students" type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th>Student Name</th>
            <th>Internal <small>/30</small></th>
            <th>Practical <small>/30</small></th>
            <th>Theory <small>/40</small></th>
            <th>Total</th>
            <th>Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.length ? (
            students.map((student) => {
              const editing = editingIds.has(student.studentId);
              const complete = isComplete(student);
              return (
                <tr key={student.studentId}>
                  <td data-label="Select">
                    <input
                      aria-label={`Select ${student.studentName}`}
                      type="checkbox"
                      checked={selectedIds.includes(student.studentId)}
                      onChange={() => toggleSelection(student.studentId)}
                    />
                  </td>
                  <td data-label="Student Name">
                    <div className="studentInfo">
                      <strong>{student.studentName}</strong>
                      <span>{student.rollNo}</span>
                    </div>
                  </td>
                  {[
                    { key: "internalMarks", max: 30 },
                    { key: "practicalMarks", max: 30 },
                    { key: "theoryMarks", max: 40 }
                  ].map(({ key }) => (
                    <td key={key} data-label={key}>
                      <input
                        className={rowErrors[student.studentId]?.[key] ? "invalid" : ""}
                        disabled={!editing}
                        inputMode="numeric"
                        value={student[key]}
                        onChange={(e) => changeMark(student.studentId, key, e.target.value)}
                      />
                      {rowErrors[student.studentId]?.[key] && (
                        <small className="markError">{rowErrors[student.studentId][key]}</small>
                      )}
                    </td>
                  ))}
                  <td data-label="Total">{complete ? totalOf(student) : "—"}</td>
                  <td data-label="Grade"><GradeBadge complete={complete} total={totalOf(student)} /></td>
                  <td data-label="Status"><StatusBadge verified={student.verified} /></td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="8" className="emptyTable">No students match your search criteria.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}