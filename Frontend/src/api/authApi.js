import api from "./axios";

export const registerUser = (data) => api.post("/api/auth/register", data);

export const loginUser = (data) => api.post("/api/auth/login", data);

export const forgotPassword = (data) =>
  api.post("/api/auth/forgot-password", data);

export const verifyOtp = (data) => api.post("/api/auth/verify-otp", data);

export const resetPassword = (data) =>
  api.post("/api/auth/reset-password", data);


// ==================== SUBJECT APIs ====================

export const getSubjects = () =>
  api.get("/api/Subjects");

// Add subject
export const addSubject = (data) =>
  api.post("/api/Subjects", data);

// Update subject
export const updateSubject = (id, data) =>
  api.put(`/api/Subjects/${id}`, data);

// Get subject by ID
export const getSubjectById = (id) =>
  api.get(`/api/Subjects/${id}`);


// Delete subject
export const deleteSubject = (id) =>
  api.delete(`/api/Subjects/${id}`);

// Get subjects by group
export const getSubjectsByGroup = (group) =>
  api.get(`/api/Subjects/group/${group}`);

// ==================== FACULTY APIs ====================

const FACULTY_BASE = "/api/v1/faculty";
const API_VERSION = { params: { "api-version": "1.0" } };

export const getDepartments = () => api.get("/api/v1/departments", API_VERSION);
export const getSections = () => api.get("/api/v1/sections", API_VERSION);

// Supported filters: PageNumber, PageSize, SearchTerm, Department,
// Designation, Status, SortBy, and SortOrder.
export const getFaculty = (filters = {}) =>
  api.get(FACULTY_BASE, {
    ...API_VERSION,
    params: { ...API_VERSION.params, ...filters },
  });
export const getFacultyById = (id) => api.get(`${FACULTY_BASE}/${id}`, API_VERSION);
export const createFaculty = (data) => api.post(FACULTY_BASE, data, API_VERSION);
export const updateFaculty = (id, data) => api.put(`${FACULTY_BASE}/${id}`, data, API_VERSION);
export const deleteFaculty = (id) => api.delete(`${FACULTY_BASE}/${id}`, API_VERSION);
export const getFacultyDropdown = () => api.get(`${FACULTY_BASE}/dropdown`, API_VERSION);

export const uploadFacultyPhoto = (facultyId, file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("facultyId", facultyId);
  return api.post(`${FACULTY_BASE}/upload-photo`, data, API_VERSION);
};

export const getFacultyPhoto = (id) =>
  api.get(`${FACULTY_BASE}/photo/${id}`, { ...API_VERSION, responseType: "blob" });

export const assignSubject = (data) =>
  api.post(`${FACULTY_BASE}/assign-subject`, data, API_VERSION);
export const updateSubjectAssignment = (id, data) =>
  api.put(`${FACULTY_BASE}/assign-subject/${id}`, data, API_VERSION);
export const deleteSubjectAssignment = (id) =>
  api.delete(`${FACULTY_BASE}/assign-subject/${id}`, API_VERSION);
export const getFacultyWorkload = (facultyId) =>
  api.get(`${FACULTY_BASE}/workload/${facultyId}`, API_VERSION);
