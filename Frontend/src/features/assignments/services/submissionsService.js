import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAdminAssignments, getAssignments } from "./assignmentsService.js";

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;

function list(payload) {
  return Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? payload?.data ?? payload?.Data ?? [];
}

function mergeAssignments(...collections) {
  const byId = new Map();
  collections.flat().forEach((assignment) => {
    const id = assignment?.assignmentId ?? assignment?.AssignmentId ?? assignment?.id ?? assignment?.Id;
    if (id !== undefined && id !== null && id !== "") {
      byId.set(String(id), { ...(byId.get(String(id)) || {}), ...assignment });
    }
  });
  return [...byId.values()].sort((left, right) => Number(right.assignmentId ?? right.id) - Number(left.assignmentId ?? left.id));
}

// Keep the picker in sync with All Assignments: merge the Admin endpoint and
// the standard /api/v1/assignments endpoint, which includes faculty assignments.
export async function getSubmissionAssignments() {
  const [adminResult, assignmentsResult] = await Promise.allSettled([
    getAdminAssignments(),
    getAssignments(),
  ]);
  const collections = [adminResult, assignmentsResult]
    .filter((result) => result.status === "fulfilled")
    .map((result) => list(result.value));
  if (!collections.length) throw adminResult.reason || assignmentsResult.reason;
  return mergeAssignments(...collections);
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
  const response = await apiClient.get(apiEndpoints.assignments.submissions(assignmentId));
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
