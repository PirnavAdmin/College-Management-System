import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import "./MarksEntryPage.css";

/* ============================================================
   SVG ICON COMPONENTS
   ============================================================ */
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconXCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const STUDENTS_PER_PAGE = 10;
const STUDENT_MARKS_PER_PAGE = 10;

const STATUS_META = {
  DRAFT: { label: "DRAFT", badgeClass: "cms-status-submitted" },
  SUBMITTED: { label: "SUBMITTED", badgeClass: "cms-status-submitted" },
  VERIFIED: { label: "VERIFIED", badgeClass: "cms-status-verified" },
  APPROVED: { label: "APPROVED", badgeClass: "cms-status-approved" },
  REJECTED: { label: "REJECTED", badgeClass: "cms-status-rejected" }
};

const PRACTICAL_SUBJECT_NAMES = ["physics", "chemistry", "zoology", "botany"];

const isPracticalSubject = (subjectName) => {
  if (!subjectName) return false;
  const name = String(subjectName).toLowerCase().trim();
  return PRACTICAL_SUBJECT_NAMES.some((p) => name.includes(p));
};

const getResponseItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const items = payload.students ?? payload.marksList ?? payload.items ?? payload.data ?? payload.results;
  return Array.isArray(items) ? items : getResponseItems(items);
};

const normalizeStatus = (status) => {
  const value = String(status ?? "SUBMITTED").toUpperCase();
  return ({ 0: "DRAFT", 1: "SUBMITTED", 2: "VERIFIED", 3: "APPROVED", 4: "REJECTED" })[value] ?? value;
};

const toEvaluationRow = (item) => ({
  ...item,
  evaluationId: item.evaluationId ?? item.id,
  subjectId: item.subjectId ?? item.subject?.subjectId ?? item.evaluationId ?? item.id,
  subjectName: item.subjectName ?? item.subject?.subjectName ?? item.subject?.name ?? "—",
  subjectCode: item.subjectCode ?? item.subject?.subjectCode ?? item.subject?.code ?? "—",
  facultyName: item.facultyName ?? item.faculty?.facultyName ?? item.faculty?.name ?? "—",
  facultyCode: item.facultyCode ?? item.faculty?.facultyCode ?? item.faculty?.code ?? "—",
  obtainedMarks: item.obtainedMarks ?? item.averageMarks ?? item.average ?? 0,
  totalMarks: item.totalMarks ?? item.maximumMarks ?? item.maxMarks ?? 0,
  totalStudents: item.totalStudents ?? item.studentCount ?? 0,
  averageMarks: item.averageMarks ?? item.average ?? 0,
  highestMarks: item.highestMarks ?? item.highest ?? 0,
  lowestMarks: item.lowestMarks ?? item.lowest ?? 0,
  status: normalizeStatus(item.status ?? item.evaluationStatus),
});

const toStudentMarksRow = (item) => ({
  ...item,
  studentId: item.studentId ?? item.id,
  rollNo: item.rollNo ?? item.rollNumber ?? "—",
  studentName: item.studentName ?? item.name ?? item.fullName ?? "—",
  internal: item.internal ?? item.internalMarks ?? "—",
  practical: item.practical ?? item.practicalMarks ?? "—",
  theory: item.theory ?? item.theoryMarks ?? "—",
  totalMarks: item.totalMarks ?? item.obtainedMarks ?? "—",
  remarks: item.remarks ?? "—",
  isAbsent: Boolean(item.isAbsent ?? item.absent),
});

const toStudentAnalysisRow = (item) => ({
  ...item,
  studentId: item.studentId ?? item.id,
  rollNo: item.rollNo ?? item.rollNumber ?? "—",
  studentName: item.studentName ?? item.name ?? item.fullName ?? "—",
  subjectMarks: item.subjectMarks ?? {},
  subjects: Array.isArray(item.subjects) ? item.subjects : [],
  totalMarks: item.totalMarks ?? 0,
  maxTotal: item.maxTotal ?? item.maximumMarks ?? item.totalMaximumMarks ?? "—",
  grade: item.grade ?? "—",
});

