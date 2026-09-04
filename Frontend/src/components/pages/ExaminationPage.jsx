import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "../common/Ui.jsx";
import "./ExaminationPage.css";

const PAGE_SIZE = 5;
const MOCK_TODAY = "2026-09-03";
const MOCK_DELAY = 250;
const EXAM_CATEGORIES = [
  { id: "REGULAR_ACADEMIC", name: "Regular Academic" },
  { id: "OBJECTIVE", name: "Objective" },
];

// ---------- MOCK DATASETS ----------
const MOCK_BOARDS = [
  { id: "1", name: "State Board of Secondary Education", code: "SBSE", isActive: true },
  { id: "2", name: "Central Board of Secondary Education", code: "CBSE", isActive: true },
  { id: "3", name: "ICSE Board", code: "ICSE", isActive: true },
  { id: "4", name: "International Baccalaureate", code: "IB", isActive: false },
];

const MOCK_ACADEMIC_YEARS = [
  { id: "101", boardId: "1", name: "2024 - 2025", isActive: false },
  { id: "102", name: "2026 - 2027", isActive: true, isCurrent: true },
  { id: "103", boardId: "2", name: "2024 - 2025", isActive: false },
  { id: "104", name: "2025 - 2026", isActive: false, isCurrent: false },
  { id: "105", name: "2027 - 2028", isActive: true, isCurrent: false },
];

const MOCK_ACADEMIC_LEVELS = [
  { id: "1", name: "Grade 10 / Secondary" },
  { id: "2", name: "Intermediate 1st Year" },
  { id: "3", name: "Intermediate 2nd Year" },
  { id: "4", name: "Grade 12 / Senior Secondary" },
];

const MOCK_GROUPS = [
  { id: "1", boardId: "1", name: "MPC (Maths, Physics, Chemistry)", code: "MPC", isActive: true },
  { id: "2", boardId: "1", name: "BiPC (Biology, Physics, Chemistry)", code: "BIPC", isActive: true },
  { id: "3", boardId: "2", name: "MEC (Maths, Economics, Commerce)", code: "MEC", isActive: true },
  { id: "4", boardId: "2", name: "CEC (Civics, Economics, Commerce)", code: "CEC", isActive: true },
  { id: "5", boardId: "1", name: "Legacy Vocational Group", code: "VOC", isActive: false },
];

const MOCK_PROGRAMS = [
  { id: "1", groupId: "1", name: "IIT/JEE Advanced", code: "IIT", isActive: true, objectivePatternCodes: ["IITADV", "MAINS", "EAMCET"] },
  { id: "2", groupId: "1", name: "JEE Mains", code: "MAINS", isActive: true, objectivePatternCodes: ["MAINS", "EAMCET"] },
  { id: "3", groupId: "1", name: "EAMCET Program", code: "EAMCET", isActive: true, objectivePatternCodes: ["EAMCET"] },
  { id: "4", groupId: "1", name: "Regular MPC", code: "REGMPC", isActive: true, objectivePatternCodes: [] },
  { id: "5", groupId: "2", name: "NEET", code: "NEET", isActive: true, objectivePatternCodes: ["NEET", "EAPCETAP"] },
  { id: "6", groupId: "2", name: "EAPCET Agriculture/Pharmacy", code: "EAPCETAP", isActive: true, objectivePatternCodes: ["EAPCETAP"] },
  { id: "7", groupId: "2", name: "Regular BiPC", code: "REGBIPC", isActive: true, objectivePatternCodes: [] },
  { id: "8", groupId: "3", name: "CA Foundation", code: "CA", isActive: true, objectivePatternCodes: ["CAFOUND"] },
  { id: "9", groupId: "3", name: "CLAT", code: "CLAT", isActive: true, objectivePatternCodes: ["CLAT"] },
  { id: "10", groupId: "3", name: "Regular MEC", code: "REGMEC", isActive: true, objectivePatternCodes: [] },
  { id: "11", groupId: "4", name: "IAS/Foundation", code: "IAS", isActive: true, objectivePatternCodes: ["IASFOUND"] },
  { id: "12", groupId: "4", name: "Regular CEC", code: "REGCEC", isActive: true, objectivePatternCodes: [] },
  { id: "13", groupId: "4", name: "Inactive Civil Services Batch", code: "OLDIAS", isActive: false, objectivePatternCodes: ["IASFOUND"] },
];

// ---------- PATTERNS & EXAM TYPES CONFIGURATION ----------
const ACADEMIC_EXAM_PATTERNS = [
  { id: "REG_ANNUAL", name: "Annual Examination Pattern", code: "ANNUAL", scheduleMode: "SUBJECT_WISE" },
  { id: "REG_UNIT", name: "Unit Test Pattern", code: "UNIT", scheduleMode: "SUBJECT_WISE" },
  { id: "REG_QUARTERLY", name: "Quarterly Examination Pattern", code: "QUARTERLY", scheduleMode: "SUBJECT_WISE" },
  { id: "REG_HALF_YEARLY", name: "Half-Yearly Examination Pattern", code: "HALF_YEARLY", scheduleMode: "SUBJECT_WISE" },
  { id: "OTHERS", name: "Others", code: "OTHER", scheduleMode: "SUBJECT_WISE" },
];

