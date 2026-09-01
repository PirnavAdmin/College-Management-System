import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Eye } from "lucide-react";
import "./ResultProcessingPage.css";

const PAGE_SIZE = 5;
const SUBJECT_PAGE_SIZE = 6;

const RESULT_API = {
  boards: apiEndpoints.boards.list,
  academicYears: apiEndpoints.academicYears.active,
  academicLevels: apiEndpoints.boards.academicLevels,
  groupsByBoard: apiEndpoints.groups.getByBoard,
  programsByGroup: apiEndpoints.groups.programs,
  examinations: apiEndpoints.examinations.getAll,
  generate: "/api/v1/results/generate",
  resultsList: "/api/v1/results",
  readiness: "/api/v1/results/readiness",
  sectionDetail: (sectionId) => `/api/v1/results/sections/${sectionId}`,
  publishGroup: "/api/v1/results/publish-group",
  studentMemo: (studentId) => `/api/v1/results/student/${studentId}/memo`,
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
const isActive = (item) => activeValue(item?.isActive ?? item?.status ?? true);

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
  boardId: Number(item.boardId) || null,
  name: item.groupName ?? item.name ?? "",
  code: item.groupCode ?? item.code ?? "",
});
const normalizeProgram = (item) => ({
  id: Number(item.programId ?? item.id),
  groupId: Number(item.groupId) || null,
  groupProgramId: Number(item.groupProgramId) || null,
  name: item.programName ?? item.name ?? "",
  code: item.programCode ?? item.code ?? "",
  active: activeValue(item.isActive ?? item.status ?? true),
});
const normalizeExam = (item) => ({
  id: Number(item.examinationId ?? item.examId ?? item.id),
  code: item.examCode ?? item.code ?? "",
  name: item.examName ?? item.name ?? "",
  programName: item.programName ?? "",
  groupId: item.groupId != null ? Number(item.groupId) : null,
  programId: item.programId ?? item.programCode ?? item.programName ?? null,
  boardId: item.boardId != null ? Number(item.boardId) : null,
  academicYearId: item.academicYearId != null ? Number(item.academicYearId) : null,
  academicLevelId: item.academicLevelId != null ? Number(item.academicLevelId) : null,
  totalMarks: Number(item.totalMarks ?? 0),
  passPercentage: Number(item.passPercentage ?? 0),
  status: String(item.status ?? item.examStatus ?? "COMPLETED").toUpperCase(),
});

const normalizeStatus = (value) => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["NOT_GENERATED", "GENERATED", "VALIDATED", "PUBLISHED", "FAILED", "STALE"].includes(status)) {
    return status;
  }
  return status || "GENERATED";
};

const numberOrZero = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const matchesIdOrName = (actual, expected, itemsList = []) => {
  if (expected == null || expected === "" || actual == null || actual === "") return true;
  const actualStr = String(actual).trim().toLowerCase();
  const expectedStr = String(expected).trim().toLowerCase();
  if (actualStr === expectedStr) return true;
  const numActual = Number(actual);
  const numExpected = Number(expected);
  if (Number.isFinite(numActual) && Number.isFinite(numExpected) && numActual === numExpected) return true;

  const matchedItem = itemsList.find(
    (i) => String(i.id) === expectedStr || String(i.programId) === expectedStr,
  );
  if (matchedItem) {
    const itemName = String(matchedItem.name || matchedItem.programName || "").trim().toLowerCase();
    const itemCode = String(matchedItem.code || matchedItem.programCode || "").trim().toLowerCase();
    if (actualStr === itemName || actualStr === itemCode) return true;
  }
  return false;
};

const normalizeSectionSummary = (section) => {
  const studentCount = Number(
    section.studentCount ??
      section.count ??
      section.studentsCount ??
      section.students ??
      section.totalStudents ??
      0,
  );
  const passed = Number(section.passed ?? section.passedCount ?? 0);
  const failed = Number(section.failed ?? section.failedCount ?? 0);
  const passRate = Number(section.passRate ?? section.passPercentage ?? 0);
  const average = Number(section.average ?? section.averagePercentage ?? 0);
  const rawResultStatus = String(section.resultStatus ?? section.status ?? section.publicationStatus ?? "").trim();
  const resultStatus = rawResultStatus ? normalizeStatus(rawResultStatus) : "GENERATED";
  const secId = Number(section.sectionId ?? section.id);
  return {
    ...section,
    sectionId: secId,
    sectionName: section.sectionName ?? section.name ?? section.section ?? `Section ${secId}`,
    studentCount,
    passed,
    failed,
    passRate,
    average,
    resultStatus,
    isValid: secId > 0 && section.isValid !== false && !["FAILED", "STALE"].includes(resultStatus),
  };
};

const generatedSectionsFrom = (data) => {
  const candidates = [
    data,
    data?.data,
    data?.result,
    data?.sections,
    data?.sectionSummaries,
    data?.data?.sections,
    data?.data?.sectionSummaries,
    data?.result?.sections,
    data?.result?.sectionSummaries,
  ];
  return candidates.find(Array.isArray) ?? [];
};

