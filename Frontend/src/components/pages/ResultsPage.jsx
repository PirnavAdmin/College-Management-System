import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import {
  getResults,
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  getBoards,
  getGroups,
  getStudentResult,
>>>>>>> 65bc6450d2a54d3b9cfa86a52e3df0cb19eaeea4
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
=======
  getBoards,
  getGroups,
  getStudentResult,
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
  getRankList,
  getResultAnalysis,
  downloadResultsExcel,
  downloadResultsPdf,
  downloadStudentResultMemo,
  processResults,
  publishResults,
  getAcademicYears,
  getAcademicLevels,
  getExaminations,
  getSubjects,
} from "@/features/results/services/resultsService.js";
import {
  FaSearch,
  FaArrowLeft,
  FaFilePdf,
  FaFileExcel,
  FaTrophy,
  FaChartBar,
  FaPrint,
  FaCheck,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
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
  const s = subjectName.toLowerCase();
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
  return Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.records ?? data?.Records ?? data?.results ?? data?.Results ?? [];
};
const read = (item, ...keys) => item ? keys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== "") : undefined;
const options = (payload, idKeys, nameKeys) => records(payload).map((item) => ({
  id: read(item, ...idKeys), name: read(item, ...nameKeys),
})).filter((item) => Number.isInteger(Number(item.id)) && Number(item.id) > 0 && item.name);

