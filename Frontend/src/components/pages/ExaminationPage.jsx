import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Eye, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import "./ExaminationPage.css";

const BOARDS = [{ id: 1, name: "AP State Board", status: "Active" }];
const YEARS = [
  { id: 1, boardId: 1, name: "2025-26" },
  { id: 2, boardId: 1, name: "2026-27" },
];
const LEVELS = [
  { id: 1, boardId: 1, yearId: 2, name: "1st Year" },
  { id: 2, boardId: 1, yearId: 2, name: "2nd Year" },
  { id: 3, boardId: 1, yearId: 1, name: "1st Year" },
];
const GROUPS = [
  { id: 1, boardId: 1, yearId: 2, levelId: 1, code: "MPC", name: "MPC" },
  { id: 2, boardId: 1, yearId: 2, levelId: 1, code: "BIPC", name: "BiPC" },
  { id: 3, boardId: 1, yearId: 2, levelId: 1, code: "CEC", name: "CEC" },
  { id: 4, boardId: 1, yearId: 2, levelId: 2, code: "MPC", name: "MPC" },
  { id: 5, boardId: 1, yearId: 1, levelId: 3, code: "MPC", name: "MPC" },
];
const PROGRAMS = [
  {
    id: "REGULAR",
    name: "Regular Academic",
    allowedGroups: ["MPC", "BIPC", "CEC"],
    category: "REGULAR",
    status: "Active",
  },
  {
    id: "JEE_MAIN",
    name: "JEE Main",
    allowedGroups: ["MPC"],
    category: "ENGINEERING_ENTRANCE",
    status: "Active",
  },
  {
    id: "JEE_ADVANCED",
    name: "JEE Advanced",
    allowedGroups: ["MPC"],
    category: "ENGINEERING_ENTRANCE",
    status: "Active",
  },
  {
    id: "EAPCET",
    name: "EAMCET / EAPCET",
    allowedGroups: ["MPC", "BIPC"],
    category: "ENTRANCE",
    status: "Active",
  },
  {
    id: "NEET",
    name: "NEET",
    allowedGroups: ["BIPC"],
    category: "MEDICAL_ENTRANCE",
    status: "Active",
  },
  {
    id: "MEDICAL_FOUNDATION",
    name: "Medical Foundation",
    allowedGroups: ["BIPC"],
    category: "FOUNDATION",
    status: "Active",
  },
  {
    id: "CA_FOUNDATION",
    name: "CA Foundation",
    allowedGroups: ["CEC"],
    category: "PROFESSIONAL",
    status: "Active",
  },
];
const EXAM_PATTERNS = [
  {
    id: "REGULAR_ACADEMIC",
    name: "Regular Academic Pattern",
    programIds: ["REGULAR"],
    subjectSelection: "ALL",
    languageSubjects: true,
    allowedExamTypes: ["Written", "Practical", "Mixed", "Other"],
    scheduleMode: "SUBJECT_WISE",
    status: "Active",
  },
  {
    id: "JEE_MAIN",
    name: "JEE Main Pattern",
    programIds: ["JEE_MAIN"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
  {
    id: "JEE_ADVANCED",
    name: "JEE Advanced Pattern",
    programIds: ["JEE_ADVANCED"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
  {
    id: "EAPCET",
    name: "EAMCET / EAPCET Pattern",
    programIds: ["EAPCET"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
  {
    id: "NEET",
    name: "NEET Pattern",
    programIds: ["NEET"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
  {
    id: "MEDICAL_FOUNDATION",
    name: "Medical Foundation Pattern",
    programIds: ["MEDICAL_FOUNDATION"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
  {
    id: "CA_FOUNDATION",
    name: "CA Foundation Pattern",
    programIds: ["CA_FOUNDATION"],
    subjectSelection: "CORE",
    languageSubjects: false,
    allowedExamTypes: ["Objective"],
    scheduleMode: "COMBINED",
    status: "Active",
  },
];
const SUBJECTS = [
  [101, "ENG", "English", "MPC"],
  [102, "SAN", "Sanskrit", "MPC"],
  [103, "MATH-1A", "Mathematics IA", "MPC"],
  [104, "MATH-1B", "Mathematics IB", "MPC"],
  [105, "PHY", "Physics", "MPC"],
  [106, "CHE", "Chemistry", "MPC"],
  [201, "ENG-B", "English", "BiPC"],
  [202, "BOT", "Botany", "BiPC"],
  [203, "ZOO", "Zoology", "BiPC"],
  [204, "PHY-B", "Physics", "BiPC"],
  [205, "CHE-B", "Chemistry", "BiPC"],
  [301, "ENG-C", "English", "CEC"],
  [302, "CIV", "Civics", "CEC"],
  [303, "ECO", "Economics", "CEC"],
  [304, "COM", "Commerce", "CEC"],
].map(([id, code, name, group]) => ({
  id,
  code,
  name,
  group,
  category: ["ENG", "SAN", "ENG-B", "ENG-C"].includes(code) ? "LANGUAGE" : "CORE",
  practical: ["PHY", "CHE", "PHY-B", "CHE-B", "BOT", "ZOO"].includes(code),
  objectiveEligible: !["ENG", "SAN", "ENG-B", "ENG-C"].includes(code),
  status: "Active",
}));
const FACULTY = [
  { id: 1, name: "Ravi Kumar", subjectIds: [103, 104], status: "Active" },
  { id: 2, name: "Priya", subjectIds: [105, 204], status: "Active" },
  { id: 3, name: "Anil", subjectIds: [106, 205], status: "Active" },
  { id: 4, name: "Suresh", subjectIds: [101, 201, 301], status: "Active" },
  { id: 5, name: "Lakshmi", subjectIds: [102], status: "Active" },
  { id: 6, name: "Kiran", subjectIds: [], status: "Active" },
  { id: 7, name: "Deepa", subjectIds: [], status: "Active" },
  { id: 8, name: "Mahesh", subjectIds: [], status: "Active" },
];
const ROOMS = [
  { id: 1, code: "A-101", name: "Room A-101", capacity: 50, status: "Active" },
  { id: 2, code: "A-102", name: "Room A-102", capacity: 60, status: "Active" },
  { id: 3, code: "Hall-1", name: "Main Hall", capacity: 120, status: "Active" },
];
const TYPES = ["Written", "Objective", "Practical", "Mixed", "Other"];
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
const seed = [
  {
    id: 1,
    code: "EXM-2026-001",
    name: "Quarterly Examination",
    boardId: 1,
    yearId: 2,
    levelId: 1,
    groupId: 1,
    programId: "REGULAR",
    examPatternId: "REGULAR_ACADEMIC",
    examType: "Written",
    type: "Written",
    startDate: "2026-09-15",
    endDate: "2026-09-22",
    totalMarks: 600,
    passPercentage: 35,
    description: "First-year MPC quarterly assessment.",
    status: "DRAFT",
  },
];
const overlaps = (a, b, c, d) => a < d && b > c;
const nameOf = (items, id, fallback = "All Programs") =>
  items.find((x) => String(x.id) === String(id))?.name || fallback;
const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value + "T00:00:00"),
      )
    : "—";
const subjectsFor = (exam) => {
  const group = GROUPS.find((item) => String(item.id) === String(exam?.groupId)),
    program = PROGRAMS.find((item) => String(item.id) === String(exam?.programId)),
    pattern = EXAM_PATTERNS.find((item) => String(item.id) === String(exam?.examPatternId));
  if (!group || !program || !pattern) return [];
  let subjects = SUBJECTS.filter(
    (subject) => subject.status === "Active" && subject.group === group.name,
  );
  if (exam.examType === "Practical") return subjects.filter((subject) => subject.practical);
  if (pattern.subjectSelection === "CORE")
    subjects = subjects.filter(
      (subject) => subject.category === "CORE" && subject.objectiveEligible,
    );
  return pattern.languageSubjects
    ? subjects
    : subjects.filter((subject) => subject.category !== "LANGUAGE");
};
const programsForGroup = (groupId) => {
  const group = GROUPS.find((item) => String(item.id) === String(groupId));
  return group
    ? PROGRAMS.filter(
        (program) => program.status === "Active" && program.allowedGroups.includes(group.code),
      )
    : [];
};
const patternsForProgram = (programId) =>
  EXAM_PATTERNS.filter(
    (pattern) =>
      pattern.status === "Active" &&
      pattern.programIds.some((id) => String(id) === String(programId)),
  );
const validateExamConfiguration = (exam) => {
  const group = GROUPS.find((item) => String(item.id) === String(exam.groupId)),
    program = PROGRAMS.find((item) => String(item.id) === String(exam.programId)),
    pattern = EXAM_PATTERNS.find((item) => String(item.id) === String(exam.examPatternId));
  if (
    !group ||
    !program ||
    !program.allowedGroups.includes(group.code) ||
    !pattern ||
    !pattern.programIds.includes(program.id) ||
    !exam.examType ||
    !pattern.allowedExamTypes.includes(exam.examType)
  )
    return "Select a valid Program, Exam Pattern and Exam Type.";
  return "";
};
const getScheduleMode = (exam) =>
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
const MARKS_CONFIG = {
  REGULAR_ACADEMIC: {
    Written: { maxMarks: 100, passingMarks: 35 },
    Practical: { maxMarks: 30, passingMarks: 12 },
    Mixed: { maxMarks: 100, passingMarks: 35 },
    Other: { maxMarks: 100, passingMarks: 35 },
  },
  JEE_MAIN: { Objective: { maxMarks: 100, passingMarks: 35 } },
  JEE_ADVANCED: { Objective: { maxMarks: 100, passingMarks: 35 } },
  EAPCET: { Objective: { maxMarks: 100, passingMarks: 35 } },
  NEET: { Objective: { maxMarks: 100, passingMarks: 35 } },
  MEDICAL_FOUNDATION: { Objective: { maxMarks: 100, passingMarks: 35 } },
  CA_FOUNDATION: { Objective: { maxMarks: 100, passingMarks: 35 } },
};
const getMarksConfig = (exam, subject) => {
  const config = MARKS_CONFIG[exam?.examPatternId]?.[exam?.examType];
  return config && subjectsFor(exam).some((item) => String(item.id) === String(subject?.id))
    ? { ...config }
    : null;
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
const getEligibleInvigilators = (candidate, schedules, includedIds = []) =>
  FACULTY.filter(
    (faculty) =>
      faculty.status === "Active" &&
      !(candidate.scheduleMode === "COMBINED"
        ? faculty.subjectIds.some((id) => includedIds.includes(Number(id)))
        : faculty.subjectIds.includes(Number(candidate.subjectId))) &&
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
  const [exams, setExams] = useState(() => seed.map((exam) => ({ ...exam }))),
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
    [finalizing, setFinalizing] = useState(false);
  useEffect(() => {
    const next = loc.state?.scheduleExamId;
    if (!isForm && next) {
      setExamId(String(next));
      setTab("schedule");
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [isForm, loc, nav]);
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
        onSave={(record) => {
          setExams((x) =>
            id ? x.map((e) => (String(e.id) === String(id) ? record : e)) : [record, ...x],
          );
          nav("/dashboard/examinations", { state: { scheduleExamId: record.id } });
        }}
      />
    );
  const reset = (n, v) =>
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
            onCheck={() => setAppliedFilters({ ...filters })}
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
                              onClick={() => setDetail(e)}
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
                                onClick={() =>
                                  setExams((x) =>
                                    x.map((y) =>
                                      y.id === e.id ? { ...y, status: "CANCELLED" } : y,
                                    ),
                                  )
                                }
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
            onSave={(records) => {
              const wasEditing = Boolean(editing),
                nextRecords = Array.isArray(records) ? records : [records],
                candidate = nextRecords[0];
              setSchedules((current) => {
                if (!wasEditing) return [...current, ...nextRecords];
                if (candidate.scheduleMode === "COMBINED") {
                  const existingIds = current
                      .filter(
                        (s) =>
                          String(s.examId) === String(candidate.examId) &&
                          s.sessionId === candidate.sessionId,
                      )
                      .map((s) => String(s.subjectId)),
                    missing = nextRecords.filter(
                      (record) => !existingIds.includes(String(record.subjectId)),
                    );
                  return [
                    ...current.map((s) =>
                      String(s.examId) === String(candidate.examId) &&
                      s.sessionId === candidate.sessionId
                        ? {
                            ...s,
                            date: candidate.date,
                            startTime: candidate.startTime,
                            endTime: candidate.endTime,
                            roomId: candidate.roomId,
                            invigilatorId: candidate.invigilatorId,
                            mode: candidate.mode,
                          }
                        : s,
                    ),
                    ...missing,
                  ];
                }
                return current.map((s) => (s.id === editing ? candidate : s));
              });
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
                      !ROOMS.some(
                        (room) => String(room.id) === String(item.roomId) && room.status === "Active",
                      ) ||
                      !FACULTY.some(
                        (faculty) =>
                          String(faculty.id) === String(item.invigilatorId) &&
                          faculty.status === "Active" &&
                          !faculty.subjectIds.includes(Number(item.subjectId)),
                      ) ||
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
                  invigilator = FACULTY.find(
                    (faculty) => String(faculty.id) === String(first?.invigilatorId),
                  ),
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
                    invigilator?.status === "Active" &&
                    !invigilator.subjectIds.some((id) => expectedIds.includes(String(id))) &&
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
                await new Promise((resolve) => requestAnimationFrame(resolve));
                setExams((x) =>
                  x.map((e) => (e.id === exam.id ? { ...e, status: "SCHEDULED" } : e)),
                );
                setToast("Schedule finalized. Examination is now scheduled.");
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
          onSave={(period) => {
            setExams((current) =>
              current.map((item) =>
                String(item.id) === String(editingExam.id) ? { ...item, ...period } : item,
              ),
            );
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
          onConfirm={() => {
            setExams((x) => x.filter((e) => e.id !== remove.id));
            setRemove(null);
            setToast("Draft examination deleted.");
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
          onConfirm={() => {
            setSchedules((x) =>
              x.filter((s) =>
                removeSchedule.scheduleMode === "COMBINED"
                  ? !(
                      String(s.examId) === String(removeSchedule.examId) &&
                      s.sessionId === removeSchedule.sessionId
                    )
                  : s.id !== removeSchedule.id,
              ),
            );
            setRemoveSchedule(null);
            setToast("Schedule removed.");
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
      <PrintableSchedule preview={exportPreview} />
    </DashboardLayout>
  );
}
function Filters({ f, change, onCheck, onReset }) {
  const y = YEARS.filter((x) => !f.boardId || String(x.boardId) === f.boardId),
    l = LEVELS.filter((x) => String(x.yearId) === f.yearId),
    g = GROUPS.filter((x) => String(x.levelId) === f.levelId),
    p = programsForGroup(f.groupId);
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
function ExamForm({ exams, schedules, editId, onSave }) {
  const nav = useNavigate(),
    existing = exams.find((e) => String(e.id) === String(editId)),
    [form, setForm] = useState(() =>
      existing
        ? { ...existing, programId: String(existing.programId) }
        : { ...emptyExam(), code: `EXM-2026-${String(exams.length + 1).padStart(3, "0")}` },
    ),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false),
    locked = !!(existing && schedules.some((s) => s.examId === existing.id));
  const change = (n, v) =>
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
      })),
    y = YEARS.filter((x) => String(x.boardId) === String(form.boardId)),
    l = LEVELS.filter((x) => String(x.yearId) === String(form.yearId)),
    g = GROUPS.filter((x) => String(x.levelId) === String(form.levelId)),
    p = programsForGroup(form.groupId),
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
      await new Promise((resolve) => requestAnimationFrame(resolve));
      onSave({
        ...form,
        type: form.examType,
        id: existing?.id || Date.now(),
        name: form.name.trim(),
      });
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
    includedIds = included.map((s) => Number(s.id)),
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
    faculty = getEligibleInvigilators(candidate, schedules, includedIds),
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
      await new Promise((resolve) => requestAnimationFrame(resolve));
      onSave(combined ? included.map(make) : [make(selectedSubjects[0])]);
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
      <h1>Pirnav Junior College</h1>
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
