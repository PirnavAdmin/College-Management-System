import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;

/** Returns the complete assignment list visible to administrators. */
export async function getAdminAssignments() {
  const response = await apiClient.get(apiEndpoints.assignments.adminList);
  return unwrap(response.data);
}

/** Returns the standard authenticated assignment list. */
export async function getAssignments() {
  const response = await apiClient.get(apiEndpoints.assignments.list);
  return unwrap(response.data);
}

export async function deleteAssignment(assignmentId) {
  const response = await apiClient.delete(apiEndpoints.assignments.delete(assignmentId));
  return unwrap(response.data);
}
