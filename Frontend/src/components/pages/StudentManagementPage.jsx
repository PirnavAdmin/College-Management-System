import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./StudentManagementPage.css";

const o = data.options;
const MODULE_SLUG = "students";

export const pageConfig = {
    title: "Student Management",
    subtitle: "Search students, view complete profiles and manage records.",
    breadcrumb: ["People"],
    addLabel: "Add Student",
    rows: data.students,
    columns: [
      { key: "admissionNo", label: "Admission No", strong: true },
      { key: "name", label: "Student Name" },
      { key: "roll", label: "Roll Number" },
      { key: "group", label: "Group" },
      { key: "level", label: "Academic Level" },
      { key: "section", label: "Section" },
      { key: "mobile", label: "Mobile" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "admissionNo", label: "Admission Number", required: true },
      { name: "name", label: "Student Name", required: true },
      { name: "roll", label: "Roll Number", required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "section", label: "Section", type: "select", options: ["A", "B", "C"], required: true },
      { name: "gender", label: "Gender", type: "select", options: o.gender, required: true },
      { name: "father", label: "Father Name", required: true },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function StudentManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
