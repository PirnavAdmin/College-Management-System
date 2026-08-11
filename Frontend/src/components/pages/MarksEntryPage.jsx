import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "../layout/DashboardLayout";
import "./MarksEntryPage.css";

/* ============================================================
   SVG ICON COMPONENTS (Clean inline rendering & zero dependency errors)
   ============================================================ */
const IconPencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconXCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/* ============================================================
   FALLBACK DATA DEFINITIONS
   ============================================================ */
const FALLBACK_BOARDS = [
  "BIE Telangana (BIETS)",
  "BIE Andhra Pradesh (BIEAP)",
  "CBSE Senior Secondary"
];

const FALLBACK_ACADEMIC_YEARS = ["2025-2026", "2026-2027"];

const FALLBACK_ACADEMIC_LEVELS = [
  "Intermediate 1st Year",
  "Intermediate 2nd Year"
];

const FALLBACK_GROUPS = ["MPC", "BiPC", "CEC", "MEC"];

const FALLBACK_SECTIONS = ["Section A", "Section B", "Section C"];

const FALLBACK_EXAMINATIONS = [
  "Semester I",
  "Midterm Examination 2025",
  "Quarterly Assessment 1",
  "Annual Pre-Board Exam"
];

// Group to Subjects mapping
const GROUP_SUBJECTS = {
  MPC: ["English", "Sanskrit", "Mathematics", "Physics", "Chemistry"],
  BiPC: ["English", "Sanskrit", "Botany", "Zoology", "Physics", "Chemistry"],
  CEC: ["English", "Sanskrit", "Civics", "Economics", "Commerce"],
  MEC: ["English", "Sanskrit", "Mathematics", "Economics", "Commerce"]
};

// Subject Faculty Mapping
const SUBJECT_FACULTY = {
  English: "Lakshmi",
  Sanskrit: "Suresh",
  Mathematics: "Ravi Kumar",
  Physics: "Naresh",
  Chemistry: "Kiran",
  Botany: "Dr. S. Reddy",
  Zoology: "Dr. P. Varma",
  Civics: "M. Narayana",
  Economics: "K. Swamy",
  Commerce: "V. Rao"
};

// PRACTICAL SUBJECTS RULE:
// Physics, Chemistry, Zoology, Botany have practical marks.
// All other subjects have Theory & Internal ONLY!
const PRACTICAL_SUBJECT_NAMES = ["physics", "chemistry", "zoology", "botany"];

const isPracticalSubject = (subjectName) => {
  if (!subjectName) return false;
  const name = String(subjectName).toLowerCase().trim();
  return PRACTICAL_SUBJECT_NAMES.some((p) => name.includes(p));
};

// Student list template
const INITIAL_STUDENTS_BASE = [
  { id: 101, rollNo: "MPC001", studentName: "Rahul" },
  { id: 102, rollNo: "MPC002", studentName: "Ramesh" },
  { id: 103, rollNo: "MPC003", studentName: "Sai Kiran" },
  { id: 104, rollNo: "MPC004", studentName: "Ananya Reddy" },
  { id: 105, rollNo: "MPC005", studentName: "Venkatesh" },
  { id: 106, rollNo: "MPC006", studentName: "Priyanka" }
];

const DEFAULT_SUBJECT_STATUSES = {
  English: "SUBMITTED",
  Sanskrit: "SUBMITTED",
  Mathematics: "VERIFIED",
  Physics: "APPROVED",
  Chemistry: "SUBMITTED",
  Botany: "SUBMITTED",
  Zoology: "VERIFIED",
  Civics: "SUBMITTED",
  Economics: "APPROVED",
  Commerce: "SUBMITTED"
};

// Helpers
const calculateTotal = (row, isPractical) => {
  const internal = Number(row.internal) || 0;
  const theory = Number(row.theory) || 0;
  const practical = isPractical ? Number(row.practical) || 0 : 0;
  return internal + theory + practical;
};

const getGrade = (totalMarks, maxMarks = 100) => {
  const pct = (totalMarks / maxMarks) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};

/* ============================================================
   MAIN MARKS ENTRY COMPONENT
   ============================================================ */
