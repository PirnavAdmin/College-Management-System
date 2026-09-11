import api from "./axios";

// ==================== CERTIFICATES API ====================

// 1. Get active certificate templates for generation dropdown & dynamic rendering
export const getActiveCertificateTemplates = () => {
  return api.get("/api/v1/certificates/active-templates");
};

// 2. Get certificate template by code
export const getCertificateTemplateByCode = (templateCode) => {
  return api.get(`/api/v1/certificates/template-by-code/${encodeURIComponent(templateCode)}`);
};

// 3. Render certificate template with placeholder parameters
export const renderCertificateTemplate = (data) => {
  return api.post("/api/v1/certificates/render-template", data);
};

// 4. Preview certificate template before generation
export const previewCertificateTemplate = (data) => {
  return api.post("/api/v1/certificates/preview-template", data);
};

// 5. Get all certificates with filters (search, status, certificateType)
export const getCertificates = (params) => {
  return api.get("/api/v1/certificates", { params });
};

// 6. Get workflow stage summary counts (Generated, Reviewed, Approved, Issued, Cancelled)
export const getCertificateWorkflowStats = () => {
  return api.get("/api/v1/certificates/workflow-stats");
};

// 7. Get students dropdown for Create Certificate form auto-fill
export const getCertificateStudentsDropdown = () => {
  return api.get("/api/v1/certificates/students-dropdown");
};

// 8. Get single certificate details by ID
export const getCertificateById = (id) => {
  return api.get(`/api/v1/certificates/${encodeURIComponent(id)}`);
};

// 9. Generate / Create Certificate
export const generateCertificate = (data) => {
  return api.post("/api/v1/certificates/generate", data);
};

// 10. Review Certificate (Generated -> Reviewed)
export const reviewCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${encodeURIComponent(id)}/review`);
};

// 11. Approve Certificate (Reviewed -> Approved)
export const approveCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${encodeURIComponent(id)}/approve`);
};

// 12. Issue Certificate (Approved -> Issued)
export const issueCertificate = (id, issuedBy) => {
  return api.patch(`/api/v1/certificates/${encodeURIComponent(id)}/issue`, null, {
    params: issuedBy ? { issuedBy } : {},
  });
};

// 13. Bulk Review Certificates
export const bulkReviewCertificates = (data) => {
  return api.patch("/api/v1/certificates/bulk-review", data || null);
};

// 14. Bulk Approve Certificates
export const bulkApproveCertificates = (data) => {
  return api.patch("/api/v1/certificates/bulk-approve", data || null);
};

// 15. Bulk Issue Certificates
export const bulkIssueCertificates = (issuedBy, data) => {
  return api.patch("/api/v1/certificates/bulk-issue", data || null, {
    params: issuedBy ? { issuedBy } : {},
  });
};

// 16. Bulk Generate Certificates
export const bulkGenerateCertificates = (data) => {
  return api.post("/api/v1/certificates/bulk-generate", data);
};

// 17. Get Bulk Eligible Students
export const getBulkEligibleStudents = (params) => {
  return api.get("/api/v1/certificates/bulk-eligible-students", { params });
};

// 18. Cancel Certificate
export const cancelCertificate = (id, data) => {
  return api.patch(`/api/v1/certificates/${encodeURIComponent(id)}/cancel`, data || null);
};

// 19. Reissue Certificate
export const reissueCertificate = (data) => {
  return api.post("/api/v1/certificates/reissue", data);
};

// 20. Delete Certificate
export const deleteCertificate = (id) => {
  return api.delete(`/api/v1/certificates/${encodeURIComponent(id)}`);
};

// 21. Verify Certificate Publicly
export const verifyCertificate = (certificateNo) => {
  return api.get(`/api/v1/certificates/verify/${encodeURIComponent(certificateNo)}`);
};

// 22. Download Certificate PDF Stream
export const downloadCertificatePdf = (id) => {
  return api.get(`/api/v1/certificates/download/${encodeURIComponent(id)}`, {
    responseType: "blob",
  });
};

// 23. Export Certificates to Excel
export const exportCertificatesExcel = (params) => {
  return api.get("/api/v1/certificates/export/excel", {
    params,
    responseType: "blob",
  });
};

// 24. Export Certificates to PDF
export const exportCertificatesPdf = (params) => {
  return api.get("/api/v1/certificates/export/pdf", {
    params,
    responseType: "blob",
  });
};

const certificateApi = {
  getActiveCertificateTemplates,
  getCertificateTemplateByCode,
  renderCertificateTemplate,
  previewCertificateTemplate,
  getCertificates,
  getCertificateWorkflowStats,
  getCertificateStudentsDropdown,
  getCertificateById,
  generateCertificate,
  reviewCertificate,
  approveCertificate,
  issueCertificate,
  bulkReviewCertificates,
  bulkApproveCertificates,
  bulkIssueCertificates,
  bulkGenerateCertificates,
  getBulkEligibleStudents,
  cancelCertificate,
  reissueCertificate,
  deleteCertificate,
  verifyCertificate,
  downloadCertificatePdf,
  exportCertificatesExcel,
  exportCertificatesPdf,
};

export default certificateApi;
