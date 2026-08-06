import api from "../api/axios";
import { apiEndpoints } from "./apiEndpoints";

const withAttachment = (assignment) => {
  const formData = new FormData();
  formData.append("Title", assignment.title.trim());
  formData.append("Subject", assignment.subject);
  formData.append("Faculty", assignment.faculty.trim());
  formData.append("Description", assignment.description.trim());
  formData.append("DueDate", assignment.dueDate);
  formData.append("MaximumMarks", String(Number(assignment.maxMarks)));
  if (assignment.attachment) formData.append("Attachment", assignment.attachment);
  if (assignment.attachmentPath) formData.append("AttachmentPath", assignment.attachmentPath);
  return formData;
};

const multipartConfig = { params: { "api-version": "1.0" }, headers: { "Content-Type": "multipart/form-data" } };
const versionConfig = { params: { "api-version": "1.0" } };

export const assignmentService = {
  list: (config = {}) => api.get(apiEndpoints.assignments.list, { ...versionConfig, ...config, params: { ...versionConfig.params, ...config.params } }),
  getById: (assignmentId, config = {}) => api.get(apiEndpoints.assignments.detail(assignmentId), { ...versionConfig, ...config, params: { ...versionConfig.params, ...config.params } }),
  create: (assignment) => {
    const payload = withAttachment(assignment);
    return api.post(apiEndpoints.assignments.create, payload, multipartConfig);
  },
  update: (assignmentId, assignment) => {
    const payload = withAttachment(assignment);
    return api.put(apiEndpoints.assignments.update(assignmentId), payload, multipartConfig);
  },
  remove: (assignmentId) => api.delete(apiEndpoints.assignments.remove(assignmentId), versionConfig),
  submit: (assignmentId, submission) => api.post(apiEndpoints.assignments.submit(assignmentId), submission, versionConfig),
  getSubmissions: (assignmentId, config = {}) => api.get(apiEndpoints.assignments.submissions(assignmentId), { ...versionConfig, ...config, params: { ...versionConfig.params, ...config.params } }),
};
