import api from "./axios";

// ==================== REPORTS & ANALYTICS API ====================

// --- 1. Cascading Filters ---
export const getReportBoards = () => {
  return api.get("/api/reports/filters/boards");
};

export const getReportAcademicYears = () => {
  return api.get("/api/reports/filters/academic-years");
};

export const getReportAcademicLevels = (params) => {
  return api.get("/api/reports/filters/academic-levels", { params });
};

export const getReportGroups = (params) => {
  return api.get("/api/reports/filters/groups", { params });
};

export const getReportSections = (params) => {
  return api.get("/api/reports/filters/sections", { params });
};

// --- 2. Overview / Dashboard Metrics (10 Cards) ---
export const getReportsDashboard = (params) => {
  return api.get("/api/reports/dashboard", { params });
};

export const getReportsOverview = (params) => {
  return getReportsDashboard(params);
};

// --- 3. Report Detail Endpoints ---
export const getAdmissionsDetails = (params) => {
  return api.get("/api/reports/details/admissions", { params });
};

export const getStudentStrengthDetails = (params) => {
  return api.get("/api/reports/details/student-strength", { params });
};

export const getAttendanceDetails = (params) => {
  return api.get("/api/reports/details/attendance", { params });
};

export const getStaffAttendanceDetails = (params) => {
  return api.get("/api/reports/details/staff-attendance", { params });
};

export const getFeeCollectionDetails = (params) => {
  return api.get("/api/reports/details/fee-collection", { params });
};

export const getDueFeesDetails = (params) => {
  return api.get("/api/reports/details/due-fees", { params });
};

export const getExaminationsDetails = (params) => {
  return api.get("/api/reports/details/examinations", { params });
};

export const getResultsDetails = (params) => {
  return api.get("/api/reports/details/results", { params });
};

export const getPassPercentageDetails = (params) => {
  return api.get("/api/reports/details/pass-percentage", { params });
};

export const getToppersDetails = (params) => {
  return api.get("/api/reports/details/toppers", { params });
};

export const getStaffWorkloadDetails = (params) => {
  return api.get("/api/reports/details/staff-workload", { params });
};

// --- 4. Audit Logs ---
export const getAuditLogs = (params) => {
  return api.get("/api/reports/details/audit-logs", { params });
};

// --- 5. Export Handlers ---
export const exportReportPdf = (reportType, params) => {
  return api.get("/api/reports/export/pdf", {
    params: { reportType, ...params },
    responseType: "blob"
  });
};

export const exportReportExcel = (reportType, params) => {
  return api.get("/api/reports/export/excel", {
    params: { reportType, ...params },
    responseType: "blob"
  });
};
