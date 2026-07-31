import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMenu,
  FiPercent,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiSearch,
  FiSettings,
  FiToggleRight,
  FiUsers,
  FiX,
} from "react-icons/fi";

import "./SubjectManagement.css";

const BOARDS = ["State Board", "CBSE", "ICSE"];
const GROUPS = ["MPC", "BiPC", "CEC", "MEC", "HEC"];
const ACADEMIC_LEVELS = ["First Year", "Second Year"];
const SUBJECT_TYPES = ["Theory", "Practical", "Language", "Elective"];

const EMPTY_FORM = {
  board: "",
  group: "",
  level: "",
  name: "",
  code: "",
  subjectTypes: [],
  internalMarks: "",
  practicalMarks: "",
  externalMarks: "",
  passingMarks: "",
  isActive: true,
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AddSubject() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const totalMarks = useMemo(
    () =>
      toNumber(form.internalMarks) + toNumber(form.practicalMarks) + toNumber(form.externalMarks),
    [form.internalMarks, form.practicalMarks, form.externalMarks],
  );
  const maximumMarks = totalMarks;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleSubjectType = (type) => {
    setForm((prev) => ({
      ...prev,
      subjectTypes: prev.subjectTypes.includes(type)
        ? prev.subjectTypes.filter((item) => item !== type)
        : [...prev.subjectTypes, type],
    }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.board) nextErrors.board = "Board is required";
    if (!form.group) nextErrors.group = "Group is required";
    if (!form.level) nextErrors.level = "Academic level is required";
    if (!form.name.trim()) nextErrors.name = "Subject name is required";
    else if (form.name.trim().length > 100) nextErrors.name = "Maximum 100 characters";
    if (!form.code.trim()) nextErrors.code = "Subject code is required";
    else if (form.code.trim().length > 20) nextErrors.code = "Maximum 20 characters";
    if (form.passingMarks === "") nextErrors.passingMarks = "Passing marks are required";
    else if (toNumber(form.passingMarks) <= 0)
      nextErrors.passingMarks = "Passing marks must be greater than 0";
    else if (totalMarks > 0 && toNumber(form.passingMarks) > totalMarks)
      nextErrors.passingMarks = "Passing marks cannot exceed total marks";
    if (totalMarks <= 0)
      nextErrors.totalMarks = "Total marks are required (enter internal / practical / external)";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleSave = (event) => {
  event.preventDefault();

  if (!validate()) return;


  const oldSubjects =
    JSON.parse(localStorage.getItem("subjects")) || [];


  const newSubject = {
    id: Date.now(),

    board: form.board,
    group: form.group,
    level: form.level,

    name: form.name,
    code: form.code,

    type: form.subjectTypes.join(", "),

    internalMarks: Number(form.internalMarks),
    practicalMarks: Number(form.practicalMarks),
    externalMarks: Number(form.externalMarks),

    maximumMarks: totalMarks,
    passingMarks: Number(form.passingMarks),

    status: form.isActive ? "Active" : "Inactive"
  };


  localStorage.setItem(
    "subjects",
    JSON.stringify([
      ...oldSubjects,
      newSubject
    ])
  );


  alert("Subject Saved Successfully");


  navigate("/subjects");
};

  const handleSaveAndAddAnother = () => {

  if (!validate()) return;

  const oldSubjects =
    JSON.parse(localStorage.getItem("subjects")) || [];

  const newSubject = {
    id: Date.now(),
    board: form.board,
    group: form.group,
    level: form.level,
    name: form.name,
    code: form.code,
    type: form.subjectTypes.join(", "),
    internalMarks: Number(form.internalMarks),
    practicalMarks: Number(form.practicalMarks),
    externalMarks: Number(form.externalMarks),
    maximumMarks: totalMarks,
    passingMarks: Number(form.passingMarks),
    status: form.isActive ? "Active" : "Inactive"
  };


  localStorage.setItem(
    "subjects",
    JSON.stringify([...oldSubjects, newSubject])
  );


  setMessage("Subject saved. You can add another one.");

  resetForm();

  window.setTimeout(() => {
    setMessage("");
  },3000);

};

  const handleCancel = () => {
  navigate("/subjects");
};

  return (
    <div className="sm-root">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="sm-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside className={sidebarOpen ? "sm-sidebar is-open" : "sm-sidebar"}>
        <div className="sm-brand">
          <span className="sm-brand-mark">
            <FiLayers size={18} />
          </span>
          College ERP
        </div>
        <nav className="sm-nav">
          <Link to="/subjects" className="sm-nav-item">
            <FiGrid size={16} /> Dashboard
          </Link>
          <span className="sm-nav-label">Academics</span>
          <Link to="/subjects" className="sm-nav-item">
            <FiBookOpen size={16} /> Subject Management
          </Link>
          <Link to="/subjects/add" className="sm-nav-item is-active">
            <FiPlus size={16} /> Add Subject
          </Link>
          <span className="sm-nav-label">Administration</span>
          <Link to="/subjects" className="sm-nav-item">
            <FiUsers size={16} /> Students
          </Link>
          <Link to="/subjects" className="sm-nav-item">
            <FiSettings size={16} /> Settings
          </Link>
        </nav>
      </aside>

      <div className="sm-main">
        {/* Navbar */}
        <header className="sm-navbar">
          <button
            type="button"
            className="sm-icon-btn sm-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
          <div className="sm-navbar-search">
            <FiSearch size={16} />
            <input type="search" placeholder="Search anything..." aria-label="Global search" />
          </div>
          <div className="sm-spacer" />
          <button type="button" className="sm-icon-btn" aria-label="Notifications">
            <FiBell size={18} />
          </button>
          <div className="sm-avatar">
            <span>AD</span>
            <small>
              Admin User
              <br />
              Administrator
            </small>
          </div>
        </header>

        <main className="sm-content">
          {/* Breadcrumb */}
          <nav className="sm-breadcrumb" aria-label="Breadcrumb">
            <Link to="/subjects">Dashboard</Link>
            <span>/</span>
            <Link to="/subjects">Subject Management</Link>
            <span>/</span>
            <span className="is-current">Add Subject</span>
          </nav>

          {/* Header */}
          <div className="sm-header">
            <div>
              <h1>Add Subject</h1>
              <p>Create a new subject with marks configuration and status.</p>
            </div>
            <div className="sm-actions">
              <Link to="/subjects" className="sm-btn sm-btn-outline">
                <FiBookOpen size={16} /> Back to Subject List
              </Link>
            </div>
          </div>

          <form className="sm-card sm-card-pad" onSubmit={handleSave} noValidate>
            {/* Section 1 */}
            <h2 className="sm-section-title">
              <FiInfo size={18} /> Basic Information
            </h2>
            <div className="sm-grid">
              <div className="sm-field">
                <label htmlFor="board">
                  Board<span className="sm-req">*</span>
                </label>
                <select
                  id="board"
                  className={errors.board ? "sm-select is-error" : "sm-select"}
                  value={form.board}
                  onChange={(event) => setField("board", event.target.value)}
                >
                  <option value="">Select Board</option>
                  {BOARDS.map((board) => (
                    <option key={board} value={board}>
                      {board}
                    </option>
                  ))}
                </select>
                {errors.board ? <span className="sm-error">{errors.board}</span> : null}
              </div>

              <div className="sm-field">
                <label htmlFor="group">
                  Group<span className="sm-req">*</span>
                </label>
                <select
                  id="group"
                  className={errors.group ? "sm-select is-error" : "sm-select"}
                  value={form.group}
                  onChange={(event) => setField("group", event.target.value)}
                >
                  <option value="">Select Group</option>
                  {GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
                {errors.group ? <span className="sm-error">{errors.group}</span> : null}
              </div>

              <div className="sm-field">
                <label htmlFor="level">
                  Academic Level<span className="sm-req">*</span>
                </label>
                <select
                  id="level"
                  className={errors.level ? "sm-select is-error" : "sm-select"}
                  value={form.level}
                  onChange={(event) => setField("level", event.target.value)}
                >
                  <option value="">Select Academic Level</option>
                  {ACADEMIC_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {errors.level ? <span className="sm-error">{errors.level}</span> : null}
              </div>

              <div className="sm-field">
                <label htmlFor="name">
                  Subject Name<span className="sm-req">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  maxLength={100}
                  className={errors.name ? "sm-input is-error" : "sm-input"}
                  placeholder="e.g. Mathematics IA"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
                {errors.name ? <span className="sm-error">{errors.name}</span> : null}
              </div>

              <div className="sm-field">
                <label htmlFor="code">
                  Subject Code<span className="sm-req">*</span>
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={20}
                  className={errors.code ? "sm-input is-error" : "sm-input"}
                  placeholder="e.g. MATH101"
                  value={form.code}
                  onChange={(event) => setField("code", event.target.value)}
                />
                {errors.code ? <span className="sm-error">{errors.code}</span> : null}
              </div>
            </div>

            <hr className="sm-divider" />

            {/* Section 2 */}
            <h2 className="sm-section-title">
              <FiLayers size={18} /> Subject Type
            </h2>
            <div className="sm-check-grid">
              {SUBJECT_TYPES.map((type) => {
                const checked = form.subjectTypes.includes(type);
                return (
                  <label key={type} className={checked ? "sm-check is-checked" : "sm-check"}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubjectType(type)}
                    />
                    {type}
                  </label>
                );
              })}
            </div>
            <span className="sm-hint">You can select more than one subject type.</span>

            <hr className="sm-divider" />

            {/* Section 3 */}
            <h2 className="sm-section-title">
              <FiPercent size={18} /> Marks Information
            </h2>
            <div className="sm-grid">
              <div className="sm-field">
                <label htmlFor="internalMarks">Internal Marks</label>
                <input
                  id="internalMarks"
                  type="number"
                  min="0"
                  className="sm-input"
                  placeholder="0"
                  value={form.internalMarks}
                  onChange={(event) => setField("internalMarks", event.target.value)}
                />
              </div>
              <div className="sm-field">
                <label htmlFor="practicalMarks">Practical Marks</label>
                <input
                  id="practicalMarks"
                  type="number"
                  min="0"
                  className="sm-input"
                  placeholder="0"
                  value={form.practicalMarks}
                  onChange={(event) => setField("practicalMarks", event.target.value)}
                />
              </div>
              <div className="sm-field">
                <label htmlFor="externalMarks">External Marks</label>
                <input
                  id="externalMarks"
                  type="number"
                  min="0"
                  className="sm-input"
                  placeholder="0"
                  value={form.externalMarks}
                  onChange={(event) => setField("externalMarks", event.target.value)}
                />
              </div>
              <div className="sm-field">
                <label htmlFor="totalMarks">
                  Total Marks<span className="sm-req">*</span>
                </label>
                <input id="totalMarks" type="number" className="sm-input" value={totalMarks} readOnly disabled />
                <span className="sm-hint">Auto calculated from internal + practical + external.</span>
                {errors.totalMarks ? <span className="sm-error">{errors.totalMarks}</span> : null}
              </div>
              <div className="sm-field">
                <label htmlFor="passingMarks">
                  Passing Marks<span className="sm-req">*</span>
                </label>
                <input
                  id="passingMarks"
                  type="number"
                  min="0"
                  className={errors.passingMarks ? "sm-input is-error" : "sm-input"}
                  placeholder="e.g. 35"
                  value={form.passingMarks}
                  onChange={(event) => setField("passingMarks", event.target.value)}
                />
                {errors.passingMarks ? <span className="sm-error">{errors.passingMarks}</span> : null}
              </div>
              <div className="sm-field">
                <label htmlFor="maximumMarks">Maximum Marks</label>
                <input id="maximumMarks" type="number" className="sm-input" value={maximumMarks} readOnly disabled />
                <span className="sm-hint">Auto calculated from total marks.</span>
              </div>
            </div>

            <hr className="sm-divider" />

            {/* Section 4 */}
            <h2 className="sm-section-title">
              <FiToggleRight size={18} /> Status
            </h2>
            <label className={form.isActive ? "sm-toggle is-on" : "sm-toggle"}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
              />
              <span className="sm-toggle-track" aria-hidden="true" />
              <span
                className={
                  form.isActive ? "sm-badge sm-badge-green" : "sm-badge sm-badge-gray"
                }
              >
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </label>

            <hr className="sm-divider" />

            {/* Buttons */}
            <div className="sm-actions">
              <button type="submit" className="sm-btn sm-btn-primary">
                <FiSave size={16} /> Save Subject
              </button>
              <button
                type="button"
                className="sm-btn sm-btn-outline"
                onClick={handleSaveAndAddAnother}
              >
                <FiPlus size={16} /> Save &amp; Add Another
              </button>
              <button type="button" className="sm-btn sm-btn-outline" onClick={resetForm}>
                <FiRotateCcw size={16} /> Reset
              </button>
              <button type="button" className="sm-btn sm-btn-ghost" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </main>
      </div>

      {message ? (
        <div className="sm-toast" role="status">
          <FiCheckCircle size={18} /> {message}
        </div>
      ) : null}
    </div>
  );
}