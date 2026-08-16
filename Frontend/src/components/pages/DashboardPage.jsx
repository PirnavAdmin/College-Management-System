import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertCircle, ArrowUpRight, BookOpen, CalendarCheck, CalendarClock, CircleDollarSign, GraduationCap, RefreshCw, TrendingUp, Users } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Loader, StatusBadge } from "@/components/common/Ui.jsx";
import "./DashboardPage.css";

const DATA_REQUESTS = [
  ["dashboard", apiEndpoints.reports.dashboard], ["summary", apiEndpoints.reports.summary],
  ["admissions", apiEndpoints.reports.admissions], ["strength", apiEndpoints.reports.studentStrength],
  ["attendance", apiEndpoints.reports.attendance], ["facultyAttendance", apiEndpoints.reports.facultyAttendance],
  ["fees", apiEndpoints.reports.feeCollection], ["dues", apiEndpoints.reports.feeOutstanding],
  ["exams", apiEndpoints.reports.examinations],
  ["pass", apiEndpoints.reports.passPercentage],
  ["groups", apiEndpoints.reports.groups],
  ["workload", apiEndpoints.reports.facultyWorkload], ["audit", apiEndpoints.reports.auditLogs],
  ["faculty", apiEndpoints.faculty.getAll],
];
const COLORS = ["#1d4ed8", "#60a5fa", "#6d28d9", "#0f9d58", "#f59e0b", "#ef6675"];
const DEMO = {
  kpis: { students: 1482, faculty: 96, attendance: 92.4, admissions: 48, fees: 4875000, dues: 1234000, exams: 12, pass: 87.6 },
  admissions: [["Apr", 65], ["May", 118], ["Jun", 195], ["Jul", 160], ["Aug", 105], ["Sep", 58]].map(([period, admissions]) => ({ period, admissions, applications: Math.round(admissions * 1.25) })),
  groups: [["MPC", 520], ["BiPC", 412], ["CEC", 298], ["MEC", 252]].map(([name, value]) => ({ name, value })),
  attendance: [["Apr", 82], ["May", 86], ["Jun", 89], ["Jul", 91], ["Aug", 88], ["Sep", 92], ["Oct", 90], ["Nov", 93], ["Dec", 91], ["Jan", 92], ["Feb", 88], ["Mar", 91]].map(([period, attendance]) => ({ period, attendance, absent: 100 - attendance })),
  facultyAttendance: [{ name: "Present", value: 86 }, { name: "On Leave", value: 8 }, { name: "Absent", value: 2 }],
  fees: [["Apr", 42, 12], ["May", 55, 15], ["Jun", 58, 11], ["Jul", 62, 18], ["Aug", 57, 13], ["Sep", 66, 17], ["Oct", 61, 12], ["Nov", 69, 15], ["Dec", 72, 19], ["Jan", 58, 13], ["Feb", 65, 16], ["Mar", 70, 12]].map(([period, collected, due]) => ({ period, collected: collected * 100000, due: due * 100000 })),
  workload: [["Priya Sharma", 32], ["Karthik Nair", 28], ["Anitha Rao", 26], ["Suresh Kumar", 24], ["Ravi Teja", 18]].map(([name, hours]) => ({ name, hours })),
  admissionsRows: [["ADM-2026-048", "Kavya Reddy", "MPC", "A", "2026-08-12"], ["ADM-2026-047", "Rohit Kumar", "BiPC", "A", "2026-08-12"], ["ADM-2026-046", "Meera Joshi", "MEC", "B", "2026-08-11"], ["ADM-2026-045", "Arjun Singh", "MPC", "B", "2026-08-11"], ["ADM-2026-044", "Sana Parveen", "CEC", "A", "2026-08-10"]].map(([admissionNo, name, group, section, date], id) => ({ id: `demo-${id}`, admissionNo, name, group, section, date, status: "Active" })),
  examsRows: [["Mathematics IA", "2026-08-20", "09:30-12:30", "Hall-1", "Priya Sharma"], ["Physics", "2026-08-22", "09:30-12:30", "Hall-2", "Karthik Nair"], ["Chemistry", "2026-08-24", "09:30-12:30", "Hall-1", "Ravi Teja"], ["English", "2026-08-27", "09:30-12:30", "Hall-3", "Suresh Kumar"], ["Botany", "2026-08-29", "09:30-12:30", "Hall-2", "Anitha Rao"]].map(([subject, date, time, hall, invigilator], id) => ({ id: `demo-${id}`, subject, date, time, hall, invigilator, status: "Scheduled" })),
  activities: ["New admission Kavya Reddy added", "Fee payment received", "Attendance marked", "Exam timetable published", "Marks entered"].map((action, id) => ({ id: `demo-${id}`, user: "College Admin", action, module: "Dashboard", date: "2026-08-12T12:00:00+05:30" })),
};

