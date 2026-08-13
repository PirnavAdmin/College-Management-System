import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, FilterX, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import "./AssignmentsMaterialsPage.css";

const MODULE_TITLE = "Assignment";
const REQUIRED_FIELDS = ["title", "academicYearId", "academicLevel", "groupId", "subjectIds", "startDate", "dueDate", "maximumMarks"];

const columns = [
  { key: "title", label: "Assignment Title", strong: true },
  { key: "academicYear", label: "Academic Year" },
  { key: "academicLevel", label: "Academic Level" },
  { key: "group", label: "Group" },
  { key: "subject", label: "Subject" },
  { key: "faculty", label: "Faculty" },
  { key: "start", label: "Start Date" },
  { key: "due", label: "Due Date" },
  { key: "max", label: "Maximum Marks" },
  { key: "createdBy", label: "Created By" },
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
    : payload?.message || payload?.Message || payload?.detail || payload?.Detail || payload?.title || payload?.Title || payload?.error || payload?.Error || error?.message || fallback;
}

function getValidationMessages(payload) {
  const errors = payload?.errors ?? payload?.Errors;
  if (!errors || typeof errors !== "object") return [];
  return Object.values(errors).flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
    .filter((message) => typeof message === "string" && message.trim())
    .map((message) => message.trim());
}

function getMasterDataMessage(error, fallback) {
  if (error?.response?.status === 401) return "Unauthorized. Please login again or check admin permissions.";
  return getApiMessage(error, fallback);
}

// Vite 502/TLS failures usually mean the backend/ngrok tunnel is down; never auto-retry this endpoint.
function getAssignmentsLoadMessage(error) {
  const status = error?.response?.status;
  if (import.meta.env.DEV) console.log("Assignments API status:", status || "network-error");
  if (status === 500) return "Assignments API failed on server. Please check backend logs for GET /api/admin/assignments.";
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

function getCreatorDetails(item = {}) {
  const creator = item.createdBy ?? item.CreatedBy ?? item.creator ?? item.Creator ?? {};
  const creatorValue = typeof creator === "object" && creator !== null ? creator : {};
  return {
    // These API response fields are read defensively; no creator role is inferred
    // from the assignment's faculty data.
    role: item.createdByType ?? item.CreatedByType ?? item.createdByRole ?? item.CreatedByRole ?? item.creatorRole ?? item.CreatorRole ?? creatorValue.role ?? creatorValue.Role ?? "",
    name: item.createdByName ?? item.CreatedByName ?? item.creatorName ?? item.CreatorName ?? item.created_by ?? item.createdByEmail ?? item.CreatedByEmail ?? creatorValue.name ?? creatorValue.Name ?? creatorValue.fullName ?? creatorValue.FullName ?? creatorValue.email ?? creatorValue.Email ?? (typeof creator === "string" ? creator : ""),
  };
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
    academicLevel: firstValue(item, ["academicLevel", "AcademicLevel"]) || "",
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
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label || value) };
}