const OBJECTIVE_EXAM_PATTERNS = [
  { id: "OBJ_IIT", name: "IIT/JEE Advanced", code: "IITADV", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_MAINS", name: "JEE Mains", code: "MAINS", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_EAMCET", name: "EAMCET", code: "EAMCET", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_NEET", name: "NEET", code: "NEET", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_EAPCET", name: "EAPCET Agriculture/Pharmacy", code: "EAPCETAP", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_CA", name: "CA Foundation", code: "CAFOUND", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_CLAT", name: "CLAT", code: "CLAT", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OBJ_IAS", name: "IAS/Foundation", code: "IASFOUND", scheduleMode: "COMBINED_OBJECTIVE" },
  { id: "OTHERS", name: "Others", code: "OTHER", scheduleMode: "COMBINED_OBJECTIVE" },
];

const ACADEMIC_EXAM_TYPES = [
  { id: "TYP_UNIT", name: "Unit Test" },
  { id: "TYP_QUARTERLY", name: "Quarterly Examination" },
  { id: "TYP_HALF_YEARLY", name: "Half-Yearly Examination" },
  { id: "TYP_PRE_FINAL", name: "Pre-Final Examination" },
  { id: "TYP_ANNUAL", name: "Annual Examination" },
  { id: "OTHERS", name: "Others" },
];

const OBJECTIVE_EXAM_TYPES = [
  { id: "TYP_OBJ_MOCK", name: "Mock Test" },
  { id: "TYP_OBJ_GRAND", name: "Grand Test" },
  { id: "TYP_OBJ_WEEKLY", name: "Weekly Test" },
  { id: "TYP_OBJ_PRACTICE", name: "Practice Test" },
  { id: "OTHERS", name: "Others" },
];

const MOCK_SUBJECTS = [
  { id: "1", name: "Mathematics", code: "MATH-101", groupIds: ["1", "3"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["101", "108"], objectivePatternCodes: ["IITADV", "MAINS", "EAMCET", "CAFOUND"], isActive: true },
  { id: "2", name: "Physics", code: "PHY-101", groupIds: ["1", "2"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["102", "104"], objectivePatternCodes: ["IITADV", "MAINS", "EAMCET", "NEET", "EAPCETAP"], isActive: true },
  { id: "3", name: "Chemistry", code: "CHEM-101", groupIds: ["1", "2"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["103", "105"], objectivePatternCodes: ["IITADV", "MAINS", "EAMCET", "NEET", "EAPCETAP"], isActive: true },
  { id: "4", name: "Biology", code: "BIO-101", groupIds: ["2"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["106"], objectivePatternCodes: ["NEET", "EAPCETAP"], isActive: true },
  { id: "5", name: "English", code: "ENG-101", groupIds: ["1", "2", "3", "4"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["107"], objectivePatternCodes: ["CLAT", "IASFOUND"], isActive: true },
  { id: "6", name: "Economics", code: "ECO-101", groupIds: ["3", "4"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["109"], objectivePatternCodes: ["CAFOUND", "IASFOUND"], isActive: true },
  { id: "7", name: "Commerce", code: "COM-101", groupIds: ["3", "4"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["110"], objectivePatternCodes: ["CAFOUND"], isActive: true },
  { id: "8", name: "Civics", code: "CIV-101", groupIds: ["4"], programIds: [], academicLevelIds: ["2", "3"], facultyIds: ["109"], objectivePatternCodes: ["IASFOUND", "CLAT"], isActive: true },
  { id: "9", name: "Legacy Science", code: "OLD-101", groupIds: ["1"], programIds: [], academicLevelIds: ["2"], facultyIds: [], objectivePatternCodes: [], isActive: false },
];

const MOCK_FACULTY = [
  { id: 101, name: "Rajesh Sharma", designation: "Maths Senior Faculty", subjectsTaught: [1], isActive: true },
  { id: 102, name: "Dr. Ananya Sen", designation: "Physics Department Head", subjectsTaught: [2], isActive: true },
  { id: 103, name: "Priya Nair", designation: "Chemistry Faculty", subjectsTaught: [3], isActive: true },
  { id: 104, name: "Suresh Kumar", designation: "Physics Senior Lecturer", subjectsTaught: [2], isActive: true },
  { id: 105, name: "Ramesh Rao", designation: "Chemistry Associate Professor", subjectsTaught: [3], isActive: true },
  { id: 106, name: "Dr. Sunita Reddy", designation: "Biology Department Head", subjectsTaught: [4], isActive: true },
  { id: 107, name: "David Miller", designation: "English Senior Faculty", subjectsTaught: [5], isActive: true },
  { id: 108, name: "Vikram Singh", designation: "Maths Assistant Professor", subjectsTaught: [1], isActive: true },
  { id: 109, name: "Anita Desai", designation: "General Exam Invigilator", subjectsTaught: [], isActive: true },
  { id: 110, name: "K. V. Sharma", designation: "Administrative Officer", subjectsTaught: [], isActive: true },
  { id: 111, name: "Retired Faculty", designation: "Former Lecturer", subjectsTaught: [], isActive: false },
];

const MOCK_ROOMS = [
  { id: "1", name: "Hall 101", roomNumber: "Block A-101", capacity: 60, status: "Active" },
  { id: "2", name: "Hall 102", roomNumber: "Block A-102", capacity: 60, status: "Active" },
  { id: "3", name: "Exam Hall 201", roomNumber: "Block B-201", capacity: 80, status: "Active" },
  { id: "4", name: "Exam Hall 202", roomNumber: "Block B-202", capacity: 80, status: "Active" },
  { id: "5", name: "Auditorium Main", roomNumber: "Central Block", capacity: 200, status: "Active" },
  { id: "6", name: "Lab 101", roomNumber: "Science Block", capacity: 40, status: "Active" },
  { id: "7", name: "Old Hall", roomNumber: "Old Block", capacity: 30, status: "Inactive" },
];

const MOCK_SCOPE_STRENGTHS = { "1": 48, "2": 46, "3": 42, "4": 38, "5": 44, "6": 40, "7": 45, "8": 36, "9": 34, "10": 41, "11": 32, "12": 37 };

const INITIAL_EXAMINATIONS = [
  {
    id: "1",
    code: "MID-IIT_ADV-001",
    name: "IIT-JEE Advanced Mock Test 1",
    examCategory: "OBJECTIVE",
    boardId: "1",
    yearId: "102",
    levelId: "3",
    groupId: "1",
    groupIds: ["1"],
    programId: "1",
    programIds: ["1"],
    groupProgramSelections: [{ groupId: "1", programIds: ["1"] }],
    assessmentTypeId: "TYP_MID_TERM",
    examType: "Mid Term Examination",
    customExamType: "",
    examPatternId: "OBJ_IIT",
    examPattern: "IIT-JEE Advanced Objective Pattern",
    customExamPattern: "",
    startDate: "2026-09-15",
    endDate: "2026-09-20",
    description: "Combined Objective exam for IIT Advanced batch.",
    status: "SCHEDULED",
    scheduleMode: "COMBINED_OBJECTIVE",
  },
  {
    id: "2",
    code: "MID-REGULAR-002",
    name: "Mid Term Regular Academic Exams",
    examCategory: "REGULAR_ACADEMIC",
    boardId: "1",
    yearId: "102",
    levelId: "2",
    groupId: "1",
    groupIds: ["1", "2"],
    programId: "4",
    programIds: ["4", "7"],
    groupProgramSelections: [{ groupId: "1", programIds: ["4"] }, { groupId: "2", programIds: ["7"] }],
    assessmentTypeId: "TYP_HALF_YEARLY",
    examType: "Half-Yearly Examination",
    customExamType: "",
    examPatternId: "REG_HALF_YEARLY",
    examPattern: "Half-Yearly Examination Pattern",
    customExamPattern: "",
    startDate: "2026-10-01",
    endDate: "2026-10-10",
    description: "Subject-wise written examinations for Intermediate MPC & BiPC Groups.",
    status: "DRAFT",
    scheduleMode: "SUBJECT_WISE",
  },
  {
    id: "3",
    code: "PRE-NEET-003",
    name: "NEET Preparatory Exam 2026",
    examCategory: "OBJECTIVE",
    boardId: "1",
    yearId: "102",
    levelId: "3",
    groupId: "2",
    groupIds: ["2"],
    programId: "5",
    programIds: ["5"],
    groupProgramSelections: [{ groupId: "2", programIds: ["5"] }],
    assessmentTypeId: "TYP_PRE_FINAL",
    examType: "Pre-Final Examination",
    customExamType: "",
    examPatternId: "OBJ_NEET",
    examPattern: "NEET Objective Pattern",
    customExamPattern: "",
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    description: "Combined Objective NEET pattern exam.",
    status: "COMPLETED",
    scheduleMode: "COMBINED_OBJECTIVE",
  },
];

const INITIAL_SCHEDULES = [
  {
    id: "101",
    examId: "1",
    includedSubjectIds: ["1", "2", "3"],
    subjectName: "Mathematics, Physics, Chemistry",
    subjectCode: "COMBINED",
    date: "2026-09-15",
    startTime: "09:00",
    endTime: "12:00",
    totalMarks: "300",
    passPercentage: "40",
    roomName: "Hall 101, Hall 102",
    invigilatorName: "Hall 101: Anita Desai | Hall 102: K. V. Sharma",
    hallAssignments: [
      { hallId: "1", candidateCount: 24, invigilatorIds: ["109"] },
      { hallId: "2", candidateCount: 24, invigilatorIds: ["110"] },
    ],
    mode: "Objective",
    scheduleMode: "COMBINED_OBJECTIVE",
  },
];

// ---------- HELPER FUNCTIONS ----------
const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value + "T00:00:00"),
      )
    : "—";

const normalizeId = (value) => String(value ?? "");
const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
const normalizeCodePart = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hasTimeOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const nameOf = (items, id, fallback = "—") =>
  items.find((x) => String(x.id) === String(id))?.name || fallback;

const codeOf = (items, id, fallback = "—") =>
  items.find((x) => String(x.id) === String(id))?.code || fallback;

const getActiveBoards = () => MOCK_BOARDS.filter((b) => b.isActive);
const getCurrentActiveAcademicYear = () => {
  const current = MOCK_ACADEMIC_YEARS.filter((y) => y.isActive && y.isCurrent);
  return current.length === 1 ? current[0] : null;
};
const getProgramsForGroups = (groupIds = []) => MOCK_PROGRAMS.filter((p) => p.isActive && groupIds.map(normalizeId).includes(normalizeId(p.groupId)));
const getCommonObjectivePatterns = (programIds = []) => {
  const programs = MOCK_PROGRAMS.filter((p) => programIds.map(normalizeId).includes(normalizeId(p.id)));
  if (!programs.length || programs.some((p) => !p.objectivePatternCodes?.length)) return [];
  const common = programs.slice(1).reduce((codes, p) => codes.filter((code) => p.objectivePatternCodes.includes(code)), [...programs[0].objectivePatternCodes]);
  return [...OBJECTIVE_EXAM_PATTERNS.filter((p) => common.includes(p.code)), OBJECTIVE_EXAM_PATTERNS.find((p) => p.id === "OTHERS")].filter(Boolean);
};
const getEligibleSubjects = (exam) => {
  const groups = (exam.groupIds || [exam.groupId]).map(normalizeId);
  const programs = (exam.programIds || [exam.programId]).filter(Boolean).map(normalizeId);
  const pattern = [...ACADEMIC_EXAM_PATTERNS, ...OBJECTIVE_EXAM_PATTERNS].find((p) => p.id === exam.examPatternId);
  return MOCK_SUBJECTS.filter((s) => s.isActive && s.groupIds.some((id) => groups.includes(normalizeId(id))) && s.academicLevelIds.includes(normalizeId(exam.levelId)) && (!s.programIds.length || s.programIds.some((id) => programs.includes(normalizeId(id)))) && (exam.examCategory !== "OBJECTIVE" || exam.examPatternId === "OTHERS" || s.objectivePatternCodes.includes(pattern?.code)));
};
const getRequiredCandidateStrength = (exam) => [...new Set(exam?.programIds || [exam?.programId].filter(Boolean))].reduce((sum, id) => sum + (MOCK_SCOPE_STRENGTHS[normalizeId(id)] || 0), 0);
const getScheduleHallIds = (schedule) => (schedule.hallAssignments || []).map((a) => normalizeId(a.hallId));
const getScheduleInvigilatorIds = (schedule) => (schedule.hallAssignments || []).flatMap((a) => a.invigilatorIds || []).map(normalizeId);
const getEligibleRooms = (schedules, entry, editingId) => MOCK_ROOMS.filter((room) => room.status === "Active" && !schedules.some((s) => normalizeId(s.id) !== normalizeId(editingId) && s.date === entry.date && hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) && getScheduleHallIds(s).includes(normalizeId(room.id))));
const getEligibleInvigilators = (schedules, entry, excludedFacultyIds, editingId) => MOCK_FACULTY.filter((f) => f.isActive && !excludedFacultyIds.map(normalizeId).includes(normalizeId(f.id)) && !schedules.some((s) => normalizeId(s.id) !== normalizeId(editingId) && s.date === entry.date && hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) && getScheduleInvigilatorIds(s).includes(normalizeId(f.id))));
const localDateTime = (date, time = "00:00") => { const [y, m, day] = String(date).split("-").map(Number); const [h, min] = String(time).split(":").map(Number); return new Date(y, m - 1, day, h || 0, min || 0); };

function validateHallAssignments(assignments, exam, schedules, entry, editingId) {
  const messages = [], seenHalls = new Set(), seenFaculty = new Set();
  if (!assignments.length) messages.push("At least one hall is required.");
  assignments.forEach((a) => {
    const room = MOCK_ROOMS.find((r) => normalizeId(r.id) === normalizeId(a.hallId));
    if (!room || room.status !== "Active") messages.push("Select an active hall.");
    if (seenHalls.has(normalizeId(a.hallId))) messages.push("The same hall cannot be added twice.");
    seenHalls.add(normalizeId(a.hallId));
    const count = Number(a.candidateCount);
    if (!Number.isInteger(count) || count <= 0) messages.push(`${room?.name || "Hall"} requires a positive candidate count.`);
    if (room && count > room.capacity) messages.push(`${room.name} capacity is ${room.capacity}.`);
    if (!a.invigilatorIds?.length) messages.push(`${room?.name || "Hall"} requires an invigilator.`);
    (a.invigilatorIds || []).forEach((id) => { if (seenFaculty.has(normalizeId(id))) messages.push("An invigilator cannot cover two halls in the same session."); seenFaculty.add(normalizeId(id)); });
  });
  const allocated = assignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
  const required = getRequiredCandidateStrength(exam);
  if (allocated !== required) messages.push(`${Math.abs(required - allocated)} candidates are ${allocated < required ? "not allocated" : "over allocated"}.`);
  const eligibleRooms = getEligibleRooms(schedules, entry, editingId).map((r) => normalizeId(r.id));
  assignments.forEach((a) => { if (!eligibleRooms.includes(normalizeId(a.hallId))) messages.push(`${nameOf(MOCK_ROOMS, a.hallId)} has an overlapping schedule.`); });
  return messages;
}

function validateScheduleEntry(exam, entry, schedules, editingId) {
  const messages = [];
  if (!entry.date || entry.date < exam.startDate || entry.date > exam.endDate) messages.push("Exam date must be within the examination period.");
  if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime) messages.push("End time must be later than start time.");
  if (!(Number(entry.totalMarks) > 0)) messages.push("Total Marks must be a positive number.");
  if (exam.examCategory === "OBJECTIVE" && (!(Number(entry.passPercentage) > 0) || Number(entry.passPercentage) > 100)) messages.push("Pass Percentage must be between 1 and 100.");
  if (exam.examCategory === "REGULAR_ACADEMIC" && (!(Number(entry.passingMarks) >= 0) || Number(entry.passingMarks) > Number(entry.totalMarks))) messages.push("Passing Marks must be between 0 and Total Marks.");
  messages.push(...validateHallAssignments(entry.hallAssignments || [], exam, schedules, entry, editingId));
  const subjects = exam.examCategory === "OBJECTIVE" ? getEligibleSubjects(exam) : MOCK_SUBJECTS.filter((s) => normalizeId(s.id) === normalizeId(entry.subjectId));
  const excluded = [...new Set(subjects.flatMap((s) => s.facultyIds).map(normalizeId))];
  const eligibleFacultyIds = getEligibleInvigilators(schedules, entry, excluded, editingId).map((f) => normalizeId(f.id));
  (entry.hallAssignments || []).flatMap((a) => a.invigilatorIds || []).forEach((id) => { if (!eligibleFacultyIds.includes(normalizeId(id))) messages.push(`${nameOf(MOCK_FACULTY, id)} is not eligible for this session.`); });
  return messages;
}

function validateScheduleReadiness(exam, schedules) {
  const entries = schedules.filter((s) => normalizeId(s.examId) === normalizeId(exam.id));
  const messages = [];
  if (exam.examCategory === "OBJECTIVE" && entries.length !== 1) messages.push("Objective examinations require exactly one combined session.");
  if (exam.examCategory === "REGULAR_ACADEMIC") getEligibleSubjects(exam).forEach((subject) => { if (!entries.some((s) => normalizeId(s.subjectId) === normalizeId(subject.id))) messages.push(`${subject.name} has not been scheduled.`); });
  entries.forEach((entry) => messages.push(...validateScheduleEntry(exam, entry, schedules, entry.id)));
  return [...new Set(messages)];
}

function generateUniqueMockExamCode(programIds, patternCode, existingExams) {
  if (!programIds.length || !patternCode) return "";
  const program = MOCK_PROGRAMS.find((p) => normalizeId(p.id) === normalizeId(programIds[0]));
  const prefix = `${programIds.length === 1 ? normalizeCodePart(program?.code) : "MULTI"}-${normalizeCodePart(patternCode)}`;
  const suffixes = existingExams.map((e) => String(e.code || "").match(new RegExp(`^${prefix}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  let next = Math.max(0, ...suffixes) + 1, code = `${prefix}-${String(next).padStart(3, "0")}`;
  while (existingExams.some((e) => e.code === code)) code = `${prefix}-${String(++next).padStart(3, "0")}`;
  return code;
}

const getExamCompletionDateTime = (exam, schedules) => { const rows = schedules.filter((s) => normalizeId(s.examId) === normalizeId(exam.id)); return rows.length ? new Date(Math.max(...rows.map((s) => localDateTime(s.date, s.endTime).getTime()))) : null; };

// Returns comma-separated group names for multi-group examinations
const getGroupNames = (exam) => {
  if (exam.groupIds && exam.groupIds.length > 0) {
    return exam.groupIds
      .map((gid) => nameOf(MOCK_GROUPS, gid))
      .filter(Boolean)
      .join(", ");
  }
  return nameOf(MOCK_GROUPS, exam.groupId);
};

// Automatic transition from SCHEDULED to COMPLETED when schedule period & time are finished
const checkAndAutoTransitionStatus = (exam, allSchedules, now = new Date()) => normalizeStatus(exam.status) === "SCHEDULED" && getExamCompletionDateTime(exam, allSchedules) && getExamCompletionDateTime(exam, allSchedules) <= now ? "COMPLETED" : normalizeStatus(exam.status);

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

  const [exams, setExams] = useState(INITIAL_EXAMINATIONS);
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  const [tab, setTab] = useState("exams");
  const [examId, setExamId] = useState("");
  const [detail, setDetail] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [exportPreview, setExportPreview] = useState(null);
  const [toast, setToast] = useState("");
  const [remove, setRemove] = useState(null);
  const [removeSchedule, setRemoveSchedule] = useState(null);
  const [editing, setEditing] = useState(null);

  // Time-persistent state for scheduling form
  const [sch, setSch] = useState({
    subjectId: "",
    date: "",
    startTime: "",
    endTime: "",
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

  // Automatic status check: Runs on schedules change and periodically every 10 seconds
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

  useEffect(() => {
    const next = loc.state?.scheduleExamId;
    if (!isForm && next) {
      setExamId(String(next));
      setTab("schedule");
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [isForm, loc, nav]);

  const query = search.trim().toLowerCase();
  const list = exams.filter(
    (exam) =>
      (!filters.groupId || String(exam.groupId) === filters.groupId || (exam.groupIds && exam.groupIds.includes(filters.groupId))) &&
      (!filters.programId || (exam.programIds || [exam.programId]).map(normalizeId).includes(filters.programId)) &&
      (!filters.levelId || String(exam.levelId) === filters.levelId) &&
      (!query ||
        [
          exam.code,
          exam.name,
          codeOf(MOCK_BOARDS, exam.boardId),
          getGroupNames(exam),
          nameOf(MOCK_PROGRAMS, exam.programId),
          exam.examType,
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

  const currentExam = exams.find((e) => String(e.id) === examId);

  const printSchedule = () => {
    const targetExams = exams.filter((item) => item.status === "SCHEDULED" || item.status === "COMPLETED");
    const physicalRows = buildExportRows(targetExams, schedules);
    if (!physicalRows.length) return setToast("No scheduled examinations are available to export.");
    setExportPreview({ title: "Scheduled Examinations Export", rows: physicalRows, scope: "global" });
  };

  if (isForm) {
    return (
      <ExamForm
        exams={exams}
        schedules={schedules}
        editId={id}
        onSave={(newRecord) => {
          if (id) {
            setExams((prev) => prev.map((item) => (String(item.id) === String(id) ? newRecord : item)));
            setToast("Examination updated successfully.");
          } else {
            setExams((prev) => [newRecord, ...prev]);
            setToast("Examination created successfully.");
          }
          nav("/dashboard/examinations", { state: { scheduleExamId: newRecord.id } });
        }}
      />
    );
  }

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
        <div className="cms-card exam-list-card">
          <div className="exam-table-toolbar">
            <div className="exam-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, board, group, program, type or status..."
              />
            </div>

            {/* Standard Clean Filters */}
            <div className="exam-toolbar-filters">
              <div className="exam-toolbar-select"><SearchableSingleSelect value={filters.groupId} onChange={(v) => changeFilter("groupId", v)} options={[{ id: "", name: "All Groups" }, ...MOCK_GROUPS.filter((g) => g.isActive)]} placeholder="Select Group" /></div>
              <div className="exam-toolbar-select"><SearchableSingleSelect value={filters.programId} disabled={!filters.groupId} onChange={(v) => changeFilter("programId", v)} options={[{ id: "", name: "All Programs" }, ...getProgramsForGroups([filters.groupId])]} placeholder="Select Program" /></div>
              <div className="exam-toolbar-select"><SearchableSingleSelect value={filters.levelId} onChange={(v) => changeFilter("levelId", v)} options={[{ id: "", name: "All Levels" }, ...MOCK_ACADEMIC_LEVELS]} placeholder="Select Academic Level" /></div>
            </div>

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
                  <th>Group(s)</th>
                  <th>Program</th>
                  <th>Exam Type</th>
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
                      <td title={nameOf(MOCK_BOARDS, e.boardId)}>
                        <span className="exam-cell-two-lines">{codeOf(MOCK_BOARDS, e.boardId)}</span>
                      </td>
                      <td>{nameOf(MOCK_ACADEMIC_YEARS, e.yearId)}</td>
                      <td>{nameOf(MOCK_ACADEMIC_LEVELS, e.levelId)}</td>
                      <td>{getGroupNames(e)}</td>
                      <td>{(e.programIds || [e.programId]).map((pid) => nameOf(MOCK_PROGRAMS, pid)).join(", ")}</td>
                      <td>{e.examType}</td>
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
                            title="View"
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
                                  setTab("schedule");
                                  setEditing(null);
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
                              onClick={() => {
                                const examSchedules = schedules.filter((s) => String(s.examId) === String(e.id));
                                const rows = buildExportRows([e], examSchedules);
                                if (!rows.length) return setToast("No schedules available to export.");
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
                              onClick={() => {
                                setExams((prev) =>
                                  prev.map((item) =>
                                    String(item.id) === String(e.id) ? { ...item, status: "CANCELLED" } : item,
                                  ),
                                );
                                setToast("Examination cancelled.");
                              }}
                            >
                              <X size={15} />
                            </button>
                          )}
                          {e.status === "DRAFT" && (
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
            className="exam-back-text-link exam-schedule-back-link"
            onClick={() => {
              setTab("exams");
              setEditing(null);
              setErrors({});
            }}
          >
            <ArrowLeft size={15} /> Back to Examinations
          </button>
          <ScheduleSection
            exam={currentExam}
            exams={exams}
            schedules={schedules}
            examId={examId}
            setExamId={(v) => {
              setExamId(v);
              setEditing(null);
              setErrors({});
              setSch({ subjectId: "", date: "", startTime: "", endTime: "", totalMarks: "100", passingMarks: "35", passPercentage: "35", hallAssignments: [], mode: "Written" });
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
                setToast("Schedule updated.");
              } else {
                setSchedules((prev) => [...newSchedules, ...prev]);
                setToast("Schedule saved.");
              }
              setEditing(null);
              // Maintain time/date persistence while resetting subject & rooms/invigilators
              setSch((prev) => ({
                ...prev,
                subjectId: "",
                date: "",
                hallAssignments: [],
              }));
              setErrors({});
            }}
            onRemove={(target) => setRemoveSchedule(target)}
            finalize={() => {
              if (!currentExam) return;
              setExams((prev) =>
                prev.map((item) =>
                  String(item.id) === String(currentExam.id) ? { ...item, status: "SCHEDULED" } : item,
                ),
              );
              setToast("Schedule finalized! Examination status updated to SCHEDULED.");
            }}
          />
        </>
      )}

      {detail && (
        <ExamDetails exam={detail.exam} schedules={detail.schedules} close={() => setDetail(null)} />
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          schedules={schedules}
          onClose={() => setEditingExam(null)}
          onSave={(period) => {
            setExams((prev) =>
              prev.map((item) =>
                String(item.id) === String(editingExam.id) ? { ...item, ...period } : item,
              ),
            );
            setEditingExam(null);
            setToast("Examination period updated.");
          }}
        />
      )}

      {exportPreview && (
        <ExportPreviewModal preview={exportPreview} onClose={() => setExportPreview(null)} />
      )}

      {remove && (
        <ConfirmDialog
          title="Delete draft examination"
          message={`Delete ${remove.name}? Its mock schedules will also be removed.`}
          onCancel={() => setRemove(null)}
          onConfirm={() => {
            setExams((prev) => prev.filter((item) => String(item.id) !== String(remove.id)));
            setSchedules((prev) => prev.filter((item) => String(item.examId) !== String(remove.id)));
            setRemove(null);
            setToast("Draft examination deleted.");
          }}
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
            setToast("Schedule removed.");
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
      <PrintableSchedule preview={exportPreview} />
    </DashboardLayout>
  );
}

// ---------- SEARCHABLE SINGLE SELECT WITH HIGH Z-INDEX & "OTHERS" ----------
function SearchableSingleSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  error,
  placeholder = "Select Option",
  allowOthers = false,
  customValue = "",
  onCustomValueChange = null,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { const escape = (e) => { if (e.key === "Escape") { setOpen(false); setSearch(""); } }; document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape); }, []);

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
          aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((prev) => { if (prev) setSearch(""); return !prev; })}
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
                      role="option" aria-selected={isSelected} title={opt.name} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { onChange(opt.id); setOpen(false); setSearch(""); } }}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <span>{opt.name}</span>
                      {isSelected && <Check size={14} style={{ color: "#2563eb" }} />}
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
      {allowOthers && String(value) === "OTHERS" && (
        <div style={{ marginTop: "8px" }}>
          <input
            type="text"
            placeholder="Specify custom value *"
            value={customValue}
            onChange={(e) => onCustomValueChange && onCustomValueChange(e.target.value)}
            style={{
              width: "100%",
              height: "36px",
              padding: "0 12px",
              border: "1px solid var(--cms-border, #cbd5e1)",
              borderRadius: "9px",
              fontSize: "13px",
            }}
          />
        </div>
      )}
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}

// ---------- SEARCHABLE MULTI SELECT WITH HIGH Z-INDEX ----------
function SearchableMultiSelect({ label, selectedIds = [], onChange, options = [], disabled = false, error, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => { const escape = (e) => { if (e.key === "Escape") { setOpen(false); setSearch(""); } }; document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape); }, []);

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
          aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((prev) => { if (prev) setSearch(""); return !prev; })}
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
                      role="option" aria-selected={isChecked} title={opt.name} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") toggleOption(opt.id); }}
                      onClick={() => toggleOption(opt.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
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
                            Cap: {opt.capacity}
                          </small>
                        )}
                      </div>
                      {isChecked && <Check size={14} style={{ color: "#2563eb" }} />}
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

// ---------- FORM COMPONENT WITH DYNAMIC CATEGORIES & AUTO-CODE GENERATION ----------
function ExamForm({ exams, schedules, editId, onSave }) {
  const nav = useNavigate();
  const existing = exams.find((e) => String(e.id) === String(editId));

  const activeBoard = getActiveBoards()[0];
  const activeYear = getCurrentActiveAcademicYear();

  const [form, setForm] = useState(() =>
    existing
      ? {
          ...existing,
          examCategory: existing.examCategory || "REGULAR_ACADEMIC",
          groupIds: existing.groupIds || (existing.groupId ? [existing.groupId] : []),
          programIds: existing.programIds || (existing.programId ? [existing.programId] : []),
          groupProgramSelections: existing.groupProgramSelections || [],
          customExamType: existing.customExamType || "",
          customExamPattern: existing.customExamPattern || "",
        }
      : {
          code: "",
          name: "",
          examCategory: "REGULAR_ACADEMIC", // Default Examination Category
          boardId: activeBoard.id, // Auto-selected active board
          yearId: activeYear?.id || "",
          levelId: "",
          groupId: "",
          groupIds: [], // Multi-group array for BOTH Academic and Objective
          programId: "",
          programIds: [],
          groupProgramSelections: [],
          assessmentTypeId: "",
          examType: "",
          customExamType: "",
          examPatternId: "",
          examPattern: "",
          customExamPattern: "",
          startDate: "",
          endDate: "",
          description: "",
          status: "DRAFT",
        },
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const todayStr = MOCK_TODAY;

  const isAcademic = form.examCategory === "REGULAR_ACADEMIC";

  // Filter Patterns dynamically based on Category, Program and Group
  const availablePatterns = isAcademic
    ? ACADEMIC_EXAM_PATTERNS
    : getCommonObjectivePatterns(form.programIds);

  // Available Exam Types dynamically based on Category
  const availableTypes = isAcademic ? ACADEMIC_EXAM_TYPES : OBJECTIVE_EXAM_TYPES;

  const change = (n, v) => {
    setForm((x) => {
      const nextForm = {
        ...x,
        [n]: v,
        ...(n === "examCategory" ? { assessmentTypeId: "", customExamType: "", examPatternId: "", customExamPattern: "" } : {}),
        ...(n === "boardId" ? { groupIds: [], groupId: "", programId: "", programIds: [], groupProgramSelections: [], assessmentTypeId: "", examPatternId: "" } : {}),
        ...(n === "groupIds" ? { groupId: v[0] || "", programIds: x.programIds.filter((id) => getProgramsForGroups(v).some((p) => normalizeId(p.id) === normalizeId(id))), examPatternId: "" } : {}),
        ...(n === "programIds" ? { programId: v[0] || "", examPatternId: "" } : {}),
      };

      // Autogenerate Exam Code dynamically if Code is not manually locked or on type/pattern selection
      if (["programIds", "examPatternId", "customExamPattern"].includes(n) && !existing) {
        const patternObj = availablePatterns.find((p) => String(p.id) === String(nextForm.examPatternId));
        const patternCode = patternObj?.id === "OTHERS" ? nextForm.customExamPattern : patternObj?.code;
        nextForm.code = generateUniqueMockExamCode(nextForm.programIds, patternCode, exams);
      }

      return nextForm;
    });

    setErrors((x) => ({ ...x, [n]: undefined }));
  };

  const availableYears = MOCK_ACADEMIC_YEARS.filter((y) => y.isActive);
  const availableGroups = MOCK_GROUPS.filter((g) => g.isActive && g.boardId === form.boardId);

  // Available Programs matching any selected group
  const availablePrograms = getProgramsForGroups(form.groupIds);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const x = {};
    if (!form.code.trim()) x.code = "Exam Code is required.";
    if (!form.name.trim()) x.name = "Exam Name is required.";
    if (!form.boardId) x.boardId = "Required";
    if (!form.yearId) x.yearId = "Required";
    if (!form.levelId) x.levelId = "Required";

    if (!form.groupIds || form.groupIds.length === 0) x.groupIds = "Select at least one Group.";
    form.groupIds.forEach((groupId) => { if (!form.programIds.some((id) => MOCK_PROGRAMS.some((p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(groupId)))) x.programIds = "Select at least one Program for every Group."; });
    if (!form.assessmentTypeId) x.assessmentTypeId = "Required";
    if (form.assessmentTypeId === "OTHERS" && !form.customExamType.trim()) x.customExamType = "Custom Exam Type required.";

    if (!form.examPatternId) x.examPatternId = "Required";
    if (form.examPatternId === "OTHERS" && !form.customExamPattern.trim()) x.customExamPattern = "Custom Exam Pattern required.";
    const patternNames = availablePatterns.filter((p) => p.id !== "OTHERS").map((p) => p.name.toLowerCase());
    if (form.examPatternId === "OTHERS" && patternNames.includes(form.customExamPattern.trim().toLowerCase())) x.customExamPattern = "Custom pattern duplicates an existing pattern.";
    const typeNames = availableTypes.filter((t) => t.id !== "OTHERS").map((t) => t.name.toLowerCase());
    if (form.assessmentTypeId === "OTHERS" && typeNames.includes(form.customExamType.trim().toLowerCase())) x.customExamType = "Custom type duplicates an existing type.";
    if (form.name.trim().length > 120) x.name = "Exam Name cannot exceed 120 characters.";

    if (!form.startDate) x.startDate = "Required";
    if (!form.endDate) x.endDate = "Required";

    if (form.startDate && form.startDate < todayStr && !existing) {
      x.startDate = "Start Date cannot be a past date.";
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      x.endDate = "End date must be on or after start date.";
    }

    const scopeKey = [...form.programIds].map(normalizeId).sort().join("|");
    if (exams.some((item) => normalizeId(item.id) !== normalizeId(existing?.id) && item.name.trim().toLowerCase() === form.name.trim().toLowerCase() && normalizeId(item.yearId) === normalizeId(form.yearId) && normalizeId(item.levelId) === normalizeId(form.levelId) && item.examCategory === form.examCategory && [...(item.programIds || [item.programId])].map(normalizeId).sort().join("|") === scopeKey)) x.name = "An examination with this name already exists for the selected scope.";
    if (form.examCategory === "OBJECTIVE" && form.programIds.length && !availablePatterns.length) x.examPatternId = "The selected programs do not share a common Objective examination pattern.";
    if (Object.keys(x).length) return setErrors(x);

    const selectedType = availableTypes.find((t) => String(t.id) === String(form.assessmentTypeId));
    const selectedPattern = availablePatterns.find((p) => String(p.id) === String(form.examPatternId));

    const finalTypeName = form.assessmentTypeId === "OTHERS" ? form.customExamType : selectedType?.name || "Mid Term Examination";
    const finalPatternName = form.examPatternId === "OTHERS" ? form.customExamPattern : selectedPattern?.name || "Regular Academic Pattern";

    const payload = {
      ...form,
      id: existing ? existing.id : String(Date.now()),
      groupId: form.groupIds[0] || "",
      name: form.name.trim(),
      groupIds: [...new Set(form.groupIds.map(normalizeId))],
      programIds: [...new Set(form.programIds.map(normalizeId))],
      groupProgramSelections: form.groupIds.map((groupId) => ({ groupId, programIds: form.programIds.filter((id) => MOCK_PROGRAMS.some((p) => normalizeId(p.id) === normalizeId(id) && normalizeId(p.groupId) === normalizeId(groupId))) })),
      examPattern: finalPatternName,
      examType: finalTypeName,
      scheduleMode: selectedPattern?.scheduleMode || (isAcademic ? "SUBJECT_WISE" : "COMBINED_OBJECTIVE"),
    };

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
    onSave(payload);
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
                  <p>Select Board, Academic Year, Level, Examination Type & Program.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3">
                {/* Examination Type Selector: Academic vs Objective */}
                <SearchableSingleSelect label="Examination Category *" value={form.examCategory} onChange={(v) => change("examCategory", v)} options={EXAM_CATEGORIES} error={errors.examCategory} />

                {/* Auto-selected Active Board */}
                <SearchableSingleSelect
                  label="Board *"
                  value={form.boardId}
                  onChange={(v) => change("boardId", v)}
                  options={getActiveBoards()}
                  error={errors.boardId}
                  placeholder="Select Board"
                />

                {/* Auto-selected Active Academic Year */}
                <SearchableSingleSelect
                  label="Academic Year *"
                  value={form.yearId}
                  disabled={!form.boardId}
                  onChange={(v) => change("yearId", v)}
                  options={availableYears}
                  error={errors.yearId}
                  placeholder="Select Academic Year"
                />

                <SearchableSingleSelect
                  label="Academic Level *"
                  value={form.levelId}
                  disabled={!form.yearId}
                  onChange={(v) => change("levelId", v)}
                  options={MOCK_ACADEMIC_LEVELS}
                  error={errors.levelId}
                  placeholder="Select Academic Level"
                />

                {/* Searchable Multi Group Select for BOTH Academic & Objective */}
                <SearchableMultiSelect
                  label="Group(s) *"
                  selectedIds={form.groupIds}
                  disabled={!form.levelId}
                  onChange={(ids) => change("groupIds", ids)}
                  options={availableGroups}
                  error={errors.groupIds}
                  placeholder="Select Group(s)"
                />

                <SearchableMultiSelect
                  label="Program(s) *"
                  selectedIds={form.programIds}
                  disabled={!form.groupIds.length}
                  onChange={(v) => change("programIds", v)}
                  options={availablePrograms}
                  error={errors.programIds}
                  placeholder="Select Program(s)"
                />

                {/* Exam Pattern Searchable Dropdown with "Others" custom input */}
                <SearchableSingleSelect
                  label="Exam Pattern *"
                  value={form.examPatternId}
                  disabled={!form.programIds.length || (!isAcademic && !availablePatterns.length)}
                  onChange={(v) => change("examPatternId", v)}
                  options={availablePatterns}
                  error={errors.examPatternId}
                  placeholder="Select Exam Pattern"
                  allowOthers={true}
                  customValue={form.customExamPattern}
                  onCustomValueChange={(val) => change("customExamPattern", val)}
                />

                {/* Exam Type Searchable Dropdown with "Others" custom input */}
                <SearchableSingleSelect
                  label="Exam Type *"
                  value={form.assessmentTypeId}
                  disabled={!form.examPatternId}
                  onChange={(v) => change("assessmentTypeId", v)}
                  options={availableTypes}
                  error={errors.assessmentTypeId}
                  placeholder="Select Exam Type"
                  allowOthers={true}
                  customValue={form.customExamType}
                  onCustomValueChange={(val) => change("customExamType", val)}
                />
              </div>
            </section>

            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Examination Information</h2>
                  <p>Specify Exam Code, Exam Name & Examination Period.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3">
                <Field
                  label="Exam Code *"
                  placeholder="Autogenerated e.g. MID-EAMCET-001"
                  value={form.code}
                  readOnly
                  error={errors.code}
                />
                <Field
                  label="Exam Name *"
                  placeholder="e.g. Mid Term Examinations"
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
                <Field
                  label="End Date *"
                  type="date"
                  min={form.startDate || todayStr}
                  value={form.endDate}
                  onChange={(v) => change("endDate", v)}
                  error={errors.endDate}
                />
                <Field
                  label="Description"
                  type="textarea"
                  placeholder="Optional exam notes or instructions..."
                  value={form.description}
                  onChange={(v) => change("description", v)}
                />
              </div>
            </section>

            <div className="cms-form-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => nav("/dashboard/examinations")}
              >
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" disabled={saving}>
                {saving ? (existing ? "Updating..." : "Saving...") : (existing ? "Update Examination" : "Save Examination")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

// ---------- SCHEDULE SECTION WITH MANDATORY MARKS & TIME PERSISTENCE ----------
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
}) {
  const entries = exam ? schedules.filter((s) => String(s.examId) === String(exam.id)) : [];
  const isCombined = exam?.scheduleMode === "COMBINED_OBJECTIVE";
  const [processing, setProcessing] = useState(false);
  const [readinessErrors, setReadinessErrors] = useState([]);

  // Filter subjects according to examination's selected Group(s)
  const groupFilteredSubjects = exam ? getEligibleSubjects(exam) : [];

  const availableSubjects = groupFilteredSubjects.filter(
    (sub) => !entries.some((s) => String(s.subjectId) === String(sub.id) && String(s.id) !== String(editing)),
  );

  const excludedFacultyIds = [...new Set((isCombined ? groupFilteredSubjects : groupFilteredSubjects.filter((s) => normalizeId(s.id) === normalizeId(sch.subjectId))).flatMap((s) => s.facultyIds).map(normalizeId))];

  // Invigilator Exclusion Rule: Faculty teaching the scheduled subject CANNOT be assigned as invigilator for that subject's exam!
  const eligibleInvigilators = getEligibleInvigilators(schedules, sch, excludedFacultyIds, editing);

  // Eligible Rooms Filter: Excludes rooms already assigned during overlapping date & time slot
  const eligibleRooms = getEligibleRooms(schedules, sch, editing);

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (processing || !exam) return;
    const x = {};
    if (!isCombined && !sch.subjectId) x.subjectId = "Required";
    if (!sch.date) x.date = "Required";
    if (!sch.startTime) x.startTime = "Required";
    if (!sch.endTime) x.endTime = "Required";

    const includedSubjectIds = isCombined ? groupFilteredSubjects.map((s) => normalizeId(s.id)) : [];
    const entry = { ...sch, includedSubjectIds, scheduleMode: isCombined ? "COMBINED_OBJECTIVE" : "SUBJECT_WISE" };
    const validationMessages = validateScheduleEntry(exam, entry, schedules, editing);
    if (validationMessages.length) x.form = validationMessages.join(" ");

    if (Object.keys(x).length) return setErrors(x);

    const hallNames = sch.hallAssignments.map((a) => nameOf(MOCK_ROOMS, a.hallId)).join(", ");
    const invigilatorNames = sch.hallAssignments.map((a) => `${nameOf(MOCK_ROOMS, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(MOCK_FACULTY, id)).join(", ")}`).join(" | ");

    if (isCombined) {
      const combinedSchedules = [{
        id: editing ? editing : `schedule-${Date.now()}`,
        examId: exam.id,
        includedSubjectIds,
        subjectName: groupFilteredSubjects.map((subject) => subject.name).join(", "),
        subjectCode: "COMBINED",
        date: sch.date,
        startTime: sch.startTime,
        endTime: sch.endTime,
        totalMarks: sch.totalMarks,
        passPercentage: sch.passPercentage,
        hallAssignments: sch.hallAssignments,
        roomName: hallNames,
        invigilatorName: invigilatorNames,
        mode: "Objective",
        scheduleMode: "COMBINED_OBJECTIVE",
      }];
      setProcessing(true); await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY)); setProcessing(false);
      onSave(combinedSchedules);
    } else {
      const selectedSubject = MOCK_SUBJECTS.find((s) => String(s.id) === String(sch.subjectId));
      const singleSchedule = [
        {
          id: editing ? editing : String(Date.now()),
          examId: exam.id,
          subjectId: normalizeId(sch.subjectId),
          subjectName: selectedSubject?.name || "Subject",
          subjectCode: selectedSubject?.code || "SUB",
          date: sch.date,
          startTime: sch.startTime,
          endTime: sch.endTime,
          totalMarks: sch.totalMarks,
          passingMarks: sch.passingMarks,
          hallAssignments: sch.hallAssignments,
          roomName: hallNames,
          invigilatorName: invigilatorNames,
          mode: sch.mode || "Written",
          scheduleMode: "SUBJECT_WISE",
        },
      ];
      setProcessing(true); await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY)); setProcessing(false);
      onSave(singleSchedule);
    }
  };

  // ONLY DRAFT Examinations are available to schedule!
  const draftExamsOnly = exams.filter((e) => e.status === "DRAFT");

  return (
    <>
      <div className="exam-toolbar">
        <div>
          <h2>Exam Schedule</h2>
          <p>Select a Draft examination to configure subject schedules, timings, total marks & invigilators.</p>
        </div>
      </div>

      <div className="cms-card exam-schedule-card">
        <div className="cms-card-body">
          <SearchableSingleSelect label="Examination *" value={examId} onChange={setExamId} options={draftExamsOnly.map((ex) => ({ ...ex, name: `${ex.name} (${ex.code})` }))} placeholder="Select a draft examination" />

          {exam ? (
            <>
              <div className="exam-context" style={{ margin: "16px 0" }}>
                <strong>{exam.name} ({exam.code})</strong>
                <span>
                  {nameOf(MOCK_BOARDS, exam.boardId)} · Groups: {getGroupNames(exam)} ·{" "}
                  {nameOf(MOCK_PROGRAMS, exam.programId)}
                </span>
                <span>
                  Pattern: {exam.examPattern} · Period: {d(exam.startDate)} – {d(exam.endDate)}
                </span>
              </div>

              {exam.status === "DRAFT" ? (
                <form onSubmit={saveSchedule}>
                  <div className="cms-form-grid cols-3">
                    {isCombined ? (
                      <div className="cms-field exam-included-subjects">
                        <label>Included Subjects ({groupFilteredSubjects.length})</label>
                        <div style={{ fontSize: "13px", color: "#475569", paddingTop: "8px" }}>
                          {groupFilteredSubjects.map((s) => s.name).join(" · ")}
                        </div>
                      </div>
                    ) : (
                      <SearchableSingleSelect
                        label="Subject *"
                        value={sch.subjectId}
                        onChange={(v) => {
                          setSch((x) => ({ ...x, subjectId: v }));
                          setErrors((x) => ({ ...x, subjectId: undefined }));
                        }}
                        options={availableSubjects}
                        error={errors.subjectId}
                        placeholder="Select Subject"
                      />
                    )}

                    <Field
                      label="Exam Date *"
                      type="date"
                      min={exam.startDate}
                      max={exam.endDate}
                      value={sch.date}
                      onChange={(v) => {
                        setSch((x) => ({ ...x, date: v }));
                        setErrors((x) => ({ ...x, date: undefined }));
                      }}
                      error={errors.date}
                    />

                    {/* Time fields stay persistent for next schedule entries */}
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

                    {/* Mandatory Subject Total Marks */}
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
                      label={isCombined ? "Pass Percentage (%) *" : "Passing Marks *"}
                      type="number"
                      placeholder={isCombined ? "e.g. 40" : "e.g. 35"}
                      value={isCombined ? sch.passPercentage : sch.passingMarks}
                      onChange={(v) => {
                        setSch((x) => ({ ...x, [isCombined ? "passPercentage" : "passingMarks"]: v }));
                        setErrors((x) => ({ ...x, [isCombined ? "passPercentage" : "passingMarks"]: undefined }));
                      }}
                      error={errors[isCombined ? "passPercentage" : "passingMarks"]}
                    />

                    {isCombined ? (
                      <Field label="Exam Mode" value="Objective" readOnly />
                    ) : (
                      <SearchableSingleSelect label="Exam Mode" value={sch.mode} onChange={(v) => setSch((x) => ({ ...x, mode: v }))} options={["Written", "Practical", "Viva"].map((name) => ({ id: name, name }))} />
                    )}
                  </div>

                  <HallAssignmentEditor
                    assignments={sch.hallAssignments}
                    rooms={eligibleRooms}
                    faculty={eligibleInvigilators}
                    required={getRequiredCandidateStrength(exam)}
                    onChange={(hallAssignments) => setSch((x) => ({ ...x, hallAssignments }))}
                  />
                  {errors.form && <div className="cms-error exam-form-error">{errors.form}</div>}

                  <div className="cms-form-actions" style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => {
                        setSch((current) => ({
                          subjectId: "",
                          date: "",
                          startTime: editing ? current.startTime : "",
                          endTime: editing ? current.endTime : "",
                          totalMarks: "100",
                          passingMarks: "35",
                          passPercentage: "35",
                          hallAssignments: [],
                          mode: "Written",
                        }));
                        if (editing) onCancelEdit();
                        setErrors({});
                      }}
                    >
                      {editing ? "Cancel Edit" : "Clear"}
                    </button>
                    <button className="cms-btn cms-btn-primary" disabled={processing}>
                      {processing ? (editing ? "Updating..." : "Saving...") : (editing ? "Update Schedule" : "Save Schedule")}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="exam-help" style={{ color: "#64748b", margin: "12px 0" }}>
                  This examination is {exam.status.toLowerCase()} and its schedule is locked.
                </p>
              )}

              <ScheduleTable entries={entries} canEdit={exam.status === "DRAFT"} edit={onEdit} remove={onRemove} />

              {exam.status === "DRAFT" && (
                <div className="exam-finalize" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#475569" }}>
                    {entries.length} subject(s) scheduled
                  </span>
                  <button className="cms-btn cms-btn-primary" disabled={processing} onClick={async () => { const missing = validateScheduleReadiness(exam, schedules); setReadinessErrors(missing); if (missing.length) return; setProcessing(true); await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY)); finalize(); setProcessing(false); }}>
                    {processing ? "Finalizing..." : "Finalize Schedule"}
                  </button>
                </div>
              )}
              {readinessErrors.length > 0 && <div className="exam-readiness-errors">{readinessErrors.map((message) => <div key={message}>{message}</div>)}</div>}
            </>
          ) : (
            <div className="cms-empty" style={{ margin: "24px 0" }}>
              Select a Draft examination to begin scheduling.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function HallAssignmentEditor({ assignments, rooms, faculty, required, onChange }) {
  const allocated = assignments.reduce((sum, item) => sum + (Number(item.candidateCount) || 0), 0);
  const update = (index, patch) => onChange(assignments.map((item, i) => i === index ? { ...item, ...patch } : item));
  const selectedHallIds = assignments.map((item) => normalizeId(item.hallId));
  return (
    <section className="exam-hall-section">
      <div className="exam-allocation-summary">
        <span>Required: <strong>{required}</strong></span><span>Allocated: <strong>{allocated}</strong></span><span>Remaining: <strong>{required - allocated}</strong></span>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={() => onChange([...assignments, { hallId: "", candidateCount: "", invigilatorIds: [] }])}><Plus size={14} /> Add Hall</button>
      </div>
      {assignments.map((assignment, index) => (
        <div className="exam-hall-row" key={`${index}-${assignment.hallId}`}>
          <SearchableSingleSelect label="Hall *" value={assignment.hallId} onChange={(hallId) => update(index, { hallId })} options={rooms.filter((room) => normalizeId(room.id) === normalizeId(assignment.hallId) || !selectedHallIds.includes(normalizeId(room.id))).map((room) => ({ ...room, name: `${room.name} · ${room.roomNumber} · Capacity ${room.capacity}` }))} placeholder="Select hall" />
          <Field label="Candidate Count *" type="number" min="1" value={assignment.candidateCount} onChange={(candidateCount) => update(index, { candidateCount })} />
          <SearchableMultiSelect label="Invigilator(s) *" selectedIds={assignment.invigilatorIds} onChange={(invigilatorIds) => update(index, { invigilatorIds })} options={faculty.filter((person) => !assignments.some((item, i) => i !== index && item.invigilatorIds.map(normalizeId).includes(normalizeId(person.id))))} />
          <button type="button" className="cms-action-btn danger exam-remove-hall" title="Remove hall" onClick={() => onChange(assignments.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
        </div>
      ))}
    </section>
  );
}

// ---------- SCHEDULE TABLE WITH MARKS COLUMNS ----------
function ScheduleTable({ entries, canEdit, edit, remove }) {
  return (
    <div className="cms-table-wrap exam-schedule-table">
      <table className="cms-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Exam Date</th>
            <th>Timing</th>
            <th>Total Marks</th>
            <th>Passing Marks / Pass %</th>
            <th>Hall(s)</th>
            <th>Invigilator(s)</th>
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
                  <small className="exam-muted" style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                    {s.subjectCode}
                  </small>
                </td>
                <td>{d(s.date)}</td>
                <td>{s.startTime} - {s.endTime}</td>
                <td>{s.totalMarks || "100"}</td>
                <td>{s.scheduleMode === "COMBINED_OBJECTIVE" ? `${s.passPercentage}%` : s.passingMarks}</td>
                <td>{s.roomName}</td>
                <td>{s.invigilatorName || "—"}</td>
                <td>{s.mode}</td>
                {canEdit && (
                  <td>
                    <div className="cms-actions">
                      <button className="cms-action-btn edit" title="Edit" onClick={() => edit(s)}>
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
              <td colSpan={canEdit ? 9 : 8}>
                <div className="cms-empty">No subjects scheduled yet.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- EXAM DETAILS MODAL ----------
function ExamDetails({ exam, schedules, close }) {
  return (
    <Modal title="Examination Details" onClose={close}>
      <section className="exam-view-summary" style={{ marginBottom: "16px" }}>
        <strong style={{ fontSize: "16px", color: "#0f172a" }}>{exam.name} ({exam.code})</strong>
        <p style={{ margin: "4px 0", color: "#475569", fontSize: "13px" }}>
          Category: {exam.examCategory === "OBJECTIVE" ? "Objective Type" : "Regular Academic"} · {nameOf(MOCK_BOARDS, exam.boardId)} · {nameOf(MOCK_ACADEMIC_YEARS, exam.yearId)}
        </p>
        <p style={{ margin: "4px 0", color: "#475569", fontSize: "13px" }}>
          Groups: {getGroupNames(exam)} · {nameOf(MOCK_PROGRAMS, exam.programId)}
        </p>
        <p style={{ margin: "4px 0", color: "#475569", fontSize: "13px" }}>
          Period: {d(exam.startDate)} – {d(exam.endDate)}
        </p>
      </section>
      <ScheduleTable entries={schedules} canEdit={false} />
    </Modal>
  );
}

// ---------- EDIT EXAM PERIOD MODAL ----------
function EditExamModal({ exam, schedules, onClose, onSave }) {
  const [form, setForm] = useState({ startDate: exam.startDate, endDate: exam.endDate });
  const [errors, setErrors] = useState({});

  const save = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.startDate) next.startDate = "Required";
    if (!form.endDate) next.endDate = "Required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = "End date must be on or after start date.";
    }
    if (Object.keys(next).length) return setErrors(next);
    onSave(form);
  };

  return (
    <Modal title="Edit Examination Period" onClose={onClose}>
      <form onSubmit={save}>
        <div className="cms-form-grid" style={{ marginBottom: "16px" }}>
          <Field
            label="Start Date *"
            type="date"
            value={form.startDate}
            onChange={(v) => setForm((x) => ({ ...x, startDate: v }))}
            error={errors.startDate}
          />
          <Field
            label="End Date *"
            type="date"
            min={form.startDate}
            value={form.endDate}
            onChange={(v) => setForm((x) => ({ ...x, endDate: v }))}
            error={errors.endDate}
          />
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

// ---------- EXPORT PREVIEW MODAL & PRINTING ----------
function ExportPreviewModal({ preview, onClose }) {
  const handleDownloadExcel = () => {
    if (!preview.rows.length) return;
    const excelRows = preview.rows.map((row) => ({
      "S.No": row.serialNo,
      "Exam Name": row.examName,
      "Exam Code": row.examCode,
      Board: row.boardName,
      Subject: row.subjectName,
      "Exam Date": d(row.examDate),
      "Start Time": row.startTime,
      "End Time": row.endTime,
      "Total Marks": row.totalMarks,
      "Passing Marks / Pass %": row.markRule,
      "Hall(s)": row.hallName,
      Invigilator: row.invigilatorName,
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
    XLSX.writeFile(workbook, `${preview.title.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <Modal title={preview.title} onClose={onClose}>
      <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "16px" }}>
        <table className="cms-table" style={{ width: "100%", fontSize: "12px" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Exam Name</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Time</th>
              <th>Total Marks</th>
              <th>Pass %</th>
              <th>Hall(s)</th>
              <th>Invigilator(s)</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((r, i) => (
              <tr key={i}>
                <td>{r.serialNo}</td>
                <td>{r.examName}</td>
                <td>{r.subjectName}</td>
                <td>{d(r.examDate)}</td>
                <td>{r.startTime} - {r.endTime}</td>
                <td>{r.totalMarks}</td>
                <td>{r.markRule}</td>
                <td>{r.hallName}</td>
                <td>{r.invigilatorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cms-form-actions">
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={handleDownloadExcel}>
          Download Excel
        </button>
      </div>
    </Modal>
  );
}

function PrintableSchedule({ preview }) {
  if (!preview) return null;
  return (
    <section className="exam-print-area" style={{ display: "none" }}>
      <h2>{preview.title}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Exam Name</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
            <th>Total Marks</th>
            <th>Pass %</th>
            <th>Hall(s)</th>
            <th>Invigilator(s)</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.serialNo}</td>
              <td>{r.examName}</td>
              <td>{r.subjectName}</td>
              <td>{d(r.examDate)}</td>
              <td>{r.startTime} - {r.endTime}</td>
              <td>{r.totalMarks}</td>
              <td>{r.markRule}</td>
              <td>{r.hallName}</td>
              <td>{r.invigilatorName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function buildExportRows(targetExams, schedules) {
  return targetExams
    .flatMap((exam) => {
      const records = schedules.filter((s) => String(s.examId) === String(exam.id));
      return records.map((s) => ({
        examId: exam.id,
        examName: exam.name,
        examCode: exam.code,
        boardName: nameOf(MOCK_BOARDS, exam.boardId),
        subjectName: s.subjectName,
        examDate: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        totalMarks: s.totalMarks || "100",
        markRule: s.scheduleMode === "COMBINED_OBJECTIVE" ? `${s.passPercentage}%` : s.passingMarks,
        hallName: s.roomName,
        invigilatorName: s.invigilatorName || "—",
      }));
    })
    .map((row, idx) => ({ ...row, serialNo: idx + 1 }));
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
