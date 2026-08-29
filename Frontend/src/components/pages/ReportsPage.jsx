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

const EMPTY_REPORTS = {
  dashboard: {},
  overview: {},
  admissions: {},
  studentStrength: {},
  attendance: {},
  staffAttendance: {},
  facultyAttendance: {},
  feeCollection: {},
  feeOutstanding: {},
  examinations: {},
  results: {},
  passPercentage: {},
  toppers: {},
  staffWorkload: {},
  facultyWorkload: {},
};

const REPORTS_API_VERSION = "1.0";
const OVERVIEW_REPORT_TYPE = "dashboard";

const REPORTS_API = {
  filters: {
    boards: "/api/reports/filters/boards",
    academicYears: "/api/reports/filters/academic-years",
    academicLevels: "/api/reports/filters/academic-levels",
    groups: "/api/reports/filters/groups",
    sections: "/api/reports/filters/sections",
  },
  dashboard: "/api/reports/dashboard",
  overview: "/api/reports/overview",
  details: {
    admissions: "/api/reports/details/admissions",
    attendance: "/api/reports/details/attendance",
    staffAttendance: "/api/reports/details/staff-attendance",
    facultyAttendance: "/api/reports/details/faculty-attendance",
    feeCollection: "/api/reports/details/fee-collection",
    dueFees: "/api/reports/details/due-fees",
    examinations: "/api/reports/details/examinations",
    results: "/api/reports/details/results",
    staffWorkload: "/api/reports/details/staff-workload",
    facultyWorkload: "/api/reports/details/faculty-workload",
    studentStrength: "/api/reports/details/student-strength",
    passPercentage: "/api/reports/details/pass-percentage",
    toppers: "/api/reports/details/toppers",
    auditLogs: "/api/reports/details/audit-logs",
  },
  exportPdf: "/api/reports/export/pdf",
  exportExcel: "/api/reports/export/excel",
};

const REPORT_REQUESTS = [
  { key: "admissions", endpoint: REPORTS_API.details.admissions },
  { key: "attendance", endpoint: REPORTS_API.details.attendance },
  { key: "staffAttendance", endpoint: REPORTS_API.details.staffAttendance },
  { key: "facultyAttendance", endpoint: REPORTS_API.details.facultyAttendance },
  { key: "feeCollection", endpoint: REPORTS_API.details.feeCollection },
  { key: "feeOutstanding", endpoint: REPORTS_API.details.dueFees },
  { key: "examinations", endpoint: REPORTS_API.details.examinations },
  { key: "results", endpoint: REPORTS_API.details.results },
  { key: "staffWorkload", endpoint: REPORTS_API.details.staffWorkload },
  { key: "facultyWorkload", endpoint: REPORTS_API.details.facultyWorkload },
  { key: "studentStrength", endpoint: REPORTS_API.details.studentStrength },
  { key: "passPercentage", endpoint: REPORTS_API.details.passPercentage },
  { key: "toppers", endpoint: REPORTS_API.details.toppers },
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

function activeOption(item) {
  const marker = read(item, "isActive", "IsActive", "active", "Active", "status", "Status", "isCurrent", "IsCurrent");
  if (marker === undefined || marker === null || marker === "") return true;
  if (marker === false) return false;
  return !["false", "inactive", "disabled"].includes(String(marker).trim().toLowerCase());
}

function responseRecordCount(payload) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node.length;
  const records = collection(payload);
  return records.length ? records.length : undefined;
}

function activeFilterOptions(payload, preferredKeys, idKeys, labelKeys) {
  const unique = new Map();
  collection(payload, preferredKeys).forEach((item) => {
    if (!activeOption(item)) return;
    const normalized = optionFrom(item, [...idKeys, "value", "Value"], [...labelKeys, "label", "Label", "text", "Text"]);
    const id = positiveId(normalized?.value);
    if (normalized && id && !unique.has(id)) unique.set(id, { ...normalized, value: String(id) });
  });
  return Array.from(unique.values());
}

function positiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
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
  const allUnavailable = failures.length === REPORT_REQUESTS.length + 2;
  const affected = failures.map(({ key }) => key.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
  const firstMessage = messages[0] || "Unknown Reports API error.";

  if (reasons.every((reason) => !reason?.response || reason?.message === "Network Error") || messages.some((message) => /backend is not reachable|network error|ngrok.*offline|err_ngrok/i.test(message))) {
    return "Reports API is unreachable. The configured backend server or ngrok tunnel is offline. Start the backend/tunnel and select Retry.";
  }
  if (statuses.includes(401)) return "Your Reports API session is unauthorized or expired. Please sign in again.";
  if (statuses.includes(403)) return "You do not have permission to access one or more reports.";
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

function buildFilterQuery(values = {}) {
  const params = { "api-version": REPORTS_API_VERSION };
  for (const key of ["boardId", "academicYearId", "academicLevelId", "groupId"]) {
    const id = positiveId(values[key]);
    if (id) params[key] = id;
  }
  return params;
}

function buildReportQuery(filters) {
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
    if (["from", "to"].includes(filterKey)) {
      const normalized = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        params[queryKey] = `${normalized}T${filterKey === "from" ? "00:00:00" : "23:59:59"}`;
      }
      return params;
    }
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) params[queryKey] = id;
    return params;
  }, { "api-version": REPORTS_API_VERSION });
}

