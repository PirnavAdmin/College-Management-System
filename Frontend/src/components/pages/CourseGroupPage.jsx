import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./CourseGroupPage.css";

const MODULE_SLUG = "courses";
const STATUS_OPTIONS = ["Active", "Inactive"];

const getCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null);
  return key ? item[key] : undefined;
};

const optionFrom = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) ?? value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const getUniqueOptions = (rows, idKeys, labelKeys) => {
  const options = rows.map((item) => optionFrom(item, idKeys, labelKeys)).filter(Boolean);
  return Array.from(new Map(options.map((item) => [item.value, item])).values());
};

const normalizeStatus = (item) => {
  const status = read(item, "status", "Status");
  if (typeof status === "boolean") return status ? "Active" : "Inactive";
  if (status) return String(status);
  return read(item, "isActive", "IsActive") ? "Active" : "Inactive";
};

const normalizeGroup = (item) => ({
  id: read(item, "groupId", "GroupId", "id"),
  name: read(item, "groupName", "GroupName", "name") || "-",
  code: read(item, "groupCode", "GroupCode", "code") || "-",
  boardId: String(read(item, "boardId", "BoardId") || ""),
  board: read(item, "boardName", "BoardName", "board", "Board") || "-",
  year: String(read(item, "academicYearId", "AcademicYearId", "year") || ""),
  yearName: read(item, "academicYearName", "AcademicYearName") || "",
  levelId: String(read(item, "academicLevelId", "AcademicLevelId") || ""),
  level: read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "level") || "-",
  subjects: read(item, "totalSubjects", "TotalSubjects") ?? 0,
  description: read(item, "description", "Description") || "",
  status: normalizeStatus(item),
});

const normalizeGroupForm = (item) => {
  const group = normalizeGroup(item);
  return {
    board: group.boardId,
    year: group.year,
    level: group.levelId,
    name: group.name === "-" ? "" : group.name,
    code: group.code === "-" ? "" : group.code,
    description: group.description,
    status: group.status,
  };
};

const toPayload = (formData) => ({
  boardId: Number(formData.board),
  academicYearId: Number(formData.year),
  academicLevelId: Number(formData.level),
  groupName: formData.name,
  groupCode: formData.code,
  description: formData.description || "",
  isActive: formData.status === "Active",
});

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value).toLowerCase().includes(query))) return false;
  if (filters.board && row.boardId !== filters.board) return false;
  if (filters.level && row.levelId !== filters.level) return false;
  if (filters.status && row.status !== filters.status) return false;
  return true;
};

const loadGroupMasters = async () => {
  const [boardsResult, yearsResult, levelsResult] = await Promise.allSettled([
    apiClient.get(apiEndpoints.boards.getAll),
    apiClient.get(apiEndpoints.academicYears.list),
    apiClient.get(apiEndpoints.boards.getAcademicLevels),
  ]);
  const failures = [
    ["Board API", boardsResult],
    ["Academic Year API", yearsResult],
    ["Academic Level API", levelsResult],
  ]
    .filter(([, result]) => result.status === "rejected")
    .map(([label, result]) => `${label}: ${getApiErrorMessage(result.reason)}`);

  if (failures.length) {
    throw new Error(`Failed to load Course / Group dropdown data. ${failures.join(" ")}`);
  }

  return {
    boards: getUniqueOptions(getCollection(boardsResult.value.data), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]),
    years: getUniqueOptions(getCollection(yearsResult.value.data), ["academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]),
    levels: getUniqueOptions(getCollection(levelsResult.value.data), ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]),
  };
};

const groupApi = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    const params = {
      search: search || undefined,
      boardId: filters.board || undefined,
      academicLevelId: filters.level || undefined,
      isActive: filters.status ? filters.status === "Active" : undefined,
    };
    const response = await apiClient.get(apiEndpoints.groups.getAll, { params });
    return getCollection(response.data)
      .map(normalizeGroup)
      .filter((row) => row.id)
      .filter((row) => matchesFilters(row, search, filters));
  },
  fetchRow: async (groupId) => {
    const response = await apiClient.get(apiEndpoints.groups.getById(groupId));
    return normalizeGroupForm(response.data?.data || response.data);
  },
  saveRow: async (values, groupId) => {
    const payload = toPayload(values);
    if (groupId) return apiClient.put(apiEndpoints.groups.update(groupId), payload);
    return apiClient.post(apiEndpoints.groups.create, payload);
  },
  deleteRow: (groupId) => apiClient.delete(apiEndpoints.groups.delete(groupId)),
  validateValues: async (values, groupId) => {
    if (!values.code) return {};
    const response = await apiClient.get(apiEndpoints.groups.validateCode, {
      params: {
        groupCode: values.code,
        excludeGroupId: groupId || undefined,
      },
    });
    return response.data?.isAvailable === false ? { code: "Group Code already exists" } : {};
  },
  loadFields: async (fields) => {
    const masters = await loadGroupMasters();
    return fields.map((field) => (
      field.name === "board"
        ? { ...field, options: masters.boards }
        : field.name === "year"
          ? { ...field, options: masters.years }
          : field.name === "level"
            ? { ...field, options: masters.levels }
            : field
    ));
  },
  loadFilters: async (filters) => {
    const masters = await loadGroupMasters();
    return filters.map((field) => (
      field.name === "board"
        ? { ...field, options: masters.boards }
        : field.name === "level"
          ? { ...field, options: masters.levels }
        : field
    ));
  },
};

export const pageConfig = {
    title: "Course / Group Management",
    subtitle: "Manage streams and groups mapped to boards and academic levels.",
    breadcrumb: ["Academics"],
    addLabel: "Add Course",
    rows: [],
    api: groupApi,
    columns: [
      { key: "name", label: "Group Name", strong: true },
      { key: "code", label: "Group Code" },
      { key: "board", label: "Board" },
      { key: "level", label: "Academic Level" },
      { key: "subjects", label: "Total Subjects" },
      { key: "status", label: "Status", badge: true },
    ],
    filters: [
      { name: "board", label: "Board", type: "select", options: [] },
      { name: "level", label: "Academic Level", type: "select", options: [] },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "level", label: "Academic Level", type: "select", options: [], required: true },
      { name: "name", label: "Group Name", required: true },
      { name: "code", label: "Group Code", required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
    ],
  };

export default function CourseGroupPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
