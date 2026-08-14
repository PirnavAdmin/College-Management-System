import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Activity,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Eye,
  Search,
  ShieldCheck,
  ShieldX,
  Percent,
  Printer,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import "./ReportsAnalyticsPage.css";

const EMPTY_REPORTS = {
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
};

const module18ReportsApi = {
  filters: {
    boards: "/api/module18-reports/filters/boards",
    years: "/api/module18-reports/filters/academic-years",
    levels: "/api/module18-reports/filters/academic-levels",
    groups: "/api/module18-reports/filters/groups",
    sections: "/api/module18-reports/filters/sections",
  },
  auditLogs: "/api/module18-reports/audit-logs",
  generate: (reportType) => `/api/module18-reports/generate/${encodeURIComponent(reportType)}`,
  print: (reportType) => `/api/module18-reports/print/${encodeURIComponent(reportType)}`,
};

const reportRequests = [
  { key: "admissions", endpoint: "/api/module18-reports/details/admissions", casing: "lower" },
  { key: "attendance", endpoint: "/api/module18-reports/details/attendance", casing: "lower" },
  { key: "feeCollection", endpoint: "/api/module18-reports/details/fee-collection", casing: "lower" },
  { key: "feeOutstanding", endpoint: "/api/module18-reports/details/due-fees", casing: "lower", omitDates: true },
  { key: "examinations", endpoint: "/api/module18-reports/details/examinations", casing: "lower", omitSection: true },
  { key: "results", endpoint: "/api/module18-reports/details/results", casing: "lower", omitSection: true },
  { key: "facultyWorkload", endpoint: "/api/module18-reports/details/faculty-workload", casing: "upper" },
  { key: "studentStrength", endpoint: "/api/module18-reports/details/student-strength", casing: "lower", omitDates: true },
  { key: "passPercentage", endpoint: "/api/module18-reports/details/pass-percentage", casing: "upper" },
  { key: "toppers", endpoint: "/api/module18-reports/details/toppers", casing: "upper" },
];

const AUDIT_PAGE_SIZES = [10, 25, 50, 100];
const AUDIT_SEARCH_SAMPLES = ["Super Admin", "Student Management", "Login", "Export", "Success", "STU-1001"];

const summaryCardConfig = [
  { key: "admissions", sourceKey: "admissions", reportType: "admissions", label: "Admissions", icon: GraduationCap, tone: "blue" },
  { key: "attendance", sourceKey: "attendance", reportType: "attendance", label: "Attendance", icon: CalendarCheck, tone: "green", suffix: "%" },
  { key: "feeCollection", sourceKey: "feeCollection", reportType: "fee-collection", label: "Fee Collection", icon: WalletCards, tone: "violet", currency: true },
  { key: "dueFees", sourceKey: "feeOutstanding", reportType: "due-fees", label: "Due Fees", icon: AlertCircle, tone: "amber", currency: true },
  { key: "examinations", sourceKey: "examinations", reportType: "examinations", label: "Examinations", icon: FileSpreadsheet, tone: "blue" },
  { key: "results", sourceKey: "results", reportType: "results", label: "Results Published", icon: Award, tone: "green" },
  { key: "facultyWorkload", sourceKey: "facultyWorkload", reportType: "faculty-workload", label: "Faculty Workload", icon: BriefcaseBusiness, tone: "violet", suffix: " hrs/wk" },
  { key: "studentStrength", sourceKey: "studentStrength", reportType: "student-strength", label: "Student Strength", icon: Users, tone: "blue" },
  { key: "passPercentage", sourceKey: "passPercentage", reportType: "pass-percentage", label: "Pass Percentage", icon: Percent, tone: "green", suffix: "%" },
  { key: "toppers", sourceKey: "toppers", reportType: "toppers", label: "Toppers Identified", icon: Trophy, tone: "amber" },
];

const demoReportData = {
  admissions: { value: "128", details: [["Applications", "356"], ["Enrolled", "128"], ["Conversion Rate", "35.96%"]] },
  attendance: { value: "92.4%", details: [["Present Today", "1,248"], ["Absent Today", "103"], ["This Month Avg", "92.4%"]] },
  feeCollection: { value: "₹24.56L", details: [["Collected", "₹24.56L"], ["Pending", "₹8.34L"], ["Collection Rate", "74.65%"]] },
  dueFees: { value: "₹8.34L", details: [["Total Outstanding", "₹8.34L"], ["Overdue (30+ days)", "₹3.2L"], ["Students Due", "412"]] },
  examinations: { value: "12", details: [["Upcoming Exams", "6"], ["Ongoing Exams", "2"], ["Completed Exams", "4"]] },
  results: { value: "85", details: [["Published Results", "85"], ["Pending Results", "12"], ["Pass Count", "1,062"]] },
  facultyWorkload: { value: "128 hrs/wk", details: [["Total Teaching Hrs", "128"], ["Avg Hrs / Faculty", "16"], ["Total Faculty", "32"]] },
  studentStrength: { value: "1,351", details: [["Total Students", "1,351"], ["Male Students", "732"], ["Female Students", "619"]] },
  passPercentage: { value: "89.35%", details: [["Appeared", "1,187"], ["Passed", "1,061"], ["Failed", "126"]] },
  toppers: { value: "18", details: [["University Toppers", "5"], ["Department Toppers", "13"], ["Programs", "6"]] },
};

