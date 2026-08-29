import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Eye, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import "./ExaminationPage.css";

const EXAM_API = {
  boards: "/api/v1/boards",
  activeYear: "/api/v1/academic-years/active",
  academicLevels: "/api/v1/boards/academic-levels",
  groups: "/api/v1/groups",
  programsByGroup: (groupId) => `/api/v1/programs/group/${groupId}`,
  list: "/api/v1/examinations",
  byId: (id) => `/api/v1/examinations/${id}`,
  eligibleSubjects: (id) => `/api/v1/examinations/${id}/eligible-subjects`,
  finalize: (id) => `/api/v1/examinations/${id}/finalize-schedule`,
  cancel: (id) => `/api/v1/examinations/${id}/cancel`,
  schedules: "/api/v1/examinations/schedules",
  scheduleById: (id) => `/api/v1/examinations/schedules/${id}`,
  batchSchedules: "/api/v1/examinations/schedules/batch",
  availableHalls: "/api/v1/examinations/available-halls",
  availableInvigilators: "/api/v1/examinations/available-invigilators",
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
const normalizeMaster = (item, idKeys, nameKeys) => ({
  ...item,
  id: idKeys.map((key) => item?.[key]).find((value) => value != null) ?? item?.id,
  name:
    nameKeys.map((key) => item?.[key]).find((value) => value != null && value !== "") ??
    item?.name ??
    "",
  code: item?.code ?? item?.groupCode ?? item?.programCode ?? item?.subjectCode ?? "",
  status: item?.status ?? (item?.isActive === false ? "Inactive" : "Active"),
});
const isActiveMaster = (item) =>
  item?.isActive === true ||
  item?.status === true ||
  String(item?.status).toLowerCase() === "active";
const normalizeDateInput = (value) => (value ? String(value).slice(0, 10) : "");
const normalizeTimeInput = (value) => (value ? String(value).slice(0, 5) : "");
const toApiTime = (value) =>
  value && /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
const apiError = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.response?.data?.title ||
  getApiErrorMessage(error);
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
  scheduleMode: String(item.scheduleMode ?? "SUBJECT_WISE").toUpperCase(),
  roomId: item.roomId ?? "",
  invigilatorId: item.invigilatorId ?? "",
  hall: item.hall ?? item.roomNumber ?? "",
  roomNumber: item.roomNumber ?? item.hall ?? "",
  invigilatorName: item.invigilatorName ?? item.invigilator ?? "",
  mode: item.examMode ?? item.mode ?? "",
  maxMarks: item.maxMarks ?? 0,
  passingMarks: item.passingMarks ?? 0,
  status: item.status ?? "",
});
const normalizeExamination = (item) => ({
  ...item,
  id: item.examinationId ?? item.id,
  code: item.examCode ?? item.code ?? "",
  name: item.examName ?? item.name ?? "",
  boardId: item.boardId,
  yearId: item.academicYearId ?? item.yearId,
  levelId: item.academicLevelId ?? item.levelId,
  groupId: item.groupId,
  programId: item.programId,
  assessmentTypeId: item.assessmentTypeId ?? null,
  examPatternId: item.examPatternId ?? "",
  examPattern: item.examPattern ?? "",
  examType: item.examType ?? item.type ?? "",
  type: item.examType ?? item.type ?? "",
  startDate: normalizeDateInput(item.startDate),
  endDate: normalizeDateInput(item.endDate),
  totalMarks: item.totalMarks ?? "",
  passPercentage: item.passPercentage ?? "",
  description: item.description ?? "",
  status: String(item.status ?? "DRAFT").toUpperCase(),
  schedules: collectionFrom(item.schedules).map(normalizeSchedule),
});

let BOARDS = [];
let YEARS = [];
let LEVELS = [];
let GROUPS = [];
let PROGRAMS = [];
let EXAM_PATTERNS = [];
let SUBJECTS = [];
let FACULTY = [];
let ROOMS = [];
let TYPES = [];
const emptyExam = () => ({
  code: "",
  name: "",
  boardId: "",
  yearId: "",
  levelId: "",
  groupId: "",
  programId: "",
  examPatternId: "",
  examType: "",
  type: "",
  startDate: "",
  endDate: "",
  totalMarks: "",
  passPercentage: "",
  description: "",
  status: "DRAFT",
});
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
const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value + "T00:00:00"),
      )
    : "—";
const subjectsFor = () => SUBJECTS;
const patternsForProgram = (programId) =>
  EXAM_PATTERNS.filter(
    (pattern) =>
      !programId ||
      pattern.programId == null ||
      String(pattern.programId) === String(programId),
  );
