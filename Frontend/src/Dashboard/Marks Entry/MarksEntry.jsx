import { useCallback, useEffect, useMemo, useState } from "react";
import "./MarksEntry.css";

const TEMP_BOARDS = [
  { id: 1, boardName: "BIE Telangana", status: true },
  { id: 2, boardName: "BIE Andhra Pradesh", status: true },
  { id: 3, boardName: "BIE Karnataka", status: false }
];

const TEMP_SUBJECTS = {
  MPC: [
    { id: "m1", subjectName: "Mathematics" },
    { id: "p1", subjectName: "Physics" },
    { id: "c1", subjectName: "Chemistry" }
  ],
  BiPC: [
    { id: "b1", subjectName: "Botany" },
    { id: "z1", subjectName: "Zoology" },
    { id: "c2", subjectName: "Chemistry" }
  ],
  CEC: [
    { id: "e1", subjectName: "Economics" },
    { id: "p2", subjectName: "Political Science" },
    { id: "c3", subjectName: "Commerce" }
  ],
  MEC: [
    { id: "m2", subjectName: "Mathematics" },
    { id: "e2", subjectName: "Economics" },
    { id: "c4", subjectName: "Commerce" }
  ],
  HEC: [
    { id: "h2", subjectName: "History"},
    { id: "e2", subjectName: "Economics" },
    { id: "c4", subjectName: "Commerce" }
  ]
};

const MOCK_STUDENTS = [
  { id: 101, rollNo: "C101", studentName: "Aarav Reddy", internal: "", practical: "", theory: "", verified: false },
  { id: 102, rollNo: "C102", studentName: "Bhavya Sharma", internal: "", practical: "", theory: "", verified: false },
  { id: 103, rollNo: "C103", studentName: "Charitha Kumar", internal: "", practical: "", theory: "", verified: false },
  { id: 104, rollNo: "C104", studentName: "Devansh Nair", internal: "", practical: "", theory: "", verified: false },
  { id: 105, rollNo: "C105", studentName: "Esha Varma", internal: "", practical: "", theory: "", verified: false },
  { id: 106, rollNo: "C106", studentName: "Farhan Khan", internal: "", practical: "", theory: "", verified: false },
  { id: 107, rollNo: "C107", studentName: "Geeta Rao", internal: "", practical: "", theory: "", verified: false },
  { id: 108, rollNo: "C108", studentName: "Harish Patel", internal: "", practical: "", theory: "", verified: false },
  { id: 109, rollNo: "C109", studentName: "Ishaan Desai", internal: "", practical: "", theory: "", verified: false },
  { id: 110, rollNo: "C110", studentName: "Jiya Thomas", internal: "", practical: "", theory: "", verified: false }
];

const ACADEMIC_YEARS = [
  { id: "2024-25", label: "2024 - 2025" },
  { id: "2025-26", label: "2025 - 2026" },
  { id: "2026-27", label: "2026 - 2027" }
];

const ACADEMIC_LEVELS = [
  { id: "UG", label: "Undergraduate" },
  { id: "PG", label: "Postgraduate" },
  { id: "Diploma", label: "Diploma" }
];

const GROUPS = [
  { id: "MPC", label: "MPC" },
  { id: "BiPC", label: "BiPC" },
  { id: "CEC", label: "CEC" },
  { id: "MEC", label: "MEC" }
];

const SECTIONS = [
  { id: "A", label: "Section A" },
  { id: "B", label: "Section B" },
  { id: "C", label: "Section C" }
];

const EXAMS = [
  { id: "midterm", label: "Midterm Examination" },
  { id: "semester1", label: "Semester I Examination" },
  { id: "semester2", label: "Semester II Examination" }
];

const getTotal = (row) => {
  const internal = Number(row.internal) || 0;
  const practical = Number(row.practical) || 0;
  const theory = Number(row.theory) || 0;
  return internal + practical + theory;
};

