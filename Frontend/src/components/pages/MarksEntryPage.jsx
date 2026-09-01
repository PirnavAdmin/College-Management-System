import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import "./MarksEntryPage.css";

const MARKS_API = {
  boards: "/api/v1/boards",
  academicYears: "/api/v1/academic-years/active",
  academicLevels: "/api/v1/academic-levels",
  groupsByBoard: (id) => `/api/v1/groups/board/${id}`,
  programsByGroup: (id) => `/api/v1/programs/group/${id}`,
  sections: "/api/v1/Sections",
  examinations: "/api/v1/examinations",
  facultyEvaluations: "/api/v1/faculty/evaluations",
  facultyStudents: (id) => `/api/v1/faculty/evaluations/${id}/students`,
  facultyMarks: (id) => `/api/v1/faculty/evaluations/${id}/marks`,
  facultySubmit: (id) => `/api/v1/faculty/evaluations/${id}/submit`,
  facultyResubmit: (id) => `/api/v1/faculty/evaluations/${id}/resubmit`,
  readiness: "/api/v1/evaluations/readiness",
  evaluationSearch: "/api/v1/evaluations/search",
  evaluationStudents: (id) => `/api/v1/evaluations/${id}/students`,
  adminMarks: (id) => `/api/v1/evaluations/${id}/marks`,
  verify: (id) => `/api/v1/evaluations/${id}/verify`,
  approve: (id) => `/api/v1/evaluations/${id}/approve`,
  reject: (id) => `/api/v1/evaluations/${id}/reject`,
  restore: (id) => `/api/v1/evaluations/${id}/restore`,
  verifyAll: "/api/v1/evaluations/verify-all",
  approveAll: "/api/v1/evaluations/approve-all",
  studentAnalysis: "/api/v1/student-analysis",
  studentDetails: (id) => `/api/v1/student-analysis/${id}/details`,
  exportEvaluations: "/api/v1/evaluations/export",
};
const PAGE_SIZE = 5;
const eq = (a, b) => String(a ?? "") === String(b ?? "");
const relationId = (item, keys) =>
  keys.map((key) => item?.[key]).find((value) => value != null && value !== "");
const matchesOptionalRelation = (item, keys, selectedId) => {
  const relatedId = relationId(item, keys);
  return relatedId == null || eq(relatedId, selectedId);
};
const collection = (payload) => {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["data", "items", "results", "records"])
    if (Array.isArray(value?.[key])) return value[key];
  return [];
};
const object = (payload) => {
  const value = payload?.data?.data ?? payload?.data ?? payload;
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};
const active = (item) => {
  const value = item.isActive ?? item.active ?? item.status;
  return (
    value == null ||
    ![false, 0, "0", "false", "inactive", "disabled"].includes(
      typeof value === "string" ? value.toLowerCase() : value,
    )
  );
};
const normalize = (item, type) => {
  const fields = {
    board: ["boardId", "id", "boardName", "name"],
    year: ["academicYearId", "id", "academicYearName", "academicYear", "yearName", "name"],
    level: ["academicLevelId", "levelId", "id", "levelName", "academicLevelName", "name"],
    group: ["groupId", "id", "groupName", "name"],
    program: ["programId", "groupProgramId", "id", "programName", "programmeName", "name"],
    section: ["sectionId", "id", "sectionName", "name"],
    exam: ["examinationId", "examId", "id", "examName", "examinationName", "name"],
  }[type];
  const id = fields
    .slice(0, type === "level" ? 3 : type === "program" || type === "exam" ? 3 : 2)
    .map((k) => item[k])
    .find((v) => v != null && v !== "");
  const name = fields
    .slice(type === "level" || type === "program" || type === "exam" ? 3 : 2)
    .map((k) => item[k])
    .find((v) => String(v ?? "").trim());
  return {
    ...item,
    id,
    name: name || "",
    code: item.code ?? item[`${type}Code`] ?? item.examCode ?? "",
    status: String(item.status ?? item.examStatus ?? "").toUpperCase(),
  };
};
const statusOf = (value) =>
  String(value ?? "NOT STARTED")
    .trim()
    .toUpperCase()
    .replaceAll("_", " ");
const evaluationKey = (e) => `${e.examinationId}:${e.sectionId}:${e.subjectId}`;
const validNumber = (value, max) =>
  value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max;
const grade = (p) =>
  p >= 90
    ? "A+"
    : p >= 80
      ? "A"
      : p >= 70
        ? "B+"
        : p >= 60
          ? "B"
          : p >= 50
            ? "C"
            : p >= 40
              ? "D"
              : "F";
const IconEye = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEdit = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </svg>
);

const normalizeEvaluation = (raw) => ({
  ...raw,
  evaluationId: raw.evaluationId ?? raw.id,
  examinationId: raw.examinationId ?? raw.examId,
  sectionId: raw.sectionId,
  subjectId: raw.subjectId,
  facultyId: raw.facultyId,
  status: statusOf(raw.status ?? raw.evaluationStatus),
  subject: {
    id: raw.subjectId,
    name: raw.subjectName ?? raw.subject?.name ?? raw.subject?.subjectName ?? "Subject",
    code: raw.subjectCode ?? raw.subject?.code ?? raw.subject?.subjectCode ?? "",
  },
  faculty: {
    id: raw.facultyId,
    name: raw.facultyName ?? raw.faculty?.name ?? raw.faculty?.facultyName ?? "—",
    code: raw.facultyCode ?? raw.faculty?.code ?? "",
  },
  studentsCount: Number(raw.studentsCount ?? raw.studentCount ?? 0),
  average: raw.average ?? raw.averageMarks ?? "—",
  highest: raw.highest ?? raw.highestMarks ?? "—",
  lowest: raw.lowest ?? raw.lowestMarks ?? "—",
  subjectMaxMarks: Number(raw.subjectMaxMarks ?? raw.maxMarks ?? raw.maximumMarks ?? 0),
  rowVersion: raw.rowVersion ?? null,
});
const normalizeSheet = (raw, header = {}) => {
  const value = object(raw),
    source = { ...header, ...(value.header || {}), ...value };
  const rows = collection(value.students ?? value.rows ?? raw).map((r) => ({
    ...r,
    studentId: r.studentId ?? r.id,
    rollNo: r.rollNo ?? r.rollNumber ?? "",
    studentName: r.studentName ?? r.name ?? "",
    internal: r.internalMarks ?? r.internal ?? "",
    practical: r.practicalMarks ?? r.practical ?? "",
    theory: r.theoryMarks ?? r.theory ?? "",
    obtainedMarks: r.obtainedMarks ?? r.totalMarks ?? r.total ?? "",
    total: r.totalMarks ?? r.obtainedMarks ?? r.total ?? "",
    absent: Boolean(r.isAbsent ?? r.absent),
    remarks: r.remarks ?? "",
  }));
  const practicalMax = Number(source.practicalMax ?? source.practicalMaximum ?? 0),
    mode =
      String(source.mode ?? source.markMode ?? source.examMode ?? "REGULAR").toUpperCase() ===
      "OBJECTIVE"
        ? "OBJECTIVE"
        : "REGULAR";
  return {
    evaluationId: source.evaluationId ?? source.id,
    examinationId: source.examinationId ?? source.examId,
    sectionId: source.sectionId,
    subjectId: source.subjectId,
    facultyId: source.facultyId,
    faculty: {
      id: source.facultyId,
      name: source.facultyName ?? source.faculty?.name ?? "—",
      code: source.facultyCode ?? source.faculty?.code ?? "",
    },
    subject: {
      id: source.subjectId,
      name: source.subjectName ?? source.subject?.name ?? "Subject",
      code: source.subjectCode ?? source.subject?.code ?? "",
    },
    status: statusOf(source.status ?? source.evaluationStatus),
    rejectionReason: source.rejectionReason ?? "",
    rowVersion: source.rowVersion ?? null,
    mode,
    maxMarks: Number(source.maxMarks ?? source.totalMax ?? source.maximumMarks ?? 0),
    internalMax: Number(source.internalMax ?? source.internalMaximum ?? 0),
    practicalMax,
    theoryMax: Number(source.theoryMax ?? source.theoryMaximum ?? 0),
    passPercentage: Number(source.passPercentage ?? source.passingPercentage ?? 0),
    rows,
    dirty: false,
    validationErrors: {},
  };
};
const paramsFor = (c) => ({
  boardId: c.board,
  academicYearId: c.year,
  academicLevelId: c.level,
  groupId: c.group,
  programId: c.program,
  sectionId: c.section,
  examinationId: c.exam,
});
const marksPayload = (w) => ({
  ...(w.rowVersion != null ? { rowVersion: w.rowVersion } : {}),
  students: w.rows.map((r) => ({
    studentId: r.studentId,
    internalMarks: r.absent || r.internal === "" ? 0 : Number(r.internal),
    practicalMarks: r.absent || r.practical === "" ? 0 : Number(r.practical),
    theoryMarks: r.absent || r.theory === "" ? 0 : Number(r.theory),
    isAbsent: Boolean(r.absent),
    remarks: r.remarks || "",
  })),
});

