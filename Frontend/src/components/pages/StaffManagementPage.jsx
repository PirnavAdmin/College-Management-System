import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Eye,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import {
  ConfirmDialog,
  Field,
  StatusBadge,
  Toast,
  useForm,
} from "@/components/common/Ui.jsx";
import "./StaffManagementPage.css";

const STAFF_API = {
  list: "/api/v1/staff",
  create: "/api/v1/staff",
  nextEmployeeId: "/api/v1/staff/next-employee-id",
  dropdown: "/api/v1/staff/dropdown",
  getById: (id) => `/api/v1/staff/${encodeURIComponent(id)}`,
  update: (id) => `/api/v1/staff/${encodeURIComponent(id)}`,
  delete: (id) => `/api/v1/staff/${encodeURIComponent(id)}`,
  uploadPhoto: "/api/v1/staff/upload-photo",
  photo: (id) => `/api/v1/staff/photo/${encodeURIComponent(id)}`,
  assignSubject: "/api/v1/staff/assign-subject",
  updateSubjectAllocation: (id) => `/api/v1/staff/assign-subject/${encodeURIComponent(id)}`,
  deleteSubjectAllocation: (id) => `/api/v1/staff/assign-subject/${encodeURIComponent(id)}`,
  subjectAllocations: (staffId) => `/api/v1/staff/${encodeURIComponent(staffId)}/subject-allocations`,
  workload: (staffId) => `/api/v1/staff/workload/${encodeURIComponent(staffId)}`,
};

const API_STAFF_TYPES = { teaching: "Teaching", "non-teaching": "NonTeaching" };
const STAFF_PAGE_SIZE = 5;
const STAFF_BOARD_STORAGE_KEY = "pjc-staff-board-names";
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const fields = [
  { name: "empId", label: "Employee ID", required: true },
  { name: "firstName", label: "First Name", required: true },
  { name: "lastName", label: "Last Name", required: true },
  { name: "gender", label: "Gender", type: "select", options: [], required: true },
  { name: "dob", label: "Date of Birth", type: "date", required: true },
  { name: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD_GROUP_OPTIONS, required: true },
  { name: "mobile", label: "Mobile", type: "tel", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "aadhaar", label: "Aadhaar Number" },
  { name: "qualification", label: "Qualification", required: true },
  { name: "facultyType", label: "Staff Category", type: "select", options: ["Teaching Staff", "Non-Teaching Staff"], required: true },
  { name: "boardName", label: "Board Name", type: "select", options: [], required: true },
  { name: "department", label: "Department", type: "select", options: [], required: true },
  { name: "designation", label: "Designation", type: "select", options: [], required: true },
  { name: "joining", label: "Joining Date", type: "date", required: true },
  { name: "experience", label: "Experience (Years)", type: "number" },
  { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
];
const extractItems = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.$values ||
      payload?.items ||
      payload?.Items ||
      payload?.results ||
      payload?.Results ||
      payload?.value ||
      payload?.Value ||
      payload?.data?.$values ||
      payload?.data?.items ||
      payload?.data?.Items ||
      payload?.data?.results ||
      payload?.data?.Results ||
      payload?.data?.value ||
      payload?.data?.Value ||
      payload?.data ||
      [];
const extractRecord = (payload) => payload?.data ?? payload?.Data ?? payload;
const boardOptionsFrom = (payload) => extractItems(payload).map((board) => {
  const status = firstValue(board, "status", "Status", "isActive", "IsActive");
  return {
    id: firstValue(board, "boardId", "BoardId", "id", "Id"),
    name: String(firstValue(board, "boardName", "BoardName", "name", "Name") || "").trim(),
    active: status == null || status === true || ["true", "active"].includes(String(status).toLowerCase()),
  };
}).filter((board) => board.name);
const facultyName = (item = {}) =>
  item?.fullName || item?.name || [item?.firstName, item?.lastName].filter(Boolean).join(" ") || "—";
const dateOnly = (date) => (date ? String(date).split("T")[0] : "");
const getCrudId = (item = {}) => item.id ?? item.Id;
const getStaffId = (item = {}) => item.staffId ?? item.StaffId;
const getFacultyId = (item = {}) => item.facultyId ?? item.FacultyId;
const firstValue = (item = {}, ...keys) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "") ??
  Object.entries(item || {}).find(([key, value]) =>
    keys.some((expected) => key.toLowerCase() === expected.toLowerCase()) &&
    value !== undefined && value !== null && value !== "",
  )?.[1];
