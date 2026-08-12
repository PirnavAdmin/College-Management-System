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
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import "./ReportsAnalyticsPage.css";

const EMPTY_REPORTS = {
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
  auditLogs: {},
};

const reportRequests = [
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

const AUDIT_PAGE_SIZES = [10, 25, 50, 100];
const AUDIT_SAMPLE_OPTIONS = {
  user: ["Super Admin", "College Admin", "Faculty User", "Staff User", "Student User"],
  role: ["Super Admin", "Admin", "Faculty", "Staff", "Student"],
  module: ["Student Management", "Fee Management", "Attendance", "Admissions", "Faculty", "Examinations", "Results", "Reports", "Users", "Settings", "Authentication"],
  action: ["Create", "Update", "Delete", "View", "Login", "Logout", "Approve", "Reject", "Export", "Import", "Assign", "Role Change"],
  status: ["Success", "Failed"],
};
const AUDIT_SEARCH_SAMPLES = ["Super Admin", "Student Management", "Login", "Export", "Success", "STU-1001"];
const AUDIT_SAMPLE_ROWS = [
  { id: "sample-1", timestamp: "2026-08-12T09:15:00+05:30", user: "Super Admin", role: "Super Admin", module: "Authentication", action: "Login", description: "User signed in to the College Management System.", recordId: "USR-0001", status: "Success", ipAddress: "192.168.0.25", device: "Chrome on Windows", isSample: true },
  { id: "sample-2", timestamp: "2026-08-12T09:42:00+05:30", user: "College Admin", role: "Admin", module: "Student Management", action: "Create", description: "Created a new student admission record.", recordId: "STU-1001", status: "Success", previousValue: null, newValue: { admissionStatus: "Active", academicYear: "2026-27" }, isSample: true },
  { id: "sample-3", timestamp: "2026-08-12T10:20:00+05:30", user: "Super Admin", role: "Super Admin", module: "Attendance", action: "Update", description: "Updated daily attendance for MPC first year.", recordId: "ATT-2048", status: "Success", previousValue: { present: 42, absent: 3 }, newValue: { present: 43, absent: 2 }, isSample: true },
  { id: "sample-4", timestamp: "2026-08-12T11:05:00+05:30", user: "Staff User", role: "Staff", module: "Fee Management", action: "Update", description: "Fee receipt update failed because the transaction reference was invalid.", recordId: "FEE-3512", status: "Failed", isSample: true },
  { id: "sample-5", timestamp: "2026-08-12T12:10:00+05:30", user: "College Admin", role: "Admin", module: "Reports", action: "Export", description: "Exported the Reports & Analytics summary in PDF format.", recordId: "RPT-0826", status: "Success", isSample: true },
  { id: "sample-6", timestamp: "2026-08-12T14:30:00+05:30", user: "Student User", role: "Student", module: "Results", action: "View", description: "Viewed the published semester examination result.", recordId: "RES-7814", status: "Success", isSample: true },
];

const summaryCardConfig = [
  { key: "admissions", sourceKey: "admissions", reportType: "admissions", label: "Admissions", icon: GraduationCap, tone: "blue" },
  { key: "attendance", sourceKey: "attendance", reportType: "attendance", label: "Attendance", icon: CalendarCheck, tone: "green", suffix: "%" },
  { key: "feeCollection", sourceKey: "feeCollection", reportType: "fees/collection", label: "Fee Collection", icon: WalletCards, tone: "violet", currency: true },
  { key: "dueFees", sourceKey: "feeOutstanding", reportType: "fees/outstanding", label: "Due Fees", icon: AlertCircle, tone: "amber", currency: true },
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
    Object.entries(node).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const valueFormat = { currency: currency || /amount|fee|collection|outstanding|due|paid/i.test(key), suffix: /percentage|rate/i.test(key) ? "%" : "" };
      if (/id$|date|created|updated|message|status/i.test(lowerKey)) return;
      if (Array.isArray(value)) add(readableLabel(key), value.length);
      else add(readableLabel(key), value, valueFormat);
    });
  }

  const rows = collection(payload);
  if (rows.length) add("Records", rows.length);
  return details.slice(0, 3);
}

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
  const apiOptions = uniqueOptions(rows, key);
  const apiValues = new Set(apiOptions.map((option) => option.value));
  const sampleOptions = AUDIT_SAMPLE_OPTIONS[key]
    .filter((value) => !apiValues.has(value))
    .map((value) => ({ value, label: `${value} (Sample)` }));
  return [...apiOptions, ...sampleOptions];
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
  const [reportGenerated, setReportGenerated] = useState(false);
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

  const loadReports = useCallback(async (selectedFilters, markAsGenerated = false) => {
    setLoading(true);
    setError("");
    const params = buildQuery(selectedFilters);
    const results = await Promise.allSettled(reportRequests.map(([, endpoint]) => apiClient.get(endpoint, { params })));
    const nextReports = { ...EMPTY_REPORTS };
    const failures = [];
    results.forEach((result, index) => {
      const [key] = reportRequests[index];
      if (result.status === "fulfilled") nextReports[key] = result.value.data;
      else failures.push({ key, reason: result.reason });
    });
    setReports(nextReports);
    if (markAsGenerated) {
      setReportGenerated(results.some((result) => result.status === "fulfilled" && hasReportData(result.value.data)));
    }
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

  const workloadData = useMemo(() => mapFacultyWorkload(reports.facultyWorkload), [reports.facultyWorkload]);
  const topperRows = useMemo(() => mapToppers(reports.toppers), [reports.toppers]);
  const apiAuditRows = useMemo(() => mapAuditLogs(auditData), [auditData]);
  const showingSampleAuditRows = !apiAuditRows.length;
  const auditRows = showingSampleAuditRows ? AUDIT_SAMPLE_ROWS : apiAuditRows;
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
    const summary = reports.summary;
    const admissionCount = collection(reports.admissions).length || undefined;
    const examinationCount = collection(reports.examinations).length || undefined;
    const resultCount = collection(reports.results).length || undefined;
    return {
      admissions: metric(summary, ["totalAdmissions", "TotalAdmissions", "admissionsCount", "AdmissionsCount"]) ?? admissionCount,
      attendance: metric(summary, ["attendancePercentage", "AttendancePercentage", "averageAttendance", "AverageAttendance"]) ?? metric(reports.attendance, ["attendancePercentage", "AttendancePercentage", "averageAttendance", "AverageAttendance"]),
      feeCollection: metric(summary, ["feeCollected", "FeeCollected", "totalFeeCollected", "TotalFeeCollected"]) ?? metric(reports.feeCollection, ["totalCollected", "TotalCollected", "collectedAmount", "CollectedAmount"]),
      dueFees: metric(summary, ["dueFees", "DueFees", "outstandingFees", "OutstandingFees"]) ?? metric(reports.feeOutstanding, ["totalOutstanding", "TotalOutstanding", "outstandingAmount", "OutstandingAmount"]),
      examinations: metric(summary, ["totalExaminations", "TotalExaminations", "examinationCount", "ExaminationCount"]) ?? examinationCount,
      results: metric(summary, ["resultsPublished", "ResultsPublished", "publishedResults", "PublishedResults"]) ?? resultCount,
      facultyWorkload: metric(summary, ["facultyWorkload", "FacultyWorkload", "averageFacultyWorkload", "AverageFacultyWorkload"]) ?? (workloadData.length ? workloadData.reduce((sum, item) => sum + item.hours, 0) / workloadData.length : undefined),
      studentStrength: metric(summary, ["studentStrength", "StudentStrength", "totalStudents", "TotalStudents"]) ?? metric(reports.studentStrength, ["totalStudents", "TotalStudents", "studentStrength", "StudentStrength"]),
      passPercentage: passRate ?? metric(summary, ["passPercentage", "PassPercentage"]),
      toppers: metric(summary, ["toppersIdentified", "ToppersIdentified", "topperCount", "TopperCount"]) ?? (topperRows.length || undefined),
    };
  }, [passRate, reports, topperRows.length, workloadData]);

  const handleFilterChange = (name, value) => {
    setReportGenerated(false);
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
    setReportGenerated(false);
    loadReports(filters, true);
  };

  const resetReports = () => {
    setFilters({});
    setReportGenerated(false);
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
      const response = await apiClient.get(apiEndpoints.reports.auditLogs, { params: buildQuery(filters) });
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
    const endpoint = isPdf ? apiEndpoints.reports.exportPdf : apiEndpoints.reports.exportExcel;
    const extension = isPdf ? "pdf" : "xlsx";
    const fallbackFilename = `${fallbackBase}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    const response = await apiClient.get(endpoint, {
      params: { reportType, ...buildQuery(filters) },
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
      const file = await requestReportFile(format);
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

      {loading ? (
        <div className="cms-card reports-loader"><Loader label="Loading report analytics..." /></div>
      ) : (
        <>
          {error ? <div className="reports-error-banner" role="alert"><span>{error}</span><button className="cms-btn cms-btn-ghost" type="button" onClick={() => loadReports(filters, true)} disabled={loading}>Retry</button></div> : null}
          <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
            <div className="reports-summary-panel-head">
              <div><h2 id="reports-summary-title">Reports Overview</h2><p>Key institution-wide report metrics</p></div>
              {reportGenerated ? <div className="reports-summary-actions" aria-label="Report file actions">
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("pdf")} disabled={previewing === "pdf"}><Eye size={14} />{previewing === "pdf" ? "Loading..." : "Preview PDF"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("excel")} disabled={previewing === "excel"}><Eye size={14} />{previewing === "excel" ? "Loading..." : "Preview Excel"}</button>
              </div> : null}
            </div>
            <div className="reports-summary-grid" aria-label="Report summary">
              {summaryCardConfig.map((card) => {
                const { key, sourceKey, label, icon: Icon, tone, currency, suffix } = card;
                const format = { currency, suffix };
                const source = reports[sourceKey];
                const details = reportDetails(source, summaryValues[key], format);
                const canExport = reportGenerated && hasReportData(source);
                return <article className="reports-summary-card reports-summary-card-expanded" key={key}>
                  <div className="reports-summary-card-head">
                    <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
                    <div className="reports-summary-content"><span>{label}</span><strong>{formatMetric(summaryValues[key], format)}</strong></div>
                  </div>
                  <dl className="reports-summary-details">
                    {details.length ? details.map((detail) => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>) : <div><dt>Details</dt><dd>{hasReportData(source) ? "No additional summary available" : "No data available"}</dd></div>}
                  </dl>
                  {canExport ? <div className="reports-card-actions">
                    <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportCardReport(card, "pdf")} disabled={Boolean(exportingCards[`${key}-pdf`])}><Download size={13} />{exportingCards[`${key}-pdf`] ? "Exporting..." : "Export PDF"}</button>
                    <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportCardReport(card, "excel")} disabled={Boolean(exportingCards[`${key}-excel`])}><FileSpreadsheet size={13} />{exportingCards[`${key}-excel`] ? "Exporting..." : "Export Excel"}</button>
                  </div> : null}
                </article>;
              })}
            </div>
          </section>
        </>
      )}
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
            {showingSampleAuditRows ? <div className="reports-audit-sample-note" role="note"><strong>Sample data:</strong> These example records demonstrate the expected Audit Logs API fields. Real API records will replace them after a successful fetch.</div> : null}
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
        <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download Excel</button>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-excel-preview"><table className="reports-top-students"><thead><tr><th>Report Metric</th><th>Value</th></tr></thead><tbody>
          {summaryCardConfig.map(({ key, label, currency, suffix }) => <tr key={key}><td><strong>{label}</strong></td><td>{formatMetric(summaryValues[key], { currency, suffix })}</td></tr>)}
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
