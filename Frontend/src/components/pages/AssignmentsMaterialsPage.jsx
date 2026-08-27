import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, FilterX, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import "./AssignmentsMaterialsPage.css";

const MODULE_TITLE = "Assignment";
const REQUIRED_FIELDS = ["title", "academicYearId", "academicLevel", "groupId", "subjectIds", "facultyIds", "startDate", "dueDate", "maximumMarks"];

const columns = [
  { key: "title", label: "Assignment Title", strong: true },
  { key: "academicYear", label: "Academic Year" },
  { key: "academicLevel", label: "Academic Level" },
  { key: "group", label: "Group" },
  { key: "subject", label: "Subject" },
  { key: "createdBy", label: "Created By" },
  { key: "start", label: "Start Date" },
  { key: "due", label: "Due Date" },
  { key: "max", label: "Maximum Marks" },
];

export const pageConfig = {
  title: MODULE_TITLE,
  subtitle: "Publish assignments, attachments and due dates.",
  breadcrumb: ["Operations"],
  addLabel: "Add Assignment",
  rows: [],
  columns,
  fields: [],
};

function getPayloadData(payload) {
  return payload?.data ?? payload?.Data ?? payload;
}

function getCollection(payload) {
  const dataNode = getPayloadData(payload);
  if (Array.isArray(dataNode)) return dataNode;
  if (Array.isArray(dataNode?.data)) return dataNode.data;
  if (Array.isArray(dataNode?.Data)) return dataNode.Data;
  if (Array.isArray(dataNode?.items)) return dataNode.items;
  if (Array.isArray(dataNode?.Items)) return dataNode.Items;
  if (Array.isArray(dataNode?.content)) return dataNode.content;
  if (Array.isArray(dataNode?.Content)) return dataNode.Content;
  if (Array.isArray(dataNode?.$values)) return dataNode.$values;
  return [];
}

function getApiMessage(error, fallback) {
  const payload = error?.response?.data;
  if (typeof payload === "string") return payload;
  const validationMessages = getValidationMessages(payload);
  return validationMessages.length
    ? validationMessages.join(" ")
    : payload?.message || payload?.Message || payload?.error || payload?.Error || error?.message || fallback;
}

function getValidationMessages(payload) {
  const errors = payload?.errors ?? payload?.Errors;
  if (!errors || typeof errors !== "object") return [];
  return Object.values(errors).flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
    .filter((message) => typeof message === "string" && message.trim())
    .map((message) => message.trim());
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return getLocalDateString();
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
}

function getMasterDataMessage(error, fallback) {
  if (error?.response?.status === 401) return "Unauthorized. Please login again or check admin permissions.";
  return getApiMessage(error, fallback);
}

// Vite 502/TLS failures usually mean the backend/ngrok tunnel is down; never auto-retry this endpoint.
function getAssignmentsLoadMessage(error) {
  const status = error?.response?.status;
  if (import.meta.env.DEV) console.log("Assignments API status:", status || "network-error");
  if (status === 500) return "Assignments API failed on server. Please check backend logs for the admin or faculty assignments endpoint.";
  if (status === 502) return "Assignments API is temporarily unavailable. Please check backend/ngrok server and try again.";
  if (!error?.response) return "Unable to connect to assignments API. Please check internet, backend server, or ngrok tunnel.";
  return getApiMessage(error, "Failed to load assignments.");
}

function firstValue(item, keys) {
  return keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && entry !== "");
}

function valueToText(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => valueToText(item, seen)).filter(Boolean).join(" ");
  return Object.values(value).map((item) => valueToText(item, seen)).filter(Boolean).join(" ");
}

function normalizeFilterValue(value) {
  return valueToText(value).trim().toLowerCase();
}

function getMatchScore(row, query) {
  if (!query) return 1;
  const title = normalizeFilterValue(row.title);
  const otherFields = [
    row.academicYear,
    row.academicLevel,
    row.group,
    row.subject,
    row.faculty,
    row.createdBy,
    row.max,
    row.maximumMarks,
    row.description,
  ].map(normalizeFilterValue);

  if (title.startsWith(query)) return 3;
  if (otherFields.some((value) => value.startsWith(query))) return 2;
  if ([title, ...otherFields].some((value) => value.includes(query))) return 1;
  return 0;
}

function makeLookup(options) {
  return options.reduce((lookup, option) => {
    lookup[String(option.value)] = option;
    return lookup;
  }, {});
}

function normalizeAcademicYear(item = {}) {
  const value = firstValue(item, ["academicYearId", "AcademicYearId", "id", "Id", "yearId", "YearId"]);
  const label = firstValue(item, ["academicYearName", "AcademicYearName", "name", "Name", "yearName", "YearName"]);
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label || value) };
}

function normalizeGroup(item = {}) {
  const value = firstValue(item, ["groupId", "GroupId", "id", "Id"]);
  const groupName = firstValue(item, ["groupName", "GroupName", "name", "Name"]);
  const groupCode = firstValue(item, ["groupCode", "GroupCode", "code", "Code"]);
  if (value === undefined || value === null || value === "") return null;
  return {
    value: String(value),
    label: String(groupName || groupCode || value),
    groupCode: groupCode ? String(groupCode) : "",
    academicLevel: firstValue(item, ["academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel"]) || "",
    academicLevelId: firstValue(item, ["academicLevelId", "AcademicLevelId"]) || "",
    academicYearId: firstValue(item, ["academicYearId", "AcademicYearId"]) || "",
  };
}

