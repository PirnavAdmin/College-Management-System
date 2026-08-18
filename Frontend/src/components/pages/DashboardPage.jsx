import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, BookOpen, CalendarCheck, CalendarClock, Filter, GraduationCap, TrendingUp, Users, X } from "lucide-react";
import { BarChart, Bar, Brush, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
  ["strength", apiEndpoints.reports.studentStrength],
  ["exams", apiEndpoints.reports.examinations],
  ["pass", apiEndpoints.reports.passPercentage],
  ["groups", apiEndpoints.reports.groups],
  ["groupCatalog", apiEndpoints.groups.getAll],
  ["students", apiEndpoints.students.getAll],
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

function localCalendarDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const apiDate = `${year}-${month}-${day}`;
  return {
    apiDate,
    displayDate: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date),
    fromDate: `${apiDate}T00:00:00`,
    toDate: `${apiDate}T23:59:59`,
  };
}

function dateSafeDashboardData(cachedData, today) {
  if (!cachedData || cachedData.attendanceDate === today) return cachedData ?? {};
  return { ...cachedData, attendance: null, attendanceDate: today };
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

function groupDisplayName(item) {
  const groupName = String(read(item, "groupName", "GroupName", "courseName", "CourseName", "group", "Group", "groupCode", "GroupCode", "name", "Name", "label", "Label") ?? "").trim();
  const levelName = String(read(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "levelName", "LevelName") ?? "").trim();
  return levelName && !groupName.toLowerCase().includes(levelName.toLowerCase()) ? `${groupName} - ${levelName}` : groupName;
}

function findNamedArray(payload, preferredKeys) {
  const root = unwrap(payload);
  if (Array.isArray(root)) return root;
  const wanted = new Set(preferredKeys.map((key) => key.toLowerCase()));
  const queue = [root];
  const seen = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || Array.isArray(node) || seen.has(node)) continue;
    seen.add(node);
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value) && wanted.has(key.toLowerCase())) return value;
      if (value && typeof value === "object" && !Array.isArray(value)) queue.push(value);
    }
  }
  return [];
}

function normalizeDistributionRows(payload) {
  const sourceRows = findNamedArray(payload, ["groupDistribution", "groupWiseStrength", "groupStrength", "studentStrength", "courseDistribution", "groups"]);
  const groups = new Map();
  const seenSections = new Set();
  sourceRows.forEach((item) => {
    const name = groupDisplayName(item);
    const value = number(item, "studentCount", "StudentCount", "studentsCount", "StudentsCount", "totalStudents", "TotalStudents", "studentStrength", "StudentStrength", "strengthCount", "StrengthCount", "currentStrength", "CurrentStrength", "count", "Count", "value", "Value");
    if (!name || value === undefined || value < 0) return;
    const groupId = read(item, "groupId", "GroupId", "courseGroupId", "CourseGroupId");
    const levelId = read(item, "academicLevelId", "AcademicLevelId");
    const sectionId = read(item, "sectionId", "SectionId");
    const groupKey = groupId !== undefined ? `${groupId}:${levelId ?? ""}` : name.toLowerCase();
    const existing = groups.get(groupKey);
    if (sectionId !== undefined) {
      const sectionKey = `${groupKey}:${sectionId}`;
      if (seenSections.has(sectionKey)) return;
      seenSections.add(sectionKey);
      groups.set(groupKey, { name, value: (existing?.value ?? 0) + value });
    } else if (!existing || value > existing.value) {
      // Without a SectionId repeated rows cannot be safely assumed additive.
      groups.set(groupKey, { name, value });
    }
  });
  return Array.from(groups.values());
}

