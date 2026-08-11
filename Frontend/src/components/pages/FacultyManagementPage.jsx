import * as data from "@/data/mockData.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./FacultyManagementPage.css";

const o = data.options;
const MODULE_SLUG = "faculty";

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.Items)) return payload.data.Items;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  return [];
};

const getFaculty = () => apiClient.get(apiEndpoints.faculty.getAll);
const createFaculty = (faculty) => apiClient.post(apiEndpoints.faculty.create, faculty);
const getFacultyById = (id) => apiClient.get(apiEndpoints.faculty.getById(id));
const updateFaculty = (id, faculty) => apiClient.put(apiEndpoints.faculty.update(id), faculty);
const deleteFaculty = (id) => apiClient.delete(apiEndpoints.faculty.delete(id));
const uploadFacultyPhoto = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post(apiEndpoints.faculty.uploadPhoto, formData, { headers: { "Content-Type": "multipart/form-data" } });
};
const getFacultyPhoto = (id) => apiClient.get(apiEndpoints.faculty.getPhoto(id), { responseType: "blob" });
const assignSubject = (assignment) => apiClient.post(apiEndpoints.faculty.assignSubject, assignment);
const updateSubjectAssignment = (id, assignment) => apiClient.put(apiEndpoints.faculty.updateSubjectAssignment(id), assignment);
const deleteSubjectAssignment = (id) => apiClient.delete(apiEndpoints.faculty.deleteSubjectAssignment(id));
const getFacultyWorkload = (facultyId) => apiClient.get(apiEndpoints.faculty.getWorkload(facultyId));

const getBoards = () => apiClient.get(apiEndpoints.boards.getAll);
const getGroups = () => apiClient.get(apiEndpoints.groups.getAll, { params: { pageNumber: 1, pageSize: 20 } });
const getAcademicLevels = () => apiClient.get(apiEndpoints.boards.getAcademicLevels);
const getSubjects = () => apiClient.get(apiEndpoints.subjects.getAll);
const getDepartments = () => apiClient.get(apiEndpoints.departments.getAll);
const getAcademicYears = () => apiClient.get(apiEndpoints.academicYears.getAll);
const getSections = () => apiClient.get(apiEndpoints.sections.getAll);

const extractAllocations = (payload) => {
  const dataNode = payload?.data ?? payload?.Data ?? payload;
  return extractItems(
    dataNode?.allocations
    ?? dataNode?.Allocations
    ?? dataNode?.facultyAllocations
    ?? dataNode?.FacultyAllocations
    ?? dataNode?.subjectAllocations
    ?? dataNode?.SubjectAllocations
    ?? dataNode?.subjectAssignments
    ?? dataNode?.SubjectAssignments
    ?? dataNode?.teachingAssignments
    ?? dataNode?.TeachingAssignments
    ?? dataNode?.assignedSubjects
    ?? dataNode?.AssignedSubjects
    ?? dataNode?.assignments
    ?? dataNode?.Assignments
    ?? dataNode?.data
    ?? dataNode?.Data
    ?? dataNode,
  );
};

const getFacultyAllocations = async () => {
  const facultyResponse = await getFaculty();
  const faculty = extractItems(facultyResponse.data);
  const workloads = await Promise.all(faculty.map(async (item) => {
    const response = await getFacultyWorkload(item.facultyId ?? item.id);
    return extractAllocations(response.data).map((allocation) => ({
      ...allocation,
      facultyName: allocation.facultyName ?? facultyName(item),
      facultyId: allocation.facultyId ?? item.facultyId ?? item.id,
    }));
  }));
  return { data: workloads.flat() };
};

const pageConfig = {
    title: "Faculty Management",
    subtitle: "Faculty master records, credentials and departments.",
    breadcrumb: ["People"],
    addLabel: "Add Faculty",
    rows: [],
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
      { name: "gender", label: "Gender", type: "select", options: [], loadOptions: getFaculty, required: true },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "aadhaar", label: "Aadhaar Number" },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "bloodGroup", label: "Blood Group" },
      { name: "qualification", label: "Qualification", required: true },
      { name: "designation", label: "Designation", required: true },
      { name: "department", label: "Department", type: "select", options: [], loadOptions: getDepartments, required: true },
      { name: "joining", label: "Joining Date", type: "date", required: true },
      { name: "experience", label: "Experience (years)", type: "number" },
      { name: "username", label: "Username", required: true },
      { name: "password", label: "Password", type: "password", required: true },
    ],
  };

const facultySubjectAllocationConfig = {
    title: "Faculty Subject Allocation",
    subtitle: "Map faculty to groups, sections and subjects.",
    breadcrumb: ["People"],
    addLabel: "Allocate Subject",
    rows: [],
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
      { name: "facultyId", label: "Faculty", type: "select", options: [], loadOptions: getFaculty, required: true },
      { name: "board", label: "Board", type: "select", options: [], loadOptions: getBoards, required: true },
      { name: "academicYear", label: "Academic Year", type: "select", options: [], loadOptions: getAcademicYears, required: true },
      { name: "group", label: "Group", type: "select", options: [], loadOptions: getGroups, required: true },
      { name: "academicLevel", label: "Academic Level", type: "select", options: [], loadOptions: getAcademicLevels, required: true },
      { name: "section", label: "Section", type: "select", options: [], loadOptions: getSections, required: true },
      { name: "subject", label: "Subject", type: "select", options: [], loadOptions: getSubjects, required: true },
    ],
  };

