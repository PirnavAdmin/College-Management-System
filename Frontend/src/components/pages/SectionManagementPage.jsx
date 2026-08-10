import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./SectionManagementPage.css";

const o = data.options;
const MODULE_SLUG = "sections";

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
      { name: "year", label: "Academic Year", type: "select", options: o.year, required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "name", label: "Section Name", required: true },
      { name: "room", label: "Room Number", required: true },
      { name: "teacher", label: "Class Teacher", type: "select", options: o.faculty, required: true },
      { name: "strength", label: "Maximum Strength", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
    api: {
      getAll: () => apiClient.get(apiEndpoints.sections.getAll),
      getById: (sectionId) => apiClient.get(apiEndpoints.sections.getById(sectionId)),
      delete: (sectionId) => apiClient.delete(apiEndpoints.sections.delete(sectionId)),
     mapRow: (r) => ({
        id: r.sectionId ?? r.id,
        name: r.sectionName ?? r.name,
        group: r.group ?? r.groupName ?? r.group,
        level: r.academicLevel ?? r.academicLevelName ?? r.level,
        room: r.roomNumber ?? r.room,
        teacher: r.classTeacherName ?? r.teacher,
        strength: r.maximumStrength ?? r.maxStrength ?? r.strength,
        status: r.isActive === false ? "Inactive" : "Active",
      }),
    },
  };

export default function SectionManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}