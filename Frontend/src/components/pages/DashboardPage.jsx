import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FileText, GraduationCap, RotateCcw, Users, Info } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import totalStudentsIcon from "@/assets/dashboard-3d/total-students.png";
import teachingStaffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import nonTeachingStaffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import totalGroupsIcon from "@/assets/dashboard-3d/total-groups.png";
import totalSectionsIcon from "@/assets/dashboard-3d/total-sections.png";
import addStudentIcon from "@/assets/dashboard-3d/add-student.png";
import addStaffIcon from "@/assets/dashboard-3d/add-staff.png";
import createGroupIcon from "@/assets/dashboard-3d/create-group.png";
import createSectionIcon from "@/assets/dashboard-3d/create-section.png";
import createExamIcon from "@/assets/dashboard-3d/create-exam.png";
import markAttendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import "./DashboardPage.css";

const REQUEST_TIMEOUT = 12000;
const GROUP_COLORS = ["#2563eb", "#7c3aed", "#f59e0b", "#16a34a", "#e11d48", "#0891b2", "#64748b"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CERTIFICATE_TYPES = [
  { key: "bonafide", label: "Bonafide Certificate", icon: GraduationCap, tone: "blue" },
  { key: "study", label: "Study Certificate", icon: BookOpen, tone: "violet" },
  { key: "conduct", label: "Conduct Certificate", icon: Award, tone: "green" },
  { key: "transfer", label: "Transfer Certificate", icon: FileText, tone: "orange" },
  { key: "others", label: "Others", icon: ClipboardCheck, tone: "cyan" },
];
const DASHBOARD_API = {
  filters: "/api/v1/dashboard/filters",
  summary: "/api/v1/dashboard/summary",
  studentsOverview: "/api/v1/dashboard/students-overview",
  groupDistribution: "/api/v1/dashboard/group-distribution",
  admissionTrend: "/api/v1/dashboard/admission-trend",
  weeklyAttendance: "/api/v1/dashboard/weekly-attendance",
  certificateRequests: "/api/v1/dashboard/certificate-requests",
  upcomingExaminations: "/api/v1/dashboard/upcoming-examinations",
};
const DASHBOARD_WIDGET_KEYS = Object.keys(DASHBOARD_API).filter((key) => key !== "filters");
const DATE_WIDGET_KEYS = ["summary", "studentsOverview", "weeklyAttendance", "certificateRequests"];
const SCOPE_WIDGET_KEYS = ["groupDistribution", "admissionTrend", "upcomingExaminations"];
const QUICK_ACTIONS = [
  { label: "Add Student", to: "/dashboard/admission", icon: addStudentIcon, tone: "green" },
  { label: "Add Staff", to: "/dashboard/faculty", icon: addStaffIcon, tone: "blue" },
  { label: "Create Group", to: "/dashboard/courses/add", icon: createGroupIcon, tone: "violet" },
  { label: "Create Section", to: "/dashboard/sections", icon: createSectionIcon, tone: "cyan" },
  { label: "Create Exam", to: "/dashboard/examinations/add", icon: createExamIcon, tone: "orange" },
  { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: markAttendanceIcon, tone: "green" },
];
const EMPTY_WIDGETS = Object.fromEntries(DASHBOARD_WIDGET_KEYS.map((key) => [key, null]));
const EMPTY_LOADING = Object.fromEntries(DASHBOARD_WIDGET_KEYS.map((key) => [key, false]));
function unwrap(payload) {
  let value = payload;
  const visited = new Set();
  while (value && typeof value === "object" && !Array.isArray(value) && !visited.has(value)) {
    visited.add(value);
    const next = value.data ?? value.Data ?? value.result ?? value.Result;
    if (next === undefined || next === value) break;
    value = next;
  }
  return value;
}

function collection(payload, preferredKeys = []) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of [...preferredKeys, "items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function findCollection(payload, preferredKeys) {
  const wanted = new Set(preferredKeys.map((key) => key.toLowerCase()));
  const queue = [unwrap(payload)];
  const visited = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    visited.add(node);
    if (Array.isArray(node)) return node;
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value) && wanted.has(key.toLowerCase())) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return [];
}

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function numeric(item, ...keys) {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function metric(payload, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [unwrap(payload)];
  const visited = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    visited.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key.toLowerCase())) {
          const parsed = Number(value);
          if (value !== "" && Number.isFinite(parsed)) return parsed;
        }
        if (value && typeof value === "object") queue.push(value);
      }
    }
  }
  return undefined;
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(value, days) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