const DETAIL_LABELS = {
  count: "Records", total: "Total", male: "Male", female: "Female", present: "Present", absent: "Absent",
  workingDays: "Working days", totalStudents: "Students", totalFaculty: "Faculty", totalExaminations: "Examinations",
  totalCollected: "Collected", collectedAmount: "Collected", totalOutstanding: "Outstanding", outstandingAmount: "Outstanding",
  passCount: "Passed", failCount: "Failed", appearedStudents: "Appeared", publishedResults: "Published",
  averageAttendance: "Average attendance", attendancePercentage: "Attendance", averageWorkload: "Average workload",
};

function readableLabel(key) {
  const normalized = String(key).replace(/^[A-Z]/, (letter) => letter.toLowerCase());
  return DETAIL_LABELS[normalized] ?? normalized.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function reportDetails(payload, mainValue, { currency = false } = {}) {
  const node = dataNode(payload);
  const details = [];
  const add = (label, value, format = {}) => {
    if (value === undefined || value === null || value === "" || typeof value === "object") return;
    if (Number(value) === Number(mainValue) && details.length === 0) return;
    const numeric = typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)));
    const display = numeric ? formatMetric(Number(value), format) : String(value);
    if (!details.some((item) => item.label === label && item.value === display)) details.push({ label, value: display });
  };

  if (node && !Array.isArray(node) && typeof node === "object") {
    const queue = [{ value: node, depth: 0 }];
    const visited = new Set();
    while (queue.length && details.length < 3) {
      const current = queue.shift();
      if (!current.value || typeof current.value !== "object" || visited.has(current.value)) continue;
      visited.add(current.value);
      Object.entries(current.value).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const valueFormat = { currency: currency || /amount|fee|collection|outstanding|due|paid/i.test(key), suffix: /percentage|rate/i.test(key) ? "%" : "" };
      if (/id$|date|created|updated|message|status/i.test(lowerKey)) return;
      if (Array.isArray(value)) add(readableLabel(key), value.length);
        else if (value && typeof value === "object" && current.depth < 2) queue.push({ value, depth: current.depth + 1 });
        else add(readableLabel(key), value, valueFormat);
      });
    }
  }

  const rows = collection(payload);
  if (rows.length) add("Records", rows.length);
  return details.slice(0, 3);
}

function dataNode(payload) {
  let node = payload;
  const visited = new Set();
  while (node && typeof node === "object" && !Array.isArray(node) && !visited.has(node)) {
    visited.add(node);
    const wrapped = node.data ?? node.Data ?? node.result ?? node.Result;
    if (wrapped === undefined || wrapped === node) break;
    node = wrapped;
  }
  return node;
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
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [dataNode(payload)];
  const visited = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    visited.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key.toLowerCase())) {
          const numeric = typeof value === "string" ? Number(value.replace(/[₹,%\s]/g, "")) : Number(value);
          if (value !== "" && Number.isFinite(numeric)) return numeric;
        }
      }
    }
    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }
  return undefined;
}

function metricFromSources(sources, keys) {
  for (const source of sources) {
    const value = metric(source, keys);
    if (value !== undefined) return value;
  }
  return undefined;
}

function hasReportData(payload) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node.length > 0;
  if (!node || typeof node !== "object") return node !== undefined && node !== null && node !== "";
  return Object.values(node).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== "";
  });
}

