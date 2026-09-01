import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Eye, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./ExaminationPage.css";

const EXAM_API = {
  boards: apiEndpoints.boards.list,
  activeYear: apiEndpoints.academicYears.active,
  academicLevels: apiEndpoints.boards.academicLevels,
  groupsByBoard: apiEndpoints.groups.getByBoard,
  programsByGroup: apiEndpoints.groups.programs,
  patterns: "/api/v1/examinations/patterns",
  types: "/api/v1/examinations/types",
  list: apiEndpoints.examinations.getAll,
  byId: (id) => `/api/v1/examinations/${id}`,
  eligibleSubjects: (id) => `/api/v1/examinations/${id}/eligible-subjects`,
  finalize: (id) => `/api/v1/examinations/${id}/finalize-schedule`,
  cancel: (id) => `/api/v1/examinations/${id}/cancel`,
  reschedule: (id) => `/api/v1/examinations/${id}/reschedule`,
  schedules: "/api/v1/examinations/schedules",
  scheduleById: (id) => `/api/v1/examinations/schedules/${id}`,
  batchSchedules: "/api/v1/examinations/schedules/batch",
  availableHalls: "/api/v1/examinations/available-halls",
  availableInvigilators: "/api/v1/examinations/available-invigilators",
  schedulingContext: (id) => `/api/v1/examinations/${id}/scheduling-context`,
};

const collectionFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};
const masterCollectionFrom = (data) => {
  const items = collectionFrom(data);
  if (items.length) return items;
  const item = data?.data ?? data;
  return item && typeof item === "object" && !Array.isArray(item) ? [item] : [];
};
const objectFrom = (data) => {
  const value = data?.data ?? data?.result ?? data;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
};
const firstNonEmpty = (...values) =>
  values.find((value) => value != null && String(value).trim() !== "") ?? "";
const activeValue = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  return ["true", "1", "active"].includes(String(value).trim().toLowerCase());
};
const normalizeMaster = (item, idKeys, nameKeys) => ({
  ...item,
  id: idKeys.map((key) => item?.[key]).find((value) => value != null) ?? item?.id,
  name:
    nameKeys.map((key) => item?.[key]).find((value) => value != null && value !== "") ??
    item?.name ??
    "",
  code: item?.code ?? item?.boardCode ?? item?.groupCode ?? item?.programCode ?? item?.subjectCode ?? "",
  status: item?.status ?? (item?.isActive === false ? "Inactive" : "Active"),
});
const isActiveMaster = (item) => activeValue(firstNonEmpty(item?.isActive, item?.status));
const isExplicitlyInactive = (item) =>
  [item?.isActive, item?.status].some((value) =>
    [false, 0, "false", "0", "inactive", "disabled"].includes(
      typeof value === "string" ? value.trim().toLowerCase() : value,
    ),
  );
const isExplicitlyNonTeaching = (item) =>
  [item?.staffType, item?.facultyType].some((value) =>
    ["non-teaching", "non teaching", "nonteaching", "administrative", "admin", "support staff"].includes(
      String(value ?? "").trim().toLowerCase(),
    ),
  );
const normalizeDateInput = (value) => (value ? String(value).slice(0, 10) : "");
const normalizeTimeInput = (value) => (value ? String(value).slice(0, 5) : "");
const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
const hasUnsupportedControlCharacters = (value) =>
  Array.from(String(value ?? "")).some((character) => {
    const code = character.charCodeAt(0);
    return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
  });
const toApiTime = (value) => (value && /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value);
const normalizeScheduleMode = (value) => {
  const mode = String(value ?? "")
    .trim()
    .toUpperCase();
  return [
    "COMBINED",
    "COMBINED_OBJECTIVE",
    "OBJECTIVE_COMBINED",
    "OBJECTIVE",
    "JEE_MAIN",
    "JEE_ADVANCED",
    "NEET",
  ].includes(mode) || mode.includes("OBJECTIVE") || mode.includes("COMBINED")
    ? "COMBINED_OBJECTIVE"
    : "SUBJECT_WISE";
};
const findPattern = (patterns, value) => {
  const target = String(value ?? "")
    .trim()
    .toLowerCase();
  return patterns.find((pattern) =>
    [pattern.id, pattern.code, pattern.name].some(
      (candidate) =>
        String(candidate ?? "")
          .trim()
          .toLowerCase() === target,
    ),
  );
};
const findExamType = (types, value) => {
  const target = String(value ?? "")
    .trim()
    .toLowerCase();
  return types.find((type) =>
    [type.id, type.name, type.examType].some(
      (candidate) =>
        String(candidate ?? "")
          .trim()
          .toLowerCase() === target,
    ),
  );
};
const apiError = (error) => {
  const data = error?.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const validationMessages = Object.entries(data.errors)
      .flatMap(([field, messages]) => {
        const items = Array.isArray(messages) ? messages : [messages];
        return items.filter(Boolean).map((message) => `${field}: ${message}`);
      })
      .join(" ");
    if (validationMessages) return validationMessages;
  }
  return data?.detail || data?.message || data?.title || getApiErrorMessage(error);
};
const normalizeSchedule = (item) => ({
  ...item,
  id: item.examScheduleId ?? item.id,
  examId: item.examinationId ?? item.examId,
  subjectId: item.subjectId,
  subjectName: item.subjectName ?? "",
  subjectCode: item.subjectCode ?? "",
  date: normalizeDateInput(item.examDate ?? item.date),
  startTime: normalizeTimeInput(item.startTime),
  endTime: normalizeTimeInput(item.endTime),
  sessionId: item.sessionId ?? "",
  scheduleMode: normalizeScheduleMode(item.scheduleMode),
  roomId: item.roomId ?? "",
  roomName: firstNonEmpty(item.roomName, item.hall, item.roomNumber),
  invigilatorId: item.invigilatorId ?? "",
  hall: item.hall ?? item.roomNumber ?? "",
  roomNumber: item.roomNumber ?? item.hall ?? "",
  invigilatorName: item.invigilatorName ?? item.invigilator ?? "",
  mode: item.examMode ?? item.mode ?? "",
  maxMarks: item.maxMarks ?? 0,
  passingMarks: item.passingMarks ?? 0,
  status: item.status ?? "",
  roomCapacity: item.roomCapacity ?? item.capacity ?? "",
  rowVersion: item.rowVersion,
});
const normalizeExamination = (item, patterns = [], types = []) => ({
  ...item,
  id: item.examinationId ?? item.id,
  code: item.examCode ?? item.code ?? "",
  name: item.examName ?? item.name ?? "",
  boardId: item.boardId,
  boardCode: item.boardCode ?? item.code ?? "",
  boardName: item.boardName ?? item.board ?? "",
  yearId: item.academicYearId ?? item.yearId,
  levelId: item.academicLevelId ?? item.levelId,
  academicYearName: item.academicYearName ?? item.academicYear ?? item.yearName ?? "",
  academicLevelName: item.academicLevelName ?? item.academicLevel ?? item.levelName ?? "",
  groupId: item.groupId,
  groupProgramId: item.groupProgramId ?? item.groupProgrammeId ?? "",
  groupName: item.groupName ?? item.group ?? "",
  programId: item.programId,
  programName: item.programName ?? item.programme ?? item.program ?? "",
  assessmentTypeId:
    item.assessmentTypeId ??
    item.examTypeId ??
    findExamType(
      types,
      item.examType ?? item.assessmentTypeName ?? item.assessmentType ?? item.type,
    )?.id ??
    null,
  examPatternId:
    item.examPatternId ??
    findPattern(patterns, item.examPattern ?? item.pattern ?? item.patternName)?.id ??
    "",
  examPattern: item.examPattern ?? item.pattern ?? item.patternName ?? "",
  allowedExamTypes: item.allowedExamTypes ?? item.examTypes ?? [],
  examType: item.examType ?? item.assessmentTypeName ?? item.assessmentType ?? item.type ?? "",
  type: item.examType ?? item.assessmentTypeName ?? item.assessmentType ?? item.type ?? "",
  startDate: normalizeDateInput(item.startDate),
  endDate: normalizeDateInput(item.endDate),
  totalMarks: item.totalMarks ?? "",
  passPercentage: item.passPercentage ?? "",
  description: item.description ?? "",
  status: String(item.status ?? "DRAFT").toUpperCase(),
  scheduleMode: normalizeScheduleMode(
    item.scheduleMode ?? item.examPattern ?? item.examType ?? item.type,
  ),
  completedAt: item.completedAt ?? "",
  completionMode: item.completionMode ?? "",
  rowVersion: item.rowVersion,
  schedules: collectionFrom(item.schedules).map(normalizeSchedule),
});

const EMPTY_MASTERS = {
  boards: [],
  years: [],
  levels: [],
  groups: [],
  programs: [],
  patterns: [],
  types: [],
  subjects: [],
  faculty: [],
  rooms: [],
};
const emptyExam = () => ({
  code: "",
  name: "",
  boardId: "",
  yearId: "",
  levelId: "",
  groupId: "",
  groupProgramId: "",
  programId: "",
  examPatternId: "",
  assessmentTypeId: "",
  examType: "",
  type: "",
  startDate: "",
  endDate: "",
  totalMarks: "",
  passPercentage: "",
  description: "",
  status: "DRAFT",
});
const EXAM_PAGE_SIZE = 5;
const emptySchedule = () => ({
  subjectId: "",
  date: "",
  startTime: "",
  endTime: "",
  roomId: "",
  invigilatorId: "",
  mode: "Written",
});
const nextScheduleFromPrevious = (savedSchedule) => ({
  subjectId: "",
  date: "",
  startTime: savedSchedule.startTime,
  endTime: savedSchedule.endTime,
  roomId: String(savedSchedule.roomId),
  invigilatorId: "",
  mode: savedSchedule.mode,
});
const overlaps = (a, b, c, d) => a < d && b > c;
const nameOf = (items, id, fallback = "All Programs") =>
  items.find((x) => String(x.id) === String(id))?.name || fallback;
const codeOf = (items, id, fallback = "—") =>
  items.find((x) => String(x.id) === String(id))?.code || fallback;
const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(value + "T00:00:00"),
    )
    : "—";
const subjectsFor = (masters) => masters.subjects;
const patternsForProgram = (patterns, programId, groupProgramId) =>
  patterns.filter(
    (pattern) =>
      !programId ||
      pattern.programId == null ||
      String(pattern.programId) === String(programId) ||
      (groupProgramId && String(pattern.groupProgramId) === String(groupProgramId)),
  );
const validateExamConfiguration = (exam) => {
  if (
    !Number.isInteger(Number(exam.groupId)) ||
    Number(exam.groupId) <= 0 ||
    !Number.isInteger(Number(exam.programId)) ||
    Number(exam.programId) <= 0 ||
    !Number.isInteger(Number(exam.assessmentTypeId)) ||
    Number(exam.assessmentTypeId) <= 0 ||
    !Number.isInteger(Number(exam.examPatternId)) ||
    Number(exam.examPatternId) <= 0
  ) {
    return "Select a valid Program, Exam Type and Exam Pattern.";
  }
  return "";
};
const getScheduleMode = (exam, patterns = []) => {
  const candidate =
    exam?.scheduleMode ||
    patterns.find((item) => String(item.id) === String(exam?.examPatternId))?.scheduleMode ||
    exam?.examPattern ||
    exam?.examType ||
    exam?.type;
  return normalizeScheduleMode(candidate);
};
const createCombinedSessionId = (examId) => `COMBINED-${examId}-${Date.now()}`;
const getExamPassingMarks = (exam) => {
  const total = Number(exam?.totalMarks);
  const percentage = Number(exam?.passPercentage);
  if (
    !Number.isFinite(total) ||
    !Number.isFinite(percentage) ||
    total <= 0 ||
    percentage <= 0 ||
    percentage > 100
  )
    return null;
  return Math.ceil((total * percentage) / 100);
};
const hasValidExamMarks = (exam) =>
  Number.isInteger(Number(exam?.totalMarks)) &&
  Number(exam?.totalMarks) > 0 &&
  Number.isFinite(Number(exam?.passPercentage)) &&
  Number(exam?.passPercentage) > 0 &&
  Number(exam?.passPercentage) <= 100;