/* ============================================================ 
   MAIN COMPONENT 
   ============================================================ */
export default function MarksEntryPage() {
  // Core 6 Filter States
  const [filters, setFilters] = useState({
    board: "",
    academicYear: "",
    academicLevel: "",
    group: "",
    section: "",
    examination: ""
  });

  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("evaluations"); // "evaluations" | "studentAnalysis"
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState("");
  const [studentAnalysisSearchTerm, setStudentAnalysisSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [examinations, setExaminations] = useState([]);

  // Data States 
  const [evaluations, setEvaluations] = useState([]);
  const [studentAnalysis, setStudentAnalysis] = useState([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const [modalRows, setModalRows] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentMarksPage, setStudentMarksPage] = useState(1);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editableRows, setEditableRows] = useState([]);

  const selectedEvaluation = useMemo(
    () => evaluations.find((item) => item.subjectId === selectedEvaluationId) ?? null,
    [evaluations, selectedEvaluationId]
  );

  const showToast = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = Date.now();
    setToastMessage({ id, msg: message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFilterData = async () => {
      try {
        setIsLoading(true);
        const [boardsResponse, yearsResponse, levelsResponse, groupsResponse, examsResponse] = await Promise.all([
          apiClient.get("/api/v1/boards"),
          apiClient.get("/api/v1/academic-years"),
          apiClient.get("/api/v1/boards/academic-levels"),
          apiClient.get("/api/v1/groups"),
          apiClient.get("/api/v1/examinations"),
        ]);
        if (cancelled) return;

        const activeBoards = getResponseItems(boardsResponse.data)
          .filter(board => board.status);

        const activeAcademicYears = getResponseItems(yearsResponse.data)
          .filter(year => year.isActive);

        setBoards(activeBoards);
        setAcademicYears(activeAcademicYears);
        setAcademicLevels(getResponseItems(levelsResponse.data));
        setGroups(getResponseItems(groupsResponse.data));
        setExaminations(getResponseItems(examsResponse.data));
      } catch (error) {
        if (!cancelled) showToast(getApiErrorMessage(error), "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadFilterData();
    return () => { cancelled = true; };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    if (!filters.group) {
      setSections([]);
      return undefined;
    }

    const loadSections = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/api/v1/Sections/group/${filters.group}`);
        if (!cancelled) setSections(getResponseItems(response.data));
      } catch (error) {
        if (!cancelled) {
          setSections([]);
          showToast(getApiErrorMessage(error), "error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSections();
    return () => { cancelled = true; };
  }, [filters.group, showToast]);

  const boardOptions = useMemo(
    () => boards.map((board) => ({ label: board.boardName, value: String(board.boardId) })),
    [boards]
  );
  const academicYearOptions = useMemo(
    () => academicYears.map((year) => ({ label: year.academicYearName, value: String(year.academicYearId) })),
    [academicYears]
  );
  const academicLevelOptions = useMemo(() => {
    return academicLevels.map((level) => ({
      label: level.levelName,
      value: String(level.academicLevelId),
    }));
  }, [academicLevels]);

  const groupOptions = useMemo(() => {
    return groups
      .filter(
        (group) =>(!filters.academicLevel ||
            String(group.academicLevelId) === filters.academicLevel)
      )
      .map((group) => ({
        label: group.groupName,
        value: String(group.groupId),
      }));
  }, [
    groups,
    filters.board,
    filters.academicYear,
    filters.academicLevel,
  ]);
  const examinationOptions = useMemo(() => {
    return examinations.map((exam) => ({
      label: exam.examName,
      value: String(exam.examinationId),
    }));
  }, [examinations]);

  const sectionOptions = useMemo(() => {
    return sections.map((section) => ({
      label: section.sectionName,
      value: String(section.sectionId),
    }));
  }, [sections]);

  const displayFilters = useMemo(() => {
    return {
      group:
        groups.find(
          (g) => String(g.groupId) === filters.group
        )?.groupName || "-",

      section:
        sections.find(
          (s) => String(s.sectionId) === filters.section
        )?.sectionName || "-",

      examination:
        examinations.find(
          (e) =>
            String(e.examinationId) === filters.examination
        )?.examName || "-",
    };
  }, [
    filters.group,
    filters.section,
    filters.examination,
    groups,
    sections,
    examinations,
  ]);

  const getCurrentStatus = useCallback(
    (_subjectId, fallbackStatus) => fallbackStatus ?? "SUBMITTED",
    []
  );

  const currentGroupSubjects = useMemo(() => {
    return evaluations.map((evaluation) => evaluation.subjectName);
  }, [evaluations]);

  // Fetch evaluation data for the selected academic context.
  const handleFetchData = async () => {
    try {
      setIsLoading(true);
      const payload = {
        boardId: Number(filters.board),
        academicYearId: Number(filters.academicYear),
        academicLevelId: Number(filters.academicLevel),
        groupId: Number(filters.group),
        sectionId: Number(filters.section),
        examinationId: Number(filters.examination),
      };
      const [evaluationsResponse, studentAnalysisResponse] = await Promise.all([
        apiClient.post("/api/v1/evaluations/search", payload),
        apiClient.get("/api/v1/student-analysis", { params: payload }),
      ]);
      const newEvaluations = getResponseItems(evaluationsResponse.data).map(toEvaluationRow);

      setEvaluations(newEvaluations);
      setStudentAnalysis(getResponseItems(studentAnalysisResponse.data).map(toStudentAnalysisRow));
      setEvaluationSearchTerm("");
      setStudentAnalysisSearchTerm("");
      setSelectedEvaluationId(null);
      setModalRows([]);
      setCurrentPage(1);
      setStudentMarksPage(1);
      setReady(true);
      setViewMode("list");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Cascading Filter Changes
  const handleFilterChange = (key, value) => {
    setReady(false);
    setSelectedEvaluationId(null);
    setViewMode("list");
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

  // Row Click: Open Subject Evaluation Details
  const handleRowClick = async (item) => {
    setSelectedEvaluationId(item.subjectId);
    setCurrentPage(1);
    setViewMode("details");
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/api/v1/evaluations/${item.evaluationId}/students`);
      const rows = getResponseItems(response.data).map(toStudentMarksRow);
      setModalRows(rows);
      setEditableRows(rows);
      setEditMode(false);
    } catch (error) {
      setModalRows([]);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEvaluations = () => {
    setSelectedEvaluationId(null);
    setModalRows([]);
    setCurrentPage(1);
    setViewMode("list");
    setEditMode(false);
    setEditableRows([]);
  };

  // Status changes always reload the current context so the backend stays authoritative.
  const handleUpdateStatus = async (targetStatusNum) => {
    if (!selectedEvaluation?.evaluationId) return;
    if (targetStatusNum === 4) {
      setRejectReason("");
      setShowRejectModal(true);
      return;
    }

    const action = targetStatusNum === "edit" ? "restore" : ({ 2: "verify", 3: "approve" })[targetStatusNum];
    if (!action) return;

    try {
      setIsLoading(true);
      await apiClient.patch(`/api/v1/evaluations/${selectedEvaluation.evaluationId}/${action}`);
      const actionMessage = { verify: "verified", approve: "approved", restore: "restored" }[action];
      showToast(`Subject ${actionMessage} successfully`, "success");
      await handleFetchData();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectEvaluation = async () => {
    if (!selectedEvaluation?.evaluationId || rejectReason.trim().length < 5) {
      showToast("Please enter a rejection reason of at least 5 characters.", "error");
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post(`/api/v1/evaluations/${selectedEvaluation.evaluationId}/reject`, {
        reason: rejectReason.trim(),
        notifyFaculty: true,
      });
      setShowRejectModal(false);
      setRejectReason("");
      showToast("Evaluation rejected successfully", "success");
      await handleFetchData();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Global Approval Action ("Approve All")
  // Approves the submitted evaluations in the selected academic context.
  const handleGlobalApproval = async () => {
    if (!isAllFiltersSelected || evaluations.length === 0) return;

    const eligibleEvaluations = evaluations.filter((item) => item.evaluationId && item.status === "VERIFIED");
    if (!eligibleEvaluations.length) return;

    try {
      setIsLoading(true);
      await apiClient.post(
        "/api/v1/evaluations/approve-all",
        {
          boardId: Number(filters.board),
          academicYearId: Number(filters.academicYear),
          academicLevelId: Number(filters.academicLevel),
          groupId: Number(filters.group),
          sectionId: Number(filters.section),
          examinationId: Number(filters.examination),
        }
      );
      showToast("All eligible subjects approved successfully", "success");
      await handleFetchData();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedEvaluation?.evaluationId) return;

    try {
      setIsLoading(true);
      await apiClient.put(`/api/v1/evaluations/${selectedEvaluation.evaluationId}/marks`, {
        students: editableRows,
      });
      showToast("Marks saved successfully", "success");
      setEditMode(false);
      await handleRowClick(selectedEvaluation);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!isAllFiltersSelected) return;
    try {
      setIsLoading(true);
      const response = await apiClient.get("/api/v1/evaluations/export", {
        params: {
          boardId: Number(filters.board), academicYearId: Number(filters.academicYear),
          academicLevelId: Number(filters.academicLevel), groupId: Number(filters.group),
          sectionId: Number(filters.section), examinationId: Number(filters.examination), format: "xlsx",
        },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "academic-evaluations.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      showToast("Excel export downloaded successfully", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      if (!evaluationSearchTerm.trim()) return true;
      const term = evaluationSearchTerm.toLowerCase();
      const statusStr = getCurrentStatus(item.subjectId, item.status);
      return (
        (item.subjectName || "").toLowerCase().includes(term) ||
        (item.facultyName || "").toLowerCase().includes(term) ||
        (item.subjectCode || "").toLowerCase().includes(term) ||
        (item.facultyCode || "").toLowerCase().includes(term) ||
        String(statusStr).toLowerCase().includes(term)
      );
    });
  }, [evaluations, evaluationSearchTerm, getCurrentStatus]);

  // Student Analysis data is provided by the selected academic context.
  const studentSubjectMarksList = useMemo(() => {
    return studentAnalysis;
  }, [studentAnalysis]);

  const filteredStudentMarks = useMemo(() => {
    if (!studentAnalysisSearchTerm.trim()) return studentSubjectMarksList;
    const term = studentAnalysisSearchTerm.toLowerCase().trim();
    return studentSubjectMarksList.filter((student) =>
      (student.rollNo || "").toLowerCase().includes(term) ||
      (student.studentName || "").toLowerCase().includes(term) ||
      String(student.totalMarks || "").includes(term) ||
      (student.grade || "").toLowerCase().includes(term)
    );
  }, [studentSubjectMarksList, studentAnalysisSearchTerm]);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(modalRows.length / STUDENTS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safeCurrentPage - 1) * STUDENTS_PER_PAGE;
  const paginatedRows = useMemo(
    () => modalRows.slice(pageStart, pageStart + STUDENTS_PER_PAGE),
    [modalRows, pageStart]
  );

  const studentMarksTotalPages = Math.max(
    1,
    Math.ceil(filteredStudentMarks.length / STUDENT_MARKS_PER_PAGE)
  );
  const safeStudentMarksPage = Math.min(Math.max(1, studentMarksPage), studentMarksTotalPages);
  const studentMarksPageStart = (safeStudentMarksPage - 1) * STUDENT_MARKS_PER_PAGE;
  const paginatedStudentMarks = useMemo(
    () =>
      filteredStudentMarks.slice(
        studentMarksPageStart,
        studentMarksPageStart + STUDENT_MARKS_PER_PAGE
      ),
    [filteredStudentMarks, studentMarksPageStart]
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setStudentMarksPage((page) => Math.min(Math.max(1, page), studentMarksTotalPages));
  }, [studentMarksTotalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [evaluationSearchTerm]);

  useEffect(() => {
    setStudentMarksPage(1);
  }, [studentAnalysisSearchTerm, activeTab]);

  return (
    <DashboardLayout
      title="Academic Evaluation"
      subtitle="Review, verify and approve faculty submitted evaluations."
      breadcrumb={["Examinations", "Marks Evaluation"]}
    >
      <div className="cms-marks-entry cms-anim-up">

        {isLoading && (
          <div className="cms-loading-overlay" role="status" aria-label="Loading">
            <div className="cms-loading-spinner" />
          </div>
        )}

        {toastMessage && (
          <div key={toastMessage.id} className={`cms-toast-banner cms-toast-${toastMessage.type}`}>
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* 6 Core Filters Grid */}
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
              options={boardOptions}
              onChange={(v) => handleFilterChange("board", v)}
            />
            <SelectFilter
              label="Academic Year"
              value={filters.academicYear}
              disabled={!filters.board}
              options={academicYearOptions}
              onChange={(v) => handleFilterChange("academicYear", v)}
            />
            <SelectFilter
              label="Academic Level"
              value={filters.academicLevel}
              disabled={!filters.board || !filters.academicYear}
              options={academicLevelOptions}
              onChange={(v) => handleFilterChange("academicLevel", v)}
            />
            <SelectFilter
              label="Group"
              value={filters.group}
              disabled={!filters.academicLevel}
              options={groupOptions}
              onChange={(v) => handleFilterChange("group", v)}
            />
            <SelectFilter
              label="Section"
              value={filters.section}
              disabled={!filters.group}
              options={sectionOptions}
              onChange={(v) => handleFilterChange("section", v)}
            />
            <SelectFilter
              label="Examination"
              value={filters.examination}
              disabled={!filters.section}
              options={examinationOptions}
              onChange={(v) => handleFilterChange("examination", v)}
            />
          </div>
        </div>

        {/* Content Section */}
        {ready ? (
          viewMode === "list" ? (
            <div className="cms-card cms-main-card">
              <div className="cms-table-toolbar">
                {/* 2 Main Tabs */}
                <div className="cms-tab-bar">
                  <button
                    className={`cms-tab-btn ${activeTab === "evaluations" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("evaluations")}
                  >
                    Evaluation
                  </button>
                  <button
                    className={`cms-tab-btn ${activeTab === "studentAnalysis" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("studentAnalysis")}
                  >
                    Student Analysis
                  </button>
                </div>

                {activeTab === "evaluations" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Global Approval Button */}
                    <button
                      className="cms-btn cms-btn-success"
                      onClick={handleGlobalApproval}
                    >
                      Approve All
                    </button>
                    {/* <button className="cms-btn cms-btn-export" onClick={handleExport}>
                      Export Excel
                    </button> */}

                    <div className="cms-search-wrap">
                      <span className="cms-search-icon"><IconSearch /></span>
                      <input
                        type="text"
                        className="cms-search-input"
                        placeholder="Search subject, faculty, status..."
                        value={evaluationSearchTerm}
                        onChange={(e) => setEvaluationSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "studentAnalysis" && (
                  <div className="cms-search-wrap">
                    <span className="cms-search-icon"><IconSearch /></span>
                    <input
                      type="text"
                      className="cms-search-input"
                      placeholder="Search roll no, student..."
                      value={studentAnalysisSearchTerm}
                      onChange={(e) => setStudentAnalysisSearchTerm(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Tab 1: Subject Evaluation */}
              {activeTab === "evaluations" && (
                <div className="cms-table-container">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th className="cms-text-left">SUBJECT NAME</th>
                        <th className="cms-text-left">FACULTY</th>
                        <th className="cms-text-center">TOTAL MARKS</th>
                        <th className="cms-text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvaluations.length > 0 ? (
                        filteredEvaluations.map((item) => {
                          const statusStr = getCurrentStatus(item.subjectId, item.status);
                          return (
                            <tr
                              key={item.subjectId}
                              className="cms-clickable-row"
                              onClick={() => handleRowClick(item)}
                            >
                              {/* Subject Column: Left Aligned Single Line */}
                              <td className="cms-font-semibold cms-text-left cms-single-line">
                                {item.subjectName} - {item.subjectCode}
                              </td>

                              {/* Faculty Column: Left Aligned Single Line */}
                              <td className="cms-text-muted cms-text-left cms-single-line">
                                {item.facultyName} - {item.facultyCode}
                              </td>

                              {/* Total Marks: Center Aligned */}
                              <td className="cms-font-semibold cms-text-center">
                                {item.obtainedMarks} / {item.totalMarks}
                              </td>

                              {/* Status Badge: Center Aligned */}
                              <td className="cms-text-center">
                                <StatusBadge status={statusStr} />
                              </td>

                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="cms-empty-td">
                            No evaluations found matching search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Student Analysis Table */}
              {activeTab === "studentAnalysis" && (
                <>
                  <div className="cms-table-container">
                    <table className="cms-table">
                      <thead>
                        <tr>
                          <th className="cms-text-left">ROLL NO</th>
                          <th className="cms-text-left">STUDENT NAME</th>
                          {currentGroupSubjects.map((subj, subjectIndex) => (
                            <th key={evaluations[subjectIndex]?.subjectId || `${subj}-${subjectIndex}`} className="cms-text-center">
                              {String(subj).toUpperCase()}
                            </th>
                          ))}
                          <th className="cms-text-center">TOTAL MARKS</th>
                          <th className="cms-text-center">GRADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudentMarks.length > 0 ? (
                          paginatedStudentMarks.map((stu, index) => {
                            const marksObj = stu.subjectMarks || {};
                            return (
                              <tr key={stu.studentId || index} className="cms-idle-row">
                                <td className="cms-font-semibold cms-text-left">
                                  {stu.rollNo || "—"}
                                </td>
                                <td className="cms-text-left">{stu.studentName}</td>

                                {currentGroupSubjects.map((subj, subjectIndex) => (
                                  <td key={evaluations[subjectIndex]?.subjectId || `${subj}-${subjectIndex}`} className="cms-text-center">
                                    {marksObj[evaluations[subjectIndex]?.subjectId] ?? "—"}
                                  </td>
                                ))}

                                {/* Student Analysis Total: Centered */}
                                <td className="cms-font-semibold cms-text-center">
                                  {stu.totalMarks} / {stu.maxTotal}
                                </td>

                                {/* Grade Badge: Centered */}
                                <td className="cms-text-center">
                                  <span className={`cms-badge-grade cms-grade-${String(stu.grade || "A").toLowerCase().replace("+", "-plus")}`}>
                                    {stu.grade || "A"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={currentGroupSubjects.length + 4} className="cms-empty-td">
                              No student analysis available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="cms-pagination" aria-label="Student analysis pagination">
                    <button
                      className="cms-page-btn"
                      disabled={safeStudentMarksPage === 1}
                      onClick={() => setStudentMarksPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      Page {safeStudentMarksPage} of {studentMarksTotalPages}
                    </span>
                    <button
                      className="cms-page-btn"
                      disabled={safeStudentMarksPage === studentMarksTotalPages}
                      onClick={() => setStudentMarksPage((page) => Math.min(studentMarksTotalPages, page + 1))}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : selectedEvaluation ? (
            /* Subject Detail View (Opened on Row Click) */
            <EvaluationDetailsView
              selectedEvaluation={selectedEvaluation}
              currentStatus={getCurrentStatus(selectedEvaluation.subjectId, selectedEvaluation.status)}
              filters={displayFilters}
              rows={editMode ? editableRows.slice(pageStart, pageStart + STUDENTS_PER_PAGE) : paginatedRows}
              totalPages={totalPages}
              currentPage={safeCurrentPage}
              onBack={handleBackToEvaluations}
              onUpdateStatus={handleUpdateStatus}
              editMode={editMode}
              onEdit={() => setEditMode(true)}
              onSave={handleSaveMarks}
              onEditRow={(studentId, field, value) => setEditableRows((previous) => previous.map((row) =>
                row.studentId === studentId ? { ...row, [field]: value } : row
              ))}
              onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          ) : null
        ) : (
          <div className="cms-card cms-empty-table">
            <p>Select all 6 evaluation filters and click <strong>Fetch Evaluation Data</strong> to view evaluation status &amp; student marks.</p>
          </div>
        )}

        {showRejectModal && (
          <div className="cms-overlay" role="presentation">
            <div className="cms-modal sm" role="dialog" aria-modal="true" aria-labelledby="reject-evaluation-title">
              <div className="cms-modal-head">
                <h3 id="reject-evaluation-title">Reject Evaluation</h3>
              </div>
              <div className="cms-modal-body">
                <div className="cms-field-group">
                  <label className="cms-field-label" htmlFor="reject-reason">Reason</label>
                  <textarea
                    id="reject-reason"
                    className="cms-marks-textarea"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Enter rejection reason"
                    rows={4}
                  />
                </div>
              </div>
              <div className="cms-modal-foot">
                <button className="cms-btn" onClick={() => { setShowRejectModal(false); setRejectReason(""); }}>
                  Cancel
                </button>
                <button className="cms-btn cms-btn-danger" disabled={rejectReason.trim().length < 5} onClick={handleRejectEvaluation}>
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
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
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================ 
   EVALUATION DETAILS VIEW (Same Container Size)
   ============================================================ */
function EvaluationDetailsView({
  selectedEvaluation,
  currentStatus,
  filters,
  rows,
  totalPages,
  currentPage,
  onBack,
  onUpdateStatus,
  editMode,
  onEdit,
  onSave,
  onEditRow,
  onPreviousPage,
  onNextPage
}) {
  const practical = isPracticalSubject(selectedEvaluation?.subjectName);

  return (
    <div className="cms-card cms-main-card cms-evaluation-details">
      <div className="cms-details-header">
        <div>
          <button className="cms-back-btn" onClick={onBack}>← Back to Evaluations</button>
          <h2 className="cms-details-title">
            {selectedEvaluation?.subjectName} ({selectedEvaluation?.subjectCode}) Evaluation Marks Breakdown
          </h2>
          <span className="cms-details-subtitle">Review student marks for this subject</span>
        </div>
      </div>

      <div className="cms-detail-grid">
        <div className="cms-detail-card">
          <span className="cms-detail-label">Faculty</span>
          <span className="cms-detail-value">{selectedEvaluation?.facultyName} - {selectedEvaluation?.facultyCode}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Group</span>
          <span className="cms-detail-value">{filters.group}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Section</span>
          <span className="cms-detail-value">{filters.section}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Examination</span>
          <span className="cms-detail-value">{filters.examination}</span>
        </div>
      </div>

      {/* Marks Table */}
      <div className="cms-table-container cms-details-table-wrap">
        <table className="cms-table cms-details-table">
          <thead>
            <tr>
              <th className="cms-text-left cms-sticky-roll">ROLL NO</th>
              <th className="cms-text-left cms-sticky-student">STUDENT NAME</th>
              <th className="cms-text-center">INTERNAL</th>
              {practical && <th className="cms-text-center">PRACTICAL</th>}
              <th className="cms-text-center">THEORY</th>
              <th className="cms-text-center">TOTAL MARKS</th>
              <th className="cms-text-left">REMARKS</th>
              <th className="cms-text-center">ABSENT</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, pageIndex) => {
                return (
                  <tr key={row.studentId || pageIndex}>
                    <td className="cms-font-semibold cms-text-left cms-sticky-roll">{row.rollNo}</td>
                    <td className="cms-text-left cms-sticky-student">{row.studentName}</td>
                    <td className="cms-text-center">
                      {editMode ? <input className="cms-marks-input" type="number" value={row.internal === "—" ? "" : (row.internal ?? "")} onChange={(event) => onEditRow(row.studentId, "internal", event.target.value)} /> : row.internal}
                    </td>
                    {practical && <td className="cms-text-center">
                      {editMode ? <input className="cms-marks-input" type="number" value={row.practical === "—" ? "" : (row.practical ?? "")} onChange={(event) => onEditRow(row.studentId, "practical", event.target.value)} /> : row.practical}
                    </td>}
                    <td className="cms-text-center">
                      {editMode ? <input className="cms-marks-input" type="number" value={row.theory === "—" ? "" : (row.theory ?? "")} onChange={(event) => onEditRow(row.studentId, "theory", event.target.value)} /> : row.theory}
                    </td>
                    <td className="cms-font-semibold cms-text-center">{row.totalMarks}</td>
                    <td className="cms-text-left">{row.remarks}</td>
                    <td className="cms-text-center">{row.isAbsent ? "Yes" : "No"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="cms-empty-td">No student mark details available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="cms-pagination" aria-label="Evaluation details pagination">
          <button
            className="cms-page-btn"
            disabled={currentPage === 1}
            onClick={onPreviousPage}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="cms-page-btn"
            disabled={currentPage === totalPages}
            onClick={onNextPage}
          >
            Next
          </button>
        </div>
      )}

      {/* Admin Action Buttons & Read-Only Status Pills */}
      <div className="cms-modal-actions">
        {currentStatus === "SUBMITTED" && (
          <>
            <button className="cms-btn cms-btn-info" onClick={() => onUpdateStatus(2)}><IconCheck /> Verify</button>
            <button className="cms-btn cms-btn-danger" onClick={() => onUpdateStatus(4)}><IconXCircle /> Reject</button>
            <button
              className="cms-btn"
              onClick={onEdit}
            >
              {editMode ? "Editing" : "Edit"}
            </button>
          </>
        )}
        {currentStatus === "VERIFIED" && (
          <>
            <button className="cms-btn cms-btn-success" onClick={() => onUpdateStatus(3)}><IconCheck /> Approve</button>
            <button className="cms-btn cms-btn-danger" onClick={() => onUpdateStatus(4)}><IconXCircle /> Reject</button>
            <button className="cms-btn" onClick={onEdit}>{editMode ? "Editing" : "Edit"}</button>
          </>
        )}
        {currentStatus === "APPROVED" && (
          <span className="cms-status-pill cms-status-approved"><IconCheck /> Approved</span>
        )}
        {currentStatus === "REJECTED" && (
          <>
            <span className="cms-status-pill cms-status-rejected"><IconXCircle /> Rejected</span>
            <button className="cms-btn" onClick={() => onUpdateStatus("edit")}>Restore</button>
          </>
        )}
        {editMode && <button className="cms-btn cms-btn-primary" onClick={onSave}>Save Changes</button>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "SUBMITTED").toUpperCase();
  const meta = STATUS_META[s] || STATUS_META.SUBMITTED;

  return (
    <span className={`cms-badge-status ${meta.badgeClass}`}>
      <span className="cms-badge-dot" />
      {meta.label}
    </span>
  );
}
