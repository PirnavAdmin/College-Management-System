import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./SubjectManagementPage.css";

const MODULE_SLUG = "subjects";
const SUBJECT_TYPES = ["Theory", "Practical", "Theory + Practical", "Language", "Elective"];
const STATUS_OPTIONS = ["Active", "Inactive"];

function getGroups() {
  return apiClient.get(apiEndpoints.groups.getAll, {
    params: { isActive: true },
  });
}

function getBoards() {
  return apiClient.get(apiEndpoints.boards.getAll, {
    params: { Status: true, PageNumber: 1, PageSize: 100, SortBy: "BoardName", SortOrder: "asc" },
  });
}

function getAcademicLevels() {
  return apiClient.get(apiEndpoints.boards.getAcademicLevels);
}

function getAcademicYears() {
  return apiClient.get(apiEndpoints.academicYears.getAll, {
    params: { pageNumber: 1, pageSize: 100 },
  });
}

const pageConfig = {
    title: "Subject Management",
    subtitle: "Subject master with internal, practical and external mark splits.",
    breadcrumb: ["Academics"],
    contentClassName: "subject-management",
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
    filters: [
      { name: "board", label: "Board", type: "select", options: [] , loadOptions: getBoards, getOptions: (response) => boardOptionsFromResponse(response) },
      { name: "academicYear", label: "Academic Year", type: "select", options: [], loadOptions: getAcademicYears, getOptions: (response) => academicYearOptionsFromResponse(response) },
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, getOptions: (response) => groupOptionsFromResponse(response) },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: [], loadOptions: getBoards, getOptions: (response) => boardOptionsFromResponse(response), required: true },
      { name: "academicYear", label: "Academic Year", type: "select", options: [], loadOptions: getAcademicYears, getOptions: (response) => academicYearOptionsFromResponse(response), required: true },
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, getOptions: (response) => groupOptionsFromResponse(response), required: true },
      { name: "level", label: "Academic Level", type: "select", options: [], loadOptions: getAcademicLevels, getOptions: (response) => academicLevelOptionsFromResponse(response), required: true },
      { name: "name", label: "Subject Name", required: true },
      { name: "code", label: "Subject Code", required: true },
      { name: "type", label: "Subject Type", type: "select", options: SUBJECT_TYPES, required: true },
      { name: "internalMarks", label: "Internal Marks", type: "number", required: true },
      { name: "practicalMarks", label: "Practical Marks", type: "number" },
      { name: "externalMarks", label: "External Marks", type: "number", required: true },
      { name: "max", label: "Total Marks", type: "number", required: true, disabled: true },
      { name: "pass", label: "Passing Marks", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
    ],
  };

pageConfig.deriveValues = (values) => ({
  max: Number(values.internalMarks || 0) + Number(values.practicalMarks || 0) + Number(values.externalMarks || 0),
});

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.Items)) return payload.data.Items;
  if (Array.isArray(payload?.Data?.items)) return payload.Data.items;
  if (Array.isArray(payload?.Data?.Items)) return payload.Data.Items;
  return [];
};

const option = (item, idKeys, labelKeys) => {
  const value = idKeys.map((key) => item?.[key]).find((itemId) => itemId !== undefined && itemId !== null && itemId !== "");
  const label = labelKeys.map((key) => item?.[key]).find(Boolean);
  return value !== undefined && label ? { value: String(value), label: String(label) } : null;
};

const groupOptionsFromResponse = (response) => extractItems(response.data)
  .map((group) => option(group, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]))
  .filter(Boolean);

const boardOptionsFromResponse = (response) => extractItems(response.data)
  .map((board) => option(board, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "boardCode", "BoardCode", "name", "Name"]))
  .filter(Boolean);

const academicLevelOptionsFromResponse = (response) => extractItems(response.data)
  .map((level) => option(level, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]))
  .filter(Boolean);


