import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { Field, Modal, StatusBadge, Toast, useForm } from "@/components/common/Ui.jsx";
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

const splitValues = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (typeof value === "string") return value.split(",");
  return [];
};

const compactStrings = (values) => splitValues(values).map((value) => String(value).trim()).filter(Boolean);

const normalizeBoardOption = (item) => {
  const option = optionFrom(item, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]);
  if (!option) return null;
  return {
    ...option,
    academicLevelIds: compactStrings(read(item, "academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds")),
    academicLevelNames: compactStrings(read(item, "academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames")),
    academicYearIds: compactStrings(read(item, "academicYearIds", "AcademicYearIds", "yearIds", "YearIds")),
    academicYearNames: compactStrings(read(item, "academicYearNames", "AcademicYearNames", "yearNames", "YearNames")),
  };
};

const normalizeAcademicYearOption = (item) => {
  const option = optionFrom(item, ["academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]);
  if (!option) return null;
  const active = read(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    ...option,
    boardId: String(read(item, "boardId", "BoardId") || ""),
    isActive: typeof active === "string" ? active.toLowerCase() === "active" : active !== false,
  };
};

const normalizeAcademicLevelOption = (item) => optionFrom(
  item,
  ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"],
  ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"],
);

const uniqueByValue = (options) => Array.from(new Map(options.filter(Boolean).map((item) => [String(item.value), item])).values());

const getLevelsForBoardOption = (levels, board) => {
  if (!board) return [];
  const mappedIds = new Set(board.academicLevelIds || []);
  if (mappedIds.size) return levels.filter((level) => mappedIds.has(String(level.value)));
  const mappedNames = new Set((board.academicLevelNames || []).map((name) => name.toLowerCase()));
  if (mappedNames.size) return levels.filter((level) => mappedNames.has(String(level.label).toLowerCase()));
  return [];
};

const getMappedLevelsForBoard = (masters, boardId) => {
  const levels = masters.levels || [];
  const board = (masters.boards || []).find((item) => String(item.value) === String(boardId));
  if (!boardId || !board) return [];
  return getLevelsForBoardOption(levels, board);
};

const getMappedYearsForBoard = (masters, boardId) => {
  const years = masters.years || [];
  const board = (masters.boards || []).find((item) => String(item.value) === String(boardId));
  const boardYears = years.filter((year) => String(year.boardId) === String(boardId));
  if (boardYears.length) return boardYears;
  if (!boardId || !board) return [];
  const mappedIds = new Set(board.academicYearIds || []);
  if (mappedIds.size) return years.filter((year) => mappedIds.has(String(year.value)));
  const mappedNames = new Set((board.academicYearNames || []).map((name) => name.toLowerCase()));
  if (mappedNames.size) return years.filter((year) => mappedNames.has(String(year.label).toLowerCase()));
  return [];
};

const pickActiveYear = (masters, boardId, currentYear = "") => {
  const years = getMappedYearsForBoard(masters, boardId);
  if (currentYear && years.some((year) => String(year.value) === String(currentYear))) return currentYear;
  return years[0]?.value || "";
};

const pickMappedLevel = (masters, boardId, currentLevel = "") => {
  const levels = getMappedLevelsForBoard(masters, boardId);
  if (currentLevel && levels.some((level) => String(level.value) === String(currentLevel))) return currentLevel;
  return levels[0]?.value || "";
};

const normalizeStatus = (item) => {
  const status = read(item, "status", "Status");
  if (typeof status === "boolean") return status ? "Active" : "Inactive";
  if (status) return String(status);
  return read(item, "isActive", "IsActive") ? "Active" : "Inactive";
};

const normalizeGroup = (item) => ({
  id: read(item, "groupId", "GroupId", "id", "Id"),
  name: read(item, "groupName", "GroupName", "name") || "-",
  code: read(item, "groupCode", "GroupCode", "code") || "-",
  boardId: String(read(item, "boardId", "BoardId") || ""),
  board: read(item, "boardName", "BoardName", "board", "Board") || "-",
  year: String(read(item, "academicYearId", "AcademicYearId", "yearId", "YearId", "year", "id", "Id") || ""),
  yearName: read(item, "academicYearName", "AcademicYearName") || "",
  levelId: String(read(item, "academicLevelId", "AcademicLevelId") || ""),
  level: read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "level") || "-",
  programs: programNamesForGroup(read(item, "groupId", "GroupId", "id", "Id"), read(item, "groupCode", "GroupCode", "code")).join(", ") || "-",
  subjects: read(item, "subjects", "Subjects", "subjectCount", "SubjectCount", "totalSubjects", "TotalSubjects") ?? "-",
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
        options: getMappedYearsForBoard(masters, values.board),
        disabled: false,
      };
    }
    if (field.name === "level") {
      return {
        ...field,
        options: getMappedLevelsForBoard(masters, values.board),
        disabled: !values.board || !getMappedLevelsForBoard(masters, values.board).length,
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

const toPayload = (formData, selectedProgramIds = []) => {
  const programIds = Array.from(new Set(selectedProgramIds.map((programId) => String(programId))));
  const payload = {
    board: formData.boardName || formData.board,
    groupName: formData.name,
    groupCode: formData.code,
    academicLevel: formData.levelName || formData.level,
    isActive: formData.status === "Active",
  };
  if (formData.board) payload.boardId = Number(formData.board);
  if (formData.year) payload.academicYearId = Number(formData.year);
  if (formData.level) payload.academicLevelId = Number(formData.level);
  if (programIds.length) {
    payload.programIds = programIds;
    payload.programs = programsForIds(programIds);
  }
  return payload;
};

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

const programsForIds = (programIds) => {
  const selectedIds = new Set(programIds.map((programId) => String(programId)));
  return getProgramMaster()
    .filter((program) => selectedIds.has(String(program.programId)))
    .map((program) => ({
      programId: program.programId,
      programName: program.programName,
      programCode: program.programCode,
      status: program.status,
    }));
};

const programIdsForGroup = (groupId, groupCode) => {
  const mapping = groupId ? getProgramMappings()[String(groupId)] : null;
  return mapping?.programIds?.length ? mapping.programIds : defaultProgramIdsForCode(groupCode);
};

const fetchProgramIdsForGroup = async (groupId, groupCode) => {
  if (!groupId) return defaultProgramIdsForCode(groupCode);
  try {
    const response = await apiClient.get(apiEndpoints.groups.getPrograms(groupId));
    const programIds = getCollection(response.data)
      .map((program) => read(program, "programId", "ProgramId", "id", "Id"))
      .filter((programId) => programId !== undefined && programId !== null && programId !== "")
      .map((programId) => String(programId));
    return programIds.length ? programIds : programIdsForGroup(groupId, groupCode);
  } catch {
    return programIdsForGroup(groupId, groupCode);
  }
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
      && (!values.level || String(group.levelId) === String(values.level))
    ));
  return savedGroup?.id;
};

const matchesFilters = (row, search, filters) => {
  const query = search.trim().toLowerCase();
  if (query && !Object.values(row).some((value) => String(value).toLowerCase().includes(query))) return false;
  if (filters.board && row.boardId !== filters.board) return false;
  if (filters.year && row.year !== filters.year) return false;
  return true;
};

let groupMastersPromise = null;
const activeYearByBoardPromises = new Map();
const academicLevelByBoardPromises = new Map();

const readActiveYearFromResponse = (payload, boardId) => {
  const direct = normalizeAcademicYearOption(responseData({ data: payload }) || payload);
  if (direct?.value && (!direct.boardId || String(direct.boardId) === String(boardId))) return direct.value;
  return getCollection(payload)
    .map(normalizeAcademicYearOption)
    .find((year) => year?.isActive && String(year.boardId) === String(boardId))?.value || "";
};

const loadActiveYearForBoard = async (boardId, masters) => {
  if (!boardId) return "";
  const key = String(boardId);
  if (!activeYearByBoardPromises.has(key)) {
    activeYearByBoardPromises.set(key, apiClient.get(apiEndpoints.academicYears.active, {
      params: { boardId },
    }).then((response) => readActiveYearFromResponse(response.data, boardId)).catch((error) => {
      activeYearByBoardPromises.delete(key);
      throw error;
    }));
  }
  const activeYear = await activeYearByBoardPromises.get(key);
  return activeYear || pickActiveYear(masters, boardId);
};

const readAcademicLevelFromBoardResponse = (payload, boardId, masters) => {
  const board = normalizeBoardOption(responseData({ data: payload }) || payload);
  if (board?.value && String(board.value) !== String(boardId)) return "";
  return getLevelsForBoardOption(masters.levels || [], board)[0]?.value || "";
};

const loadAcademicLevelForBoard = async (boardId, masters, currentLevel = "") => {
  if (!boardId) return "";
  const mappedLevel = pickMappedLevel(masters, boardId, currentLevel);
  if (mappedLevel) return mappedLevel;
  const key = String(boardId);
  if (!academicLevelByBoardPromises.has(key)) {
    academicLevelByBoardPromises.set(key, apiClient.get(apiEndpoints.boards.getById(boardId))
      .then((response) => readAcademicLevelFromBoardResponse(response.data, boardId, masters))
      .catch((error) => {
        academicLevelByBoardPromises.delete(key);
        throw error;
      }));
  }
  return academicLevelByBoardPromises.get(key);
};

const loadGroupMasters = async () => {
  if (groupMastersPromise) return groupMastersPromise;
  groupMastersPromise = (async () => {
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
    boards: uniqueByValue(getCollection(boardsResult.value.data).map(normalizeBoardOption)),
    years: uniqueByValue(getCollection(yearsResult.value.data).map(normalizeAcademicYearOption).filter((year) => year?.isActive)),
    levels: uniqueByValue(getCollection(levelsResult.value.data).map(normalizeAcademicLevelOption)),
  };
  })().catch((error) => {
    groupMastersPromise = null;
    throw error;
  });
  return groupMastersPromise;
};

