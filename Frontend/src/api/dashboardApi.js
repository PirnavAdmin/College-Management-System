import apiClient from "./axios";
import { apiEndpoints } from "./apiEndpoints";

/**
 * Dashboard API Services
 * Endpoints for unified overview, filters, KPIs, demographics, attendance, certificates, and exams.
 */

// 1. Unified Dashboard Overview
export const getDashboardOverview = (params) => {
  return apiClient.get(apiEndpoints.dashboard.overview, { params });
};

// 2. Active Dashboard Filters (Academic Years and Boards)
export const getDashboardFilters = () => {
  return apiClient.get(apiEndpoints.dashboard.filters);
};

// 3. Primary KPI Summary
export const getDashboardSummary = (params) => {
  return apiClient.get(apiEndpoints.dashboard.summary, { params });
};

// 4. Students Admissions Overview & Demographics
export const getStudentsOverview = (params) => {
  return apiClient.get(apiEndpoints.dashboard.studentsOverview, { params });
};

// 5. Monthly Student Admissions Timeline
export const getAdmissionTrend = (params) => {
  return apiClient.get(apiEndpoints.dashboard.admissionTrend, { params });
};

// 6. Enrolled Students per Academic Stream (Group Distribution)
export const getGroupDistribution = (params) => {
  return apiClient.get(apiEndpoints.dashboard.groupDistribution, { params });
};

// 7. Student Attendance Today
export const getStudentsAttendanceToday = (params) => {
  return apiClient.get(apiEndpoints.dashboard.studentsAttendanceToday, { params });
};

// 8. Staff Attendance Today (Teaching & Non-Teaching)
export const getStaffAttendanceToday = (params) => {
  return apiClient.get(apiEndpoints.dashboard.staffAttendanceToday, { params });
};

// 9. Certificate Requests History & Workflow
export const getCertificateRequests = (params) => {
  return apiClient.get(apiEndpoints.dashboard.certificateRequests, { params });
};

// 10. Upcoming Scheduled Examinations
export const getUpcomingExaminations = (params) => {
  return apiClient.get(apiEndpoints.dashboard.upcomingExaminations, { params });
};

// 11. Today's Key Highlights
export const getTodaysHighlights = (params) => {
  return apiClient.get(apiEndpoints.dashboard.todaysHighlights, { params });
};

// 12. Weekly Attendance Analytics (Optional)
export const getWeeklyAttendance = (params) => {
  return apiClient.get(apiEndpoints.dashboard.weeklyAttendance, { params });
};

// 13. Recent Institutional Activity Feed (Optional)
export const getRecentActivity = (params) => {
  return apiClient.get(apiEndpoints.dashboard.recentActivity, { params });
};

// 14. Faculty Workload & Allocated Hours (Optional)
export const getFacultyWorkload = (params) => {
  return apiClient.get(apiEndpoints.dashboard.facultyWorkload, { params });
};

export default {
  getDashboardOverview,
  getDashboardFilters,
  getDashboardSummary,
  getStudentsOverview,
  getAdmissionTrend,
  getGroupDistribution,
  getStudentsAttendanceToday,
  getStaffAttendanceToday,
  getCertificateRequests,
  getUpcomingExaminations,
  getTodaysHighlights,
  getWeeklyAttendance,
  getRecentActivity,
  getFacultyWorkload,
};
