import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./StudentManagementPage.css";

const MODULE_SLUG = "students";

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const getStudents = (params) => apiClient.get(apiEndpoints.students.getAll, { params });
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
const searchStudents = (params) => apiClient.get(apiEndpoints.students.search, { params });
const getActiveStudents = () => apiClient.get(apiEndpoints.students.getActive);
const getStudentsByGroup = (groupId) => apiClient.get(apiEndpoints.students.getByGroup(groupId));
const getStudentsBySection = (sectionId) => apiClient.get(apiEndpoints.students.getBySection(sectionId));
const checkStudentEmail = (params) => apiClient.get(apiEndpoints.students.checkEmail, { params });
const checkStudentMobile = (params) => apiClient.get(apiEndpoints.students.checkMobile, { params });
const getGroups = () => apiClient.get(apiEndpoints.groups.getAll, { params: { isActive: true } });
const getAcademicLevels = () => apiClient.get(apiEndpoints.boards.getAcademicLevels);
const getSections = () => apiClient.get(apiEndpoints.sections.getAll);

const studentName = (student) => student.fullName || student.studentName || student.name || [student.firstName, student.lastName].filter(Boolean).join(" ");
const option = (item, idKeys, labelKeys) => {
  const value = idKeys.map((key) => item?.[key]).find((itemId) => itemId !== undefined && itemId !== null && itemId !== "");
  const label = labelKeys.map((key) => item?.[key]).find(Boolean);
  return value !== undefined && label ? { value: String(value), label: String(label) } : null;
};
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
  groupId: student.groupId,
  sectionId: student.sectionId,
});

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
  if (filters.group && String(row.groupId) !== String(filters.group)) return false;
  if (filters.section && String(row.sectionId) !== String(filters.section)) return false;
  return !filters.status || row.status === filters.status;
};

export const pageConfig = {
    title: "Student Management",
    subtitle: "Search students, view complete profiles and manage records.",
    breadcrumb: ["People"],
    allowAdd: false,
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
    filters: [
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, getOptions: (response) => extractItems(response.data).filter((group) => group.isActive !== false).map((group) => option(group, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"])).filter(Boolean) },
      { name: "section", label: "Section", type: "select", options: [], loadOptions: getSections, getOptions: (response) => extractItems(response.data).filter((section) => section.isActive !== false).map((section) => option(section, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "sectionCode", "SectionCode", "name", "Name"])).filter(Boolean) },
      { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    fields: [
      { name: "admissionNo", label: "Admission Number", required: true },
      { name: "name", label: "Student Name", required: true },
      { name: "roll", label: "Roll Number", required: true },
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, required: true },
      { name: "level", label: "Academic Level", type: "select", options: [], loadOptions: getAcademicLevels, required: true },
      { name: "section", label: "Section", type: "select", options: [], loadOptions: getSections, required: true },
      { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { name: "father", label: "Father Name", required: true },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    ],
  };

pageConfig.api = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    let response;
    if (filters.status === "Active" && !search && !filters.group && !filters.section) response = await getActiveStudents();
    else if (filters.group && !search && !filters.section) response = await getStudentsByGroup(filters.group);
    else if (filters.section && !search && !filters.group) response = await getStudentsBySection(filters.section);
    else if (search || filters.group || filters.section || filters.status) response = await searchStudents({ search: search || undefined, groupId: filters.group || undefined, sectionId: filters.section || undefined, isActive: filters.status ? filters.status === "Active" : undefined });
    else response = await getStudents();
    return extractItems(response.data).map(toStudentRow).filter((row) => row.id !== undefined).filter((row) => matchesFilters(row, search, filters));
  },
  fetchRow: async (studentId) => {
    const response = await getStudentById(studentId);
    return response.data?.data || response.data;
  },
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
  search: searchStudents,
  getActive: getActiveStudents,
  getByGroup: getStudentsByGroup,
  getBySection: getStudentsBySection,
  checkEmail: checkStudentEmail,
  checkMobile: checkStudentMobile,
  toRow: toStudentRow,
  toRows: (payload) => extractItems(payload).map(toStudentRow),
  toPayload: (student) => student,
};

pageConfig.fields.find((field) => field.name === "group").getOptions = (response) => extractItems(response.data)
  .filter((group) => group.isActive !== false)
  .map((group) => option(group, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]))
  .filter(Boolean);
pageConfig.fields.find((field) => field.name === "level").getOptions = (response) => extractItems(response.data)
  .map((level) => option(level, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"], ["levelName", "LevelName", "academicLevel", "AcademicLevel", "name", "Name"]))
  .filter(Boolean);
pageConfig.fields.find((field) => field.name === "section").getOptions = (response) => extractItems(response.data)
  .filter((section) => section.isActive !== false)
  .map((section) => option(section, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "sectionCode", "SectionCode", "name", "Name"]))
  .filter(Boolean);

export default function StudentManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
