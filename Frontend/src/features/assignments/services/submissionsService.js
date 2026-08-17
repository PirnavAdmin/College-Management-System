import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAssignments } from "./assignmentsService.js";

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;

// This is deliberately local to the submissions submodule. The API receives the
// authenticated session from apiClient and applies its existing Admin/Faculty scope.
export async function getSubmissionAssignments() {
  return getAssignments();
}

export async function getSubmissionGroups() {
  const response = await apiClient.get(apiEndpoints.groups.list, { params: { isActive: true } });
  return unwrap(response.data);
}

export async function getSubmissionSections() {
  const response = await apiClient.get(apiEndpoints.sections.list);
  return unwrap(response.data);
}

export async function getSubmissionAcademicYears() {
  const response = await apiClient.get(apiEndpoints.academicYears.list);
  return unwrap(response.data);
}

export async function getAssignmentSubmissions(assignmentId) {
  const response = await apiClient.get(`/api/admin/assignments/${assignmentId}/submissions`);
  return unwrap(response.data);
}

export async function getAssignmentSubmission(assignmentId, submissionId) {
  const response = await apiClient.get(`/api/v1/assignment-submissions/${submissionId}`);
  return unwrap(response.data);
}

export async function getStudentAssignmentSubmissions(studentId) {
  const response = await apiClient.get(`/api/v1/assignment-submissions/student/${studentId}`);
  return unwrap(response.data);
}

export async function gradeAssignmentSubmission(assignmentId, submissionId, grade) {
  const response = await apiClient.put(`/api/assignments/${assignmentId}/submissions/${submissionId}/grade`, grade);
  return unwrap(response.data);
}
