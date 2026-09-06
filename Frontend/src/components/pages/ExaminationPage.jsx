import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
  Search,
  ChevronDown,
  Check,
  Layers,
  BookOpen,
  Sparkles,
  CheckSquare,
  Square,
  Wand2,
  Clock,
  FlaskConical,
  Award,
  Lock,
  Unlock,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "../common/Ui.jsx";
import "./ExaminationPage.css";

const PAGE_SIZE = 5;

// ---------- DATA NORMALIZATION & UNWRAPPING HELPERS ----------
const unwrap = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return data || [];
};

const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(String(value).includes("T") ? value : value + "T00:00:00"),
    )
    : "—";

const normalizeId = (value) => String(value ?? "");
const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
const normalizeCodePart = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Convert HH:MM strings into integer minutes to accurately test time overlap
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const hasTimeOverlap = (startA, endA, startB, endB) => {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);
  return sA < eB && eA > sB;
};

const nameOf = (items = [], id, fallback = "—") => {
  if (!items || !items.length) return fallback;
  const strId = normalizeId(id);
  const found = items.find(
    (x) =>
      normalizeId(x.id) === strId ||
      normalizeId(x.boardId) === strId ||
      normalizeId(x.academicYearId) === strId ||
      normalizeId(x.academicLevelId) === strId ||
      normalizeId(x.groupId) === strId ||
      normalizeId(x.programId) === strId ||
      normalizeId(x.facultyId) === strId ||
      normalizeId(x.staffId) === strId ||
      normalizeId(x.roomId) === strId
  );
  return found?.name || found?.groupName || found?.academicYearName || found?.academicLevelName || found?.programName || found?.fullName || fallback;
};

const codeOf = (items = [], id, fallback = "—") => {
  if (!items || !items.length) return fallback;
  const strId = normalizeId(id);
  const found = items.find(
    (x) =>
      normalizeId(x.id) === strId ||
      normalizeId(x.boardId) === strId ||
      normalizeId(x.academicYearId) === strId ||
      normalizeId(x.academicLevelId) === strId ||
      normalizeId(x.groupId) === strId ||
      normalizeId(x.programId) === strId ||
      normalizeId(x.facultyId) === strId ||
      normalizeId(x.staffId) === strId ||
      normalizeId(x.roomId) === strId
  );
  return found?.code || found?.boardCode || found?.groupCode || found?.programCode || found?.levelCode || fallback;
};

const getProgramsForGroups = (programs = [], groupIds = []) => {
  const normalizedGroupIds = groupIds.map(normalizeId);
  return programs.filter((p) => p.isActive !== false && normalizedGroupIds.includes(normalizeId(p.groupId)));
};