const isSameCombinedSession = (existing, candidate) =>
  normalizeScheduleMode(existing?.scheduleMode) === "COMBINED_OBJECTIVE" &&
  normalizeScheduleMode(candidate?.scheduleMode) === "COMBINED_OBJECTIVE" &&
  String(existing.examId) === String(candidate.examId) &&
  Boolean(existing.sessionId) &&
  existing.sessionId === candidate.sessionId;
const getMarksConfig = (exam, subject, subjects = []) => {
  if (!subjects.some((item) => String(item.id) === String(subject?.id))) return null;
  const subjectTotal = Number(subject?.totalMarks),
    subjectPassing = Number(subject?.passingMarks);
  if (
    Number.isFinite(subjectTotal) &&
    subjectTotal > 0 &&
    Number.isFinite(subjectPassing) &&
    subjectPassing >= 0
  )
    return { maxMarks: subjectTotal, passingMarks: subjectPassing };
  const passingMarks = getExamPassingMarks(exam);
  return passingMarks == null ? null : { maxMarks: Number(exam.totalMarks), passingMarks };
};
const getCandidateSchedule = (schedule, exam, editingId, sessionId, patterns = []) => ({
  ...schedule,
  examId: exam?.id,
  scheduleMode: getScheduleMode(exam, patterns),
  sessionId: getScheduleMode(exam, patterns) === "COMBINED_OBJECTIVE" ? sessionId || "" : "",
  editingId,
});
const hasHallConflict = (candidate, schedules) =>
  Boolean(
    candidate.roomId &&
    candidate.date &&
    candidate.startTime &&
    candidate.endTime &&
    schedules.some(
      (entry) =>
        String(entry.id) !== String(candidate.editingId) &&
        String(entry.roomId) === String(candidate.roomId) &&
        entry.date === candidate.date &&
        overlaps(candidate.startTime, candidate.endTime, entry.startTime, entry.endTime) &&
        !isSameCombinedSession(entry, candidate),
    ),
  );
const hasInvigilatorConflict = (candidate, schedules) =>
  Boolean(
    candidate.invigilatorId &&
    candidate.date &&
    candidate.startTime &&
    candidate.endTime &&
    schedules.some(
      (entry) =>
        String(entry.id) !== String(candidate.editingId) &&
        String(entry.invigilatorId) === String(candidate.invigilatorId) &&
        entry.date === candidate.date &&
        overlaps(candidate.startTime, candidate.endTime, entry.startTime, entry.endTime) &&
        !isSameCombinedSession(entry, candidate),
    ),
  );
const getAvailableRooms = (rooms, candidate, schedules, requiredCapacity) =>
  rooms.filter(
    (room) =>
      room.status === "Active" &&
      (!requiredCapacity || Number(room.capacity) >= Number(requiredCapacity)) &&
      !hasHallConflict({ ...candidate, roomId: room.id }, schedules),
  );
const getEligibleInvigilators = (facultyItems, candidate, schedules) =>
  facultyItems.filter(
    (faculty) =>
      faculty.status === "Active" &&
      !hasInvigilatorConflict({ ...candidate, invigilatorId: faculty.id }, schedules),
  );
const buildExportRows = (targetExams, schedules, masters) =>
  targetExams
    .flatMap((exam) => {
      const records = schedules.filter((schedule) => String(schedule.examId) === String(exam.id)),
        groups = new Map();
      records.forEach((schedule) => {
        const key =
          normalizeScheduleMode(schedule.scheduleMode) === "COMBINED_OBJECTIVE" &&
            schedule.sessionId
            ? `combined-${exam.id}-${schedule.sessionId}`
            : `subject-${schedule.id}`;
        const group = groups.get(key) || [];
        group.push(schedule);
        groups.set(key, group);
      });
      return [...groups.values()].map((group) => {
        const first = group[0];
        return {
          examId: exam.id,
          sessionId: first.sessionId || "",
          examCode: exam.code || "—",
          examName: exam.name,
          boardName: nameOf(masters.boards, exam.boardId),
          boardCode: codeOf(masters.boards, exam.boardId),
          academicYear: nameOf(masters.years, exam.yearId),
          academicLevel: nameOf(masters.levels, exam.levelId),
          programName: nameOf(masters.programs, exam.programId),
          patternName: nameOf(masters.patterns, exam.examPatternId),
          examType: exam.examType || exam.type,
          groupName: nameOf(masters.groups, exam.groupId, "—"),
          totalMarks: hasValidExamMarks(exam) ? exam.totalMarks : exam.totalMarks || "—",
          passPercentage: hasValidExamMarks(exam) ? `${exam.passPercentage}%` : "—",
          passingScore: getExamPassingMarks(exam) ?? "—",
          subjectName: group.map((item) => item.subjectName).join(", "),
          examDate: first.date,
          startTime: first.startTime,
          endTime: first.endTime,
          examTime:
            first.startTime && first.endTime
              ? `${first.startTime} - ${first.endTime}`
              : first.startTime || first.endTime || "—",
          hallName: first.roomName || nameOf(masters.rooms, first.roomId, "—"),
          invigilatorName:
            first.invigilatorName || nameOf(masters.faculty, first.invigilatorId, "—"),
          examMode: first.mode || "—",
          status: exam.status,
          description: exam.description || "—",
        };
      });
    })
    .sort((a, b) => {
      const aDate = Date.parse(a.examDate),
        bDate = Date.parse(b.examDate),
        aDateValid = Number.isFinite(aDate),
        bDateValid = Number.isFinite(bDate);
      if (aDateValid !== bDateValid) return aDateValid ? -1 : 1;
      return (
        (aDateValid ? aDate - bDate : 0) ||
        String(a.startTime || "").localeCompare(String(b.startTime || "")) ||
        String(a.endTime || "").localeCompare(String(b.endTime || "")) ||
        String(a.examName || "").localeCompare(String(b.examName || "")) ||
        String(a.examCode || "").localeCompare(String(b.examCode || "")) ||
        String(a.hallName || "").localeCompare(String(b.hallName || ""))
      );
    })
    .map((row, index) => ({ ...row, serialNo: index + 1 }));

export const pageConfig = {
  title: "Examination Management",
  subtitle: "Configure examinations and build conflict-free subject schedules.",
  breadcrumb: ["Examinations"],
};

