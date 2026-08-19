import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, Download, Edit3, Eye, FileClock, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./BoardManagementPage.css";

const emptyForm = { name: "", code: "", description: "", country: "", state: "", pattern: "", structure: "", internal: false, practical: false, boardExams: false, passPercentage: "", grading: "", rank: false, status: "Active", rowVersion: null };

const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  return [value?.data, value?.Data, value?.items, value?.Items, value?.result, value?.Result, value?.$values, value?.data?.items, value?.data?.Items, value?.data?.$values].find(Array.isArray) || [];
};
const pick = (source, keys, fallback = "") => {
  for (const key of keys) if (source?.[key] !== undefined && source[key] !== null) return source[key];
  return fallback;
};
const normalizeOptions = (items, idKeys, nameKeys) => unwrapList(items).map((item) => ({ id: pick(item, idKeys, null), name: pick(item, nameKeys, "") })).filter((item) => item.id !== null && item.name);
const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
const mapRow = (row = {}) => {
  const levelNames = pick(row, ["academicLevelNames", "AcademicLevelNames"], []);
  const levelIds = pick(row, ["academicLevelIds", "AcademicLevelIds"], []);
  const created = pick(row, ["createdDate", "CreatedDate", "created", "Created"], "");
  const updated = pick(row, ["updatedDate", "UpdatedDate", "modifiedDate", "ModifiedDate", "lastUpdated", "updatedAt"], created);
  const rawStatus = pick(row, ["status", "Status"], false);
  return {
    id: pick(row, ["boardId", "BoardId", "id", "Id"], null), name: pick(row, ["boardName", "BoardName", "name", "Name"], ""), code: pick(row, ["boardCode", "BoardCode", "code", "Code"], ""), description: pick(row, ["description", "Description"], ""),
    countryId: pick(row, ["countryId", "CountryId"], null), country: pick(row, ["countryName", "CountryName", "country", "Country"], ""), stateId: pick(row, ["stateId", "StateId"], null), state: pick(row, ["stateName", "StateName", "state", "State"], ""),
    patternId: pick(row, ["academicPatternId", "AcademicPatternId"], null), pattern: pick(row, ["academicPatternName", "AcademicPatternName", "pattern", "Pattern"], ""), levelIds: Array.isArray(levelIds) ? levelIds : [], levels: Array.isArray(levelNames) ? levelNames : levelNames ? [levelNames] : [],
    internal: Boolean(pick(row, ["internalAssessment", "InternalAssessment"], false)), practical: Boolean(pick(row, ["practicalExams", "PracticalExams"], false)), boardExams: Boolean(pick(row, ["boardExams", "BoardExams"], false)), passPercentage: pick(row, ["passPercentage", "PassPercentage"], ""),
    gradingId: pick(row, ["gradingSystemId", "GradingSystemId"], null), grading: pick(row, ["gradingSystemName", "GradingSystemName"], ""), rank: Boolean(pick(row, ["rankCalculation", "RankCalculation"], false)), status: rawStatus === true || String(rawStatus).toLowerCase() === "active" ? "Active" : "Inactive", created, updated, rowVersion: pick(row, ["rowVersion", "RowVersion"], null),
  };
};

let formDataPromise;
const loadFormOptions = async () => {
  if (!formDataPromise) {
    formDataPromise = apiClient.get(apiEndpoints.boards.formData).then(({ data }) => data?.data || data?.Data || data).catch(async (error) => {
      if (error.response?.status !== 404) throw error;
      const [countries, patterns, levels, gradings] = await Promise.all([
        apiClient.get("/api/v1/boards/countries"), apiClient.get("/api/v1/boards/academic-patterns"), apiClient.get(apiEndpoints.boards.academicLevels), apiClient.get(apiEndpoints.boards.gradingSystems),
      ]);
      return { countries: countries.data, academicPatterns: patterns.data, academicLevels: levels.data, gradingSystems: gradings.data };
    }).catch((error) => { formDataPromise = undefined; throw error; });
  }
  return formDataPromise;
};