const lookupValue = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== "object") return value;
  return firstValue(
    value,
    "name", "Name", "value", "Value",
    "boardName", "BoardName",
    "bloodGroup", "BloodGroup", "bloodType", "BloodType",
    "bloodGroupName", "BloodGroupName", "bloodTypeName", "BloodTypeName",
    "displayName", "DisplayName", "facultyTypeName", "FacultyTypeName", "typeName", "TypeName",
  ) ?? "";
};
const normalizeStaffType = (value) => {
  const normalized = String(lookupValue(value) ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "teaching" || normalized === "teachingstaff") return "Teaching Staff";
  if (normalized === "nonteaching" || normalized === "nonteachingstaff") return "Non-Teaching Staff";
  return lookupValue(value) ?? "";
};
const staffBoardKeys = (item = {}) => [
  getCrudId(item),
  getStaffId(item),
  getFacultyId(item),
  firstValue(item, "employeeId", "EmployeeId", "employeeCode", "EmployeeCode", "empId", "EmpId"),
].filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map(String);
const savedStaffBoardName = (item = {}) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STAFF_BOARD_STORAGE_KEY) || "{}");
    return staffBoardKeys(item).map((key) => saved[key]).find(Boolean) || "";
  } catch {
    return "";
  }
};
const rememberStaffBoardName = (item = {}, boardName = "") => {
  const name = String(boardName || "").trim();
  const keys = staffBoardKeys(item);
  if (!name || !keys.length) return;
  try {
    const saved = JSON.parse(localStorage.getItem(STAFF_BOARD_STORAGE_KEY) || "{}");
    keys.forEach((key) => { saved[key] = name; });
    localStorage.setItem(STAFF_BOARD_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // The API payload still carries BoardId and BoardName if storage is unavailable.
  }
};
const facultyTypeValue = (item = {}) => {
  const value = firstValue(item, "staffType", "StaffType");
  return normalizeStaffType(value);
};
const toApiStaffType = (value) => {
  const normalized = normalizeStaffType(value);
  return normalized === "Non-Teaching Staff" ? API_STAFF_TYPES["non-teaching"] : API_STAFF_TYPES.teaching;
};
const employeeIdPrefix = (staffType) => normalizeStaffType(staffType) === "Non-Teaching Staff" ? "PCNTCH" : "PCTCH";
const employeeIdFromServerSequence = (payload, staffType) => {
  const record = extractRecord(payload);
  const serverEmployeeId = typeof record === "string" || typeof record === "number"
    ? record
    : firstValue(record, "employeeId", "EmployeeId", "nextEmployeeId", "NextEmployeeId", "value", "Value");
  const sequence = String(serverEmployeeId ?? "").trim().match(/(\d+)$/)?.[1];
  if (!sequence) return "";
  return `${employeeIdPrefix(staffType)}${sequence.padStart(4, "0")}`;
};
const employeeIdFromStaffItems = (payload, staffType) => {
  const prefix = employeeIdPrefix(staffType);
  const highestSequence = extractItems(payload).reduce((highest, item) => {
    const employeeId = firstValue(item, "employeeId", "EmployeeId", "employeeCode", "EmployeeCode", "empId", "EmpId");
    const normalizedEmployeeId = String(employeeId ?? "").trim().toUpperCase();
    const sequence = normalizedEmployeeId.startsWith(prefix) ? normalizedEmployeeId.match(/(\d+)$/)?.[1] : null;
    return sequence ? Math.max(highest, Number(sequence) || 0) : highest;
  }, 0);
  return `${prefix}${String(highestSequence + 1).padStart(4, "0")}`;
};
const safestEmployeeId = (staffType, ...candidates) => {
  const prefix = employeeIdPrefix(staffType);
  const highestSequence = candidates.reduce((highest, candidate) => {
    const normalized = String(candidate || "").trim().toUpperCase();
    if (!normalized.startsWith(prefix)) return highest;
    return Math.max(highest, Number(normalized.match(/(\d+)$/)?.[1]) || 0);
  }, 0);
  return highestSequence ? `${prefix}${String(highestSequence).padStart(4, "0")}` : "";
};
const normalizeStaffPage = (payload) => {
  const source = payload?.data ?? payload?.Data ?? payload ?? {};
  const items = Array.isArray(source.items ?? source.Items) ? source.items ?? source.Items : [];
  return {
    items,
    totalCount: Number(source.totalCount ?? source.TotalCount ?? 0) || 0,
    pageNumber: Number(source.pageNumber ?? source.PageNumber ?? 1) || 1,
    pageSize: Number(source.pageSize ?? source.PageSize ?? STAFF_PAGE_SIZE) || STAFF_PAGE_SIZE,
    totalPages: Math.max(1, Number(source.totalPages ?? source.TotalPages ?? 1) || 1),
  };
};
const subjectId = (item = {}) => item.subjectId ?? item.id ?? item.SubjectId ?? item.Id;
const subjectName = (item = {}) =>
  firstValue(item, "subjectDisplayName", "SubjectDisplayName", "subjectName", "SubjectName", "name", "Name")
  || firstValue(item.subject || item.Subject, "subjectDisplayName", "SubjectDisplayName", "subjectName", "SubjectName", "name", "Name")
  || "Unnamed subject";
const allocationSubjectId = (item = {}) =>
  item.subjectId ?? item.SubjectId ?? item.subject?.subjectId ?? item.subject?.id ?? item.Subject?.SubjectId ?? item.Subject?.Id;
const allocationId = (item = {}) =>
  item.assignmentId ?? item.allocationId ?? item.id ?? item.AssignmentId ?? item.AllocationId;
const buildSubjectAllocationPayload = (staff, subject) => {
  const staffId = Number(getStaffId(staff));
  const selectedSubjectId = Number(subjectId(subject));
  const academicYearId = Number(firstValue(subject, "academicYearId", "AcademicYearId"));
  const maxWeeklyHours = Number(firstValue(subject, "maxWeeklyHours", "MaxWeeklyHours", "weeklyHours", "WeeklyHours"));
  return {
    staffId,
    subjectId: selectedSubjectId,
    academicYearId,
    maxWeeklyHours,
  };
};
const validateSubjectAllocationPayload = (payload) => {
  if (!Number.isInteger(payload.staffId) || payload.staffId <= 0) return "The Staff API did not return the StaffId required for subject allocation.";
  if (!Number.isInteger(payload.subjectId) || payload.subjectId <= 0) return "The selected subject does not have a valid SubjectId.";
  if (!Number.isInteger(payload.academicYearId) || payload.academicYearId <= 0) return "The selected subject does not provide the required AcademicYearId.";
  if (!Number.isFinite(payload.maxWeeklyHours) || payload.maxWeeklyHours < 0) return "The selected subject does not provide valid maximum weekly hours.";
  return "";
};
const allocationItems = (payload) => {
  const data = extractRecord(payload) ?? {};
  return extractItems(
    data.allocations
      ?? data.Allocations
      ?? data.subjectAssignments
      ?? data.SubjectAssignments
      ?? data.assignedSubjects
      ?? data.AssignedSubjects
      ?? data,
  );
};
const workloadTotals = (payload) => {
  const data = extractRecord(payload) || {};
  return {
    subjects: Number(firstValue(data, "totalAssignedSubjects", "TotalAssignedSubjects")) || 0,
    sections: Number(firstValue(data, "totalSections", "TotalSections")) || 0,
    classes: Number(firstValue(data, "weeklyClasses", "WeeklyClasses")) || 0,
    hours: Number(firstValue(data, "totalWorkloadHours", "TotalWorkloadHours")) || 0,
  };
};
const assignedSubjectNames = (payload) => [...new Set(
  allocationItems(payload)
    .map((allocation) => subjectName(allocation))
    .filter((name) => name && name !== "Unnamed subject"),
)];
const sharedPayloadFor = (values) => ({
  firstName: values.firstName,
  lastName: values.lastName,
  gender: values.gender,
  dateOfBirth: values.dob,
  aadhaar: values.aadhaar,
  mobile: values.mobile,
  email: values.email,
  bloodGroup: values.bloodGroup,
  qualification: values.qualification,
  designation: values.designation,
  ...(values.designationId ? { designationId: Number(values.designationId) } : {}),
  staffType: toApiStaffType(values.facultyType),
  department: values.department,
  ...(values.departmentId ? { departmentId: Number(values.departmentId) } : {}),
  ...(values.boardId ? { boardId: Number(values.boardId) } : {}),
  ...(values.boardName ? { boardName: values.boardName } : {}),
  ...(values.boardName ? { board: values.boardName } : {}),
  joiningDate: values.joining,
  experience: Number(values.experience) || 0,
  status: values.status || "Active",
  ...(values.photoPath ? { photoPath: values.photoPath } : {}),
});
const buildCreatePayload = (values) => ({ employeeId: values.empId, ...sharedPayloadFor(values) });
const buildUpdatePayload = (values) => sharedPayloadFor(values);
const rowFor = (item, boardLookup = new Map()) => ({
  ...item,
  id: getCrudId(item),
  staffId: getStaffId(item),
  facultyId: getFacultyId(item),
  empId: item.employeeId ?? item.employeeCode ?? item.empId,
  name: facultyName(item),
  mobile: item.mobile ?? item.phoneNumber,
  status:
    typeof item.status === "boolean"
      ? item.status
        ? "Active"
        : "Inactive"
      : item.status || "—",
  department: item.department,
  boardName: boardLookup.get(String(firstValue(item, "boardId", "BoardId") ?? ""))
    || lookupValue(firstValue(item, "boardName", "BoardName", "board", "Board", "boardDisplayName", "BoardDisplayName"))
    || savedStaffBoardName(item)
    || "—",
  designation: item.designation,
  facultyType: facultyTypeValue(item),
  qualification: item.qualification ?? item.Qualification,
  experience: item.experience ?? item.Experience,
  joining: dateOnly(item.joiningDate ?? item.JoiningDate ?? item.joining),
});
const valuesFor = (item = {}) => ({
  empId: firstValue(item, "employeeId", "EmployeeId", "employeeCode", "EmployeeCode", "empId", "EmpId"),
  firstName: firstValue(item, "firstName", "FirstName"),
  lastName: firstValue(item, "lastName", "LastName"),
  gender: lookupValue(firstValue(item, "gender", "Gender")),
  dob: dateOnly(firstValue(item, "dateOfBirth", "DateOfBirth", "dob", "Dob")),
  aadhaar: firstValue(item, "aadhaar", "Aadhaar", "aadhaarNumber", "AadhaarNumber"),
  mobile: firstValue(item, "mobile", "Mobile", "phoneNumber", "PhoneNumber"),
  email: firstValue(item, "email", "Email"),
  bloodGroup: lookupValue(firstValue(item, "bloodGroup", "BloodGroup", "bloodGroupName", "BloodGroupName", "bloodType", "BloodType", "bloodTypeName", "BloodTypeName", "bloodGroupDisplayName", "BloodGroupDisplayName", "blood", "Blood")),
  qualification: firstValue(item, "qualification", "Qualification"),
  designation: lookupValue(firstValue(item, "designation", "Designation", "designationName", "DesignationName")),
  designationId: firstValue(item, "designationId", "DesignationId"),
  facultyType: facultyTypeValue(item),
  department: lookupValue(firstValue(item, "department", "Department", "departmentName", "DepartmentName")),
  departmentId: firstValue(item, "departmentId", "DepartmentId"),
  boardId: firstValue(item, "boardId", "BoardId"),
  boardName: lookupValue(firstValue(item, "boardName", "BoardName", "board", "Board", "boardDisplayName", "BoardDisplayName")) || savedStaffBoardName(item),
  joining: dateOnly(firstValue(item, "joiningDate", "JoiningDate", "joining", "Joining")),
  experience: firstValue(item, "experience", "Experience"),
  status: firstValue(item, "status", "Status") || "Active",
  photoPath: firstValue(item, "photoPath", "PhotoPath"),
});

const escapePrintValue = (value) => String(value ?? "—")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const resolvePhotoSource = (payload) => {
  const value = typeof payload === "string"
    ? payload
    : firstValue(payload || {}, "url", "Url", "photoPath", "PhotoPath", "value", "Value");
  if (!value) return "";
  const source = String(value);
  if (/^(data:|blob:|https?:)/i.test(source)) return source;
  try {
    return new URL(source, import.meta.env.VITE_API_BASE_URL || window.location.origin).href;
  } catch {
    return "";
  }
};

const photoSourceFromResponse = async (response) => {
  if (response?.data instanceof Blob) {
    if (!response.data.size) return { source: "", objectUrl: "" };
    const contentType = String(response.headers?.["content-type"] || response.data.type || "").toLowerCase();
    if (contentType.includes("json") || contentType.startsWith("text/")) {
      const text = await response.data.text();
      try {
        return { source: resolvePhotoSource(JSON.parse(text)), objectUrl: "" };
      } catch {
        return { source: resolvePhotoSource(text), objectUrl: "" };
      }
    }
    const objectUrl = URL.createObjectURL(response.data);
    return { source: objectUrl, objectUrl };
  }
  return { source: resolvePhotoSource(response?.data), objectUrl: "" };
};

const requestStaffPhoto = (id) => apiClient.get(STAFF_API.photo(id), {
  responseType: "blob",
  skipGlobalLoader: true,
});

const staffPrintRows = (record) => {
  const values = valuesFor(record);
  const rows = [
    ["Employee ID", values.empId], ["Staff Name", facultyName(record)], ["Staff Category", values.facultyType],
    ["Gender", values.gender], ["Date of Birth", values.dob], ["Aadhaar Number", values.aadhaar],
    ["Mobile", values.mobile], ["Email", values.email], ["Blood Group", values.bloodGroup],
    ["Qualification", values.qualification], ["Designation", values.designation], ["Board Name", values.boardName], ["Department", values.department],
    ["Joining Date", values.joining], ["Experience (Years)", values.experience], ["Status", values.status],
  ];
  if (Array.isArray(record.assignedSubjects)) rows.push(["Subjects -", record.assignedSubjects.join(", ") || "—"]);
  return rows;
};

const buildStaffPrintHtml = (record, photoSource, staffTypeLabel) => {
  const details = staffPrintRows(record).map(([label, value]) => `
    <div class="detail"><span>${escapePrintValue(label)}</span><strong>${escapePrintValue(value || "—")}</strong></div>`).join("");
  const photo = photoSource
    ? `<img class="photo" src="${escapePrintValue(photoSource)}" alt="${escapePrintValue(facultyName(record))} profile photo" />`
    : `<div class="photo placeholder">No photo</div>`;
  return `<!doctype html><html><head><meta charset="UTF-8"><title>${escapePrintValue(facultyName(record))} - Staff Details</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#1c2416;font-family:"Segoe UI",Arial,sans-serif}
    .sheet{width:100%;border:1px solid #d9dccb;border-radius:12px;overflow:hidden}.head{display:flex;align-items:center;gap:18px;padding:20px 24px;border-bottom:1px solid #d9dccb;background:#f3f5e8}
    .photo{width:92px;height:104px;flex:0 0 92px;border:1px solid #d9dccb;border-radius:10px;object-fit:cover;background:#fff}.placeholder{display:grid;place-items:center;color:#7d8578;font-size:12px}
    h1{margin:0;font-size:24px}.subtitle{margin:5px 0 0;color:#687063;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:16px 24px 24px;column-gap:34px}
    .detail{display:grid;grid-template-columns:145px minmax(0,1fr);gap:12px;min-height:43px;align-items:center;border-bottom:1px solid #e7e9dd;font-size:12px}.detail span{color:#687063;font-weight:600}.detail strong{overflow-wrap:anywhere}
    .foot{padding:13px 24px;border-top:1px solid #d9dccb;color:#687063;font-size:10px;text-align:right}@media print{.sheet{break-inside:avoid}}
  </style></head><body><main class="sheet"><header class="head">${photo}<div><h1>${escapePrintValue(facultyName(record))}</h1><p class="subtitle">${escapePrintValue(staffTypeLabel)} · Pirnav College</p></div></header><section class="grid">${details}</section><footer class="foot">Printed ${escapePrintValue(new Date().toLocaleString())}</footer></main></body></html>`;
};

const BLOOD_GROUPS = new Set(BLOOD_GROUP_OPTIONS);
const DESIGNATIONS = {
  "Teaching Staff": ["Junior Lecturer", "Lecturer", "Senior Lecturer", "Subject Teacher", "Academic Coordinator", "Examination Coordinator", "Vice Principal", "Principal"],
  "Non-Teaching Staff": ["Principal", "Administrative Officer", "Accountant", "Librarian", "Lab Assistant", "Office Assistant", "Clerk", "Receptionist"],
};
const TEACHING_DEPARTMENTS = [
  "Mathematics", "Physics", "Chemistry", "Botany", "Zoology", "Biology", "Statistics", "English",
  "Telugu", "Hindi", "Sanskrit", "Commerce", "Accountancy", "Economics", "Business Studies",
  "Civics", "History", "Political Science", "Computer Science", "Computer Applications",
  "Physical Education", "Environmental Studies",
];
const NON_TEACHING_DEPARTMENTS = [
  "Administration",
  "Accounts & Finance",
  "Admissions",
  "Examinations",
  "Library",
  "Transport",
  "Hostel",
  "Security",
  "Maintenance",
  "Student Support Services",
  "Campus Operations",
];
const SUBJECT_DEPARTMENT_ALIASES = {
  mathematics: ["mathematics", "maths"],
  accountancy: ["accountancy", "accounting"],
  "political science": ["political science", "politicalscience"],
  "computer science": ["computer science", "computerscience"],
  "computer applications": ["computer applications", "computerapplications"],
  "physical education": ["physical education", "physicaleducation"],
  "environmental studies": ["environmental studies", "environmentalstudies", "environmental science"],
};
const normalizeSubjectText = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const subjectMatchesDepartment = (subject, department) => {
  const normalizedDepartment = normalizeSubjectText(department);
  if (!normalizedDepartment) return false;
  const aliases = SUBJECT_DEPARTMENT_ALIASES[normalizedDepartment] ?? [normalizedDepartment];
  const searchableSubject = normalizeSubjectText([
    subjectName(subject),
    firstValue(subject, "subjectCode", "SubjectCode"),
  ].filter(Boolean).join(" "));
  const compactSubject = searchableSubject.replace(/\s+/g, "");
  return aliases.some((alias) => {
    const normalizedAlias = normalizeSubjectText(alias);
    return searchableSubject.includes(normalizedAlias) || compactSubject.includes(normalizedAlias.replace(/\s+/g, ""));
  });
};
const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const today = () => new Date().toISOString().slice(0, 10);
const ageOn = (date) => {
  const birth = new Date(`${date}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
};
const cleanFacultyValues = (source) => {
  const text = (name) => String(source[name] ?? "").trim();
  return {
    ...source,
    empId: text("empId"), firstName: text("firstName"), lastName: text("lastName"),
    aadhaar: text("aadhaar").replace(/\s/g, ""), mobile: text("mobile").replace(/\D/g, ""),
    email: text("email").toLowerCase(), qualification: text("qualification"),
    designation: text("designation"), boardName: text("boardName"), department: text("department"),
    experience: text("experience"),
  };
};
const facultyValidation = (source, { departments = [], genders = [], boards = [], allowCustomDepartment = false } = {}) => {
  const values = cleanFacultyValues(source);
  const errors = {};
  if (!EMPLOYEE_ID_PATTERN.test(values.empId) || values.empId.length < 3 || values.empId.length > 20) errors.empId = "Employee ID must be 3–20 letters, numbers, or hyphens.";
  if (!NAME_PATTERN.test(values.firstName) || values.firstName.length < 2 || values.firstName.length > 50) errors.firstName = "Please enter a valid first name.";
  if (!NAME_PATTERN.test(values.lastName) || values.lastName.length > 50) errors.lastName = "Please enter a valid last name.";
  if (!genders.includes(values.gender)) errors.gender = "Please select a gender.";
  if (!values.dob) errors.dob = "Date of birth is required.";
  else if (values.dob > today()) errors.dob = "Date of birth cannot be in the future.";
  else if (Number.isNaN(new Date(`${values.dob}T00:00:00`).getTime())) errors.dob = "Please enter a valid date of birth.";
  else if (ageOn(values.dob) < 18) errors.dob = "Faculty member must be at least 18 years old.";
  if (values.aadhaar && !/^\d{12}$/.test(values.aadhaar)) errors.aadhaar = "Aadhaar number must contain exactly 12 digits.";
  if (!/^[6-9]\d{9}$/.test(values.mobile) || /^0+$/.test(values.mobile)) errors.mobile = "Please enter a valid 10-digit mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Please enter a valid email address.";
  if (!values.bloodGroup) errors.bloodGroup = "Blood group is required.";
  else if (!BLOOD_GROUPS.has(values.bloodGroup)) errors.bloodGroup = "Please select a valid blood group.";
  if (!values.qualification || values.qualification.length > 100) errors.qualification = "Qualification is required.";
  if (!values.designation || values.designation.length > 100) errors.designation = "Please select or enter a valid designation.";
  if (!["Teaching Staff", "Non-Teaching Staff"].includes(values.facultyType)) errors.facultyType = "Please select a faculty type.";
  if (!values.boardName || !boards.includes(values.boardName)) errors.boardName = "Please select a board.";
  if (!values.department || values.department.length > 100 || (!allowCustomDepartment && !departments.includes(values.department))) {
    errors.department = allowCustomDepartment ? "Please select or enter a valid department." : "Please select a department.";
  }
  if (!values.joining) errors.joining = "Joining date is required.";
  else if (values.dob && values.joining <= values.dob) errors.joining = "Joining date cannot be before date of birth.";
  else if (Number.isNaN(new Date(`${values.joining}T00:00:00`).getTime())) errors.joining = "Please enter a valid joining date.";
  if (values.experience && (!/^\d+(\.\d+)?$/.test(values.experience) || Number(values.experience) > 80)) errors.experience = "Please enter a valid experience.";
  return { values, errors };
};
const friendlyFacultyError = (error) => {
  console.error("Faculty operation failed:", error);
  const status = error?.response?.status;
  const rawMessage = String(
    error?.response?.data?.detail
      ?? error?.response?.data?.Detail
      ?? error?.response?.data?.message
      ?? error?.response?.data?.Message
      ?? error?.response?.data?.title
      ?? error?.response?.data?.Title
      ?? "",
  );
  const message = rawMessage.toLowerCase();
  if (message.includes("employee")) return "Employee ID already exists. Please use a different Employee ID.";
  if (message.includes("email")) return "Email already exists. Please use a different email address.";
  if (message.includes("mobile") || message.includes("phone")) return "Mobile number already exists. Please use a different mobile number.";
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to manage staff records.";
  if (status === 404) return "Staff record not found.";
  if (status === 409) return rawMessage || "A staff record with these details already exists.";
  if (status === 400) return rawMessage || "Please correct the highlighted staff details.";
  if ([500, 502, 503, 504].includes(status)) return "Unable to complete the request right now. Please try again later.";
  if (error?.message === "Network Error") return "Unable to connect to the service. Please check your internet connection and try again.";
  if (!error?.response && error?.message) return error.message;
  return getApiErrorMessage(error, "Please check the entered information and try again.");
};

function SearchableStaffField({ name, label, value, options, placeholder, required, error, allowOther = false, disabled = false, onChange, onBlur }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(Boolean(value && !options.includes(value)));
  const filtered = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className={`cms-field staff-search-field ${error ? "has-error" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
        onBlur?.(name);
      }
    }}>
      <label htmlFor={`f-${name}`}>{label} {required ? <span className="req">*</span> : null}</label>
      <div className="staff-search-control">
        <Search size={17} />
        <input
          id={`f-${name}`}
          role="combobox"
          aria-expanded={open}
          autoComplete="new-password"
          data-form-type="other"
          spellCheck={false}
          title=""
          disabled={disabled}
          value={custom ? value ?? "" : open ? query : value ?? ""}
          placeholder={custom ? `Enter ${label}` : placeholder}
          onFocus={() => { if (!custom) { setQuery(""); setOpen(true); } }}
          onChange={(event) => {
            if (custom) onChange(name, event.target.value);
            else { setQuery(event.target.value); setOpen(true); }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (!custom && event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              onChange(name, filtered[0]);
              setOpen(false);
            }
          }}
        />
        {custom ? <button type="button" className="staff-change-option" onClick={() => { setCustom(false); onChange(name, ""); setOpen(true); }}>List</button> : (
          <button
            type="button"
            className={`staff-dropdown-toggle${open ? " is-open" : ""}`}
            aria-label={`${open ? "Close" : "Open"} ${label} options`}
            aria-expanded={open}
            disabled={disabled}
            onClick={() => {
              setQuery("");
              setOpen((current) => !current);
            }}
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>
      {!custom && open ? <div className="staff-search-options" role="listbox">
        {filtered.map((option) => <button type="button" title="" role="option" aria-selected={option === value} key={option} onClick={() => { onChange(name, option); setQuery(""); setOpen(false); }}>{option}</button>)}
        {allowOther ? <button type="button" title="" className="staff-other-option" onClick={() => { setCustom(true); setQuery(""); onChange(name, ""); setOpen(false); }}>Other</button> : null}
        {!filtered.length && !allowOther ? <span>No matching options found.</span> : null}
      </div> : null}
      {error ? <small className="cms-error">{error}</small> : null}
    </div>
  );
}

function Steps({ step, staffType, onSelect }) {
  const teaching = staffType === "Teaching Staff";
  return (
    <div className="faculty-steps">
      {[
        [teaching ? "Faculty Details" : "Staff Details", UserRound, 0],
        [teaching ? "Subject Allocation" : "Employment & Documents", GraduationCap, 1],
      ].map(([label, Icon, targetStep]) => (
        <button type="button" disabled={targetStep > step} className={targetStep <= step ? "is-active" : ""} key={label} onClick={() => onSelect(targetStep)}>
          <span>
            <Icon size={15} />
          </span>
          <small>{targetStep === 0 ? "Step 1" : "Step 2"}</small>
          <strong>{label}</strong>
        </button>
      ))}
    </div>
  );
}
function Preview({ values }) {
  const groups = [
    ["Personal Information", UserRound, ["firstName", "lastName", "gender", "dob"]],
    ["Contact Information", Mail, ["mobile", "email", "aadhaar", "bloodGroup"]],
    [
      "Professional Information",
      BriefcaseBusiness,
      [
         "empId",
         "boardName",
         "department",
        "designation",
        "qualification",
        "facultyType",
        "experience",
        "joining",
      ],
    ],
  ];
  return (
    <div className="faculty-preview">
      {groups.map(([title, Icon, names]) => (
        <section
          key={title}
          className={`faculty-preview-section ${title.split(" ")[0].toLowerCase()}`}
        >
          <h3>
            <Icon size={18} />
            {title}
          </h3>
          <div>
            {names.map((name) => (
              <p key={name}>
                <span>{fields.find((f) => f.name === name)?.label}</span>
                <strong>
                  {name === "firstName"
                    ? `${values.firstName || ""} ${values.lastName || ""}`
                    : (name === "dob" || name === "joining" ? dateOnly(values[name]) : values[name]) || "—"}
                </strong>
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StaffTabs({ active, onChange }) {
  return (
    <div className="staff-tabs" role="tablist" aria-label="Staff type">
      <button type="button" role="tab" aria-selected={active === "teaching"} className={active === "teaching" ? "is-active" : ""} onClick={() => onChange("teaching")}>Teaching Staff</button>
      <button type="button" role="tab" aria-selected={active === "non-teaching"} className={active === "non-teaching" ? "is-active" : ""} onClick={() => onChange("non-teaching")}>Non-Teaching Staff</button>
    </div>
  );
}

function Workflow({ existingId, staffTab = "teaching" }) {
  const navigate = useNavigate();
  const staffType = staffTab === "non-teaching" ? "Non-Teaching Staff" : "Teaching Staff";
  const teaching = staffType === "Teaching Staff";
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [departments, setDepartments] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(Boolean(existingId));
  const [genders, setGenders] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedFacultyType, setSelectedFacultyType] = useState(staffType);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [pendingSubjects, setPendingSubjects] = useState([]);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [generatingEmployeeId, setGeneratingEmployeeId] = useState(!existingId);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const employeeIdRequestRef = useRef(0);
  const workflowDetailRequestRef = useRef(0);
  const allocationRequestRef = useRef(0);
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  const formFields = useMemo(
    () =>
      fields.filter((field) => field.name !== "facultyType").map((field) =>
        field.name === "empId"
          ? { ...field, disabled: true, placeholder: generatingEmployeeId ? "Generating Employee ID..." : "Employee ID" }
          : field.name === "department"
           ? { ...field, options: departments, disabled: loadingDepartments }
          : field.name === "boardName"
            ? { ...field, options: boards.map((board) => board.name), disabled: loadingBoards }
          : field.name === "gender"
            ? { ...field, options: genders }
            : field.name === "designation"
              ? { ...field, options: DESIGNATIONS[selectedFacultyType] || [], disabled: !selectedFacultyType }
            : field,
      ),
    [boards, departments, genders, generatingEmployeeId, loadingBoards, loadingDepartments, selectedFacultyType],
  );
  const { values, errors, setValue, setValues, setErrors } = useForm(formFields, { facultyType: staffType, status: "Active" });
  useEffect(() => {
    if (existingId) return;
    const requestId = ++employeeIdRequestRef.current;
    setGeneratingEmployeeId(true);
    const apiStaffType = toApiStaffType(staffType);
    const loadEmployeeId = async () => {
      try {
        const [nextIdResult, dropdownResult, staffListResult] = await Promise.allSettled([
          apiClient.get(STAFF_API.nextEmployeeId, {
            params: { staffType: apiStaffType },
            skipGlobalLoader: true,
          }),
          apiClient.get(STAFF_API.dropdown, {
            params: { staffType: apiStaffType },
            skipGlobalLoader: true,
          }),
          apiClient.get(STAFF_API.list, {
            params: { PageNumber: 1, PageSize: 1000, StaffType: apiStaffType },
            skipGlobalLoader: true,
          }),
        ]);
        if (requestId !== employeeIdRequestRef.current) return;
        const serverCandidate = nextIdResult.status === "fulfilled"
          ? employeeIdFromServerSequence(nextIdResult.value.data, staffType)
          : "";
        const dropdownCandidate = dropdownResult.status === "fulfilled"
          ? employeeIdFromStaffItems(dropdownResult.value.data, staffType)
          : "";
        const listCandidate = staffListResult.status === "fulfilled"
          ? employeeIdFromStaffItems(staffListResult.value.data, staffType)
          : "";
        const employeeId = safestEmployeeId(staffType, serverCandidate, dropdownCandidate, listCandidate);
        if (!employeeId) throw new Error("The Employee ID service returned an invalid value.");
        setValues((current) => ({ ...current, empId: employeeId }));
        setErrors((current) => ({ ...current, empId: undefined }));
      } catch {
        if (requestId !== employeeIdRequestRef.current) return;
        setValues((current) => ({ ...current, empId: "" }));
        setToast("Unable to generate Employee ID.");
      } finally {
        if (requestId === employeeIdRequestRef.current) setGeneratingEmployeeId(false);
      }
    };
    loadEmployeeId();
    return () => { employeeIdRequestRef.current += 1; };
  }, [existingId, setErrors, setValues, staffType]);
  useEffect(() => {
    setDepartments(teaching ? TEACHING_DEPARTMENTS : NON_TEACHING_DEPARTMENTS);
    setGenders(["Male", "Female", "Other"]);
    setLoadingDepartments(false);
  }, [teaching]);
  useEffect(() => {
    let active = true;
    setLoadingBoards(true);
    apiClient.get(apiEndpoints.boards.getAll, {
      params: { Status: true, PageNumber: 1, PageSize: 100 },
      skipGlobalLoader: true,
    })
      .then((response) => {
        if (!active) return;
        const options = boardOptionsFrom(response.data).filter((board) => board.active);
        setBoards(options);
      })
      .catch((error) => {
        if (active) {
          setBoards([]);
          setToast(friendlyFacultyError(error));
        }
      })
      .finally(() => { if (active) setLoadingBoards(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!existingId) return;
    const requestId = ++workflowDetailRequestRef.current;
    apiClient
      .get(STAFF_API.getById(existingId))
      .then(async (r) => {
        if (requestId !== workflowDetailRequestRef.current) return;
        const record = extractRecord(r.data);
        if (requestId !== workflowDetailRequestRef.current) return;
        setValues(valuesFor(record));
        setSelectedFacultyType(facultyTypeValue(record));
        setSaved(record);
      })
      .catch((detailError) => {
        if (requestId === workflowDetailRequestRef.current) setToast(detailError?.response?.status === 404 ? "Staff record not found." : friendlyFacultyError(detailError));
      })
      .finally(() => {
        if (requestId === workflowDetailRequestRef.current) setLoadingDetails(false);
      });
    return () => { workflowDetailRequestRef.current += 1; };
  }, [existingId, setValues, teaching]);
  const loadAllocation = async (faculty) => {
    const requestId = ++allocationRequestRef.current;
    setLoadingAllocation(true);
    const loadSubjects = apiClient
      .get(apiEndpoints.subjects.getAll)
      .then((subjectResponse) => {
        if (requestId !== allocationRequestRef.current) return;
        setSubjects(
          extractItems(subjectResponse.data).filter(
            (subject) => subject.isActive !== false && subject.status?.toLowerCase?.() !== "inactive",
          ),
        );
      })
      .catch((e) => setToast(friendlyFacultyError(e)));

    const allocationStaffId = getStaffId(faculty);
    const loadAssignedSubjects = allocationStaffId ? Promise.allSettled([
      apiClient.get(STAFF_API.subjectAllocations(allocationStaffId)),
      apiClient.get(STAFF_API.workload(allocationStaffId), { skipGlobalLoader: true }),
    ]).then(([allocationResult, workloadResult]) => {
      if (requestId !== allocationRequestRef.current) return;
      if (allocationResult.status === "fulfilled") setAllocations(allocationItems(allocationResult.value.data));
      else {
        setAllocations([]);
        setToast("Unable to load assigned subjects.");
      }
      if (workloadResult.status === "fulfilled") setWorkload(extractRecord(workloadResult.value.data));
      else {
        setWorkload(null);
        if (allocationResult.status === "fulfilled") setToast("Assigned subjects loaded, but workload could not be retrieved.");
      }
      })
      : Promise.resolve().then(() => {
      setAllocations([]);
      setWorkload(null);
      setToast("Subject allocation is unavailable because the Staff API did not return a StaffId.");
    });

    await Promise.all([loadSubjects, loadAssignedSubjects]);
    if (requestId === allocationRequestRef.current) setLoadingAllocation(false);
  };
  useEffect(() => {
    if (step !== 1 || !teaching) return;
    if (saved) loadAllocation(saved);
    else {
      setLoadingAllocation(true);
      apiClient.get(apiEndpoints.subjects.getAll)
        .then((response) => setSubjects(extractItems(response.data).filter((subject) => subject.isActive !== false && subject.status?.toLowerCase?.() !== "inactive")))
        .catch((error) => setToast(friendlyFacultyError(error)))
        .finally(() => setLoadingAllocation(false));
    }
  }, [step, saved, teaching]);
  const validateAndShow = (source = values) => {
    const result = facultyValidation(source, { departments, genders, boards: boards.map((board) => board.name), allowCustomDepartment: !teaching });
    setErrors(result.errors);
    return result;
  };
  const handleFieldChange = (name, value) => {
    const sanitized = name === "mobile" ? String(value).replace(/\D/g, "").slice(0, 10) : name === "aadhaar" ? String(value).replace(/\D/g, "").slice(0, 12) : value;
    setValue(name, sanitized);
    if (name === "boardName") {
      const selectedBoard = boards.find((board) => board.name === sanitized);
      setValue("boardId", selectedBoard?.id ?? "");
    }
    if (name === "facultyType") { setSelectedFacultyType(sanitized); if (values.designation) setValue("designation", ""); }
    const result = facultyValidation({ ...values, [name]: sanitized }, { departments, genders, boards: boards.map((board) => board.name), allowCustomDepartment: !teaching });
    if (!result.errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const handleFieldBlur = (name) => {
    const result = facultyValidation(values, { departments, genders, boards: boards.map((board) => board.name), allowCustomDepartment: !teaching });
    setValues(result.values);
    setErrors((current) => ({ ...current, [name]: result.errors[name] }));
  };
  const focusFirstError = (nextErrors) => {
    const field = Object.keys(nextErrors)[0];
    if (field) document.getElementById(`f-${field}`)?.focus();
  };
  const preview = (e) => {
    e.preventDefault();
    const result = validateAndShow();
    setValues(result.values);
    if (Object.keys(result.errors).length) return focusFirstError(result.errors);
    setStep(1);
  };
  const confirm = async () => {
    if (saving || uploadingPhoto) return;
    const result = validateAndShow();
    setValues(result.values);
    if (Object.keys(result.errors).length) {
      setStep(0);
      return focusFirstError(result.errors);
    }
    setSaving(true);
    try {
      const response = existingId
        ? await apiClient.put(STAFF_API.update(existingId), buildUpdatePayload(result.values))
        : await apiClient.post(STAFF_API.create, buildCreatePayload(result.values));
      const responseRecord = extractRecord(response.data) || {};
      const responseId = getCrudId(responseRecord) ?? existingId;
      const detailResponse = responseId ? await apiClient.get(STAFF_API.getById(responseId)) : response;
      const record = extractRecord(detailResponse.data) || responseRecord;
      let next = {
        ...record,
        ...valuesFor(record),
        id: getCrudId(record) ?? responseId,
        staffId: getStaffId(record),
        facultyId: getFacultyId(record),
      };
      next = {
        ...next,
        boardId: firstValue(record, "boardId", "BoardId") ?? result.values.boardId,
        boardName: lookupValue(firstValue(record, "boardName", "BoardName", "board", "Board")) || result.values.boardName,
      };
      rememberStaffBoardName(next, next.boardName);
      let photoUploadFailed = false;
      if (photoFile) {
        const requiredStaffId = getStaffId(next);
        try {
          if (!requiredStaffId) throw new Error("The server did not return a StaffId required for photo upload.");
          setUploadingPhoto(true);
          const photoData = new FormData();
          photoData.append("StaffId", String(requiredStaffId));
          if (getFacultyId(next)) photoData.append("FacultyId", String(getFacultyId(next)));
          photoData.append("Photo", photoFile);
          await apiClient.post(STAFF_API.uploadPhoto, photoData);
        } catch (photoError) {
          photoUploadFailed = true;
          console.error("Staff photo upload failed:", photoError);
        } finally {
          setUploadingPhoto(false);
        }
      }
      setSaved(next);
      let allocationFailed = false;
      if (teaching && pendingSubjects.length) {
        try {
          const payloads = pendingSubjects.map((subject) => buildSubjectAllocationPayload(next, subject));
          const payloadError = payloads.map(validateSubjectAllocationPayload).find(Boolean);
          if (payloadError) throw new Error(payloadError);
          const allocationResults = await Promise.allSettled(
            payloads.map((payload) => apiClient.post(STAFF_API.assignSubject, payload)),
          );
          allocationFailed = allocationResults.some((allocationResult) => allocationResult.status === "rejected");
        } catch (allocationError) {
          allocationFailed = true;
          console.error("Staff subject allocation failed:", allocationError);
        }
      }
      const partialFailures = [
        photoUploadFailed ? "profile photo upload" : "",
        allocationFailed ? "subject allocation" : "",
      ].filter(Boolean);
      setToast(partialFailures.length
        ? `${staffType} ${existingId ? "updated" : "added"} successfully, but ${partialFailures.join(" and ")} failed.`
        : `${staffType} ${existingId ? "updated" : "added"} successfully.`);
      navigate(`/dashboard/faculty?staffTab=${staffTab}`);
    } catch (e) {
      const backendErrors = e?.response?.data?.errors ?? e?.response?.data?.Errors;
      if (backendErrors && typeof backendErrors === "object") {
        const keyMap = { employeeId: "empId", dateOfBirth: "dob", joiningDate: "joining", departmentId: "department", designationId: "designation" };
        const mappedErrors = Object.fromEntries(Object.entries(backendErrors).map(([key, value]) => [keyMap[key] || keyMap[key[0]?.toLowerCase() + key.slice(1)] || key, Array.isArray(value) ? value.join(" ") : String(value)]));
        setErrors(mappedErrors);
        setStep(0);
        focusFirstError(mappedErrors);
      }
      setToast(e?.response?.status === 404 ? "Staff record not found." : friendlyFacultyError(e));
    } finally {
      setUploadingPhoto(false);
      setSaving(false);
    }
  };
  const allocate = async (subject) => {
    if (!saved) return;
    const selectedId = subjectId(subject);
    const selectedStaffId = getStaffId(saved);
    if (selectedId === undefined || selectedId === null || !selectedStaffId) {
      return setToast("A valid staff member and subject must be selected.");
    }
    if (
      allocations.some(
        (a) =>
          String(a.subjectId ?? a.subject?.subjectId ?? a.subject) === String(selectedId) ||
          subjectName(a) === subjectName(subject),
      )
    )
      return setToast("This subject is already allocated.");
    try {
      const payload = buildSubjectAllocationPayload(saved, subject);
      const payloadError = validateSubjectAllocationPayload(payload);
      if (payloadError) throw new Error(payloadError);
      await apiClient.post(STAFF_API.assignSubject, payload);
      await loadAllocation(saved);
      setToast(`${subjectName(subject)} allocated successfully.`);
    } catch (e) {
      setToast(friendlyFacultyError(e));
    }
  };
  const remove = async () => {
    try {
      const selectedAllocationId = allocationId(removing);
      if (!selectedAllocationId) throw new Error("The selected subject allocation does not have a valid allocation ID.");
      await apiClient.delete(STAFF_API.deleteSubjectAllocation(selectedAllocationId));
      setRemoving(null);
      await loadAllocation(saved);
      setToast("Subject allocation removed.");
    } catch (e) {
      setToast(friendlyFacultyError(e));
    }
  };
  const allocatedIds = new Set(
    allocations.map((allocation) => String(allocationSubjectId(allocation) ?? "")).filter(Boolean),
  );
  const pendingIds = new Set(pendingSubjects.map((subject) => String(subjectId(subject) ?? "")).filter(Boolean));
  const allocationDepartment = saved?.department ?? saved?.Department ?? values.department;
  const available = subjects.filter(
    (s) =>
      subjectMatchesDepartment(s, allocationDepartment) &&
      !allocatedIds.has(String(subjectId(s))) &&
      !pendingIds.has(String(subjectId(s))) &&
      !allocations.some((a) => subjectName(a) === subjectName(s)),
  );
  const selectedAvailableSubject = available.find(
    (subject) => String(subjectId(subject)) === selectedSubject,
  );
  const matchingSubjects = available.filter((subject) => {
    const query = subjectSearch.trim().toLowerCase();
    return !query || `${subjectName(subject)} ${subject.subjectCode ?? subject.SubjectCode ?? ""}`.toLowerCase().includes(query);
  });
  const allocateSelectedSubject = async () => {
    if (!selectedAvailableSubject) return setToast("Select a subject to allocate.");
    await allocate(selectedAvailableSubject);
    setSelectedSubject("");
  };
  const addPendingSubject = (subject) => {
    const id = String(subjectId(subject) ?? "");
    if (!id) return setToast("Please select a valid subject.");
    if (allocatedIds.has(id) || allocations.some((item) => subjectName(item) === subjectName(subject))) return setToast("This subject is already allocated.");
    if (pendingSubjects.some((item) => String(subjectId(item)) === id)) return setToast("This subject is already selected.");
    setPendingSubjects((current) => [...current, subject]);
  };
  const savePendingSubjects = async () => {
    if (!pendingSubjects.length) return setToast("Please select at least one subject.");
    if (!saved) return setToast("Faculty must be saved before subjects can be allocated.");
    setSavingAllocation(true);
    try {
      const selectedStaffId = getStaffId(saved);
      if (!selectedStaffId) throw new Error("The Staff API did not return a StaffId required for subject allocation.");
      const subjectsToSave = [...pendingSubjects];
      const payloads = subjectsToSave.map((subject) => buildSubjectAllocationPayload(saved, subject));
      const payloadError = payloads.map(validateSubjectAllocationPayload).find(Boolean);
      if (payloadError) throw new Error(payloadError);
      const results = await Promise.allSettled(payloads.map((payload) => apiClient.post(STAFF_API.assignSubject, payload)));
      const failedSubjects = subjectsToSave.filter((_, index) => results[index].status === "rejected");
      const savedCount = subjectsToSave.length - failedSubjects.length;
      setPendingSubjects(failedSubjects);
      await loadAllocation(saved);
      setToast(failedSubjects.length
        ? `${savedCount} subject${savedCount === 1 ? "" : "s"} allocated; ${failedSubjects.length} could not be allocated.`
        : "Selected subjects allocated successfully.");
    } catch (error) { setToast(friendlyFacultyError(error)); }
    finally { setSavingAllocation(false); }
  };
  const currentWorkload = workloadTotals(workload);
  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage teaching and non-teaching staff profiles."
      breadcrumb={["People"]}
    >
      <main className="faculty-workflow">
        <button type="button" className="staff-back-link" onClick={() => navigate(`/dashboard/faculty?staffTab=${staffTab}`)}>
          <ArrowLeft size={16} /> Back to Staff Management
        </button>
        <Steps step={step} staffType={staffType} onSelect={setStep} />
        {step === 0 && loadingDetails ? <section className="faculty-stage"><p className="faculty-empty">Loading faculty details...</p></section> : step === 0 && (
          <form className="faculty-form" onSubmit={preview}>
            <header>
              <UserRound />{" "}
              <div>
                <h2>{teaching ? "Faculty Details" : "Staff Details"}</h2>
                <p>Enter the {staffType.toLowerCase()} profile details below.</p>
              </div>
            </header>
            <div className="faculty-form-grid">
              {loadingDepartments || loadingBoards ? <p className="faculty-empty">Loading staff options...</p> : null}
              {formFields.map((field) => field.name === "designation" || field.name === "department" ? (
                <SearchableStaffField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  value={values[field.name]}
                  options={field.name === "designation" ? DESIGNATIONS[staffType] || [] : departments}
                  placeholder={field.name === "designation" ? "Search designation" : "Select Department"}
                  required={field.required}
                  disabled={field.disabled}
                  error={errors[field.name]}
                  allowOther={field.name === "designation" || (field.name === "department" && !teaching)}
                  onChange={handleFieldChange}
                  onBlur={handleFieldBlur}
                />
              ) : (
                <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={handleFieldChange} onBlur={handleFieldBlur} />
              ))}
              <label className="cms-field staff-photo-field">
                <span>Profile Photo</span>
                <div className="staff-photo-control">
                  <span className="staff-photo-preview">
                    {photoPreview ? <img src={photoPreview} alt="Selected staff profile" /> : <UserRound size={24} aria-hidden="true" />}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={saving || uploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                        event.target.value = "";
                        setPhotoFile(null);
                        setToast("Select a PNG, JPEG, or WebP profile photo.");
                        return;
                      }
                      if (file && file.size > 5 * 1024 * 1024) {
                        event.target.value = "";
                        setPhotoFile(null);
                        setToast("Profile photo must be 5 MB or smaller.");
                        return;
                      }
                      setPhotoFile(file);
                    }}
                  />
                </div>
                <small>PNG, JPG, or WebP. Uploaded after the staff record is saved.</small>
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => navigate(`/dashboard/faculty?staffTab=${staffTab}`)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cms-btn cms-btn-primary staff-next-button"
                disabled={generatingEmployeeId || !values.empId}
                aria-busy={generatingEmployeeId}
              >
                {generatingEmployeeId ? "Generating ID..." : "Next"}
              </button>
            </footer>
          </form>
        )}
        {step === 1 && (
          <section className="faculty-stage staff-step-two">
            <header>
              <GraduationCap />{" "}
              <div>
                <h2>{teaching ? "Subject Allocation" : "Employment & Documents"}</h2>
                <p>{teaching
                  ? `Allocate subjects to ${[values.firstName, values.lastName].filter(Boolean).join(" ").trim() || facultyName(saved)}.`
                  : "Review employment information before saving the staff profile."}</p>
              </div>
            </header>
            {teaching ? (
              <div className="faculty-subject-columns">
                    <section className="faculty-subject-list available">
                      <h3>Available Subjects <small>{available.length}</small></h3>
                      <div className="faculty-subject-selector">
                        <label htmlFor="subject-search">Search subjects</label>
                        <input id="subject-search" value={subjectSearch} placeholder="Search by subject name or code" onChange={(event) => setSubjectSearch(event.target.value)} disabled={loadingAllocation} />
                        {loadingAllocation ? <p className="faculty-empty">Loading subjects...</p> : matchingSubjects.length ? <div className="faculty-search-results">{matchingSubjects.map((subject) => <button type="button" key={subjectId(subject)} onClick={() => addPendingSubject(subject)}><Plus size={14}/>{subjectName(subject)}</button>)}</div> : <p className="faculty-empty">No subjects found.</p>}
                      </div>
                    </section>
                    <section className="faculty-subject-list allocated">
                      <h3>Allocated Subjects <small>{allocations.length + pendingSubjects.length}</small></h3>
                      <p className="staff-workload-summary">{currentWorkload.subjects} subjects · {currentWorkload.sections} sections · {currentWorkload.classes} weekly classes · {currentWorkload.hours} hours</p>
                      {allocations.map((allocation, index) => <article key={allocationId(allocation) ?? `${subjectName(allocation)}-${index}`}><span>{subjectName(allocation)}</span><button type="button" className="cms-btn" onClick={() => setRemoving(allocation)}><X size={15}/> Remove</button></article>)}
                      {pendingSubjects.map((subject) => <article className="is-pending" key={`pending-${subjectId(subject)}`}><span>{subjectName(subject)}</span><button type="button" className="cms-btn" onClick={() => setPendingSubjects((current) => current.filter((item) => String(subjectId(item)) !== String(subjectId(subject))))}><X size={15}/> Remove</button></article>)}
                      {!allocations.length && !pendingSubjects.length ? <p className="faculty-empty">No subjects allocated yet.</p> : null}
                    </section>
              </div>
            ) : (
              <>
                <Preview values={values} />
                <p className="staff-api-note">Documents, salary, and bank details will be available when their backend endpoints are provided. No mock data will be saved.</p>
              </>
            )}
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(0)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="cms-btn cms-btn-primary" disabled={saving} onClick={confirm}>
                {saving ? "Saving..." : existingId ? `Update ${staffType}` : `Save ${staffType}`}
              </button>
            </footer>
          </section>
        )}
        {step === 2 && (
          <section className="faculty-stage faculty-saved">
            <span className="faculty-success">
              <Check size={28} />
            </span>
            <h2>Faculty Saved Successfully</h2>
            <p>
              {facultyName(saved)} · {saved?.employeeId ?? saved?.empId ?? values.empId}
            </p>
            <div className="faculty-summary">
              <span>
                Department<strong>{saved?.department ?? values.department}</strong>
              </span>
              <span>
                Designation<strong>{saved?.designation ?? values.designation}</strong>
              </span>
            </div>
            <footer>
              <button className="cms-btn cms-btn-primary" onClick={() => setStep(3)}>
                Allocate Subject
              </button>
            </footer>
          </section>
        )}
        {step === 3 && (
          <section className="faculty-allocation">
            <header>
              <GraduationCap />{" "}
              <div>
                <h2>Subject Allocation</h2>
                <p>
                  {facultyName(saved)} · {saved?.employeeId ?? values.empId} ·{" "}
                  {saved?.department ?? values.department}
                </p>
              </div>
            </header>
            <div className="faculty-subject-columns">
              <section className="faculty-subject-list available">
                <h3>
                  Available Subjects <small>{available.length}</small>
                </h3>
                <div className="faculty-subject-selector">
                  <label htmlFor="subject-search">Search subjects</label>
                  <div>
                    <input id="subject-search" value={subjectSearch} placeholder="Search by subject name or code" onChange={(event) => setSubjectSearch(event.target.value)} disabled={loadingAllocation} />
                  </div>
                  {loadingAllocation ? <p className="faculty-empty">Loading subjects...</p> : matchingSubjects.length ? <div className="faculty-search-results">{matchingSubjects.map((subject) => <button type="button" key={subjectId(subject)} onClick={() => addPendingSubject(subject)} disabled={savingAllocation}><Plus size={14}/>{subjectName(subject)}{subject.subjectCode ?? subject.SubjectCode ? ` (${subject.subjectCode ?? subject.SubjectCode})` : ""}</button>)}</div> : <p className="faculty-empty">No subjects found.</p>}
                  {!available.length && <p className="faculty-empty">Add or activate subjects in Subject Management, then return here to allocate them.</p>}
                </div>
              </section>
              <section className="faculty-subject-list allocated">
                <h3>
                  Allocated Subjects <small>{allocations.length + pendingSubjects.length}</small>
                </h3>
                <p className="staff-workload-summary">{currentWorkload.subjects} subjects · {currentWorkload.sections} sections · {currentWorkload.classes} weekly classes · {currentWorkload.hours} hours</p>
                {allocations.map((allocation, index) => (
                  <article
                    key={
                      allocationId(allocation) ??
                      `${subjectId(allocation) ?? subjectName(allocation)}-${index}`
                    }
                  >
                    <span>{subjectName(allocation)}</span>
                    <button className="cms-btn" onClick={() => setRemoving(allocation)}>
                      <X size={15} /> Remove
                    </button>
                  </article>
                ))}
                {pendingSubjects.map((subject) => (
                  <article className="is-pending" key={`pending-${subjectId(subject)}`}>
                    <span>{subjectName(subject)}</span>
                    <button type="button" className="cms-btn" disabled={savingAllocation} onClick={() => setPendingSubjects((current) => current.filter((item) => String(subjectId(item)) !== String(subjectId(subject))))}>
                      <X size={15} /> Remove
                    </button>
                  </article>
                ))}
                {pendingSubjects.length ? <button type="button" className="cms-btn faculty-save-subjects" disabled={savingAllocation} onClick={savePendingSubjects}>{savingAllocation ? "Saving..." : "Save selected subjects"}</button> : null}
                {!allocations.length && !pendingSubjects.length ? <p className="faculty-empty">No subjects allocated yet.</p> : null}
              </section>
            </div>
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={() => navigate("/dashboard/faculty")}
              >
                Finish
              </button>
            </footer>
          </section>
        )}
      </main>
      {removing && (
        <ConfirmDialog
          message={`Remove ${subjectName(removing)} from this faculty member?`}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ totalCount: 0, pageNumber: 1, pageSize: STAFF_PAGE_SIZE, totalPages: 1 });
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPhoto, setViewPhoto] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const photoRequestRef = useRef(0);
  const viewPhotoObjectUrlRef = useRef("");
  const printRequestRef = useRef(false);
  const isWorkflow = location.pathname !== "/dashboard/faculty";
  const requestedTab = new URLSearchParams(location.search).get("staffTab");
  const activeTab = requestedTab === "non-teaching" ? "non-teaching" : "teaching";
  const activeStaffType = activeTab === "teaching" ? "Teaching Staff" : "Non-Teaching Staff";
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput);
      setPageNumber(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const load = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    try {
      const [staffResult, boardsResult] = await Promise.allSettled([
        apiClient.get(STAFF_API.list, {
          params: {
            PageNumber: pageNumber,
            PageSize: STAFF_PAGE_SIZE,
            StaffType: API_STAFF_TYPES[activeTab],
            ...(searchTerm.trim() ? { SearchTerm: searchTerm.trim() } : {}),
            ...(departmentFilter ? { Department: departmentFilter } : {}),
            ...(statusFilter ? { Status: statusFilter } : {}),
          },
        }),
        apiClient.get(apiEndpoints.boards.getAll, {
          params: { PageNumber: 1, PageSize: 100 },
          skipGlobalLoader: true,
        }),
      ]);
      if (staffResult.status === "rejected") throw staffResult.reason;
      if (requestId !== listRequestRef.current) return;
      const page = normalizeStaffPage(staffResult.value.data);
      const boardLookup = new Map(
        (boardsResult.status === "fulfilled" ? boardOptionsFrom(boardsResult.value.data) : [])
          .map((board) => [String(board.id), board.name]),
      );
      const listRows = page.items.map((item) => rowFor(item, boardLookup));
      const enrichedRows = await Promise.all(listRows.map(async (row) => {
        if (row.boardName !== "â€”" || !getCrudId(row)) return row;
        try {
          const detailResponse = await apiClient.get(STAFF_API.getById(getCrudId(row)), { skipGlobalLoader: true });
          const detail = extractRecord(detailResponse.data) || {};
          return rowFor({ ...row, ...detail }, boardLookup);
        } catch {
          return row;
        }
      }));
      if (requestId !== listRequestRef.current) return;
      setRows(enrichedRows);
      setPagination(page);
      if (pageNumber > page.totalPages) setPageNumber(page.totalPages);
    } catch (e) {
      if (requestId !== listRequestRef.current) return;
      setRows([]);
      setPagination({ totalCount: 0, pageNumber, pageSize: STAFF_PAGE_SIZE, totalPages: 1 });
      setToast(friendlyFacultyError(e));
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  }, [activeTab, departmentFilter, pageNumber, searchTerm, statusFilter]);
  const loadPhoto = async (record) => {
    const requestId = ++photoRequestRef.current;
    const photoId = getCrudId(record);
    if (viewPhotoObjectUrlRef.current) URL.revokeObjectURL(viewPhotoObjectUrlRef.current);
    viewPhotoObjectUrlRef.current = "";
    setViewPhoto("");
    if (!photoId) return;
    setPhotoLoading(true);
    try {
      const response = await requestStaffPhoto(photoId);
      const photo = await photoSourceFromResponse(response);
      if (requestId !== photoRequestRef.current) {
        if (photo.objectUrl) URL.revokeObjectURL(photo.objectUrl);
        return;
      }
      viewPhotoObjectUrlRef.current = photo.objectUrl;
      setViewPhoto(photo.source);
    } catch (error) {
      if (requestId === photoRequestRef.current && error?.response?.status !== 404) setToast(friendlyFacultyError(error));
    } finally {
      if (requestId === photoRequestRef.current) setPhotoLoading(false);
    }
  };
  const viewFaculty = async (row) => {
    const requestId = ++detailRequestRef.current;
    setViewing(row);
    setViewLoading(true);
    try {
      const response = await apiClient.get(STAFF_API.getById(getCrudId(row)));
      const record = extractRecord(response.data) || {};
      if (requestId !== detailRequestRef.current) return;
      const normalized = rowFor({ ...row, ...record });
      setViewing(normalized);
      const detailsStaffId = getStaffId(normalized);
      const allocationsPromise = activeTab === "teaching" && detailsStaffId
        ? apiClient.get(STAFF_API.subjectAllocations(detailsStaffId), { skipGlobalLoader: true })
        : Promise.resolve(null);
      const boardsPromise = normalized.boardName === "—" && normalized.boardId
        ? apiClient.get(apiEndpoints.boards.getAll, {
          params: { PageNumber: 1, PageSize: 100 },
          skipGlobalLoader: true,
        })
        : Promise.resolve(null);
      const [, allocationsResult, boardsResult] = await Promise.allSettled([loadPhoto(normalized), allocationsPromise, boardsPromise]);
      if (requestId !== detailRequestRef.current) return;
      const assignedSubjects = allocationsResult.status === "fulfilled" && allocationsResult.value
        ? assignedSubjectNames(allocationsResult.value.data)
        : [];
      const matchingBoard = boardsResult.status === "fulfilled" && boardsResult.value
        ? boardOptionsFrom(boardsResult.value.data).find((board) => String(board.id) === String(normalized.boardId))
        : null;
      setViewing((current) => current && getCrudId(current) === getCrudId(normalized)
        ? { ...current, ...(matchingBoard ? { boardName: matchingBoard.name } : {}), assignedSubjects }
        : current);
      if (allocationsResult.status === "rejected") setToast("Staff details loaded, but assigned subjects could not be retrieved.");
    } catch (e) {
      if (requestId !== detailRequestRef.current) return;
      setViewing(null);
      setToast(e?.response?.status === 404 ? "Staff record not found." : friendlyFacultyError(e));
    } finally {
      if (requestId === detailRequestRef.current) setViewLoading(false);
    }
  };
  const printFaculty = async (row) => {
    if (printRequestRef.current) return;
    const recordId = getCrudId(row);
    if (!recordId) {
      setToast("Unable to print because the staff record ID is missing.");
      return;
    }
    const popup = window.open("", "_blank", "width=980,height=760");
    if (!popup) {
      setToast("Please allow popups to print staff details.");
      return;
    }
    popup.document.write("<!doctype html><html><body style='font-family:Segoe UI,Arial;padding:32px'>Loading staff details...</body></html>");
    popup.document.close();
    printRequestRef.current = true;
    try {
      const detailsResponse = await apiClient.get(STAFF_API.getById(recordId), { skipGlobalLoader: true });
      const details = extractRecord(detailsResponse.data) || {};
      const normalized = rowFor({ ...row, ...details });
      const printStaffId = getStaffId(normalized);
      const [photoResult, allocationsResult] = await Promise.allSettled([
        requestStaffPhoto(recordId),
        activeTab === "teaching" && printStaffId
          ? apiClient.get(STAFF_API.subjectAllocations(printStaffId), { skipGlobalLoader: true })
          : Promise.resolve(null),
      ]);
      const printableRecord = {
        ...normalized,
        ...(activeTab === "teaching" ? {
          assignedSubjects: allocationsResult.status === "fulfilled" && allocationsResult.value
            ? assignedSubjectNames(allocationsResult.value.data)
            : [],
        } : {}),
      };
      const photo = photoResult.status === "fulfilled"
        ? await photoSourceFromResponse(photoResult.value)
        : { source: "", objectUrl: "" };
      popup.document.open();
      popup.document.write(buildStaffPrintHtml(printableRecord, photo.source, activeStaffType));
      popup.document.close();

      const printWhenReady = () => {
        const images = Array.from(popup.document.images || []);
        Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }))).then(() => window.setTimeout(() => {
          if (!popup.closed) {
            popup.focus();
            popup.print();
          }
          if (photo.objectUrl) window.setTimeout(() => URL.revokeObjectURL(photo.objectUrl), 1000);
        }, 150));
      };
      if (popup.document.readyState === "complete") printWhenReady();
      else popup.addEventListener("load", printWhenReady, { once: true });
    } catch (error) {
      if (!popup.closed) popup.close();
      setToast(error?.response?.status === 404 ? "Staff record not found." : friendlyFacultyError(error));
    } finally {
      printRequestRef.current = false;
    }
  };
  useEffect(() => {
    if (!isWorkflow) load();
  }, [isWorkflow, load]);
  useEffect(() => () => {
    listRequestRef.current += 1;
    detailRequestRef.current += 1;
    photoRequestRef.current += 1;
    if (viewPhotoObjectUrlRef.current) URL.revokeObjectURL(viewPhotoObjectUrlRef.current);
  }, []);

  if (isWorkflow) return <Workflow existingId={id} staffTab={activeTab} />;

  const departmentOptions = activeTab === "teaching" ? TEACHING_DEPARTMENTS : NON_TEACHING_DEPARTMENTS;
  const switchTab = (tab) => {
    setDepartmentFilter("");
    setStatusFilter("");
    setSearchInput("");
    setSearchTerm("");
    setPageNumber(1);
    setRows([]);
    setViewing(null);
    navigate(`/dashboard/faculty?staffTab=${tab}`);
  };
  const listColumns = activeTab === "teaching" ? [
    { key: "empId", label: "Employee ID", strong: true },
    { key: "name", label: "Faculty Name" },
    { key: "boardName", label: "Board Name" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "status", label: "Status", badge: true },
  ] : [
    { key: "empId", label: "Employee ID", strong: true },
    { key: "name", label: "Staff Name" },
    { key: "boardName", label: "Board Name" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "status", label: "Status", badge: true },
  ];
  const previewValues = valuesFor(viewing || {});
  const previewRows = activeTab === "teaching" ? [
    ["Employee ID", previewValues.empId],
    ["First Name", previewValues.firstName],
    ["Last Name", previewValues.lastName],
    ["Gender", previewValues.gender],
    ["Date of Birth", previewValues.dob],
    ["Aadhaar Number", previewValues.aadhaar],
    ["Mobile", previewValues.mobile],
    ["Email", previewValues.email],
    ["Blood Group", previewValues.bloodGroup],
    ["Qualification", previewValues.qualification],
    ["Designation", previewValues.designation],
    ["Board Name", previewValues.boardName],
    ["Department", previewValues.department],
    ["Joining Date", previewValues.joining],
    ["Experience (Years)", previewValues.experience],
    ["Subjects", viewing?.assignedSubjects?.join(", ") || "—"],
    ["Status", previewValues.status],
  ] : [
    ["Employee ID", previewValues.empId],
    ["First Name", previewValues.firstName],
    ["Last Name", previewValues.lastName],
    ["Gender", previewValues.gender],
    ["Date of Birth", previewValues.dob],
    ["Aadhaar Number", previewValues.aadhaar],
    ["Mobile", previewValues.mobile],
    ["Email", previewValues.email],
    ["Blood Group", previewValues.bloodGroup],
    ["Qualification", previewValues.qualification],
    ["Board Name", previewValues.boardName],
    ["Department", previewValues.department],
    ["Designation", previewValues.designation],
    ["Joining Date", previewValues.joining],
    ["Experience (Years)", previewValues.experience],
    ["Status", previewValues.status],
  ];
  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage teaching and non-teaching staff, assignments, employment details and records."
      breadcrumb={["People"]}
    >
      <div className="faculty-list">
        {!viewing ? (
          <>
            <StaffTabs active={activeTab} onChange={switchTab} />
            <div className="staff-server-table">
              <DataTable
                key={activeTab}
                title={activeStaffType}
                addLabel={activeTab === "teaching" ? "Add Teaching Staff" : "Add Non-Teaching Staff"}
                columns={listColumns}
                rows={rows}
                loading={loading}
                onSearchChange={handleSearchChange}
                enableExport={false}
                enableTablePrint={false}
                paginationCurrentOnly
                toolbarExtra={<div className="staff-list-filters"><label><span className="sr-only">Department</span><select aria-label="Filter by department" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPageNumber(1); }}><option value="">All Departments</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select></label><label><span className="sr-only">Status</span><select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPageNumber(1); }}><option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label></div>}
                emptyMessage={`No ${activeStaffType.toLowerCase()} found.`}
                onAdd={() => navigate(`/dashboard/faculty/add?staffTab=${activeTab}`)}
                onView={viewFaculty}
                onPrint={printFaculty}
                onDelete={setDeleting}
              />
              <div className="cms-pagination staff-server-pagination" aria-label="Staff pagination">
                <span className="cms-page-info">
                  Showing {pagination.totalCount === 0 ? 0 : (pagination.pageNumber - 1) * pagination.pageSize + 1}-
                  {Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} records
                </span>
                <button className="cms-page-btn" type="button" disabled={loading || pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>Prev</button>
                <button className="cms-page-btn is-active" type="button" aria-current="page">{pagination.pageNumber}</button>
                <button className="cms-page-btn" type="button" disabled={loading || pageNumber >= pagination.totalPages} onClick={() => setPageNumber((current) => Math.min(pagination.totalPages, current + 1))}>Next</button>
              </div>
            </div>
          </>
        ) : (
          <section className="staff-details-screen">
            <button type="button" className="cms-back-link staff-details-back" onClick={() => {
              detailRequestRef.current += 1;
              photoRequestRef.current += 1;
              if (viewPhotoObjectUrlRef.current) URL.revokeObjectURL(viewPhotoObjectUrlRef.current);
              viewPhotoObjectUrlRef.current = "";
              setViewing(null);
              setViewPhoto("");
              setPhotoLoading(false);
            }}>
              <ArrowLeft size={15} /> Back to Staff Management
            </button>
            <article className="staff-details-card">
              <header>
                <div><Eye size={18} /><h2>{activeTab === "teaching" ? "Teaching Staff Details" : "Non-Teaching Staff Details"}</h2></div>
                <button type="button" className="cms-btn cms-btn-ghost staff-details-edit" onClick={() => navigate(`/dashboard/faculty/${getCrudId(viewing)}/edit?staffTab=${activeTab}`)}>
                  <Pencil size={16} /> {activeTab === "teaching" ? "Edit Faculty Details" : "Edit Staff Details"}
                </button>
              </header>
              {viewLoading ? (
                <p className="staff-details-empty">Loading faculty details...</p>
              ) : (
                <div className="staff-details-content">
                  <div className="staff-details-photo" aria-busy={photoLoading}>
                    {photoLoading ? <span>Loading photo...</span> : viewPhoto ? <img src={viewPhoto} alt={`${facultyName(viewing)} profile`} /> : <><UserRound size={34} aria-hidden="true" /><span>No profile photo</span></>}
                  </div>
                <dl>
                  {previewRows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <span className="staff-detail-separator" aria-hidden="true">–</span>
                      {label === "Status" ? (
                        <dd><StatusBadge value={typeof value === "boolean" ? (value ? "Active" : "Inactive") : value || "—"} /></dd>
                      ) : (
                        <dd>{value === undefined || value === null || value === "" ? "—" : value}</dd>
                      )}
                    </div>
                  ))}
                </dl>
                </div>
              )}
            </article>
          </section>
        )}
        {deleting && (
          <ConfirmDialog
            message={`Delete ${deleting.name}? This action cannot be undone.`}
            onCancel={() => { if (!deleteLoading) setDeleting(null); }}
            onConfirm={async () => {
              if (deleteLoading) return;
              const recordId = getCrudId(deleting);
              if (!recordId) {
                setToast("Unable to delete because the Staff API record ID is missing.");
                return;
              }
              setDeleteLoading(true);
              try {
                await apiClient.delete(STAFF_API.delete(recordId));
                setDeleting(null);
                await load();
                setToast("Staff deleted successfully.");
              } catch (e) {
                setToast(e?.response?.status === 404 ? "Staff record not found." : friendlyFacultyError(e));
              } finally {
                setDeleteLoading(false);
              }
            }}
          />
        )}
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

StaffManagementPage.pageConfig = { title: "Staff Management" };
StaffManagementPage.facultySubjectAllocationConfig = { title: "Staff Subject Allocation" };
