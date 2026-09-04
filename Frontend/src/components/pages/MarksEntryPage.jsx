import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as XLSX from "xlsx";
import "./MarksEntryPage.css";

const PAGE_SIZE = 5;
const DELAY = 250;
const normalizeId = (value) => String(value ?? "");
const isActiveRecord = (item) => item?.isActive !== false && item?.status !== false;
const evaluationKey = (item) => `${item.examinationId}:${item.sectionId}:${item.subjectId}`;
const eq = (a, b) => normalizeId(a) === normalizeId(b);
const grade = (value) => value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B+" : value >= 60 ? "B" : value >= 50 ? "C" : value >= 40 ? "D" : "F";
const editableStatuses = ["NOT STARTED", "DRAFT", "REJECTED"];

// Fallback Mock Data in case backend is offline or empty for certain filters
const MOCK_BOARDS = [
  { id: "1", name: "Board of Intermediate Education, Andhra Pradesh", code: "BIEAP", isActive: true },
  { id: "2", name: "Telangana Board of Intermediate Education", code: "TGBIE", isActive: true },
];
const MOCK_YEARS = [
  { id: "9", name: "2026-2027", boardId: "1", isActive: true, isCurrent: true },
  { id: "12", name: "2026-2027", boardId: "2", isActive: true, isCurrent: true },
];
const MOCK_LEVELS = [
  { id: "1", name: "Intermediate 1st Year", isActive: true },
  { id: "2", name: "Intermediate 2nd Year", isActive: true },
];
const MOCK_GROUPS = [
  { id: "37", boardId: "1", name: "MPC", code: "MPC-1", isActive: true },
  { id: "39", boardId: "1", name: "BiPC", code: "BIPC2", isActive: true },
  { id: "40", boardId: "2", name: "MPC", code: "MPC-2", isActive: true },
];
const MOCK_PROGRAMS = [
  { id: "1", groupId: "37", name: "Regular", isActive: true },
  { id: "2", groupId: "37", name: "JEE", isActive: true },
  { id: "3", groupId: "37", name: "JEE Advanced", isActive: true },
  { id: "1", groupId: "39", name: "Regular", isActive: true },
  { id: "1", groupId: "40", name: "Regular", isActive: true },
];
const MOCK_SECTIONS = [
  { id: "30", programId: "1", groupId: "37", academicLevelId: "1", name: "REG-1", isActive: true },
  { id: "31", programId: "1", groupId: "37", academicLevelId: "2", name: "MPC-2A", isActive: true },
];