function normalizeAssignment(item = {}, lookups = {}) {
  const id = item.assignmentId ?? item.AssignmentId ?? item.id ?? item.Id;
  const academicYear = item.academicYear ?? item.AcademicYear ?? {};
  const group = item.group ?? item.Group ?? {};
  const subject = item.subject ?? item.Subject ?? {};
  const faculty = item.faculty ?? item.Faculty ?? {};
  const creator = getCreatorDetails(item);
  const academicYearId = item.academicYearId ?? item.AcademicYearId ?? item.yearId ?? item.YearId ?? academicYear?.id ?? academicYear?.Id ?? "";
  const academicYearName = item.academicYearName ?? item.AcademicYearName ?? item.yearName ?? item.YearName ?? academicYear?.name ?? academicYear?.Name ?? "";
  const groupId = item.groupId ?? item.GroupId ?? group?.id ?? group?.Id ?? group?.groupId ?? group?.GroupId ?? "";
  const groupName = item.groupName ?? item.GroupName ?? group?.groupName ?? group?.GroupName ?? group?.name ?? group?.Name ?? group?.groupCode ?? group?.GroupCode ?? "";
  const subjectId = item.subjectId ?? item.SubjectId ?? subject?.id ?? subject?.Id ?? subject?.subjectId ?? subject?.SubjectId ?? "";
  const subjectName = item.subjectName ?? item.SubjectName ?? subject?.subjectName ?? subject?.SubjectName ?? subject?.name ?? subject?.Name ?? "";
  const facultyId = item.facultyId ?? item.FacultyId ?? faculty?.id ?? faculty?.Id ?? faculty?.facultyId ?? faculty?.FacultyId ?? "";
  const facultyName = item.facultyName ?? item.FacultyName ?? faculty?.facultyName ?? faculty?.FacultyName ?? faculty?.fullName ?? faculty?.FullName ?? faculty?.name ?? faculty?.Name ?? "";
  const startDate = firstValue(item, ["startDate", "StartDate", "start_date", "Start_Date", "assignmentStartDate", "AssignmentStartDate"]);
  const dueDate = firstValue(item, ["dueDate", "DueDate", "due_date", "Due_Date", "due"]);
  const maximumMarks = item.maximumMarks ?? item.MaximumMarks ?? item.max ?? "";
  const academicYearDisplay = academicYearName || lookups.academicYears?.[String(academicYearId)]?.label || academicYearId || "-";
  const groupDisplay = groupName || lookups.groups?.[String(groupId)]?.label || groupId || "-";
  const facultyDisplay = facultyName || lookups.faculty?.[String(facultyId)]?.label || facultyId || "-";
  const subjectDisplay = subjectName || subjectId || "-";

  return {
    id,
    assignmentId: id,
    title: item.title ?? item.Title ?? "-",
    academicYearId,
    academicYearName,
    academicYear: academicYearDisplay,
    academicLevel: item.academicLevel ?? item.AcademicLevel ?? group?.academicLevel ?? group?.AcademicLevel ?? "-",
    groupId,
    groupFilterValue: String(groupId || groupDisplay),
    groupName,
    group: groupDisplay,
    subjectId,
    subjectName,
    subject: subjectDisplay,
    facultyId,
    facultyName,
    faculty: facultyDisplay,
    creatorRole: normalizeFilterValue(creator.role),
    creatorName: valueToText(creator.name),
    createdBy: valueToText(creator.role) || "-",
    description: item.description ?? item.Description ?? "",
    startDate,
    start: formatDate(startDate) || "-",
    dueDate,
    due: formatDate(dueDate) || "-",
    attachmentPath: item.attachmentPath ?? item.AttachmentPath ?? item.attachment ?? "",
    max: maximumMarks,
    maximumMarks,
  };
}

function formatDate(value) {
  if (!value || value === "-") return "";
  return String(value).slice(0, 10);
}

function toApiDateTime(value) {
  return value ? `${value}T00:00:00.000Z` : "";
}

