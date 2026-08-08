import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./FacultyManagementPage.css";

const o = data.options;
const MODULE_SLUG = "faculty";

export const pageConfig = {
    title: "Faculty Management",
    subtitle: "Faculty master records, credentials and departments.",
    breadcrumb: ["People"],
    addLabel: "Add Faculty",
    rows: data.faculty,
    columns: [
      { key: "empId", label: "Employee ID", strong: true },
      { key: "name", label: "Faculty Name" },
      { key: "mobile", label: "Mobile" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "empId", label: "Employee ID", required: true },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "gender", label: "Gender", type: "select", options: o.gender, required: true },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "aadhaar", label: "Aadhaar Number" },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "bloodGroup", label: "Blood Group", type: "select", options: o.bloodGroup },
      { name: "qualification", label: "Qualification", required: true },
      { name: "designation", label: "Designation", required: true },
      { name: "department", label: "Department", type: "select", options: o.department, required: true },
      { name: "joining", label: "Joining Date", type: "date", required: true },
      { name: "experience", label: "Experience (years)", type: "number" },
      { name: "username", label: "Username", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export const facultySubjectAllocationConfig = {
    title: "Faculty Subject Allocation",
    subtitle: "Map faculty to groups, sections and subjects.",
    breadcrumb: ["People"],
    addLabel: "Allocate Subject",
    rows: data.facultyAllocations,
    columns: [
      { key: "faculty", label: "Faculty", strong: true },
      { key: "board", label: "Board" },
      { key: "year", label: "Academic Year" },
      { key: "group", label: "Group" },
      { key: "level", label: "Academic Level" },
      { key: "section", label: "Section" },
      { key: "subject", label: "Subject" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "faculty", label: "Faculty", type: "select", options: o.faculty, required: true },
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: o.year, required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "level", label: "Academic Level", type: "select", options: o.level, required: true },
      { name: "section", label: "Section", type: "select", options: o.section, required: true },
      { name: "subject", label: "Subject", type: "select", options: o.subject, required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function FacultyManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
