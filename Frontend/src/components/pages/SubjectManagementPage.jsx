import * as data from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./SubjectManagementPage.css";

const o = data.options;
const MODULE_SLUG = "subjects";

function getGroups() {
  return apiClient.get(apiEndpoints.groups.getAll, {
    params: { pageNumber: 1, pageSize: 20 },
  });
}

function getBoards() {
  return apiClient.get(apiEndpoints.boards.getAll);
}

function getAcademicLevels() {
  return apiClient.get(apiEndpoints.boards.getAcademicLevels);
}

const pageConfig = {
    title: "Subject Management",
    subtitle: "Subject master with internal, practical and external mark splits.",
    breadcrumb: ["Academics"],
    addLabel: "Add Subject",
    rows: [],
    columns: [
      { key: "name", label: "Subject Name", strong: true },
      { key: "code", label: "Subject Code" },
      { key: "group", label: "Group" },
      { key: "level", label: "Academic Level" },
      { key: "type", label: "Subject Type" },
      { key: "max", label: "Maximum Marks" },
      { key: "pass", label: "Passing Marks" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: [], loadOptions: getBoards, required: true },
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, required: true },
      { name: "level", label: "Academic Level", type: "select", options: [], loadOptions: getAcademicLevels, required: true },
      { name: "name", label: "Subject Name", required: true },
      { name: "code", label: "Subject Code", required: true },
      { name: "type", label: "Subject Type", type: "select", options: o.subjectType, required: true },
      { name: "internalMarks", label: "Internal Marks", type: "number", required: true },
      { name: "practicalMarks", label: "Practical Marks", type: "number" },
      { name: "externalMarks", label: "External Marks", type: "number", required: true },
      { name: "max", label: "Total Marks", type: "number", required: true },
      { name: "pass", label: "Passing Marks", type: "number", required: true },
    ],
  };

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const getSubjects = () => apiClient.get(apiEndpoints.subjects.getAll);
const createSubject = (subject) => apiClient.post(apiEndpoints.subjects.create, subject);
const getSubjectById = (id) => apiClient.get(apiEndpoints.subjects.getById(id));
const updateSubject = (id, subject) => apiClient.put(apiEndpoints.subjects.update(id), subject);
const deleteSubject = (id) => apiClient.delete(apiEndpoints.subjects.delete(id));
const getSubjectsByGroup = (group) => apiClient.get(apiEndpoints.subjects.getByGroup(group));

const groupOptionsFromResponse = (response) => extractItems(response.data)
  .map((group) => group.groupCode || group.groupName)
  .filter(Boolean);

const boardOptionsFromResponse = (response) => extractItems(response.data)
  .map((board) => board.boardCode || board.boardName)
  .filter(Boolean);

const academicLevelOptionsFromResponse = (response) => extractItems(response.data)
  .map((level) => level.levelName)
  .filter(Boolean);

const toSubjectRow = (subject) => ({
  id: subject.subjectId ?? subject.id,
  board: subject.board,
  group: subject.group,
  level: subject.academicLevel,
  name: subject.subjectName,
  code: subject.subjectCode,
  type: subject.subjectType,
  theory: subject.theory,
  practicalFlag: subject.practical,
  language: subject.language,
  elective: subject.elective,
  internalMarks: subject.internalMarks,
  practicalMarks: subject.practicalMarks,
  externalMarks: subject.externalMarks,
  max: subject.totalMarks,
  pass: subject.passingMarks,
  status: subject.status ?? "Active",
});

const toSubjectPayload = (subject) => {
  const type = String(subject.type || "").toLowerCase();
  const isTheoryPractical = type === "theory + practical" || type === "theory & practical";
  const isLanguage = type === "language";
  const isElective = type === "elective";

  return {
    board: subject.board,
    group: subject.group,
    academicLevel: subject.level,
    subjectName: subject.name,
    subjectCode: subject.code,
    subjectType: subject.type,
    theory: type === "theory" || isTheoryPractical || isLanguage || isElective,
    practical: type === "practical" || isTheoryPractical,
    language: isLanguage,
    elective: isElective,
    internalMarks: Number(subject.internalMarks) || 0,
    practicalMarks: Number(subject.practicalMarks) || 0,
    externalMarks: Number(subject.externalMarks) || 0,
    totalMarks: Number(subject.max) || 0,
    passingMarks: Number(subject.pass) || 0,
  };
};

pageConfig.api = {
  getAll: getSubjects,
  create: createSubject,
  getById: getSubjectById,
  update: updateSubject,
  delete: deleteSubject,
  getByGroup: getSubjectsByGroup,
  toRow: toSubjectRow,
  toRows: (payload) => extractItems(payload).map(toSubjectRow),
  toPayload: toSubjectPayload,
};

export default function SubjectManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}

SubjectManagementPage.pageConfig = pageConfig;
pageConfig.fields.find((field) => field.name === "group").getOptions = groupOptionsFromResponse;
pageConfig.fields.find((field) => field.name === "board").getOptions = boardOptionsFromResponse;
pageConfig.fields.find((field) => field.name === "level").getOptions = academicLevelOptionsFromResponse;