const hasExistingResults = (item) =>
  Boolean(
    item &&
      (["GENERATED", "VALIDATED", "PUBLISHED"].includes(item.publicationStatus) ||
        (item.generatedSectionCount ?? 0) > 0 ||
        (item.sections ?? []).length > 0),
  );

const sectionSummariesFromResultRows = (data, context, programsList = []) => {
  const rows = collectionFrom(data);
  const expected = {
    boardId: Number(context.board),
    academicYearId: Number(context.year),
    academicLevelId: Number(context.level),
    groupId: Number(context.group),
    programId: context.program,
    examinationId: Number(context.exam),
  };
  const matchingRows = rows.filter((item) => {
    const examinationId = item.examinationId ?? item.examId;
    return (
      Number(item.sectionId ?? item.id) > 0 &&
      Number(item.studentId) > 0 &&
      (item.boardId == null || Number(item.boardId) === expected.boardId) &&
      (item.academicYearId == null || Number(item.academicYearId) === expected.academicYearId) &&
      (item.academicLevelId == null || Number(item.academicLevelId) === expected.academicLevelId) &&
      (item.groupId == null || Number(item.groupId) === expected.groupId) &&
      matchesIdOrName(item.programId ?? item.programName, expected.programId, programsList) &&
      (examinationId == null || Number(examinationId) === expected.examinationId)
    );
  });

  const grouped = new Map();
  matchingRows.forEach((item) => {
    const sectionId = Number(item.sectionId ?? item.id);
    if (!grouped.has(sectionId)) grouped.set(sectionId, []);
    grouped.get(sectionId).push(item);
  });

  return [...grouped.entries()]
    .map(([sectionId, sectionRows]) => {
      const first = sectionRows[0];
      const outcomes = sectionRows.map((item) =>
        String(item.finalResult ?? item.result ?? item.resultOutcome ?? "").toUpperCase(),
      );
      const calculatedPassed = outcomes.filter((v) => v === "PASS").length;
      const calculatedFailed = outcomes.filter((v) => v === "FAIL").length;
      const percentages = sectionRows
        .map((item) => Number(item.percentage ?? item.percentageObtained))
        .filter(Number.isFinite);
      const studentCount = Number(first.studentCount ?? first.studentsCount ?? sectionRows.length);
      const passed = Number(first.passed ?? first.passedCount ?? calculatedPassed);
      const failed = Number(first.failed ?? first.failedCount ?? calculatedFailed);
      return normalizeSectionSummary({
        ...first,
        sectionId,
        sectionName: first.sectionName ?? first.section?.sectionName ?? first.section?.name ?? `Section ${sectionId}`,
        studentCount,
        passed,
        failed,
        passRate:
          first.passRate ?? first.passPercentage ?? (studentCount ? (passed / studentCount) * 100 : 0),
        average:
          first.average ??
          first.averagePercentage ??
          (percentages.length
            ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
            : 0),
        resultStatus: first.resultStatus ?? first.publicationStatus ?? first.status,
      });
    })
    .filter((section) => section.isValid);
};

const normalizeReadiness = (item) => ({
  examinationId: Number(item?.examinationId ?? item?.examId ?? 0),
  examinationName: item?.examinationName ?? item?.examName ?? "",
  boardId: item?.boardId != null ? Number(item.boardId) : null,
  academicYearId: item?.academicYearId != null ? Number(item.academicYearId) : null,
  academicLevelId: item?.academicLevelId != null ? Number(item.academicLevelId) : null,
  groupId: item?.groupId != null ? Number(item.groupId) : null,
  programId: item?.programId ?? null,
  examinationStatus: String(item?.examinationStatus ?? item?.examStatus ?? "")
    .trim()
    .toUpperCase(),
  isExamCompleted:
    item?.isExamCompleted === true ||
    ["COMPLETED", "SCHEDULED"].includes(String(item?.examinationStatus ?? item?.examStatus ?? "").trim().toUpperCase()),
  totalEligibleStudents: numberOrZero(item?.totalEligibleStudents),
  activeStudentCount: numberOrZero(item?.activeStudentCount ?? item?.totalEligibleStudents),
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
  allRequiredEvaluationsApproved:
    item?.allRequiredEvaluationsApproved === true || item?.allEvaluationsApproved === true,
  allExpectedSectionsGenerated:
    item?.allExpectedSectionsGenerated == null ? null : item.allExpectedSectionsGenerated === true,
  allExpectedSectionsValid:
    item?.allExpectedSectionsValid == null ? null : item.allExpectedSectionsValid === true,
  readyForGeneration: item?.readyForGeneration === true || item?.canGenerateResults === true,
  readyForGroupPublication:
    item?.readyForGroupPublication == null ? null : item.readyForGroupPublication === true,
  validationBlockers: Array.isArray(item?.validationBlockers)
    ? item.validationBlockers.filter((message) => String(message ?? "").trim())
    : [],
  publicationStatus:
    item?.publicationStatus == null && item?.resultStatus == null
      ? null
      : normalizeStatus(item?.publicationStatus ?? item?.resultStatus),
  resultBatchId: Number(item?.resultBatchId) || null,
  rowVersion: item?.rowVersion ?? null,
  sections: collectionFrom(item?.sections ?? item?.sectionSummaries)
    .map(normalizeSectionSummary)
    .filter((section) => section.sectionId > 0),
});