const firstValue = (source, keys) => keys
  .map((key) => source?.[key])
  .find((value) => value !== undefined && value !== null && value !== "");

const toSubjectRow = (subject) => {
  // Subject responses have existed in both the original flat format and the
  // newer lookup format. Accept both so the list keeps showing the values
  // regardless of which API version is deployed.
  const group = firstValue(subject, ["group", "Group", "groupName", "GroupName", "groupCode", "GroupCode"])
    ?? firstValue(subject.groupDetails ?? subject.GroupDetails, ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
  const level = firstValue(subject, ["academicLevel", "AcademicLevel", "academicLevelName", "AcademicLevelName", "level", "Level", "levelName", "LevelName"])
    ?? firstValue(subject.academicLevelDetails ?? subject.AcademicLevelDetails, ["levelName", "LevelName", "name", "Name"]);

  return {
    id: subject.subjectId ?? subject.SubjectId ?? subject.id ?? subject.Id,
    board: firstValue(subject, ["board", "Board", "boardName", "BoardName", "boardCode", "BoardCode"]),
    group: group ?? "-",
    level: level ?? "-",
    name: firstValue(subject, ["subjectName", "SubjectName", "name", "Name"]),
    code: firstValue(subject, ["subjectCode", "SubjectCode", "code", "Code"]),
    type: firstValue(subject, ["subjectType", "SubjectType", "type", "Type"]),
    theory: subject.theory ?? subject.Theory,
    practicalFlag: subject.practical ?? subject.Practical,
    language: subject.language ?? subject.Language,
    elective: subject.elective ?? subject.Elective,
    internalMarks: subject.internalMarks ?? subject.InternalMarks,
    practicalMarks: subject.practicalMarks ?? subject.PracticalMarks,
    externalMarks: subject.externalMarks ?? subject.ExternalMarks,
    max: subject.totalMarks ?? subject.TotalMarks,
    pass: subject.passingMarks ?? subject.PassingMarks,
    status: subject.status ?? subject.Status ?? "Active",
  };
};

const academicYearOptionsFromResponse = (response) => extractItems(response.data)
  .map((year) => option(year, ["academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]))
  .filter(Boolean);

const read = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const statusFrom = (subject) => {
  const status = read(subject, "status", "Status");
  if (status !== undefined) return typeof status === "boolean" ? (status ? "Active" : "Inactive") : String(status);
  const active = read(subject, "isActive", "IsActive", "active", "Active");
  return active === false ? "Inactive" : "Active";
};

const toSubjectRow = (subject) => ({
  id: read(subject, "subjectId", "SubjectId", "id", "Id"),
  board: read(subject, "boardName", "BoardName", "board", "Board") || "-",
  boardId: read(subject, "boardId", "BoardId"),
  group: read(subject, "groupName", "GroupName", "group", "Group") || "-",
  groupId: read(subject, "groupId", "GroupId"),
  academicYear: read(subject, "academicYearId", "AcademicYearId"),
  level: read(subject, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel") || "-",
  levelId: read(subject, "academicLevelId", "AcademicLevelId"),
  name: read(subject, "subjectName", "SubjectName", "name", "Name") || "-",
  code: read(subject, "subjectCode", "SubjectCode", "code", "Code") || "-",
  type: read(subject, "subjectType", "SubjectType", "type", "Type") || "-",
  theory: read(subject, "theory", "Theory"),
  practicalFlag: read(subject, "practical", "Practical"),
  language: read(subject, "language", "Language"),
  elective: read(subject, "elective", "Elective"),
  internalMarks: read(subject, "internalMarks", "InternalMarks") ?? 0,
  practicalMarks: read(subject, "practicalMarks", "PracticalMarks") ?? 0,
  externalMarks: read(subject, "externalMarks", "ExternalMarks") ?? 0,
  max: read(subject, "totalMarks", "TotalMarks") ?? 0,
  pass: read(subject, "passingMarks", "PassingMarks") ?? 0,
  status: statusFrom(subject),
});


const toSubjectForm = (subject) => {
  const row = toSubjectRow(subject);
  return {
    board: String(row.boardId ?? ""), group: String(row.groupId ?? ""), academicYear: String(row.academicYear ?? ""),
    level: String(row.levelId ?? ""), name: row.name === "-" ? "" : row.name, code: row.code === "-" ? "" : row.code,
    type: row.type === "-" ? "" : row.type, internalMarks: row.internalMarks, practicalMarks: row.practicalMarks,
    externalMarks: row.externalMarks, max: row.max, pass: row.pass, status: row.status,
  };
};

const toSubjectPayload = (subject) => {
  const type = String(subject.type || "").toLowerCase();
  const isTheoryPractical = type === "theory + practical" || type === "theory & practical";
  const isLanguage = type === "language";
  const isElective = type === "elective";

  return {
    boardId: Number(subject.board),
    groupId: Number(subject.group),
    academicYearId: Number(subject.academicYear),
    academicLevelId: Number(subject.level),
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
    isActive: subject.status !== "Inactive",
  };
};

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
  if (filters.board && String(row.boardId) !== String(filters.board)) return false;
  if (filters.academicYear && String(row.academicYear) !== String(filters.academicYear)) return false;
  if (filters.group && String(row.groupId) !== String(filters.group)) return false;
  return !filters.status || row.status === filters.status;
};

pageConfig.api = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    const params = { pageNumber: 1, pageSize: 100 };
    let response;
    if (filters.status === "Active" && !search && !filters.board && !filters.academicYear && !filters.group) response = await apiClient.get(apiEndpoints.subjects.getActive);
    else if (filters.group && !search && !filters.board && !filters.academicYear) response = await apiClient.get(apiEndpoints.subjects.getByGroup(filters.group));
    else if (filters.board && !search && !filters.academicYear) response = await apiClient.get(apiEndpoints.subjects.getByBoard(filters.board));
    else if (filters.academicYear && !search && !filters.board) response = await apiClient.get(apiEndpoints.subjects.getByAcademicYear(filters.academicYear));
    else if (search) response = await apiClient.get(apiEndpoints.subjects.search, { params: { search } });
    else response = await apiClient.get(apiEndpoints.subjects.getAll, { params });
    return extractItems(response.data).map(toSubjectRow).filter((row) => row.id !== undefined).filter((row) => matchesFilters(row, search, filters));
  },
  fetchRow: async (id) => {
    const response = await apiClient.get(apiEndpoints.subjects.getById(id));
    return toSubjectForm(response.data?.data || response.data);
  },
  saveRow: (values, id) => id
    ? apiClient.put(apiEndpoints.subjects.update(id), toSubjectPayload(values))
    : apiClient.post(apiEndpoints.subjects.create, toSubjectPayload(values)),
  deleteRow: (id) => apiClient.delete(apiEndpoints.subjects.delete(id)),
  validateValues: async (values, id) => {
    const totalMarks = Number(values.max);
    const componentMarks = Number(values.internalMarks || 0) + Number(values.practicalMarks || 0) + Number(values.externalMarks || 0);
    const passingMarks = Number(values.pass || 0);
    const errors = {};
    if (totalMarks !== componentMarks) errors.max = "Total Marks must equal Internal + Practical + External marks";
    if (passingMarks > totalMarks) errors.pass = "Passing Marks cannot exceed Total Marks";
    if (Object.keys(errors).length || !values.code) return errors;
    const response = await apiClient.get(apiEndpoints.subjects.checkCode, { params: { subjectCode: values.code, excludeSubjectId: id || undefined } });
    const data = response.data?.data || response.data || {};
    if (data.isAvailable === false || data.exists === true || data.isUnique === false) errors.code = "Subject code already exists";
    return errors;
  },
};

export default function SubjectManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}

SubjectManagementPage.pageConfig = pageConfig;
