import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, BookOpen, CalendarCheck, CalendarClock, GraduationCap, RefreshCw, TrendingUp, Users } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Loader, StatusBadge } from "@/components/common/Ui.jsx";
import "./DashboardPage.css";

const dashboardApi = {
  summary: "/api/v1/dashboard/summary",
  admissionTrend: "/api/v1/dashboard/admission-trend",
};
const SECONDARY_REQUESTS = [
  ["admissions", apiEndpoints.reports.admissions], ["strength", apiEndpoints.reports.studentStrength],
  ["attendance", apiEndpoints.reports.attendance],
  ["fees", apiEndpoints.reports.feeCollection], ["dues", apiEndpoints.reports.feeOutstanding],
  ["exams", apiEndpoints.reports.examinations],
  ["pass", apiEndpoints.reports.passPercentage],
  ["groups", apiEndpoints.reports.groups],
  ["workload", apiEndpoints.reports.facultyWorkload], ["audit", apiEndpoints.reports.auditLogs],
  ["faculty", apiEndpoints.faculty.getAll],
];
const DASHBOARD_API_VERSION = "1.0";
const DASHBOARD_CACHE_KEY = "cms-dashboard-cache-v2";
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;

function readDashboardCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(DASHBOARD_CACHE_KEY) || "null");
    if (!cached?.data || Date.now() - cached.savedAt > DASHBOARD_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}
const COLORS = ["#1d4ed8", "#60a5fa", "#6d28d9", "#0f9d58", "#f59e0b", "#ef6675"];

function unwrap(payload) {
  let value = payload;
  const seen = new Set();
  while (value && typeof value === "object" && !Array.isArray(value) && !seen.has(value)) {
    seen.add(value);
    const next = value.data ?? value.Data ?? value.result ?? value.Result;
    if (next === undefined || next === value) break;
    value = next;
  }
  return value;
}

function rows(payload, preferred = []) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of [...preferred, "items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function number(item, ...keys) {
  const value = read(item, ...keys);
  const parsed = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : undefined;
}