const Field = ({ label, required, error, full, children }) => <label className={`board-field${full ? " board-field--full" : ""}${error ? " has-error" : ""}`}><span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>{children}{error ? <small>{error}</small> : null}</label>;
const Detail = ({ label, value, full = false }) => <div className={`board-detail${full ? " board-detail--full" : ""}`}><span>{label}</span><strong>{value || "—"}</strong></div>;
const Toggle = ({ label, checked, onChange }) => <label className="board-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /><b>{label}</b></label>;

const legacyOptionMaps = { countries: new Map(), states: new Map(), patterns: new Map(), levels: new Map(), gradings: new Map() };
const legacyNames = (items, key) => items.map((item) => { legacyOptionMaps[key].set(item.name, item.id); return item.name; });
const saveLegacyBoard = async (values, id) => {
  const payload = {
    boardName: values.name,
    boardCode: values.code,
    description: values.description || "",
    countryId: Number(legacyOptionMaps.countries.get(values.country) || 0),
    stateId: Number(legacyOptionMaps.states.get(values.state) || 0),
    academicPatternId: Number(legacyOptionMaps.patterns.get(values.pattern) || 0),
    academicLevelIds: [Number(legacyOptionMaps.levels.get(values.structure) || 0)].filter(Boolean),
    internalAssessment: Boolean(values.internal), practicalExams: Boolean(values.practical), boardExams: Boolean(values.boardExams),
    passPercentage: Number(values.passPercentage), gradingSystemId: Number(legacyOptionMaps.gradings.get(values.grading) || 0), rankCalculation: Boolean(values.rank), status: values.status === "Active" || values.status === true,
  };
  if (id && values.rowVersion) payload.rowVersion = values.rowVersion;
  return id ? apiClient.put(apiEndpoints.boards.getById(id), payload) : apiClient.post(apiEndpoints.boards.create, payload);
};

