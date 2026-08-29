import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { CheckCircle2, Eye } from "lucide-react";
import "./ResultProcessingPage.css";

const PAGE_SIZE = 5;
const SUBJECT_PAGE_SIZE = 6;

const RESULT_API = {
  boards: "/api/v1/boards",
  academicYears: "/api/v1/academic-years/active",
  academicLevels: "/api/v1/boards/academic-levels",
  groupsByBoard: (boardId) => `/api/v1/groups/board/${boardId}`,
  programsByGroup: (groupId) => `/api/v1/groups/${groupId}/programs`,
  examinations: "/api/v1/examinations",
  generate: "/api/v1/results/generate",
  process: "/api/v1/results/process",
  sectionDetail: (sectionId) => `/api/v1/results/sections/${sectionId}`,
  publishSection: (sectionId) => `/api/v1/results/sections/${sectionId}/publish`,
  publishGroup: "/api/v1/results/publish-group",
  studentMemo: (studentId) => `/api/v1/results/student/${studentId}/memo`,
  studentDetailsFallback: (studentId) => `/api/v1/student-analysis/${studentId}/details`,
  rankList: "/api/v1/results/rank-list",
  analytics: "/api/v1/results/analytics",
  failedStudents: "/api/v1/results/failed-students",
};

const collectionFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  return [];
};

const objectFrom = (data) => {
  const payload = data?.data ?? data?.result ?? data;
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
};

const masterCollectionFrom = (data) => {
  const items = collectionFrom(data);
  if (items.length) return items;
  const item = data?.data ?? data;
  return item && typeof item === "object" && !Array.isArray(item) ? [item] : [];
};

const activeValue = (value) =>
  [true, 1, "1", "true", "active"].includes(
    typeof value === "string" ? value.trim().toLowerCase() : value,
  );
const isActive = (item) => activeValue(item?.isActive ?? item?.status);

const apiError = (error) => getApiErrorMessage(error);

const normalizeBoard = (item) => ({
  id: Number(item.boardId ?? item.id),
  name: item.boardName ?? item.name ?? "",
  code: item.boardCode ?? item.code ?? "",
});
const normalizeYear = (item) => ({
  id: Number(item.academicYearId ?? item.id),
  boardId: item.boardId == null ? null : Number(item.boardId),
  name: item.academicYearName ?? item.name ?? "",
});
const normalizeLevel = (item) => ({
  id: Number(item.academicLevelId ?? item.id),
  name: item.levelName ?? item.academicLevelName ?? item.name ?? "",
});
const normalizeGroup = (item) => ({
  id: Number(item.groupId ?? item.id),
  name: item.groupName ?? item.name ?? "",
  code: item.groupCode ?? item.code ?? "",
});
const normalizeProgram = (item) => ({
  id: Number(item.programId ?? item.id),
  groupProgramId: Number(item.groupProgramId) || null,
  name: item.programName ?? item.name ?? "",
  code: item.programCode ?? item.code ?? "",
  active: activeValue(item.isActive ?? item.status),
});
const normalizeExam = (item) => ({
  id: Number(item.examinationId ?? item.id),
  code: item.examCode ?? item.code ?? "",
  name: item.examName ?? item.name ?? "",
  programName: item.programName ?? "",
  groupId: Number(item.groupId),
  programId: Number(item.programId),
  boardId: Number(item.boardId),
  academicYearId: Number(item.academicYearId),
  academicLevelId: Number(item.academicLevelId),
  totalMarks: Number(item.totalMarks ?? 0),
  passPercentage: Number(item.passPercentage ?? 0),
  status: String(item.status ?? "").toUpperCase(),
});

const normalizeStatus = (value) => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();
  return ["NOT_GENERATED", "GENERATED", "VALIDATED", "PUBLISHED", "FAILED", "STALE"].includes(
    status,
  )
    ? status
    : "UNKNOWN";
};
const numberOrZero = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const normalizeReadiness = (item) => ({
  examinationId: Number(item?.examinationId ?? item?.examId),
  groupId: Number(item?.groupId),
  programId: Number(item?.programId),
  examinationStatus: String(item?.examinationStatus ?? item?.examStatus ?? "")
    .trim()
    .toUpperCase(),
  expectedSectionCount: numberOrZero(item?.expectedSectionCount),
  generatedSectionCount: numberOrZero(item?.generatedSectionCount),
  validSectionCount: numberOrZero(item?.validSectionCount),
  publishedSectionCount: numberOrZero(item?.publishedSectionCount),
  requiredEvaluationCount: numberOrZero(item?.requiredEvaluationCount),
  approvedEvaluationCount: numberOrZero(item?.approvedEvaluationCount ?? item?.approvedCount),
  missingEvaluationCount: numberOrZero(item?.missingEvaluationCount ?? item?.missingCount),
  draftEvaluationCount: numberOrZero(item?.draftEvaluationCount ?? item?.draftCount),
  submittedEvaluationCount: numberOrZero(item?.submittedEvaluationCount ?? item?.submittedCount),
  verifiedEvaluationCount: numberOrZero(item?.verifiedEvaluationCount ?? item?.verifiedCount),
  rejectedEvaluationCount: numberOrZero(item?.rejectedEvaluationCount ?? item?.rejectedCount),
  allRequiredEvaluationsApproved: item?.allRequiredEvaluationsApproved === true,
  allExpectedSectionsGenerated: item?.allExpectedSectionsGenerated === true,
  allExpectedSectionsValid: item?.allExpectedSectionsValid === true,
  readyForGeneration: item?.readyForGeneration === true,
  readyForGroupPublication: item?.readyForGroupPublication === true,
  publicationStatus: normalizeStatus(item?.publicationStatus ?? item?.resultStatus),
  resultBatchId: Number(item?.resultBatchId) || null,
  rowVersion: item?.rowVersion ?? null,
  sections: collectionFrom(item?.sections)
    .map((section) => ({
      ...section,
      sectionId: Number(section.sectionId ?? section.id),
      resultStatus: normalizeStatus(section.resultStatus ?? section.status),
      validationStatus:
        String(section.validationStatus ?? "")
          .trim()
          .toUpperCase() || "UNKNOWN",
    }))
    .filter((section) => section.sectionId > 0),
});
const canGenerate = (item) =>
  Boolean(
    item &&
    item.examinationStatus === "COMPLETED" &&
    item.expectedSectionCount > 0 &&
    item.requiredEvaluationCount > 0 &&
    item.approvedEvaluationCount === item.requiredEvaluationCount &&
    [
      "missingEvaluationCount",
      "draftEvaluationCount",
      "submittedEvaluationCount",
      "verifiedEvaluationCount",
      "rejectedEvaluationCount",
    ].every((key) => item[key] === 0) &&
    item.allRequiredEvaluationsApproved &&
    item.readyForGeneration &&
    item.publicationStatus !== "PUBLISHED",
  );
