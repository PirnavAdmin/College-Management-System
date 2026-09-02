import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./PromotionPage.css";


const EMPTY_SETUP = {
  fromYear: "", board: "", fromLevel: "", group: "", program: "", fromSection: "",
  toYear: "", toBoard: "", toLevel: "", toGroup: "", toProgram: "", toSection: "",
};

const EMPTY_HISTORY_FILTERS = {
  academicYearId: "", academicLevel: "",
  groupId: "", programId: "", section: "", studentId: "", search: "", promotionStatus: "", fromDate: "", toDate: "",
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null);
  return key ? item[key] : undefined;
};

const unwrap = (payload, preferred = []) => {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    ...preferred.map((key) => payload?.[key]), payload?.data, payload?.Data, payload?.items, payload?.Items,
    payload?.records, payload?.Records, payload?.result, payload?.Result, payload?.$values,
    payload?.data?.items, payload?.data?.records, payload?.data?.$values,
  ];
  return candidates.find(Array.isArray) || [];
};

const unwrapObject = (payload) => payload?.data ?? payload?.Data ?? payload?.result ?? payload?.Result ?? payload ?? {};
const asString = (value) => value === undefined || value === null ? "" : String(value);
const isPresent = (value) => value !== "" && value !== undefined && value !== null;
const numericId = (value) => {
  if (!isPresent(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};
const compactParams = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => isPresent(value) && !Number.isNaN(value)));
const unique = (values) => [...new Set(values.filter(Boolean).map(String))];
const option = (value, label) => ({ value: asString(value), label: asString(label ?? value) });
const isSecondYearLevel = (value) => /\b(?:2nd|second)\s+year\b/i.test(asString(value));
const academicYearRange = (year) => {
  const match = asString(year).match(/\b(\d{4})\s*[-/]\s*(\d{4})\b/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return end === start + 1 ? { start, end } : null;
};

const isNextAcademicYear = (sourceYear, targetYear) => {
  const source = academicYearRange(sourceYear);
  const target = academicYearRange(targetYear);
  return Boolean(source && target && target.start === source.start + 1);
};

const getMasterFailureMessage = (responses, names) => {
  const failures = responses
    .map((result, index) => result.status === "rejected" ? { name: names[index], error: result.reason } : null)
    .filter(Boolean);
  if (!failures.length) return "";
  const statuses = failures.map(({ error }) => error?.response?.status);
  if (statuses.some((status) => status === 502) || failures.some(({ error }) => !error?.response)) {
    return "The backend API is unavailable. Start the API service on localhost:5167, then retry master data.";
  }
  if (statuses.some((status) => status === 401)) return "Your session has expired. Please sign in again.";
  if (statuses.some((status) => status === 403)) return "Your account is not permitted to load Promotion master data.";
  return `Unable to load ${failures.map(({ name }) => name).join(", ")}. Other live master data remains available.`;
};

const normalizeStudent = (item) => {
  const id = read(item, "studentId", "StudentId", "id", "Id");
  const eligibleFlag = read(item, "isEligible", "IsEligible", "eligible", "Eligible");
  const eligibility = asString(read(item, "eligibilityStatus", "EligibilityStatus", "eligibility", "status", "Status"));
  return {
    raw: item,
    id: numericId(id) ?? id,
    admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo", "admissionNumberNo", "AdmissionNumberNo", "studentCode", "StudentCode") || "-",
    name: read(item, "studentName", "StudentName", "fullName", "FullName", "name", "Name") || "-",
    academicYear: read(item, "academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "sourceAcademicYearName", "SourceAcademicYearName", "currentAcademicYear", "CurrentAcademicYear") || "-",
    board: read(item, "boardName", "BoardName", "sourceBoardName", "SourceBoardName", "board", "Board") || "-",
    level: read(item, "academicLevel", "AcademicLevel", "sourceAcademicLevel", "SourceAcademicLevel", "level", "Level") || "-",
    group: read(item, "groupName", "GroupName", "sourceGroupName", "SourceGroupName", "group", "Group") || "-",
    section: read(item, "sectionName", "SectionName", "sourceSection", "SourceSection", "section", "Section") || "-",
    medium: read(item, "medium", "Medium", "sourceMedium", "SourceMedium") || "-",
    eligibility: eligibility || (eligibleFlag === false ? "Not Eligible" : "-"),
    eligibleFlag,
    reason: read(item, "eligibilityReason", "EligibilityReason", "reason", "Reason", "remarks", "Remarks") || "",
  };
};

const normalizeHistory = (item) => ({
  raw: item,
  id: numericId(read(item, "promotionId", "PromotionId", "id", "Id")) ?? read(item, "promotionId", "PromotionId", "id", "Id"),
  studentId: read(item, "studentId", "StudentId"),
  student: read(item, "studentName", "StudentName", "name", "Name") || "-",
  admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo") || "-",
  sourceYear: read(item, "sourceAcademicYear", "SourceAcademicYear", "sourceAcademicYearName", "SourceAcademicYearName", "academicYearName", "AcademicYearName") || "-",
  sourceLevel: read(item, "sourceAcademicLevel", "SourceAcademicLevel", "academicLevel", "AcademicLevel") || "-",
  sourceGroup: read(item, "sourceGroupName", "SourceGroupName", "groupName", "GroupName") || "-",
  sourceSection: read(item, "sourceSection", "SourceSection", "section", "Section") || "-",
  targetYear: read(item, "targetAcademicYear", "TargetAcademicYear", "targetAcademicYearName", "TargetAcademicYearName") || "-",
  targetLevel: read(item, "targetAcademicLevel", "TargetAcademicLevel") || "-",
  targetGroup: read(item, "targetGroupName", "TargetGroupName") || "-",
  targetSection: read(item, "targetSection", "TargetSection") || "-",
  date: read(item, "promotionDate", "PromotionDate", "createdAt", "CreatedAt") || "-",
  status: read(item, "promotionStatus", "PromotionStatus", "status", "Status") || "-",
  promotedBy: read(item, "promotedBy", "PromotedBy", "promotedByName", "PromotedByName") || "-",
  canRollback: read(item, "canRollback", "CanRollback") !== false,
});

const isEligible = (student) => student.eligibleFlag !== false && !/not\s*eligible|ineligible|failed|blocked/i.test(student.eligibility);

export default function PromotionPage({ screen = "promotion" }) {
  const navigate = useNavigate();
  const activeTab = screen;
  const [allocationTab, setAllocationTab] = useState("group");
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [masters, setMasters] = useState({ years: [], boards: [], levels: [], groups: [], sections: [] });
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterError, setMasterError] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [individualStudent, setIndividualStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [rollbackRecord, setRollbackRecord] = useState(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const eligibleController = useRef(null);

  const loadMasters = useCallback(async () => {
    setMasterLoading(true);
    setMasterError("");
    try {
      const responses = await Promise.allSettled([
        apiClient.get(apiEndpoints.academicYears.getAll), apiClient.get(apiEndpoints.boards.list),
        apiClient.get(apiEndpoints.boards.academicLevels), apiClient.get(apiEndpoints.groups.list), apiClient.get(apiEndpoints.sections.list),
      ]);
      const dataAt = (index) => responses[index].status === "fulfilled" ? responses[index].value.data : [];
      const [yearsData, boardsData, levelsData, groupsData, sectionsData] = responses.map((_, index) => dataAt(index));
      const groupItems = unwrap(groupsData); const sectionItems = unwrap(sectionsData);
      const levels = unwrap(levelsData, ["academicLevels", "AcademicLevels"]).map((item) => ({
        ...option(typeof item === "string" ? item : read(item, "academicLevelId", "AcademicLevelId", "id", "Id", "academicLevelName", "AcademicLevelName", "levelName", "LevelName"), typeof item === "string" ? item : read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "name", "Name")),
        board: asString(read(item, "boardId", "BoardId")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
      })).filter((item) => item.value);
      const groups = groupItems.map((item) => ({ ...option(read(item, "groupId", "GroupId", "id", "Id"), read(item, "groupName", "GroupName", "name", "Name")), board: asString(read(item, "boardId", "BoardId")), level: asString(read(item, "academicLevel", "AcademicLevel", "academicLevelName", "AcademicLevelName")), levelId: asString(read(item, "academicLevelId", "AcademicLevelId")), year: asString(read(item, "academicYearId", "AcademicYearId")), programs: unwrap(item, ["programs", "Programs"]).map((program) => option(read(program, "programId", "ProgramId", "id", "Id"), read(program, "programName", "ProgramName", "name", "Name"))).filter((program) => numericId(program.value)) })).filter((item) => numericId(item.value));
      const sections = sectionItems.map((item) => ({
        value: asString(read(item, "sectionName", "SectionName", "name", "Name", "section", "Section", "sectionId", "SectionId", "id", "Id")),
        label: asString(read(item, "sectionName", "SectionName", "name", "Name", "section", "Section")),
        group: asString(read(item, "groupId", "GroupId")),
        level: asString(read(item, "academicLevelId", "AcademicLevelId")),
        board: asString(read(item, "boardId", "BoardId")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
        program: asString(read(item, "programId", "ProgramId", "groupProgramId", "GroupProgramId")),
      })).filter((item) => item.value);
      const boardOptions = unwrap(boardsData).map((item) => {
        const ids = read(item, "academicLevelIds", "AcademicLevelIds");
        const names = read(item, "academicLevelNames", "AcademicLevelNames", "academicLevels", "AcademicLevels");
        return {
          ...option(read(item, "boardId", "BoardId", "id", "Id"), read(item, "boardName", "BoardName", "name", "Name")),
          academicLevelIds: Array.isArray(ids) ? ids.map(asString) : [],
          academicLevelNames: Array.isArray(names) ? names.map((level) => asString(typeof level === "object" ? read(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name") : level)) : [],
          active: read(item, "isActive", "IsActive", "active", "Active") === true || /^active$/i.test(asString(read(item, "status", "Status"))),
        };
      }).filter((item) => numericId(item.value) && item.active);
      setMasters({
        years: unwrap(yearsData).map((item) => ({
          ...option(read(item, "academicYearId", "AcademicYearId", "id", "Id"), read(item, "academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "name", "Name")),
          board: asString(read(item, "boardId", "BoardId")),
          active: read(item, "isActive", "IsActive") === true || /^active$/i.test(asString(read(item, "status", "Status"))),
        })).filter((item) => numericId(item.value)),
        boards: boardOptions,
        levels,
        groups,
        sections,
      });
      setMasterError(getMasterFailureMessage(responses, ["academic years", "boards", "academic levels", "groups", "sections"]));
    } catch (requestError) { setMasterError(getApiErrorMessage(requestError)); }
    finally { setMasterLoading(false); }
  }, []);

  useEffect(() => { loadMasters(); }, [loadMasters]);
  useEffect(() => {
    const boardIds = [...new Set([setup.board, setup.toBoard].filter(Boolean))];
    if (!boardIds.length) return undefined;
    let active = true;
    Promise.allSettled(boardIds.map((id) => apiClient.get(apiEndpoints.boards.getById(id))))
      .then((results) => {
        if (!active) return;
        setMasters((current) => ({ ...current, boards: current.boards.map((board) => {
          const index = boardIds.indexOf(board.value);
          const payload = results[index]?.status === "fulfilled" ? (results[index].value.data?.data ?? results[index].value.data) : null;
          if (!payload) return board;
          const ids = read(payload, "academicLevelIds", "AcademicLevelIds");
          const names = read(payload, "academicLevelNames", "AcademicLevelNames", "academicLevels", "AcademicLevels");
          return { ...board, academicLevelIds: Array.isArray(ids) ? ids.map(asString) : board.academicLevelIds, academicLevelNames: Array.isArray(names) ? names.map((level) => asString(typeof level === "object" ? read(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name") : level)) : board.academicLevelNames };
        }) }));
      });
    return () => { active = false; };
  }, [setup.board, setup.toBoard]);
  useEffect(() => () => eligibleController.current?.abort(), []);

  const yearsFor = useCallback((prefix) => {
    const boardValue = setup[prefix === "from" ? "board" : "toBoard"];
    if (!boardValue) return [];
    return uniqueAcademicYearsByName(masters.years.filter((year) => year.board === asString(boardValue)), (year) => year.label);
  }, [masters.years, setup.board, setup.toBoard]);

  const groupsFor = useCallback((prefix) => masters.groups.filter((group) => {
    const boardValue = setup[prefix === "from" ? "board" : "toBoard"];
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    const yearValue = setup[prefix === "from" ? "fromYear" : "toYear"];
    if (!boardValue || !yearValue || !levelValue) return false;
    const levelLabel = masters.levels.find((level) => level.value === asString(levelValue))?.label;
    return group.board === asString(boardValue)
      && group.year === asString(yearValue)
      && (group.levelId === asString(levelValue) || group.level === asString(levelLabel));
  }), [masters.groups, masters.levels, setup]);

  const levelsFor = useCallback((prefix) => {
    const boardValue = setup[prefix === "from" ? "board" : "toBoard"];
    const yearValue = setup[prefix === "from" ? "fromYear" : "toYear"];
    if (!boardValue || !yearValue) return [];
    const contextGroups = masters.groups.filter((group) => group.board === asString(boardValue) && group.year === asString(yearValue));
    return masters.levels.filter((level) => contextGroups.some((group) => group.levelId === level.value || group.level === level.label));
  }, [masters.groups, masters.levels, setup.board, setup.fromYear, setup.toBoard, setup.toYear]);

  const programsFor = useCallback((prefix) => {
    const groupValue = setup[prefix === "from" ? "group" : "toGroup"];
    const group = masters.groups.find((item) => item.value === asString(groupValue));
    return group?.programs || [];
  }, [masters.groups, setup]);

  const sectionsFor = useCallback((prefix) => {
    const groupValue = setup[prefix === "from" ? "group" : "toGroup"];
    const groupLabel = masters.groups.find((item) => item.value === groupValue)?.label;
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    const programValue = setup[prefix === "from" ? "program" : "toProgram"];
    const boardValue = setup[prefix === "from" ? "board" : "toBoard"];
    const yearValue = setup[prefix === "from" ? "fromYear" : "toYear"];
    return masters.sections.filter((section) => (!section.group || section.group === groupValue || section.group === groupLabel)
      && (!section.level || section.level === levelValue)
      && (!programValue || !section.program || section.program === asString(programValue))
      && (!section.board || section.board === asString(boardValue))
      && (!section.year || section.year === asString(yearValue)));
  }, [masters.groups, masters.sections, setup]);

  const sourceFields = useMemo(() => [
    { name: "board", label: "Board", type: "select", options: masters.boards, required: true },
    { name: "fromYear", label: "From Academic Year", type: "select", options: yearsFor("from"), required: true, disabled: !setup.board },
    { name: "fromLevel", label: "From Academic Level", type: "select", options: levelsFor("from"), required: true, disabled: !setup.fromYear },
    { name: "group", label: "Group", type: "select", options: groupsFor("from"), required: true, disabled: !setup.fromLevel },
    { name: "program", label: "Program", type: "select", options: programsFor("from"), required: true, disabled: !setup.group },
    { name: "fromSection", label: "From Section", type: "select", options: sectionsFor("from"), required: true },
  ], [groupsFor, levelsFor, masters.boards, programsFor, sectionsFor, setup.board, setup.fromLevel, setup.fromYear, setup.group, yearsFor]);

  // Master data uses labels such as "Intermediate 2nd Year", so match the year
  // portion instead of relying on one exact label.
  const selectedSourceLevel = masters.levels.find((level) => level.value === asString(setup.fromLevel));
  const isFinalYear = isSecondYearLevel(selectedSourceLevel?.label || setup.fromLevel);
  const destinationLevels = useMemo(() => levelsFor("to").filter((level) => !/^degree$/i.test(level.label)), [levelsFor]);
  const lockedTargetGroups = useMemo(() => masters.groups.filter((group) => group.value === asString(setup.group)), [masters.groups, setup.group]);
  const lockedTargetPrograms = useMemo(() => programsFor("from").filter((program) => program.value === asString(setup.program)), [programsFor, setup.program]);
  const targetFields = useMemo(() => [
    { name: "toBoard", label: "Board", type: "select", options: masters.boards, required: true },
    { name: "toYear", label: "To Academic Year", type: "select", options: yearsFor("to"), required: true, disabled: !setup.toBoard },
    { name: "toLevel", label: "To Academic Level", type: "select", options: destinationLevels, required: true, disabled: !setup.toYear },
    { name: "toGroup", label: "Group", type: "select", options: lockedTargetGroups, required: true, disabled: true },
    { name: "toProgram", label: "Program", type: "select", options: lockedTargetPrograms, required: true, disabled: true },
    { name: "toSection", label: "To Section", type: "select", options: sectionsFor("to"), required: true },
  ], [destinationLevels, lockedTargetGroups, lockedTargetPrograms, masters.boards, sectionsFor, setup.toBoard, setup.toYear, yearsFor]);

  const selectedYearLabel = useCallback((yearId) => masters.years.find((year) => year.value === asString(yearId))?.label, [masters.years]);
  const hasInvalidTargetYear = !isFinalYear && Boolean(setup.fromYear && setup.toYear)
    && !isNextAcademicYear(selectedYearLabel(setup.fromYear), selectedYearLabel(setup.toYear));

  const updateSetup = (name, value) => {
    const resets = {
      fromYear: ["fromLevel", "group", "program", "fromSection", "toGroup", "toProgram", "toSection"], board: ["fromYear", "fromLevel", "group", "program", "fromSection", "toGroup", "toProgram", "toSection"],
      fromLevel: ["group", "program", "fromSection", "toGroup", "toProgram", "toSection"], group: ["program", "fromSection", "toProgram", "toSection"], program: ["fromSection", "toSection"],
      toYear: ["toLevel", "toSection"], toBoard: ["toYear", "toLevel", "toSection"],
      toLevel: ["toSection"], toGroup: ["toSection"], toProgram: ["toSection"],
    };
    const sourceYear = name === "fromYear" ? value : setup.fromYear;
    const targetYear = name === "toYear" ? value : setup.toYear;
    const invalidTargetYear = Boolean(sourceYear && targetYear)
      && !isNextAcademicYear(selectedYearLabel(sourceYear), selectedYearLabel(targetYear));
    setSetup((current) => ({
      ...current,
      ...Object.fromEntries((resets[name] || []).map((key) => [key, ""])),
      [name]: value,
      ...(name === "group" ? { toGroup: value, toProgram: "" } : {}),
      ...(name === "program" ? { toProgram: value } : {}),
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(["fromYear", "fromLevel", "toYear"].includes(name)
        ? { toYear: invalidTargetYear ? "Please select the correct academic year." : undefined }
        : {}),
    }));
    setStudentsLoaded(false);
    setStudents([]);
    setSelectedIds([]);
    setError("");
  };

  const validateFields = (fields) => {
    const errors = {};
    fields.forEach((field) => { if (field.required && !setup[field.name]) errors[field.name] = `${field.label} is required.`; });
    if (fields.some((field) => field.name === "toYear") && hasInvalidTargetYear) {
      errors.toYear = "Please select the correct academic year.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const eligibleParams = useCallback(() => {
    return compactParams({
      AcademicYearId: numericId(setup.fromYear),
      BoardId: numericId(setup.board),
    });
  }, [setup.board, setup.fromYear]);

  const fetchEligibleStudents = useCallback(async () => {
    setStudentsLoading(true);
    setError("");
    try {
      const response = await apiClient.get(apiEndpoints.promotions.eligible, { params: eligibleParams(), timeout: 15000 });
      const rows = unwrap(response.data, ["students", "Students", "eligibleStudents", "EligibleStudents"]).map(normalizeStudent).filter((student) => isPresent(student.id));
      setStudents(rows); setStudentsLoaded(true);
      setSelectedIds((current) => current.filter((id) => rows.some((student) => student.id === id && isEligible(student))));
    } catch (requestError) { setStudents([]); setStudentsLoaded(true); setError(getApiErrorMessage(requestError)); }
    finally { setStudentsLoading(false); }
  }, [eligibleParams]);

  const loadStudents = async () => {
    if (!validateFields(sourceFields)) { setError("Please complete the required source details."); return; }
    if (hasInvalidTargetYear) {
      setFieldErrors((current) => ({ ...current, toYear: "Please select the correct academic year." }));
      setError("Please select the correct academic year.");
      return;
    }
    await fetchEligibleStudents();
  };

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = !query || `${student.name} ${student.admissionNo} ${student.id}`.toLowerCase().includes(query);
      return matchesSearch && (!eligibilityFilter || student.eligibility === eligibilityFilter);
    });
  }, [eligibilityFilter, search, students]);
  const selectedStudents = useMemo(() => students.filter((student) => selectedIds.includes(student.id) && isEligible(student)), [selectedIds, students]);
  const eligibleStudents = useMemo(() => students.filter(isEligible), [students]);
  const summary = useMemo(() => ({ eligible: eligibleStudents.length, ineligible: students.length - eligibleStudents.length }), [eligibleStudents.length, students.length]);
  const academicLevelLabel = (levelId) => masters.levels.find((level) => level.value === asString(levelId))?.label || asString(levelId);

  const buildPayload = () => ({
    sourceAcademicYearId: numericId(setup.fromYear), sourceAcademicLevelId: numericId(setup.fromLevel), sourceAcademicLevel: academicLevelLabel(setup.fromLevel),
    sourceGroupId: numericId(setup.group), sourceProgramId: numericId(setup.program), sourceSection: setup.fromSection,
    targetAcademicYearId: numericId(setup.toYear), targetAcademicLevelId: numericId(setup.toLevel), targetAcademicLevel: academicLevelLabel(setup.toLevel),
    targetGroupId: numericId(setup.toGroup), targetProgramId: numericId(setup.toProgram), targetSection: setup.toSection,
    studentIds: selectedStudents.map((student) => numericId(student.id)).filter(Boolean),
  });

  const validatePromotion = () => {
    if (!validateFields([...sourceFields, ...targetFields])) { setError("Please complete the required source and target details."); return false; }
    if (String(setup.group) !== String(setup.toGroup) || String(setup.program) !== String(setup.toProgram)) {
      setFieldErrors((current) => ({ ...current, toGroup: "Target Group must match the Source Group.", toProgram: "Target Program must match the Source Program." }));
      setError("Target Group and Program must match the Source configuration.");
      return false;
    }
    if (hasInvalidTargetYear) {
      setFieldErrors((current) => ({ ...current, toYear: "Please select the correct academic year." }));
      setError("Please select the correct academic year.");
      return false;
    }
    if (!selectedIds.length) { setError("Please select at least one eligible student."); return false; }
    if (selectedStudents.length !== selectedIds.length) { setError("Only eligible students can be promoted."); return false; }
    if (!buildPayload().studentIds.length) { setError("Selected students do not contain valid backend IDs."); return false; }
    setError("");
    return true;
  };

  const openPreview = async () => {
    if (!validatePromotion()) return;
    setPreviewLoading(true);
    setError("");
    try {
      // Do not leave the action area in a loading state if the proxy/backend
      // accepts the connection but never returns a preview response.
      const response = await apiClient.post(apiEndpoints.promotions.preview, buildPayload(), { timeout: 15000 });
      setPreviewData(unwrapObject(response.data));
    } catch (previewError) {
      setPreviewData(null);
      setError(previewError?.code === "ECONNABORTED" ? "Promotion preview timed out. Please check that the promotion API is running and try again." : getApiErrorMessage(previewError));
    } finally {
      setPreviewLoading(false);
    }
  };

  const refreshAfterMutation = async () => {
    setSelectedIds([]);
    await Promise.all([fetchEligibleStudents(), fetchHistory()]);
  };

  const confirmPromotion = async () => {
    if (submitting || !validatePromotion()) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post(apiEndpoints.promotions.create, buildPayload(), { timeout: 15000 });
      const batchId = read(unwrapObject(response.data), "promotionBatchId", "PromotionBatchId");
      setPreviewData(null); setToast(`Promotion completed successfully${batchId ? `. Batch ID: ${batchId}` : "."}`); await refreshAfterMutation();
    } catch (promotionError) {
      setError(getApiErrorMessage(promotionError));
    } finally {
      setSubmitting(false);
    }
  };

  const promoteIndividual = async () => {
    if (!individualStudent || submitting || !validateFields(targetFields) || hasInvalidTargetYear) return;
    const studentId = numericId(individualStudent.id);
    if (!studentId) { setError("This student does not contain a valid backend ID."); return; }
    setSubmitting(true);
    try {
      await apiClient.post(apiEndpoints.promotions.student(studentId), { targetAcademicYearId: numericId(setup.toYear), targetAcademicLevel: academicLevelLabel(setup.toLevel), targetGroupId: numericId(setup.toGroup), targetSection: setup.toSection }, { timeout: 15000 });
      setIndividualStudent(null); setToast("Student promoted successfully."); await refreshAfterMutation();
    } catch (requestError) { setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true); setError("");
    try {
      const response = await apiClient.get(apiEndpoints.promotions.history, { params: compactParams({ academicYearId: numericId(historyFilters.academicYearId), academicLevel: historyFilters.academicLevel, groupId: numericId(historyFilters.groupId), programId: numericId(historyFilters.programId), section: historyFilters.section, studentId: numericId(historyFilters.studentId), search: historyFilters.search.trim(), promotionStatus: historyFilters.promotionStatus, fromDate: historyFilters.fromDate, toDate: historyFilters.toDate }), timeout: 15000 });
      setHistory(unwrap(response.data, ["history", "History", "promotions", "Promotions"]).map(normalizeHistory)); setHistoryLoaded(true);
    } catch (requestError) { setHistory([]); setHistoryLoaded(true); setError(getApiErrorMessage(requestError)); }
    finally { setHistoryLoading(false); }
  }, [historyFilters]);

  useEffect(() => { if (activeTab === "history" && !historyLoaded) fetchHistory(); }, [activeTab, fetchHistory, historyLoaded]);

  const rollback = async () => {
    if (!rollbackReason.trim()) { setError("Enter a reason for rollback."); return; }
    const promotionId = numericId(rollbackRecord?.id);
    if (!promotionId) { setError("This record does not contain a valid backend Promotion ID."); return; }
    setRollbackLoading(true);
    try {
      await apiClient.post(apiEndpoints.promotions.rollback, { promotionId, reason: rollbackReason.trim() }, { timeout: 15000 });
      setRollbackRecord(null); setRollbackReason(""); setToast("Promotion rolled back successfully."); await fetchHistory();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setRollbackLoading(false); }
  };

  const fetchReport = async () => {
    setReportLoading(true); setError("");
    try {
      const response = await apiClient.get(apiEndpoints.promotions.report, { timeout: 15000 });
      const data = unwrapObject(response.data);
      setReportRows(unwrap(data, ["details", "Details"]).map(normalizeHistory)); setReportLoaded(true);
    } catch (requestError) { setReportRows([]); setReportLoaded(true); setError(getApiErrorMessage(requestError)); }
    finally { setReportLoading(false); }
  };

  const setHistoryFilter = (name, value) => setHistoryFilters((current) => ({ ...current, [name]: value, ...(name === "groupId" ? { programId: "", section: "" } : {}), ...(name === "programId" ? { section: "" } : {}) }));
  const historyGroup = masters.groups.find((group) => group.value === asString(historyFilters.groupId));
  const historyPrograms = historyGroup?.programs || [];
  const historySections = masters.sections.filter((section) => (!section.group || section.group === asString(historyFilters.groupId) || section.group === historyGroup?.label) && (!historyFilters.programId || !section.program || section.program === asString(historyFilters.programId)));
  const previewStudents = unwrap(previewData, ["students", "Students", "eligibleStudents", "EligibleStudents"]);
  const previewEligibleCount = read(previewData, "eligibleCount", "EligibleCount") ?? (previewStudents.length ? previewStudents.filter((student) => isEligible(normalizeStudent(student))).length : selectedStudents.length);

  return (
    <DashboardLayout title={activeTab === "promotion" ? "Student Promotion" : activeTab === "single" ? "Single Student Promotion" : activeTab === "allocation" ? "Group & Section Allocation" : activeTab === "history" ? "Promotion History" : "Promotion Reports"} subtitle="Manage student promotions and academic allocations." breadcrumb={["Academics", "Promotion"]}>
      <div className="promotion-page">
        <nav className="promotion-tabs" aria-label="Promotion sections">
          {[["promotion", "Student Promotion", "/dashboard/promotion"], ["single", "Single Student", "/dashboard/promotions/single"], ["allocation", "Allocation", "/dashboard/promotions/allocation"], ["history", "Promotion History", "/dashboard/promotions/history"], ["report", "Reports", "/dashboard/promotions/report"]].map(([value, label, path]) => <button key={value} className={activeTab === value ? "is-active" : ""} onClick={() => { navigate(path); setError(""); }}>{label}</button>)}
        </nav>

        {masterError ? <div className="promotion-error" role="alert">{masterError} <button onClick={loadMasters}>Retry master data</button></div> : null}
        {error ? <div className="promotion-error" role="alert">{error}</div> : null}

        {activeTab === "promotion" ? <>
          <section className="cms-card promotion-card">
            <div className="cms-card-head"><div><h2>1. Promotion Setup</h2><p>Choose the current cohort and its destination using live master data.</p></div><button className="cms-btn cms-btn-ghost" onClick={loadMasters} disabled={masterLoading}>{masterLoading ? "Loading..." : <><RefreshCw size={16} aria-hidden="true" /> Refresh</>}</button></div>
            <div className="cms-card-body promotion-setup-grid">
              <div className="promotion-flow-panel"><h3>Current / Source</h3><div className="promotion-field-grid">{sourceFields.map((field) => <Field key={field.name} field={{ ...field, disabled: masterLoading || field.disabled }} value={setup[field.name]} error={fieldErrors[field.name]} onChange={updateSetup} />)}</div></div>
              <div className="promotion-arrow" aria-hidden="true">→</div>
              {isFinalYear ? <div className="promotion-flow-panel promotion-completion-panel"><h3>Final Result / Course Completion</h3></div> : <div className="promotion-flow-panel"><h3>Destination</h3><div className="promotion-field-grid">{targetFields.map((field) => <Field key={field.name} field={{ ...field, disabled: masterLoading || field.disabled }} value={setup[field.name]} error={fieldErrors[field.name]} onChange={updateSetup} />)}</div></div>}
            </div>
            <div className="promotion-actions"><button className="cms-btn cms-btn-primary" onClick={loadStudents} disabled={masterLoading || studentsLoading || hasInvalidTargetYear}>{studentsLoading ? "Loading..." : "Load Students"}</button><button className="cms-btn cms-btn-ghost" onClick={() => { setSetup(EMPTY_SETUP); setStudents([]); setStudentsLoaded(false); setSelectedIds([]); setSearch(""); setFieldErrors({}); setError(""); }}>Clear</button></div>
          </section>

          <section className="cms-card promotion-card">
            <div className="cms-card-head promotion-table-head"><div><h2>2. Student Eligibility</h2><p>{studentsLoaded ? `${students.length} student${students.length === 1 ? "" : "s"} returned by the Promotion API.` : "Load a source cohort to review eligibility."}</p></div><span className="cms-badge cms-badge-info">Selected Students: {selectedIds.length}</span></div>
            <div className="promotion-table-controls"><input aria-label="Search students" placeholder="Search student name, admission number, or ID" value={search} onChange={(event) => setSearch(event.target.value)} /><button className="cms-btn cms-btn-ghost" onClick={loadStudents} disabled={studentsLoading || hasInvalidTargetYear}>Search</button><select aria-label="Eligibility status" value={eligibilityFilter} onChange={(event) => setEligibilityFilter(event.target.value)}><option value="">All statuses</option>{unique(students.map((student) => student.eligibility)).map((status) => <option key={status}>{status}</option>)}</select><button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds((current) => [...new Set([...current, ...eligibleStudents.map((student) => student.id)])])} disabled={!eligibleStudents.length}>Select All Eligible</button><button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds([])}>Clear</button></div>
            {studentsLoading ? <div className="promotion-empty" role="status">Loading eligible students...</div> : studentsLoaded ? <div className="cms-table-wrap"><table className="cms-table promotion-table"><thead><tr><th>Select</th><th>Admission No.</th><th>Student Name</th><th>Academic Year</th><th>Board</th><th>Level</th><th>Group</th><th>Section</th><th>Medium</th><th>Eligibility</th><th>Reason</th>{!isFinalYear ? <th>Action</th> : null}</tr></thead><tbody>{visibleStudents.length ? visibleStudents.map((student) => <tr key={student.id}><td><input type="checkbox" checked={selectedIds.includes(student.id)} disabled={!isEligible(student)} onChange={() => setSelectedIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /></td><td className="cms-strong">{student.admissionNo}</td><td>{student.name}</td><td>{student.academicYear}</td><td>{student.board}</td><td>{student.level}</td><td>{student.group}</td><td>{student.section}</td><td>{student.medium}</td><td><span className={`promotion-status ${isEligible(student) ? "eligible" : "not-eligible"}`}>{student.eligibility}</span></td><td>{student.reason || "-"}</td>{!isFinalYear ? <td><button className="cms-action-link" disabled={!isEligible(student)} onClick={() => setIndividualStudent(student)}>Promote</button></td> : null}</tr>) : <tr><td colSpan={isFinalYear ? 11 : 12} className="promotion-empty">No students found for the selected filters.</td></tr>}</tbody></table></div> : <div className="promotion-empty">Select the source details, then load students.</div>}
          </section>

          {studentsLoaded ? <section className="promotion-summary"><div><span>Total Students</span><strong>{students.length}</strong></div><div><span>Eligible</span><strong>{summary.eligible}</strong></div><div><span>Not Eligible</span><strong>{summary.ineligible}</strong></div><div><span>Selected</span><strong>{selectedIds.length}</strong></div></section> : null}
          {!isFinalYear ? <div className="promotion-final-actions"><button className="cms-btn cms-btn-primary" onClick={openPreview} disabled={!selectedIds.length || previewLoading || submitting || hasInvalidTargetYear}>{previewLoading ? "Preparing Preview..." : "Preview Promotion"}</button></div> : null}
        </> : null}

        {activeTab === "single" ? <SinglePromotionScreen masters={masters} student={students.find(isEligible)} onPromote={() => setToast("Student promotion completed successfully.")} /> : null}

        {activeTab === "allocation" ? <AllocationScreen activeTab={allocationTab} setActiveTab={setAllocationTab} masters={masters} setup={setup} students={students} onSaved={() => setToast(`${allocationTab === "group" ? "Group" : "Section"} allocation updated successfully.`)} /> : null}

        {activeTab === "history" ? <section className="cms-card promotion-card"><div className="cms-card-head"><div><h2>Promotion History</h2><p>Search completed promotion activity and roll back supported records.</p></div></div><div className="cms-card-body promotion-history-filters">{[
          { name: "academicYearId", label: "Source Year", type: "select", options: uniqueAcademicYearsByName(masters.years, (year) => year.label) },
          { name: "academicLevel", label: "Source Level", type: "select", options: masters.levels },
          { name: "groupId", label: "Source Group", type: "select", options: masters.groups }, { name: "programId", label: "Source Program", type: "select", options: historyPrograms, disabled: !historyFilters.groupId }, { name: "section", label: "Source Section", type: "select", options: historySections, disabled: !historyFilters.programId },
          { name: "studentId", label: "Student ID", type: "number" }, { name: "search", label: "Search" }, { name: "promotionStatus", label: "Promotion Status" },
        ].map((field) => <Field key={field.name} field={field} value={historyFilters[field.name]} onChange={setHistoryFilter} />)}<HistoryDateRange fromDate={historyFilters.fromDate} toDate={historyFilters.toDate} onChange={setHistoryFilter} /></div><div className="promotion-actions"><button className="cms-btn cms-btn-ghost" onClick={() => { setHistoryFilters(EMPTY_HISTORY_FILTERS); setHistoryLoaded(false); }}>Clear Filters</button><button className="cms-btn cms-btn-primary" onClick={fetchHistory} disabled={historyLoading}>{historyLoading ? "Loading..." : "Load History"}</button></div>{historyLoading ? <div className="promotion-empty">Loading promotion history...</div> : historyLoaded ? <HistoryTable rows={history} onRollback={setRollbackRecord} /> : null}</section> : null}

        {activeTab === "report" ? <ReportScreen rows={reportRows} loading={reportLoading} loaded={reportLoaded} onLoad={fetchReport} /> : null}
      </div>

      {previewData ? <Modal title="Promotion Preview" onClose={() => setPreviewData(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setPreviewData(null)} disabled={submitting}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={confirmPromotion} disabled={submitting}>{submitting ? "Promoting..." : "Confirm Promotion"}</button></>}><div className="promotion-preview-details"><div><span>Source</span><strong>{[masters.years.find((item) => item.value === setup.fromYear)?.label, masters.boards.find((item) => item.value === setup.board)?.label, setup.fromLevel, masters.groups.find((item) => item.value === setup.group)?.label, setup.fromSection && `Section ${setup.fromSection}`].filter(Boolean).join(" • ")}</strong></div><div><span>Destination</span><strong>{[masters.years.find((item) => item.value === setup.toYear)?.label, masters.boards.find((item) => item.value === setup.toBoard)?.label, setup.toLevel, masters.groups.find((item) => item.value === setup.toGroup)?.label, setup.toSection && `Section ${setup.toSection}`].filter(Boolean).join(" • ")}</strong></div><div><span>Selected Students</span><strong>{selectedIds.length}</strong></div><div><span>Eligible Students</span><strong>{previewEligibleCount}</strong></div><div><span>Not Eligible Students</span><strong>{read(previewData, "notEligibleCount", "NotEligibleCount", "ineligibleCount", "IneligibleCount") ?? 0}</strong></div></div>{previewStudents.length ? <ul className="promotion-preview-list">{previewStudents.map((student, index) => <li key={read(student, "studentId", "StudentId", "id", "Id") ?? index}>{read(student, "studentName", "StudentName", "name", "Name") || read(student, "admissionNumber", "AdmissionNumber") || `Student ${index + 1}`}{read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason") ? ` — ${read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason")}` : ""}</li>)}</ul> : <p className="promotion-preview-copy">The backend preview completed successfully for the selected students.</p>}</Modal> : null}
      {individualStudent ? <Modal title="Promote Student" size="sm" onClose={() => setIndividualStudent(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setIndividualStudent(null)} disabled={submitting}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={promoteIndividual} disabled={submitting || hasInvalidTargetYear}>{submitting ? "Promoting..." : "Promote Student"}</button></>}><div className="promotion-confirm-copy"><p>Promote this student to the selected Target configuration?</p><strong>{individualStudent.name}</strong><p>{individualStudent.admissionNo}</p></div></Modal> : null}
      {rollbackRecord ? <Modal title="Rollback Promotion" size="sm" onClose={() => setRollbackRecord(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRollbackRecord(null)} disabled={rollbackLoading}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={rollback} disabled={rollbackLoading || !rollbackReason.trim()}>{rollbackLoading ? "Rolling Back..." : "Rollback"}</button></>}><div className="cms-field"><label htmlFor="rollback-reason">Rollback reason <span className="req">*</span></label><textarea id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="Enter the reason for rollback" /></div></Modal> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function HistoryTable({ rows, onRollback }) {
  return <div className="cms-table-wrap"><table className="cms-table promotion-table"><thead><tr><th>Promotion ID</th><th>Student</th><th>Admission No.</th><th>Source</th><th>Target</th><th>Date</th><th>Status</th><th>Promoted By</th>{onRollback ? <th>Action</th> : null}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id ?? index}><td className="cms-strong">{row.id ?? "-"}</td><td>{row.student}</td><td>{row.admissionNo}</td><td>{[row.sourceYear, row.sourceLevel, row.sourceGroup, row.sourceSection].filter((value) => value !== "-").join(" • ") || "-"}</td><td>{[row.targetYear, row.targetLevel, row.targetGroup, row.targetSection].filter((value) => value !== "-").join(" • ") || "-"}</td><td>{row.date}</td><td><span className="promotion-status eligible">{row.status}</span></td><td>{row.promotedBy}</td>{onRollback ? <td><button className="cms-action-link danger" disabled={!row.canRollback} onClick={() => onRollback(row)}>Rollback</button></td> : null}</tr>) : <tr><td colSpan={onRollback ? 9 : 8} className="promotion-empty">No promotion history available.</td></tr>}</tbody></table></div>;
}

function HistoryDateRange({ fromDate, toDate, onChange }) {
  return <div className="cms-field promotion-date-range">
    <label>Date Range</label>
    <div className="promotion-date-range-control">
      <label>From Date<input type="date" value={fromDate} onChange={(event) => onChange("fromDate", event.target.value)} /></label>
      <span aria-hidden="true">—</span>
      <label>To Date<input type="date" value={toDate} onChange={(event) => onChange("toDate", event.target.value)} /></label>
    </div>
  </div>;
}

function SinglePromotionScreen({ masters, student, onPromote }) {
  const [target, setTarget] = useState({ year: "", level: "", group: "", program: "", section: "", medium: "English" });
  const [confirming, setConfirming] = useState(false);
  const change = (name, value) => setTarget((current) => ({ ...current, ...(name === "group" ? { program: "", section: "" } : {}), ...(name === "program" ? { section: "" } : {}), [name]: value }));
  const targetGroup = masters.groups.find((group) => group.value === asString(target.group));
  const targetPrograms = targetGroup?.programs || [];
  const targetSections = masters.sections.filter((section) => (!section.group || section.group === asString(target.group) || section.group === targetGroup?.label) && (!target.program || !section.program || section.program === asString(target.program)));
  const targetYearLabel = masters.years.find((year) => year.value === asString(target.year))?.label;
  const invalidTargetYear = Boolean(student?.academicYear && target.year) && !isNextAcademicYear(student.academicYear, targetYearLabel);
  const fields = [{ name: "year", label: "Target Academic Year", type: "select", options: uniqueAcademicYearsByName(masters.years, (year) => year.label), required: true }, { name: "level", label: "Target Academic Level", type: "select", options: masters.levels, required: true }, { name: "group", label: "Target Group", type: "select", options: masters.groups, required: true }, { name: "program", label: "Target Program", type: "select", options: targetPrograms, required: true, disabled: !target.group }, { name: "section", label: "Target Section", type: "select", options: targetSections, required: true, disabled: !target.program }, { name: "medium", label: "Target Medium", type: "select", options: [option("English")], required: true }];
  return <section className="cms-card promotion-card"><div className="cms-card-head"><div><h2>Student Details</h2><p>Select a student from the eligible-students list or search by admission number.</p></div></div><div className="cms-card-body promotion-setup-grid promotion-single-grid"><div className="promotion-flow-panel"><h3>Current Details</h3>{student ? <><p><strong>Student:</strong> {student.name}</p><p><strong>Admission No:</strong> {student.admissionNo}</p><p><strong>Current:</strong> {[student.academicYear, student.level, student.group, student.section].filter((value) => value && value !== "-").join(" / ") || "-"}</p></> : <p className="promotion-empty">Load eligible students from Student Promotion first.</p>}</div><div className="promotion-flow-panel"><h3>Target Details</h3><div className="promotion-field-grid">{fields.map((field) => <Field key={field.name} field={field} value={target[field.name]} error={field.name === "year" && invalidTargetYear ? "Please select the correct academic year." : undefined} onChange={change} />)}</div></div></div><div className="promotion-actions"><button className="cms-btn cms-btn-ghost" type="button">Cancel</button><button className="cms-btn cms-btn-primary" type="button" disabled={!student || invalidTargetYear || Object.values(target).some((value) => !value)} onClick={() => setConfirming(true)}>Promote Student</button></div>{confirming ? <Modal title="Confirm Student Promotion" onClose={() => setConfirming(false)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setConfirming(false)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={() => { setConfirming(false); onPromote(); }}>Confirm</button></>}><p>Are you sure you want to promote {student?.name}?</p><strong>{student?.level || "Current level"} → {target.level}</strong></Modal> : null}</section>;
}

function AllocationScreen({ activeTab, setActiveTab, masters, setup, students, onSaved }) {
  const [selected, setSelected] = useState([]); const [target, setTarget] = useState({}); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const rows = students.map((student) => ({ id: student.id, student: student.name, roll: student.admissionNo, group: student.group, section: student.section }));
  const isGroup = activeTab === "group"; const options = isGroup ? masters.groups : masters.sections;
  const save = async () => {
    const chosen = [...new Set(selected.map((id) => target[id]).filter(Boolean))];
    if (chosen.length !== 1 || !numericId(setup.toYear) || !setup.toLevel) { setMessage("Select students with one target and complete the promotion destination first."); return; }
    setSaving(true); setMessage("");
    try {
      const targetAcademicLevel = masters.levels.find((level) => level.value === asString(setup.toLevel))?.label || asString(setup.toLevel);
      const payload = { studentIds: selected, targetAcademicYearId: numericId(setup.toYear), targetAcademicLevel, targetGroupId: isGroup ? numericId(chosen[0]) : numericId(setup.toGroup) };
      if (!isGroup) payload.targetSection = chosen[0];
      await apiClient.patch(isGroup ? apiEndpoints.promotions.groupAllocation : apiEndpoints.promotions.sectionAllocation, payload, { timeout: 15000 });
      onSaved(); setSelected([]); setTarget({});
    } catch (error) { setMessage(getApiErrorMessage(error)); } finally { setSaving(false); }
  };
  return <section className="cms-card promotion-card"><div className="promotion-tabs" role="tablist"><button className={isGroup ? "is-active" : ""} onClick={() => setActiveTab("group")}>Group Allocation</button><button className={!isGroup ? "is-active" : ""} onClick={() => setActiveTab("section")}>Section Allocation</button></div>{message ? <div className="promotion-error" role="alert">{message}</div> : null}<div className="cms-table-wrap"><table className="cms-table promotion-table"><thead><tr><th>Select</th><th>Student</th><th>Roll No.</th><th>Current {isGroup ? "Group" : "Section"}</th><th>Target {isGroup ? "Group" : "Section"}</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected((items) => items.includes(row.id) ? items.filter((id) => id !== row.id) : [...items, row.id])} /></td><td>{row.student}</td><td>{row.roll}</td><td>{isGroup ? row.group : row.section}</td><td><select value={target[row.id] || ""} onChange={(event) => setTarget((items) => ({ ...items, [row.id]: event.target.value }))}><option value="">Select target</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td></tr>) : <tr><td colSpan={5} className="promotion-empty">Load eligible students from Student Promotion first.</td></tr>}</tbody></table></div><div className="promotion-actions"><button className="cms-btn cms-btn-primary" disabled={!selected.length || saving} onClick={save}>{saving ? "Saving..." : `Apply ${isGroup ? "Group" : "Section"} Allocation`}</button></div></section>;
}

function ReportScreen({ rows, loading, loaded, onLoad }) {
  const total = rows.length;
  const promoted = rows.filter((row) => /promot/i.test(row.status)).length;
  const rolledBack = rows.filter((row) => /rollback/i.test(row.status)).length;
  return <><section className="promotion-summary"><div><span>Total Students</span><strong>{total}</strong></div><div><span>Eligible</span><strong>{total - rolledBack}</strong></div><div><span>Promoted</span><strong>{promoted}</strong></div><div><span>Rolled Back</span><strong>{rolledBack}</strong></div></section><section className="cms-card promotion-card"><div className="cms-card-head"><div><h2>Promotion Reports</h2><p>Review promotion statistics and records.</p></div><button className="cms-btn cms-btn-primary" onClick={onLoad} disabled={loading}>{loading ? "Loading..." : "Load Report"}</button></div>{loaded ? <HistoryTable rows={rows} /> : <div className="promotion-empty">Load the report to view promotion records.</div>}</section></>;
}
