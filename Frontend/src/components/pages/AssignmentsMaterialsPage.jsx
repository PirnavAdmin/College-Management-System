import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./AssignmentsMaterialsPage.css";

const o = data.options;
const MODULE_SLUG = "assignments";

export const pageConfig = {
    title: "Assignment & Study Materials",
    subtitle: "Publish assignments, attachments and due dates.",
    breadcrumb: ["Operations"],
    addLabel: "Create Assignment",
    rows: data.assignments,
    columns: [
      { key: "title", label: "Title", strong: true },
      { key: "subject", label: "Subject" },
      { key: "faculty", label: "Faculty" },
      { key: "due", label: "Due Date" },
      { key: "max", label: "Maximum Marks" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "subject", label: "Subject", type: "select", options: o.subject, required: true },
      { name: "faculty", label: "Faculty", type: "select", options: o.faculty, required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "due", label: "Due Date", type: "date", required: true },
      { name: "attachment", label: "Attachment", type: "file" },
      { name: "max", label: "Maximum Marks", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function AssignmentsMaterialsPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
