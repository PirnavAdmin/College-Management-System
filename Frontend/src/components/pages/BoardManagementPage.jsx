import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./BoardManagementPage.css";

const o = data.options;
const MODULE_SLUG = "boards";

export const pageConfig = {
    title: "Board Management",
    subtitle: "Configure examination boards, academic patterns and grading rules.",
    breadcrumb: ["Academics"],
    addLabel: "Add Board",
    rows: data.boards,
    columns: [
      { key: "name", label: "Board Name", strong: true },
      { key: "code", label: "Board Code" },
      { key: "country", label: "Country" },
      { key: "state", label: "State" },
      { key: "structure", label: "Academic Structure" },
      { key: "status", label: "Status", badge: true },
      { key: "created", label: "Created Date" },
    ],
    fields: [
      { name: "name", label: "Board Name", required: true },
      { name: "code", label: "Board Code", required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "country", label: "Country", type: "select", options: ["India", "Nepal", "Sri Lanka"], required: true },
      { name: "state", label: "State", type: "select", options: ["Delhi", "Andhra Pradesh", "Telangana", "Maharashtra", "Karnataka", "West Bengal"], required: true },
      { name: "pattern", label: "Academic Pattern", type: "select", options: ["Annual", "Semester", "Trimester"], required: true },
      { name: "structure", label: "Academic Levels", type: "select", options: ["Intermediate", "10+2", "PUC", "Higher Secondary"], required: true },
      { name: "internal", label: "Internal Assessment", type: "checkbox", placeholder: "Enabled" },
      { name: "practical", label: "Practical Exams", type: "checkbox", placeholder: "Enabled" },
      { name: "boardExams", label: "Board Exams", type: "checkbox", placeholder: "Enabled" },
      { name: "passPercentage", label: "Pass Percentage", type: "number", required: true },
      { name: "grading", label: "Grading System", type: "select", options: ["Percentage", "Grade Points", "CGPA"], required: true },
      { name: "rank", label: "Rank Calculation", type: "select", options: ["Total Marks", "Percentage", "Grade Points"] },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function BoardManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
