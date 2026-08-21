import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { Field, FilterBar, Modal, StatusBadge, Toast, useForm } from "@/components/common/Ui.jsx";
import "./CourseGroupPage.css";

const MODULE_SLUG = "courses";
const STATUS_OPTIONS = ["Active", "Inactive"];
const PROGRAMS_STORAGE_KEY = "cms.groupPrograms.v1";
const PROGRAM_MAPPINGS_STORAGE_KEY = "cms.groupProgramMappings.v1";
const CONTEXT_FIELD_NAMES = ["board", "year", "level"];

const DEFAULT_PROGRAMS = [
  { programId: "regular", programName: "Regular", programCode: "REG", status: "Active" },
  { programId: "jee", programName: "JEE", programCode: "JEE", status: "Active" },
  { programId: "jee-advanced", programName: "JEE Advanced", programCode: "JEEADV", status: "Active" },
  { programId: "eapcet", programName: "EAPCET", programCode: "EAPCET", status: "Active" },
  { programId: "neet", programName: "NEET", programCode: "NEET", status: "Active" },
  { programId: "neet-advanced", programName: "NEET Advanced", programCode: "NEETADV", status: "Active" },
  { programId: "ca-foundation", programName: "CA Foundation", programCode: "CAF", status: "Active" },
  { programId: "cma-foundation", programName: "CMA Foundation", programCode: "CMAF", status: "Active" },
  { programId: "cuet", programName: "CUET", programCode: "CUET", status: "Active" },
  { programId: "ipmat", programName: "IPMAT", programCode: "IPMAT", status: "Active" },
  { programId: "clat", programName: "CLAT", programCode: "CLAT", status: "Active" },
];

const DEFAULT_GROUP_PROGRAM_CODES = {
  MPC: ["REG", "JEE", "JEEADV", "EAPCET"],
  BIPC: ["REG", "NEET", "NEETADV", "EAPCET"],
  BIPC_ALT: ["REG", "NEET", "NEETADV", "EAPCET"],
  MEC: ["REG", "CAF", "CMAF", "CUET", "IPMAT"],
  CEC: ["REG", "CLAT", "CUET", "IPMAT", "CAF"],
};

const getCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.Items)) return payload.data.Items;
  if (Array.isArray(payload?.Data?.$values)) return payload.Data.$values;
  if (Array.isArray(payload?.Data?.items)) return payload.Data.items;
  if (Array.isArray(payload?.Data?.Items)) return payload.Data.Items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null);
  return key ? item[key] : undefined;
};

const responseData = (response) => response?.data?.data || response?.data?.Data || response?.data;

const optionFrom = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) ?? value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const getUniqueOptions = (rows, idKeys, labelKeys) => {
  const options = rows.map((item) => optionFrom(item, idKeys, labelKeys)).filter(Boolean);
  return Array.from(new Map(options.map((item) => [item.value, item])).values());
};

const normalizeStatus = (item) => {
  const status = read(item, "status", "Status");
  if (typeof status === "boolean") return status ? "Active" : "Inactive";
  if (status) return String(status);
  return read(item, "isActive", "IsActive") ? "Active" : "Inactive";
};

const normalizeGroup = (item) => ({
  id: read(item, "groupId", "GroupId", "id"),
  name: read(item, "groupName", "GroupName", "name") || "-",
  code: read(item, "groupCode", "GroupCode", "code") || "-",
  boardId: String(read(item, "boardId", "BoardId") || ""),
  board: read(item, "boardName", "BoardName", "board", "Board") || "-",
  year: String(read(item, "academicYearId", "AcademicYearId", "year") || ""),
  yearName: read(item, "academicYearName", "AcademicYearName") || "",
  levelId: String(read(item, "academicLevelId", "AcademicLevelId") || ""),
  level: read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "level") || "-",
  programs: programNamesForGroup(read(item, "groupId", "GroupId", "id"), read(item, "groupCode", "GroupCode", "code")).join(", ") || "-",
  status: normalizeStatus(item),
});

