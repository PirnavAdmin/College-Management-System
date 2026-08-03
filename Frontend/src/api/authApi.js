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

// Get subject by ID
export const getSubjectById = (id) =>
  api.get(`/api/Subjects/${id}`);

// Update subject
export const updateSubject = (id, data) =>
  api.put(`/api/Subjects/${id}`, data);

// Delete subject
export const deleteSubject = (id) =>
  api.delete(`/api/Subjects/${id}`);

// Get subjects by group
export const getSubjectsByGroup = (group) =>
  api.get(`/api/Subjects/group/${group}`);