export default function MarksEntryPage() {
  const [tab, setTab] = useState("entry"),
    [filters, setFilters] = useState({
      board: "",
      year: "",
      level: "",
      group: "",
      program: "",
      section: "",
      exam: "",
    }),
    [applied, setApplied] = useState(null);
  const [boards, setBoards] = useState([]),
    [years, setYears] = useState([]),
    [levels, setLevels] = useState([]),
    [groups, setGroups] = useState([]),
    [programs, setPrograms] = useState([]),
    [sections, setSections] = useState([]),
    [exams, setExams] = useState([]);
  const [workspaces, setWorkspaces] = useState({}),
    [activeSubjectId, setActiveSubjectId] = useState(""),
    [evaluations, setEvaluations] = useState([]),
    [analysis, setAnalysis] = useState([]),
    [analysisSubjects, setAnalysisSubjects] = useState([]),
    [readiness, setReadiness] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null),
    [selectedStudent, setSelectedStudent] = useState(null),
    [editingSubmitted, setEditingSubmitted] = useState({});
  const [entryPage, setEntryPage] = useState(1),
    [evaluationPage, setEvaluationPage] = useState(1),
    [studentPage, setStudentPage] = useState(1),
    [detailPage, setDetailPage] = useState(1);
  const [evaluationSearch, setEvaluationSearch] = useState(""),
    [studentSearch, setStudentSearch] = useState(""),
    [toast, setToast] = useState(null),
    [processing, setProcessing] = useState(false),
    [modal, setModal] = useState(null),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(null);
  const filtersRef = useRef(filters),
    timers = useRef(null),
    requests = useRef({ groups: 0, programs: 0, sections: 0, examinations: 0 });
  filtersRef.current = filters;
  const notify = useCallback((text, type = "success") => {
    clearTimeout(timers.current);
    setToast({ text, type });
    timers.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(timers.current), []);
  useEffect(() => {
    (async () => {
      const settled = await Promise.allSettled([
        apiClient.get(MARKS_API.boards),
        apiClient.get(MARKS_API.academicYears),
        apiClient.get(MARKS_API.academicLevels),
      ]);
      const setters = [
        [setBoards, "board"],
        [setYears, "year"],
        [setLevels, "level"],
      ];
      settled.forEach((result, i) =>
        result.status === "fulfilled"
          ? setters[i][0](
              collection(result.value)
                .filter(active)
                .map((x) => normalize(x, setters[i][1]))
                .filter((x) => x.id != null && x.name),
            )
          : notify(getApiErrorMessage(result.reason), "error"),
      );
    })();
  }, [notify]);
  const dirty = Object.values(workspaces).some((w) => w.dirty),
    guard = (fn) => (dirty ? setPending(() => fn) : fn());
  const clearApplied = () => {
    setApplied(null);
    setWorkspaces({});
    setEvaluations([]);
    setAnalysis([]);
    setReadiness(null);
    setEditingSubmitted({});
  };
  const changeFilter = (key, value) =>
    guard(async () => {
      const next = { ...filters, [key]: value },
        clear = {
          board: ["group", "program", "section", "exam"],
          year: ["exam"],
          level: ["exam"],
          group: ["program", "section", "exam"],
          program: ["section", "exam"],
          section: ["exam"],
        };
      if (key === "board" && value && next.year) {
        const selectedYear = years.find((item) => eq(item.id, next.year));
        const yearBoardId = relationId(selectedYear, ["boardId", "BoardId"]);
        if (yearBoardId != null && !eq(yearBoardId, value)) next.year = "";
      }
      (clear[key] || []).forEach((k) => {
        next[k] = "";
      });
      setFilters(next);
      clearApplied();
      if (key === "board") {
        const seq = ++requests.current.groups;
        requests.current.programs += 1;
        requests.current.sections += 1;
        requests.current.examinations += 1;
        setGroups([]);
        setPrograms([]);
        setSections([]);
        setExams([]);
        if (value)
          try {
            const res = await apiClient.get(MARKS_API.groupsByBoard(value));
            if (seq === requests.current.groups)
              setGroups(
                collection(res)
                  .filter(active)
                  .map((x) => normalize(x, "group"))
                  .filter((x) => x.id != null && x.name),
              );
          } catch (e) {
            if (seq === requests.current.groups) notify(getApiErrorMessage(e), "error");
          }
      }
      if (key === "group") {
        const seq = ++requests.current.programs;
        requests.current.sections += 1;
        requests.current.examinations += 1;
        setPrograms([]);
        setSections([]);
        setExams([]);
        if (value)
          try {
            const res = await apiClient.get(MARKS_API.programsByGroup(value));
            if (seq === requests.current.programs)
              setPrograms(
                collection(res)
                  .filter(active)
                  .map((x) => normalize(x, "program"))
                  .filter((x) => x.id != null && x.name),
              );
          } catch (e) {
            if (seq === requests.current.programs) notify(getApiErrorMessage(e), "error");
          }
      }
      if (key === "program") {
        requests.current.sections += 1;
        requests.current.examinations += 1;
        setSections([]);
        setExams([]);
      }
      if (key === "section" || key === "year" || key === "level") {
        requests.current.examinations += 1;
        setExams([]);
      }
    });
  useEffect(() => {
    const seq = ++requests.current.sections;
    if (!filters.program) {
      setSections([]);
      return;
    }
    const params = {
      ProgramId: filters.program,
      IsActive: true,
      Page: 1,
      PageSize: 500,
      ...(filters.board ? { BoardId: filters.board } : {}),
      ...(filters.year ? { AcademicYearId: filters.year } : {}),
      ...(filters.level ? { AcademicLevelId: filters.level } : {}),
      ...(filters.group ? { GroupId: filters.group } : {}),
    };
    apiClient
      .get(MARKS_API.sections, { params })
      .then((response) => {
        if (seq !== requests.current.sections) return;
        const nextSections = collection(response)
          .filter(active)
          .map((x) => normalize(x, "section"))
          .filter((x) => x.id != null && x.name);
        setSections(nextSections);
        const currentSection = filtersRef.current.section;
        if (
          currentSection &&
          !nextSections.some((section) => eq(section.id, currentSection))
        ) {
          setExams([]);
          setFilters((current) =>
            eq(current.section, currentSection)
              ? { ...current, section: "", exam: "" }
              : current,
          );
        }
      })
      .catch((error) => {
        if (seq === requests.current.sections) notify(getApiErrorMessage(error), "error");
      });
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, notify]);

  useEffect(() => {
    const seq = ++requests.current.examinations;
    const context = [
      filters.board,
      filters.year,
      filters.level,
      filters.group,
      filters.program,
      filters.section,
    ];
    if (!context.every(Boolean)) {
      setExams([]);
      return;
    }
    const params = {
      BoardId: filters.board,
      AcademicYearId: filters.year,
      AcademicLevelId: filters.level,
      GroupId: filters.group,
      ProgramId: filters.program,
      IsActive: true,
      Page: 1,
      PageSize: 500,
      Status: "COMPLETED",
    };
    apiClient
      .get(MARKS_API.examinations, { params })
      .then((response) => {
        if (seq !== requests.current.examinations) return;
        setExams(
          collection(response)
            .map((x) => normalize(x, "exam"))
            .filter((x) => x.id != null && x.name && x.status === "COMPLETED"),
        );
      })
      .catch((error) => {
        if (seq === requests.current.examinations)
          notify(getApiErrorMessage(error), "error");
      });
  }, [
    filters.board,
    filters.year,
    filters.level,
    filters.group,
    filters.program,
    filters.section,
    notify,
  ]);

  const loadReadiness = useCallback(
    async (context) => {
      try {
        const res = await apiClient.get(MARKS_API.readiness, { params: paramsFor(context) }),
          r = object(res);
        setReadiness({
          requiredSubjectCount: Number(r.requiredEvaluationCount ?? 0),
          notStartedCount: Number(r.missingCount ?? 0),
          draftCount: Number(r.draftCount ?? 0),
          submittedCount: Number(r.submittedCount ?? 0),
          verifiedCount: Number(r.verifiedCount ?? 0),
          approvedCount: Number(r.approvedCount ?? 0),
          rejectedCount: Number(r.rejectedCount ?? 0),
          allRequiredApproved: Boolean(r.allRequiredEvaluationsApproved),
          readyForResults: Boolean(r.readyForResults),
        });
      } catch (e) {
        if (e.response?.status !== 404) notify(getApiErrorMessage(e), "error");
        setReadiness(null);
      }
    },
    [notify],
  );
  const loadEvaluationSearch = useCallback(
    async (context) => {
      try {
        const p = paramsFor(context);
        const res = await apiClient.post(MARKS_API.evaluationSearch, {
          boardId: p.boardId,
          academicYearId: p.academicYearId,
          academicLevelId: p.academicLevelId,
          levelId: p.academicLevelId,
          programId: p.programId,
          groupId: p.groupId,
          sectionId: p.sectionId,
          examinationId: p.examinationId,
          examId: p.examinationId,
          pageNumber: 1,
          pageSize: 100,
        });
        setEvaluations(
          collection(res)
            .map(normalizeEvaluation)
            .filter((e) => e.evaluationId != null),
        );
      } catch (e) {
        if (e.response?.status === 404) setEvaluations([]);
        else notify(getApiErrorMessage(e), "error");
      }
    },
    [notify],
  );
  const loadAnalysis = useCallback(
    async (context) => {
      try {
        const p = paramsFor(context);
        const res = await apiClient.get(MARKS_API.studentAnalysis, {
            params: {
              boardId: p.boardId,
              academicYearId: p.academicYearId,
              academicLevelId: p.academicLevelId,
              groupId: p.groupId,
              sectionId: p.sectionId,
              examinationId: p.examinationId,
            },
          }),
          data = collection(res),
          subjectMap = new Map();
        data.forEach((student) =>
          collection(student.subjects ?? student.subjectMarks).forEach((s) => {
            const id = s.subjectId ?? s.id;
            if (id != null && !subjectMap.has(String(id)))
              subjectMap.set(String(id), {
                id,
                name: s.subjectName ?? s.name ?? "Subject",
                code: s.subjectCode ?? s.code ?? "",
              });
          }),
        );
        setAnalysisSubjects([...subjectMap.values()]);
        setAnalysis(
          data.map((s) => ({
            ...s,
            studentId: s.studentId ?? s.id,
            rollNo: s.rollNo ?? s.rollNumber ?? "",
            studentName: s.studentName ?? s.name ?? "",
            subjectResults: collection(s.subjects ?? s.subjectMarks),
            totalObtained: s.totalMarks ?? s.total ?? 0,
            totalMaximum: s.maxTotal ?? s.maximum ?? 0,
            percentage: s.percentage,
            grade: s.grade ?? "—",
            result: s.readyForResults === false ? "PENDING" : (s.result ?? "PENDING"),
            readyForResults: s.readyForResults !== false,
          })),
        );
      } catch (e) {
        if (e.response?.status === 404) {
          setAnalysis([]);
          setAnalysisSubjects([]);
        } else notify(getApiErrorMessage(e), "error");
      }
    },
    [notify],
  );
  const refreshContext = useCallback(
    async (context) => Promise.all([loadEvaluationSearch(context), loadReadiness(context)]),
    [loadEvaluationSearch, loadReadiness],
  );
  const applyContext = () =>
    guard(async () => {
      if (!Object.values(filters).every(Boolean))
        return notify("Select all seven academic filters.", "error");
      if (
        !boards.some((x) => eq(x.id, filters.board)) ||
        !years.some((x) => eq(x.id, filters.year)) ||
        !levels.some((x) => eq(x.id, filters.level)) ||
        !groups.some((x) => eq(x.id, filters.group)) ||
        !programs.some((x) => eq(x.id, filters.program)) ||
        !sections.some((x) => eq(x.id, filters.section)) ||
        !exams.some((x) => eq(x.id, filters.exam) && x.status === "COMPLETED") ||
        !groups.some(
          (x) =>
            eq(x.id, filters.group) &&
            matchesOptionalRelation(x, ["boardId", "BoardId"], filters.board),
        ) ||
        !programs.some(
          (x) =>
            eq(x.id, filters.program) &&
            matchesOptionalRelation(x, ["groupId", "GroupId"], filters.group),
        ) ||
        !sections.some(
          (x) =>
            eq(x.id, filters.section) &&
            matchesOptionalRelation(x, ["programId", "ProgramId"], filters.program),
        ) ||
        !exams.some(
          (x) =>
            eq(x.id, filters.exam) &&
            matchesOptionalRelation(x, ["boardId", "BoardId"], filters.board) &&
            matchesOptionalRelation(x, ["academicYearId", "AcademicYearId"], filters.year) &&
            matchesOptionalRelation(
              x,
              ["academicLevelId", "AcademicLevelId", "levelId"],
              filters.level,
            ) &&
            matchesOptionalRelation(x, ["groupId", "GroupId"], filters.group) &&
            matchesOptionalRelation(x, ["programId", "ProgramId"], filters.program) &&
            matchesOptionalRelation(x, ["sectionId", "SectionId"], filters.section),
        )
      )
        return notify("The selected academic hierarchy is invalid.", "error");
      setProcessing(true);
      try {
        const context = { ...filters },
          res = await apiClient.get(MARKS_API.facultyEvaluations, { params: paramsFor(context) }),
          headers = collection(res)
            .map(normalizeEvaluation)
            .filter(
              (e) =>
                e.evaluationId != null &&
                eq(e.examinationId, context.exam) &&
                eq(e.sectionId, context.section),
            );
        if (!headers.length) {
          setApplied(context);
          setWorkspaces({});
          return notify("No faculty evaluations are available for the selected context.", "error");
        }
        const sheets = await Promise.allSettled(
          headers.map((h) =>
            apiClient
              .get(MARKS_API.facultyStudents(h.evaluationId))
              .then((r) => normalizeSheet(r, h)),
          ),
        );
        const next = {};
        sheets.forEach((result, i) => {
          if (result.status === "fulfilled") next[String(headers[i].subjectId)] = result.value;
          else notify(getApiErrorMessage(result.reason), "error");
        });
        setApplied(context);
        setWorkspaces(next);
        setActiveSubjectId(Object.keys(next)[0] || "");
        setTab("entry");
        setEntryPage(1);
        await refreshContext(context);
      } catch (e) {
        notify(getApiErrorMessage(e), "error");
      } finally {
        setProcessing(false);
      }
    });

  const workspace = workspaces[activeSubjectId],
    editable =
      (workspace && ["NOT STARTED", "DRAFT", "REJECTED"].includes(workspace.status)) ||
      Boolean(editingSubmitted[activeSubjectId]);
  const setWorkspace = (id, updater) =>
    setWorkspaces((all) => ({ ...all, [id]: updater(all[id]) }));
  const updateRow = (studentId, field, value) => {
    if (!editable) return;
    setWorkspace(activeSubjectId, (w) => ({
      ...w,
      dirty: true,
      validationErrors: {},
      rows: w.rows.map((r) => {
        if (!eq(r.studentId, studentId)) return r;
        if (field === "absent")
          return value
            ? {
                ...r,
                absent: true,
                internal: 0,
                practical: 0,
                theory: 0,
                obtainedMarks: 0,
                total: 0,
              }
            : {
                ...r,
                absent: false,
                internal: "",
                practical: w.practicalMax ? "" : 0,
                theory: "",
                obtainedMarks: "",
                total: "",
              };
        const n = { ...r, [field]: value };
        if (w.mode === "REGULAR") {
          const keys = ["internal", ...(w.practicalMax ? ["practical"] : []), "theory"];
          n.total = keys.every((k) => n[k] !== "" && Number.isFinite(Number(n[k])))
            ? keys.reduce((sum, k) => sum + Number(n[k]), 0)
            : "";
          n.obtainedMarks = n.total;
        } else {
          n.obtainedMarks = value;
          n.total = value;
        }
        return n;
      }),
    }));
  };
  const validate = (w, complete) => {
    const errors = {};
    w.rows.forEach((r) => {
      if (r.absent) return;
      const checks =
        w.mode === "OBJECTIVE"
          ? [["obtainedMarks", w.maxMarks]]
          : [
              ["internal", w.internalMax],
              ...(w.practicalMax ? [["practical", w.practicalMax]] : []),
              ["theory", w.theoryMax],
            ];
      const list = [];
      checks.forEach(([k, max]) =>
        r[k] === ""
          ? complete && list.push(`${k} is required`)
          : !validNumber(r[k], max) && list.push(`${k} must be between 0 and ${max}`),
      );
      if (list.length) errors[r.studentId] = list;
    });
    return errors;
  };
  const reloadSheet = async (w, admin = false) => {
    const res = await apiClient.get(
        admin
          ? MARKS_API.evaluationStudents(w.evaluationId)
          : MARKS_API.facultyStudents(w.evaluationId),
      ),
      next = normalizeSheet(res, w);
    setWorkspace(String(w.subjectId), () => next);
    return next;
  };
  const saveOne = async (id, complete = false, admin = false) => {
    const w = workspaces[id],
      errors = validate(w, complete);
    if (Object.keys(errors).length) {
      setWorkspace(id, (x) => ({ ...x, validationErrors: errors }));
      throw new Error("Complete and correct all marks before continuing.");
    }
    await apiClient.put(
      admin ? MARKS_API.adminMarks(w.evaluationId) : MARKS_API.facultyMarks(w.evaluationId),
      marksPayload(w),
    );
    await reloadSheet(w, admin);
    return w;
  };
  const saveSubjects = async (ids, submit) => {
    if (processing) return;
    setProcessing(true);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const w = workspaces[id];
        if (!w || !["DRAFT", "REJECTED", "NOT STARTED"].includes(w.status))
          throw new Error(`${w?.subject.name ?? "Subject"} is locked.`);
        if (w.dirty || submit) await saveOne(id, submit);
        if (submit)
          await apiClient.post(
            w.status === "REJECTED"
              ? MARKS_API.facultyResubmit(w.evaluationId)
              : MARKS_API.facultySubmit(w.evaluationId),
            w.status === "REJECTED"
              ? { correctionNotes: w.rejectionReason || "Corrected marks resubmitted." }
              : undefined,
          );
        await reloadSheet(w);
        return w.subject.name;
      }),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length,
      failed = results.filter((r) => r.status === "rejected");
    if (applied) await refreshContext(applied);
    notify(
      ok
        ? `${ok} subject${ok === 1 ? "" : "s"} ${submit ? "submitted" : "saved"}.${failed.length ? ` ${failed.length} failed.` : ""}`
        : getApiErrorMessage(failed[0]?.reason) || "No subjects were saved.",
      ok ? "success" : "error",
    );
    setProcessing(false);
  };
  const enterSubmittedEdit = async (id) => {
    const w = workspaces[id];
    if (w?.status !== "SUBMITTED") return notify("Only submitted marks can be edited.", "error");
    try {
      await reloadSheet(w);
      setActiveSubjectId(String(id));
      setEditingSubmitted((x) => ({ ...x, [id]: true }));
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    }
  };
  const cancelEdit = () => {
    if (workspace?.dirty)
      return setPending(() => async () => {
        await reloadSheet(workspace);
        setEditingSubmitted((x) => ({ ...x, [activeSubjectId]: false }));
      });
    reloadSheet(workspace).finally(() =>
      setEditingSubmitted((x) => ({ ...x, [activeSubjectId]: false })),
    );
  };
  const saveAdminChanges = async () => {
    setProcessing(true);
    try {
      await saveOne(activeSubjectId, true, true);
      setEditingSubmitted((x) => ({ ...x, [activeSubjectId]: false }));
      notify("Submitted marks updated successfully.");
      if (applied) await refreshContext(applied);
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    } finally {
      setProcessing(false);
    }
  };

  const loadEvaluationDetails = async (item) => {
    setProcessing(true);
    try {
      const res = await apiClient.get(MARKS_API.evaluationStudents(item.evaluationId));
      setSelectedEvaluation(normalizeSheet(res, item));
      setDetailPage(1);
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    } finally {
      setProcessing(false);
    }
  };
  const transition = async (action) => {
    const item = selectedEvaluation;
    if (!item || processing) return;
    const allowed = {
      VERIFY: ["SUBMITTED"],
      APPROVE: ["VERIFIED"],
      REJECT: ["SUBMITTED", "VERIFIED"],
    };
    if (!allowed[action].includes(item.status))
      return notify("Invalid evaluation transition.", "error");
    if (["VERIFY", "REJECT"].includes(action) && message.trim().length < 5)
      return notify("Enter at least five characters.", "error");
    if (
      action === "VERIFY" &&
      editingSubmitted[String(item.subjectId)] &&
      workspaces[item.subjectId]?.dirty
    )
      return notify("Save or cancel submitted mark edits before verifying evaluations.", "error");
    setProcessing(true);
    try {
      await apiClient.post(
        action === "VERIFY"
          ? MARKS_API.verify(item.evaluationId)
          : action === "APPROVE"
            ? MARKS_API.approve(item.evaluationId)
            : MARKS_API.reject(item.evaluationId),
        action === "VERIFY"
          ? { message: message.trim() }
          : action === "REJECT"
            ? { remarks: message.trim() }
            : undefined,
      );
      setModal(null);
      setMessage("");
      if (applied) {
        await refreshContext(applied);
        await loadAnalysis(applied);
      }
      const res = await apiClient.get(MARKS_API.evaluationStudents(item.evaluationId));
      setSelectedEvaluation(normalizeSheet(res, item));
      notify(`Evaluation ${action.toLowerCase()}d.`);
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    } finally {
      setProcessing(false);
    }
  };
  const bulkAction = async (action) => {
    if (!applied || processing) return;
    if (
      action === "VERIFY_ALL" &&
      Object.entries(editingSubmitted).some(([id, on]) => on && workspaces[id]?.dirty)
    )
      return notify("Save or cancel submitted mark edits before verifying evaluations.", "error");
    setProcessing(true);
    try {
      await apiClient.post(
        action === "VERIFY_ALL" ? MARKS_API.verifyAll : MARKS_API.approveAll,
        paramsFor(applied),
      );
      setModal(null);
      await refreshContext(applied);
      await loadAnalysis(applied);
      notify("Bulk action completed successfully.");
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    } finally {
      setProcessing(false);
    }
  };
  const openStudent = async (student) => {
    setProcessing(true);
    try {
      const res = await apiClient.get(MARKS_API.studentDetails(student.studentId), {
        params: { sectionId: applied.section, examinationId: applied.exam, examId: applied.exam },
      });
      setSelectedStudent({
        ...student,
        ...object(res),
        subjectResults: collection(object(res).subjects ?? object(res).subjectMarks),
      });
      setDetailPage(1);
    } catch (e) {
      notify(getApiErrorMessage(e), "error");
    } finally {
      setProcessing(false);
    }
  };
  const changeTab = (next) =>
    next === "entry"
      ? setTab(next)
      : guard(async () => {
          setTab(next);
          if (next === "evaluation" && applied) await loadEvaluationSearch(applied);
          if (next === "students" && applied) await loadAnalysis(applied);
        });
  const filteredEvaluations = evaluations.filter((e) =>
      `${e.subject.name} ${e.subject.code} ${e.faculty.name} ${e.status}`
        .toLowerCase()
        .includes(evaluationSearch.toLowerCase()),
    ),
    filteredStudents = analysis.filter((s) =>
      `${s.rollNo} ${s.studentName}`.toLowerCase().includes(studentSearch.toLowerCase()),
    );
  const meta = {
    entry: ["Marks Entry", "Enter and submit subject-wise examination marks"],
    evaluation: ["Marks Evaluation", "Verify, reject, and approve submitted marks"],
    students: ["Student Analysis", "View approved student results and subject details"],
  }[tab];
  return (
    <DashboardLayout title={meta[0]} subtitle={meta[1]}>
      <div className="cms-marks-entry">
        {toast && (
          <div className={`cms-toast-banner cms-toast-${toast.type}`} aria-live="polite">
            {toast.text}
          </div>
        )}
        <FilterCard
          {...{
            filters,
            boards,
            years,
            levels,
            groups,
            programs,
            sections,
            exams,
            changeFilter,
            applyContext,
            processing,
          }}
        />
        <div className="cms-independent-tab-bar" role="tablist">
          {[
            ["entry", "Marks Entry"],
            ["evaluation", "Marks Evaluation"],
            ["students", "Student Analysis"],
          ].map(([id, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`cms-independent-tab-btn ${tab === id ? "cms-active" : ""}`}
              onClick={() => changeTab(id)}
              key={id}
            >
              {label}
            </button>
          ))}
        </div>
        {!applied ? (
          <Empty text="Select all academic filters and click Enter Marks." />
        ) : (
          <>
            <Context context={applied} masters={{ groups, programs, sections, exams }} />
            {tab === "entry" && (
              <Entry
                {...{
                  workspaces,
                  activeSubjectId,
                  setActiveSubjectId,
                  workspace,
                  entryPage,
                  setEntryPage,
                  updateRow,
                  processing,
                  editingSubmitted,
                  enterSubmittedEdit,
                  cancelEdit,
                  saveAdminChanges,
                }}
                onSave={() => saveSubjects([activeSubjectId], false)}
                onSubmit={() => saveSubjects([activeSubjectId], true)}
                onSaveAll={() => saveSubjects(Object.keys(workspaces), false)}
                onSubmitAll={() => saveSubjects(Object.keys(workspaces), true)}
              />
            )}{" "}
            {tab === "evaluation" &&
              (selectedEvaluation ? (
                <EvaluationDetails
                  item={selectedEvaluation}
                  page={detailPage}
                  setPage={setDetailPage}
                  onBack={() => setSelectedEvaluation(null)}
                  onAction={(a) =>
                    a === "APPROVE" ? transition(a) : (setModal(a), setMessage(""))
                  }
                  processing={processing}
                />
              ) : (
                <EvaluationList
                  rows={filteredEvaluations}
                  search={evaluationSearch}
                  setSearch={(v) => (setEvaluationSearch(v), setEvaluationPage(1))}
                  page={evaluationPage}
                  setPage={setEvaluationPage}
                  onView={loadEvaluationDetails}
                  readiness={readiness}
                  onBulk={setModal}
                  processing={processing}
                />
              ))}{" "}
            {tab === "students" &&
              (selectedStudent ? (
                <StudentDetails
                  student={selectedStudent}
                  page={detailPage}
                  setPage={setDetailPage}
                  onBack={() => setSelectedStudent(null)}
                />
              ) : (
                <StudentList
                  rows={filteredStudents}
                  subjects={analysisSubjects}
                  search={studentSearch}
                  setSearch={(v) => (setStudentSearch(v), setStudentPage(1))}
                  page={studentPage}
                  setPage={setStudentPage}
                  onView={openStudent}
                />
              ))}
          </>
        )}
        {pending && (
          <Confirm
            title="Unsaved Marks"
            text="Unsaved marks exist in one or more subjects. Discard them and continue?"
            onCancel={() => setPending(null)}
            onConfirm={() => {
              const fn = pending;
              setPending(null);
              fn();
            }}
          />
        )}{" "}
        {["VERIFY", "REJECT"].includes(modal) && (
          <Message
            action={modal}
            value={message}
            setValue={setMessage}
            onCancel={() => setModal(null)}
            onConfirm={() => transition(modal)}
          />
        )}{" "}
        {["VERIFY_ALL", "APPROVE_ALL"].includes(modal) && (
          <Confirm
            title="Confirm Bulk Action"
            text={`${modal === "VERIFY_ALL" ? "Verify" : "Approve"} all eligible evaluations in this context?`}
            onCancel={() => setModal(null)}
            onConfirm={() => bulkAction(modal)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function FilterCard({
  filters,
  boards,
  years,
  levels,
  groups,
  programs,
  sections,
  exams,
  changeFilter,
  applyContext,
  processing,
}) {
  const fields = [
    { key: "board", label: "Board", options: boards },
    { key: "year", label: "Academic Year", options: years },
    { key: "level", label: "Academic Level", options: levels },
    { key: "group", label: "Group", options: groups, disabled: !filters.board },
    { key: "program", label: "Program", options: programs, disabled: !filters.group },
    { key: "section", label: "Section", options: sections, disabled: !filters.program },
    { key: "exam", label: "Examination", options: exams, disabled: !filters.section },
  ];
  return (
    <section className="cms-card cms-card-filter">
      <div className="cms-section-heading">
        <div>
          <h2>Academic Context</h2>
          <p>Apply one group, section, and examination at a time.</p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={processing || !Object.values(filters).every(Boolean)}
          onClick={applyContext}
        >
          Enter Marks
        </button>
      </div>
      <div className="cms-filter-grid">
        {fields.map((f) => (
          <Select
            key={f.key}
            id={`marks-${f.key}`}
            label={f.label}
            value={filters[f.key]}
            options={f.options}
            disabled={f.disabled}
            onChange={(v) => changeFilter(f.key, v)}
          />
        ))}
      </div>
    </section>
  );
}
function Context({ context, masters }) {
  const find = (key, id) => masters[key].find((x) => eq(x.id, id))?.name ?? "—";
  return (
    <section className="cms-context-summary">
      <div>
        <strong>{find("groups", context.group)}</strong>
        <span>
          {find("programs", context.program)} · {find("sections", context.section)} ·{" "}
          {find("exams", context.exam)}
        </span>
      </div>
    </section>
  );
}
function Entry({
  workspaces,
  activeSubjectId,
  setActiveSubjectId,
  workspace,
  entryPage,
  setEntryPage,
  updateRow,
  processing,
  editingSubmitted,
  enterSubmittedEdit,
  cancelEdit,
  saveAdminChanges,
  onSave,
  onSubmit,
  onSaveAll,
  onSubmitAll,
}) {
  const total = Math.ceil((workspace?.rows.length || 0) / PAGE_SIZE),
    rows = workspace?.rows.slice((entryPage - 1) * PAGE_SIZE, entryPage * PAGE_SIZE) || [],
    editing = Boolean(editingSubmitted[activeSubjectId]),
    locked =
      workspace && !["NOT STARTED", "DRAFT", "REJECTED"].includes(workspace.status) && !editing;
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-workspace-actions">
        <div>
          <h2 className="cms-workspace-title">Subject Workspaces</h2>
        </div>
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            disabled={processing}
            onClick={onSaveAll}
          >
            Save All Drafts
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={processing}
            onClick={onSubmitAll}
          >
            Submit All Complete Subjects
          </button>
        </div>
      </div>
      <div className="cms-subject-strip">
        {Object.values(workspaces).map((w) => (
          <div className="cms-subject-chip-wrap" key={w.subjectId}>
            <button
              type="button"
              className={`cms-subject-chip ${eq(activeSubjectId, w.subjectId) ? "cms-subject-chip-active" : ""}`}
              onClick={() => (setActiveSubjectId(String(w.subjectId)), setEntryPage(1))}
            >
              <span>
                {w.subject.name} <small>{w.subject.code}</small>
              </span>
              <span className="cms-chip-meta">
                {w.mode} · {w.rows.length}
              </span>
              <span className="cms-chip-status">
                {w.status}
                {w.dirty ? " • Unsaved" : ""}
              </span>
            </button>
            {w.status === "SUBMITTED" && (
              <button
                type="button"
                className={`cms-subject-edit-btn ${editingSubmitted[w.subjectId] ? "cms-editing" : ""}`}
                title="Edit submitted marks"
                aria-label={`Edit submitted marks for ${w.subject.name}`}
                onClick={() => enterSubmittedEdit(String(w.subjectId))}
              >
                <IconEdit />
              </button>
            )}
          </div>
        ))}
      </div>
      {!workspace ? (
        <Empty text="No faculty evaluations are available for the selected context." />
      ) : (
        <>
          <div className="cms-entry-toolbar">
            <div className="cms-config-summary">
              <Badge status={workspace.status} />
              <span>
                {workspace.faculty.name} ({workspace.faculty.code}) · {workspace.mode} · Maximum{" "}
                {workspace.maxMarks} · Pass {workspace.passPercentage}%
              </span>
            </div>
          </div>
          <div className="cms-table-container">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student</th>
                  {workspace.mode === "REGULAR" ? (
                    <>
                      <th>Internal / {workspace.internalMax}</th>
                      {workspace.practicalMax > 0 && <th>Practical / {workspace.practicalMax}</th>}
                      <th>Theory / {workspace.theoryMax}</th>
                      <th>Total / {workspace.maxMarks}</th>
                    </>
                  ) : (
                    <>
                      <th>Obtained</th>
                      <th>Maximum</th>
                    </>
                  )}
                  <th>Percentage</th>
                  <th>Absent</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <MarkRow
                    key={r.studentId}
                    row={r}
                    w={workspace}
                    locked={locked}
                    update={(k, v) => updateRow(r.studentId, k, v)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={entryPage} total={total} setPage={setEntryPage} />
          {editing ? (
            <div className="cms-marks-actions">
              <button type="button" className="cms-btn cms-btn-secondary" onClick={cancelEdit}>
                Cancel Edit
              </button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={saveAdminChanges}>
                Save Changes
              </button>
            </div>
          ) : locked ? (
            <p className="cms-locked-message">
              This {workspace.status.toLowerCase()} subject is read-only.
            </p>
          ) : (
            <div className="cms-marks-actions">
              <button type="button" className="cms-btn cms-btn-secondary" onClick={onSave}>
                Save Subject Draft
              </button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={onSubmit}>
                Submit Subject
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function MarkRow({ row, w, locked, update }) {
  const complete =
      row.absent ||
      (w.mode === "OBJECTIVE"
        ? validNumber(row.obtainedMarks, w.maxMarks)
        : validNumber(row.internal, w.internalMax) &&
          validNumber(row.theory, w.theoryMax) &&
          (!w.practicalMax || validNumber(row.practical, w.practicalMax))),
    total = w.mode === "OBJECTIVE" ? row.obtainedMarks : row.total;
  return (
    <tr>
      <td>{row.rollNo}</td>
      <td>
        {row.studentName}
        {w.validationErrors[row.studentId]?.map((e) => (
          <small className="cms-row-error" key={e}>
            {e}
          </small>
        ))}
      </td>
      {w.mode === "REGULAR" ? (
        <>
          <Num
            value={row.internal}
            disabled={locked || row.absent}
            onChange={(v) => update("internal", v)}
          />
          {w.practicalMax > 0 && (
            <Num
              value={row.practical}
              disabled={locked || row.absent}
              onChange={(v) => update("practical", v)}
            />
          )}
          <Num
            value={row.theory}
            disabled={locked || row.absent}
            onChange={(v) => update("theory", v)}
          />
          <td>{row.absent ? "ABS" : complete ? total : "—"}</td>
        </>
      ) : (
        <>
          <Num
            value={row.obtainedMarks}
            disabled={locked || row.absent}
            onChange={(v) => update("obtainedMarks", v)}
          />
          <td>{w.maxMarks}</td>
        </>
      )}
      <td>
        {row.absent
          ? "ABS"
          : complete && w.maxMarks
            ? `${((Number(total) / w.maxMarks) * 100).toFixed(2)}%`
            : "—"}
      </td>
      <td>
        <input
          type="checkbox"
          className="cms-checkbox"
          checked={row.absent}
          disabled={locked}
          onChange={(e) => update("absent", e.target.checked)}
          aria-label={`Mark ${row.studentName} absent`}
        />
      </td>
      <td>
        <input
          className="cms-remarks-input"
          value={row.remarks}
          disabled={locked}
          onChange={(e) => update("remarks", e.target.value)}
          aria-label={`${row.studentName} remarks`}
        />
      </td>
    </tr>
  );
}
function EvaluationList({
  rows,
  search,
  setSearch,
  page,
  setPage,
  onView,
  readiness,
  onBulk,
  processing,
}) {
  const total = Math.ceil(rows.length / PAGE_SIZE),
    shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <Search value={search} onChange={setSearch} />
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-info"
            disabled={processing || !readiness?.submittedCount}
            onClick={() => onBulk("VERIFY_ALL")}
          >
            Verify {readiness?.submittedCount || 0} Submitted
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-success"
            disabled={processing || !readiness?.verifiedCount}
            onClick={() => onBulk("APPROVE_ALL")}
          >
            Approve {readiness?.verifiedCount || 0} Verified
          </button>
        </div>
      </div>
      <Table
        className="cms-evaluation-table"
        heads={[
          "Subject",
          "Faculty",
          "Students",
          "Average / Total",
          "Highest",
          "Lowest",
          "Status",
          "Actions",
        ]}
      >
        {shown.length ? (
          shown.map((e) => (
            <tr key={e.evaluationId}>
              <td>
                {e.subject.name}
                <small className="cms-row-subtitle">{e.subject.code}</small>
              </td>
              <td>{e.faculty.name}</td>
              <td>{e.studentsCount}</td>
              <td>
                {e.average} / {e.subjectMaxMarks}
              </td>
              <td>{e.highest}</td>
              <td>{e.lowest}</td>
              <td>
                <Badge status={e.status} />
              </td>
              <td>
                <button
                  type="button"
                  className="cms-action-btn"
                  aria-label={`View ${e.subject.name} evaluation`}
                  onClick={() => onView(e)}
                >
                  <IconEye />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow span={8} text="No evaluations are available for the selected context." />
        )}
      </Table>
      <Pagination page={page} total={total} setPage={setPage} />
    </section>
  );
}
function EvaluationDetails({ item, page, setPage, onBack, onAction, processing }) {
  const total = Math.ceil(item.rows.length / PAGE_SIZE),
    rows = item.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title={`${item.subject.name} Marks Breakdown`} />
      <Table
        heads={[
          "Roll No",
          "Student",
          ...(item.mode === "REGULAR"
            ? ["Internal", ...(item.practicalMax ? ["Practical"] : []), "Theory"]
            : []),
          "Obtained",
          "Remarks",
          "Absent",
        ]}
      >
        {rows.map((r) => (
          <tr key={r.studentId}>
            <td>{r.rollNo}</td>
            <td>{r.studentName}</td>
            {item.mode === "REGULAR" && (
              <>
                <td>{r.absent ? "—" : r.internal}</td>
                {item.practicalMax > 0 && <td>{r.absent ? "—" : r.practical}</td>}
                <td>{r.absent ? "—" : r.theory}</td>
              </>
            )}
            <td>{r.absent ? "ABS" : r.obtainedMarks}</td>
            <td>{r.remarks || "—"}</td>
            <td>{r.absent ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} setPage={setPage} />
      <div className="cms-modal-actions">
        {item.status === "SUBMITTED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-info"
              disabled={processing}
              onClick={() => onAction("VERIFY")}
            >
              Verify Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              onClick={() => onAction("REJECT")}
            >
              Reject Evaluation
            </button>
          </>
        )}
        {item.status === "VERIFIED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-success"
              onClick={() => onAction("APPROVE")}
            >
              Approve Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              onClick={() => onAction("REJECT")}
            >
              Reject Evaluation
            </button>
          </>
        )}
        <Badge status={item.status} />
      </div>
    </section>
  );
}
function StudentList({ rows, subjects, search, setSearch, page, setPage, onView }) {
  const total = Math.ceil(rows.length / PAGE_SIZE),
    shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <Search value={search} onChange={setSearch} />
      </div>
      <Table
        className="cms-student-analysis-table"
        heads={[
          "Roll No",
          "Student",
          ...subjects.map((s) => s.name),
          "Total",
          "Percentage",
          "Grade",
          "Result",
          "Actions",
        ]}
      >
        {shown.length ? (
          shown.map((s) => {
            const calculatedPercentage =
              Number(s.totalMaximum) > 0
                ? (Number(s.totalObtained) / Number(s.totalMaximum)) * 100
                : null;
            const percentage =
              s.percentage != null && Number.isFinite(Number(s.percentage))
                ? Number(s.percentage)
                : calculatedPercentage;
            return (
            <tr key={s.studentId}>
              <td>{s.rollNo}</td>
              <td>{s.studentName}</td>
              {subjects.map((sub) => {
                const r = s.subjectResults.find((x) => eq(x.subjectId ?? x.id, sub.id));
                return <td key={sub.id}>{r?.obtainedMarks ?? r?.marks ?? "—"}</td>;
              })}
              <td>
                {s.totalObtained} / {s.totalMaximum}
              </td>
              <td>
                {percentage == null || !Number.isFinite(percentage)
                  ? "—"
                  : `${percentage.toFixed(2)}%`}
              </td>
              <td>{s.grade}</td>
              <td>
                <Result status={s.result} />
              </td>
              <td>
                <button
                  type="button"
                  className="cms-action-btn"
                  aria-label={`View ${s.studentName} result`}
                  onClick={() => onView(s)}
                >
                  <IconEye />
                </button>
              </td>
            </tr>
            );
          })
        ) : (
          <EmptyRow
            span={7 + subjects.length}
            text="Approved results are not yet available for this examination."
          />
        )}
      </Table>
      <Pagination page={page} total={total} setPage={setPage} />
    </section>
  );
}
function StudentDetails({ student, page, setPage, onBack }) {
  const rows = student.subjectResults || [],
    total = Math.ceil(rows.length / PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title="Detailed Student Performance Report" />
      <div className="cms-detail-grid">
        <Card label="Roll Number" value={student.rollNo} />
        <Card label="Student Name" value={student.studentName} />
        <Card
          label="Total"
          value={`${student.totalMarks ?? student.totalObtained ?? 0} / ${student.maxTotal ?? student.totalMaximum ?? 0}`}
        />
        <Card
          label="Percentage"
          value={student.percentage == null ? "—" : `${Number(student.percentage).toFixed(2)}%`}
        />
        <Card label="Grade" value={student.grade ?? "—"} />
        <Card label="Result" value={student.result ?? "PENDING"} />
      </div>
      <Table
        heads={[
          "Subject",
          "Code",
          "Mode",
          "Obtained / Maximum",
          "Pass %",
          "Percentage",
          "Grade",
          "Result",
        ]}
      >
        {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, i) => (
          <tr key={r.subjectId ?? i}>
            <td>{r.subjectName ?? r.name}</td>
            <td>{r.subjectCode ?? r.code ?? "—"}</td>
            <td>{r.mode ?? r.markMode ?? "—"}</td>
            <td>
              {r.isAbsent
                ? "ABS"
                : `${r.obtainedMarks ?? r.marks ?? "—"} / ${r.maximumMarks ?? r.maxMarks ?? "—"}`}
            </td>
            <td>{r.passPercentage ?? "—"}</td>
            <td>{r.percentage == null ? "—" : `${Number(r.percentage).toFixed(2)}%`}</td>
            <td>{r.isAbsent ? "—" : (r.grade ?? "—")}</td>
            <td>
              <Result status={r.isAbsent ? "ABSENT" : (r.result ?? "PENDING")} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} setPage={setPage} />
    </section>
  );
}
function Select({ id, label, value, options, disabled, onChange }) {
  return (
    <div className="cms-field-group">
      <label className="cms-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="cms-select-input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option value={o.id} key={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
const Num = ({ value, disabled, onChange }) => (
  <td>
    <input
      type="number"
      step="any"
      className="cms-number-input"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  </td>
);
const Search = ({ value, onChange }) => (
  <div className="cms-search-wrap">
    <input
      className="cms-search-input cms-search-input-plain"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search records..."
    />
  </div>
);
const Table = ({ heads, children, className = "" }) => (
  <div className="cms-table-container">
    <table className={`cms-table ${className}`.trim()}>
      <thead>
        <tr>
          {heads.map((h, i) => (
            <th scope="col" key={`${h}-${i}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
const Badge = ({ status }) => (
  <span className={`cms-badge-status cms-status-${status.toLowerCase().replace(" ", "-")}`}>
    <span className="cms-badge-dot" />
    {status}
  </span>
);
const Result = ({ status }) => (
  <span className={`cms-result cms-result-${status.toLowerCase()}`}>{status}</span>
);
const Card = ({ label, value }) => (
  <div className="cms-detail-card">
    <span className="cms-detail-label">{label}</span>
    <span className="cms-detail-value">{value}</span>
  </div>
);
const Back = ({ onClick, title }) => (
  <div className="cms-details-header">
    <button type="button" className="cms-back-btn" onClick={onClick}>
      ← Back
    </button>
    <h2 className="cms-details-title">{title}</h2>
  </div>
);
const Empty = ({ text }) => <div className="cms-card cms-empty-card">{text}</div>;
const EmptyRow = ({ span, text }) => (
  <tr>
    <td colSpan={span} className="cms-empty-td">
      {text}
    </td>
  </tr>
);
function Pagination({ page, total, setPage }) {
  useEffect(() => {
    if (total) setPage((p) => Math.min(p, total));
  }, [total, setPage]);
  if (!total) return null;
  return (
    <nav className="cms-pagination">
      <button
        type="button"
        className="cms-page-btn"
        disabled={page <= 1}
        onClick={() => setPage((p) => p - 1)}
      >
        Previous
      </button>
      <span>
        {page} / {total}
      </span>
      <button
        type="button"
        className="cms-page-btn"
        disabled={page >= total}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </button>
    </nav>
  );
}
const Confirm = ({ title, text, onCancel, onConfirm }) => (
  <div className="cms-overlay">
    <div className="cms-modal">
      <div className="cms-modal-head">
        <h3>{title}</h3>
      </div>
      <div className="cms-modal-body">{text}</div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  </div>
);
const Message = ({ action, value, setValue, onCancel, onConfirm }) => (
  <div className="cms-overlay">
    <div className="cms-modal">
      <div className="cms-modal-head">
        <h3>{action === "VERIFY" ? "Verify Evaluation" : "Reject Evaluation"}</h3>
      </div>
      <div className="cms-modal-body">
        <textarea
          className="cms-marks-textarea"
          rows="4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={value.trim().length < 5}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