function normalizeFaculty(item = {}) {
  const value = firstValue(item, ["facultyId", "FacultyId", "id", "Id"]);
  const fullName = firstValue(item, ["facultyName", "FacultyName", "fullName", "FullName", "name", "Name"]);
  const firstName = firstValue(item, ["firstName", "FirstName"]) || "";
  const lastName = firstValue(item, ["lastName", "LastName"]) || "";
  const employeeId = firstValue(item, ["employeeId", "EmployeeId", "employeeCode", "EmployeeCode"]);
  const status = firstValue(item, ["status", "Status"]);
  if (status && String(status).toLowerCase() !== "active") return null;
  if (value === undefined || value === null || value === "") return null;
  const joinedName = `${firstName} ${lastName}`.trim();
  return {
    value: String(value),
    label: String(fullName || joinedName || employeeId || value),
    employeeId: employeeId ? String(employeeId) : "",
    status: status ? String(status) : "",
  };
}

function normalizeSubject(item = {}) {
  const value = firstValue(item, ["subjectId", "SubjectId", "id", "Id"]);
  const label = firstValue(item, ["subjectName", "SubjectName", "name", "Name"]);
  const subjectCode = firstValue(item, ["subjectCode", "SubjectCode", "code", "Code"]);
  const groupId = firstValue(item, ["groupId", "GroupId"]);
  const isActive = firstValue(item, ["isActive", "IsActive"]);
  if (value === undefined || value === null || value === "") return null;
  if (isActive === false || String(isActive).toLowerCase() === "false") return null;
  return {
    value: String(value),
    label: String(label || subjectCode || value),
    groupId: groupId === undefined || groupId === null || groupId === "" ? "" : String(groupId),
  };
}

function normalizeAcademicLevel(item = {}) {
  const value = firstValue(item, ["academicLevelId", "AcademicLevelId", "id", "Id"]);
  const label = firstValue(item, ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]);
  if (value === undefined || value === null || value === "" || !label) return null;
  return { value: String(label), label: String(label), id: String(value) };
}

function mergeAssignments(...collections) {
  const byId = new Map();
  collections.flat().forEach((assignment) => {
    const id = firstValue(assignment, ["assignmentId", "AssignmentId", "id", "Id"]);
    if (id === undefined || id === null || id === "") return;
    const key = String(id);
    byId.set(key, { ...(byId.get(key) || {}), ...assignment });
  });
  return [...byId.values()].sort((left, right) => Number(firstValue(right, ["assignmentId", "AssignmentId", "id", "Id"])) - Number(firstValue(left, ["assignmentId", "AssignmentId", "id", "Id"])));
}

function normalizeAssignment(item = {}, lookups = {}) {
  const id = item.assignmentId ?? item.AssignmentId ?? item.id ?? item.Id;
  const academicYearId = item.academicYearId ?? item.AcademicYearId ?? item.yearId ?? item.YearId ?? "";
  const academicYearName = item.academicYearName ?? item.AcademicYearName ?? item.yearName ?? item.YearName ?? "";
  const groupId = item.groupId ?? item.GroupId ?? "";
  const groupName = item.groupName ?? item.GroupName ?? "";
  const subjectId = item.subjectId ?? item.SubjectId ?? "";
  const subjectIds = toIdArray(item.subjectIds ?? item.SubjectIds ?? subjectId);
  const subjectName = item.subjectName ?? item.SubjectName ?? "";
  const facultyId = item.facultyId ?? item.FacultyId ?? "";
  const facultyIds = toIdArray(item.facultyIds ?? item.FacultyIds ?? facultyId);
  const facultyName = item.facultyName ?? item.FacultyName ?? "";
  const createdByType = String(firstValue(item, ["createdByType", "CreatedByType"]) || "").trim();
  const startDate = item.startDate ?? item.StartDate ?? item.start ?? "";
  const dueDate = item.dueDate ?? item.DueDate ?? item.due ?? "";
  const maximumMarks = item.maximumMarks ?? item.MaximumMarks ?? item.max ?? "";
  const academicYearDisplay = academicYearName || lookups.academicYears?.[String(academicYearId)]?.label || "-";
  const groupDisplay = groupName || lookups.groups?.[String(groupId)]?.label || "-";
  const facultyDisplay = facultyName || lookups.faculty?.[String(facultyId)]?.label || facultyId || "-";
  const subjectDisplay = subjectName || lookups.subjects?.[String(subjectId)]?.label || "-";
  const createdBy = createdByType
    ? (createdByType.toLowerCase() === "faculty" ? (facultyDisplay !== "-" ? facultyDisplay : "Faculty") : "Admin")
    : (facultyDisplay !== "-" && String(facultyId) !== "0" ? facultyDisplay : "Admin");

  return {
    id,
    assignmentId: id,
    title: item.title ?? item.Title ?? "-",
    academicYearId,
    academicYearName,
    academicYear: academicYearDisplay,
    academicLevel: item.academicLevelName ?? item.AcademicLevelName ?? item.academicLevel ?? item.AcademicLevel ?? "-",
    groupId,
    groupName,
    group: groupDisplay,
    subjectId,
    subjectIds,
    subjectName,
    subject: subjectDisplay,
    facultyId,
    facultyIds,
    facultyName,
    faculty: facultyDisplay,
    createdBy,
    description: item.description ?? item.Description ?? "",
    startDate,
    start: startDate ? String(startDate).slice(0, 10) : "-",
    dueDate,
    due: dueDate ? String(dueDate).slice(0, 10) : "-",
    attachmentPath: item.attachmentPath ?? item.AttachmentPath ?? item.attachment ?? "",
    max: maximumMarks,
    maximumMarks,
  };
}