function groupsFromStudentJoin(groupPayload, studentPayload, academicYearId) {
  const groupRows = rows(groupPayload, ["groups", "Groups", "items", "Items"]);
  const studentRows = rows(studentPayload, ["students", "Students", "items", "Items", "records", "Records"]);
  if (!groupRows.length) return [];
  const groups = new Map();
  groupRows.forEach((item) => {
    const id = Number(read(item, "groupId", "GroupId", "id", "Id"));
    const rowYearId = Number(read(item, "academicYearId", "AcademicYearId"));
    if (!Number.isInteger(id) || id <= 0 || (Number.isInteger(rowYearId) && rowYearId > 0 && rowYearId !== academicYearId)) return;
    const name = groupDisplayName(item);
    if (name) groups.set(id, { name, value: 0 });
  });
  studentRows.forEach((item) => {
    const groupId = Number(read(item, "groupId", "GroupId", "courseGroupId", "CourseGroupId"));
    const rowYearId = Number(read(item, "academicYearId", "AcademicYearId"));
    const active = read(item, "isActive", "IsActive", "status", "Status");
    if (!groups.has(groupId) || (Number.isInteger(rowYearId) && rowYearId > 0 && rowYearId !== academicYearId) || active === false || String(active).toLowerCase() === "inactive") return;
    groups.get(groupId).value += 1;
  });
  return Array.from(groups.values());
}

function normalizeGroups(data, academicYearId) {
  for (const source of [data.summary, data.strength, data.groups]) {
    const distribution = normalizeDistributionRows(source);
    if (distribution.length) return distribution;
  }
  return groupsFromStudentJoin(data.groupCatalog, data.students, academicYearId);
}

function normalizeFacultyWorkload(payload) {
  return findArray(payload, ["facultyWorkload", "workload", "faculty", "items", "records"])
    .map((item) => ({
      name: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? "").trim(),
      hours: number(item, "totalWorkloadHours", "TotalWorkloadHours", "weeklyHours", "WeeklyHours", "hoursPerWeek", "HoursPerWeek", "workloadHours", "WorkloadHours", "totalTeachingHours", "TotalTeachingHours", "assignedHours", "AssignedHours", "hours", "Hours"),
    }))
    .filter((item) => item.name && item.hours !== undefined && item.hours >= 0)
    .slice(0, 8);
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

function dailyAttendanceSummary(payload) {
  const value = unwrap(payload);
  const total = number(value, "totalStudents", "TotalStudents", "total", "Total");
  const present = number(value, "present", "Present", "presentCount", "PresentCount");
  const absent = number(value, "absent", "Absent", "absentCount", "AbsentCount");
  const backendPercentage = number(value, "percentage", "Percentage", "attendancePercentage", "AttendancePercentage");
  const percentage = backendPercentage ?? (total > 0 && present !== undefined ? present / total * 100 : undefined);
  const hasData = [total, present, absent, backendPercentage].some((item) => item !== undefined);
  return { total, present, absent, percentage, hasData };
}

