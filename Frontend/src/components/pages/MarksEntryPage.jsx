import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "../../api/apiClient.js";
import { uniqueAcademicYearsByName } from "../../api/apiEndpoints.js";
import "./MarksEntryPage.css";

const Check = () => <span aria-hidden="true">✓</span>;
const Cross = () => <span aria-hidden="true">×</span>;
const PAGE_SIZE = 5;
const STATUS_META = {
  DRAFT: ["DRAFT", "cms-status-submitted"],
  SUBMITTED: ["SUBMITTED", "cms-status-submitted"],
  VERIFIED: ["VERIFIED", "cms-status-verified"],
  APPROVED: ["APPROVED", "cms-status-approved"],
  REJECTED: ["REJECTED", "cms-status-rejected"],
};
const EVALUATION_API = {
  boards: "/api/v1/boards",
  academicYears: "/api/v1/academic-years/active",
  academicLevels: "/api/v1/boards/academic-levels",
  groupsByBoard: (boardId) => `/api/v1/groups/board/${boardId}`,
  programsByGroup: (groupId) => `/api/v1/groups/${groupId}/programs`,
  sections: "/api/v1/Sections",
  examinations: "/api/v1/examinations",
  search: "/api/v1/evaluations/search",
  students: (evaluationId) => `/api/v1/evaluations/${evaluationId}/students`,
  verify: (evaluationId) => `/api/v1/evaluations/${evaluationId}/verify`,
  approve: (evaluationId) => `/api/v1/evaluations/${evaluationId}/approve`,
  reject: (evaluationId) => `/api/v1/evaluations/${evaluationId}/reject`,
  verifyAll: "/api/v1/evaluations/verify-all",
  approveAll: "/api/v1/evaluations/approve-all",
  readiness: "/api/v1/evaluations/readiness",
  studentAnalysis: "/api/v1/student-analysis",
  studentDetails: (studentId) => `/api/v1/student-analysis/${studentId}/details`,
};
const collectionFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data?.items)) return data.data.items;
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
  const item = objectFrom(data);
  return item && typeof item === "object" && !Array.isArray(item) ? [item] : [];
};
const firstNonEmpty = (...values) =>
  values.find((value) => value != null && String(value).trim() !== "") ?? "";
const activeValue = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  return ["1", "true", "active"].includes(String(value).trim().toLowerCase());
};
const isActive = (item) => activeValue(firstNonEmpty(item?.isActive, item?.status));
const positiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const finiteNumber = (value) => value !== null && value !== "" && Number.isFinite(Number(value));
const safePercent = (value) => (finiteNumber(value) ? Number(value).toFixed(2) + "%" : "—");
const percentageOf = (value, maximum) =>
  finiteNumber(value) && finiteNumber(maximum) && Number(maximum) > 0
    ? ((Number(value) / Number(maximum)) * 100).toFixed(2) + "%"
    : "—";
const hasControlCharacters = (value) =>
  Array.from(String(value ?? "")).some((character) => {
    const code = character.charCodeAt(0);
    return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
  });
const apiError = (error) => getApiErrorMessage(error);
const normalizeBoard = (item) => ({
  boardId: Number(item.boardId ?? item.id),
  boardName: item.boardName ?? item.name ?? "",
  boardCode: item.boardCode ?? item.code ?? "",
});
const normalizeYear = (item) => ({
  academicYearId: Number(item.academicYearId ?? item.id),
  boardId: item.boardId == null ? null : Number(item.boardId),
  academicYearName: item.academicYearName ?? item.name ?? "",
});
const normalizeLevel = (item) => ({
  academicLevelId: Number(item.academicLevelId ?? item.id),
  levelName: item.levelName ?? item.academicLevelName ?? item.name ?? "",
});
const normalizeGroup = (item) => ({
  groupId: Number(item.groupId ?? item.id),
  groupName: item.groupName ?? item.name ?? "",
  groupCode: item.groupCode ?? item.code ?? "",
  boardId: item.boardId == null ? null : Number(item.boardId),
});
const normalizeProgram = (item) => ({
  groupProgramId: Number(item.groupProgramId ?? item.groupProgrammeId) || "",
  programId: Number(item.programId ?? item.programmeId ?? item.id),
  groupId: Number(item.groupId),
  programName: item.programName ?? item.name ?? "",
  programCode: item.programCode ?? item.code ?? "",
  category: item.category ?? item.programCategory ?? item.programType ?? "",
  active: item.isActive !== false && String(item.status ?? "active").toLowerCase() !== "inactive",
});
const normalizeSection = (item) => ({
  sectionId: Number(item.sectionId ?? item.id),
  sectionName: item.sectionName ?? item.name ?? "",
  boardId: Number(item.boardId),
  academicYearId: Number(item.academicYearId),
  academicLevelId: Number(item.academicLevelId),
  groupId: Number(item.groupId),
  programId: Number(item.programId ?? item.programmeId),
  groupProgramId: Number(item.groupProgramId ?? item.groupProgrammeId) || "",
});
const normalizeExam = (item) => ({
  examinationId: Number(item.examinationId ?? item.id),
  examCode: item.examCode ?? item.code ?? "",
  examName: item.examName ?? item.name ?? "",
  examType: item.examType ?? item.type ?? "",
  examPattern: item.examPattern ?? "",
  scheduleMode: item.scheduleMode ?? "",
  totalMarks: Number(item.totalMarks ?? 0),
  passPercentage: Number(item.passPercentage ?? 0),
  status: String(item.status ?? "").toUpperCase(),
  boardId: Number(item.boardId),
  academicYearId: Number(item.academicYearId),
  academicLevelId: Number(item.academicLevelId),
  groupId: Number(item.groupId),
  programId: Number(item.programId ?? item.programmeId),
  groupProgramId: Number(item.groupProgramId ?? item.groupProgrammeId) || "",
});
const normalizeStudent = (item) => ({
  studentId: Number(item.studentId ?? item.id),
  rollNo: item.rollNo ?? item.rollNumber ?? item.admissionNumber ?? "",
  studentName: item.studentName ?? item.fullName ?? item.name ?? "",
  internal: item.internalMarks ?? item.internal ?? null,
  practical: item.practicalMarks ?? item.practical ?? null,
  theory: item.theoryMarks ?? item.theory ?? null,
  obtainedMarks: item.obtainedMarks ?? item.totalMarks ?? item.total ?? null,
  maxMarks: item.maxMarks ?? item.subjectMaxMarks ?? null,
  total: item.totalMarks ?? item.total ?? item.obtainedMarks ?? null,
  remarks: item.remarks ?? "",
  absent: activeValue(item.isAbsent ?? item.absent),
});
const EVALUATION_STATUSES = new Set(["DRAFT", "SUBMITTED", "VERIFIED", "APPROVED", "REJECTED"]);
const normalizeEvaluation = (item) => {
  const rawStatus = String(item.status ?? "")
    .trim()
    .toUpperCase();
  return {
    ...item,
    evaluationId: Number(item.evaluationId ?? item.id),
    examinationId: Number(item.examinationId ?? item.examId),
    sectionId: Number(item.sectionId),
    programId: Number(item.programId),
    groupId: Number(item.groupId),
    subjectId: Number(item.subjectId),
    facultyId: Number(item.facultyId),
    subjectMaxMarks: Number(item.subjectMaxMarks ?? item.maxMarks ?? 0),
    status: EVALUATION_STATUSES.has(rawStatus) ? rawStatus : rawStatus || "UNKNOWN",
    rowVersion: item.rowVersion,
    submittedAt: item.submittedAt ?? "",
    verifiedAt: item.verifiedAt ?? "",
    approvedAt: item.approvedAt ?? "",
    rejectedAt: item.rejectedAt ?? "",
    internalMaxMarks: item.internalMaxMarks ?? item.components?.internalMaxMarks ?? null,
    practicalMaxMarks: item.practicalMaxMarks ?? item.components?.practicalMaxMarks ?? null,
    theoryMaxMarks: item.theoryMaxMarks ?? item.components?.theoryMaxMarks ?? null,
    subject: {
      subjectId: Number(item.subjectId),
      subjectName: item.subjectName ?? item.subject?.subjectName ?? item.subject?.name ?? "",
      subjectCode: item.subjectCode ?? item.subject?.subjectCode ?? item.subject?.code ?? "",
      practical: Boolean(item.isPractical ?? item.subject?.practical),
    },
    faculty: {
      facultyId: Number(item.facultyId),
      facultyName: item.facultyName ?? item.faculty?.facultyName ?? item.faculty?.name ?? "",
      facultyCode: item.facultyCode ?? item.employeeId ?? item.faculty?.facultyCode ?? "",
    },
    rows: collectionFrom(item.students ?? item.rows).map(normalizeStudent),
    studentsCount: Number(item.studentsCount ?? item.studentCount ?? 0),
    average: item.average ?? "—",
    highest: item.highest ?? "—",
    lowest: item.lowest ?? "—",
    adminReviewMessage: item.adminReviewMessage ?? "",
    rejectionReason: item.rejectionReason ?? "",
    resubmissionCount: Number(item.resubmissionCount ?? 0),
    reviewHistory: collectionFrom(item.reviewHistory),
  };
};
const normalizeAnalysis = (item) => ({
  ...item,
  studentId: Number(item.studentId ?? item.id),
  rollNo: item.rollNo ?? item.rollNumber ?? item.admissionNumber ?? "",
  studentName: item.studentName ?? item.fullName ?? item.name ?? "",
  marks: item.marks ?? item.subjectMarks ?? {},
  total: Number(item.total ?? item.totalMarks ?? 0),
  maximum: Number(item.maximum ?? item.maxMarks ?? 0),
  percentage: item.percentage == null ? null : Number(item.percentage),
  examinationId: Number(item.examinationId ?? item.examId) || null,
  sectionId: Number(item.sectionId) || null,
  grade: item.grade ?? "—",
  result: item.result ?? "—",
});
const objectiveExam = (exam) =>
  ["COMBINED", "COMBINED_OBJECTIVE", "OBJECTIVE_COMBINED"].includes(
    String(exam?.scheduleMode).trim().toUpperCase(),
  ) || String(exam?.examType).trim().toLowerCase() === "objective";
