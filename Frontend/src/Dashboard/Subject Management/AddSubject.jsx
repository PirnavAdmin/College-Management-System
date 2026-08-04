import { useEffect, useMemo, useState } from "react";
import { addSubject, getSubjectById, updateSubject } from "../../api/authApi";
import { Link, useNavigate, useLocation } from "react-router-dom";

import {
  FiBookOpen,
  FiCheckCircle,
  FiInfo,
  FiLayers,
  FiPercent,
  FiPlus,
  FiRotateCcw,
  FiToggleRight,
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
  const location = useLocation();

  const editMode = location.state?.editMode || false;
  const subjectId = location.state?.subjectId || null;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editMode && subjectId) {
      async function fetchSubject() {
        try {
          const response = await getSubjectById(subjectId);

          const data = response.data;

          setForm({
            board: data.board,
            group: data.group,
            level: data.academicLevel,
            name: data.subjectName,
            code: data.subjectCode,
            subjectTypes: data.subjectType ? data.subjectType.split(", ") : [],
            internalMarks: data.internalMarks,
            practicalMarks: data.practicalMarks,
            externalMarks: data.externalMarks,
            passingMarks: data.passingMarks,
            isActive: data.isActive ?? true,
          });
        } catch (error) {
          console.error("Error loading subject:", error);
          alert("Unable to load subject details");
        }
      }

      fetchSubject();
    }
  }, [editMode, subjectId]);

  const totalMarks = useMemo(
    () =>
      toNumber(form.internalMarks) +
      toNumber(form.practicalMarks) +
      toNumber(form.externalMarks),
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
    else if (form.name.trim().length > 100)
      nextErrors.name = "Maximum 100 characters";
    if (!form.code.trim()) nextErrors.code = "Subject code is required";
    else if (form.code.trim().length > 20)
      nextErrors.code = "Maximum 20 characters";
    if (form.passingMarks === "")
      nextErrors.passingMarks = "Passing marks are required";
    else if (toNumber(form.passingMarks) <= 0)
      nextErrors.passingMarks = "Passing marks must be greater than 0";
    else if (totalMarks > 0 && toNumber(form.passingMarks) > totalMarks)
      nextErrors.passingMarks = "Passing marks cannot exceed total marks";
    if (totalMarks <= 0)
      nextErrors.totalMarks =
        "Total marks are required (enter internal / practical / external)";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const saveSubject = async ({ addAnother = false } = {}) => {
    if (!validate()) return;

    const subjectData = {
      board: form.board,
      group: form.group,
      academicLevel: form.level,
      subjectName: form.name,
      subjectCode: form.code,
      subjectType: form.subjectTypes.join(", "),
      theory: form.subjectTypes.includes("Theory"),
      practical: form.subjectTypes.includes("Practical"),
      language: form.subjectTypes.includes("Language"),
      elective: form.subjectTypes.includes("Elective"),
      internalMarks: Number(form.internalMarks),
      practicalMarks: Number(form.practicalMarks),
      externalMarks: Number(form.externalMarks),
      totalMarks: totalMarks,
      passingMarks: Number(form.passingMarks),
    };

    try {
      if (editMode) {
        await updateSubject(subjectId, subjectData);

        alert("Subject Updated Successfully");
      } else {
        await addSubject(subjectData);

        alert("Subject Saved Successfully");
      }

      if (addAnother) {
        resetForm();
        alert("Subject Saved Successfully. You can add another subject.");
      } else {
        navigate("/dashboard/subjects");
      }
    } catch (error) {
      console.error(error);

      if (editMode) {
        alert("Failed to update subject");
      } else {
        alert("Failed to save subject");
      }
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    await saveSubject();
  };

  const handleSaveAndAddAnother = async () => {
    await saveSubject({ addAnother: true });
  };

  const handleCancel = () => {
  navigate("/dashboard/subjects");
};

  return (
    <div className="sm-root">

      {/* Sidebar */}

      <div className="sm-main">
        {/* Navbar */}

        <main className="sm-content">
          {/* Breadcrumb */}
          <nav className="sm-breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
<span>/</span>
<Link to="/dashboard/subjects">Subject Management</Link>
            <span>/</span>
            <span className="is-current">
              {editMode ? "Update Subject" : "Add Subject"}
            </span>
          </nav>

          {/* Header */}
          <div className="sm-header">
            <div>
              <h1>{editMode ? "Update Subject" : "Add Subject"}</h1>
              <p>
                {editMode
                  ? "Update subject information."
                  : "Create a new subject with marks configuration and status."}
              </p>
            </div>
            <div className="sm-actions">
              <Link to="/dashboard/subjects" className="sm-btn sm-btn-outline">
  <FiBookOpen size={16} /> Back to Subject List
</Link>
            </div>
          </div>

          <form
            className="sm-card sm-card-pad"
            onSubmit={handleSave}
            noValidate
          >
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
                {errors.board ? (
                  <span className="sm-error">{errors.board}</span>
                ) : null}
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
                {errors.group ? (
                  <span className="sm-error">{errors.group}</span>
                ) : null}
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
                {errors.level ? (
                  <span className="sm-error">{errors.level}</span>
                ) : null}
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
                {errors.name ? (
                  <span className="sm-error">{errors.name}</span>
                ) : null}
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
                {errors.code ? (
                  <span className="sm-error">{errors.code}</span>
                ) : null}
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
                  <label
                    key={type}
                    className={checked ? "sm-check is-checked" : "sm-check"}
                  >
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
            <span className="sm-hint">
              You can select more than one subject type.
            </span>

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
                  onChange={(event) =>
                    setField("internalMarks", event.target.value)
                  }
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
                  onChange={(event) =>
                    setField("practicalMarks", event.target.value)
                  }
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
                  onChange={(event) =>
                    setField("externalMarks", event.target.value)
                  }
                />
              </div>
              <div className="sm-field">
                <label htmlFor="totalMarks">
                  Total Marks<span className="sm-req">*</span>
                </label>
                <input
                  id="totalMarks"
                  type="number"
                  className="sm-input"
                  value={totalMarks}
                  readOnly
                  disabled
                />
                <span className="sm-hint">
                  Auto calculated from internal + practical + external.
                </span>
                {errors.totalMarks ? (
                  <span className="sm-error">{errors.totalMarks}</span>
                ) : null}
              </div>
              <div className="sm-field">
                <label htmlFor="passingMarks">
                  Passing Marks<span className="sm-req">*</span>
                </label>
                <input
                  id="passingMarks"
                  type="number"
                  min="0"
                  className={
                    errors.passingMarks ? "sm-input is-error" : "sm-input"
                  }
                  placeholder="e.g. 35"
                  value={form.passingMarks}
                  onChange={(event) =>
                    setField("passingMarks", event.target.value)
                  }
                />
                {errors.passingMarks ? (
                  <span className="sm-error">{errors.passingMarks}</span>
                ) : null}
              </div>
              <div className="sm-field">
                <label htmlFor="maximumMarks">Maximum Marks</label>
                <input
                  id="maximumMarks"
                  type="number"
                  className="sm-input"
                  value={maximumMarks}
                  readOnly
                  disabled
                />
                <span className="sm-hint">
                  Auto calculated from total marks.
                </span>
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
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
              />
              <span className="sm-toggle-track" aria-hidden="true" />
              <span
                className={
                  form.isActive
                    ? "sm-badge sm-badge-green"
                    : "sm-badge sm-badge-gray"
                }
              >
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </label>

            <hr className="sm-divider" />

            {/* Buttons */}
            <div className="sm-actions">
              <button type="submit" className="sm-btn sm-btn-primary">
                <span className="is-current">
                  {editMode ? "Update Subject" : "Add Subject"}
                </span>
              </button>
              {!editMode && (
                <button
                  type="button"
                  className="sm-btn sm-btn-outline"
                  onClick={handleSaveAndAddAnother}
                >
                  <FiPlus size={16} /> Save & Add Another
                </button>
              )}
              <button
                type="button"
                className="sm-btn sm-btn-outline"
                onClick={resetForm}
              >
                <FiRotateCcw size={16} /> Reset
              </button>
              <button
                type="button"
                className="sm-btn sm-btn-ghost"
                onClick={handleCancel}
              >
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
