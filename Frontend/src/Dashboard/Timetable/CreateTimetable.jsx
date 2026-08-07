import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiBookOpen,
  FiUsers,
  FiHome,
  FiGrid,
  FiSave,
  FiRotateCcw,
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiLayers,
  FiFileText,
  FiAward,
  FiCopy,
  FiUpload,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { apiEndpoints } from "../../services/apiEndpoints";
import "./CreateTimetable.css";

const ACADEMIC_YEARS = ["2025-2026", "2026-2027"];
const ACADEMIC_LEVELS = ["Intermediate First Year", "Intermediate Second Year"];
const GROUPS = ["MPC", "BiPC", "MEC", "CEC", "HEC"];
const SECTIONS = ["A", "B", "C", "D"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
  "Period 1",
  "Period 2",
  "Period 3",
  "Period 4",
  "Period 5",
  "Period 6",
  "Period 7",
  "Period 8",
];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English", "Sanskrit"];
const FACULTY = ["Venkatesh Sharma", "Ravi Kumar", "Lakshmi Devi"];
const ROOMS = ["Room 101", "Room 102", "Lab 1", "Lab 2"];

const INITIAL_FORM = {
  board: "",
  boardId: "",
  academicYear: "",
  academicLevel: "",
  group: "",
  section: "",
  day: "",
  period: "",
  subject: "",
  faculty: "",
  room: "",
  startTime: "",
  endTime: "",
  remarks: "",
  status: true,
};

const FIELD_LABELS = {
  board: "Board",
  academicYear: "Academic Year",
  academicLevel: "Academic Level",
  group: "Group",
  section: "Section",
  day: "Day",
  period: "Period",
  subject: "Subject",
  faculty: "Faculty",
  room: "Room",
  startTime: "Start Time",
  endTime: "End Time",
};