export default function MarksEntryPage() {
  const [filters, setFilters] = useState({
    board: "",
    academicYear: "",
    academicLevel: "",
    group: "",
    section: "",
    examination: ""
  });

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("evaluations");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const [evaluations, setEvaluations] = useState([]);
  const [subjectMarksData, setSubjectMarksData] = useState({});

  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [modalRows, setModalRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleFilterChange = (key, value) => {
    setReady(false);
    setSelectedEvaluation(null);
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "board") {
        next.academicYear = "";
        next.academicLevel = "";
        next.group = "";
        next.section = "";
        next.examination = "";
      } else if (key === "academicYear") {
        next.academicLevel = "";
        next.group = "";
        next.section = "";
        next.examination = "";
      } else if (key === "academicLevel") {
        next.group = "";
        next.section = "";
        next.examination = "";
      } else if (key === "group") {
        next.section = "";
        next.examination = "";
      } else if (key === "section") {
        next.examination = "";
      }
      return next;
    });
  };

  const isAllFiltersSelected = useMemo(() => {
    return Boolean(
      filters.board &&
        filters.academicYear &&
        filters.academicLevel &&
        filters.group &&
        filters.section &&
        filters.examination
    );
  }, [filters]);

  const handleFetchData = () => {
    if (!isAllFiltersSelected) return;

    const group = filters.group || "MPC";
    const subjects = GROUP_SUBJECTS[group] || GROUP_SUBJECTS.MPC;
    const sectionShort = filters.section.replace(/Section\s*/i, "").trim() || "A";

    const newEvaluations = subjects.map((subj, index) => ({
      evaluationId: `EV-${1000 + index + 1}`,
      subjectName: subj,
      facultyName: SUBJECT_FACULTY[subj] || "Faculty Instructor",
      studentsCount: INITIAL_STUDENTS_BASE.length * 10,
      status: DEFAULT_SUBJECT_STATUSES[subj] || "SUBMITTED"
    }));

    const newSubjectMarksData = {};

    subjects.forEach((subj) => {
      const isPractical = isPracticalSubject(subj);

      newSubjectMarksData[subj] = INITIAL_STUDENTS_BASE.map((stu, idx) => {
        const rollNo = `${group}${sectionShort}00${idx + 1}`;
        const internal = 20 + (idx % 3);
        const theory = isPractical ? 60 + idx * 2 : 65 + idx * 3;
        const practical = isPractical ? 18 + (idx % 3) : 0;

        return {
          studentId: stu.id,
          rollNo: rollNo,
          studentName: stu.studentName,
          internal: internal,
          theory: theory,
          practical: practical
        };
      });
    });

    setEvaluations(newEvaluations);
    setSubjectMarksData(newSubjectMarksData);
    setReady(true);
    showToast(`Loaded evaluation data for ${filters.group} (${filters.section})`, "success");
  };

  const summaryStats = useMemo(() => {
    const total = evaluations.length;
    const submitted = evaluations.filter((e) => e.status === "SUBMITTED").length;
    const verified = evaluations.filter((e) => e.status === "VERIFIED").length;
    const approved = evaluations.filter((e) => e.status === "APPROVED").length;
    const rejected = evaluations.filter((e) => e.status === "REJECTED").length;
    return { total, submitted, verified, approved, rejected };
  }, [evaluations]);

  const handleOpenEvaluationModal = (item) => {
    const subjName = item.subjectName;
    const rowsForSubject = subjectMarksData[subjName] || [];

    setSelectedEvaluation(item);
    setModalRows(JSON.parse(JSON.stringify(rowsForSubject)));
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setSelectedEvaluation(null);
    setModalRows([]);
    setIsEditing(false);
  };

  const handleUpdateMarkInModal = (index, field, value) => {
    if (value !== "" && !/^\d+$/.test(value)) return;

    setModalRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return {
          ...row,
          [field]: value === "" ? "" : Math.max(0, parseInt(value, 10))
        };
      })
    );
  };

  const handleSaveModal = () => {
    if (!selectedEvaluation) return;

    const subjName = selectedEvaluation.subjectName;

    setSubjectMarksData((prev) => ({
      ...prev,
      [subjName]: modalRows
    }));

    setIsEditing(false);
    showToast(`${subjName} evaluation marks updated successfully!`, "success");
  };

  const handleUpdateStatus = (newStatus) => {
    if (!selectedEvaluation) return;

    const targetId = selectedEvaluation.evaluationId;
    const subjName = selectedEvaluation.subjectName;

    setEvaluations((prev) =>
      prev.map((item) =>
        item.evaluationId === targetId ? { ...item, status: newStatus } : item
      )
    );

    setSelectedEvaluation((prev) =>
      prev ? { ...prev, status: newStatus } : null
    );

    let msg = "";
    let toastType = "success";

    if (newStatus === "VERIFIED") {
      msg = `${subjName} evaluation verified successfully.`;
    } else if (newStatus === "APPROVED") {
      msg = `${subjName} evaluation approved successfully.`;
    } else if (newStatus === "REJECTED") {
      msg = `${subjName} evaluation rejected.`;
      toastType = "error";
    } else {
      msg = `${subjName} status updated to ${newStatus}.`;
    }

    showToast(msg, toastType);
  };

  const filteredEvaluations = useMemo(() => {
    if (!searchTerm.trim()) return evaluations;
    const term = searchTerm.toLowerCase();
    return evaluations.filter(
      (item) =>
        item.subjectName.toLowerCase().includes(term) ||
        item.facultyName.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
    );
  }, [evaluations, searchTerm]);

  const currentGroupSubjects = GROUP_SUBJECTS[filters.group || "MPC"] || [];
  
  const studentSubjectMarksList = useMemo(() => {
    if (!ready || INITIAL_STUDENTS_BASE.length === 0) return [];

    const sectionShort = (filters.section || "A").replace(/Section\s*/i, "").trim();

    return INITIAL_STUDENTS_BASE.map((student, idx) => {
      const rollNo = `${filters.group || "MPC"}${sectionShort}00${idx + 1}`;
      let studentTotal = 0;
      const marksPerSubject = {};

      currentGroupSubjects.forEach((subj) => {
        const subjRows = subjectMarksData[subj] || [];
        const match = subjRows.find((r) => r.studentId === student.id) || subjRows[idx];
        
        if (match) {
          const isPractical = isPracticalSubject(subj);
          const total = calculateTotal(match, isPractical);
          marksPerSubject[subj] = total;
          studentTotal += total;
        } else {
          marksPerSubject[subj] = 0;
        }
      });

      const maxPossible = currentGroupSubjects.length * 100;
      const overallGrade = getGrade(studentTotal, maxPossible);

      return {
        studentId: student.id,
        rollNo: rollNo,
        studentName: student.studentName,
        marks: marksPerSubject,
        total: studentTotal,
        maxTotal: maxPossible,
        grade: overallGrade
      };
    });
  }, [ready, subjectMarksData, currentGroupSubjects, filters.group, filters.section]);

  return (
    <DashboardLayout
      title="Academic Evaluation"
      subtitle="Review, verify and approve faculty submitted evaluations."
      breadcrumb={["Examinations", "Marks Entry"]}
    >
      <div className="cms-marks-entry cms-anim-up">
        {toastMessage && (
          <div className={`cms-toast-banner cms-toast-${toastMessage.type}`}>
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* Filters Grid */}
        <div className="cms-card cms-card-filter">
          <div className="cms-section-heading">
            <div>
              <h2>Evaluation Filters</h2>
              <p>Choose the academic context before reviewing faculty submissions.</p>
            </div>
            <button
              className="cms-btn cms-btn-primary"
              disabled={!isAllFiltersSelected}
              onClick={handleFetchData}
            >
              Fetch Evaluation Data
            </button>
          </div>

          <div className="cms-filter-grid">
            <SelectFilter
              label="Board"
              value={filters.board}
              options={FALLBACK_BOARDS}
              onChange={(v) => handleFilterChange("board", v)}
            />
            <SelectFilter
              label="Academic Year"
              value={filters.academicYear}
              disabled={!filters.board}
              options={FALLBACK_ACADEMIC_YEARS}
              onChange={(v) => handleFilterChange("academicYear", v)}
            />
            <SelectFilter
              label="Academic Level"
              value={filters.academicLevel}
              disabled={!filters.academicYear}
              options={FALLBACK_ACADEMIC_LEVELS}
              onChange={(v) => handleFilterChange("academicLevel", v)}
            />
            <SelectFilter
              label="Group"
              value={filters.group}
              disabled={!filters.academicLevel}
              options={FALLBACK_GROUPS}
              onChange={(v) => handleFilterChange("group", v)}
            />
            <SelectFilter
              label="Section"
              value={filters.section}
              disabled={!filters.group}
              options={FALLBACK_SECTIONS}
              onChange={(v) => handleFilterChange("section", v)}
            />
            <SelectFilter
              label="Examination"
              value={filters.examination}
              disabled={!filters.section}
              options={FALLBACK_EXAMINATIONS}
              onChange={(v) => handleFilterChange("examination", v)}
            />
          </div>
        </div>

        {/* Content Section */}
        {ready ? (
          <>
            <div className="cms-stats-grid">
              <div className="cms-stat-card cms-stat-total">
                <span>Total Subjects</span>
                <strong>{summaryStats.total}</strong>
              </div>
              <div className="cms-stat-card cms-stat-submitted">
                <span>Submitted</span>
                <strong>{summaryStats.submitted}</strong>
              </div>
              <div className="cms-stat-card cms-stat-verified">
                <span>Verified</span>
                <strong>{summaryStats.verified}</strong>
              </div>
              <div className="cms-stat-card cms-stat-approved">
                <span>Approved</span>
                <strong>{summaryStats.approved}</strong>
              </div>
              <div className="cms-stat-card cms-stat-rejected">
                <span>Rejected</span>
                <strong>{summaryStats.rejected}</strong>
              </div>
            </div>

            <div className="cms-card cms-main-card">
              <div className="cms-table-toolbar">
                <div className="cms-tab-bar">
                  <button
                    className={`cms-tab-btn ${activeTab === "evaluations" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("evaluations")}
                  >
                    Evaluations
                  </button>
                  <button
                    className={`cms-tab-btn ${activeTab === "studentMarks" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("studentMarks")}
                  >
                    Student Subject Marks
                  </button>
                </div>

                {activeTab === "evaluations" && (
                  <div className="cms-search-wrap">
                    <span className="cms-search-icon"><IconSearch /></span>
                    <input
                      type="text"
                      className="cms-search-input"
                      placeholder="Search subject, faculty, status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Tab 1: Evaluations */}
              {activeTab === "evaluations" && (
                <div className="cms-table-container">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>SUBJECT</th>
                        <th>FACULTY</th>
                        <th>STUDENTS</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvaluations.length > 0 ? (
                        filteredEvaluations.map((item) => (
                          <tr
                            key={item.evaluationId}
                            className="cms-clickable-row"
                            onClick={() => handleOpenEvaluationModal(item)}
                          >
                            <td className="cms-font-semibold">{item.subjectName}</td>
                            <td className="cms-text-muted">{item.facultyName}</td>
                            <td>{item.studentsCount}</td>
                            <td>
                              <StatusBadge status={item.status} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="cms-empty-td">
                            No evaluations found matching search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Student Subject Marks (Read-Only) */}
              {activeTab === "studentMarks" && (
                <div className="cms-table-container">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>ROLL NO</th>
                        <th>STUDENT NAME</th>
                        {currentGroupSubjects.map((subj) => (
                          <th key={subj}>{subj.toUpperCase()}</th>
                        ))}
                        <th>TOTAL</th>
                        <th>GRADE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentSubjectMarksList.map((stu) => (
                        <tr key={stu.studentId} className="cms-idle-row">
                          <td className="cms-font-semibold">{stu.rollNo}</td>
                          <td>{stu.studentName}</td>
                          {currentGroupSubjects.map((subj) => (
                            <td key={subj}>{stu.marks[subj] ?? "—"}</td>
                          ))}
                          <td className="cms-font-semibold">
                            {stu.total} / {stu.maxTotal}
                          </td>
                          <td>
                            <span className={`cms-badge-grade cms-grade-${stu.grade.toLowerCase().replace("+", "-plus")}`}>
                              {stu.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="cms-card cms-empty-table">
            <p>Select all evaluation filters and click <strong>Fetch Evaluation Data</strong> to view evaluation status &amp; student marks.</p>
          </div>
        )}

        {/* Modal Popup */}
        {selectedEvaluation && createPortal(
          <div className="cms-modal-overlay" onClick={handleCloseModal}>
            <div
              className="cms-modal-content cms-evaluation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cms-modal-header">
                <div>
                  <h2 className="cms-modal-title">{selectedEvaluation.subjectName} Evaluation</h2>
                  <span className="cms-modal-subtitle">Review, edit, and approve marks evaluation</span>
                </div>
                <button
                  className="cms-modal-close-btn"
                  title="Close Modal"
                  aria-label="Close Modal"
                  onClick={handleCloseModal}
                >
                  <IconX />
                </button>
              </div>

              <div className="cms-detail-grid">
                <div className="cms-detail-card">
                  <span className="cms-detail-label">Faculty</span>
                  <span className="cms-detail-value">{selectedEvaluation.facultyName}</span>
                </div>
                <div className="cms-detail-card">
                  <span className="cms-detail-label">Group</span>
                  <span className="cms-detail-value">{filters.group || "MPC"}</span>
                </div>
                <div className="cms-detail-card">
                  <span className="cms-detail-label">Section</span>
                  <span className="cms-detail-value">{(filters.section || "Section A").replace(/Section\s*/i, "")}</span>
                </div>
                <div className="cms-detail-card">
                  <span className="cms-detail-label">Examination</span>
                  <span className="cms-detail-value">{filters.examination || "Semester I"}</span>
                </div>
              </div>

              {(() => {
                const practical = isPracticalSubject(selectedEvaluation.subjectName);
                return (
                  <div className="cms-table-container cms-modal-table-wrap">
                    <table className="cms-table">
                      <thead>
                        <tr>
                          <th>ROLL NO</th>
                          <th>STUDENT NAME</th>
                          <th>INTERNAL</th>
                          <th>THEORY</th>
                          {practical && <th>PRACTICAL</th>}
                          <th>TOTAL</th>
                          <th>GRADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalRows.map((row, idx) => {
                          const totalMarks = calculateTotal(row, practical);
                          const maxMarks = 100;
                          const grade = getGrade(totalMarks, maxMarks);

                          return (
                            <tr key={row.studentId || idx}>
                              <td className="cms-font-semibold">{row.rollNo}</td>
                              <td>{row.studentName}</td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="cms-mark-input"
                                    value={row.internal}
                                    onChange={(e) =>
                                      handleUpdateMarkInModal(idx, "internal", e.target.value)
                                    }
                                  />
                                ) : (
                                  row.internal
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="cms-mark-input"
                                    value={row.theory}
                                    onChange={(e) =>
                                      handleUpdateMarkInModal(idx, "theory", e.target.value)
                                    }
                                  />
                                ) : (
                                  row.theory
                                )}
                              </td>
                              {practical && (
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className="cms-mark-input"
                                      value={row.practical}
                                      onChange={(e) =>
                                        handleUpdateMarkInModal(idx, "practical", e.target.value)
                                      }
                                    />
                                  ) : (
                                    row.practical
                                  )}
                                </td>
                              )}
                              <td className="cms-font-semibold">
                                {totalMarks} / {maxMarks}
                              </td>
                              <td>
                                <span className={`cms-badge-grade cms-grade-${grade.toLowerCase().replace("+", "-plus")}`}>
                                  {grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div className="cms-modal-actions">
                {isEditing ? (
                  <>
                    <button
                      className="cms-btn cms-btn-secondary"
                      onClick={() => {
                        const subjName = selectedEvaluation.subjectName;
                        const originalRows = subjectMarksData[subjName] || [];
                        setModalRows(JSON.parse(JSON.stringify(originalRows)));
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="cms-btn cms-btn-primary"
                      onClick={handleSaveModal}
                    >
                      <IconSave /> Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="cms-btn cms-btn-edit-outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <IconPencil /> Edit
                    </button>

                    {selectedEvaluation.status === "SUBMITTED" && (
                      <>
                        <button
                          className="cms-btn cms-btn-info"
                          onClick={() => handleUpdateStatus("VERIFIED")}
                        >
                          <IconShield /> Verify
                        </button>
                        <button
                          className="cms-btn cms-btn-danger"
                          onClick={() => handleUpdateStatus("REJECTED")}
                        >
                          <IconXCircle /> Reject
                        </button>
                      </>
                    )}

                    {selectedEvaluation.status === "VERIFIED" && (
                      <>
                        <button
                          className="cms-btn cms-btn-success"
                          onClick={() => handleUpdateStatus("APPROVED")}
                        >
                          <IconCheck /> Approve
                        </button>
                        <button
                          className="cms-btn cms-btn-danger"
                          onClick={() => handleUpdateStatus("REJECTED")}
                        >
                          <IconXCircle /> Reject
                        </button>
                      </>
                    )}

                    {selectedEvaluation.status === "APPROVED" && (
                      <span className="cms-status-pill cms-status-approved">
                        <IconCheck /> Approved
                      </span>
                    )}

                    {selectedEvaluation.status === "REJECTED" && (
                      <span className="cms-status-pill cms-status-rejected">
                        <IconXCircle /> Rejected
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}

function SelectFilter({ label, value, options, disabled, onChange }) {
  return (
    <div className="cms-field-group">
      <label className="cms-field-label">{label}</label>
      <select
        className="cms-select-input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  let badgeClass = "cms-status-submitted";

  if (s === "VERIFIED") badgeClass = "cms-status-verified";
  else if (s === "APPROVED") badgeClass = "cms-status-approved";
  else if (s === "REJECTED") badgeClass = "cms-status-rejected";

  return (
    <span className={`cms-badge-status ${badgeClass}`}>
      <span className="cms-badge-dot" />
      {s}
    </span>
  );
}