const groupFormFields = [
  { name: "name", label: "Group Name", required: true },
  { name: "code", label: "Group Code", required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
];

const makeContextQuery = (values) => {
  const params = new URLSearchParams();
  CONTEXT_FIELD_NAMES.forEach((name) => {
    if (values?.[name]) params.set(name, values[name]);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

const optionLabel = (options, value, fallback = "-") => (
  options.find((option) => String(option.value) === String(value))?.label || fallback
);

const buildGroupFilterFields = (masters, values) => (
  pageConfig.filters.map((field) => {
    if (field.name === "board") return { ...field, options: masters.boards || [] };
    if (field.name === "year") {
      return {
        ...field,
        options: masters.years || [],
        disabled: false,
      };
    }
    if (field.name === "level") {
      return {
        ...field,
        options: masters.levels || [],
        disabled: false,
      };
    }
    return field;
  })
);

const normalizeGroupForm = (item) => {
  const group = normalizeGroup(item);
  return {
    board: group.boardId,
    year: group.year,
    level: group.levelId,
    name: group.name === "-" ? "" : group.name,
    code: group.code === "-" ? "" : group.code,
    status: group.status,
  };
};

const toPayload = (formData) => ({
  boardId: Number(formData.board),
  academicYearId: Number(formData.year),
  academicLevelId: Number(formData.level),
  groupName: formData.name,
  groupCode: formData.code,
  isActive: formData.status === "Active",
});

const readCreatedGroupId = (response) => read(responseData(response) || {}, "groupId", "GroupId", "id", "Id");

const storageGet = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const storageSet = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(`Unable to save program selections locally. ${error?.message || "Please try again."}`);
  }
};

const getProgramMaster = () => {
  const stored = storageGet(PROGRAMS_STORAGE_KEY, []);
  const byCode = new Map([...DEFAULT_PROGRAMS, ...stored].map((program) => [program.programCode.toUpperCase(), program]));
  return Array.from(byCode.values());
};

const saveProgramMaster = (programs) => {
  const defaults = new Set(DEFAULT_PROGRAMS.map((program) => program.programCode.toUpperCase()));
  const customPrograms = programs.filter((program) => !defaults.has(program.programCode.toUpperCase()));
  storageSet(PROGRAMS_STORAGE_KEY, customPrograms);
};

const groupCodeKey = (code) => {
  const normalized = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized === "BIPC" || normalized === "BIPCALT" ? "BIPC" : normalized;
};

const defaultProgramIdsForCode = (code) => {
  const master = getProgramMaster();
  const idsByCode = new Map(master.map((program) => [program.programCode.toUpperCase(), program.programId]));
  return (DEFAULT_GROUP_PROGRAM_CODES[groupCodeKey(code)] || ["REG"])
    .map((programCode) => idsByCode.get(programCode))
    .filter(Boolean);
};

const getProgramMappings = () => storageGet(PROGRAM_MAPPINGS_STORAGE_KEY, {});

const saveProgramMapping = (groupId, groupCode, programIds) => {
  const mappings = getProgramMappings();
  mappings[String(groupId)] = {
    groupCode: groupCodeKey(groupCode),
    programIds: Array.from(new Set(programIds)),
  };
  storageSet(PROGRAM_MAPPINGS_STORAGE_KEY, mappings);
};

const programIdsForGroup = (groupId, groupCode) => {
  const mapping = groupId ? getProgramMappings()[String(groupId)] : null;
  return mapping?.programIds?.length ? mapping.programIds : defaultProgramIdsForCode(groupCode);
};

function programNamesForGroup(groupId, groupCode) {
  const masterById = new Map(getProgramMaster().map((program) => [program.programId, program]));
  return programIdsForGroup(groupId, groupCode)
    .map((programId) => masterById.get(programId)?.programName)
    .filter(Boolean);
}

const findSavedGroupId = async (values) => {
  const response = await apiClient.get(apiEndpoints.groups.getAll, {
    params: {
      search: values.code || undefined,
      boardId: values.board || undefined,
      academicYearId: values.year || undefined,
      academicLevelId: values.level || undefined,
    },
  });
  const savedGroup = getCollection(response.data)
    .map(normalizeGroup)
    .find((group) => (
      groupCodeKey(group.code) === groupCodeKey(values.code)
      && String(group.boardId) === String(values.board)
      && String(group.year) === String(values.year)
      && String(group.levelId) === String(values.level)
    ));
  return savedGroup?.id;
};

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value).toLowerCase().includes(query))) return false;
  if (filters.board && row.boardId !== filters.board) return false;
  if (filters.year && row.year !== filters.year) return false;
  if (filters.level && row.levelId !== filters.level) return false;
  if (filters.status && row.status !== filters.status) return false;
  return true;
};