function formatDate(value) {
  if (!value || value === "-") return "";
  return String(value).slice(0, 10);
}

function toIdArray(value) {
  if (Array.isArray(value)) return value.filter((id) => id !== undefined && id !== null && id !== "").map(String);
  return value === undefined || value === null || value === "" ? [] : [String(value)];
}

function createInitialValues(row) {
  return {
    title: row?.title || "",
    academicYearId: row?.academicYearId ? String(row.academicYearId) : "",
    academicLevel: row?.academicLevel && row.academicLevel !== "-" ? row.academicLevel : "",
    groupId: row?.groupId ? String(row.groupId) : "",
    subjectIds: toIdArray(row?.subjectIds ?? row?.subjectId),
    facultyIds: toIdArray(row?.facultyIds ?? row?.facultyId),
    startDate: formatDate(row?.startDate || row?.start) || getTodayDate(),
    dueDate: formatDate(row?.dueDate || row?.due),
    attachmentPath: row?.attachmentPath || "",
    maximumMarks: row?.maximumMarks ?? row?.max ?? "",
    description: row?.description || "",
  };
}

function buildAssignmentFormData(values, file) {
  const formData = new FormData();
  formData.append("Title", values.title.trim());
  formData.append("AcademicYearId", String(values.academicYearId));
  formData.append("AcademicLevel", values.academicLevel);
  formData.append("GroupId", String(values.groupId));
  // Backend contract required: accept these JSON arrays for multi-subject/faculty assignments.
  formData.append("SubjectIds", JSON.stringify(values.subjectIds));
  formData.append("FacultyIds", JSON.stringify(values.facultyIds));
  formData.append("StartDate", values.startDate);
  formData.append("DueDate", values.dueDate);
  formData.append("MaximumMarks", String(Number(values.maximumMarks)));
  if (values.description?.trim()) formData.append("Description", values.description.trim());
  if (file instanceof File) formData.append("Attachment", file);
  return formData;
}

// The shared client defaults to application/json, which makes Axios serialize FormData as JSON.
// Null removes that inherited header; the browser then sets multipart/form-data with its boundary.
const multipartRequestConfig = { headers: { "Content-Type": null } };