export default function ExaminationPage() {
  const nav = useNavigate(),
    loc = useLocation(),
    { id } = useParams(),
    isForm = Boolean(id) || loc.pathname.endsWith("/add");
  const initialFilters = { boardId: "", yearId: "", levelId: "" };
  const [exams, setExams] = useState([]),
    [schedules, setSchedules] = useState([]),
    [tab, setTab] = useState("exams"),
    [examId, setExamId] = useState(""),
    [detail, setDetail] = useState(null),
    [editingExam, setEditingExam] = useState(null),
    [exportPreview, setExportPreview] = useState(null),
    [toast, setToast] = useState(""),
    [remove, setRemove] = useState(null),
    [removeSchedule, setRemoveSchedule] = useState(null),
    [editing, setEditing] = useState(null),
    [sch, setSch] = useState(emptySchedule),
    [errors, setErrors] = useState({}),
    [filters, setFilters] = useState(initialFilters),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [finalizing, setFinalizing] = useState(false),
    [loading, setLoading] = useState(true),
    [eligibleSubjectsLoaded, setEligibleSubjectsLoaded] = useState(false),
    [eligibleSubjectsError, setEligibleSubjectsError] = useState(""),
    [schedulingContext, setSchedulingContext] = useState(null),
    [schedulingContextError, setSchedulingContextError] = useState(""),
    [masters, setMasters] = useState(EMPTY_MASTERS),
    [busyAction, setBusyAction] = useState("");
  const groupRequestRef = useRef(0),
    programRequestRef = useRef(0),
    eligibleRequestRef = useRef(0),
    availabilityRequestRef = useRef(0),
    detailRequestRef = useRef(0),
    scheduleRequestRef = useRef(new Map()),
    mastersRef = useRef(EMPTY_MASTERS);
  const isDeletingExam = Boolean(remove) && busyAction === `delete-exam-${remove.id}`;
  const isDeletingSchedule =
    Boolean(removeSchedule) && busyAction === `delete-schedule-${removeSchedule.id}`;
  const {
    boards: BOARDS,
    years: YEARS,
    levels: LEVELS,
    groups: GROUPS,
    programs: PROGRAMS,
    patterns: EXAM_PATTERNS,
    types: EXAM_TYPES,
    subjects: SUBJECTS,
    faculty: FACULTY,
    rooms: ROOMS,
  } = masters;
  const replaceMaster = (key, items) => {
    setMasters((current) => {
      const next = { ...current, [key]: items };
      mastersRef.current = next;
      return next;
    });
  };
  const loadMasterData = async () => {
    const requests = [
      ["boards", EXAM_API.boards, ["boardId", "id"], ["boardName", "name"]],
      [
        "years",
        EXAM_API.activeYear,
        ["academicYearId", "id"],
        ["academicYearName", "yearName", "name"],
      ],
      [
        "levels",
        EXAM_API.academicLevels,
        ["academicLevelId", "id"],
        ["levelName", "academicLevelName", "name"],
      ],
      ["patterns", EXAM_API.patterns, ["patternId", "id"], ["patternName", "name"]],
      [
        "types",
        EXAM_API.types,
        ["assessmentTypeId", "examTypeId", "id"],
        ["assessmentTypeName", "examType", "name"],
      ],
    ];
    const results = await Promise.allSettled(requests.map(([, url]) => apiClient.get(url)));
    const errors = [];
    const loaded = { ...EMPTY_MASTERS };
    results.forEach((result, index) => {
      const [key, , idKeys, nameKeys] = requests[index];
      if (result.status === "fulfilled") {
        const source = masterCollectionFrom(result.value.data);
        const normalized = source
          .map((item) => {
            const master = normalizeMaster(item, idKeys, nameKeys);
            if (key === "patterns")
              return {
                ...item,
                id: Number(item.patternId ?? item.id),
                code: item.patternCode ?? item.code ?? "",
                name: item.patternName ?? item.name ?? "",
                programId: item.programId ?? item.programmeId ?? null,
                groupProgramId: item.groupProgramId ?? item.groupProgrammeId ?? "",
                scheduleMode: normalizeScheduleMode(
                  item.scheduleMode ?? item.patternCode ?? item.code,
                ),
                description: item.description ?? "",
                allowedExamTypes: Array.isArray(item.allowedExamTypes) ? item.allowedExamTypes : [],
              };
            if (key === "types") {
              const id = Number(item.assessmentTypeId ?? item.examTypeId ?? item.id);
              const name = item.assessmentTypeName ?? item.examType ?? item.name ?? "";
              return { ...item, id, assessmentTypeId: id, name, examType: name };
            }
            return key === "years"
              ? {
                ...master,
                id: Number(master.id),
                boardId: item.boardId == null ? null : Number(item.boardId),
                startDate: item.startDate ?? "",
                endDate: item.endDate ?? "",
                isActive: isActiveMaster(item),
              }
              : key === "boards"
                ? {
                  ...master,
                  id: Number(master.id),
                  code: item.boardCode ?? item.code ?? item.boardName ?? item.name ?? "",
                  isActive: isActiveMaster(item),
                }
                : { ...master, id: Number(master.id) };
          })
          .filter(
            (item) =>
              Number.isInteger(item.id) &&
              item.id > 0 &&
              (["levels", "patterns", "types"].includes(key) || item.isActive),
          );
        loaded[key] = normalized;
      } else {
        loaded[key] = [];
        errors.push(apiError(result.reason));
      }
    });
    setMasters((current) => {
      const next = { ...current, ...loaded };
      mastersRef.current = next;
      return next;
    });
    if (errors.length) setToast(errors[0]);
    return loaded;
  };
  const loadGroups = async ({ boardId }) => {
    const requestId = ++groupRequestRef.current;
    programRequestRef.current += 1;
    replaceMaster("groups", []);
    replaceMaster("programs", []);
    if (!Number.isInteger(Number(boardId)) || Number(boardId) <= 0) return;
    try {
      const response = await apiClient.get(EXAM_API.groupsByBoard(Number(boardId)));
      if (requestId !== groupRequestRef.current) return;
      replaceMaster(
        "groups",
        collectionFrom(response.data)
          .map((item) => ({
            ...normalizeMaster(item, ["groupId", "id"], ["groupName", "name"]),
            id: Number(item.groupId ?? item.id),
            boardId: item.boardId == null ? null : Number(item.boardId),
            academicYearId: item.academicYearId == null ? null : Number(item.academicYearId),
            academicLevelId: item.academicLevelId == null ? null : Number(item.academicLevelId),
            isActive: isActiveMaster(item),
          }))
          .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.isActive),
      );
    } catch (error) {
      if (requestId === groupRequestRef.current) {
        replaceMaster("groups", []);
        setToast(apiError(error));
      }
    }
  };
  const loadPrograms = async (groupId) => {
    const requestId = ++programRequestRef.current;
    replaceMaster("programs", []);
    const numericGroupId = Number(groupId);
    if (!Number.isInteger(numericGroupId) || numericGroupId <= 0) return;
    try {
      const response = await apiClient.get(EXAM_API.programsByGroup(numericGroupId));
      if (requestId !== programRequestRef.current) return;
      replaceMaster(
        "programs",
        collectionFrom(response.data)
          .map((item) => ({
            ...normalizeMaster(item, ["programId", "id"], ["programName", "name"]),
            id: Number(item.programId ?? item.id),
            programId: Number(item.programId ?? item.programmeId ?? item.id),
            groupProgramId: item.groupProgramId ?? item.groupProgrammeId ?? "",
            groupId: Number(item.groupId ?? numericGroupId),
            category: item.category ?? item.programCategory ?? item.programType ?? "",
            isActive: isActiveMaster(item),
          }))
          .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.isActive !== false),
      );
    } catch {
      if (requestId === programRequestRef.current) {
        replaceMaster("programs", []);
        setToast("Unable to load programs for the selected group.");
      }
    }
  };
  const loadExaminations = async (catalogs = mastersRef.current) => {
    try {
      const response = await apiClient.get(EXAM_API.list);
      const normalized = collectionFrom(response.data)
        .map((item) => normalizeExamination(item, catalogs.patterns, catalogs.types))
        .filter((item) => Number(item.id) > 0);
      setExams((current) =>
        normalized.map((item) =>
          String(item.code || "").trim()
            ? item
            : { ...item, code: current.find((exam) => String(exam.id) === String(item.id))?.code ?? "" },
        ),
      );
      return normalized;
    } catch (error) {
      setToast(apiError(error));
      return [];
    }
  };
  const loadSchedules = async (selectedExamId) => {
    if (!selectedExamId) return [];
    const requestId = Symbol(String(selectedExamId));
    scheduleRequestRef.current.set(String(selectedExamId), requestId);
    try {
      const response = await apiClient.get(EXAM_API.schedules, {
        params: { examinationId: Number(selectedExamId) },
      });
      const next = collectionFrom(response.data)
        .map(normalizeSchedule)
        .filter((item) => item.id);
      if (scheduleRequestRef.current.get(String(selectedExamId)) !== requestId) return [];
      setSchedules((current) => [
        ...current.filter((item) => String(item.examId) !== String(selectedExamId)),
        ...next,
      ]);
      return next;
    } catch (error) {
      setToast(apiError(error));
      return [];
    }
  };
  useEffect(() => {
    let active = true;
    loadMasterData()
      .then((loaded) => loadExaminations(loaded))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const refresh = () => loadExaminations();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    if (!isForm || !id) return;
    const existing = exams.find((item) => String(item.id) === String(id));
    if (!existing) return;
    loadGroups({
      boardId: existing.boardId,
      yearId: existing.yearId,
      levelId: existing.levelId,
    });
    loadPrograms(existing.groupId);
  }, [isForm, id, exams]);
  useEffect(() => {
    const requestId = ++eligibleRequestRef.current;
    if (!examId) {
      replaceMaster("subjects", []);
      setEligibleSubjectsLoaded(false);
      setEligibleSubjectsError("");
      setSchedulingContext(null);
      setSchedulingContextError("");
      return;
    }
    setEligibleSubjectsLoaded(false);
    setEligibleSubjectsError("");
    setSchedulingContext(null);
    setSchedulingContextError("");
    let active = true;
    Promise.allSettled([
      apiClient.get(EXAM_API.eligibleSubjects(examId)),
      apiClient.get(EXAM_API.schedulingContext(examId)),
    ]).then(([subjectsResult, contextResult]) => {
      if (!active || requestId !== eligibleRequestRef.current) return;
      if (subjectsResult.status === "fulfilled") {
        replaceMaster(
          "subjects",
          collectionFrom(subjectsResult.value.data)
            .map((item) => ({
              ...normalizeMaster(item, ["subjectId", "id"], ["subjectName", "name"]),
              id: Number(item.subjectId ?? item.id),
              totalMarks: item.maxMarks ?? item.totalMarks ?? "",
              passingMarks: item.passingMarks ?? item.passMarks ?? "",
              facultyIds: collectionFrom(item.facultyIds ?? item.faculties).map((faculty) =>
                Number(faculty.facultyId ?? faculty.id ?? faculty),
              ),
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0),
        );
        setEligibleSubjectsLoaded(true);
      } else {
        const message = apiError(subjectsResult.reason);
        replaceMaster("subjects", []);
        setEligibleSubjectsError(message);
        setToast(message);
      }
      if (contextResult.status === "fulfilled") {
        const context = objectFrom(contextResult.value.data);
        const requiredCapacity = Number(
          context?.requiredHallCapacity ??
          context?.requiredRoomCapacity ??
          context?.requiredCapacity ??
          context?.totalEligibleStudents,
        );
        if (context && Number.isFinite(requiredCapacity) && requiredCapacity >= 0) {
          setSchedulingContext({
            examinationId: context.examinationId ?? Number(examId),
            sectionIds: collectionFrom(context.sectionIds)
              .map(Number)
              .filter((value) => value > 0),
            sections: collectionFrom(context.sections),
            totalEligibleStudents: Number(context.totalEligibleStudents ?? requiredCapacity),
            requiredCapacity,
          });
        } else {
          setSchedulingContextError("Scheduling Context did not return a valid required capacity.");
        }
      } else {
        const message = apiError(contextResult.reason);
        setSchedulingContextError(message);
        setToast(message);
      }
    });
    return () => {
      active = false;
    };
  }, [examId]);
  useEffect(() => {
    const requestId = ++availabilityRequestRef.current;
    if (!sch.date || !sch.startTime || !sch.endTime) {
      replaceMaster("rooms", []);
      replaceMaster("faculty", []);
      return;
    }
    let active = true;
    const params = {
      examinationId: Number(examId),
      date: sch.date,
      startTime: toApiTime(sch.startTime),
      endTime: toApiTime(sch.endTime),
      ...(editing ? { excludeScheduleId: Number(editing) } : {}),
    };
    const selectedSubjectIds =
      getScheduleMode(
        exams.find((item) => String(item.id) === String(examId)),
        EXAM_PATTERNS,
      ) === "COMBINED_OBJECTIVE"
        ? SUBJECTS.map((subject) => Number(subject.id))
        : sch.subjectId
          ? [Number(sch.subjectId)]
          : [];
    const subjectParams = selectedSubjectIds.length === 1
      ? { subjectId: selectedSubjectIds[0] }
      : selectedSubjectIds.length > 1
        ? { subjectIds: selectedSubjectIds }
        : {};
    const contextParams = {
      ...(schedulingContext?.sectionIds?.length
        ? { sectionIds: schedulingContext.sectionIds }
        : {}),
      ...(Number.isFinite(schedulingContext?.requiredCapacity)
        ? { requiredCapacity: schedulingContext.requiredCapacity }
        : {}),
    };
    const hallParams = { ...params, ...subjectParams, ...contextParams };
    const facultyParams = { ...params, ...subjectParams };
    Promise.allSettled([
      apiClient.get(EXAM_API.availableHalls, { params: hallParams }),
      apiClient.get(EXAM_API.availableInvigilators, { params: facultyParams }),
    ]).then(([hallResult, facultyResult]) => {
      if (!active || requestId !== availabilityRequestRef.current) return;
      if (hallResult.status === "fulfilled") {
        replaceMaster(
          "rooms",
          collectionFrom(hallResult.value.data)
            .map((item) => ({
              ...normalizeMaster(item, ["roomId", "id"], ["roomName", "roomNumber", "name"]),
              id: item.roomId ?? item.id,
              roomNumber: item.roomNumber ?? "",
              blockName: item.blockName ?? "",
              floor: item.floor,
              capacity: item.capacity,
              roomType: item.roomType ?? "",
              isAvailable: item.isAvailable,
            }))
            .filter(
              (item) =>
                Number(item.id) > 0 &&
                item.isAvailable !== false &&
                Number(item.capacity) >= Number(schedulingContext?.requiredCapacity ?? 0),
            ),
        );
      } else {
        replaceMaster("rooms", []);
        setToast(apiError(hallResult.reason));
      }
      if (facultyResult.status === "fulfilled") {
        replaceMaster(
          "faculty",
          collectionFrom(facultyResult.value.data)
            .map((item) => ({
              ...normalizeMaster(item, ["facultyId", "id"], ["fullName", "facultyName", "name"]),
              id: item.facultyId ?? item.id,
              employeeId: item.employeeId ?? "",
              designation: item.designation ?? "",
              facultyType: item.facultyType ?? "",
              staffType: item.staffType ?? item.facultyType ?? "",
              isActive: !isExplicitlyInactive(item),
              isTeaching: !isExplicitlyNonTeaching(item),
              isAvailable: item.isAvailable,
            }))
            .filter(
              (item, index, all) =>
                Number(item.id) > 0 &&
                item.isAvailable !== false &&
                item.isActive &&
                item.isTeaching &&
                all.findIndex(
                  (candidate) =>
                    String(candidate.employeeId || candidate.id) ===
                    String(item.employeeId || item.id),
                ) === index &&
                !selectedSubjectIds.some((subjectId) =>
                  SUBJECTS.find(
                    (subject) => String(subject.id) === String(subjectId),
                  )?.facultyIds?.includes(Number(item.id)),
                ),
            ),
        );
      } else {
        replaceMaster("faculty", []);
        setToast(apiError(facultyResult.reason));
      }
    });
    return () => {
      active = false;
    };
  }, [
    sch.date,
    sch.startTime,
    sch.endTime,
    sch.subjectId,
    editing,
    examId,
    schedulingContext,
    exams,
    EXAM_PATTERNS,
    SUBJECTS,
  ]);
  useEffect(() => {
    const next = loc.state?.scheduleExamId;
    if (!isForm && next) {
      setExamId(String(next));
      setTab("schedule");
      loadSchedules(next);
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [isForm, loc, nav]);
  const query = search.trim().toLowerCase();
  const list = exams.filter(
    (exam) =>
      (!filters.boardId || String(exam.boardId) === filters.boardId) &&
      (!filters.yearId || String(exam.yearId) === filters.yearId) &&
      (!filters.levelId || String(exam.levelId) === filters.levelId) &&
      (!query ||
        [
          exam.code,
          exam.name,
          exam.boardCode,
          exam.boardName,
          exam.groupName,
          exam.groupName || nameOf(GROUPS, exam.groupId, ""),
          exam.programName,
          exam.programName || nameOf(PROGRAMS, exam.programId, ""),
          exam.examType,
          exam.type,
          exam.status,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        )),
  );
  const pages = Math.max(1, Math.ceil(list.length / EXAM_PAGE_SIZE));
  const shownExams = list.slice((page - 1) * EXAM_PAGE_SIZE, page * EXAM_PAGE_SIZE);
  const rangeStart = list.length ? (page - 1) * EXAM_PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(page * EXAM_PAGE_SIZE, list.length);
  useEffect(() => setPage(1), [filters, search]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const getBoardCode = (e) => {
    const found = BOARDS.find((b) => String(b.id) === String(e.boardId));
    return e.boardCode || found?.code || found?.name || e.boardName || "—";
  };
  const getBoardName = (e) => {
    const found = BOARDS.find((b) => String(b.id) === String(e.boardId));
    return e.boardName || found?.name || "—";
  };

  if (loading && isForm && id)
    return (
      <DashboardLayout {...pageConfig}>
        <Loader label="Loading examination data..." />
      </DashboardLayout>
    );
  if (isForm && id && !exams.some((e) => String(e.id) === String(id)))
    return (
      <DashboardLayout
        title="Examination not found"
        subtitle="The requested examination is unavailable."
        breadcrumb={["Examinations"]}
      >
        <div className="cms-card">
          <div className="cms-card-body">
            <p>Examination not found.</p>
            <button
              className="cms-btn cms-btn-ghost exam-back-btn"
              onClick={() => nav("/dashboard/examinations")}
            >
              <ArrowLeft size={15} /> Back to Examinations
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  if (isForm)
    return (
      <ExamForm
        masters={masters}
        exams={exams}
        schedules={schedules}
        editId={id}
        onAcademicChange={loadGroups}
        onGroupChange={loadPrograms}
        onSave={async (record) => {
          await loadExaminations();
          nav("/dashboard/examinations", { state: { scheduleExamId: record.id } });
        }}
      />
    );
  const changeFilter = (n, v) => {
    setFilters((x) => ({
      ...x,
      [n]: v,
      ...(n === "boardId" ? { yearId: "" } : {}),
    }));
  };
  const exam = exams.find((e) => String(e.id) === examId);
  const printSchedule = async () => {
    const targetExams = exams.filter((item) => ["SCHEDULED", "COMPLETED"].includes(item.status));
    const loadedSchedules = (
      await Promise.all(targetExams.map((item) => loadSchedules(item.id)))
    ).flat();
    const physicalRows = buildExportRows(targetExams, loadedSchedules, masters);
    if (!physicalRows.length) return setToast("No scheduled examinations are available to export.");
    const rows = physicalRows;
    setExportPreview({ title: "Scheduled Examination Export", rows, scope: "global" });
  };
  return (
    <DashboardLayout
      title={tab === "schedule" ? "Exam Schedule" : "Examination Management"}
      subtitle={
        tab === "schedule"
          ? "Configure subject-wise examination dates, timings, halls and invigilators."
          : "Create and manage academic examinations."
      }
      breadcrumb={tab === "schedule" ? ["Examinations", "Exam Schedule"] : ["Examinations"]}
    >
      <div className="exam-tabs-row">
        <div className="exam-tabs" role="tablist" aria-label="Examination modules">
          <button
            role="tab"
            aria-selected={tab === "exams"}
            className={tab === "exams" ? "active" : ""}
            onClick={() => setTab("exams")}
          >
            Examinations
          </button>
          <button
            role="tab"
            aria-selected={tab === "schedule"}
            className={tab === "schedule" ? "active" : ""}
            onClick={() => setTab("schedule")}
          >
            Exam Schedule
          </button>
        </div>
        {tab === "exams" && (
          <button
            className="cms-btn cms-btn-primary exam-header-create-btn"
            onClick={() => nav("/dashboard/examinations/add")}
          >
            <Plus size={16} /> Create Examination
          </button>
        )}
      </div>
      {tab === "exams" ? (
        <>
          <div className="cms-card exam-list-card">
            <div className="exam-table-toolbar">
              <div className="exam-search">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code, name, board, group, program, type or status..."
                />
              </div>
              <div className="exam-toolbar-filters">
                <ConstrainedFilterSelect
                  label="Board"
                  value={filters.boardId}
                  onChange={(value) => changeFilter("boardId", value)}
                  options={BOARDS}
                />
                <ToolbarSelect
                  label="Academic Year"
                  value={filters.yearId}
                  disabled={!filters.boardId}
                  onChange={(value) => changeFilter("yearId", value)}
                  options={uniqueAcademicYearsByName(
                    YEARS.filter(
                      (year) =>
                        year.isActive &&
                        (year.boardId == null || Number(year.boardId) === Number(filters.boardId)),
                    ),
                    (year) => year.name,
                  )}
                />
                <ConstrainedFilterSelect
                  label="Academic Level"
                  value={filters.levelId}
                  disabled={!filters.yearId}
                  onChange={(value) => changeFilter("levelId", value)}
                  options={LEVELS}
                />
              </div>
              <div className="exam-toolbar-spacer" />
              <div className="exam-toolbar-actions">
                <button className="cms-btn cms-btn-ghost exam-export-btn" onClick={printSchedule}>
                  <Printer size={15} /> Export
                </button>
              </div>
            </div>
            <div className="cms-table-wrap">
              <table className="cms-table exam-list-table">
                <thead>
                  <tr>
                    <th>Exam Code</th>
                    <th>Exam Name</th>
                    <th>Board</th>
                    <th>Academic Year</th>
                    <th>Level</th>
                    <th>Group</th>
                    <th>Program</th>
                    <th>Exam Type</th>
                    <th>Exam Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11">
                        <div className="exam-list-loading">
                          <span className="exam-list-spinner" aria-hidden="true" />
                          <span>Loading data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : shownExams.length ? (
                    shownExams.map((e) => (
                      <tr key={e.id}>
                        <td className="cms-strong">{e.code}</td>
                        <td>
                          <span className="exam-cell-two-lines" title={e.name}>
                            {e.name}
                          </span>
                        </td>
                        <td title={getBoardName(e)}>
                          <span className="exam-cell-two-lines">{getBoardCode(e)}</span>
                        </td>
                        <td>
                          <span
                            className="exam-cell-truncate"
                            title={e.academicYearName || nameOf(YEARS, e.yearId, "—")}
                          >
                            {e.academicYearName || nameOf(YEARS, e.yearId, "—")}
                          </span>
                        </td>
                        <td>
                          <span
                            className="exam-level-two-lines"
                            title={e.academicLevelName || nameOf(LEVELS, e.levelId, "—")}
                          >
                            {e.academicLevelName || nameOf(LEVELS, e.levelId, "—")}
                          </span>
                        </td>
                        <td>
                          <span
                            className="exam-cell-truncate"
                            title={e.groupName || nameOf(GROUPS, e.groupId, "—")}
                          >
                            {e.groupName || nameOf(GROUPS, e.groupId, "—")}
                          </span>
                        </td>
                        <td>
                          <span
                            className="exam-cell-truncate"
                            title={e.programName || nameOf(PROGRAMS, e.programId, "—")}
                          >
                            {e.programName || nameOf(PROGRAMS, e.programId, "—")}
                          </span>
                        </td>
                        <td>
                          <span className="exam-cell-truncate" title={e.type}>
                            {e.type}
                          </span>
                        </td>
                        <td>
                          {d(e.startDate)}
                          <small className="exam-muted">to {d(e.endDate)}</small>
                        </td>
                        <td className="exam-status-cell">
                          <StatusBadge value={e.status} />
                        </td>
                        <td>
                          <div className="cms-actions">
                            <button
                              className="cms-action-btn view"
                              title="View"
                              onClick={async () => {
                                const requestId = ++detailRequestRef.current;
                                try {
                                  const response = await apiClient.get(EXAM_API.byId(e.id));
                                  const payload = objectFrom(response.data);
                                  if (!payload)
                                    throw new Error("Invalid Examination detail response.");
                                  const latest = normalizeExamination(
                                    payload,
                                    EXAM_PATTERNS,
                                    EXAM_TYPES,
                                  );
                                  if (!Number(latest.id))
                                    throw new Error(
                                      "Examination detail did not contain a valid ID.",
                                    );
                                  const latestSchedules = await loadSchedules(latest.id);
                                  if (requestId === detailRequestRef.current)
                                    setDetail({ exam: latest, schedules: latestSchedules });
                                } catch (error) {
                                  setToast(apiError(error));
                                }
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            {e.status === "DRAFT" && (
                              <>
                                <button
                                  className="cms-action-btn edit"
                                  title="Edit"
                                  onClick={() => setEditingExam(e)}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="cms-action-btn"
                                  title="Schedule"
                                  onClick={() => {
                                    setExamId(String(e.id));
                                    loadSchedules(e.id);
                                    setTab("schedule");
                                    setEditing(null);
                                    setSch(emptySchedule());
                                  }}
                                >
                                  <CalendarDays size={15} />
                                </button>
                              </>
                            )}
                            {["SCHEDULED", "COMPLETED"].includes(e.status) && (
                              <button
                                className="cms-action-btn"
                                title="Export examination"
                                onClick={async () => {
                                  const completeSchedules = await loadSchedules(e.id);
                                  const rows = buildExportRows([e], completeSchedules, masters);
                                  if (!rows.length)
                                    return setToast(
                                      "No schedules are available to export for this examination.",
                                    );
                                  setExportPreview({ title: e.name, rows, scope: "individual" });
                                }}
                              >
                                <Printer size={15} />
                              </button>
                            )}
                            {e.status === "DRAFT" && (
                              <button
                                className="cms-action-btn danger"
                                title="Cancel"
                                disabled={busyAction === "cancel-" + e.id}
                                onClick={async () => {
                                  if (busyAction) return;
                                  setBusyAction("cancel-" + e.id);
                                  try {
                                    const response = await apiClient.patch(EXAM_API.cancel(e.id), {
                                      reason: "Cancelled from Examination Management",
                                      notifyStudents: false,
                                    });
                                    await loadExaminations();
                                    setToast(response.data?.message || "Examination cancelled.");
                                  } catch (error) {
                                    setToast(apiError(error));
                                  } finally {
                                    setBusyAction("");
                                  }
                                }}
                              >
                                <X size={15} />
                              </button>
                            )}
                            {e.status === "DRAFT" &&
                              !schedules.some((s) => String(s.examId) === String(e.id)) && (
                                <button
                                  className="cms-action-btn danger"
                                  title="Delete draft"
                                  onClick={() => setRemove(e)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11">
                        <div className="cms-empty">No examinations match the current filters.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="exam-list-pagination">
              <span className="exam-record-summary">
                Showing {rangeStart}–{rangeEnd} of {list.length} records
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={page === pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <button
            className="exam-back-text-link exam-schedule-back-link"
            onClick={() => {
              setTab("exams");
              setEditing(null);
              setSch(emptySchedule());
              setErrors({});
            }}
          >
            <ArrowLeft size={15} /> Back to Examinations
          </button>
          <Schedule
            masters={masters}
            schedulingContext={schedulingContext}
            schedulingContextError={schedulingContextError}
            eligibleSubjectsLoaded={eligibleSubjectsLoaded}
            eligibleSubjectsError={eligibleSubjectsError}
            exam={exam}
            exams={exams}
            schedules={schedules}
            examId={examId}
            setExamId={(v) => {
              setExamId(v);
              loadSchedules(v);
              setEditing(null);
              setSch(emptySchedule());
              setErrors({});
            }}
            sch={sch}
            setSch={setSch}
            errors={errors}
            setErrors={setErrors}
            editing={editing}
            onEdit={(s) => {
              setExamId(String(s.examId));
              setSch({
                ...s,
                subjectId: String(s.subjectId),
                roomId: String(s.roomId),
                invigilatorId: String(s.invigilatorId),
              });
              setEditing(s.id);
              setErrors({});
            }}
            onSave={async (records) => {
              const wasEditing = Boolean(editing),
                nextRecords = Array.isArray(records) ? records : [records],
                candidate = nextRecords[0];
              await loadExaminations();
              await loadSchedules(candidate.examId);
              setToast(wasEditing ? "Schedule updated." : "Schedule saved.");
              setEditing(null);
              setSch(
                wasEditing || normalizeScheduleMode(candidate.scheduleMode) === "COMBINED_OBJECTIVE"
                  ? emptySchedule()
                  : nextScheduleFromPrevious(candidate),
              );
              setErrors({});
            }}
            onFailure={async (failedExamId) => {
              if (failedExamId) await loadSchedules(failedExamId);
              await loadExaminations();
            }}
            onRemove={setRemoveSchedule}
            finalizing={finalizing}
            finalize={async () => {
              if (finalizing || !exam) return;
              if (!hasValidExamMarks(exam))
                return setErrors({
                  form: "Configure valid Total Marks and Pass Percentage before finalizing this examination.",
                });
              if (validateExamConfiguration(exam))
                return setErrors({ form: "Select a valid Program, Exam Type and Exam Pattern." });
              if (!eligibleSubjectsLoaded)
                return setErrors({
                  form: "Eligible subjects could not be loaded. Please try again before finalizing.",
                });
              const expected = subjectsFor(masters),
                records = schedules.filter((item) => String(item.examId) === String(exam.id));
              if (!expected.length)
                return setErrors({
                  form: "No eligible subjects are available. This examination cannot be finalized.",
                });
              if (getScheduleMode(exam, EXAM_PATTERNS) !== "COMBINED_OBJECTIVE") {
                const missing = expected.filter(
                  (subject) =>
                    !records.some((item) => String(item.subjectId) === String(subject.id)),
                );
                if (missing.length)
                  return setErrors({
                    form: `${missing.length} subject${missing.length > 1 ? "s are" : " is"} not scheduled yet: ${missing.map((subject) => subject.name).join(", ")}.`,
                  });
                if (new Set(records.map((item) => item.date)).size !== records.length)
                  return setErrors({
                    form: "Each subject in a Regular Academic examination must be scheduled on a different date.",
                  });
                const expectedIds = expected.map((subject) => String(subject.id)).sort(),
                  actualIds = records.map((item) => String(item.subjectId)).sort(),
                  invalidRecord = records.some((item) => {
                    const subject = expected.find(
                      (candidateSubject) => String(candidateSubject.id) === String(item.subjectId),
                    );
                    return (
                      item.scheduleMode !== "SUBJECT_WISE" ||
                      !subject ||
                      !getMarksConfig(exam, subject, SUBJECTS) ||
                      item.date < exam.startDate ||
                      item.date > exam.endDate ||
                      !item.startTime ||
                      item.startTime >= item.endTime ||
                      !item.roomId ||
                      !item.invigilatorId ||
                      hasHallConflict({ ...item, editingId: item.id }, schedules) ||
                      hasInvigilatorConflict({ ...item, editingId: item.id }, schedules)
                    );
                  });
                if (
                  actualIds.length !== expectedIds.length ||
                  actualIds.some((item, index) => item !== expectedIds[index]) ||
                  invalidRecord
                )
                  return setErrors({
                    form: "The Regular Academic schedule is inconsistent. Edit the affected subject schedule before finalizing.",
                  });
              } else {
                const combinedRecords = records.filter(
                  (item) => normalizeScheduleMode(item.scheduleMode) === "COMBINED_OBJECTIVE",
                ),
                  sessionIds = [
                    ...new Set(combinedRecords.map((item) => item.sessionId).filter(Boolean)),
                  ],
                  expectedIds = expected.map((subject) => String(subject.id)).sort(),
                  actualIds = combinedRecords.map((item) => String(item.subjectId)).sort(),
                  first = combinedRecords[0],
                  sameSession =
                    first &&
                    combinedRecords.every((item) =>
                      [
                        "sessionId",
                        "date",
                        "startTime",
                        "endTime",
                        "roomId",
                        "invigilatorId",
                        "mode",
                      ].every((key) => String(item[key]) === String(first[key])),
                    ),
                  validSession =
                    first &&
                    first.date >= exam.startDate &&
                    first.date <= exam.endDate &&
                    first.startTime < first.endTime &&
                    first.mode === "Objective" &&
                    Boolean(first.roomId) &&
                    Boolean(first.invigilatorId) &&
                    !hasHallConflict({ ...first, editingId: first.id }, schedules) &&
                    !hasInvigilatorConflict({ ...first, editingId: first.id }, schedules);
                if (
                  !expected.length ||
                  records.length !== combinedRecords.length ||
                  sessionIds.length !== 1 ||
                  actualIds.length !== expectedIds.length ||
                  actualIds.some((item, index) => item !== expectedIds[index]) ||
                  !sameSession ||
                  !validSession
                )
                  return setErrors({
                    form: "The combined objective schedule is inconsistent. Edit the combined session before finalizing.",
                  });
              }
              setFinalizing(true);
              try {
                const response = await apiClient.post(EXAM_API.finalize(exam.id));
                await loadExaminations();
                await loadSchedules(exam.id);
                setToast(
                  response.data?.message || "Schedule finalized. Examination is now scheduled.",
                );
              } catch (error) {
                setErrors((current) => ({ ...current, form: apiError(error) }));
              } finally {
                setFinalizing(false);
              }
            }}
          />
        </>
      )}
      {detail && (
        <ExamDetails
          exam={detail.exam}
          schedules={detail.schedules}
          masters={masters}
          close={() => setDetail(null)}
        />
      )}{" "}
      {editingExam && (
        <EditExamModal
          masters={masters}
          exam={editingExam}
          schedules={schedules}
          onClose={() => setEditingExam(null)}
          onSave={async (period) => {
            const updated = { ...editingExam, ...period };
            await apiClient.put(EXAM_API.byId(editingExam.id), {
              examName: updated.name,
              boardId: Number(updated.boardId),
              academicYearId: Number(updated.yearId),
              academicLevelId: Number(updated.levelId),
              academicLevel: nameOf(LEVELS, updated.levelId, ""),
              groupId: Number(updated.groupId),
              programId: Number(updated.programId),
              assessmentTypeId: Number(updated.assessmentTypeId),
              examType: updated.examType,
              startDate: updated.startDate,
              endDate: updated.endDate,
              examPattern:
                findPattern(EXAM_PATTERNS, updated.examPatternId)?.code || updated.examPattern,
              examPatternId: String(updated.examPatternId),
              totalMarks: Number(updated.totalMarks),
              passPercentage: Number(updated.passPercentage),
              description: updated.description || "",
              status: updated.status,
              ...(updated.groupProgramId ? { groupProgramId: Number(updated.groupProgramId) } : {}),
              ...(updated.rowVersion != null ? { rowVersion: updated.rowVersion } : {}),
            });
            await loadExaminations();
            setEditingExam(null);
            setToast("Examination period updated successfully.");
          }}
        />
      )}
      {exportPreview && (
        <ExportPreviewModal preview={exportPreview} onClose={() => setExportPreview(null)} />
      )}{" "}
      {remove && (
        <ConfirmDialog
          title="Delete draft examination"
          message={`Delete ${remove.name}? This draft has no schedules.`}
          onCancel={() => setRemove(null)}
          loading={isDeletingExam}
          loadingLabel="Deleting..."
          onConfirm={async () => {
            if (busyAction) return;
            setBusyAction("delete-exam-" + remove.id);
            try {
              const currentSchedules = await loadSchedules(remove.id);
              if (currentSchedules.length) {
                setToast("This Draft examination has schedules and cannot be deleted.");
                return;
              }
              await apiClient.delete(EXAM_API.byId(remove.id));
              await loadExaminations();
              if (String(examId) === String(remove.id)) setExamId("");
              setRemove(null);
              setToast("Draft examination deleted.");
            } catch (error) {
              setToast(apiError(error));
            } finally {
              setBusyAction("");
            }
          }}
        />
      )}
      {removeSchedule && (
        <ConfirmDialog
          title="Remove schedule"
          message={
            normalizeScheduleMode(removeSchedule.scheduleMode) === "COMBINED_OBJECTIVE"
              ? "Remove this combined objective schedule? All included subject schedules will be removed."
              : `Remove the ${removeSchedule.subjectName} schedule?`
          }
          onCancel={() => setRemoveSchedule(null)}
          loading={isDeletingSchedule}
          loadingLabel="Removing..."
          onConfirm={async () => {
            if (busyAction) return;
            setBusyAction("delete-schedule-" + removeSchedule.id);
            try {
              const targets =
                normalizeScheduleMode(removeSchedule.scheduleMode) === "COMBINED_OBJECTIVE"
                  ? schedules.filter(
                    (item) =>
                      String(item.examId) === String(removeSchedule.examId) &&
                      item.sessionId === removeSchedule.sessionId,
                  )
                  : [removeSchedule];
              await Promise.all(
                targets.map((item) => apiClient.delete(EXAM_API.scheduleById(item.id))),
              );
              await Promise.all([loadSchedules(removeSchedule.examId), loadExaminations()]);
              setEditing(null);
              setRemoveSchedule(null);
              setToast("Schedule removed.");
            } catch (error) {
              setToast(apiError(error));
              await loadSchedules(removeSchedule.examId);
            } finally {
              setBusyAction("");
            }
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
      <PrintableSchedule preview={exportPreview} />
    </DashboardLayout>
  );
}

function ToolbarSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="exam-toolbar-select">
      <select
        value={value}
        disabled={disabled}
        aria-label={`Select ${label}`}
        title={
          options.find((option) => String(option.id) === String(value))?.name || `Select ${label}`
        }
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id} title={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ConstrainedFilterSelect({ label, value, onChange, options, disabled = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const placeholder = `Select ${label}`;
  const selectedName = options.find((option) => String(option.id) === String(value))?.name || "";
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);
  const choose = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };
  return (
    <div ref={containerRef} className="exam-toolbar-select exam-constrained-select">
      <button
        type="button"
        disabled={disabled}
        aria-label={placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selectedName || placeholder}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedName || placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="exam-constrained-menu" role="listbox" aria-label={`${label} options`}>
          <button
            type="button"
            role="option"
            aria-selected={!value}
            title={placeholder}
            onClick={() => choose("")}
          >
            {placeholder}
          </button>
          {options.length ? (
            options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={String(option.id) === String(value)}
                key={option.id}
                title={option.name}
                onClick={() => choose(String(option.id))}
              >
                {option.name}
              </button>
            ))
          ) : (
            <span>No options available</span>
          )}
        </div>
      )}
    </div>
  );
}

function ExamForm({
  masters,
  exams,
  schedules,
  editId,
  onSave,
  onAcademicChange,
  onGroupChange,
}) {
  const {
    boards: BOARDS,
    years: YEARS,
    levels: LEVELS,
    groups: GROUPS,
    programs: PROGRAMS,
    patterns: EXAM_PATTERNS,
    types: EXAM_TYPES,
  } = masters;
  const nav = useNavigate(),
    existing = exams.find((e) => String(e.id) === String(editId)),
    [form, setForm] = useState(() =>
      existing
        ? {
          ...existing,
          programId: String(existing.programId),
          groupProgramId: String(existing.groupProgramId || ""),
        }
        : emptyExam(),
    ),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false),
    locked = !!(existing && schedules.some((s) => String(s.examId) === String(existing.id)));
  const change = (n, v) => {
    if (n === "boardId") onAcademicChange({ boardId: v });
    if (n === "groupId") onGroupChange(v);
    setForm((x) => ({
      ...x,
      [n]: v,
      ...(n === "boardId"
        ? {
          yearId: "",
          groupId: "",
          groupProgramId: "",
          programId: "",
          assessmentTypeId: "",
          examType: "",
          examPatternId: "",
        }
        : n === "yearId"
          ? {
            groupId: "",
            groupProgramId: "",
            programId: "",
            assessmentTypeId: "",
            examType: "",
            examPatternId: "",
          }
          : n === "levelId"
            ? {
              groupId: "",
              groupProgramId: "",
              programId: "",
              assessmentTypeId: "",
              examType: "",
              examPatternId: "",
            }
            : n === "groupId"
              ? {
                groupProgramId: "",
                programId: "",
                assessmentTypeId: "",
                examType: "",
                examPatternId: "",
              }
              : n === "programId"
                ? { assessmentTypeId: "", examType: "", examPatternId: "" }
                : n === "assessmentTypeId"
                  ? { examPatternId: "" }
                  : {}),
    }));
  };
  const y = uniqueAcademicYearsByName(
      YEARS.filter(
        (x) => x.isActive && (x.boardId == null || Number(x.boardId) === Number(form.boardId)),
      ),
      (year) => year.name,
    ),
    l = LEVELS,
    g = GROUPS,
    p = PROGRAMS,
    availableExamTypes = EXAM_TYPES.filter(
      (item) => Number.isInteger(Number(item.id)) && Number(item.id) > 0,
    ),
    selectedTypeObj = availableExamTypes.find(
      (item) => String(item.id) === String(form.assessmentTypeId),
    ),
    availablePatterns = patternsForProgram(
      EXAM_PATTERNS,
      form.programId,
      form.groupProgramId,
    ).filter((patternItem) => {
      if (!form.assessmentTypeId) return true;
      if (!Array.isArray(patternItem.allowedExamTypes) || !patternItem.allowedExamTypes.length)
        return true;
      return patternItem.allowedExamTypes.some((candidate) => {
        const candidateVal =
          typeof candidate === "object"
            ? candidate.id ?? candidate.name ?? candidate.examType
            : candidate;
        return (
          String(candidateVal ?? "")
            .trim()
            .toLowerCase() ===
          String(selectedTypeObj?.id ?? selectedTypeObj?.name ?? selectedTypeObj?.examType ?? "")
            .trim()
            .toLowerCase()
        );
      });
    }),
    pattern = EXAM_PATTERNS.find((item) => String(item.id) === String(form.examPatternId));
  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (existing && existing.status !== "DRAFT")
      return setErrors({ form: "Only Draft examinations can be updated from this form." });
    const x = {};
    const normalizedExamName = normalizeText(form.name);
    const normalizedDescription = normalizeText(form.description);
    [
      "name",
      "boardId",
      "yearId",
      "levelId",
      "groupId",
      "programId",
      "assessmentTypeId",
      "examPatternId",
      "startDate",
      "endDate",
    ].forEach((k) => {
      if (!String(form[k] || "").trim())
        x[k] =
          k === "programId"
            ? "Please select a Program."
            : k === "assessmentTypeId"
              ? "Please select an Exam Type."
              : k === "examPatternId"
                ? "Please select an Exam Pattern."
                : "Required";
    });
    if (!normalizedExamName) x.name = "Exam Name is required.";
    else if (normalizedExamName.length < 2)
      x.name = "Exam Name must contain at least 2 characters.";
    else if (normalizedExamName.length > 150) x.name = "Exam Name must not exceed 150 characters.";
    else if (!/^[\p{L}\p{N}\s&'().,/-]+$/u.test(normalizedExamName))
      x.name = "Exam Name contains unsupported characters.";
    if (normalizedDescription.length > 500)
      x.description = "Description must not exceed 500 characters.";
    else if (hasUnsupportedControlCharacters(form.description))
      x.description = "Description contains unsupported control characters.";
    const configurationError = validateExamConfiguration(form);
    if (configurationError) x.examPatternId = configurationError;
    ["boardId", "yearId", "levelId", "groupId", "programId", "assessmentTypeId", "examPatternId"].forEach((field) => {
      if (!Number.isInteger(Number(form[field])) || Number(form[field]) <= 0)
        x[field] = "Select a valid option.";
    });
    const selectedYear = YEARS.find((item) => String(item.id) === String(form.yearId));
    const selectedGroup = GROUPS.find((item) => String(item.id) === String(form.groupId));
    const selectedProgram = PROGRAMS.find((item) => String(item.id) === String(form.programId));
    if (selectedYear?.boardId != null && String(selectedYear.boardId) !== String(form.boardId))
      x.yearId = "The selected Academic Year does not belong to this Board.";
    if (selectedGroup?.boardId != null && String(selectedGroup.boardId) !== String(form.boardId))
      x.groupId = "The selected Group does not belong to this Board.";
    if (!selectedProgram || String(selectedProgram.groupId) !== String(form.groupId))
      x.programId = "The selected Program does not belong to this Group.";
    if (
      form.groupProgramId &&
      String(selectedProgram?.groupProgramId) !== String(form.groupProgramId)
    )
      x.programId = "The selected Group–Program association is invalid.";
    if (
      String(form.assessmentTypeId || "").trim() &&
      (!Number.isInteger(Number(form.assessmentTypeId)) || Number(form.assessmentTypeId) <= 0)
    )
      x.assessmentTypeId = "Select a valid Exam Type.";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      x.endDate = "End date must be on or after the start date.";
    if (!Number.isInteger(Number(form.totalMarks)) || Number(form.totalMarks) <= 0)
      x.totalMarks = "Total Marks must be a positive whole number.";
    if (
      !Number.isFinite(Number(form.passPercentage)) ||
      Number(form.passPercentage) <= 0 ||
      Number(form.passPercentage) > 100
    )
      x.passPercentage = "Pass Percentage must be greater than 0 and not exceed 100.";
    if (
      !x.name &&
      exams.some(
        (q) =>
          q.id !== existing?.id &&
          normalizeText(q.name).toLocaleLowerCase() === normalizedExamName.toLocaleLowerCase() &&
          [
            "boardId",
            "yearId",
            "levelId",
            "groupId",
            "programId",
            "examPatternId",
            "examType",
            "startDate",
            "endDate",
          ].every((k) => String(q[k]) === String(form[k])),
      )
    )
      x.name = "An examination with this academic configuration and type already exists.";
    if (
      existing &&
      schedules.some(
        (s) =>
          String(s.examId) === String(existing.id) &&
          (s.date < form.startDate || s.date > form.endDate),
      )
    )
      x.endDate =
        "The new examination period excludes existing scheduled subjects. Update those schedules first.";
    if (Object.keys(x).length) return setErrors(x);
    setSaving(true);
    try {
      const payload = {
        examName: normalizedExamName,
        boardId: Number(form.boardId),
        academicYearId: Number(form.yearId),
        academicLevelId: Number(form.levelId),
        academicLevel: nameOf(LEVELS, form.levelId, ""),
        groupId: Number(form.groupId),
        programId: Number(form.programId),
        assessmentTypeId: Number(form.assessmentTypeId),
        examType:
          EXAM_TYPES.find(
            (item) => String(item.id) === String(form.assessmentTypeId)
          )?.examType ?? form.examType,
        startDate: form.startDate,
        endDate: form.endDate,
        examPattern: pattern?.code ?? form.examPattern ?? "",
        examPatternId: String(form.examPatternId),
        totalMarks: Number(form.totalMarks),
        passPercentage: Number(form.passPercentage),
        description: normalizedDescription,
        status: "DRAFT",
        ...(form.groupProgramId
          ? { groupProgramId: Number(form.groupProgramId) }
          : {}),
        ...(existing?.rowVersion != null
          ? { rowVersion: existing.rowVersion }
          : {}),
      };
      const response = existing
        ? await apiClient.put(EXAM_API.byId(existing.id), payload)
        : await apiClient.post(EXAM_API.list, payload);
      const returned = objectFrom(response.data);
      let record = returned ? normalizeExamination(returned, EXAM_PATTERNS, EXAM_TYPES) : null;
      if (existing && record && !String(record.code || "").trim())
        record = { ...record, code: existing.code };
      const createdId = existing?.id ?? record?.id ?? returned?.examId;
      if (!Number.isInteger(Number(createdId)) || Number(createdId) <= 0)
        throw new Error("The Examination API did not return a valid created Examination ID.");
      if (!record?.id || !String(record?.code || "").trim()) {
        const detailResponse = await apiClient.get(EXAM_API.byId(createdId));
        const detailPayload = objectFrom(detailResponse.data);
        if (!detailPayload) throw new Error("The created Examination detail response was invalid.");
        record = normalizeExamination(detailPayload, EXAM_PATTERNS, EXAM_TYPES);
        if (existing && !String(record.code || "").trim())
          record = { ...record, code: existing.code };
      }
      if (!String(record?.code || "").trim())
        throw new Error(
          "The backend did not return a generated Exam Code for the created Examination.",
        );
      await onSave(record);
    } catch (error) {
      setErrors((current) => ({ ...current, form: apiError(error) }));
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardLayout
      title={existing ? "Edit Examination" : "Create Examination"}
      breadcrumb={["Examinations"]}
    >
      <button
        type="button"
        className="exam-back-text-link"
        aria-label="Back to Examinations"
        onClick={() => nav("/dashboard/examinations")}
      >
        Back to Examinations
      </button>
      <form className="cms-form-page examination-form-page" onSubmit={save}>
        <div className="cms-card">
          <div className="cms-card-body">
            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Academic Configuration</h2>
                  <p>Each selection unlocks valid dependent configurations.</p>
                </div>
              </div>
              {locked && (
                <p className="exam-help">
                  Academic configuration is locked because subjects have already been scheduled.
                </p>
              )}
              <div className="cms-form-grid cols-3">
                <Select
                  label="Board *"
                  value={form.boardId}
                  disabled={locked || saving}
                  onChange={(v) => change("boardId", v)}
                  options={BOARDS}
                  error={errors.boardId}
                />
                <Select
                  label="Academic Year *"
                  value={form.yearId}
                  disabled={saving || locked || !form.boardId}
                  onChange={(v) => change("yearId", v)}
                  options={y}
                  error={errors.yearId}
                />
                <Select
                  label="Academic Level *"
                  value={form.levelId}
                  disabled={saving || locked || !form.yearId}
                  onChange={(v) => change("levelId", v)}
                  options={l}
                  error={errors.levelId}
                />
                <Select
                  label="Group *"
                  value={form.groupId}
                  disabled={saving || locked || !form.levelId}
                  onChange={(v) => change("groupId", v)}
                  options={g}
                  error={errors.groupId}
                />
                <Select
                  label="Program *"
                  value={form.programId}
                  disabled={saving || locked || !form.groupId}
                  onChange={(v) => {
                    const selected = p.find((item) => String(item.id) === String(v));
                    setForm((current) => ({
                      ...current,
                      programId: v,
                      groupProgramId: selected?.groupProgramId
                        ? String(selected.groupProgramId)
                        : "",
                      assessmentTypeId: "",
                      examType: "",
                      examPatternId: "",
                    }));
                    setErrors((current) => ({ ...current, programId: undefined, form: undefined }));
                  }}
                  options={p}
                  error={errors.programId}
                />
                <Select
                  label="Exam Type *"
                  value={form.assessmentTypeId}
                  disabled={saving || locked || !form.programId}
                  onChange={(v) => {
                    const selected = availableExamTypes.find((item) => String(item.id) === String(v));
                    setForm((current) => ({
                      ...current,
                      assessmentTypeId: v,
                      examType: selected?.examType ?? selected?.name ?? "",
                      examPatternId: "",
                    }));
                    setErrors((current) => ({
                      ...current,
                      assessmentTypeId: undefined,
                      examPatternId: undefined,
                      form: undefined,
                    }));
                  }}
                  options={availableExamTypes}
                  error={errors.assessmentTypeId}
                />
                <Select
                  label="Exam Pattern *"
                  value={form.examPatternId}
                  disabled={saving || locked || !form.assessmentTypeId}
                  onChange={(v) => change("examPatternId", v)}
                  options={availablePatterns}
                  error={errors.examPatternId}
                />
              </div>
            </section>
            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Examination Information</h2>
                  <p>Dates determine the permitted schedule window.</p>
                </div>
              </div>
              <div className="cms-form-grid cols-3">
                <Field
                  label="Exam Name *"
                  value={form.name}
                  onChange={(v) => change("name", v)}
                  error={errors.name}
                />
                {existing && (
                  <Field label="Exam Code" value={form.code} readOnly />
                )}
                <Field
                  label="Start Date *"
                  type="date"
                  value={form.startDate}
                  onChange={(v) => change("startDate", v)}
                  error={errors.startDate}
                />
                <Field
                  label="End Date *"
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(v) => change("endDate", v)}
                  error={errors.endDate}
                />
                <Field
                  label="Total Marks *"
                  type="number"
                  min="1"
                  step="1"
                  value={form.totalMarks}
                  onChange={(v) => change("totalMarks", v)}
                  error={errors.totalMarks}
                />
                <Field
                  label="Pass Percentage *"
                  type="number"
                  min="0.01"
                  max="100"
                  step="any"
                  value={form.passPercentage}
                  onChange={(v) => change("passPercentage", v)}
                  error={errors.passPercentage}
                />
                <Select label="Status" value={form.status} disabled options={[form.status]} />
                <Field
                  label="Description"
                  type="textarea"
                  value={form.description}
                  onChange={(v) => change("description", v)}
                  error={errors.description}
                />
              </div>
            </section>
            {errors.form && (
              <p className="cms-error exam-form-error" role="alert">
                {errors.form}
              </p>
            )}
            <div className="cms-form-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={saving}
                onClick={() => nav("/dashboard/examinations")}
              >
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" disabled={saving} aria-busy={saving}>
                {saving
                  ? existing
                    ? "Updating..."
                    : "Adding..."
                  : existing
                    ? "Update Examination"
                    : "Save Examination"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Schedule({
  masters,
  schedulingContext,
  schedulingContextError,
  eligibleSubjectsLoaded,
  eligibleSubjectsError,
  exam,
  exams,
  schedules,
  examId,
  setExamId,
  sch,
  setSch,
  errors,
  setErrors,
  editing,
  onEdit,
  onSave,
  onFailure,
  onRemove,
  finalize,
  finalizing,
}) {
  const {
    boards: BOARDS,
    years: YEARS,
    levels: LEVELS,
    groups: GROUPS,
    programs: PROGRAMS,
    patterns: EXAM_PATTERNS,
    subjects: SUBJECTS,
    faculty: FACULTY,
    rooms: ROOMS,
  } = masters;
  const [savingSchedule, setSavingSchedule] = useState(false),
    entries = exam ? schedules.filter((s) => String(s.examId) === String(exam.id)) : [],
    combined = getScheduleMode(exam, EXAM_PATTERNS) === "COMBINED_OBJECTIVE",
    included = subjectsFor(masters),
    subs = included.filter(
      (s) =>
        !entries.some(
          (x) => String(x.subjectId) === String(s.id) && String(x.id) !== String(editing),
        ),
    ),
    canEdit = exam?.status === "DRAFT",
    currentSessionId = editing
      ? entries.find((s) => String(s.id) === String(editing))?.sessionId
      : "",
    candidate = getCandidateSchedule(sch, exam, editing, currentSessionId, EXAM_PATTERNS),
    faculty = getEligibleInvigilators(FACULTY, candidate, schedules),
    rooms = getAvailableRooms(ROOMS, candidate, schedules, schedulingContext?.requiredCapacity);
  useEffect(() => {
    setSch((current) => {
      const next = { ...current };
      if (next.roomId && !rooms.some((room) => String(room.id) === String(next.roomId)))
        next.roomId = "";
      if (
        next.invigilatorId &&
        !faculty.some((person) => String(person.id) === String(next.invigilatorId))
      )
        next.invigilatorId = "";
      return next.roomId === current.roomId && next.invigilatorId === current.invigilatorId
        ? current
        : next;
    });
  }, [rooms, faculty, setSch]);
  useEffect(() => {
    if (combined && exam?.examType === "Objective")
      setSch((current) =>
        current.mode === "Objective" ? current : { ...current, mode: "Objective" },
      );
  }, [combined, exam?.id, exam?.examType, setSch]);
  const change = (n, v) => {
    setSch((x) => ({
      ...x,
      [n]: v,
      mode: combined && exam?.examType === "Objective" ? "Objective" : x.mode,
    }));
    setErrors((x) => ({ ...x, [n]: undefined, form: undefined }));
  };
  const save = async (e) => {
    e.preventDefault();
    if (savingSchedule) return;
    const x = {};
    (combined
      ? ["date", "startTime", "endTime", "roomId", "invigilatorId"]
      : ["subjectId", "date", "startTime", "endTime", "roomId", "invigilatorId"]
    ).forEach((k) => {
      if (!sch[k]) x[k] = "Required";
    });
    if (!exam) x.form = "Select an examination.";
    if (!eligibleSubjectsLoaded)
      x.form = eligibleSubjectsError || "Eligible subjects are still loading. Please try again.";
    if (!schedulingContext)
      x.form =
        schedulingContextError || "Scheduling Context is still loading. Please try again.";
    if (combined && !included.length)
      x.form = "No eligible subjects are configured for this examination.";
    if (!combined && eligibleSubjectsLoaded && !included.length)
      x.form = "No eligible subjects are configured for this examination.";
    if (sch.startTime && sch.endTime && sch.startTime >= sch.endTime)
      x.endTime = "End time must be after start time.";
    if (exam && sch.date && (sch.date < exam.startDate || sch.date > exam.endDate))
      x.date = "Exam date must be within the examination period.";
    if (
      combined &&
      entries.some(
        (s) =>
          normalizeScheduleMode(s.scheduleMode) === "COMBINED_OBJECTIVE" &&
          s.sessionId !== currentSessionId,
      )
    )
      x.form =
        "A combined schedule already exists for this examination. Edit the existing schedule instead.";
    if (
      !combined &&
      entries.some(
        (s) => String(s.id) !== String(editing) && String(s.subjectId) === String(sch.subjectId),
      )
    )
      x.subjectId = "This subject is already scheduled for this examination.";
    if (hasHallConflict(candidate, schedules))
      x.roomId = "This hall is already in use during the selected time.";
    if (hasInvigilatorConflict(candidate, schedules))
      x.invigilatorId = "This invigilator is already assigned during the selected time.";
    const selectedSubjects = combined
      ? included
      : [SUBJECTS.find((s) => String(s.id) === String(sch.subjectId))];
    if (selectedSubjects.some((subject) => !getMarksConfig(exam, subject, SUBJECTS)))
      x.form = "Marks configuration is unavailable for this subject and examination type.";
    if (
      ![sch.roomId, sch.invigilatorId].every(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      )
    )
      x.form = "Select a valid available Hall and Invigilator.";
    const selectedRoomForCapacity = rooms.find((item) => String(item.id) === String(sch.roomId));
    if (
      schedulingContext?.requiredCapacity > 0 &&
      Number(selectedRoomForCapacity?.capacity) < schedulingContext.requiredCapacity
    )
      x.roomId = "The selected Hall does not have enough capacity for eligible students.";
    if (Object.keys(x).length) return setErrors(x);
    const savedSessionId = combined ? currentSessionId || createCombinedSessionId(exam.id) : "";
    const make = (subject) => {
      const marks = getMarksConfig(exam, subject, SUBJECTS);
      return {
        ...sch,
        id: editing && !combined ? editing : Date.now() + subject.id,
        examId: exam.id,
        scheduleMode: combined ? "COMBINED_OBJECTIVE" : "SUBJECT_WISE",
        sessionId: savedSessionId,
        subjectId: subject.id,
        subjectIds: combined ? included.map((s) => s.id) : [],
        subjectName: subject.name,
        subjectCode: subject.code,
        roomId: Number(sch.roomId),
        invigilatorId: Number(sch.invigilatorId),
        mode: combined && exam.examType === "Objective" ? "Objective" : sch.mode,
        maxMarks: marks.maxMarks,
        passingMarks: marks.passingMarks,
      };
    };
    setSavingSchedule(true);
    try {
      const localRecords = combined ? included.map(make) : [make(selectedSubjects[0])],
        selectedRoom = rooms.find((item) => String(item.id) === String(sch.roomId)),
        selectedInvigilator = faculty.find((item) => String(item.id) === String(sch.invigilatorId)),
        commonPayload = {
          examDate: sch.date,
          startTime: toApiTime(sch.startTime),
          endTime: toApiTime(sch.endTime),
          roomId: Number(sch.roomId),
          invigilatorId: Number(sch.invigilatorId),
          hall: selectedRoom?.name ?? sch.hall ?? "",
          roomNumber: selectedRoom?.roomNumber ?? selectedRoom?.name ?? sch.roomNumber ?? "",
          venue: selectedRoom?.name ?? "",
          invigilator: selectedInvigilator?.name ?? sch.invigilatorName ?? "",
          invigilatorName: selectedInvigilator?.name ?? sch.invigilatorName ?? "",
          examMode: combined && exam.examType === "Objective" ? "Objective" : sch.mode,
        };
      if (editing) {
        const targets = combined
          ? entries.filter(
            (item) =>
              normalizeScheduleMode(item.scheduleMode) === "COMBINED_OBJECTIVE" &&
              item.sessionId === savedSessionId,
          )
          : entries.filter((item) => String(item.id) === String(editing));
        await Promise.all(
          targets.map((item) =>
            apiClient.put(EXAM_API.scheduleById(item.id), {
              ...commonPayload,
              examinationId: Number(exam.id),
              subjectId: Number(item.subjectId),
              sessionId: item.sessionId || null,
              scheduleMode: item.scheduleMode,
              maxMarks: Number(item.maxMarks),
              passingMarks: Number(item.passingMarks),
              ...(item.rowVersion != null ? { rowVersion: item.rowVersion } : {}),
            }),
          ),
        );
      } else if (combined) {
        await apiClient.post(EXAM_API.batchSchedules, {
          ...commonPayload,
          examinationId: Number(exam.id),
          subjectIds: included.map((subject) => Number(subject.id)),
          sessionId: savedSessionId,
          scheduleMode: "COMBINED_OBJECTIVE",
          maxMarks: Number(exam.totalMarks),
          passingMarks: Math.ceil((Number(exam.totalMarks) * Number(exam.passPercentage)) / 100),
        });
      } else {
        const subject = selectedSubjects[0],
          marks = getMarksConfig(exam, subject, SUBJECTS);
        await apiClient.post(EXAM_API.schedules, {
          ...commonPayload,
          examinationId: Number(exam.id),
          subjectId: Number(subject.id),
          sessionId: null,
          scheduleMode: "SUBJECT_WISE",
          maxMarks: Number(marks.maxMarks),
          passingMarks: Number(marks.passingMarks),
        });
      }
      await onSave(localRecords);
    } catch (error) {
      setErrors((current) => ({ ...current, form: apiError(error) }));
      await onFailure?.(exam?.id);
    } finally {
      setSavingSchedule(false);
    }
  };
  return (
    <>
      <div className="exam-toolbar">
        <div>
          <h2>Exam Schedule</h2>
          <p>Select an examination; its academic context is locked into every schedule.</p>
        </div>
      </div>
      <div className="cms-card exam-schedule-card">
        <div className="cms-card-body">
          <Select
            label="Examination *"
            value={examId}
            onChange={setExamId}
            options={exams.filter((e) => e.status === "DRAFT")}
            placeholder="Select an examination"
          />
          {exam ? (
            <>
              <div className="exam-context">
                <strong>{exam.name}</strong>
                <span>
                  {nameOf(BOARDS, exam.boardId)} · {nameOf(YEARS, exam.yearId)} ·{" "}
                  {nameOf(LEVELS, exam.levelId)} · {nameOf(GROUPS, exam.groupId)} ·{" "}
                  {nameOf(PROGRAMS, exam.programId)}
                </span>
                <span>
                  {d(exam.startDate)} – {d(exam.endDate)}
                </span>
              </div>
              {canEdit ? (
                <form onSubmit={save}>
                  <div className="cms-form-grid cols-3">
                    {combined ? (
                      <div className="cms-field exam-included-subjects">
                        <label>Included Subjects ({included.length})</label>
                        <div>{included.map((s) => s.name).join(" · ")}</div>
                      </div>
                    ) : (
                      <Select
                        label="Subject *"
                        value={sch.subjectId}
                        onChange={(v) => change("subjectId", v)}
                        options={subs}
                        error={errors.subjectId}
                      />
                    )}
                    <Field
                      label="Exam Date *"
                      type="date"
                      min={exam.startDate}
                      max={exam.endDate}
                      value={sch.date}
                      onChange={(v) => change("date", v)}
                      error={errors.date}
                    />
                    <Field
                      label="Start Time *"
                      type="time"
                      value={sch.startTime}
                      onChange={(v) => change("startTime", v)}
                      error={errors.startTime}
                    />
                    <Field
                      label="End Time *"
                      type="time"
                      value={sch.endTime}
                      onChange={(v) => change("endTime", v)}
                      error={errors.endTime}
                    />
                    <Select
                      label="Hall / Room *"
                      value={sch.roomId}
                      onChange={(v) => change("roomId", v)}
                      options={rooms}
                      error={errors.roomId}
                    />
                    <Select
                      label="Invigilator *"
                      value={sch.invigilatorId}
                      onChange={(v) => change("invigilatorId", v)}
                      options={faculty}
                      error={errors.invigilatorId}
                    />
                    {combined && exam.examType === "Objective" ? (
                      <Field label="Exam Mode" value="Objective" readOnly />
                    ) : (
                      <Select
                        label="Exam Mode"
                        value={sch.mode}
                        onChange={(v) => change("mode", v)}
                        options={["Written", "Practical", "Viva"]}
                      />
                    )}
                  </div>
                  {errors.form && <p className="cms-error">{errors.form}</p>}
                  <div className="cms-form-actions">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      disabled={savingSchedule}
                      onClick={() => {
                        setSch(emptySchedule());
                        setErrors({});
                      }}
                    >
                      {editing ? "Cancel Edit" : "Clear"}
                    </button>
                    <button
                      className="cms-btn cms-btn-primary"
                      disabled={
                        savingSchedule ||
                        !eligibleSubjectsLoaded ||
                        !included.length ||
                        !faculty.length ||
                        !rooms.length
                      }
                      aria-busy={savingSchedule}
                    >
                      {savingSchedule ? "Saving..." : editing ? "Update Schedule" : "Save Schedule"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="exam-help">
                  This examination is {exam.status.toLowerCase()} and its schedule is read-only.
                </p>
              )}
              <ScheduleTable
                entries={entries}
                canEdit={canEdit}
                edit={onEdit}
                remove={onRemove}
                masters={masters}
              />
              {canEdit && (
                <div className="exam-finalize">
                  <span>
                    {entries.length} of {included.length} eligible subjects scheduled
                  </span>
                  <button
                    className="cms-btn cms-btn-primary"
                    disabled={finalizing || !eligibleSubjectsLoaded || !included.length}
                    aria-busy={finalizing}
                    onClick={finalize}
                  >
                    {finalizing ? "Finalizing..." : "Finalize Schedule"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="cms-empty">Choose a draft examination to begin scheduling.</div>
          )}
        </div>
      </div>
    </>
  );
}

function ScheduleTable({ entries, canEdit, edit, remove, masters }) {
  return (
    <div className="cms-table-wrap exam-schedule-table">
      <table className="cms-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Exam Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Hall</th>
            <th>Invigilator</th>
            <th>Exam Mode</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.subjectName}
                  <small className="exam-muted">{s.subjectCode}</small>
                </td>
                <td>{d(s.date)}</td>
                <td>{s.startTime}</td>
                <td>{s.endTime}</td>
                <td>{s.roomName || nameOf(masters.rooms, s.roomId)}</td>
                <td>{s.invigilatorName || nameOf(masters.faculty, s.invigilatorId)}</td>
                <td>{s.mode}</td>
                {canEdit && (
                  <td>
                    <div className="cms-actions">
                      <button
                        className="cms-action-btn edit"
                        title="Edit schedule"
                        onClick={() => edit(s)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="cms-action-btn danger"
                        title="Remove schedule"
                        onClick={() => remove(s)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={canEdit ? 8 : 7}>
                <div className="cms-empty">No subjects have been scheduled yet.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExamDetails({ exam, schedules, masters, close }) {
  const entries = schedules.filter((s) => String(s.examId) === String(exam.id));
  return (
    <Modal title="Examination Details" onClose={close}>
      <section className="exam-view-summary">
        <strong>{exam.name}</strong>
        <p>
          {exam.boardName || nameOf(masters.boards, exam.boardId)} ·{" "}
          {exam.academicYearName || nameOf(masters.years, exam.yearId)} ·{" "}
          {exam.academicLevelName || nameOf(masters.levels, exam.levelId)} ·{" "}
          {exam.groupName || nameOf(masters.groups, exam.groupId)} ·{" "}
          {exam.programName || nameOf(masters.programs, exam.programId)}
        </p>
        <p>
          {d(exam.startDate)} – {d(exam.endDate)}
        </p>
        <p>
          Total Marks: {exam.totalMarks || "—"} · Pass Percentage:{" "}
          {exam.passPercentage ? `${exam.passPercentage}%` : "—"} · Passing Score:{" "}
          {getExamPassingMarks(exam) ?? "—"}
        </p>
      </section>
      <CompactScheduleTable entries={entries} masters={masters} />
    </Modal>
  );
}

function CompactScheduleTable({ entries, masters }) {
  return (
    <div className="cms-table-wrap exam-view-schedule">
      <table className="cms-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
            <th>Hall</th>
            <th>Invigilator</th>
            <th>Mode</th>
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((s) => (
              <tr key={s.id}>
                <td>{s.subjectName}</td>
                <td>{d(s.date)}</td>
                <td>
                  {s.startTime} - {s.endTime}
                </td>
                <td>{s.roomName || nameOf(masters.rooms, s.roomId)}</td>
                <td>{s.invigilatorName || nameOf(masters.faculty, s.invigilatorId)}</td>
                <td>{s.mode}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">
                <div className="cms-empty">No subjects have been scheduled yet.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditExamModal({ exam, schedules, masters, onClose, onSave }) {
  const [form, setForm] = useState({ startDate: exam.startDate, endDate: exam.endDate }),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  const change = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  };
  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.startDate) next.startDate = "Start date is required.";
    if (!form.endDate) next.endDate = "End date is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = "End date must be on or after the start date.";
    if (
      schedules.some(
        (schedule) =>
          String(schedule.examId) === String(exam.id) &&
          (schedule.date < form.startDate || schedule.date > form.endDate),
      )
    )
      next.form =
        "The new examination period excludes existing scheduled subjects. Update those schedules before changing the examination period.";
    if (Object.keys(next).length) return setErrors(next);
    setSaving(true);
    try {
      await onSave(form);
    } catch (error) {
      setErrors((current) => ({ ...current, form: apiError(error) }));
    } finally {
      setSaving(false);
    }
  };
  const details = [
    ["Exam Name", exam.name],
    ["Exam Code", exam.code],
    ["Board", exam.boardName || nameOf(masters.boards, exam.boardId)],
    ["Academic Year", exam.academicYearName || nameOf(masters.years, exam.yearId)],
    ["Academic Level", exam.academicLevelName || nameOf(masters.levels, exam.levelId)],
    ["Group", exam.groupName || nameOf(masters.groups, exam.groupId)],
    ["Program", exam.programName || nameOf(masters.programs, exam.programId)],
    ["Exam Type", exam.type],
    ["Status", exam.status],
    ["Description", exam.description || "No description provided."],
  ];
  return (
    <Modal title="Edit Examination" onClose={saving ? undefined : onClose}>
      <form className="exam-edit-modal" onSubmit={save}>
        <div className="exam-edit-summary">
          {details.map(([label, value]) => (
            <div className="exam-edit-detail" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="exam-edit-period">
          <h3>Examination Period</h3>
          <div className="cms-form-grid">
            <Field
              label="Start Date *"
              type="date"
              value={form.startDate}
              onChange={(value) => change("startDate", value)}
              error={errors.startDate}
            />
            <Field
              label="End Date *"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(value) => change("endDate", value)}
              error={errors.endDate}
            />
          </div>
          {errors.form && <p className="cms-error">{errors.form}</p>}
        </section>
        <div className="exam-edit-actions">
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="cms-btn cms-btn-primary exam-save-btn"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ExportPreviewModal({ preview, onClose }) {
  const hasRows = preview.rows.length > 0;
  const handleDownloadExcel = () => {
    if (!hasRows) return;
    downloadExcelPreview(preview);
  };
  return (
    <Modal title={preview.title} onClose={onClose}>
      <div className="exam-export-preview">
        <ExportTable rows={preview.rows} scope={preview.scope} />
      </div>
      <div className="exam-edit-actions exam-export-actions">
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={!hasRows}
          onClick={handleDownloadExcel}
        >
          Download Excel
        </button>
      </div>
    </Modal>
  );
}

function PrintableSchedule({ preview }) {
  if (!preview) return null;
  return (
    <section className="exam-print-area">
      <h1>Pirnav College</h1>
      <h2>{preview.title}</h2>
      <ExportTable rows={preview.rows} scope={preview.scope} />
    </section>
  );
}

const EXPORT_COLUMNS = [
  ["S.No", "serialNo"],
  ["Exam Name", "examName"],
  ["Exam Code", "examCode"],
  ["Board", "boardName"],
  ["Invigilator", "invigilatorName"],
  ["Exam Date", "examDate", d],
  ["Start Time", "startTime"],
  ["End Time", "endTime"],
];

function formatExportValue(row, [, key, format]) {
  return format ? format(row[key]) : (row[key] ?? "—");
}
function sanitizeFileName(value) {
  const safeName = String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/^\.+|\.+$/g, "");
  return safeName || "Examination_Schedule";
}
function downloadExcelPreview(preview) {
  if (!preview.rows.length) return;
  const excelRows = preview.rows.map((row) =>
    Object.fromEntries(EXPORT_COLUMNS.map((column) => [column[0], formatExportValue(row, column)])),
  );
  const worksheet = XLSX.utils.json_to_sheet(excelRows, {
    header: EXPORT_COLUMNS.map(([label]) => label),
  });
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];
  const workbook = XLSX.utils.book_new();
  const sheetName = preview.scope === "global" ? "Exam Schedules" : "Exam Schedule";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${sanitizeFileName(preview.title)}.xlsx`);
}
function ExportTable({ rows, scope }) {
  return (
    <table className={`exam-export-table exam-export-table-${scope || "individual"}`}>
      <thead>
        <tr>
          {EXPORT_COLUMNS.map(([label]) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.examId}-${row.sessionId || row.subjectName}-${index}`}>
            {EXPORT_COLUMNS.map(([label, key, format]) => {
              const val = format ? format(row[key]) : (row[key] ?? "—");
              return (
                <td key={label}>
                  {["examName", "boardName"].includes(key) ? (
                    <span className="exam-cell-two-lines" title={val}>
                      {val}
                    </span>
                  ) : (
                    val
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Detail({ label, value }) {
  return (
    <div className="exam-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Select({ label, value, onChange, options = [], disabled, error, placeholder }) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { id: option, name: option } : option,
  );
  const selectedLabel = normalizedOptions.find(
    (option) => String(option.id) === String(value),
  )?.name;
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label>{label}</label>
      <select
        value={value ?? ""}
        disabled={disabled}
        title={selectedLabel || placeholder || `Select ${label.replace(" *", "")}`}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">{placeholder || `Select ${label.replace(" *", "")}`}</option>
        {normalizedOptions.map((option) => (
          <option key={option.id} value={option.id} title={option.name}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  readOnly,
  placeholder,
  min,
  max,
  step,
}) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label>{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          readOnly={readOnly}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}{" "}
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}
