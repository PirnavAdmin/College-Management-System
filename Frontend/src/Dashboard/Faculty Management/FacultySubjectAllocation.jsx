import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiClipboard,
  FiCheckCircle,
  FiRotateCcw,
  FiX,
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiInbox,
} from "react-icons/fi";
import "./FacultySubjectAllocation.css";

const OPTIONS = {
  faculty: [
    "Dr. Ananya Sharma",
    "Prof. Rajesh Kumar",
    "Dr. Meera Iyer",
    "Mr. Sandeep Verma",
    "Dr. Fatima Khan",
    "Ms. Priya Nair",
  ],
  board: ["CBSE", "ICSE", "State Board", "University Autonomous"],
  academicYear: ["2023-2024", "2024-2025", "2025-2026", "2026-2027"],
  group: ["Science", "Commerce", "Arts", "Engineering"],
  academicLevel: ["First Year", "Second Year", "Third Year", "Final Year"],
  section: ["Section A", "Section B", "Section C", "Section D"],
  subject: [
    "Data Structures",
    "Thermodynamics",
    "Digital Electronics",
    "Linear Algebra",
    "Structural Analysis",
    "Operating Systems",
  ],
};

const FIELDS = [
  { key: "faculty", label: "Faculty", options: OPTIONS.faculty },
  { key: "board", label: "Board", options: OPTIONS.board },
  { key: "academicYear", label: "Academic Year", options: OPTIONS.academicYear },
  { key: "group", label: "Group", options: OPTIONS.group },
  { key: "academicLevel", label: "Academic Level", options: OPTIONS.academicLevel },
  { key: "section", label: "Section", options: OPTIONS.section },
  { key: "subject", label: "Subject", options: OPTIONS.subject },
];

const EMPTY_FORM = {
  faculty: "",
  board: "",
  academicYear: "",
  group: "",
  academicLevel: "",
  section: "",
  subject: "",
};

const INITIAL_ALLOCATIONS = [
  { id: 1, faculty: "Dr. Ananya Sharma", board: "University Autonomous", academicYear: "2025-2026", group: "Engineering", academicLevel: "Second Year", section: "Section A", subject: "Data Structures", status: "Allocated" },
  { id: 2, faculty: "Prof. Rajesh Kumar", board: "State Board", academicYear: "2025-2026", group: "Engineering", academicLevel: "Third Year", section: "Section B", subject: "Thermodynamics", status: "Allocated" },
  { id: 3, faculty: "Dr. Meera Iyer", board: "CBSE", academicYear: "2024-2025", group: "Science", academicLevel: "Final Year", section: "Section C", subject: "Digital Electronics", status: "Allocated" },
  { id: 4, faculty: "Dr. Fatima Khan", board: "ICSE", academicYear: "2025-2026", group: "Science", academicLevel: "First Year", section: "Section A", subject: "Linear Algebra", status: "Allocated" },
];

export default function FacultySubjectAllocation() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [allocations, setAllocations] = useState(INITIAL_ALLOCATIONS);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    FIELDS.forEach((f) => {
      if (!form[f.key]) nextErrors[f.key] = `${f.label} is required`;
    });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (editingId) {
      setAllocations((list) =>
        list.map((a) => (a.id === editingId ? { ...a, ...form } : a)),
      );
    } else {
      setAllocations((list) => [
        { id: Date.now(), ...form, status: "Allocated" },
        ...list,
      ]);
    }
    resetForm();
  };

  const editRow = (row) => {
    setEditingId(row.id);
    setErrors({});
    setForm({
      faculty: row.faculty,
      board: row.board,
      academicYear: row.academicYear,
      group: row.group,
      academicLevel: row.academicLevel,
      section: row.section,
      subject: row.subject,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = (id) => {
    setAllocations((list) => list.filter((a) => a.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="fsa-page">
      <div className="fsa-header">
        <h1 className="fsa-title">Faculty Subject Allocation</h1>
        <nav className="fsa-crumb">
  <Link to="/dashboard">Dashboard</Link>
  <span>/</span>
  <Link to="/dashboard/faculty">Faculty Management</Link>
  <span>/</span>
  <span className="fsa-crumb-current">Faculty Subject Allocation</span>
</nav>
      </div>

      <div className="fsa-card">
        <div className="fsa-card-head">
          <FiClipboard />
          <div>
            <h2>{editingId ? "Update Allocation" : "New Allocation"}</h2>
            <p>Assign a subject to a faculty member for a given academic context.</p>
          </div>
        </div>

        <form className="fsa-form" onSubmit={handleSubmit} noValidate>
          <div className="fsa-grid">
            {FIELDS.map((f) => (
              <div className="fsa-field" key={f.key}>
                <label className="fsa-label" htmlFor={`fsa-${f.key}`}>
                  {f.label} <span>*</span>
                </label>
                <select
                  id={`fsa-${f.key}`}
                  className={`fsa-select ${errors[f.key] ? "fsa-invalid" : ""}`}
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                >
                  <option value="">Select {f.label}</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {errors[f.key] && <span className="fsa-error">{errors[f.key]}</span>}
              </div>
            ))}
          </div>

          <div className="fsa-form-actions">
            <Link to="/dashboard/faculty" className="fsa-btn">
              <FiX /> Cancel
            </Link>
            <button type="button" className="fsa-btn" onClick={resetForm}>
              <FiRotateCcw /> Reset
            </button>
            <button type="submit" className="fsa-btn fsa-btn-primary">
              <FiCheckCircle /> {editingId ? "Update Subject" : "Allocate Subject"}
            </button>
          </div>
        </form>
      </div>

      <div className="fsa-card">
        <div className="fsa-card-head">
          <FiLayers />
          <div>
            <h2>Allocated Subjects</h2>
            <p>{allocations.length} allocation(s) found</p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="fsa-empty">
            <div className="fsa-empty-art"><FiInbox /></div>
            <h4>No allocations yet</h4>
            <p>Use the form above to allocate a subject to a faculty member.</p>
          </div>
        ) : (
          <div className="fsa-table-wrap">
            <table className="fsa-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Board</th>
                  <th>Academic Year</th>
                  <th>Group</th>
                  <th>Academic Level</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td className="fsa-strong">{a.faculty}</td>
                    <td>{a.board}</td>
                    <td>{a.academicYear}</td>
                    <td>{a.group}</td>
                    <td>{a.academicLevel}</td>
                    <td>{a.section}</td>
                    <td>{a.subject}</td>
                    <td><span className="fsa-badge">{a.status}</span></td>
                    <td>
                      <div className="fsa-row-actions">
                        <button
                          type="button"
                          className="fsa-icon-btn"
                          title="Edit"
                          onClick={() => editRow(a)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="fsa-icon-btn fsa-danger"
                          title="Delete"
                          onClick={() => deleteRow(a.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
