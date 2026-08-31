import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Award, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FileText, GraduationCap, Layers3, RotateCcw, School, Users, UserRoundCheck, UserRoundCog } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./DashboardPage.css";

const REQUEST_TIMEOUT = 12000;
const GROUP_COLORS = ["#2563eb", "#7c3aed", "#f59e0b", "#16a34a", "#e11d48", "#0891b2", "#64748b"];
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
  weeklyAttendance: "/api/v1/dashboard/weekly-attendance",
  certificateRequests: "/api/v1/dashboard/certificate-requests",
  recentActivity: "/api/v1/dashboard/recent-activity",
  admissionTrend: "/api/v1/dashboard/admission-trend",
  facultyWorkload: "/api/v1/dashboard/faculty-workload",
  upcomingExaminations: "/api/v1/dashboard/upcoming-examinations",
};
const DASHBOARD_WIDGETS = Object.entries(DASHBOARD_API).filter(([key]) => key !== "filters");
const FILTERED_DASHBOARD_WIDGETS = DASHBOARD_WIDGETS.filter(([key]) => key !== "recentActivity");
const EMPTY_WIDGETS = Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, null]));
const EMPTY_LOADING = Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, false]));
const RECENT_ACTIVITY_CACHE_TTL = 60_000;
let recentActivityRequest;
let recentActivityCache = { payload: null, fetchedAt: 0 };

function fetchRecentActivity({ force = false } = {}) {
  const cacheIsFresh = recentActivityCache.payload !== null
    && Date.now() - recentActivityCache.fetchedAt < RECENT_ACTIVITY_CACHE_TTL;
  if (!force && cacheIsFresh) return Promise.resolve(recentActivityCache.payload);
  if (!recentActivityRequest) {
    recentActivityRequest = apiClient.get(DASHBOARD_API.recentActivity, { timeout: REQUEST_TIMEOUT })
      .then((response) => {
        recentActivityCache = { payload: response.data, fetchedAt: Date.now() };
        return response.data;
      })
      .finally(() => {
        recentActivityRequest = null;
      });
  }
  return recentActivityRequest;
}

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

function apiDateRange(endDate) { return { from: shiftLocalDate(endDate, -6), to: endDate }; }

function formatDateLabel(value, options = { month: "short", day: "numeric" }) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", options).format(date);
}