const loadGroupMasters = async () => {
  const [boardsResult, yearsResult, levelsResult] = await Promise.allSettled([
    apiClient.get(apiEndpoints.boards.getAll),
    apiClient.get(apiEndpoints.academicYears.list),
    apiClient.get(apiEndpoints.boards.getAcademicLevels),
  ]);
  const failures = [
    ["Board API", boardsResult],
    ["Academic Year API", yearsResult],
    ["Academic Level API", levelsResult],
  ]
    .filter(([, result]) => result.status === "rejected")
    .map(([label, result]) => `${label}: ${getApiErrorMessage(result.reason)}`);

  if (failures.length) throw new Error(`Failed to load Group dropdown data. ${failures.join(" ")}`);

  return {
    boards: getUniqueOptions(getCollection(boardsResult.value.data), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]),
    years: getUniqueOptions(getCollection(yearsResult.value.data), ["academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]),
    levels: getUniqueOptions(getCollection(levelsResult.value.data), ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]),
  };
};

const groupApi = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    const params = {
      search: search || undefined,
      boardId: filters.board || undefined,
      academicYearId: filters.year || undefined,
      academicLevelId: filters.level || undefined,
      isActive: filters.status ? filters.status === "Active" : undefined,
    };
    const response = await apiClient.get(apiEndpoints.groups.getAll, { params });
    return getCollection(response.data)
      .map(normalizeGroup)
      .filter((row) => row.id)
      .filter((row) => matchesFilters(row, search, filters));
  },
  fetchRow: async (groupId) => {
    const response = await apiClient.get(apiEndpoints.groups.getById(groupId));
    return normalizeGroupForm(responseData(response));
  },
  saveRow: async (values, groupId, selectedProgramIds) => {
    const payload = toPayload(values);
    if (groupId) {
      const response = await apiClient.put(apiEndpoints.groups.update(groupId), payload);
      saveProgramMapping(groupId, values.code, selectedProgramIds);
      return response;
    }
    const response = await apiClient.post(apiEndpoints.groups.create, payload);
    const createdGroupId = readCreatedGroupId(response) || await findSavedGroupId(values);
    if (!createdGroupId) throw new Error("Group saved, but the new group ID could not be found for program mapping. Please reopen the group and save programs again.");
    saveProgramMapping(createdGroupId, values.code, selectedProgramIds);
    return response;
  },
  deleteRow: (groupId) => apiClient.delete(apiEndpoints.groups.delete(groupId)),
  validateValues: async (values, groupId) => {
    if (!values.code) return {};
    const response = await apiClient.get(apiEndpoints.groups.validateCode, {
      params: {
        groupCode: values.code,
        excludeGroupId: groupId || undefined,
      },
    });
    return response.data?.isAvailable === false ? { code: "Group Code already exists" } : {};
  },
  loadFields: async (fields) => {
    const masters = await loadGroupMasters();
    return fields.map((field) => (
      field.name === "board"
        ? { ...field, options: masters.boards }
        : field.name === "year"
          ? { ...field, options: masters.years }
          : field.name === "level"
            ? { ...field, options: masters.levels }
            : field
    ));
  },
  loadFilters: async (filters) => {
    const masters = await loadGroupMasters();
    return filters.map((field) => (
      field.name === "board"
        ? { ...field, options: masters.boards }
        : field.name === "year"
          ? { ...field, options: masters.years }
        : field.name === "level"
          ? { ...field, options: masters.levels }
          : field
    ));
  },
};

export const pageConfig = {
  title: "Group Management",
  subtitle: "Manage groups mapped to boards, academic levels and programs.",
  breadcrumb: ["Academics"],
  addLabel: "Add Group",
  rows: [],
  api: groupApi,
  columns: [
    { key: "name", label: "Group Name", strong: true },
    { key: "code", label: "Group Code" },
    { key: "board", label: "Board" },
    { key: "yearName", label: "Academic Year" },
    { key: "level", label: "Academic Level" },
    { key: "programs", label: "Programs" },
    { key: "status", label: "Status", badge: true },
  ],
  filters: [
    { name: "board", label: "Board", type: "select", options: [] },
    { name: "year", label: "Academic Year", type: "select", options: [] },
    { name: "level", label: "Academic Level", type: "select", options: [] },
  ],
  fields: groupFormFields,
};