const canPublishGroup = (item) =>
  Boolean(
    item &&
    item.expectedSectionCount > 0 &&
    item.generatedSectionCount === item.expectedSectionCount &&
    item.validSectionCount === item.expectedSectionCount &&
    item.allExpectedSectionsGenerated &&
    item.allExpectedSectionsValid &&
    item.readyForGroupPublication &&
    item.publicationStatus !== "PUBLISHED",
  );

export default function ResultProcessingPage() {
  const emptyFilters = { board: "", year: "", level: "", group: "", program: "", exam: "" };
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  // Master Data Dropdowns
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [examinations, setExaminations] = useState([]);

  // Result & View States
  const [sectionSummaries, setSectionSummaries] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [sectionId, setSectionId] = useState(null);
  const [selectedSectionDetails, setSelectedSectionDetails] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [selectedStudentMemo, setSelectedStudentMemo] = useState(null);

  // Search & Pagination
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rankPage, setRankPage] = useState(1);
  const [rankFilters, setRankFilters] = useState({ group: "", program: "", section: "", exam: "" });
  const [rankSearch, setRankSearch] = useState("");
  const [rankList, setRankList] = useState([]);

  // Analytics & Modals
  const [analytics, setAnalytics] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [analyticsDetail, setAnalyticsDetail] = useState(null);
  const [toast, setToast] = useState("");
  const [generatingResults, setGeneratingResults] = useState(false);
  const [loadingSectionId, setLoadingSectionId] = useState(null);
  const [loadingStudentId, setLoadingStudentId] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  const toastRef = useRef(null);
  const requests = useRef({
    groups: 0,
    programs: 0,
    exams: 0,
    readiness: 0,
    generate: 0,
    section: 0,
    memo: 0,
    rank: 0,
    analytics: 0,
    sectionAction: 0,
    groupPublish: 0,
  });

  const showToast = useCallback((msg, type = "success") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast(msg);
    toastRef.current = setTimeout(() => setToast(""), 3500);
  }, []);

  useEffect(() => () => toastRef.current && clearTimeout(toastRef.current), []);

  // Initial Master Data Load
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get(RESULT_API.boards),
      apiClient.get(RESULT_API.academicYears),
      apiClient.get(RESULT_API.academicLevels),
    ]).then(([boardRes, yearRes, levelRes]) => {
      if (!active) return;
      if (boardRes.status === "fulfilled")
        setBoards(
          masterCollectionFrom(boardRes.value.data)
            .filter(isActive)
            .map(normalizeBoard)
            .filter((i) => i.id > 0),
        );
      else showToast(apiError(boardRes.reason), "error");

      if (yearRes.status === "fulfilled")
        setAcademicYears(
          masterCollectionFrom(yearRes.value.data)
            .map(normalizeYear)
            .filter((i) => i.id > 0),
        );
      else showToast(apiError(yearRes.reason), "error");

      if (levelRes.status === "fulfilled")
        setAcademicLevels(
          masterCollectionFrom(levelRes.value.data)
            .map(normalizeLevel)
            .filter((i) => i.id > 0),
        );
      else showToast(apiError(levelRes.reason), "error");
    });
    return () => {
      active = false;
    };
  }, [showToast]);

  const clearResults = () => {
    setApplied(null);
    setSectionSummaries([]);
    setReadiness(null);
    setSectionId(null);
    setSelectedSectionDetails(null);
    setStudentId(null);
    setSelectedStudentMemo(null);
    setQuery("");
    setPage(1);
  };

  const loadGroups = async (boardId) => {
    const seq = ++requests.current.groups;
    setGroups([]);
    setPrograms([]);
    setExaminations([]);
    const id = Number(boardId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const res = await apiClient.get(RESULT_API.groupsByBoard(id));
      if (seq !== requests.current.groups) return;
      setGroups(
        collectionFrom(res.data)
          .filter(isActive)
          .map(normalizeGroup)
          .filter((i) => i.id > 0),
      );
    } catch (err) {
      if (seq === requests.current.groups) showToast(apiError(err), "error");
    }
  };

  const loadPrograms = async (groupId) => {
    const seq = ++requests.current.programs;
    setPrograms([]);
    setExaminations([]);
    const id = Number(groupId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const res = await apiClient.get(RESULT_API.programsByGroup(id));
      if (seq !== requests.current.programs) return;
      setPrograms(
        collectionFrom(res.data)
          .map(normalizeProgram)
          .filter((i) => i.id > 0 && i.name && i.active),
      );
    } catch {
      if (seq === requests.current.programs)
        showToast("Unable to load programs for the selected group.", "error");
    }
  };

  const loadExaminations = async (context) => {
    const seq = ++requests.current.exams;
    setExaminations([]);
    if (
      ![context.board, context.year, context.level, context.group, context.program].every(
        (v) => Number(v) > 0,
      )
    )
      return;
    try {
      const res = await apiClient.get(RESULT_API.examinations, {
        params: {
          BoardId: Number(context.board),
          AcademicYearId: Number(context.year),
          AcademicLevelId: Number(context.level),
          GroupId: Number(context.group),
          ProgramId: Number(context.program),
          Status: "COMPLETED",
        },
      });
      if (seq !== requests.current.exams) return;
      setExaminations(
        collectionFrom(res.data)
          .map(normalizeExam)
          .filter(
            (i) =>
              i.id > 0 &&
              i.status === "COMPLETED" &&
              (!i.boardId || i.boardId === Number(context.board)) &&
              (!i.academicYearId || i.academicYearId === Number(context.year)) &&
              (!i.academicLevelId || i.academicLevelId === Number(context.level)) &&
              i.groupId === Number(context.group) &&
              i.programId === Number(context.program),
          ),
      );
    } catch (err) {
      if (seq === requests.current.exams) showToast(apiError(err), "error");
    }
  };

  const contextParams = (context) => ({
    boardId: Number(context.board),
    academicYearId: Number(context.year),
    academicLevelId: Number(context.level),
    groupId: Number(context.group),
    programId: Number(context.program),
    examinationId: Number(context.exam),
  });

  const loadReadiness = async (context, quiet = false) => {
    const seq = ++requests.current.readiness;
    try {
      const res = await apiClient.get(RESULT_API.process, { params: contextParams(context) });
      if (seq !== requests.current.readiness) return null;
      const root = objectFrom(res.data);
      const source = objectFrom(root?.readiness) ?? root;
      const next = source ? normalizeReadiness(source) : null;
      const matches =
        next &&
        next.examinationId === Number(context.exam) &&
        next.groupId === Number(context.group) &&
        next.programId === Number(context.program);
      if (!matches)
        throw new Error("Result readiness did not match the selected academic context.");
      setReadiness(next);
      setSectionSummaries(next.sections);
      return next;
    } catch (err) {
      if (seq === requests.current.readiness) {
        setReadiness(null);
        setSectionSummaries([]);
        if (!quiet) showToast(apiError(err), "error");
      }
      return null;
    }
  };

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === "board") Object.assign(next, { group: "", program: "", exam: "" });
    if (key === "year" || key === "level") next.exam = "";
    if (key === "group") Object.assign(next, { program: "", exam: "" });
    if (key === "program") next.exam = "";
    setFilters(next);
    clearResults();

    if (key === "board") loadGroups(value);
    if (key === "group") loadPrograms(value);
    if (
      ["year", "level", "program"].includes(key) &&
      [next.board, next.year, next.level, next.group, next.program].every(
        (item) => Number(item) > 0,
      )
    ) {
      loadExaminations(next);
    }
  };

  const generateResults = async () => {
    if (generatingResults) return;
    if (!Object.values(filters).every(Boolean))
      return showToast("Select all required result filters.", "error");
    const seq = ++requests.current.generate;
    setGeneratingResults(true);
    try {
      const latest = await loadReadiness(filters, true);
      if (seq !== requests.current.generate) return;
      if (!canGenerate(latest)) {
        const pending = latest
          ? latest.requiredEvaluationCount - latest.approvedEvaluationCount
          : 0;
        return showToast(
          latest?.publicationStatus === "PUBLISHED"
            ? "Published results cannot be regenerated."
            : `Results are not ready: all required evaluations must be approved${pending > 0 ? ` (${pending} pending)` : ""}.`,
          "error",
        );
      }
      const payload = contextParams(filters);
      if (latest.rowVersion != null) payload.rowVersion = latest.rowVersion;
      const res = await apiClient.post(RESULT_API.generate, payload);
      if (seq !== requests.current.generate) return;
      setApplied({ ...filters });
      setViewMode("table");
      setSectionId(null);
      setStudentId(null);
      setPage(1);
      const refreshed = await loadReadiness(filters, true);
      if (!refreshed) {
        const root = objectFrom(res.data);
        setSectionSummaries(collectionFrom(root?.sections ?? res.data));
      }
      showToast("Results generated successfully.");
    } catch (err) {
      if (seq === requests.current.generate) {
        showToast(apiError(err), "error");
        if (err?.response?.status === 409) await loadReadiness(filters, true);
      }
    } finally {
      if (seq === requests.current.generate) setGeneratingResults(false);
    }
  };

  const loadSectionDetails = async (secId) => {
    if (loadingSectionId !== null) return;
    const seq = ++requests.current.section;
    setSectionId(secId);
    setSelectedSectionDetails(null);
    setPage(1);
    setLoadingSectionId(secId);
    try {
      const res = await apiClient.get(RESULT_API.sectionDetail(secId), {
        params: contextParams(applied),
      });
      if (seq !== requests.current.section) return;
      const details = objectFrom(res.data);
      const returnedSectionId = Number(details?.sectionId ?? details?.id);
      const contextMatches =
        details &&
        returnedSectionId === Number(secId) &&
        Number(details.examinationId ?? details.examId) === Number(applied.exam) &&
        Number(details.groupId) === Number(applied.group) &&
        Number(details.programId) === Number(applied.program);
      if (!contextMatches)
        throw new Error("Section results did not match the selected academic context.");
      setSelectedSectionDetails(details);
    } catch (err) {
      if (seq === requests.current.section) {
        setSectionId(null);
        showToast(apiError(err), "error");
      }
    } finally {
      if (seq === requests.current.section) setLoadingSectionId(null);
    }
  };

  const loadStudentMemo = async (student) => {
    const sId = typeof student === "object" ? student.studentId : student;
    if (loadingStudentId !== null) return;
    const seq = ++requests.current.memo;
    setStudentId(sId);
    setSelectedStudentMemo(null);
    setLoadingStudentId(sId);
    try {
      const memoContext = applied ?? {
        exam: rankFilters.exam,
        group: rankFilters.group,
        program: rankFilters.program,
      };
      const res = await apiClient.get(RESULT_API.studentMemo(sId), {
        params: {
          examinationId: Number(memoContext.exam),
          groupId: Number(memoContext.group),
          programId: Number(memoContext.program),
          sectionId: Number(student?.sectionId) || undefined,
        },
      });
      if (seq !== requests.current.memo) return;
      const memo = objectFrom(res.data);
      const memoExamId = Number(memo?.examinationId ?? memo?.examId);
      if (
        !memo ||
        Number(memo.studentId ?? sId) !== Number(sId) ||
        memoExamId !== Number(memoContext.exam) ||
        normalizeStatus(memo.publicationStatus ?? memo.resultStatus ?? memo.status) !== "PUBLISHED"
      ) {
        throw new Error(
          "Only a published memo matching the selected result context can be opened.",
        );
      }
      setSelectedStudentMemo(memo);
    } catch (err) {
      if (seq === requests.current.memo) {
        setStudentId(null);
        showToast(apiError(err), "error");
      }
    } finally {
      if (seq === requests.current.memo) setLoadingStudentId(null);
    }
  };

  const loadRankList = async () => {
    const seq = ++requests.current.rank;
    if (!applied) {
      setRankList([]);
      return;
    }
    try {
      const res = await apiClient.get(RESULT_API.rankList, {
        params: {
          boardId: applied?.board ? Number(applied.board) : undefined,
          academicYearId: applied?.year ? Number(applied.year) : undefined,
          academicLevelId: applied?.level ? Number(applied.level) : undefined,
          groupId: rankFilters.group ? Number(rankFilters.group) : undefined,
          programId: rankFilters.program ? Number(rankFilters.program) : Number(applied.program),
          sectionId: rankFilters.section ? Number(rankFilters.section) : undefined,
          examId: rankFilters.exam
            ? Number(rankFilters.exam)
            : applied?.exam
              ? Number(applied.exam)
              : undefined,
          search: rankSearch.trim() || undefined,
        },
      });
      if (seq !== requests.current.rank) return;
      setRankList(collectionFrom(res.data));
    } catch (err) {
      if (seq === requests.current.rank) showToast(apiError(err), "error");
    }
  };

  const loadAnalytics = async () => {
    const seq = ++requests.current.analytics;
    if (!applied) {
      setAnalytics(null);
      return;
    }
    try {
      const res = await apiClient.get(RESULT_API.analytics, {
        params: {
          boardId: applied?.board ? Number(applied.board) : undefined,
          academicYearId: applied?.year ? Number(applied.year) : undefined,
          academicLevelId: applied?.level ? Number(applied.level) : undefined,
          groupId: applied?.group ? Number(applied.group) : undefined,
          programId: applied?.program ? Number(applied.program) : undefined,
          examId: applied?.exam ? Number(applied.exam) : undefined,
        },
      });
      if (seq !== requests.current.analytics) return;
      setAnalytics(res.data?.data ?? res.data);
    } catch (err) {
      if (seq === requests.current.analytics) showToast(apiError(err), "error");
    }
  };

  useEffect(() => {
    if (viewMode === "rankList") loadRankList();
    if (viewMode === "analytics") loadAnalytics();
  }, [viewMode, rankFilters, rankSearch]);

  const currentExam = examinations.find((i) => String(i.id) === String(applied?.exam));

  const publishSection = (summary) => {
    showToast(
      "Section publication is disabled because it could expose a partial result set. Use Group publication after every Section is valid.",
      "error",
    );
  };

  const publishGroup = () => {
    if (!canPublishGroup(readiness))
      return showToast(
        "Every expected Section must be generated and valid before Group publication.",
        "error",
      );
    setConfirm({ type: "group", generated: readiness.sections });
  };

  const confirmPublish = async () => {
    if (!confirm || actionLoading) return;
    setActionLoading("PUBLISH");
    try {
      if (confirm.type === "section")
        throw new Error("Partial Section publication is not permitted.");
      const latest = await loadReadiness(applied, true);
      if (!canPublishGroup(latest))
        throw new Error(
          "Result readiness changed. Every expected Section must be generated and valid.",
        );
      const payload = {
        examinationId: Number(applied.exam),
        groupId: Number(applied.group),
        programId: Number(applied.program),
      };
      if (latest.resultBatchId) payload.resultBatchId = latest.resultBatchId;
      if (latest.rowVersion != null) payload.rowVersion = latest.rowVersion;
      await apiClient.post(RESULT_API.publishGroup, payload);
      showToast("Group results published successfully.");
      setConfirm(null);
      await loadReadiness(applied, true);
      await Promise.all([loadRankList(), loadAnalytics()]);
    } catch (err) {
      showToast(apiError(err), "error");
      if (err?.response?.status === 409) await loadReadiness(applied, true);
    } finally {
      setActionLoading("");
    }
  };

  // Section Detail Rows Filtering & Pagination
  const rawStudents = selectedSectionDetails?.students ?? selectedSectionDetails?.studentRows ?? [];
  const sectionStudents = rawStudents
    .filter((item) =>
      `${item.studentName} ${item.rollNo} ${item.grade} ${item.result}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.sectionRank || a.rank || 0) - (b.sectionRank || b.rank || 0));
  const totalPages = Math.max(1, Math.ceil(sectionStudents.length / PAGE_SIZE));
  const pagedStudents = sectionStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Rank List Pagination
  const rankPages = Math.max(1, Math.ceil(rankList.length / PAGE_SIZE));
  const pagedRanks = rankList.slice((rankPage - 1) * PAGE_SIZE, rankPage * PAGE_SIZE);

  // Exports
  const exportRows = (rows) =>
    rows.map((item) => ({
      Roll: item.rollNo || item.rollNumber,
      Student: item.studentName,
      Section: item.sectionName || item.section,
      Total: item.total || item.totalMarks,
      Maximum: item.maximum || item.maxMarks,
      Percentage: Number(item.percentage || 0).toFixed(2),
      Grade: item.grade,
      Result: item.result,
      "Section Rank": item.sectionRank || item.rank || "—",
      Status: item.status || item.resultStatus,
    }));

  const exportExcel = (rows, filename) => {
    const sheet = XLSX.utils.json_to_sheet(exportRows(rows));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Results");
    XLSX.writeFile(book, `${filename}.xlsx`);
  };

  const exportPdf = (rows, filename) => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text(filename, 14, 14);
    const data = exportRows(rows);
    const headers = Object.keys(data[0] || {});
    autoTable(doc, {
      head: [headers],
      body: data.map((item) => headers.map((key) => item[key])),
      startY: 20,
    });
    doc.save(`${filename}.pdf`);
  };

  const renderSelectOptions = (items) =>
    items.map((i) => (
      <option key={i.id} value={i.id}>
        {i.name}
      </option>
    ));

  return (
    <DashboardLayout
      title="Results Management"
      subtitle="Generate, publish and analyze approved examination results"
      breadcrumb={["Results"]}
    >
      <div className="results-page">
        {toast && <Toast message={toast} onClose={() => setToast("")} />}

        <div className="cms-card">
          <div className="cms-card-body">
            <div className="results-view-tabs" role="tablist" aria-label="Results views">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "table"}
                className={`results-view-tab ${viewMode === "table" ? "results-view-tab-active" : ""}`}
                onClick={() => {
                  setViewMode("table");
                  setStudentId(null);
                  setSelectedStudentMemo(null);
                }}
              >
                Results
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "rankList"}
                className={`results-view-tab ${viewMode === "rankList" ? "results-view-tab-active" : ""}`}
                onClick={() => {
                  setViewMode("rankList");
                  setStudentId(null);
                  setSelectedStudentMemo(null);
                }}
              >
                Rank List
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "analytics"}
                className={`results-view-tab ${viewMode === "analytics" ? "results-view-tab-active" : ""}`}
                onClick={() => {
                  setViewMode("analytics");
                  setStudentId(null);
                  setSelectedStudentMemo(null);
                }}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        {viewMode === "table" && !studentId && (
          <div className="cms-card">
            <div className="cms-card-body">
              <div className="results-filter-grid">
                <Select
                  label="Board"
                  value={filters.board}
                  onChange={(v) => changeFilter("board", v)}
                >
                  {renderSelectOptions(boards)}
                </Select>
                <Select
                  label="Academic Year"
                  value={filters.year}
                  onChange={(v) => changeFilter("year", v)}
                >
                  {renderSelectOptions(
                    academicYears.filter(
                      (i) => i.boardId == null || Number(i.boardId) === Number(filters.board),
                    ),
                  )}
                </Select>
                <Select
                  label="Academic Level"
                  value={filters.level}
                  onChange={(v) => changeFilter("level", v)}
                >
                  {renderSelectOptions(academicLevels)}
                </Select>
                <Select
                  label="Group"
                  value={filters.group}
                  onChange={(v) => changeFilter("group", v)}
                >
                  {renderSelectOptions(groups)}
                </Select>
                <Select
                  label="Program"
                  value={filters.program}
                  onChange={(v) => changeFilter("program", v)}
                >
                  {renderSelectOptions(programs)}
                </Select>
                <Select
                  label="Examination"
                  value={filters.exam}
                  onChange={(v) => changeFilter("exam", v)}
                >
                  {renderSelectOptions(examinations)}
                </Select>
                <button
                  className="cms-btn cms-btn-primary results-generate-btn"
                  disabled={generatingResults}
                  onClick={generateResults}
                >
                  {generatingResults ? "Generating..." : "Generate Results"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedStudentMemo ? (
          <Memo
            student={selectedStudentMemo}
            exam={currentExam}
            onBack={() => {
              setStudentId(null);
              setSelectedStudentMemo(null);
            }}
          />
        ) : viewMode === "table" && applied ? (
          selectedSectionDetails ? (
            <SectionView
              details={selectedSectionDetails}
              exam={currentExam}
              rows={pagedStudents}
              query={query}
              setQuery={(v) => {
                setQuery(v);
                setPage(1);
              }}
              page={page}
              pages={totalPages}
              setPage={setPage}
              onBack={() => {
                setSectionId(null);
                setSelectedSectionDetails(null);
                setPage(1);
              }}
              onStudent={loadStudentMemo}
              loadingStudentId={loadingStudentId}
              onExcel={() =>
                exportExcel(
                  rawStudents,
                  `${currentExam?.name || "Results"}-${selectedSectionDetails.sectionName || "Section"}`,
                )
              }
              onPdf={() =>
                exportPdf(
                  rawStudents,
                  `${currentExam?.name || "Results"}-${selectedSectionDetails.sectionName || "Section"}`,
                )
              }
            />
          ) : (
            <Sections
              summaries={sectionSummaries.filter((i) =>
                (i.name || i.sectionName || "").toLowerCase().includes(query.toLowerCase()),
              )}
              exam={currentExam}
              query={query}
              setQuery={setQuery}
              onView={(id) => loadSectionDetails(id)}
              loadingSectionId={loadingSectionId}
              onPublish={publishSection}
              onGroup={publishGroup}
              groupPublishReady={canPublishGroup(readiness)}
              onExcel={() =>
                exportExcel(
                  sectionSummaries.flatMap((s) => s.studentRows || []),
                  `${currentExam?.name || "Results"}-Group`,
                )
              }
              onPdf={() =>
                exportPdf(
                  sectionSummaries.flatMap((s) => s.studentRows || []),
                  `${currentExam?.name || "Results"}-Group`,
                )
              }
            />
          )
        ) : null}

        {viewMode === "rankList" && !selectedStudentMemo && (
          <RankList
            rows={pagedRanks}
            filters={rankFilters}
            setFilters={(v) => {
              setRankFilters(v);
              setRankPage(1);
            }}
            search={rankSearch}
            setSearch={(v) => {
              setRankSearch(v);
              setRankPage(1);
            }}
            page={rankPage}
            pages={rankPages}
            setPage={setRankPage}
            groups={groups}
            programs={programs}
            examinations={examinations}
            onStudent={loadStudentMemo}
            loadingStudentId={loadingStudentId}
            onGroupChange={loadPrograms}
            onProgramChange={(next) =>
              loadExaminations({
                board: applied?.board,
                year: applied?.year,
                level: applied?.level,
                group: next.group,
                program: next.program,
              })
            }
            onExport={() => exportExcel(rankList, "Rank-List")}
          />
        )}

        {viewMode === "analytics" && !selectedStudentMemo && (
          <Analytics data={analytics} onOpen={() => setAnalyticsDetail("failed")} />
        )}

        {confirm && (
          <Confirm
            confirm={confirm}
            exam={currentExam}
            onCancel={() => setConfirm(null)}
            onConfirm={confirmPublish}
            loading={Boolean(actionLoading)}
          />
        )}

        {analyticsDetail === "failed" && (
          <AnalyticsModal
            rows={analytics?.failedStudents || []}
            onClose={() => setAnalyticsDetail(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Select({ label, value, disabled, onChange, children, showLabel = true }) {
  return (
    <div className="cms-field-group">
      {showLabel && <label className="cms-label">{label}</label>}
      <select
        className="cms-select"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {children}
      </select>
    </div>
  );
}

function Sections({
  summaries,
  exam,
  query,
  setQuery,
  onView,
  loadingSectionId,
  onPublish,
  onGroup,
  groupPublishReady,
  onExcel,
  onPdf,
}) {
  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <h3 className="cms-card-title">Section Results</h3>
        <p className="cms-subtitle">
          {exam?.name} · {exam?.programName}
        </p>
        <div className="results-table-toolbar">
          <div className="results-table-search">
            <input
              className="cms-input"
              placeholder="Search Section..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="results-table-actions">
            <button className="cms-btn cms-btn-ghost" onClick={onExcel}>
              Export Excel
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={onPdf}>
              Export PDF
            </button>
            {summaries.length > 0 && (
              <button
                className="cms-btn cms-btn-primary"
                disabled={!groupPublishReady}
                onClick={onGroup}
              >
                Publish Group Results
              </button>
            )}
          </div>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>SECTION</th>
                <th>IN-CHARGE</th>
                <th>STUDENTS</th>
                <th>PASSED</th>
                <th>FAILED</th>
                <th>PASS %</th>
                <th>AVERAGE %</th>
                <th>RESULT STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length ? (
                summaries.map((item) => {
                  const secId = item.sectionId || item.id;
                  const secName = item.sectionName || item.name || item.section;
                  const status = normalizeStatus(item.resultStatus || item.status);
                  const passRate = Number(item.passRate ?? item.passPercentage ?? 0);
                  const avg = Number(item.average ?? item.averagePercentage ?? 0);
                  return (
                    <tr key={secId}>
                      <td className="cms-font-semibold">{secName}</td>
                      <td>{item.inChargeName || item.inCharge || "—"}</td>
                      <td className="cms-text-center">
                        {item.count ?? item.studentsCount ?? item.students ?? 0}
                      </td>
                      <td className="cms-text-center">{item.passed ?? 0}</td>
                      <td className="cms-text-center">{item.failed ?? 0}</td>
                      <td className="cms-text-center">{passRate.toFixed(2)}%</td>
                      <td className="cms-text-center">{avg.toFixed(2)}%</td>
                      <td className="cms-text-center">
                        <Badge value={status} />
                      </td>
                      <td className="cms-text-center">
                        <div className="results-actions">
                          <button
                            className="results-action-btn"
                            title="View Section"
                            aria-label="View Section"
                            disabled={loadingSectionId === secId}
                            onClick={() => onView(secId)}
                          >
                            <Eye size={15} />
                          </button>
                          {status === "GENERATED" && (
                            <button
                              className="results-action-btn"
                              title="Publish Section Results"
                              aria-label="Publish Section Results"
                              onClick={() => onPublish(item)}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="cms-empty-td">
                    No generated section results available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SectionView({
  details,
  exam,
  rows,
  query,
  setQuery,
  page,
  pages,
  setPage,
  onBack,
  onStudent,
  loadingStudentId,
  onExcel,
  onPdf,
}) {
  const subjects = details?.subjectDefinitions ?? [];
  return (
    <div className="cms-card results-section-detail">
      <div className="cms-card-body">
        <button className="cms-btn cms-btn-ghost" onClick={onBack}>
          ← Back to Sections
        </button>
        <div className="results-detail-context">
          <strong>{exam?.name || details?.examName}</strong>
          <span>
            {details?.groupName} · {details?.programName} ·{" "}
            {details?.sectionName || details?.section} · {details?.inChargeName} ·{" "}
            {details?.totalStudents ?? rows.length} Students · {details?.resultStatus}
          </span>
        </div>
        <div className="results-table-toolbar">
          <div className="results-table-search">
            <input
              className="cms-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, roll, grade, result..."
            />
          </div>
          <div className="results-table-actions">
            <button className="cms-btn cms-btn-ghost" onClick={onExcel}>
              Export Excel
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={onPdf}>
              Export PDF
            </button>
          </div>
        </div>
        <div className="cms-table-wrap results-section-table-wrap">
          <table className="cms-table results-section-table">
            <thead>
              <tr>
                <th>ROLL NO</th>
                <th>STUDENT</th>
                {subjects.map((sub) => (
                  <th key={sub.subjectId}>{sub.subjectName || sub.shortName}</th>
                ))}
                <th>TOTAL / EXAM TOTAL</th>
                <th>PERCENTAGE</th>
                <th>GRADE</th>
                <th>RESULT</th>
                <th>RANK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((item) => (
                  <tr key={item.studentId}>
                    <td>{item.rollNo || item.rollNumber}</td>
                    <td>{item.studentName}</td>
                    {subjects.map((sub) => {
                      const markObj = item.subjects?.find(
                        (s) => String(s.subjectId) === String(sub.subjectId),
                      );
                      const markVal = markObj ? (markObj.totalMarks ?? markObj.obtainedMarks) : "—";
                      return (
                        <td className="cms-text-center" key={sub.subjectId}>
                          {markVal}
                        </td>
                      );
                    })}
                    <td className="cms-text-center">
                      {item.total ?? item.totalMarks} / {item.maximum ?? item.maxMarks}
                    </td>
                    <td className="cms-text-center">{Number(item.percentage || 0).toFixed(2)}%</td>
                    <td className="cms-text-center">{item.grade}</td>
                    <td className="cms-text-center">{item.result}</td>
                    <td className="cms-text-center">#{item.sectionRank || item.rank || "—"}</td>
                    <td className="cms-text-center">
                      <Badge value={item.status || details?.resultStatus} />
                    </td>
                    <td className="cms-text-center">
                      <div className="results-actions">
                        <button
                          className="results-action-btn"
                          title="View Student"
                          aria-label="View Student"
                          disabled={loadingStudentId === item.studentId}
                          onClick={() => onStudent(item)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9 + subjects.length} className="cms-empty-td">
                    No student result records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} setPage={setPage} />
      </div>
    </div>
  );
}

function Memo({ student, exam, onBack }) {
  const objective =
    ["COMBINED", "COMBINED_OBJECTIVE"].includes(String(exam?.scheduleMode).toUpperCase()) ||
    String(exam?.examType).toLowerCase() === "objective";
  const subjects = student?.subjects ?? [];
  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <button className="cms-btn cms-btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h3 className="cms-card-title">Student Marks Memo</h3>
        <p className="cms-subtitle">
          {student?.studentName} · {student?.rollNo || student?.rollNumber} ·{" "}
          {exam?.name || student?.examName}
        </p>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>SUBJECT</th>
                {objective ? (
                  <>
                    <th>OBTAINED</th>
                    <th>MAX</th>
                    <th>PERCENTAGE</th>
                    <th>GRADE</th>
                  </>
                ) : (
                  <>
                    <th>INTERNAL</th>
                    <th>PRACTICAL</th>
                    <th>THEORY</th>
                    <th>TOTAL</th>
                    <th>GRADE</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub) => {
                const mark = sub.totalMarks ?? sub.obtainedMarks ?? sub.total ?? 0;
                const max = sub.maxMarks ?? sub.maximumMarks;
                const calculated = Number(max) > 0 ? (Number(mark) / Number(max)) * 100 : null;
                const percent = Number.isFinite(Number(sub.percentage))
                  ? Number(sub.percentage)
                  : calculated;
                return (
                  <tr key={sub.subjectId}>
                    <td>{sub.subjectName}</td>
                    {objective ? (
                      <>
                        <td className="cms-text-center">{sub.obtainedMarks ?? mark}</td>
                        <td className="cms-text-center">{max}</td>
                        <td className="cms-text-center">
                          {Number.isFinite(percent) ? `${percent.toFixed(2)}%` : "â€”"}
                        </td>
                        <td className="cms-text-center">{sub.grade || "â€”"}</td>
                      </>
                    ) : (
                      <>
                        <td className="cms-text-center">
                          {sub.internalMarks ?? sub.internal ?? "—"}
                        </td>
                        <td className="cms-text-center">
                          {sub.practicalMarks ?? sub.practical ?? "—"}
                        </td>
                        <td className="cms-text-center">{sub.theoryMarks ?? sub.theory ?? "—"}</td>
                        <td className="cms-text-center">{mark}</td>
                        <td className="cms-text-center">{sub.grade || "â€”"}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="cms-memo-summary">
          <Summary
            label="Grand Total / Maximum"
            value={`${student.grandTotal ?? student.total ?? 0} / ${student.maximumMarks ?? student.maximum ?? 0}`}
          />
          <Summary label="Percentage" value={`${Number(student.percentage || 0).toFixed(2)}%`} />
          <Summary
            label="Pass Percentage"
            value={`${student.passPercentage ?? exam?.passPercentage ?? 35}%`}
          />
          <Summary label="Overall Grade" value={student.overallGrade || student.grade} />
          <Summary label="Final Result" value={student.finalResult || student.result} />
          <Summary label="Section Rank" value={`#${student.sectionRank || student.rank || "—"}`} />
          <Summary label="Group Rank" value={`#${student.groupRank || "—"}`} />
          <Summary
            label="Publication Status"
            value={normalizeStatus(
              student.publicationStatus || student.resultStatus || student.status,
            )}
          />
        </div>
      </div>
    </div>
  );
}

