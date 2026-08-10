import * as data from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./StudentManagementPage.css";

const o = data.options;
const MODULE_SLUG = "students";

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const getStudents = () => apiClient.get(apiEndpoints.students.getAll);
const createStudent = (student) => apiClient.post(apiEndpoints.students.create, student);
const getStudentById = (studentId) => apiClient.get(apiEndpoints.students.getById(studentId));
const updateStudent = (studentId, student) => apiClient.put(apiEndpoints.students.update(studentId), student);
const deleteStudent = (studentId) => apiClient.delete(apiEndpoints.students.delete(studentId));
const getStudentProfile = (studentId) => apiClient.get(apiEndpoints.students.getProfile(studentId));
const updateStudentProfile = (studentId, profile) => apiClient.put(apiEndpoints.students.updateProfile(studentId), profile);
const updateStudentSection = (studentId, section) => apiClient.patch(apiEndpoints.students.updateSection(studentId), section);
const updateStudentGroup = (studentId, group) => apiClient.patch(apiEndpoints.students.updateGroup(studentId), group);
const transferStudent = (studentId, transfer) => apiClient.post(apiEndpoints.students.transfer(studentId), transfer);
const suspendStudent = (studentId, data) => apiClient.patch(apiEndpoints.students.suspend(studentId), data);
const activateStudent = (studentId, data) => apiClient.patch(apiEndpoints.students.activate(studentId), data);
const resetStudentPassword = (studentId, data) => apiClient.post(apiEndpoints.students.resetPassword(studentId), data);
const getStudentDashboard = (studentId) => apiClient.get(apiEndpoints.students.getDashboard(studentId));

const studentName = (student) => student.fullName || student.studentName || student.name || [student.firstName, student.lastName].filter(Boolean).join(" ");
const toStudentRow = (student) => ({
  ...student,
  id: student.studentId ?? student.id,
  admissionNo: student.admissionNo ?? student.admissionNumber,
  name: studentName(student),
  roll: student.rollNo ?? student.rollNumber ?? student.roll,
  group: student.groupName ?? student.groupCode ?? student.courseGroup ?? student.group,
  level: student.academicLevelName ?? student.academicLevel ?? student.levelName ?? student.level,
  section: student.sectionName ?? student.sectionCode ?? student.section,
  mobile: student.mobileNumber ?? student.mobile ?? student.phoneNumber,
  father: student.fatherName ?? student.father,
  status: typeof (student.status ?? student.isActive) === "boolean" ? ((student.status ?? student.isActive) ? "Active" : "Inactive") : student.status,
});

export const pageConfig = {
    title: "Student Management",
    subtitle: "Search students, view complete profiles and manage records.",
    breadcrumb: ["People"],
    addLabel: "Add Student",
    rows: [],
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

pageConfig.api = {
  getAll: getStudents,
  create: createStudent,
  getById: getStudentById,
  update: updateStudent,
  delete: deleteStudent,
  getProfile: getStudentProfile,
  updateProfile: updateStudentProfile,
  updateSection: updateStudentSection,
  updateGroup: updateStudentGroup,
  transfer: transferStudent,
  suspend: suspendStudent,
  activate: activateStudent,
  resetPassword: resetStudentPassword,
  getDashboard: getStudentDashboard,
  toRow: toStudentRow,
  toRows: (payload) => extractItems(payload).map(toStudentRow),
  toPayload: (student) => student,
};

export default function StudentManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