const canPublishGroup = (item, generatedSections = item?.sections ?? []) =>
  Boolean(
    item &&
    generatedSections.length > 0 &&
    generatedSections.every((section) => section.isValid) &&
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
  const [rankSearch, setRankSearch] = useState("");
  const [rankList, setRankList] = useState([]);
  const [showRankPreview, setShowRankPreview] = useState(false);

  // Analytics & Modals
  const [analytics, setAnalytics] = useState(null);
  const [failedStudents, setFailedStudents] = useState([]);
  const [failedStudentsState, setFailedStudentsState] = useState("idle");
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
    resultsList: 0,
    generate: 0,
    section: 0,
    memo: 0,
    rank: 0,
    analytics: 0,
    failed: 0,
    sectionAction: 0,
    groupPublish: 0,
  });

  const showToast = useCallback((msg, type = "success") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast(msg);
    toastRef.current = setTimeout(() => setToast(""), 3500);
  }, []);

  useEffect(() => () => toastRef.current && clearTimeout(toastRef.current), []);

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
    setRankList([]);
    setRankSearch("");
    setRankPage(1);
    setShowRankPreview(false);
    setAnalytics(null);
    setFailedStudents([]);
    setFailedStudentsState("idle");
    setAnalyticsDetail(null);
    setConfirm(null);
    requests.current.rank += 1;
    requests.current.analytics += 1;
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
        (v) => String(v).trim().length > 0,
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
          ProgramId: context.program,
          Status: "COMPLETED",
        },
      });
      if (seq !== requests.current.exams) return;
      const items = collectionFrom(res.data);
      const next = items
        .map(normalizeExam)
        .filter((i) => {
          if (!i.id || i.id <= 0) return false;
          const boardMatch = !i.boardId || i.boardId === Number(context.board);
          const yearMatch = !i.academicYearId || i.academicYearId === Number(context.year);
          const levelMatch = !i.academicLevelId || i.academicLevelId === Number(context.level);
          const groupMatch = !i.groupId || i.groupId === Number(context.group);
          const programMatch = matchesIdOrName(i.programId || i.programName, context.program, programs);
          return boardMatch && yearMatch && levelMatch && groupMatch && programMatch;
        });
      setExaminations(next);
      return next;
    } catch (err) {
      if (seq === requests.current.exams) showToast(apiError(err), "error");
      return null;
    }
  };

  const contextParams = (context) => ({
    boardId: Number(context.board),
    academicYearId: Number(context.year),
    academicLevelId: Number(context.level),
    groupId: Number(context.group),
    programId: context.program,
    examId: Number(context.exam),
    examinationId: Number(context.exam),
  });

  const loadReadiness = async (context, quiet = false) => {
    const seq = ++requests.current.readiness;
    try {
      const res = await apiClient.get(RESULT_API.readiness, { params: contextParams(context) });
      if (seq !== requests.current.readiness) return null;
      const root = objectFrom(res.data);
      const source = objectFrom(root?.readiness) ?? root;
      const next = source ? normalizeReadiness(source) : null;

      if (next && next.sections.length > 0) {
        setSectionSummaries(next.sections);
      }
      setReadiness(next);
      return next;
    } catch (err) {
      if (seq === requests.current.readiness) {
        setReadiness(null);
        if (!quiet) setSectionSummaries([]);
        if (!quiet) showToast(apiError(err), "error");
      }
      return null;
    }
  };

  const loadExistingSectionSummaries = async (context) => {
    const seq = ++requests.current.resultsList;
    try {
      const res = await apiClient.get(RESULT_API.resultsList, {
        params: contextParams(context),
      });
      if (seq !== requests.current.resultsList) return null;
      const summaries = sectionSummariesFromResultRows(res.data, context, programs);
      setSectionSummaries(summaries);
      return summaries;
    } catch {
      return null;
    }
  };

  const changeFilter = (key, value) => {
    Object.keys(requests.current).forEach((requestKey) => {
      requests.current[requestKey] += 1;
    });
    const next = { ...filters, [key]: value };
    if (key === "board") {
      const selectedYear = academicYears.find((item) => String(item.id) === String(next.year));
      Object.assign(next, {
        year:
          selectedYear && (selectedYear.boardId == null || selectedYear.boardId === Number(value))
            ? next.year
            : "",
        group: "",
        program: "",
        exam: "",
      });
    }
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
        (item) => String(item).trim().length > 0,
      )
    ) {
      loadExaminations(next);
    }
  };

  const generateResults = async () => {
    if (generatingResults) return;
    if (
      !Object.values(filters).every((value) => String(value).trim().length > 0)
    )
      return showToast("Select all required result filters.", "error");

    const seq = ++requests.current.generate;
    setGeneratingResults(true);
    try {
      const latest = await loadReadiness(filters, true);
      if (seq !== requests.current.generate) return;

      if (hasExistingResults(latest)) {
        const restoredSections = (latest?.sections ?? []).length
          ? latest.sections
          : await loadExistingSectionSummaries(filters);
        if (seq !== requests.current.generate) return;
        setApplied({ ...filters });
        setViewMode("table");
        setSectionId(null);
        setStudentId(null);
        setPage(1);
        if (restoredSections?.length) setSectionSummaries(restoredSections);
        return;
      }

      const payload = contextParams(filters);
      if (latest?.rowVersion != null) payload.rowVersion = latest.rowVersion;
      const res = await apiClient.post(RESULT_API.generate, payload);
      if (seq !== requests.current.generate) return;
      const generatedSections = generatedSectionsFrom(res.data).map(normalizeSectionSummary);

      setApplied({ ...filters });
      setViewMode("table");
      setSectionId(null);
      setStudentId(null);
      setPage(1);
      setSectionSummaries(generatedSections);
      await loadReadiness(filters, true);
      showToast("Results generated successfully.");
    } catch (err) {
      if (seq === requests.current.generate) {
        showToast(apiError(err), "error");
        const restored = await loadExistingSectionSummaries(filters);
        if (restored && restored.length > 0) {
          setApplied({ ...filters });
          setViewMode("table");
        }
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
      const activeContext = applied || filters;
      const res = await apiClient.get(RESULT_API.sectionDetail(secId), {
        params: { ...contextParams(activeContext), examId: Number(activeContext.exam) },
      });
      if (seq !== requests.current.section) return;
      const details = objectFrom(res.data);
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
    const studentExamId = typeof student === "object" ? (student.examinationId ?? student.examId) : null;
    if (loadingStudentId !== null) return;
    const seq = ++requests.current.memo;
    setStudentId(sId);
    setSelectedStudentMemo(null);
    setLoadingStudentId(sId);
    try {
      const memoContext = applied || filters;
      const examId = studentExamId || Number(memoContext.exam) || undefined;
      const res = await apiClient.get(RESULT_API.studentMemo(sId), {
        params: examId ? { examId, examinationId: examId } : {},
      });
      if (seq !== requests.current.memo) return;
      const payload = objectFrom(res.data) || res.data;
      const memo = typeof student === "object" ? { ...student, ...(payload || {}) } : payload;
      if (!memo) {
        throw new Error("Unable to load student marks memo.");
      }
      setSelectedStudentMemo(memo);
    } catch (err) {
      if (seq === requests.current.memo) {
        if (typeof student === "object") {
          setSelectedStudentMemo(student);
        } else {
          setStudentId(null);
          showToast(apiError(err), "error");
        }
      }
    } finally {
      if (seq === requests.current.memo) setLoadingStudentId(null);
    }
  };

  const hasGeneratedResults =
    Boolean(applied?.exam) &&
    (sectionSummaries.length > 0 || hasExistingResults(readiness));

  const loadRankList = async (context = applied) => {
    if (!hasGeneratedResults || !context?.exam) {
      setRankList([]);
      return;
    }
    const seq = ++requests.current.rank;
    const targetContext = context;
    const expectedGroupId = targetContext.group;
    const expectedProgramId = targetContext.program;
    const expectedExamId = targetContext.exam;

    try {
      const res = await apiClient.get(RESULT_API.rankList, {
        params: {
          boardId: targetContext.board ? Number(targetContext.board) : undefined,
          academicYearId: targetContext.year ? Number(targetContext.year) : undefined,
          academicLevelId: targetContext.level ? Number(targetContext.level) : undefined,
          groupId: expectedGroupId ? Number(expectedGroupId) : undefined,
          programId: expectedProgramId ? String(expectedProgramId) : undefined,
          examId: expectedExamId ? Number(expectedExamId) : undefined,
          examinationId: expectedExamId ? Number(expectedExamId) : undefined,
        },
      });
      if (seq !== requests.current.rank) return;
      const rows = collectionFrom(res.data).filter((item) => {
        const returnedExamId = item.examinationId ?? item.examId;
        const returnedGroupId = item.groupId;
        const returnedProgramId = item.programId ?? item.programName;

        const examMatch = !expectedExamId || returnedExamId == null || Number(returnedExamId) === Number(expectedExamId);
        const groupMatch = !expectedGroupId || returnedGroupId == null || Number(returnedGroupId) === Number(expectedGroupId);
        const programMatch = matchesIdOrName(returnedProgramId, expectedProgramId, programs);

        return Number(item.studentId) > 0 && examMatch && groupMatch && programMatch;
      });
      setRankList([
        ...new Map(
          rows.map((item) => [`${item.examinationId ?? item.examId}:${item.studentId}`, item]),
        ).values(),
      ]);
      setRankPage(1);
    } catch (err) {
      if (seq !== requests.current.rank) showToast(apiError(err), "error");
    }
  };

  const loadAnalytics = async (context = applied) => {
    if (!hasGeneratedResults || !context?.exam) {
      setAnalytics(null);
      return;
    }
    const seq = ++requests.current.analytics;
    const targetContext = context;
    try {
      const res = await apiClient.get(RESULT_API.analytics, {
        params: {
          boardId: targetContext.board ? Number(targetContext.board) : undefined,
          academicYearId: targetContext.year ? Number(targetContext.year) : undefined,
          academicLevelId: targetContext.level ? Number(targetContext.level) : undefined,
          groupId: targetContext.group ? Number(targetContext.group) : undefined,
          programId: targetContext.program ? String(targetContext.program) : undefined,
          examId: targetContext.exam ? Number(targetContext.exam) : undefined,
          examinationId: targetContext.exam ? Number(targetContext.exam) : undefined,
        },
      });
      if (seq !== requests.current.analytics) return;
      const next = res.data?.data ?? res.data;
      setAnalytics(next);
    } catch (err) {
      if (seq !== requests.current.analytics) showToast(apiError(err), "error");
    }
  };

  useEffect(() => {
    if (!hasGeneratedResults || !applied?.exam) return;
    if (viewMode === "rankList" && !rankList.length) loadRankList(applied);
    if (viewMode === "analytics" && !analytics) loadAnalytics(applied);
  }, [viewMode, hasGeneratedResults, applied?.exam]);

  const openFailedStudents = async () => {
    if (!hasGeneratedResults || !applied?.exam) return;
    setAnalyticsDetail("failed");
    const embedded = analytics?.failedStudents;
    if (Array.isArray(embedded) && embedded.length > 0) {
      setFailedStudents(embedded);
      setFailedStudentsState("success");
      return;
    }
    const seq = ++requests.current.failed;
    setFailedStudents([]);
    setFailedStudentsState("loading");
    try {
      const activeContext = applied || filters;
      const res = await apiClient.get(RESULT_API.failedStudents, {
        params: activeContext.exam
          ? {
              boardId: Number(activeContext.board),
              academicYearId: Number(activeContext.year),
              academicLevelId: Number(activeContext.level),
              groupId: Number(activeContext.group),
              programId: String(activeContext.program),
              examId: Number(activeContext.exam),
              examinationId: Number(activeContext.exam),
            }
          : undefined,
      });
      if (seq !== requests.current.failed) return;
      const rows = collectionFrom(res.data);
      setFailedStudents(rows);
      setFailedStudentsState("success");
    } catch (err) {
      if (seq === requests.current.failed) {
        setFailedStudentsState("error");
        showToast(apiError(err), "error");
      }
    }
  };

  const currentExam = examinations.find((i) => String(i.id) === String((applied || filters)?.exam));

  const publishGroup = () => {
    if (!canPublishGroup(readiness, sectionSummaries))
      return showToast(
        "Every expected Section must be generated and valid before Group publication.",
        "error",
      );
    setConfirm({ type: "group", generated: sectionSummaries });
  };

  const confirmPublish = async () => {
    if (!confirm || actionLoading) return;
    setActionLoading("PUBLISH");
    try {
      if (confirm.type === "section")
        throw new Error("Partial Section publication is not permitted.");
      const activeContext = applied || filters;
      const latest = await loadReadiness(activeContext, true);
      const payload = {
        examinationId: Number(activeContext.exam),
        examId: Number(activeContext.exam),
        groupId: Number(activeContext.group),
        programId: activeContext.program,
      };
      if (latest?.resultBatchId) payload.resultBatchId = latest.resultBatchId;
      if (latest?.rowVersion != null) payload.rowVersion = latest.rowVersion;
      await apiClient.post(RESULT_API.publishGroup, payload);
      showToast("Group results published successfully.");
      setConfirm(null);
      await loadReadiness(activeContext, true);
      setReadiness((current) =>
        current ? { ...current, publicationStatus: "PUBLISHED" } : current,
      );
      await Promise.all([loadRankList(), loadAnalytics()]);
    } catch (err) {
      showToast(apiError(err), "error");
      if (err?.response?.status === 409) await loadReadiness(applied || filters, true);
    } finally {
      setActionLoading("");
    }
  };

  // Section Detail Rows Filtering & Pagination
  const rawStudents = selectedSectionDetails?.students ?? selectedSectionDetails?.studentRows ?? [];
  const sectionStudents = rawStudents
    .filter((item) =>
      `${item.studentName ?? ""} ${item.rollNo ?? item.rollNumber ?? ""} ${item.grade ?? ""} ${item.result ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.sectionRank || a.rank || 0) - (b.sectionRank || b.rank || 0));
  const totalPages = Math.max(1, Math.ceil(sectionStudents.length / PAGE_SIZE));
  const pagedStudents = sectionStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Rank List Pagination
  const filteredRankList = useMemo(() => {
    const term = rankSearch.trim().toLowerCase();
    if (!term) return rankList;
    return rankList.filter((item, index) => {
      const rank = item.rank ?? item.groupRank ?? item.sectionRank ?? index + 1;
      const examinationName = item.examinationName ?? item.examName ?? currentExam?.name ?? "";
      return [
        rank,
        `#${rank}`,
        item.studentName,
        item.student,
        item.rollNo,
        item.rollNumber,
        item.groupName,
        item.group,
        item.programName,
        item.program,
        examinationName,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [rankList, rankSearch, currentExam]);
  const rankPages = Math.max(1, Math.ceil(filteredRankList.length / PAGE_SIZE));
  const pagedRanks = filteredRankList.slice(
    (rankPage - 1) * PAGE_SIZE,
    rankPage * PAGE_SIZE,
  );
  useEffect(() => {
    if (rankPage > rankPages) setRankPage(rankPages);
  }, [rankPage, rankPages]);

  // Exports
  const exportRows = (rows, includeStatus = true, includeExamination = false) =>
    rows.map((item) => {
      const rowData = {
        Rank: item.rank ?? item.sectionRank ?? "—",
        ...(includeExamination
          ? { Examination: item.examinationName ?? item.examName ?? currentExam?.name ?? "—" }
          : {}),
        Roll: item.rollNo || item.rollNumber || "—",
        Student: item.studentName || item.student || "—",
        Group: item.groupName || item.group || "—",
        Program: item.programName || item.program || "—",
        Section: item.sectionName || item.section || "—",
        Total: item.total ?? item.totalMarks ?? "—",
        Maximum: item.maximum ?? item.maxMarks ?? "—",
        Percentage: item.percentage == null ? "—" : Number(item.percentage).toFixed(2),
        Grade: item.grade || "—",
        Result: item.result || "—",
      };
      if (includeStatus) {
        rowData.Status = item.status ?? item.resultStatus ?? "—";
      }
      return rowData;
    });

  const safeFileName = (value) =>
    String(value ?? "Results")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim() || "Results";

  const exportExcel = (rows, filename, includeStatus = true, includeExamination = false) => {
    if (!rows.length) return showToast("No result records are available to export.", "error");
    const sheet = XLSX.utils.json_to_sheet(
      exportRows(rows, includeStatus, includeExamination),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Results");
    XLSX.writeFile(book, `${safeFileName(filename)}.xlsx`);
  };

  const exportPdf = (rows, filename, includeStatus = true) => {
    if (!rows.length) return showToast("No result records are available to export.", "error");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text(filename, 14, 14);
    const data = exportRows(rows, includeStatus);
    const headers = Object.keys(data[0] || {});
    autoTable(doc, {
      head: [headers],
      body: data.map((item) => headers.map((key) => item[key])),
      startY: 20,
    });
    doc.save(`${safeFileName(filename)}.pdf`);
  };

  const renderSelectOptions = (items) =>
    items.map((i) => (
      <option key={i.id} value={i.id}>
        {i.name}
      </option>
    ));

  return (
    <DashboardLayout
      title={(
        <span className="results-layout-title">
          <span className="results-heading-title">Results Management</span>
          <span className="results-breadcrumb-title">Results</span>
        </span>
      )}
      subtitle="Generate, publish and analyze approved examination results"
      breadcrumb={["Examinations"]}
    >
      <div className="results-page">
        {toast && <Toast message={toast} onClose={() => setToast("")} />}

        <div className="results-tabs-row">
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
                    uniqueAcademicYearsByName(
                      academicYears.filter(
                        (i) => i.boardId == null || Number(i.boardId) === Number(filters.board),
                      ),
                      (item) => item.name,
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
        ) : viewMode === "table" && (applied || sectionSummaries.length > 0) ? (
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
              onGroup={publishGroup}
              groupPublishReady={canPublishGroup(readiness, sectionSummaries)}
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
            search={rankSearch}
            setSearch={(v) => {
              setRankSearch(v);
              setRankPage(1);
            }}
            page={rankPage}
            pages={rankPages}
            setPage={setRankPage}
            onStudent={loadStudentMemo}
            loadingStudentId={loadingStudentId}
            onExportPreview={() => setShowRankPreview(true)}
            hasGeneratedResults={hasGeneratedResults}
            hasRankRecords={rankList.length > 0}
            examName={currentExam?.name}
          />
        )}

        {viewMode === "analytics" && !selectedStudentMemo && (
          <Analytics
            data={analytics}
            examName={currentExam?.name}
            hasGeneratedResults={hasGeneratedResults}
            onOpen={openFailedStudents}
          />
        )}

        {showRankPreview && (
          <RankPreviewModal
            rows={rankList}
            examName={currentExam?.name}
            onClose={() => setShowRankPreview(false)}
            onDownload={() => exportExcel(rankList, "Rank-List", false, true)}
          />
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
            rows={failedStudents}
            state={failedStudentsState}
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
          {exam?.name} {exam?.programName ? `· ${exam.programName}` : ""}
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
                        {item.count ?? item.studentsCount ?? item.students ?? item.studentCount ?? 0}
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
                    <td>{item.rollNo || item.rollNumber || "—"}</td>
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
                    <td className="cms-text-center">{item.grade || "—"}</td>
                    <td className="cms-text-center">{item.result || "—"}</td>
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
                          {Number.isFinite(percent) ? `${percent.toFixed(2)}%` : "—"}
                        </td>
                        <td className="cms-text-center">{sub.grade || "—"}</td>
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
                        <td className="cms-text-center">{sub.grade || "—"}</td>
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
          <Summary label="Overall Grade" value={student.overallGrade || student.grade || "—"} />
          <Summary label="Final Result" value={student.finalResult || student.result || "—"} />
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
  search,
  setSearch,
  page,
  pages,
  setPage,
  onStudent,
  loadingStudentId,
  onExportPreview,
  hasGeneratedResults,
  hasRankRecords,
  examName,
}) {
  return (
    <div className="cms-card results-rank-card">
      <div className="results-rank-toolbar">
        <div className="results-rank-search">
          <input
            className="cms-input"
            placeholder="Search rank, student, group, program or examination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="results-rank-toolbar-spacer" />
        <button
          className="cms-btn cms-btn-ghost"
          disabled={!hasGeneratedResults || !hasRankRecords}
          onClick={onExportPreview}
        >
          Export Rank List
        </button>
      </div>
      <div className="cms-table-wrap results-rank-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>EXAMINATION</th>
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
                  <td className="cms-font-semibold">#{item.rank ?? idx + 1}</td>
                  <td title={item.examinationName ?? item.examName ?? examName ?? "—"}>
                    <span className="results-rank-exam-name">
                      {item.examinationName ?? item.examName ?? examName ?? "—"}
                    </span>
                  </td>
                  <td>{item.rollNo || item.rollNumber || "—"}</td>
                  <td>{item.studentName || item.student}</td>
                  <td>{item.groupName || item.group}</td>
                  <td>{item.programName || item.program}</td>
                  <td>{item.sectionName || item.section}</td>
                  <td className="cms-text-center">{item.total ?? item.totalMarks}</td>
                  <td className="cms-text-center">
                    {item.percentage == null ? "—" : `${Number(item.percentage).toFixed(2)}%`}
                  </td>
                  <td className="cms-text-center">{item.grade || "—"}</td>
                  <td className="cms-text-center">{item.result || "—"}</td>
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
                <td colSpan={12} className="cms-empty-td">
                  {!hasGeneratedResults
                    ? "Generate results for the selected examination to view the rank list."
                    : hasRankRecords
                      ? "No rank list records match your search."
                      : "No rank list records are available for the generated results."}
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

function RankPreviewModal({ rows, examName, onClose, onDownload }) {
  const [modalPage, setModalPage] = useState(1);
  const modalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((modalPage - 1) * PAGE_SIZE, modalPage * PAGE_SIZE);
  const getResultLabel = (item) => {
    const value = String(item.result ?? item.resultStatus ?? "").trim().toUpperCase();
    if (value.includes("PASS")) return "PASS";
    if (value.includes("FAIL")) return "FAIL";
    return "—";
  };

  return (
    <div
      className="cms-modal-overlay results-rank-preview-overlay"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="cms-modal-content results-rank-preview-modal"
        style={{
          maxWidth: "680px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
          padding: "18px 22px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cms-modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "12px",
            marginBottom: "14px",
          }}
        >
          <div>
            <h3 className="cms-modal-title" style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
              Rank List Export Preview
            </h3>
            <span className="results-rank-preview-subtitle">{rows.length} records ready to export</span>
          </div>
          <button
            className="cms-modal-close"
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#9ca3af",
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="cms-modal-body" style={{ flex: 1, overflowY: "auto", marginBottom: "14px" }}>
          {rows.length === 0 ? (
            <p className="results-analytics-empty" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
              No rank list records available for preview.
            </p>
          ) : (
            <>
              <div className="cms-table-wrap results-rank-preview-table-wrap" style={{ overflowX: "auto" }}>
                <table className="cms-table results-rank-preview-table" style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 8px" }}>RANK</th>
                      <th style={{ padding: "6px 8px" }}>EXAMINATION</th>
                      <th style={{ padding: "6px 8px" }}>ROLL</th>
                      <th style={{ padding: "6px 8px" }}>STUDENT</th>
                      <th style={{ padding: "6px 8px" }}>GROUP</th>
                      <th style={{ padding: "6px 8px" }}>PROGRAM</th>
                      <th style={{ padding: "6px 8px" }}>SECTION</th>
                      <th style={{ padding: "6px 8px" }}>TOTAL</th>
                      <th style={{ padding: "6px 8px" }}>MAX</th>
                      <th style={{ padding: "6px 8px" }}>PERCENT %</th>
                      <th style={{ padding: "6px 8px" }}>GRADE</th>
                      <th style={{ padding: "6px 8px" }}>RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((item, idx) => (
                      <tr key={`${item.studentId}-${idx}`}>
                        <td className="cms-font-semibold" style={{ padding: "6px 8px" }}>
                          #{item.rank ?? (modalPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td
                          style={{ padding: "6px 8px" }}
                          title={item.examinationName ?? item.examName ?? examName ?? "—"}
                        >
                          <span className="results-rank-exam-name">
                            {item.examinationName ?? item.examName ?? examName ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px" }}>{item.rollNo || item.rollNumber || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{item.studentName || item.student || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{item.groupName || item.group || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{item.programName || item.program || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{item.sectionName || item.section || "—"}</td>
                        <td className="cms-text-center" style={{ padding: "6px 8px" }}>
                          {item.total ?? item.totalMarks ?? "—"}
                        </td>
                        <td className="cms-text-center" style={{ padding: "6px 8px" }}>
                          {item.maximum ?? item.maxMarks ?? "—"}
                        </td>
                        <td className="cms-text-center" style={{ padding: "6px 8px" }}>
                          {item.percentage == null ? "—" : `${Number(item.percentage).toFixed(2)}%`}
                        </td>
                        <td className="cms-text-center" style={{ padding: "6px 8px" }}>{item.grade || "—"}</td>
                        <td className="cms-text-center" style={{ padding: "6px 8px" }}>
                          <span className={`results-rank-result results-rank-result-${getResultLabel(item).toLowerCase()}`}>
                            {getResultLabel(item)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {modalPages > 1 && (
                <Pagination page={modalPage} pages={modalPages} setPage={setModalPage} />
              )}
            </>
          )}
        </div>
        <div
          className="cms-modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "12px",
          }}
        >
          <button className="cms-btn cms-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cms-btn cms-btn-primary"
            disabled={!rows.length}
            onClick={() => {
              onDownload();
              onClose();
            }}
          >
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}

function Analytics({ data, examName, hasGeneratedResults, onOpen }) {
  const [subjectPage, setSubjectPage] = useState(1);
  useEffect(() => setSubjectPage(1), [data]);
  const cards = [
    ["TOTAL STUDENTS", data?.totalStudents ?? data?.total ?? 0, "total"],
    ["PASSED", data?.passed ?? data?.passedStudents ?? 0, "passed"],
    ["FAILED", data?.failed ?? data?.failedStudents ?? 0, "failed"],
    [
      "PASS %",
      data?.passPercentage == null && data?.pass == null
        ? "—"
        : `${Number(data?.passPercentage ?? data?.pass).toFixed(2)}%`,
      "pass",
    ],
  ];
  const subjectPerformance = data?.subjectPerformance ?? data?.subjects ?? [];
  const subjectPages = Math.max(1, Math.ceil(subjectPerformance.length / SUBJECT_PAGE_SIZE));
  const currentSubjectPage = Math.min(subjectPage, subjectPages);
  const pagedSubjects = subjectPerformance.slice(
    (currentSubjectPage - 1) * SUBJECT_PAGE_SIZE,
    currentSubjectPage * SUBJECT_PAGE_SIZE,
  );

  return (
    <div>
      {hasGeneratedResults && (
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
      )}
      <div className="cms-card">
        <div className="cms-card-body">
          <div className="results-analytics-heading">
            <h3 className="cms-card-title">Subject Performance</h3>
            {hasGeneratedResults && (
              <span className="results-analytics-exam-name" title={examName || "Selected Examination"}>
                {examName || data?.examinationName || data?.examName || "Selected Examination"}
              </span>
            )}
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table results-subject-performance-table">
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
                {!hasGeneratedResults ? (
                  <tr>
                    <td colSpan={6} className="cms-empty-td">
                      Generate results for the selected examination to view analytics.
                    </td>
                  </tr>
                ) : pagedSubjects.length ? (
                  pagedSubjects.map((sub, idx) => (
                    <tr key={sub.subjectId || idx}>
                      <td>{sub.subjectName}</td>
                      <td className="cms-text-center">{sub.students ?? sub.totalStudents ?? "—"}</td>
                      <td className="cms-text-center">
                        {sub.average == null && sub.averageScore == null
                          ? "—"
                          : `${Number(sub.average ?? sub.averageScore).toFixed(2)}%`}
                      </td>
                      <td className="cms-text-center">{sub.highest ?? sub.maximumMarks ?? "—"}</td>
                      <td className="cms-text-center">{sub.lowest ?? "—"}</td>
                      <td className="cms-text-center">
                        {sub.passPercentage == null && sub.subjectPassPercentage == null
                          ? "—"
                          : `${Number(sub.passPercentage ?? sub.subjectPassPercentage).toFixed(2)}%`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="cms-empty-td">
                      No analytics records are available for the generated results.
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

function AnalyticsModal({ rows, state, onClose }) {
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
          {state === "loading" ? (
            <p className="results-analytics-empty">Loading failed students...</p>
          ) : state === "error" ? (
            <p className="results-analytics-empty">Failed-student data could not be loaded.</p>
          ) : rows.length === 0 ? (
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
                        <td>{item.sectionName || item.section || "—"}</td>
                        <td className="cms-text-center">
                          {item.percentage == null ? "—" : `${Number(item.percentage).toFixed(2)}%`}
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
      : confirm.generated?.reduce((s, i) => s + (i.count ?? i.studentsCount ?? i.studentCount ?? 0), 0);

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
  const cls = `results-status-${val.toLowerCase().replaceAll("_", "-")}`;
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