export default function AssignmentsMaterialsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isFormRoute = location.pathname.endsWith("/add") || Boolean(id);
  const isEditMode = Boolean(id);

  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [academicYearError, setAcademicYearError] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupError, setGroupError] = useState("");
  const [academicLevelOptions, setAcademicLevelOptions] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [assignmentSubjectOptions, setAssignmentSubjectOptions] = useState([]);
  const [facultyError, setFacultyError] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);

  const academicYearMap = useMemo(() => makeLookup(academicYearOptions), [academicYearOptions]);
  const groupMap = useMemo(() => makeLookup(groupOptions), [groupOptions]);
  const facultyMap = useMemo(() => makeLookup(facultyOptions), [facultyOptions]);
  const subjectMap = useMemo(() => makeLookup(assignmentSubjectOptions), [assignmentSubjectOptions]);
  const levelOptions = useMemo(() => {
    if (academicLevelOptions.length) return academicLevelOptions;
    const levels = [...new Set(groupOptions.map((group) => group.academicLevel).filter(Boolean))];
    const source = levels.length ? levels : ["First Year", "Second Year"];
    return source.map((level) => ({ value: level, label: level }));
  }, [academicLevelOptions, groupOptions]);

  const [rawAssignments, setRawAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [toastType, setToastType] = useState("success");
  const [exportPreviewRows, setExportPreviewRows] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [subjectOptions, setSubjectOptions] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectError, setSubjectError] = useState("");

  const [formValues, setFormValues] = useState(createInitialValues());
  const [formErrors, setFormErrors] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const assignmentsLoadingRef = useRef(false);
  const masterLoadingRef = useRef(false);

  const assignmentRows = useMemo(() => rawAssignments.map((assignment) => normalizeAssignment(assignment, {
    academicYears: academicYearMap,
    groups: groupMap,
    faculty: facultyMap,
    subjects: subjectMap,
  })), [academicYearMap, facultyMap, groupMap, rawAssignments, subjectMap]);
  const assignmentGroupOptions = useMemo(() => groupOptions, [groupOptions]);
  const filteredAssignmentRows = useMemo(() => {
    const search = normalizeFilterValue(searchTerm);
    return assignmentRows
      .map((assignment, index) => ({ assignment, index, score: getMatchScore(assignment, search) }))
      .filter(({ assignment, score }) => {
        const matchesSearch = !search || score > 0;
        const matchesGroup = !selectedGroup || String(assignment.groupId) === selectedGroup;
        const matchesLevel = !selectedLevel || assignment.academicLevel === selectedLevel;
        return matchesSearch && matchesGroup && matchesLevel;
      })
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map(({ assignment }) => assignment);
  }, [assignmentRows, searchTerm, selectedGroup, selectedLevel]);

  const loadMasterData = useCallback(async () => {
    if (masterLoadingRef.current) return null;
    masterLoadingRef.current = true;
    setMasterLoading(true);
    setAcademicYearError("");
    setGroupError("");
    setFacultyError("");

    if (import.meta.env.DEV) {
      console.log("Assignments selected endpoints:", {
        faculty: apiEndpoints.faculty.list,
        academicYears: apiEndpoints.academicYears.list,
        academicLevels: apiEndpoints.boards.academicLevels,
        groups: apiEndpoints.groups.dropdown,
      });
    }

    const [academicYearsResult, academicLevelsResult, groupsResult, facultyResult, subjectsResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.boards.academicLevels),
      apiClient.get(apiEndpoints.groups.dropdown),
      apiClient.get(apiEndpoints.faculty.list),
      apiClient.get(apiEndpoints.subjects.getAll),
    ]);

    let nextAcademicYears = [];
    let nextAcademicLevels = [];
    let nextGroups = [];
    let nextFaculty = [];
    let nextSubjects = [];

    if (academicYearsResult.status === "fulfilled") {
      nextAcademicYears = getCollection(academicYearsResult.value.data).map(normalizeAcademicYear).filter(Boolean);
      setAcademicYearOptions(nextAcademicYears);
    } else {
      setAcademicYearOptions([]);
      setAcademicYearError(getMasterDataMessage(academicYearsResult.reason, "Failed to load academic years."));
    }

    if (academicLevelsResult.status === "fulfilled") {
      nextAcademicLevels = getCollection(academicLevelsResult.value.data).map(normalizeAcademicLevel).filter(Boolean);
      setAcademicLevelOptions(nextAcademicLevels);
    } else {
      setAcademicLevelOptions([]);
      if (import.meta.env.DEV) console.error("Academic levels API failed:", academicLevelsResult.reason);
    }

    if (groupsResult.status === "fulfilled") {
      nextGroups = getCollection(groupsResult.value.data).map(normalizeGroup).filter(Boolean);
      setGroupOptions(nextGroups);
    } else {
      setGroupOptions([]);
      setGroupError(getMasterDataMessage(groupsResult.reason, "Failed to load groups."));
    }

    if (facultyResult.status === "fulfilled") {
      nextFaculty = getCollection(facultyResult.value.data).map(normalizeFaculty).filter(Boolean);
      setFacultyOptions(nextFaculty);
    } else {
      setFacultyOptions([]);
      setFacultyError(getMasterDataMessage(facultyResult.reason, "Failed to load faculty."));
      if (import.meta.env.DEV) console.error("Faculty list API failed:", facultyResult.reason);
    }

    if (subjectsResult.status === "fulfilled") {
      nextSubjects = getCollection(subjectsResult.value.data).map(normalizeSubject).filter(Boolean);
      setAssignmentSubjectOptions(nextSubjects);
    } else {
      setAssignmentSubjectOptions([]);
    }

    if (import.meta.env.DEV) {
      console.log("Assignments master data loaded:", {
        academicYears: nextAcademicYears.length,
        academicLevels: nextAcademicLevels.length,
        groups: nextGroups.length,
        faculty: nextFaculty.length,
        subjects: nextSubjects.length,
      });
    }

    setMasterLoading(false);
    masterLoadingRef.current = false;
    return {
      academicYearMap: makeLookup(nextAcademicYears),
      academicLevelMap: makeLookup(nextAcademicLevels),
      groupMap: makeLookup(nextGroups),
      facultyMap: makeLookup(nextFaculty),
      subjectMap: makeLookup(nextSubjects),
    };
  }, []);

  const loadAssignments = useCallback(async () => {
    if (assignmentsLoadingRef.current) return;
    assignmentsLoadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      if (import.meta.env.DEV) console.log("Loading published, admin, and faculty assignments");
      const [publishedResult, adminResult, facultyResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.assignments.published),
        apiClient.get(apiEndpoints.assignments.adminList),
        apiClient.get(apiEndpoints.assignments.list),
      ]);

      // Keep the published response last so its authoritative display fields win on duplicate IDs.
      const loadedCollections = [adminResult, facultyResult, publishedResult]
        .filter((result) => result.status === "fulfilled")
        .map((result) => getCollection(result.value.data));

      if (!loadedCollections.length) throw publishedResult.reason || adminResult.reason || facultyResult.reason;
      setRawAssignments(mergeAssignments(...loadedCollections));
      if (import.meta.env.DEV) {
        [publishedResult, adminResult, facultyResult].forEach((result, index) => {
          if (result.status === "rejected") {
            const label = ["Published", "Admin", "Faculty"][index];
            console.error(`${label} assignments failed:`, result.reason);
          }
        });
      }
    } catch (loadError) {
      setRawAssignments([]);
      setError(getAssignmentsLoadMessage(loadError));
    } finally {
      assignmentsLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadListPageData = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log("Assignments auth/debug:", {
        hasToken: Boolean(localStorage.getItem("token")),
        role: localStorage.getItem("role"),
        endpoints: {
          assignments: apiEndpoints.assignments.adminList,
          facultyAssignments: apiEndpoints.assignments.list,
          publishedAssignments: apiEndpoints.assignments.published,
        academicYears: apiEndpoints.academicYears.list,
          academicLevels: apiEndpoints.boards.academicLevels,
          groups: apiEndpoints.groups.dropdown,
          faculty: apiEndpoints.faculty.list,
        },
      });
    }
    loadMasterData();
    loadAssignments();
  }, [loadAssignments, loadMasterData]);

  const loadSubjectsByGroup = useCallback(async (groupId, selectedSubjectIds = []) => {
    if (!groupId) {
      setSubjectOptions([]);
      setSubjectError("");
      return;
    }
    setSubjectLoading(true);
    setSubjectError("");
    try {
      const response = await apiClient.get(apiEndpoints.subjects.getAll);
      const nextOptions = getCollection(response.data)
        .map(normalizeSubject)
        .filter((subject) => subject && subject.groupId === String(groupId));
      setSubjectOptions(nextOptions);
      const validSubjectIds = toIdArray(selectedSubjectIds).filter((subjectId) => nextOptions.some((option) => option.value === subjectId));
      if (validSubjectIds.length !== toIdArray(selectedSubjectIds).length) {
        setFormValues((current) => ({ ...current, subjectIds: validSubjectIds }));
      }
    } catch (loadError) {
      setSubjectError(getApiMessage(loadError, "Failed to load subjects."));
      setSubjectOptions([]);
    } finally {
      setSubjectLoading(false);
    }
  }, []);

  const loadAssignmentDetails = useCallback(async (assignmentId) => {
    setFormLoading(true);
    setFormError("");
    try {
      const response = await apiClient.get(apiEndpoints.assignments.details(assignmentId));
      const normalized = normalizeAssignment(getPayloadData(response.data));
      const nextValues = createInitialValues(normalized);
      setFormValues(nextValues);
      await loadSubjectsByGroup(nextValues.groupId, nextValues.subjectIds);
    } catch (loadError) {
      setFormError(getApiMessage(loadError, "Failed to load assignment details."));
    } finally {
      setFormLoading(false);
    }
  }, [loadSubjectsByGroup]);

  useEffect(() => {
    if (!isFormRoute) loadListPageData();
  }, [isFormRoute, loadListPageData]);

  useEffect(() => {
    if (!isFormRoute) return;
    setAttachmentFile(null);
    setFormErrors({});
    loadMasterData();
    if (id) loadAssignmentDetails(id);
    else {
      setFormValues(createInitialValues());
      setSubjectOptions([]);
      setSubjectError("");
      setFormError("");
    }
  }, [id, isFormRoute, loadAssignmentDetails, loadMasterData]);

  const setFieldValue = (name, value) => {
    setFormValues((current) => {
      const next = { ...current, [name]: value };
      if (name === "groupId") {
        const selectedGroup = groupOptions.find((group) => group.value === String(value));
        next.subjectIds = [];
        if (selectedGroup?.academicLevel) next.academicLevel = selectedGroup.academicLevel;
      }
      return next;
    });
    setFormErrors((current) => ({ ...current, [name]: undefined }));
    if (name === "groupId") loadSubjectsByGroup(value);
  };

  const validateForm = () => {
    const nextErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const value = formValues[field];
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      if (value === undefined || value === null || String(value).trim() === "" || isEmptyArray) {
        nextErrors[field] = "This field is required";
      }
    });
    const maximumMarks = Number(formValues.maximumMarks);
    if (formValues.maximumMarks && (!Number.isInteger(maximumMarks) || maximumMarks <= 0)) {
      nextErrors.maximumMarks = "Enter a positive whole number";
    }
    const today = getTodayDate();
    const minimumDueDate = getTomorrowDate();
    if (formValues.startDate && formValues.startDate < today) {
      nextErrors.startDate = "Start date cannot be in the past.";
    }
    if (formValues.dueDate && formValues.dueDate < minimumDueDate) {
      nextErrors.dueDate = "Due date must be tomorrow or a future date.";
    }
    if (formValues.startDate && formValues.dueDate && formValues.dueDate < formValues.startDate) {
      nextErrors.dueDate = "Due Date cannot be earlier than Start Date.";
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!formValues.title?.trim()) {
      setFormErrors((current) => ({ ...current, title: "Title is required." }));
      setFormError("Title is required.");
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    try {
      const formData = buildAssignmentFormData(formValues, attachmentFile);
      if (import.meta.env.DEV) {
        console.log("Assignment form data:", [...formData.entries()].map(([key, value]) => [key, value instanceof File ? value.name : value]));
      }
      if (isEditMode) await apiClient.put(apiEndpoints.assignments.update(id), formData, multipartRequestConfig);
      else await apiClient.post(apiEndpoints.assignments.create, formData, multipartRequestConfig);
      setToast(isEditMode ? "Assignment updated successfully" : "Assignment created successfully");
      navigate("/dashboard/assignments");
    } catch (saveError) {
      setFormError(getApiMessage(saveError, "Failed to save assignment."));
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async () => {
    if (!deleting) return;
    try {
      await apiClient.delete(apiEndpoints.assignments.delete(deleting.id));
      setToast("Assignment deleted successfully");
      setDeleting(null);
      await loadAssignments();
    } catch (deleteError) {
      setToast(getApiMessage(deleteError, "Failed to delete assignment."));
      setDeleting(null);
    }
  };

  const exportAssignments = useCallback(() => {
    setExportPreviewRows(filteredAssignmentRows);
  }, [filteredAssignmentRows]);

  const downloadAssignmentsPdf = () => {
    if (!exportPreviewRows || exportingPdf) return;
    setExportingPdf(true);
    try {
      const exportDate = new Date();
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setFontSize(16);
      document.text("Assignments Export", 40, 40);
      document.setFontSize(10);
      document.text(`Export date: ${exportDate.toLocaleString()}`, 40, 58);
      autoTable(document, {
        startY: 72,
        head: [columns.map((column) => column.label)],
        body: exportPreviewRows.map((assignment) => columns.map((column) => String(assignment[column.key] ?? ""))),
        styles: { fontSize: 7, cellPadding: 4 },
        headStyles: { fillColor: [32, 83, 128] },
        margin: { left: 28, right: 28 },
      });
      document.save(`assignments-export-${getLocalDateString(exportDate)}.pdf`);
      setExportPreviewRows(null);
    } finally {
      setExportingPdf(false);
    }
  };

  const publishAssignments = async () => {
    if (!selectedIds.length || publishing) return;
    setPublishing(true);
    try {
      await apiClient.post(apiEndpoints.assignments.bulkPublish, { assignmentIds: selectedIds });
      setSelectedIds([]);
      setToastType("success");
      setToast(`${selectedIds.length} assignment${selectedIds.length === 1 ? "" : "s"} published successfully`);
      await loadAssignments();
    } catch (publishError) {
      setToastType("error");
      setToast(getApiMessage(publishError, "Unable to publish the selected assignments. Please try again."));
    } finally {
      setPublishing(false);
    }
  };

  const viewAssignment = async (row) => {
    try {
      const response = await apiClient.get(apiEndpoints.assignments.details(row.id));
      setViewing(normalizeAssignment(getPayloadData(response.data), {
        academicYears: academicYearMap,
        groups: groupMap,
        faculty: facultyMap,
        subjects: subjectMap,
      }));
    } catch {
      setViewing(row);
    }
  };

  if (isFormRoute) {
    return (
      <DashboardLayout title={`${isEditMode ? "Edit" : "Add"} Assignment`} subtitle={`Fill in the details below and save to ${isEditMode ? "update this" : "create a new"} record.`} breadcrumb={[MODULE_TITLE]}>
        <div className="cms-form-page">
          <Link to="/dashboard/assignments" className="cms-back-link"><ArrowLeft size={15} /> Back to Assignment </Link>
          <form className="cms-card" onSubmit={submitForm} noValidate>
            <div className="cms-card-body">
              {formLoading ? <Loader label="Loading assignment..." /> : null}
              {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
              <div className="cms-form-grid cols-3">
                <TextField name="title" label="Title" value={formValues.title} error={formErrors.title} onChange={setFieldValue} required />
                <SelectField name="academicYearId" label={masterLoading ? "Academic Year (loading...)" : "Academic Year"} value={formValues.academicYearId} error={formErrors.academicYearId || academicYearError} options={academicYearOptions} onChange={setFieldValue} required disabled={masterLoading || Boolean(academicYearError) || academicYearOptions.length === 0} emptyLabel={academicYearError ? "Academic years unavailable" : "No academic years found"} action={academicYearError ? <button type="button" className="cms-btn cms-btn-ghost" onClick={loadMasterData}>Retry academic years</button> : null} />
                <SelectField name="academicLevel" label="Academic Level" value={formValues.academicLevel} error={formErrors.academicLevel} options={levelOptions} onChange={setFieldValue} required />
                <SelectField name="groupId" label={masterLoading ? "Group (loading...)" : "Group"} value={formValues.groupId} error={formErrors.groupId || groupError} options={groupOptions} onChange={setFieldValue} required disabled={masterLoading || Boolean(groupError) || groupOptions.length === 0} emptyLabel={groupError ? "Groups unavailable" : "No groups found"} action={groupError ? <button type="button" className="cms-btn cms-btn-ghost" onClick={loadMasterData}>Retry groups</button> : null} />
                <MultiSelectField name="subjectIds" label={subjectLoading ? "Subject (loading...)" : "Subject"} values={formValues.subjectIds} error={formErrors.subjectIds || subjectError} options={subjectOptions} onChange={setFieldValue} required disabled={!formValues.groupId || subjectLoading || Boolean(subjectError)} emptyLabel={subjectError ? "Subjects unavailable" : formValues.groupId ? "No subjects found" : "Select group first"} action={subjectError && formValues.groupId ? <button type="button" className="cms-btn cms-btn-ghost" onClick={() => loadSubjectsByGroup(formValues.groupId, formValues.subjectIds)}>Retry subjects</button> : null} />
                <MultiSelectField name="facultyIds" label={masterLoading ? "Faculty (loading...)" : "Faculty"} values={formValues.facultyIds} error={formErrors.facultyIds || facultyError} options={facultyOptions} onChange={setFieldValue} required disabled={masterLoading || Boolean(facultyError) || facultyOptions.length === 0} emptyLabel={facultyError ? "Failed to load faculty." : "No faculty found"} action={facultyError ? <button type="button" className="cms-btn cms-btn-ghost" onClick={loadMasterData}>Retry faculty</button> : null} />
                <TextField name="startDate" label="Start Date" type="date" min={getTodayDate()} value={formValues.startDate} error={formErrors.startDate} onChange={setFieldValue} required />
                <TextField name="dueDate" label="Due Date" type="date" min={getTomorrowDate()} value={formValues.dueDate} error={formErrors.dueDate} onChange={setFieldValue} required />
                <FileField label="Attachment" file={attachmentFile} attachmentPath={formValues.attachmentPath} onChange={setAttachmentFile} />
                <TextField name="maximumMarks" label="Maximum Marks" type="number" value={formValues.maximumMarks} error={formErrors.maximumMarks} onChange={setFieldValue} required />
                <TextareaField name="description" label="Description" value={formValues.description} onChange={setFieldValue} />
              </div>
              <div className="cms-form-actions">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/assignments")}>Cancel</button>
                <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || formLoading}>{saving ? "Saving..." : isEditMode ? "Update Assignment" : "Save Assignment"}</button>
              </div>
            </div>
          </form>
        </div>
        <Toast message={toast} onClose={() => setToast("")} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={MODULE_TITLE} subtitle="Publish assignments, attachments and due dates." breadcrumb={["Operations"]}>
      {error ? (
        <div className="cms-card" style={{ marginBottom: 16 }}>
          <div className="cms-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "var(--cms-red)", fontWeight: 700 }}>{error}</span>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={loadAssignments}><RefreshCcw size={15} /> Retry</button>
          </div>
        </div>
      ) : null}
      <AssignmentsTable
        columns={columns}
        rows={filteredAssignmentRows}
        loading={loading}
        searchTerm={searchTerm}
        selectedGroup={selectedGroup}
        selectedLevel={selectedLevel}
        groupOptions={assignmentGroupOptions}
        levelOptions={levelOptions}
        onSearchChange={setSearchTerm}
        onGroupChange={setSelectedGroup}
        onLevelChange={setSelectedLevel}
        onClearFilters={() => { setSearchTerm(""); setSelectedGroup(""); setSelectedLevel(""); }}
        selectedIds={selectedIds}
        publishing={publishing}
        onSelectionChange={setSelectedIds}
        onExport={exportAssignments}
        onPublish={publishAssignments}
        addLabel="Add Assignment"
        onAdd={() => navigate("/dashboard/assignments/add")}
        onEdit={(row) => navigate(`/dashboard/assignments/${row.id}/edit`)}
        onDelete={(row) => setDeleting(row)}
        onView={viewAssignment}
      />
      {deleting ? (
        <ConfirmDialog
          title="Delete assignment"
          message={`Delete "${deleting.title || "this assignment"}"? This action cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={deleteAssignment}
        />
      ) : null}
      {viewing ? (
        <Modal title="Assignment details" onClose={() => setViewing(null)} footer={<button className="cms-btn cms-btn-ghost" onClick={() => setViewing(null)}>Close</button>}>
          <div className="cms-kv">
            {columns.map((column) => (
              <div key={column.key}><span>{column.label}</span><strong>{String(viewing[column.key] ?? "-")}</strong></div>
            ))}
            <div><span>Description</span><strong>{viewing.description || "-"}</strong></div>
            <div><span>Attachment</span><strong>{viewing.attachmentPath || "-"}</strong></div>
          </div>
        </Modal>
      ) : null}
      {exportPreviewRows ? (
        <ExportPreviewModal
          rows={exportPreviewRows}
          onCancel={() => setExportPreviewRows(null)}
          onDownload={downloadAssignmentsPdf}
          downloading={exportingPdf}
        />
      ) : null}
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function ExportPreviewModal({ rows, onCancel, onDownload, downloading }) {
  return (
    <Modal
      title="Assignments Export Preview"
      onClose={downloading ? () => {} : onCancel}
      footer={(
        <>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={downloading}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={onDownload} disabled={downloading}>
            <Download size={15} /> {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </>
      )}
    >
      <p style={{ marginTop: 0, color: "var(--cms-muted)" }}>{rows.length} filtered assignment{rows.length === 1 ? "" : "s"} will be included.</p>
      <div className="cms-table-wrap" style={{ maxHeight: "55vh", overflow: "auto" }}>
        <table className="cms-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => <td key={column.key}>{row[column.key] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function TextField({ name, label, value, error, onChange, type = "text", required, min, disabled = false }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`assignment-${name}`}>{label} {required ? <span className="req">*</span> : null}</label>
      <input id={`assignment-${name}`} type={type} min={min} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(name, event.target.value)} />
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

function SelectField({ name, label, value, error, options, onChange, required, disabled, emptyLabel, action }) {
  const cleanLabel = label.replace(" (loading...)", "");

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`assignment-${name}`}>{label} {required ? <span className="req">*</span> : null}</label>
      <select id={`assignment-${name}`} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(name, event.target.value)}>
        <option value="">{options.length ? `Select ${cleanLabel}` : emptyLabel || `Select ${cleanLabel}`}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <span className="cms-error">{error}</span> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

function MultiSelectField({ name, label, values = [], error, options, onChange, required, disabled, emptyLabel, action }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fieldRef = useRef(null);
  const selectedValues = new Set(toIdArray(values));
  const selectedOptions = options.filter((option) => selectedValues.has(String(option.value)));
  const cleanLabel = label.replace(" (loading...)", "");
  const visibleOptions = options.filter((option) => normalizeFilterValue(option.label).includes(normalizeFilterValue(query)));
  const summary = selectedOptions.length === 0
    ? `Select ${cleanLabel}`
    : selectedOptions.length <= 2
      ? selectedOptions.map((option) => option.label).join(", ")
      : `${selectedOptions[0].label} +${selectedOptions.length - 1} more`;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const updateSelection = (value) => {
    const next = new Set(selectedValues);
    if (next.has(String(value))) next.delete(String(value));
    else next.add(String(value));
    onChange(name, [...next]);
  };

  return (
    <div ref={fieldRef} className={`cms-field assignment-multi-select ${error ? "has-error" : ""}`}>
      <label>{label} {required ? <span className="req">*</span> : null}</label>
      <button type="button" className="assignment-multi-trigger" disabled={disabled} onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        <span className={selectedOptions.length ? "assignment-multi-summary" : "assignment-multi-placeholder"}>{summary}</span>
        <span className={`assignment-multi-caret ${isOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
      </button>
      {isOpen ? (
        <div className="assignment-multi-menu">
          <input
            className="assignment-multi-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${cleanLabel.toLowerCase()}...`}
            autoFocus
          />
          <div className="assignment-multi-options">
            {visibleOptions.length ? visibleOptions.map((option) => {
              const checked = selectedValues.has(String(option.value));
              return (
                <label key={option.value} className={`assignment-multi-option ${checked ? "is-selected" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => updateSelection(option.value)} />
                  <span className="assignment-multi-option-label">{option.label}</span>
                </label>
              );
            }) : <span className="assignment-multi-empty">{options.length ? "No matching options" : emptyLabel || "No options found"}</span>}
          </div>
        </div>
      ) : null}
      {error ? <span className="cms-error">{error}</span> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

function FileField({ label, file, attachmentPath, onChange }) {
  return (
    <div className="cms-field">
      <label htmlFor="assignment-attachment">{label}</label>
      <input id="assignment-attachment" type="file" onChange={(event) => onChange(event.target.files?.[0] || null)} />
      {file ? <span className="cms-error" style={{ color: "var(--cms-muted)" }}>{file.name}</span> : attachmentPath ? <span className="cms-error" style={{ color: "var(--cms-muted)" }}>Current: {attachmentPath}</span> : null}
    </div>
  );
}

function TextareaField({ name, label, value, onChange }) {
  return (
    <div className="cms-field full">
      <label htmlFor={`assignment-${name}`}>{label}</label>
      <textarea id={`assignment-${name}`} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} />
    </div>
  );
}

function AssignmentsTable({
  columns,
  rows,
  loading,
  searchTerm,
  selectedGroup,
  selectedLevel,
  groupOptions,
  levelOptions,
  onSearchChange,
  onGroupChange,
  onLevelChange,
  onClearFilters,
  selectedIds,
  publishing,
  onSelectionChange,
  onExport,
  onPublish,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  onView,
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const allFilteredSelected = rows.length > 0 && rows.every((row) => selectedIdSet.has(String(row.id)));

  const toggleRowSelection = (id) => {
    const key = String(id);
    onSelectionChange(selectedIdSet.has(key)
      ? selectedIds.filter((selectedId) => String(selectedId) !== key)
      : [...selectedIds, id]);
  };

  const toggleFilteredSelection = () => {
    const filteredIds = rows.map((row) => row.id);
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredIds.map(String));
      onSelectionChange(selectedIds.filter((id) => !filteredIdSet.has(String(id))));
    } else {
      onSelectionChange([...new Map([...selectedIds, ...filteredIds].map((id) => [String(id), id])).values()]);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedGroup, selectedLevel]);

  return (
    <section className="cms-card">
      <div className="cms-toolbar assignment-toolbar">
        <div className="cms-search">
          <Search size={16} />
          <input
            value={searchTerm}
            placeholder="Search assignments..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <select
          className="assignment-filter-select"
          value={selectedGroup}
          onChange={(event) => onGroupChange(event.target.value)}
          aria-label="Filter by group"
        >
          <option value="">All groups</option>
          {groupOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="assignment-filter-select"
          value={selectedLevel}
          onChange={(event) => onLevelChange(event.target.value)}
          aria-label="Filter by academic level"
        >
          <option value="">All levels</option>
          {levelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {searchTerm || selectedGroup || selectedLevel ? (
          <button
            type="button"
            className="cms-btn cms-btn-ghost assignment-toolbar-button assignment-clear-filters-btn"
            title="Clear filters"
            aria-label="Clear filters"
            onClick={onClearFilters}
          >
            <FilterX size={16} />
          </button>
        ) : null}
        {selectedIds.length ? (
          <button type="button" className="cms-btn cms-btn-primary assignment-toolbar-button" onClick={onPublish} disabled={publishing}>
            {publishing ? "Publishing..." : `Publish (${selectedIds.length})`}
          </button>
        ) : null}
        <button type="button" className="cms-btn cms-btn-ghost assignment-toolbar-button" onClick={onExport}>
          <Download size={15} /> Export
        </button>
        <button type="button" className="cms-btn cms-btn-primary assignment-toolbar-button" onClick={onAdd}>
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      {loading ? (
        <Loader label="Loading assignments..." />
      ) : (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleFilteredSelection}
                    aria-label="Select all filtered assignments"
                  />
                </th>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length ? (
                pageRows.map((row) => (
                  <tr key={row.id} className="assignment-row-clickable" onDoubleClick={() => onView(row)}>
                    <td onDoubleClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIdSet.has(String(row.id))}
                        onChange={() => toggleRowSelection(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className={column.strong ? "cms-strong" : ""}>
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                    <td>
                      <div className="cms-actions">
                        <button
                          type="button"
                          className="cms-action-btn view"
                          title="View"
                          aria-label="View assignment"
                          onClick={() => onView(row)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn edit"
                          title="Edit"
                          aria-label="Edit assignment"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn danger"
                          title="Delete"
                          aria-label="Delete assignment"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <div className="cms-empty">No assignments found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="cms-pagination">
        <span className="cms-page-info">
          Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-
          {Math.min(currentPage * pageSize, rows.length)} of {rows.length} records
        </span>
        <button
          type="button"
          className="cms-page-btn"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            type="button"
            key={index}
            className={`cms-page-btn ${currentPage === index + 1 ? "is-active" : ""}`}
            onClick={() => setPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}
        <button
          type="button"
          className="cms-page-btn"
          disabled={currentPage === totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