function DemoBadge({ show }) { return show ? <span className="dashboard-demo-badge">Demo</span> : null; }

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
  for (const source of [data.dashboard, data.groups, data.strength]) {
    const normalized = findArray(source, keys).map((item) => ({
      name: String(read(item, "groupName", "GroupName", "courseName", "CourseName", "group", "Group", "name", "Name", "label", "Label") ?? "").trim(),
      value: number(item, "studentCount", "StudentCount", "totalStudents", "TotalStudents", "strength", "Strength", "count", "Count", "value", "Value"),
    })).filter((item) => item.name && item.value !== undefined && item.value > 0);
    if (normalized.length) return normalized;
  }
  return [];
}

function formatValue(value, type) {
  if (value === undefined) return "—";
  if (type === "currency") return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 2 }).format(value);
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return type === "percent" ? `${formatted}%` : formatted;
}

function Empty({ text = "No data available" }) { return <div className="dashboard-empty">{text}</div>; }

export default function DashboardPage() {
  const [data, setData] = useState({});
  const [failures, setFailures] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);

  const loadData = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true); else setRefreshing(true);
    const results = await Promise.allSettled(DATA_REQUESTS.map(([, endpoint]) => apiClient.get(endpoint)));
    if (!mounted.current) return;
    const next = {};
    const errors = {};
    results.forEach((result, index) => {
      const [key] = DATA_REQUESTS[index];
      if (result.status === "fulfilled") next[key] = result.value.data;
      else errors[key] = getApiErrorMessage(result.reason);
    });
    setData(next);
    setFailures(errors);
    if (results.some((result) => result.status === "fulfilled")) setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    loadData({ initial: true });
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (!document.hidden) loadData(); }, 60000);
    const onVisibilityChange = () => { if (!document.hidden) loadData(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [loadData]);

  const kpis = useMemo(() => [
    { label: "Total Students", real: firstMetric(data, ["dashboard", "summary", "strength"], ["totalStudents", "studentStrength", "activeStudents"]), demo: DEMO.kpis.students, icon: Users, tone: "blue" },
    { label: "Faculty Members", real: firstMetric(data, ["dashboard", "summary", "facultyAttendance"], ["totalFaculty", "facultyCount", "activeFaculty"]) ?? (rows(data.faculty).length || undefined), demo: DEMO.kpis.faculty, icon: GraduationCap, tone: "violet" },
    { label: "Today's Attendance", real: firstMetric(data, ["dashboard", "summary", "attendance"], ["attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]), demo: DEMO.kpis.attendance, icon: CalendarCheck, tone: "green", type: "percent" },
    { label: "New Admissions", real: firstMetric(data, ["dashboard", "summary", "admissions"], ["newAdmissions", "totalAdmissions", "admissionsCount", "count"]) ?? (rows(data.admissions).length || undefined), demo: DEMO.kpis.admissions, icon: TrendingUp, tone: "blue" },
    { label: "Fees Collected", real: firstMetric(data, ["dashboard", "summary", "fees"], ["totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected"]), demo: DEMO.kpis.fees, icon: CircleDollarSign, tone: "green", type: "currency" },
    { label: "Outstanding Fees", real: firstMetric(data, ["dashboard", "summary", "dues"], ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees"]), demo: DEMO.kpis.dues, icon: AlertCircle, tone: "amber", type: "currency" },
    { label: "Upcoming Exams", real: firstMetric(data, ["dashboard", "summary", "exams"], ["upcomingExams", "upcomingExaminations", "examinationCount"]) ?? (rows(data.exams).length || undefined), demo: DEMO.kpis.exams, icon: CalendarClock, tone: "violet" },
    { label: "Pass Percentage", real: firstMetric(data, ["dashboard", "summary", "pass"], ["passPercentage", "passRate", "percentage"]), demo: DEMO.kpis.pass, icon: BookOpen, tone: "green", type: "percent" },
  ].map((item) => ({ ...item, value: item.real ?? item.demo, isDemo: item.real === undefined })), [data]);

  const admissionTrend = rows(data.admissions, ["monthlyAdmissions", "MonthlyAdmissions", "trend", "Trend"]).map((item) => ({ period: label(item), admissions: number(item, "admissions", "Admissions", "admissionCount", "AdmissionCount", "confirmed", "Confirmed", "count", "Count"), applications: number(item, "applications", "Applications", "applicationsReceived", "ApplicationsReceived"), cancelled: number(item, "cancelled", "Cancelled", "cancelledAdmissions", "CancelledAdmissions") })).filter((item) => item.period && Object.values(item).some((value) => typeof value === "number"));
  const groupDistribution = normalizeGroups(data);
  const attendanceTrend = rows(data.attendance, ["attendanceTrend", "AttendanceTrend", "trend", "Trend"]).map((item) => ({ period: label(item), attendance: number(item, "attendancePercentage", "AttendancePercentage", "attendance", "Attendance", "percentage", "Percentage"), present: number(item, "presentPercentage", "PresentPercentage", "present", "Present"), absent: number(item, "absentPercentage", "AbsentPercentage", "absent", "Absent") })).filter((item) => item.period);
  const feeRows = rows(data.fees, ["monthlyCollection", "MonthlyCollection", "trend", "Trend"]);
  const dueRows = rows(data.dues, ["monthlyOutstanding", "MonthlyOutstanding", "trend", "Trend"]);
  const feeTrend = [...new Set([...feeRows.map(label), ...dueRows.map(label)].filter(Boolean))].map((period) => ({ period, collected: number(feeRows.find((item) => label(item) === period), "collected", "Collected", "collectedAmount", "CollectedAmount", "amount", "Amount"), due: number(dueRows.find((item) => label(item) === period), "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "due", "Due", "amount", "Amount") }));
  const recentAdmissions = rows(data.admissions, ["recentAdmissions", "RecentAdmissions", "admissions", "Admissions"]).map((item, index) => ({ id: read(item, "studentId", "StudentId", "admissionId", "AdmissionId", "id", "Id") ?? index, admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo") ?? "—", name: read(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName") ?? "—", group: read(item, "groupName", "GroupName", "group", "Group") ?? "—", section: read(item, "sectionName", "SectionName", "section", "Section") ?? "—", date: read(item, "admissionDate", "AdmissionDate", "date", "Date"), status: read(item, "status", "Status") ?? "—" })).filter((item) => item.name !== "—").slice(0, 5);
  const exams = rows(data.exams, ["examinations", "Examinations", "upcomingExams", "UpcomingExams"]).map((item, index) => ({ id: read(item, "examinationId", "ExaminationId", "id", "Id") ?? index, subject: read(item, "subjectName", "SubjectName", "subject", "Subject", "examName", "ExamName") ?? "—", date: read(item, "examDate", "ExamDate", "date", "Date"), time: read(item, "startTime", "StartTime", "time", "Time") ?? "—", hall: read(item, "hallName", "HallName", "roomName", "RoomName", "hall", "Hall") ?? "—", invigilator: read(item, "invigilatorName", "InvigilatorName", "facultyName", "FacultyName") ?? "—", status: read(item, "status", "Status") ?? "Scheduled" })).filter((item) => { const date = new Date(item.date); return !item.date || Number.isNaN(date.getTime()) || date >= new Date(); }).slice(0, 5);
  const workload = rows(data.workload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload"]).map((item) => ({ name: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? ""), hours: number(item, "assignedHours", "AssignedHours", "weeklyHours", "WeeklyHours", "hours", "Hours") })).filter((item) => item.name && item.hours !== undefined).slice(0, 8);
  const activities = rows(data.audit, ["auditLogs", "AuditLogs", "logs", "Logs"]).map((item, index) => ({ id: read(item, "auditLogId", "AuditLogId", "id", "Id") ?? index, user: read(item, "userName", "UserName", "performedBy", "PerformedBy", "createdBy", "CreatedBy") ?? "—", action: read(item, "action", "Action", "actionType", "ActionType") ?? "—", module: read(item, "module", "Module", "moduleName", "ModuleName") ?? "—", date: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "dateTime", "DateTime") })).slice(0, 5);
  const facultyAttendance = ["Present", "Absent", "On Leave"].map((name) => ({ name, value: firstMetric(data, ["facultyAttendance"], name === "Present" ? ["presentFaculty", "presentCount", "present"] : name === "Absent" ? ["absentFaculty", "absentCount", "absent"] : ["onLeave", "leaveCount"]) })).filter((item) => item.value !== undefined);
  const displayed = {
    admissions: admissionTrend.length ? admissionTrend : DEMO.admissions, groups: groupDistribution.length ? groupDistribution : DEMO.groups,
    attendance: attendanceTrend.length ? attendanceTrend : DEMO.attendance, facultyAttendance: facultyAttendance.length ? facultyAttendance : DEMO.facultyAttendance,
    fees: feeTrend.length ? feeTrend : DEMO.fees, workload: workload.length ? workload : DEMO.workload,
    recentAdmissions: recentAdmissions.length ? recentAdmissions : DEMO.admissionsRows,
    exams: exams.length ? exams : DEMO.examsRows, activities: activities.length ? activities : DEMO.activities,
  };
  const groupTotal = displayed.groups.reduce((sum, item) => sum + item.value, 0);

  const chart = (content, available) => <div className="dashboard-chart-body">{available ? content : <Empty />}</div>;
  return <DashboardLayout title="Dashboard" subtitle="Live institution-wide academic and operational overview." actions={<div className="dashboard-header-actions"><div className="dashboard-live-meta"><button className={`dashboard-live ${Object.keys(failures).length === DATA_REQUESTS.length ? "is-offline" : ""}`} type="button" onClick={() => loadData()} disabled={refreshing}>{refreshing ? <RefreshCw size={14} className="spin" /> : <Activity size={14} />} {refreshing ? "UPDATING..." : "LIVE"}</button><small>Last Updated: {lastUpdated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdated) : "Not available"}</small></div><Link to="/dashboard/admission" className="cms-btn cms-btn-ghost">New Admission</Link><Link to="/dashboard/reports" className="cms-btn cms-btn-primary"><ArrowUpRight size={16} /> View Reports</Link></div>}>
    {loading ? <div className="cms-card dashboard-loader"><Loader label="Loading live dashboard..." /></div> : <>
      {Object.keys(failures).length ? <div className="dashboard-warning">Some dashboard sources are unavailable. Successfully loaded widgets remain live.</div> : null}
      <div className="dashboard-kpi-grid">{kpis.map(({ label: name, value, icon: Icon, tone, type, isDemo }) => <article className="cms-stat" key={name}><span className={`cms-stat-icon tone-${tone}`}><Icon size={20} /></span><div><div className="cms-stat-label">{name} <DemoBadge show={isDemo} /></div><div className="cms-stat-value">{formatValue(value, type)}</div></div></article>)}</div>
      <div className="dashboard-grid dashboard-grid-3">
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Admissions</h2><DemoBadge show={!admissionTrend.length} /></div>{chart(<ResponsiveContainer width="100%" height="100%"><AreaChart data={displayed.admissions}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Legend /><Area dataKey="admissions" stroke="#1d4ed8" fill="#dbeafe" /><Area dataKey="applications" stroke="#6d28d9" fillOpacity={0} /></AreaChart></ResponsiveContainer>, true)}</section>
        <section className="cms-card dashboard-widget dashboard-group-card"><div className="cms-card-head"><h2>Group Distribution</h2><DemoBadge show={!groupDistribution.length} /></div><div className="dashboard-group-body"><div className="dashboard-group-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={displayed.groups} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2} isAnimationActive={false}>{displayed.groups.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [new Intl.NumberFormat("en-IN").format(value), "Students"]} /></PieChart></ResponsiveContainer><div className="dashboard-group-total"><strong>{new Intl.NumberFormat("en-IN").format(groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-legend">{displayed.groups.map((item, index) => <div key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{new Intl.NumberFormat("en-IN").format(item.value)}</strong><em>{groupTotal > 0 ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0.0%"}</em></div>)}</div></div></section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Student Attendance</h2><DemoBadge show={!attendanceTrend.length} /></div>{chart(<ResponsiveContainer width="100%" height="100%"><AreaChart data={displayed.attendance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Legend /><Area dataKey="attendance" stroke="#0f9d58" fill="#dcfce7" /><Area dataKey="absent" stroke="#ef6675" fillOpacity={0} /></AreaChart></ResponsiveContainer>, true)}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Faculty Attendance</h2><DemoBadge show={!facultyAttendance.length} /></div>{chart(<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={displayed.facultyAttendance} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82}>{displayed.facultyAttendance.map((item, index) => <Cell key={item.name} fill={COLORS[(index + 3) % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>, true)}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Fee Collection vs Due</h2><DemoBadge show={!feeTrend.length} /></div>{chart(<ResponsiveContainer width="100%" height="100%"><BarChart data={displayed.fees}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Legend /><Bar dataKey="collected" fill="#1d4ed8" /><Bar dataKey="due" fill="#cbd5e1" /></BarChart></ResponsiveContainer>, true)}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Faculty Workload</h2><DemoBadge show={!workload.length} /></div>{chart(<ResponsiveContainer width="100%" height="100%"><BarChart data={displayed.workload} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={85} /><Tooltip /><Bar dataKey="hours" fill="#6d28d9" /></BarChart></ResponsiveContainer>, true)}</section>
      </div>
      <div className="dashboard-grid dashboard-grid-2">
        <section className="cms-card"><div className="cms-card-head"><h2>Recent Admissions</h2><span><DemoBadge show={!recentAdmissions.length} /> <Link to="/dashboard/students" className="cms-btn cms-btn-ghost">View all</Link></span></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Admission No.</th><th>Student</th><th>Group</th><th>Section</th><th>Admission Date</th><th>Status</th></tr></thead><tbody>{displayed.recentAdmissions.map((item) => <tr key={item.id}><td className="cms-strong">{item.admissionNo}</td><td>{item.name}</td><td>{item.group}</td><td>{item.section}</td><td>{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—"}</td><td><StatusBadge value={item.status} /></td></tr>)}</tbody></table></div></section>
        <section className="cms-card"><div className="cms-card-head"><h2><CalendarClock size={15} /> Upcoming Examinations</h2><span><DemoBadge show={!exams.length} /> <Link to="/dashboard/examinations" className="cms-btn cms-btn-ghost">Manage</Link></span></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Invigilator</th><th>Status</th></tr></thead><tbody>{displayed.exams.map((item) => <tr key={item.id}><td className="cms-strong">{item.subject}</td><td>{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—"}</td><td>{item.time}</td><td>{item.hall}</td><td>{item.invigilator}</td><td><StatusBadge value={item.status} /></td></tr>)}</tbody></table></div></section>
        <section className="cms-card"><div className="cms-card-head"><h2>Recent Activity</h2><span><DemoBadge show={!activities.length} /> <Link to="/dashboard/reports" className="cms-btn cms-btn-ghost">View Audit Logs</Link></span></div><div className="dashboard-activity">{displayed.activities.map((item) => <div key={item.id}><span className="dashboard-activity-icon"><Activity size={15} /></span><p><strong>{item.user}</strong> {item.action} · {item.module}<small>{item.date ? new Date(item.date).toLocaleString("en-IN") : "—"}</small></p></div>)}</div></section>
      </div>
    </>}
  </DashboardLayout>;
}
