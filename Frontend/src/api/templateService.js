import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * Settings Templates API Service
 * Handles CRUD operations, category lookups, active status toggles, and dynamic HTML previews.
 */
export const templateService = {
  /**
   * Fetch all templates with pagination, search, category, and isActive filters.
   * GET /api/v1/settings/templates
   */
  async getTemplates(params = {}) {
    const query = {
      pageNumber: params.pageNumber || 1,
      pageSize: params.pageSize || 10,
    };
    if (params.search && params.search.trim()) {
      query.search = params.search.trim();
    }
    if (params.category && params.category !== "All Categories" && params.category.trim()) {
      query.category = params.category.trim();
    }
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== "All") {
      query.isActive = typeof params.isActive === "boolean" ? params.isActive : params.isActive === "Active";
    }

    const response = await apiClient.get(apiEndpoints.settingsTemplates.list, { params: query });
    return response.data;
  },

  /**
   * Fetch available template categories.
   * GET /api/v1/settings/templates/categories
   */
  async getCategories() {
    const response = await apiClient.get(apiEndpoints.settingsTemplates.categories);
    return response.data;
  },

  /**
   * Fetch a single template by ID.
   * GET /api/v1/settings/templates/{id}
   */
  async getTemplateById(id) {
    const response = await apiClient.get(apiEndpoints.settingsTemplates.getById(id));
    return response.data;
  },

  /**
   * Fetch a single template by unique code (e.g. BONAFIDE_CERT, TRANSFER_CERT).
   * GET /api/v1/settings/templates/by-code/{templateCode}
   */
  async getTemplateByCode(templateCode) {
    const response = await apiClient.get(apiEndpoints.settingsTemplates.getByCode(templateCode));
    return response.data;
  },

  /**
   * Create a new template with dynamic placeholders and HTML content.
   * POST /api/v1/settings/templates
   */
  async createTemplate(data) {
    const payload = {
      templateCode: data.templateCode || data.code || `TMP_${Date.now()}`,
      title: data.title || data.name || "Untitled Template",
      category: data.category || "Certificate",
      contentBody: data.contentBody || data.content || data.body || "",
      placeholders: Array.isArray(data.placeholders)
        ? data.placeholders
        : Array.isArray(data.dynamicFields)
        ? data.dynamicFields
        : [],
      isActive: data.isActive !== undefined ? data.isActive : data.status === "Active",
    };

    const response = await apiClient.post(apiEndpoints.settingsTemplates.create, payload);
    return response.data;
  },

  /**
   * Update an existing template (auto-increments Version and updates UpdatedAt).
   * PUT /api/v1/settings/templates/{id}
   */
  async updateTemplate(id, data) {
    const payload = {
      title: data.title || data.name || "Untitled Template",
      category: data.category || "Certificate",
      contentBody: data.contentBody || data.content || data.body || "",
      placeholders: Array.isArray(data.placeholders)
        ? data.placeholders
        : Array.isArray(data.dynamicFields)
        ? data.dynamicFields
        : [],
      isActive: data.isActive !== undefined ? data.isActive : data.status === "Active",
    };

    const response = await apiClient.put(apiEndpoints.settingsTemplates.update(id), payload);
    return response.data;
  },

  /**
   * Soft-delete / deactivate a template.
   * DELETE /api/v1/settings/templates/{id}
   */
  async deleteTemplate(id) {
    const response = await apiClient.delete(apiEndpoints.settingsTemplates.delete(id));
    return response.data;
  },

  /**
   * Toggle the active status of a template.
   * PATCH /api/v1/settings/templates/{id}/toggle-active
   */
  async toggleActive(id) {
    const response = await apiClient.patch(apiEndpoints.settingsTemplates.toggleActive(id));
    return response.data;
  },

  /**
   * Dynamically render a template with real or sample placeholders.
   * POST /api/v1/settings/templates/preview
   */
  async previewTemplate(data) {
    const payload = {
      templateCode: data.templateCode || data.code || "",
      templateId: data.templateId || (typeof data.id === "number" ? data.id : 0),
      studentId: data.studentId || 0,
      admissionNo: data.admissionNo || data.admission_no || "ADM-2026-0017",
      certificateNo: data.certificateNo || data.certificate_number || "CERT/2026/001",
      purpose: data.purpose || "Higher Education",
      remarks: data.remarks || "Good Conduct",
      issuedBy: data.issuedBy || data.principal_name || "Principal",
      conduct: data.conduct || data.conduct_rating || "Good",
      issueDate: data.issueDate || new Date().toISOString(),
      customPlaceholders: data.customPlaceholders || {},
    };

    const response = await apiClient.post(apiEndpoints.settingsTemplates.preview, payload);
    return response.data;
  },
};

export default templateService;