const passingScore = (exam) =>
  Math.ceil((Number(exam?.totalMarks) * Number(exam?.passPercentage)) / 100);
const validEvaluation = (record, exam) => {
  if (!record.rows.length) return false;
  const ids = record.rows.map((row) => row.studentId);
  if (ids.some((id) => !positiveId(id)) || new Set(ids.map(String)).size !== ids.length)
    return false;
  if (record.studentsCount > 0 && record.rows.length !== record.studentsCount) return false;
  return record.rows.every((row) => {
    if (row.absent)
      return [row.obtainedMarks, row.internal, row.practical, row.theory, row.total].every(
        (value) => value == null || value === "",
      );
    if (objectiveExam(exam)) {
      const authoritativeMax = Number(record.subjectMaxMarks);
      return (
        finiteNumber(row.obtainedMarks) &&
        finiteNumber(row.maxMarks) &&
        Number(row.maxMarks) === authoritativeMax &&
        Number(row.obtainedMarks) >= 0 &&
        Number(row.obtainedMarks) <= authoritativeMax
      );
    }
    const components = [
      [row.internal, record.internalMaxMarks, true],
      [row.practical, record.practicalMaxMarks, record.subject.practical],
      [row.theory, record.theoryMaxMarks, true],
    ];
    if (
      !finiteNumber(row.total) ||
      Number(row.total) < 0 ||
      Number(row.total) > record.subjectMaxMarks
    )
      return false;
    if (
      components.some(
        ([value, maximum, required]) =>
          required &&
          (!finiteNumber(value) ||
            !finiteNumber(maximum) ||
            Number(value) < 0 ||
            Number(value) > Number(maximum)),
      )
    )
      return false;
    return (
      components.reduce((sum, [value, , required]) => sum + (required ? Number(value) : 0), 0) ===
      Number(row.total)
    );
  });
};
const normalizeReadiness = (item) => ({
  examinationId: Number(item?.examinationId ?? item?.examId),
  sectionId: Number(item?.sectionId),
  requiredEvaluationCount: Number(item?.requiredEvaluationCount ?? 0),
  draftCount: Number(item?.draftCount ?? 0),
  submittedCount: Number(item?.submittedCount ?? 0),
  verifiedCount: Number(item?.verifiedCount ?? 0),
  approvedCount: Number(item?.approvedCount ?? 0),
  rejectedCount: Number(item?.rejectedCount ?? 0),
  missingCount: Number(item?.missingCount ?? 0),
  allRequiredEvaluationsApproved: item?.allRequiredEvaluationsApproved === true,
  readyForResults: item?.readyForResults === true,
  requiredSubjects: collectionFrom(item?.requiredSubjects),
});
const isReady = (readiness) =>
  Boolean(
    readiness &&
    readiness.requiredEvaluationCount > 0 &&
    readiness.approvedCount === readiness.requiredEvaluationCount &&
    ["draftCount", "submittedCount", "verifiedCount", "rejectedCount", "missingCount"].every(
      (key) => readiness[key] === 0,
    ) &&
    readiness.allRequiredEvaluationsApproved &&
    readiness.readyForResults,
  );

