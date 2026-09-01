import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FileText, GraduationCap, Layers3, Plus, RotateCcw, School, Users, UserRoundCheck, UserRoundCog } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  admissionTrend: "/api/v1/dashboard/admission-trend",
  upcomingExaminations: "/api/v1/dashboard/upcoming-examinations",
};
const DASHBOARD_WIDGETS = Object.entries(DASHBOARD_API).filter(([key]) => key !== "filters");
const QUICK_ACTIONS = [
  { label: "Add Student", to: "/dashboard/admission", icon: Users, tone: "green", add: true },
  { label: "Add Staff", to: "/dashboard/faculty/add?staffTab=teaching", icon: UserRoundCheck, tone: "blue", add: true },
  { label: "Create Group", to: "/dashboard/courses/add", icon: Layers3, tone: "violet", add: true },
  { label: "Create Section", to: "/dashboard/sections", icon: School, tone: "cyan", add: true },
  { label: "Create Exam", to: "/dashboard/examinations/add", icon: FileText, tone: "orange", add: true },
  { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: ClipboardCheck, tone: "green" },
];
const EMPTY_WIDGETS = Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, null]));
const EMPTY_LOADING = Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, false]));
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

function weekDateRange(anchorDate) {
  const [year, month, day] = String(anchorDate).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  const from = shiftLocalDate(anchorDate, -daysSinceMonday);
  return { from, to: shiftLocalDate(from, 6) };
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

function buildDashboardParams(widget, filters) {
  const scope = {
    ...(Number(filters.year) > 0 ? { academicYearId: Number(filters.year) } : {}),
    ...(Number(filters.board) > 0 ? { boardId: Number(filters.board) } : {}),
  };
  if (["groupDistribution", "admissionTrend", "upcomingExaminations"].includes(widget)) return scope;
  const date = `${filters.date}T00:00:00`;
  if (widget !== "weeklyAttendance") return { ...scope, date };
  const week = weekDateRange(filters.date);
  return {
    ...scope,
    date,
    startDate: `${week.from}T00:00:00`,
    endDate: `${week.to}T23:59:59`,
  };
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
  const week = weekDateRange(anchorDate);
  const attendanceByDate = new Map();

  source.forEach((item) => {
    const date = String(read(item, "attendanceDate", "AttendanceDate", "date", "Date", "day", "Day") ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < week.from || date > week.to) return;
    const present = numeric(item, "present", "Present", "presentCount", "PresentCount");
    const absent = numeric(item, "absent", "Absent", "absentCount", "AbsentCount");
    const leave = numeric(item, "leave", "Leave", "leaveCount", "LeaveCount", "onLeave", "OnLeave");
    if (present === undefined && absent === undefined && leave === undefined) return;
    const current = attendanceByDate.get(date) || { present: 0, absent: 0, leave: 0 };
    attendanceByDate.set(date, {
      present: current.present + (present ?? 0),
      absent: current.absent + (absent ?? 0),
      leave: current.leave + (leave ?? 0),
    });
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftLocalDate(week.from, index);
    return { date, ...(attendanceByDate.get(date) || { present: 0, absent: 0, leave: 0 }) };
  });
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
function KpiCard({ label, value, icon: Icon, tone, loading }) {
  return <article className={`dashboard-kpi dashboard-kpi-${tone}`}><span className="dashboard-kpi-icon"><Icon size={22} aria-hidden="true" /></span><div><span>{label}</span><strong>{loading ? "—" : formatNumber(value)}</strong></div></article>;
}

export default function DashboardPage() {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [masterOptions, setMasterOptions] = useState({ years: [], boards: [] });
  const [filters, setFilters] = useState({ year: "", board: "", date: localDateValue() });
  const [widgets, setWidgets] = useState(EMPTY_WIDGETS);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loading, setLoading] = useState(EMPTY_LOADING);
  const [errors, setErrors] = useState({});
  const filterRequestRef = useRef(0);
  const widgetRequestRef = useRef(0);
  const widgetControllerRef = useRef(null);

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
    if (loadingFilters) return undefined;
    const requestId = ++widgetRequestRef.current;
    widgetControllerRef.current?.abort();
    const controller = new AbortController();
    widgetControllerRef.current = controller;
    setWidgets(EMPTY_WIDGETS);
    setLoading(Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, true])));
    setErrors((current) => ({ filters: current.filters || "" }));
    const requests = DASHBOARD_WIDGETS.map(([key, endpoint]) => apiClient.get(endpoint, {
      params: buildDashboardParams(key, filters),
      signal: controller.signal,
      timeout: REQUEST_TIMEOUT,
    }));
    Promise.allSettled(requests).then((results) => {
      if (requestId !== widgetRequestRef.current) return;
      const next = { ...EMPTY_WIDGETS };
      const nextErrors = {};
      DASHBOARD_WIDGETS.forEach(([key], index) => {
        const result = results[index];
        if (result.status === "fulfilled") next[key] = result.value.data;
        else nextErrors[key] = getApiErrorMessage(result.reason, `Unable to load ${key}.`);
      });
      setWidgets(next);
      setErrors((current) => ({ filters: current.filters || "", ...nextErrors }));
      setLoading(EMPTY_LOADING);
    });
    return () => {
      widgetRequestRef.current += 1;
      controller.abort();
    };
  }, [filters, loadingFilters]);

  const totalStudents = metric(widgets.summary, ["totalStudents", "totalStudentCount", "studentCount", "studentsCount", "activeStudents", "students"]);
  const kpis = [
    { label: "Total Students", value: totalStudents, icon: Users, tone: "green" },
    { label: "Teaching Staff", value: metric(widgets.summary, ["teachingStaff", "teachingStaffCount", "totalTeachingStaff", "totalTeachingStaffCount"]), icon: UserRoundCheck, tone: "blue" },
    { label: "Non-Teaching Staff", value: metric(widgets.summary, ["nonTeachingStaff", "nonTeachingStaffCount", "totalNonTeachingStaff", "totalNonTeachingStaffCount"]), icon: UserRoundCog, tone: "orange" },
    { label: "Total Groups", value: metric(widgets.summary, ["totalGroups", "totalGroupCount", "groupCount", "groupsCount", "groups"]), icon: Layers3, tone: "violet" },
    { label: "Total Sections", value: metric(widgets.summary, ["totalSections", "totalSectionCount", "sectionCount", "sectionsCount", "sections"]), icon: School, tone: "cyan" },
  ];
  const admissionTrend = useMemo(() => normalizeAdmissionTrend(widgets.admissionTrend), [widgets.admissionTrend]);
  const gender = {
    male: metric(widgets.studentsOverview, ["maleStudents", "maleCount", "totalMale", "boys", "boysCount", "totalBoys", "male"]),
    female: metric(widgets.studentsOverview, ["femaleStudents", "femaleCount", "totalFemale", "girls", "girlsCount", "totalGirls", "female"]),
    other: metric(widgets.studentsOverview, ["otherStudents", "otherCount", "totalOther", "others", "othersCount", "totalOthers", "other"]),
  };
  const groupDistribution = useMemo(() => normalizeGroupDistribution(widgets.groupDistribution), [widgets.groupDistribution]);
  const groupTotal = groupDistribution.reduce((sum, item) => sum + item.value, 0);
  const attendanceWeek = useMemo(() => weekDateRange(filters.date), [filters.date]);
  const weeklyAttendance = useMemo(() => normalizeWeeklyAttendance(widgets.weeklyAttendance, filters.date), [widgets.weeklyAttendance, filters.date]);
  const certificateRows = useMemo(() => normalizeCertificateRequests(widgets.certificateRequests), [widgets.certificateRequests]);
  const certificateTotal = metric(widgets.certificateRequests, ["totalRequests", "totalCertificateRequests", "requestCount"])
    ?? (certificateRows.length ? certificateRows.reduce((sum, item) => sum + item.value, 0) : undefined);
  const upcomingExaminations = useMemo(() => normalizeUpcomingExaminations(widgets.upcomingExaminations), [widgets.upcomingExaminations]);
  const selectedBoardLabel = masterOptions.boards.find((item) => item.value === filters.board)?.label || "All Boards";
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
    <button type="button" className="dashboard-reset-button" onClick={resetFilters} disabled={loadingFilters} aria-label="Reset dashboard filters"><RotateCcw size={16} aria-hidden="true" /> Reset</button>
  </div>;

  return <DashboardLayout title={dashboardTitle} subtitle="Here's the complete overview of your college." actions={filtersContent} breadcrumb={["Overview"]}>
    <main className="dashboard-page">
      {errors.filters ? <div className="dashboard-warning" role="alert">{errors.filters}</div> : null}
      <section className="dashboard-kpi-grid" aria-label="College totals">{kpis.map((item) => <KpiCard key={item.label} {...item} loading={loading.summary} />)}</section>
      <nav className="dashboard-quick-actions" aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <div>
          {QUICK_ACTIONS.map(({ label, to, icon: Icon, tone, add }) => (
            <Link key={label} to={to} className={`dashboard-quick-action tone-${tone}`}>
              <span className="dashboard-quick-action-icon">
                <Icon size={18} aria-hidden="true" />
                {add ? <Plus className="dashboard-quick-action-plus" size={10} strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <section className="dashboard-main-grid" aria-label="Dashboard analytics">
        <article className="dashboard-card dashboard-students-card"><CardHeader title="Students Overview" />
          {loading.admissionTrend ? <LoadingState label="Loading admission trend..." /> : admissionTrend.length ? <div className="dashboard-chart dashboard-line-chart" role="img" aria-label="Students joined by month"><ResponsiveContainer width="100%" height="100%"><AreaChart data={admissionTrend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="studentsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [formatNumber(value), "Students joined"]} /><Area type="monotone" dataKey="studentsJoined" name="Students joined" stroke="#2563eb" strokeWidth={2.5} fill="url(#studentsArea)" dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div> : <EmptyState message={errors.admissionTrend ? "Unable to load admission trend." : "No admission trend is available for the selected filters."} />}
          {!loading.studentsOverview && (gender.male !== undefined || gender.female !== undefined || gender.other !== undefined) ? <div className="dashboard-gender-summary" aria-label="Student gender summary"><div><span className="dashboard-gender-icon male"><Users size={17} /></span><p>Male<strong>{formatNumber(gender.male)}</strong></p></div><div><span className="dashboard-gender-icon female"><Users size={17} /></span><p>Female<strong>{formatNumber(gender.female)}</strong></p></div>{gender.other !== undefined ? <div><span className="dashboard-gender-icon other"><Users size={17} /></span><p>Other<strong>{formatNumber(gender.other)}</strong></p></div> : null}</div> : null}
        </article>
        <article className="dashboard-card dashboard-group-card"><CardHeader title="Students by Group" />
          {loading.groupDistribution ? <LoadingState label="Loading group distribution..." /> : groupDistribution.length ? <div className="dashboard-group-content"><div className={`dashboard-donut${groupTotal ? "" : " is-empty"}`} role="img" aria-label="Student distribution by group"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2}>{groupDistribution.map((item, index) => <Cell key={item.name} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [formatNumber(value), "Students"]} /></PieChart></ResponsiveContainer><div><strong>{formatNumber(totalStudents ?? groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-list">{groupDistribution.map((item, index) => <div key={item.name}><i style={{ backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{formatNumber(item.value)}</strong><em>{groupTotal ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0%"}</em></div>)}</div></div> : <EmptyState message={errors.groupDistribution ? "Unable to load group distribution." : "No group distribution is available for the selected filters."} />}
        </article>
        <article className="dashboard-card dashboard-attendance-card"><CardHeader title="Students Attendance Overview (This Week)" />
          {loading.weeklyAttendance ? <LoadingState label="Loading weekly attendance..." /> : errors.weeklyAttendance ? <EmptyState message="Unable to load weekly attendance." /> : <><div className="dashboard-chart dashboard-attendance-chart" role="img" aria-label={`Attendance from ${formatDateLabel(attendanceWeek.from)} through ${formatDateLabel(attendanceWeek.to)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyAttendance} margin={{ top: 22, right: 4, left: -24, bottom: 6 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} height={24} interval={0} tickFormatter={(date) => formatDateLabel(date, { weekday: "short" })} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(_, entries) => entries?.[0]?.payload?.date ? formatDateLabel(entries[0].payload.date, { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) : ""} /><Bar dataKey="present" name="Present" stackId="attendance" fill="#22a447" radius={[3, 3, 0, 0]} /><Bar dataKey="absent" name="Absent" stackId="attendance" fill="#ef4444" /><Bar dataKey="leave" name="Leave" stackId="attendance" fill="#f59e0b" /></BarChart></ResponsiveContainer></div><div className="dashboard-attendance-legend" aria-label="Attendance categories"><span><i className="present" />Present</span><span><i className="absent" />Absent</span><span><i className="leave" />Leave</span></div></>}<p className="dashboard-card-note">Current week · {formatNumericDate(attendanceWeek.from)} – {formatNumericDate(attendanceWeek.to)}</p>
        </article>
      </section>
      <section className="dashboard-lower-grid" aria-label="Certificate requests and upcoming examinations">
        <article className="dashboard-card dashboard-certificate-card"><CardHeader title="Certificate Requests" action={<Link to="/dashboard/certificates" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.certificateRequests ? <LoadingState label="Loading certificate requests..." /> : certificateRows.length ? <div className="dashboard-certificate-list">{certificateRows.map(({ key, label, icon: Icon, tone, value }) => <div key={key}><span className={`dashboard-list-icon tone-${tone}`}><Icon size={16} /></span><span>{label}</span><strong>{formatNumber(value)}</strong></div>)}<footer><span>Total Requests</span><strong>{formatNumber(certificateTotal)}</strong></footer></div> : <EmptyState message={errors.certificateRequests ? "Unable to load certificate requests." : "No certificate requests are available for the selected filters."} />}</article>
        <article className="dashboard-card"><CardHeader title={`Upcoming Examinations (${loading.upcomingExaminations ? "…" : upcomingExaminations.length})`} action={<Link to="/dashboard/examinations" className="dashboard-view-link">View All <ChevronRight size={15} /></Link>} />{loading.upcomingExaminations ? <LoadingState label="Loading upcoming examinations..." /> : upcomingExaminations.length ? <div className="dashboard-info-list">{upcomingExaminations.slice(0, 6).map((item) => <div key={item.id}><span className="dashboard-activity-marker"><CalendarDays size={14} /></span><p><strong>{item.name}</strong><span>{item.context || item.status || "Examination details"}</span></p><div className="dashboard-info-metrics"><span>{formatDateLabel(item.date, { day: "2-digit", month: "short", year: "numeric" })}</span></div></div>)}</div> : <EmptyState message={errors.upcomingExaminations ? "Unable to load upcoming examinations." : "No upcoming examinations are available for the selected filters."} />}</article>
      </section>
    </main>
  </DashboardLayout>;
}
