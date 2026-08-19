import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import { students as mockStudents } from "@/data/mockData.js";
import "./StudentManagementPage.css";

const MODULE_SLUG = "students";

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  // API modules do not all use the same collection wrapper. In particular,
  // admissions may be returned in `results` or in an ASP.NET `$values` list.
  for (const key of ["$values", "items", "Items", "results", "Results", "records", "Records", "data", "Data"]) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.[key]?.$values)) return data[key].$values;
    if (Array.isArray(data?.[key]?.items)) return data[key].items;
  }
  return [];
};

const getStudents = (params) => apiClient.get(apiEndpoints.students.getAll, { params });
const getAdmissions = () => apiClient.get(apiEndpoints.admissions.getAll);
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
const valueOf = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const admissionNumber = (record) => String(valueOf(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim();
const isApprovedAdmission = (admission) => {
  const approved = valueOf(admission, "isApproved", "IsApproved");
  if (approved === true || String(approved).trim().toLowerCase() === "true") return true;
  return ["approved", "active", "completed", "complete"]
    .includes(String(valueOf(admission, "status", "Status", "admissionStatus", "AdmissionStatus") ?? "").trim().toLowerCase());
};
const storedAdmissions = () => {
  try {
    const records = JSON.parse(window.localStorage.getItem("studentAdmissionRecords") || "[]");
    return Array.isArray(records) ? records.map((record) => ({
      ...(record.raw || {}),
      ...(record.values || {}),
      admissionId: record.admissionId || record.raw?.admissionId,
      admissionNo: record.admissionNo || record.values?.admissionNo,
      status: record.status,
    })) : [];
  } catch {
    return [];
  }
};
const option = (item, idKeys, labelKeys) => {
  const value = idKeys.map((key) => item?.[key]).find((itemId) => itemId !== undefined && itemId !== null && itemId !== "");
  const label = labelKeys.map((key) => item?.[key]).find(Boolean);
  return value !== undefined && label ? { value: String(value), label: String(label) } : null;
};
const toStudentRow = (student) => ({
  ...student,
  id: valueOf(student, "studentId", "StudentId", "admissionId", "AdmissionId", "id", "Id"),
  admissionNo: admissionNumber(student),
  name: studentName(student),
  roll: student.rollNo ?? student.rollNumber ?? student.roll,
  group: student.groupName ?? student.groupCode ?? student.courseGroup ?? student.group,
  level: student.academicLevelName ?? student.academicLevel ?? student.levelName ?? student.level,
  section: student.sectionName ?? student.sectionCode ?? student.section,
  mobile: student.mobileNumber ?? student.mobile ?? student.phoneNumber,
  father: student.fatherName ?? student.father,
  status: typeof (student.status ?? student.isActive) === "boolean" ? ((student.status ?? student.isActive) ? "Active" : "Inactive") : (student.status ?? (student.isActive ? "Active" : "Inactive")),
  groupId: valueOf(student, "groupId", "GroupId"),
  sectionId: valueOf(student, "sectionId", "SectionId"),
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
    const [studentsResult, admissionsResult] = await Promise.allSettled([getStudents(), getAdmissions()]);
    const students = studentsResult.status === "fulfilled" ? extractItems(studentsResult.value.data) : [];
    const apiAdmissions = admissionsResult.status === "fulfilled" ? extractItems(admissionsResult.value.data) : [];
    const localAdmissions = storedAdmissions();
    // If the backend has not persisted an admission yet, keep the locally completed
    // Admission-page records visible until the server becomes the source of truth.
    const admissions = [...apiAdmissions, ...localAdmissions];
    // Keep the API record when a browser-local fallback has the same admission
    // number. A stale local Pending record must not hide a server Approved one.
    const admissionsByAdmissionNo = admissions.reduce((byAdmissionNo, admission) => {
      const number = admissionNumber(admission);
      if (number && !byAdmissionNo.has(number)) byAdmissionNo.set(number, admission);
      return byAdmissionNo;
    }, new Map());
    const approvedByAdmissionNo = new Map(
      [...admissionsByAdmissionNo.values()]
        .filter(isApprovedAdmission)
        .map((admission) => [admissionNumber(admission), admission]),
    );

    const apiRows = [...approvedByAdmissionNo.values()]
      .map((admission) => {
        const student = students.find((item) => admissionNumber(item) === admissionNumber(admission));
        return { ...admission, ...student };
      })
      .map(toStudentRow)
      .filter((row) => row.id !== undefined);
    const rows = apiRows.length ? apiRows : mockStudents.map(toStudentRow);
    return rows.filter((row) => matchesFilters(row, search, filters));
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