function reportFailureMessage(failures) {
  if (!failures.length) return "";
  const reasons = failures.map(({ reason }) => reason);
  const messages = [...new Set(reasons.map(getApiErrorMessage).filter(Boolean))];
  const statuses = reasons.map((reason) => reason?.response?.status).filter(Boolean);
  const allUnavailable = failures.length === reportRequests.length;
  const affected = failures.map(({ key }) => key.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
  const firstMessage = messages[0] || "Unknown Reports API error.";

  if (reasons.every((reason) => !reason?.response || reason?.message === "Network Error") || messages.some((message) => /backend is not reachable|network error|ngrok.*offline|err_ngrok/i.test(message))) {
    return "Reports API is unreachable. The configured backend server or ngrok tunnel is offline. Start the backend/tunnel and select Retry.";
  }
  if (statuses.includes(401)) return "Your Reports API session is unauthorized or expired. Please sign in again.";
  if (statuses.every((status) => status === 404)) return "The configured backend does not expose the Reports API routes. Verify that the Reports controller is deployed.";
  if (messages.some((message) => /procedure.+does not exist|stored procedure/i.test(message))) {
    return `The backend database is missing a Reports stored procedure. Backend response: ${firstMessage}`;
  }
  if (allUnavailable) return `All Reports API requests failed. Backend response: ${firstMessage}`;
  return `${failures.length} report sections could not be loaded (${affected}). Backend response: ${firstMessage}`;
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

function buildQuery(filters, { casing = "upper", omitDates = false, omitSection = false } = {}) {
  const upper = casing === "upper";
  const mapping = {
    board: upper ? "BoardId" : "boardId",
    year: upper ? "AcademicYearId" : "academicYearId",
    level: upper ? "AcademicLevelId" : "academicLevelId",
    group: upper ? "GroupId" : "groupId",
    section: upper ? "SectionId" : "sectionId",
    from: upper ? "FromDate" : "fromDate",
    to: upper ? "ToDate" : "toDate",
  };
  return Object.entries(mapping).reduce((params, [filterKey, queryKey]) => {
    if (omitDates && ["from", "to"].includes(filterKey)) return params;
    if (omitSection && filterKey === "section") return params;
    const value = filters[filterKey];
    if (value === undefined || value === null || value === "") return params;
    if (["from", "to"].includes(filterKey)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) params[queryKey] = date.toISOString();
      return params;
    }
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) params[queryKey] = id;
    return params;
  }, {});
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

function mapAuditLogs(payload) {
  return collection(payload, ["auditLogs", "AuditLogs", "logs", "Logs"])
    .map((item, index) => ({
      id: read(item, "auditLogId", "AuditLogId", "logId", "LogId", "id", "Id") ?? index,
      timestamp: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "createdDate", "CreatedDate", "dateTime", "DateTime", "auditDate", "AuditDate", "actionDate", "ActionDate"),
      user: String(read(item, "userName", "UserName", "fullName", "FullName", "performedBy", "PerformedBy", "actorName", "ActorName", "createdBy", "CreatedBy", "modifiedBy", "ModifiedBy") ?? "—"),
      role: String(read(item, "roleName", "RoleName", "role", "Role", "userRole", "UserRole") ?? "—"),
      module: String(read(item, "module", "Module", "moduleName", "ModuleName", "entityName", "EntityName", "tableName", "TableName") ?? "—"),
      action: String(read(item, "action", "Action", "actionType", "ActionType", "eventType", "EventType", "operation", "Operation", "activity", "Activity") ?? "—"),
      description: String(read(item, "description", "Description", "details", "Details", "message", "Message", "changes", "Changes") ?? "—"),
      recordId: read(item, "recordId", "RecordId", "entityId", "EntityId", "entityKey", "EntityKey", "referenceId", "ReferenceId", "studentId", "StudentId", "userId", "UserId", "feeId", "FeeId"),
      status: String(read(item, "status", "Status", "result", "Result", "outcome", "Outcome", "isSuccess", "IsSuccess", "success", "Success") ?? "—"),
      previousValue: read(item, "oldValue", "OldValue", "previousValue", "PreviousValue", "beforeValue", "BeforeValue"),
      newValue: read(item, "newValue", "NewValue", "updatedValue", "UpdatedValue", "afterValue", "AfterValue"),
      ipAddress: read(item, "ipAddress", "IpAddress", "IPAddress", "clientIp", "ClientIp"),
      device: read(item, "userAgent", "UserAgent", "device", "Device", "browser", "Browser"),
      raw: item,
    }))
    .filter((item) => [item.timestamp, item.user, item.module, item.action, item.description, item.recordId]
      .some((value) => value !== undefined && value !== null && value !== "" && value !== "—"));
}

function auditStatus(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (["true", "success", "successful", "succeeded", "completed"].includes(normalized)) return "success";
  if (["false", "fail", "failed", "failure", "error"].includes(normalized)) return "failed";
  return normalized;
}

function formatAuditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function displayAuditValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const text = String(value);
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : text;
  } catch {
    return text;
  }
}

function uniqueOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter((value) => value && value !== "—"))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((value) => ({ value, label: value }));
}

function auditOptions(rows, key) {
  return uniqueOptions(rows, key);
}

function formatMetric(value, { currency = false, suffix = "" } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (currency) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 2 }).format(value);
  }
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return `${formatted}${suffix}`;
}

function getDownloadFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/["']/g, ""));
    } catch {
      return encoded.replace(/["']/g, "");
    }
  }
  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || fallback;
}