export default function ResultsPage() {
  const [filters, setFilters] = useState({
    board: "",
    year: "",
    level: "",
    group: "",
    exam: "",
  });

  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [rankSearchQuery, setRankSearchQuery] = useState("");

  const [resultsGenerated, setResultsGenerated] = useState(false);
  const [resultsData, setResultsData] = useState([]);
<<<<<<< HEAD
  const [filterOptions, setFilterOptions] = useState({ boards: [], years: [], levels: [], groups: [], exams: [] });
  const [filterLoading, setFilterLoading] = useState({ boards: true, years: true, levels: true, groups: false, exams: false });
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
=======
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
  const [scopeResults, setScopeResults] = useState([]);
  const [boardOptions, setBoardOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [examinationOptions, setExaminationOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);
<<<<<<< HEAD
>>>>>>> 65bc6450d2a54d3b9cfa86a52e3df0cb19eaeea4
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
=======
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
  const [rankResults, setRankResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedViewStudent, setSelectedViewStudent] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'rankList' | 'analytics'

  const pageSize = 5;
  const [pageStudentResults, setPageStudentResults] = useState(1);
  const [pageRankResults, setPageRankResults] = useState(1);

  useEffect(() => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD

>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
    let active = true;
    const config = { params: { "api-version": RESULTS_API_VERSION } };
    Promise.allSettled([
      apiClient.get(resultsPageApi.boards, config),
      apiClient.get(resultsPageApi.years, config),
      apiClient.get(resultsPageApi.levels, config),
    ]).then(([boardsResult, yearsResult, levelsResult]) => {
      if (!active) return;
      setFilterOptions((current) => ({
        ...current,
        boards: boardsResult.status === "fulfilled" ? options(boardsResult.value.data, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]) : [],
        years: yearsResult.status === "fulfilled" ? options(yearsResult.value.data, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]) : [],
        levels: levelsResult.status === "fulfilled" ? options(levelsResult.value.data, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]) : [],
      }));
      const failed = [boardsResult, yearsResult, levelsResult].find((result) => result.status === "rejected");
      if (failed) setToast(getApiErrorMessage(failed.reason));
      setFilterLoading((current) => ({ ...current, boards: false, years: false, levels: false }));
    });
    return () => { active = false; };
  }, []);

  const { boards: availableBoards, years: availableYears, levels: availableLevels, groups: availableGroups, exams: availableExams } = filterOptions;

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level) return undefined;
    let active = true;
    setFilterLoading((current) => ({ ...current, groups: true }));
    apiClient.get(resultsPageApi.groups, { params: {
      boardId: Number(filters.board), academicYearId: Number(filters.year), academicLevelId: Number(filters.level),
      pageNumber: 1, pageSize: 100, "api-version": RESULTS_API_VERSION,
    } }).then((response) => {
      if (!active) return;
      setFilterOptions((current) => ({ ...current, groups: options(response.data, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"]), exams: [] }));
    }).catch((error) => active && setToast(getApiErrorMessage(error)))
      .finally(() => active && setFilterLoading((current) => ({ ...current, groups: false })));
    return () => { active = false; };
  }, [filters.board, filters.level, filters.year]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group) return undefined;
    let active = true;
    const courseId = filterOptions.groups.find((group) => String(group.id) === filters.group)?.name;
    if (!courseId) return undefined;
    setFilterLoading((current) => ({ ...current, exams: true }));
    apiClient.get(resultsPageApi.examinations, { params: {
      courseId,
    } }).then((response) => {
      if (!active) return;
      setFilterOptions((current) => ({ ...current, exams: options(response.data, ["examinationId", "ExaminationId", "examId", "ExamId", "id", "Id"], ["examName", "ExamName", "examinationName", "ExaminationName", "name", "Name", "examCode", "ExamCode"]) }));
    }).catch((error) => active && setToast(getApiErrorMessage(error)))
      .finally(() => active && setFilterLoading((current) => ({ ...current, exams: false })));
    return () => { active = false; };
  }, [filterOptions.groups, filters.board, filters.group, filters.level, filters.year]);
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
    Promise.allSettled([getBoards(), getAcademicYears(), getAcademicLevels(), getGroups(), getExaminations()])
      .then(([boardsResult, yearsResult, levelsResult, groupsResult, examinationsResult]) => {
=======
    Promise.allSettled([getBoards(), getAcademicYears(), getAcademicLevels(), getGroups(), getExaminations(), getSubjects()])
      .then(([boardsResult, yearsResult, levelsResult, groupsResult, examinationsResult, subjectsResult]) => {
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
        if (boardsResult.status === "fulfilled") setBoardOptions(boardsResult.value.filter((item) => item.status !== false && item.status !== "Inactive").map((item) => ({ id: String(item.boardId ?? item.id), name: item.boardName ?? item.name, code: item.boardCode })));
        if (yearsResult.status === "fulfilled") setYearOptions(yearsResult.value.filter((item) => item.isActive !== false && item.status !== "Inactive").map((item) => ({ id: String(item.academicYearId ?? item.id), name: item.academicYearName ?? item.name })));
        if (levelsResult.status === "fulfilled") setLevelOptions(levelsResult.value.map((item) => ({ id: String(item.academicLevelId ?? item.id), name: item.levelName ?? item.name })));
        if (groupsResult.status === "fulfilled") setGroupOptions(groupsResult.value.filter((item) => item.isActive !== false && item.status !== "Inactive").map((item) => ({ id: String(item.groupId ?? item.id), name: item.groupName ?? item.name, boardId: item.boardId, academicYearId: item.academicYearId, academicLevelId: item.academicLevelId })));
        if (examinationsResult.status === "fulfilled") setExaminationOptions(examinationsResult.value.filter((item) => item.status !== "Inactive").map((item) => ({ id: String(item.examinationId ?? item.examId ?? item.id), name: item.examName ?? item.name })));
        if (subjectsResult.status === "fulfilled") setSubjectOptions(subjectsResult.value.filter((item) => item.isActive !== false).map((item) => ({ id: String(item.subjectId ?? item.id), name: item.subjectName ?? item.name, groupId: item.groupId, boardId: item.boardId, academicYearId: item.academicYearId, academicLevelId: item.academicLevelId })));
        const failed = [boardsResult, yearsResult, levelsResult, groupsResult, examinationsResult, subjectsResult].find((result) => result.status === "rejected");
        if (failed) setToast(getApiErrorMessage(failed.reason));
      })
      .finally(() => setContextLoading(false));
    getResults({ PageNumber: 1, PageSize: 100 })
      .then(setScopeResults)
      .catch((error) => setToast(getApiErrorMessage(error)));
  }, []);

  const uniqueScopes = (records, idKey, nameKey) =>
    [...new Map(records.filter((record) => record[idKey] && record[nameKey]).map((record) => [record[idKey], { id: record[idKey], name: record[nameKey] }])).values()];
  const availableBoards = boardOptions;
  // Academic years and levels are independent reference data. Do not hide them
  // just because a group has not yet been returned for the selected context.
  const availableYears = filters.board ? yearOptions : [];
  const availableLevels = filters.year ? levelOptions : [];
  const contextualGroups = groupOptions.filter((group) => String(group.boardId) === filters.board && String(group.academicYearId) === filters.year && (!group.academicLevelId || String(group.academicLevelId) === filters.level));
  const boardYearGroups = groupOptions.filter((group) => String(group.boardId) === filters.board && String(group.academicYearId) === filters.year);
  const availableGroups = filters.level ? (contextualGroups.length ? contextualGroups : boardYearGroups.length ? boardYearGroups : groupOptions) : [];
  const availableExams = filters.group ? examinationOptions : [];