function metric(payload, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [unwrap(payload)];
  const seen = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    for (const [key, value] of Object.entries(item)) {
      if (wanted.has(key.toLowerCase())) {
        const parsed = Number(value);
        if (value !== "" && Number.isFinite(parsed)) return parsed;
      }
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return undefined;
}

function firstMetric(data, sourceKeys, keys) {
  for (const sourceKey of sourceKeys) {
    const value = metric(data[sourceKey], keys);
    if (value !== undefined) return value;
  }
  return undefined;
}

function arrayCount(payload, preferred = []) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.length;
  for (const key of [...preferred, "items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key].length;
  }
  return undefined;
}

function activeAcademicYearInfo(summary, academicYears) {
  const summaryNode = unwrap(summary);
  const summaryId = Number(read(summaryNode, "currentAcademicYearId", "CurrentAcademicYearId", "activeAcademicYearId", "ActiveAcademicYearId", "academicYearId", "AcademicYearId"));
  const summaryName = read(summaryNode, "currentAcademicYearName", "CurrentAcademicYearName", "activeAcademicYearName", "ActiveAcademicYearName", "academicYearName", "AcademicYearName", "yearName", "YearName");
  const yearRows = rows(academicYears, ["academicYears", "AcademicYears", "years", "Years"]);
  const idMatch = Number.isInteger(summaryId) && summaryId > 0
    ? yearRows.find((item) => Number(read(item, "academicYearId", "AcademicYearId", "id", "Id")) === summaryId)
    : null;
  const activeYear = idMatch ?? yearRows.find((item) => {
      const marker = read(item, "isCurrent", "IsCurrent", "isActive", "IsActive", "current", "Current", "status", "Status");
      return marker === true || ["true", "active", "current"].includes(String(marker).toLowerCase());
    });
  const rowId = Number(read(activeYear, "academicYearId", "AcademicYearId", "id", "Id"));
  const id = Number.isInteger(summaryId) && summaryId > 0 ? summaryId : Number.isInteger(rowId) && rowId > 0 ? rowId : null;
  const name = summaryName ?? read(activeYear, "academicYearName", "AcademicYearName", "name", "Name", "yearName", "YearName") ?? null;
  return { id, name: name ? String(name) : null };
}

function label(item) {
  const value = read(item, "month", "Month", "date", "Date", "period", "Period", "label", "Label", "name", "Name");
  return value === undefined ? "" : String(value).slice(0, 10);
}

function findArray(payload, preferredKeys) {
  const wanted = new Set(preferredKeys.map((key) => key.toLowerCase()));
  const queue = [unwrap(payload)];
  const seen = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    if (Array.isArray(item)) return item;
    for (const [key, value] of Object.entries(item)) {
      if (Array.isArray(value) && wanted.has(key.toLowerCase())) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return [];
}

function normalizeGroups(data) {
  const keys = ["groupDistribution", "groups", "groupWise", "studentStrength", "courseDistribution"];
  for (const source of [data.summary, data.groups, data.strength]) {
    const normalized = findArray(source, keys).map((item) => ({
      name: String(read(item, "groupName", "GroupName", "courseName", "CourseName", "group", "Group", "name", "Name", "label", "Label") ?? "").trim(),
      value: number(item, "studentCount", "StudentCount", "totalStudents", "TotalStudents", "strength", "Strength", "count", "Count", "value", "Value"),
    })).filter((item) => item.name && item.value !== undefined && item.value >= 0);
    if (normalized.length) return normalized;
  }
  return [];
}

function wholeCount(item, ...keys) {
  const value = number(item, ...keys);
  return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function normalizeAdmissionPeriod(item) {
  const explicitYear = wholeCount(item, "year", "Year", "admissionYear", "AdmissionYear");
  const explicitMonth = read(item, "month", "Month", "admissionMonth", "AdmissionMonth");
  let sortDate;

  if (explicitYear && explicitMonth !== undefined) {
    const numericMonth = Number(explicitMonth);
    if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      sortDate = Date.UTC(explicitYear, numericMonth - 1, 1);
    } else {
      const parsedMonth = Date.parse(`${explicitMonth} 1, ${explicitYear}`);
      if (!Number.isNaN(parsedMonth)) sortDate = Date.UTC(explicitYear, new Date(parsedMonth).getUTCMonth(), 1);
    }
  }

  if (sortDate === undefined) {
    const datedPeriod = read(item, "date", "Date", "monthYear", "MonthYear", "period", "Period");
    if (datedPeriod instanceof Date || /(?:19|20)\d{2}/.test(String(datedPeriod ?? ""))) {
      const parsedDate = new Date(datedPeriod);
      if (!Number.isNaN(parsedDate.getTime())) sortDate = Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), 1);
    }
  }

  if (sortDate === undefined) return null;
  const admissions = wholeCount(item, "admissions", "Admissions", "admissionCount", "AdmissionCount", "confirmed", "Confirmed", "count", "Count");
  if (admissions === undefined) return null;
  return {
    sortDate,
    period: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(sortDate),
    admissions,
    applications: wholeCount(item, "applications", "Applications", "applicationCount", "ApplicationCount", "applicationsReceived", "ApplicationsReceived"),
  };
}

function academicYearAdmissionTotal(payload, normalizedTrend) {
  const value = unwrap(payload);
  const directTotal = wholeCount(value, "totalAdmissions", "TotalAdmissions", "academicYearAdmissions", "AcademicYearAdmissions", "admissionsTotal", "AdmissionsTotal");
  if (directTotal !== undefined) return directTotal;
  return normalizedTrend.length ? normalizedTrend.reduce((sum, item) => sum + item.admissions, 0) : undefined;
}

function formatValue(value, type) {
  if (value === undefined) return "—";
  if (type === "currency") return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 2 }).format(value);
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return type === "percent" ? `${formatted}%` : formatted;
}

function Empty({ text = "No data available" }) { return <div className="dashboard-empty">{text}</div>; }