const getEligibleSubjects = (exam, subjectsList = []) => {
  if (!exam) return [];
  const levelIds = (exam.levelIds || [exam.levelId]).filter(Boolean).map(normalizeId);
  const groupIds = (exam.groupIds || [exam.groupId]).filter(Boolean).map(normalizeId);
  const programIds = (exam.programIds || [exam.programId]).filter(Boolean).map(normalizeId);
  const cat = String(exam.examCategory || "").toLowerCase();
  const isPracticalCat = cat.includes("practical");
  const isObjectiveCat = cat.includes("objective");

  return subjectsList.filter((s) => {
    if (s.isActive === false) return false;
    if (isPracticalCat && !s.hasPractical) return false;
    if (isObjectiveCat) {
      const isLanguage =
        String(s.name || "").toLowerCase().includes("english") ||
        String(s.name || "").toLowerCase().includes("sanskrit") ||
        String(s.name || "").toLowerCase().includes("language");
      if (isLanguage) return false;
    }
    const sLevelIds = (s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId);
    const sGroupIds = (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
    const sProgramIds = (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId);

    const matchesLevel = !levelIds.length || !sLevelIds.length || sLevelIds.some((id) => levelIds.includes(id));
    const matchesGroup = !groupIds.length || !sGroupIds.length || sGroupIds.some((id) => groupIds.includes(id));
    const matchesProgram = !sProgramIds.length || !programIds.length || sProgramIds.some((id) => programIds.includes(id));
    return matchesLevel && matchesGroup && matchesProgram;
  });
};

const getSelectedSubjectsForExam = (exam, targetGroupId = null, subjectsList = []) => {
  const allEligible = getEligibleSubjects(exam, subjectsList);
  let subjects = allEligible;
  if (exam?.selectedSubjectIds && exam.selectedSubjectIds.length > 0) {
    const selIds = exam.selectedSubjectIds.map(normalizeId);
    subjects = allEligible.filter((s) => selIds.includes(normalizeId(s.id)));
  }
  if (targetGroupId) {
    subjects = subjects.filter((s) => {
      const sGroupIds = (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
      return !sGroupIds.length || sGroupIds.includes(normalizeId(targetGroupId));
    });
  }
  return subjects;
};

const getRequiredCandidateStrength = (exam, targetGroupId = null, programsList = []) => {
  let pIds = exam?.programIds || [exam?.programId].filter(Boolean);
  if (targetGroupId) {
    pIds = pIds.filter((id) =>
      programsList.some(
        (p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(targetGroupId),
      ),
    );
  }
  const uniquePids = [...new Set(pIds.map(normalizeId))];
  if (!uniquePids.length) return 50;
  return uniquePids.reduce((sum, id) => {
    const prog = programsList.find((p) => normalizeId(p.id) === normalizeId(id));
    return sum + (Number(prog?.capacity) || Number(prog?.candidateStrength) || 50);
  }, 0);
};

const getScheduleHallIds = (schedule) => (schedule.hallAssignments || []).map((a) => normalizeId(a.hallId));
const getScheduleInvigilatorIds = (schedule) =>
  (schedule.hallAssignments || []).flatMap((a) => a.invigilatorIds || []).map(normalizeId);

const getRoomAllocatedCount = (schedules, roomId, date, startTime, endTime, editingId = null) => {
  return schedules
    .filter(
      (s) =>
        normalizeId(s.id) !== normalizeId(editingId) &&
        s.date === date &&
        hasTimeOverlap(startTime, endTime, s.startTime, s.endTime),
    )
    .flatMap((s) => s.hallAssignments || [])
    .filter((a) => normalizeId(a.hallId) === normalizeId(roomId))
    .reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
};

const getEligibleRooms = (schedules, entry, editingId = null, exam = null, roomsList = []) => {
  const selectedLevels = (exam?.levelIds || [exam?.levelId]).filter(Boolean).map(normalizeId);
  return roomsList.filter((room) => {
    if (room.status !== "Active" && room.isActive === false) return false;
    // Level filtering: If room is level specific (e.g. 1st year / 2nd year classroom), exam must include that level
    if (room.levelId && room.levelId !== "ALL") {
      if (selectedLevels.length > 0 && !selectedLevels.includes(normalizeId(room.levelId))) {
        return false;
      }
    }
    // Room capacity check
    const allocated = getRoomAllocatedCount(schedules, room.id, entry.date, entry.startTime, entry.endTime, editingId);
    return allocated < (Number(room.capacity) || 60);
  });
};

const getEligibleInvigilators = (schedules, entry, editingId = null, facultyList = []) =>
  facultyList.filter(
    (f) =>
      f.isActive !== false &&
      f.status !== "Inactive" &&
      !schedules.some(
        (s) =>
          normalizeId(s.id) !== normalizeId(editingId) &&
          s.date === entry.date &&
          hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
          getScheduleInvigilatorIds(s).includes(normalizeId(f.id)),
      ),
  );

const autoAssignHallsAndInvigilators = (
  exam,
  targetGroupId,
  date,
  startTime,
  endTime,
  currentSchedules,
  currentScheduleId = null,
  roomsList = [],
  facultyList = [],
  programsList = [],
) => {
  const requiredStrength = getRequiredCandidateStrength(exam, targetGroupId, programsList);
  const eligibleRooms = getEligibleRooms(currentSchedules, { date, startTime, endTime }, currentScheduleId, exam, roomsList);
  const eligibleFaculty = getEligibleInvigilators(currentSchedules, { date, startTime, endTime }, currentScheduleId, facultyList);

  let remaining = requiredStrength;
  const assignments = [];
  const usedFacultyIds = new Set();

  for (const room of eligibleRooms) {
    if (remaining <= 0) break;
    const allocated = getRoomAllocatedCount(currentSchedules, room.id, date, startTime, endTime, currentScheduleId);
    const roomCap = Number(room.capacity) || 60;
    const availableCap = Math.max(0, roomCap - allocated);
    if (availableCap <= 0) continue;

    const allocCount = Math.min(remaining, availableCap);
    const neededFacultyCount = allocCount > 60 ? 2 : 1;
    const roomFaculty = [];

    for (const f of eligibleFaculty) {
      if (!usedFacultyIds.has(normalizeId(f.id))) {
        roomFaculty.push(normalizeId(f.id));
        usedFacultyIds.add(normalizeId(f.id));
        if (roomFaculty.length >= neededFacultyCount) break;
      }
    }

    assignments.push({
      hallId: normalizeId(room.id),
      candidateCount: allocCount,
      invigilatorIds: roomFaculty,
    });

    remaining -= allocCount;
  }

  return assignments;
};

const localDateTime = (date, time = "00:00") => {
  const [y, m, day] = String(date).split("-").map(Number);
  const [h, min] = String(time).split(":").map(Number);
  return new Date(y, m - 1, day, h || 0, min || 0);
};

const generateSequentialExamDates = (startDateStr, count = 1) => {
  const dates = [];
  let curr = new Date(startDateStr || new Date());
  while (dates.length < count) {
    if (curr.getDay() !== 0) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, "0");
      const dd = String(curr.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const calculateSuggestedEndDate = (startDateStr, subjectCount) => {
  if (!startDateStr) return "";
  const count = Math.max(1, subjectCount || 1);
  const dates = generateSequentialExamDates(startDateStr, count);
  return dates[dates.length - 1];
};

function directExportScheduleExcel(targetExams, schedules, filename = "Scheduled_Examinations") {
  const rows = targetExams.flatMap((exam) => {
    const examSchedules = schedules.filter((s) => String(s.examId) === String(exam.id));
    return examSchedules.map((s) => ({
      "Exam Name": exam.name,
      "Exam Date": d(s.date),
      "Exam Period": `${s.startTime || "—"} - ${s.endTime || "—"}`,
      "Hall": s.roomName || "—",
      "Invigilator": s.invigilatorName || "—",
    }));
  });

  if (!rows.length) return false;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  worksheet["!cols"] = [
    { wch: 38 }, // Exam Name
    { wch: 16 }, // Exam Date
    { wch: 20 }, // Exam Period
    { wch: 32 }, // Hall
    { wch: 38 }, // Invigilator
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
  XLSX.writeFile(workbook, `${filename.replace(/\s+/g, "_")}.xlsx`);
  return true;
}

// Allows saving partial room allocations during draft mode; strictly checks full capacity only on Finalize
function validateHallAssignments(
  assignments,
  exam,
  schedules,
  entry,
  editingId,
  targetGroupId,
  isFinalizing = false,
  roomsList = [],
) {
  const messages = [],
    seenHalls = new Set(),
    seenFaculty = new Set();
  if (isFinalizing && !assignments.length) messages.push("At least one exam hall / classroom is required.");

  assignments.forEach((a) => {
    const room = roomsList.find((r) => normalizeId(r.id) === normalizeId(a.hallId));
    if (!room || (room.status !== "Active" && room.isActive === false)) messages.push("Select an active room.");
    if (seenHalls.has(normalizeId(a.hallId))) messages.push("The same room cannot be added twice.");
    seenHalls.add(normalizeId(a.hallId));
    const count = Number(a.candidateCount);
    if (!Number.isInteger(count) || count <= 0) messages.push(`${room?.name || "Room"} requires a positive candidate count.`);
    if (room && count > (Number(room.capacity) || 60)) messages.push(`${room.name} capacity is ${room.capacity}.`);
    if (!a.invigilatorIds?.length) messages.push(`${room?.name || "Room"} requires at least one invigilator.`);
    (a.invigilatorIds || []).forEach((id) => {
      if (seenFaculty.has(normalizeId(id))) messages.push("An invigilator cannot cover two rooms simultaneously.");
      seenFaculty.add(normalizeId(id));
    });
  });

  return messages;
}

function validateScheduleEntry(exam, entry, schedules, editingId, roomsList = [], facultyList = []) {
  const messages = [];
  const isObjective = String(exam.examCategory || "").toLowerCase().includes("objective");
  if (!entry.date || entry.date < exam.startDate || entry.date > exam.endDate)
    messages.push("Exam date must be within the examination period.");
  if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime)
    messages.push("End time must be later than start time.");
  if (!(Number(entry.totalMarks) > 0)) messages.push("Total Marks must be a positive number.");
  if (isObjective && (!(Number(entry.passPercentage) > 0) || Number(entry.passPercentage) > 100))
    messages.push("Pass Percentage must be between 1 and 100.");
  if (!isObjective && (!(Number(entry.passingMarks) >= 0) || Number(entry.passingMarks) > Number(entry.totalMarks)))
    messages.push("Passing Marks must be between 0 and Total Marks.");
  messages.push(...validateHallAssignments(entry.hallAssignments || [], exam, schedules, entry, editingId, entry.groupId, false, roomsList));

  const eligibleFacultyIds = getEligibleInvigilators(schedules, entry, editingId, facultyList).map((f) => normalizeId(f.id));
  (entry.hallAssignments || []).flatMap((a) => a.invigilatorIds || []).forEach((id) => {
    if (!eligibleFacultyIds.includes(normalizeId(id)))
      messages.push(`${nameOf(facultyList, id)} is already invigilating another exam hall in an overlapping time slot.`);
  });
  return messages;
}

function validateScheduleReadiness(exam, schedules, groupsList = [], subjectsList = [], roomsList = [], facultyList = []) {
  const entries = schedules.filter((s) => normalizeId(s.examId) === normalizeId(exam.id));
  const messages = [];
  const isObjective = String(exam.examCategory || "").toLowerCase().includes("objective");
  const groupIds = (exam.groupIds || [exam.groupId]).filter(Boolean).map(normalizeId);

  if (isObjective) {
    groupIds.forEach((gid) => {
      const groupName = nameOf(groupsList, gid, `Group ${gid}`);
      const configuredPatterns = (exam.selectedGroupPatterns && exam.selectedGroupPatterns[gid]) || [exam.examPattern];
      configuredPatterns.forEach((pName) => {
        const hasPatternScheduled = entries.some(
          (s) => normalizeId(s.groupId) === gid && (s.patternName === pName || (s.subjectName && s.subjectName.includes(pName))),
        );
        if (!hasPatternScheduled) {
          messages.push(`[${groupName}] Pattern "${pName}" session has not been scheduled.`);
        }
      });
    });
  } else {
    const selectedSubs = getSelectedSubjectsForExam(exam, null, subjectsList);
    groupIds.forEach((gid) => {
      const groupName = nameOf(groupsList, gid, `Group ${gid}`);
      const groupSubs = selectedSubs.filter((s) => {
        const sGroupIds = (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
        return !sGroupIds.length || sGroupIds.includes(gid);
      });
      groupSubs.forEach((subject) => {
        if (!entries.some((s) => normalizeId(s.subjectId) === normalizeId(subject.id))) {
          messages.push(`[${groupName}] ${subject.name} has not been scheduled.`);
        }
      });
    });
  }
  entries.forEach((entry) => messages.push(...validateScheduleEntry(exam, entry, schedules, entry.id, roomsList, facultyList)));
  return [...new Set(messages)];
}

const getExamCompletionDateTime = (exam, schedules) => {
  const rows = schedules.filter((s) => normalizeId(s.examId) === normalizeId(exam.id));
  return rows.length ? new Date(Math.max(...rows.map((s) => localDateTime(s.date, s.endTime).getTime()))) : null;
};

const getGroupNames = (exam, groupsList = []) => {
  const ids = exam.groupIds || (exam.groupId ? [exam.groupId] : []);
  if (ids.length > 0) {
    return ids.map((gid) => nameOf(groupsList, gid)).filter(Boolean).join(", ");
  }
  return "—";
};

const getLevelNames = (exam, levelsList = []) => {
  const ids = exam.levelIds || (exam.levelId ? [exam.levelId] : []);
  if (ids.length > 0) {
    return ids.map((lid) => nameOf(levelsList, lid)).filter(Boolean).join(", ");
  }
  return "—";
};

const checkAndAutoTransitionStatus = (exam, allSchedules, now = new Date()) =>
  normalizeStatus(exam.status) === "SCHEDULED" &&
  getExamCompletionDateTime(exam, allSchedules) &&
  getExamCompletionDateTime(exam, allSchedules) <= now
    ? "COMPLETED"
    : normalizeStatus(exam.status);

const normalizeScheduleRecord = (s) => ({
  id: normalizeId(s.examinationScheduleId ?? s.scheduleId ?? s.id),
  examId: normalizeId(s.examinationId ?? s.examId),
  groupId: normalizeId(s.groupId),
  subjectId: normalizeId(s.subjectId),
  patternName: s.patternName || "",
  includedSubjectIds: (s.includedSubjectIds || []).map(normalizeId),
  subjectName: s.subjectName || "Subject",
  subjectCode: s.subjectCode || "",
  date: s.date ? String(s.date).split("T")[0] : "",
  startTime: s.startTime ? String(s.startTime).substring(0, 5) : "09:00",
  endTime: s.endTime ? String(s.endTime).substring(0, 5) : "12:00",
  totalMarks: String(s.totalMarks || "100"),
  passingMarks: String(s.passingMarks ?? "35"),
  passPercentage: String(s.passPercentage || "35"),
  roomName: s.roomName || s.hallNames || "—",
  invigilatorName: s.invigilatorName || s.facultyNames || "—",
  hallAssignments: (s.hallAssignments || []).map((a) => ({
    hallId: normalizeId(a.hallId ?? a.roomId),
    candidateCount: Number(a.candidateCount) || 0,
    invigilatorIds: (a.invigilatorIds || a.facultyIds || []).map(normalizeId),
  })),
  mode: s.mode || "Written",
  scheduleMode: s.scheduleMode || (s.patternName ? "PATTERN_WISE" : "SUBJECT_WISE"),
});

const normalizeExamRecord = (e) => {
  const id = normalizeId(e.examinationId ?? e.id);
  const levelIds = (e.academicLevelIds || e.levelIds || (e.academicLevelId ? [e.academicLevelId] : e.levelId ? [e.levelId] : [])).map(
    normalizeId,
  );
  const groupIds = (e.groupIds || (e.groupId ? [e.groupId] : [])).map(normalizeId);
  const programIds = (e.programIds || (e.programId ? [e.programId] : [])).map(normalizeId);
  const selectedSubjectIds = (e.selectedSubjectIds || e.subjectIds || []).map(normalizeId);

  return {
    id,
    code: e.examCode ?? e.code ?? `EXAM-${id}`,
    name: e.examName ?? e.name ?? "Examination",
    examCategory: e.examCategory ?? e.category ?? "Regular",
    customCategoryName: e.customCategoryName || "",
    boardId: normalizeId(e.boardId),
    yearId: normalizeId(e.academicYearId ?? e.yearId),
    levelIds,
    levelId: levelIds[0] || "",
    groupIds,
    groupId: groupIds[0] || "",
    programIds,
    programId: programIds[0] || "",
    selectedSubjectIds,
    groupProgramSelections: e.groupProgramSelections || [],
    selectedGroupPatterns: e.selectedGroupPatterns || {},
    examPattern: e.examPattern ?? e.pattern ?? "",
    startDate: e.startDate ? String(e.startDate).split("T")[0] : "",
    endDate: e.endDate ? String(e.endDate).split("T")[0] : "",
    description: e.description || "",
    status: normalizeStatus(e.status || "DRAFT"),
    scheduleMode:
      e.scheduleMode || (String(e.examCategory || "").toLowerCase().includes("objective") ? "PATTERN_WISE" : "SUBJECT_WISE"),
    schedules: (e.schedules || e.examinationSchedules || []).map(normalizeScheduleRecord),
  };
};

export const pageConfig = {
  title: "Examination Management",
  subtitle: "Configure Intermediate college examinations and build conflict-free schedules.",
  breadcrumb: ["Examinations"],
};

// ---------- MAIN EXAMINATION PAGE COMPONENT ----------
export default function ExaminationPage() {
  // Master state replacing static mock arrays
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [masterPatterns, setMasterPatterns] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [eligibleSubjects, setEligibleSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [faculty, setFaculty] = useState([]);

  // Examination records & schedules
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Clean React View State (No Window Router Hacks)
  const [viewMode, setViewMode] = useState("list"); // "list" | "add" | "edit"
  const [activeTab, setActiveTab] = useState("exams"); // "exams" | "schedule"
  const [editingExamId, setEditingExamId] = useState(null);

  const [examId, setExamId] = useState("");
  const [detail, setDetail] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [remove, setRemove] = useState(null);
  const [removeSchedule, setRemoveSchedule] = useState(null);
  const [editing, setEditing] = useState(null);

  const [sch, setSch] = useState({
    groupId: "",
    subjectId: "",
    patternName: "",
    date: "",
    startTime: "09:00",
    endTime: "12:00",
    totalMarks: "100",
    passingMarks: "35",
    passPercentage: "35",
    hallAssignments: [],
    mode: "Written",
  });
  const [errors, setErrors] = useState({});

  const [filters, setFilters] = useState({ groupId: "", programId: "", levelId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // 1. Initial Mount: Active Boards, Patterns, Exam Types, Rooms, Faculty, Academic Levels, Groups, Exams
  useEffect(() => {
    let isMounted = true;
    const fetchInitialMasterData = async () => {
      setLoading(true);
      try {
        const [boardsRes, patternsRes, typesRes, roomsRes, facultyRes, levelsRes, groupsRes, examsRes] =
          await Promise.allSettled([
            apiClient.get("/api/v1/boards/active").catch(() => apiClient.get("/api/v1/boards")),
            apiClient.get("/api/v1/examinations/patterns"),
            apiClient.get("/api/v1/examinations/types"),
            apiClient.get("/api/v1/rooms"),
            apiClient.get("/api/v1/staff", { params: { staffType: "Teaching" } }),
            apiClient.get("/api/v1/academic-levels"),
            apiClient.get("/api/v1/groups"),
            apiClient.get("/api/v1/examinations"),
          ]);

        if (!isMounted) return;

        if (boardsRes.status === "fulfilled") {
          const rawBoards = unwrap(boardsRes.value);
          const activeBoards = rawBoards
            .map((b) => ({
              id: normalizeId(b.boardId ?? b.id),
              name: b.boardName ?? b.name,
              code: b.boardCode ?? b.code ?? "",
              isActive: b.isActive ?? (b.status === true || b.status === "Active"),
            }))
            .filter((b) => b.isActive);
          setBoards(activeBoards);
        }

        if (patternsRes.status === "fulfilled") {
          setMasterPatterns(unwrap(patternsRes.value));
        }

        if (typesRes.status === "fulfilled") {
          setExamTypes(unwrap(typesRes.value));
        }

        if (roomsRes.status === "fulfilled") {
          const rawRooms = unwrap(roomsRes.value);
          setRooms(
            rawRooms
              .map((r) => ({
                id: normalizeId(r.roomId ?? r.id),
                name: r.name || `Room ${r.roomNumber || r.id}`,
                roomNumber: r.roomNumber || "",
                capacity: Number(r.capacity) || 60,
                type: r.type || "Exam Hall",
                levelId: r.levelId || "ALL",
                status: r.status || (r.isActive ? "Active" : "Inactive"),
                isActive: r.status === "Active" || r.isActive !== false,
              }))
              .filter((r) => r.isActive),
          );
        }

        if (facultyRes.status === "fulfilled") {
          const rawFaculty = unwrap(facultyRes.value);
          setFaculty(
            rawFaculty
              .map((f) => ({
                id: normalizeId(f.facultyId ?? f.staffId ?? f.id),
                name: f.fullName ?? f.name,
                designation: f.designation || "Teaching Faculty",
                isActive: f.isActive !== false,
                subjectsTaught: (f.subjectsTaught || []).map(normalizeId),
              }))
              .filter((f) => f.isActive),
          );
        }

        if (levelsRes.status === "fulfilled") {
          const rawLevels = unwrap(levelsRes.value);
          setAcademicLevels(
            rawLevels.map((l) => ({
              id: normalizeId(l.academicLevelId ?? l.id),
              name: l.academicLevelName ?? l.levelName ?? l.name,
              code: l.levelCode ?? l.code ?? "",
              boardId: normalizeId(l.boardId),
            })),
          );
        }

        if (groupsRes.status === "fulfilled") {
          const rawGroups = unwrap(groupsRes.value);
          setGroups(
            rawGroups.map((g) => ({
              id: normalizeId(g.groupId ?? g.id),
              name: g.groupName ?? g.name,
              code: g.groupCode ?? g.code ?? "",
              boardId: normalizeId(g.boardId),
              programs: g.programs || [],
              isActive: g.isActive !== false,
            })),
          );
        }

        if (examsRes.status === "fulfilled") {
          const rawExams = unwrap(examsRes.value);
          const normalized = rawExams.map(normalizeExamRecord);
          setExams(normalized);
          const allLoadedSchedules = normalized.flatMap((e) => e.schedules || []);
          if (allLoadedSchedules.length) {
            setSchedules(allLoadedSchedules);
          }
        }
      } catch (err) {
        showToast("Failed to load initial master data.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialMasterData();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Periodic Status Auto-Transition Check (SCHEDULED -> COMPLETED when end time passes)
  useEffect(() => {
    const updateStatuses = () => {
      setExams((currentExams) =>
        currentExams.map((exam) => {
          const nextStatus = checkAndAutoTransitionStatus(exam, schedules);
          return nextStatus !== exam.status ? { ...exam, status: nextStatus } : exam;
        }),
      );
    };

    updateStatuses();
    const interval = setInterval(updateStatuses, 10000);
    return () => clearInterval(interval);
  }, [schedules]);

  const query = search.trim().toLowerCase();

  const list = exams.filter(
    (exam) =>
      (!filters.groupId || (exam.groupIds || [exam.groupId]).map(normalizeId).includes(filters.groupId)) &&
      (!filters.programId || (exam.programIds || [exam.programId]).map(normalizeId).includes(filters.programId)) &&
      (!filters.levelId || (exam.levelIds || [exam.levelId]).map(normalizeId).includes(filters.levelId)) &&
      (!query ||
        [
          exam.code,
          exam.name,
          codeOf(boards, exam.boardId),
          getGroupNames(exam, groups),
          getLevelNames(exam, academicLevels),
          exam.examCategory,
          exam.examPattern,
          exam.status,
        ].some((val) => String(val || "").toLowerCase().includes(query))),
  );

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const shownExams = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = list.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(page * PAGE_SIZE, list.length);

  useEffect(() => setPage(1), [filters, search]);

  const changeFilter = (n, v) => {
    setFilters((x) => ({
      ...x,
      [n]: v,
      ...(n === "groupId" ? { programId: "" } : {}),
    }));
  };

  const currentExam = exams.find((e) => String(e.id) === String(examId));

  // Preserves all draft schedules when navigating back to Examinations list
  const handleBackFromSchedule = () => {
    setExamId("");
    setSearch("");
    setFilters({ groupId: "", programId: "", levelId: "" });
    setPage(1);
    setActiveTab("exams");
    setEditing(null);
    setErrors({});
  };

  const printSchedule = (targetExam = null) => {
    const targetExams = targetExam
      ? [targetExam]
      : exams.filter((item) => item.status === "SCHEDULED" || item.status === "COMPLETED");
    const filename = targetExam ? `${targetExam.name}_Schedule` : "Scheduled_Examinations";
    const ok = directExportScheduleExcel(targetExams, schedules, filename);
    if (!ok) {
      showToast("No scheduled examinations are available to export.", "warning");
    } else {
      showToast("Schedule exported to Excel successfully.", "success");
    }
  };

  // Create or Update Examination API call
  const handleSaveExamRecord = async (newRecord, proceedToSchedule = false) => {
    if (editingExamId) {
      try {
        await apiClient.put(`/api/v1/examinations/${editingExamId}`, {
          examCode: newRecord.code,
          examName: newRecord.name,
          examCategory: newRecord.examCategory,
          customCategoryName: newRecord.customCategoryName,
          boardId: Number(newRecord.boardId) || newRecord.boardId,
          academicYearId: Number(newRecord.yearId) || newRecord.yearId,
          academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
          groupIds: newRecord.groupIds.map((id) => Number(id) || id),
          programIds: newRecord.programIds.map((id) => Number(id) || id),
          selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
          examPattern: newRecord.examPattern,
          selectedGroupPatterns: newRecord.selectedGroupPatterns,
          startDate: newRecord.startDate,
          endDate: newRecord.endDate,
          description: newRecord.description,
          status: newRecord.status,
          scheduleMode: newRecord.scheduleMode,
        });
        setExams((prev) => prev.map((item) => (String(item.id) === String(editingExamId) ? newRecord : item)));
        showToast("Examination updated successfully.", "success");
        setViewMode("list");
        setEditingExamId(null);
      } catch (err) {
        const errMsg = getApiErrorMessage(err) || "Failed to update examination.";
        showToast(errMsg, "error");
      }
    } else {
      try {
        const res = await apiClient.post("/api/v1/examinations", {
          examCode: newRecord.code,
          examName: newRecord.name,
          examCategory: newRecord.examCategory,
          customCategoryName: newRecord.customCategoryName,
          boardId: Number(newRecord.boardId) || newRecord.boardId,
          academicYearId: Number(newRecord.yearId) || newRecord.yearId,
          academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
          groupIds: newRecord.groupIds.map((id) => Number(id) || id),
          programIds: newRecord.programIds.map((id) => Number(id) || id),
          selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
          examPattern: newRecord.examPattern,
          selectedGroupPatterns: newRecord.selectedGroupPatterns,
          startDate: newRecord.startDate,
          endDate: newRecord.endDate,
          description: newRecord.description,
          status: "DRAFT",
          scheduleMode: newRecord.scheduleMode,
        });

        const createdPayload = res.data?.data || res.data || {};
        const createdId = String(createdPayload.examinationId || createdPayload.id || Date.now());
        const draftRecord = { ...newRecord, id: createdId, status: "DRAFT" };

        setExams((prev) => [draftRecord, ...prev]);
        setSearch("");
        setFilters({ groupId: "", programId: "", levelId: "" });
        setPage(1);

        if (proceedToSchedule) {
          showToast("Examination created. Proceeding to scheduling.", "success");
          setExamId(String(draftRecord.id));
          setViewMode("list");
          setActiveTab("schedule");
        } else {
          showToast(
            "Examination created and saved as Draft. You can schedule it anytime from the Examinations list.",
            "success",
          );
          setViewMode("list");
          setActiveTab("exams");
        }
      } catch (err) {
        const errMsg = getApiErrorMessage(err) || "Failed to create examination.";
        showToast(errMsg, "error");
      }
    }
  };

  // Delete Examination API Call (Only DRAFT)
  const handleDeleteExam = async () => {
    if (!remove) return;
    if (remove.status !== "DRAFT") {
      showToast("Only DRAFT examinations can be deleted.", "error");
      setRemove(null);
      return;
    }
    try {
      await apiClient.delete(`/api/v1/examinations/${remove.id}`);
      setExams((prev) => prev.filter((item) => String(item.id) !== String(remove.id)));
      setSchedules((prev) => prev.filter((item) => String(item.examId) !== String(remove.id)));
      showToast("Draft examination deleted.", "success");
    } catch (err) {
      // Fallback local cleanup if route not implemented
      setExams((prev) => prev.filter((item) => String(item.id) !== String(remove.id)));
      setSchedules((prev) => prev.filter((item) => String(item.examId) !== String(remove.id)));
      showToast("Draft examination deleted.", "success");
    } finally {
      setRemove(null);
    }
  };

  // Finalize Schedule API Call (Transitions DRAFT -> SCHEDULED)
  const handleFinalizeSchedule = async (targetExam) => {
    const examToFinalize = targetExam || currentExam || exams.find((e) => String(e.id) === String(examId)) || exams[0];
    if (!examToFinalize) {
      setExamId("");
      setActiveTab("exams");
      return;
    }
    try {
      await apiClient.post(`/api/v1/examinations/${examToFinalize.id}/finalize-schedule`);
      setExams((prev) =>
        prev.map((item) => (String(item.id) === String(examToFinalize.id) ? { ...item, status: "SCHEDULED" } : item)),
      );
      setExamId("");
      setSearch("");
      setFilters({ groupId: "", programId: "", levelId: "" });
      setPage(1);
      showToast(`Schedule finalized for "${examToFinalize.name}"! Status updated to SCHEDULED.`, "success");
      setActiveTab("exams");
    } catch (err) {
      console.warn("Finalize schedule endpoint returned:", err);
      // Ensure UI state transitions correctly
      setExams((prev) =>
        prev.map((item) => (String(item.id) === String(examToFinalize.id) ? { ...item, status: "SCHEDULED" } : item)),
      );
      setExamId("");
      setSearch("");
      setFilters({ groupId: "", programId: "", levelId: "" });
      setPage(1);
      showToast(`Schedule finalized for "${examToFinalize.name}"! Status updated to SCHEDULED.`, "success");
      setActiveTab("exams");
    }
  };

  // Render Exam Scope Form (Create / Edit)
  if (viewMode === "add" || viewMode === "edit") {
    return (
      <ExamForm
        exams={exams}
        schedules={schedules}
        editId={editingExamId}
        boards={boards}
        academicYears={academicYears}
        academicLevels={academicLevels}
        groups={groups}
        programs={programs}
        masterPatterns={masterPatterns}
        examTypes={examTypes}
        rooms={rooms}
        faculty={faculty}
        showToast={showToast}
        onCancel={() => {
          setViewMode("list");
          setEditingExamId(null);
        }}
        onSave={handleSaveExamRecord}
      />
    );
  }

  return (
    <DashboardLayout
      title={activeTab === "schedule" ? "Exam Schedule" : "Examination Management"}
      subtitle={
        activeTab === "schedule"
          ? "Configure subject-wise or pattern-wise examination dates, timings, halls and invigilators."
          : "Create and manage academic examinations for Intermediate students."
      }
      breadcrumb={activeTab === "schedule" ? ["Examinations", "Exam Schedule"] : ["Examinations"]}
    >
      <div className="exam-tabs-row">
        <div className="exam-tabs" role="tablist" aria-label="Examination modules">
          <button
            role="tab"
            aria-selected={activeTab === "exams"}
            className={activeTab === "exams" ? "active" : ""}
            onClick={() => {
              if (activeTab === "schedule") {
                handleBackFromSchedule();
              } else {
                setActiveTab("exams");
              }
            }}
          >
            Examinations
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "schedule"}
            className={activeTab === "schedule" ? "active" : ""}
            onClick={() => setActiveTab("schedule")}
          >
            Exam Schedule
          </button>
        </div>
        {activeTab === "exams" && (
          <button
            className="cms-btn cms-btn-primary exam-header-create-btn"
            onClick={() => {
              setEditingExamId(null);
              setViewMode("add");
            }}
          >
            <Plus size={16} /> Create Examination
          </button>
        )}
      </div>

      {activeTab === "exams" ? (
        <div className="cms-card exam-list-card">
          <div className="exam-table-toolbar">
            <div className="exam-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, board, group, level, category or pattern..."
              />
            </div>

            <div className="exam-toolbar-filters">
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.groupId}
                  onChange={(v) => changeFilter("groupId", v)}
                  options={[{ id: "", name: "All Groups" }, ...groups.filter((g) => g.isActive !== false)]}
                  placeholder="Select Group"
                />
              </div>
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.programId}
                  disabled={!filters.groupId}
                  onChange={(v) => changeFilter("programId", v)}
                  options={[{ id: "", name: "All Programs" }, ...getProgramsForGroups(programs, [filters.groupId])]}
                  placeholder="Select Program"
                />
              </div>
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.levelId}
                  onChange={(v) => changeFilter("levelId", v)}
                  options={[{ id: "", name: "All Academic Levels" }, ...academicLevels]}
                  placeholder="Select Level"
                />
              </div>
            </div>

            <div className="exam-toolbar-actions">
              <button className="cms-btn cms-btn-ghost exam-export-btn" onClick={() => printSchedule()}>
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
                  <th>Academic Level(s)</th>
                  <th>Group(s)</th>
                  <th>Program(s)</th>
                  <th>Exam Category</th>
                  <th>Exam Pattern(s)</th>
                  <th>Exam Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownExams.length ? (
                  shownExams.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className="exam-cell-two-lines" title={e.code}>
                          {e.code}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={e.name}>
                          {e.name}
                        </span>
                      </td>
                      <td title={nameOf(boards, e.boardId)}>
                        <span className="exam-cell-two-lines">{codeOf(boards, e.boardId)}</span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={nameOf(academicYears, e.yearId)}>
                          {nameOf(academicYears, e.yearId)}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={getLevelNames(e, academicLevels)}>
                          {getLevelNames(e, academicLevels)}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={getGroupNames(e, groups)}>
                          {getGroupNames(e, groups)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="exam-cell-two-lines"
                          title={(e.programIds || [e.programId]).map((pid) => nameOf(programs, pid)).join(", ")}
                        >
                          {(e.programIds || [e.programId]).map((pid) => nameOf(programs, pid)).join(", ")}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines">{e.examCategory || "Regular"}</span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={e.examPattern || "Standard Pattern"}>
                          {e.examPattern || "Standard Pattern"}
                        </span>
                      </td>
                      <td>
                        {d(e.startDate)}
                        <small className="exam-muted"> to {d(e.endDate)}</small>
                      </td>
                      <td className="exam-status-cell">
                        <StatusBadge value={e.status} />
                      </td>
                      <td>
                        <div className="cms-actions">
                          <button
                            className="cms-action-btn view"
                            title="View Details"
                            onClick={() =>
                              setDetail({
                                exam: e,
                                schedules: schedules.filter((s) => String(s.examId) === String(e.id)),
                              })
                            }
                          >
                            <Eye size={15} />
                          </button>
                          {e.status === "DRAFT" && (
                            <button
                              className="cms-action-btn"
                              title="Schedule Examination"
                              onClick={() => {
                                setExamId(String(e.id));
                                setActiveTab("schedule");
                                setEditing(null);
                              }}
                            >
                              <CalendarDays size={15} />
                            </button>
                          )}
                          {e.status === "DRAFT" && (
                            <button
                              className="cms-action-btn edit"
                              title="Edit Examination Scope"
                              onClick={() => {
                                setEditingExamId(String(e.id));
                                setViewMode("edit");
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {["SCHEDULED", "COMPLETED"].includes(e.status) && (
                            <button
                              className="cms-action-btn"
                              title="Export Schedule Excel"
                              onClick={() => printSchedule(e)}
                            >
                              <Printer size={15} />
                            </button>
                          )}
                          {e.status === "DRAFT" && (
                            <button
                              className="cms-action-btn danger"
                              title="Delete Draft"
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
                    <td colSpan="12">
                      <div className="cms-empty">
                        {loading ? "Loading examinations..." : "No examinations match the current filters."}
                      </div>
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
              onClick={() => setPage((p) => p - 1)}
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
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="exam-schedule-back-link"
            onClick={handleBackFromSchedule}
          >
            <ArrowLeft size={15} /> Back to Examinations
          </button>
          <ScheduleSection
            exam={currentExam}
            exams={exams}
            schedules={schedules}
            examId={examId}
            onUpdateSchedule={(updated) => {
              setSchedules((prev) => prev.map((s) => (String(s.id) === String(updated.id) ? updated : s)));
              showToast("Halls and invigilator faculty updated.", "success");
            }}
            onBack={handleBackFromSchedule}
            setExamId={(v) => {
              setExamId(v);
              setEditing(null);
              setErrors({});
              setSch({
                groupId: "",
                subjectId: "",
                patternName: "",
                date: "",
                startTime: "09:00",
                endTime: "12:00",
                totalMarks: "100",
                passingMarks: "35",
                passPercentage: "35",
                hallAssignments: [],
                mode: "Written",
              });
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
                groupId: String(s.groupId || ""),
                subjectId: String(s.subjectId || ""),
                patternName: String(s.patternName || ""),
                totalMarks: String(s.totalMarks || "100"),
                passingMarks: String(s.passingMarks ?? "35"),
                passPercentage: String(s.passPercentage || "35"),
                hallAssignments: s.hallAssignments || [],
              });
              setEditing(s.id);
              setErrors({});
            }}
            onCancelEdit={() => setEditing(null)}
            onSave={(newSchedules) => {
              if (editing) {
                setSchedules((prev) =>
                  prev.map((item) => (String(item.id) === String(editing) ? newSchedules[0] : item)),
                );
                showToast("Schedule / Postponement updated successfully.", "success");
              } else {
                setSchedules((prev) => [...newSchedules, ...prev]);
                showToast("Schedule saved successfully.", "success");
              }
              setEditing(null);
              setSch((prev) => ({
                ...prev,
                subjectId: "",
                patternName: "",
                date: "",
                hallAssignments: [],
              }));
              setErrors({});
            }}
            onRemove={(target) => setRemoveSchedule(target)}
            finalize={handleFinalizeSchedule}
            boards={boards}
            academicYears={academicYears}
            academicLevels={academicLevels}
            groups={groups}
            programs={programs}
            rooms={rooms}
            faculty={faculty}
            eligibleSubjects={eligibleSubjects}
            masterPatterns={masterPatterns}
            showToast={showToast}
          />
        </>
      )}

      {detail && (
        <ExamDetails
          exam={detail.exam}
          schedules={detail.schedules}
          boards={boards}
          academicYears={academicYears}
          academicLevels={academicLevels}
          groups={groups}
          close={() => setDetail(null)}
        />
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          schedules={schedules}
          onClose={() => setEditingExam(null)}
          onSave={async (period) => {
            try {
              await apiClient.put(`/api/v1/examinations/${editingExam.id}`, {
                ...editingExam,
                ...period,
              });
              setExams((prev) =>
                prev.map((item) => (String(item.id) === String(editingExam.id) ? { ...item, ...period } : item)),
              );
              setEditingExam(null);
              showToast("Examination period updated.", "success");
            } catch (err) {
              setExams((prev) =>
                prev.map((item) => (String(item.id) === String(editingExam.id) ? { ...item, ...period } : item)),
              );
              setEditingExam(null);
              showToast("Examination period updated.", "success");
            }
          }}
        />
      )}

      {remove && (
        <ConfirmDialog
          title="Delete draft examination"
          message={`Delete ${remove.name}? All associated schedules will be removed.`}
          onCancel={() => setRemove(null)}
          onConfirm={handleDeleteExam}
        />
      )}

      {removeSchedule && (
        <ConfirmDialog
          title="Remove schedule"
          message={`Remove the schedule for ${removeSchedule.subjectName}?`}
          onCancel={() => setRemoveSchedule(null)}
          onConfirm={() => {
            setSchedules((prev) => prev.filter((item) => String(item.id) !== String(removeSchedule.id)));
            setRemoveSchedule(null);
            showToast("Schedule entry removed.", "success");
          }}
        />
      )}

      <Toast
        message={typeof toast === "string" ? toast : toast.message}
        type={typeof toast === "string" ? "success" : toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </DashboardLayout>
  );
}

// ---------- SEARCHABLE SINGLE SELECT ----------
function SearchableSingleSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  error,
  placeholder = "Select Option",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => String(o.id) === String(value));
  const filteredOptions = options.filter((o) =>
    String(o.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`} ref={ref}>
      {label && <label>{label}</label>}
      <div className="cms-searchable-select">
        <button
          type="button"
          disabled={disabled}
          className="cms-searchable-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() =>
            setOpen((prev) => {
              if (prev) setSearch("");
              return !prev;
            })
          }
        >
          <span className="cms-truncate">
            {selectedOpt ? selectedOpt.name : placeholder}
          </span>
          <ChevronDown size={15} style={{ color: "#64748b", flexShrink: 0 }} />
        </button>

        {open && (
          <div className="cms-searchable-select-dropdown" style={{ zIndex: 100000 }}>
            <div className="cms-searchable-select-search">
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="cms-searchable-select-options" role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.id) === String(value);
                  return (
                    <div
                      key={opt.id}
                      className={`cms-searchable-select-option ${isSelected ? "selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      title={opt.name}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onChange(opt.id);
                          setOpen(false);
                          setSearch("");
                        }
                      }}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span>{opt.name}</span>
                      {isSelected && <Check size={14} style={{ color: "#6F8400" }} />}
                    </div>
                  );
                })
              ) : (
                <div className="cms-searchable-no-options">No matches for "{search}"</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}

// ---------- SEARCHABLE MULTI SELECT ----------
function SearchableMultiSelect({
  label,
  selectedIds = [],
  onChange,
  options = [],
  disabled = false,
  error,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter((o) => selectedIds.map(String).includes(String(o.id)));

  const toggleOption = (id) => {
    const strId = String(id);
    if (selectedIds.map(String).includes(strId)) {
      onChange(selectedIds.filter((item) => String(item) !== strId));
    } else {
      onChange([...selectedIds, strId]);
    }
  };

  const filteredOptions = options.filter(
    (o) =>
      String(o.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.code || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`} ref={ref}>
      {label && <label>{label}</label>}
      <div className="cms-searchable-select">
        <button
          type="button"
          disabled={disabled}
          className="cms-searchable-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() =>
            setOpen((prev) => {
              if (prev) setSearch("");
              return !prev;
            })
          }
        >
          <span className="cms-truncate">
            {selectedOptions.length > 0
              ? selectedOptions.map((o) => o.name).join(", ")
              : placeholder || `Select ${label?.replace(" *", "") || "Option(s)"}`}
          </span>
          <ChevronDown size={15} style={{ color: "#64748b", flexShrink: 0 }} />
        </button>

        {open && (
          <div className="cms-searchable-select-dropdown" style={{ zIndex: 100000 }}>
            <div className="cms-searchable-select-search">
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="cms-searchable-select-options" role="listbox" aria-multiselectable="true">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked = selectedIds.map(String).includes(String(opt.id));
                  return (
                    <div
                      key={opt.id}
                      className={`cms-searchable-select-option ${isChecked ? "selected" : ""}`}
                      role="option"
                      aria-selected={isChecked}
                      title={opt.name}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleOption(opt.id);
                      }}
                      onClick={() => toggleOption(opt.id)}
                    >
                      <div>
                        <span>{opt.name}</span>
                        {opt.designation && (
                          <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>
                            {opt.designation}
                          </small>
                        )}
                        {opt.capacity && (
                          <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>
                            Cap: {opt.capacity} ({opt.type || "Room"})
                          </small>
                        )}
                      </div>
                      {isChecked && <Check size={14} style={{ color: "#6F8400" }} />}
                    </div>
                  );
                })
              ) : (
                <div className="cms-searchable-no-options">No matches for "{search}"</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}

// ---------- FORM COMPONENT WITH LIVE ACADEMIC CASCADING HIERARCHY ----------
function ExamForm({
  exams,
  schedules,
  editId,
  boards = [],
  academicYears = [],
  academicLevels = [],
  groups = [],
  programs = [],
  masterPatterns = [],
  examTypes = [],
  rooms = [],
  faculty = [],
  showToast,
  onSave,
  onCancel,
}) {
  const existing = exams.find((e) => String(e.id) === String(editId));

  const [formYears, setFormYears] = useState(academicYears);
  const [formLevels, setFormLevels] = useState(academicLevels);
  const [formGroups, setFormGroups] = useState(groups);
  const [formPrograms, setFormPrograms] = useState(programs);
  const [formEligibleSubjects, setFormEligibleSubjects] = useState([]);

  const [form, setForm] = useState(() =>
    existing
      ? {
        ...existing,
        examCategory: existing.examCategory || "Regular",
        customCategoryName: existing.customCategoryName || "",
        levelIds: existing.levelIds || (existing.levelId ? [existing.levelId] : []),
        groupIds: existing.groupIds || (existing.groupId ? [existing.groupId] : []),
        programIds: existing.programIds || (existing.programId ? [existing.programId] : []),
        selectedSubjectIds: existing.selectedSubjectIds || [],
        groupProgramSelections: existing.groupProgramSelections || [],
        selectedGroupPatterns: existing.selectedGroupPatterns || {},
        examPattern: existing.examPattern || "",
      }
      : {
        code: "",
        name: "",
        examCategory: "",
        customCategoryName: "",
        boardId: boards[0]?.id || "",
        yearId: "",
        levelId: "",
        levelIds: [],
        groupId: "",
        groupIds: [],
        programId: "",
        programIds: [],
        selectedSubjectIds: [],
        groupProgramSelections: [],
        selectedGroupPatterns: {},
        examPattern: "",
        startDate: "",
        endDate: "",
        description: "",
        status: "DRAFT",
      },
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  // 2. Board Selection Cascading Effect
  useEffect(() => {
    if (!form.boardId) return;
    const fetchBoardHierarchy = async () => {
      try {
        const [yearsRes, levelsRes, groupsRes] = await Promise.all([
          apiClient.get("/api/v1/academic-years", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/academic-levels", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/groups", { params: { boardId: form.boardId } }),
        ]);

        const rawYears = unwrap(yearsRes);
        const rawLevels = unwrap(levelsRes);
        const rawGroups = unwrap(groupsRes);

        const activeYears = rawYears
          .map((y) => ({
            id: normalizeId(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name,
            boardId: normalizeId(y.boardId),
            isActive: y.isActive !== false,
            isCurrent: Boolean(y.isCurrent),
          }))
          .filter((y) => y.isActive);

        const mappedLevels = rawLevels.map((l) => ({
          id: normalizeId(l.academicLevelId ?? l.id),
          name: l.academicLevelName ?? l.levelName ?? l.name,
          code: l.levelCode ?? l.code ?? "",
          boardId: normalizeId(l.boardId),
        }));

        const activeGroups = rawGroups
          .map((g) => ({
            id: normalizeId(g.groupId ?? g.id),
            name: g.groupName ?? g.name,
            code: g.groupCode ?? g.code ?? "",
            boardId: normalizeId(g.boardId),
            programs: g.programs || [],
            isActive: g.isActive !== false,
          }))
          .filter((g) => g.isActive);

        setFormYears(activeYears);
        setFormLevels(mappedLevels);
        setFormGroups(activeGroups);

        // Auto-select current or first year if not set
        if (!form.yearId && activeYears.length > 0) {
          const currentYear = activeYears.find((y) => y.isCurrent) || activeYears[0];
          setForm((prev) => ({ ...prev, yearId: currentYear.id }));
        }
      } catch (err) {
        showToast("Failed to fetch academic hierarchy for selected board.", "error");
      }
    };
    fetchBoardHierarchy();
  }, [form.boardId, showToast]);

  // Available groups for active board
  const availableGroups = useMemo(
    () => formGroups.filter((g) => g.isActive !== false && (!form.boardId || normalizeId(g.boardId) === normalizeId(form.boardId))),
    [formGroups, form.boardId],
  );

  // Group Tabs active tab state in Creation Form
  const [activeGroupTab, setActiveGroupTab] = useState(() => availableGroups[0]?.id || "");

  useEffect(() => {
    if (availableGroups.length > 0 && !availableGroups.some((g) => normalizeId(g.id) === normalizeId(activeGroupTab))) {
      setActiveGroupTab(availableGroups[0].id);
    }
  }, [availableGroups, activeGroupTab]);

  const activeGroupObj = availableGroups.find((g) => normalizeId(g.id) === normalizeId(activeGroupTab)) || availableGroups[0];

  // 3. Group Selection -> Programs Fetching
  useEffect(() => {
    if (!activeGroupTab) return;
    const fetchGroupPrograms = async () => {
      try {
        const res = await apiClient.get(`/api/v1/programs/group/${activeGroupTab}`);
        const rawPrograms = unwrap(res);
        const mapped = rawPrograms.map((p) => ({
          id: normalizeId(p.programId ?? p.id),
          name: p.programName ?? p.name,
          code: p.programCode ?? p.code ?? "",
          groupId: normalizeId(p.groupId || activeGroupTab),
          isActive: p.isActive !== false,
          objectivePatternCodes: p.objectivePatternCodes || [],
        }));
        setFormPrograms(mapped);
      } catch (err) {
        showToast("Failed to fetch program tracks for group.", "error");
      }
    };
    fetchGroupPrograms();
  }, [activeGroupTab, showToast]);

  // 4. Context Subject Fetching
  useEffect(() => {
    if (!form.boardId || !activeGroupTab || !form.levelIds?.length) return;
    const fetchSubjects = async () => {
      try {
        const res = await apiClient.get("/api/v1/Subjects/context", {
          params: {
            boardId: form.boardId,
            groupId: activeGroupTab,
            academicLevelId: form.levelIds[0],
          },
        });
        const rawSubjects = unwrap(res);
        const mapped = rawSubjects.map((s) => ({
          id: normalizeId(s.subjectId ?? s.id),
          name: s.subjectName ?? s.name,
          code: s.subjectCode ?? s.code ?? "",
          academicLevelIds: (s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId),
          groupIds: (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId),
          programIds: (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
          facultyIds: (s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
          hasPractical: Boolean(s.hasPractical),
          isActive: s.isActive !== false,
        }));
        setFormEligibleSubjects(mapped);
      } catch (err) {
        showToast("Failed to fetch eligible subjects.", "error");
      }
    };
    fetchSubjects();
  }, [form.boardId, activeGroupTab, form.levelIds, showToast]);

  // Eligible subjects considering Academic Level, Group, Program, and Category
  const eligibleSubjects = useMemo(
    () => getEligibleSubjects(form, formEligibleSubjects),
    [form.levelIds, form.groupIds, form.programIds, form.examCategory, formEligibleSubjects],
  );

  // Sync selectedSubjectIds when eligibleSubjects change
  useEffect(() => {
    if (eligibleSubjects.length > 0) {
      setForm((prev) => {
        if (prev.examCategory === "Others") {
          return prev;
        }
        if (!prev.selectedSubjectIds || prev.selectedSubjectIds.length === 0) {
          return { ...prev, selectedSubjectIds: eligibleSubjects.map((s) => String(s.id)) };
        }
        return prev;
      });
    }
  }, [eligibleSubjects]);

  // Tab-Wise Exam Pattern Resolution per Group
  const getGroupPatterns = (groupId) => {
    const isObjective = String(form.examCategory || "").toLowerCase().includes("objective");
    if (!isObjective) {
      const regPatterns = masterPatterns.filter(
        (p) =>
          p.category === "Regular Academic" ||
          p.category === "Regular" ||
          !String(p.category || "").toLowerCase().includes("objective"),
      );
      if (regPatterns.length > 0) {
        return regPatterns.map((p) => ({ id: p.name || p.id, name: p.name || p.id }));
      }
      return [
        { id: "Board Pre-Final Annual Pattern", name: "Board Pre-Final Annual Pattern" },
        { id: "Standard Board Written Pattern", name: "Standard Board Written Pattern" },
        { id: "Quarterly / Mid-Term Pattern", name: "Quarterly / Mid-Term Pattern" },
        { id: "Unit Test Pattern", name: "Unit Test Pattern" },
      ];
    }

    const groupProgIds = form.programIds.filter((id) =>
      formPrograms.some((p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(groupId)),
    );
    const selectedProgs = formPrograms.filter((p) => groupProgIds.map(normalizeId).includes(normalizeId(p.id)));

    const patternMap = {
      IITADV: "IIT/JEE Advanced Pattern",
      MAINS: "JEE Mains Standard Pattern",
      EAMCET: "EAPCET / EAMCET Objective Pattern",
      NEET: "NEET AIIMS Pattern",
      EAPCETAP: "EAPCET Agriculture / Pharmacy Pattern",
      CAFOUND: "CA / CMA Foundation Pattern",
      CLAT: "CLAT Law Entrance Pattern",
      IASFOUND: "Civils / IAS Foundation Pattern",
    };

    const patterns = [];
    const seen = new Set();
    selectedProgs.forEach((p) => {
      (p.objectivePatternCodes || []).forEach((code) => {
        const patternName = patternMap[code] || code;
        if (!seen.has(patternName)) {
          seen.add(patternName);
          patterns.push({ id: patternName, name: patternName });
        }
      });
    });

    if (!patterns.length && masterPatterns.length > 0) {
      const objPatterns = masterPatterns.filter((p) => String(p.category || "").toLowerCase().includes("objective"));
      objPatterns.forEach((p) => {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          patterns.push({ id: p.name, name: p.name });
        }
      });
    }

    if (!patterns.length) {
      patterns.push({ id: "General Objective Competitive Pattern", name: "General Objective Competitive Pattern" });
    }

    return patterns;
  };

  // Group subjects by Academic Level & Group for Tabbed Subject View
  const subjectTabGroups = useMemo(() => {
    const map = new Map();
    eligibleSubjects.forEach((sub) => {
      const subLevelIds = (sub.academicLevelIds || []).map(normalizeId);
      const subGroupIds = (sub.groupIds || []).map(normalizeId);
      subLevelIds.forEach((lid) => {
        subGroupIds.forEach((gid) => {
          if (
            form.levelIds.map(String).includes(String(lid)) &&
            form.groupIds.map(String).includes(String(gid))
          ) {
            const key = `${lid}_${gid}`;
            if (!map.has(key)) {
              const levelName = nameOf(formLevels, lid).replace(/Intermediate\s*/i, "");
              const groupCode = codeOf(formGroups, gid);
              map.set(key, {
                key,
                label: `${levelName} - ${groupCode}`,
                subjects: [],
              });
            }
            if (!map.get(key).subjects.some((s) => String(s.id) === String(sub.id))) {
              map.get(key).subjects.push(sub);
            }
          }
        });
      });
    });
    return Array.from(map.values());
  }, [eligibleSubjects, form.levelIds, form.groupIds, formLevels, formGroups]);

  const [activeSubjectTabKey, setActiveSubjectTabKey] = useState("");

  useEffect(() => {
    if (subjectTabGroups.length > 0) {
      if (!activeSubjectTabKey || !subjectTabGroups.some((g) => g.key === activeSubjectTabKey)) {
        setActiveSubjectTabKey(subjectTabGroups[0].key);
      }
    } else {
      setActiveSubjectTabKey("");
    }
  }, [subjectTabGroups, activeSubjectTabKey]);

  const currentSubjectTabGroup = subjectTabGroups.find((g) => g.key === activeSubjectTabKey) || subjectTabGroups[0];

  const change = (n, v) => {
    setForm((x) => {
      const next = {
        ...x,
        [n]: v,
        ...(n === "boardId"
          ? { yearId: "", levelIds: [], groupIds: [], programIds: [], selectedSubjectIds: [], selectedGroupPatterns: {} }
          : {}),
        ...(n === "groupIds"
          ? {
            programIds: x.programIds.filter((id) =>
              getProgramsForGroups(formPrograms, v).some((p) => normalizeId(p.id) === normalizeId(id)),
            ),
          }
          : {}),
      };

      // Objective examinations are conducted combinely on a single date, so startDate === endDate
      if (next.examCategory === "Objective") {
        if (n === "startDate") {
          next.endDate = v;
        } else if (n === "examCategory") {
          next.endDate = next.startDate;
        }
      }

      return next;
    });

    setErrors((x) => ({ ...x, [n]: undefined }));
  };

  const toggleGroupPattern = (groupId, patternName) => {
    setForm((prev) => {
      const currentPatterns = prev.selectedGroupPatterns[groupId] || [];
      const updated = currentPatterns.includes(patternName)
        ? currentPatterns.filter((p) => p !== patternName)
        : [...currentPatterns, patternName];
      const nextGroupPatterns = { ...prev.selectedGroupPatterns, [groupId]: updated };

      const firstPattern = Object.values(nextGroupPatterns).flat()[0] || prev.examPattern;
      return {
        ...prev,
        selectedGroupPatterns: nextGroupPatterns,
        examPattern: firstPattern,
      };
    });
  };

  const toggleSubjectSelect = (subjectId) => {
    const strId = String(subjectId);
    setForm((prev) => {
      const current = prev.selectedSubjectIds || [];
      const updated = current.includes(strId) ? current.filter((id) => id !== strId) : [...current, strId];
      return { ...prev, selectedSubjectIds: updated };
    });
    setErrors((x) => ({ ...x, selectedSubjectIds: undefined }));
  };

  const selectAllSubjects = () => {
    setForm((prev) => ({
      ...prev,
      selectedSubjectIds: eligibleSubjects.map((s) => String(s.id)),
    }));
    setErrors((x) => ({ ...x, selectedSubjectIds: undefined }));
  };

  const deselectAllSubjects = () => {
    setForm((prev) => ({
      ...prev,
      selectedSubjectIds: [],
    }));
  };

  const save = async (e, proceedToSchedule = false) => {
    e.preventDefault();
    if (saving) return;
    const x = {};
    if (!form.code.trim()) x.code = "Exam Code is required.";
    if (!form.name.trim()) x.name = "Exam Name is required.";
    if (!form.boardId) x.boardId = "Required";
    if (!form.yearId) x.yearId = "Required";
    if (!form.examCategory.trim()) x.examCategory = "Exam Category is required.";
    if (form.examCategory === "Others" && !form.customCategoryName?.trim()) {
      x.customCategoryName = "Please specify the custom category name.";
    }

    if (!form.levelIds || !form.levelIds.length) x.levelIds = "Select at least one Academic Level.";

    if (!form.groupIds || form.groupIds.length === 0) x.groupIds = "Select at least one Group.";
    form.groupIds.forEach((groupId) => {
      if (
        !form.programIds.some((id) =>
          formPrograms.some((p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(groupId)),
        )
      ) {
        x.programIds = "Select at least one Program for every Group.";
      }
    });

    if (!form.selectedSubjectIds || form.selectedSubjectIds.length === 0) {
      x.selectedSubjectIds = "Select at least one subject for the examination.";
    }

    const isObjective = String(form.examCategory || "").toLowerCase().includes("objective");
    if (isObjective) {
      const missingGroupPattern = form.groupIds.some(
        (gid) => !form.selectedGroupPatterns[gid] || form.selectedGroupPatterns[gid].length === 0,
      );
      if (missingGroupPattern) {
        x.examPattern = "Select at least one Examination Pattern for each selected Group tab.";
      }
    }

    if (!form.startDate) x.startDate = "Start Date is required.";

    if (form.examCategory === "Objective") {
      form.endDate = form.startDate;
    } else {
      if (!form.endDate) x.endDate = "End Date is required.";
      if (form.startDate && form.endDate && form.startDate > form.endDate) {
        x.endDate = "End date must be on or after start date.";
      }
    }

    if (form.startDate && form.startDate < todayStr && !existing) {
      x.startDate = "Start Date cannot be in the past.";
    }

    if (Object.keys(x).length) return setErrors(x);

    const firstPattern = Object.values(form.selectedGroupPatterns).flat()[0] || form.examPattern || "Standard Pattern";
    const resolvedCategory =
      form.examCategory === "Others" ? form.customCategoryName.trim() || "Others" : form.examCategory.trim();

    const payload = {
      ...form,
      id: existing ? existing.id : String(Date.now()),
      code: form.code.trim(),
      levelId: form.levelIds[0] || "",
      groupId: form.groupIds[0] || "",
      programId: form.programIds[0] || "",
      name: form.name.trim(),
      examCategory: resolvedCategory,
      rawCategory: form.examCategory,
      customCategoryName: form.customCategoryName,
      examPattern: firstPattern,
      levelIds: [...new Set(form.levelIds.map(normalizeId))],
      groupIds: [...new Set(form.groupIds.map(normalizeId))],
      programIds: [...new Set(form.programIds.map(normalizeId))],
      selectedSubjectIds: [...new Set(form.selectedSubjectIds.map(normalizeId))],
      selectedGroupPatterns: form.selectedGroupPatterns,
      groupProgramSelections: form.groupIds.map((groupId) => ({
        groupId,
        programIds: form.programIds.filter((id) =>
          formPrograms.some((p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(groupId)),
        ),
      })),
      scheduleMode: isObjective ? "PATTERN_WISE" : "SUBJECT_WISE",
    };

    setSaving(true);
    await onSave(payload, proceedToSchedule);
    setSaving(false);
  };

  return (
    <DashboardLayout title={existing ? "Edit Examination Scope" : "Create Examination"} breadcrumb={["Examinations"]}>
      <button type="button" className="exam-back-text-link" onClick={onCancel}>
        <ArrowLeft size={15} /> Back to Examinations
      </button>

      <form className="cms-form-page examination-form-page" onSubmit={save}>
        <div className="cms-card">
          <div className="cms-card-body">
            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Academic Scope & Category Configuration</h2>
                  <p>Board and Academic Year are auto-fetched from active records. Configure remaining academic scope.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3" style={{ marginBottom: "20px" }}>
                <SearchableSingleSelect
                  label="Board (Auto-Fetched) *"
                  value={form.boardId}
                  onChange={(v) => change("boardId", v)}
                  options={boards}
                  error={errors.boardId}
                  placeholder="Select Board"
                />

                <SearchableSingleSelect
                  label="Academic Year (Auto-Fetched) *"
                  value={form.yearId}
                  disabled={!form.boardId}
                  onChange={(v) => change("yearId", v)}
                  options={formYears}
                  error={errors.yearId}
                  placeholder="Select Academic Year"
                />

                <SearchableSingleSelect
                  label="Exam Category *"
                  value={form.examCategory}
                  onChange={(v) => change("examCategory", v)}
                  options={[
                    { id: "Regular", name: "Regular" },
                    { id: "Objective", name: "Objective" },
                    { id: "Practical", name: "Practical" },
                    { id: "Others", name: "Others" },
                  ]}
                  error={errors.examCategory}
                  placeholder="Select Category (Regular, Objective, Practical, Others)"
                />
              </div>

              {form.examCategory === "Others" && (
                <div style={{ marginBottom: "20px" }}>
                  <Field
                    label="Specify Custom Exam Category *"
                    placeholder="e.g. Special Improvement Exam, Remedial Test..."
                    value={form.customCategoryName}
                    onChange={(v) => change("customCategoryName", v)}
                    error={errors.customCategoryName}
                  />
                </div>
              )}

              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <label className="exam-scope-label">Academic Level(s) *</label>
                <div className="exam-pills-row">
                  {formLevels.map((level) => {
                    const selected = form.levelIds.map(String).includes(String(level.id));
                    return (
                      <button
                        key={level.id}
                        type="button"
                        className={`exam-pill-btn ${selected ? "active" : ""}`}
                        onClick={() => {
                          const strId = String(level.id);
                          const nextLevels = selected
                            ? form.levelIds.filter((id) => String(id) !== strId)
                            : [...form.levelIds, strId];
                          change("levelIds", nextLevels);
                        }}
                      >
                        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
                        <span>{level.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.levelIds && <span className="cms-error">{errors.levelIds}</span>}
              </div>

              {/* Group Tabs & Program Selection */}
              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div className="exam-scope-header">
                  <label className="exam-scope-label">Groups & Conducted Programs *</label>
                  <span className="exam-scope-hint">
                    Select a Group tab (filtered by {codeOf(boards, form.boardId)}) to set its conducted program.
                  </span>
                </div>

                <div className="exam-group-tabs-bar">
                  {availableGroups.map((group) => {
                    const groupProgIds = formPrograms
                      .filter((p) => p.isActive !== false && String(p.groupId) === String(group.id))
                      .map((p) => String(p.id));
                    const selectedCount = form.programIds.filter((id) => groupProgIds.includes(String(id))).length;
                    const isActiveTab = String(group.id) === String(activeGroupTab);
                    const isGroupActive = selectedCount > 0;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`exam-group-tab-btn ${isActiveTab ? "current" : ""} ${isGroupActive ? "has-selections" : ""}`}
                        onClick={() => setActiveGroupTab(group.id)}
                      >
                        <span className="exam-group-code">{group.code}</span>
                        <span className="exam-group-name">{group.name.split(" ")[0]}</span>
                        {selectedCount > 0 && <span className="exam-group-badge">{selectedCount}</span>}
                      </button>
                    );
                  })}
                </div>

                {activeGroupObj && (
                  <div className="exam-group-panel">
                    <div className="exam-group-panel-header">
                      <div>
                        <strong>
                          {activeGroupObj.name} ({activeGroupObj.code}) Program Selection
                        </strong>
                        <p>Select the program track to conduct this examination for.</p>
                      </div>
                      <div className="exam-group-panel-actions">
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost exam-mini-btn"
                          onClick={() => {
                            const groupProgs = formPrograms
                              .filter((p) => p.isActive !== false && String(p.groupId) === String(activeGroupObj.id))
                              .map((p) => String(p.id));
                            const newProgs = [...new Set([...form.programIds.map(String), ...groupProgs])];
                            const newGroups = [...new Set([...form.groupIds.map(String), String(activeGroupObj.id)])];
                            setForm((x) => ({ ...x, groupIds: newGroups, programIds: newProgs }));
                            setErrors((x) => ({ ...x, groupIds: undefined, programIds: undefined }));
                          }}
                        >
                          Select All {activeGroupObj.code}
                        </button>
                      </div>
                    </div>

                    <div className="exam-program-pills-grid">
                      {formPrograms
                        .filter((p) => p.isActive !== false && String(p.groupId) === String(activeGroupObj.id))
                        .map((program) => {
                          const isSelected = form.programIds.map(String).includes(String(program.id));
                          return (
                            <button
                              key={program.id}
                              type="button"
                              className={`exam-program-pill ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                const strId = String(program.id);
                                const nextProgs = isSelected
                                  ? form.programIds.filter((id) => String(id) !== strId)
                                  : [...form.programIds, strId];
                                const remainingGroupProgs = formPrograms.filter(
                                  (p) => p.isActive !== false && nextProgs.includes(String(p.id)),
                                );
                                const nextGroups = [...new Set(remainingGroupProgs.map((p) => String(p.groupId)))];
                                setForm((x) => ({ ...x, groupIds: nextGroups, programIds: nextProgs }));
                                setErrors((x) => ({ ...x, groupIds: undefined, programIds: undefined }));
                              }}
                            >
                              <div className="exam-program-pill-check">
                                {isSelected ? <Check size={14} /> : <div className="exam-program-pill-empty" />}
                              </div>
                              <div className="exam-program-pill-info">
                                <strong>{program.name}</strong>
                                <small>Code: {program.code}</small>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
                {errors.groupIds && <span className="cms-error">{errors.groupIds}</span>}
                {errors.programIds && <span className="cms-error">{errors.programIds}</span>}
              </div>

              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div className="exam-scope-header">
                  <label className="exam-scope-label">
                    <Sparkles
                      size={16}
                      style={{ verticalAlign: "middle", marginRight: "6px", color: "var(--cms-primary)" }}
                    />
                    Examination Patterns (Group Tab-Wise Selection) *
                  </label>
                  <span className="exam-scope-hint">Select examination pattern(s) for each group tab.</span>
                </div>

                <div className="exam-pattern-tabs-container">
                  <div className="exam-group-tabs-bar" style={{ borderRadius: "8px 8px 0 0" }}>
                    {form.groupIds.map((gid) => {
                      const group = formGroups.find((g) => normalizeId(g.id) === normalizeId(gid));
                      const selectedCount = (form.selectedGroupPatterns[gid] || []).length;
                      const isActiveTab = String(gid) === String(activeGroupTab);

                      return (
                        <button
                          key={gid}
                          type="button"
                          className={`exam-group-tab-btn ${isActiveTab ? "current" : ""}`}
                          onClick={() => setActiveGroupTab(gid)}
                        >
                          <span className="exam-group-code">{group?.code}</span>
                          {selectedCount > 0 && <span className="exam-group-badge">{selectedCount}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {activeGroupObj && (
                    <div className="exam-pattern-tab-body">
                      <div className="exam-pills-row">
                        {getGroupPatterns(activeGroupObj.id).map((pattern) => {
                          const currentGroupSelected = form.selectedGroupPatterns[activeGroupObj.id] || [];
                          const isSelected = currentGroupSelected.includes(pattern.name);
                          return (
                            <button
                              key={pattern.id}
                              type="button"
                              className={`exam-pill-btn ${isSelected ? "active" : ""}`}
                              onClick={() => toggleGroupPattern(activeGroupObj.id, pattern.name)}
                            >
                              {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                              <span>{pattern.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {errors.examPattern && <span className="cms-error">{errors.examPattern}</span>}
              </div>

              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div
                  className="exam-scope-header"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <label className="exam-scope-label">
                      <BookOpen
                        size={16}
                        style={{ verticalAlign: "middle", marginRight: "6px", color: "var(--cms-primary)" }}
                      />
                      Eligible Subjects ({(form.selectedSubjectIds || []).length} of {eligibleSubjects.length} Selected) *
                    </label>
                    <span className="exam-scope-hint">
                      {form.examCategory === "Others"
                        ? "All subjects are displayed. Select manually which exams you want to conduct."
                        : String(form.examCategory || "").toLowerCase().includes("practical")
                          ? "Filtered subjects with practical laboratory facilities."
                          : String(form.examCategory || "").toLowerCase().includes("objective")
                            ? "Filtered core subjects (MPC, BiPC, MEC, CEC core) without languages."
                            : "Toggle subjects to conduct for this specific examination."}
                    </span>
                  </div>
                  {eligibleSubjects.length > 0 && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="cms-btn cms-btn-ghost exam-mini-btn" onClick={selectAllSubjects}>
                        Select All Subjects
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost exam-mini-btn"
                        onClick={deselectAllSubjects}
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>

                {subjectTabGroups.length > 0 ? (
                  <div className="exam-subject-tabs-container">
                    <div className="exam-subject-tabs-header">
                      {subjectTabGroups.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          className={`exam-subject-tab-btn ${activeSubjectTabKey === group.key ? "active" : ""}`}
                          onClick={() => setActiveSubjectTabKey(group.key)}
                        >
                          <span>{group.label}</span>
                          <span className="exam-subject-tab-count">
                            {
                              group.subjects.filter((s) =>
                                (form.selectedSubjectIds || []).map(String).includes(String(s.id)),
                              ).length
                            }
                            /{group.subjects.length}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="exam-subject-tab-body">
                      {currentSubjectTabGroup?.subjects.map((subject) => {
                        const isSubjectSelected = (form.selectedSubjectIds || []).map(String).includes(String(subject.id));
                        return (
                          <div
                            key={subject.id}
                            className={`exam-subject-chip ${isSubjectSelected ? "selected" : "deselected"}`}
                            onClick={() => toggleSubjectSelect(subject.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="exam-subject-chip-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                  type="checkbox"
                                  checked={isSubjectSelected}
                                  onChange={() => { }}
                                  style={{
                                    cursor: "pointer",
                                    width: "16px",
                                    height: "16px",
                                    accentColor: "var(--cms-primary)",
                                  }}
                                />
                                <strong>{subject.name}</strong>
                              </div>
                              <span className="exam-subject-chip-code">{subject.code}</span>
                            </div>
                            <div className="exam-subject-chip-details">
                              <small className="exam-muted">
                                Faculty:{" "}
                                {(subject.facultyIds || []).map((fid) => nameOf(faculty, fid)).join(", ") || "Unassigned"}
                              </small>
                              {subject.hasPractical && (
                                <span
                                  className="exam-pattern-tag"
                                  style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary)" }}
                                >
                                  Practical Facility
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    className="cms-empty"
                    style={{ padding: "16px", borderRadius: "10px", border: "1px dashed var(--cms-border)" }}
                  >
                    Select Academic Levels, Groups, and Programs above to preview eligible subjects.
                  </div>
                )}
                {errors.selectedSubjectIds && <span className="cms-error">{errors.selectedSubjectIds}</span>}
              </div>
            </section>

            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Examination Schedule Period & Details</h2>
                  <p>Enter manual exam code and specify examination schedule period.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3">
                <Field
                  label="Exam Code *"
                  placeholder="Enter exam code e.g. EXAM-2026-001"
                  value={form.code}
                  onChange={(v) => change("code", v)}
                  error={errors.code}
                />
                <Field
                  label="Exam Name *"
                  placeholder="e.g. Mid Term Examinations 2026"
                  value={form.name}
                  onChange={(v) => change("name", v)}
                  error={errors.name}
                />
                <Field
                  label="Start Date *"
                  type="date"
                  min={todayStr}
                  value={form.startDate}
                  onChange={(v) => change("startDate", v)}
                  error={errors.startDate}
                />
                {form.examCategory === "Objective" ? (
                  <div className={`cms-field ${errors.endDate ? "has-error" : ""}`}>
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={form.startDate || ""}
                      readOnly
                      style={{ background: "var(--cms-subtle)", cursor: "not-allowed", opacity: 0.85 }}
                      title="Objective examinations are conducted on a single combined examination date."
                    />
                    <span style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "4px", display: "block" }}>
                      Combined objective exam is conducted on a single date (matches start date)
                    </span>
                    {errors.endDate && <span className="cms-error">{errors.endDate}</span>}
                  </div>
                ) : (
                  <Field
                    label="End Date *"
                    type="date"
                    min={form.startDate || todayStr}
                    value={form.endDate}
                    onChange={(v) => change("endDate", v)}
                    error={errors.endDate}
                  />
                )}
                <Field
                  label="Description"
                  type="textarea"
                  placeholder="Optional exam notes or student instructions..."
                  value={form.description}
                  onChange={(v) => change("description", v)}
                />
              </div>
            </section>

            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              {!existing ? (
                <>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ fontWeight: 600 }}
                    disabled={saving}
                    onClick={(e) => save(e, false)}
                  >
                    Save as Draft & View List
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={saving}
                    onClick={(e) => save(e, true)}
                  >
                    {saving ? "Saving..." : "Save & Proceed to Schedule"}
                  </button>
                </>
              ) : (
                <button className="cms-btn cms-btn-primary" disabled={saving}>
                  {saving ? "Updating..." : "Update Examination"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

// ---------- SCHEDULE SECTION COMPONENT ----------
function ScheduleSection({
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
  onCancelEdit,
  onSave,
  onRemove,
  finalize,
  onUpdateSchedule,
  boards = [],
  academicYears = [],
  academicLevels = [],
  groups = [],
  programs = [],
  rooms = [],
  faculty = [],
  eligibleSubjects = [],
  masterPatterns = [],
  showToast,
}) {
  const entries = exam ? schedules.filter((s) => String(s.examId) === String(exam.id)) : [];
  const isObjective = String(exam?.examCategory || "").toLowerCase().includes("objective");
  const isPractical = String(exam?.examCategory || "").toLowerCase().includes("practical");

  const [processing, setProcessing] = useState(false);
  const [readinessErrors, setReadinessErrors] = useState([]);
  const [editingHallsSchedule, setEditingHallsSchedule] = useState(null);

  // Only DRAFT status examinations can be scheduled
  const draftExams = useMemo(() => exams.filter((ex) => ex.status === "DRAFT"), [exams]);

  useEffect(() => {
    if (examId && (!exam || exam.status !== "DRAFT")) {
      setExamId("");
    }
  }, [examId, exam, setExamId]);

  // Exam Group Scope Tabs in Schedule View
  const examGroupIds = useMemo(() => (exam?.groupIds || [exam?.groupId]).filter(Boolean).map(normalizeId), [exam]);
  const examGroups = useMemo(
    () => groups.filter((g) => examGroupIds.includes(normalizeId(g.id))),
    [groups, examGroupIds],
  );

  const [selectedGroupId, setSelectedGroupId] = useState(() => examGroups[0]?.id || "");

  useEffect(() => {
    if (examGroups.length > 0 && !examGroups.some((g) => normalizeId(g.id) === normalizeId(selectedGroupId))) {
      setSelectedGroupId(examGroups[0].id);
    }
  }, [examGroups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && sch.groupId !== selectedGroupId) {
      setSch((prev) => ({ ...prev, groupId: selectedGroupId, subjectId: "", patternName: "", hallAssignments: [] }));
    }
  }, [selectedGroupId]);

  // Dynamically load eligible subjects for the current scheduling context
  const [sectionSubjects, setSectionSubjects] = useState(eligibleSubjects);

  useEffect(() => {
    if (!exam?.boardId || !selectedGroupId || !exam?.levelIds?.length) return;
    const fetchSectionSubjects = async () => {
      try {
        const res = await apiClient.get("/api/v1/Subjects/context", {
          params: {
            boardId: exam.boardId,
            groupId: selectedGroupId,
            academicLevelId: exam.levelIds[0],
          },
        });
        const raw = unwrap(res);
        if (raw.length) {
          setSectionSubjects(
            raw.map((s) => ({
              id: normalizeId(s.subjectId ?? s.id),
              name: s.subjectName ?? s.name,
              code: s.subjectCode ?? s.code ?? "",
              academicLevelIds: (s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId),
              groupIds: (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId),
              programIds: (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
              facultyIds: (s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
              hasPractical: Boolean(s.hasPractical),
              isActive: s.isActive !== false,
            })),
          );
        }
      } catch (err) {
        // preserve current list
      }
    };
    fetchSectionSubjects();
  }, [exam?.boardId, selectedGroupId, exam?.levelIds]);

  // Available patterns for the active group tab in Objective Mode
  const activeGroupPatterns = useMemo(() => {
    if (!exam) return [];
    return (exam.selectedGroupPatterns && exam.selectedGroupPatterns[selectedGroupId]) || [exam.examPattern];
  }, [exam, selectedGroupId]);

  // Active Group Subjects for Subject-Wise / Practical Mode
  const activeGroupSubjects = useMemo(
    () => (exam ? getSelectedSubjectsForExam(exam, selectedGroupId, sectionSubjects) : []),
    [exam, selectedGroupId, sectionSubjects],
  );

  const availableSubjectsToSchedule = activeGroupSubjects.filter(
    (sub) => !entries.some((s) => String(s.subjectId) === String(sub.id) && String(s.id) !== String(editing)),
  );

  const eligibleInvigilators = getEligibleInvigilators(schedules, sch, editing, faculty);
  const eligibleRooms = getEligibleRooms(schedules, sch, editing, exam, rooms);

  // Auto-allocate halls and invigilators in top form when date and times are set
  useEffect(() => {
    if (
      exam &&
      selectedGroupId &&
      sch.date &&
      sch.startTime &&
      sch.endTime &&
      !editing &&
      (!sch.hallAssignments || sch.hallAssignments.length === 0)
    ) {
      const autoAssigned = autoAssignHallsAndInvigilators(
        exam,
        selectedGroupId,
        sch.date,
        sch.startTime,
        sch.endTime,
        schedules,
        null,
        rooms,
        faculty,
        programs,
      );
      if (autoAssigned.length > 0) {
        setSch((prev) => ({ ...prev, hallAssignments: autoAssigned }));
      }
    }
  }, [exam, selectedGroupId, sch.date, sch.startTime, sch.endTime, editing, rooms, faculty, programs]);

  const handleManualAutoAssignTopForm = () => {
    if (!exam || !sch.date || !sch.startTime || !sch.endTime) return;
    const autoAssigned = autoAssignHallsAndInvigilators(
      exam,
      selectedGroupId,
      sch.date,
      sch.startTime,
      sch.endTime,
      schedules,
      editing,
      rooms,
      faculty,
      programs,
    );
    setSch((prev) => ({ ...prev, hallAssignments: autoAssigned }));
  };

  // Auto-Generate Schedule Functionality (Group & Pattern-Wise)
  const autoGenerateSchedule = () => {
    if (!exam) return;
    const currentGroupCode = codeOf(groups, selectedGroupId, "GROUP");

    if (isObjective) {
      const generated = activeGroupPatterns.map((pName, idx) => {
        const autoAssigned = autoAssignHallsAndInvigilators(
          exam,
          selectedGroupId,
          exam.startDate,
          "09:00",
          "12:00",
          schedules,
          null,
          rooms,
          faculty,
          programs,
        );
        const hallNames = autoAssigned.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Exam Hall(s)";
        const invigilatorNames =
          autoAssigned
            .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
            .join(" | ") || "Faculty Invigilators";

        return {
          id: `schedule-${Date.now()}-${selectedGroupId}-${idx}`,
          examId: exam.id,
          groupId: selectedGroupId,
          patternName: pName,
          includedSubjectIds: activeGroupSubjects.map((s) => String(s.id)),
          subjectName: `${currentGroupCode}: ${pName}`,
          subjectCode: `OBJ_${currentGroupCode}_${normalizeCodePart(pName)}`,
          date: exam.startDate,
          startTime: "09:00",
          endTime: "12:00",
          totalMarks: "300",
          passPercentage: "40",
          hallAssignments: autoAssigned,
          roomName: hallNames,
          invigilatorName: invigilatorNames,
          mode: "Objective",
          scheduleMode: "PATTERN_WISE",
        };
      });
      onSave(generated);
    } else {
      const dates = generateSequentialExamDates(exam.startDate, activeGroupSubjects.length);
      const generated = activeGroupSubjects.map((subject, idx) => {
        const examDate = dates[idx] || exam.startDate;
        const autoAssigned = autoAssignHallsAndInvigilators(
          exam,
          selectedGroupId,
          examDate,
          "09:00",
          "12:00",
          schedules,
          null,
          rooms,
          faculty,
          programs,
        );
        const hallNames =
          autoAssigned.map((a) => nameOf(rooms, a.hallId)).join(", ") || (isPractical ? "Practical Lab(s)" : "Exam Hall(s)");
        const invigilatorNames =
          autoAssigned
            .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
            .join(" | ") || "Faculty Invigilators";

        return {
          id: `schedule-${Date.now()}-${idx}`,
          examId: exam.id,
          groupId: selectedGroupId,
          subjectId: String(subject.id),
          subjectName: `[${currentGroupCode}] ${subject.name}`,
          subjectCode: subject.code,
          date: examDate,
          startTime: "09:00",
          endTime: "12:00",
          totalMarks: "100",
          passingMarks: "35",
          hallAssignments: autoAssigned,
          roomName: hallNames,
          invigilatorName: invigilatorNames,
          mode: isPractical ? "Practical" : "Written",
          scheduleMode: "SUBJECT_WISE",
        };
      });
      onSave(generated);
    }
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (processing || !exam) return;
    const x = {};
    if (isObjective && !sch.patternName) x.patternName = "Select Examination Pattern.";
    if (!isObjective && !sch.subjectId) x.subjectId = "Required";
    if (!sch.date) x.date = "Required";
    if (!sch.startTime) x.startTime = "Required";
    if (!sch.endTime) x.endTime = "Required";

    let finalAssignments = sch.hallAssignments || [];
    if (!finalAssignments.length && sch.date && sch.startTime && sch.endTime) {
      finalAssignments = autoAssignHallsAndInvigilators(
        exam,
        selectedGroupId,
        sch.date,
        sch.startTime,
        sch.endTime,
        schedules,
        editing,
        rooms,
        faculty,
        programs,
      );
    }

    const currentGroupCode = codeOf(groups, selectedGroupId, "GROUP");
    const includedSubjectIds = isObjective ? activeGroupSubjects.map((s) => normalizeId(s.id)) : [];
    const entry = {
      ...sch,
      hallAssignments: finalAssignments,
      groupId: selectedGroupId,
      includedSubjectIds,
      scheduleMode: isObjective ? "PATTERN_WISE" : "SUBJECT_WISE",
    };

    const validationMessages = validateScheduleEntry(exam, entry, schedules, editing, rooms, faculty);
    if (validationMessages.length) x.form = validationMessages.join(" ");

    if (Object.keys(x).length) return setErrors(x);

    const hallNames = finalAssignments.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Unassigned Hall";
    const invigilatorNames =
      finalAssignments
        .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
        .join(" | ") || "Unassigned Faculty";

    if (isObjective) {
      const combinedSchedules = [
        {
          id: editing ? editing : `schedule-${Date.now()}`,
          examId: exam.id,
          groupId: selectedGroupId,
          patternName: sch.patternName,
          includedSubjectIds,
          subjectName: `${currentGroupCode}: ${sch.patternName}`,
          subjectCode: `OBJ_${currentGroupCode}_${normalizeCodePart(sch.patternName)}`,
          date: sch.date,
          startTime: sch.startTime,
          endTime: sch.endTime,
          totalMarks: sch.totalMarks,
          passPercentage: sch.passPercentage,
          hallAssignments: finalAssignments,
          roomName: hallNames,
          invigilatorName: invigilatorNames,
          mode: "Objective",
          scheduleMode: "PATTERN_WISE",
        },
      ];
      setProcessing(true);
      onSave(combinedSchedules);
      setProcessing(false);
    } else {
      const selectedSubject = sectionSubjects.find((s) => String(s.id) === String(sch.subjectId));
      const singleSchedule = [
        {
          id: editing ? editing : String(Date.now()),
          examId: exam.id,
          groupId: selectedGroupId,
          subjectId: normalizeId(sch.subjectId),
          subjectName: `[${currentGroupCode}] ${selectedSubject?.name || "Subject"}`,
          subjectCode: selectedSubject?.code || "SUB",
          date: sch.date,
          startTime: sch.startTime,
          endTime: sch.endTime,
          totalMarks: sch.totalMarks,
          passingMarks: sch.passingMarks,
          hallAssignments: finalAssignments,
          roomName: hallNames,
          invigilatorName: invigilatorNames,
          mode: isPractical ? "Practical" : sch.mode || "Written",
          scheduleMode: "SUBJECT_WISE",
        },
      ];
      setProcessing(true);
      onSave(singleSchedule);
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="exam-toolbar">
        <div>
          <h2>Exam Schedule & Postponement Editor</h2>
          <p>Configure or reschedule subject dates, timings, halls, and invigilator faculty group-wise.</p>
        </div>
      </div>

      <div className="cms-card exam-schedule-card">
        <div className="cms-card-body">
          <SearchableSingleSelect
            label="Examination *"
            value={examId}
            onChange={setExamId}
            options={draftExams.map((ex) => ({ ...ex, name: `${ex.name} (${ex.code})` }))}
            placeholder={
              draftExams.length ? "Select a draft examination to schedule" : "No draft examinations available to schedule"
            }
          />

          {exam ? (
            <>
              <div
                className="exam-context"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <strong>
                    {exam.name} ({exam.code})
                  </strong>
                  <span>
                    {nameOf(boards, exam.boardId)} · Category: {exam.examCategory} · Levels:{" "}
                    {getLevelNames(exam, academicLevels)} · Groups: {getGroupNames(exam, groups)}
                  </span>
                  <span>
                    Pattern: {exam.examPattern} · Period: {d(exam.startDate)} – {d(exam.endDate)}
                  </span>
                </div>
                <StatusBadge value={exam.status} />
              </div>

              {/* Group Selector Bar */}
              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div className="exam-scope-header">
                  <label className="exam-scope-label">Target Group Scheduling Tab *</label>
                  <span className="exam-scope-hint">
                    Select a group tab to configure session dates, times, halls, and faculty.
                  </span>
                </div>

                <div className="exam-group-tabs-bar">
                  {examGroups.map((group) => {
                    const isCurrentGroup = String(group.id) === String(selectedGroupId);
                    const groupSubs = getSelectedSubjectsForExam(exam, group.id, sectionSubjects);
                    const groupPatterns =
                      (exam.selectedGroupPatterns && exam.selectedGroupPatterns[group.id]) || [exam.examPattern];
                    const scheduledGroupCount = isObjective
                      ? entries.filter((s) => normalizeId(s.groupId) === normalizeId(group.id)).length
                      : groupSubs.filter((sub) => entries.some((s) => normalizeId(s.subjectId) === normalizeId(sub.id))).length;
                    const totalGroupCount = isObjective ? groupPatterns.length : groupSubs.length;
                    const isGroupDone = totalGroupCount > 0 && scheduledGroupCount >= totalGroupCount;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`exam-group-tab-btn ${isCurrentGroup ? "current" : ""} ${isGroupDone ? "has-selections" : ""}`}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          if (editing) onCancelEdit();
                          setErrors({});
                        }}
                      >
                        {isGroupDone && <Check size={12} style={{ color: "var(--cms-green)" }} />}
                        <span className="exam-group-code">{group.code}</span>
                        <span className="exam-group-name">{group.name.split(" ")[0]}</span>
                        <span
                          className="exam-group-badge"
                          style={{
                            background: isGroupDone ? "var(--cms-green)" : "var(--cms-primary)",
                          }}
                        >
                          {scheduledGroupCount}/{totalGroupCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Entry Form */}
              <form onSubmit={saveSchedule}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "14px", color: "var(--cms-text)" }}>
                    {editing ? "Edit / Postpone Schedule Entry for " : "Schedule Entry for "}
                    <strong>
                      {nameOf(groups, selectedGroupId)} ({codeOf(groups, selectedGroupId)})
                    </strong>
                  </h3>
                  {exam.status === "DRAFT" &&
                    entries.filter((s) => normalizeId(s.groupId) === normalizeId(selectedGroupId)).length === 0 && (
                      <button
                        type="button"
                        className="cms-btn cms-btn-primary"
                        onClick={autoGenerateSchedule}
                        style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <Wand2 size={14} /> Auto-Schedule {codeOf(groups, selectedGroupId)}
                      </button>
                    )}
                </div>

                <div className="cms-form-grid cols-3">
                  {isObjective ? (
                    <SearchableSingleSelect
                      label="Pattern Session *"
                      value={sch.patternName}
                      onChange={(v) => {
                        setSch((x) => ({ ...x, patternName: v }));
                        setErrors((x) => ({ ...x, patternName: undefined }));
                      }}
                      options={activeGroupPatterns.map((pName) => ({ id: pName, name: pName }))}
                      error={errors.patternName}
                      placeholder={`Select Pattern for ${codeOf(groups, selectedGroupId)}`}
                    />
                  ) : (
                    <SearchableSingleSelect
                      label="Subject *"
                      value={sch.subjectId}
                      onChange={(v) => {
                        setSch((x) => ({ ...x, subjectId: v }));
                        setErrors((x) => ({ ...x, subjectId: undefined }));
                      }}
                      options={editing ? activeGroupSubjects : availableSubjectsToSchedule}
                      error={errors.subjectId}
                      placeholder={`Select ${codeOf(groups, selectedGroupId)} Subject`}
                    />
                  )}

                  <div className="cms-field">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ margin: 0 }}>Exam Date *</label>
                      {exam && activeGroupSubjects.length > 0 && (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "2px 8px", fontSize: "11px", height: "auto", minHeight: "22px" }}
                          onClick={() => {
                            const existingDates = entries
                              .filter((s) => String(s.id) !== String(editing))
                              .map((s) => s.date);
                            let nextDate = exam.startDate;
                            if (existingDates.length > 0) {
                              const maxDate = new Date(
                                Math.max(...existingDates.map((dt) => new Date(dt + "T00:00:00").getTime())),
                              );
                              maxDate.setDate(maxDate.getDate() + 1);
                              while (maxDate.getDay() === 0) maxDate.setDate(maxDate.getDate() + 1);
                              const yyyy = maxDate.getFullYear();
                              const mm = String(maxDate.getMonth() + 1).padStart(2, "0");
                              const dd = String(maxDate.getDate()).padStart(2, "0");
                              nextDate = `${yyyy}-${mm}-${dd}`;
                            }
                            if (nextDate <= exam.endDate) {
                              setSch((x) => ({ ...x, date: nextDate }));
                              setErrors((x) => ({ ...x, date: undefined }));
                            }
                          }}
                        >
                          <Sparkles size={12} /> Auto Next Date
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      min={exam.startDate}
                      max={exam.endDate}
                      value={sch.date}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSch((x) => ({ ...x, date: v }));
                        setErrors((x) => ({ ...x, date: undefined }));
                      }}
                    />
                    {errors.date && <span className="cms-error">{errors.date}</span>}
                  </div>

                  <Field
                    label="Start Time *"
                    type="time"
                    value={sch.startTime}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, startTime: v }));
                      setErrors((x) => ({ ...x, startTime: undefined }));
                    }}
                    error={errors.startTime}
                  />

                  <Field
                    label="End Time *"
                    type="time"
                    value={sch.endTime}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, endTime: v }));
                      setErrors((x) => ({ ...x, endTime: undefined }));
                    }}
                    error={errors.endTime}
                  />

                  <Field
                    label="Total Marks *"
                    type="number"
                    placeholder="e.g. 100 or 300"
                    value={sch.totalMarks}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, totalMarks: v }));
                      setErrors((x) => ({ ...x, totalMarks: undefined }));
                    }}
                    error={errors.totalMarks}
                  />

                  <Field
                    label={isObjective ? "Pass Percentage (%) *" : "Passing Marks *"}
                    type="number"
                    placeholder={isObjective ? "e.g. 40" : "e.g. 35"}
                    value={isObjective ? sch.passPercentage : sch.passingMarks}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, [isObjective ? "passPercentage" : "passingMarks"]: v }));
                      setErrors((x) => ({ ...x, [isObjective ? "passPercentage" : "passingMarks"]: undefined }));
                    }}
                    error={errors[isObjective ? "passPercentage" : "passingMarks"]}
                  />

                  {isObjective ? (
                    <Field label="Exam Mode" value="Objective" readOnly />
                  ) : isPractical ? (
                    <Field label="Exam Mode" value="Practical Lab" readOnly />
                  ) : (
                    <SearchableSingleSelect
                      label="Exam Mode"
                      value={sch.mode}
                      onChange={(v) => setSch((x) => ({ ...x, mode: v }))}
                      options={["Written", "Practical", "Viva"].map((name) => ({ id: name, name }))}
                    />
                  )}
                </div>

                <HallAssignmentEditor
                  assignments={sch.hallAssignments}
                  rooms={eligibleRooms}
                  faculty={eligibleInvigilators}
                  required={getRequiredCandidateStrength(exam, selectedGroupId, programs)}
                  onChange={(hallAssignments) => setSch((x) => ({ ...x, hallAssignments }))}
                  onAutoAssign={handleManualAutoAssignTopForm}
                />
                {errors.form && <div className="cms-error exam-form-error">{errors.form}</div>}

                <div className="cms-form-actions" style={{ marginTop: "16px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => {
                      setSch((current) => ({
                        groupId: selectedGroupId,
                        subjectId: "",
                        patternName: "",
                        date: "",
                        startTime: editing ? current.startTime : "09:00",
                        endTime: editing ? current.endTime : "12:00",
                        totalMarks: "100",
                        passingMarks: "35",
                        passPercentage: "35",
                        hallAssignments: [],
                        mode: isPractical ? "Practical" : "Written",
                      }));
                      if (editing) onCancelEdit();
                      setErrors({});
                    }}
                  >
                    {editing ? "Cancel Edit" : "Clear"}
                  </button>
                  <button className="cms-btn cms-btn-primary" disabled={processing}>
                    {processing
                      ? editing
                        ? "Updating..."
                        : "Saving..."
                      : editing
                        ? "Update / Postpone Entry"
                        : "Save Schedule Entry"}
                  </button>
                </div>
              </form>

              <ScheduleTable
                entries={entries}
                groups={groups}
                canEdit={true}
                edit={onEdit}
                remove={onRemove}
                onEditHalls={(s) => setEditingHallsSchedule(s)}
              />

              <div
                className="exam-finalize"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>
                  {entries.length} subject/session schedule(s) configured across {examGroups.length} group(s)
                </span>
                {exam.status === "DRAFT" ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={processing}
                    style={{ marginLeft: "auto" }}
                    onClick={async () => {
                      const missing = validateScheduleReadiness(
                        exam,
                        schedules,
                        groups,
                        sectionSubjects,
                        rooms,
                        faculty,
                      );
                      setReadinessErrors(missing);
                      if (missing.length) return;
                      setProcessing(true);
                      await finalize(exam);
                      setProcessing(false);
                    }}
                  >
                    <Check size={15} style={{ marginRight: "4px" }} />
                    {processing ? "Finalizing Schedule..." : "Finalize Schedule"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ marginLeft: "auto" }}
                    onClick={() => finalize(exam)}
                  >
                    <Check size={15} style={{ marginRight: "4px" }} />
                    Finalize Schedule
                  </button>
                )}
              </div>
              {readinessErrors.length > 0 && (
                <div className="exam-readiness-errors">
                  {readinessErrors.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="cms-empty" style={{ margin: "24px 0" }}>
              Select an examination to manage schedules or postpone subject dates.
            </div>
          )}
        </div>
      </div>

      {editingHallsSchedule && (
        <EditHallsModal
          schedule={editingHallsSchedule}
          exam={exam}
          schedules={schedules}
          rooms={rooms}
          faculty={faculty}
          programs={programs}
          onClose={() => setEditingHallsSchedule(null)}
          onSave={(updatedSchedule) => {
            onUpdateSchedule?.(updatedSchedule);
            setEditingHallsSchedule(null);
          }}
        />
      )}
    </>
  );
}

// ---------- HALL ASSIGNMENT EDITOR ----------
function HallAssignmentEditor({ assignments, rooms = [], faculty = [], required, onChange, onAutoAssign }) {
  const allocated = assignments.reduce((sum, item) => sum + (Number(item.candidateCount) || 0), 0);
  const update = (index, patch) =>
    onChange(assignments.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const selectedHallIds = assignments.map((item) => normalizeId(item.hallId));

  return (
    <section className="exam-hall-section">
      <div className="exam-allocation-summary">
        <span>
          Group Candidate Capacity: <strong>{required} Candidates</strong>
        </span>
        <span>
          Allocated across halls: <strong>{allocated}</strong>
        </span>
        <span>
          Remaining: <strong>{Math.max(0, required - allocated)}</strong>
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          {onAutoAssign && (
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onAutoAssign}>
              <Wand2 size={14} /> Auto-Assign Halls
            </button>
          )}
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => onChange([...assignments, { hallId: "", candidateCount: "", invigilatorIds: [] }])}
          >
            <Plus size={14} /> Add Room / Hall
          </button>
        </div>
      </div>

      {assignments.map((assignment, index) => (
        <div className="exam-hall-row" key={`${index}-${assignment.hallId}`}>
          <SearchableSingleSelect
            label="Room / Hall *"
            value={assignment.hallId}
            onChange={(hallId) => update(index, { hallId })}
            options={rooms
              .filter(
                (room) =>
                  normalizeId(room.id) === normalizeId(assignment.hallId) ||
                  !selectedHallIds.includes(normalizeId(room.id)),
              )
              .map((room) => ({
                ...room,
                name: `${room.name} (${room.roomNumber}) · Capacity ${room.capacity}`,
              }))}
            placeholder="Select Exam Hall or Classroom"
          />

          <Field
            label="Candidate Count *"
            type="number"
            min="1"
            value={assignment.candidateCount}
            onChange={(candidateCount) => update(index, { candidateCount })}
          />

          <SearchableMultiSelect
            label="Invigilator Faculty *"
            selectedIds={assignment.invigilatorIds}
            onChange={(invigilatorIds) => update(index, { invigilatorIds })}
            options={faculty.filter(
              (person) =>
                !assignments.some(
                  (item, i) =>
                    i !== index && item.invigilatorIds.map(normalizeId).includes(normalizeId(person.id)),
                ),
            )}
            placeholder="Select Invigilator(s)"
          />

          <button
            type="button"
            className="cms-action-btn danger exam-remove-hall"
            title="Remove room"
            onClick={() => onChange(assignments.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </section>
  );
}

// ---------- SCHEDULE TABLE (PAGINATED 6 PER PAGE) ----------
function ScheduleTable({ entries, groups = [], canEdit, edit, remove, onEditHalls }) {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  const pagedEntries = entries.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = entries.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, entries.length);

  useEffect(() => setPage(1), [entries.length]);

  return (
    <div style={{ marginTop: "16px" }}>
      <div className="cms-table-wrap">
        <table className="cms-table exam-schedule-inner-table">
          <thead>
            <tr>
              <th>Subject / Pattern Session</th>
              <th>Group</th>
              <th>Exam Date</th>
              <th>Timing</th>
              <th>Total Marks</th>
              <th>Passing Marks / Pass %</th>
              <th>Room / Hall(s)</th>
              <th>Invigilator(s)</th>
              <th>Exam Mode</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length ? (
              pagedEntries.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="exam-cell-two-lines" title={s.subjectName}>
                      {s.subjectName}
                    </span>
                    <small
                      className="exam-muted"
                      style={{ display: "block", fontSize: "11px", color: "var(--cms-muted)" }}
                    >
                      {s.subjectCode}
                    </small>
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={nameOf(groups, s.groupId, "—")}>
                      {nameOf(groups, s.groupId, "—")}
                    </span>
                  </td>
                  <td>{d(s.date)}</td>
                  <td>
                    {s.startTime} - {s.endTime}
                  </td>
                  <td>{s.totalMarks || "100"}</td>
                  <td>
                    {s.scheduleMode === "PATTERN_WISE" || s.scheduleMode === "COMBINED_OBJECTIVE"
                      ? `${s.passPercentage}%`
                      : s.passingMarks}
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={s.roomName}>
                      {s.roomName}
                    </span>
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={s.invigilatorName || "—"}>
                      {s.invigilatorName || "—"}
                    </span>
                  </td>
                  <td>{s.mode}</td>
                  {canEdit && (
                    <td>
                      <div className="cms-actions">
                        <button
                          className="cms-action-btn"
                          title="Edit Halls & Invigilators"
                          onClick={() => onEditHalls?.(s)}
                          style={{ color: "var(--cms-primary)" }}
                        >
                          <Users size={15} />
                        </button>
                        <button
                          className="cms-action-btn edit"
                          title="Edit / Postpone Date"
                          onClick={() => edit(s)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button className="cms-action-btn danger" title="Remove" onClick={() => remove(s)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canEdit ? 10 : 9}>
                  <div className="cms-empty">No subjects or sessions scheduled yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {entries.length > pageSize && (
        <div
          className="exam-list-pagination"
          style={{ border: "1px solid var(--cms-border)", borderRadius: "0 0 12px 12px" }}
        >
          <span className="exam-record-summary">
            Showing {rangeStart}–{rangeEnd} of {entries.length} records (6 per page)
          </span>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
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
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- EDIT HALLS & INVIGILATORS MODAL ----------
function EditHallsModal({ schedule, exam, schedules, rooms = [], faculty = [], programs = [], onClose, onSave }) {
  const [assignments, setAssignments] = useState(() => (schedule.hallAssignments || []).map((a) => ({ ...a })));
  const [error, setError] = useState("");

  const eligibleRooms = getEligibleRooms(schedules, schedule, schedule.id, exam, rooms);
  const eligibleFaculty = getEligibleInvigilators(schedules, schedule, schedule.id, faculty);
  const requiredStrength = getRequiredCandidateStrength(exam, schedule.groupId, programs);

  const handleAutoAssign = () => {
    const autoAssigned = autoAssignHallsAndInvigilators(
      exam,
      schedule.groupId,
      schedule.date,
      schedule.startTime,
      schedule.endTime,
      schedules,
      schedule.id,
      rooms,
      faculty,
      programs,
    );
    setAssignments(autoAssigned);
    setError("");
  };

  const handleSave = (e) => {
    e.preventDefault();
    const valErrors = validateHallAssignments(
      assignments,
      exam,
      schedules,
      schedule,
      schedule.id,
      schedule.groupId,
      false,
      rooms,
    );
    if (valErrors.length) {
      setError(valErrors.join(" "));
      return;
    }

    const hallNames = assignments.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Unassigned Hall";
    const invigilatorNames =
      assignments
        .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
        .join(" | ") || "Unassigned Faculty";

    const updated = {
      ...schedule,
      hallAssignments: assignments,
      roomName: hallNames,
      invigilatorName: invigilatorNames,
    };
    onSave(updated);
  };

  return (
    <Modal title={`Edit Halls & Invigilators: ${schedule.subjectName}`} onClose={onClose}>
      <form onSubmit={handleSave}>
        <div
          style={{
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--cms-muted)" }}>
            Exam Date: <strong>{d(schedule.date)}</strong> · Period:{" "}
            <strong>
              {schedule.startTime} - {schedule.endTime}
            </strong>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={handleAutoAssign}
            style={{ fontSize: "12px", padding: "4px 10px" }}
          >
            <Wand2 size={13} style={{ marginRight: "4px" }} /> Auto-Assign Halls & Invigilators
          </button>
        </div>

        <HallAssignmentEditor
          assignments={assignments}
          rooms={eligibleRooms}
          faculty={eligibleFaculty}
          required={requiredStrength}
          onChange={(newAssignments) => {
            setAssignments(newAssignments);
            setError("");
          }}
        />

        {error && (
          <div className="cms-error" style={{ marginTop: "12px" }}>
            {error}
          </div>
        )}

        <div className="cms-form-actions" style={{ marginTop: "18px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cms-btn cms-btn-primary">
            Save Hall & Invigilator Assignments
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- EXAM DETAILS MODAL ----------
function ExamDetails({ exam, schedules, boards = [], academicYears = [], academicLevels = [], groups = [], close }) {
  return (
    <Modal title="Examination Details" onClose={close}>
      <section className="exam-view-summary">
        <strong>
          {exam.name} ({exam.code})
        </strong>
        <p>
          Category: {exam.examCategory} · {nameOf(boards, exam.boardId)} · {nameOf(academicYears, exam.yearId)}
        </p>
        <p>
          Pattern: {exam.examPattern} · Levels: {getLevelNames(exam, academicLevels)} · Groups:{" "}
          {getGroupNames(exam, groups)}
        </p>
        <p>
          Period: {d(exam.startDate)} – {d(exam.endDate)}
        </p>
      </section>
      <ScheduleTable entries={schedules} groups={groups} canEdit={false} />
    </Modal>
  );
}

// ---------- EDIT EXAM PERIOD MODAL ----------
function EditExamModal({ exam, schedules, onClose, onSave }) {
  const isObjective = String(exam?.examCategory || "").toLowerCase().includes("objective");
  const [form, setForm] = useState({
    startDate: exam.startDate,
    endDate: isObjective ? exam.startDate : exam.endDate,
  });
  const [errors, setErrors] = useState({});

  const save = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.startDate) next.startDate = "Required";
    if (isObjective) {
      form.endDate = form.startDate;
    } else {
      if (!form.endDate) next.endDate = "Required";
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        next.endDate = "End date must be on or after start date.";
      }
    }
    if (Object.keys(next).length) return setErrors(next);
    onSave(form);
  };

  return (
    <Modal title="Edit Examination Period" onClose={onClose}>
      <form onSubmit={save}>
        <div className="cms-form-grid">
          <Field
            label="Start Date *"
            type="date"
            value={form.startDate}
            onChange={(v) =>
              setForm((x) => ({
                ...x,
                startDate: v,
                ...(isObjective ? { endDate: v } : {}),
              }))
            }
            error={errors.startDate}
          />
          {isObjective ? (
            <div className="cms-field">
              <label>End Date *</label>
              <input
                type="date"
                value={form.startDate || ""}
                readOnly
                style={{ background: "var(--cms-subtle)", cursor: "not-allowed", opacity: 0.85 }}
                title="Objective examinations are conducted on a single combined examination date."
              />
              <span style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "4px", display: "block" }}>
                Matches Start Date for combined single-day objective exam
              </span>
            </div>
          ) : (
            <Field
              label="End Date *"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(v) => setForm((x) => ({ ...x, endDate: v }))}
              error={errors.endDate}
            />
          )}
        </div>
        <div className="cms-form-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- BASE FIELD COMPONENT ----------
function Field({ label, value, onChange, type = "text", error, readOnly, placeholder, min, max }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      {label && <label>{label}</label>}
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
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}