const validateExamConfiguration = (exam) => {
  if (!exam.groupId || !exam.programId || !exam.examPatternId || !exam.examType)
    return "Select a valid Program, Exam Pattern and Exam Type.";
  return "";
};
const getScheduleMode = (exam) =>
  exam?.scheduleMode ||
  EXAM_PATTERNS.find((item) => String(item.id) === String(exam?.examPatternId))?.scheduleMode ||
  "SUBJECT_WISE";
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
  existing?.scheduleMode === "COMBINED" &&
  candidate?.scheduleMode === "COMBINED" &&
  String(existing.examId) === String(candidate.examId) &&
  Boolean(existing.sessionId) &&
  existing.sessionId === candidate.sessionId;
const getMarksConfig = (exam, subject) => {
  if (!subjectsFor(exam).some((item) => String(item.id) === String(subject?.id))) return null;
  const passingMarks = getExamPassingMarks(exam);
  return passingMarks == null
    ? null
    : { maxMarks: Number(exam.totalMarks), passingMarks };
};
const getCandidateSchedule = (schedule, exam, editingId, sessionId) => ({
  ...schedule,
  examId: exam?.id,
  scheduleMode: getScheduleMode(exam),
  sessionId: getScheduleMode(exam) === "COMBINED" ? sessionId || "" : "",
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
const getAvailableRooms = (candidate, schedules) =>
  ROOMS.filter(
    (room) =>
      room.status === "Active" && !hasHallConflict({ ...candidate, roomId: room.id }, schedules),
  );
const getEligibleInvigilators = (candidate, schedules) =>
  FACULTY.filter(
    (faculty) =>
      faculty.status === "Active" &&
      !hasInvigilatorConflict({ ...candidate, invigilatorId: faculty.id }, schedules),
  );
const buildExportRows = (targetExams, schedules) =>
  targetExams
    .flatMap((exam) => {
      const records = schedules.filter((schedule) => String(schedule.examId) === String(exam.id)),
        groups = new Map();
      records.forEach((schedule) => {
        const key =
          schedule.scheduleMode === "COMBINED" && schedule.sessionId
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
          boardName: nameOf(BOARDS, exam.boardId),
          academicYear: nameOf(YEARS, exam.yearId),
          academicLevel: nameOf(LEVELS, exam.levelId),
          programName: nameOf(PROGRAMS, exam.programId),
          patternName: nameOf(EXAM_PATTERNS, exam.examPatternId),
          examType: exam.examType || exam.type,
          groupName: nameOf(GROUPS, exam.groupId, "—"),
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
              : first.startTime || first.endTime || "—”",
          hallName: nameOf(ROOMS, first.roomId, "—”"),
          invigilatorName: nameOf(FACULTY, first.invigilatorId, "—”"),
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
const duration = (a, b) => {
  if (!a || !b || b <= a) return "";
  const min = +b.slice(0, 2) * 60 + +b.slice(3) - (+a.slice(0, 2) * 60 + +a.slice(3));
  return `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;
};
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
  const initialFilters = {
    boardId: "",
    yearId: "",
    levelId: "",
    groupId: "",
    programId: "",
    type: "",
    status: "",
  };
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
    [appliedFilters, setAppliedFilters] = useState(initialFilters),
    [search, setSearch] = useState(""),
    [finalizing, setFinalizing] = useState(false),
    [loading, setLoading] = useState(true),
    [, setMasterRevision] = useState(0);
  const groupRequestRef = useRef(0),
    programRequestRef = useRef(0);
  const replaceMaster = (key, items) => {
    if (key === "boards") BOARDS = items;
    else if (key === "years") YEARS = items;
    else if (key === "levels") LEVELS = items;
    else if (key === "groups") GROUPS = items;
    else if (key === "programs") PROGRAMS = items;
    else if (key === "subjects") SUBJECTS = items;
    else if (key === "faculty") FACULTY = items;
    else if (key === "rooms") ROOMS = items;
    setMasterRevision((value) => value + 1);
  };
  const loadMasterData = async () => {
    const requests = [
      ["boards", EXAM_API.boards, ["boardId", "id"], ["boardName", "name"]],
      ["years", EXAM_API.activeYear, ["academicYearId", "id"], ["academicYearName", "yearName", "name"]],
      ["levels", EXAM_API.academicLevels, ["academicLevelId", "id"], ["levelName", "academicLevelName", "name"]],
    ];
    const results = await Promise.allSettled(
      requests.map(([, url]) => apiClient.get(url)),
    );
    const errors = [];
    results.forEach((result, index) => {
      const [key, , idKeys, nameKeys] = requests[index];
      if (result.status === "fulfilled") {
        const source = masterCollectionFrom(result.value.data);
        const normalized = source
          .map((item) => {
            const master = normalizeMaster(item, idKeys, nameKeys);
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
                ? { ...master, id: Number(master.id), isActive: isActiveMaster(item) }
                : { ...master, id: Number(master.id) };
          })
          .filter(
            (item) =>
              Number.isInteger(item.id) &&
              item.id > 0 &&
              (key === "levels" || item.isActive),
          );
        replaceMaster(key, normalized);
      } else {
        replaceMaster(key, []);
        errors.push(apiError(result.reason));
      }
    });
    if (errors.length) setToast(errors[0]);
  };
  const loadGroups = async ({ boardId, yearId, levelId }) => {
    const requestId = ++groupRequestRef.current;
    replaceMaster("groups", []);
    replaceMaster("programs", []);
    if (![boardId, yearId, levelId].every((value) => Number(value) > 0)) return;
    try {
      const response = await apiClient.get(EXAM_API.groups, {
        params: {
          boardId: Number(boardId),
          academicYearId: Number(yearId),
          academicLevelId: Number(levelId),
          isActive: true,
        },
      });
      if (requestId !== groupRequestRef.current) return;
      replaceMaster(
        "groups",
        collectionFrom(response.data)
          .map((item) => ({
            ...normalizeMaster(item, ["groupId", "id"], ["groupName", "name"]),
            id: Number(item.groupId ?? item.id),
            boardId: item.boardId == null ? null : Number(item.boardId),
            academicYearId:
              item.academicYearId == null ? null : Number(item.academicYearId),
            academicLevelId:
              item.academicLevelId == null ? null : Number(item.academicLevelId),
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
            category: item.category ?? item.programCategory ?? item.programType ?? "",
            isActive: isActiveMaster(item),
          }))
          .filter(
            (item) => Number.isInteger(item.id) && item.id > 0 && item.isActive !== false,
          ),
      );
    } catch {
      if (requestId === programRequestRef.current) {
        replaceMaster("programs", []);
        setToast("Unable to load programs for the selected group.");
      }
    }
  };
  const loadExaminations = async (nextFilters = appliedFilters) => {
    const params = Object.fromEntries(
      Object.entries({
        BoardId: nextFilters.boardId,
        AcademicYearId: nextFilters.yearId,
        AcademicLevelId: nextFilters.levelId,
        GroupId: nextFilters.groupId,
        ProgramId: nextFilters.programId,
        ExamType: nextFilters.type,
        Status: nextFilters.status,
        SearchTerm: search.trim(),
      }).filter(([, value]) => value !== "" && value != null),
    );
    try {
      const response = await apiClient.get(EXAM_API.list, { params });
      const normalized = collectionFrom(response.data).map(normalizeExamination).filter((item) => item.id);
      setExams(normalized);
      setSchedules(normalized.flatMap((item) => item.schedules));
      EXAM_PATTERNS = Array.from(
        new Map(
          normalized
            .filter((item) => item.examPatternId && item.examPattern)
            .map((item) => [
              String(item.examPatternId),
              {
                id: item.examPatternId,
                name: item.examPattern,
                programId: item.programId,
                scheduleMode: item.scheduleMode,
              },
            ]),
        ).values(),
      );
      TYPES = [...new Set(normalized.map((item) => item.examType).filter(Boolean))];
      setMasterRevision((value) => value + 1);
      return normalized;
    } catch (error) {
      setToast(apiError(error));
      return [];
    }
  };
  const loadSchedules = async (selectedExamId) => {
    if (!selectedExamId) return [];
    try {
      const response = await apiClient.get(EXAM_API.schedules, {
        params: { examinationId: Number(selectedExamId) },
      });
      const next = collectionFrom(response.data).map(normalizeSchedule).filter((item) => item.id);
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
    Promise.all([loadMasterData(), loadExaminations(initialFilters)]).finally(() => {
      if (active) setLoading(false);
    });
    // Initial API load is intentionally one-time; filters are applied by Check Examinations.
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // The edit form's academic masters are loaded once its API examination record is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForm, id, exams]);
  useEffect(() => {
    if (!examId) {
      replaceMaster("subjects", []);
      return;
    }
    let active = true;
    apiClient
      .get(EXAM_API.eligibleSubjects(examId))
      .then((response) => {
        if (!active) return;
        replaceMaster(
          "subjects",
          collectionFrom(response.data)
            .map((item) =>
              normalizeMaster(item, ["subjectId", "id"], ["subjectName", "name"]),
            )
            .filter((item) => item.id != null),
        );
      })
      .catch((error) => {
        if (active) {
          replaceMaster("subjects", []);
          setToast(apiError(error));
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);
  useEffect(() => {
    if (!sch.date || !sch.startTime || !sch.endTime) {
      replaceMaster("rooms", []);
      replaceMaster("faculty", []);
      return;
    }
    let active = true;
    const params = {
      date: sch.date,
      startTime: toApiTime(sch.startTime),
      endTime: toApiTime(sch.endTime),
      ...(editing ? { excludeScheduleId: Number(editing) } : {}),
    };
    Promise.allSettled([
      apiClient.get(EXAM_API.availableHalls, { params }),
      apiClient.get(EXAM_API.availableInvigilators, { params }),
    ]).then(([hallResult, facultyResult]) => {
      if (!active) return;
      if (hallResult.status === "fulfilled") {
        replaceMaster(
          "rooms",
          collectionFrom(hallResult.value.data)
            .map((item) => normalizeMaster(item, ["roomId", "id"], ["roomName", "roomNumber", "name"]))
            .filter((item) => item.id != null),
        );
      } else {
        replaceMaster("rooms", []);
        setToast(apiError(hallResult.reason));
      }
      if (facultyResult.status === "fulfilled") {
        replaceMaster(
          "faculty",
          collectionFrom(facultyResult.value.data)
            .map((item) => normalizeMaster(item, ["facultyId", "id"], ["facultyName", "name"]))
            .filter((item) => item.id != null),
        );
      } else {
        replaceMaster("faculty", []);
        setToast(apiError(facultyResult.reason));
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sch.date, sch.startTime, sch.endTime, editing]);
  useEffect(() => {
    const next = loc.state?.scheduleExamId;
    if (!isForm && next) {
      setExamId(String(next));
      setTab("schedule");
      loadSchedules(next);
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [isForm, loc, nav]);
  if (loading)
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
  const reset = (n, v) => {
    const nextContext = {
      boardId: n === "boardId" ? v : filters.boardId,
      yearId: n === "boardId" ? "" : n === "yearId" ? v : filters.yearId,
      levelId:
        n === "boardId" || n === "yearId" ? "" : n === "levelId" ? v : filters.levelId,
    };
    if (["boardId", "yearId", "levelId"].includes(n)) loadGroups(nextContext);
    if (n === "groupId") loadPrograms(v);
    setFilters((x) => ({
      ...x,
      [n]: v,
      ...(n === "boardId"
        ? { yearId: "", levelId: "", groupId: "", programId: "" }
        : n === "yearId"
          ? { levelId: "", groupId: "", programId: "" }
          : n === "levelId"
            ? { groupId: "", programId: "" }
            : n === "groupId"
              ? { programId: "" }
              : {}),
    }));
  };
  const list = exams.filter(
    (e) =>
      (!appliedFilters.boardId || String(e.boardId) === appliedFilters.boardId) &&
      (!appliedFilters.yearId || String(e.yearId) === appliedFilters.yearId) &&
      (!appliedFilters.levelId || String(e.levelId) === appliedFilters.levelId) &&
      (!appliedFilters.groupId || String(e.groupId) === appliedFilters.groupId) &&
      (!appliedFilters.programId || String(e.programId) === appliedFilters.programId) &&
      (!appliedFilters.type || e.type === appliedFilters.type) &&
      (!appliedFilters.status || e.status === appliedFilters.status) &&
      (!search || `${e.code} ${e.name}`.toLowerCase().includes(search.toLowerCase())),
  );
  const exam = exams.find((e) => String(e.id) === examId);
  const printSchedule = () => {
    const physicalRows = buildExportRows(
      exams.filter((item) => item.status === "SCHEDULED"),
      schedules,
    );
    if (!physicalRows.length)
      return setToast("No scheduled examinations are available to export.");
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
      <div className="exam-tabs">
        <button className={tab === "exams" ? "active" : ""} onClick={() => setTab("exams")}>
          Examinations
        </button>
        <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>
          Exam Schedule
        </button>
      </div>
      {tab === "exams" ? (
        <>
          <div className="exam-toolbar">
            <div>
              <h2>Examinations</h2>
              <p>Choose academic criteria, then check the matching examinations.</p>
            </div>
          </div>
          <Filters
            f={filters}
            change={reset}
            onCheck={() => {
              const next = { ...filters };
              setAppliedFilters(next);
              loadExaminations(next);
            }}
            onReset={() => {
              setFilters(initialFilters);
              setAppliedFilters(initialFilters);
            }}
          />
          <div className="cms-card">
            <div className="exam-table-toolbar">
              <div className="exam-search">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search examinations..."
                />
              </div>
              <div className="exam-toolbar-actions">
                <button className="cms-btn cms-btn-ghost exam-export-btn" onClick={printSchedule}>
                  <Printer size={15} /> Export
                </button>
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={() => nav("/dashboard/examinations/add")}
                >
                  <Plus size={16} /> Create Examination
                </button>
              </div>
            </div>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead>
                  <tr>
                    <th>Exam Code</th>
                    <th>Exam Name</th>
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
                  {list.length ? (
                    list.map((e) => (
                      <tr key={e.id}>
                        <td className="cms-strong">{e.code}</td>
                        <td>{e.name}</td>
                        <td>{nameOf(YEARS, e.yearId)}</td>
                        <td>{nameOf(LEVELS, e.levelId)}</td>
                        <td>{nameOf(GROUPS, e.groupId)}</td>
                        <td>{nameOf(PROGRAMS, e.programId)}</td>
                        <td>{e.type}</td>
                        <td>
                          {d(e.startDate)}
                          <small className="exam-muted">to {d(e.endDate)}</small>
                        </td>
                        <td>
                          <StatusBadge value={e.status} />
                        </td>
                        <td>
                          <div className="cms-actions">
                            <button
                              className="cms-action-btn view"
                              title="View"
                              onClick={async () => {
                                try {
                                  const response = await apiClient.get(EXAM_API.byId(e.id));
                                  setDetail(normalizeExamination(response.data?.data ?? response.data));
                                } catch (error) {
                                  setToast(apiError(error));
                                }
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="cms-action-btn edit"
                              title="Edit"
                              disabled={!["DRAFT", "SCHEDULED"].includes(e.status)}
                              onClick={() => setEditingExam(e)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="cms-action-btn"
                              title="Schedule"
                              disabled={e.status !== "DRAFT"}
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
                            {e.status === "SCHEDULED" && (
                              <button
                                className="cms-action-btn"
                                title="Export examination"
                                onClick={() => {
                                  const rows = buildExportRows([e], schedules);
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
                                onClick={async () => {
                                  try {
                                    const response = await apiClient.patch(EXAM_API.cancel(e.id), {
                                      reason: "Cancelled from Examination Management",
                                      notifyStudents: false,
                                    });
                                    await loadExaminations();
                                    setToast(response.data?.message || "Examination cancelled.");
                                  } catch (error) {
                                    setToast(apiError(error));
                                  }
                                }}
                              >
                                <X size={15} />
                              </button>
                            )}
                            {e.status === "DRAFT" && !schedules.some((s) => s.examId === e.id) && (
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
                      <td colSpan="10">
                        <div className="cms-empty">No examinations match the current filters.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <button
            className="cms-btn cms-btn-ghost exam-back-btn"
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
              await Promise.all([loadSchedules(candidate.examId), loadExaminations()]);
              setToast(wasEditing ? "Schedule updated." : "Schedule saved.");
              setEditing(null);
              setSch(
                wasEditing || candidate.scheduleMode === "COMBINED"
                  ? emptySchedule()
                  : nextScheduleFromPrevious(candidate),
              );
              setErrors({});
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
                return setErrors({ form: "Select a valid Program, Exam Pattern and Exam Type." });
              const expected = subjectsFor(exam),
                records = schedules.filter((item) => String(item.examId) === String(exam.id));
              if (getScheduleMode(exam) !== "COMBINED") {
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
                      !getMarksConfig(exam, subject) ||
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
                const combinedRecords = records.filter((item) => item.scheduleMode === "COMBINED"),
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
                await Promise.all([loadExaminations(), loadSchedules(exam.id)]);
                setToast(response.data?.message || "Schedule finalized. Examination is now scheduled.");
              } catch (error) {
                setErrors((current) => ({ ...current, form: apiError(error) }));
              } finally {
                setFinalizing(false);
              }
            }}
          />
        </>
      )}
      {detail && <ExamDetails exam={detail} schedules={schedules} close={() => setDetail(null)} />}{" "}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          schedules={schedules}
          onClose={() => setEditingExam(null)}
          onSave={async (period) => {
            const updated = { ...editingExam, ...period };
            await apiClient.put(EXAM_API.byId(editingExam.id), {
              examCode: updated.code,
              examName: updated.name,
              boardId: Number(updated.boardId),
              academicYearId: Number(updated.yearId),
              academicLevelId: Number(updated.levelId),
              academicLevel: nameOf(LEVELS, updated.levelId, ""),
              groupId: Number(updated.groupId),
              programId: Number(updated.programId),
              assessmentTypeId: Number(updated.assessmentTypeId || 0),
              examType: updated.examType,
              startDate: updated.startDate,
              endDate: updated.endDate,
              examPattern: updated.examPattern || nameOf(EXAM_PATTERNS, updated.examPatternId, ""),
              examPatternId: String(updated.examPatternId || ""),
              totalMarks: Number(updated.totalMarks),
              passPercentage: Number(updated.passPercentage),
              description: updated.description || "",
              status: updated.status,
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
          onConfirm={async () => {
            try {
              await apiClient.delete(EXAM_API.byId(remove.id));
              await loadExaminations();
              if (String(examId) === String(remove.id)) setExamId("");
              setRemove(null);
              setToast("Draft examination deleted.");
            } catch (error) {
              setToast(apiError(error));
            }
          }}
        />
      )}
      {removeSchedule && (
        <ConfirmDialog
          title="Remove schedule"
          message={
            removeSchedule.scheduleMode === "COMBINED"
              ? "Remove this combined objective schedule? All included subject schedules will be removed."
              : `Remove the ${removeSchedule.subjectName} schedule?`
          }
          onCancel={() => setRemoveSchedule(null)}
          onConfirm={async () => {
            try {
              const targets =
                removeSchedule.scheduleMode === "COMBINED"
                  ? schedules.filter(
                      (item) =>
                        String(item.examId) === String(removeSchedule.examId) &&
                        item.sessionId === removeSchedule.sessionId,
                    )
                  : [removeSchedule];
              await Promise.all(
                targets.map((item) => apiClient.delete(EXAM_API.scheduleById(item.id))),
              );
              await Promise.all([
                loadSchedules(removeSchedule.examId),
                loadExaminations(),
              ]);
              setEditing(null);
              setRemoveSchedule(null);
              setToast("Schedule removed.");
            } catch (error) {
              setToast(apiError(error));
            }
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
      <PrintableSchedule preview={exportPreview} />
    </DashboardLayout>
  );
}
function Filters({ f, change, onCheck, onReset }) {
  const y = YEARS.filter(
      (x) => x.isActive && (x.boardId == null || Number(x.boardId) === Number(f.boardId)),
    ),
    l = LEVELS,
    g = GROUPS,
    p = PROGRAMS;
  return (
    <div className="cms-card exam-filters">
      <div className="exam-filter-grid">
        <Select
          label="Board"
          value={f.boardId}
          onChange={(v) => change("boardId", v)}
          options={BOARDS}
        />
        <Select
          label="Academic Year"
          value={f.yearId}
          disabled={!f.boardId}
          onChange={(v) => change("yearId", v)}
          options={y}
        />
        <Select
          label="Academic Level"
          value={f.levelId}
          disabled={!f.yearId}
          onChange={(v) => change("levelId", v)}
          options={l}
        />
        <Select
          label="Group"
          value={f.groupId}
          disabled={!f.levelId}
          onChange={(v) => change("groupId", v)}
          options={g}
        />
        <Select
          label="Program"
          value={f.programId}
          disabled={!f.groupId}
          onChange={(v) => change("programId", v)}
          options={p}
        />
        <Select
          label="Exam Type"
          value={f.type}
          onChange={(v) => change("type", v)}
          options={TYPES}
        />
        <Select
          label="Status"
          value={f.status}
          onChange={(v) => change("status", v)}
          options={["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"]}
        />
      </div>
      <div className="exam-filter-actions">
        <button className="cms-btn cms-btn-ghost" type="button" onClick={onReset}>
          Reset
        </button>
        <button className="cms-btn cms-btn-primary" type="button" onClick={onCheck}>
          Check Examinations
        </button>
      </div>
    </div>
  );
}
function ExamForm({ exams, schedules, editId, onSave, onAcademicChange, onGroupChange }) {
  const nav = useNavigate(),
    existing = exams.find((e) => String(e.id) === String(editId)),
    [form, setForm] = useState(() =>
      existing
        ? { ...existing, programId: String(existing.programId) }
        : emptyExam(),
    ),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false),
    locked = !!(existing && schedules.some((s) => s.examId === existing.id));
  const change = (n, v) => {
      const nextContext = {
        boardId: n === "boardId" ? v : form.boardId,
        yearId: n === "boardId" ? "" : n === "yearId" ? v : form.yearId,
        levelId:
          n === "boardId" || n === "yearId" ? "" : n === "levelId" ? v : form.levelId,
      };
      if (["boardId", "yearId", "levelId"].includes(n)) onAcademicChange(nextContext);
      if (n === "groupId") onGroupChange(v);
      setForm((x) => ({
        ...x,
        [n]: v,
        ...(n === "boardId"
          ? { yearId: "", levelId: "", groupId: "", programId: "", examPatternId: "", examType: "" }
          : n === "yearId"
            ? { levelId: "", groupId: "", programId: "", examPatternId: "", examType: "" }
            : n === "levelId"
              ? { groupId: "", programId: "", examPatternId: "", examType: "" }
              : n === "groupId"
                ? { programId: "", examPatternId: "", examType: "" }
                : n === "programId"
                  ? { examPatternId: "", examType: "" }
                  : n === "examPatternId"
                    ? { examType: "" }
                    : {}),
      }));
    },
    y = YEARS.filter(
      (x) => x.isActive && (x.boardId == null || Number(x.boardId) === Number(form.boardId)),
    ),
    l = LEVELS,
    g = GROUPS,
    p = PROGRAMS,
    patterns = patternsForProgram(form.programId),
    pattern = EXAM_PATTERNS.find((item) => String(item.id) === String(form.examPatternId));
  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const x = {};
    [
      "name",
      "boardId",
      "yearId",
      "levelId",
      "groupId",
      "programId",
      "examPatternId",
      "examType",
      "startDate",
      "endDate",
    ].forEach((k) => {
      if (!String(form[k] || "").trim())
        x[k] = k === "programId" ? "Please select a Program." : "Required";
    });
    const configurationError = validateExamConfiguration(form);
    if (configurationError) x.examPatternId = configurationError;
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
      exams.some(
        (q) =>
          q.id !== existing?.id &&
          q.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
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
        (s) => s.examId === existing.id && (s.date < form.startDate || s.date > form.endDate),
      )
    )
      x.endDate =
        "The new examination period excludes existing scheduled subjects. Update those schedules first.";
    if (Object.keys(x).length) return setErrors(x);
    setSaving(true);
    try {
      const payload = {
        examCode: form.code.trim(),
        examName: form.name.trim(),
        boardId: Number(form.boardId),
        academicYearId: Number(form.yearId),
        academicLevelId: Number(form.levelId),
        academicLevel: nameOf(LEVELS, form.levelId, ""),
        groupId: Number(form.groupId),
        programId: Number(form.programId),
        assessmentTypeId: form.assessmentTypeId ? Number(form.assessmentTypeId) : 0,
        examType: form.examType,
        startDate: form.startDate,
        endDate: form.endDate,
        examPattern: pattern?.name ?? form.examPattern ?? "",
        examPatternId: String(form.examPatternId ?? ""),
        totalMarks: Number(form.totalMarks),
        passPercentage: Number(form.passPercentage),
        description: form.description.trim(),
        status: existing?.status ?? "DRAFT",
        ...(!existing ? { allocatedSubjectIds: [] } : {}),
      };
      const response = existing
        ? await apiClient.put(EXAM_API.byId(existing.id), payload)
        : await apiClient.post(EXAM_API.list, payload);
      const record = normalizeExamination(response.data?.data ?? response.data);
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
      subtitle="Board → Academic Year → Academic Level → Group → Program"
      breadcrumb={["Examinations"]}
    >
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
                  onChange={(v) => change("programId", v)}
                  options={p}
                  error={errors.programId}
                />
                <Select
                  label="Exam Pattern *"
                  value={form.examPatternId}
                  disabled={saving || locked || !form.programId}
                  onChange={(v) => change("examPatternId", v)}
                  options={patterns}
                  error={errors.examPatternId}
                />
                <Select
                  label="Exam Type *"
                  value={form.examType}
                  disabled={saving || locked || !form.examPatternId}
                  onChange={(v) => change("examType", v)}
                  options={pattern?.allowedExamTypes || []}
                  error={errors.examType}
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
                <Field label="Exam Code" value={form.code} readOnly />
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
                />
              </div>
            </section>
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
                {saving ? "Saving..." : existing ? "Update Examination" : "Save Examination"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
function Schedule({
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
  onRemove,
  finalize,
  finalizing,
}) {
  const [savingSchedule, setSavingSchedule] = useState(false),
    entries = exam ? schedules.filter((s) => String(s.examId) === String(exam.id)) : [],
    combined = getScheduleMode(exam) === "COMBINED",
    included = subjectsFor(exam),
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
    candidate = getCandidateSchedule(sch, exam, editing, currentSessionId),
    faculty = getEligibleInvigilators(candidate, schedules),
    rooms = getAvailableRooms(candidate, schedules);
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
      setSch((current) => (current.mode === "Objective" ? current : { ...current, mode: "Objective" }));
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
    if (combined && !included.length)
      x.form = "No eligible subjects are configured for this examination.";
    if (sch.startTime && sch.endTime && sch.startTime >= sch.endTime)
      x.endTime = "End time must be after start time.";
    if (exam && sch.date && (sch.date < exam.startDate || sch.date > exam.endDate))
      x.date = "Exam date must be within the examination period.";
    if (
      combined &&
      entries.some((s) => s.scheduleMode === "COMBINED" && s.sessionId !== currentSessionId)
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
    if (
      !combined &&
      sch.date &&
      entries.some(
        (existing) =>
          String(existing.id) !== String(editing) && existing.date === sch.date,
      )
    )
      x.date =
        "Another subject is already scheduled on this date for this examination. Please select a different exam date.";
    if (hasHallConflict(candidate, schedules))
      x.roomId = "This hall is already in use during the selected time.";
    if (hasInvigilatorConflict(candidate, schedules))
      x.invigilatorId = "This invigilator is already assigned during the selected time.";
    const selectedSubjects = combined
      ? included
      : [SUBJECTS.find((s) => String(s.id) === String(sch.subjectId))];
    if (selectedSubjects.some((subject) => !getMarksConfig(exam, subject)))
      x.form = "Marks configuration is unavailable for this subject and examination type.";
    if (Object.keys(x).length) return setErrors(x);
    const savedSessionId = combined
      ? currentSessionId || createCombinedSessionId(exam.id)
      : "";
    const make = (subject) => {
      const marks = getMarksConfig(exam, subject);
      return {
        ...sch,
        id: editing && !combined ? editing : Date.now() + subject.id,
        examId: exam.id,
        scheduleMode: combined ? "COMBINED" : "SUBJECT_WISE",
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
        selectedInvigilator = faculty.find(
          (item) => String(item.id) === String(sch.invigilatorId),
        ),
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
          ? entries.filter((item) => item.sessionId === savedSessionId)
          : entries.filter((item) => String(item.id) === String(editing));
        await Promise.all(
          targets.map((item) =>
            apiClient.put(EXAM_API.scheduleById(item.id), {
              ...commonPayload,
              subjectId: Number(item.subjectId),
              sessionId: item.sessionId || null,
              scheduleMode: item.scheduleMode,
              maxMarks: Number(item.maxMarks),
              passingMarks: Number(item.passingMarks),
            }),
          ),
        );
      } else if (combined) {
        await apiClient.post(EXAM_API.batchSchedules, {
          ...commonPayload,
          examinationId: Number(exam.id),
          subjectIds: included.map((subject) => Number(subject.id)),
          sessionId: savedSessionId,
          scheduleMode: "COMBINED",
          maxMarks: Number(exam.totalMarks),
          passingMarks: Math.ceil(
            (Number(exam.totalMarks) * Number(exam.passPercentage)) / 100,
          ),
        });
      } else {
        const subject = selectedSubjects[0],
          marks = getMarksConfig(exam, subject);
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
                      disabled={savingSchedule || !faculty.length || !rooms.length}
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
              <ScheduleTable entries={entries} canEdit={canEdit} edit={onEdit} remove={onRemove} />
              {canEdit && (
                <div className="exam-finalize">
                  <span>
                    {entries.length} of {included.length} eligible subjects scheduled
                  </span>
                  <button
                    className="cms-btn cms-btn-primary"
                    disabled={finalizing}
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
function ScheduleTable({ entries, canEdit, edit, remove }) {
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
                <td>{nameOf(ROOMS, s.roomId)}</td>
                <td>{nameOf(FACULTY, s.invigilatorId)}</td>
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
function ExamDetails({ exam, schedules, close }) {
  const entries = schedules.filter((s) => s.examId === exam.id);
  return (
    <Modal title="Examination Details" onClose={close}>
      <section className="exam-view-summary">
        <strong>{exam.name}</strong>
        <p>
          {nameOf(BOARDS, exam.boardId)} · {nameOf(YEARS, exam.yearId)} ·{" "}
          {nameOf(LEVELS, exam.levelId)} · {nameOf(GROUPS, exam.groupId)} ·{" "}
          {nameOf(PROGRAMS, exam.programId)}
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
      <CompactScheduleTable entries={entries} />
    </Modal>
  );
}
function CompactScheduleTable({ entries }) {
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
                <td>{nameOf(ROOMS, s.roomId)}</td>
                <td>{nameOf(FACULTY, s.invigilatorId)}</td>
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
function EditExamModal({ exam, schedules, onClose, onSave }) {
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
      await new Promise((resolve) => requestAnimationFrame(resolve));
      onSave(form);
    } finally {
      setSaving(false);
    }
  };
  const details = [
    ["Exam Name", exam.name],
    ["Exam Code", exam.code],
    ["Board", nameOf(BOARDS, exam.boardId)],
    ["Academic Year", nameOf(YEARS, exam.yearId)],
    ["Academic Level", nameOf(LEVELS, exam.levelId)],
    ["Group", nameOf(GROUPS, exam.groupId)],
    ["Program", nameOf(PROGRAMS, exam.programId)],
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ExportPreviewModal({ preview, onClose }) {
  const hasRows = preview.rows.length > 0;
  const handleDownloadPdf = () => {
    if (!hasRows) return;
    const previousTitle = document.title;
    document.title = `${sanitizeFileName(preview.title)}.pdf`;
    try {
      window.print();
    } finally {
      document.title = previousTitle;
    }
  };
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
          className="cms-btn cms-btn-ghost"
          disabled={!hasRows}
          onClick={handleDownloadExcel}
        >
          Download Excel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={!hasRows}
          onClick={handleDownloadPdf}
        >
          Download PDF
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
  ["Group", "groupName"],
  ["Hall / Room", "hallName"],
  ["Invigilator", "invigilatorName"],
  ["Exam Date", "examDate", d],
  ["Exam Time", "examTime"],
];
function formatExportValue(row, [, key, format]) {
  return format ? format(row[key]) : row[key] ?? "-”";
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
    Object.fromEntries(
      EXPORT_COLUMNS.map((column) => [column[0], formatExportValue(row, column)]),
    ),
  );
  const worksheet = XLSX.utils.json_to_sheet(excelRows, {
    header: EXPORT_COLUMNS.map(([label]) => label),
  });
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 36 },
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 32 },
    { wch: 16 },
    { wch: 20 },
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
        <tr>{EXPORT_COLUMNS.map(([label]) => <th key={label}>{label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.examId}-${row.sessionId || row.subjectName}-${index}`}>
            {EXPORT_COLUMNS.map(([label, key, format]) => (
              <td key={label}>{format ? format(row[key]) : row[key] ?? "—"}</td>
            ))}
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
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label>{label}</label>
      <select value={value ?? ""} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
        <option value="">{placeholder || `Select ${label.replace(" *", "")}`}</option>
        {options.map((x) => {
          const o = typeof x === "string" ? { id: x, name: x } : x;
          return (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          );
        })}
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