function calendarWeekRange(anchorDate) {
  const [year, month, day] = String(anchorDate).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  const start = shiftLocalDate(anchorDate, -daysSinceMonday);
  return { start, end: shiftLocalDate(start, 6) };
}

function formatDateLabel(value, options = { month: "short", day: "numeric" }) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", options).format(date);
}

function formatNumericDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function optionRows(payload, kind) {
  const definitions = kind === "year"
    ? { preferred: ["academicYears", "AcademicYears", "years", "Years"], ids: ["academicYearId", "AcademicYearId", "id", "Id"], labels: ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"] }
    : { preferred: ["boards", "Boards"], ids: ["boardId", "BoardId", "id", "Id"], labels: ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"] };
  const optionsByLabel = new Map();
  collection(payload, definitions.preferred).forEach((item) => {
    const id = read(item, ...definitions.ids);
    const label = String(read(item, ...definitions.labels) ?? "").trim();
    if (!id || !label) return;
    const isCurrent = read(item, "isCurrent", "IsCurrent") === true;
    const isDefault = read(item, "isDefault", "IsDefault") === true;
    const activeValue = read(item, "isActive", "IsActive", "status", "Status");
    const normalizedStatus = String(activeValue).trim().toLowerCase();
    const explicitlyInactive = activeValue === false
      || activeValue === 0
      || ["false", "inactive", "disabled", "deactivated"].includes(normalizedStatus);
    if (explicitlyInactive) return;
    const isActive = activeValue === true || ["true", "active", "current", "default"].includes(normalizedStatus);
    if (kind === "year" && !isActive) return;
    const option = { value: String(id), label, priority: isCurrent ? 3 : isDefault ? 2 : isActive ? 1 : 0 };
    const dedupeKey = label.toLowerCase();
    const existing = optionsByLabel.get(dedupeKey);
    if (!existing || option.priority > existing.priority) optionsByLabel.set(dedupeKey, option);
  });
  return Array.from(optionsByLabel.values());
}

function defaultOptionValue(options) {
  return [...options].sort((left, right) => right.priority - left.priority)[0]?.value || "";
}

function preferredAcademicYearValue(options, preferredLabel = "2026-2027") {
  const normalizeYear = (value) => String(value).trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
  return options.find((item) => normalizeYear(item.label) === normalizeYear(preferredLabel))?.value
    || defaultOptionValue(options);
}

function buildScopeParams(filters) {
  return {
    ...(Number(filters.year) > 0 ? { academicYearId: Number(filters.year) } : {}),
    ...(Number(filters.board) > 0 ? { boardId: Number(filters.board) } : {}),
  };
}

function buildDateParams(filters) {
  return { ...buildScopeParams(filters), date: `${filters.date}T00:00:00` };
}

function buildWeeklyAttendanceParams(filters) {
  const range = calendarWeekRange(filters.date);
  return {
    ...buildDateParams(filters),
    startDate: `${range.start}T00:00:00`,
    endDate: `${range.end}T23:59:59`,
  };
}

function paramsForWidget(key, filters) {
  if (key === "weeklyAttendance") return buildWeeklyAttendanceParams(filters);
  if (DATE_WIDGET_KEYS.includes(key)) return buildDateParams(filters);
  if (SCOPE_WIDGET_KEYS.includes(key)) return buildScopeParams(filters);
  return {};
}

function normalizeAdmissionTrend(payload) {
  return findCollection(payload, ["monthlyAdmissions", "MonthlyAdmissions", "admissionTrend", "AdmissionTrend", "monthlyAdmissionTrend", "MonthlyAdmissionTrend", "monthlyTrend", "MonthlyTrend", "trend", "Trend"])
    .flatMap((item, index) => {
      const value = numeric(item, "studentsJoined", "StudentsJoined", "admissions", "Admissions", "admissionCount", "AdmissionCount", "count", "Count");
      const rawDate = read(item, "date", "Date", "monthStart", "MonthStart", "period", "Period", "monthYear", "MonthYear");
      const year = numeric(item, "year", "Year", "admissionYear", "AdmissionYear");
      const month = read(item, "month", "Month", "admissionMonth", "AdmissionMonth");
      const suppliedLabel = String(read(item, "monthName", "MonthName", "label", "Label", "periodLabel", "PeriodLabel") ?? "").trim();
      let date = rawDate ? new Date(rawDate) : null;
      if ((!date || Number.isNaN(date.getTime())) && year && month !== undefined) {
        const monthNumber = Number(month);
        date = Number.isInteger(monthNumber) ? new Date(year, monthNumber - 1, 1) : new Date(`${month} 1, ${year}`);
      }
      if (value === undefined) return [];
      if (date && !Number.isNaN(date.getTime())) return [{ sortDate: date.getTime(), period: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date), studentsJoined: value }];
      const period = suppliedLabel || String(month ?? rawDate ?? "").trim();
      return period ? [{ sortDate: index, period, studentsJoined: value }] : [];
    }).sort((left, right) => left.sortDate - right.sortDate);
}

function normalizeGroupDistribution(payload) {
  const source = findCollection(payload, ["groupDistribution", "GroupDistribution", "studentGroupDistribution", "StudentGroupDistribution", "groupWiseStrength", "GroupWiseStrength", "groups", "Groups"]);
  const groups = new Map();
  const sectionKeys = new Set();
  source.forEach((item) => {
    const name = String(read(item, "groupName", "GroupName", "groupCode", "GroupCode", "name", "Name") ?? "").trim();
    const value = numeric(item, "studentCount", "StudentCount", "studentsCount", "StudentsCount", "totalStudents", "TotalStudents", "count", "Count", "value", "Value");
    if (!name || value === undefined || value < 0) return;
    const groupId = read(item, "groupId", "GroupId");
    const sectionId = read(item, "sectionId", "SectionId");
    const key = groupId !== undefined ? String(groupId) : name.toLowerCase();
    const current = groups.get(key);
    if (sectionId !== undefined) {
      const sectionKey = `${key}:${sectionId}`;
      if (sectionKeys.has(sectionKey)) return;
      sectionKeys.add(sectionKey);
      groups.set(key, { name, value: (current?.value ?? 0) + value });
    } else if (!current || value > current.value) groups.set(key, { name, value });
  });
  return Array.from(groups.values()).sort((left, right) => right.value - left.value);
}

function normalizeWeeklyAttendance(payload, anchorDate) {
  const source = findCollection(payload, ["weeklyAttendance", "WeeklyAttendance", "dailyAttendance", "DailyAttendance", "attendanceByDate", "AttendanceByDate", "attendanceTrend", "AttendanceTrend", "days", "Days"]);
  const range = calendarWeekRange(anchorDate);
  const attendanceByDate = new Map();

  source.forEach((item) => {
    const date = String(read(item, "attendanceDate", "AttendanceDate", "date", "Date", "day", "Day") ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < range.start || date > range.end) return;
    const present = numeric(item, "present", "Present", "presentCount", "PresentCount");
    const absent = numeric(item, "absent", "Absent", "absentCount", "AbsentCount");
    const late = numeric(item, "late", "Late", "lateCount", "LateCount");
    const percentage = numeric(item, "percentage", "Percentage", "attendancePercentage", "AttendancePercentage");
    if (present === undefined && absent === undefined && late === undefined && percentage === undefined) return;
    const current = attendanceByDate.get(date) || { present: 0, absent: 0, late: 0, percentage: undefined };
    attendanceByDate.set(date, {
      present: current.present + (present ?? 0),
      absent: current.absent + (absent ?? 0),
      late: current.late + (late ?? 0),
      percentage: percentage ?? current.percentage,
    });
  });

  return Array.from(attendanceByDate, ([date, values]) => ({ date, ...values }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7);
}

function normalizeCertificateRequests(payload) {
  const source = findCollection(payload, ["certificateRequests", "CertificateRequests", "requestCounts", "RequestCounts", "requestsByType", "RequestsByType"]);
  const byType = new Map(source.flatMap((item) => {
    const name = String(read(item, "certificateType", "CertificateType", "type", "Type", "name", "Name") ?? "").trim();
    const count = numeric(item, "requestCount", "RequestCount", "count", "Count", "total", "Total");
    return name && count !== undefined ? [[name.toLowerCase(), count]] : [];
  }));
  return CERTIFICATE_TYPES.map((type) => {
    const directValue = metric(payload, [`${type.key}Requests`, `${type.key}Count`, type.key]);
    const listedValue = byType.get(type.label.toLowerCase()) ?? byType.get(type.key.toLowerCase());
    return { ...type, value: listedValue ?? directValue };
  }).filter((item) => item.value !== undefined);
}

function normalizeUpcomingExaminations(payload) {
  const today = localDateValue();
  const completedStatuses = ["completed", "complete", "conducted", "finished", "closed", "cancelled", "canceled"];

  return findCollection(payload, ["upcomingExaminations", "UpcomingExaminations", "examinations", "Examinations", "exams", "Exams"])
    .flatMap((item, index) => {
      const name = String(read(item, "examName", "ExamName", "examinationName", "ExaminationName", "name", "Name", "title", "Title") ?? "").trim();
      const rawDate = read(item, "examDate", "ExamDate", "startDate", "StartDate", "date", "Date");
      const status = String(read(item, "status", "Status", "examStatus", "ExamStatus") ?? "").trim();
      const isoDate = String(rawDate ?? "").trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      const parsedDate = isoDate ? null : new Date(rawDate);
      const date = isoDate || (rawDate && !Number.isNaN(parsedDate?.getTime()) ? localDateValue(parsedDate) : "");
      const isCompleted = completedStatuses.some((completedStatus) => status.toLowerCase().includes(completedStatus));

      if ((!name && !date) || !date || date < today || isCompleted) return [];
      return [{ id: read(item, "examId", "ExamId", "examinationId", "ExaminationId", "id", "Id") ?? index, name: name || "Examination", date, context: String(read(item, "academicLevelName", "AcademicLevelName", "groupName", "GroupName", "programName", "ProgramName") ?? ""), status }];
    })
    .sort((first, second) => first.date.localeCompare(second.date));
}

function formatNumber(value) { return value === undefined || value === null ? "Unavailable" : new Intl.NumberFormat("en-IN").format(value); }
function greetingForHour(hour) {
  if (hour < 12) return { message: "Good Morning", icon: "\u{1F305}", iconLabel: "Sunrise" };
  if (hour < 17) return { message: "Good Afternoon", icon: "\u{2600}\u{FE0F}", iconLabel: "Sun" };
  return { message: "Good Evening", icon: "\u{1F319}", iconLabel: "Moon" };
}
function LoadingState({ label = "Loading data..." }) { return <div className="dashboard-state" role="status"><span className="dashboard-spinner" />{label}</div>; }
function EmptyState({ message = "No data available" }) { return <div className="dashboard-state dashboard-state-empty">{message}</div>; }
function CardHeader({ title, action }) { return <header className="dashboard-card-head"><h2>{title}</h2>{action}</header>; }
function KpiCard({ label, value, icon, tone, loading }) {
  return <article className={`dashboard-kpi dashboard-kpi-${tone}`}><span className="dashboard-kpi-icon"><img src={icon} alt="" aria-hidden="true" /></span><div><span>{label}</span><strong>{loading ? "—" : formatNumber(value)}</strong></div></article>;
}

export default function DashboardPage() {
  const {
    selectedBoard,
    selectedAcademicYear,
    setSelectedBoard,
    setSelectedAcademicYear,
  } = useAcademicContext();

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [masterOptions, setMasterOptions] = useState({ years: [], boards: [] });
  const [filters, setFilters] = useState({
    year: selectedAcademicYear?.id || selectedAcademicYear?.code || "",
    board: selectedBoard?.id || selectedBoard?.code || "",
    date: localDateValue(),
  });
  const [widgets, setWidgets] = useState(EMPTY_WIDGETS);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);
  const [loading, setLoading] = useState(EMPTY_LOADING);
  const [errors, setErrors] = useState({});
  const filterRequestRef = useRef(0);
  const dateRequestRef = useRef(0);
  const scopeRequestRef = useRef(0);

  // Synchronize global academic context changes to local filters
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      board: selectedBoard?.id || selectedBoard?.code || current.board,
      year: selectedAcademicYear?.id || selectedAcademicYear?.code || current.year,
    }));
  }, [selectedBoard, selectedAcademicYear]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextHour = new Date().getHours();
      setCurrentHour((hour) => hour === nextHour ? hour : nextHour);
      const today = localDateValue();
      setFilters((current) => current.date === today ? current : { ...current, date: today });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const requestId = ++filterRequestRef.current;
    const controller = new AbortController();
    setLoadingFilters(true);
    apiClient.get(DASHBOARD_API.filters, { signal: controller.signal, timeout: REQUEST_TIMEOUT })
      .then((response) => {
      if (requestId !== filterRequestRef.current) return;
      const years = optionRows(response.data, "year");
      const boards = optionRows(response.data, "board");
      setMasterOptions({ years, boards });
      setFilters((current) => ({
        ...current,
        year: current.year || preferredAcademicYearValue(years),
      }));
      setErrors((current) => ({ ...current, filters: "" }));
      setFiltersReady(true);
    }).catch((error) => {
      if (requestId !== filterRequestRef.current || error?.code === "ERR_CANCELED") return;
      setMasterOptions({ years: [], boards: [] });
      setErrors((current) => ({ ...current, filters: getApiErrorMessage(error, "Unable to load dashboard filters.") }));
      setFiltersReady(true);
    }).finally(() => { if (requestId === filterRequestRef.current) setLoadingFilters(false); });
    return () => { filterRequestRef.current += 1; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!filtersReady || !filters.year || !filters.board) {
      if (filtersReady) {
        setWidgets((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, null])) }));
        setLoading((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, false])) }));
        setErrors((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, ""])) }));
      }
      return undefined;
    }
    const requestId = ++dateRequestRef.current;
    const controller = new AbortController();
    const requestFilters = { year: filters.year, board: filters.board, date: filters.date };
    setWidgets((current) => ({
      ...current,
      ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, null])),
    }));
    setLoading((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, true])) }));
    setErrors((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, ""])) }));
    const requests = DATE_WIDGET_KEYS.map((key) => apiClient.get(DASHBOARD_API[key], { params: paramsForWidget(key, requestFilters), signal: controller.signal, timeout: REQUEST_TIMEOUT }));
    Promise.allSettled(requests).then((results) => {
      if (requestId !== dateRequestRef.current) return;
      const nextErrors = {};
      const successful = {};
      DATE_WIDGET_KEYS.forEach((key, index) => {
        const result = results[index];
        if (result.status === "fulfilled") successful[key] = result.value.data;
        else if (result.reason?.code !== "ERR_CANCELED" && result.reason?.name !== "CanceledError" && result.reason?.name !== "AbortError") nextErrors[key] = getApiErrorMessage(result.reason, `Unable to load ${key}.`);
      });
      setWidgets((current) => ({ ...current, ...successful }));
      setErrors((current) => ({ ...current, ...nextErrors }));
      setLoading((current) => ({ ...current, ...Object.fromEntries(DATE_WIDGET_KEYS.map((key) => [key, false])) }));
    });
    return () => { dateRequestRef.current += 1; controller.abort(); };
  }, [filters.year, filters.board, filters.date, filtersReady]);

  useEffect(() => {
    if (!filtersReady || !filters.year || !filters.board) {
      if (filtersReady) {
        setWidgets((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, null])) }));
        setLoading((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, false])) }));
        setErrors((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, ""])) }));
      }
      return undefined;
    }
    const requestId = ++scopeRequestRef.current;
    const controller = new AbortController();
    const requestFilters = { year: filters.year, board: filters.board, date: "" };
    setWidgets((current) => ({
      ...current,
      ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, null])),
    }));
    setLoading((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, true])) }));
    setErrors((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, ""])) }));
    const requests = SCOPE_WIDGET_KEYS.map((key) => apiClient.get(DASHBOARD_API[key], { params: paramsForWidget(key, requestFilters), signal: controller.signal, timeout: REQUEST_TIMEOUT }));
    Promise.allSettled(requests).then((results) => {
      if (requestId !== scopeRequestRef.current) return;
      const nextErrors = {};
      const successful = {};
      SCOPE_WIDGET_KEYS.forEach((key, index) => {
        const result = results[index];
        if (result.status === "fulfilled") successful[key] = result.value.data;
        else if (result.reason?.code !== "ERR_CANCELED" && result.reason?.name !== "CanceledError" && result.reason?.name !== "AbortError") nextErrors[key] = getApiErrorMessage(result.reason, `Unable to load ${key}.`);
      });
      setWidgets((current) => ({ ...current, ...successful }));
      setErrors((current) => ({ ...current, ...nextErrors }));
      setLoading((current) => ({ ...current, ...Object.fromEntries(SCOPE_WIDGET_KEYS.map((key) => [key, false])) }));
    });
    return () => { scopeRequestRef.current += 1; controller.abort(); };
  }, [filters.year, filters.board, filtersReady]);

  const totalStudents = metric(widgets.summary, ["totalStudents", "totalStudentCount", "studentCount", "studentsCount", "activeStudents", "students"]);
  const kpis = [
    { label: "Total Students", value: totalStudents, icon: totalStudentsIcon, tone: "green" },
    { label: "Teaching Staff", value: metric(widgets.summary, ["teachingStaff", "teachingStaffCount", "totalTeachingStaff", "totalTeachingStaffCount"]), icon: teachingStaffIcon, tone: "blue" },
    { label: "Non-Teaching Staff", value: metric(widgets.summary, ["nonTeachingStaff", "nonTeachingStaffCount", "totalNonTeachingStaff", "totalNonTeachingStaffCount"]), icon: nonTeachingStaffIcon, tone: "orange" },
    { label: "Total Groups", value: metric(widgets.summary, ["totalGroups", "totalGroupCount", "groupCount", "groupsCount", "groups"]), icon: totalGroupsIcon, tone: "violet" },
    { label: "Total Sections", value: metric(widgets.summary, ["totalSections", "totalSectionCount", "sectionCount", "sectionsCount", "sections"]), icon: totalSectionsIcon, tone: "cyan" },
  ];
  const admissionTrend = useMemo(() => normalizeAdmissionTrend(widgets.admissionTrend), [widgets.admissionTrend]);
  const gender = {
    male: metric(widgets.studentsOverview, ["maleStudents", "maleCount", "totalMale", "boys", "boysCount", "totalBoys", "male"]),
    female: metric(widgets.studentsOverview, ["femaleStudents", "femaleCount", "totalFemale", "girls", "girlsCount", "totalGirls", "female"]),
    other: metric(widgets.studentsOverview, ["otherStudents", "otherCount", "totalOther", "others", "othersCount", "totalOthers", "other"]),
  };
  const groupDistribution = useMemo(() => normalizeGroupDistribution(widgets.groupDistribution), [widgets.groupDistribution]);
  const groupTotal = groupDistribution.reduce((sum, item) => sum + item.value, 0);
  const attendanceWeek = useMemo(() => calendarWeekRange(filters.date), [filters.date]);
  const weeklyAttendance = useMemo(() => normalizeWeeklyAttendance(widgets.weeklyAttendance, filters.date), [widgets.weeklyAttendance, filters.date]);
  const certificateRows = useMemo(() => normalizeCertificateRequests(widgets.certificateRequests), [widgets.certificateRequests]);
  const certificateTotal = metric(widgets.certificateRequests, ["totalRequests", "totalCertificateRequests", "requestCount"])
    ?? (certificateRows.length ? certificateRows.reduce((sum, item) => sum + item.value, 0) : undefined);
  const upcomingExaminations = useMemo(() => normalizeUpcomingExaminations(widgets.upcomingExaminations), [widgets.upcomingExaminations]);
  const greeting = greetingForHour(currentHour);
  const dashboardTitle = (
    <span className="dashboard-welcome-title" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "21px", fontWeight: 800 }}>
      <span>{greeting.icon}</span>
      <span>{greeting.message}, Admin!</span>
    </span>
  );

  return (
    <DashboardLayout title={dashboardTitle} subtitle={null} actions={null} breadcrumb={["Overview"]}>
      <main className="dashboard-page">
        <div className="dashboard-viewing-banner">
          <Info size={18} className="dashboard-banner-icon" />
          <span>
            You are viewing data for <strong>{selectedBoard?.name || selectedBoard?.code || "BIEAP"}</strong> • <strong>Academic Year {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "2025–2026"}</strong>. Change Board or Academic Year to view corresponding records.
          </span>
        </div>
      {errors.filters ? <div className="dashboard-warning" role="alert">{errors.filters}</div> : null}
      <section className="dashboard-kpi-grid" aria-label="College totals">{kpis.map((item) => <KpiCard key={item.label} {...item} loading={loading.summary} />)}</section>
      <nav className="dashboard-quick-actions" aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <div>
          {QUICK_ACTIONS.map(({ label, to, icon, tone }) => (
            <Link key={label} to={to} className={`dashboard-quick-action tone-${tone}`}>
              <span className="dashboard-quick-action-icon">
                <img src={icon} alt="" aria-hidden="true" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <section className="dashboard-main-grid" aria-label="Dashboard analytics">
        <article className="dashboard-card dashboard-students-overview-card"><CardHeader title="Students Overview" />
          {loading.admissionTrend ? <LoadingState label="Loading admission trend..." /> : errors.admissionTrend ? <EmptyState message="Unable to load admission trend." /> : admissionTrend.length ? <div className="dashboard-chart dashboard-admission-chart" role="img" aria-label="Students joined by month"><ResponsiveContainer width="100%" height="100%"><AreaChart data={admissionTrend} margin={{ top: 10, right: 5, left: -24, bottom: 0 }}><defs><linearGradient id="studentsAdmissionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} interval={0} height={20} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [formatNumber(value), "Students joined"]} /><Area type="monotone" dataKey="studentsJoined" name="Students Joined" stroke="#2563eb" strokeWidth={2.5} fill="url(#studentsAdmissionArea)" dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div> : <EmptyState message="No admission trend is available for the selected filters." />}
          <div className="dashboard-gender-summary dashboard-gender-summary-compact" aria-label="Student gender summary" aria-busy={loading.studentsOverview}>
            <div><span className="dashboard-gender-icon male"><Users size={15} /></span><p>Male <strong>{loading.studentsOverview ? "…" : formatNumber(gender.male)}</strong></p></div>
            <div><span className="dashboard-gender-icon female"><Users size={15} /></span><p>Female <strong>{loading.studentsOverview ? "…" : formatNumber(gender.female)}</strong></p></div>
            <div><span className="dashboard-gender-icon other"><Users size={15} /></span><p>Other <strong>{loading.studentsOverview ? "…" : formatNumber(gender.other)}</strong></p></div>
          </div>
        </article>
        <article className="dashboard-card dashboard-group-card"><CardHeader title="Students by Group" />
          {loading.groupDistribution ? <LoadingState label="Loading group distribution..." /> : groupDistribution.length ? <div className="dashboard-group-content"><div className={`dashboard-donut${groupTotal ? "" : " is-empty"}`} role="img" aria-label="Student distribution by group"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2}>{groupDistribution.map((item, index) => <Cell key={item.name} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [formatNumber(value), "Students"]} /></PieChart></ResponsiveContainer><div><strong>{formatNumber(totalStudents ?? groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-list">{groupDistribution.map((item, index) => <div key={item.name}><i style={{ backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{formatNumber(item.value)}</strong><em>{groupTotal ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0%"}</em></div>)}</div></div> : <EmptyState message={errors.groupDistribution ? "Unable to load group distribution." : "No group distribution is available for the selected filters."} />}
        </article>
        <article className="dashboard-card dashboard-attendance-card"><CardHeader title="Students Attendance Overview (This Week)" />
          {loading.weeklyAttendance ? <LoadingState label="Loading weekly attendance..." /> : errors.weeklyAttendance ? <EmptyState message="Unable to load weekly attendance." /> : weeklyAttendance.length ? <><div className="dashboard-chart dashboard-attendance-chart" role="img" aria-label={`Attendance from ${formatDateLabel(attendanceWeek.start)} through ${formatDateLabel(attendanceWeek.end)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyAttendance} margin={{ top: 22, right: 4, left: -24, bottom: 6 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} height={24} interval={0} tickFormatter={(date) => formatDateLabel(date, { weekday: "short" })} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(_, entries) => entries?.[0]?.payload?.date ? formatDateLabel(entries[0].payload.date, { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) : ""} /><Bar dataKey="present" name="Present" stackId="attendance" fill="#22a447" radius={[3, 3, 0, 0]} /><Bar dataKey="absent" name="Absent" stackId="attendance" fill="#ef4444" /><Bar dataKey="late" name="Late" stackId="attendance" fill="#f59e0b" /></BarChart></ResponsiveContainer></div><div className="dashboard-attendance-legend" aria-label="Attendance categories"><span><i className="present" />Present</span><span><i className="absent" />Absent</span><span><i className="late" />Late</span></div></> : <EmptyState message="No attendance data is available for the selected week." />}<p className="dashboard-card-note">Current week (Monday–Sunday) · {formatNumericDate(attendanceWeek.start)} – {formatNumericDate(attendanceWeek.end)}</p>
        </article>
      </section>
      <section className="dashboard-lower-grid" aria-label="Certificate requests and upcoming examinations">
        <article className="dashboard-card dashboard-certificate-card"><CardHeader title="Certificate Requests" action={<Link to="/dashboard/certificates" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.certificateRequests ? <LoadingState label="Loading certificate requests..." /> : certificateRows.length ? <div className="dashboard-certificate-list">{certificateRows.map(({ key, label, icon: Icon, tone, value }) => <div key={key}><span className={`dashboard-list-icon tone-${tone}`}><Icon size={16} /></span><span>{label}</span><strong>{formatNumber(value)}</strong></div>)}<footer><span>Total Requests</span><strong>{formatNumber(certificateTotal)}</strong></footer></div> : <EmptyState message={errors.certificateRequests ? "Unable to load certificate requests." : "No certificate requests are available for the selected filters."} />}</article>
        <article className="dashboard-card"><CardHeader title={`Upcoming Examinations (${loading.upcomingExaminations ? "…" : upcomingExaminations.length})`} action={<Link to="/dashboard/examinations" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.upcomingExaminations ? <LoadingState label="Loading upcoming examinations..." /> : upcomingExaminations.length ? <div className="dashboard-info-list">{upcomingExaminations.slice(0, 6).map((item) => <div key={item.id}><span className="dashboard-activity-marker"><CalendarDays size={14} /></span><p><strong>{item.name}</strong><span>{item.context || item.status || "Examination details"}</span></p><div className="dashboard-info-metrics"><span>{formatDateLabel(item.date, { day: "2-digit", month: "short", year: "numeric" })}</span></div></div>)}</div> : <EmptyState message={errors.upcomingExaminations ? "Unable to load upcoming examinations." : "No upcoming examinations are available for the selected filters."} />}</article>
      </section>
    </main>
  </DashboardLayout>
  );
}