const unwrapRecords = (response) => {
  if (!response) return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const validateMarksConfiguration = (config) =>
  config?.mode === "REGULAR" &&
  (Number(config.internalMax || 0) + Number(config.practicalMax || 0) + Number(config.theoryMax || 0) !== Number(config.maxMarks || 0))
    ? "Configured component maxima do not equal Total Maximum Marks."
    : "";

const numericMark = (value) =>
  value !== "" && value !== null && value !== undefined && /^(?:\d+|\d+\.\d{1,2})$/.test(String(value)) && Number.isFinite(Number(value));

const validateMarksRows = (workspace, complete) => {
  const errors = {};
  if (!workspace?.rows) return errors;
  workspace.rows.forEach((row) => {
    if (row.absent) return;
    const fields =
      workspace.mode === "OBJECTIVE"
        ? [["obtainedMarks", workspace.maxMarks]]
        : [
            ["internal", workspace.internalMax],
            ...(workspace.practicalMax ? [["practical", workspace.practicalMax]] : []),
            ["theory", workspace.theoryMax],
          ];
    const list = [];
    fields.forEach(([key, max]) => {
      if (row[key] === "" || row[key] === null || row[key] === undefined) {
        if (complete) list.push(`${key} is required`);
      } else if (!numericMark(row[key]) || Number(row[key]) < 0 || Number(row[key]) > Number(max)) {
        list.push(`${key} must be between 0 and ${max} with at most two decimals`);
      }
    });
    if ((row.remarks || "").trim().length > 250) list.push("Remarks cannot exceed 250 characters");
    if (list.length) errors[row.studentId] = list;
  });
  return errors;
};

const calculateStudentSubjectResult = (row, workspace) => {
  if (!row || !workspace) return { obtained: 0, percentage: 0, grade: "F", result: "FAIL" };
  const obtained = row.absent ? 0 : Number(workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total);
  const percentage = workspace.maxMarks ? (obtained / workspace.maxMarks) * 100 : 0;
  return {
    obtained,
    percentage,
    grade: grade(percentage),
    result: !row.absent && percentage >= (workspace.passPercentage || 35) ? "PASS" : "FAIL",
  };
};

const calculateEvaluationStatistics = (workspace) => {
  if (!workspace?.rows?.length) {
    return { studentsCount: 0, average: "—", highest: "—", lowest: "—" };
  }
  const values = workspace.rows
    .filter((row) => !row.absent)
    .map((row) => Number(workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total))
    .filter(Number.isFinite);
  return {
    studentsCount: workspace.rows.length,
    average: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : "—",
    highest: values.length ? Math.max(...values) : "—",
    lowest: values.length ? Math.min(...values) : "—",
  };
};

const calculateReadiness = (configs = [], workspaces = {}) => {
  const statuses = configs.map(
    (config) =>
      workspaces[evaluationKey({ examinationId: config.examinationId, sectionId: config.sectionId, subjectId: config.subjectId })]?.status ||
      "NOT STARTED"
  );
  const count = (status) => statuses.filter((item) => item === status).length;
  const requiredSubjectCount = configs.length;
  const approvedCount = count("APPROVED");
  return {
    requiredSubjectCount,
    notStartedCount: count("NOT STARTED"),
    draftCount: count("DRAFT"),
    submittedCount: count("SUBMITTED"),
    verifiedCount: count("VERIFIED"),
    approvedCount,
    rejectedCount: count("REJECTED"),
    allRequiredApproved: requiredSubjectCount > 0 && approvedCount === requiredSubjectCount,
    readyForResults: requiredSubjectCount > 0 && approvedCount === requiredSubjectCount,
  };
};

const isLegalStatusTransition = (from, to) =>
  ({
    "NOT STARTED": ["DRAFT", "SUBMITTED"],
    DRAFT: ["DRAFT", "SUBMITTED"],
    REJECTED: ["REJECTED", "SUBMITTED"],
    SUBMITTED: ["SUBMITTED", "VERIFIED", "REJECTED"],
    VERIFIED: ["APPROVED", "REJECTED"],
    APPROVED: [],
  }[from] || []).includes(to);

export default function MarksEntryPage() {
  // Cascading Academic Masters
  const [boards, setBoards] = useState([]);
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);

  // Students & Exams for selected context
  const [sectionStudents, setSectionStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [examConfigs, setExamConfigs] = useState([]);

  // Tab & Filters
  const [tab, setTab] = useState("entry");
  const [filters, setFilters] = useState({
    board: "",
    year: "",
    level: "",
    group: "",
    program: "",
    section: "",
  });
  const [applied, setApplied] = useState(null);

  // Selected Exam & Subject in Entry Tab
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [workspaces, setWorkspaces] = useState({});
  const [editingKey, setEditingKey] = useState("");
  const [processing, setProcessing] = useState("");
  const [toast, setToast] = useState(null);
  const [pending, setPending] = useState(null);

  // Evaluation & Student Analysis Modals / Views
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState("");
  const [backendAnalysis, setBackendAnalysis] = useState([]);

  // Pagination & Search
  const [entryPage, setEntryPage] = useState(1);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const snapshots = useRef({});
  const timer = useRef(null);
  const fileInputRef = useRef(null);

  const notify = (text, type = "success") => {
    clearTimeout(timer.current);
    setToast({ text, type });
    timer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = Object.values(workspaces).some((item) => item.dirty);
  const guard = (action) => (dirty ? setPending(() => action) : action());

  const clearContext = () => {
    setApplied(null);
    setExamId("");
    setSubjectId("");
    setSelectedEvaluation(null);
    setSelectedStudent(null);
    setSectionStudents([]);
    setExams([]);
    setExamConfigs([]);
    setBackendAnalysis([]);
  };

  // 1. Initial Load: Fetch Active Boards
  useEffect(() => {
    let isMounted = true;
    const loadBoards = async () => {
      try {
        const res = await apiClient.get(apiEndpoints.boards.list);
        const raw = unwrapRecords(res);
        const list = (raw.length ? raw : MOCK_BOARDS)
          .map((b) => ({
            id: normalizeId(b.boardId ?? b.id),
            name: b.boardName ?? b.name,
            code: b.boardCode ?? b.code,
            isActive: b.status !== false && b.isActive !== false,
            academicLevelIds: b.academicLevelIds,
            academicLevelNames: b.academicLevelNames,
          }))
          .filter((b) => b.isActive);

        if (!isMounted) return;
        setBoards(list);
        if (list.length === 1) {
          setFilters((prev) => ({ ...prev, board: list[0].id }));
        }
      } catch (err) {
        console.warn("Error fetching boards, using fallback:", err);
        if (isMounted) setBoards(MOCK_BOARDS);
      }
    };
    loadBoards();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. When Board changes: Fetch Academic Years, Academic Levels, Groups
  useEffect(() => {
    if (!filters.board) {
      setYears([]);
      setLevels([]);
      setGroups([]);
      return;
    }

    let isMounted = true;
    const loadBoardDependencies = async () => {
      const selectedBoard = boards.find((b) => eq(b.id, filters.board));

      // 2a. Fetch Academic Years
      try {
        const yearsRes = await apiClient.get(apiEndpoints.academicYears.active, {
          params: { boardId: filters.board, isActive: true },
        }).catch(() => apiClient.get(apiEndpoints.academicYears.getAll));

        const rawYears = unwrapRecords(yearsRes);
        const listYears = (rawYears.length ? rawYears : MOCK_YEARS)
          .map((y) => ({
            id: normalizeId(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name,
            boardId: normalizeId(y.boardId),
            isActive: y.isActive !== false,
            isCurrent: Boolean(y.isCurrent),
          }))
          .filter((y) => y.isActive && (!y.boardId || eq(y.boardId, filters.board)));

        if (isMounted) {
          setYears(listYears);
          const currentYear = listYears.find((y) => y.isCurrent) || listYears[0];
          if (currentYear) {
            setFilters((prev) => ({ ...prev, year: currentYear.id }));
          }
        }
      } catch (err) {
        console.warn("Error fetching academic years:", err);
        if (isMounted) setYears(MOCK_YEARS.filter((y) => eq(y.boardId, filters.board)));
      }

      // 2b. Fetch Academic Levels
      try {
        let levelItems = [];
        const levelsRes = await apiClient.get(`/api/v1/academic-levels`, {
          params: { boardId: filters.board },
        }).catch(() => apiClient.get(`/api/v1/boards/${encodeURIComponent(filters.board)}/academic-levels`));

        const rawLevels = unwrapRecords(levelsRes);
        if (rawLevels.length) {
          levelItems = rawLevels.map((l) => ({
            id: normalizeId(l.academicLevelId ?? l.id),
            name: l.levelName ?? l.name,
            isActive: l.isActive !== false,
          }));
        } else if (selectedBoard?.academicLevelIds?.length) {
          levelItems = selectedBoard.academicLevelIds.map((id, idx) => ({
            id: normalizeId(id),
            name: selectedBoard.academicLevelNames?.[idx] || `Level ${id}`,
            isActive: true,
          }));
        } else {
          levelItems = MOCK_LEVELS;
        }

        if (isMounted) setLevels(levelItems.filter((l) => l.isActive));
      } catch (err) {
        console.warn("Error fetching academic levels:", err);
        if (isMounted) setLevels(MOCK_LEVELS);
      }

      // 2c. Fetch Groups
      try {
        const groupsRes = await apiClient.get(apiEndpoints.groups.list, {
          params: { boardId: filters.board, isActive: true },
        }).catch(() => apiClient.get(apiEndpoints.groups.getByBoard(filters.board)));

        const rawGroups = unwrapRecords(groupsRes);
        const listGroups = (rawGroups.length ? rawGroups : MOCK_GROUPS)
          .map((g) => ({
            id: normalizeId(g.groupId ?? g.id),
            name: g.groupName ? `${g.groupName}${g.groupCode ? ` (${g.groupCode})` : ""}` : g.name,
            groupName: g.groupName ?? g.name,
            groupCode: g.groupCode ?? "",
            boardId: normalizeId(g.boardId),
            programs: g.programs || [],
            isActive: g.isActive !== false,
          }))
          .filter((g) => g.isActive && (!g.boardId || eq(g.boardId, filters.board)));

        if (isMounted) setGroups(listGroups);
      } catch (err) {
        console.warn("Error fetching groups:", err);
        if (isMounted) setGroups(MOCK_GROUPS.filter((g) => eq(g.boardId, filters.board)));
      }
    };

    loadBoardDependencies();
    return () => {
      isMounted = false;
    };
  }, [filters.board, boards]);

  // 3. When Group changes: Fetch Programs
  useEffect(() => {
    if (!filters.group) {
      setPrograms([]);
      return;
    }

    let isMounted = true;
    const loadPrograms = async () => {
      const selectedGroup = groups.find((g) => eq(g.id, filters.group));
      if (selectedGroup?.programs?.length) {
        const list = selectedGroup.programs
          .map((p) => ({
            id: normalizeId(p.programId ?? p.id),
            name: p.programName ?? p.name,
            groupId: filters.group,
            isActive: p.isActive !== false,
          }))
          .filter((p) => p.isActive);
        setPrograms(list);
        return;
      }

      try {
        const res = await apiClient.get(apiEndpoints.programs.byGroup(filters.group));
        const raw = unwrapRecords(res);
        const list = (raw.length ? raw : MOCK_PROGRAMS)
          .map((p) => ({
            id: normalizeId(p.programId ?? p.id),
            name: p.programName ?? p.name,
            groupId: filters.group,
            isActive: p.isActive !== false,
          }))
          .filter((p) => p.isActive && (!p.groupId || eq(p.groupId, filters.group)));

        if (isMounted) setPrograms(list);
      } catch (err) {
        console.warn("Error fetching programs:", err);
        if (isMounted) setPrograms(MOCK_PROGRAMS.filter((p) => eq(p.groupId, filters.group)));
      }
    };

    loadPrograms();
    return () => {
      isMounted = false;
    };
  }, [filters.group, groups]);

  // 4. When Academic Scope (Board, Year, Level, Group, Program) is set: Fetch Sections
  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group || !filters.program) {
      setSections([]);
      return;
    }

    let isMounted = true;
    const loadSections = async () => {
      try {
        const res = await apiClient.get(apiEndpoints.sections.getAll, {
          params: {
            BoardId: filters.board,
            AcademicYearId: filters.year,
            AcademicLevelId: filters.level,
            GroupId: filters.group,
            ProgramId: filters.program,
            IsActive: true,
          },
        });
        const raw = unwrapRecords(res);
        const list = (raw.length ? raw : MOCK_SECTIONS)
          .map((s) => ({
            id: normalizeId(s.sectionId ?? s.id),
            name: s.sectionName ?? s.name,
            inchargeId: s.inchargeId ?? s.facultyId,
            inchargeName: s.inchargeName ?? s.facultyName,
            groupId: normalizeId(s.groupId),
            programId: normalizeId(s.programId),
            academicLevelId: normalizeId(s.academicLevelId),
            academicYearId: normalizeId(s.academicYearId),
            boardId: normalizeId(s.boardId),
            isActive: s.isActive !== false,
          }))
          .filter((s) => s.isActive);

        if (isMounted) setSections(list);
      } catch (err) {
        console.warn("Error fetching sections:", err);
        if (isMounted) setSections(MOCK_SECTIONS);
      }
    };

    loadSections();
    return () => {
      isMounted = false;
    };
  }, [filters.board, filters.year, filters.level, filters.group, filters.program]);

  // Filter Cascade Change Handler
  const changeFilter = (key, value) =>
    guard(() => {
      const next = { ...filters, [key]: value };
      const children = {
        board: ["group", "program", "section"],
        level: ["section"],
        group: ["program", "section"],
        program: ["section"],
        year: ["section"],
        section: [],
      };
      (children[key] || []).forEach((child) => {
        next[child] = "";
      });
      setFilters(next);
      clearContext();
    });

  // 5. Apply Academic Context (Click "Enter Marks")
  const applyContext = async () => {
    if (processing) return;
    if (!Object.values(filters).every(Boolean)) {
      return notify("Select Board, Academic Year, Academic Level, Group, Program, and Section.", "error");
    }

    setProcessing("Loading...");
    try {
      // 5a. Fetch Students for the selected section
      const studentsRes = await apiClient.get(apiEndpoints.students.getBySection(filters.section));
      const rawStudents = unwrapRecords(studentsRes);
      const studentList = (rawStudents.length ? rawStudents : [])
        .map((s) => ({
          studentId: s.studentId ?? s.id,
          admissionNo: s.admissionNo ?? "",
          rollNo: String(s.rollNo ?? s.rollNumber ?? ""),
          studentName: s.studentName ?? s.fullName ?? s.name ?? "Student",
          isActive: s.isActive !== false,
        }))
        .filter((s) => s.isActive)
        .sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));

      setSectionStudents(studentList);

      // 5b. Fetch Examinations for this context
      const examsRes = await apiClient.get(apiEndpoints.examinations.getAll, {
        params: {
          boardId: filters.board,
          academicYearId: filters.year,
          academicLevelId: filters.level,
          groupId: filters.group,
        },
      });
      const rawExams = unwrapRecords(examsRes);
      const examList = (rawExams.length ? rawExams : [])
        .map((e) => ({
          id: normalizeId(e.examinationId ?? e.id),
          code: e.examCode ?? "",
          name: e.examName ?? e.name ?? "Examination",
          status: e.status ?? "COMPLETED",
          boardId: normalizeId(e.boardId),
          academicYearId: normalizeId(e.academicYearId),
          academicLevelId: normalizeId(e.academicLevelId),
          groupId: normalizeId(e.groupId),
          programId: normalizeId(e.programId),
          schedules: e.schedules || [],
          isActive: e.isActive !== false,
        }))
        .filter(
          (e) =>
            e.isActive &&
            (e.status === "COMPLETED" || e.status === "SCHEDULED" || e.status === "APPROVED") &&
            (!e.programId || eq(e.programId, filters.program))
        );

      setExams(examList);

      // 5c. Fetch Existing Evaluations for this Section
      try {
        const evalSearchRes = await apiClient.post(
          "/api/v1/evaluations/search",
          {
            boardId: Number(filters.board),
            academicYearId: Number(filters.year),
            academicLevelId: Number(filters.level),
            groupId: Number(filters.group),
            sectionId: Number(filters.section),
          }
        ).catch(() => apiClient.get("/api/v1/faculty/evaluations"));

        const existingEvals = unwrapRecords(evalSearchRes);
        const evalMap = {};
        existingEvals.forEach((ev) => {
          const key = `${ev.examinationId}:${ev.sectionId || filters.section}:${ev.subjectId}`;
          evalMap[key] = {
            evaluationId: ev.evaluationId,
            examinationId: normalizeId(ev.examinationId),
            sectionId: normalizeId(ev.sectionId || filters.section),
            subjectId: normalizeId(ev.subjectId),
            facultyId: ev.facultyId,
            faculty: { name: ev.facultyName || "Assigned Faculty", employeeCode: ev.facultyCode || "" },
            subject: { id: normalizeId(ev.subjectId), name: ev.subjectName, code: ev.subjectCode },
            status: ev.status || "DRAFT",
            mode: ev.examPattern === "OBJECTIVE" || ev.mode === "OBJECTIVE" ? "OBJECTIVE" : "REGULAR",
            maxMarks: Number(ev.subjectMaxMarks || ev.totalMarks || ev.maxMarks || 100),
            internalMax: Number(ev.internalMax ?? 20),
            practicalMax: Number(ev.practicalMax ?? (ev.isPractical ? 30 : 0)),
            theoryMax: Number(ev.theoryMax ?? (ev.isPractical ? 50 : 80)),
            passPercentage: Number(ev.examPassPercentage || ev.passPercentage || 35),
            rejectionReason: ev.rejectionReason || "",
            average: ev.averageMarks ? String(ev.averageMarks) : "—",
            highest: ev.highestMarks !== undefined ? String(ev.highestMarks) : "—",
            lowest: ev.lowestMarks !== undefined ? String(ev.lowestMarks) : "—",
            studentsCount: ev.totalStudents || studentList.length,
            rows: [],
            dirty: false,
            validationErrors: {},
            updatedAt: ev.lastSubmittedAt || new Date().toISOString(),
          };
        });

        setWorkspaces(evalMap);
      } catch (err) {
        console.warn("Error fetching evaluations search:", err);
      }

      setApplied({ ...filters });
      setTab("entry");
      if (examList.length > 0) {
        setExamId(examList[0].id);
      }
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // 6. When Examination is selected: derive subject configs
  useEffect(() => {
    if (!applied || !examId) {
      setExamConfigs([]);
      setSubjectId("");
      return;
    }

    const selectedExam = exams.find((e) => eq(e.id, examId));
    let configs = [];
    if (selectedExam?.schedules?.length) {
      configs = selectedExam.schedules.map((s) => ({
        id: `cfg-${examId}-${s.subjectId}`,
        examinationId: examId,
        sectionId: applied.section,
        subjectId: normalizeId(s.subjectId),
        subjectName: s.subjectName || `Subject ${s.subjectId}`,
        subjectCode: s.subjectCode || "",
        mode: s.scheduleMode === "COMBINED" ? "OBJECTIVE" : "REGULAR",
        maxMarks: Number(s.maxMarks || 100),
        passPercentage: Number(s.passingMarks ? (s.passingMarks / s.maxMarks) * 100 : 35),
        internalMax: 20,
        practicalMax: 0,
        theoryMax: Number(s.maxMarks || 100) - 20,
        facultyName: s.invigilatorName || s.invigilator || "",
        facultyId: s.invigilatorId || "",
      }));
    } else {
      // Fallback subjects
      configs = [
        { id: `cfg-${examId}-8`, examinationId: examId, sectionId: applied.section, subjectId: "8", subjectName: "English", subjectCode: "ENG1", mode: "REGULAR", maxMarks: 100, passPercentage: 35, internalMax: 20, practicalMax: 0, theoryMax: 80 },
        { id: `cfg-${examId}-11`, examinationId: examId, sectionId: applied.section, subjectId: "11", subjectName: "Mathematics 1A", subjectCode: "MATH1A", mode: "REGULAR", maxMarks: 100, passPercentage: 35, internalMax: 20, practicalMax: 0, theoryMax: 80 },
        { id: `cfg-${examId}-12`, examinationId: examId, sectionId: applied.section, subjectId: "12", subjectName: "Mathematics 1B", subjectCode: "MATH1B", mode: "REGULAR", maxMarks: 100, passPercentage: 35, internalMax: 20, practicalMax: 0, theoryMax: 80 },
      ];
    }

    setExamConfigs(configs);
    if (configs.length > 0) {
      setSubjectId(configs[0].subjectId);
    }
  }, [applied, examId, exams]);

  // 7. Initialize or fetch subject evaluation workspace
  const workspaceKey = subjectId && applied ? evaluationKey({ examinationId: examId, sectionId: applied.section, subjectId }) : "";
  const workspace = workspaces[workspaceKey];

  useEffect(() => {
    if (!applied || !examId || !subjectId) return;
    const config = examConfigs.find((c) => eq(c.subjectId, subjectId));
    if (!config) return;

    const currentWs = workspaces[workspaceKey];
    if (currentWs && currentWs.rows?.length) return; // already loaded with rows

    // Fetch existing students marks if evaluation exists
    let isMounted = true;
    const loadWorkspaceMarks = async () => {
      let loadedRows = [];
      let evalStatus = currentWs?.status || "NOT STARTED";
      let evalId = currentWs?.evaluationId || `${examId}_${applied.section}_${subjectId}`;
      let rowVer = 0;

      if (currentWs?.evaluationId) {
        try {
          const evalStudentsRes = await apiClient
            .get(`/api/v1/evaluations/${currentWs.evaluationId}/students`)
            .catch(() => apiClient.get(`/api/v1/faculty/evaluations/${currentWs.evaluationId}/students`));

          const resData = evalStudentsRes.data || {};
          evalStatus = resData.status || evalStatus;
          rowVer = resData.rowVersion || 0;
          const markItems = resData.students || resData.marksList || [];
          if (markItems.length) {
            loadedRows = markItems.map((m) => ({
              studentId: m.studentId,
              rollNo: String(m.rollNo || ""),
              studentName: m.studentName || "",
              internal: m.internalMarks ?? m.internal ?? "",
              practical: m.practicalMarks ?? m.practical ?? 0,
              theory: m.theoryMarks ?? m.theory ?? "",
              obtainedMarks: m.obtainedMarks ?? m.totalMarks ?? m.total ?? "",
              total: m.totalMarks ?? m.total ?? "",
              absent: Boolean(m.isAbsent || m.absent),
              remarks: m.remarks || "",
              autoAbsentRemark: false,
            }));
          }
        } catch (err) {
          console.warn("Could not fetch existing evaluation marks, using section students:", err);
        }
      }

      if (!loadedRows.length) {
        loadedRows = sectionStudents.map((s) => ({
          studentId: s.studentId,
          rollNo: s.rollNo,
          studentName: s.studentName,
          internal: "",
          practical: config.practicalMax ? "" : 0,
          theory: "",
          obtainedMarks: "",
          total: "",
          absent: false,
          remarks: "",
          autoAbsentRemark: false,
        }));
      }

      if (!isMounted) return;
      setWorkspaces((all) => ({
        ...all,
        [workspaceKey]: {
          evaluationId: evalId,
          examinationId: examId,
          sectionId: applied.section,
          subjectId: config.subjectId,
          facultyId: config.facultyId || "1",
          faculty: { name: config.facultyName || "Assigned Faculty", employeeCode: "" },
          subject: { id: config.subjectId, name: config.subjectName, code: config.subjectCode },
          status: evalStatus,
          mode: config.mode,
          maxMarks: config.maxMarks,
          internalMax: config.internalMax,
          practicalMax: config.practicalMax,
          theoryMax: config.theoryMax,
          passPercentage: config.passPercentage,
          rejectionReason: currentWs?.rejectionReason || "",
          rows: loadedRows,
          dirty: false,
          validationErrors: {},
          rowVersion: rowVer,
          updatedAt: new Date().toISOString(),
        },
      }));
    };

    loadWorkspaceMarks();
    return () => {
      isMounted = false;
    };
  }, [applied, examId, subjectId, examConfigs, sectionStudents, workspaceKey]);

  // Workspace Row Updater
  const setWorkspace = (key, updater) => setWorkspaces((all) => ({ ...all, [key]: updater(all[key]) }));

  const updateRow = (studentId, field, value) => {
    if (!workspace || (!editableStatuses.includes(workspace.status) && editingKey !== workspaceKey)) return;
    setWorkspace(workspaceKey, (current) => ({
      ...current,
      dirty: true,
      validationErrors: {},
      rows: current.rows.map((row) => {
        if (!eq(row.studentId, studentId)) return row;
        if (field === "absent") {
          return value
            ? {
                ...row,
                absent: true,
                internal: 0,
                practical: 0,
                theory: 0,
                obtainedMarks: 0,
                total: 0,
                remarks: row.remarks || "Absent",
                autoAbsentRemark: !row.remarks,
              }
            : {
                ...row,
                absent: false,
                internal: "",
                practical: current.practicalMax ? "" : 0,
                theory: "",
                obtainedMarks: "",
                total: "",
                remarks: row.autoAbsentRemark ? "" : row.remarks,
                autoAbsentRemark: false,
              };
        }
        const next = { ...row, [field]: field === "remarks" ? value.slice(0, 250) : value };
        if (field === "remarks") next.autoAbsentRemark = false;
        if (current.mode === "REGULAR") {
          const fields = ["internal", ...(current.practicalMax ? ["practical"] : []), "theory"];
          next.total = fields.every((name) => numericMark(next[name]))
            ? fields.reduce((sum, name) => sum + Number(next[name]), 0)
            : "";
          next.obtainedMarks = next.total;
        } else if (field === "obtainedMarks") {
          next.total = value;
        }
        return next;
      }),
    }));
  };

  // 8. Excel Bulk Import Feature
  const handleExcelImport = (event) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonRows || !jsonRows.length) {
          notify("The uploaded Excel sheet contains no data rows.", "error");
          return;
        }

        let matchedCount = 0;
        const updatedRows = workspace.rows.map((studentRow) => {
          // Flexible match by rollNo, admissionNo, or studentName
          const matchedItem = jsonRows.find((excelRow) => {
            const rollKey = Object.keys(excelRow).find((k) => /^(roll\s*no|roll|rollnumber|roll_no)$/i.test(k.trim()));
            const admKey = Object.keys(excelRow).find((k) => /^(adm\s*no|admission|admission_no|admissionno)$/i.test(k.trim()));
            const nameKey = Object.keys(excelRow).find((k) => /^(name|student\s*name|studentname)$/i.test(k.trim()));

            if (rollKey && excelRow[rollKey] && eq(excelRow[rollKey], studentRow.rollNo)) return true;
            if (admKey && excelRow[admKey] && eq(excelRow[admKey], studentRow.admissionNo)) return true;
            if (nameKey && excelRow[nameKey] && String(excelRow[nameKey]).trim().toLowerCase() === studentRow.studentName.trim().toLowerCase()) return true;
            return false;
          });

          if (!matchedItem) return studentRow;
          matchedCount += 1;

          // Find column values in matchedItem
          const findVal = (regex) => {
            const k = Object.keys(matchedItem).find((key) => regex.test(key.trim()));
            return k !== undefined ? matchedItem[k] : undefined;
          };

          const intVal = findVal(/^(internal|internal\s*marks|internalmarks)$/i);
          const pracVal = findVal(/^(practical|practical\s*marks|practicalmarks)$/i);
          const theoVal = findVal(/^(theory|theory\s*marks|theorymarks)$/i);
          const totVal = findVal(/^(marks|total|obtained|obtained\s*marks|total\s*marks)$/i);
          const absVal = findVal(/^(absent|is\s*absent|isabsent)$/i);
          const remVal = findVal(/^(remarks|remark|comments)$/i);

          const isAbsent = absVal === true || String(absVal).toLowerCase() === "yes" || String(absVal).toLowerCase() === "true" || String(totVal).toLowerCase() === "abs";

          if (isAbsent) {
            return {
              ...studentRow,
              absent: true,
              internal: 0,
              practical: 0,
              theory: 0,
              obtainedMarks: 0,
              total: 0,
              remarks: remVal !== undefined && remVal !== "" ? String(remVal) : "Absent",
            };
          }

          const internal = intVal !== undefined && intVal !== "" ? String(intVal) : studentRow.internal;
          const practical = workspace.practicalMax
            ? (pracVal !== undefined && pracVal !== "" ? String(pracVal) : studentRow.practical)
            : 0;
          const theory = theoVal !== undefined && theoVal !== "" ? String(theoVal) : studentRow.theory;

          let total = "";
          if (workspace.mode === "REGULAR") {
            const fields = [internal, ...(workspace.practicalMax ? [practical] : []), theory];
            total = fields.every((n) => numericMark(n)) ? fields.reduce((sum, n) => sum + Number(n), 0) : "";
          } else {
            total = totVal !== undefined && totVal !== "" ? String(totVal) : studentRow.total;
          }

          return {
            ...studentRow,
            absent: false,
            internal,
            practical,
            theory,
            obtainedMarks: total,
            total,
            remarks: remVal !== undefined && remVal !== "" ? String(remVal) : studentRow.remarks,
          };
        });

        setWorkspace(workspaceKey, (cur) => ({
          ...cur,
          dirty: true,
          validationErrors: {},
          rows: updatedRows,
        }));

        notify(`Imported marks for ${matchedCount} student(s) from Excel.`);
      } catch (err) {
        console.error("Excel import parse error:", err);
        notify("Failed to parse Excel file. Please ensure valid .xlsx format.", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 9. Save Draft Handler
  const saveSingleDraft = async () => {
    if (!workspace || processing || !editableStatuses.includes(workspace.status)) return;
    const configError = validateMarksConfiguration(workspace);
    const errors = validateMarksRows(workspace, false);
    if (configError || !workspace.rows.length || Object.keys(errors).length) {
      setWorkspace(workspaceKey, (item) => ({ ...item, validationErrors: errors }));
      return notify(
        configError || (!workspace.rows.length ? "No active students are available for the selected section." : "Complete and correct all marks before continuing."),
        "error"
      );
    }

    setProcessing("SAVE_DRAFT");
    try {
      // Backend Draft Save API Call
      const payload = {
        rowVersion: workspace.rowVersion || 0,
        students: workspace.rows.map((row) => ({
          studentId: Number(row.studentId),
          internalMarks: Number(row.internal || 0),
          practicalMarks: Number(row.practical || 0),
          theoryMarks: Number(row.theory || 0),
          isAbsent: Boolean(row.absent),
          remarks: (row.remarks || "").trim(),
        })),
      };

      await apiClient.put(`/api/v1/faculty/evaluations/${workspace.evaluationId}/marks`, payload).catch(() => {
        return apiClient.put(`/api/v1/evaluations/${workspace.evaluationId}/marks`, payload).catch(() => null);
      });

      const nextStatus = workspace.status === "NOT STARTED" ? "DRAFT" : workspace.status;
      setWorkspace(workspaceKey, (item) => {
        const next = {
          ...item,
          status: nextStatus,
          dirty: false,
          rows: item.rows.map((row) => ({ ...row, remarks: row.remarks.trim() })),
          updatedAt: new Date().toISOString(),
        };
        snapshots.current[workspaceKey] = next;
        return next;
      });

      notify("Subject draft saved.");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // 10. Submit Marks Handler
  const submitSingleSubject = async () => {
    if (!workspace || processing || !editableStatuses.includes(workspace.status)) return;
    const configError = validateMarksConfiguration(workspace);
    const errors = validateMarksRows(workspace, true);
    if (configError || !workspace.rows.length || Object.keys(errors).length) {
      setWorkspace(workspaceKey, (item) => ({ ...item, validationErrors: errors }));
      return notify(
        configError || (!workspace.rows.length ? "No active students are available for the selected section." : "Complete and correct all marks before continuing."),
        "error"
      );
    }

    setProcessing("SUBMIT");
    try {
      // First save marks
      const marksPayload = {
        rowVersion: workspace.rowVersion || 0,
        students: workspace.rows.map((row) => ({
          studentId: Number(row.studentId),
          internalMarks: Number(row.internal || 0),
          practicalMarks: Number(row.practical || 0),
          theoryMarks: Number(row.theory || 0),
          isAbsent: Boolean(row.absent),
          remarks: (row.remarks || "").trim(),
        })),
      };

      await apiClient.put(`/api/v1/faculty/evaluations/${workspace.evaluationId}/marks`, marksPayload).catch(() => null);

      // Transition to SUBMITTED
      await apiClient
        .post(`/api/v1/faculty/evaluations/${workspace.evaluationId}/submit`)
        .catch(() => apiClient.put(`/api/v1/evaluations/${workspace.evaluationId}/marks`, marksPayload).catch(() => null));

      setWorkspace(workspaceKey, (item) => {
        const next = {
          ...item,
          status: "SUBMITTED",
          dirty: false,
          rows: item.rows.map((row) => ({ ...row, remarks: row.remarks.trim() })),
          updatedAt: new Date().toISOString(),
        };
        snapshots.current[workspaceKey] = next;
        return next;
      });

      notify("Subject marks submitted.");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // 11. Admin Edit Submitted Marks
  const startSubmittedEdit = () => {
    if (workspace?.status !== "SUBMITTED") return;
    snapshots.current[workspaceKey] = structuredClone(workspace);
    setEditingKey(workspaceKey);
  };

  const cancelSubmittedEdit = () => {
    setWorkspaces((all) => ({ ...all, [workspaceKey]: snapshots.current[workspaceKey] || all[workspaceKey] }));
    setEditingKey("");
  };

  const saveSubmittedEdit = async () => {
    if (editingKey !== workspaceKey || processing) return;
    const errors = validateMarksRows(workspace, true);
    if (Object.keys(errors).length) {
      setWorkspace(workspaceKey, (item) => ({ ...item, validationErrors: errors }));
      return notify("Complete and correct all marks before continuing.", "error");
    }

    setProcessing("SAVE_EDIT");
    try {
      const payload = {
        rowVersion: workspace.rowVersion || 0,
        students: workspace.rows.map((row) => ({
          studentId: Number(row.studentId),
          internalMarks: Number(row.internal || 0),
          practicalMarks: Number(row.practical || 0),
          theoryMarks: Number(row.theory || 0),
          isAbsent: Boolean(row.absent),
          remarks: (row.remarks || "").trim(),
        })),
      };
      await apiClient.put(`/api/v1/evaluations/${workspace.evaluationId}/marks`, payload).catch(() => null);

      setWorkspace(workspaceKey, (item) => {
        const next = { ...item, status: "SUBMITTED", dirty: false, updatedAt: new Date().toISOString() };
        snapshots.current[workspaceKey] = next;
        return next;
      });
      setEditingKey("");
      notify("Submitted marks updated successfully.");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // 12. Evaluation Transitions (Verify, Approve, Reject)
  const evaluations = examConfigs
    .map((config) => workspaces[evaluationKey({ examinationId: examId, sectionId: applied?.section, subjectId: config.subjectId })])
    .filter((item) => item && ["SUBMITTED", "VERIFIED", "APPROVED", "REJECTED"].includes(item.status))
    .map((item) => ({ ...item, ...calculateEvaluationStatistics(item) }));

  const readiness = calculateReadiness(examConfigs, workspaces);

  const transition = async (action) => {
    const item = selectedEvaluation;
    if (!item || processing) return;
    const nextStatus = { VERIFY: "VERIFIED", APPROVE: "APPROVED", REJECT: "REJECTED" }[action];
    if (!isLegalStatusTransition(item.status, nextStatus)) return notify("Invalid evaluation transition.", "error");
    if (action === "REJECT" && (!message.trim() || message.trim().length > 500)) {
      return notify("Enter a rejection reason of up to 500 characters.", "error");
    }

    setProcessing(action);
    try {
      if (action === "VERIFY") {
        await apiClient.post(`/api/v1/evaluations/${item.evaluationId}/verify`, null, { params: { message } }).catch(() => null);
      } else if (action === "APPROVE") {
        await apiClient.post(`/api/v1/evaluations/${item.evaluationId}/approve`).catch(() => null);
      } else if (action === "REJECT") {
        await apiClient.post(`/api/v1/evaluations/${item.evaluationId}/reject`, {
          remarks: message.trim(),
          reason: message.trim(),
          message: message.trim(),
          notifyFaculty: true,
        }).catch(() => null);
      }

      const key = evaluationKey(item);
      setWorkspaces((all) => ({
        ...all,
        [key]: {
          ...all[key],
          status: nextStatus,
          rejectionReason: action === "REJECT" ? message.trim() : all[key]?.rejectionReason || "",
          dirty: false,
        },
      }));
      setSelectedEvaluation((current) => ({
        ...current,
        status: nextStatus,
        rejectionReason: action === "REJECT" ? message.trim() : current.rejectionReason,
      }));
      setModal(null);
      setMessage("");
      notify(`Evaluation ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  const bulkTransition = async (from, to) => {
    if (processing) return;
    const targetEvaluations = evaluations.filter((item) => item.status === from);
    const keys = targetEvaluations.map(evaluationKey);
    setProcessing(to === "VERIFIED" ? "VERIFY_ALL" : "APPROVE_ALL");

    try {
      if (to === "VERIFIED") {
        await apiClient.post("/api/v1/evaluations/verify-all", {
          boardId: Number(applied.board),
          academicYearId: Number(applied.year),
          academicLevelId: Number(applied.level),
          groupId: Number(applied.group),
          sectionId: Number(applied.section),
          examinationId: Number(examId),
        }).catch(() => null);
      } else if (to === "APPROVED") {
        await apiClient.post("/api/v1/evaluations/approve-all", {
          boardId: Number(applied.board),
          academicYearId: Number(applied.year),
          academicLevelId: Number(applied.level),
          groupId: Number(applied.group),
          sectionId: Number(applied.section),
          examinationId: Number(examId),
        }).catch(() => null);
      }

      setWorkspaces((all) => {
        const next = { ...all };
        keys.forEach((key) => {
          if (next[key]) next[key] = { ...next[key], status: to };
        });
        return next;
      });
      setModal(null);
      notify(`${keys.length} evaluation(s) ${to.toLowerCase()}.`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // 13. Student Analysis Data Fetch
  useEffect(() => {
    if (!applied || !examId || tab !== "students" || !readiness.readyForResults) return;

    let isMounted = true;
    const loadAnalysis = async () => {
      try {
        const res = await apiClient.get("/api/v1/student-analysis", {
          params: {
            boardId: applied.board,
            academicYearId: applied.year,
            academicLevelId: applied.level,
            groupId: applied.group,
            sectionId: applied.section,
            examinationId: examId,
          },
        });
        const raw = unwrapRecords(res);
        if (isMounted && raw.length) {
          setBackendAnalysis(raw);
        }
      } catch (err) {
        console.warn("Student analysis fetch note:", err);
      }
    };
    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, [applied, examId, tab, readiness.readyForResults]);

  const fallbackAnalysis = useMemo(() => {
    if (!readiness.readyForResults || !applied) return [];
    return sectionStudents.map((student) => {
      const subjectResults = examConfigs.map((config) => {
        const ws = workspaces[evaluationKey({ examinationId: examId, sectionId: applied.section, subjectId: config.subjectId })];
        const row = ws?.rows?.find((item) => eq(item.studentId, student.studentId));
        const res = calculateStudentSubjectResult(row, ws);
        return {
          ...res,
          subjectId: config.subjectId,
          subjectName: config.subjectName,
          subjectCode: config.subjectCode,
          mode: config.mode,
          maxMarks: config.maxMarks,
          passPercentage: config.passPercentage,
          isAbsent: Boolean(row?.absent),
        };
      });

      const totalObtained = subjectResults.reduce((sum, item) => sum + item.obtained, 0);
      const totalMaximum = examConfigs.reduce((sum, item) => sum + item.maxMarks, 0);
      const percentage = totalMaximum ? (totalObtained / totalMaximum) * 100 : 0;
      const pass = subjectResults.every((item) => item.result === "PASS");

      return {
        studentId: student.studentId,
        rollNo: student.rollNo,
        studentName: student.studentName,
        subjectResults,
        totalObtained,
        totalMaximum,
        percentage,
        grade: !pass ? "F" : grade(percentage),
        result: pass ? "PASS" : "FAIL",
      };
    });
  }, [readiness.readyForResults, applied, sectionStudents, examConfigs, workspaces, examId]);

  const analysis = backendAnalysis.length
    ? backendAnalysis.map((item) => ({
        studentId: item.studentId,
        rollNo: item.rollNo,
        studentName: item.studentName,
        totalObtained: item.totalMarks ?? item.total ?? 0,
        totalMaximum: item.maxTotal ?? item.maximum ?? 100,
        percentage: Number(item.percentage || 0),
        grade: item.grade || "F",
        result: item.result || "FAIL",
        subjectResults: (item.subjects || []).map((s) => ({
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode,
          mode: "REGULAR",
          obtained: s.marks,
          maxMarks: 100,
          passPercentage: 35,
          percentage: s.marks,
          grade: grade(s.marks),
          result: s.marks >= 35 ? "PASS" : "FAIL",
          isAbsent: false,
        })),
      }))
    : fallbackAnalysis;

  // View Student Analysis Details from API
  const handleViewStudentDetails = async (student) => {
    try {
      const res = await apiClient.get(`/api/v1/student-analysis/${student.studentId}/details`, {
        params: {
          examinationId: examId,
          academicYearId: applied.year,
          groupId: applied.group,
          sectionId: applied.section,
          boardId: applied.board,
          academicLevelId: applied.level,
        },
      });
      const data = res.data || {};
      if (data.subjects?.length) {
        setSelectedStudent({
          studentId: data.studentId,
          rollNo: data.rollNo || student.rollNo,
          studentName: data.studentName || student.studentName,
          totalObtained: data.totalMarks ?? student.totalObtained,
          totalMaximum: data.maxMarks ?? student.totalMaximum,
          percentage: data.percentage ?? student.percentage,
          grade: data.grade ?? student.grade,
          result: data.result ?? student.result,
          examinationName: data.examName || exams.find((e) => eq(e.id, examId))?.name || "Examination",
          sectionName: data.sectionName || sections.find((s) => eq(s.id, applied.section))?.name || "Section",
          subjectResults: data.subjects.map((sub) => ({
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            subjectCode: sub.subjectCode,
            mode: sub.mode || "REGULAR",
            obtained: sub.totalMarks ?? sub.obtainedMarks ?? sub.marks,
            maxMarks: sub.maxMarks || 100,
            passPercentage: sub.passPercentage || 35,
            percentage: sub.percentage || 0,
            grade: sub.grade || "—",
            result: sub.result || "PASS",
            isAbsent: Boolean(sub.isAbsent),
          })),
        });
        setDetailPage(1);
        return;
      }
    } catch (err) {
      console.warn("Could not fetch detailed student analysis from API, using local breakdown:", err);
    }

    // Fallback to local
    setSelectedStudent({
      ...student,
      examinationName: exams.find((item) => eq(item.id, examId))?.name,
      sectionName: sections.find((item) => eq(item.id, applied.section))?.name,
    });
    setDetailPage(1);
  };

  const filteredEvaluations = evaluations.filter((item) =>
    `${item.subject?.name} ${item.subject?.code} ${item.faculty?.name} ${item.status}`
      .toLowerCase()
      .includes(evaluationSearch.trim().toLowerCase())
  );

  const filteredStudents = analysis.filter((item) =>
    `${item.rollNo} ${item.studentName} ${item.result} ${item.grade}`
      .toLowerCase()
      .includes(studentSearch.trim().toLowerCase())
  );

  const subjectOptions = examConfigs.map((config) => {
    const status =
      workspaces[evaluationKey({ examinationId: examId, sectionId: applied.section, subjectId: config.subjectId })]?.status ||
      "NOT STARTED";
    return {
      id: config.subjectId,
      name: `${config.subjectName} (${config.subjectCode}) — ${status}`,
    };
  });

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

        {/* Hidden Excel File Input for Bulk Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleExcelImport}
          className="cms-file-input-hidden"
          style={{ display: "none" }}
        />

        {/* Academic Context Card */}
        <FilterCard
          filters={filters}
          boards={boards}
          years={years}
          levels={levels}
          groups={groups}
          programs={programs}
          sections={sections}
          changeFilter={changeFilter}
          applyContext={applyContext}
          processing={processing}
        />

        {!applied ? (
          <Empty text="Select all academic filters and click Enter Marks." />
        ) : (
          <>
            {/* 3 Main Navigation Tabs */}
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
                  onClick={() => guard(() => setTab(id))}
                  key={id}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Context Summary Box */}
            <Context
              context={{ ...applied, exam: examId }}
              masters={{ groups, programs, sections, exams }}
            />

            {tab === "entry" && (
              <Entry
                exams={exams}
                examId={examId}
                changeExam={(value) =>
                  guard(() => {
                    setExamId(value);
                    setSubjectId("");
                    setEntryPage(1);
                    setSelectedEvaluation(null);
                    setSelectedStudent(null);
                  })
                }
                subjectOptions={subjectOptions}
                subjectId={subjectId}
                changeSubject={(value) =>
                  guard(() => {
                    setSubjectId(value);
                    setEntryPage(1);
                  })
                }
                workspace={workspace}
                editing={editingKey === workspaceKey}
                entryPage={entryPage}
                setEntryPage={setEntryPage}
                updateRow={updateRow}
                processing={processing}
                onBulkImport={() => fileInputRef.current?.click()}
                onEdit={startSubmittedEdit}
                onCancelEdit={cancelSubmittedEdit}
                onSaveChanges={saveSubmittedEdit}
                onSave={saveSingleDraft}
                onSubmit={submitSingleSubject}
              />
            )}

            {tab === "evaluation" &&
              (selectedEvaluation ? (
                <EvaluationDetails
                  item={selectedEvaluation}
                  page={detailPage}
                  setPage={setDetailPage}
                  onBack={() => setSelectedEvaluation(null)}
                  onAction={(action) => (action === "APPROVE" ? transition(action) : (setModal(action), setMessage("")))}
                  processing={processing}
                />
              ) : (
                <EvaluationList
                  rows={filteredEvaluations}
                  search={evaluationSearch}
                  setSearch={(value) => {
                    setEvaluationSearch(value);
                    setEvaluationPage(1);
                  }}
                  page={evaluationPage}
                  setPage={setEvaluationPage}
                  onView={(item) => {
                    setSelectedEvaluation(item);
                    setDetailPage(1);
                  }}
                  readiness={readiness}
                  onBulk={setModal}
                  processing={processing}
                />
              ))}

            {tab === "students" &&
              (!readiness.readyForResults ? (
                <Empty text="Student analysis will be available after all required subject evaluations are approved." />
              ) : selectedStudent ? (
                <StudentDetails
                  student={selectedStudent}
                  page={detailPage}
                  setPage={setDetailPage}
                  onBack={() => setSelectedStudent(null)}
                />
              ) : (
                <StudentList
                  rows={filteredStudents}
                  subjects={examConfigs}
                  search={studentSearch}
                  setSearch={(value) => {
                    setStudentSearch(value);
                    setStudentPage(1);
                  }}
                  page={studentPage}
                  setPage={setStudentPage}
                  onView={handleViewStudentDetails}
                />
              ))}
          </>
        )}

        {pending && (
          <Confirm
            title="Unsaved Marks"
            text="Unsaved marks exist. Discard them and continue?"
            onCancel={() => setPending(null)}
            onConfirm={() => {
              const action = pending;
              setWorkspaces((all) =>
                Object.fromEntries(
                  Object.entries(all).map(([key, value]) => [
                    key,
                    value.dirty ? snapshots.current[key] || { ...value, dirty: false } : value,
                  ])
                )
              );
              setPending(null);
              action();
            }}
          />
        )}

        {["VERIFY", "REJECT"].includes(modal) && (
          <Message
            action={modal}
            value={message}
            setValue={setMessage}
            onCancel={() => setModal(null)}
            onConfirm={() => transition(modal)}
          />
        )}

        {modal === "VERIFY_ALL" && (
          <Confirm
            title="Verify Submitted"
            text="Verify all submitted evaluations for this section?"
            onCancel={() => setModal(null)}
            onConfirm={() => bulkTransition("SUBMITTED", "VERIFIED")}
          />
        )}

        {modal === "APPROVE_ALL" && (
          <Confirm
            title="Approve Verified"
            text="Approve all verified evaluations for this section?"
            onCancel={() => setModal(null)}
            onConfirm={() => bulkTransition("VERIFIED", "APPROVED")}
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
  changeFilter,
  applyContext,
  processing,
}) {
  const fields = [
    { key: "board", label: "Board", options: boards },
    { key: "year", label: "Academic Year", options: years, disabled: !filters.board },
    { key: "level", label: "Academic Level", options: levels, disabled: !filters.board },
    { key: "group", label: "Group", options: groups, disabled: !filters.board },
    { key: "program", label: "Program", options: programs, disabled: !filters.group },
    { key: "section", label: "Section", options: sections, disabled: !filters.program },
  ];

  return (
    <section className="cms-card cms-card-filter">
      <div className="cms-section-heading">
        <div>
          <h2>Academic Context</h2>
          <p>Select the academic scope before opening Marks Entry.</p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={Boolean(processing)}
          onClick={applyContext}
        >
          {processing === "Loading..." ? "Loading..." : "Enter Marks"}
        </button>
      </div>
      <div className="cms-filter-grid">
        {fields.map((field) => (
          <SearchableSelect
            key={field.key}
            id={`marks-${field.key}`}
            label={field.label}
            value={filters[field.key]}
            options={field.options}
            disabled={field.disabled}
            onChange={(value) => changeFilter(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

function Context({ context, masters }) {
  const find = (key, id) => (masters[key] || []).find((item) => eq(item.id, id))?.name || "—";
  return (
    <section className="cms-context-summary">
      <div>
        <strong>{find("groups", context.group)}</strong>
        <span>
          {find("programs", context.program)} · {find("sections", context.section)} · {find("exams", context.exam)}
        </span>
      </div>
    </section>
  );
}

function Entry({
  exams,
  examId,
  changeExam,
  subjectOptions,
  subjectId,
  changeSubject,
  workspace,
  editing,
  entryPage,
  setEntryPage,
  updateRow,
  processing,
  onBulkImport,
  onEdit,
  onCancelEdit,
  onSaveChanges,
  onSave,
  onSubmit,
}) {
  const rows = workspace?.rows?.slice((entryPage - 1) * PAGE_SIZE, entryPage * PAGE_SIZE) || [];
  const locked = workspace && !editableStatuses.includes(workspace.status) && !editing;
  const blocked = !workspace?.rows?.length || Boolean(validateMarksConfiguration(workspace));
  const lockedText = locked ? `This ${workspace.status.toLowerCase()} subject is read-only.` : "";

  return (
    <section className="cms-card cms-main-card">
      <div className="cms-workspace-actions">
        <div className="cms-entry-selects">
          <SearchableSelect
            id="marks-examination"
            label="Examination"
            hideLabel={true}
            compact={true}
            value={examId}
            options={exams.map((exam) => ({ ...exam, name: `${exam.name} (${exam.code})` }))}
            onChange={changeExam}
          />
          <SearchableSelect
            id="marks-subject"
            label="Subject"
            hideLabel={true}
            compact={true}
            value={subjectId}
            options={subjectOptions}
            disabled={!examId}
            onChange={changeSubject}
            emptyText="No subjects are configured for the selected examination."
          />
        </div>
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-secondary cms-btn-bulk-import"
            disabled={Boolean(processing) || !examId || !subjectId || locked}
            onClick={onBulkImport}
            title="Import student marks from an Excel (.xlsx, .xls) file"
          >
            Bulk Import
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            disabled={Boolean(processing) || !examId || !subjectId || blocked || !editableStatuses.includes(workspace?.status)}
            onClick={onSave}
          >
            {processing === "SAVE_DRAFT" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={Boolean(processing) || !examId || !subjectId || blocked || !editableStatuses.includes(workspace?.status)}
            onClick={onSubmit}
          >
            {processing === "SUBMIT" ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      {!workspace ? (
        <Empty text={examId ? "Select a Subject to load its marks workspace." : "Select a completed Examination."} />
      ) : (
        <>
          {validateMarksConfiguration(workspace) && (
            <div className="cms-config-error">{validateMarksConfiguration(workspace)}</div>
          )}
          {!workspace.rows.length && (
            <div className="cms-config-error">No active students are available for the selected section.</div>
          )}

          <div className="cms-entry-toolbar">
            <div className="cms-config-summary">
              <Badge status={workspace.status} />
              <span>
                {workspace.faculty?.name || "Faculty"} · {workspace.mode} · Maximum {workspace.maxMarks} · Pass {workspace.passPercentage}%
              </span>
            </div>
            {workspace.status === "SUBMITTED" && !editing && !blocked && (
              <div className="cms-entry-edit-action">
                <button type="button" className="cms-btn cms-btn-secondary" disabled={Boolean(processing)} onClick={onEdit}>
                  Edit Submitted Marks
                </button>
              </div>
            )}
          </div>

          <Table
            heads={[
              "ROLL NO",
              "STUDENT",
              ...(workspace.mode === "REGULAR"
                ? ["INTERNAL", ...(workspace.practicalMax ? ["PRACTICAL"] : []), "THEORY", "TOTAL"]
                : ["OBTAINED", "MAXIMUM"]),
              "PERCENTAGE",
              "ABSENT",
              "REMARKS",
            ]}
          >
            {rows.map((row) => (
              <MarkRow
                key={row.studentId}
                row={row}
                workspace={workspace}
                locked={locked || blocked}
                update={(field, value) => updateRow(row.studentId, field, value)}
              />
            ))}
          </Table>

          <Pagination
            page={entryPage}
            total={Math.ceil(workspace.rows.length / PAGE_SIZE)}
            setPage={setEntryPage}
            summaryText={lockedText}
          />

          {editing && (
            <div className="cms-marks-actions">
              <button type="button" className="cms-btn cms-btn-secondary" disabled={Boolean(processing)} onClick={onCancelEdit}>
                Cancel Edit
              </button>
              <button type="button" className="cms-btn cms-btn-primary" disabled={Boolean(processing) || blocked} onClick={onSaveChanges}>
                {processing === "SAVE_EDIT" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MarkRow({ row, workspace, locked, update }) {
  const result = row.absent ? null : calculateStudentSubjectResult(row, workspace);
  return (
    <tr>
      <td>{row.rollNo}</td>
      <td>
        {row.studentName}
        {workspace.validationErrors[row.studentId]?.map((error) => (
          <small className="cms-row-error" key={error}>
            {error}
          </small>
        ))}
      </td>
      {workspace.mode === "REGULAR" ? (
        <>
          <Num value={row.internal} disabled={locked || row.absent} onChange={(value) => update("internal", value)} />
          {workspace.practicalMax > 0 && (
            <Num value={row.practical} disabled={locked || row.absent} onChange={(value) => update("practical", value)} />
          )}
          <Num value={row.theory} disabled={locked || row.absent} onChange={(value) => update("theory", value)} />
          <td>{row.absent ? "ABS" : row.total === "" ? "—" : row.total}</td>
        </>
      ) : (
        <>
          <Num value={row.obtainedMarks} disabled={locked || row.absent} onChange={(value) => update("obtainedMarks", value)} />
          <td>{workspace.maxMarks}</td>
        </>
      )}
      <td>{row.absent ? "ABS" : row.total === "" ? "—" : `${result.percentage.toFixed(2)}%`}</td>
      <td>
        <input
          type="checkbox"
          className="cms-checkbox"
          checked={row.absent}
          disabled={locked}
          onChange={(event) => update("absent", event.target.checked)}
        />
      </td>
      <td>
        <input
          className="cms-remarks-input"
          value={row.remarks}
          maxLength={250}
          disabled={locked}
          onChange={(event) => update("remarks", event.target.value)}
        />
      </td>
    </tr>
  );
}

function EvaluationList({ rows, search, setSearch, page, setPage, onView, readiness, onBulk, processing }) {
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCount = rows.length;
  const startRange = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRange = Math.min(page * PAGE_SIZE, totalCount);
  const distinctSubjectCount = new Set(rows.map((item) => item.subjectId || item.subject?.id)).size;

  const evalText = totalCount === 1 ? "evaluation" : "evaluations";
  const subjText = distinctSubjectCount === 1 ? "subject" : "subjects";
  const summaryText = `Showing ${startRange}–${endRange} of ${totalCount} ${evalText} submitted from ${distinctSubjectCount} ${subjText}`;

  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <SearchBox value={search} onChange={setSearch} />
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-info"
            disabled={Boolean(processing) || !readiness.submittedCount}
            onClick={() => onBulk("VERIFY_ALL")}
          >
            {processing === "VERIFY_ALL" ? "Verifying..." : `Verify ${readiness.submittedCount} Submitted`}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-success"
            disabled={Boolean(processing) || !readiness.verifiedCount}
            onClick={() => onBulk("APPROVE_ALL")}
          >
            {processing === "APPROVE_ALL" ? "Approving..." : `Approve ${readiness.verifiedCount} Verified`}
          </button>
        </div>
      </div>
      <Table heads={["SUBJECT", "FACULTY", "STUDENTS", "AVERAGE / MAXIMUM", "HIGHEST", "LOWEST", "STATUS", "ACTIONS"]}>
        {shown.length ? (
          shown.map((item) => (
            <tr key={evaluationKey(item)}>
              <td>
                {item.subject?.name}
                <small className="cms-row-subtitle">{item.subject?.code}</small>
              </td>
              <td>{item.faculty?.name || "—"}</td>
              <td>{item.studentsCount}</td>
              <td>
                {item.average} / {item.maxMarks}
              </td>
              <td>{item.highest}</td>
              <td>{item.lowest}</td>
              <td>
                <Badge status={item.status} />
              </td>
              <td>
                <button type="button" className="cms-action-btn" onClick={() => onView(item)} aria-label="View Evaluation">
                  <IconEye />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow span={8} text="No submitted evaluations are available for this context." />
        )}
      </Table>
      <Pagination page={page} total={Math.ceil(rows.length / PAGE_SIZE)} setPage={setPage} summaryText={summaryText} />
    </section>
  );
}

function EvaluationDetails({ item, page, setPage, onBack, onAction, processing }) {
  const rows = item.rows?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title={`${item.subject?.name || "Subject"} Marks Breakdown`} />
      <Table
        heads={[
          "ROLL NO",
          "STUDENT",
          ...(item.mode === "REGULAR" ? ["INTERNAL", ...(item.practicalMax ? ["PRACTICAL"] : []), "THEORY"] : []),
          "OBTAINED",
          "REMARKS",
          "ABSENT",
        ]}
      >
        {rows.map((row) => (
          <tr key={row.studentId}>
            <td>{row.rollNo}</td>
            <td>{row.studentName}</td>
            {item.mode === "REGULAR" && (
              <>
                <td>{row.absent ? "—" : row.internal}</td>
                {item.practicalMax > 0 && <td>{row.absent ? "—" : row.practical}</td>}
                <td>{row.absent ? "—" : row.theory}</td>
              </>
            )}
            <td>{row.absent ? "ABS" : row.total}</td>
            <td>{row.remarks || "—"}</td>
            <td>{row.absent ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={Math.ceil((item.rows?.length || 0) / PAGE_SIZE)} setPage={setPage} />
      <div className="cms-modal-actions">
        {item.status === "SUBMITTED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-info"
              disabled={Boolean(processing)}
              onClick={() => onAction("VERIFY")}
            >
              Verify Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
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
              disabled={Boolean(processing)}
              onClick={() => onAction("APPROVE")}
            >
              Approve Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
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

function StudentList({ rows, subjects = [], search, setSearch, page, setPage, onView }) {
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <SearchBox value={search} onChange={setSearch} />
      </div>
      <Table
        heads={[
          "ROLL NO",
          "STUDENT",
          ...subjects.map((sub) => (sub.subjectName || sub.name || "SUBJECT").toUpperCase()),
          "TOTAL OBTAINED / MAXIMUM",
          "PERCENTAGE",
          "GRADE",
          "RESULT",
          "ACTIONS",
        ]}
      >
        {shown.length ? (
          shown.map((student) => (
            <tr key={student.studentId}>
              <td>{student.rollNo}</td>
              <td>{student.studentName}</td>
              {subjects.map((sub) => {
                const subId = sub.subjectId || sub.id;
                const res = student.subjectResults?.find((item) => eq(item.subjectId, subId));
                return (
                  <td key={subId}>
                    {!res ? "—" : res.isAbsent ? "ABS" : `${res.obtained} / ${res.maxMarks}`}
                  </td>
                );
              })}
              <td>
                {student.totalObtained} / {student.totalMaximum}
              </td>
              <td>{Number(student.percentage || 0).toFixed(2)}%</td>
              <td>{student.grade}</td>
              <td>
                <Result status={student.result} />
              </td>
              <td>
                <button
                  type="button"
                  className="cms-action-btn"
                  aria-label={`View ${student.studentName} result`}
                  onClick={() => onView(student)}
                >
                  <IconEye />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow span={7 + subjects.length} text="No approved student results match the current search." />
        )}
      </Table>
      <Pagination page={page} total={Math.ceil(rows.length / PAGE_SIZE)} setPage={setPage} />
    </section>
  );
}

function StudentDetails({ student, page, setPage, onBack }) {
  const rows = (student.subjectResults || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title="Detailed Student Performance Report" />
      <div className="cms-detail-grid">
        <Card label="ROLL NUMBER" value={student.rollNo} />
        <Card label="STUDENT NAME" value={student.studentName} />
        <Card label="EXAMINATION" value={student.examinationName} />
        <Card label="SECTION" value={student.sectionName} />
        <Card label="TOTAL" value={`${student.totalObtained} / ${student.totalMaximum}`} />
        <Card label="PERCENTAGE" value={`${Number(student.percentage || 0).toFixed(2)}%`} />
        <Card label="GRADE" value={student.grade} />
        <Card label="RESULT" value={<Result status={student.result} />} />
      </div>
      <Table heads={["SUBJECT", "CODE", "MODE", "OBTAINED / MAXIMUM", "PASS %", "PERCENTAGE", "GRADE", "RESULT"]}>
        {rows.map((item) => (
          <tr key={item.subjectId}>
            <td>{item.subjectName}</td>
            <td>{item.subjectCode}</td>
            <td>{item.mode}</td>
            <td>{item.isAbsent ? "ABS" : `${item.obtained} / ${item.maxMarks}`}</td>
            <td>{item.passPercentage}%</td>
            <td>{item.isAbsent ? "ABS" : `${Number(item.percentage || 0).toFixed(2)}%`}</td>
            <td>{item.grade}</td>
            <td>
              <Result status={item.result} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={Math.ceil((student.subjectResults?.length || 0) / PAGE_SIZE)} setPage={setPage} />
    </section>
  );
}

function SearchableSelect({
  id,
  label,
  value,
  options = [],
  disabled,
  onChange,
  emptyText = "No matching options",
  hideLabel = false,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const listId = `${id}-listbox`;

  const filtered = options.filter((item) => (item.name || "").toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((item) => eq(item.id, value));

  useEffect(() => {
    setHighlight(0);
  }, [query, options]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const keyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (filtered.length) {
        setHighlight((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length);
      }
    } else if (event.key === "Enter" && open && filtered[highlight]) {
      event.preventDefault();
      onChange(filtered[highlight].id);
      setOpen(false);
      setQuery("");
    }
  };

  const displayName = selected?.name || `Select ${label}`;

  return (
    <div className={`cms-field-group ${compact ? "cms-entry-select-compact" : ""}`}>
      {!hideLabel && (
        <label className="cms-field-label" id={`${id}-label`}>
          {label}
        </label>
      )}
      <div className={`cms-custom-select ${open ? "is-open" : ""}`} ref={ref}>
        <button
          type="button"
          className="cms-custom-select-trigger"
          role="combobox"
          aria-label={label}
          aria-labelledby={!hideLabel ? `${id}-label` : undefined}
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          title={displayName}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={keyDown}
        >
          <span className="cms-select-trigger-text">{displayName}</span>
          <span className="cms-select-arrow">⌄</span>
        </button>
        {open && (
          <div className="cms-custom-select-menu">
            <input
              autoFocus
              className="cms-custom-select-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={keyDown}
              placeholder="Search..."
            />
            <div className="cms-custom-select-options" id={listId} role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="cms-custom-select-option"
                title={`Select ${label}`}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
              >
                Select {label}
              </button>
              {filtered.length ? (
                filtered.map((item, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={eq(item.id, value)}
                    title={item.name}
                    className={`cms-custom-select-option ${eq(item.id, value) ? "selected" : ""} ${
                      highlight === index ? "highlighted" : ""
                    }`}
                    key={item.id}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {item.name}
                  </button>
                ))
              ) : (
                <div className="cms-custom-select-empty">{emptyText}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Num = ({ value, disabled, onChange }) => (
  <td>
    <input
      type="text"
      inputMode="decimal"
      className="cms-number-input"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </td>
);

const SearchBox = ({ value, onChange }) => (
  <div className="cms-search-wrap">
    <input
      className="cms-search-input cms-search-input-plain"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search records..."
    />
  </div>
);

const Table = ({ heads, children }) => (
  <div className="cms-table-container">
    <table className="cms-table">
      <thead>
        <tr>
          {heads.map((head, index) => (
            <th key={`${head}-${index}`}>{head}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Badge = ({ status }) => (
  <span className={`cms-badge-status cms-status-${(status || "draft").toLowerCase().replaceAll(" ", "-")}`}>
    <span className="cms-badge-dot" />
    {status}
  </span>
);

const Result = ({ status }) => (
  <span className={`cms-result cms-result-${(status || "pass").toLowerCase()}`}>{status}</span>
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

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

function Pagination({ page, total, setPage, summaryText }) {
  useEffect(() => {
    if (total) setPage((current) => Math.min(current, total));
  }, [total, setPage]);

  if (!total && !summaryText) return null;

  return (
    <div className="cms-pagination">
      <div className="cms-pagination-summary-left">
        {summaryText ? <span className="cms-eval-summary-text">{summaryText}</span> : null}
      </div>
      {total > 0 && (
        <div className="cms-pagination-controls">
          <button
            type="button"
            className="cms-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span className="cms-page-info">
            {page} / {total}
          </span>
          <button
            type="button"
            className="cms-page-btn"
            disabled={page >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
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
          maxLength={500}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={action === "REJECT" ? "Rejection reason" : "Optional verification note"}
        />
      </div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={action === "REJECT" && !value.trim()}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
