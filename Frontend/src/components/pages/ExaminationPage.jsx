import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./ExaminationPage.css";

const o = data.options;
const MODULE_SLUG = "examinations";

export const pageConfig = {
    title: "Examination Management",
    subtitle: "Create examinations and publish subject-wise schedules.",
    breadcrumb: ["Examinations"],
    addLabel: "Create Examination",
    rows: data.examinations,
    columns: [
      { key: "name", label: "Exam Name", strong: true },
      { key: "board", label: "Board" },
      { key: "year", label: "Academic Year" },
      { key: "level", label: "Academic Level" },
      { key: "group", label: "Group" },
      { key: "type", label: "Exam Type" },
      { key: "start", label: "Start Date" },
      { key: "end", label: "End Date" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "name", label: "Exam Name", required: true },
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: o.year, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "type", label: "Exam Type", type: "select", options: o.examType, required: true },
      { name: "start", label: "Start Date", type: "date", required: true },
      { name: "end", label: "End Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
    secondary: {
      title: "Exam Schedule",
      addLabel: "Add Schedule",
      rows: data.examSchedule,
      columns: [
        { key: "subject", label: "Subject", strong: true },
        { key: "date", label: "Date" },
        { key: "time", label: "Time" },
        { key: "hall", label: "Hall" },
        { key: "invigilator", label: "Invigilator" },
        { key: "status", label: "Status", badge: true },
      ],
      fields: [
        { name: "subject", label: "Subject", type: "select", options: o.subject, required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "time", label: "Time", required: true, placeholder: "09:30 - 12:30" },
        { name: "hall", label: "Hall", required: true },
        { name: "invigilator", label: "Invigilator", type: "select", options: o.faculty, required: true },
        { name: "status", label: "Status", type: "select", options: o.status, required: true },
      ],
    },
  };

export default function ExaminationPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