const validateMarkValue = (value, max) => {
  if (value === "") return "";
  if (!/^\d+$/.test(value)) return "Only whole numbers allowed";
  const numeric = Number(value);
  if (numeric < 0) return `0–${max} only`;
  if (numeric > max) return `0–${max} only`;
  return "";
};

export default function MarksEntry() {
  const [boards, setBoards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    board: "",
    academicYear: "",
    academicLevel: "",
    group: "",
    section: "",
    exam: "",
    subject: ""
  });
  const [filterErrors, setFilterErrors] = useState({});
  const [students, setStudents] = useState([]);
  const [studentErrors, setStudentErrors] = useState({});
  const [editingRows, setEditingRows] = useState(new Set());
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    localStorage.removeItem("marksEntryFilters");
    localStorage.removeItem("marksEntryRows");
    localStorage.removeItem("marksEntryUpdatedAt");

    const loadBoards = async () => {
      try {
        const response = await fetch("/api/v1/boards");
        if (!response.ok) throw new Error("Board fetch failed");
        const data = await response.json();
        const activeBoards = Array.isArray(data) ? data.filter((board) => board.status === true) : [];
        setBoards(activeBoards.length ? activeBoards : TEMP_BOARDS.filter((board) => board.status === true));
      } catch (error) {
        setBoards(TEMP_BOARDS.filter((board) => board.status === true));
      }
    };

    loadBoards();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!filters.group) {
        setSubjects([]);
        return;
      }

      try {
        const response = await fetch(`/api/v1/subjects/group/${encodeURIComponent(filters.group)}`);
        if (!response.ok) throw new Error("Subject fetch failed");
        const data = await response.json();
        if (Array.isArray(data) && data.length) {
          setSubjects(data);
          return;
        }
      } catch (error) {
        // fallback below
      }

      setSubjects(TEMP_SUBJECTS[filters.group] || []);
    };

    loadSubjects();
  }, [filters.group]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    localStorage.setItem("marksEntryFilters", JSON.stringify(filters));
    localStorage.setItem("marksEntryRows", JSON.stringify(students));
    localStorage.setItem("marksEntryUpdatedAt", String(Date.now()));
  }, [filters, students]);

  const validateFilters = useCallback(() => {
    const errors = {};
    if (!filters.board) errors.board = "Please select Board";
    if (!filters.academicYear) errors.academicYear = "Please select Academic Year";
    if (!filters.academicLevel) errors.academicLevel = "Please select Academic Level";
    if (!filters.group) errors.group = "Please select Group";
    if (!filters.section) errors.section = "Please select Section";
    if (!filters.exam) errors.exam = "Please select Exam";
    if (!filters.subject) errors.subject = "Please select Subject";
    setFilterErrors(errors);
    return Object.keys(errors).length === 0;
  }, [filters]);

  const canCheckStudents = useMemo(
    () => Object.values(filters).every((value) => Boolean(value)),
    [filters]
  );

  const handleFilterChange = useCallback((field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "group" ? { subject: "" } : {})
    }));
    setFilterErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "group") {
      setSubjects([]);
    }
  }, []);

  const handleCheckStudents = useCallback(() => {
    if (!validateFilters()) return;
    setStudents(
      MOCK_STUDENTS.map((student) => ({
        ...student,
        internal: "",
        practical: "",
        theory: "",
        verified: false
      }))
    );
    setSelectedStudents([]);
    setEditingRows(new Set());
    setStudentErrors({});
    setSearchQuery("");
    setSubmitMessage("");
    setNotification({ type: "success", text: "Student list loaded for evaluation." });
  }, [validateFilters]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      return (
        student.rollNo.toLowerCase().includes(query) ||
        student.studentName.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, students]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const marksEntered = students.filter((student) => {
      return student.internal !== "" || student.practical !== "" || student.theory !== "";
    }).length;
    const verifiedStudents = students.filter((student) => student.verified).length;
    const pendingStudents = totalStudents - verifiedStudents;
    const totals = students
      .map((student) => getTotal(student))
      .filter((value) => value > 0);
    const averageMarks = totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 0;
    const highestMarks = totals.length ? Math.max(...totals) : 0;

    return {
      totalStudents,
      marksEntered,
      verifiedStudents,
      pendingStudents,
      averageMarks,
      highestMarks
    };
  }, [students]);

  const toggleStudentSelection = useCallback(
    (studentId) => {
      setSelectedStudents((current) => {
        if (current.includes(studentId)) {
          return current.filter((id) => id !== studentId);
        }
        return [...current, studentId];
      });
    },
    [setSelectedStudents]
  );

  const selectAllOnPage = useCallback(() => {
    const pageIds = filteredStudents.map((student) => student.id);
    const allSelected = pageIds.every((id) => selectedStudents.includes(id));
    if (allSelected) {
      setSelectedStudents((current) => current.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedStudents((current) => [...new Set([...current, ...pageIds])]);
    }
  }, [filteredStudents, selectedStudents]);

  const handleMarkChange = useCallback(
    (studentId, field, value) => {
      const max = field === "theory" ? 40 : 30;
      const error = validateMarkValue(value, max);
      setStudents((current) =>
        current.map((student) => {
          if (student.id !== studentId) return student;
          const updated = {
            ...student,
            [field]: value,
            verified: student.verified ? false : student.verified
          };
          return updated;
        })
      );
      setStudentErrors((current) => ({
        ...current,
        [studentId]: {
          ...current[studentId],
          [field]: error
        }
      }));
    },
    []
  );

  const handleEditRow = useCallback((studentId) => {
    setEditingRows((current) => new Set(current).add(studentId));
  }, []);

  const handleSaveRow = useCallback(
    (studentId) => {
      const student = students.find((row) => row.id === studentId);
      if (!student) return;
      const internalError = validateMarkValue(student.internal, 30);
      const practicalError = validateMarkValue(student.practical, 30);
      const theoryError = validateMarkValue(student.theory, 40);
      const rowErrors = {
        internal: internalError,
        practical: practicalError,
        theory: theoryError
      };
      setStudentErrors((current) => ({
        ...current,
        [studentId]: rowErrors
      }));
      if (internalError || practicalError || theoryError) return;
      setEditingRows((current) => {
        const next = new Set(current);
        next.delete(studentId);
        return next;
      });
    },
    [students]
  );

  const handleEditSelected = useCallback(() => {
    setEditingRows((current) => {
      const next = new Set(current);
      selectedStudents.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedStudents]);

  const handleVerifySelected = useCallback(() => {
    setStudents((current) =>
      current.map((student) => {
        if (!selectedStudents.includes(student.id)) return student;
        return {
          ...student,
          verified: true
        };
      })
    );
    setNotification({ type: "success", text: "Selected students verified." });
  }, [selectedStudents]);

  const handleDeleteAllMarks = useCallback(() => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        internal: "",
        practical: "",
        theory: "",
        verified: false
      }))
    );
    setStudentErrors({});
    setEditingRows(new Set());
    setSelectedStudents([]);
    setNotification({ type: "warning", text: "All marks have been cleared." });
    setModalOpen(false);
  }, []);

  const handleSubmitEvaluation = useCallback(() => {
    if (students.length === 0) {
      setSubmitMessage("Please load students before submitting.");
      return;
    }
    const hasMarks = students.some((student) => student.internal !== "" || student.practical !== "" || student.theory !== ""
    );
    if (!hasMarks) {
      setSubmitMessage("Please enter marks before submitting.");
      return;
    }
    setSubmitMessage("");
    setNotification({ type: "success", text: "Evaluation submitted successfully." });
  }, [students]);

  const activeBoards = useMemo(() => boards.filter((board) => board.status === true), [boards]);
  const headerCount = students.length;
  const anySelected = selectedStudents.length > 0;

  return (
    <div className="marksEntry">
      <div className="card filterCard">
        <div className="cardHeader">
          <div>
            <h2>Assessment Filters</h2>
            <p>Use these mandatory filters to load the student evaluation list.</p>
          </div>
          <button
            type="button"
            className="button button-primary"
            disabled={!canCheckStudents}
            onClick={handleCheckStudents}
          >
            Check Students
          </button>
        </div>

        <div className="filterGrid">
          <div className="fieldGroup">
            <label htmlFor="board">Board</label>
            <select
              id="board"
              value={filters.board}
              onChange={(event) => handleFilterChange("board", event.target.value)}
            >
              <option value="">Select Board</option>
              {activeBoards.map((board) => (
                <option key={board.id} value={board.boardName}>
                  {board.boardName}
                </option>
              ))}
            </select>
            {filterErrors.board && <div className="fieldError">{filterErrors.board}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="academicYear">Academic Year</label>
            <select
              id="academicYear"
              value={filters.academicYear}
              onChange={(event) => handleFilterChange("academicYear", event.target.value)}
            >
              <option value="">Select Academic Year</option>
              {ACADEMIC_YEARS.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
            {filterErrors.academicYear && <div className="fieldError">{filterErrors.academicYear}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="academicLevel">Academic Level</label>
            <select
              id="academicLevel"
              value={filters.academicLevel}
              onChange={(event) => handleFilterChange("academicLevel", event.target.value)}
            >
              <option value="">Select Academic Level</option>
              {ACADEMIC_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
            {filterErrors.academicLevel && <div className="fieldError">{filterErrors.academicLevel}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="group">Group</label>
            <select
              id="group"
              value={filters.group}
              onChange={(event) => handleFilterChange("group", event.target.value)}
            >
              <option value="">Select Group</option>
              {GROUPS.map((groupItem) => (
                <option key={groupItem.id} value={groupItem.id}>
                  {groupItem.label}
                </option>
              ))}
            </select>
            {filterErrors.group && <div className="fieldError">{filterErrors.group}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="section">Section</label>
            <select
              id="section"
              value={filters.section}
              onChange={(event) => handleFilterChange("section", event.target.value)}
            >
              <option value="">Select Section</option>
              {SECTIONS.map((sectionItem) => (
                <option key={sectionItem.id} value={sectionItem.id}>
                  {sectionItem.label}
                </option>
              ))}
            </select>
            {filterErrors.section && <div className="fieldError">{filterErrors.section}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="exam">Exam</label>
            <select
              id="exam"
              value={filters.exam}
              onChange={(event) => handleFilterChange("exam", event.target.value)}
            >
              <option value="">Select Exam</option>
              {EXAMS.map((examItem) => (
                <option key={examItem.id} value={examItem.id}>
                  {examItem.label}
                </option>
              ))}
            </select>
            {filterErrors.exam && <div className="fieldError">{filterErrors.exam}</div>}
          </div>

          <div className="fieldGroup">
            <label htmlFor="subject">Subject</label>
            <select
              id="subject"
              value={filters.subject}
              onChange={(event) => handleFilterChange("subject", event.target.value)}
              disabled={!filters.group}
            >
              <option value="">Select Subject</option>
              {subjects.map((subjectItem) => (
                <option key={subjectItem.id} value={subjectItem.subjectName}>
                  {subjectItem.subjectName}
                </option>
              ))}
            </select>
            {filterErrors.subject && <div className="fieldError">{filterErrors.subject}</div>}
          </div>
        </div>
      </div>

      <div className="card statsCard">
        <div className="statsGrid">
          <div className="statTile">
            <span className="statLabel">Total Students</span>
            <strong>{stats.totalStudents}</strong>
          </div>
          <div className="statTile">
            <span className="statLabel">Marks Entered</span>
            <strong>{stats.marksEntered}</strong>
          </div>
          <div className="statTile">
            <span className="statLabel">Verified Students</span>
            <strong>{stats.verifiedStudents}</strong>
          </div>
          <div className="statTile">
            <span className="statLabel">Pending Students</span>
            <strong>{stats.pendingStudents}</strong>
          </div>
          <div className="statTile">
            <span className="statLabel">Average Marks</span>
            <strong>{stats.averageMarks}</strong>
          </div>
          <div className="statTile">
            <span className="statLabel">Highest Marks</span>
            <strong>{stats.highestMarks}</strong>
          </div>
        </div>
      </div>

      <div className="card searchCard">
        <div className="searchRow">
          <div>
            <h3>Student Search</h3>
            <p>Search the student list by Roll No or Name.</p>
          </div>
          <input
            type="search"
            placeholder="Search student by Roll No or Name"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="card tableCard">
        <div className="tableHeader">
          <div>
            <h3>Marks Entry</h3>
            <p>{headerCount} students available for evaluation.</p>
          </div>
          <div className="tableActions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleEditSelected}
              disabled={!anySelected}
            >
              Edit Selected
            </button>
            <button
              type="button"
              className="button button-success"
              onClick={handleVerifySelected}
              disabled={!anySelected}
            >
              Verify Selected
            </button>
          </div>
        </div>

        <div className="tableWrapper">
          <table className="dataTable">
            <thead>
              <tr>
                <th>
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudents.includes(student.id))}
                      onChange={selectAllOnPage}
                    />
                  </label>
                </th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Internal Marks</th>
                <th>Practical Marks</th>
                <th>Theory Marks</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const isEditing = editingRows.has(student.id);
                const errors = studentErrors[student.id] || {};
                const total = getTotal(student);
                return (
                  <tr key={student.id}>
                    <td>
                      <label className="checkboxLabel">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                        />
                      </label>
                    </td>
                    <td>{student.rollNo}</td>
                    <td>{student.studentName}</td>
                    <td>
                      <input
                        type="text"
                        className={errors.internal ? "fieldInput fieldInvalid" : "fieldInput"}
                        value={student.internal}
                        onChange={(event) => handleMarkChange(student.id, "internal", event.target.value)}
                        disabled={!isEditing}
                        placeholder="0-30"
                      />
                      {errors.internal && <div className="fieldError">{errors.internal}</div>}
                    </td>
                    <td>
                      <input
                        type="text"
                        className={errors.practical ? "fieldInput fieldInvalid" : "fieldInput"}
                        value={student.practical}
                        onChange={(event) => handleMarkChange(student.id, "practical", event.target.value)}
                        disabled={!isEditing}
                        placeholder="0-30"
                      />
                      {errors.practical && <div className="fieldError">{errors.practical}</div>}
                    </td>
                    <td>
                      <input
                        type="text"
                        className={errors.theory ? "fieldInput fieldInvalid" : "fieldInput"}
                        value={student.theory}
                        onChange={(event) => handleMarkChange(student.id, "theory", event.target.value)}
                        disabled={!isEditing}
                        placeholder="0-40"
                      />
                      {errors.theory && <div className="fieldError">{errors.theory}</div>}
                    </td>
                    <td>{total}</td>
                    <td>
                      <span className={`statusBadge ${student.verified ? "statusVerified" : "statusPending"}`}>
                        {student.verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={isEditing ? "button button-success button-small" : "button button-secondary button-small"}
                        onClick={() => (isEditing ? handleSaveRow(student.id) : handleEditRow(student.id))}
                      >
                        {isEditing ? "Save" : "Edit"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredStudents.length && (
                <tr>
                  <td colSpan={9} className="emptyRow">
                    No students available. Adjust filters and load the student list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card actionCard">
        <div className="actionRow">
          <button type="button" className="button button-danger" onClick={() => setModalOpen(true)}>
            Delete All Marks
          </button>
          <div className="actionGroup">
            {submitMessage && <span className="submitFeedback">{submitMessage}</span>}
            <button type="button" className="button button-primary" onClick={handleSubmitEvaluation}>
              Submit Evaluation
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`toast ${notification.type === "success" ? "toastSuccess" : "toastWarning"}`}>
          {notification.text}
        </div>
      )}

      {modalOpen && (
        <div className="modalOverlay">
          <div className="modalCard">
            <h2>Clear all entered marks?</h2>
            <p>Are you sure you want to clear all entered marks?</p>
            <div className="modalActions">
              <button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button button-danger" onClick={handleDeleteAllMarks}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
