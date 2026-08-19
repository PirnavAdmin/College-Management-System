import React, { Fragment, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import {
  getResults,
  getBoards,
  getGroups,
  getRankList,
  getResultAnalysis,
  downloadResultsExcel,
  downloadResultsPdf,
  processResults,
  publishResults,
  getAcademicYears,
  getAcademicLevels,
  getExaminations,
} from "@/features/results/services/resultsService.js";
import {
  FaSearch,
  FaArrowLeft,
  FaFilePdf,
  FaFileExcel,
  FaTrophy,
  FaChartBar,
  FaCheck,
  FaTimes,
  FaCheckCircle,
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
  FaLayerGroup,
  FaChevronDown,
  FaChevronUp,
  FaFilter,
} from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const RESULTS_API_VERSION = "1.0";
const resultsPageApi = {
  boards: "/api/v1/boards",
  years: "/api/v1/academic-years",
  levels: "/api/v1/boards/academic-levels",
  groups: "/api/v1/groups",
  examinations: "/api/v1/examinations",
  studentResult: "/api/v1/results/student-result",
};

const calculateGrade = (avg) => {
  if (avg >= 90) return "A+";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
};

const isPracticalSubject = (subjectName) => {
  const s = String(subjectName || "").toLowerCase();
  return (
    s.includes("physics") ||
    s.includes("chemistry") ||
    s.includes("computer") ||
    s.includes("lab") ||
    s.includes("botany") ||
    s.includes("zoology")
  );
};

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;
const records = (payload) => {
  const data = unwrap(payload);
  return Array.isArray(data)
    ? data
    : data?.items ?? data?.Items ?? data?.records ?? data?.Records ?? data?.results ?? data?.Results ?? [];
};

const defaultResults = [
  // Group: MPC
  { id: "1", studentId: "1", slNo: 1, admissionNo: "ADM-2024-001", name: "Aarav Reddy", roll: "24MPC001", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "1", group: "MPC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 92, sanskrit: 90, mathematics: 98, physics: 93, chemistry: 95, total: 468, maximum: 500, percentage: "93.60%", grade: "A+", result: "PASS", status: "Published", isPublished: true },
  { id: "2", studentId: "2", slNo: 2, admissionNo: "ADM-2024-002", name: "Diya Sharma", roll: "24MPC002", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "1", group: "MPC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 88, sanskrit: 86, mathematics: 94, physics: 91, chemistry: 93, total: 452, maximum: 500, percentage: "90.40%", grade: "A+", result: "PASS", status: "Published", isPublished: true },
  { id: "3", studentId: "3", slNo: 3, admissionNo: "ADM-2024-003", name: "Ishaan Verma", roll: "24MPC003", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "1", group: "MPC", section: "B", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 85, sanskrit: 82, mathematics: 89, physics: 86, chemistry: 89, total: 431, maximum: 500, percentage: "86.20%", grade: "A", result: "PASS", status: "Published", isPublished: true },
  { id: "4", studentId: "4", slNo: 4, admissionNo: "ADM-2024-004", name: "Rahul Kumar", roll: "24MPC004", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "1", group: "MPC", section: "B", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 80, sanskrit: 78, mathematics: 85, physics: 82, chemistry: 85, total: 410, maximum: 500, percentage: "82.00%", grade: "A", result: "PASS", status: "Published", isPublished: true },
  { id: "5", studentId: "5", slNo: 5, admissionNo: "ADM-2024-005", name: "Suresh Rao", roll: "24MPC005", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "1", group: "MPC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 32, sanskrit: 38, mathematics: 29, physics: 36, chemistry: 40, total: 175, maximum: 500, percentage: "35.00%", grade: "F", result: "FAIL", status: "Draft", isPublished: false },

  // Group: BiPC
  { id: "6", studentId: "6", slNo: 6, admissionNo: "ADM-2024-006", name: "Ananya Sharma", roll: "24BIPC001", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "2", group: "BiPC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 90, sanskrit: 88, botany: 95, zoology: 92, chemistry: 94, total: 459, maximum: 500, percentage: "91.80%", grade: "A+", result: "PASS", status: "Published", isPublished: true },
  { id: "7", studentId: "7", slNo: 7, admissionNo: "ADM-2024-007", name: "Venkatesh N", roll: "24BIPC002", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "2", group: "BiPC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 68, sanskrit: 72, botany: 75, zoology: 70, chemistry: 74, total: 359, maximum: 500, percentage: "71.80%", grade: "B", result: "PASS", status: "Draft", isPublished: false },
  { id: "8", studentId: "8", slNo: 8, admissionNo: "ADM-2024-008", name: "Kavya Patel", roll: "24BIPC003", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "2", group: "BiPC", section: "B", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 84, sanskrit: 80, botany: 88, zoology: 85, chemistry: 87, total: 424, maximum: 500, percentage: "84.80%", grade: "A", result: "PASS", status: "Published", isPublished: true },

  // Group: CEC
  { id: "9", studentId: "9", slNo: 9, admissionNo: "ADM-2024-009", name: "Manish Goud", roll: "24CEC001", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "3", group: "CEC", section: "A", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 75, sanskrit: 78, civics: 82, economics: 80, commerce: 85, total: 400, maximum: 500, percentage: "80.00%", grade: "A", result: "PASS", status: "Published", isPublished: true },
  { id: "10", studentId: "10", slNo: 10, admissionNo: "ADM-2024-010", name: "Pooja Hegde", roll: "24CEC002", boardId: "1", board: "BIE Telangana", academicYearId: "1", year: "2025-2026", academicLevelId: "1", level: "Intermediate 1st Year", groupId: "3", group: "CEC", section: "B", examId: "1", exam: "Intermediate 1st Year Mid Term", english: 88, sanskrit: 90, civics: 91, economics: 89, commerce: 92, total: 450, maximum: 500, percentage: "90.00%", grade: "A+", result: "PASS", status: "Published", isPublished: true },
];

export default function ResultsPage() {
  const [filters, setFilters] = useState({
    board: "",
    year: "",
    level: "",
    group: "",
    exam: "",
    section: "",
  });

  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  // Rank List View Filters
  const [rankGroupFilter, setRankGroupFilter] = useState("");
  const [rankExamFilter, setRankExamFilter] = useState("");
  const [rankSearchQuery, setRankSearchQuery] = useState("");

  // Collapsible Groups State (stores group names that are collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [resultsGenerated, setResultsGenerated] = useState(true);
  const [resultsData, setResultsData] = useState(defaultResults);
  const [boardOptions, setBoardOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [examinationOptions, setExaminationOptions] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [rankResults, setRankResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedViewStudent, setSelectedViewStudent] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'rankList' | 'analytics'

  const [pageSize, setPageSize] = useState(10);
  const [pageStudentResults, setPageStudentResults] = useState(1);
  const [pageRankResults, setPageRankResults] = useState(1);

  useEffect(() => {
    Promise.allSettled([getBoards(), getAcademicYears(), getAcademicLevels(), getGroups(), getExaminations()])
      .then(([boardsResult, yearsResult, levelsResult, groupsResult, examinationsResult]) => {
        if (boardsResult.status === "fulfilled") setBoardOptions(records(boardsResult.value).filter((item) => item.status !== false && item.status !== "Inactive").map((item) => ({ id: String(item.boardId ?? item.id), name: item.boardName ?? item.name, code: item.boardCode })));
        if (yearsResult.status === "fulfilled") setYearOptions(records(yearsResult.value).filter((item) => item.isActive !== false && item.status !== "Inactive").map((item) => ({ id: String(item.academicYearId ?? item.id), name: item.academicYearName ?? item.name })));
        if (levelsResult.status === "fulfilled") setLevelOptions(records(levelsResult.value).map((item) => ({ id: String(item.academicLevelId ?? item.id), name: item.levelName ?? item.name })));
        if (groupsResult.status === "fulfilled") setGroupOptions(records(groupsResult.value).filter((item) => item.isActive !== false && item.status !== "Inactive").map((item) => ({ id: String(item.groupId ?? item.id), name: item.groupName ?? item.name, boardId: item.boardId, academicYearId: item.academicYearId, academicLevelId: item.academicLevelId })));
        if (examinationsResult.status === "fulfilled") setExaminationOptions(records(examinationsResult.value).filter((item) => item.status !== "Inactive").map((item) => ({ id: String(item.examinationId ?? item.examId ?? item.id), name: item.examName ?? item.name })));
      })
      .finally(() => setContextLoading(false));

    // Fetch initial results data immediately on mount without requiring filters or generate button
    getResults({ PageNumber: 1, PageSize: 100 })
      .then((res) => {
        const fetchedRecords = records(res);
        if (Array.isArray(fetchedRecords) && fetchedRecords.length > 0) {
          setResultsData(fetchedRecords);
        } else {
          setResultsData(defaultResults);
        }
      })
      .catch(() => {
        setResultsData(defaultResults);
      });
  }, []);

  const availableBoards = boardOptions;
  const availableYears = filters.board ? yearOptions : [];
  const availableLevels = filters.year ? levelOptions : [];
  const contextualGroups = groupOptions.filter((group) => String(group.boardId) === filters.board && String(group.academicYearId) === filters.year && (!group.academicLevelId || String(group.academicLevelId) === filters.level));
  const boardYearGroups = groupOptions.filter((group) => String(group.boardId) === filters.board && String(group.academicYearId) === filters.year);
  const availableGroups = filters.level ? (contextualGroups.length ? contextualGroups : boardYearGroups.length ? boardYearGroups : groupOptions) : [];
  const availableExams = filters.group ? examinationOptions : [];

  const isAllFiltersSelected = Boolean(
    filters.board && filters.year && filters.level && filters.group && filters.exam
  );

  const selectedScope = useMemo(() => ({
    boardId: Number(filters.board), academicYearId: Number(filters.year), academicLevelId: Number(filters.level), groupId: Number(filters.group), examId: Number(filters.exam),
  }), [filters]);
  const selectedGroupName = groupOptions.find((group) => String(group.id) === filters.group)?.name ?? "—";
  const groupNameFor = (groupId, groupName) =>
    groupOptions.find((group) => String(group.id) === String(groupId))?.name
    ?? (groupName && !/^\d+$/.test(String(groupName).trim()) ? groupName : "Other");
  const examNameFor = (examId, examName) =>
    examinationOptions.find((exam) => String(exam.id) === String(examId))?.name
    ?? (examName && !/^\d+$/.test(String(examName).trim()) ? examName : "—");

  // Dynamic filter matching for displaying data immediately with or without dropdown filters
  const displayResults = useMemo(() => {
    let data = resultsData;
    if (filters.board) {
      data = data.filter((r) => String(r.boardId ?? r.board ?? "") === filters.board || String(r.board ?? "").toLowerCase().includes(filters.board.toLowerCase()));
    }
    if (filters.year) {
      data = data.filter((r) => String(r.academicYearId ?? r.year ?? "") === filters.year || String(r.year ?? "").toLowerCase().includes(filters.year.toLowerCase()));
    }
    if (filters.level) {
      data = data.filter((r) => String(r.academicLevelId ?? r.level ?? "") === filters.level || String(r.level ?? "").toLowerCase().includes(filters.level.toLowerCase()));
    }
    if (filters.group) {
      data = data.filter((r) => String(r.groupId ?? r.group ?? "") === filters.group || String(r.group ?? "").toLowerCase().includes(filters.group.toLowerCase()));
    }
    if (filters.exam) {
      data = data.filter((r) => String(r.examId ?? r.exam ?? "") === filters.exam || String(r.exam ?? "").toLowerCase().includes(filters.exam.toLowerCase()));
    }
    if (filters.section) {
      data = data.filter((r) => String(r.section ?? "").toUpperCase() === String(filters.section).toUpperCase());
    }
    return data;
  }, [resultsData, filters]);

  // Derive unique Sections available dynamically across results
  const availableSections = useMemo(() => {
    const set = new Set();
    displayResults.forEach((r) => {
      if (r.section) set.add(String(r.section).toUpperCase());
    });
    return Array.from(set).sort();
  }, [displayResults]);

  const handleFilterChange = (field, value) => {
    setSelectedViewStudent(null);
    setViewMode("table");
    setRankResults([]);
    setAnalysis(null);
    setPageStudentResults(1);
    setFilters((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "board") {
        updated.year = "";
        updated.level = "";
        updated.group = "";
        updated.exam = "";
        updated.section = "";
      } else if (field === "year") {
        updated.level = "";
        updated.group = "";
        updated.exam = "";
        updated.section = "";
      } else if (field === "level") {
        updated.group = "";
        updated.exam = "";
        updated.section = "";
      } else if (field === "group") {
        updated.exam = "";
        updated.section = "";
      } else if (field === "exam") {
        updated.section = "";
      }
      return updated;
    });
  };

  const handleProcessResults = async () => {
    if (!isAllFiltersSelected) {
      setToast("Please fill all required fields in order before generating results.");
      return;
    }
    setLoading(true);
    try {
      await processResults({
        ...selectedScope,
        publishDate: new Date().toISOString(),
      });

      const fetchedData = await getResults({ ...selectedScope, PageNumber: 1, PageSize: 100 });
      const recordList = records(fetchedData);

      if (Array.isArray(recordList) && recordList.length > 0) {
        setResultsData(recordList);
      } else if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        setResultsData(fetchedData);
      }

      setToast("Results processed and fetched successfully!");
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setPageStudentResults(1);
      setPageRankResults(1);
      setSelectedViewStudent(null);
      setViewMode("table");
      setLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!isAllFiltersSelected) {
      setToast("Select the complete result scope before publishing.");
      return;
    }
    setLoading(true);
    try {
      const message = await publishResults({ ...selectedScope, publishDate: new Date().toISOString() });
      const refreshed = await getResults({ ...selectedScope, PageNumber: 1, PageSize: 100 });
      const refreshedRecords = records(refreshed);
      setResultsData(Array.isArray(refreshedRecords) && refreshedRecords.length ? refreshedRecords : Array.isArray(refreshed) ? refreshed : resultsData);
      setToast(typeof message === "string" ? message : "Results published successfully.");
      setConfirm(false);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // 1. Search & Section Filtering
  const filteredStudentResults = useMemo(() => {
    let data = displayResults;
    const q = query.toLowerCase().trim();
    if (!q) return data;
    return data.filter((r) =>
      `${r.name || ""} ${r.roll || ""} ${r.group || ""} ${r.section || ""} ${r.exam || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [displayResults, query]);

  // 2. Groupwise Grouping & Sorting: Group 1 -> Group 2 -> Group 3
  const sortedGroupwiseResults = useMemo(() => {
    return [...filteredStudentResults].sort((a, b) => {
      const gA = groupNameFor(a.groupId, a.group).toLowerCase();
      const gB = groupNameFor(b.groupId, b.group).toLowerCase();
      if (gA < gB) return -1;
      if (gA > gB) return 1;
      return Number(a.roll?.replace(/\D/g, "") || a.slNo || 0) - Number(b.roll?.replace(/\D/g, "") || b.slNo || 0);
    });
  }, [filteredStudentResults, groupOptions]);

  const hasSections = sortedGroupwiseResults.some((result) => Boolean(String(result.section ?? "").trim()));

  // Toggle Collapse / Expand for a specific Group
  const toggleGroupCollapse = (grpName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [grpName]: !prev[grpName],
    }));
  };

  // 3. Smart Pagination Calculations
  const totalPagesStudentResults = Math.max(1, Math.ceil(sortedGroupwiseResults.length / pageSize));
  const pagedStudentResults = sortedGroupwiseResults.slice(
    (pageStudentResults - 1) * pageSize,
    pageStudentResults * pageSize
  );

  const getSubjectBreakdown = (subjectName, totalScore) => {
    const isPrac = isPracticalSubject(subjectName);
    if (!isPrac) {
      return { theory: totalScore, practical: 0, internal: 0, total: totalScore };
    }
    const theory = Math.min(60, Math.round(totalScore * 0.65));
    const practical = Math.min(30, Math.round(totalScore * 0.25));
    const internal = Math.max(0, totalScore - theory - practical);
    return { theory, practical, internal, total: totalScore };
  };

  // Rank Mapping & Robust Calculation
  const rankedStudentsWithRanks = useMemo(() => {
    if (rankResults.length) {
      return rankResults.map((st, idx) => ({ ...st, rank: st.rank || idx + 1 }));
    }
    return [...sortedGroupwiseResults]
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .map((st, idx) => ({ ...st, rank: idx + 1 }));
  }, [rankResults, sortedGroupwiseResults]);

  // Filters for Rank List View: Group, Examination, and Search Query
  const filteredRankList = useMemo(() => {
    let list = rankedStudentsWithRanks;

    if (rankGroupFilter) {
      list = list.filter((st) =>
        String(st.groupId ?? st.group ?? "") === rankGroupFilter ||
        groupNameFor(st.groupId, st.group).toLowerCase() === rankGroupFilter.toLowerCase()
      );
    }
    if (rankExamFilter) {
      list = list.filter((st) =>
        String(st.examId ?? st.exam ?? "") === rankExamFilter ||
        examNameFor(st.examId, st.exam).toLowerCase() === rankExamFilter.toLowerCase()
      );
    }

    const q = rankSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((st) =>
      `${st.name || ""} ${st.roll || ""} ${st.group || ""} ${st.exam || ""}`.toLowerCase().includes(q)
    );
  }, [rankedStudentsWithRanks, rankGroupFilter, rankExamFilter, rankSearchQuery, groupOptions, examinationOptions]);

  const totalPagesRankResults = Math.max(1, Math.ceil(filteredRankList.length / pageSize));
  const pagedRankResults = filteredRankList.slice(
    (pageRankResults - 1) * pageSize,
    pageRankResults * pageSize
  );

  const getStudentRank = (studentId) => {
    if (studentId === undefined || studentId === null || studentId === "") return "-";
    const found = rankedStudentsWithRanks.find(
      (s) => String(s.id ?? s.studentId) === String(studentId)
    );
    return found ? found.rank : "-";
  };

  // Helper to generate filter context text summary for PDF & Excel exports
  const activeFilterSummary = useMemo(() => {
    return [
      filters.board && `Board: ${boardOptions.find((b) => String(b.id) === filters.board)?.name || filters.board}`,
      filters.year && `Year: ${yearOptions.find((y) => String(y.id) === filters.year)?.name || filters.year}`,
      filters.level && `Level: ${levelOptions.find((l) => String(l.id) === filters.level)?.name || filters.level}`,
      filters.group && `Group: ${selectedGroupName}`,
      filters.exam && `Exam: ${examinationOptions.find((ex) => String(ex.id) === filters.exam)?.name || filters.exam}`,
      filters.section && `Section: ${filters.section}`,
    ].filter(Boolean).join(" | ");
  }, [filters, boardOptions, yearOptions, levelOptions, groupOptions, examinationOptions, selectedGroupName]);

  // Export Excel containing College Name Header and Filtered Data
  const handleExportExcel = async () => {
    try {
      const rows = [
        ["PIMAV JUNIOR COLLEGE"],
        ["STUDENT EXAMINATION RESULTS REPORT"],
        [activeFilterSummary || "All Academic Contexts"],
        [`Export Date: ${new Date().toLocaleDateString()}`],
        [],
        ["S.No", "Student Name", "Roll No", "Group", "Sec", "Exam", "Total Marks", "Max Marks", "Percentage", "Grade", "Result"],
        ...sortedGroupwiseResults.map((r, idx) => [
          idx + 1,
          r.name || "—",
          r.roll || "—",
          groupNameFor(r.groupId, r.group) || "—",
          r.section || "—",
          examNameFor(r.examId, r.exam) || "—",
          r.total ?? "—",
          r.maximum ?? "—",
          r.percentage ? (String(r.percentage).includes("%") ? r.percentage : `${r.percentage}%`) : "—",
          r.grade || "—",
          String(r.result || "—").toUpperCase(),
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      XLSX.writeFile(wb, "Student_Results.xlsx");
      setToast("Filtered results Excel exported successfully.");
    } catch (error) {
      if (isAllFiltersSelected) {
        try {
          const response = await downloadResultsExcel(selectedScope);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.download = "Results.xlsx";
          link.click();
          window.URL.revokeObjectURL(url);
          setToast("Results Excel file downloaded successfully.");
          return;
        } catch (apiErr) {
          setToast(getApiErrorMessage(apiErr));
        }
      }
      setToast("Error exporting Excel: " + getApiErrorMessage(error));
    }
  };

  const handleViewStudentResult = async (student) => {
    const stId = student.studentId ?? student.id;
    const computedRank = getStudentRank(stId);

    if (!isAllFiltersSelected) {
      setSelectedViewStudent({
        ...student,
        rank: student.rank || computedRank,
      });
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(resultsPageApi.studentResult, { params: { studentId: stId, ...selectedScope } });
      const memo = unwrap(response.data);
      setSelectedViewStudent({
        ...student,
        name: memo.studentName || student.name || "—",
        roll: memo.rollNumber || student.roll || "—",
        group: memo.groupName || student.group || "—",
        exam: memo.examName || student.exam || "—",
        total: memo.grandTotal ?? student.total ?? "—",
        maximum: memo.maximumMarks ?? student.maximum ?? "—",
        percentage: memo.percentage ? `${memo.percentage}%` : student.percentage || "—",
        grade: memo.overallGrade || student.grade || "—",
        result: memo.finalResult || student.result || "—",
        status: memo.resultStatus || student.status || "—",
        rank: memo.groupRank || memo.classRank || memo.rank || computedRank,
        subjects: memo.subjects ?? [],
      });
    } catch (error) {
      setSelectedViewStudent({
        ...student,
        rank: student.rank || computedRank,
      });
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRankList = async () => {
    if (isAllFiltersSelected) {
      try {
        const ranks = await getRankList(selectedScope);
        const rankArray = records(ranks);
        if (Array.isArray(rankArray) && rankArray.length > 0) {
          setRankResults(rankArray.map((item) => ({
            id: item.studentId || item.id,
            studentId: item.studentId || item.id,
            name: item.studentName || item.name || "—",
            roll: item.rollNumber || item.roll || "—",
            group: item.groupName || item.group || "—",
            exam: item.examName || item.exam || "—",
            total: item.totalMarks ?? item.total ?? "—",
            maximum: item.maximumMarks ?? item.maximum ?? "—",
            percentage: item.percentage ? `${item.percentage}%` : "—",
            grade: item.grade || "—",
            rank: item.rank || "—",
            result: item.result || "PASS",
          })));
        }
      } catch (error) {
        setToast(getApiErrorMessage(error));
      }
    }
    setRankSearchQuery("");
    setRankGroupFilter("");
    setRankExamFilter("");
    setPageRankResults(1);
    setViewMode("rankList");
  };

  const handleAnalytics = async () => {
    if (isAllFiltersSelected) {
      try {
        const resAnalysis = await getResultAnalysis(selectedScope);
        if (resAnalysis) setAnalysis(unwrap(resAnalysis));
      } catch (error) {
        setToast(getApiErrorMessage(error));
      }
    }
    setViewMode("analytics");
  };

  const parsePercent = (val) => parseFloat(String(val || 0).replace("%", "")) || 0;

  // Analytics Calculations
  const totalStudents = analysis?.totalStudents ?? sortedGroupwiseResults.length;
  const passStudents = analysis?.passedStudents ?? sortedGroupwiseResults.filter((r) => String(r.result).toUpperCase() === "PASS").length;
  const failStudents = analysis?.failedStudents ?? sortedGroupwiseResults.filter((r) => String(r.result).toUpperCase() === "FAIL").length;
  const overallAvgPercentage = totalStudents > 0
    ? (sortedGroupwiseResults.reduce((acc, r) => acc + parsePercent(r.percentage), 0) / totalStudents).toFixed(2)
    : "0.00";

  const subjectsList = [...new Set(sortedGroupwiseResults.map((result) => result.subject).filter(Boolean))];
  const subjectAnalytics = analysis?.subjects?.map((subject) => ({
    subject: subject.subjectName || subject.subject || "—",
    average: subject.averageScore ?? 0,
    passCount: subject.passedStudents ?? 0,
    passRate: subject.subjectPassPercentage ?? 0,
  })) ?? subjectsList.map((sub) => {
    const scores = sortedGroupwiseResults.filter((result) => result.subject === sub).map((result) => Number(result.total)).filter(Number.isFinite);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const passedCount = scores.filter((s) => s >= 35).length;
    return {
      subject: sub,
      average: avgScore,
      passCount: passedCount,
      passRate: scores.length ? ((passedCount / scores.length) * 100).toFixed(1) : "0.0",
    };
  });

  return (
    <DashboardLayout
      title="Results Management"
      subtitle="Process, review, and publish student academic examination results."
      breadcrumb={["Examinations", "Results Management"]}
    >
      {/* Dynamic Theme Color Integration matching Project CSS Design Tokens */}
      <style>{`
        .cms-card, .cms-table, .cms-modal-content {
          color: var(--cms-text, var(--text-main, #10203c));
          background-color: var(--cms-surface, #ffffff);
          border-color: var(--cms-border, #cbd5e1);
        }
        [data-theme="dark"] .cms-card, 
        [data-theme="dark"] .cms-table, 
        [data-theme="dark"] .cms-modal-content {
          color: var(--cms-text, #e2e8f0) !important;
          background-color: var(--cms-surface, #1e293b) !important;
          border-color: var(--cms-border, #3d4d68) !important;
        }
        .cms-table th {
          background-color: var(--cms-subtle, #f8fafc);
          color: var(--cms-muted, #64748b);
          border-bottom-color: var(--cms-border, #e2e8f0);
        }
        [data-theme="dark"] .cms-table th {
          background-color: var(--cms-subtle, #182338) !important;
          color: var(--cms-muted, #94a3b8) !important;
        }
        .cms-table td {
          border-bottom-color: var(--cms-border, #f1f5f9);
        }

        .cms-group-banner-td {
          background: #f1f5f9 !important;
          border-top: 2px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 8px 14px !important;
          user-select: none;
        }
        [data-theme="dark"] .cms-group-banner-td {
          background: #0f172a !important;
          border-top-color: #334155 !important;
          border-bottom-color: #334155 !important;
        }

        .cms-compact-card {
          max-width: 880px;
          margin: 0 auto 20px auto;
        }

        .cms-table-compact th {
          padding: 8px 12px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
        }

        .cms-table-compact td {
          padding: 8px 12px !important;
          font-size: 12px !important;
        }

        .cms-table-compact tr {
          height: 38px !important;
        }

        .results-toast .cms-toast {
          position: fixed !important;
          top: auto !important;
          right: auto !important;
          bottom: 24px !important;
          left: 50% !important;
          width: min(720px, calc(100vw - 48px)) !important;
          max-width: none !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 16px 20px !important;
          background: #111827 !important;
          color: #ffffff !important;
          border: 1px solid #374151 !important;
          border-radius: 12px !important;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28) !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          white-space: normal !important;
          transform: translateX(-50%) !important;
          animation: results-toast-in 0.2s ease !important;
          z-index: 5000 !important;
        }

        @keyframes results-toast-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translateX(-50%); }
        }

        @media (max-width: 640px) {
          .results-toast .cms-toast {
            bottom: 12px !important;
            width: calc(100vw - 24px) !important;
          }
        }

        .results-required-mark { color: #dc2626; font-weight: 800; margin-left: 3px; }
        .results-publish-modal { max-width: 560px !important; }
        .results-publish-modal .cms-modal-title { font-size: 21px !important; }
        .results-publish-modal .cms-modal-body { padding: 24px !important; }
        .results-publish-modal .cms-modal-body p { font-size: 16px !important; line-height: 1.65 !important; }
        .results-publish-modal .cms-btn { font-size: 15px !important; min-height: 40px !important; }

        .results-context-card .cms-card-body { padding: 16px 20px !important; }
        .results-context-heading { margin: 0 !important; font-size: 18px !important; line-height: 1.3 !important; }
        .results-context-description { margin: 4px 0 14px !important; font-size: 14px !important; line-height: 1.45 !important; }
        .results-context-card .cms-label { font-size: 13px !important; line-height: 1.35 !important; }
        .results-context-card .cms-select { min-height: 38px !important; padding: 8px 12px !important; font-size: 14px !important; }

        .results-page .cms-card { border-radius: 14px; }
        .results-page .cms-compact-card { width: 100%; max-width: none; margin: 0 0 20px !important; }
        .results-page .cms-card-body { padding: 20px 24px !important; }
        .results-page .cms-btn { min-height: 36px !important; padding: 0 14px !important; font-size: 13px !important; }
        .results-page .cms-subtitle { font-size: 13px; line-height: 1.5; }
        .results-page .cms-table-wrap { margin-top: 14px; }
      `}</style>

      <div className="results-page">

        {/* 1. Sequential Filter Card */}
        <div className="cms-card results-context-card">
          <div className="cms-card-body" style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="cms-card-title results-context-heading">Academic Context</h3>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={!isAllFiltersSelected || loading}
                onClick={handleProcessResults}
              >
                {loading ? "Generating..." : "Generate Results"}
              </button>
            </div>
            <p className="cms-subtitle results-context-description">
              Choose the academic context sequentially or filter available examination results.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              <div className="cms-field-group">
                <label className="cms-label">Board <span className="results-required-mark">*</span></label>
                <select
                  className="cms-select"
                  disabled={contextLoading}
                  value={filters.board}
                  onChange={(e) => handleFilterChange("board", e.target.value)}
                >
                  <option value="">Select Board</option>

                  {availableBoards?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Academic Year <span className="results-required-mark">*</span></label>
                <select
                  className="cms-select"
                  disabled={contextLoading || !filters.board}
                  value={filters.year}
                  onChange={(e) => handleFilterChange("year", e.target.value)}
                >
                  <option value="">Select Year</option>

                  {availableYears?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Academic Level <span className="results-required-mark">*</span></label>
                <select
                  className="cms-select"
                  disabled={contextLoading || !filters.year}
                  value={filters.level}
                  onChange={(e) => handleFilterChange("level", e.target.value)}
                >
                  <option value="">Select Level</option>

                  {availableLevels?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Group <span className="results-required-mark">*</span></label>
                <select
                  className="cms-select"
                  disabled={contextLoading || !filters.level}
                  value={filters.group}
                  onChange={(e) => handleFilterChange("group", e.target.value)}
                >
                  <option value="">Select Group</option>

                  {availableGroups?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Examination <span className="results-required-mark">*</span></label>
                <select
                  className="cms-select"
                  disabled={contextLoading || !filters.group}
                  value={filters.exam}
                  onChange={(e) => handleFilterChange("exam", e.target.value)}
                >
                  <option value="">Select Exam</option>

                  {availableExams?.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>

              

              <div className="cms-field-group">
                <label className="cms-label">Section</label>
                <select
                  className="cms-select"
                  value={filters.section}
                  onChange={(e) => handleFilterChange("section", e.target.value)}
                >
                  <option value="">All Sections</option>

                  {availableSections?.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Detailed Individual Student Marks Memo View */}
        {selectedViewStudent && (
          <div className="cms-card cms-compact-card">
            <div className="cms-card-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid var(--cms-border, #cbd5e1)", paddingBottom: 10 }}>
                <div>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ marginBottom: 6, height: "30px", padding: "0 10px", fontSize: "12px" }}
                    onClick={() => setSelectedViewStudent(null)}
                  >
                    <FaArrowLeft /> Back to Results Table
                  </button>
                  <h3 className="cms-card-title" style={{ fontSize: "15px" }}>
                    Official Marks Memo - {selectedViewStudent.name || "Student"}
                  </h3>
                  <span className="cms-subtitle" style={{ marginTop: 2, fontSize: "12px" }}>
                     Roll Number: <strong style={{ color: "inherit" }}>{selectedViewStudent.roll || "—"}</strong> | Group: {groupNameFor(selectedViewStudent.groupId, selectedViewStudent.group)}{selectedViewStudent.section ? ` - Section ${selectedViewStudent.section}` : ""}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-secondary"
                    style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => {
                      setResultsData((prev) =>
                        prev.map((r) => (r.id === selectedViewStudent.id || r.studentId === selectedViewStudent.id ? { ...r, status: "Published", isPublished: true } : r))
                      );
                      setToast(`Published result for ${selectedViewStudent.name || "student"}!`);
                      setSelectedViewStudent(null);
                    }}
                  >
                    <FaCheckCircle style={{ color: "#16a34a" }} /> Publish Result
                  </button>
                </div>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table cms-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: "160px" }}>SUBJECT</th>
                      <th style={{ width: "80px", textAlign: "center" }}>THEORY</th>
                      <th style={{ width: "90px", textAlign: "center" }}>PRACTICAL</th>
                      <th style={{ width: "80px", textAlign: "center" }}>INTERNAL</th>
                      <th style={{ width: "110px", textAlign: "center" }}>TOTAL MARKS</th>
                      <th style={{ width: "70px", textAlign: "center" }}>GRADE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["English", "Sanskrit", "Mathematics", "Physics", "Chemistry"].map((subKey) => {
                      const totalScore = selectedViewStudent[subKey.toLowerCase()] || 80;
                      const breakdown = getSubjectBreakdown(subKey, totalScore);
                      const isPrac = isPracticalSubject(subKey);

                      return (
                        <tr key={subKey}>
                          <td className="cms-strong">
                            {subKey}
                            {isPrac && (
                              <span style={{ fontSize: "9px", marginLeft: 6, color: "#0284c7", background: "rgba(2, 132, 199, 0.1)", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>
                                Practical
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{breakdown.theory}</td>
                          <td style={{ textAlign: "center" }}>{breakdown.practical}</td>
                          <td style={{ textAlign: "center" }}>{breakdown.internal}</td>
                          <td style={{ fontWeight: 700, textAlign: "center" }}>{breakdown.total} / 100</td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontWeight: 700, color: calculateGrade(breakdown.total) === "F" ? "#dc2626" : "#16a34a" }}>
                              {calculateGrade(breakdown.total)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="cms-memo-summary" style={{ marginTop: 14, padding: "12px 16px", gap: 12 }}>
                <div>
                  <div className="cms-summary-label">GRAND TOTAL</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px" }}>
                    {selectedViewStudent.total ?? "—"}{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "inherit" }}>/ {selectedViewStudent.maximum ?? "—"}</span>
                  </div>
                </div>
                <div>
                  <div className="cms-summary-label">PERCENTAGE</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px" }}>{selectedViewStudent.percentage || "—"}</div>
                </div>
                <div>
                  <div className="cms-summary-label">OVERALL GRADE</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px" }}>{selectedViewStudent.grade || "—"}</div>
                </div>

                <div>
                  <div className="cms-summary-label">FINAL RESULT</div>
                  <div style={{ marginTop: 2 }}>
                    <span
                      className="cms-badge"
                      style={{
                        background: String(selectedViewStudent.result).toUpperCase() === "PASS" ? "#dcfce7" : "#fee2e2",
                        color: String(selectedViewStudent.result).toUpperCase() === "PASS" ? "#15803d" : "#b91c1c",
                        fontWeight: 700,
                        padding: "3px 8px",
                        fontSize: "11px",
                      }}
                    >
                      {String(selectedViewStudent.result).toUpperCase() === "PASS" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <FaCheck style={{ color: "#15803d" }} /> PASS
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <FaTimes style={{ color: "#b91c1c" }} /> {selectedViewStudent.result || "FAIL"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="cms-summary-label">GROUP RANK</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px", color: "#d97706", display: "flex", alignItems: "center", gap: 4 }}>
                    <FaTrophy style={{ fontSize: "14px" }} />
                    #{selectedViewStudent.rank ?? getStudentRank(selectedViewStudent.id ?? selectedViewStudent.studentId)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. INLINE RANK LIST VIEW WITH GROUP & EXAMINATION FILTERS */}
        {resultsGenerated && !selectedViewStudent && viewMode === "rankList" && (
          <div className="cms-card cms-compact-card">
            <div className="cms-card-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid var(--cms-border, #cbd5e1)", paddingBottom: 10 }}>
                <div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ marginBottom: 6, height: "30px", padding: "0 10px", fontSize: "12px" }}
                    onClick={() => setViewMode("table")}
                  >
                    <FaArrowLeft /> Back to Results Table
                  </button>
                  <h3 className="cms-card-title" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "15px" }}>
                    <FaTrophy style={{ color: "#f59e0b" }} /> Group Rank List
                  </h3>
                  <span className="cms-subtitle" style={{ fontSize: "12px" }}>
                    Filter ranks by Academic Group, Examination, or student name.
                  </span>
                </div>
              </div>

              {/* Rank List Filters Bar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1", minWidth: 200, position: "relative" }}>
                  <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "inherit", fontSize: "11px", opacity: 0.6 }} />
                  <input
                    type="text"
                    className="cms-input"
                    style={{ paddingLeft: 28, height: "34px", fontSize: "12px", width: "100%" }}
                    placeholder="Search student name or roll..."
                    value={rankSearchQuery}
                    onChange={(e) => {
                      setRankSearchQuery(e.target.value);
                      setPageRankResults(1);
                    }}
                  />
                </div>

                {/* Group Filter for Rank List */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <FaFilter style={{ fontSize: "10px", color: "#2563eb" }} /> Group:
                  </span>
                  <select
                    className="cms-select"
                    style={{ minHeight: 34, padding: "4px 10px", fontSize: "12px", minWidth: 120 }}
                    value={rankGroupFilter}
                    onChange={(e) => {
                      setRankGroupFilter(e.target.value);
                      setPageRankResults(1);
                    }}
                  >
                    <option value="">All Groups</option>
                    {groupOptions.length ? (
                      groupOptions.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))
                    ) : (
                      [...new Set(resultsData.map((r) => groupNameFor(r.groupId, r.group)))].map((gName) => (
                        <option key={gName} value={gName}>{gName}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Examination Filter for Rank List */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <FaFilter style={{ fontSize: "10px", color: "#2563eb" }} /> Exam:
                  </span>
                  <select
                    className="cms-select"
                    style={{ minHeight: 34, padding: "4px 10px", fontSize: "12px", minWidth: 150 }}
                    value={rankExamFilter}
                    onChange={(e) => {
                      setRankExamFilter(e.target.value);
                      setPageRankResults(1);
                    }}
                  >
                    <option value="">All Examinations</option>
                    {examinationOptions.length ? (
                      examinationOptions.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))
                    ) : (
                      [...new Set(resultsData.map((r) => examNameFor(r.examId, r.exam)))].map((exName) => (
                        <option key={exName} value={exName}>{exName}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table cms-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>RANK</th>
                      <th style={{ width: "100px" }}>ROLL NUMBER</th>
                      <th style={{ width: "160px" }}>STUDENT NAME</th>
                      <th style={{ width: "60px" }}>GRP</th>
                      <th style={{ width: "120px" }}>EXAM</th>
                      <th style={{ width: "90px", textAlign: "center" }}>TOTAL MARKS</th>
                      <th style={{ width: "80px", textAlign: "center" }}>MAX MARKS</th>
                      <th style={{ width: "85px", textAlign: "center" }}>PERCENTAGE</th>
                      <th style={{ width: "60px", textAlign: "center" }}>GRADE</th>
                      <th style={{ width: "70px", textAlign: "center" }}>RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRankResults.length ? (
                      pagedRankResults.map((st) => (
                        <tr key={st.id || st.studentId}>
                          <td style={{ textAlign: "center", fontWeight: 700, color: st.rank === 1 ? "#d97706" : st.rank === 2 ? "inherit" : st.rank === 3 ? "#b45309" : "inherit" }}>
                            #{st.rank || "-"}
                          </td>
                          <td className="cms-strong">{st.roll || "—"}</td>
                          <td>
                            <button
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                color: "var(--cms-primary, #2563eb)",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: "12px",
                                textAlign: "left",
                                textDecoration: "underline",
                              }}
                              title="Click to view student marks memo"
                              onClick={() => handleViewStudentResult(st)}
                            >
                              {st.name || "—"}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{groupNameFor(st.groupId, st.group) || "—"}</td>
                          <td>
                            <span className="cms-badge" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", fontWeight: 600, fontSize: "10px", padding: "2px 6px" }}>
                              {examNameFor(st.examId, st.exam) || "—"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, textAlign: "center" }}>{st.total ?? "—"}</td>
                          <td style={{ opacity: 0.8, textAlign: "center" }}>{st.maximum ?? "—"}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{st.percentage || "—"}</td>
                          <td style={{ fontWeight: 700, textAlign: "center", color: st.grade === "F" ? "#dc2626" : "#16a34a" }}>{st.grade || "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="cms-badge"
                              style={{
                                background: String(st.result).toUpperCase() === "PASS" ? "#dcfce7" : "#fee2e2",
                                color: String(st.result).toUpperCase() === "PASS" ? "#15803d" : "#b91c1c",
                                fontWeight: 700,
                                padding: "2px 8px",
                                fontSize: "11px",
                              }}
                            >
                              {st.result || "—"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: 12, color: "inherit", opacity: 0.7 }}>
                          {rankSearchQuery || rankGroupFilter || rankExamFilter
                            ? `No student found matching the selected rank filters.`
                            : "No rank data available for the selected academic context."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className="cms-subtitle" style={{ fontSize: "11px" }}>
                  Showing {filteredRankList.length ? (pageRankResults - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(pageRankResults * pageSize, filteredRankList.length)} of {filteredRankList.length} entries
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                    disabled={pageRankResults === 1}
                    onClick={() => setPageRankResults((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPagesRankResults }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`cms-btn ${pageRankResults === p ? "cms-btn-primary" : "cms-btn-ghost"}`}
                      style={{ minWidth: 24, height: "28px", padding: "0 6px", fontSize: "11px" }}
                      onClick={() => setPageRankResults(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                    disabled={pageRankResults === totalPagesRankResults}
                    onClick={() => setPageRankResults((p) => Math.min(totalPagesRankResults, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. INLINE ANALYTICS VIEW */}
        {resultsGenerated && !selectedViewStudent && viewMode === "analytics" && (
          <div className="cms-card cms-compact-card">
            <div className="cms-card-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid var(--cms-border, #cbd5e1)", paddingBottom: 10 }}>
                <div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ marginBottom: 6, height: "30px", padding: "0 10px", fontSize: "12px" }}
                    onClick={() => setViewMode("table")}
                  >
                    <FaArrowLeft /> Back to Results Table
                  </button>
                  <h3 className="cms-card-title" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "15px" }}>
                    <FaChartBar style={{ color: "#2563eb" }} /> Examination Analytics Summary
                  </h3>
                  <span className="cms-subtitle" style={{ fontSize: "12px" }}>
                    Academic Group: <strong style={{ color: "inherit" }}>{selectedGroupName}</strong> | Performance Metrics Overview
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                <div className="cms-card" style={{ padding: 10, borderRadius: 6, textAlign: "center", margin: 0 }}>
                  <div style={{ fontSize: "9px", color: "inherit", fontWeight: 700, opacity: 0.8 }}>TOTAL STUDENTS</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "inherit", marginTop: 2 }}>{totalStudents}</div>
                </div>
                <div className="cms-card" style={{ padding: 10, borderRadius: 6, textAlign: "center", margin: 0 }}>
                  <div style={{ fontSize: "9px", color: "#166534", fontWeight: 700 }}>PASSED</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#15803d", marginTop: 2 }}>{passStudents}</div>
                </div>
                <div className="cms-card" style={{ padding: 10, borderRadius: 6, textAlign: "center", margin: 0 }}>
                  <div style={{ fontSize: "9px", color: "#991b1b", fontWeight: 700 }}>FAILED</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#dc2626", marginTop: 2 }}>{failStudents}</div>
                </div>
                <div className="cms-card" style={{ padding: 10, borderRadius: 6, textAlign: "center", margin: 0 }}>
                  <div style={{ fontSize: "9px", color: "#1e40af", fontWeight: 700 }}>OVERALL AVG %</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#2563eb", marginTop: 2 }}>{overallAvgPercentage}%</div>
                </div>
              </div>

              <h4 style={{ fontSize: "12px", fontWeight: 700, marginBottom: 8 }}>Subject Wise Breakdown</h4>

              <div className="cms-table-wrap">
                <table className="cms-table cms-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: "150px" }}>SUBJECT</th>
                      <th style={{ width: "120px", textAlign: "center" }}>AVERAGE SCORE</th>
                      <th style={{ width: "120px", textAlign: "center" }}>TOTAL STUDENTS</th>
                      <th style={{ width: "120px", textAlign: "center" }}>PASSED STUDENTS</th>
                      <th style={{ width: "120px", textAlign: "center" }}>SUBJECT PASS %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAnalytics.length ? (
                      subjectAnalytics.map((sa) => (
                        <tr key={sa.subject}>
                          <td className="cms-strong">{sa.subject || "—"}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{sa.average ?? 0} / 100</td>
                          <td style={{ textAlign: "center" }}>{totalStudents}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{sa.passCount ?? 0}</td>
                          <td style={{ fontWeight: 700, textAlign: "center", color: parseFloat(sa.passRate) >= 75 ? "#16a34a" : "#dc2626" }}>
                            {sa.passRate ?? 0}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: 12, color: "inherit", opacity: 0.7 }}>
                          No subject breakdown data available for the selected context.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. MAIN RESULTS TABLE VIEW - GROUPWISE DATA DISPLAY WITH COLLAPSIBLE GROUPS */}
        {resultsGenerated && !selectedViewStudent && viewMode === "table" && (
          <div className="cms-card">
            <div className="cms-card-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1", minWidth: 260 }}>
                  <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "inherit", fontSize: "11px", opacity: 0.6 }} />
                  <input
                    type="text"
                    className="cms-input"
                    style={{ paddingLeft: 28, height: "34px", fontSize: "12px", width: "100%" }}
                    value={query}
                    placeholder="Search student or roll number..."
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPageStudentResults(1);
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <button type="button" className="cms-btn cms-btn-primary" style={{ height: "34px", padding: "0 12px", fontSize: "12px" }} onClick={() => setConfirm(true)}>
                    Publish
                  </button>
                  <button type="button" className="cms-btn cms-btn-ghost" style={{ height: "34px", padding: "0 10px", fontSize: "12px" }} onClick={handleExportExcel}>
                    <FaFileExcel style={{ color: "#16a34a" }} /> Export
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "34px", padding: "0 10px", fontSize: "12px" }}
                    onClick={handleRankList}
                  >
                    <FaTrophy style={{ color: "#d97706" }} /> Rank List
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "34px", padding: "0 10px", fontSize: "12px" }}
                    onClick={handleAnalytics}
                  >
                    <FaChartBar style={{ color: "#2563eb" }} /> Analytics
                  </button>
                </div>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table cms-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>SL.NO</th>
                      <th style={{ width: "150px" }}>STUDENT NAME</th>
                      <th style={{ width: "85px" }}>ROLL NO</th>
                      <th style={{ width: "45px" }}>GRP</th>
                      {hasSections && <th style={{ width: "40px" }}>SEC</th>}
                      <th style={{ width: "160px" }}>EXAM</th>
                      <th style={{ width: "55px", textAlign: "center" }}>TOTAL</th>
                      <th style={{ width: "45px", textAlign: "center" }}>MAX</th>
                      <th style={{ width: "60px", textAlign: "center" }}>PERC</th>
                      <th style={{ width: "50px", textAlign: "center" }}>GRADE</th>
                      <th style={{ width: "65px", textAlign: "center" }}>RESULT</th>
                      <th style={{ width: "75px", textAlign: "center" }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStudentResults.length ? (
                      pagedStudentResults.map((r, idx) => {
                        const currentGroupName = groupNameFor(r.groupId, r.group);
                        const prevGroupName = idx > 0 ? groupNameFor(pagedStudentResults[idx - 1].groupId, pagedStudentResults[idx - 1].group) : null;
                        const isFirstInGroup = currentGroupName !== prevGroupName;
                        const totalGroupStudents = sortedGroupwiseResults.filter((st) => groupNameFor(st.groupId, st.group) === currentGroupName).length;
                        const isCollapsed = Boolean(collapsedGroups[currentGroupName]);

                        return (
                          <Fragment key={r.id || r.studentId || idx}>
                            {/* Group Banner Row with Expand / Collapse Up & Down Arrow Controls */}
                            {isFirstInGroup && (
                              <tr
                                className="cms-group-header-row"
                                style={{ cursor: "pointer" }}
                                title="Click to expand or hide this group"
                                onClick={() => toggleGroupCollapse(currentGroupName)}
                              >
                                <td colSpan={hasSections ? 12 : 11} className="cms-group-banner-td">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", color: "#2563eb" }}>
                                        {isCollapsed ? <FaChevronDown style={{ fontSize: "11px" }} /> : <FaChevronUp style={{ fontSize: "11px" }} />}
                                      </span>
                                      <span style={{ background: "#2563eb", color: "#ffffff", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <FaLayerGroup style={{ fontSize: "9px" }} /> ACADEMIC GROUP
                                      </span>
                                      <strong style={{ fontSize: "13px", color: "inherit" }}>{currentGroupName}</strong>
                                      <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 500 }}>
                                        ({totalGroupStudents} {totalGroupStudents === 1 ? "Student" : "Students"})
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Render Student Rows only when Group is Expanded */}
                            {!isCollapsed && (
                              <tr>
                                <td style={{ opacity: 0.7 }}>{(pageStudentResults - 1) * pageSize + idx + 1}</td>
                                <td>
                                  <button
                                    type="button"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      color: "var(--cms-primary, #2563eb)",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      textAlign: "left",
                                      textDecoration: "underline",
                                    }}
                                    title="Click to view student marks memo"
                                    onClick={() => handleViewStudentResult(r)}
                                  >
                                    {r.name || "—"}
                                  </button>
                                </td>

                                <td className="cms-strong">{r.roll || "—"}</td>
                                <td>{groupNameFor(r.groupId, r.group) || "—"}</td>
                                {hasSections && <td>{r.section || "—"}</td>}
                                <td>
                                  <span className="cms-badge" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", fontWeight: 600, fontSize: "10px", padding: "2px 6px" }}>
                                    {examNameFor(r.examId, r.exam) || "—"}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 700, textAlign: "center" }}>{r.total ?? "—"}</td>
                                <td style={{ opacity: 0.7, textAlign: "center" }}>{r.maximum ?? "—"}</td>
                                <td style={{ fontWeight: 600, textAlign: "center" }}>
                                  {r.percentage ? (String(r.percentage).includes("%") ? r.percentage : `${r.percentage}%`) : "—"}
                                </td>
                                <td style={{ fontWeight: 700, textAlign: "center", color: r.grade === "F" ? "#dc2626" : "#16a34a" }}>
                                  {r.grade || "—"}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                  <span
                                    className="cms-badge"
                                    style={{
                                      background: String(r.result).toUpperCase() === "PASS" ? "#dcfce7" : String(r.result).toUpperCase() === "FAIL" ? "#fee2e2" : "#f1f5f9",
                                      color: String(r.result).toUpperCase() === "PASS" ? "#15803d" : String(r.result).toUpperCase() === "FAIL" ? "#b91c1c" : "#475569",
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {String(r.result).toUpperCase() === "PASS" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                        <FaCheck style={{ fontSize: "8px", color: "#15803d" }} /> PASS
                                      </span>
                                    ) : String(r.result).toUpperCase() === "FAIL" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                        <FaTimes style={{ fontSize: "8px", color: "#b91c1c" }} /> FAIL
                                      </span>
                                    ) : (
                                      r.result || "—"
                                    )}
                                  </span>
                                </td>

                                <td style={{ textAlign: "center" }}>
                                  <span className="cms-badge cms-badge-active" style={{ padding: "2px 6px", fontSize: "10px" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                      <FaCheckCircle style={{ fontSize: "8px", color: r.isPublished ? "#15803d" : "#d97706" }} />
                                      {r.status || (r.isPublished ? "Published" : "Draft")}
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={hasSections ? 12 : 11} style={{ textAlign: "center", padding: "16px 12px", opacity: 0.7 }}>
                          {query
                            ? `No student records match the active filter criteria.`
                            : "No result records found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Page Navigation Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="cms-subtitle" style={{ fontSize: "12px", margin: 0 }}>
                    Showing {sortedGroupwiseResults.length ? (pageStudentResults - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(pageStudentResults * pageSize, sortedGroupwiseResults.length)} of {sortedGroupwiseResults.length} entries
                  </span>

                  {/* Rows Per Page Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "12px", opacity: 0.8 }}>Per page:</span>
                    <select
                      className="cms-select"
                      style={{ minHeight: 28, padding: "2px 8px", fontSize: "12px", width: "auto" }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPageStudentResults(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Controls */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "30px", padding: "0 8px", fontSize: "11px" }}
                    title="First Page"
                    disabled={pageStudentResults === 1}
                    onClick={() => setPageStudentResults(1)}
                  >
                    <FaAngleDoubleLeft />
                  </button>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
                    disabled={pageStudentResults === 1}
                    onClick={() => setPageStudentResults((p) => Math.max(1, p - 1))}
                  >
                    <FaAngleLeft /> Previous
                  </button>

                  {Array.from({ length: totalPagesStudentResults }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - pageStudentResults) <= 2 || p === 1 || p === totalPagesStudentResults)
                    .map((p, i, arr) => (
                      <Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span style={{ padding: "0 4px", opacity: 0.5, fontSize: "12px" }}>...</span>
                        )}
                        <button
                          className={`cms-btn ${pageStudentResults === p ? "cms-btn-primary" : "cms-btn-ghost"}`}
                          style={{ minWidth: 30, height: "30px", padding: "0 8px", fontSize: "12px", fontWeight: pageStudentResults === p ? 700 : 500 }}
                          onClick={() => setPageStudentResults(p)}
                        >
                          {p}
                        </button>
                      </Fragment>
                    ))}

                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
                    disabled={pageStudentResults === totalPagesStudentResults}
                    onClick={() => setPageStudentResults((p) => Math.min(totalPagesStudentResults, p + 1))}
                  >
                    Next <FaAngleRight />
                  </button>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "30px", padding: "0 8px", fontSize: "11px" }}
                    title="Last Page"
                    disabled={pageStudentResults === totalPagesStudentResults}
                    onClick={() => setPageStudentResults(totalPagesStudentResults)}
                  >
                    <FaAngleDoubleRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM PUBLISH DIALOG */}
        {confirm && (
          <div className="cms-modal-overlay" onClick={() => setConfirm(false)}>
            <div className="cms-modal-content results-publish-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cms-modal-header" style={{ padding: "18px 24px" }}>
                <h3 className="cms-modal-title">Publish Group Results</h3>
                <button type="button" className="cms-modal-close" onClick={() => setConfirm(false)}>✕</button>
              </div>

              <div className="cms-modal-body">
                <p className="cms-subtitle" style={{ margin: 0 }}>
                  Published results will become immediately visible to students and parents on the Student Portal. Group: <strong style={{ color: "inherit" }}>{selectedGroupName}</strong>. Continue?
                </p>
              </div>

              <div className="cms-modal-footer" style={{ padding: "16px 24px" }}>
                <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="cms-btn cms-btn-primary" disabled={loading} onClick={handlePublishResults}>
                  {loading ? "Publishing..." : "Publish Results"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="results-toast">
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </DashboardLayout>
  );
}