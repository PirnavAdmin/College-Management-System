import React, { useState, useMemo, useCallback, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "../layout/DashboardLayout";
import { env } from "@/config/env.js";
import "./MarksEntryPage.css";
// Results module reads only APPROVED evaluations.
// No publish workflow exists in enterprise flow.
/* ============================================================
   SVG ICON COMPONENTS (Clean inline rendering & zero dependency errors)
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
const API_BASE_URL = env.VITE_API_BASE_URL || (env.useDevProxy ? "" : env.apiBaseUrl);
const getStatusLabel = (status) => {
  switch (status) {
    case 0:
      return "Draft";
    case 1:
      return "Submitted";
    case 2:
      return "Verified";
    case 3:
      return "Approved";
    case 4:
      return "Rejected";
    default:
      return typeof status === "string" ? status : "Unknown";
  }
};
const normalizeEvaluationStatus = (status) => {
  const value = String(status ?? "").trim();
  if (/^[1-4]$/.test(value)) {
    return getStatusLabel(Number(value)).toUpperCase();
  }
  return value.toUpperCase() || "UNKNOWN";
};
const FALLBACK_SECTIONS = ["Section A", "Section B", "Section C"];
const FALLBACK_EXAMINATIONS = [
  "Semester I",
  "Midterm Examination 2025",
  "Quarterly Assessment 1",
  "Annual Pre-Board Exam"
];
const FALLBACK_BOARDS_OPTIONS = [
  { label: "State Board of Intermediate Education (TSBIE)", value: "BOARD_TSBIE", boardId: "BOARD_TSBIE", boardName: "State Board of Intermediate Education (TSBIE)" },
  { label: "Central Board of Secondary Education (CBSE)", value: "BOARD_CBSE", boardId: "BOARD_CBSE", boardName: "Central Board of Secondary Education (CBSE)" },
  { label: "Indian Certificate of Secondary Education (ICSE)", value: "BOARD_ICSE", boardId: "BOARD_ICSE", boardName: "Indian Certificate of Secondary Education (ICSE)" }
];
const FALLBACK_ACADEMIC_YEARS_OPTIONS = [
  { label: "2024 - 2025", value: "AY_2024_2025", academicYearId: "AY_2024_2025", academicYearName: "2024 - 2025" },
  { label: "2025 - 2026", value: "AY_2025_2026", academicYearId: "AY_2025_2026", academicYearName: "2025 - 2026" }
];
const FALLBACK_ACADEMIC_LEVELS_OPTIONS = [
  { label: "Senior Secondary (11th & 12th)", value: "LEVEL_SR_SEC", academicLevelId: "LEVEL_SR_SEC", levelName: "Senior Secondary (11th & 12th)" },
  { label: "Higher Secondary", value: "LEVEL_HR_SEC", academicLevelId: "LEVEL_HR_SEC", levelName: "Higher Secondary" }
];
const FALLBACK_GROUPS_OPTIONS = [
  { label: "MPC", value: "1", groupId: "1", groupName: "MPC" },
  { label: "BiPC", value: "2", groupId: "2", groupName: "BiPC" },
  { label: "CEC", value: "3", groupId: "3", groupName: "CEC" },
  { label: "MEC", value: "4", groupId: "4", groupName: "MEC" }
];
const FALLBACK_SECTIONS_OPTIONS = [
  { label: "Section A", value: "1", sectionId: "1", sectionName: "Section A" },
  { label: "Section B", value: "2", sectionId: "2", sectionName: "Section B" },
  { label: "Section C", value: "3", sectionId: "3", sectionName: "Section C" }
];
const FALLBACK_EXAMINATIONS_OPTIONS = FALLBACK_EXAMINATIONS.map((name, i) => ({
  label: name,
  value: `EXAM_${i + 1}`,
  examinationId: `EXAM_${i + 1}`,
  examinationName: name
}));
// Fallback Intermediate subject master by group and academic year.
const GROUP_SUBJECTS = {
  MPC: {
    firstYear: ["English", "Sanskrit", "Mathematics 1A", "Mathematics 1B", "Physics I", "Chemistry I"],
    secondYear: ["English", "Sanskrit", "Mathematics 2A", "Mathematics 2B", "Physics II", "Chemistry II"]
  },
  BiPC: {
    firstYear: ["English", "Sanskrit", "Botany I", "Zoology I", "Physics I", "Chemistry I"],
    secondYear: ["English", "Sanskrit", "Botany II", "Zoology II", "Physics II", "Chemistry II"]
  },
  CEC: {
    firstYear: ["English", "Sanskrit", "Civics I", "Economics I", "Commerce I"],
    secondYear: ["English", "Sanskrit", "Civics II", "Economics II", "Commerce II"]
  },
  MEC: {
    firstYear: ["English", "Sanskrit", "Mathematics 1A", "Mathematics 1B", "Economics I", "Commerce I"],
    secondYear: ["English", "Sanskrit", "Mathematics 2A", "Mathematics 2B", "Economics II", "Commerce II"]
  }
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
const SUBJECT_CODES = {
  English: "ENG101",
  Sanskrit: "SAN101",
  Mathematics: "MAT101",
  Physics: "PHY101",
  Chemistry: "CHE101",
  Botany: "BOT101",
  Zoology: "ZOO101",
  Civics: "CIV101",
  Economics: "ECO101",
  Commerce: "COM101"
};
const FACULTY_IDS = {
  Lakshmi: "FAC1001",
  Suresh: "FAC1002",
  "Ravi Kumar": "FAC1003",
  Naresh: "FAC1004",
  Kiran: "FAC1005",
  "Dr. S. Reddy": "FAC1006",
  "Dr. P. Varma": "FAC1007",
  "M. Narayana": "FAC1008",
  "K. Swamy": "FAC1009",
  "V. Rao": "FAC1010"
};
const STUDENTS_PER_PAGE = 10;
const STUDENT_MARKS_PER_PAGE = 10;
// Centralized Status Meta Definition
const STATUS_META = {
  SUBMITTED: { label: "SUBMITTED", badgeClass: "cms-status-submitted" },
  VERIFIED: { label: "VERIFIED", badgeClass: "cms-status-verified" },
  APPROVED: { label: "APPROVED", badgeClass: "cms-status-approved" },
  REJECTED: { label: "REJECTED", badgeClass: "cms-status-rejected" }
};
const TOAST_MESSAGES = {
  FETCH_SUCCESS: (group, section) =>
    `Evaluation data loaded successfully for ${group} - ${section}`,
  FETCH_ERROR: "Failed to load evaluation data.",
  VERIFIED: (subject) => `${subject} evaluation verified successfully.`,
  APPROVED: (subject) => `${subject} evaluation approved successfully.`,
  REJECTED: (subject) => `${subject} evaluation rejected.`,
  ALL_APPROVED: "All verified subjects approved successfully.",
  VERIFY_REQUIRED: "All submitted subjects must be verified before approval.",
  STATUS_UPDATED: (subject, status) =>
    `${subject} status changed to ${status}.`
};
const PRACTICAL_SUBJECT_NAMES = ["physics", "chemistry", "zoology", "botany"];
const isPracticalSubject = (subjectName) => {
  if (!subjectName) return false;
  const name = String(subjectName).toLowerCase().trim();
  return PRACTICAL_SUBJECT_NAMES.some((p) => name.includes(p));
};
const getFallbackSubjectBaseName = (subjectName) =>
  String(subjectName || "").replace(/\s(?:1A|1B|2A|2B|I|II)$/i, "");
const isSecondYearExamination = (examinationName) =>
  /(?:semester\s*(?:ii|2)|midterm\s*(?:ii|2)|quarterly\s*(?:ii|2)|annual|pre\s*-?\s*final|final)/i.test(
    String(examinationName || "")
  );
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
  Mathematics: "SUBMITTED",
  Physics: "SUBMITTED",
  Chemistry: "SUBMITTED",
  Botany: "SUBMITTED",
  Zoology: "SUBMITTED",
  Civics: "SUBMITTED",
  Economics: "SUBMITTED",
  Commerce: "SUBMITTED"
};
const calculateTotal = (row, isPractical) => {
  const internal = Number(row.internal || row.internalMarks) || 0;
  const theory = Number(row.theory || row.theoryMarks) || 0;
  const practical = isPractical ? Number(row.practical || row.practicalMarks) || 0 : 0;
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
   MAIN MARKS ENTRY COMPONENT (ADMIN EVALUATION MODULE)
   ============================================================ */
export default function MarksEntryPage() {
  const [filters, setFilters] = useState({
    board: "",
    academicYear: "",
    academicLevel: "",
    group: "",
    section: "",
    examination: "",
    subject: "",
    faculty: "",
    status: ""
  });
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("evaluations");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  // API 1 State
  const [evaluations, setEvaluations] = useState([]);
  const [subjectStatuses, setSubjectStatuses] = useState({});
  const [evaluationSummary, setEvaluationSummary] = useState({});
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  // API 2 State
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  // API 5 State
  const [studentMatrix, setStudentMatrix] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [subjectMarksData, setSubjectMarksData] = useState({});
  const [modalRows, setModalRows] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentMarksPage, setStudentMarksPage] = useState(1);
  // Dropdown options state
  const [academicYears, setAcademicYears] = useState([]);
  const [boards, setBoards] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [dropdownErrors, setDropdownErrors] = useState({});

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToastMessage({ id, msg: message, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token
      ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` }
      : {};
  }, []);
  const getCurrentStatus = useCallback(
    (subjectId, fallbackStatus) =>
      normalizeEvaluationStatus(subjectStatuses[subjectId] ?? fallbackStatus),
    [subjectStatuses]
  );
  /* ============================================================
     ENTERPRISE API 1: List Evaluations (/api/Evaluations/admin/list)
     ============================================================ */
  const fetchEvaluations = useCallback(async () => {
    setEvaluationLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Evaluations/admin/list`, {
        headers: getAuthHeaders(),
        params: {
          BoardId: filters.board,
          AcademicYearId: filters.academicYear,
          ProgramId: filters.academicLevel,
          GroupId: filters.group,
          SectionId: filters.section,
          ExaminationId: filters.examination,
          SubjectId: filters.subject,
          FacultyId: filters.faculty,
          Status: filters.status,
          PageNumber: 1,
          PageSize: 100
        }
      });
      const summaryData = response.data?.summary || response.data?.data?.summary || {};
      const listData =
        response.data?.data?.items ||
        response.data?.items ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        [];
      if (Array.isArray(listData) && listData.length > 0) {
        setEvaluations(listData);
        setSubjectStatuses(
          listData.reduce((statuses, item) => {
            const subjectId = item.subjectId || item.evaluationId;
            if (subjectId) statuses[subjectId] = normalizeEvaluationStatus(item.status);
            return statuses;
          }, {})
        );
        setEvaluationSummary(summaryData);
        setReady(true);
      } else {
        handleFallbackFetchData();
      }
    } catch (error) {
      // Fallback data loading for offline/mock resiliency
      handleFallbackFetchData();
      if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      }
    } finally {
      setEvaluationLoading(false);
    }
  }, [filters, getAuthHeaders, showToast]);
  /* ============================================================
     ENTERPRISE API 2: Detail Evaluation (/api/Evaluations/admin/detail)
     ============================================================ */
  const fetchEvaluationDetails = useCallback(async (row) => {
    setDetailLoading(true);
    try {
      const subjectId = row?.subjectId || row?.evaluationId;
      const sectionId = row?.sectionId || filters.section;
      const examinationId = row?.examinationId || filters.examination;
      const response = await axios.get(`${API_BASE_URL}/api/Evaluations/admin/detail`, {
        headers: getAuthHeaders(),
        params: {
          subjectId,
          sectionId,
          examinationId
        }
      });
      const detailObj = response.data?.data || response.data;
      const detailRows = detailObj?.marksList || detailObj?.students || (Array.isArray(detailObj) ? detailObj : []);
      if (!Array.isArray(detailRows) || detailRows.length === 0) {
        handleOpenEvaluationDetailsLocal(row);
      } else {
        setSelectedEvaluation(detailObj);
        setModalRows(detailRows);
        setDetailsModalOpen(true);
        setViewMode("details");
      }
    } catch (error) {
      // Fallback modal open
      handleOpenEvaluationDetailsLocal(row);
      if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      }
    } finally {
      setDetailLoading(false);
    }
  }, [filters, getAuthHeaders, showToast]);
  /* ============================================================
     ENTERPRISE API 3: Update Status (/api/Evaluations/admin/status)
     ============================================================ */
  async function updateEvaluationStatus(subjectId, sectionId, examinationId, targetStatus) {
    const localHandlers = {
      2: handleVerifySubjectLocal,
      3: handleApproveSubjectLocal,
      4: handleRejectSubjectLocal
    };
    const wasUpdated = localHandlers[targetStatus]?.(subjectId);
    if (!wasUpdated) return;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Evaluations/admin/status`,
        {},
        {
          headers: getAuthHeaders(),
          params: {
            subjectId,
            sectionId,
            examinationId,
            targetStatus
          }
        }
      );
      showToast(response.data?.message || "Status updated successfully", "success");
    } catch (error) {
      if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      }
    }
  }
  /* ============================================================
     ENTERPRISE API 4: Global Approval (/api/Evaluations/admin/global-approval)
     ============================================================ */
  async function handleGlobalApproval() {
    if (!handleApproveAllSubjectsLocal()) return;
    try {
      const currentUserId = localStorage.getItem("userId") || "ADMIN";
      const response = await axios.post(
        `${API_BASE_URL}/api/Evaluations/admin/global-approval`,
        {
          boardId: filters.board,
          academicYearId: filters.academicYear,
          academicLevelId: filters.academicLevel,
          groupId: filters.group,
          sectionId: filters.section,
          examinationId: filters.examination,
          approvedBy: currentUserId
        },
        { headers: getAuthHeaders() }
      );
      showToast(response.data?.message || "All evaluations approved successfully", "success");
    } catch (error) {
      if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      }
    }
  }
  /* ============================================================
     ENTERPRISE API 5: Student Matrix (/api/Evaluations/admin/student-matrix)
     ============================================================ */
  const fetchStudentMatrix = useCallback(async () => {
    if (!filters.section || !filters.examination) return;
    setStudentLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Evaluations/admin/student-matrix`, {
        headers: getAuthHeaders(),
        params: {
          sectionId: filters.section,
          examinationId: filters.examination
        }
      });
      const data = response.data?.data || response.data?.items || response.data;
      if (Array.isArray(data) && data.length > 0) {
        setStudentMatrix(data);
      } else {
        setStudentMatrix([]);
        ensureFallbackSubjectMarks();
      }
    } catch (error) {
      // An empty matrix uses the already loaded subjectMarksData fallback below.
      setStudentMatrix([]);
      ensureFallbackSubjectMarks();
      if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      }
    } finally {
      setStudentLoading(false);
    }
  }, [filters.section, filters.examination, getAuthHeaders, showToast]);
  useEffect(() => {
    if (activeTab === "studentAnalysis" && filters.section && filters.examination) {
      fetchStudentMatrix();
    }
  }, [activeTab, filters.section, filters.examination, fetchStudentMatrix]);
  const fetchAcademicYears = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/academic-years`,
        { headers: getAuthHeaders() }
      );
      const data = response.data?.data || response.data?.items || response.data;
      if (Array.isArray(data) && data.length > 0) {
        setAcademicYears(
          data.map((item) => {
            const id = item.academicYearId || item.id || item.value || item.academicYearName;
            const name = item.academicYearName || item.label || item.yearName || String(id);
            return {
              label: name,
              value: String(id),
              academicYearId: String(id),
              academicYearName: name
            };
          })
        );
        setDropdownErrors((prev) => ({ ...prev, academicYear: false }));
      } else {
        throw new Error("Invalid academic years data");
      }
    } catch {
      setAcademicYears(FALLBACK_ACADEMIC_YEARS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, academicYear: false }));
    }
  };
  const fetchBoards = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/boards`, { headers: getAuthHeaders() });
      const data = response.data?.items || response.data?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        setBoards(
          data.map((item) => {
            const id = item.boardId || item.id || item.value || item.boardName;
            const name = item.boardName || item.label || item.name || String(id);
            return {
              label: name,
              value: String(id),
              boardId: String(id),
              boardName: name
            };
          })
        );
        setDropdownErrors((prev) => ({ ...prev, board: false }));
      } else {
        throw new Error("Invalid boards data");
      }
    } catch {
      setBoards(FALLBACK_BOARDS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, board: false }));
    }
  };
  const fetchAcademicLevels = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/boards/academic-levels`,
        { headers: getAuthHeaders() }
      );
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.items;
      if (Array.isArray(data) && data.length > 0) {
        setAcademicLevels(
          data.map((item) => {
            const id = item.academicLevelId || item.id || item.value || item.levelName;
            const name = item.levelName || item.academicLevelName || item.label || String(id);
            return {
              label: name,
              value: String(id),
              academicLevelId: String(id),
              levelName: name
            };
          })
        );
        setDropdownErrors((prev) => ({ ...prev, academicLevel: false }));
      } else {
        throw new Error("Invalid academic levels data");
      }
    } catch {
      setAcademicLevels(FALLBACK_ACADEMIC_LEVELS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, academicLevel: false }));
    }
  };
  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/groups`, { headers: getAuthHeaders() });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.items;
      if (Array.isArray(data) && data.length > 0) {
        setGroups(
          data.map((item) => {
            const id = item.groupId || item.id || item.value || item.groupName;
            const name = item.groupName || item.label || item.name || String(id);
            return {
              label: name,
              value: String(id),
              groupId: String(id),
              groupName: name
            };
          })
        );
        setDropdownErrors((prev) => ({ ...prev, group: false }));
      } else {
        throw new Error("Invalid groups data");
      }
    } catch {
      setGroups(FALLBACK_GROUPS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, group: false }));
    }
  };
  const fetchSectionsForGroup = async (groupId) => {
    if (!groupId) {
      setSections([]);
      return;
    }
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/groups/${groupId}/sections`,
        { headers: getAuthHeaders() }
      );
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.items;
      if (Array.isArray(data) && data.length > 0) {
        setSections(
          data.map((item) => ({
            label: item.sectionName,
            value: String(item.sectionId),
            sectionId: String(item.sectionId),
            sectionName: item.sectionName,
            group: item.group
          }))
        );
        setDropdownErrors((prev) => ({ ...prev, section: false }));
      } else {
        throw new Error("Invalid sections data");
      }
    } catch {
      setSections(FALLBACK_SECTIONS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, section: false }));
    }
  };
  const fetchExaminations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/examinations`, { headers: getAuthHeaders() });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.items;
      if (Array.isArray(data) && data.length > 0) {
        setExaminations(
          data.map((item) => {
            const id = item.examinationId || item.id || item.value || item.examinationName;
            const name = item.examinationName || item.label || item.name || String(id);
            return {
              label: name,
              value: String(id),
              examinationId: String(id),
              examinationName: name
            };
          })
        );
        setDropdownErrors((prev) => ({ ...prev, examination: false }));
      } else {
        throw new Error("Invalid examinations data");
      }
    } catch {
      setExaminations(FALLBACK_EXAMINATIONS_OPTIONS);
      setDropdownErrors((prev) => ({ ...prev, examination: false }));
    }
  };
  useEffect(() => {
    fetchAcademicYears();
    fetchBoards();
    fetchAcademicLevels();
    fetchGroups();
    fetchExaminations();
  }, []);
  const handleFilterChange = (key, value) => {
    setReady(false);
    setSelectedEvaluation(null);
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
    if (key === "group") {
      fetchSectionsForGroup(value);
    }
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
  const selectedGroupObj = useMemo(() => {
    return groups.find(
      (g) => String(g.value) === String(filters.group) || String(g.groupId) === String(filters.group)
    );
  }, [groups, filters.group]);
  const groupName = useMemo(() => {
    return selectedGroupObj?.groupName || selectedGroupObj?.label || filters.group || "MPC";
  }, [selectedGroupObj, filters.group]);
  const selectedSectionObj = useMemo(() => {
    return sections.find(
      (s) => String(s.value) === String(filters.section) || String(s.sectionId) === String(filters.section)
    );
  }, [sections, filters.section]);
  const sectionName = useMemo(() => {
    return selectedSectionObj?.sectionName || selectedSectionObj?.label || filters.section || "Section A";
  }, [selectedSectionObj, filters.section]);
  const selectedExamObj = useMemo(() => {
    return examinations.find(
      (e) => String(e.value) === String(filters.examination) || String(e.examinationId) === String(filters.examination)
    );
  }, [examinations, filters.examination]);
  const examName = useMemo(() => {
    return selectedExamObj?.examinationName || selectedExamObj?.label || filters.examination || "Semester I";
  }, [selectedExamObj, filters.examination]);
  const currentGroupSubjects = useMemo(() => {
    const matchedKey = Object.keys(GROUP_SUBJECTS).find(
      (key) => key.toUpperCase() === String(groupName).toUpperCase()
    );
    const groupSubjects = GROUP_SUBJECTS[matchedKey] || GROUP_SUBJECTS[groupName] || GROUP_SUBJECTS.MPC;
    return isSecondYearExamination(examName)
      ? groupSubjects.secondYear
      : groupSubjects.firstYear;
  }, [groupName, examName]);
  const handleFetchData = () => {
    if (!isAllFiltersSelected) return;
    fetchEvaluations();
  };
  const createFallbackMarksForSubject = (subjectName) => {
    const sectionShort = (sectionName || "A").replace(/Section\s*/i, "").trim() || "A";
    const practicalSubject = isPracticalSubject(subjectName);
    return INITIAL_STUDENTS_BASE.map((student, index) => ({
      studentId: student.id,
      rollNo: `${groupName}${sectionShort}00${index + 1}`,
      studentName: student.studentName,
      internal: practicalSubject ? 16 + (index % 4) : 20 + (index % 6),
      theory: practicalSubject ? 38 + index * 2 : 58 + index * 2,
      practical: practicalSubject ? 20 + (index % 5) : 0,
      remarks: "Good Performance",
      isAbsent: false
    }));
  };
  const ensureFallbackSubjectMarks = () => {
    setSubjectMarksData((previousMarks) => {
      const nextMarks = { ...previousMarks };
      currentGroupSubjects.forEach((subjectName) => {
        if (!nextMarks[subjectName]?.length) {
          nextMarks[subjectName] = createFallbackMarksForSubject(subjectName);
        }
      });
      return nextMarks;
    });
  };
  const handleFallbackFetchData = () => {
    const subjects = currentGroupSubjects;
    const newEvaluations = subjects.map((subj, index) => {
      const baseSubjectName = getFallbackSubjectBaseName(subj);
      const facultyName = SUBJECT_FACULTY[baseSubjectName] || "Faculty Instructor";
      return {
        evaluationId: `EV-${1000 + index + 1}`,
        subjectId: `SUBJ-${100 + index + 1}`,
        subjectName: subj,
        subjectCode: SUBJECT_CODES[baseSubjectName] || `SUBJ${100 + index + 1}`,
        facultyName,
        facultyId: FACULTY_IDS[facultyName],
        studentsCount: INITIAL_STUDENTS_BASE.length * 10,
        totalStudents: INITIAL_STUDENTS_BASE.length * 10,
        averageMarks: 72.5 + index,
        highestMarks: 95,
        lowestMarks: 45,
        status: DEFAULT_SUBJECT_STATUSES[subj] || "SUBMITTED"
      };
    });
    const newSubjectMarksData = {};
    subjects.forEach((subj) => {
      newSubjectMarksData[subj] = createFallbackMarksForSubject(subj);
    });
    setEvaluations(newEvaluations);
    setSubjectStatuses(
      newEvaluations.reduce((statuses, item) => {
        statuses[item.subjectId || item.evaluationId] = normalizeEvaluationStatus(item.status);
        return statuses;
      }, {})
    );
    setEvaluationSummary({});
    setSubjectMarksData(newSubjectMarksData);
    setStudentMarksPage(1);
    setReady(true);
  };
  function handleVerifySubjectLocal(subjectId) {
    const subject = evaluations.find(
      (item) => item.subjectId === subjectId || item.evaluationId === subjectId
    );
    if (!subject || getCurrentStatus(subjectId, subject.status) !== "SUBMITTED") return false;
    setSubjectStatuses((prev) => ({ ...prev, [subjectId]: "VERIFIED" }));
    setEvaluations((prev) =>
      prev.map((item) =>
        (item.subjectId === subjectId || item.evaluationId === subjectId)
          ? { ...item, status: "VERIFIED" }
          : item
      )
    );
    setSelectedEvaluation((prev) =>
      prev && (prev.subjectId === subjectId || prev.evaluationId === subjectId)
        ? { ...prev, status: "VERIFIED" }
        : prev
    );
    setEvaluationSummary({});
    showToast("Evaluation verified successfully", "success");
    return true;
  }
  function handleRejectSubjectLocal(subjectId) {
    const subject = evaluations.find(
      (item) => item.subjectId === subjectId || item.evaluationId === subjectId
    );
    if (!subject || getCurrentStatus(subjectId, subject.status) !== "SUBMITTED") return false;
    setSubjectStatuses((prev) => ({ ...prev, [subjectId]: "REJECTED" }));
    setEvaluations((prev) =>
      prev.map((item) =>
        (item.subjectId === subjectId || item.evaluationId === subjectId)
          ? { ...item, status: "REJECTED" }
          : item
      )
    );
    setSelectedEvaluation((prev) =>
      prev && (prev.subjectId === subjectId || prev.evaluationId === subjectId)
        ? { ...prev, status: "REJECTED" }
        : prev
    );
    setEvaluationSummary({});
    showToast("Evaluation rejected successfully", "error");
    return true;
  }
  function handleApproveSubjectLocal(subjectId) {
    const subject = evaluations.find(
      (item) => item.subjectId === subjectId || item.evaluationId === subjectId
    );
    if (!subject || getCurrentStatus(subjectId, subject.status) !== "VERIFIED") return false;
    setSubjectStatuses((prev) => ({ ...prev, [subjectId]: "APPROVED" }));
    setEvaluations((prev) =>
      prev.map((item) =>
        (item.subjectId === subjectId || item.evaluationId === subjectId)
          ? { ...item, status: "APPROVED" }
          : item
      )
    );
    setSelectedEvaluation((prev) =>
      prev && (prev.subjectId === subjectId || prev.evaluationId === subjectId)
        ? { ...prev, status: "APPROVED" }
        : prev
    );
    setEvaluationSummary({});
    showToast("Subject approved successfully", "success");
    return true;
  }
  function handleApproveAllSubjectsLocal() {
    const activeSubjects = evaluations.filter(
      (item) => getCurrentStatus(item.subjectId || item.evaluationId, item.status) !== "REJECTED"
    );
    const hasSubmittedSubject = activeSubjects.some(
      (item) => getCurrentStatus(item.subjectId || item.evaluationId, item.status) === "SUBMITTED"
    );
    if (hasSubmittedSubject) {
      showToast("Verify all submitted subjects before approval", "error");
      return false;
    }
    setSubjectStatuses((prev) =>
      evaluations.reduce((statuses, item) => {
        const subjectId = item.subjectId || item.evaluationId;
        if (getCurrentStatus(subjectId, item.status) === "VERIFIED") {
          statuses[subjectId] = "APPROVED";
        }
        return statuses;
      }, { ...prev })
    );
    setEvaluations((prev) =>
      prev.map((item) =>
        normalizeEvaluationStatus(item.status) === "VERIFIED"
          ? { ...item, status: "APPROVED" }
          : item
      )
    );
    setSelectedEvaluation((prev) =>
      prev && normalizeEvaluationStatus(prev.status) === "VERIFIED"
        ? { ...prev, status: "APPROVED" }
        : prev
    );
    setEvaluationSummary({});
    showToast("All verified subjects approved successfully", "success");
    return true;
  }
  const summaryStats = useMemo(() => {
    const total = evaluations.length;
    const submitted = evaluations.filter((e) => getCurrentStatus(e.subjectId || e.evaluationId, e.status) === "SUBMITTED").length;
    const verified = evaluations.filter((e) => getCurrentStatus(e.subjectId || e.evaluationId, e.status) === "VERIFIED").length;
    const approved = evaluations.filter((e) => getCurrentStatus(e.subjectId || e.evaluationId, e.status) === "APPROVED").length;
    const rejected = evaluations.filter((e) => getCurrentStatus(e.subjectId || e.evaluationId, e.status) === "REJECTED").length;
    return { total, submitted, verified, approved, rejected };
  }, [evaluations, getCurrentStatus]);
  const handleOpenEvaluationDetailsLocal = (item) => {
    const subjName = item.subjectName;
    const rowsForSubject = subjectMarksData[subjName]?.length
      ? subjectMarksData[subjName]
      : createFallbackMarksForSubject(subjName);
    if (!subjectMarksData[subjName]?.length) {
      setSubjectMarksData((prev) => ({ ...prev, [subjName]: rowsForSubject }));
    }
    setSelectedEvaluation(item);
    setModalRows(JSON.parse(JSON.stringify(rowsForSubject)));
    setCurrentPage(1);
    setViewMode("details");
    setDetailsModalOpen(true);
  };
  const handleBackToEvaluations = () => {
    setSelectedEvaluation(null);
    setModalRows([]);
    setDetailsModalOpen(false);
    setCurrentPage(1);
    setViewMode("list");
  };
  const filteredEvaluations = useMemo(() => {
    if (!searchTerm.trim()) return evaluations;
    const term = searchTerm.toLowerCase();
    return evaluations.filter(
      (item) =>
        (item.subjectName || "").toLowerCase().includes(term) ||
        (item.facultyName || "").toLowerCase().includes(term) ||
        String(item.status || "").toLowerCase().includes(term)
    );
  }, [evaluations, searchTerm]);

  const dynamicSubjectColumns = useMemo(() => {
    if (!studentMatrix || studentMatrix.length === 0) return currentGroupSubjects;
    const firstItem = studentMatrix[0];
    if (firstItem?.subjectMarks && typeof firstItem.subjectMarks === "object") {
      return Object.keys(firstItem.subjectMarks);
    }
    return currentGroupSubjects;
  }, [studentMatrix, currentGroupSubjects]);
  const studentSubjectMarksList = useMemo(() => {
    if (studentMatrix && studentMatrix.length > 0) {
      return studentMatrix;
    }
    if (!ready || INITIAL_STUDENTS_BASE.length === 0) return [];
    const sectionShort = (sectionName || "A").replace(/Section\s*/i, "").trim() || "A";
    return INITIAL_STUDENTS_BASE.map((student, idx) => {
      const rollNo = `${groupName}${sectionShort}00${idx + 1}`;
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
        subjectMarks: marksPerSubject,
        marks: marksPerSubject,
        totalMarks: studentTotal,
        total: studentTotal,
        maxTotal: maxPossible,
        grade: overallGrade
      };
    });
  }, [ready, subjectMarksData, currentGroupSubjects, groupName, sectionName, studentMatrix]);
  const filteredStudentMarks = useMemo(() => {
    if (!searchTerm.trim()) return studentSubjectMarksList;
    const term = searchTerm.toLowerCase().trim();
    return studentSubjectMarksList.filter((student) =>
      (student.rollNo || "").toLowerCase().includes(term) ||
      (student.studentName || "").toLowerCase().includes(term) ||
      String(student.totalMarks || student.total || "").includes(term) ||
      (student.grade || "").toLowerCase().includes(term)
    );
  }, [studentSubjectMarksList, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(modalRows.length / STUDENTS_PER_PAGE));
  const pageStart = (currentPage - 1) * STUDENTS_PER_PAGE;
  const paginatedRows = useMemo(
    () => modalRows.slice(pageStart, pageStart + STUDENTS_PER_PAGE),
    [modalRows, pageStart]
  );
  const studentMarksTotalPages = Math.max(
    1,
    Math.ceil(filteredStudentMarks.length / STUDENT_MARKS_PER_PAGE)
  );
  const studentMarksPageStart =
    (studentMarksPage - 1) * STUDENT_MARKS_PER_PAGE;
  const paginatedStudentMarks = useMemo(
    () =>
      filteredStudentMarks.slice(
        studentMarksPageStart,
        studentMarksPageStart + STUDENT_MARKS_PER_PAGE
      ),
    [filteredStudentMarks, studentMarksPageStart]
  );
  React.useEffect(() => {
    setStudentMarksPage(1);
  }, [searchTerm]);
  return (
    <DashboardLayout
      title="Academic Evaluation"
      subtitle="Review, verify and approve faculty submitted evaluations."
      breadcrumb={["Examinations", "Marks Evalution"]}
    >
      <div className="cms-marks-entry cms-anim-up">
        {toastMessage && (
          <div key={toastMessage.id} className={`cms-toast-banner cms-toast-${toastMessage.type}`}>
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
              disabled={!isAllFiltersSelected || evaluationLoading}
              onClick={handleFetchData}
            >
              {evaluationLoading ? "Fetching..." : "Fetch Evaluation Data"}
            </button>
          </div>
          <div className="cms-filter-grid">
            <SelectFilter
              label="Board"
              value={filters.board}
              options={boards}
              error={dropdownErrors.board && "unable to load boards"}
              onChange={(v) => handleFilterChange("board", v)}
            />
            <SelectFilter
              label="Academic Year"
              value={filters.academicYear}
              disabled={!filters.board}
              options={academicYears}
              error={dropdownErrors.academicYear && "unable to load academic years"}
              onChange={(v) => handleFilterChange("academicYear", v)}
            />
            <SelectFilter
              label="Academic Level"
              value={filters.academicLevel}
              disabled={!filters.academicYear}
              options={academicLevels}
              error={dropdownErrors.academicLevel && "unable to load academic levels"}
              onChange={(v) => handleFilterChange("academicLevel", v)}
            />
            <SelectFilter
              label="Group"
              value={filters.group}
              disabled={!filters.academicLevel}
              options={groups}
              error={dropdownErrors.group && "unable to load groups"}
              onChange={(v) => handleFilterChange("group", v)}
            />
            <SelectFilter
              label="Section"
              value={filters.section}
              disabled={!filters.group}
              options={sections}
              error={dropdownErrors.section && "unable to load sections"}
              onChange={(v) => handleFilterChange("section", v)}
            />
            <SelectFilter
              label="Examination"
              value={filters.examination}
              disabled={!filters.section}
              options={examinations}
              error={dropdownErrors.examination && "unable to load examinations"}
              onChange={(v) => handleFilterChange("examination", v)}
            />
          </div>
        </div>
        {/* Content Section */}
        {ready ? (
          viewMode === "list" ? (
            <>
              {/* Summary Cards */}
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
                  {/* Preserved Tabs */}
                  <div className="cms-tab-bar">
                    <button
                      className={`cms-tab-btn ${activeTab === "evaluations" ? "cms-active" : ""}`}
                      onClick={() => setActiveTab("evaluations")}
                    >
                      Evaluations
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
                        Approve all subjects
                      </button>
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
                    </div>
                  )}
                  {activeTab !== "evaluations" && (
                    <div className="cms-search-wrap">
                      <span className="cms-search-icon"><IconSearch /></span>
                      <input
                        type="text"
                        className="cms-search-input"
                        placeholder="Search roll no, student, grade..."
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
                          <th>SUBJECT CODE</th>
                          <th>SUBJECT NAME</th>
                          <th>FACULTY</th>
                          <th>STUDENTS</th>
                          <th>AVERAGE</th>
                          <th>HIGHEST</th>
                          <th>LOWEST</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvaluations.length > 0 ? (
                          filteredEvaluations.map((item) => {
                            const statusStr = getCurrentStatus(
                              item.subjectId || item.evaluationId,
                              item.status
                            );
                            return (
                              <tr
                                key={item.evaluationId || item.subjectId}
                                className="cms-clickable-row"
                                onClick={() => fetchEvaluationDetails(item)}
                              >
                                <td className="cms-font-semibold">{item.subjectCode || "ENG101"}</td>
                                <td className="cms-font-semibold">{item.subjectName}</td>
                                <td className="cms-text-muted">{item.facultyId ? `${item.facultyId} - ` : ""}{item.facultyName}</td>
                                <td>{item.totalStudents || item.studentsCount || 60}</td>
                                <td>{item.averageMarks ?? 75}</td>
                                <td>{item.highestMarks ?? 95}</td>
                                <td>{item.lowestMarks ?? 45}</td>
                                <td>
                                  <StatusBadge status={statusStr} />
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="cms-empty-td">
                              No evaluations found matching search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Tab 2: Student Analysis Table Rendering */}
                {activeTab === "studentAnalysis" && (
                  <>
                    <div className="cms-table-container">
                      <table className="cms-table">
                        <thead>
                          <tr>
                            <th>ROLL NO</th>
                            <th>STUDENT NAME</th>
                            {dynamicSubjectColumns.map((subj) => (
                              <th key={subj}>{String(subj).toUpperCase()}</th>
                            ))}
                            <th>TOTAL MARKS</th>
                            <th>GRADE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentLoading ? (
                            <tr>
                              <td colSpan={dynamicSubjectColumns.length + 4} className="cms-empty-td">
                                Loading student analysis...
                              </td>
                            </tr>
                          ) : filteredStudentMarks.length > 0 ? (
                            paginatedStudentMarks.map((stu, index) => {
                              const marksObj = stu.subjectMarks || stu.marks || {};
                              return (
                                <tr key={stu.studentId || index} className="cms-idle-row">
                                  <td className="cms-font-semibold">{stu.rollNo}</td>
                                  <td>{stu.studentName}</td>
                                  {dynamicSubjectColumns.map((subj) => (
                                    <td key={subj}>{marksObj[subj] ?? "—"}</td>
                                  ))}
                                  <td className="cms-font-semibold">
                                    {stu.totalMarks ?? stu.total} / {stu.maxTotal ?? dynamicSubjectColumns.length * 100}
                                  </td>
                                  <td>
                                    <span className={`cms-badge-grade cms-grade-${String(stu.grade || "A").toLowerCase().replace("+", "-plus")}`}>
                                      {stu.grade || "A"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={dynamicSubjectColumns.length + 4} className="cms-empty-td">
                                No student analysis available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="cms-pagination"
                      aria-label="Student analysis pagination"
                    >
                      <button
                        className="cms-btn cms-btn-secondary"
                        disabled={studentMarksPage === 1}
                        onClick={() =>
                          setStudentMarksPage((page) => Math.max(1, page - 1))
                        }
                      >
                        Previous
                      </button>
                      <span>
                        Page {studentMarksPage} of {studentMarksTotalPages}
                      </span>
                      <button
                        className="cms-btn cms-btn-secondary"
                        disabled={studentMarksPage === studentMarksTotalPages}
                        onClick={() =>
                          setStudentMarksPage((page) =>
                            Math.min(studentMarksTotalPages, page + 1)
                          )
                        }
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : selectedEvaluation ? (
            <EvaluationDetailsModal
              selectedEvaluation={selectedEvaluation}
              currentStatus={getCurrentStatus(
                selectedEvaluation.subjectId || selectedEvaluation.evaluationId,
                selectedEvaluation.status
              )}
              detailLoading={detailLoading}
              filters={{
                ...filters,
                group: groupName,
                section: sectionName,
                examination: examName
              }}
              rows={paginatedRows}
              totalPages={totalPages}
              currentPage={currentPage}
              onBack={handleBackToEvaluations}
              onUpdateStatus={(targetStatus) =>
                updateEvaluationStatus(
                  selectedEvaluation.subjectId || selectedEvaluation.evaluationId,
                  filters.section,
                  filters.examination,
                  targetStatus
                )
              }
              onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          ) : null
        ) : (
          <div className="cms-card cms-empty-table">
            <p>Select all evaluation filters and click <strong>Fetch Evaluation Data</strong> to view evaluation status &amp; student marks.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
function SelectFilter({ label, value, options, disabled, error, onChange }) {
  const normalizedOptions = options.map((option) =>
    typeof option === "object" ? option : { label: option, value: option }
  );
  return (
    <div className="cms-field-group">
      <label className="cms-field-label">{label}</label>
      <select
        className="cms-select-input"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const selectedOption = options.find(
            (option) => String(option.value) === e.target.value
          );
          onChange(selectedOption ? selectedOption.value : e.target.value);
        }}
      >
        <option value="">Select {label}</option>
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="cms-field-error">{error}</p>}
    </div>
  );
}
/* ============================================================
   EVALUATION DETAILS MODAL RENDERING
   ============================================================ */
function EvaluationDetailsModal({
  selectedEvaluation,
  currentStatus,
  detailLoading,
  filters,
  rows,
  totalPages,
  currentPage,
  onBack,
  onUpdateStatus,
  onPreviousPage,
  onNextPage
}) {
  const practical = isPracticalSubject(selectedEvaluation?.subjectName);
  const statusStr = normalizeEvaluationStatus(currentStatus);
  return (
    <div className="cms-card cms-main-card cms-evaluation-details">
      <div className="cms-details-header">
        <div>
          <button className="cms-back-btn" onClick={onBack}>← Back to Evaluations</button>
          <h2 className="cms-details-title">
            {selectedEvaluation?.subjectCode || "ENG101"} - {selectedEvaluation?.subjectName || "Subject"} Evaluation
          </h2>
          <span className="cms-details-subtitle">Review and approve marks evaluation</span>
        </div>
      </div>
      <div className="cms-detail-grid">
        <div className="cms-detail-card">
          <span className="cms-detail-label">Faculty</span>
          <span className="cms-detail-value">
            {selectedEvaluation?.facultyId ? `${selectedEvaluation.facultyId} - ` : ""}
            {selectedEvaluation?.facultyName || "Faculty Instructor"}
          </span>
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
      <div className="cms-detail-grid" style={{ marginTop: "10px" }}>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Total Students</span>
          <span className="cms-detail-value">{selectedEvaluation?.totalStudents || selectedEvaluation?.studentsCount || 60}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Average Marks</span>
          <span className="cms-detail-value">{selectedEvaluation?.averageMarks ?? 75}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Highest Marks</span>
          <span className="cms-detail-value">{selectedEvaluation?.highestMarks ?? 95}</span>
        </div>
        <div className="cms-detail-card">
          <span className="cms-detail-label">Lowest Marks</span>
          <span className="cms-detail-value">{selectedEvaluation?.lowestMarks ?? 45}</span>
        </div>
      </div>
      {/* Marks Table */}
      <div className="cms-details-table-wrap">
        <div className="cms-table-scroll">
        <table className="cms-table cms-details-table">
          <thead>
            <tr>
              <th>ROLL NO</th>
              <th>STUDENT NAME</th>
              <th>INTERNAL</th>
              {practical && <th>PRACTICAL</th>}
              <th>THEORY</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {detailLoading ? (
              <tr>
                <td colSpan={practical ? 6 : 5} className="cms-empty-td">Loading evaluation details...</td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row, pageIndex) => {
                const totalMarks = row.totalMarks || calculateTotal(row, practical);
                return (
                  <tr key={row.studentId || pageIndex}>
                    <td className="cms-font-semibold">{row.rollNo}</td>
                    <td>{row.studentName}</td>
                    <td>{row.internal ?? row.internalMarks ?? 20}</td>
                    {practical && <td>{row.practical ?? row.practicalMarks ?? 18}</td>}
                    <td>{row.theory ?? row.theoryMarks ?? 65}</td>
                    <td className="cms-font-semibold">{totalMarks} / 100</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={practical ? 6 : 5} className="cms-empty-td">No student mark details available.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      <div
        className="cms-pagination"
        aria-label="Evaluation details pagination"
      >
        <button
          className="cms-btn cms-btn-secondary"
          disabled={currentPage === 1}
          onClick={onPreviousPage}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="cms-btn cms-btn-secondary"
          disabled={currentPage === totalPages}
          onClick={onNextPage}
        >
          Next
        </button>
      </div>
      <div className="cms-modal-actions">
        {statusStr === "SUBMITTED" && (
          <>
            <button className="cms-btn cms-btn-info" onClick={() => onUpdateStatus(2)}><IconCheck /> Verify</button>
            <button className="cms-btn cms-btn-danger" onClick={() => onUpdateStatus(4)}><IconXCircle /> Reject</button>
          </>
        )}
        {statusStr === "VERIFIED" && (
          <>
            <button className="cms-btn cms-btn-success" onClick={() => onUpdateStatus(3)}><IconCheck /> Approve</button>
            <span className="cms-status-pill cms-status-verified"><IconCheck /> Verified</span>
          </>
        )}
        {statusStr === "APPROVED" && (
          <span className="cms-status-pill cms-status-approved"><IconCheck /> Approved</span>
        )}
        {statusStr === "REJECTED" && (
          <span className="cms-status-pill cms-status-rejected"><IconXCircle /> Rejected</span>
        )}
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  const s = normalizeEvaluationStatus(status);
  const meta = STATUS_META[s] || STATUS_META.SUBMITTED;
  return (
    <span className={`cms-badge-status ${meta.badgeClass}`}>
      <span className="cms-badge-dot" />
      {meta.label}
    </span>
  );
}
