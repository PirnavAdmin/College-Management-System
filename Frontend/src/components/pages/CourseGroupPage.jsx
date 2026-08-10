import * as data from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./CourseGroupPage.css";

const o = data.options;
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

const normalizeGroup = (item) => ({
  id: read(item, "groupId", "GroupId", "id"),
  name: read(item, "groupName", "GroupName", "name") || "-",
  code: read(item, "groupCode", "GroupCode", "code") || "-",
  board: read(item, "board", "Board") || "-",
  year: String(read(item, "academicYearId", "AcademicYearId", "year") || ""),
  yearName: read(item, "academicYearName", "AcademicYearName") || "",
  level: read(item, "academicLevel", "AcademicLevel", "level") || "-",
  subjects: read(item, "totalSubjects", "TotalSubjects") ?? 0,
  description: read(item, "description", "Description") || "",
  status: read(item, "status", "Status") || (read(item, "isActive", "IsActive") ? "Active" : "Inactive"),
});

const normalizeGroupForm = (item) => {
  const group = normalizeGroup(item);
  return {
    board: group.board === "-" ? "" : group.board,
    year: group.year,
    level: group.level === "-" ? "" : group.level,
    name: group.name === "-" ? "" : group.name,
    code: group.code === "-" ? "" : group.code,
    description: group.description,
    status: group.status,
  };
};

const toPayload = (formData) => ({
  board: formData.board,
  academicYearId: Number(formData.year),
  academicLevel: formData.level,
  groupName: formData.name,
  groupCode: formData.code,
  description: formData.description || "",
  isActive: formData.status === "Active",
});

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value).toLowerCase().includes(query))) return false;
  if (filters.board && row.board !== filters.board) return false;
  if (filters.level && row.level !== filters.level) return false;
  if (filters.status && row.status !== filters.status) return false;
  return true;
};

const loadAcademicYearOptions = async () => {
  const response = await apiClient.get(apiEndpoints.academicYears.list);
  return getCollection(response.data).map((year) => {
    const value = read(year, "academicYearId", "AcademicYearId", "id");
    const label = read(year, "academicYearName", "AcademicYearName", "name") || value;
    return { value: String(value), label };
  }).filter((year) => year.value);
};

const groupApi = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    const params = {
      search: search || undefined,
      board: filters.board || undefined,
      academicLevel: filters.level || undefined,
      isActive: filters.status ? filters.status === "Active" : undefined,
    };
    const hasOnlyBoardFilter = filters.board && !search && !filters.level && !filters.status;
    const response = hasOnlyBoardFilter
      ? await apiClient.get(apiEndpoints.groups.getByBoard(filters.board))
      : await apiClient.get(apiEndpoints.groups.getAll, { params });
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
    const academicYearOptions = await loadAcademicYearOptions();
    return fields.map((field) => (
      field.name === "year"
        ? { ...field, options: academicYearOptions }
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
      { name: "board", label: "Board", type: "select", options: o.board },
      { name: "level", label: "Academic Level", type: "select", options: o.level },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "name", label: "Group Name", required: true },
      { name: "code", label: "Group Code", required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
    ],
  };

export default function CourseGroupPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