export default function DashboardPage() {
  const initialCache = useMemo(readDashboardCache, []);
  const [data, setData] = useState(() => initialCache?.data ?? {});
  const [failures, setFailures] = useState({});
  const [loading, setLoading] = useState(() => !initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => initialCache ? new Date(initialCache.savedAt) : null);
  const mounted = useRef(true);
  const requestInFlight = useRef(false);
  const dataRef = useRef(initialCache?.data ?? {});

  const loadData = useCallback(async ({ initial = false } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (!initial) setRefreshing(true);
    try {
      const succeeded = {};
      const errors = {};
      const requestConfig = { params: { "api-version": DASHBOARD_API_VERSION }, timeout: REQUEST_TIMEOUT };
      const summaryResult = await Promise.allSettled([apiClient.get(dashboardApi.summary, requestConfig)]);
      if (summaryResult[0].status === "fulfilled") {
        succeeded.summary = summaryResult[0].value.data;
        if (mounted.current) {
          const summaryData = { ...dataRef.current, summary: succeeded.summary };
          dataRef.current = summaryData;
          setData(summaryData);
          setLoading(false);
        }
      }
      else errors.summary = getApiErrorMessage(summaryResult[0].reason);

      const summary = succeeded.summary ?? dataRef.current.summary;
      let academicYears;
      let academicYear = activeAcademicYearInfo(summary);
      if (!academicYear.id || !academicYear.name) {
        const yearResult = await Promise.allSettled([apiClient.get(apiEndpoints.academicYears.getAll, requestConfig)]);
        if (yearResult[0].status === "fulfilled") {
          academicYears = yearResult[0].value.data;
          succeeded.academicYears = academicYears;
          academicYear = activeAcademicYearInfo(summary, academicYears);
        } else errors.academicYears = getApiErrorMessage(yearResult[0].reason);
      }
      succeeded.activeAcademicYear = academicYear;

      const secondaryRequests = SECONDARY_REQUESTS.filter(([key]) => {
        if (key === "strength") return metric(summary, ["totalStudents", "studentStrength", "activeStudents"]) === undefined;
        if (key === "pass") return metric(summary, ["passPercentage", "passRate", "percentage"]) === undefined;
        if (key === "faculty") return metric(summary, ["totalFaculty", "facultyCount", "activeFaculty"]) === undefined;
        return true;
      });
      const secondaryPromise = Promise.allSettled(secondaryRequests.map(([, endpoint]) => apiClient.get(endpoint, requestConfig)));
      const trendPromise = academicYear.id
        ? Promise.allSettled([apiClient.get(dashboardApi.admissionTrend, {
          params: { academicYearId: academicYear.id, "api-version": DASHBOARD_API_VERSION }, timeout: REQUEST_TIMEOUT,
        })])
        : Promise.resolve([]);
      const [secondaryResults, trendResults] = await Promise.all([secondaryPromise, trendPromise]);
      secondaryResults.forEach((result, index) => {
        const [key] = secondaryRequests[index];
        if (result.status === "fulfilled") succeeded[key] = result.value.data;
        else errors[key] = getApiErrorMessage(result.reason);
      });
      const previousAcademicYearId = dataRef.current.activeAcademicYear?.id;
      const academicYearChanged = previousAcademicYearId && previousAcademicYearId !== academicYear.id;
      if (!academicYear.id) {
        succeeded.admissionTrend = null;
        errors.admissionTrend = "No active Academic Year could be resolved.";
      }
      else if (trendResults[0]?.status === "fulfilled") succeeded.admissionTrend = trendResults[0].value.data;
      else {
        if (academicYearChanged) succeeded.admissionTrend = null;
        errors.admissionTrend = getApiErrorMessage(trendResults[0]?.reason);
      }

      if (!mounted.current) return;
      if (Object.keys(succeeded).some((key) => !["academicYears", "activeAcademicYear"].includes(key))) {
        const merged = { ...dataRef.current, ...succeeded };
        const savedAt = Date.now();
        dataRef.current = merged;
        sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data: merged, savedAt }));
        setData(merged);
        setLastUpdated(new Date(savedAt));
      }
      setFailures(errors);
    } catch (requestError) {
      if (mounted.current) {
        setFailures((current) => ({ ...current, request: getApiErrorMessage(requestError) }));
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    loadData({ initial: true });
  }, [loadData]);

  const activeAcademicYear = data.activeAcademicYear?.id ? data.activeAcademicYear : null;
  const admissionTrend = activeAcademicYear ? rows(data.admissionTrend, ["monthlyAdmissions", "MonthlyAdmissions", "admissionTrend", "AdmissionTrend", "trend", "Trend"]).map(normalizeAdmissionPeriod).filter(Boolean).sort((a, b) => a.sortDate - b.sortDate) : [];
  const academicYearAdmissions = activeAcademicYear
    ? firstMetric(data, ["summary"], ["currentAcademicYearAdmissions", "CurrentAcademicYearAdmissions", "academicYearAdmissions", "AcademicYearAdmissions", "admissionsThisAcademicYear", "AdmissionsThisAcademicYear"])
      ?? academicYearAdmissionTotal(data.admissionTrend, admissionTrend)
    : undefined;
  const admissionsLabel = activeAcademicYear?.name ? `Admissions (${activeAcademicYear.name})` : "Admissions";
  const kpis = useMemo(() => [
    { label: "Total Students", value: firstMetric(data, ["summary", "strength"], ["totalStudents", "studentStrength", "activeStudents"]), icon: Users, tone: "blue" },
    { label: "Faculty Members", value: firstMetric(data, ["summary"], ["totalFaculty", "facultyCount", "activeFaculty"]) ?? arrayCount(data.faculty), icon: GraduationCap, tone: "violet" },
    { label: "Today's Attendance", value: firstMetric(data, ["summary", "attendance"], ["attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]), icon: CalendarCheck, tone: "green", type: "percent" },
    { label: admissionsLabel, value: academicYearAdmissions, icon: TrendingUp, tone: "blue" },
    { label: "Upcoming Exams", value: firstMetric(data, ["summary", "exams"], ["upcomingExams", "upcomingExaminations", "examinationCount"]) ?? arrayCount(data.exams), icon: CalendarClock, tone: "violet" },
    { label: "Pass Percentage", value: firstMetric(data, ["summary", "pass"], ["passPercentage", "passRate", "percentage"]), icon: BookOpen, tone: "green", type: "percent" },
  ], [academicYearAdmissions, admissionsLabel, data]);
  const groupDistribution = normalizeGroups(data);
  const attendanceTrend = rows(data.attendance, ["attendanceTrend", "AttendanceTrend", "trend", "Trend"]).map((item) => ({ period: label(item), attendance: number(item, "attendancePercentage", "AttendancePercentage", "attendance", "Attendance", "percentage", "Percentage"), present: number(item, "presentPercentage", "PresentPercentage", "present", "Present"), absent: number(item, "absentPercentage", "AbsentPercentage", "absent", "Absent") })).filter((item) => item.period);
  const feeRows = rows(data.fees, ["monthlyCollection", "MonthlyCollection", "trend", "Trend"]);
  const dueRows = rows(data.dues, ["monthlyOutstanding", "MonthlyOutstanding", "trend", "Trend"]);
  const feeTrend = [...new Set([...feeRows.map(label), ...dueRows.map(label)].filter(Boolean))].map((period) => ({ period, collected: number(feeRows.find((item) => label(item) === period), "collected", "Collected", "collectedAmount", "CollectedAmount", "amount", "Amount"), due: number(dueRows.find((item) => label(item) === period), "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "due", "Due", "amount", "Amount") }));
  const recentAdmissions = rows(data.admissions, ["recentAdmissions", "RecentAdmissions", "admissions", "Admissions"]).map((item, index) => ({ id: read(item, "studentId", "StudentId", "admissionId", "AdmissionId", "id", "Id") ?? index, admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo") ?? "—", name: read(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName") ?? "—", group: read(item, "groupName", "GroupName", "group", "Group") ?? "—", section: read(item, "sectionName", "SectionName", "section", "Section") ?? "—", date: read(item, "admissionDate", "AdmissionDate", "date", "Date"), status: read(item, "status", "Status") ?? "—" })).filter((item) => item.name !== "—").slice(0, 5);
  const exams = rows(data.exams, ["examinations", "Examinations", "upcomingExams", "UpcomingExams"]).map((item, index) => ({ id: read(item, "examinationId", "ExaminationId", "id", "Id") ?? index, subject: read(item, "subjectName", "SubjectName", "subject", "Subject", "examName", "ExamName") ?? "—", date: read(item, "examDate", "ExamDate", "date", "Date"), time: read(item, "startTime", "StartTime", "time", "Time") ?? "—", hall: read(item, "hallName", "HallName", "roomName", "RoomName", "hall", "Hall") ?? "—", invigilator: read(item, "invigilatorName", "InvigilatorName", "facultyName", "FacultyName") ?? "—", status: read(item, "status", "Status") ?? "Scheduled" })).filter((item) => { const date = new Date(item.date); return !item.date || Number.isNaN(date.getTime()) || date >= new Date(); }).slice(0, 5);
  const workload = rows(data.workload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload"]).map((item) => ({ name: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? ""), hours: number(item, "assignedHours", "AssignedHours", "weeklyHours", "WeeklyHours", "hours", "Hours") })).filter((item) => item.name && item.hours !== undefined).slice(0, 8);
  const activities = rows(data.audit, ["auditLogs", "AuditLogs", "logs", "Logs"]).map((item, index) => ({ id: read(item, "auditLogId", "AuditLogId", "id", "Id") ?? index, user: read(item, "userName", "UserName", "performedBy", "PerformedBy", "createdBy", "CreatedBy") ?? "—", action: read(item, "action", "Action", "actionType", "ActionType") ?? "—", module: read(item, "module", "Module", "moduleName", "ModuleName") ?? "—", date: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "dateTime", "DateTime") })).slice(0, 5);
  const groupTotal = groupDistribution.reduce((sum, item) => sum + item.value, 0);

  const chart = (content, available) => <div className="dashboard-chart-body">{available ? content : <Empty />}</div>;
  const hasApplications = admissionTrend.some((item) => item.applications !== undefined);
  return <DashboardLayout title="Dashboard" subtitle="Institution-wide academic and operational overview." actions={<div className="dashboard-header-actions"><div className="dashboard-refresh-meta"><button className="dashboard-refresh" type="button" onClick={() => loadData()} disabled={refreshing}>{refreshing ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />} {refreshing ? "Refreshing..." : "Refresh"}</button><small>Last Updated: {lastUpdated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdated) : "Not available"}</small></div><Link to="/dashboard/admission" className="cms-btn cms-btn-ghost">New Admission</Link><Link to="/dashboard/reports" className="cms-btn cms-btn-primary"><ArrowUpRight size={16} /> View Reports</Link></div>}>
    {loading ? <div className="cms-card dashboard-loader"><Loader label="Loading dashboard..." /></div> : <>
      {Object.keys(failures).length ? <div className="dashboard-warning">Some dashboard sources are unavailable. Successfully loaded widgets remain available.</div> : null}
      <div className="dashboard-kpi-grid">{kpis.map(({ label: name, value, icon: Icon, tone, type }) => <article className="cms-stat" key={name}><span className={`cms-stat-icon tone-${tone}`}><Icon size={20} /></span><div><div className="cms-stat-label">{name}</div><div className="cms-stat-value">{formatValue(value, type)}</div></div></article>)}</div>
      <div className="dashboard-grid dashboard-grid-3">
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>{admissionsLabel}</h2></div>{chart(<ResponsiveContainer width="100%" height="100%"><AreaChart data={admissionTrend} margin={{ bottom: 28 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" interval={0} angle={-30} textAnchor="end" height={58} /><YAxis allowDecimals={false} tickFormatter={(value) => Math.round(value)} /><Tooltip labelFormatter={(value) => value} formatter={(value, name) => [Number(value), name === "admissions" ? "Admissions" : "Applications"]} /><Legend /><Area dataKey="admissions" stroke="#1d4ed8" fill="#dbeafe" />{hasApplications ? <Area dataKey="applications" stroke="#6d28d9" fillOpacity={0} /> : null}</AreaChart></ResponsiveContainer>, admissionTrend.length > 0)}</section>
        <section className="cms-card dashboard-widget dashboard-group-card"><div className="cms-card-head"><h2>Group Distribution</h2></div>{groupDistribution.length ? <div className="dashboard-group-body"><div className="dashboard-group-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2} isAnimationActive={false}>{groupDistribution.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [new Intl.NumberFormat("en-IN").format(value), "Students"]} /></PieChart></ResponsiveContainer><div className="dashboard-group-total"><strong>{new Intl.NumberFormat("en-IN").format(groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-legend">{groupDistribution.map((item, index) => <div key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{new Intl.NumberFormat("en-IN").format(item.value)}</strong><em>{groupTotal > 0 ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0.0%"}</em></div>)}</div></div> : <Empty />}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Student Attendance</h2></div>{chart(<ResponsiveContainer width="100%" height="100%"><AreaChart data={attendanceTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Legend /><Area dataKey="attendance" stroke="#0f9d58" fill="#dcfce7" /><Area dataKey="absent" stroke="#ef6675" fillOpacity={0} /></AreaChart></ResponsiveContainer>, attendanceTrend.length > 0)}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Fee Collection vs Due</h2></div>{chart(<ResponsiveContainer width="100%" height="100%"><BarChart data={feeTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Legend /><Bar dataKey="collected" fill="#1d4ed8" /><Bar dataKey="due" fill="#cbd5e1" /></BarChart></ResponsiveContainer>, feeTrend.length > 0)}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Faculty Workload</h2></div>{chart(<ResponsiveContainer width="100%" height="100%"><BarChart data={workload} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={85} /><Tooltip /><Bar dataKey="hours" fill="#6d28d9" /></BarChart></ResponsiveContainer>, workload.length > 0)}</section>
      </div>
      <div className="dashboard-grid dashboard-grid-2">
        <section className="cms-card"><div className="cms-card-head"><h2>Recent Admissions</h2><Link to="/dashboard/students" className="cms-btn cms-btn-ghost">View all</Link></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Admission No.</th><th>Student</th><th>Group</th><th>Section</th><th>Admission Date</th><th>Status</th></tr></thead><tbody>{recentAdmissions.length ? recentAdmissions.map((item) => <tr key={item.id}><td className="cms-strong">{item.admissionNo}</td><td>{item.name}</td><td>{item.group}</td><td>{item.section}</td><td>{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—"}</td><td><StatusBadge value={item.status} /></td></tr>) : <tr><td colSpan={6}><Empty /></td></tr>}</tbody></table></div></section>
        <section className="cms-card"><div className="cms-card-head"><h2><CalendarClock size={15} /> Upcoming Examinations</h2><Link to="/dashboard/examinations" className="cms-btn cms-btn-ghost">Manage</Link></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Invigilator</th><th>Status</th></tr></thead><tbody>{exams.length ? exams.map((item) => <tr key={item.id}><td className="cms-strong">{item.subject}</td><td>{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—"}</td><td>{item.time}</td><td>{item.hall}</td><td>{item.invigilator}</td><td><StatusBadge value={item.status} /></td></tr>) : <tr><td colSpan={6}><Empty /></td></tr>}</tbody></table></div></section>
        <section className="cms-card"><div className="cms-card-head"><h2>Recent Activity</h2><Link to="/dashboard/reports" className="cms-btn cms-btn-ghost">View Audit Logs</Link></div><div className="dashboard-activity">{activities.length ? activities.map((item) => <div key={item.id}><span className="dashboard-activity-icon"><Activity size={15} /></span><p><strong>{item.user}</strong> {item.action} · {item.module}<small>{item.date ? new Date(item.date).toLocaleString("en-IN") : "—"}</small></p></div>) : <Empty />}</div></section>
      </div>
    </>}
  </DashboardLayout>;
}