// Retained for the existing generic /boards/add and /boards/:id/edit routes.
export const pageConfig = {
  title: "Board Management", subtitle: "Manage education boards, levels, streams and board settings for the institution.", breadcrumb: ["Academics"], addLabel: "Add Board",
  rows: [], columns: [{ key: "name", label: "Board Name" }, { key: "code", label: "Board Code" }, { key: "state", label: "State" }, { key: "status", label: "Status", badge: true }],
  fields: [
    { name: "name", label: "Board Name", required: true }, { name: "code", label: "Board Code", required: true }, { name: "description", label: "Description", type: "textarea", full: true },
    { name: "country", label: "Country", type: "select", required: true, loadOptions: () => loadFormOptions(), getOptions: (data) => legacyNames(normalizeOptions((data?.data || data)?.countries, ["id", "Id", "countryId", "CountryId"], ["name", "Name", "countryName", "CountryName"]), "countries") },
    { name: "state", label: "State", type: "select", required: true, dependsOn: ["country"], loadOptions: async (values) => apiClient.get(apiEndpoints.boards.states(legacyOptionMaps.countries.get(values.country))), getOptions: ({ data }) => legacyNames(normalizeOptions(data, ["id", "Id", "stateId", "StateId"], ["name", "Name", "stateName", "StateName"]), "states") },
    { name: "pattern", label: "Academic Pattern", type: "select", required: true, loadOptions: () => loadFormOptions(), getOptions: (data) => legacyNames(normalizeOptions((data?.data || data)?.academicPatterns, ["id", "Id", "academicPatternId", "AcademicPatternId"], ["name", "Name", "patternName", "PatternName"]), "patterns") },
    { name: "structure", label: "Academic Levels", type: "select", required: true, loadOptions: () => loadFormOptions(), getOptions: (data) => legacyNames(normalizeOptions((data?.data || data)?.academicLevels, ["id", "Id", "academicLevelId", "AcademicLevelId"], ["name", "Name", "levelName", "LevelName"]), "levels") },
    { name: "passPercentage", label: "Pass Percentage", type: "number", required: true }, { name: "grading", label: "Grading System", type: "select", required: true, loadOptions: () => loadFormOptions(), getOptions: (data) => legacyNames(normalizeOptions((data?.data || data)?.gradingSystems, ["id", "Id", "gradingSystemId", "GradingSystemId"], ["name", "Name", "gradingSystemName", "GradingSystemName"]), "gradings") },
    { name: "internal", label: "Internal Assessment", type: "checkbox" }, { name: "practical", label: "Practical Exams", type: "checkbox" }, { name: "boardExams", label: "Board Exams", type: "checkbox" }, { name: "rank", label: "Rank Calculation", type: "checkbox" }, { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ],
  api: { fetchRows: async () => unwrapList((await apiClient.get(apiEndpoints.boards.getAll)).data).map(mapRow), fetchRow: async (id) => mapRow((await apiClient.get(apiEndpoints.boards.getById(id))).data), deleteRow: (id) => apiClient.delete(apiEndpoints.boards.delete(id)), saveRow: saveLegacyBoard },
};

export default function BoardManagementPage() {
  const [rows, setRows] = useState([]), [summary, setSummary] = useState(null), [options, setOptions] = useState({ countries: [], patterns: [], levels: [], gradings: [] }), [states, setStates] = useState([]);
  const [form, setForm] = useState(emptyForm), [errors, setErrors] = useState({}), [selected, setSelected] = useState(null), [editingId, setEditingId] = useState(null), [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState(""), [statusFilter, setStatusFilter] = useState(""), [stateFilter, setStateFilter] = useState("");
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [saving, setSaving] = useState(false), [deletingBusy, setDeletingBusy] = useState(false);
  const [error, setError] = useState(""), [toast, setToast] = useState({ message: "", type: "success" });
  const formRef = useRef(null);
  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  const loadBoards = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiClient.get(apiEndpoints.boards.getAll); const next = unwrapList(response.data).map(mapRow); setRows(next); return next; }
    catch (requestError) { setRows([]); setError(getApiErrorMessage(requestError)); return []; }
    finally { setLoading(false); }
  }, []);
  const loadSummary = useCallback(async (currentRows = []) => {
    try { const response = await apiClient.get(apiEndpoints.boards.summary); const data = response.data?.data || response.data?.Data || response.data; setSummary({ total: Number(data?.totalBoards ?? data?.TotalBoards ?? currentRows.length), active: Number(data?.activeBoards ?? data?.ActiveBoards ?? currentRows.filter((row) => row.status === "Active").length) }); }
    catch { setSummary({ total: currentRows.length, active: currentRows.filter((row) => row.status === "Active").length }); }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const nextRows = await loadBoards(); if (!active) return; await loadSummary(nextRows);
      try {
        const data = await loadFormOptions(); if (!active) return;
        setOptions({
          countries: normalizeOptions(data?.countries, ["id", "Id", "countryId", "CountryId"], ["name", "Name", "countryName", "CountryName"]),
          patterns: normalizeOptions(data?.academicPatterns, ["id", "Id", "academicPatternId", "AcademicPatternId"], ["name", "Name", "patternName", "PatternName"]),
          levels: normalizeOptions(data?.academicLevels, ["id", "Id", "academicLevelId", "AcademicLevelId"], ["name", "Name", "levelName", "LevelName"]),
          gradings: normalizeOptions(data?.gradingSystems, ["id", "Id", "gradingSystemId", "GradingSystemId"], ["name", "Name", "gradingSystemName", "GradingSystemName"]),
        });
      } catch (requestError) { if (active) showToast(`Form options: ${getApiErrorMessage(requestError)}`, "error"); }
    })();
    return () => { active = false; };
  }, [loadBoards, loadSummary, showToast]);

  const loadStates = useCallback(async (countryId, preferredStateId = null) => {
    if (!countryId) { setStates([]); return; }
    try { const response = await apiClient.get(apiEndpoints.boards.states(countryId)); const next = normalizeOptions(response.data, ["id", "Id", "stateId", "StateId"], ["name", "Name", "stateName", "StateName"]); setStates(next); if (preferredStateId) setForm((current) => ({ ...current, state: String(preferredStateId) })); }
    catch (requestError) { setStates([]); showToast(getApiErrorMessage(requestError), "error"); }
  }, [showToast]);

  const stateNames = useMemo(() => [...new Set(rows.map((row) => row.state).filter(Boolean))].sort(), [rows]);
  const filteredRows = useMemo(() => { const query = search.trim().toLowerCase(); return rows.filter((row) => (!query || [row.name, row.code, row.state, row.country, row.pattern].some((value) => String(value || "").toLowerCase().includes(query))) && (!statusFilter || row.status === statusFilter) && (!stateFilter || row.state === stateFilter)); }, [rows, search, statusFilter, stateFilter]);
  const lastUpdated = useMemo(() => { const values = rows.map((row) => new Date(row.updated).getTime()).filter(Number.isFinite); return values.length ? formatDate(new Date(Math.max(...values))) : "Not available"; }, [rows]);
  const updateForm = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); };
  const handleCountryChange = (value) => { updateForm("country", value); updateForm("state", ""); loadStates(value); };
  const resetForm = () => { setEditingId(null); setForm(emptyForm); setStates([]); setErrors({}); };
  const openAdd = () => { resetForm(); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };

  const loadDetails = async (row, edit = false) => {
    setDetailLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.boards.getById(row.id)); const detail = mapRow(response.data?.data || response.data?.Data || response.data); setSelected(detail);
      if (edit) {
        setEditingId(detail.id); setForm({ name: detail.name, code: detail.code, description: detail.description, country: String(detail.countryId ?? ""), state: String(detail.stateId ?? ""), pattern: String(detail.patternId ?? ""), structure: String(detail.levelIds[0] ?? ""), internal: detail.internal, practical: detail.practical, boardExams: detail.boardExams, passPercentage: detail.passPercentage, grading: String(detail.gradingId ?? ""), rank: detail.rank, status: detail.status, rowVersion: detail.rowVersion });
        await loadStates(detail.countryId, detail.stateId); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (requestError) { showToast(getApiErrorMessage(requestError), "error"); }
    finally { setDetailLoading(false); }
  };

  const validate = () => {
    const next = {}; if (!form.name.trim()) next.name = "Board Name is required"; if (!form.code.trim()) next.code = "Board Code is required"; if (!form.country) next.country = "Country is required"; if (!form.state) next.state = "State is required"; if (!form.pattern) next.pattern = "Academic Pattern is required"; if (!form.structure) next.structure = "Academic Level is required"; if (!form.grading) next.grading = "Grading System is required";
    const pass = Number(form.passPercentage); if (form.passPercentage === "") next.passPercentage = "Pass Percentage is required"; else if (!Number.isFinite(pass) || pass < 0 || pass > 100) next.passPercentage = "Enter a value from 0 to 100"; setErrors(next); return !Object.keys(next).length;
  };
  const saveBoard = async (event) => {
    event.preventDefault(); if (!validate()) return;
    const payload = { boardName: form.name.trim(), boardCode: form.code.trim(), description: form.description.trim(), countryId: Number(form.country), stateId: Number(form.state), academicPatternId: Number(form.pattern), academicLevelIds: [Number(form.structure)], internalAssessment: form.internal, practicalExams: form.practical, boardExams: form.boardExams, passPercentage: Number(form.passPercentage), gradingSystemId: Number(form.grading), rankCalculation: form.rank, status: form.status === "Active" };
    if (editingId && form.rowVersion) payload.rowVersion = form.rowVersion;
    setSaving(true);
    try { if (editingId) await apiClient.put(apiEndpoints.boards.getById(editingId), payload); else await apiClient.post(apiEndpoints.boards.create, payload); const next = await loadBoards(); await loadSummary(next); showToast(editingId ? "Board updated successfully" : "Board created successfully"); resetForm(); }
    catch (requestError) { showToast(getApiErrorMessage(requestError), "error"); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleting) return; setDeletingBusy(true);
    try { await apiClient.delete(apiEndpoints.boards.delete(deleting.id)); const next = await loadBoards(); await loadSummary(next); if (selected?.id === deleting.id) setSelected(null); if (editingId === deleting.id) resetForm(); showToast("Board deleted successfully"); setDeleting(null); }
    catch (requestError) { showToast(getApiErrorMessage(requestError), "error"); }
    finally { setDeletingBusy(false); }
  };
  const resetFilters = () => { setSearch(""); setStatusFilter(""); setStateFilter(""); };
  const exportRows = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [["Board Name", "Board Code", "Country", "State", "Academic Pattern", "Status", "Last Updated"], ...filteredRows.map((row) => [row.name, row.code, row.country, row.state, row.pattern, row.status, formatDate(row.updated)])].map((line) => line.map(escape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "boards.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const summaryCards = [
    { label: "Total Boards", value: summary?.total ?? rows.length, icon: BookOpenCheck, tone: "blue" }, { label: "Active Boards", value: summary?.active ?? rows.filter((row) => row.status === "Active").length, icon: CheckCircle2, tone: "green" }, { label: "Streams Configured", value: "—", icon: Download, tone: "violet" }, { label: "Last Updated", value: lastUpdated, icon: FileClock, tone: "amber" },
  ];

  return <DashboardLayout title="Board Management" subtitle="Manage education boards, levels, streams and board settings for the institution." breadcrumb={["Academics"]}>
    <main className="board-page">
      <section className="board-summary-grid" aria-label="Board summary">{summaryCards.map(({ label, value, icon: Icon, tone }) => <article className={`board-summary-card board-summary-card--${tone}`} key={label}><span className="board-summary-icon"><Icon size={20} /></span><div><strong>{value}</strong><span>{label}</span></div></article>)}</section>
      <section className="board-panel">
        <div className="board-toolbar"><div className="board-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search board name, code, state..." aria-label="Search boards" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} aria-label="Filter by state"><option value="">All States</option>{stateNames.map((state) => <option key={state}>{state}</option>)}</select>
          <div className="board-toolbar-actions"><button type="button" className="cms-btn cms-btn-ghost" onClick={resetFilters}><RotateCcw size={16} /> Reset</button><button type="button" className="cms-btn cms-btn-ghost" onClick={exportRows} disabled={!filteredRows.length}><Download size={16} /> Export</button><button type="button" className="cms-btn cms-btn-primary" onClick={openAdd}><Plus size={17} /> Add Board</button></div>
        </div>
        {error ? <div className="board-error" role="alert">{error}<button type="button" onClick={loadBoards}>Retry</button></div> : null}
        <div className="board-table-wrap"><table className="board-table"><thead><tr><th>Board Name</th><th>Board Code</th><th>Country</th><th>State</th><th>Academic Pattern</th><th>Status</th><th>Last Updated</th><th className="board-actions-heading">Actions</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="8" className="board-empty">Loading boards...</td></tr> : null}{!loading && !filteredRows.length ? <tr><td colSpan="8" className="board-empty">No boards found.</td></tr> : null}
          {!loading && filteredRows.map((row) => <tr key={row.id} className={selected?.id === row.id ? "is-selected" : ""}><td><strong>{row.name || "—"}</strong></td><td><span className="board-code">{row.code || "—"}</span></td><td>{row.country || "—"}</td><td>{row.state || "—"}</td><td>{row.pattern || "—"}</td><td><span className={`board-status board-status--${row.status.toLowerCase()}`}>{row.status}</span></td><td>{formatDate(row.updated)}</td><td><div className="board-row-actions"><button type="button" title="View board" aria-label={`View ${row.name}`} onClick={() => loadDetails(row)}><Eye size={16} /></button><button type="button" title="Edit board" aria-label={`Edit ${row.name}`} onClick={() => loadDetails(row, true)}><Edit3 size={16} /></button><button type="button" className="is-danger" title="Delete board" aria-label={`Delete ${row.name}`} onClick={() => setDeleting(row)}><Trash2 size={16} /></button></div></td></tr>)}
        </tbody></table></div><div className="board-table-footer">Showing {filteredRows.length} of {rows.length} boards</div>
      </section>
      <div className="board-bottom-grid">
        <section className="board-panel board-details-card"><header><div><h2>Board Details</h2><p>Selected board configuration</p></div></header>
          {detailLoading ? <div className="board-empty">Loading details...</div> : !selected ? <div className="board-details-empty"><Eye size={24} /><p>Select View on a board to display its details.</p></div> : <div className="board-details-grid"><Detail label="Board Name" value={selected.name} /><Detail label="Board Code" value={selected.code} /><Detail label="Country" value={selected.country} /><Detail label="State" value={selected.state} /><Detail label="Academic Pattern" value={selected.pattern} /><div className="board-detail board-detail--full"><span>Academic Levels</span><div className="board-tags">{selected.levels.length ? selected.levels.map((level) => <em key={level}>{level}</em>) : "—"}</div></div><Detail label="Internal Assessment" value={selected.internal ? "Enabled" : "Disabled"} /><Detail label="Practical Exams" value={selected.practical ? "Enabled" : "Disabled"} /><Detail label="Board Exams" value={selected.boardExams ? "Enabled" : "Disabled"} /><Detail label="Pass Percentage" value={selected.passPercentage !== "" ? `${selected.passPercentage}%` : "—"} /><Detail label="Grading System" value={selected.grading} /><Detail label="Rank Calculation" value={selected.rank ? "Enabled" : "Disabled"} /><Detail label="Status" value={selected.status} /><Detail label="Created Date" value={formatDate(selected.created)} />{selected.description ? <Detail label="Description" value={selected.description} full /> : null}</div>}
        </section>
        <section className="board-panel board-form-panel" ref={formRef}><header><div><h2>{editingId ? "Edit Board" : "Add Board"}</h2><p>{editingId ? "Update the selected board configuration." : "Create a board and configure its academic settings."}</p></div></header>
          <form className="board-form-grid" onSubmit={saveBoard} noValidate>
            <Field label="Board Name" required error={errors.name}><input value={form.name} onChange={(e) => updateForm("name", e.target.value)} /></Field><Field label="Board Code" required error={errors.code}><input value={form.code} onChange={(e) => updateForm("code", e.target.value)} /></Field>
            <Field label="Country" required error={errors.country}><select value={form.country} onChange={(e) => handleCountryChange(e.target.value)}><option value="">Select Country</option>{options.countries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="State" required error={errors.state}><select value={form.state} disabled={!form.country} onChange={(e) => updateForm("state", e.target.value)}><option value="">Select State</option>{states.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Academic Pattern" required error={errors.pattern}><select value={form.pattern} onChange={(e) => updateForm("pattern", e.target.value)}><option value="">Select Academic Pattern</option>{options.patterns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Academic Levels" required error={errors.structure}><select value={form.structure} onChange={(e) => updateForm("structure", e.target.value)}><option value="">Select Academic Level</option>{options.levels.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Pass Percentage" required error={errors.passPercentage}><input type="number" min="0" max="100" step="0.01" value={form.passPercentage} onChange={(e) => updateForm("passPercentage", e.target.value)} /></Field><Field label="Grading System" required error={errors.grading}><select value={form.grading} onChange={(e) => updateForm("grading", e.target.value)}><option value="">Select Grading System</option>{options.gradings.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Status" required><select value={form.status} onChange={(e) => updateForm("status", e.target.value)}><option>Active</option><option>Inactive</option></select></Field>
            <div className="board-switches board-field--full"><Toggle label="Internal Assessment" checked={form.internal} onChange={(value) => updateForm("internal", value)} /><Toggle label="Practical Exams" checked={form.practical} onChange={(value) => updateForm("practical", value)} /><Toggle label="Board Exams" checked={form.boardExams} onChange={(value) => updateForm("boardExams", value)} /><Toggle label="Rank Calculation" checked={form.rank} onChange={(value) => updateForm("rank", value)} /></div>
            <Field label="Description" full><textarea rows="4" value={form.description} onChange={(e) => updateForm("description", e.target.value)} /></Field><div className="board-form-actions board-field--full"><button type="button" className="cms-btn cms-btn-ghost" onClick={resetForm}>Cancel</button><button type="submit" className="cms-btn cms-btn-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Board" : "Save Board"}</button></div>
          </form>
        </section>
      </div>
    </main>
    {deleting ? <ConfirmDialog title="Delete board" message={`Delete “${deleting.name}”? This action cannot be undone.`} loading={deletingBusy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} /> : null}<Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
  </DashboardLayout>;
}