function attendanceResponseMatchesDate(payload, requestedDate) {
  const value = unwrap(payload);
  const responseDate = read(value, "attendanceDate", "AttendanceDate", "date", "Date", "fromDate", "FromDate");
  return responseDate === undefined || String(responseDate).slice(0, 10) === requestedDate;
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
  const initialDate = useMemo(localCalendarDate, []);
  const initialData = useMemo(() => dateSafeDashboardData(initialCache?.data, initialDate.apiDate), [initialCache, initialDate.apiDate]);
  const [data, setData] = useState(initialData);
  const [failures, setFailures] = useState({});
  const [loading, setLoading] = useState(() => !initialCache);
  const [lastUpdated, setLastUpdated] = useState(() => initialCache ? new Date(initialCache.savedAt) : null);
  const [admissionFilterOpen, setAdmissionFilterOpen] = useState(false);
  const [admissionFrom, setAdmissionFrom] = useState("");
  const [admissionTo, setAdmissionTo] = useState("");
  const mounted = useRef(true);
  const requestInFlight = useRef(false);
  const dataRef = useRef(initialData);

  const loadData = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      const attendanceDay = localCalendarDate();
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
        if (key === "pass") return metric(summary, ["passPercentage", "passRate", "percentage"]) === undefined;
        return true;
      });
      const secondaryPromise = Promise.allSettled(secondaryRequests.map(([key, endpoint]) => apiClient.get(endpoint, {
        ...requestConfig,
        params: {
          ...requestConfig.params,
          ...(["strength", "exams", "pass", "groups", "workload", "audit"].includes(key) && academicYear.id
            ? { AcademicYearId: academicYear.id }
            : {}),
          ...(key === "groupCatalog" && academicYear.id ? { academicYearId: academicYear.id, isActive: true } : {}),
          ...(key === "faculty" ? { PageNumber: 1, PageSize: 8 } : {}),
        },
      })));
      const attendancePromise = Promise.allSettled([apiClient.post(apiEndpoints.attendance.summary, {
        academicYearId: academicYear.id ?? undefined,
        fromDate: attendanceDay.fromDate,
        toDate: attendanceDay.toDate,
      }, { timeout: REQUEST_TIMEOUT })]);
      const trendPromise = academicYear.id
        ? Promise.allSettled([apiClient.get(dashboardApi.admissionTrend, {
          params: { academicYearId: academicYear.id, "api-version": DASHBOARD_API_VERSION }, timeout: REQUEST_TIMEOUT,
        })])
        : Promise.resolve([]);
      const [secondaryResults, attendanceResults, trendResults] = await Promise.all([secondaryPromise, attendancePromise, trendPromise]);
      secondaryResults.forEach((result, index) => {
        const [key] = secondaryRequests[index];
        if (result.status === "fulfilled") succeeded[key] = result.value.data;
        else errors[key] = getApiErrorMessage(result.reason);
      });
      if (!normalizeFacultyWorkload(succeeded.workload ?? dataRef.current.workload).length) {
        const facultyPayload = succeeded.faculty ?? dataRef.current.faculty;
        const facultyRecords = rows(facultyPayload, ["faculty", "Faculty", "faculties", "Faculties", "items", "Items"])
          .map((item) => Number(read(item, "facultyId", "FacultyId", "id", "Id")))
          .filter((id) => Number.isInteger(id) && id > 0)
          .slice(0, 8);
        if (facultyRecords.length) {
          const workloadResults = await Promise.allSettled(facultyRecords.map((facultyId) => apiClient.get(
            apiEndpoints.faculty.getWorkload(facultyId),
            requestConfig,
          )));
          const workloadRows = workloadResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value.data);
          if (workloadRows.length) {
            succeeded.workload = workloadRows;
            delete errors.workload;
          } else if (!errors.workload) {
            errors.workload = "Faculty workload data is unavailable.";
          }
        }
      }
      if (attendanceResults[0].status === "fulfilled" && attendanceResponseMatchesDate(attendanceResults[0].value.data, attendanceDay.apiDate)) {
        succeeded.attendance = attendanceResults[0].value.data;
        succeeded.attendanceDate = attendanceDay.apiDate;
      } else {
        if (dataRef.current.attendanceDate !== attendanceDay.apiDate) {
          succeeded.attendance = null;
          succeeded.attendanceDate = attendanceDay.apiDate;
        }
        errors.attendance = attendanceResults[0].status === "fulfilled"
          ? "Attendance API returned data for a different date."
          : getApiErrorMessage(attendanceResults[0].reason);
      }
      const previousAcademicYearId = dataRef.current.activeAcademicYear?.id;
      const academicYearChanged = previousAcademicYearId && previousAcademicYearId !== academicYear.id;
      if (academicYearChanged) {
        for (const key of ["groups", "strength", "groupCatalog", "students"]) {
          if (errors[key]) succeeded[key] = null;
        }
      }
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
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeAcademicYear = data.activeAcademicYear?.id ? data.activeAcademicYear : null;
  const admissionTrend = useMemo(() => activeAcademicYear ? rows(data.admissionTrend, ["monthlyAdmissions", "MonthlyAdmissions", "admissionTrend", "AdmissionTrend", "trend", "Trend"]).map(normalizeAdmissionPeriod).filter(Boolean).sort((a, b) => a.sortDate - b.sortDate) : [], [activeAcademicYear, data.admissionTrend]);
  const filteredAdmissionTrend = useMemo(() => admissionTrend.filter((item) => (
    (!admissionFrom || item.sortDate >= Number(admissionFrom))
    && (!admissionTo || item.sortDate <= Number(admissionTo))
  )), [admissionFrom, admissionTo, admissionTrend]);
  const admissionFilterActive = Boolean(admissionFrom || admissionTo);
  const clearAdmissionFilter = useCallback(() => {
    setAdmissionFrom("");
    setAdmissionTo("");
  }, []);

  useEffect(() => {
    clearAdmissionFilter();
    setAdmissionFilterOpen(false);
  }, [activeAcademicYear?.id, clearAdmissionFilter]);
  const academicYearAdmissions = activeAcademicYear
    ? firstMetric(data, ["summary"], ["currentAcademicYearAdmissions", "CurrentAcademicYearAdmissions", "academicYearAdmissions", "AcademicYearAdmissions", "admissionsThisAcademicYear", "AdmissionsThisAcademicYear"])
      ?? academicYearAdmissionTotal(data.admissionTrend, admissionTrend)
    : undefined;
  const admissionsLabel = activeAcademicYear?.name ? `Admissions (${activeAcademicYear.name})` : "Admissions";
  const currentAttendanceDay = localCalendarDate();
  const attendanceForToday = data.attendanceDate === currentAttendanceDay.apiDate
    ? dailyAttendanceSummary(data.attendance)
    : dailyAttendanceSummary(null);
  const kpis = useMemo(() => [
    { label: "Total Students", value: firstMetric(data, ["summary", "strength"], ["totalStudents", "studentStrength", "activeStudents"]), icon: Users, tone: "blue" },
    { label: "Faculty Members", value: firstMetric(data, ["summary"], ["totalFaculty", "facultyCount", "activeFaculty"]) ?? arrayCount(data.faculty), icon: GraduationCap, tone: "violet" },
    { label: "Today's Attendance", value: attendanceForToday.percentage, icon: CalendarCheck, tone: "green", type: "percent" },
    { label: admissionsLabel, value: academicYearAdmissions, icon: TrendingUp, tone: "blue" },
    { label: "Upcoming Exams", value: firstMetric(data, ["summary", "exams"], ["upcomingExams", "upcomingExaminations", "examinationCount"]) ?? arrayCount(data.exams), icon: CalendarClock, tone: "violet" },
    { label: "Pass Percentage", value: firstMetric(data, ["summary", "pass"], ["passPercentage", "passRate", "percentage"]), icon: BookOpen, tone: "green", type: "percent" },
  ], [academicYearAdmissions, admissionsLabel, attendanceForToday.percentage, data]);
  const groupDistribution = normalizeGroups(data, activeAcademicYear?.id);
  const exams = rows(data.exams, ["examinations", "Examinations", "upcomingExams", "UpcomingExams"]).map((item, index) => ({ id: read(item, "examinationId", "ExaminationId", "id", "Id") ?? index, subject: read(item, "subjectName", "SubjectName", "subject", "Subject", "examName", "ExamName") ?? "—", date: read(item, "examDate", "ExamDate", "date", "Date"), time: read(item, "startTime", "StartTime", "time", "Time") ?? "—", hall: read(item, "hallName", "HallName", "roomName", "RoomName", "hall", "Hall") ?? "—", invigilator: read(item, "invigilatorName", "InvigilatorName", "facultyName", "FacultyName") ?? "—", status: read(item, "status", "Status") ?? "Scheduled" })).filter((item) => { const date = new Date(item.date); return !item.date || Number.isNaN(date.getTime()) || date >= new Date(); }).slice(0, 5);
  const workload = normalizeFacultyWorkload(data.workload);
  const activities = rows(data.audit, ["auditLogs", "AuditLogs", "logs", "Logs"]).map((item, index) => ({ id: read(item, "auditLogId", "AuditLogId", "id", "Id") ?? index, user: read(item, "userName", "UserName", "performedBy", "PerformedBy", "createdBy", "CreatedBy") ?? "—", action: read(item, "action", "Action", "actionType", "ActionType") ?? "—", module: read(item, "module", "Module", "moduleName", "ModuleName") ?? "—", date: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "dateTime", "DateTime") })).slice(0, 5);
  const groupTotal = groupDistribution.reduce((sum, item) => sum + item.value, 0);

  const chart = (content, available) => <div className="dashboard-chart-body">{available ? content : <Empty />}</div>;
  const hasApplications = filteredAdmissionTrend.some((item) => item.applications !== undefined);
  return <DashboardLayout title="Dashboard" subtitle="Institution-wide academic and operational overview." actions={<div className="dashboard-header-actions"><div className="dashboard-update-meta"><small>Last Updated: {lastUpdated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdated) : "Not available"}</small></div><Link to="/dashboard/admission" className="cms-btn cms-btn-ghost">New Admission</Link><Link to="/dashboard/reports" className="cms-btn cms-btn-primary"><ArrowUpRight size={16} /> View Reports</Link></div>}>
    {loading ? <div className="cms-card dashboard-loader"><Loader label="Loading dashboard..." /></div> : <>
      {Object.keys(failures).length ? <div className="dashboard-warning">Some dashboard sources are unavailable. Successfully loaded widgets remain available.</div> : null}
      <div className="dashboard-kpi-grid">{kpis.map(({ label: name, value, icon: Icon, tone, type }) => <article className="cms-stat" key={name}><span className={`cms-stat-icon tone-${tone}`}><Icon size={20} /></span><div><div className="cms-stat-label">{name}</div><div className="cms-stat-value">{formatValue(value, type)}</div></div></article>)}</div>
      <div className="dashboard-grid dashboard-grid-2">
        <section className="cms-card dashboard-widget dashboard-admissions-card">
          <div className="cms-card-head dashboard-admissions-head">
            <div><h2>{admissionsLabel}</h2>{admissionFilterActive ? <small>Showing: {filteredAdmissionTrend[0]?.period ?? "No matching period"} {filteredAdmissionTrend.length > 1 ? `– ${filteredAdmissionTrend.at(-1).period}` : ""}</small> : null}</div>
            <div className="dashboard-admissions-actions">
              {admissionFilterActive ? <button type="button" className="dashboard-chart-reset" onClick={clearAdmissionFilter}>Reset</button> : null}
              <button type="button" className="dashboard-filter-button" aria-label="Filter admissions chart" aria-expanded={admissionFilterOpen} onClick={() => setAdmissionFilterOpen((open) => !open)}><Filter size={16} /> Filter{admissionFilterActive ? <span aria-label="1 active filter">1</span> : null}</button>
            </div>
          </div>
          {admissionFilterOpen ? <div className="dashboard-admissions-filter">
            <label>From period<select value={admissionFrom} onChange={(event) => { const value = event.target.value; setAdmissionFrom(value); if (admissionTo && Number(value) > Number(admissionTo)) setAdmissionTo(value); }}><option value="">First available</option>{admissionTrend.map((item) => <option key={`from-${item.sortDate}`} value={item.sortDate}>{item.period}</option>)}</select></label>
            <label>To period<select value={admissionTo} onChange={(event) => { const value = event.target.value; setAdmissionTo(value); if (admissionFrom && Number(value) < Number(admissionFrom)) setAdmissionFrom(value); }}><option value="">Last available</option>{admissionTrend.map((item) => <option key={`to-${item.sortDate}`} value={item.sortDate}>{item.period}</option>)}</select></label>
            <button type="button" className="dashboard-filter-close" aria-label="Close admissions filters" onClick={() => setAdmissionFilterOpen(false)}><X size={17} /></button>
          </div> : null}
          <div className="dashboard-chart-body dashboard-admissions-chart">{filteredAdmissionTrend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={filteredAdmissionTrend} margin={{ top: 8, right: 12, bottom: 20, left: 2 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" interval={0} angle={-30} textAnchor="end" height={62} /><YAxis allowDecimals={false} tickFormatter={(value) => Math.round(value)} label={{ value: "Admissions", angle: -90, position: "insideLeft" }} /><Tooltip labelFormatter={(value) => value} formatter={(value, name) => [Number(value), name === "admissions" ? "Admissions" : "Applications"]} /><Legend verticalAlign="top" height={30} /><Line type="monotone" dataKey="admissions" name="Admissions" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, fill: "#1d4ed8", strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />{hasApplications ? <Line type="monotone" dataKey="applications" name="Applications" stroke="#6d28d9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls /> : null}{filteredAdmissionTrend.length > 1 ? <Brush dataKey="period" height={24} travellerWidth={9} stroke="#1d4ed8" /> : null}</LineChart></ResponsiveContainer> : <Empty />}</div>
        </section>
        <section className="cms-card dashboard-widget dashboard-group-card"><div className="cms-card-head"><h2>Group Distribution</h2></div>{groupDistribution.length ? <div className="dashboard-group-body"><div className="dashboard-group-chart">{groupTotal > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--cms-surface)" strokeWidth={2} isAnimationActive={false}>{groupDistribution.map((item, index) => <Cell key={`${item.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [new Intl.NumberFormat("en-IN").format(value), "Students"]} /></PieChart></ResponsiveContainer> : <div className="dashboard-group-empty-ring" aria-hidden="true" />}<div className="dashboard-group-total"><strong>{new Intl.NumberFormat("en-IN").format(groupTotal)}</strong><span>Total Students</span></div></div><div className="dashboard-group-legend">{groupDistribution.map((item, index) => <div key={`${item.name}-${index}`}><i style={{ background: COLORS[index % COLORS.length] }} /><span title={item.name}>{item.name}</span><strong>{new Intl.NumberFormat("en-IN").format(item.value)}</strong><em>{groupTotal > 0 ? `${(item.value / groupTotal * 100).toFixed(1)}%` : "0.0%"}</em></div>)}</div></div> : <Empty text={failures.groups && failures.strength && (failures.groupCatalog || failures.students) ? "Unable to load group distribution." : "No group distribution data available."} />}</section>
        <section className="cms-card dashboard-widget dashboard-attendance-card"><div className="cms-card-head"><h2>Student Attendance ({currentAttendanceDay.displayDate})</h2></div>{attendanceForToday.hasData ? <div className="dashboard-attendance-daily">{attendanceForToday.percentage !== undefined ? <div className="dashboard-attendance-rate"><strong>{formatValue(attendanceForToday.percentage, "percent")}</strong><span>Attendance</span></div> : null}<div className="dashboard-attendance-metrics">{[["Total", attendanceForToday.total], ["Present", attendanceForToday.present], ["Absent", attendanceForToday.absent]].filter(([, value]) => value !== undefined).map(([name, value]) => <div key={name}><span>{name}</span><strong>{new Intl.NumberFormat("en-IN").format(value)}</strong></div>)}</div></div> : <Empty text={failures.attendance ? "Unable to load today's attendance." : "No attendance marked for today."} />}</section>
        <section className="cms-card dashboard-widget"><div className="cms-card-head"><h2>Faculty Workload</h2></div>{workload.length ? chart(<ResponsiveContainer width="100%" height="100%"><BarChart data={workload} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={85} /><Tooltip formatter={(value) => [`${Number(value).toLocaleString("en-IN")} hrs`, "Weekly workload"]} /><Bar dataKey="hours" name="Weekly workload" fill="#6d28d9" /></BarChart></ResponsiveContainer>, true) : <div className="dashboard-chart-body"><Empty text={failures.workload ? "Unable to load faculty workload." : "No faculty workload assigned."} /></div>}</section>
      </div>
      <div className="dashboard-grid dashboard-grid-2">
        <section className="cms-card"><div className="cms-card-head"><h2><CalendarClock size={15} /> Upcoming Examinations</h2><Link to="/dashboard/examinations" className="cms-btn cms-btn-ghost">Manage</Link></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Invigilator</th><th>Status</th></tr></thead><tbody>{exams.length ? exams.map((item) => <tr key={item.id}><td className="cms-strong">{item.subject}</td><td>{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—"}</td><td>{item.time}</td><td>{item.hall}</td><td>{item.invigilator}</td><td><StatusBadge value={item.status} /></td></tr>) : <tr><td colSpan={6}><Empty /></td></tr>}</tbody></table></div></section>
        <section className="cms-card"><div className="cms-card-head"><h2>Recent Activity</h2><Link to="/dashboard/reports" className="cms-btn cms-btn-ghost">View Audit Logs</Link></div><div className="dashboard-activity">{activities.length ? activities.map((item) => <div key={item.id}><span className="dashboard-activity-icon"><Activity size={15} /></span><p><strong>{item.user}</strong> {item.action} · {item.module}<small>{item.date ? new Date(item.date).toLocaleString("en-IN") : "—"}</small></p></div>) : <Empty />}</div></section>
      </div>
    </>}
  </DashboardLayout>;
}
