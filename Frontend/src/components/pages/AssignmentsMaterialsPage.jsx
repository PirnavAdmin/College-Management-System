import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import "./AssignmentsMaterialsPage.css";

const MODULE_TITLE = "Assignment";
const REQUIRED_FIELDS = ["title", "academicYearId", "academicLevel", "groupId", "subjectId", "facultyId", "dueDate", "maximumMarks"];

const columns = [
  { key: "title", label: "Assignment Title", strong: true },
  { key: "academicYear", label: "Academic Year" },
  { key: "academicLevel", label: "Academic Level" },
  { key: "group", label: "Group" },
  { key: "subject", label: "Subject" },
  { key: "faculty", label: "Faculty" },
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

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMasterDataMessage(error, fallback) {
  if (error?.response?.status === 401) return "Unauthorized. Please login again or check admin permissions.";
  return getApiMessage(error, fallback);
}

// Vite 502/TLS failures usually mean the backend/ngrok tunnel is down; never auto-retry this endpoint.
function getAssignmentsLoadMessage(error) {
  const status = error?.response?.status;
  if (import.meta.env.DEV) console.log("Assignments API status:", status || "network-error");
  if (status === 500) return "Assignments API failed on server. Please check backend logs for GET /api/v1/assignments.";
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

function uniqueFilterOptions(rows, labelKey, valueKey) {
  const values = new Map();
  rows.forEach((row) => {
    const value = valueToText(row[valueKey]).trim();
    const label = valueToText(row[labelKey]).trim();
    if (value && label && label !== "-") values.set(value, label);
  });
  return [...values].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
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
  const academicYearId = item.academicYearId ?? item.AcademicYearId ?? item.yearId ?? item.YearId ?? "";
  const academicYearName = item.academicYearName ?? item.AcademicYearName ?? item.yearName ?? item.YearName ?? "";
  const groupId = item.groupId ?? item.GroupId ?? "";
  const groupName = item.groupName ?? item.GroupName ?? "";
  const subjectId = item.subjectId ?? item.SubjectId ?? "";
  const subjectName = item.subjectName ?? item.SubjectName ?? "";
  const facultyId = item.facultyId ?? item.FacultyId ?? "";
  const facultyName = item.facultyName ?? item.FacultyName ?? "";
  const dueDate = item.dueDate ?? item.DueDate ?? item.due ?? "";
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
    academicLevel: item.academicLevel ?? item.AcademicLevel ?? "-",
    groupId,
    groupName,
    group: groupDisplay,
    subjectId,
    subjectName,
    subject: subjectDisplay,
    facultyId,
    facultyName,
    faculty: facultyDisplay,
    description: item.description ?? item.Description ?? "",
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

function createInitialValues(row) {
  return {
    title: row?.title || "",
    academicYearId: row?.academicYearId ? String(row.academicYearId) : "",
    academicLevel: row?.academicLevel && row.academicLevel !== "-" ? row.academicLevel : "",
    groupId: row?.groupId ? String(row.groupId) : "",
    subjectId: row?.subjectId ? String(row.subjectId) : "",
    facultyId: row?.facultyId ? String(row.facultyId) : "",
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
  formData.append("SubjectId", String(values.subjectId));
  formData.append("FacultyId", String(values.facultyId));
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
  const [selectedFaculty, setSelectedFaculty] = useState("");

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
  const assignmentGroupOptions = useMemo(() => uniqueFilterOptions(assignmentRows, "group", "groupId"), [assignmentRows]);
  const assignmentFacultyOptions = useMemo(() => uniqueFilterOptions(assignmentRows, "faculty", "facultyId"), [assignmentRows]);
  const filteredAssignmentRows = useMemo(() => {
    const search = normalizeFilterValue(searchTerm);
    return assignmentRows.filter((assignment) => {
      const matchesSearch = !search || [
        assignment.title,
        assignment.academicYear,
        assignment.academicLevel,
        assignment.group,
        assignment.subject,
        assignment.faculty,
        assignment.description,
      ].some((value) => normalizeFilterValue(value).includes(search));
      const matchesGroup = !selectedGroup || String(assignment.groupId) === selectedGroup;
      const matchesFaculty = !selectedFaculty || String(assignment.facultyId) === selectedFaculty;
      return matchesSearch && matchesGroup && matchesFaculty;
    });
  }, [assignmentRows, searchTerm, selectedFaculty, selectedGroup]);

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
        groups: apiEndpoints.groups.list,
      });
    }

    const [academicYearsResult, groupsResult, facultyResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.groups.list),
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
      const response = await apiClient.get(apiEndpoints.assignments.list);
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
          assignments: apiEndpoints.assignments.list,
          academicYears: apiEndpoints.academicYears.list,
          groups: apiEndpoints.groups.list,
          faculty: apiEndpoints.faculty.list,
        },
      });
    }
    loadMasterData();
    loadAssignments();
  }, [loadAssignments, loadMasterData]);

  const loadSubjectsByGroup = useCallback(async (groupId, selectedSubjectId = "") => {
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
      if (selectedSubjectId && !nextOptions.some((option) => option.value === String(selectedSubjectId))) {
        setFormValues((current) => ({ ...current, subjectId: "" }));
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
      await loadSubjectsByGroup(nextValues.groupId, nextValues.subjectId);
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
        next.subjectId = "";
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
      if (formValues[field] === undefined || formValues[field] === null || String(formValues[field]).trim() === "") {
        nextErrors[field] = "This field is required";
      }
    });
    const maximumMarks = Number(formValues.maximumMarks);
    if (formValues.maximumMarks && (!Number.isInteger(maximumMarks) || maximumMarks <= 0)) {
      nextErrors.maximumMarks = "Enter a positive whole number";
    }
    const minimumDueDate = getTomorrowDate();
    if (formValues.dueDate && formValues.dueDate < minimumDueDate) {
      nextErrors.dueDate = "Due date must be tomorrow or a future date.";
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
                <SelectField name="subjectId" label={subjectLoading ? "Subject (loading...)" : "Subject"} value={formValues.subjectId} error={formErrors.subjectId || subjectError} options={subjectOptions} onChange={setFieldValue} required disabled={!formValues.groupId || subjectLoading || Boolean(subjectError)} emptyLabel={subjectError ? "Subjects unavailable" : formValues.groupId ? "No subjects found" : "Select group first"} action={subjectError && formValues.groupId ? <button type="button" className="cms-btn cms-btn-ghost" onClick={() => loadSubjectsByGroup(formValues.groupId)}>Retry subjects</button> : null} />
                <SelectField name="facultyId" label={masterLoading ? "Faculty (loading...)" : "Faculty"} value={formValues.facultyId} error={formErrors.facultyId || facultyError} options={facultyOptions} onChange={setFieldValue} required disabled={masterLoading || Boolean(facultyError) || facultyOptions.length === 0} emptyLabel={facultyError ? "Failed to load faculty." : "No faculty found"} action={facultyError ? <button type="button" className="cms-btn cms-btn-ghost" onClick={loadMasterData}>Retry faculty</button> : null} />
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
        selectedFaculty={selectedFaculty}
        groupOptions={assignmentGroupOptions}
        facultyOptions={assignmentFacultyOptions}
        onSearchChange={setSearchTerm}
        onGroupChange={setSelectedGroup}
        onFacultyChange={setSelectedFaculty}
        onClearFilters={() => { setSearchTerm(""); setSelectedGroup(""); setSelectedFaculty(""); }}
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
  columns: tableColumns,
  rows,
  loading,
  searchTerm,
  selectedGroup,
  selectedFaculty,
  groupOptions,
  facultyOptions,
  onSearchChange,
  onGroupChange,
  onFacultyChange,
  onClearFilters,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  onView,
}) {
  const hasFilters = Boolean(searchTerm || selectedGroup || selectedFaculty);

  return (
    <div className="cms-card">
      <div className="cms-toolbar assignment-toolbar">
        <div className="cms-search">
          <Search size={16} />
          <input value={searchTerm} placeholder="Search assignments..." onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        <select className="assignment-filter-select" value={selectedGroup} onChange={(event) => onGroupChange(event.target.value)} aria-label="Filter by group">
          <option value="">All groups</option>
          {groupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select className="assignment-filter-select" value={selectedFaculty} onChange={(event) => onFacultyChange(event.target.value)} aria-label="Filter by faculty">
          <option value="">All faculty</option>
          {facultyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {hasFilters ? <button type="button" className="cms-btn cms-btn-ghost assignment-toolbar-button" onClick={onClearFilters}>Clear</button> : null}
        <div className="cms-toolbar-right">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}><Download size={15} /> Export</button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={onAdd}><Plus size={16} /> {addLabel}</button>
        </div>
      </div>
      {loading ? <Loader label="Loading assignments..." /> : (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr>{tableColumns.map((column) => <th key={column.key}>{column.label}</th>)}<th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id} className="assignment-row-clickable" onClick={() => onView(row)}>
                  {tableColumns.map((column) => <td key={column.key} className={column.strong ? "cms-strong" : ""}>{row[column.key] ?? "-"}</td>)}
                  <td><div className="cms-actions" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="cms-action-btn view" title="View" aria-label="View assignment" onClick={(event) => { event.stopPropagation(); onView(row); }}><Eye size={15} /></button>
                    <button type="button" className="cms-action-btn edit" title="Edit" aria-label="Edit assignment" onClick={(event) => { event.stopPropagation(); onEdit(row); }}><Pencil size={15} /></button>
                    <button type="button" className="cms-action-btn danger" title="Delete" aria-label="Delete assignment" onClick={(event) => { event.stopPropagation(); onDelete(row); }}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={tableColumns.length + 1}><div className="cms-empty">No assignments found.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
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
