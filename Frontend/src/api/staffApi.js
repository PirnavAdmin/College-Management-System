import api from "./axios";

// ==================== STAFF MANAGEMENT SWAGGER APIs ====================

/**
 * 0. GET /api/v1/staff/init
 * UNIFIED COMPOSITE ENDPOINT: Loads summary stats, initial staff list, master lookups, and next employee IDs in 1 roundtrip.
 */
export const getStaffInit = (params) => {
  return api.get("/api/v1/staff/init", { params });
};

/**
 * 1. GET /api/v1/staff/dashboard-stats
 * Aggregated counts for summary cards (teaching, non-teaching, active, completed, pending, etc.)
 */
export const getStaffDashboardStats = () => {
  return api.get("/api/v1/staff/dashboard-stats");
};

/**
 * 2. GET /api/v1/staff
 * Paged, searched, filtered list of staff members.
 */
export const getStaff = (params) => {
  return api.get("/api/v1/staff", { params });
};

export const getStaffPaged = (params) => {
  return api.get("/api/v1/staff", { params });
};

/**
 * 3. GET /api/v1/staff/next-employee-id
 * Generates the next sequential Employee ID (PCTCH0001 / PCNT0001).
 */
export const getNextEmployeeId = (staffType = "Teaching", facultyType) => {
  const params = { staffType };
  if (facultyType) params.facultyType = facultyType;
  return api.get("/api/v1/staff/next-employee-id", { params });
};

/**
 * 4. GET /api/v1/staff/dropdown
 * List of staff for dropdown selection with optional staffType filter.
 */
export const getStaffDropdown = (staffType, facultyType) => {
  const params = {};
  if (typeof staffType === "object" && staffType !== null) {
    Object.assign(params, staffType);
  } else {
    if (staffType) params.staffType = staffType;
    if (facultyType) params.facultyType = facultyType;
  }
  return api.get("/api/v1/staff/dropdown", { params });
};

/**
 * 5. GET /api/v1/staff/{id}
 * Complete staff profile details by ID.
 */
export const getStaffById = (id) => {
  return api.get(`/api/v1/staff/${id}`);
};

/**
 * 6. GET /api/v1/staff/token/{token}
 * Retrieve staff profile securely by unique link token.
 */
export const getStaffByToken = (token) => {
  return api.get(`/api/v1/staff/token/${encodeURIComponent(token)}`);
};

/**
 * 7. POST /api/v1/staff
 * Create a new staff member (Teaching or Non-Teaching).
 */
export const createStaff = (data) => {
  return api.post("/api/v1/staff", data);
};

/**
 * 8. PUT /api/v1/staff/{id}
 * Update an existing staff member.
 */
export const updateStaff = (id, data) => {
  return api.put(`/api/v1/staff/${id}`, data);
};

/**
 * 9. DELETE /api/v1/staff/{id}
 * Soft delete a staff member record.
 */
export const deleteStaff = (id) => {
  return api.delete(`/api/v1/staff/${id}`);
};

/**
 * 10. POST /api/v1/staff/{id}/send-link
 * Dispatches profile completion link via email/SMS.
 */
export const sendStaffProfileLink = (id, data) => {
  return api.post(`/api/v1/staff/${id}/send-link`, data);
};

export const sendLink = sendStaffProfileLink;

/**
 * 11. POST /api/v1/staff/bulk-send-links
 * Bulk sends profile completion links to multiple staff members.
 */
export const bulkSendStaffProfileLinks = (data) => {
  return api.post("/api/v1/staff/bulk-send-links", data);
};

export const bulkSendLinks = bulkSendStaffProfileLinks;

/**
 * 12. POST /api/v1/staff/{id}/save-profile-draft
 * Saves profile section draft by staff ID.
 */
export const saveStaffProfileDraft = (id, data) => {
  return api.post(`/api/v1/staff/${id}/save-profile-draft`, data);
};

export const saveProfileDraft = saveStaffProfileDraft;