<<<<<<< HEAD
>>>>>>> 65bc6450d2a54d3b9cfa86a52e3df0cb19eaeea4
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
=======
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728

  const isAllFiltersSelected = Boolean(
    filters.board && filters.year && filters.level && filters.group && filters.exam
  );

  const selectedScope = useMemo(() => ({
    boardId: Number(filters.board), academicYearId: Number(filters.year), academicLevelId: Number(filters.level), groupId: Number(filters.group), examId: Number(filters.exam),
  }), [filters]);
  const selectedGroupName = groupOptions.find((group) => String(group.id) === filters.group)?.name ?? "—";
  const groupNameFor = (groupId, groupName) =>
    groupOptions.find((group) => String(group.id) === String(groupId))?.name
    ?? (groupName && !/^\d+$/.test(String(groupName).trim()) ? groupName : "—");
  const hasSections = resultsData.some((result) => Boolean(String(result.section ?? "").trim()));

  const handleFilterChange = (field, value) => {
    setResultsGenerated(false);
    setSelectedViewStudent(null);
    setViewMode("table");
    setResultsData([]);
    setRankResults([]);
    setAnalysis(null);
    setFilters((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "board") {
        updated.year = "";
        updated.level = "";
        updated.group = "";
        updated.exam = "";
      } else if (field === "year") {
        updated.level = "";
        updated.group = "";
        updated.exam = "";
      } else if (field === "level") {
        updated.group = "";
        updated.exam = "";
      } else if (field === "group") {
        updated.exam = "";
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
<<<<<<< HEAD
      setResultsData(Array.isArray(fetchedData) ? fetchedData : []);
      setResultsGenerated(true);
=======
<<<<<<< HEAD
      const fetchedData = await getResults({ ...selectedScope, PageNumber: 1, PageSize: 100 });
      setResultsData(Array.isArray(fetchedData) ? fetchedData : []);
      setResultsGenerated(true);
=======
<<<<<<< HEAD

      const fetchedData = await getResults({ ...selectedScope, PageNumber: 1, PageSize: 100 });
      setResultsData(Array.isArray(fetchedData) ? fetchedData : []);
      setResultsGenerated(true);

=======
      const [fetchedData, failedData] = await Promise.all([
        getResults({ ...selectedScope, PageNumber: 1, PageSize: 100 }),
        getFailedStudents(),
      ]);
=======
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728

      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        setResultsData(fetchedData);
      } else {
        setResultsData([]);
      }

<<<<<<< HEAD
      setFailedResults(failedData);
>>>>>>> 65bc6450d2a54d3b9cfa86a52e3df0cb19eaeea4
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
=======
      setResultsGenerated(true);
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
      setToast("Results processed and fetched successfully!");
    } catch (error) {
      setToast(getApiErrorMessage(error));
      setResultsData([]);
<<<<<<< HEAD
<<<<<<< HEAD
      setResultsGenerated(false);
=======
<<<<<<< HEAD
      setResultsGenerated(false);
=======
<<<<<<< HEAD

      setResultsGenerated(false);

=======
>>>>>>> 65bc6450d2a54d3b9cfa86a52e3df0cb19eaeea4
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
>>>>>>> 4e7fb7a236e4c4a7f8661518a90eaf6c9a1e801a
=======
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
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
      setResultsData(refreshed);
      setToast(typeof message === "string" ? message : "Results published successfully.");
      setConfirm(false);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const filteredStudentResults = resultsData.filter((r) => r.isPublished !== false).filter((r) =>
    `${r.name} ${r.roll} ${r.group} ${r.section}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const totalPagesStudentResults = Math.max(1, Math.ceil(filteredStudentResults.length / pageSize));
  const pagedStudentResults = filteredStudentResults.slice(
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

  // Rank Mapping & Calculation
  const rankedStudentsWithRanks = rankResults.length
    ? rankResults
    : [...resultsData]
      .sort((a, b) => b.total - a.total)
      .map((st, idx) => ({ ...st, rank: idx + 1 }));

  const filteredRankList = rankedStudentsWithRanks.filter((st) =>
    `${st.name} ${st.roll}`.toLowerCase().includes(rankSearchQuery.toLowerCase())
  );

  const totalPagesRankResults = Math.max(1, Math.ceil(filteredRankList.length / pageSize));
  const pagedRankResults = filteredRankList.slice(
    (pageRankResults - 1) * pageSize,
    pageRankResults * pageSize
  );

  const getStudentRank = (studentId) => {
    const found = rankedStudentsWithRanks.find((s) => s.id === studentId || s.studentId === studentId);
    return found ? found.rank : "-";
  };

  // PDF Export
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!isAllFiltersSelected) {
      setToast("Select the complete result scope before downloading PDF.");
      return;
    }
    try {
      const response = await downloadResultsPdf(selectedScope);
      downloadBlob(response.data, "Results.pdf");
      setToast("Results PDF downloaded successfully.");
    } catch (error) {
      setToast(getApiErrorMessage(error));
    }
  };

  // Excel Export
  const handleExportExcel = async () => {
    if (!isAllFiltersSelected) {
      setToast("Select the complete result scope before exporting Excel.");
      return;
    }
    try {
      const response = await downloadResultsExcel(selectedScope);
      downloadBlob(response.data, "Results.xlsx");
      setToast("Results Excel file downloaded successfully.");
    } catch (error) {
      setToast(getApiErrorMessage(error));
    }
  };

  const handlePrintStudentMemo = async (student) => {
    if (!isAllFiltersSelected) return setToast("Select the complete result scope first.");

    setLoading(true);
    try {
      const response = await downloadStudentResultMemo({
        studentId: student.studentId || student.id,
        ...selectedScope,
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      setToast(`Opened marks memo for ${student.name}.`);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentResult = async (student) => {
    if (!isAllFiltersSelected) {
      setSelectedViewStudent(student);
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(resultsPageApi.studentResult, { params: { studentId: student.studentId || student.id, ...selectedScope } });
      const memo = unwrap(response.data);
      setSelectedViewStudent({
        ...student,
        name: memo.studentName || student.name,
        roll: memo.rollNumber || student.roll,
        group: memo.groupName || student.group,
        exam: memo.examName || student.exam,
        total: memo.grandTotal || student.total,
        maximum: memo.maximumMarks ?? student.maximum,
        percentage: memo.percentage ? `${memo.percentage}%` : student.percentage,
        grade: memo.overallGrade || student.grade,
        result: memo.finalResult || student.result,
        status: memo.resultStatus || student.status,
        rank: memo.classRank || getStudentRank(student.id),
        subjects: memo.subjects ?? [],
      });
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRankList = async () => {
    if (isAllFiltersSelected) {
      try {
        const ranks = await getRankList(selectedScope);
        if (Array.isArray(ranks) && ranks.length > 0) {
          setRankResults(ranks.map((item) => ({
            id: item.studentId,
            studentId: item.studentId,
            name: item.studentName,
            roll: item.rollNumber,
            group: item.groupName,
            exam: item.examName,
            total: item.totalMarks,
            maximum: item.maximumMarks,
            percentage: `${item.percentage}%`,
            grade: item.grade,
            rank: item.rank,
            result: item.result || "PASS",
          })));
        }
      } catch (error) {
        setToast(getApiErrorMessage(error));
      }
    }
    setRankSearchQuery("");
    setPageRankResults(1);
    setViewMode("rankList");
  };

  const handleAnalytics = async () => {
    if (isAllFiltersSelected) {
      try {
        const resAnalysis = await getResultAnalysis(selectedScope);
        if (resAnalysis) setAnalysis(resAnalysis);
      } catch (error) {
        setToast(getApiErrorMessage(error));
      }
    }
    setViewMode("analytics");
  };

  const parsePercent = (val) => parseFloat(String(val).replace("%", "")) || 0;

  // Analytics Calculations
  const totalStudents = analysis?.totalStudents ?? resultsData.length;
  const passStudents = analysis?.passedStudents ?? resultsData.filter((r) => String(r.result).toUpperCase() === "PASS").length;
  const failStudents = analysis?.failedStudents ?? resultsData.filter((r) => String(r.result).toUpperCase() === "FAIL").length;
  const overallAvgPercentage = totalStudents > 0
    ? (resultsData.reduce((acc, r) => acc + parsePercent(r.percentage), 0) / totalStudents).toFixed(2)
    : "0.00";

  const contextSubjects = subjectOptions.filter((subject) => (!filters.group || String(subject.groupId) === filters.group) && (!filters.board || String(subject.boardId) === filters.board) && (!filters.year || String(subject.academicYearId) === filters.year) && (!filters.level || String(subject.academicLevelId) === filters.level));
  const subjectsList = [...new Set((contextSubjects.length ? contextSubjects : subjectOptions).map((subject) => subject.name).concat(resultsData.map((result) => result.subject)).filter(Boolean))];
  const subjectAnalytics = analysis?.subjects?.map((subject) => ({
    subject: subject.subjectName,
    average: subject.averageScore,
    passCount: subject.passedStudents,
    passRate: subject.subjectPassPercentage,
  })) ?? subjectsList.map((sub) => {
    const scores = resultsData.filter((result) => result.subject === sub).map((result) => Number(result.total)).filter(Number.isFinite);
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

        /* Compact Row Spacing & Minimized Width Utilities */
        .cms-compact-card {
          max-width: 880px;
          margin: 0 auto 20px auto;
        }

        .cms-table-compact th {
          padding: 6px 10px !important;
          font-size: 11px !important;
        }

        .cms-table-compact td {
          padding: 5px 10px !important;
          font-size: 12px !important;
        }

        .cms-table-compact tr {
          height: 34px !important;
        }

        /* Keep Results page notifications as a compact black modal at the bottom. */
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

        /* Result page form sizing matches the standard CMS page layout. */
        .results-context-card .cms-card-body { padding: 16px 20px !important; }
        .results-context-heading { margin: 0 !important; font-size: 18px !important; line-height: 1.3 !important; }
        .results-context-description { margin: 4px 0 14px !important; font-size: 14px !important; line-height: 1.45 !important; }
        .results-context-card .cms-label { font-size: 13px !important; line-height: 1.35 !important; }
        .results-context-card .cms-select { min-height: 38px !important; padding: 8px 12px !important; font-size: 14px !important; }

        /* Match the standard page scale on every generated-results view. */
        .results-page .cms-card { border-radius: 14px; }
        .results-page .cms-compact-card { width: 100%; max-width: none; margin: 0 0 20px !important; }
        .results-page .cms-card-body { padding: 24px 28px !important; }
        .results-page .cms-table-compact th { padding: 12px 14px !important; font-size: 13px !important; }
        .results-page .cms-table-compact td { padding: 11px 14px !important; font-size: 14px !important; }
        .results-page .cms-table-compact tr { height: 46px !important; }
        .results-page .cms-btn { min-height: 40px !important; padding: 0 16px !important; font-size: 14px !important; }
        .results-page .cms-subtitle { font-size: 14px; line-height: 1.5; }
        .results-page .cms-table-wrap { margin-top: 18px; }
      `}</style>

      <div className="results-page">

<<<<<<< HEAD
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
              {loading ? "Generating..." : "Generate Data"}
            </button>
          </div>
          <p className="cms-subtitle results-context-description">
Choose the academic context sequentially before reviewing faculty submissions.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <div className="cms-field-group">
              <label className="cms-label">Board <span className="results-required-mark">*</span></label>
<<<<<<< HEAD
              <select
                className="cms-select"
                disabled={filterLoading.boards}
                value={filters.board}
                onChange={(e) => handleFilterChange("board", e.target.value)}
              >
                <option value="">Select Board</option>
                {availableBoards.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
=======
              <select className="cms-select" disabled={filterLoading.boards} value={filters.board} onChange={(e) => handleFilterChange("board", e.target.value)}>
                <option value="">Select Board</option>
                {availableBoards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
              </select>
            </div>
            <div className="cms-field-group">
              <label className="cms-label">Academic Year <span className="results-required-mark">*</span></label>
<<<<<<< HEAD
              <select
                className="cms-select"
                disabled={!filters.board || filterLoading.years}
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
              >
                <option value="">Select Year</option>
                {availableYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
=======
              <select className="cms-select" disabled={!filters.board || filterLoading.years} value={filters.year} onChange={(e) => handleFilterChange("year", e.target.value)}>
                <option value="">Select Year</option>
                {availableYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
              </select>
            </div>
            <div className="cms-field-group">
              <label className="cms-label">Academic Level <span className="results-required-mark">*</span></label>
<<<<<<< HEAD
              <select
                className="cms-select"
                disabled={!filters.year || filterLoading.levels}
                value={filters.level}
                onChange={(e) => handleFilterChange("level", e.target.value)}
              >
                <option value="">Select Level</option>
                {availableLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
=======
              <select className="cms-select" disabled={!filters.year || filterLoading.levels} value={filters.level} onChange={(e) => handleFilterChange("level", e.target.value)}>
                <option value="">Select Level</option>
                {availableLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
              </select>
            </div>
            <div className="cms-field-group">
              <label className="cms-label">Group <span className="results-required-mark">*</span></label>
<<<<<<< HEAD
              <select
                className="cms-select"
                disabled={!filters.level || filterLoading.groups}
                value={filters.group}
                onChange={(e) => handleFilterChange("group", e.target.value)}
              >
                <option value="">Select Group</option>
                {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
=======
              <select className="cms-select" disabled={!filters.level || filterLoading.groups} value={filters.group} onChange={(e) => handleFilterChange("group", e.target.value)}>
                <option value="">Select Group</option>
                {availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
              </select>
            </div>
            <div className="cms-field-group">
              <label className="cms-label">Examination <span className="results-required-mark">*</span></label>
              <select className="cms-select" disabled={!filters.group || filterLoading.exams} value={filters.exam} onChange={(e) => handleFilterChange("exam", e.target.value)}>
                <option value="">Select Exam</option>
<<<<<<< HEAD
                {availableExams.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
=======
                {availableExams.map((examination) => <option key={examination.id} value={examination.id}>{examination.name}</option>)}
>>>>>>> 3b3581af184288b7a6fa74e060c4eb27c081ee6f
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Instructional Message */}
      {!resultsGenerated && !selectedViewStudent && viewMode === "table" && (
        <div className="cms-card cms-compact-card">
          <div className="cms-card-body" style={{ textAlign: "center", padding: "20px 16px" }}>
            <p className="cms-subtitle" style={{ margin: 0, fontWeight: 500 }}>
              {!isAllFiltersSelected
                ? "Select all required filter fields in order (Board → Academic Year → Academic Level → Group → Examination) to unlock evaluation data."
                : "All filter fields selected. Click 'Generate Data' to display evaluation statistics and student results table."}
            </p>

=======
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
                {loading ? "Generating..." : "Generate Data"}
              </button>
            </div>
            <p className="cms-subtitle results-context-description">
              Choose the academic context sequentially before reviewing faculty submissions.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
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
            </div>
>>>>>>> 1dc8d0ca8336a7ca8f25355c0bc3725b3a7a8728
          </div>
        </div>
      )}

        {/* 2. Instructional Message */}
        {!resultsGenerated && !selectedViewStudent && viewMode === "table" && (
          <div className="cms-card cms-compact-card">
            <div className="cms-card-body" style={{ textAlign: "center", padding: "20px 16px" }}>
              <p className="cms-subtitle" style={{ margin: 0, fontWeight: 500 }}>
                {!isAllFiltersSelected
                  ? "Select all required filter fields in order (Board → Academic Year → Academic Level → Group → Examination) to unlock evaluation data."
                  : "All filter fields selected. Click 'Generate Data' to display evaluation statistics and student results table."}
              </p>
            </div>
          </div>
        )}

        {/* 3. Detailed Individual Student Marks Memo View */}
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
                    Official Marks Memo - {selectedViewStudent.name}
                  </h3>
                  <span className="cms-subtitle" style={{ marginTop: 2, fontSize: "12px" }}>
                     Roll Number: <strong style={{ color: "inherit" }}>{selectedViewStudent.roll}</strong> | Group: {groupNameFor(selectedViewStudent.groupId, selectedViewStudent.group)}{selectedViewStudent.section ? ` - Section ${selectedViewStudent.section}` : ""}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => handlePrintStudentMemo(selectedViewStudent)}
                  >
                    <FaPrint /> Print Marks Memo
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-secondary"
                    style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => {
                      setResultsData((prev) =>
                        prev.map((r) => (r.id === selectedViewStudent.id ? { ...r, status: "Published", isPublished: true } : r))
                      );
                      setToast(`Published result for ${selectedViewStudent.name}!`);
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
                    {selectedViewStudent.total}{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "inherit" }}>/ {selectedViewStudent.maximum ?? "—"}</span>
                  </div>
                </div>
                <div>
                  <div className="cms-summary-label">PERCENTAGE</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px" }}>{selectedViewStudent.percentage}</div>
                </div>
                <div>
                  <div className="cms-summary-label">OVERALL GRADE</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px" }}>{selectedViewStudent.grade}</div>
                </div>

                <div>
                  <div className="cms-summary-label">FINAL RESULT</div>
                  <div style={{ marginTop: 2 }}>
                    <span
                      className="cms-badge"
                      style={{
                        background: selectedViewStudent.result === "PASS" ? "#dcfce7" : "#fee2e2",
                        color: selectedViewStudent.result === "PASS" ? "#15803d" : "#b91c1c",
                        fontWeight: 700,
                        padding: "3px 8px",
                        fontSize: "11px",
                      }}
                    >
                      {selectedViewStudent.result === "PASS" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <FaCheck style={{ color: "#15803d" }} /> PASS
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <FaTimes style={{ color: "#b91c1c" }} /> FAIL
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="cms-summary-label">CLASS RANK</div>
                  <div className="cms-summary-val" style={{ fontSize: "18px", color: "#d97706", display: "flex", alignItems: "center", gap: 4 }}>
                    <FaTrophy style={{ fontSize: "14px" }} />
                    #{getStudentRank(selectedViewStudent.id)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. INLINE RANK LIST VIEW (TOTAL MARKS AND MAX MARKS SEPARATED) */}
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
                    <FaTrophy style={{ color: "#f59e0b" }} /> Group Class Rank List
                  </h3>
                  <span className="cms-subtitle" style={{ fontSize: "12px" }}>
                    Academic Group: <strong style={{ color: "inherit" }}>{selectedGroupName}</strong> | Total Evaluated Students: {rankedStudentsWithRanks.length}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 10, maxWidth: 280, position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "inherit", fontSize: "11px", opacity: 0.6 }} />
                <input
                  type="text"
                  className="cms-input"
                  style={{ paddingLeft: 28, height: "32px", fontSize: "12px" }}
                  placeholder="Search student name or roll to check rank..."
                  value={rankSearchQuery}
                  onChange={(e) => {
                    setRankSearchQuery(e.target.value);
                    setPageRankResults(1);
                  }}
                />
              </div>

              {/* SEPARATED TOTAL MARKS AND MAX MARKS COLUMNS */}
              <div className="cms-table-wrap">
                <table className="cms-table cms-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>RANK</th>
                      <th style={{ width: "100px" }}>ROLL NUMBER</th>
                      <th style={{ width: "160px" }}>STUDENT NAME</th>
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
                            #{st.rank}
                          </td>
                          <td className="cms-strong">{st.roll}</td>
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
                              {st.name}
                            </button>
                          </td>
                          <td style={{ fontWeight: 700, textAlign: "center" }}>{st.total}</td>
                          <td style={{ opacity: 0.8, textAlign: "center" }}>{st.maximum ?? "—"}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{st.percentage}</td>
                          <td style={{ fontWeight: 700, textAlign: "center", color: st.grade === "F" ? "#dc2626" : "#16a34a" }}>{st.grade}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="cms-badge"
                              style={{
                                background: st.result === "PASS" ? "#dcfce7" : "#fee2e2",
                                color: st.result === "PASS" ? "#15803d" : "#b91c1c",
                                fontWeight: 700,
                                padding: "2px 8px",
                                fontSize: "11px",
                              }}
                            >
                              {st.result}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 12, color: "inherit", opacity: 0.7 }}>
                          No student found matching "{rankSearchQuery}".
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

        {/* 5. INLINE ANALYTICS VIEW (TOTAL STUDENTS AND PASSED STUDENTS SEPARATED) */}
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

              {/* SEPARATED TOTAL STUDENTS AND PASSED STUDENTS COLUMNS */}
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
                    {subjectAnalytics.map((sa) => (
                      <tr key={sa.subject}>
                        <td className="cms-strong">{sa.subject}</td>
                        <td style={{ fontWeight: 600, textAlign: "center" }}>{sa.average} / 100</td>
                        <td style={{ textAlign: "center" }}>{totalStudents}</td>
                        <td style={{ fontWeight: 600, textAlign: "center" }}>{sa.passCount}</td>
                        <td style={{ fontWeight: 700, textAlign: "center", color: parseFloat(sa.passRate) >= 75 ? "#16a34a" : "#dc2626" }}>
                          {sa.passRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. MAIN RESULTS TABLE VIEW */}
        {resultsGenerated && !selectedViewStudent && viewMode === "table" && (
          <div className="cms-card">
            <div className="cms-card-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "nowrap" }}>
                <div style={{ position: "relative", flex: "1", width: "100%" }}>
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

                  <button type="button" className="cms-btn cms-btn-ghost" style={{ height: "34px", padding: "0 10px", fontSize: "12px" }} onClick={handleDownloadPDF}>
                    <FaFilePdf style={{ color: "#ef4444" }} /> Download
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
                      <th style={{ width: "160px" }}>STUDENT NAME</th>
                      <th style={{ width: "90px" }}>ROLL NO</th>
                      <th style={{ width: "45px" }}>GRP</th>
                       {hasSections && <th style={{ width: "40px" }}>SEC</th>}
                      <th style={{ width: "60px", textAlign: "center" }}>TOTAL</th>
                      <th style={{ width: "50px", textAlign: "center" }}>MAX</th>
                      <th style={{ width: "65px", textAlign: "center" }}>PERC</th>
                      <th style={{ width: "50px", textAlign: "center" }}>GRADE</th>
                      <th style={{ width: "65px", textAlign: "center" }}>RESULT</th>
                      <th style={{ width: "80px", textAlign: "center" }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStudentResults.length ? (
                      pagedStudentResults.map((r, idx) => (
                        <tr key={r.id || r.studentId}>
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
                              {r.name}
                            </button>
                          </td>

                          <td className="cms-strong">{r.roll}</td>
                           <td>{groupNameFor(r.groupId, r.group)}</td>
                           {hasSections && <td>{r.section}</td>}
                          <td style={{ fontWeight: 700, textAlign: "center" }}>{r.total}</td>
                          <td style={{ opacity: 0.7, textAlign: "center" }}>{r.maximum ?? "—"}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{r.percentage}</td>
                          <td style={{ fontWeight: 700, textAlign: "center", color: r.grade === "F" ? "#dc2626" : "#16a34a" }}>
                            {r.grade}
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span
                              className="cms-badge"
                              style={{
                                background: r.result === "PASS" ? "#dcfce7" : "#fee2e2",
                                color: r.result === "PASS" ? "#15803d" : "#b91c1c",
                                fontWeight: 700,
                                padding: "2px 6px",
                                fontSize: "10px",
                              }}
                            >
                              {r.result === "PASS" ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                  <FaCheck style={{ fontSize: "8px", color: "#15803d" }} /> PASS
                                </span>
                              ) : (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                  <FaTimes style={{ fontSize: "8px", color: "#b91c1c" }} /> FAIL
                                </span>
                              )}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span className="cms-badge cms-badge-active" style={{ padding: "2px 6px", fontSize: "10px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                <FaCheckCircle style={{ fontSize: "8px", color: "#15803d" }} /> Published
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                         <td colSpan={hasSections ? 11 : 10} style={{ textAlign: "center", padding: 12, opacity: 0.7 }}>
                          No student records match search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className="cms-subtitle" style={{ fontSize: "11px" }}>
                  Showing {filteredStudentResults.length ? (pageStudentResults - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(pageStudentResults * pageSize, filteredStudentResults.length)} of {filteredStudentResults.length} entries
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                    disabled={pageStudentResults === 1}
                    onClick={() => setPageStudentResults((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPagesStudentResults }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`cms-btn ${pageStudentResults === p ? "cms-btn-primary" : "cms-btn-ghost"}`}
                      style={{ minWidth: 24, height: "28px", padding: "0 6px", fontSize: "11px" }}
                      onClick={() => setPageStudentResults(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                    disabled={pageStudentResults === totalPagesStudentResults}
                    onClick={() => setPageStudentResults((p) => Math.min(totalPagesStudentResults, p + 1))}
                  >
                    Next
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