const groupApi = {
  fetchRows: async ({ search = "", filters = {} } = {}) => {
    const endpoint = filters.board
      ? apiEndpoints.groups.getByBoard(filters.board)
      : apiEndpoints.groups.getAll;
    const params = {
      search: search || undefined,
      academicYearId: filters.year || undefined,
      academicLevelId: filters.level || undefined,
      isActive: filters.status ? filters.status === "Active" : undefined,
    };
    const response = await apiClient.get(endpoint, { params });
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
    const payload = toPayload(values, selectedProgramIds);
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
    subtitle: "Manage groups mapped to boards and academic levels.",
    breadcrumb: ["Academics"],
    addLabel: "Add Group",
    rows: [],
    pagination: { currentOnly: true },
    api: groupApi,
    columns: [
      { key: "name", label: "Group Name", strong: true },
      { key: "code", label: "Group Code" },
      { key: "board", label: "Board" },
      { key: "level", label: "Academic Level" },
      { key: "status", label: "Status", badge: true },
    ],
    filters: [
      { name: "board", label: "Board", type: "select", options: [] },
      { name: "year", label: "Academic Year", type: "select", options: [] },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "level", label: "Academic Level", type: "select", options: [], required: true },
      { name: "name", label: "Group Name", required: true },
      { name: "code", label: "Group Code", required: true },
      { name: "subjects", label: "Total Subjects", type: "number" },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
    ],
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
  const activeYearRequest = useRef(0);
  const mode = id ? "Edit" : "Add";
  const listPath = `/dashboard/courses${makeContextQuery(values)}`;
  const contextSummary = [
    { label: "Board", value: optionLabel(contextOptions.boards, values.board, values.board || "-") },
    { label: "Academic Year", value: optionLabel(contextOptions.years, values.year, values.year || "-") },
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
          setSelectedProgramIds(await fetchProgramIdsForGroup(id, loadedGroup.code));
        } else if (initialContext.board) {
          const [activeYear, academicLevel] = await Promise.all([
            loadActiveYearForBoard(initialContext.board, masters),
            loadAcademicLevelForBoard(initialContext.board, masters, initialContext.level),
          ]);
          if (ignore) return;
          setValues((current) => ({
            ...current,
            board: initialContext.board,
            year: activeYear,
            level: academicLevel,
          }));
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

  useEffect(() => {
    if (id || !values.board) return undefined;
    const currentRequest = activeYearRequest.current + 1;
    activeYearRequest.current = currentRequest;
    Promise.all([
      loadActiveYearForBoard(values.board, contextOptions),
      loadAcademicLevelForBoard(values.board, contextOptions, values.level),
    ])
      .then(([year, academicLevel]) => {
        if (activeYearRequest.current === currentRequest && (year || academicLevel)) {
          setValues((current) => {
            const nextYear = year || current.year;
            const nextLevel = academicLevel || current.level;
            if (current.year === nextYear && current.level === nextLevel) return current;
            return { ...current, year: nextYear, level: nextLevel };
          });
        }
      })
      .catch((error) => {
        if (activeYearRequest.current === currentRequest) {
          setToastType("error");
          setToast(getApiErrorMessage(error));
        }
      });
    return undefined;
  }, [contextOptions, id, setValues, values.board, values.year]);

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saveValues = { ...values };
      if (saveValues.board && !saveValues.level) {
        saveValues.level = await loadAcademicLevelForBoard(saveValues.board, contextOptions, saveValues.level);
      }
      saveValues.boardName = optionLabel(contextOptions.boards, saveValues.board, saveValues.board);
      saveValues.levelName = optionLabel(contextOptions.levels, saveValues.level, saveValues.level);
      const validationErrors = await groupApi.validateValues(saveValues, id);
      if (validationErrors && Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }
      await groupApi.saveRow(saveValues, id, selectedProgramIds);
      setToastType("success");
      setToast(`Group ${id ? "updated" : "created"} successfully`);
      navigate(`/dashboard/courses${makeContextQuery(saveValues)}`);
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
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const requestId = useRef(0);
  const activeYearRequest = useRef(0);

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
    loadGroupMasters()
      .then(async (masters) => {
        setMasterOptions(masters);
        let nextFilters = filters;
        if (filters.board) {
          const [activeYear, academicLevel] = await Promise.all([
            loadActiveYearForBoard(filters.board, masters),
            loadAcademicLevelForBoard(filters.board, masters, filters.level),
          ]);
          nextFilters = { ...filters, year: activeYear, level: academicLevel };
          setFilters(nextFilters);
          updateRouteContext(nextFilters);
        }
        loadRows("", nextFilters);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
        loadRows("", filters);
      });
  }, [filters, loadRows]);

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
    const next = { ...filters, [name]: value };
    if (name === "board") {
      next.year = "";
      next.level = value ? pickMappedLevel(masterOptions, value, filters.level) : "";
      const currentRequest = activeYearRequest.current + 1;
      activeYearRequest.current = currentRequest;
      if (value) {
        Promise.all([
          loadActiveYearForBoard(value, masterOptions),
          loadAcademicLevelForBoard(value, masterOptions, filters.level),
        ])
          .then(([year, academicLevel]) => {
            if (activeYearRequest.current !== currentRequest) return;
            setFilters((current) => {
              if (current.board !== value) return current;
              const withContext = { ...current, year, level: academicLevel };
              updateRouteContext(withContext);
              loadRows(search, withContext);
              return withContext;
            });
          })
          .catch((err) => {
            if (activeYearRequest.current === currentRequest) setError(getApiErrorMessage(err));
          });
      } else {
        loadRows(search, next);
      }
    }
    if (name === "year") {
      next.level = "";
    }
    setFilters(next);
    updateRouteContext(next);
    if (name !== "board") loadRows(search, next);
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

  const yearOptions = getMappedYearsForBoard(masterOptions, filters.board);
  const toolbarFilters = (
    <div className="course-table-filters">
      <select aria-label="Board" value={filters.board || ""} onChange={(event) => setFilter("board", event.target.value)}>
        <option value="">Select Board</option>
        {(masterOptions.boards || []).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select aria-label="Academic Year" value={filters.year || ""} disabled={!filters.board} onChange={(event) => setFilter("year", event.target.value)}>
        <option value="">Select Academic Year</option>
        {yearOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <DashboardLayout title={pageConfig.title} subtitle={pageConfig.subtitle} breadcrumb={pageConfig.breadcrumb}>
      <div className="group-management">
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
          toolbarExtra={toolbarFilters}
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