/**
 * 13. POST /api/v1/staff/token/{token}/save-profile-draft
 * Saves profile section draft by secure token.
 */
export const saveStaffProfileDraftByToken = (token, data) => {
  return api.post(`/api/v1/staff/token/${encodeURIComponent(token)}/save-profile-draft`, data);
};

export const saveProfileDraftByToken = saveStaffProfileDraftByToken;

/**
 * 14. POST /api/v1/staff/{id}/submit-profile
 * Final submission of staff profile by ID.
 */
export const submitStaffProfile = (id) => {
  return api.post(`/api/v1/staff/${id}/submit-profile`);
};

export const submitProfile = submitStaffProfile;

/**
 * 15. POST /api/v1/staff/token/{token}/submit-profile
 * Final submission of staff profile via secure token.
 */
export const submitStaffProfileByToken = (token) => {
  return api.post(`/api/v1/staff/token/${encodeURIComponent(token)}/submit-profile`);
};

export const submitProfileByToken = submitStaffProfileByToken;

/**
 * 16. POST /api/v1/staff/{id}/admin-review
 * Admin review action: Approve or Request Correction.
 */
export const adminReviewStaffProfile = (id, data) => {
  return api.post(`/api/v1/staff/${id}/admin-review`, data);
};

export const adminReview = adminReviewStaffProfile;

/**
 * 17. POST /api/v1/staff/import-excel
 * Import Staff from Excel workbook (.xlsx).
 */