function RankList({
  rows,
  filters,
  setFilters,
  search,
  setSearch,
  page,
  pages,
  setPage,
  groups,
  programs,
  examinations,
  onStudent,
  loadingStudentId,
  onGroupChange,
  onProgramChange,
  onExport,
}) {
  const update = (key, val) => {
    const next = {
      ...filters,
      [key]: val,
      ...(key === "group"
        ? { program: "", section: "", exam: "" }
        : key === "program"
          ? { section: "", exam: "" }
          : {}),
    };
    setFilters(next);
    if (key === "group") onGroupChange(val);
    if (key === "program") onProgramChange(next);
  };

  return (
    <div className="cms-card results-rank-card">
      <div className="results-rank-toolbar">
        <div className="results-rank-search">
          <input
            className="cms-input"
            placeholder="Search student or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          label="Group"
          showLabel={false}
          value={filters.group}
          onChange={(v) => update("group", v)}
        >
          {groups.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <Select
          label="Program"
          showLabel={false}
          value={filters.program}
          onChange={(v) => update("program", v)}
        >
          {programs.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <Select
          label="Examination"
          showLabel={false}
          value={filters.exam}
          onChange={(v) => update("exam", v)}
        >
          {examinations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <div className="results-rank-toolbar-spacer" />
        <button className="cms-btn cms-btn-ghost" onClick={onExport}>
          Export Rank List
        </button>
      </div>
      <div className="cms-table-wrap results-rank-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>ROLL</th>
              <th>STUDENT</th>
              <th>GROUP</th>
              <th>PROGRAM</th>
              <th>SECTION</th>
              <th>TOTAL</th>
              <th>PERCENTAGE</th>
              <th>GRADE</th>
              <th>RESULT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, idx) => (
                <tr key={`${item.examId || item.examinationId}-${item.studentId}-${idx}`}>
                  <td className="cms-font-semibold">#{item.rank || idx + 1}</td>
                  <td>{item.rollNo || item.rollNumber}</td>
                  <td>{item.studentName || item.student}</td>
                  <td>{item.groupName || item.group}</td>
                  <td>{item.programName || item.program}</td>
                  <td>{item.sectionName || item.section}</td>
                  <td className="cms-text-center">{item.total ?? item.totalMarks}</td>
                  <td className="cms-text-center">{Number(item.percentage || 0).toFixed(2)}%</td>
                  <td className="cms-text-center">{item.grade}</td>
                  <td className="cms-text-center">{item.result}</td>
                  <td className="cms-text-center">
                    <div className="results-actions">
                      <button
                        className="results-action-btn"
                        title="View Student"
                        aria-label="View Student"
                        disabled={loadingStudentId === item.studentId}
                        onClick={() => onStudent(item)}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="cms-empty-td">
                  No rank list records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} setPage={setPage} />
    </div>
  );
}

function Analytics({ data, onOpen }) {
  const [subjectPage, setSubjectPage] = useState(1);
  const cards = [
    ["TOTAL STUDENTS", data?.totalStudents ?? data?.total ?? 0, "total"],
    ["PASSED", data?.passed ?? 0, "passed"],
    ["FAILED", data?.failed ?? 0, "failed"],
    [
      "AVERAGE %",
      `${Number(data?.averagePercentage ?? data?.average ?? 0).toFixed(2)}%`,
      "average",
    ],
    ["PASS %", `${Number(data?.passPercentage ?? data?.pass ?? 0).toFixed(2)}%`, "pass"],
  ];
  const subjectPerformance = data?.subjectPerformance ?? [];
  const subjectPages = Math.max(1, Math.ceil(subjectPerformance.length / SUBJECT_PAGE_SIZE));
  const currentSubjectPage = Math.min(subjectPage, subjectPages);
  const pagedSubjects = subjectPerformance.slice(
    (currentSubjectPage - 1) * SUBJECT_PAGE_SIZE,
    currentSubjectPage * SUBJECT_PAGE_SIZE,
  );

  return (
    <div>
      <div className="results-analytics-grid">
        {cards.map(([label, value, key]) =>
          key === "failed" ? (
            <button
              type="button"
              className="results-analytics-card results-analytics-card-button"
              key={key}
              onClick={onOpen}
            >
              <span>{label}</span>
              <strong>{value}</strong>
            </button>
          ) : (
            <div className="results-analytics-card" key={key}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ),
        )}
      </div>
      <div className="cms-card">
        <div className="cms-card-body">
          <h3 className="cms-card-title">Subject Performance</h3>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>SUBJECT</th>
                  <th>STUDENTS</th>
                  <th>AVERAGE</th>
                  <th>HIGHEST</th>
                  <th>LOWEST</th>
                  <th>PASS %</th>
                </tr>
              </thead>
              <tbody>
                {pagedSubjects.length ? (
                  pagedSubjects.map((sub) => (
                    <tr key={sub.subjectId}>
                      <td>{sub.subjectName}</td>
                      <td className="cms-text-center">{sub.students}</td>
                      <td className="cms-text-center">{Number(sub.average || 0).toFixed(2)}%</td>
                      <td className="cms-text-center">{sub.highest}</td>
                      <td className="cms-text-center">{sub.lowest}</td>
                      <td className="cms-text-center">
                        {Number(sub.passPercentage || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="cms-empty-td">
                      No subject analytics data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {subjectPages > 1 && (
            <Pagination page={currentSubjectPage} pages={subjectPages} setPage={setSubjectPage} />
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsModal({ rows, onClose }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="cms-modal-overlay results-analytics-overlay" onClick={onClose}>
      <div
        className="cms-modal-content results-analytics-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cms-modal-header">
          <h3 className="cms-modal-title">Failed Students</h3>
          <button className="cms-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cms-modal-body">
          {rows.length === 0 ? (
            <p className="results-analytics-empty">
              All students are passed. No failed students found.
            </p>
          ) : (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>STUDENT</th>
                      <th>SECTION</th>
                      <th>PERCENTAGE</th>
                      <th>RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((item, idx) => (
                      <tr key={`${item.studentId}-${idx}`}>
                        <td>{item.studentName}</td>
                        <td>{item.sectionName || item.section}</td>
                        <td className="cms-text-center">
                          {Number(item.percentage || 0).toFixed(2)}%
                        </td>
                        <td className="cms-text-center">{item.result || "FAIL"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pages={pages} setPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Confirm({ confirm, exam, onCancel, onConfirm, loading }) {
  const section = confirm.summary;
  const count =
    confirm.type === "section"
      ? (section?.count ?? section?.studentsCount ?? 0)
      : confirm.generated?.reduce((s, i) => s + (i.count ?? i.studentsCount ?? 0), 0);

  return (
    <div className="cms-modal-overlay">
      <div className="cms-modal-content results-publish-modal">
        <div className="cms-modal-header">
          <h3 className="cms-modal-title">
            {confirm.type === "section" ? "Publish Section Results?" : "Publish Group Results"}
          </h3>
          <button className="cms-modal-close" disabled={loading} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="cms-modal-body">
          <p>
            Exam: <strong>{exam?.name || "Selected Examination"}</strong>
            <br />
            {confirm.type === "section" ? (
              <>
                Section: <strong>{section?.sectionName || section?.name}</strong>
                <br />
              </>
            ) : (
              <>
                Sections: <strong>{confirm.generated.length}</strong>
                <br />
              </>
            )}
            Total Students: <strong>{count}</strong>
          </p>
        </div>
        <div className="cms-modal-footer">
          <button className="cms-btn cms-btn-secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={onConfirm}>
            {loading ? "Publishing..." : "Publish Results"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, pages, setPage }) {
  return (
    <div className="results-pagination">
      <button
        className="cms-btn cms-btn-ghost"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span className="results-page-label">
        Page {page} of {pages}
      </span>
      <button
        className="cms-btn cms-btn-ghost"
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

function Badge({ value }) {
  const val = normalizeStatus(value);
  const cls = val === "PUBLISHED" ? "results-status-published" : "results-status-generated";
  return <span className={`results-status ${cls}`}>{val}</span>;
}

function Summary({ label, value }) {
  return (
    <div>
      <div className="cms-summary-label">{label}</div>
      <div className="cms-summary-val">{value}</div>
    </div>
  );
}