async function getExportErrorMessage(error) {
  const payload = error?.response?.data;
  if (!(payload instanceof Blob)) return getApiErrorMessage(error);
  try {
    const text = await payload.text();
    const parsed = JSON.parse(text);
    return parsed?.message || parsed?.Message || parsed?.title || "Report export failed.";
  } catch {
    return "Report export failed. Please try again.";
  }
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function printExcelPreview(reportRows) {
  const rows = reportRows.map((card) => `
    <tr>
      <td>${card.label}</td>
      <td>${card.value}</td>
    </tr>
  `).join("");
  const printWindow = window.open("", "reports-excel-print", "width=960,height=720");
  if (!printWindow) throw new Error("The print window was blocked. Allow pop-ups and try again.");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Reports Overview</title>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #172844; font-family: Arial, sans-serif; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          p { margin: 0 0 22px; color: #687791; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { padding: 11px 12px; border: 1px solid #dce5f1; text-align: left; }
          th { background: #f4f7fb; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
          td:last-child { font-weight: 700; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Reports Overview</h1>
        <p>Key institution-wide report metrics</p>
        <table><thead><tr><th>Report Metric</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [filters, setFilters] = useState({});
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [reports, setReports] = useState(EMPTY_REPORTS);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewing, setPreviewing] = useState("");
  const [exportingCards, setExportingCards] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [pdfPreviewLoaded, setPdfPreviewLoaded] = useState(false);
  const [auditFilters, setAuditFilters] = useState({});
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const initialized = useRef(false);

  const loadMasterOptions = useCallback(async () => {
    setMasterLoading(true);
    const results = await Promise.allSettled([
      apiClient.get(module18ReportsApi.filters.boards),
      apiClient.get(module18ReportsApi.filters.years),
    ]);
    setMasterOptions((current) => ({
      ...current,
      boards: (results[0].status === "fulfilled" ? collection(results[0].value.data, ["boards", "Boards"]) : []).map((item) => optionFrom(item, ["boardId", "BoardId", "id", "Id"], ["boardCode", "BoardCode", "boardName", "BoardName", "name", "Name"])).filter(Boolean),
      years: (results[1].status === "fulfilled" ? collection(results[1].value.data, ["academicYears", "AcademicYears", "years", "Years"]) : []).map((item) => optionFrom(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"])).filter(Boolean),
      levels: [], groups: [], sections: [],
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) setToast("Some report filters could not be loaded.");
    setMasterLoading(false);
  }, []);

  const loadReports = useCallback(async (selectedFilters) => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled(reportRequests.map((request) => apiClient.get(request.endpoint, {
      params: buildQuery(selectedFilters, request),
    })));
    const nextReports = { ...EMPTY_REPORTS };
    const failures = [];
    results.forEach((result, index) => {
      const { key } = reportRequests[index];
      if (result.status === "fulfilled") nextReports[key] = result.value.data;
      else failures.push({ key, reason: result.reason });
    });
    setReports(nextReports);
    setAuditPage(1);
    setError(reportFailureMessage(failures));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadMasterOptions();
    loadReports({});
  }, [loadMasterOptions, loadReports]);

  useEffect(() => {
    if (!filters.board) return;
    let active = true;
    setMasterLoading(true);
    apiClient.get(module18ReportsApi.filters.levels, { params: { boardId: Number(filters.board) } })
      .then((response) => {
        if (!active) return;
        const levels = collection(response.data, ["academicLevels", "AcademicLevels", "levels", "Levels"]).map((item) => optionFrom(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name"])).filter(Boolean);
        setMasterOptions((current) => ({ ...current, levels }));
      })
      .catch((requestError) => active && setToast(getApiErrorMessage(requestError)))
      .finally(() => active && setMasterLoading(false));
    return () => { active = false; };
  }, [filters.board]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level) return;
    let active = true;
    setMasterLoading(true);
    apiClient.get(module18ReportsApi.filters.groups, { params: {
      boardId: Number(filters.board), academicYearId: Number(filters.year), academicLevelId: Number(filters.level),
    } }).then((response) => {
      if (!active) return;
      const groups = collection(response.data, ["groups", "Groups"]).map((item) => optionFrom(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"])).filter(Boolean);
      setMasterOptions((current) => ({ ...current, groups }));
    }).catch((requestError) => active && setToast(getApiErrorMessage(requestError)))
      .finally(() => active && setMasterLoading(false));
    return () => { active = false; };
  }, [filters.board, filters.level, filters.year]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group) return;
    let active = true;
    setMasterLoading(true);
    apiClient.get(module18ReportsApi.filters.sections, { params: {
      boardId: Number(filters.board), academicYearId: Number(filters.year), academicLevelId: Number(filters.level), groupId: Number(filters.group),
    } }).then((response) => {
      if (!active) return;
      const sections = collection(response.data, ["sections", "Sections"]).map((item) => optionFrom(item, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"])).filter(Boolean);
      setMasterOptions((current) => ({ ...current, sections }));
    }).catch((requestError) => active && setToast(getApiErrorMessage(requestError)))
      .finally(() => active && setMasterLoading(false));
    return () => { active = false; };
  }, [filters.board, filters.group, filters.level, filters.year]);

  const filterFields = useMemo(() => {
    return [
      { name: "board", label: "Board", type: "select", options: masterOptions.boards },
      { name: "year", label: "Academic Year", type: "select", options: masterOptions.years },
      { name: "level", label: "Academic Level", type: "select", options: masterOptions.levels },
      { name: "group", label: "Group", type: "select", options: masterOptions.groups, disabled: !filters.board || !filters.year || !filters.level },
      { name: "section", label: "Section", type: "select", options: masterOptions.sections, disabled: !filters.group },
      { name: "from", label: "From Date", type: "date" },
      { name: "to", label: "To Date", type: "date" },
    ];
  }, [filters.board, filters.group, filters.level, filters.year, masterOptions]);

  const workloadData = useMemo(() => mapFacultyWorkload(reports.facultyWorkload), [reports.facultyWorkload]);
  const topperRows = useMemo(() => mapToppers(reports.toppers), [reports.toppers]);
  const auditRows = useMemo(() => mapAuditLogs(auditData), [auditData]);
  const auditFilterFields = useMemo(() => [
    { name: "user", label: "User", type: "select", options: auditOptions(auditRows, "user") },
    { name: "role", label: "Role", type: "select", options: auditOptions(auditRows, "role") },
    { name: "module", label: "Module", type: "select", options: auditOptions(auditRows, "module") },
    { name: "action", label: "Action Type", type: "select", options: auditOptions(auditRows, "action") },
    { name: "status", label: "Status", type: "select", options: auditOptions(auditRows, "status") },
  ], [auditRows]);
  const filteredAuditRows = useMemo(() => {
    const search = String(auditFilters.search ?? "").trim().toLowerCase();
    return auditRows.filter((row) => {
      if (["user", "role", "module", "action", "status"].some((key) => auditFilters[key] && row[key] !== auditFilters[key])) return false;
      if (!search) return true;
      return [row.user, row.role, row.module, row.action, row.description, row.recordId]
        .some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [auditFilters, auditRows]);
  const auditPageCount = Math.max(1, Math.ceil(filteredAuditRows.length / auditPageSize));
  const visibleAuditRows = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return filteredAuditRows.slice(start, start + auditPageSize);
  }, [auditPage, auditPageSize, filteredAuditRows]);
  const auditSummary = useMemo(() => {
    const successful = auditRows.filter((row) => auditStatus(row.status) === "success").length;
    const failed = auditRows.filter((row) => auditStatus(row.status) === "failed").length;
    const activeUsers = new Set(auditRows.map((row) => row.user).filter((user) => user && user !== "—")).size;
    return { total: auditRows.length, successful, failed, activeUsers };
  }, [auditRows]);

  const passRate = metric(reports.passPercentage, ["passPercentage", "PassPercentage", "percentage", "Percentage", "passRate", "PassRate"]);
  const summaryValues = useMemo(() => {
    const admissionCount = collection(reports.admissions).length || undefined;
    const examinationCount = collection(reports.examinations).length || undefined;
    const resultCount = collection(reports.results).length || undefined;
    return {
      admissions: metricFromSources([reports.admissions], ["totalAdmissions", "admissionsCount", "total", "count"]) ?? admissionCount,
      attendance: metricFromSources([reports.attendance], ["attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]),
      feeCollection: metricFromSources([reports.feeCollection], ["totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected", "amount"]),
      dueFees: metricFromSources([reports.feeOutstanding], ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees", "dueAmount", "amount"]),
      examinations: metricFromSources([reports.examinations], ["totalExaminations", "examinationCount", "total", "count"]) ?? examinationCount,
      results: metricFromSources([reports.results], ["resultsPublished", "publishedResults", "resultCount", "total", "count"]) ?? resultCount,
      facultyWorkload: metricFromSources([reports.facultyWorkload], ["averageFacultyWorkload", "averageWorkload", "facultyWorkload", "weeklyHours", "hoursPerWeek", "totalTeachingHours"]) ?? (workloadData.length ? workloadData.reduce((sum, item) => sum + item.hours, 0) : undefined),
      studentStrength: metricFromSources([reports.studentStrength], ["totalStudents", "studentStrength", "total", "count"]),
      passPercentage: passRate,
      toppers: metricFromSources([reports.toppers], ["toppersIdentified", "topperCount", "totalToppers", "count"]) ?? (topperRows.length || undefined),
    };
  }, [passRate, reports, topperRows.length, workloadData]);
  const excelPreviewRows = useMemo(() => summaryCardConfig.map((card) => ({
    key: card.key,
    label: card.label,
    value: hasReportData(reports[card.sourceKey])
      ? formatMetric(summaryValues[card.key], { currency: card.currency, suffix: card.suffix })
      : demoReportData[card.key].value,
  })), [reports, summaryValues]);

  const handleFilterChange = (name, value) => {
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "board") {
        Object.assign(next, { level: "", group: "", section: "" });
        setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
      }
      if (name === "year" || name === "level") {
        Object.assign(next, { group: "", section: "" });
        setMasterOptions((options) => ({ ...options, groups: [], sections: [] }));
      }
      if (name === "group") next.section = "";
      if (name === "group") setMasterOptions((options) => ({ ...options, sections: [] }));
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
    setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
    setReports(EMPTY_REPORTS);
    loadReports({});
  };

  const handleAuditFilterChange = (name, value) => {
    setAuditFilters((current) => ({ ...current, [name]: value }));
    setAuditPage(1);
  };

  const resetAuditFilters = () => {
    setAuditFilters({});
    setAuditPage(1);
  };

  const fetchAuditLogs = async () => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      setAuditError("From Date must be earlier than or equal to To Date.");
      return;
    }
    setAuditLoading(true);
    setAuditError("");
    try {
      const response = await apiClient.get(module18ReportsApi.auditLogs, { params: buildQuery(filters) });
      setAuditData(response.data);
      setAuditPage(1);
    } catch (auditRequestError) {
      setAuditData(null);
      setAuditError(getApiErrorMessage(auditRequestError));
    } finally {
      setAuditLoading(false);
    }
  };

  const requestReportFile = async (format, reportType = "dashboard", fallbackBase = "reports-dashboard") => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      throw new Error("From Date must be earlier than or equal to To Date.");
    }
    const isPdf = format === "pdf";
    const endpoint = isPdf ? module18ReportsApi.print(reportType) : module18ReportsApi.generate(reportType);
    const extension = isPdf ? "pdf" : "xlsx";
    const fallbackFilename = `${fallbackBase}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    const response = await apiClient.get(endpoint, {
      params: buildQuery(filters),
      responseType: "blob",
    });
    const contentType = response.headers?.["content-type"] || (isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if (!response.data?.size) throw new Error("The export API returned an empty file.");
    if (contentType.includes("application/json") || contentType.includes("text/")) {
      const text = await response.data.text();
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.Message || parsed?.title || message;
      } catch {
        // Keep the server text when it is not JSON.
      }
      throw new Error(message || "The export API did not return a file.");
    }
    return {
      blob: new Blob([response.data], { type: contentType }),
      filename: getDownloadFilename(response.headers?.["content-disposition"], fallbackFilename),
      contentType,
      format,
    };
  };

  const previewReport = async (format) => {
    setPreviewing(format);
    setPdfPreviewLoaded(false);
    try {
      const file = await requestReportFile(format, "admissions", "admissions-report");
      setPreviewFile({ ...file, url: format === "pdf" ? URL.createObjectURL(file.blob) : "" });
    } catch (previewError) {
      setPreviewFile(null);
      setToast(await getExportErrorMessage(previewError));
    } finally {
      setPreviewing("");
    }
  };

  const exportCardReport = async (card, format) => {
    const requestKey = `${card.key}-${format}`;
    if (exportingCards[requestKey]) return;
    setExportingCards((current) => ({ ...current, [requestKey]: true }));
    try {
      const file = await requestReportFile(format, card.reportType, card.key);
      downloadBlob(file.blob, file.filename);
      setToast(`${card.label} ${format === "pdf" ? "PDF" : "Excel"} downloaded successfully.`);
    } catch (exportError) {
      setToast(await getExportErrorMessage(exportError));
    } finally {
      setExportingCards((current) => {
        const next = { ...current };
        delete next[requestKey];
        return next;
      });
    }
  };

  useEffect(() => () => {
    if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
  }, [previewFile]);

  return (
    <DashboardLayout
      title={activeTab === "reports" ? "Reports & Analytics" : "Audit Logs"}
      subtitle={activeTab === "reports" ? "Institution-wide insights across academics, fees and attendance." : "System activity recorded for the selected report period."}
      breadcrumb={["Administration"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="reports-tabs" role="tablist" aria-label="Reports sections">
        <button className={`reports-tab ${activeTab === "reports" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "reports"} onClick={() => { setActiveTab("reports"); setSelectedAuditLog(null); }}>Reports & Analytics</button>
        <button className={`reports-tab ${activeTab === "audit" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "audit"} onClick={() => { setActiveTab("audit"); setPreviewFile(null); }}>Audit Logs</button>
      </div>
      {activeTab === "reports" ? <>
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

      <>
          {error ? <div className="reports-error-banner" role="alert"><span>{error}</span><button className="cms-btn cms-btn-ghost" type="button" onClick={() => loadReports(filters)} disabled={loading}>Retry</button></div> : null}
          <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
            <div className="reports-summary-panel-head">
              <div><h2 id="reports-summary-title">Reports Overview</h2><p>Key institution-wide report metrics</p></div>
              <div className="reports-summary-actions" aria-label="Report file actions">
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("pdf")} disabled={previewing === "pdf"}><Eye size={14} />{previewing === "pdf" ? "Loading..." : "Preview PDF"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("excel")} disabled={previewing === "excel"}><Eye size={14} />{previewing === "excel" ? "Loading..." : "Preview Excel"}</button>
              </div>
            </div>
            <div className="reports-summary-grid" aria-label="Report summary">
              {summaryCardConfig.map((card) => {
                const { key, sourceKey, label, icon: Icon, tone, currency, suffix } = card;
                const format = { currency, suffix };
                const source = reports[sourceKey];
                const hasLiveData = hasReportData(source);
                const details = hasLiveData
                  ? reportDetails(source, summaryValues[key], format)
                  : demoReportData[key].details.map(([detailLabel, value]) => ({ label: detailLabel, value }));
                const displayValue = hasLiveData ? formatMetric(summaryValues[key], format) : demoReportData[key].value;
                return <article className="reports-summary-card reports-summary-card-expanded" key={key}>
                  <div className="reports-summary-card-head">
                    <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
                    <div className="reports-summary-content"><span>{label}</span><strong>{displayValue}</strong></div>
                  </div>
                  <dl className="reports-summary-details">
                    {details.length ? details.map((detail) => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>) : <div><dt>Details</dt><dd>No additional summary available</dd></div>}
                  </dl>
                  <div className="reports-card-actions">
                    <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportCardReport(card, "pdf")} disabled={Boolean(exportingCards[`${key}-pdf`])}><Download size={13} />{exportingCards[`${key}-pdf`] ? "Exporting..." : "Export PDF"}</button>
                    <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportCardReport(card, "excel")} disabled={Boolean(exportingCards[`${key}-excel`])}><FileSpreadsheet size={13} />{exportingCards[`${key}-excel`] ? "Exporting..." : "Export Excel"}</button>
                  </div>
                </article>;
              })}
            </div>
          </section>
        </>
      </> :
          <section className="reports-audit-section" aria-labelledby="audit-logs-title">
            <div className="reports-chart-head reports-audit-head">
              <div><h2 id="audit-logs-title">Audit Logs</h2><p>System activity recorded for the selected report period</p></div>
            </div>

            <div className="reports-audit-filters">
              <div className="cms-filters">
                {auditFilterFields.map((field) => <Field key={field.name} field={field} value={auditFilters[field.name]} onChange={handleAuditFilterChange} />)}
                <div className="cms-field reports-audit-search-field">
                  <label htmlFor="audit-search">Search</label>
                  <span className="reports-audit-search"><Search size={16} aria-hidden="true" /><input id="audit-search" type="search" list="audit-search-samples" value={auditFilters.search ?? ""} placeholder="User, module, action, record ID..." onChange={(event) => handleAuditFilterChange("search", event.target.value)} /></span>
                  <datalist id="audit-search-samples">{AUDIT_SEARCH_SAMPLES.map((value) => <option key={value} value={value} />)}</datalist>
                </div>
              </div>
              <div className="reports-filter-actions">
                <button className="cms-btn cms-btn-ghost" type="button" onClick={resetAuditFilters} disabled={auditLoading}>Reset Filters</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={fetchAuditLogs} disabled={auditLoading}>{auditLoading ? "Fetching..." : "Fetch Data"}</button>
              </div>
            </div>

            {auditLoading ? <div className="reports-audit-loader"><Loader label="Fetching audit logs..." /></div> : null}
            {auditError ? <div className="reports-error-banner reports-audit-error" role="alert">{auditError}</div> : null}
            {!auditLoading ? <>
            <div className="reports-audit-summary" aria-label="Audit log summary">
              {[
                { label: "Total Activities", value: auditSummary.total, icon: Activity, tone: "blue" },
                { label: "Successful Actions", value: auditSummary.successful, icon: ShieldCheck, tone: "green" },
                { label: "Failed Actions", value: auditSummary.failed, icon: ShieldX, tone: "amber" },
                { label: "Active Users", value: auditSummary.activeUsers, icon: Users, tone: "violet" },
              ].map(({ label, value, icon: Icon, tone }) => (
                <article className="reports-summary-card" key={label}>
                  <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} /></span>
                  <div className="reports-summary-content"><span>{label}</span><strong>{value}</strong></div>
                </article>
              ))}
            </div>
            <div className="reports-table-wrap reports-audit-table-wrap">
              <table className="reports-top-students reports-audit-table">
                <thead><tr><th>Date & Time</th><th>User</th><th>Role</th><th>Module</th><th>Action</th><th>Description</th><th>Record ID</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>{visibleAuditRows.length ? visibleAuditRows.map((log) => {
                  const status = auditStatus(log.status);
                  return <tr key={log.id}>
                    <td>{formatAuditDate(log.timestamp)}</td><td><strong>{log.user}</strong></td><td>{log.role}</td><td>{log.module}</td><td>{log.action}</td>
                    <td className="reports-audit-description" title={log.description}>{log.description}</td><td>{log.recordId ?? "—"}</td>
                    <td><span className={`cms-badge ${status === "success" ? "cms-badge-active" : status === "failed" ? "cms-badge-danger" : "cms-badge-inactive"}`}>{log.status}</span></td>
                    <td><button className="cms-btn cms-btn-ghost reports-view-btn" type="button" onClick={() => setSelectedAuditLog(log)}><Eye size={15} />View</button></td>
                  </tr>;
                }) : <tr><td colSpan={9}><div className="cms-empty">No audit logs available for the selected filters.</div></td></tr>}</tbody>
              </table>
            </div>

            {filteredAuditRows.length ? <div className="cms-pagination reports-audit-pagination">
              <span className="cms-page-info">Showing {(auditPage - 1) * auditPageSize + 1}–{Math.min(auditPage * auditPageSize, filteredAuditRows.length)} of {filteredAuditRows.length}</span>
              <label className="reports-page-size">Rows <select value={auditPageSize} onChange={(event) => { setAuditPageSize(Number(event.target.value)); setAuditPage(1); }}>{AUDIT_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
              <button className="cms-page-btn" type="button" disabled={auditPage === 1} onClick={() => setAuditPage((page) => page - 1)}>Previous</button>
              <span className="reports-page-number">Page {auditPage} of {auditPageCount}</span>
              <button className="cms-page-btn" type="button" disabled={auditPage === auditPageCount} onClick={() => setAuditPage((page) => page + 1)}>Next</button>
            </div> : null}
            </> : null}
          </section>
      }
      {previewFile?.format === "pdf" ? <Modal title="PDF Preview" onClose={() => setPreviewFile(null)} footer={<>
        {pdfPreviewLoaded ? <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download PDF</button> : null}
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-pdf-preview"><iframe src={previewFile.url} title="Generated report PDF preview" onLoad={() => setPdfPreviewLoaded(true)} /></div>
      </Modal> : null}
      {previewFile?.format === "excel" ? <Modal title="Excel Preview" onClose={() => setPreviewFile(null)} footer={<>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => { try { printExcelPreview(excelPreviewRows); } catch (printError) { setToast(printError.message); } }}><Printer size={15} />Print Excel</button>
        <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download Excel</button>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-excel-preview"><table className="reports-top-students"><thead><tr><th>Report Metric</th><th>Value</th></tr></thead><tbody>
          {excelPreviewRows.map(({ key, label, value }) => <tr key={key}><td><strong>{label}</strong></td><td>{value}</td></tr>)}
        </tbody></table></div>
      </Modal> : null}
      {selectedAuditLog ? <Modal title="Audit Log Details" onClose={() => setSelectedAuditLog(null)} footer={<button className="cms-btn cms-btn-primary" type="button" onClick={() => setSelectedAuditLog(null)}>Close</button>}>
        <dl className="reports-audit-details">
          {[
            ["Date & Time", formatAuditDate(selectedAuditLog.timestamp)], ["User", selectedAuditLog.user], ["Role", selectedAuditLog.role],
            ["Module", selectedAuditLog.module], ["Action", selectedAuditLog.action], ["Description", selectedAuditLog.description],
            ["Record ID / Entity", selectedAuditLog.recordId], ["Status", selectedAuditLog.status], ["IP Address", selectedAuditLog.ipAddress],
            ["Device / Browser", selectedAuditLog.device], ["Previous Value", selectedAuditLog.previousValue], ["New Value", selectedAuditLog.newValue],
          ].filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => <div className={label.includes("Value") || label === "Description" || label === "Device / Browser" ? "full" : ""} key={label}><dt>{label}</dt><dd>{label.includes("Value") ? <pre>{displayAuditValue(value)}</pre> : displayAuditValue(value)}</dd></div>)}
        </dl>
      </Modal> : null}
    </DashboardLayout>
  );
}