function createInitialValues(row) {
  return {
    title: row?.title || "",
    academicYearId: row?.academicYearId ? String(row.academicYearId) : "",
    academicLevel: row?.academicLevel && row.academicLevel !== "-" ? row.academicLevel : "",
    groupId: row?.groupId ? String(row.groupId) : "",
    subjectIds: row?.subjectId ? [String(row.subjectId)] : [],
    startDate: formatDate(row?.startDate),
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
  values.subjectIds.forEach((subjectId) => formData.append("SubjectIds", String(subjectId)));
  formData.append("Description", values.description?.trim() || "");
  formData.append("StartDate", toApiDateTime(values.startDate));
  formData.append("DueDate", toApiDateTime(values.dueDate));
  formData.append("AttachmentPath", values.attachmentPath || "");
  formData.append("MaximumMarks", String(Number(values.maximumMarks)));
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
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [facultyError, setFacultyError] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);

  const academicYearMap = useMemo(() => makeLookup(academicYearOptions), [academicYearOptions]);
  const groupMap = useMemo(() => makeLookup(groupOptions), [groupOptions]);
  const facultyMap = useMemo(() => makeLookup(facultyOptions), [facultyOptions]);
  const levelOptions = useMemo(() => {
    const levels = [...new Set(groupOptions.map((group) => group.academicLevel).filter(Boolean))];
    const source = levels.length ? levels : ["First Year", "Second Year"];
    return source.map((level) => ({ value: level, label: level }));
  }, [groupOptions]);

  const [rawAssignments, setRawAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

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
  })), [academicYearMap, facultyMap, groupMap, rawAssignments]);
  const filteredAssignmentRows = useMemo(() => {
    const search = normalizeFilterValue(searchTerm);
    const matches = assignmentRows.filter((assignment) => {
      const matchesSearch = !search || [
        assignment.title,
        assignment.academicYear,
        assignment.academicLevel,
        assignment.group,
        assignment.subject,
        assignment.faculty,
        assignment.description,
        assignment.creatorName,
      ].some((value) => normalizeFilterValue(value).includes(search));
      const matchesGroup = !selectedGroup || assignment.groupFilterValue === selectedGroup;
      return matchesSearch && matchesGroup;
    });
    if (!search) return matches;
    return matches
      .map((assignment, index) => ({ assignment, index }))
      .sort((left, right) => {
        const leftPrefix = normalizeFilterValue(left.assignment.title).startsWith(search);
        const rightPrefix = normalizeFilterValue(right.assignment.title).startsWith(search);
        return Number(rightPrefix) - Number(leftPrefix) || left.index - right.index;
      })
      .map(({ assignment }) => assignment);
  }, [assignmentRows, searchTerm, selectedGroup]);

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
        groups: `${apiEndpoints.groups.listPage}?pageNumber=1&pageSize=100&isActive=true`,
      });
    }

    const [academicYearsResult, groupsResult, facultyResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.groups.listPage, {
        params: { pageNumber: 1, pageSize: 100, isActive: true },
      }),
      apiClient.get(apiEndpoints.faculty.list),
    ]);

    let nextAcademicYears = [];
    let nextGroups = [];
    let nextFaculty = [];

    if (academicYearsResult.status === "fulfilled") {
      nextAcademicYears = getCollection(academicYearsResult.value.data).map(normalizeAcademicYear).filter(Boolean);
      setAcademicYearOptions(nextAcademicYears);
    } else {
      setAcademicYearOptions([]);
      setAcademicYearError(getMasterDataMessage(academicYearsResult.reason, "Failed to load academic years."));
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
      if (import.meta.env.DEV) {
        console.error("Faculty master data failed:", {
          status: facultyResult.reason.response?.status,
          data: facultyResult.reason.response?.data,
        });
      }
      setFacultyOptions([]);
      setFacultyError(getMasterDataMessage(facultyResult.reason, "Failed to load faculty."));
    }

    if (import.meta.env.DEV) {
      console.log("Assignments master data loaded:", {
        academicYears: nextAcademicYears.length,
        groups: nextGroups.length,
        faculty: nextFaculty.length,
      });
    }

    setMasterLoading(false);
    masterLoadingRef.current = false;
    return {
      academicYearMap: makeLookup(nextAcademicYears),
      groupMap: makeLookup(nextGroups),
      facultyMap: makeLookup(nextFaculty),
    };
  }, []);

  const loadAssignments = useCallback(async () => {
    if (assignmentsLoadingRef.current) return;
    assignmentsLoadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      if (import.meta.env.DEV) console.log("Loading assignments once");
      const response = await apiClient.get(apiEndpoints.assignments.adminList);
      setRawAssignments(getCollection(response.data));
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
          academicYears: apiEndpoints.academicYears.list,
          groups: `${apiEndpoints.groups.listPage}?pageNumber=1&pageSize=100&isActive=true`,
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
      const response = await apiClient.get(apiEndpoints.assignments.subjectsByGroup(groupId));
      const nextOptions = getCollection(response.data).map(normalizeSubject).filter(Boolean);
      setSubjectOptions(nextOptions);
      setFormValues((current) => ({
        ...current,
        subjectIds: (selectedSubjectIds.length ? selectedSubjectIds : current.subjectIds || [])
          .map(String)
          .filter((subjectId) => nextOptions.some((option) => option.value === subjectId)),
      }));
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
      if (name === "startDate" && next.dueDate && next.dueDate < value) next.dueDate = "";
      return next;
    });
    setFormErrors((current) => ({ ...current, [name]: undefined }));
    if (name === "groupId") loadSubjectsByGroup(value);
  };

  const validateForm = () => {
    const nextErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const isEmptyArray = Array.isArray(formValues[field]) && formValues[field].length === 0;
      if (isEmptyArray || formValues[field] === undefined || formValues[field] === null || String(formValues[field]).trim() === "") {
        nextErrors[field] = "This field is required";
      }
    });
    const maximumMarks = Number(formValues.maximumMarks);
    if (formValues.maximumMarks && (!Number.isInteger(maximumMarks) || maximumMarks <= 0)) {
      nextErrors.maximumMarks = "Enter a positive whole number";
    }
    if (formValues.startDate && formValues.dueDate && formValues.dueDate < formValues.startDate) {
      nextErrors.dueDate = "Due date must be the same as or later than the start date.";
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
        console.log("Create Assignment FormData:");
        for (const [key, value] of formData.entries()) console.log(key, value);
      }
      if (isEditMode) await apiClient.put(apiEndpoints.assignments.update(id), formData, multipartRequestConfig);
      else await apiClient.post(apiEndpoints.assignments.adminCreate, formData, multipartRequestConfig);
      setToast(isEditMode ? "Assignment updated successfully" : "Assignment created successfully");
      navigate("/dashboard/assignments");
    } catch (saveError) {
      if (import.meta.env.DEV) {
        console.error("Create Assignment API Error:", {
          url: isEditMode ? apiEndpoints.assignments.update(id) : apiEndpoints.assignments.adminCreate,
          method: isEditMode ? "PUT" : "POST",
          status: saveError?.response?.status,
          data: saveError?.response?.data,
        });
      }
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

  const viewAssignment = async (row) => {
    try {
      const response = await apiClient.get(apiEndpoints.assignments.details(row.id));
      setViewing(normalizeAssignment(getPayloadData(response.data), {
        academicYears: academicYearMap,
        groups: groupMap,
        faculty: facultyMap,
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
                <MultiSubjectField label={subjectLoading ? "Subject (loading...)" : "Subject"} values={formValues.subjectIds} error={formErrors.subjectIds || subjectError} options={subjectOptions} onChange={(subjectIds) => setFieldValue("subjectIds", subjectIds)} required disabled={!formValues.groupId || subjectLoading || Boolean(subjectError)} emptyLabel={subjectError ? "Subjects unavailable" : formValues.groupId ? "No subjects available" : "Select group first"} action={subjectError && formValues.groupId ? <button type="button" className="cms-btn cms-btn-ghost" onClick={() => loadSubjectsByGroup(formValues.groupId)}>Retry subjects</button> : null} />
                <TextField name="startDate" label="Start Date" type="date" value={formValues.startDate} error={formErrors.startDate} onChange={setFieldValue} required />
                <TextField name="dueDate" label="Due Date" type="date" min={formValues.startDate} value={formValues.dueDate} error={formErrors.dueDate} onChange={setFieldValue} required />
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
        groupOptions={groupOptions}
        onSearchChange={setSearchTerm}
        onGroupChange={setSelectedGroup}
        onClearFilters={() => { setSearchTerm(""); setSelectedGroup(""); }}
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
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function AssignmentsTable({
  columns,
  rows,
  loading,
  searchTerm,
  selectedGroup,
  groupOptions,
  onSearchChange,
  onGroupChange,
  onClearFilters,
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
  const hasFilters = Boolean(searchTerm || selectedGroup);

  useEffect(() => setPage(1), [searchTerm, selectedGroup]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="cms-card">
      <div className="cms-toolbar assignment-toolbar">
        <div className="cms-search">
          <Search size={16} />
          <input value={searchTerm} placeholder="Search Assignment..." onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        <select className="assignment-filter-select" value={selectedGroup} onChange={(event) => onGroupChange(event.target.value)} aria-label="Filter by group">
          <option value="">All Groups</option>
          {groupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="button" className="cms-btn cms-btn-ghost assignment-toolbar-button" onClick={onClearFilters}>All Assignments</button>
        {hasFilters ? <button type="button" className="cms-icon-btn assignment-clear-filters-btn" onClick={onClearFilters} aria-label="Clear filters" title="Clear filters"><FilterX size={16} /></button> : null}
        <button type="button" className="cms-btn cms-btn-ghost assignment-toolbar-button" onClick={() => window.print()}><Download size={14} /> Export</button>
        <button type="button" className="cms-btn cms-btn-primary assignment-toolbar-button" onClick={onAdd}><Plus size={15} /> {addLabel}</button>
      </div>
      {loading ? <Loader /> : (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {pageRows.length === 0 ? <tr><td colSpan={columns.length + 1}><div className="cms-empty">No assignments found.</div></td></tr> : pageRows.map((row) => (
                <tr key={row.id} className="assignment-row-clickable" onClick={() => onView(row)}>
                  {columns.map((column) => <td key={column.key} className={column.strong ? "cms-strong" : ""}>{valueToText(column.render ? column.render(row) : row[column.key]) || "-"}</td>)}
                  <td onClick={(event) => event.stopPropagation()}><div className="cms-actions" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="cms-action-btn view" title="View" aria-label="View assignment" onClick={() => onView(row)}><Eye size={15} /></button>
                    <button type="button" className="cms-action-btn edit" title="Edit" aria-label="Edit assignment" onClick={() => onEdit(row)}><Pencil size={15} /></button>
                    <button type="button" className="cms-action-btn danger" title="Delete" aria-label="Delete assignment" onClick={() => onDelete(row)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="cms-pagination">
        <span className="cms-page-info">Showing {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, rows.length)} of {rows.length} records</span>
        <button type="button" className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Prev</button>
        {Array.from({ length: totalPages }).map((_, index) => <button type="button" key={index} className={`cms-page-btn ${currentPage === index + 1 ? "is-active" : ""}`} onClick={() => setPage(index + 1)}>{index + 1}</button>)}
        <button type="button" className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}

function TextField({ name, label, value, error, onChange, type = "text", required, min }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`assignment-${name}`}>{label} {required ? <span className="req">*</span> : null}</label>
      <input id={`assignment-${name}`} type={type} min={min} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} />
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

function MultiSubjectField({ label, values, error, options, onChange, required, disabled, emptyLabel, action }) {
  const [open, setOpen] = useState(false);
  const selectedValues = values || [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

  const toggleSubject = (subjectId) => {
    onChange(selectedValues.includes(subjectId)
      ? selectedValues.filter((value) => value !== subjectId)
      : [...selectedValues, subjectId]);
  };

  return (
    <div className={`cms-field assignment-subject-field ${error ? "has-error" : ""}`}>
      <label>{label} {required ? <span className="req">*</span> : null}</label>
      <button
        type="button"
        className="assignment-subject-trigger"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="assignment-subject-chips">
          {selectedOptions.length ? selectedOptions.map((option) => (
            <span className="assignment-subject-chip" key={option.value}>
              {option.label}
              <span
                className="assignment-subject-chip-remove"
                role="button"
                tabIndex={0}
                aria-label={`Remove ${option.label}`}
                onClick={(event) => { event.stopPropagation(); toggleSubject(option.value); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleSubject(option.value);
                  }
                }}
              >
                ×
              </span>
            </span>
          )) : <span className="assignment-subject-placeholder">{emptyLabel || "Select subjects"}</span>}
        </span>
      </button>
      {open && !disabled ? (
        <div className="assignment-subject-menu" role="listbox" aria-label="Subjects" aria-multiselectable="true">
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <button type="button" className="assignment-subject-option" key={option.value} role="option" aria-selected={selected} onClick={() => toggleSubject(option.value)}>
                <span className="assignment-subject-checkbox">{selected ? "✓" : ""}</span>
                {option.label}
              </button>
            );
          })}
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