export default function MarksEntryPage() {
  const emptyFilters = {
    board: "",
    academicYear: "",
    academicLevel: "",
    group: "",
    program: "",
    section: "",
    examination: "",
  };
  const [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(null);
  const [boards, setBoards] = useState([]),
    [academicYears, setAcademicYears] = useState([]),
    [academicLevels, setAcademicLevels] = useState([]),
    [groups, setGroups] = useState([]),
    [programs, setPrograms] = useState([]),
    [sections, setSections] = useState([]),
    [examinations, setExaminations] = useState([]),
    [evaluations, setEvaluations] = useState([]),
    [studentAnalysis, setStudentAnalysis] = useState([]),
    [readiness, setReadiness] = useState(null),
    [evaluationLoadState, setEvaluationLoadState] = useState("idle");
  const [tab, setTab] = useState("evaluations"),
    [search, setSearch] = useState(""),
    [studentSearch, setStudentSearch] = useState("");
  const [evaluationId, setEvaluationId] = useState(null),
    [studentId, setStudentId] = useState(null),
    [page, setPage] = useState(1),
    [studentPage, setStudentPage] = useState(1);
  const [selectedEvaluationDetails, setSelectedEvaluationDetails] = useState(null),
    [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [toast, setToast] = useState(null),
    [decision, setDecision] = useState(null),
    [message, setMessage] = useState(""),
    [globalStage, setGlobalStage] = useState(null);
  const [checkingEvaluations, setCheckingEvaluations] = useState(false),
    [actionLoading, setActionLoading] = useState("");
  const toastRef = useRef(null),
    requests = useRef({
      groups: 0,
      programs: 0,
      sections: 0,
      exams: 0,
      search: 0,
      details: 0,
      readiness: 0,
      analysis: 0,
      student: 0,
    });
  const showToast = useCallback((msg, type = "success") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => toastRef.current && clearTimeout(toastRef.current), []);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get(EVALUATION_API.boards),
      apiClient.get(EVALUATION_API.academicYears),
      apiClient.get(EVALUATION_API.academicLevels),
    ]).then(([boardResult, yearResult, levelResult]) => {
      if (!active) return;
      if (boardResult.status === "fulfilled")
        setBoards(
          masterCollectionFrom(boardResult.value.data)
            .filter(isActive)
            .map(normalizeBoard)
            .filter((item) => item.boardId > 0),
        );
      else showToast(apiError(boardResult.reason), "error");
      if (yearResult.status === "fulfilled")
        setAcademicYears(
          masterCollectionFrom(yearResult.value.data)
            .map(normalizeYear)
            .filter((item) => item.academicYearId > 0),
        );
      else showToast(apiError(yearResult.reason), "error");
      if (levelResult.status === "fulfilled")
        setAcademicLevels(
          masterCollectionFrom(levelResult.value.data)
            .map(normalizeLevel)
            .filter((item) => item.academicLevelId > 0),
        );
      else showToast(apiError(levelResult.reason), "error");
    });
    return () => {
      active = false;
    };
  }, [showToast]);
  const clearResults = () => {
    setApplied(null);
    setEvaluations([]);
    setStudentAnalysis([]);
    setEvaluationId(null);
    setStudentId(null);
    setSelectedEvaluationDetails(null);
    setSelectedStudentDetails(null);
    setReadiness(null);
    setEvaluationLoadState("idle");
  };
  const loadGroups = async (boardId) => {
    const sequence = ++requests.current.groups;
    setGroups([]);
    setPrograms([]);
    setSections([]);
    setExaminations([]);
    const id = Number(boardId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const response = await apiClient.get(EVALUATION_API.groupsByBoard(id));
      if (sequence !== requests.current.groups) return;
      setGroups(
        collectionFrom(response.data)
          .filter(isActive)
          .map(normalizeGroup)
          .filter((item) => item.groupId > 0),
      );
    } catch (error) {
      if (sequence === requests.current.groups) showToast(apiError(error), "error");
    }
  };
  const loadPrograms = async (groupId) => {
    const sequence = ++requests.current.programs;
    setPrograms([]);
    setSections([]);
    setExaminations([]);
    const id = Number(groupId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const response = await apiClient.get(EVALUATION_API.programsByGroup(id));
      if (sequence !== requests.current.programs) return;
      setPrograms(
        collectionFrom(response.data)
          .map(normalizeProgram)
          .filter((item) => item.programId > 0 && item.programName && item.active),
      );
    } catch {
      if (sequence === requests.current.programs)
        showToast("Unable to load programs for the selected group.", "error");
    }
  };
  const loadSections = async (context) => {
    const sequence = ++requests.current.sections;
    setSections([]);
    if (
      ![
        context.board,
        context.academicYear,
        context.academicLevel,
        context.group,
        context.program,
      ].every((value) => Number(value) > 0)
    )
      return;
    try {
      const response = await apiClient.get(EVALUATION_API.sections, {
        params: {
          boardId: Number(context.board),
          academicYearId: Number(context.academicYear),
          academicLevelId: Number(context.academicLevel),
          groupId: Number(context.group),
          programId: Number(context.program),
          isActive: true,
        },
      });
      if (sequence !== requests.current.sections) return;
      setSections(
        collectionFrom(response.data)
          .map(normalizeSection)
          .filter(
            (item) =>
              item.sectionId > 0 &&
              item.boardId === Number(context.board) &&
              item.academicYearId === Number(context.academicYear) &&
              item.academicLevelId === Number(context.academicLevel) &&
              item.groupId === Number(context.group) &&
              item.programId === Number(context.program),
          ),
      );
    } catch (error) {
      if (sequence === requests.current.sections) showToast(apiError(error), "error");
    }
  };
  const loadExaminations = async (context) => {
    const sequence = ++requests.current.exams;
    setExaminations([]);
    if (
      ![
        context.board,
        context.academicYear,
        context.academicLevel,
        context.group,
        context.program,
      ].every((value) => Number(value) > 0)
    )
      return;
    try {
      const response = await apiClient.get(EVALUATION_API.examinations, {
        params: {
          BoardId: Number(context.board),
          AcademicYearId: Number(context.academicYear),
          AcademicLevelId: Number(context.academicLevel),
          GroupId: Number(context.group),
          ProgramId: Number(context.program),
          Status: "COMPLETED",
        },
      });
      if (sequence !== requests.current.exams) return;
      const next = collectionFrom(response.data)
        .map(normalizeExam)
        .filter((item) => item.examinationId > 0 && item.status === "COMPLETED");
      setExaminations(next);
      return next;
    } catch (error) {
      if (sequence === requests.current.exams) showToast(apiError(error), "error");
      return null;
    }
  };
  const searchPayload = (context) => ({
    boardId: Number(context.board),
    academicYearId: Number(context.academicYear),
    academicLevelId: Number(context.academicLevel),
    programId: Number(context.program),
    groupId: Number(context.group),
    sectionId: Number(context.section),
    examinationId: Number(context.examination),
    pageNumber: 1,
    pageSize: 1000,
  });
  const loadReadiness = async (context, searchResponse = null) => {
    const sequence = ++requests.current.readiness;
    const responseRoot =
      searchResponse?.data &&
      typeof searchResponse.data === "object" &&
      !Array.isArray(searchResponse.data)
        ? searchResponse.data
        : null;
    const embedded =
      responseRoot?.readiness ??
      responseRoot?.metadata?.readiness ??
      responseRoot?.data?.readiness ??
      responseRoot?.result?.readiness ??
      (responseRoot?.requiredEvaluationCount != null ? responseRoot : null);
    if (embedded) {
      const next = normalizeReadiness(embedded);
      if (sequence === requests.current.readiness) setReadiness(next);
      return next;
    }
    try {
      const response = await apiClient.get(EVALUATION_API.readiness, {
        params: {
          examinationId: Number(context.examination),
          sectionId: Number(context.section),
        },
      });
      if (sequence !== requests.current.readiness) return null;
      const payload = objectFrom(response.data);
      const next = payload ? normalizeReadiness(payload) : null;
      setReadiness(next);
      return next;
    } catch (error) {
      if (sequence === requests.current.readiness) {
        setReadiness(null);
        if (error?.response?.status !== 404) showToast(apiError(error), "error");
      }
      return null;
    }
  };
  const loadEvaluations = async (context) => {
    const sequence = ++requests.current.search;
    setEvaluationLoadState("loading");
    try {
      const response = await apiClient.post(EVALUATION_API.search, searchPayload(context));
      if (sequence !== requests.current.search) return null;
      let next = collectionFrom(response.data)
        .map(normalizeEvaluation)
        .filter((item) => item.evaluationId > 0);
      const root =
        response.data && typeof response.data === "object" && !Array.isArray(response.data)
          ? response.data
          : {};
      const totalCount = Number(
        root.totalCount ??
          root.pagination?.totalCount ??
          root.data?.totalCount ??
          root.result?.totalCount ??
          next.length,
      );
      let pageNumber = 1;
      while (Number.isFinite(totalCount) && next.length < totalCount) {
        pageNumber += 1;
        const pageResponse = await apiClient.post(EVALUATION_API.search, {
          ...searchPayload(context),
          pageNumber,
        });
        if (sequence !== requests.current.search) return null;
        const pageItems = collectionFrom(pageResponse.data)
          .map(normalizeEvaluation)
          .filter((item) => item.evaluationId > 0);
        if (!pageItems.length) break;
        const previousSize = next.length;
        next = [
          ...new Map(
            [...next, ...pageItems].map((item) => [String(item.evaluationId), item]),
          ).values(),
        ];
        if (next.length === previousSize) break;
      }
      setEvaluations(next);
      setEvaluationLoadState("success");
      await loadReadiness(context, response);
      return next;
    } catch (error) {
      if (sequence === requests.current.search) {
        setEvaluations([]);
        setEvaluationLoadState("error");
        showToast(apiError(error), "error");
      }
      return null;
    }
  };
  const loadEvaluationDetails = async (record) => {
    const sequence = ++requests.current.details;
    setEvaluationId(record.evaluationId);
    setSelectedEvaluationDetails((current) =>
      String(current?.evaluationId) === String(record.evaluationId) ? current : null,
    );
    setPage(1);
    try {
      const response = await apiClient.get(EVALUATION_API.students(record.evaluationId));
      if (sequence !== requests.current.details) return;
      const payload = response.data?.data ?? response.data?.result ?? response.data,
        normalized =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? normalizeEvaluation(payload)
            : null;
      if (normalized) {
        const expected = {
          evaluationId: record.evaluationId,
          examinationId: applied?.examination ?? record.examinationId,
          sectionId: applied?.section ?? record.sectionId,
          subjectId: record.subjectId,
        };
        const mismatch = Object.entries(expected).some(
          ([key, value]) =>
            positiveId(normalized[key]) && String(normalized[key]) !== String(value),
        );
        if (mismatch)
          throw new Error("The Evaluation detail response did not match the selected context.");
      }
      const detail = {
        ...record,
        ...(normalized || {}),
        subject: normalized?.subject?.subjectName ? normalized.subject : record.subject,
        faculty: normalized?.faculty?.facultyName ? normalized.faculty : record.faculty,
        rows: collectionFrom(
          payload?.students ?? payload?.studentMarks ?? payload?.marks ?? payload,
        ).map(normalizeStudent),
      };
      setSelectedEvaluationDetails(detail);
      return detail;
    } catch (error) {
      if (sequence === requests.current.details) {
        showToast(apiError(error), "error");
      }
      return null;
    }
  };
  const loadAnalysis = async (context = applied) => {
    if (!context) return;
    if (!isReady(readiness)) {
      setStudentAnalysis([]);
      return;
    }
    const sequence = ++requests.current.analysis;
    try {
      const response = await apiClient.get(EVALUATION_API.studentAnalysis, {
        params: {
          academicYearId: Number(context.academicYear),
          groupId: Number(context.group),
          sectionId: Number(context.section),
          examinationId: Number(context.examination),
          boardId: Number(context.board),
          academicLevelId: Number(context.academicLevel),
        },
      });
      if (sequence !== requests.current.analysis) return;
      setStudentAnalysis(
        collectionFrom(response.data)
          .map(normalizeAnalysis)
          .filter((item) => item.studentId > 0),
      );
    } catch (error) {
      if (sequence === requests.current.analysis) {
        setStudentAnalysis([]);
        showToast(apiError(error), "error");
      }
    }
  };
  const loadStudentDetails = async (student) => {
    const sequence = ++requests.current.student;
    setStudentId(student.studentId);
    setSelectedStudentDetails(null);
    try {
      const response = await apiClient.get(
        EVALUATION_API.studentDetails(Number(student.studentId)),
      );
      if (sequence !== requests.current.student) return;
      const payload = response.data?.data ?? response.data?.result ?? response.data;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const returnedExamId = payload.examinationId ?? payload.examId;
        const returnedSectionId = payload.sectionId;
        if (
          (positiveId(returnedExamId) && String(returnedExamId) !== String(applied?.examination)) ||
          (positiveId(returnedSectionId) && String(returnedSectionId) !== String(applied?.section))
        )
          throw new Error("The Student Analysis detail did not match the selected context.");
      }
      setSelectedStudentDetails({
        ...student,
        ...(payload && typeof payload === "object" ? normalizeAnalysis(payload) : {}),
      });
    } catch (error) {
      if (sequence === requests.current.student) {
        setStudentId(null);
        showToast(apiError(error), "error");
      }
    }
  };
  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === "board") {
      const selectedYear = academicYears.find(
        (item) => String(item.academicYearId) === String(next.academicYear),
      );
      Object.assign(next, {
        academicYear:
          selectedYear &&
          (selectedYear.boardId == null || String(selectedYear.boardId) === String(value))
            ? next.academicYear
            : "",
        group: "",
        program: "",
        section: "",
        examination: "",
      });
      requests.current.groups += 1;
      requests.current.programs += 1;
    }
    if (key === "academicYear" || key === "academicLevel")
      Object.assign(next, { section: "", examination: "" });
    if (key === "group") Object.assign(next, { program: "", section: "", examination: "" });
    if (key === "program") Object.assign(next, { section: "", examination: "" });
    setFilters(next);
    requests.current.sections += 1;
    requests.current.exams += 1;
    requests.current.search += 1;
    requests.current.details += 1;
    requests.current.readiness += 1;
    requests.current.analysis += 1;
    requests.current.student += 1;
    clearResults();
    if (key === "board") loadGroups(value);
    if (key === "group") loadPrograms(value);
    if (
      ["academicYear", "academicLevel", "program"].includes(key) &&
      [next.board, next.academicYear, next.academicLevel, next.group, next.program].every(
        (item) => Number(item) > 0,
      )
    ) {
      loadSections(next);
      loadExaminations(next);
    }
  };
  const allSelected = Object.values(filters).every(Boolean);
  const checkData = async () => {
    if (checkingEvaluations) return;
    if (!allSelected) return showToast("Select all 7 evaluation filters.", "error");
    const context = { ...filters };
    setCheckingEvaluations(true);
    try {
      const latestExams = await loadExaminations(context);
      if (!latestExams) return;
      const selectedExam = latestExams.find(
        (item) =>
          String(item.examinationId) === String(context.examination) &&
          item.status === "COMPLETED" &&
          ["boardId", "academicYearId", "academicLevelId", "groupId", "programId"].every(
            (field, index) =>
              String(item[field]) ===
              String(
                [
                  context.board,
                  context.academicYear,
                  context.academicLevel,
                  context.group,
                  context.program,
                ][index],
              ),
          ),
      );
      if (!selectedExam)
        return showToast(
          "The selected Examination is no longer a COMPLETED match for this academic context.",
          "error",
        );
      const next = await loadEvaluations(context);
      if (next === null) return;
      setApplied(context);
      setEvaluationId(null);
      setStudentId(null);
      setSelectedEvaluationDetails(null);
      setSelectedStudentDetails(null);
      setTab("evaluations");
      setPage(1);
      setStudentPage(1);
    } finally {
      setCheckingEvaluations(false);
    }
  };
  const exam = examinations.find(
    (item) => String(item.examinationId) === String(applied?.examination),
  );
  const section = sections.find((item) => String(item.sectionId) === String(applied?.section));
  const contextEvaluations = evaluations;
  const selectedEvaluation =
    selectedEvaluationDetails &&
    String(selectedEvaluationDetails.evaluationId) === String(evaluationId)
      ? selectedEvaluationDetails
      : null;
  const subjects = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...contextEvaluations.map((item) => item.subject),
            ...studentAnalysis.flatMap((student) =>
              Array.isArray(student.subjectMarks)
                ? student.subjectMarks.map((item) => ({
                    subjectId: Number(item.subjectId),
                    subjectName: item.subjectName ?? item.name ?? "",
                    subjectCode: item.subjectCode ?? item.code ?? "",
                    practical: Boolean(item.isPractical),
                  }))
                : [],
            ),
          ]
            .filter((item) => item?.subjectId)
            .map((item) => [String(item.subjectId), item]),
        ).values(),
      ),
    [contextEvaluations, studentAnalysis],
  );
  const filteredEvaluations = contextEvaluations.filter((item) =>
    `${item.subject.subjectName} ${item.faculty.facultyName} ${item.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filteredStudents = studentAnalysis.filter((item) =>
      `${item.rollNo} ${item.studentName}`.toLowerCase().includes(studentSearch.toLowerCase()),
    ),
    studentPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE)),
    pagedStudents = filteredStudents.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE),
    selectedStudent =
      selectedStudentDetails && String(selectedStudentDetails.studentId) === String(studentId)
        ? selectedStudentDetails
        : null;
  const submitted = contextEvaluations.filter((item) => item.status === "SUBMITTED"),
    verified = contextEvaluations.filter((item) => item.status === "VERIFIED"),
    globalAction = submitted.length ? "VERIFY_ALL" : verified.length ? "APPROVE_ALL" : null;
  const readyForResults = isReady(readiness);
  const reloadAfterAction = async () => {
    const next = await loadEvaluations(applied);
    const current = next?.find((item) => String(item.evaluationId) === String(evaluationId));
    if (current) await loadEvaluationDetails(current);
  };
  const ensureCompletedContext = async () => {
    if (!applied) return false;
    const latest = await loadExaminations(applied);
    return Boolean(
      latest?.some(
        (item) =>
          String(item.examinationId) === String(applied.examination) &&
          item.status === "COMPLETED" &&
          String(item.sectionId ?? applied.section) === String(applied.section),
      ),
    );
  };
  const confirmDecision = async () => {
    const reviewMessage = message.trim().replace(/\s+/g, " ");
    if (!selectedEvaluation || reviewMessage.length < 5 || actionLoading) return;
    if (reviewMessage.length > 500 || hasControlCharacters(message))
      return showToast(
        "Review messages must be 5-500 characters and contain no unsupported control characters.",
        "error",
      );
    if (!(await ensureCompletedContext()))
      return showToast("This Examination is no longer available as COMPLETED.", "error");
    const latest = await loadEvaluationDetails(selectedEvaluation);
    if (!latest) return;
    if (decision === "VERIFY" && latest.status !== "SUBMITTED")
      return showToast("Only the latest SUBMITTED evaluation can be verified.", "error");
    if (decision === "REJECT" && !["SUBMITTED", "VERIFIED"].includes(latest.status))
      return showToast("Only SUBMITTED or VERIFIED evaluations can be rejected.", "error");
    if (decision === "VERIFY" && !validEvaluation(latest, exam))
      return showToast(
        `Cannot verify ${selectedEvaluation.subject.subjectName}. One or more student mark records are invalid.`,
        "error",
      );
    setActionLoading(decision);
    try {
      if (decision === "VERIFY")
        await apiClient.patch(EVALUATION_API.verify(latest.evaluationId), {
          message: reviewMessage,
          ...(latest.rowVersion != null ? { rowVersion: latest.rowVersion } : {}),
        });
      else
        await apiClient.patch(EVALUATION_API.reject(latest.evaluationId), {
          remarks: reviewMessage,
          reason: reviewMessage,
          message: reviewMessage,
          ...(latest.rowVersion != null ? { rowVersion: latest.rowVersion } : {}),
        });
      await reloadAfterAction();
      setDecision(null);
      setMessage("");
      showToast(`Evaluation ${decision === "VERIFY" ? "verified" : "rejected"} successfully.`);
    } catch (error) {
      showToast(apiError(error), "error");
      if (error?.response?.status === 409) await reloadAfterAction();
    } finally {
      setActionLoading("");
    }
  };
  const approve = async () => {
    if (selectedEvaluation?.status !== "VERIFIED")
      return showToast("Only VERIFIED evaluations can be approved.", "error");
    if (actionLoading) return;
    if (!(await ensureCompletedContext()))
      return showToast("This Examination is no longer available as COMPLETED.", "error");
    const latest = await loadEvaluationDetails(selectedEvaluation);
    if (!latest || latest.status !== "VERIFIED")
      return showToast("Only the latest VERIFIED evaluation can be approved.", "error");
    setActionLoading("APPROVE");
    try {
      await apiClient.patch(EVALUATION_API.approve(latest.evaluationId), {
        ...(latest.rowVersion != null ? { rowVersion: latest.rowVersion } : {}),
      });
      await reloadAfterAction();
      showToast("Evaluation approved successfully.");
    } catch (error) {
      showToast(apiError(error), "error");
      if (error?.response?.status === 409) await reloadAfterAction();
    } finally {
      setActionLoading("");
    }
  };
  const confirmGlobal = async () => {
    if (!globalStage || actionLoading) return;
    if (!(await ensureCompletedContext()))
      return showToast("This Examination is no longer available as COMPLETED.", "error");
    if (
      globalStage === "VERIFY_ALL" &&
      submitted.length > 0 &&
      submitted.every((item) => item.rows.length > 0)
    ) {
      const invalid = submitted.find((item) => item.rows.length && !validEvaluation(item, exam));
      if (invalid) {
        setGlobalStage(null);
        return showToast(
          `Verify All cannot continue. ${invalid.subject.subjectName} contains invalid marks.`,
          "error",
        );
      }
    }
    setActionLoading(globalStage);
    try {
      await apiClient.post(
        globalStage === "VERIFY_ALL" ? EVALUATION_API.verifyAll : EVALUATION_API.approveAll,
        searchPayload(applied),
      );
      await loadEvaluations(applied);
      showToast(
        globalStage === "VERIFY_ALL"
          ? "All eligible submitted evaluations verified."
          : "All VERIFIED evaluations approved.",
      );
      setGlobalStage(null);
    } catch (error) {
      showToast(apiError(error), "error");
      if (error?.response?.status === 409) await loadEvaluations(applied);
    } finally {
      setActionLoading("");
    }
  };
  const display = {
    group: groups.find((item) => String(item.groupId) === String(applied?.group))?.groupName || "—",
    program:
      programs.find((item) => String(item.programId) === String(applied?.program))?.programName ||
      "—",
    section: section?.sectionName || "—",
    examination: exam?.examName || "—",
  };
  const options = {
    boards: boards.map((item) => [item.boardId, item.boardName]),
    years: uniqueAcademicYearsByName(academicYears
      .filter(
        (item) =>
          !filters.board ||
          item.boardId == null ||
          Number(item.boardId) === Number(filters.board),
      )
      .map((item) => [item.academicYearId, item.academicYearName]), (item) => item[1]),
    levels: academicLevels.map((item) => [item.academicLevelId, item.levelName]),
    groups: groups.map((item) => [item.groupId, item.groupName]),
    programs: programs.map((item) => [item.programId, item.programName]),
    sections: sections.map((item) => [item.sectionId, item.sectionName]),
    exams: examinations.map((item) => [item.examinationId, item.examName]),
  };
  return (
    <DashboardLayout
      title="Marks Evaluation"
      subtitle="Review and approve faculty-submitted examination marks"
      breadcrumb={["Marks Evaluation"]}
    >
      <div className="cms-marks-entry">
        {toast && <div className={`cms-toast-banner cms-toast-${toast.type}`}>{toast.msg}</div>}
        <section className="cms-card cms-card-filter">
          <div className="cms-section-heading">
            <div>
              <h2>Evaluation Filters</h2>
              <p>Select the completed examination context to review faculty submissions.</p>
            </div>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={!allSelected || checkingEvaluations}
              onClick={checkData}
            >
              {checkingEvaluations ? "Checking..." : "Check Evaluation Data"}
            </button>
          </div>
          <div className="cms-filter-grid">
            <Filter
              label="Board"
              value={filters.board}
              options={options.boards}
              onChange={(v) => changeFilter("board", v)}
            />
            <Filter
              label="Academic Year"
              value={filters.academicYear}
              options={options.years}
              onChange={(v) => changeFilter("academicYear", v)}
            />
            <Filter
              label="Academic Level"
              value={filters.academicLevel}
              options={options.levels}
              onChange={(v) => changeFilter("academicLevel", v)}
            />
            <Filter
              label="Group"
              value={filters.group}
              options={options.groups}
              onChange={(v) => changeFilter("group", v)}
            />
            <Filter
              label="Program"
              value={filters.program}
              options={options.programs}
              onChange={(v) => changeFilter("program", v)}
            />
            <Filter
              label="Section"
              value={filters.section}
              options={options.sections}
              onChange={(v) => changeFilter("section", v)}
            />
            <Filter
              label="Examination"
              value={filters.examination}
              options={options.exams}
              onChange={(v) => changeFilter("examination", v)}
            />
          </div>
        </section>
        {applied ? (
          selectedEvaluation ? (
            <EvaluationDetails
              evaluation={selectedEvaluation}
              exam={exam}
              display={display}
              page={page}
              setPage={setPage}
              onBack={() => {
                setEvaluationId(null);
                setSelectedEvaluationDetails(null);
              }}
              onVerify={() => {
                setDecision("VERIFY");
                setMessage("");
              }}
              onReject={() => {
                setDecision("REJECT");
                setMessage("");
              }}
              onApprove={approve}
              actionLoading={actionLoading}
            />
          ) : selectedStudent ? (
            <StudentDetails
              student={selectedStudent}
              exam={exam}
              subjects={subjects}
              evaluations={contextEvaluations}
              display={display}
              onBack={() => {
                setStudentId(null);
                setSelectedStudentDetails(null);
              }}
            />
          ) : (
            <section className="cms-card cms-main-card">
              <div className="cms-detail-grid">
                <Card label="Exam Pattern" value={exam?.examPattern} />
                <Card label="Exam Type" value={exam?.examType} />
                <Card label="Total Marks" value={exam?.totalMarks} />
                <Card label="Pass Percentage" value={`${exam?.passPercentage ?? 0}%`} />
              </div>
              <div className="cms-table-toolbar">
                <div className="cms-tab-bar">
                  <button
                    className={`cms-tab-btn ${tab === "evaluations" ? "cms-active" : ""}`}
                    onClick={() => setTab("evaluations")}
                  >
                    Evaluation
                  </button>
                  <button
                    className={`cms-tab-btn ${tab === "students" ? "cms-active" : ""}`}
                    onClick={() => {
                      setTab("students");
                      if (!studentAnalysis.length) loadAnalysis();
                    }}
                  >
                    Student Analysis
                  </button>
                </div>
                <div className="cms-search-wrap">
                  <span className="cms-search-icon">🔍</span>
                  <input
                    className="cms-search-input"
                    value={tab === "evaluations" ? search : studentSearch}
                    onChange={(e) => {
                      if (tab === "evaluations") setSearch(e.target.value);
                      else {
                        setStudentSearch(e.target.value);
                        setStudentPage(1);
                      }
                    }}
                    placeholder={
                      tab === "evaluations"
                        ? "Search subject, faculty, status..."
                        : "Search roll number or student..."
                    }
                  />
                </div>
                {tab === "evaluations" && globalAction && (
                  <button
                    className={`cms-btn ${globalAction === "VERIFY_ALL" ? "cms-btn-info" : "cms-btn-success"}`}
                    disabled={Boolean(actionLoading)}
                    onClick={() => setGlobalStage(globalAction)}
                  >
                    {actionLoading === globalAction
                      ? globalAction === "VERIFY_ALL"
                        ? "Verifying All..."
                        : "Approving All..."
                      : globalAction === "VERIFY_ALL"
                        ? "Verify All"
                        : "Approve All"}
                  </button>
                )}
              </div>
              {tab === "evaluations" ? (
                <EvaluationTable
                  rows={filteredEvaluations}
                  onClick={loadEvaluationDetails}
                  emptyMessage={
                    evaluationLoadState === "error"
                      ? "Evaluation data could not be loaded."
                      : "No submitted evaluation records are available."
                  }
                />
              ) : (
                <StudentTable
                  rows={pagedStudents}
                  subjects={subjects}
                  exam={exam}
                  onClick={loadStudentDetails}
                />
              )}
              {tab === "students" && (
                <>
                  <p className="cms-analysis-status">
                    {readyForResults
                      ? "All subject evaluations approved. Ready for Results."
                      : "Evaluation in progress"}
                  </p>
                  <Pagination page={studentPage} total={studentPages} setPage={setStudentPage} />
                </>
              )}
            </section>
          )
        ) : (
          <div className="cms-card cms-empty-table">
            <p>
              Select all 7 evaluation filters and click <strong>Check Evaluation Data</strong> to
              view evaluation status &amp; student marks.
            </p>
          </div>
        )}
        {decision && (
          <MessageModal
            title={decision === "VERIFY" ? "Verify Evaluation" : "Reject Evaluation"}
            label={decision === "VERIFY" ? "Admin Review Message" : "Correction Message"}
            value={message}
            setValue={setMessage}
            danger={decision === "REJECT"}
            onCancel={() => setDecision(null)}
            onConfirm={confirmDecision}
            loading={actionLoading === decision}
          />
        )}
        {globalStage && (
          <ConfirmModal
            title={
              globalStage === "VERIFY_ALL" ? "Verify All Evaluations" : "Approve All Evaluations"
            }
            message={
              globalStage === "VERIFY_ALL"
                ? `Verify All will apply to ${submitted.length} SUBMITTED evaluations in this selection context.`
                : `Approve All will apply to ${verified.length} VERIFIED evaluations in this selection context.`
            }
            onCancel={() => setGlobalStage(null)}
            onConfirm={confirmGlobal}
            loading={actionLoading === globalStage}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
function Filter({ label, value, options, disabled, onChange }) {
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
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
function EvaluationTable({ rows, onClick, emptyMessage }) {
  return (
    <div className="cms-table-container">
      <table className="cms-table">
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>FACULTY</th>
            <th>STUDENTS</th>
            <th>AVERAGE / MAX</th>
            <th>HIGHEST</th>
            <th>LOWEST</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((item) => (
              <tr
                className="cms-clickable-row"
                key={item.evaluationId}
                onClick={() => onClick(item)}
              >
                <td className="cms-font-semibold">
                  {item.subject.subjectName}
                  <small className="cms-row-subtitle">{item.subject.subjectCode}</small>
                </td>
                <td>
                  {item.faculty.facultyName} - {item.faculty.facultyCode}
                </td>
                <td className="cms-text-center">{item.studentsCount || item.rows.length}</td>
                <td className="cms-text-center">
                  {item.average} / {item.subjectMaxMarks}
                </td>
                <td className="cms-text-center">{item.highest}</td>
                <td className="cms-text-center">{item.lowest}</td>
                <td className="cms-text-center">
                  <Badge status={item.status} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="cms-empty-td">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function StudentTable({ rows, subjects, exam, onClick }) {
  return (
    <div className="cms-table-container">
      <table className="cms-table">
        <thead>
          <tr>
            <th>ROLL NO</th>
            <th>STUDENT</th>
            {subjects.map((s) => (
              <th key={s.subjectId}>{s.subjectName}</th>
            ))}
            <th>TOTAL / EXAM TOTAL</th>
            <th>PERCENTAGE</th>
            <th>GRADE</th>
            <th>RESULT</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((student) => (
              <tr
                className="cms-clickable-row"
                key={student.studentId}
                onClick={() => onClick(student)}
              >
                <td className="cms-font-semibold">{student.rollNo}</td>
                <td>{student.studentName}</td>
                {subjects.map((s) => (
                  <td className="cms-text-center" key={s.subjectId}>
                    {student.marks[String(s.subjectId)] ?? "—"}
                  </td>
                ))}
                <td className="cms-text-center">
                  {student.total} / {exam.totalMarks}
                </td>
                <td className="cms-text-center">{safePercent(student.percentage)}</td>
                <td className="cms-text-center">{student.grade}</td>
                <td className="cms-text-center">{student.result}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6 + subjects.length} className="cms-empty-td">
                No student analysis records available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function EvaluationDetails({
  evaluation,
  exam,
  display,
  page,
  setPage,
  onBack,
  onVerify,
  onReject,
  onApprove,
  actionLoading,
}) {
  const subject = evaluation.subject,
    faculty = evaluation.faculty,
    total = Math.max(1, Math.ceil(evaluation.rows.length / PAGE_SIZE)),
    rows = evaluation.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="cms-card cms-main-card cms-evaluation-details">
      <div className="cms-details-header">
        <div>
          <button className="cms-back-btn" onClick={onBack}>
            ← Back to Evaluations
          </button>
          <h2 className="cms-details-title">
            {subject.subjectName} ({subject.subjectCode}) Evaluation Marks Breakdown
          </h2>
          <span className="cms-details-subtitle">
            Review faculty-submitted student marks for this subject
          </span>
        </div>
      </div>
      <div className="cms-detail-grid">
        <Card label="Faculty" value={`${faculty.facultyName} - ${faculty.facultyCode}`} />
        <Card label="Group" value={display.group} />
        <Card label="Program" value={display.program} />
        <Card label="Section" value={display.section} />
        <Card label="Examination" value={display.examination} />
        <Card label="Exam Type" value={exam?.examType} />
        <Card label="Subject Max Marks" value={evaluation.subjectMaxMarks} />
        <Card label="Exam Pattern" value={exam?.examPattern} />
      </div>
      <MarksTable rows={rows} objective={objectiveExam(exam)} practical={subject.practical} />
      <Pagination page={page} total={total} setPage={setPage} />
      <div className="cms-modal-actions">
        {evaluation.status === "SUBMITTED" && (
          <>
            <button
              className="cms-btn cms-btn-info"
              disabled={Boolean(actionLoading)}
              onClick={onVerify}
            >
              <Check /> Verify
            </button>
            <button
              className="cms-btn cms-btn-danger"
              disabled={Boolean(actionLoading)}
              onClick={onReject}
            >
              <Cross /> Reject
            </button>
          </>
        )}
        {evaluation.status === "VERIFIED" && (
          <>
            <button
              className="cms-btn cms-btn-success"
              disabled={Boolean(actionLoading)}
              onClick={onApprove}
            >
              <Check /> {actionLoading === "APPROVE" ? "Approving..." : "Approve"}
            </button>
            <button
              className="cms-btn cms-btn-danger"
              disabled={Boolean(actionLoading)}
              onClick={onReject}
            >
              <Cross /> Reject
            </button>
          </>
        )}
        {evaluation.status === "APPROVED" && (
          <span className="cms-status-pill cms-status-approved">
            <Check /> Approved
          </span>
        )}
        {evaluation.status === "REJECTED" && (
          <span className="cms-status-pill cms-status-rejected">
            <Cross /> Returned to Faculty for correction
          </span>
        )}
      </div>
    </div>
  );
}
function MarksTable({ rows, objective, practical }) {
  return (
    <div className="cms-table-container cms-details-table-wrap">
      <table className="cms-table cms-details-table">
        <thead>
          <tr>
            <th>ROLL NO</th>
            <th>STUDENT NAME</th>
            {objective ? (
              <>
                <th>OBTAINED MARKS</th>
                <th>MAX MARKS</th>
                <th>PERCENTAGE</th>
              </>
            ) : (
              <>
                <th>INTERNAL</th>
                {practical && <th>PRACTICAL</th>}
                <th>THEORY</th>
                <th>TOTAL</th>
              </>
            )}
            <th>REMARKS</th>
            <th>ABSENT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td>{row.rollNo}</td>
              <td>{row.studentName}</td>
              {objective ? (
                <>
                  <td>{row.absent ? "—" : row.obtainedMarks}</td>
                  <td>{row.maxMarks}</td>
                  <td>{row.absent ? "—" : percentageOf(row.obtainedMarks, row.maxMarks)}</td>
                </>
              ) : (
                <>
                  <td>{row.absent ? "—" : row.internal}</td>
                  {practical && <td>{row.absent ? "—" : row.practical}</td>}
                  <td>{row.absent ? "—" : row.theory}</td>
                  <td>{row.absent ? "—" : row.total}</td>
                </>
              )}
              <td>{row.remarks}</td>
              <td>{row.absent ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StudentDetails({ student, exam, subjects, evaluations, display, onBack }) {
  const objective = objectiveExam(exam),
    details = subjects.map((subject) => {
      const record = evaluations.find(
          (item) => String(item.subjectId) === String(subject.subjectId),
        ),
        evalRow = record?.rows?.find((item) => item.studentId === student.studentId),
        markVal =
          student?.marks?.[String(subject.subjectId)] ??
          student?.marks?.[subject.subjectId] ??
          null,
        row = evalRow || (markVal != null ? { obtainedMarks: markVal, total: markVal } : null);
      return { subject, row, max: record?.subjectMaxMarks || exam?.totalMarks || "—" };
    });
  return (
    <div className="cms-card cms-main-card cms-student-details">
      <div className="cms-details-header">
        <div>
          <button className="cms-back-btn" onClick={onBack}>
            ← Back To Student Analysis
          </button>
          <h2 className="cms-details-title">Student Detailed Report</h2>
        </div>
      </div>
      <div className="cms-detail-grid">
        <Card label="Roll Number" value={student.rollNo} />
        <Card label="Student Name" value={student.studentName} />
        <Card label="Group" value={display.group} />
        <Card label="Program" value={display.program} />
        <Card label="Section" value={display.section} />
        <Card label="Examination" value={display.examination} />
        <Card label="Exam Type" value={exam.examType} />
        <Card label="Percentage" value={safePercent(student.percentage)} />
        <Card label="Grade" value={student.grade} />
        <Card label="Result" value={student.result} />
      </div>
      <div className="cms-table-container cms-details-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>SUBJECT</th>
              {objective ? (
                <>
                  <th>OBTAINED</th>
                  <th>MAX</th>
                  <th>PERCENTAGE</th>
                </>
              ) : (
                <>
                  <th>INTERNAL</th>
                  <th>PRACTICAL</th>
                  <th>THEORY</th>
                  <th>TOTAL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {details.map(({ subject, row, max }) => (
              <tr key={subject.subjectId}>
                <td>{subject.subjectName}</td>
                {objective ? (
                  <>
                    <td>{row?.obtainedMarks ?? "—"}</td>
                    <td>{max}</td>
                    <td>{row ? percentageOf(row.obtainedMarks, row.maxMarks || max) : "—"}</td>
                  </>
                ) : (
                  <>
                    <td>{row?.internal ?? "—"}</td>
                    <td>{subject.practical ? (row?.practical ?? "—") : "—"}</td>
                    <td>{row?.theory ?? "—"}</td>
                    <td>{row?.total ?? "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cms-details-section">
        <h3 className="cms-details-section-title">Performance Summary</h3>
        <div className="cms-detail-grid">
          <Card label="Overall Total" value={student.total} />
          <Card label="Maximum" value={exam.totalMarks} />
          <Card label="Percentage" value={safePercent(student.percentage)} />
          <Card label="Pass Percentage" value={`${exam.passPercentage}%`} />
          <Card label="Passing Score" value={passingScore(exam)} />
          <Card label="Grade" value={student.grade} />
          <Card label="Result" value={student.result} />
        </div>
      </div>
    </div>
  );
}
function MessageModal({ title, label, value, setValue, danger, onCancel, onConfirm, loading }) {
  return (
    <div className="cms-overlay">
      <div className="cms-modal sm">
        <div className="cms-modal-head">
          <h3>{title}</h3>
        </div>
        <div className="cms-modal-body">
          <div className="cms-field-group">
            <label className="cms-field-label">{label}</label>
            <textarea
              className="cms-marks-textarea"
              rows={4}
              value={value}
              disabled={loading}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter at least 5 characters"
            />
          </div>
        </div>
        <div className="cms-modal-foot">
          <button className="cms-btn" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`cms-btn ${danger ? "cms-btn-danger" : "cms-btn-info"}`}
            disabled={loading || value.trim().length < 5}
            onClick={onConfirm}
          >
            {loading
              ? danger
                ? "Rejecting..."
                : "Verifying..."
              : danger
                ? "Confirm Reject"
                : "Confirm Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
function ConfirmModal({ title, message, onCancel, onConfirm, loading }) {
  return (
    <div className="cms-overlay">
      <div className="cms-modal sm">
        <div className="cms-modal-head">
          <h3>{title}</h3>
        </div>
        <div className="cms-modal-body">{message}</div>
        <div className="cms-modal-foot">
          <button className="cms-btn" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={onConfirm}>
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
function Pagination({ page, total, setPage }) {
  return (
    <div className="cms-pagination">
      <button
        className="cms-page-btn"
        disabled={page === 1}
        onClick={() => setPage((v) => Math.max(1, v - 1))}
      >
        Previous
      </button>
      <span>
        Page {page} of {total}
      </span>
      <button
        className="cms-page-btn"
        disabled={page === total}
        onClick={() => setPage((v) => Math.min(total, v + 1))}
      >
        Next
      </button>
    </div>
  );
}
function Card({ label, value }) {
  return (
    <div className="cms-detail-card">
      <span className="cms-detail-label">{label}</span>
      <span className="cms-detail-value">{value}</span>
    </div>
  );
}
function Badge({ status }) {
  const meta = STATUS_META[status] || [status || "UNKNOWN", "cms-status-submitted"];
  return (
    <span className={`cms-badge-status ${meta[1]}`}>
      <span className="cms-badge-dot" />
      {meta[0]}
    </span>
  );
}