function optionRows(payload, kind) {
  const definitions = kind === "year"
    ? { preferred: ["academicYears", "AcademicYears", "years", "Years"], ids: ["academicYearId", "AcademicYearId", "id", "Id"], labels: ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"] }
    : { preferred: ["boards", "Boards"], ids: ["boardId", "BoardId", "id", "Id"], labels: ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"] };
  const seen = new Set();
  return collection(payload, definitions.preferred).flatMap((item) => {
    const id = read(item, ...definitions.ids);
    const label = String(read(item, ...definitions.labels) ?? "").trim();
    const dedupeKey = kind === "year" ? label.toLowerCase() : String(id);
    if (!id || !label || seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);
    const marker = read(item, "isCurrent", "IsCurrent", "isDefault", "IsDefault", "isActive", "IsActive", "status", "Status");
    const current = marker === true || ["true", "active", "current", "default"].includes(String(marker).toLowerCase());
    return [{ value: String(id), label, current }];
  });
}

function buildDashboardParams(filters) {
  return {
    ...(Number(filters.year) > 0 ? { academicYearId: Number(filters.year) } : {}),
    ...(Number(filters.board) > 0 ? { boardId: Number(filters.board) } : {}),
    date: filters.date,
  };
}

function normalizeAdmissionTrend(payload) {
  return findCollection(payload, ["monthlyAdmissions", "MonthlyAdmissions", "admissionTrend", "AdmissionTrend", "monthlyTrend", "MonthlyTrend", "trend", "Trend"])
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
  const source = findCollection(payload, ["groupDistribution", "GroupDistribution", "groupWiseStrength", "GroupWiseStrength", "groups", "Groups"]);
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

function normalizeWeeklyAttendance(payload) {
  const source = findCollection(payload, ["dailyAttendance", "DailyAttendance", "attendanceByDate", "AttendanceByDate", "attendanceTrend", "AttendanceTrend", "days", "Days"]);
  return source.flatMap((item, index) => {
    const date = String(read(item, "attendanceDate", "AttendanceDate", "date", "Date", "day", "Day") ?? "").slice(0, 10);
    const present = numeric(item, "present", "Present", "presentCount", "PresentCount");
    const absent = numeric(item, "absent", "Absent", "absentCount", "AbsentCount");
    const leave = numeric(item, "leave", "Leave", "leaveCount", "LeaveCount", "onLeave", "OnLeave");
    if (present === undefined && absent === undefined && leave === undefined) return [];
    const day = String(read(item, "dayName", "DayName", "weekday", "Weekday") ?? "").trim()
      || (/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDateLabel(date, { weekday: "short" }) : `Day ${index + 1}`);
    return [{ date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "", day, present, absent, leave }];
  });
}

function normalizeActivityMessage(value) {
  const action = String(value ?? "Activity recorded").trim();
  const statusChange = action.match(/^(.*?)status\s+changed\s+from\s+(.+?)\s+to\s+(.+?)[.!]?$/i);
  if (!statusChange || statusChange[2].trim().toLowerCase() !== statusChange[3].trim().toLowerCase()) return action;
  const subject = statusChange[1].trim();
  return `${subject ? `${subject} status` : "Status"} remained ${statusChange[2].trim()}.`;
}

function normalizeActivities(payload) {
  const seen = new Set();
  return findCollection(payload, ["recentActivity", "RecentActivity", "activities", "Activities", "items", "Items"])
    .map((item, index) => ({
      id: read(item, "auditLogId", "AuditLogId", "logId", "LogId", "id", "Id"),
      action: normalizeActivityMessage(read(item, "description", "Description", "details", "Details", "message", "Message", "action", "Action", "activity", "Activity")),
      user: String(read(item, "userName", "UserName", "performedBy", "PerformedBy", "actorName", "ActorName", "createdBy", "CreatedBy") ?? "System user").trim(),
      module: String(read(item, "module", "Module", "moduleName", "ModuleName", "entityName", "EntityName") ?? "System").trim(),
      timestamp: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "dateTime", "DateTime", "auditDate", "AuditDate"),
      sourceIndex: index,
    }))
    .filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
    .filter((item) => {
      const identity = item.id !== undefined && item.id !== null
        ? `id:${item.id}`
        : `${item.action.toLowerCase()}|${item.user.toLowerCase()}|${item.module.toLowerCase()}|${new Date(item.timestamp).toISOString()}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
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

function normalizeFacultyWorkload(payload) {
  return findCollection(payload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload", "faculty", "Faculty"])
    .flatMap((item, index) => {
      const name = String(read(item, "facultyName", "FacultyName", "staffName", "StaffName", "name", "Name") ?? "").trim();
      const hours = numeric(item, "weeklyHours", "WeeklyHours", "teachingHours", "TeachingHours", "assignedHours", "AssignedHours", "hours", "Hours");
      const subjects = numeric(item, "subjectCount", "SubjectCount", "assignedSubjects", "AssignedSubjects", "subjects", "Subjects");
      if (!name && hours === undefined && subjects === undefined) return [];
      return [{ id: read(item, "facultyId", "FacultyId", "staffId", "StaffId", "id", "Id") ?? index, name: name || "Faculty member", department: String(read(item, "departmentName", "DepartmentName", "department", "Department") ?? ""), hours, subjects }];
    }).slice(0, 6);
}

function normalizeUpcomingExaminations(payload) {
  return findCollection(payload, ["upcomingExaminations", "UpcomingExaminations", "examinations", "Examinations", "exams", "Exams"])
    .flatMap((item, index) => {
      const name = String(read(item, "examName", "ExamName", "examinationName", "ExaminationName", "name", "Name", "title", "Title") ?? "").trim();
      const date = read(item, "examDate", "ExamDate", "startDate", "StartDate", "date", "Date");
      if (!name && !date) return [];
      return [{ id: read(item, "examId", "ExamId", "examinationId", "ExaminationId", "id", "Id") ?? index, name: name || "Examination", date, context: String(read(item, "academicLevelName", "AcademicLevelName", "groupName", "GroupName", "programName", "ProgramName") ?? ""), status: String(read(item, "status", "Status") ?? "") }];
    }).slice(0, 6);
}

function formatNumber(value) { return value === undefined || value === null ? "Unavailable" : new Intl.NumberFormat("en-IN").format(value); }
function formatActivityDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
function greetingForHour(hour) {
  if (hour < 12) return { message: "Good Morning", icon: "\u{1F305}", iconLabel: "Sunrise" };
  if (hour < 17) return { message: "Good Afternoon", icon: "\u{2600}\u{FE0F}", iconLabel: "Sun" };
  return { message: "Good Evening", icon: "\u{1F319}", iconLabel: "Moon" };
}
function LoadingState({ label = "Loading data..." }) { return <div className="dashboard-state" role="status"><span className="dashboard-spinner" />{label}</div>; }
function EmptyState({ message = "No data available" }) { return <div className="dashboard-state dashboard-state-empty">{message}</div>; }
function CardHeader({ title, action }) { return <header className="dashboard-card-head"><h2>{title}</h2>{action}</header>; }
function KpiCard({ label, value, icon: Icon, tone, loading, to }) {
  return <Link className={`dashboard-kpi dashboard-kpi-${tone}`} to={to} aria-label={`Open ${label}`}><span className="dashboard-kpi-icon"><Icon size={22} aria-hidden="true" /></span><div><span>{label}</span><strong>{loading ? "—" : formatNumber(value)}</strong></div></Link>;
}

export default function DashboardPage() {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [masterOptions, setMasterOptions] = useState({ years: [], boards: [] });
  const [filters, setFilters] = useState({ year: "", board: "", date: localDateValue() });
  const [widgets, setWidgets] = useState(EMPTY_WIDGETS);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loading, setLoading] = useState(EMPTY_LOADING);
  const [errors, setErrors] = useState({});
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const filterRequestRef = useRef(0);
  const widgetRequestRef = useRef(0);
  const activityRequestRef = useRef(0);
  const widgetControllerRef = useRef(null);

  const loadRecentActivity = useCallback(async ({ force = false, showLoader = false } = {}) => {
    const requestId = ++activityRequestRef.current;
    if (showLoader) setLoading((current) => ({ ...current, recentActivity: true }));
    if (force) setActivityRefreshing(true);
    try {
      const payload = await fetchRecentActivity({ force });
      if (requestId !== activityRequestRef.current) return;
      setWidgets((current) => ({ ...current, recentActivity: payload }));
      setErrors((current) => ({ ...current, recentActivity: "" }));
    } catch (error) {
      if (requestId !== activityRequestRef.current) return;
      setErrors((current) => ({ ...current, recentActivity: getApiErrorMessage(error, "Unable to load recent activities.") }));
    } finally {
      if (requestId === activityRequestRef.current) {
        if (showLoader) setLoading((current) => ({ ...current, recentActivity: false }));
        if (force) setActivityRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextHour = new Date().getHours();
      setCurrentHour((hour) => hour === nextHour ? hour : nextHour);
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
      setFilters((current) => ({ ...current, year: current.year || years.find((item) => item.current)?.value || years[0]?.value || "", board: current.board || boards.find((item) => item.current)?.value || boards[0]?.value || "" }));
      setErrors((current) => ({ ...current, filters: "" }));
    }).catch((error) => {
      if (requestId !== filterRequestRef.current || error?.code === "ERR_CANCELED") return;
      setMasterOptions({ years: [], boards: [] });
      setErrors((current) => ({ ...current, filters: getApiErrorMessage(error, "Unable to load dashboard filters.") }));
    }).finally(() => { if (requestId === filterRequestRef.current) setLoadingFilters(false); });
    return () => { filterRequestRef.current += 1; controller.abort(); };
  }, []);

  useEffect(() => {
    loadRecentActivity({ showLoader: true });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadRecentActivity();
    };
    const timer = window.setInterval(refreshWhenVisible, RECENT_ACTIVITY_CACHE_TTL);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      activityRequestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadRecentActivity]);

  useEffect(() => {
    if (loadingFilters) return undefined;
    const requestId = ++widgetRequestRef.current;
    widgetControllerRef.current?.abort();
    const controller = new AbortController();
    widgetControllerRef.current = controller;
    const params = buildDashboardParams(filters);
    setWidgets((current) => ({ ...EMPTY_WIDGETS, recentActivity: current.recentActivity }));
    setLoading((current) => ({
      ...Object.fromEntries(FILTERED_DASHBOARD_WIDGETS.map(([key]) => [key, true])),
      recentActivity: current.recentActivity,
    }));
    setErrors((current) => ({ filters: current.filters || "", recentActivity: current.recentActivity || "" }));
    const requests = FILTERED_DASHBOARD_WIDGETS.map(([, endpoint]) => apiClient.get(endpoint, {
      params,
      signal: controller.signal,
      timeout: REQUEST_TIMEOUT,
    }));
    Promise.allSettled(requests).then((results) => {
      if (requestId !== widgetRequestRef.current) return;
      const next = { ...EMPTY_WIDGETS };
      const nextErrors = {};
      FILTERED_DASHBOARD_WIDGETS.forEach(([key], index) => {
        const result = results[index];
        if (result.status === "fulfilled") next[key] = result.value.data;
        else nextErrors[key] = getApiErrorMessage(result.reason, `Unable to load ${key}.`);
      });
      setWidgets((current) => ({ ...next, recentActivity: current.recentActivity }));
      setErrors((current) => ({ filters: current.filters || "", recentActivity: current.recentActivity || "", ...nextErrors }));
      setLoading((current) => ({ ...EMPTY_LOADING, recentActivity: current.recentActivity }));
    });
    return () => {
      widgetRequestRef.current += 1;
      controller.abort();
    };
  }, [filters, loadingFilters]);

  const totalStudents = metric(widgets.summary, ["totalStudents", "activeStudents", "students"]);
  const kpis = [
    { label: "Total Students", value: totalStudents, icon: Users, tone: "green", to: "/dashboard/students" },
    { label: "Teaching Staff", value: metric(widgets.summary, ["teachingStaff", "teachingStaffCount", "totalTeachingStaff"]), icon: UserRoundCheck, tone: "blue", to: "/dashboard/faculty?staffTab=teaching" },
    { label: "Non-Teaching Staff", value: metric(widgets.summary, ["nonTeachingStaff", "nonTeachingStaffCount", "totalNonTeachingStaff"]), icon: UserRoundCog, tone: "orange", to: "/dashboard/faculty?staffTab=non-teaching" },
    { label: "Total Groups", value: metric(widgets.summary, ["totalGroups", "groupCount", "groups"]), icon: Layers3, tone: "violet", to: "/dashboard/courses" },
    { label: "Total Sections", value: metric(widgets.summary, ["totalSections", "sectionCount", "sections"]), icon: School, tone: "cyan", to: "/dashboard/sections" },
  ];
  const admissionTrend = useMemo(() => normalizeAdmissionTrend(widgets.admissionTrend), [widgets.admissionTrend]);
  const gender = {
    male: metric(widgets.studentsOverview, ["maleStudents", "maleCount", "male"]),
    female: metric(widgets.studentsOverview, ["femaleStudents", "femaleCount", "female"]),
    other: metric(widgets.studentsOverview, ["otherStudents", "otherCount", "other"]),
  };
  const groupDistribution = useMemo(() => normalizeGroupDistribution(widgets.groupDistribution), [widgets.groupDistribution]);
  const groupTotal = groupDistribution.reduce((sum, item) => sum + item.value, 0);
  const weeklyAttendance = useMemo(() => normalizeWeeklyAttendance(widgets.weeklyAttendance), [widgets.weeklyAttendance]);
  const certificateRows = useMemo(() => normalizeCertificateRequests(widgets.certificateRequests), [widgets.certificateRequests]);
  const certificateTotal = metric(widgets.certificateRequests, ["totalRequests", "totalCertificateRequests", "requestCount"])
    ?? (certificateRows.length ? certificateRows.reduce((sum, item) => sum + item.value, 0) : undefined);
  const activities = useMemo(() => normalizeActivities(widgets.recentActivity), [widgets.recentActivity]);
  const visibleActivities = showAllActivities ? activities : activities.slice(0, 6);
  const facultyWorkload = useMemo(() => normalizeFacultyWorkload(widgets.facultyWorkload), [widgets.facultyWorkload]);
  const upcomingExaminations = useMemo(() => normalizeUpcomingExaminations(widgets.upcomingExaminations), [widgets.upcomingExaminations]);
  const selectedBoardLabel = masterOptions.boards.find((item) => item.value === filters.board)?.label || "All Boards";
  const calendarRange = apiDateRange(filters.date);
  const calendarRangeLabel = `${formatDateLabel(calendarRange.from, { month: "short", day: "2-digit", year: "numeric" })} - ${formatDateLabel(calendarRange.to, { month: "short", day: "2-digit", year: "numeric" })}`;
  const greeting = greetingForHour(currentHour);
  const dashboardTitle = (
    <span className="dashboard-welcome-title">
      <span className="dashboard-time-greeting">
        {greeting.message}
        <span className="dashboard-greeting-icon" role="img" aria-label={greeting.iconLabel}>{greeting.icon}</span>
      </span>
      <span className="dashboard-welcome-copy">Welcome back, Admin!</span>
      <span className="dashboard-breadcrumb-copy">Dashboard</span>
    </span>
  );
  const resetFilters = () => {
    setFilters({
      year: masterOptions.years.find((item) => item.current)?.value || masterOptions.years[0]?.value || "",
      board: masterOptions.boards.find((item) => item.current)?.value || masterOptions.boards[0]?.value || "",
      date: localDateValue(),
    });
  };

  const filtersContent = <div className="dashboard-filters" aria-label="Dashboard filters">
    <label htmlFor="dashboard-year"><span>Academic Year</span><select id="dashboard-year" aria-label="Academic Year" value={filters.year} disabled={loadingFilters} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}><option value="">All Academic Years</option>{masterOptions.years.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label className="dashboard-board-filter" htmlFor="dashboard-board" style={{ "--board-select-width": `${Math.min(Math.max(selectedBoardLabel.length + 5, 20), 50)}ch` }}><span>Board</span><select id="dashboard-board" aria-label="Board" value={filters.board} disabled={loadingFilters} onChange={(event) => setFilters((current) => ({ ...current, board: event.target.value }))}><option value="">All Boards</option>{masterOptions.boards.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label htmlFor="dashboard-date"><span>Calendar</span><span className="dashboard-date-control"><span className="dashboard-date-range">{calendarRangeLabel}</span><CalendarDays size={17} aria-hidden="true" /><input id="dashboard-date" aria-label={`Calendar range ending ${formatDateLabel(filters.date, { month: "long", day: "numeric", year: "numeric" })}`} type="date" max={localDateValue()} value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value || localDateValue() }))} /></span></label>
    <button type="button" className="dashboard-reset-button" onClick={resetFilters} disabled={loadingFilters} aria-label="Reset dashboard filters"><RotateCcw size={16} aria-hidden="true" /> Reset</button>
  </div>;

  return <DashboardLayout title={dashboardTitle} subtitle="Here's the complete overview of your college." actions={filtersContent} breadcrumb={["Overview"]}>
    <main className="dashboard-page">
      {errors.filters ? <div className="dashboard-warning" role="alert">{errors.filters}</div> : null}
      <section className="dashboard-kpi-grid" aria-label="College totals">{kpis.map((item) => <KpiCard key={item.label} {...item} loading={loading.summary} />)}</section>
      <section className="dashboard-main-grid" aria-label="Dashboard analytics">
        <article className="dashboard-card dashboard-students-card"><CardHeader title="Students Overview" />
          {loading.admissionTrend ? <LoadingState label="Loading admission trend..." /> : admissionTrend.length ? <div className="dashboard-chart dashboard-line-chart" role="img" aria-label="Students joined by month"><ResponsiveContainer width="100%" height="100%"><AreaChart data={admissionTrend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="studentsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [formatNumber(value), "Students joined"]} /><Area type="monotone" dataKey="studentsJoined" name="Students joined" stroke="#2563eb" strokeWidth={2.5} fill="url(#studentsArea)" dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div> : <EmptyState message={errors.admissionTrend ? "Unable to load admission trend." : "No admission trend is available for the selected filters."} />}
          {!loading.studentsOverview && (gender.male !== undefined || gender.female !== undefined || gender.other !== undefined) ? <div className="dashboard-gender-summary" aria-label="Student gender summary"><div><span className="dashboard-gender-icon male"><Users size={17} /></span><p>Male<strong>{formatNumber(gender.male)}</strong></p></div><div><span className="dashboard-gender-icon female"><Users size={17} /></span><p>Female<strong>{formatNumber(gender.female)}</strong></p></div>{gender.other !== undefined ? <div><span className="dashboard-gender-icon other"><Users size={17} /></span><p>Other<strong>{formatNumber(gender.other)}</strong></p></div> : null}</div> : null}
        </article>
        <article className="dashboard-card dashboard-group-card"><CardHeader title="Students by Group" />
          {loading.groupDistribution ? <LoadingState label="Loading group distribution..." /> : groupDistribution.length ? <div className="dashboard-group-content"><div className="dashboard-donut" role="img" aria-label="Student distribution by group"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2}>{groupDistribution.map((item, index) => <Cell key={item.name} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [formatNumber(value), "Students"]} /></PieChart></ResponsiveContainer><div><strong>{formatNumber(totalStudents ?? groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-list">{groupDistribution.map((item, index) => <div key={item.name}><i style={{ backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{formatNumber(item.value)}</strong><em>{groupTotal ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0%"}</em></div>)}</div></div> : <EmptyState message={errors.groupDistribution ? "Unable to load group distribution." : "No group distribution is available for the selected filters."} />}
        </article>
        <article className="dashboard-card dashboard-attendance-card"><CardHeader title="Students Attendance Overview (This Week)" />
          {loading.weeklyAttendance ? <LoadingState label="Loading weekly attendance..." /> : weeklyAttendance.length ? <div className="dashboard-chart dashboard-attendance-chart" role="img" aria-label={`Attendance through ${formatDateLabel(filters.date)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyAttendance} margin={{ top: 14, right: 4, left: -24, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(_, entries) => entries?.[0]?.payload?.date ? formatDateLabel(entries[0].payload.date, { day: "2-digit", month: "short", year: "numeric" }) : ""} /><Legend iconType="circle" iconSize={8} /><Bar dataKey="present" name="Present" stackId="attendance" fill="#22a447" radius={[3, 3, 0, 0]} /><Bar dataKey="absent" name="Absent" stackId="attendance" fill="#ef4444" /><Bar dataKey="leave" name="Leave" stackId="attendance" fill="#f59e0b" /></BarChart></ResponsiveContainer></div> : <EmptyState message={errors.weeklyAttendance ? "Unable to load weekly attendance." : "Weekly attendance detail is unavailable for the selected dates."} />}<p className="dashboard-card-note">Rolling 7 days · {formatDateLabel(apiDateRange(filters.date).from)} – {formatDateLabel(filters.date)}</p>
        </article>
      </section>
      <section className="dashboard-lower-grid" aria-label="Requests and recent activities">
        <article className="dashboard-card dashboard-certificate-card"><CardHeader title="Certificate Requests" action={<Link to="/dashboard/certificates" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.certificateRequests ? <LoadingState label="Loading certificate requests..." /> : certificateRows.length ? <div className="dashboard-certificate-list">{certificateRows.map(({ key, label, icon: Icon, tone, value }) => <div key={key}><span className={`dashboard-list-icon tone-${tone}`}><Icon size={16} /></span><span>{label}</span><strong>{formatNumber(value)}</strong></div>)}<footer><span>Total Requests</span><strong>{formatNumber(certificateTotal)}</strong></footer></div> : <EmptyState message={errors.certificateRequests ? "Unable to load certificate requests." : "No certificate requests are available for the selected filters."} />}</article>
        <article className="dashboard-card dashboard-activities-card"><CardHeader title="Recent Activities" action={<div className="dashboard-activity-actions"><button className="dashboard-view-link" type="button" onClick={() => loadRecentActivity({ force: true })} disabled={activityRefreshing} aria-label="Refresh recent activities"><RotateCcw className={activityRefreshing ? "is-spinning" : ""} size={13} />{activityRefreshing ? "Refreshing" : "Refresh"}</button>{activities.length > 6 ? <button className="dashboard-view-link" type="button" onClick={() => setShowAllActivities((current) => !current)}>{showAllActivities ? "Show Less" : "View All"}<ChevronRight className={showAllActivities ? "is-expanded" : ""} size={15} /></button> : null}</div>} />{loading.recentActivity ? <LoadingState label="Loading recent activities..." /> : activities.length ? <>{errors.recentActivity ? <p className="dashboard-inline-error">Unable to refresh recent activities. Showing the latest available data.</p> : null}<div className={`dashboard-activity-list ${showAllActivities ? "is-expanded" : ""}`}>{visibleActivities.map((item) => <div key={item.id !== undefined && item.id !== null ? `activity-${item.id}` : `activity-${item.sourceIndex}-${item.timestamp}`}><span className="dashboard-activity-marker"><Activity size={14} /></span><p><strong title={item.action}>{item.action}</strong><span>{item.user} · {item.module}</span><small>{formatActivityDate(item.timestamp)}</small></p></div>)}</div></> : <EmptyState message={errors.recentActivity ? "Unable to load recent activities." : "No recent activities are available."} />}</article>
      </section>
      <section className="dashboard-lower-grid dashboard-secondary-grid" aria-label="Faculty workload and upcoming examinations">
        <article className="dashboard-card"><CardHeader title="Faculty Workload" action={<Link to="/dashboard/faculty" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.facultyWorkload ? <LoadingState label="Loading faculty workload..." /> : facultyWorkload.length ? <div className="dashboard-info-list">{facultyWorkload.map((item) => <div key={item.id}><span className="dashboard-activity-marker"><UserRoundCheck size={14} /></span><p><strong>{item.name}</strong><span>{item.department || "Department unavailable"}</span></p><div className="dashboard-info-metrics">{item.subjects !== undefined ? <span>{formatNumber(item.subjects)} subjects</span> : null}{item.hours !== undefined ? <span>{formatNumber(item.hours)} hrs/week</span> : null}</div></div>)}</div> : <EmptyState message={errors.facultyWorkload ? "Unable to load faculty workload." : "No faculty workload is available for the selected filters."} />}</article>
        <article className="dashboard-card"><CardHeader title="Upcoming Examinations" action={<Link to="/dashboard/examinations" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.upcomingExaminations ? <LoadingState label="Loading upcoming examinations..." /> : upcomingExaminations.length ? <div className="dashboard-info-list">{upcomingExaminations.map((item) => <div key={item.id}><span className="dashboard-activity-marker"><CalendarDays size={14} /></span><p><strong>{item.name}</strong><span>{item.context || item.status || "Examination details"}</span></p><div className="dashboard-info-metrics">{item.date ? <span>{formatDateLabel(String(item.date).slice(0, 10), { day: "2-digit", month: "short", year: "numeric" })}</span> : null}</div></div>)}</div> : <EmptyState message={errors.upcomingExaminations ? "Unable to load upcoming examinations." : "No upcoming examinations are available for the selected filters."} />}</article>
      </section>
    </main>
  </DashboardLayout>;
}
