import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

export const getResults = async () => {
  const response = await apiClient.get(apiEndpoints.results.list);
  return toResultRecords(response.data);
};

export const getBoards = async () => {
  const response = await apiClient.get(apiEndpoints.boards.list);
  return unwrapRecords(response.data);
};

export const getGroups = async (params = {}) => {
  const response = await apiClient.get(apiEndpoints.groups.list, {
    params: { pageNumber: 1, pageSize: 100, ...params },
  });
  return unwrapRecords(response.data);
};

export const getStudentResult = async (studentId) => {
  const response = await apiClient.get(apiEndpoints.results.byStudent(studentId));
  const record = unwrapPayload(response.data);
  return record && !Array.isArray(record) ? toResultRecord(record) : null;
};

export const getRankList = async () => {
  const response = await apiClient.get(apiEndpoints.results.rankList);
  return unwrapRecords(response.data);
};

export const getFailedStudents = async () => {
  const response = await apiClient.get(apiEndpoints.results.failedStudents);
  return toResultRecords(response.data);
};

export const getResultStatistics = async () => {
  const response = await apiClient.get(apiEndpoints.results.statistics);
  return unwrapPayload(response.data);
};

export const getResultAnalysis = async () => {
  const response = await apiClient.get(apiEndpoints.results.analysis);
  return unwrapRecords(response.data);
};

export const downloadResultMemo = (studentId) =>
  apiClient.get(apiEndpoints.results.memo(studentId), { responseType: "blob" });

export const submitRevaluation = (data) =>
  apiClient.post(apiEndpoints.results.revaluation, {
    resultId: data.resultId,
    studentId: data.studentId,
    reason: data.reason,
  });

export const getRevaluation = async (revaluationId) => {
  const response = await apiClient.get(apiEndpoints.results.revaluationById(revaluationId));
  return unwrapPayload(response.data);
};

function unwrapPayload(payload) {
  return payload?.data ?? payload?.Data ?? payload;
}

function unwrapRecords(payload) {
  const data = unwrapPayload(payload);
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}

function toResultRecords(payload) {
  return unwrapRecords(payload).map(toResultRecord);
}

function toResultRecord(result) {
  return {
    id: result.resultId,
    resultId: result.resultId,
    studentId: result.studentId,
    name: result.studentName,
    roll: result.rollNumber,
    subject: result.subjectName,
    internal: result.internalMarks ?? 0,
    practical: result.practicalMarks ?? 0,
    external: result.externalMarks ?? 0,
    total: result.totalMarks ?? 0,
    grade: result.grade || "-",
    result: result.resultStatus || "-",
    rank: result.rank,
    isPublished: result.isPublished,
    publishedDate: result.publishedDate,
    board: result.boardName,
    academicYear: result.academicYear,
    academicLevel: result.academicLevel,
    group: result.groupName,
    exam: result.examName,
  };
}
