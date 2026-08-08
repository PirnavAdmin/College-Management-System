import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./CourseGroupPage.css";

const o = data.options;
const MODULE_SLUG = "courses";

export const pageConfig = {
    title: "Course / Group Management",
    subtitle: "Manage streams and groups mapped to boards and academic levels.",
    breadcrumb: ["Academics"],
    addLabel: "Add Course",
    rows: data.courses,
    columns: [
      { key: "name", label: "Group Name", strong: true },
      { key: "code", label: "Group Code" },
      { key: "board", label: "Board" },
      { key: "level", label: "Academic Level" },
      { key: "subjects", label: "Total Subjects" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: o.year, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "name", label: "Group Name", required: true },
      { name: "code", label: "Group Code", required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function CourseGroupPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
