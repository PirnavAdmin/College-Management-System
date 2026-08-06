import { useState } from "react";
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
} from "react-icons/fi";
import "./CreateTimetable.css";

const BOARDS = ["BIEAP", "TSBIE", "CBSE"];
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

const INITIAL_ROWS = [
  {
    id: 1,
    day: "Monday",
    period: "Period 1",
    subject: "Mathematics",
    faculty: "Venkatesh Sharma",
    room: "Room 101",
    startTime: "09:00",
    endTime: "09:45",
    status: true,
  },
  {
    id: 2,
    day: "Monday",
    period: "Period 2",
    subject: "Physics",
    faculty: "Ravi Kumar",
    room: "Lab 1",
    startTime: "09:50",
    endTime: "10:35",
    status: true,
  },
  {
    id: 3,
    day: "Tuesday",
    period: "Period 3",
    subject: "Chemistry",
    faculty: "Lakshmi Devi",
    room: "Lab 2",
    startTime: "10:45",
    endTime: "11:30",
    status: false,
  },
  {
    id: 4,
    day: "Wednesday",
    period: "Period 4",
    subject: "English",
    faculty: "Venkatesh Sharma",
    room: "Room 102",
    startTime: "11:35",
    endTime: "12:20",
    status: true,
  },
];

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
          <option key={opt} value={opt}>
            {opt}
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
  const [rows, setRows] = useState(INITIAL_ROWS);

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

  const handleSave = () => {
    if (!validate()) return;
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        day: form.day,
        period: form.period,
        subject: form.subject,
        faculty: form.faculty,
        room: form.room,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
      },
    ]);
    setForm(INITIAL_FORM);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  const handleEdit = (row) => {
    setForm((prev) => ({
      ...prev,
      day: row.day,
      period: row.period,
      subject: row.subject,
      faculty: row.faculty,
      room: row.room,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
    }));
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleDelete = (id) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="ct-root">
      <header className="ct-header">
        <div>
          <h1 className="ct-title">Create Timetable</h1>
          <p className="ct-subtitle">Manage timetable for Intermediate College.</p>
        </div>
        <div className="ct-header-actions">
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
            value={form.board}
            options={BOARDS}
            error={errors.board}
            onChange={(v) => setField("board", v)}
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="ct-empty">
                    No timetable entries added yet.
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