const facultyName = (faculty) => faculty.fullName || faculty.name || [faculty.firstName, faculty.lastName].filter(Boolean).join(" ");
const toFacultyRow = (faculty) => ({
  ...faculty,
  id: faculty.facultyId ?? faculty.id,
  empId: faculty.employeeId ?? faculty.employeeCode ?? faculty.empId,
  dob: faculty.dateOfBirth ?? faculty.dob,
  joining: faculty.joiningDate ?? faculty.joining,
  name: facultyName(faculty),
  mobile: faculty.mobile ?? faculty.phoneNumber,
  status: typeof faculty.status === "boolean" ? (faculty.status ? "Active" : "Inactive") : faculty.status,
});

const toFacultyPayload = (faculty) => ({
  employeeId: faculty.empId,
  firstName: faculty.firstName,
  lastName: faculty.lastName,
  gender: faculty.gender,
  dateOfBirth: faculty.dob,
  aadhaar: faculty.aadhaar,
  mobile: faculty.mobile,
  email: faculty.email,
  bloodGroup: faculty.bloodGroup,
  qualification: faculty.qualification,
  designation: faculty.designation,
  department: faculty.department,
  joiningDate: faculty.joining,
  experience: Number(faculty.experience) || 0,
  username: faculty.username,
  password: faculty.password,
  status: faculty.status || "Active",
});
const toAssignmentRow = (assignment) => ({
  ...assignment,
  id: assignment.assignmentId ?? assignment.id,
  faculty: assignment.facultyName ?? assignment.faculty?.fullName ?? assignment.faculty,
  year: assignment.academicYearName ?? assignment.academicYear ?? assignment.year,
  group: assignment.groupName ?? assignment.group,
  level: assignment.academicLevelName ?? assignment.academicLevel ?? assignment.level,
  section: assignment.sectionName ?? assignment.section,
  subject: assignment.subjectName ?? assignment.subject,
  status: assignment.status || "Active",
});

const toAssignmentPayload = (assignment) => ({
  facultyId: Number(assignment.facultyId),
  board: assignment.board,
  academicYear: assignment.academicYear,
  group: assignment.group,
  academicLevel: assignment.academicLevel,
  section: assignment.section,
  subject: assignment.subject,
});

pageConfig.api = {
  getAll: getFaculty,
  create: createFaculty,
  getById: getFacultyById,
  update: updateFaculty,
  delete: deleteFaculty,
  uploadPhoto: uploadFacultyPhoto,
  getPhoto: getFacultyPhoto,
  getWorkload: getFacultyWorkload,
  toRow: toFacultyRow,
  toRows: (payload) => extractItems(payload).map(toFacultyRow),
  toPayload: toFacultyPayload,
};

facultySubjectAllocationConfig.api = {
  getAll: getFacultyAllocations,
  create: assignSubject,
  update: updateSubjectAssignment,
  delete: deleteSubjectAssignment,
  toRow: toAssignmentRow,
  toRows: (payload) => extractItems(payload).map(toAssignmentRow),
  toPayload: toAssignmentPayload,
};

facultySubjectAllocationConfig.fields.find((field) => field.name === "facultyId").getOptions = (response) => extractItems(response.data)
  .map((faculty) => ({ value: faculty.facultyId ?? faculty.id, label: facultyName(faculty) }))
  .filter((faculty) => faculty.value != null && faculty.label);
facultySubjectAllocationConfig.fields.find((field) => field.name === "board").getOptions = (response) => extractItems(response.data).map((board) => board.boardCode || board.boardName).filter(Boolean);
facultySubjectAllocationConfig.fields.find((field) => field.name === "academicYear").getOptions = (response) => extractItems(response.data)
  .map((year) => year.academicYearName)
  .filter(Boolean);
facultySubjectAllocationConfig.fields.find((field) => field.name === "group").getOptions = (response) => extractItems(response.data).map((group) => group.groupCode || group.groupName).filter(Boolean);
facultySubjectAllocationConfig.fields.find((field) => field.name === "academicLevel").getOptions = (response) => extractItems(response.data).map((level) => level.levelName).filter(Boolean);
facultySubjectAllocationConfig.fields.find((field) => field.name === "section").getOptions = (response) => extractItems(response.data)
  .map((section) => section.sectionName || section.name)
  .filter(Boolean);
facultySubjectAllocationConfig.fields.find((field) => field.name === "subject").getOptions = (response) => extractItems(response.data).map((subject) => subject.subjectName || subject.name).filter(Boolean);
pageConfig.fields.find((field) => field.name === "gender").getOptions = (response) => [...new Set(extractItems(response.data).map((faculty) => faculty.gender).filter(Boolean))];
pageConfig.fields.find((field) => field.name === "department").getOptions = (response) => extractItems(response.data)
  .filter((department) => department.isActive !== false)
  .map((department) => department.departmentName || department.departmentCode)
  .filter(Boolean);

export default function FacultyManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}

FacultyManagementPage.pageConfig = pageConfig;
FacultyManagementPage.facultySubjectAllocationConfig = facultySubjectAllocationConfig;