export const importStaffExcel = (formData) => {
  return api.post("/api/v1/staff/import-excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * 18. GET /api/v1/staff/export-excel
 * Exports filtered or all staff members to Excel (.xlsx).
 */
export const exportStaffExcel = (params) => {
  return api.get("/api/v1/staff/export-excel", {
    params,
    responseType: "blob",
  });
};

/**
 * 19. GET /api/v1/staff/export-template
 * Download sample Excel template for staff import.
 */
export const exportStaffTemplate = (staffType) => {
  return api.get("/api/v1/staff/export-template", {
    params: staffType ? { staffType } : {},
    responseType: "blob",
  });
};

/**
 * 20. GET /api/v1/staff/{id}/print-pdf
 * Printable staff profile document stream.
 */
export const printStaffPdf = (id) => {
  return api.get(`/api/v1/staff/${id}/print-pdf`, {
    responseType: "blob",
  });
};

/**
 * 21. POST /api/v1/staff/{id}/documents/upload
 * Uploads an individual document for a staff member.
 */
export const uploadStaffDocument = (id, formData) => {
  return api.post(`/api/v1/staff/${id}/documents/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * 22. POST /api/v1/staff/token/{token}/documents/upload
 * Uploads an individual document via secure token.
 */
export const uploadStaffDocumentByToken = (token, formData) => {
  return api.post(`/api/v1/staff/token/${encodeURIComponent(token)}/documents/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * 23. DELETE /api/v1/staff/{id}/documents/{documentType}
 * Removes an individual uploaded document by ID.
 */
export const deleteStaffDocument = (id, documentType) => {
  return api.delete(`/api/v1/staff/${id}/documents/${encodeURIComponent(documentType)}`);
};

/**
 * 24. DELETE /api/v1/staff/token/{token}/documents/{documentType}
 * Removes an individual uploaded document via token.
 */
export const deleteStaffDocumentByToken = (token, documentType) => {
  return api.delete(`/api/v1/staff/token/${encodeURIComponent(token)}/documents/${encodeURIComponent(documentType)}`);
};

/**
 * 25. POST /api/v1/staff/upload-photo
 * Upload or replace staff member photo.
 */
export const uploadStaffPhoto = (formData) => {
  return api.post("/api/v1/staff/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * 26. GET /api/v1/staff/photo/{id}
 * Photo stream endpoint URL.
 */
export const getStaffPhotoUrl = (id) => {
  return `/api/v1/staff/photo/${id}`;
};

/**
 * 27. GET /api/v1/staff/lookup/blood-groups
 */
export const getStaffBloodGroups = () => {
  return api.get("/api/v1/staff/lookup/blood-groups");
};

// ==================== MASTER LOOKUP APIs ====================

export const getDepartments = (staffType) => {
  const params = staffType ? { staffType } : {};
  return api.get("/api/v1/departments", { params });
};

export const createDepartment = (data) => {
  return api.post("/api/v1/departments", data);
};

export const getDesignations = (staffType) => {
  const params = staffType ? { staffType } : {};
  return api.get("/api/v1/designations", { params });
};

export const createDesignation = (data) => {
  return api.post("/api/v1/designations", data);
};

// ==================== STAFF SUBJECT ALLOCATION APIs ====================

/**
 * 0. GET /api/v1/staff/available-subjects
 * Gets subjects filtered by staff member department.
 */
export const getStaffAvailableSubjects = (params) => {
  return api.get("/api/v1/staff/available-subjects", { params });
};

export const getAvailableSubjects = getStaffAvailableSubjects;

/**
 * 1. POST /api/v1/staff/assign-subject
 * Assign a subject to a teaching staff member.
 */
export const assignStaffSubject = (data) => {
  return api.post("/api/v1/staff/assign-subject", data);
};

export const assignSubject = assignStaffSubject;

/**
 * 2. PUT /api/v1/staff/assign-subject/{id}
 * Update an existing subject allocation.
 */
export const updateStaffSubjectAllocation = (id, data) => {
  return api.put(`/api/v1/staff/assign-subject/${id}`, data);
};

export const updateSubjectAssignment = updateStaffSubjectAllocation;

/**
 * 3. DELETE /api/v1/staff/assign-subject/{id}
 * Delete a subject allocation record.
 */
export const deleteStaffSubjectAllocation = (id) => {
  return api.delete(`/api/v1/staff/assign-subject/${id}`);
};

export const deleteSubjectAssignment = deleteStaffSubjectAllocation;

/**
 * 4. GET /api/v1/staff/{staffId}/subject-allocations
 * Get all subject allocations for a specific staff member.
 */
export const getStaffSubjectAllocations = (staffId) => {
  return api.get(`/api/v1/staff/${staffId}/subject-allocations`);
};

export const getSubjectAllocations = getStaffSubjectAllocations;

/**
 * 5. GET /api/v1/staff/workload/{staffId}
 * Get summary workload details and subject allocations for a staff member.
 */
export const getStaffWorkload = (staffId) => {
  return api.get(`/api/v1/staff/workload/${staffId}`);
};

export const getWorkload = getStaffWorkload;

export default {
  getStaffInit,
  getStaffDashboardStats,
  getStaff,
  getStaffPaged,
  getNextEmployeeId,
  getStaffDropdown,
  getStaffById,
  getStaffByToken,
  createStaff,
  updateStaff,
  deleteStaff,
  sendStaffProfileLink,
  sendLink,
  bulkSendStaffProfileLinks,
  bulkSendLinks,
  saveStaffProfileDraft,
  saveProfileDraft,
  saveStaffProfileDraftByToken,
  saveProfileDraftByToken,
  submitStaffProfile,
  submitProfile,
  submitStaffProfileByToken,
  submitProfileByToken,
  adminReviewStaffProfile,
  adminReview,
  importStaffExcel,
  exportStaffExcel,
  exportStaffTemplate,
  printStaffPdf,
  uploadStaffDocument,
  uploadStaffDocumentByToken,
  deleteStaffDocument,
  deleteStaffDocumentByToken,
  uploadStaffPhoto,
  getStaffPhotoUrl,
  getStaffBloodGroups,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
  getStaffAvailableSubjects,
  getAvailableSubjects,
  assignStaffSubject,
  assignSubject,
  updateStaffSubjectAllocation,
  updateSubjectAssignment,
  deleteStaffSubjectAllocation,
  deleteSubjectAssignment,
  getStaffSubjectAllocations,
  getSubjectAllocations,
  getStaffWorkload,
  getWorkload,
};
