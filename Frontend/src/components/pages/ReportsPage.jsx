import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  FileSpreadsheet,
  GraduationCap,
  Percent,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import "./ReportsAnalyticsPage.css";

const EMPTY_REPORTS = {
  dashboard: {},
  summary: {},
  admissions: {},
  studentStrength: {},
  attendance: {},
  feeCollection: {},
  feeOutstanding: {},
  examinations: {},
  results: {},
  passPercentage: {},
  toppers: {},
  facultyWorkload: {},
  studentPerformance: {},
};

const reportRequests = [
  ["dashboard", apiEndpoints.reports.dashboard],
  ["summary", apiEndpoints.reports.summary],
  ["admissions", apiEndpoints.reports.admissions],
  ["studentStrength", apiEndpoints.reports.studentStrength],
  ["attendance", apiEndpoints.reports.attendance],
  ["feeCollection", apiEndpoints.reports.feeCollection],
  ["feeOutstanding", apiEndpoints.reports.feeOutstanding],
  ["examinations", apiEndpoints.reports.examinations],
  ["results", apiEndpoints.reports.results],
  ["passPercentage", apiEndpoints.reports.passPercentage],
  ["toppers", apiEndpoints.reports.toppers],
  ["facultyWorkload", apiEndpoints.reports.facultyWorkload],
  ["studentPerformance", apiEndpoints.reports.studentPerformance],
];

const summaryCardConfig = [
  { key: "admissions", label: "Admissions", icon: GraduationCap, tone: "blue" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck, tone: "green", suffix: "%" },
  { key: "feeCollection", label: "Fee Collection", icon: WalletCards, tone: "violet", currency: true },
  { key: "dueFees", label: "Due Fees", icon: AlertCircle, tone: "amber", currency: true },
  { key: "examinations", label: "Examinations", icon: FileSpreadsheet, tone: "blue" },
  { key: "results", label: "Results Published", icon: Award, tone: "green" },
  { key: "facultyWorkload", label: "Faculty Workload", icon: BriefcaseBusiness, tone: "violet", suffix: " hrs/wk" },
  { key: "studentStrength", label: "Student Strength", icon: Users, tone: "blue" },
  { key: "passPercentage", label: "Pass Percentage", icon: Percent, tone: "green", suffix: "%" },
  { key: "toppers", label: "Toppers Identified", icon: Trophy, tone: "amber" },
];

const chartMargin = { top: 8, right: 10, left: -14, bottom: 0 };

function dataNode(payload) {
  return payload?.data ?? payload?.Data ?? payload?.result ?? payload?.Result ?? payload;
}