function AddProgramModal({ onCancel, onAdd }) {
  const fields = [
    { name: "programName", label: "Program Name", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
  ];
  const { values, errors, setValue, validate } = useForm(fields, { status: "Active" });

  const submit = () => {
    if (!validate()) return;
    onAdd(values);
  };

  return (
    <Modal
      title="Add Program"
      onClose={onCancel}
      size="sm"
      footer={(
        <>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={submit}>Add Program</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        {fields.map((field) => (
          <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setValue} />
        ))}
      </div>
    </Modal>
  );
}

function ProgramsPanel({ groupCode, groupName, selectedProgramIds, onChange }) {
  const [programs, setPrograms] = useState(getProgramMaster);
  const [adding, setAdding] = useState(false);
  const selected = new Set(selectedProgramIds);
  const headingName = String(groupCode || groupName || "this Group").trim();

  const toggleProgram = (programId, checked) => {
    const next = checked
      ? [...selectedProgramIds, programId]
      : selectedProgramIds.filter((id) => id !== programId);
    onChange(Array.from(new Set(next)));
  };

  const addProgram = (values) => {
    const code = String(values.programCode || values.programName || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const name = String(values.programName || "").trim();
    const existing = programs.find((program) => (
      program.programCode.toUpperCase() === code || program.programName.toLowerCase() === name.toLowerCase()
    ));
    const program = existing || {
      programId: `program-${Date.now()}`,
      programName: name,
      programCode: code || `PGM${Date.now()}`,
      status: values.status,
    };
    const nextPrograms = existing ? programs : [...programs, program];
    saveProgramMaster(nextPrograms);
    setPrograms(nextPrograms);
    onChange(Array.from(new Set([...selectedProgramIds, program.programId])));
    setAdding(false);
  };

  return (
    <section className="course-programs-panel">
      <div className="course-programs-head">
        <div>
          <h3>Programs for {headingName}</h3>
          <p>Selected Programs: {selectedProgramIds.length}</p>
        </div>
        <button type="button" className="cms-btn cms-btn-ghost course-add-program-btn" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add Program
        </button>
      </div>
      <div className="course-program-grid">
        {programs.map((program) => (
          <label key={program.programId} className="course-program-option">
            <input
              type="checkbox"
              checked={selected.has(program.programId)}
              disabled={program.status === "Inactive"}
              onChange={(event) => toggleProgram(program.programId, event.target.checked)}
            />
            <span>
              <strong>{program.programName}</strong>
              <small>{program.programCode}</small>
            </span>
          </label>
        ))}
      </div>
      {adding ? <AddProgramModal onCancel={() => setAdding(false)} onAdd={addProgram} /> : null}
    </section>
  );
}

function CourseGroupFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contextOptions, setContextOptions] = useState({ boards: [], years: [], levels: [] });
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialContext = useMemo(() => ({
    board: searchParams.get("board") || "",
    year: searchParams.get("year") || "",
    level: searchParams.get("level") || "",
  }), [searchParams]);
  const { values, errors, setValue, validate, setValues, setErrors } = useForm(groupFormFields, { ...initialContext, status: "Active" });
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const mode = id ? "Edit" : "Add";
  const listPath = `/dashboard/courses${makeContextQuery(values)}`;
  const contextSummary = [
    { label: "Board", value: optionLabel(contextOptions.boards, values.board, values.board || "-") },
    { label: "Academic Year", value: optionLabel(contextOptions.years, values.year, values.year || "-") },
    { label: "Academic Level", value: optionLabel(contextOptions.levels, values.level, values.level || "-") },
  ];

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const [masters, loadedGroup] = await Promise.all([
          loadGroupMasters(),
          id ? groupApi.fetchRow(id) : null,
        ]);
        if (ignore) return;
        setContextOptions(masters);
        if (loadedGroup) {
          setValues(loadedGroup);
          setSelectedProgramIds(programIdsForGroup(id, loadedGroup.code));
        }
      } catch (error) {
        if (!ignore) {
          setToastType("error");
          setToast(getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [id, initialContext.board, initialContext.level, initialContext.year, setValues]);

  useEffect(() => {
    if (id) return;
    setSelectedProgramIds(defaultProgramIdsForCode(values.code));
  }, [id, values.code]);

  const submit = async (event) => {
    event.preventDefault();
    if (!values.board || !values.year || !values.level) {
      setToastType("error");
      setToast("Please select Board, Academic Year and Academic Level before adding a group.");
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      const validationErrors = await groupApi.validateValues(values, id);
      if (validationErrors && Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }
      await groupApi.saveRow(values, id, selectedProgramIds);
      setToastType("success");
      setToast(`Group ${id ? "updated" : "created"} successfully`);
      navigate(listPath);
    } catch (error) {
      setToastType("error");
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={`${mode} Group`} subtitle="Configure the group details and its programs." breadcrumb={["Group Management"]}>
      <div className="cms-form-page course-group-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to Group Management</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            {loading ? (
              <div className="cms-empty">Loading record...</div>
            ) : (
              <>
                <div className="course-context-summary" aria-label="Selected group context">
                  {contextSummary.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="cms-form-grid">
                  {groupFormFields.map((field) => (
                    <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setValue} />
                  ))}
                </div>
                <ProgramsPanel
                  groupCode={values.code}
                  groupName={values.name}
                  selectedProgramIds={selectedProgramIds}
                  onChange={setSelectedProgramIds}
                />
              </>
            )}
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || loading}>{saving ? "Saving..." : `${id ? "Update" : "Save"} Group`}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function CourseGroupListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(() => ({
    board: searchParams.get("board") || "",
    year: searchParams.get("year") || "",
    level: searchParams.get("level") || "",
  }));
  const [filterFields, setFilterFields] = useState(pageConfig.filters);
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const requestId = useRef(0);

  const loadRows = useCallback(async (nextSearch = search, nextFilters = filters) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError("");
    try {
      const loadedRows = await groupApi.fetchRows({ search: nextSearch, filters: nextFilters });
      if (requestId.current === currentRequest) setRows(loadedRows);
    } catch (err) {
      if (requestId.current === currentRequest) {
        setRows([]);
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    loadRows("", filters);
    loadGroupMasters()
      .then((masters) => {
        setMasterOptions(masters);
        setFilterFields(buildGroupFilterFields(masters, filters));
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [filters, loadRows]);

  useEffect(() => {
    setFilterFields(buildGroupFilterFields(masterOptions, filters));
  }, [filters, masterOptions]);

  const updateRouteContext = (nextFilters) => {
    const params = new URLSearchParams(searchParams);
    CONTEXT_FIELD_NAMES.forEach((name) => {
      if (nextFilters[name]) params.set(name, nextFilters[name]);
      else params.delete(name);
    });
    setSearchParams(params, { replace: true });
  };

  const setFilter = (name, value) => {
    if (name === "__reset__") {
      const nextFilters = {};
      setFilters(nextFilters);
      updateRouteContext(nextFilters);
      loadRows(search, nextFilters);
      return;
    }
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "board") {
        next.year = "";
        next.level = "";
      }
      if (name === "year") {
        next.level = "";
      }
      updateRouteContext(next);
      return next;
    });
  };

  const handleSearch = (value) => {
    if (value === search) return;
    setSearch(value);
    loadRows(value, filters);
  };

  const deleteGroup = async (row) => {
    try {
      await groupApi.deleteRow(row.id);
      setToastType("success");
      setToast("Group deleted successfully");
      await loadRows(search, filters);
    } catch (err) {
      setToastType("error");
      setToast(getApiErrorMessage(err));
    }
  };

  const addGroup = () => {
    navigate(`/dashboard/courses/add${makeContextQuery(filters)}`);
  };

  const columns = useMemo(() => pageConfig.columns.map((column) => (
    column.badge ? { ...column, render: (row) => <StatusBadge value={row[column.key]} /> } : column
  )), []);

  return (
    <DashboardLayout title={pageConfig.title} subtitle={pageConfig.subtitle} breadcrumb={pageConfig.breadcrumb}>
      <div className="group-management">
        <FilterBar fields={filterFields} values={filters} onChange={setFilter} onApply={() => loadRows(search, filters)} />
        {error ? (
          <div className="cms-card" style={{ marginBottom: 16 }}>
            <div className="cms-card-body">
              <div className="cms-empty">{error}</div>
              <button className="cms-btn cms-btn-ghost" onClick={() => loadRows(search, filters)}>Retry</button>
            </div>
          </div>
        ) : null}
        <DataTable
          title={pageConfig.title}
          columns={columns}
          rows={rows}
          loading={loading}
          addLabel={pageConfig.addLabel}
          onSearchChange={handleSearch}
          onAdd={addGroup}
          onEdit={(row) => navigate(`/dashboard/courses/${row.id}/edit${makeContextQuery(filters)}`)}
          onDelete={deleteGroup}
        />
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

export function CourseGroupFormRoute() {
  return <CourseGroupFormPage />;
}

export default function CourseGroupPage({ form = false }) {
  return form ? <CourseGroupFormPage /> : <CourseGroupListPage />;
}
