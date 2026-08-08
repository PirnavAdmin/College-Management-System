import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./SubjectManagementPage.css";

const o = data.options;
const MODULE_SLUG = "subjects";

export const pageConfig = {
    title: "Subject Management",
    subtitle: "Subject master with internal, practical and external mark splits.",
    breadcrumb: ["Academics"],
    addLabel: "Add Subject",
    rows: data.subjects,
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
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "name", label: "Subject Name", required: true },
      { name: "code", label: "Subject Code", required: true },
      { name: "type", label: "Subject Type", type: "select", options: o.subjectType, required: true },
      { name: "theory", label: "Theory", type: "checkbox", placeholder: "Applicable" },
      { name: "practicalFlag", label: "Practical", type: "checkbox", placeholder: "Applicable" },
      { name: "language", label: "Language", type: "checkbox", placeholder: "Language subject" },
      { name: "elective", label: "Elective", type: "checkbox", placeholder: "Elective subject" },
      { name: "internalMarks", label: "Internal Marks", type: "number", required: true },
      { name: "practicalMarks", label: "Practical Marks", type: "number" },
      { name: "externalMarks", label: "External Marks", type: "number", required: true },
      { name: "max", label: "Total Marks", type: "number", required: true },
      { name: "pass", label: "Passing Marks", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function SubjectManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