function collection(payload, preferredKeys = []) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node;
  for (const key of preferredKeys) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  for (const key of ["items", "Items", "results", "Results", "records", "Records", "$values"]) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  return [];
}

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function numberValue(item, ...keys) {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function metric(payload, keys) {
  return numberValue(dataNode(payload), ...keys);
}

function optionFrom(item, idKeys, labelKeys, metadata = {}) {
  const value = read(item, ...idKeys);
  if (value === undefined || value === null || value === "") return null;
  return {
    value: String(value),
    label: String(read(item, ...labelKeys) ?? value),
    ...Object.fromEntries(Object.entries(metadata).map(([key, keys]) => [key, read(item, ...keys)])),
  };
}

function buildQuery(filters) {
  const mapping = {
    board: "BoardId",
    year: "AcademicYearId",
    level: "AcademicLevelId",
    group: "GroupId",
    section: "SectionId",
    from: "FromDate",
    to: "ToDate",
  };
  return Object.entries(mapping).reduce((params, [filterKey, queryKey]) => {
    const value = filters[filterKey];
    if (value === undefined || value === null || value === "") return params;
    params[queryKey] = ["from", "to"].includes(filterKey) ? new Date(value).toISOString() : Number(value);
    return params;
  }, {});
}

function labelFor(item) {
  const value = read(item, "label", "Label", "month", "Month", "period", "Period", "date", "Date", "name", "Name");
  return value === undefined ? "" : String(value).slice(0, 10);
}

function mapAdmissions(payload) {
  return collection(payload, ["monthlyAdmissions", "MonthlyAdmissions", "trend", "Trend", "admissions", "Admissions"])
    .map((item) => ({
      month: labelFor(item),
      admissions: numberValue(item, "admissions", "Admissions", "admissionCount", "AdmissionCount", "count", "Count", "actual", "Actual"),
      target: numberValue(item, "target", "Target", "targetAdmissions", "TargetAdmissions"),
    }))
    .filter((item) => item.month && item.admissions !== undefined);
}

function mapAttendance(payload) {
  return collection(payload, ["attendanceTrend", "AttendanceTrend", "trend", "Trend", "attendance", "Attendance"])
    .map((item) => ({
      month: labelFor(item),
      attendance: numberValue(item, "attendancePercentage", "AttendancePercentage", "percentage", "Percentage", "rate", "Rate", "attendance", "Attendance"),
    }))
    .filter((item) => item.month && item.attendance !== undefined);
}

function mapStudentStrength(payload) {
  return collection(payload, ["studentStrength", "StudentStrength", "classWise", "ClassWise", "groups", "Groups", "sections", "Sections"])
    .map((item) => ({
      className: String(read(item, "className", "ClassName", "groupName", "GroupName", "sectionName", "SectionName", "label", "Label") ?? ""),
      students: numberValue(item, "studentCount", "StudentCount", "totalStudents", "TotalStudents", "strength", "Strength", "count", "Count"),
    }))
    .filter((item) => item.className && item.students !== undefined);
}

function mapFees(collectionPayload, outstandingPayload) {
  const collectedRows = collection(collectionPayload, ["monthlyCollection", "MonthlyCollection", "collectionTrend", "CollectionTrend", "fees", "Fees"]);
  const dueRows = collection(outstandingPayload, ["monthlyOutstanding", "MonthlyOutstanding", "outstandingTrend", "OutstandingTrend", "fees", "Fees"]);
  const rows = new Map();
  collectedRows.forEach((item) => {
    const month = labelFor(item);
    if (!month) return;
    rows.set(month, {
      month,
      collected: numberValue(item, "collected", "Collected", "collectedAmount", "CollectedAmount", "amount", "Amount"),
      due: numberValue(item, "due", "Due", "dueAmount", "DueAmount", "outstandingAmount", "OutstandingAmount"),
    });
  });
  dueRows.forEach((item) => {
    const month = labelFor(item);
    if (!month) return;
    const current = rows.get(month) ?? { month };
    current.due = numberValue(item, "due", "Due", "dueAmount", "DueAmount", "outstandingAmount", "OutstandingAmount", "amount", "Amount");
    rows.set(month, current);
  });
  return [...rows.values()].filter((item) => item.collected !== undefined || item.due !== undefined);
}

function mapFacultyWorkload(payload) {
  return collection(payload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload", "faculty", "Faculty"])
    .map((item) => ({
      faculty: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? ""),
      hours: numberValue(item, "weeklyHours", "WeeklyHours", "hoursPerWeek", "HoursPerWeek", "workloadHours", "WorkloadHours", "hours", "Hours"),
    }))
    .filter((item) => item.faculty && item.hours !== undefined);
}

function mapToppers(payload) {
  return collection(payload, ["toppers", "Toppers", "students", "Students", "items", "Items"])
    .map((item, index) => ({
      id: read(item, "studentId", "StudentId", "id", "Id") ?? index,
      rank: numberValue(item, "rank", "Rank") ?? index + 1,
      name: String(read(item, "studentName", "StudentName", "name", "Name") ?? "—"),
      roll: String(read(item, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? "—"),
      group: String(read(item, "groupName", "GroupName", "className", "ClassName") ?? "—"),
      level: String(read(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel") ?? ""),
      percentage: numberValue(item, "percentage", "Percentage", "score", "Score", "overallPercentage", "OverallPercentage"),
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);
}

function formatMetric(value, { currency = false, suffix = "" } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (currency) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 2 }).format(value);
  }
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return `${formatted}${suffix}`;
}

function EmptyChart() {
  return <div className="reports-empty">No data available for the selected filters.</div>;
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`reports-chart-card ${className}`}>
      <div className="reports-chart-head">
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
      <div className="reports-chart-body">{children}</div>
    </section>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({});
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [reports, setReports] = useState(EMPTY_REPORTS);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const initialized = useRef(false);

  const loadMasterOptions = useCallback(async () => {
    setMasterLoading(true);
    const results = await Promise.allSettled([
      apiClient.get(apiEndpoints.boards.getAll),
      apiClient.get(apiEndpoints.academicYears.getAll),
      apiClient.get(apiEndpoints.boards.getAcademicLevels),
      apiClient.get(apiEndpoints.groups.getAll),
      apiClient.get(apiEndpoints.sections.getAll),
    ]);
    const getRows = (index) => results[index].status === "fulfilled" ? collection(results[index].value.data) : [];
    setMasterOptions({
      boards: getRows(0).map((item) => optionFrom(item, ["boardId", "BoardId", "id", "Id"], ["boardCode", "BoardCode", "boardName", "BoardName", "name", "Name"])).filter(Boolean),
      years: getRows(1).map((item) => optionFrom(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"])).filter(Boolean),
      levels: getRows(2).map((item) => optionFrom(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "name", "Name"])).filter(Boolean),
      groups: getRows(3).map((item) => optionFrom(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"], { boardId: ["boardId", "BoardId"], levelId: ["academicLevelId", "AcademicLevelId"] })).filter(Boolean),
      sections: getRows(4).map((item) => optionFrom(item, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"], { groupId: ["groupId", "GroupId"] })).filter(Boolean),
    });
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) setToast("Some report filters could not be loaded.");
    setMasterLoading(false);
  }, []);

  const loadReports = useCallback(async (selectedFilters) => {
    setLoading(true);
    setError("");
    const params = buildQuery(selectedFilters);
    const results = await Promise.allSettled(reportRequests.map(([, endpoint]) => apiClient.get(endpoint, { params })));
    const nextReports = { ...EMPTY_REPORTS };
    const failures = [];
    results.forEach((result, index) => {
      const [key] = reportRequests[index];
      if (result.status === "fulfilled") nextReports[key] = result.value.data;
      else failures.push(result.reason);
    });
    setReports(nextReports);
    if (failures.length) {
      const unavailable = failures.length === reportRequests.length;
      setError(unavailable ? getApiErrorMessage(failures[0]) : `${failures.length} report sections could not be loaded. Available sections are shown below.`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadMasterOptions();
    loadReports({});
  }, [loadMasterOptions, loadReports]);

  const filterFields = useMemo(() => {
    const groups = masterOptions.groups.filter((option) => (
      (!filters.board || !option.boardId || String(option.boardId) === filters.board)
      && (!filters.level || !option.levelId || String(option.levelId) === filters.level)
    ));
    const sections = masterOptions.sections.filter((option) => !filters.group || !option.groupId || String(option.groupId) === filters.group);
    return [
      { name: "board", label: "Board", type: "select", options: masterOptions.boards },
      { name: "year", label: "Academic Year", type: "select", options: masterOptions.years },
      { name: "level", label: "Academic Level", type: "select", options: masterOptions.levels },
      { name: "group", label: "Group", type: "select", options: groups },
      { name: "section", label: "Section", type: "select", options: sections },
      { name: "from", label: "From Date", type: "date" },
      { name: "to", label: "To Date", type: "date" },
    ];
  }, [filters.board, filters.group, filters.level, masterOptions]);

  const admissionsData = useMemo(() => mapAdmissions(reports.admissions), [reports.admissions]);
  const attendanceData = useMemo(() => mapAttendance(reports.attendance), [reports.attendance]);
  const strengthData = useMemo(() => mapStudentStrength(reports.studentStrength), [reports.studentStrength]);
  const feeData = useMemo(() => mapFees(reports.feeCollection, reports.feeOutstanding), [reports.feeCollection, reports.feeOutstanding]);
  const workloadData = useMemo(() => mapFacultyWorkload(reports.facultyWorkload), [reports.facultyWorkload]);
  const topperRows = useMemo(() => mapToppers(reports.toppers), [reports.toppers]);

  const passRate = metric(reports.passPercentage, ["passPercentage", "PassPercentage", "percentage", "Percentage", "passRate", "PassRate"]);
  const failRate = metric(reports.passPercentage, ["failPercentage", "FailPercentage", "failRate", "FailRate"]);
  const resultBreakdown = passRate === undefined
    ? []
    : [
        { name: "Pass", value: passRate, color: "#16a36a" },
        { name: "Fail", value: failRate ?? Math.max(0, 100 - passRate), color: "#ef6675" },
      ];

  const summaryValues = useMemo(() => {
    const dashboard = reports.dashboard;
    const summary = reports.summary;
    const admissionCount = collection(reports.admissions).length || undefined;
    const examinationCount = collection(reports.examinations).length || undefined;
    const resultCount = collection(reports.results).length || undefined;
    return {
      admissions: metric(summary, ["totalAdmissions", "TotalAdmissions", "admissionsCount", "AdmissionsCount"]) ?? metric(dashboard, ["totalAdmissions", "TotalAdmissions"]) ?? admissionCount,
      attendance: metric(summary, ["attendancePercentage", "AttendancePercentage", "averageAttendance", "AverageAttendance"]) ?? metric(dashboard, ["attendancePercentage", "AttendancePercentage"]) ?? metric(reports.attendance, ["attendancePercentage", "AttendancePercentage", "averageAttendance", "AverageAttendance"]),
      feeCollection: metric(summary, ["feeCollected", "FeeCollected", "totalFeeCollected", "TotalFeeCollected"]) ?? metric(dashboard, ["feeCollected", "FeeCollected"]) ?? metric(reports.feeCollection, ["totalCollected", "TotalCollected", "collectedAmount", "CollectedAmount"]),
      dueFees: metric(summary, ["dueFees", "DueFees", "outstandingFees", "OutstandingFees"]) ?? metric(dashboard, ["dueFees", "DueFees"]) ?? metric(reports.feeOutstanding, ["totalOutstanding", "TotalOutstanding", "outstandingAmount", "OutstandingAmount"]),
      examinations: metric(summary, ["totalExaminations", "TotalExaminations", "examinationCount", "ExaminationCount"]) ?? metric(dashboard, ["totalExaminations", "TotalExaminations"]) ?? examinationCount,
      results: metric(summary, ["resultsPublished", "ResultsPublished", "publishedResults", "PublishedResults"]) ?? metric(dashboard, ["resultsPublished", "ResultsPublished"]) ?? resultCount,
      facultyWorkload: metric(summary, ["facultyWorkload", "FacultyWorkload", "averageFacultyWorkload", "AverageFacultyWorkload"]) ?? metric(dashboard, ["facultyWorkload", "FacultyWorkload"]) ?? (workloadData.length ? workloadData.reduce((sum, item) => sum + item.hours, 0) / workloadData.length : undefined),
      studentStrength: metric(summary, ["studentStrength", "StudentStrength", "totalStudents", "TotalStudents"]) ?? metric(dashboard, ["studentStrength", "StudentStrength", "totalStudents", "TotalStudents"]) ?? metric(reports.studentStrength, ["totalStudents", "TotalStudents", "studentStrength", "StudentStrength"]),
      passPercentage: passRate ?? metric(summary, ["passPercentage", "PassPercentage"]) ?? metric(dashboard, ["passPercentage", "PassPercentage"]),
      toppers: metric(summary, ["toppersIdentified", "ToppersIdentified", "topperCount", "TopperCount"]) ?? metric(dashboard, ["toppersIdentified", "ToppersIdentified"]) ?? (topperRows.length || undefined),
    };
  }, [passRate, reports, topperRows.length, workloadData]);

  const handleFilterChange = (name, value) => {
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "board") Object.assign(next, { level: "", group: "", section: "" });
      if (name === "level") Object.assign(next, { group: "", section: "" });
      if (name === "group") next.section = "";
      return next;
    });
  };

  const generateReport = () => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      setToast("From Date must be earlier than or equal to To Date.");
      return;
    }
    loadReports(filters);
  };

  const resetReports = () => {
    setFilters({});
    loadReports({});
  };

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Institution-wide insights across academics, fees and attendance." breadcrumb={["Administration"]}>
      <Toast message={toast} onClose={() => setToast("")} />
      <section className="cms-card reports-filter-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((field) => <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />)}
          </div>
          <div className="reports-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={generateReport} disabled={loading || masterLoading}>Generate Report</button>
            <button className="cms-btn cms-btn-ghost" onClick={resetReports} disabled={loading}>Reset</button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="cms-card reports-loader"><Loader label="Loading report analytics..." /></div>
      ) : (
        <>
          {error ? <div className="reports-error-banner" role="alert">{error}</div> : null}
          <div className="reports-summary-grid" aria-label="Report summary">
            {summaryCardConfig.map(({ key, label, icon: Icon, tone, ...format }) => (
              <article className="reports-summary-card" key={key}>
                <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
                <div className="reports-summary-content"><span>{label}</span><strong>{formatMetric(summaryValues[key], format)}</strong></div>
              </article>
            ))}
          </div>

          <div className="reports-analytics-grid">
            <ChartCard title="Admissions vs Target" subtitle="Monthly admissions performance against planned intake">
              {admissionsData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={admissionsData} margin={chartMargin}>
                <defs><linearGradient id="admissionsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#315ee8" stopOpacity={0.3} /><stop offset="95%" stopColor="#315ee8" stopOpacity={0.03} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Area type="monotone" dataKey="admissions" stroke="#315ee8" strokeWidth={3} fill="url(#admissionsFill)" activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="target" stroke="#8b9ab6" strokeWidth={2} fill="transparent" strokeDasharray="6 5" />
              </AreaChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Attendance Trend (%)" subtitle="Average monthly student attendance">
              {attendanceData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={attendanceData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                <Line type="monotone" dataKey="attendance" stroke="#16a36a" strokeWidth={3} dot={{ r: 4, fill: "#ffffff", strokeWidth: 3 }} activeDot={{ r: 6 }} />
              </LineChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Fee Collected vs Due" subtitle="Monthly fee amounts">
              {feeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={feeData} margin={chartMargin} barGap={6}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => formatMetric(value, { currency: true })} /><Legend />
                <Bar dataKey="collected" fill="#315ee8" radius={[7, 7, 0, 0]} /><Bar dataKey="due" fill="#f3b94f" radius={[7, 7, 0, 0]} />
              </BarChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Student Strength by Class" subtitle="Current enrolled students across classes">
              {strengthData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={strengthData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="className" /><YAxis /><Tooltip />
                <Bar dataKey="students" name="Students" fill="#7567e8" radius={[7, 7, 0, 0]} maxBarSize={48} />
              </BarChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Monthly Admissions Trend" subtitle="New admissions recorded each month">
              {admissionsData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={admissionsData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#e1793f" strokeWidth={3} dot={{ r: 4, fill: "#ffffff", strokeWidth: 3 }} activeDot={{ r: 6 }} />
              </LineChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Pass vs Fail Percentage" subtitle="Overall examination result distribution" className="reports-result-card">
              {resultBreakdown.length ? <div className="reports-donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart>
                <Pie data={resultBreakdown} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="80%" paddingAngle={4} stroke="none">{resultBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie>
                <Tooltip formatter={(value) => [`${value}%`]} /><Legend verticalAlign="bottom" iconType="circle" />
              </PieChart></ResponsiveContainer><div className="reports-donut-label"><strong>{formatMetric(passRate, { suffix: "%" })}</strong><span>Pass rate</span></div></div> : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Faculty Workload Overview" subtitle="Assigned teaching hours per week">
              {workloadData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={workloadData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="faculty" /><YAxis /><Tooltip formatter={(value) => [`${value} hrs`, "Weekly workload"]} />
                <Bar dataKey="hours" name="Hours / week" fill="#21a7a1" radius={[7, 7, 0, 0]} maxBarSize={48} />
              </BarChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>

            <section className="reports-chart-card reports-table-card">
              <div className="reports-chart-head"><div><h2>Top Performing Students</h2><p>Highest overall academic percentages</p></div></div>
              <div className="reports-table-wrap"><table className="reports-top-students"><thead><tr><th>Rank</th><th>Student</th><th>Roll No.</th><th>Class</th><th>Score</th></tr></thead>
                <tbody>{topperRows.length ? topperRows.map((student) => <tr key={student.id}>
                  <td><span className={`reports-rank rank-${student.rank}`}>{student.rank}</span></td><td><strong>{student.name}</strong></td><td>{student.roll}</td><td>{student.group}{student.level ? ` · ${student.level}` : ""}</td><td><span className="reports-score">{formatMetric(student.percentage, { suffix: "%" })}</span></td>
                </tr>) : <tr><td colSpan={5}><div className="cms-empty">No top-performing student data available.</div></td></tr>}</tbody>
              </table></div>
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