function Select({ id, label, icon, value, options, error, onChange }) {
  return (
    <div className="ct-field">
      <label className="ct-label" htmlFor={id}>
        {icon}
        {label} <span className="ct-req">*</span>
      </label>
      <select
        id={id}
        className={`ct-select${error ? " ct-invalid" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
            {typeof opt === "string" ? opt : opt.label}
          </option>
        ))}
      </select>
      {error ? <span className="ct-error">{error}</span> : null}
    </div>
  );
}

export default function CreateTimetable() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [boardOptions, setBoardOptions] = useState([]);

  const loadRows = async (request = () => api.get(apiEndpoints.timetable.list)) => {
    try {
      setLoading(true);
      setError("");
      const response = await request();
      const payload = response.data?.data ?? response.data;
      const records = Array.isArray(payload) ? payload : payload?.items ?? payload?.content ?? [];
      setRows(records.map(normalizeTimetable));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get(apiEndpoints.boards.list, { headers: { Accept: "application/json" } });
      const payload = response.data?.data ?? response.data;
      const records = Array.isArray(payload) ? payload : payload?.items ?? [];
      setBoardOptions(records.filter((item) => item.status !== false && item.isActive !== false).map((item) => ({ value: String(item.boardId ?? item.id), label: item.boardName ?? item.name ?? item.boardCode })).filter((item) => item.value && item.label));
    } catch (boardError) {
      setError(getApiErrorMessage(boardError));
    }
  };

  useEffect(() => { loadRows(); fetchBoards(); }, []);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    Object.keys(FIELD_LABELS).forEach((key) => {
      if (!form[key]) next[key] = `${FIELD_LABELS[key]} is required.`;
    });
    if (!next.startTime && !next.endTime && form.startTime >= form.endTime) {
      next.endTime = "End time must be later than start time.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setError("");
      const payload = { ...form, boardId: Number(form.boardId) };
      if (editingId) await api.put(apiEndpoints.timetable.update(editingId), payload);
      else await api.post(apiEndpoints.timetable.create, payload);
      setForm(INITIAL_FORM);
      setEditingId(null);
      await loadRows();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  const handleEdit = async (row) => {
    try {
      const response = await api.get(apiEndpoints.timetable.detail(row.id));
      setForm({ ...INITIAL_FORM, ...normalizeTimetable(response.data?.data ?? response.data) });
      setEditingId(row.id);
    } catch (editError) {
      setError(getApiErrorMessage(editError));
    }
  };
  const setBoard = (boardId) => {
    const selected = boardOptions.find((item) => item.value === boardId);
    setForm((prev) => ({ ...prev, boardId, board: selected?.label || "" }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this timetable entry?")) return;
    try { await api.delete(apiEndpoints.timetable.remove(id)); await loadRows(); } catch (deleteError) { setError(getApiErrorMessage(deleteError)); }
  };
  const promptLoad = (label, request) => {
    const id = window.prompt(`Enter ${label} ID:`);
    if (id) loadRows(() => request(id));
  };
  const publishEntry = async (id) => { try { await api.patch(apiEndpoints.timetable.publish(id)); await loadRows(); } catch (publishError) { setError(getApiErrorMessage(publishError)); } };
  const publishSection = async (sectionId) => { if (!sectionId) return; try { await api.patch(apiEndpoints.timetable.publishSection(sectionId)); await loadRows(); } catch (publishError) { setError(getApiErrorMessage(publishError)); } };
  const copyEntry = async (id) => { try { await api.post(apiEndpoints.timetable.copy, { sourceTimetableId: id }); await loadRows(); } catch (copyError) { setError(getApiErrorMessage(copyError)); } };

  return (
    <div className="ct-root">
      <header className="ct-header">
        <div>
          <h1 className="ct-title">Create Timetable</h1>
          <p className="ct-subtitle">Manage timetable for Intermediate College.</p>
        </div>
        <div className="ct-header-actions">
          <button type="button" className="ct-btn" onClick={() => loadRows()}><FiRotateCcw size={16} /> Refresh</button>
          <button type="button" className="ct-btn" onClick={() => promptLoad("Faculty", (id) => api.get(apiEndpoints.timetable.byFaculty(id)))}>Faculty View</button>
          <button type="button" className="ct-btn" onClick={() => promptLoad("Student", (id) => api.get(apiEndpoints.timetable.byStudent(id)))}>Student View</button>
          <button type="button" className="ct-btn" onClick={() => promptLoad("Section", (id) => api.get(apiEndpoints.timetable.bySection(id)))}>Section View</button>
          <button type="button" className="ct-btn ct-btn-primary" onClick={handleSave}>
            <FiSave size={16} /> Save Timetable
          </button>
          <button type="button" className="ct-btn" onClick={handleReset}>
            <FiRotateCcw size={16} /> Reset
          </button>
          <button type="button" className="ct-btn ct-btn-ghost" onClick={() => window.history.back()}>
            <FiArrowLeft size={16} /> Back
          </button>
        </div>
      </header>
      {error ? <div className="ct-error" role="alert">{error}</div> : null}

      <section className="ct-card">
        <div className="ct-card-head">
          <FiCalendar size={18} />
          <h2 className="ct-card-title">Timetable Details</h2>
        </div>

        <div className="ct-form-grid">
          <Select
            id="ct-board"
            label="Board"
            icon={<FiAward size={13} />}
            value={form.boardId}
            options={boardOptions}
            error={errors.board}
            onChange={setBoard}
          />
          <Select
            id="ct-year"
            label="Academic Year"
            icon={<FiCalendar size={13} />}
            value={form.academicYear}
            options={ACADEMIC_YEARS}
            error={errors.academicYear}
            onChange={(v) => setField("academicYear", v)}
          />
          <Select
            id="ct-level"
            label="Academic Level"
            icon={<FiLayers size={13} />}
            value={form.academicLevel}
            options={ACADEMIC_LEVELS}
            error={errors.academicLevel}
            onChange={(v) => setField("academicLevel", v)}
          />
          <Select
            id="ct-group"
            label="Group"
            icon={<FiGrid size={13} />}
            value={form.group}
            options={GROUPS}
            error={errors.group}
            onChange={(v) => setField("group", v)}
          />
          <Select
            id="ct-section"
            label="Section"
            icon={<FiGrid size={13} />}
            value={form.section}
            options={SECTIONS}
            error={errors.section}
            onChange={(v) => setField("section", v)}
          />
          <Select
            id="ct-day"
            label="Day"
            icon={<FiCalendar size={13} />}
            value={form.day}
            options={DAYS}
            error={errors.day}
            onChange={(v) => setField("day", v)}
          />
          <Select
            id="ct-period"
            label="Period"
            icon={<FiClock size={13} />}
            value={form.period}
            options={PERIODS}
            error={errors.period}
            onChange={(v) => setField("period", v)}
          />
          <Select
            id="ct-subject"
            label="Subject"
            icon={<FiBookOpen size={13} />}
            value={form.subject}
            options={SUBJECTS}
            error={errors.subject}
            onChange={(v) => setField("subject", v)}
          />
          <Select
            id="ct-faculty"
            label="Faculty"
            icon={<FiUsers size={13} />}
            value={form.faculty}
            options={FACULTY}
            error={errors.faculty}
            onChange={(v) => setField("faculty", v)}
          />
          <Select
            id="ct-room"
            label="Room"
            icon={<FiHome size={13} />}
            value={form.room}
            options={ROOMS}
            error={errors.room}
            onChange={(v) => setField("room", v)}
          />

          <div className="ct-field">
            <label className="ct-label" htmlFor="ct-start">
              <FiClock size={13} /> Start Time <span className="ct-req">*</span>
            </label>
            <input
              id="ct-start"
              type="time"
              className={`ct-input${errors.startTime ? " ct-invalid" : ""}`}
              value={form.startTime}
              onChange={(e) => setField("startTime", e.target.value)}
            />
            {errors.startTime ? <span className="ct-error">{errors.startTime}</span> : null}
          </div>

          <div className="ct-field">
            <label className="ct-label" htmlFor="ct-end">
              <FiClock size={13} /> End Time <span className="ct-req">*</span>
            </label>
            <input
              id="ct-end"
              type="time"
              className={`ct-input${errors.endTime ? " ct-invalid" : ""}`}
              value={form.endTime}
              onChange={(e) => setField("endTime", e.target.value)}
            />
            {errors.endTime ? <span className="ct-error">{errors.endTime}</span> : null}
          </div>

          <div className="ct-field ct-field-full">
            <label className="ct-label" htmlFor="ct-remarks">
              <FiFileText size={13} /> Remarks
            </label>
            <textarea
              id="ct-remarks"
              className="ct-textarea"
              placeholder="Optional notes about this period (lab session, combined class, etc.)"
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
            />
          </div>

          <div className="ct-field">
            <span className="ct-label">
              <FiCheckCircle size={13} /> Status
            </span>
            <div className="ct-toggle-row">
              <button
                type="button"
                role="switch"
                aria-checked={form.status}
                aria-label="Toggle status"
                className={`ct-switch${form.status ? " ct-on" : ""}`}
                onClick={() => setField("status", !form.status)}
              />
              <span className="ct-switch-label">{form.status ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ct-card">
        <div className="ct-card-head">
          <FiGrid size={18} />
          <h2 className="ct-card-title">Timetable Preview</h2>
        </div>

        <div className="ct-table-wrap">
          <table className="ct-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Period</th>
                <th>Subject</th>
                <th>Faculty</th>
                <th>Room</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="ct-empty">
                    {loading ? "Loading timetable entries..." : "No timetable entries added yet."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="ct-cell-strong">{row.day}</td>
                    <td>{row.period}</td>
                    <td className="ct-cell-strong">{row.subject}</td>
                    <td>{row.faculty}</td>
                    <td>{row.room}</td>
                    <td>{row.startTime}</td>
                    <td>{row.endTime}</td>
                    <td>
                      <span className={`ct-badge ${row.status ? "ct-badge-green" : "ct-badge-red"}`}>
                        <FiCheckCircle size={12} />
                        {row.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="ct-row-actions">
                        <button
                          type="button"
                          className="ct-btn ct-btn-icon"
                          onClick={() => handleEdit(row)}
                        >
                          <FiEdit size={14} /> Edit
                        </button>
                        <button type="button" className="ct-btn ct-btn-icon" onClick={() => copyEntry(row.id)}><FiCopy size={14} /> Copy</button>
                        <button type="button" className="ct-btn ct-btn-icon" onClick={() => publishEntry(row.id)}><FiUpload size={14} /> Publish</button>
                        <button type="button" className="ct-btn ct-btn-icon" onClick={() => publishSection(row.sectionId)} disabled={!row.sectionId}><FiUpload size={14} /> Publish Section</button>
                        <button
                          type="button"
                          className="ct-btn ct-btn-icon ct-btn-danger"
                          onClick={() => handleDelete(row.id)}
                        >
                          <FiTrash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ct-footer-actions">
        <button type="button" className="ct-btn ct-btn-primary" onClick={handleSave}>
          <FiSave size={16} /> Save Timetable
        </button>
        <button type="button" className="ct-btn" onClick={handleReset}>
          <FiRotateCcw size={16} /> Reset
        </button>
        <button type="button" className="ct-btn ct-btn-ghost" onClick={() => window.history.back()}>
          <FiArrowLeft size={16} /> Cancel
        </button>
      </div>
    </div>
  );
}

function normalizeTimetable(item = {}) {
  return {
    ...item,
    id: item.id ?? item.timetableId,
    boardId: item.boardId ?? "",
    board: item.board ?? item.boardName ?? "",
    academicYear: item.academicYear ?? item.academicYearName ?? "",
    academicLevel: item.academicLevel ?? item.academicLevelName ?? "",
    group: item.group ?? item.groupName ?? "",
    section: item.section ?? item.sectionName ?? "",
    subject: item.subject ?? item.subjectName ?? "",
    faculty: item.faculty ?? item.facultyName ?? "",
    day: item.day ?? item.dayOfWeek ?? "",
    period: item.period ?? item.periodName ?? "",
    room: item.room ?? item.roomName ?? "",
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    status: item.status ?? item.isActive ?? true,
  };
}