function mapFacultyWorkload(payload) {
  return collection(payload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload", "faculty", "Faculty"])
    .map((item) => ({
      faculty: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? ""),
      hours: numberValue(item, "totalWorkloadHours", "TotalWorkloadHours", "weeklyHours", "WeeklyHours", "hoursPerWeek", "HoursPerWeek", "workloadHours", "WorkloadHours", "hours", "Hours"),
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

function responseFilename(response, fallbackName) {
  const disposition = response?.headers?.["content-disposition"] ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  const filename = utf8Name ? decodeURIComponent(utf8Name) : plainName;
  return String(filename || fallbackName).trim();
}

function responseBlob(response) {
  return response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: response.headers?.["content-type"] || "application/octet-stream" });
}

async function excelPreview(blob) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return { rows: [], columns: [] };
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  return { rows, columns: exportColumns(rows) };
}

function exportCell(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} records` : "—";
  return String(value);
}

function exportColumns(reportRows) {
  return [...new Set(reportRows.flatMap((row) => Object.keys(row)))];
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [filters, setFilters] = useState({});
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [reports, setReports] = useState(EMPTY_REPORTS);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportErrors, setReportErrors] = useState({});
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [levelLoading, setLevelLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewing, setPreviewing] = useState("");
  const [exportingOverview, setExportingOverview] = useState("");
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
  const mountedRef = useRef(true);
  const reportRequestRef = useRef(0);
  const auditRequestRef = useRef(0);
  const previewRequestRef = useRef(0);

  const loadMasterOptions = useCallback(async () => {
    setBoardsLoading(true);
    setYearsLoading(true);
    const results = await Promise.allSettled([
      apiClient.get(REPORTS_API.filters.boards, { params: buildFilterQuery() }),
      apiClient.get(REPORTS_API.filters.academicYears, { params: buildFilterQuery() }),
    ]);
    if (!mountedRef.current) return;
    setMasterOptions((current) => ({
      ...current,
      boards: results[0].status === "fulfilled" ? activeFilterOptions(results[0].value.data, ["boards", "Boards"], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]) : [],
      years: results[1].status === "fulfilled" ? activeFilterOptions(results[1].value.data, ["academicYears", "AcademicYears", "years", "Years"], ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]) : [],
      levels: [], groups: [], sections: [],
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) setToast("One or more Reports dropdowns could not be loaded from the current backend.");
    setBoardsLoading(false);
    setYearsLoading(false);
  }, []);

  const loadReports = useCallback(async (selectedFilters) => {
    const requestId = ++reportRequestRef.current;
    setReportGenerated(false);
    setPreviewFile(null);
    setLoading(true);
    setError("");
    setReportErrors({});
    const [dashboardResult, overviewResult, ...results] = await Promise.allSettled([
      apiClient.get(REPORTS_API.dashboard, { params: buildReportQuery(selectedFilters) }),
      apiClient.get(REPORTS_API.overview, { params: buildReportQuery(selectedFilters) }),
      ...REPORT_REQUESTS.map((request) => apiClient.get(request.endpoint, { params: buildReportQuery(selectedFilters) })),
    ]);
    if (!mountedRef.current || requestId !== reportRequestRef.current) return;
    const nextReports = { ...EMPTY_REPORTS };
    const nextErrors = {};
    const failures = [];
    if (dashboardResult.status === "fulfilled") nextReports.dashboard = dashboardResult.value.data;
    else {
      failures.push({ key: "dashboard", reason: dashboardResult.reason });
      nextErrors.dashboard = getApiErrorMessage(dashboardResult.reason);
    }
    if (overviewResult.status === "fulfilled") nextReports.overview = overviewResult.value.data;
    else {
      failures.push({ key: "overview", reason: overviewResult.reason });
      nextErrors.overview = getApiErrorMessage(overviewResult.reason);
    }
    results.forEach((result, index) => {
      const { key } = REPORT_REQUESTS[index];
      if (result.status === "fulfilled") nextReports[key] = result.value.data;
      else {
        failures.push({ key, reason: result.reason });
        nextErrors[key] = getApiErrorMessage(result.reason);
      }
    });
    setReports(nextReports);
    setReportErrors(nextErrors);
    setReportGenerated([dashboardResult, overviewResult, ...results].some((result) => result.status === "fulfilled"));
    setAuditPage(1);
    setError(reportFailureMessage(failures));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadMasterOptions();
  }, [loadMasterOptions]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      reportRequestRef.current += 1;
      auditRequestRef.current += 1;
      previewRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const boardId = positiveId(filters.board);
    if (!boardId) {
      setLevelLoading(false);
      return undefined;
    }
    let active = true;
    setLevelLoading(true);
    apiClient.get(REPORTS_API.filters.academicLevels, {
      params: buildFilterQuery({ boardId }),
    }).then((response) => {
      if (!active) return;
      const levels = activeFilterOptions(response.data, ["academicLevels", "AcademicLevels", "levels", "Levels"], ["academicLevelId", "AcademicLevelId", "academicLevelID", "levelId", "LevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "levelName", "LevelName", "name", "Name"]);
      setMasterOptions((current) => ({ ...current, levels }));
      if (!levels.length) setToast("No academic levels available for the selected Board.");
    }).catch((requestError) => {
      if (active) setToast(`Unable to load Academic Levels. ${getApiErrorMessage(requestError)}`);
    }).finally(() => {
      if (active) setLevelLoading(false);
    });
    return () => { active = false; };
  }, [filters.board]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level) return;
    let active = true;
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    if (!boardId || !academicYearId || !academicLevelId) return undefined;
    setGroupsLoading(true);
    apiClient.get(REPORTS_API.filters.groups, {
      params: buildFilterQuery({ boardId, academicYearId, academicLevelId }),
    }).then((response) => {
      if (!active) return;
      const groups = activeFilterOptions(response.data, ["groups", "Groups"], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"]);
      setMasterOptions((current) => ({ ...current, groups }));
      if (!groups.length) setToast("No groups available for the selected filters.");
    }).catch((requestError) => active && setToast(`Unable to load Groups. ${getApiErrorMessage(requestError)}`))
      .finally(() => active && setGroupsLoading(false));
    return () => { active = false; };
  }, [filters.board, filters.level, filters.year]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group) return;
    let active = true;
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    const groupId = positiveId(filters.group);
    if (!boardId || !academicYearId || !academicLevelId || !groupId) return undefined;
    setSectionsLoading(true);
    apiClient.get(REPORTS_API.filters.sections, {
      params: buildFilterQuery({ boardId, academicYearId, academicLevelId, groupId }),
    }).then((response) => {
      if (!active) return;
      const sections = activeFilterOptions(response.data, ["sections", "Sections"], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
      setMasterOptions((current) => ({ ...current, sections }));
      if (!sections.length) setToast("No sections available for the selected filters.");
    }).catch((requestError) => active && setToast(`Unable to load Sections. ${getApiErrorMessage(requestError)}`))
      .finally(() => active && setSectionsLoading(false));
    return () => { active = false; };
  }, [filters.board, filters.group, filters.level, filters.year]);

  const filterFields = useMemo(() => {
    return [
      { name: "board", label: boardsLoading ? "Board (Loading...)" : "Board", type: "select", options: masterOptions.boards, disabled: boardsLoading, required: true },
      { name: "year", label: yearsLoading ? "Academic Year (Loading...)" : "Academic Year", type: "select", options: masterOptions.years, disabled: yearsLoading, required: true },
      { name: "level", label: levelLoading ? "Academic Level (Loading...)" : "Academic Level", type: "select", options: masterOptions.levels, disabled: !positiveId(filters.board) || levelLoading, required: true },
      { name: "group", label: groupsLoading ? "Group (Loading...)" : "Group", type: "select", options: masterOptions.groups, disabled: !positiveId(filters.board) || !positiveId(filters.year) || !positiveId(filters.level) || groupsLoading, required: true },
      { name: "section", label: sectionsLoading ? "Section (Loading...)" : "Section", type: "select", options: masterOptions.sections, disabled: !positiveId(filters.board) || !positiveId(filters.year) || !positiveId(filters.level) || !positiveId(filters.group) || sectionsLoading, required: true },
      { name: "from", label: "From Date", type: "date", required: true },
      { name: "to", label: "To Date", type: "date", required: true },
    ];
  }, [boardsLoading, filters.board, filters.group, filters.level, filters.year, groupsLoading, levelLoading, masterOptions, sectionsLoading, yearsLoading]);

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
    const admissionCount = responseRecordCount(reports.admissions);
    const examinationCount = responseRecordCount(reports.examinations);
    const resultCount = responseRecordCount(reports.results);
    return {
      admissions: metric(reports.admissions, ["totalAdmissions", "admissions", "admissionsCount", "total", "count"])
        ?? admissionCount
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalAdmissions", "admissionsCount"]),
      attendance: metric(reports.attendance, ["attendancePercentage", "averageAttendance", "attendanceRate", "percentage"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["attendancePercentage", "averageAttendance", "attendanceRate"]),
      staffAttendance: metricFromSources([reports.staffAttendance], ["staffAttendancePercentage", "attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]),
      facultyAttendance: metricFromSources([reports.facultyAttendance], ["facultyAttendancePercentage", "attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]),
      feeCollection: metric(reports.feeCollection, ["collected", "totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected", "amount"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected"]),
      dueFees: metric(reports.feeOutstanding, ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees", "dueAmount", "amount"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees", "dueAmount"]),
      examinations: metric(reports.examinations, ["totalExaminations", "examinationCount", "total", "count"])
        ?? examinationCount
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalExaminations", "examinationCount"]),
      results: metric(reports.results, ["published", "resultsPublished", "publishedResults", "resultCount", "total", "count"])
        ?? resultCount
        ?? metricFromSources([reports.overview, reports.dashboard], ["resultsPublished", "publishedResults", "resultCount"]),
      staffWorkload: metricFromSources([reports.staffWorkload], ["averageStaffWorkload", "averageWorkload", "staffWorkload", "weeklyHours", "hoursPerWeek", "totalWorkHours"]),
      facultyWorkload: metricFromSources([reports.facultyWorkload], ["averageFacultyWorkload", "averageWorkload", "facultyWorkload", "weeklyHours", "hoursPerWeek", "totalTeachingHours"]) ?? (workloadData.length ? workloadData.reduce((sum, item) => sum + item.hours, 0) : undefined),
      studentStrength: metric(reports.studentStrength, ["totalStudents", "studentStrength", "total", "count"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalStudents", "studentStrength"]),
      passPercentage: passRate
        ?? metricFromSources([reports.overview, reports.dashboard], ["passPercentage", "passRate"]),
      toppers: metricFromSources([reports.toppers], ["identified", "toppersIdentified", "topperCount", "totalToppers", "count"]) ?? responseRecordCount(reports.toppers),
    };
  }, [passRate, reports, workloadData]);
  const handleFilterChange = (name, value) => {
    setReportGenerated(false);
    setPreviewFile(null);
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "board") {
        Object.assign(next, { level: "", group: "", section: "" });
        setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
        setLevelLoading(false);
        setGroupsLoading(false);
        setSectionsLoading(false);
      }
      if (name === "year" || name === "level") {
        Object.assign(next, { group: "", section: "" });
        setMasterOptions((options) => ({ ...options, groups: [], sections: [] }));
        setGroupsLoading(false);
        setSectionsLoading(false);
      }
      if (name === "group") next.section = "";
      if (name === "group") {
        setMasterOptions((options) => ({ ...options, sections: [] }));
        setSectionsLoading(false);
      }
      return next;
    });
  };

  const generateReport = () => {
    if (loading) return;
    const requiredIds = [filters.board, filters.year, filters.level, filters.group, filters.section];
    if (!requiredIds.every((value) => positiveId(value)) || !validDateInput(filters.from) || !validDateInput(filters.to)) {
      setReportGenerated(false);
      setPreviewFile(null);
      setToast("Complete all required report filters before generating the report.");
      return;
    }
    if (filters.from > filters.to) {
      setReportGenerated(false);
      setToast("From Date must be earlier than or equal to To Date.");
      return;
    }
    loadReports(filters);
  };

  const resetReports = () => {
    reportRequestRef.current += 1;
    auditRequestRef.current += 1;
    previewRequestRef.current += 1;
    setFilters({});
    setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
    setReports(EMPTY_REPORTS);
    setReportErrors({});
    setReportGenerated(false);
    setPreviewFile(null);
    setError("");
    setToast("");
    setLevelLoading(false);
    setGroupsLoading(false);
    setSectionsLoading(false);
    setLoading(false);
    setAuditLoading(false);
    setPreviewing("");
    setAuditFilters({});
    setAuditData(null);
    setAuditError("");
    setAuditPage(1);
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
    const requestId = ++auditRequestRef.current;
    setAuditLoading(true);
    setAuditError("");
    try {
      const response = await apiClient.get(REPORTS_API.details.auditLogs, { params: buildReportQuery(filters) });
      if (!mountedRef.current || requestId !== auditRequestRef.current) return;
      setAuditData(response.data);
      setAuditPage(1);
    } catch (auditRequestError) {
      if (!mountedRef.current || requestId !== auditRequestRef.current) return;
      setAuditData(null);
      setAuditError(getApiErrorMessage(auditRequestError));
    } finally {
      if (mountedRef.current && requestId === auditRequestRef.current) setAuditLoading(false);
    }
  };

  const requestReportFile = async (format, reportType, title) => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      throw new Error("From Date must be earlier than or equal to To Date.");
    }
    const extension = format === "pdf" ? "pdf" : "xlsx";
    const response = await apiClient.get(
      format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel,
      { params: { ...buildReportQuery(filters), reportType }, responseType: "blob" },
    );
    const blob = responseBlob(response);
    const contentType = String(response.headers?.["content-type"] || blob.type || "").toLowerCase();
    if (contentType.includes("json") || contentType.includes("text/plain")) {
      throw Object.assign(new Error("The Reports API returned an error instead of a report file."), { response: { ...response, data: blob } });
    }
    if (format === "pdf" && contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      throw new Error(`The Reports API returned '${contentType}' instead of a PDF file.`);
    }
    const file = {
      blob,
      filename: responseFilename(response, `${reportType}-${new Date().toISOString().slice(0, 10)}.${extension}`),
      contentType,
      format,
      title,
    };
    if (format === "excel") Object.assign(file, await excelPreview(blob));
    return file;
  };

  const previewReport = async (format) => {
    const requestId = ++previewRequestRef.current;
    setPreviewing(format);
    setPdfPreviewLoaded(false);
    try {
      const file = await requestReportFile(format, OVERVIEW_REPORT_TYPE, "Reports Overview");
      if (!mountedRef.current || requestId !== previewRequestRef.current) return;
      setPreviewFile({ ...file, url: format === "pdf" ? URL.createObjectURL(file.blob) : "" });
    } catch (previewError) {
      if (!mountedRef.current || requestId !== previewRequestRef.current) return;
      setPreviewFile(null);
      setToast(await getExportErrorMessage(previewError));
    } finally {
      if (mountedRef.current && requestId === previewRequestRef.current) setPreviewing("");
    }
  };

  const exportCardReport = async (card, format) => {
    const requestKey = `${card.key}-${format}`;
    if (exportingCards[requestKey]) return;
    setExportingCards((current) => ({ ...current, [requestKey]: true }));
    try {
      const file = await requestReportFile(format, card.reportType, card.label);
      downloadBlob(file.blob, file.filename);
      setToast(`${card.label} ${format === "pdf" ? "PDF" : "Excel"} exported successfully.`);
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

  const exportOverview = async (format) => {
    if (exportingOverview) return;
    setExportingOverview(format);
    try {
      const file = await requestReportFile(format, OVERVIEW_REPORT_TYPE, "Reports Overview");
      downloadBlob(file.blob, file.filename);
      setToast(`Reports Overview ${format === "pdf" ? "PDF" : "Excel"} exported successfully.`);
    } catch (exportError) {
      setToast(await getExportErrorMessage(exportError));
    } finally {
      setExportingOverview("");
    }
  };

  const printBackendReport = async (reportType = OVERVIEW_REPORT_TYPE) => {
    const printWindow = window.open("", "reports-print", "width=960,height=720");
    if (!printWindow) {
      setToast("The print window was blocked. Allow pop-ups and try again.");
      return;
    }
    printWindow.document.write("<p style='font-family:Arial,sans-serif;padding:24px'>Preparing report for printing...</p>");
    try {
      const file = await requestReportFile("pdf", reportType, "Printable Report");
      const url = URL.createObjectURL(file.blob);
      printWindow.location.href = url;
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }, { once: true });
    } catch (printError) {
      printWindow.close();
      setToast(await getExportErrorMessage(printError));
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
        <button className={`reports-tab ${activeTab === "audit" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "audit"} onClick={() => { setActiveTab("audit"); setPreviewFile(null); if (!auditData && !auditLoading) fetchAuditLogs(); }}>Audit Logs</button>
      </div>
      {activeTab === "reports" ? <>
      <section className="cms-card reports-filter-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((field) => <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />)}
          </div>
          <div className="reports-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={generateReport} disabled={loading}>Generate Report</button>
            <button className="cms-btn cms-btn-ghost" onClick={resetReports} disabled={loading}>Reset</button>
          </div>
        </div>
      </section>

      <>
          {error ? <div className="reports-error-banner" role="alert"><span>{error}</span><button className="cms-btn cms-btn-ghost" type="button" onClick={() => loadReports(filters)} disabled={loading}>Retry</button></div> : null}
          <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
            <div className="reports-summary-panel-head">
              <div><h2 id="reports-summary-title">Reports Overview</h2><p>Key institution-wide report metrics</p></div>
              {reportGenerated ? <div className="reports-summary-actions" aria-label="Report file actions">
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("pdf")} disabled={previewing === "pdf"}><Eye size={14} />{previewing === "pdf" ? "Loading..." : "Review PDF"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("excel")} disabled={previewing === "excel"}><Eye size={14} />{previewing === "excel" ? "Loading..." : "Review Excel"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportOverview("pdf")} disabled={Boolean(exportingOverview)}><Download size={14} />{exportingOverview === "pdf" ? "Exporting..." : "Export PDF"}</button>
                <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportOverview("excel")} disabled={Boolean(exportingOverview)}><FileSpreadsheet size={14} />{exportingOverview === "excel" ? "Exporting..." : "Export Excel"}</button>
              </div> : null}
            </div>
            <div className="reports-summary-grid" aria-label="Report summary">
              {summaryCardConfig.map((card) => {
                const { key, sourceKey, label, icon: Icon, tone, currency, suffix } = card;
                const format = { currency, suffix };
                const source = reports[sourceKey];
                const hasLiveData = hasReportData(source);
                const details = hasLiveData
                  ? reportDetails(source, summaryValues[key], format)
                  : [];
                const displayValue = hasLiveData ? formatMetric(summaryValues[key], format) : reportErrors[sourceKey] ? "Unavailable" : "—";
                return <article className="reports-summary-card reports-summary-card-expanded" key={key}>
                  <div className="reports-summary-card-head">
                    <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
                    <div className="reports-summary-content"><span>{label}</span><strong>{displayValue}</strong></div>
                  </div>
                  {details.length || reportErrors[sourceKey] ? <dl className="reports-summary-details">
                    {details.length
                      ? details.map((detail) => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)
                      : <div><dt>Details</dt><dd>{reportErrors[sourceKey]}</dd></div>}
                  </dl> : null}
                  {reportGenerated && hasLiveData ? <div className="reports-card-actions">
                    <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportCardReport(card, "pdf")} disabled={Boolean(exportingCards[`${key}-pdf`])}><Download size={13} />{exportingCards[`${key}-pdf`] ? "Exporting..." : "Export PDF"}</button>
                    <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportCardReport(card, "excel")} disabled={Boolean(exportingCards[`${key}-excel`])}><FileSpreadsheet size={13} />{exportingCards[`${key}-excel`] ? "Exporting..." : "Export Excel"}</button>
                  </div> : null}
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
        {pdfPreviewLoaded ? <button className="cms-btn cms-btn-ghost" type="button" onClick={() => printBackendReport()}><Printer size={15} />Print PDF</button> : null}
        {pdfPreviewLoaded ? <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download PDF</button> : null}
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-pdf-preview"><iframe src={previewFile.url} title="Generated report PDF preview" onLoad={() => setPdfPreviewLoaded(true)} /></div>
      </Modal> : null}
      {previewFile?.format === "excel" ? <Modal title="Excel Preview" onClose={() => setPreviewFile(null)} footer={<>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => printBackendReport()}><Printer size={15} />Print Excel</button>
        <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download Excel</button>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-excel-preview"><table className="reports-top-students"><thead><tr>{previewFile.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
          {previewFile.rows.map((row, index) => <tr key={index}>{previewFile.columns.map((column) => <td key={column}>{exportCell(row[column])}</td>)}</tr>)}
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
