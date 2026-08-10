import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./SectionManagementPage.css";

const o = data.options;
const MODULE_SLUG = "sections";

const unwrapList = (d) => (Array.isArray(d) ? d : d?.data || d?.items || []);

const nameMap = (items, idKeys, nameKeys) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined);
    const name = nameKeys.map((k) => it[k]).find((v) => v !== undefined && v !== "");
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
};

let cachedYears = null;
let cachedFaculty = null;

const mapRow = (r) => ({
  id: r.sectionId ?? r.id,
  name: r.sectionName ?? r.name,
  group: r.group ?? r.groupName,
  level: r.academicLevel ?? r.academicLevelName ?? r.level,
  room: r.roomNumber ?? r.room,
  teacher: r.classTeacherName ?? r.teacher,
  strength: r.maximumStrength ?? r.strength,
  status: r.isActive === false ? "Inactive" : "Active",
});

export const pageConfig = {
  title: "Section Management",
  subtitle: "Class sections, rooms, class teachers and strength limits.",
  breadcrumb: ["Academics"],
  addLabel: "Add Section",
  rows: data.sections,
  columns: [
    { key: "name", label: "Section Name", strong: true },
    { key: "group", label: "Group" },
    { key: "level", label: "Academic Level" },
    { key: "room", label: "Room Number" },
    { key: "teacher", label: "Class Teacher" },
    { key: "strength", label: "Maximum Strength" },
    { key: "status", label: "Status", badge: true },
  ],
  fields: [
    { name: "board", label: "Board", type: "select", options: o.board, required: true },
    {
      name: "year",
      label: "Academic Year",
      type: "select",
      required: true,
      loadOptions: () => apiClient.get(apiEndpoints.academicYears.getAll),
      getOptions: (res) => {
        cachedYears = nameMap(unwrapList(res.data), ["academicYearId", "id"], ["academicYearName", "name"]);
        return cachedYears.names;
      },
    },
    { name: "group", label: "Group", type: "select", options: o.group, required: true },
    { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
    { name: "name", label: "Section Name", required: true },
    { name: "room", label: "Room Number", required: true },
    {
      name: "teacher",
      label: "Class Teacher",
      type: "select",
      required: true,
      loadOptions: () => apiClient.get(apiEndpoints.faculty.getAll),
      getOptions: (res) => {
        cachedFaculty = nameMap(unwrapList(res.data), ["id", "facultyId"], ["fullName", "name"]);
        return cachedFaculty.names;
      },
    },
    { name: "strength", label: "Maximum Strength", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: o.status, required: true },
  ],
  api: {
    fetchRows: async () => {
      const res = await apiClient.get(apiEndpoints.sections.getAll);
      return unwrapList(res.data).map(mapRow);
    },
    fetchRow: async (id) => {
      const res = await apiClient.get(apiEndpoints.sections.getById(id));
      return mapRow(res.data);
    },
    deleteRow: (id) => apiClient.delete(apiEndpoints.sections.delete(id)),
    saveRow: async (values, id) => {
      const payload = {
        board: values.board,
        academicYearId: cachedYears?.map[values.year] ?? 0,
        group: values.group,
        academicLevel: values.level,
        sectionName: values.name,
        roomNumber: values.room,
        classTeacherId: cachedFaculty?.map[values.teacher] ?? 0,
        maximumStrength: Number(values.strength) || 0,
        isActive: values.status === "Active" || values.status === true,
      };
      if (id) return apiClient.put(apiEndpoints.sections.getById(id), payload);
      return apiClient.post(apiEndpoints.sections.create, payload);
    },
  },
};

export default function SectionManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}