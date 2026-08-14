import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./PromotionPage.css";

const promotionApi = {
  eligible: "/api/promotions/eligible",
  preview: "/api/promotions/preview",
  promote: "/api/promotions",
  history: "/api/promotions/history",
  rollback: "/api/promotions/rollback",
  student: (studentId) => `/api/promotions/student/${studentId}`,
  groupAllocation: "/api/promotions/group-allocation",
  sectionAllocation: "/api/promotions/section-allocation",
  report: "/api/promotions/report",
};

const EMPTY_SETUP = {
  fromYear: "", board: "", fromLevel: "", group: "", fromSection: "", fromMedium: "",
  toYear: "", toBoard: "", toLevel: "", toGroup: "", toSection: "", toMedium: "",
};

const EMPTY_HISTORY_FILTERS = {
  academicYearId: "", targetAcademicYearId: "", academicLevel: "", targetAcademicLevel: "",
  groupId: "", section: "", studentId: "", search: "", promotionStatus: "", fromDate: "", toDate: "",
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

const normalizeStudent = (item) => {
  const id = read(item, "studentId", "StudentId", "id", "Id");
  const eligibleFlag = read(item, "isEligible", "IsEligible", "eligible", "Eligible");
  const eligibility = asString(read(item, "eligibilityStatus", "EligibilityStatus", "eligibility", "status", "Status"));
  return {
    raw: item,
    id: numericId(id) ?? id,
    admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo", "admissionNumberNo", "AdmissionNumberNo", "studentCode", "StudentCode") || "-",
    name: read(item, "studentName", "StudentName", "fullName", "FullName", "name", "Name") || "-",
    academicYear: read(item, "academicYearName", "AcademicYearName", "sourceAcademicYearName", "SourceAcademicYearName", "currentAcademicYear", "CurrentAcademicYear") || "-",
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
  sourceYear: read(item, "sourceAcademicYearName", "SourceAcademicYearName", "academicYearName", "AcademicYearName") || "-",
  sourceLevel: read(item, "sourceAcademicLevel", "SourceAcademicLevel", "academicLevel", "AcademicLevel") || "-",
  sourceGroup: read(item, "sourceGroupName", "SourceGroupName", "groupName", "GroupName") || "-",
  sourceSection: read(item, "sourceSection", "SourceSection", "section", "Section") || "-",
  targetYear: read(item, "targetAcademicYearName", "TargetAcademicYearName") || "-",
  targetLevel: read(item, "targetAcademicLevel", "TargetAcademicLevel") || "-",
  targetGroup: read(item, "targetGroupName", "TargetGroupName") || "-",
  targetSection: read(item, "targetSection", "TargetSection") || "-",
  date: read(item, "promotionDate", "PromotionDate", "createdAt", "CreatedAt") || "-",
  status: read(item, "promotionStatus", "PromotionStatus", "status", "Status") || "-",
  promotedBy: read(item, "promotedBy", "PromotedBy", "promotedByName", "PromotedByName") || "-",
  canRollback: read(item, "canRollback", "CanRollback") !== false,
});

const isEligible = (student) => student.eligibleFlag !== false && !/not\s*eligible|ineligible|failed|blocked/i.test(student.eligibility);

export default function PromotionPage() {
  const [activeTab, setActiveTab] = useState("promotion");
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [masters, setMasters] = useState({ years: [], boards: [], levels: [], groups: [], sections: [], mediums: [] });
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
  const [confirmOpen, setConfirmOpen] = useState(false);
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
        apiClient.get(apiEndpoints.boards.academicLevels), apiClient.get(apiEndpoints.groups.list),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      const responseData = (index) => responses[index].status === "fulfilled" ? responses[index].value.data : [];
      const [yearsData, boardsData, levelsData, groupsData, sectionsData] = responses.map((_, index) => responseData(index));
      const failedMasters = ["academic years", "boards", "academic levels", "groups", "sections"]
        .filter((_, index) => responses[index].status === "rejected");
      const years = unwrap(yearsData).map((item) => option(read(item, "academicYearId", "AcademicYearId", "id", "Id"), read(item, "academicYearName", "AcademicYearName", "name", "Name"))).filter((item) => numericId(item.value));
      const boards = unwrap(boardsData).map((item) => option(read(item, "boardId", "BoardId", "id", "Id"), read(item, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"))).filter((item) => numericId(item.value));
      const levelItems = unwrap(levelsData, ["academicLevels", "AcademicLevels"]);
      const groupItems = unwrap(groupsData);
      const sectionItems = unwrap(sectionsData);
      const levels = unique(levelItems.map((item) => typeof item === "string" ? item : read(item, "academicLevel", "AcademicLevel", "levelName", "LevelName", "name", "Name")));
      const groups = groupItems.map((item) => ({
        ...option(read(item, "groupId", "GroupId", "id", "Id"), read(item, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")),
        board: asString(read(item, "boardId", "BoardId", "board", "Board")),
        level: asString(read(item, "academicLevel", "AcademicLevel", "level", "Level")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
      })).filter((item) => numericId(item.value));
      const sections = sectionItems.map((item) => ({
        value: asString(read(item, "sectionName", "SectionName", "name", "Name")),
        label: asString(read(item, "sectionName", "SectionName", "name", "Name")),
        group: asString(read(item, "groupId", "GroupId", "group", "Group", "groupName", "GroupName")),
        level: asString(read(item, "academicLevel", "AcademicLevel", "level", "Level")),
        medium: asString(read(item, "medium", "Medium")),
      })).filter((item) => item.value);
      const derivedLevels = unique([...levels, ...groupItems.map((item) => read(item, "academicLevel", "AcademicLevel")), ...sectionItems.map((item) => read(item, "academicLevel", "AcademicLevel"))]);
      const mediums = unique(sectionItems.map((item) => read(item, "medium", "Medium")));
      setMasters({ years, boards, levels: derivedLevels.map((item) => option(item)), groups, sections, mediums: mediums.map((item) => option(item)) });
      if (failedMasters.length) setMasterError(`Unable to load ${failedMasters.join(", ")}. Other live master data remains available.`);
    } catch (requestError) {
      setMasterError(getApiErrorMessage(requestError));
    } finally {
      setMasterLoading(false);
    }
  }, []);

  useEffect(() => { loadMasters(); }, [loadMasters]);
  useEffect(() => () => eligibleController.current?.abort(), []);

  const groupsFor = useCallback((prefix) => masters.groups.filter((group) => {
    const boardValue = setup[prefix === "from" ? "board" : "toBoard"];
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    const yearValue = setup[prefix === "from" ? "fromYear" : "toYear"];
    return (!group.board || group.board === boardValue || group.board === masters.boards.find((item) => item.value === boardValue)?.label)
      && (!group.level || group.level === levelValue) && (!group.year || group.year === yearValue);
  }), [masters.boards, masters.groups, setup]);

  const sectionsFor = useCallback((prefix) => {
    const groupValue = setup[prefix === "from" ? "group" : "toGroup"];
    const groupLabel = masters.groups.find((item) => item.value === groupValue)?.label;
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    return masters.sections.filter((section) => (!section.group || section.group === groupValue || section.group === groupLabel) && (!section.level || section.level === levelValue));
  }, [masters.groups, masters.sections, setup]);

  const sourceFields = useMemo(() => [
    { name: "fromYear", label: "From Academic Year", type: "select", options: masters.years, required: true },
    { name: "board", label: "Board", type: "select", options: masters.boards, required: true },
    { name: "fromLevel", label: "From Academic Level", type: "select", options: masters.levels, required: true },
    { name: "group", label: "Group", type: "select", options: groupsFor("from"), required: true },
    { name: "fromSection", label: "From Section", type: "select", options: sectionsFor("from") },
    { name: "fromMedium", label: "Medium", type: "select", options: masters.mediums, required: masters.mediums.length > 0 },
  ], [groupsFor, masters, sectionsFor]);

  const targetFields = useMemo(() => [
    { name: "toYear", label: "To Academic Year", type: "select", options: masters.years, required: true },
    { name: "toBoard", label: "Board", type: "select", options: masters.boards, required: true },
    { name: "toLevel", label: "To Academic Level", type: "select", options: masters.levels, required: true },
    { name: "toGroup", label: "To Group", type: "select", options: groupsFor("to"), required: true },
    { name: "toSection", label: "To Section", type: "select", options: sectionsFor("to") },
    { name: "toMedium", label: "Medium", type: "select", options: masters.mediums, required: masters.mediums.length > 0 },
  ], [groupsFor, masters, sectionsFor]);

  const updateSetup = (name, value) => {
    const resets = {
      fromYear: ["board", "fromLevel", "group", "fromSection", "fromMedium"], board: ["fromLevel", "group", "fromSection", "fromMedium"],
      fromLevel: ["group", "fromSection", "fromMedium"], group: ["fromSection", "fromMedium"], fromSection: ["fromMedium"],
      toYear: ["toBoard", "toLevel", "toGroup", "toSection", "toMedium"], toBoard: ["toLevel", "toGroup", "toSection", "toMedium"],
      toLevel: ["toGroup", "toSection", "toMedium"], toGroup: ["toSection", "toMedium"], toSection: ["toMedium"],
    };
    setSetup((current) => ({ ...current, ...Object.fromEntries((resets[name] || []).map((key) => [key, ""])), [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setStudentsLoaded(false);
    setStudents([]);
    setSelectedIds([]);
    setError("");
  };

  const validateFields = (fields) => {
    const errors = {};
    fields.forEach((field) => { if (field.required && !setup[field.name]) errors[field.name] = `${field.label} is required.`; });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const eligibleParams = useCallback(() => compactParams({
    AcademicYearId: numericId(setup.fromYear), BoardId: numericId(setup.board), AcademicLevel: setup.fromLevel,
    GroupId: numericId(setup.group), Section: setup.fromSection, Medium: setup.fromMedium,
    TargetAcademicYearId: numericId(setup.toYear), TargetBoardId: numericId(setup.toBoard), TargetAcademicLevel: setup.toLevel,
    TargetGroupId: numericId(setup.toGroup), TargetSection: setup.toSection, TargetMedium: setup.toMedium,
    Search: search.trim(), EligibilityStatus: eligibilityFilter,
  }), [eligibilityFilter, search, setup]);

  const fetchEligibleStudents = useCallback(async () => {
    eligibleController.current?.abort();
    const controller = new AbortController();
    eligibleController.current = controller;
    setStudentsLoading(true);
    setError("");
    try {
      const response = await apiClient.get(promotionApi.eligible, { params: eligibleParams(), signal: controller.signal });
      const rows = unwrap(response.data, ["students", "Students", "eligibleStudents", "EligibleStudents", "results", "Results"])
        .map(normalizeStudent).filter((student) => isPresent(student.id));
      setStudents(rows);
      setStudentsLoaded(true);
      setSelectedIds((current) => current.filter((id) => rows.some((student) => student.id === id && isEligible(student))));
    } catch (requestError) {
      if (requestError.code !== "ERR_CANCELED") { setError(getApiErrorMessage(requestError)); setStudents([]); setStudentsLoaded(true); }
    } finally {
      if (eligibleController.current === controller) setStudentsLoading(false);
    }
  }, [eligibleParams]);

  const loadStudents = async () => {
    if (!validateFields(sourceFields)) { setError("Please complete the required source details."); return; }
    await fetchEligibleStudents();
  };

  const selectedStudents = useMemo(() => students.filter((student) => selectedIds.includes(student.id) && isEligible(student)), [selectedIds, students]);
  const eligibleStudents = useMemo(() => students.filter(isEligible), [students]);
  const summary = useMemo(() => ({ eligible: eligibleStudents.length, ineligible: students.length - eligibleStudents.length }), [eligibleStudents.length, students.length]);

  const buildPayload = () => ({
    sourceAcademicYearId: numericId(setup.fromYear), sourceBoardId: numericId(setup.board), sourceAcademicLevel: setup.fromLevel,
    sourceGroupId: numericId(setup.group), sourceSection: setup.fromSection, sourceMedium: setup.fromMedium,
    targetAcademicYearId: numericId(setup.toYear), targetBoardId: numericId(setup.toBoard), targetAcademicLevel: setup.toLevel,
    targetGroupId: numericId(setup.toGroup), targetSection: setup.toSection, targetMedium: setup.toMedium,
    studentIds: selectedStudents.map((student) => numericId(student.id)).filter(Boolean),
  });

  const validatePromotion = () => {
    if (!validateFields([...sourceFields, ...targetFields])) { setError("Please complete the required source and target details."); return false; }
    if (!selectedStudents.length) { setError("Select at least one eligible student."); return false; }
    if (!buildPayload().studentIds.length) { setError("Selected students do not contain valid backend IDs."); return false; }
    setError("");
    return true;
  };

  const openPreview = async () => {
    if (!validatePromotion()) return;
    setPreviewLoading(true);
    try {
      const response = await apiClient.post(promotionApi.preview, buildPayload());
      setPreviewData(unwrapObject(response.data));
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setPreviewLoading(false); }
  };

  const refreshAfterMutation = async () => {
    setSelectedIds([]);
    await Promise.all([fetchEligibleStudents(), fetchHistory()]);
  };

  const confirmPromotion = async () => {
    if (submitting || !validatePromotion()) return;
    setSubmitting(true);
    try {
      await apiClient.post(promotionApi.promote, buildPayload());
      setConfirmOpen(false); setPreviewData(null); setToast("Promotion completed successfully.");
      await refreshAfterMutation();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const promoteIndividual = async () => {
    if (!individualStudent || submitting || !validateFields(targetFields)) return;
    const studentId = numericId(individualStudent.id);
    if (!studentId) { setError("This student does not contain a valid backend ID."); return; }
    setSubmitting(true);
    try {
      await apiClient.post(promotionApi.student(studentId), {
        targetAcademicYearId: numericId(setup.toYear), targetBoardId: numericId(setup.toBoard), targetAcademicLevel: setup.toLevel,
        targetGroupId: numericId(setup.toGroup), targetSection: setup.toSection, targetMedium: setup.toMedium,
      });
      setIndividualStudent(null); setToast("Student promoted successfully."); await refreshAfterMutation();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const allocate = async (type) => {
    if (!validatePromotion() || submitting) return;
    setSubmitting(true);
    const isSection = type === "section";
    if (isSection && !setup.toSection) { setFieldErrors((current) => ({ ...current, toSection: "To Section is required." })); setError("Select a target section before section allocation."); setSubmitting(false); return; }
    try {
      await apiClient.patch(isSection ? promotionApi.sectionAllocation : promotionApi.groupAllocation, compactParams({
        studentIds: buildPayload().studentIds, targetAcademicYearId: numericId(setup.toYear), targetAcademicLevel: setup.toLevel,
        targetGroupId: numericId(setup.toGroup), targetSection: isSection ? setup.toSection : undefined,
      }));
      setToast(`${isSection ? "Section" : "Group"} allocation updated successfully.`);
      await fetchEligibleStudents();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true); setError("");
    try {
      const response = await apiClient.get(promotionApi.history, { params: compactParams({
        AcademicYearId: numericId(historyFilters.academicYearId), TargetAcademicYearId: numericId(historyFilters.targetAcademicYearId),
        AcademicLevel: historyFilters.academicLevel, TargetAcademicLevel: historyFilters.targetAcademicLevel,
        GroupId: numericId(historyFilters.groupId), Section: historyFilters.section, StudentId: numericId(historyFilters.studentId),
        Search: historyFilters.search.trim(), PromotionStatus: historyFilters.promotionStatus,
        FromDate: historyFilters.fromDate, ToDate: historyFilters.toDate,
      }) });
      setHistory(unwrap(response.data, ["history", "History", "promotions", "Promotions", "records", "Records"]).map(normalizeHistory).filter((row) => isPresent(row.id)));
      setHistoryLoaded(true);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); setHistory([]); setHistoryLoaded(true); }
    finally { setHistoryLoading(false); }
  }, [historyFilters]);

  useEffect(() => { if (activeTab === "history" && !historyLoaded) fetchHistory(); }, [activeTab, fetchHistory, historyLoaded]);

  const rollback = async () => {
    if (!rollbackReason.trim()) { setError("Enter a reason for rollback."); return; }
    const promotionId = numericId(rollbackRecord?.id);
    if (!promotionId) { setError("This record does not contain a valid backend Promotion ID."); return; }
    setRollbackLoading(true);
    try {
      await apiClient.post(promotionApi.rollback, { promotionId, reason: rollbackReason.trim() });
      setRollbackRecord(null); setRollbackReason(""); setToast("Promotion rolled back successfully.");
      await Promise.all([fetchHistory(), studentsLoaded ? fetchEligibleStudents() : Promise.resolve()]);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setRollbackLoading(false); }
  };

  const fetchReport = async () => {
    setReportLoading(true); setError("");
    try {
      const response = await apiClient.get(promotionApi.report, { params: compactParams({
        AcademicYearId: numericId(setup.fromYear), TargetAcademicYearId: numericId(setup.toYear), BoardId: numericId(setup.board),
        AcademicLevel: setup.fromLevel, TargetAcademicLevel: setup.toLevel, GroupId: numericId(setup.group),
        TargetGroupId: numericId(setup.toGroup), Section: setup.fromSection, TargetSection: setup.toSection,
      }) });
      setReportRows(unwrap(response.data, ["report", "Report", "promotions", "Promotions", "records", "Records"]).map(normalizeHistory));
      setReportLoaded(true);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); setReportRows([]); setReportLoaded(true); }
    finally { setReportLoading(false); }
  };

  const setHistoryFilter = (name, value) => setHistoryFilters((current) => ({ ...current, [name]: value }));
  const previewStudents = unwrap(previewData, ["students", "Students", "eligibleStudents", "EligibleStudents"]);

  return (
    <DashboardLayout title="Promotion Management" subtitle="Review eligibility, promote students, and manage promotion history." breadcrumb={["Academics", "Promotion"]}>
      <div className="promotion-page">
        <nav className="promotion-tabs" aria-label="Promotion sections">
          {[['promotion', 'Promotion'], ['history', 'Promotion History'], ['report', 'Report']].map(([value, label]) => <button key={value} className={activeTab === value ? "is-active" : ""} onClick={() => { setActiveTab(value); setError(""); }}>{label}</button>)}
        </nav>

        {masterError ? <div className="promotion-error" role="alert">{masterError} <button onClick={loadMasters}>Retry master data</button></div> : null}
        {error ? <div className="promotion-error" role="alert">{error}</div> : null}

        {activeTab === "promotion" ? <>
          <section className="cms-card promotion-card">
            <div className="cms-card-head"><div><h2>1. Promotion Setup</h2><p>Choose the current cohort and its destination using live master data.</p></div><button className="cms-btn cms-btn-ghost" onClick={loadMasters} disabled={masterLoading}>{masterLoading ? "Loading..." : "Refresh Masters"}</button></div>
            <div className="cms-card-body promotion-setup-grid">
              <div className="promotion-flow-panel"><h3>Current / Source</h3><div className="promotion-field-grid">{sourceFields.map((field) => <Field key={field.name} field={{ ...field, disabled: masterLoading }} value={setup[field.name]} error={fieldErrors[field.name]} onChange={updateSetup} />)}</div></div>
              <div className="promotion-arrow" aria-hidden="true">→</div>
              <div className="promotion-flow-panel"><h3>Destination</h3><div className="promotion-field-grid">{targetFields.map((field) => <Field key={field.name} field={{ ...field, disabled: masterLoading }} value={setup[field.name]} error={fieldErrors[field.name]} onChange={updateSetup} />)}</div></div>
            </div>
            <div className="promotion-actions"><button className="cms-btn cms-btn-primary" onClick={loadStudents} disabled={masterLoading || studentsLoading}>{studentsLoading ? "Loading..." : "Load Students"}</button><button className="cms-btn cms-btn-ghost" onClick={() => { setSetup(EMPTY_SETUP); setStudents([]); setStudentsLoaded(false); setSelectedIds([]); setSearch(""); setError(""); }}>Clear</button></div>
          </section>

          <section className="cms-card promotion-card">
            <div className="cms-card-head promotion-table-head"><div><h2>2. Student Eligibility</h2><p>{studentsLoaded ? `${students.length} student${students.length === 1 ? "" : "s"} returned by the Promotion API.` : "Load a source cohort to review eligibility."}</p></div><span className="cms-badge cms-badge-info">Selected Students: {selectedStudents.length}</span></div>
            <div className="promotion-table-controls"><input aria-label="Search students" placeholder="Search student name, admission number, or ID" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadStudents()} /><button className="cms-btn cms-btn-ghost" onClick={loadStudents} disabled={studentsLoading}>Search</button><select aria-label="Eligibility status" value={eligibilityFilter} onChange={(event) => setEligibilityFilter(event.target.value)}><option value="">All statuses</option>{unique(students.map((student) => student.eligibility)).map((status) => <option key={status}>{status}</option>)}</select><button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds(eligibleStudents.map((student) => student.id))} disabled={!eligibleStudents.length}>Select All Eligible</button><button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds([])}>Clear</button></div>
            {studentsLoading ? <div className="promotion-empty" role="status">Loading eligible students...</div> : studentsLoaded ? <div className="cms-table-wrap"><table className="cms-table promotion-table"><thead><tr><th>Select</th><th>Admission No.</th><th>Student Name</th><th>Academic Year</th><th>Board</th><th>Level</th><th>Group</th><th>Section</th><th>Medium</th><th>Eligibility</th><th>Reason</th><th>Action</th></tr></thead><tbody>{students.length ? students.map((student) => <tr key={student.id}><td><input type="checkbox" checked={selectedIds.includes(student.id)} disabled={!isEligible(student)} onChange={() => setSelectedIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /></td><td className="cms-strong">{student.admissionNo}</td><td>{student.name}</td><td>{student.academicYear}</td><td>{student.board}</td><td>{student.level}</td><td>{student.group}</td><td>{student.section}</td><td>{student.medium}</td><td><span className={`promotion-status ${isEligible(student) ? "eligible" : "not-eligible"}`}>{student.eligibility}</span></td><td>{student.reason || "-"}</td><td><button className="cms-action-link" disabled={!isEligible(student)} onClick={() => setIndividualStudent(student)}>Promote</button></td></tr>) : <tr><td colSpan="12" className="promotion-empty">No eligible students found for the selected criteria.</td></tr>}</tbody></table></div> : <div className="promotion-empty">Select the source details, then load students.</div>}
          </section>

          {studentsLoaded ? <section className="promotion-summary"><div><span>Total Students</span><strong>{students.length}</strong></div><div><span>Eligible</span><strong>{summary.eligible}</strong></div><div><span>Not Eligible</span><strong>{summary.ineligible}</strong></div><div><span>Selected</span><strong>{selectedStudents.length}</strong></div></section> : null}
          <div className="promotion-final-actions"><button className="cms-btn cms-btn-ghost" onClick={() => allocate("group")} disabled={!selectedStudents.length || submitting}>Allocate Group</button><button className="cms-btn cms-btn-ghost" onClick={() => allocate("section")} disabled={!selectedStudents.length || submitting}>Allocate Section</button><button className="cms-btn cms-btn-primary" onClick={openPreview} disabled={!selectedStudents.length || previewLoading || submitting}>{previewLoading ? "Preparing Preview..." : "Preview Promotion"}</button></div>
        </> : null}

        {activeTab === "history" ? <section className="cms-card promotion-card"><div className="cms-card-head"><div><h2>Promotion History</h2><p>Search completed promotion activity and roll back supported records.</p></div></div><div className="cms-card-body promotion-history-filters">{[
          { name: "academicYearId", label: "Source Year", type: "select", options: masters.years }, { name: "targetAcademicYearId", label: "Target Year", type: "select", options: masters.years },
          { name: "academicLevel", label: "Source Level", type: "select", options: masters.levels }, { name: "targetAcademicLevel", label: "Target Level", type: "select", options: masters.levels },
          { name: "groupId", label: "Source Group", type: "select", options: masters.groups }, { name: "section", label: "Source Section", type: "select", options: masters.sections },
          { name: "studentId", label: "Student ID", type: "number" }, { name: "search", label: "Search" }, { name: "promotionStatus", label: "Promotion Status" },
          { name: "fromDate", label: "From Date", type: "date" }, { name: "toDate", label: "To Date", type: "date" },
        ].map((field) => <Field key={field.name} field={field} value={historyFilters[field.name]} onChange={setHistoryFilter} />)}</div><div className="promotion-actions"><button className="cms-btn cms-btn-ghost" onClick={() => { setHistoryFilters(EMPTY_HISTORY_FILTERS); setHistoryLoaded(false); }}>Clear Filters</button><button className="cms-btn cms-btn-primary" onClick={fetchHistory} disabled={historyLoading}>{historyLoading ? "Loading..." : "Load History"}</button></div>{historyLoading ? <div className="promotion-empty">Loading promotion history...</div> : historyLoaded ? <HistoryTable rows={history} onRollback={setRollbackRecord} /> : null}</section> : null}

        {activeTab === "report" ? <section className="cms-card promotion-card"><div className="cms-card-head"><div><h2>Promotion Report</h2><p>The report uses the Source and Target selections from Promotion Setup.</p></div><button className="cms-btn cms-btn-primary" onClick={fetchReport} disabled={reportLoading}>{reportLoading ? "Loading..." : "Load Report"}</button></div>{reportLoading ? <div className="promotion-empty">Loading promotion report...</div> : reportLoaded ? <HistoryTable rows={reportRows} /> : <div className="promotion-empty">Load the report to view backend promotion records.</div>}</section> : null}
      </div>

      {previewData ? <Modal title="Promotion Preview" onClose={() => setPreviewData(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setPreviewData(null)}>Back</button><button className="cms-btn cms-btn-primary" onClick={() => setConfirmOpen(true)}>Continue</button></>}><div className="promotion-preview-details"><div><span>From</span><strong>{[masters.years.find((item) => item.value === setup.fromYear)?.label, masters.boards.find((item) => item.value === setup.board)?.label, setup.fromLevel, masters.groups.find((item) => item.value === setup.group)?.label, setup.fromSection, setup.fromMedium].filter(Boolean).join(" • ")}</strong></div><div><span>To</span><strong>{[masters.years.find((item) => item.value === setup.toYear)?.label, masters.boards.find((item) => item.value === setup.toBoard)?.label, setup.toLevel, masters.groups.find((item) => item.value === setup.toGroup)?.label, setup.toSection, setup.toMedium].filter(Boolean).join(" • ")}</strong></div><div><span>Selected Students</span><strong>{selectedStudents.length}</strong></div><div><span>Preview Students</span><strong>{previewStudents.length || read(previewData, "studentCount", "StudentCount", "eligibleCount", "EligibleCount") || selectedStudents.length}</strong></div></div>{previewStudents.length ? <ul className="promotion-preview-list">{previewStudents.map((student, index) => <li key={read(student, "studentId", "StudentId", "id", "Id") ?? index}>{read(student, "studentName", "StudentName", "name", "Name") || read(student, "admissionNumber", "AdmissionNumber") || `Student ${index + 1}`}{read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason") ? ` — ${read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason")}` : ""}</li>)}</ul> : <p className="promotion-preview-copy">The backend preview completed successfully for the selected students.</p>}</Modal> : null}
      {confirmOpen ? <Modal title="Confirm Promotion" size="sm" onClose={() => setConfirmOpen(false)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={confirmPromotion} disabled={submitting}>{submitting ? "Promoting..." : "Confirm Promotion"}</button></>}><div className="promotion-confirm-copy"><p>You are about to promote:</p><strong>{selectedStudents.length} student{selectedStudents.length === 1 ? "" : "s"}</strong><p>Promotion is submitted only after this confirmation.</p></div></Modal> : null}
      {individualStudent ? <Modal title="Promote Student" size="sm" onClose={() => setIndividualStudent(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setIndividualStudent(null)} disabled={submitting}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={promoteIndividual} disabled={submitting}>{submitting ? "Promoting..." : "Promote Student"}</button></>}><div className="promotion-confirm-copy"><p>Promote this student to the selected Target configuration?</p><strong>{individualStudent.name}</strong><p>{individualStudent.admissionNo}</p></div></Modal> : null}
      {rollbackRecord ? <Modal title="Rollback Promotion" size="sm" onClose={() => setRollbackRecord(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRollbackRecord(null)} disabled={rollbackLoading}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={rollback} disabled={rollbackLoading || !rollbackReason.trim()}>{rollbackLoading ? "Rolling Back..." : "Rollback"}</button></>}><div className="cms-field"><label htmlFor="rollback-reason">Rollback reason <span className="req">*</span></label><textarea id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="Enter the reason for rollback" /></div></Modal> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function HistoryTable({ rows, onRollback }) {
  return <div className="cms-table-wrap"><table className="cms-table promotion-table"><thead><tr><th>Promotion ID</th><th>Student</th><th>Admission No.</th><th>Source</th><th>Target</th><th>Date</th><th>Status</th><th>Promoted By</th>{onRollback ? <th>Action</th> : null}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id ?? index}><td className="cms-strong">{row.id ?? "-"}</td><td>{row.student}</td><td>{row.admissionNo}</td><td>{[row.sourceYear, row.sourceLevel, row.sourceGroup, row.sourceSection].filter((value) => value !== "-").join(" • ") || "-"}</td><td>{[row.targetYear, row.targetLevel, row.targetGroup, row.targetSection].filter((value) => value !== "-").join(" • ") || "-"}</td><td>{row.date}</td><td><span className="promotion-status eligible">{row.status}</span></td><td>{row.promotedBy}</td>{onRollback ? <td><button className="cms-action-link danger" disabled={!row.canRollback} onClick={() => onRollback(row)}>Rollback</button></td> : null}</tr>) : <tr><td colSpan={onRollback ? 9 : 8} className="promotion-empty">No promotion history available.</td></tr>}</tbody></table></div>;
}
