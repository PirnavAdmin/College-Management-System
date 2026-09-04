import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus, Search, Edit3, Eye, RotateCcw, Play, ArrowLeft, CheckCircle, AlertTriangle, ListOrdered, ShieldAlert, Copy, Sparkles, Check
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
import {
  readNumberSeriesSettings, writeNumberSeriesSettings, formatSeriesNumber, resetNumberSeriesSequence
} from "@/data/numberSeriesData.js";
import "./NumberSeriesPage.css";

export default function NumberSeriesPage({ mode = "dashboard" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [seriesList, setSeriesList] = useState(readNumberSeriesSettings);
  const [toast, setToast] = useState(null);

  const activeSeries = useMemo(() => {
    if (!id) return null;
    return seriesList.find((s) => s.id === id || s.key === id) || null;
  }, [id, seriesList]);

  const updateSeriesList = (newList) => {
    setSeriesList(newList);
    writeNumberSeriesSettings(newList);
  };

  if (mode === "add") {
    return (
      <AddNumberSeriesScreen
        seriesList={seriesList}
        onSave={(newSeries) => {
          const updated = [newSeries, ...seriesList];
          updateSeriesList(updated);
          setToast("Number series created successfully!");
          setTimeout(() => navigate("/dashboard/settings/number-series"), 400);
        }}
      />
    );
  }

  if (mode === "edit") {
    return (
      <NumberSeriesDetailsScreen
        series={activeSeries}
        initialEditing={true}
        onSave={(updatedSeries) => {
          const updated = seriesList.map((s) => (s.id === updatedSeries.id ? updatedSeries : s));
          updateSeriesList(updated);
        }}
      />
    );
  }

  if (mode === "view") {
    return (
      <NumberSeriesDetailsScreen
        series={activeSeries}
        initialEditing={false}
        onSave={(updatedSeries) => {
          const updated = seriesList.map((s) => (s.id === updatedSeries.id ? updatedSeries : s));
          updateSeriesList(updated);
        }}
      />
    );
  }

  if (mode === "preview") {
    return <NumberSeriesPreviewScreen seriesList={seriesList} />;
  }

  if (mode === "reset") {
    return (
      <ResetNumberSeriesScreen
        series={activeSeries}
        onReset={(idToReset, newCurrent) => {
          resetNumberSeriesSequence(idToReset, newCurrent);
          setSeriesList(readNumberSeriesSettings());
          setToast("Sequence counter reset successfully!");
          setTimeout(() => navigate("/dashboard/settings/number-series"), 400);
        }}
      />
    );
  }

  return (
    <NumberSeriesDashboardScreen
      seriesList={seriesList}
      onUpdate={updateSeriesList}
      toast={toast}
      setToast={setToast}
    />
  );
}

function NumberSeriesDashboardScreen({ seriesList, onUpdate, toast, setToast }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  const filtered = useMemo(() => {
    return seriesList.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.prefix.toLowerCase().includes(q.toLowerCase()) ||
        s.module.toLowerCase().includes(q.toLowerCase());
      const matchModule = !moduleFilter || s.module === moduleFilter;
      return matchSearch && matchModule;
    });
  }, [q, moduleFilter, seriesList]);

  return (
    <DashboardLayout
      title="ID & Number Series Management"
      subtitle="Configure prefixes and automatic numbering rules for staff and students."
      breadcrumb={["Home", "Settings", "ID & Number Series"]}
      actions={
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => navigate("/dashboard/settings/number-series/add")}
        >
          <Plus size={15} /> Add Number Series
        </button>
      }
    >
      <main className="series-page-container">
        <section className="series-panel">
          <div className="series-toolbar">
            <div className="series-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by series name, prefix, or module..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="series-filter-select"
            >
              <option value="">All Modules</option>
              <option value="Staff Management">Staff Management</option>
              <option value="Student Admission">Student Admission</option>
              <option value="Student Management">Student Management</option>
              <option value="Academics">Academics</option>
            </select>
          </div>

          <div className="series-table-wrapper">
            <table className="series-table">
              <thead>
                <tr>
                  <th>Series Name</th>
                  <th>Module</th>
                  <th>Target Entity</th>
                  <th>Prefix / Format</th>
                  <th>Current<br />Sequence</th>
                  <th>Next Value</th>
                  <th>Reset<br />Frequency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-table-cell">
                      No number series found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.description ? <small className="series-desc">{item.description}</small> : null}
                      </td>
                      <td>
                        <span className="series-tag">{item.module}</span>
                      </td>
                      <td>{item.entity}</td>
                      <td>
                        <code className="series-code-badge">{item.prefix}</code>
                      </td>
                      <td>
                        <strong>{item.currentNumber}</strong>
                      </td>
                      <td>
                        <strong className="next-value-highlight">
                          {formatSeriesNumber(item, item.currentNumber + 1)}
                        </strong>
                      </td>
                      <td>{item.resetFrequency || "Never"}</td>
                      <td>
                        <span className={`status-badge ${item.active ? "is-active" : "is-inactive"}`}>
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="series-row-actions">
                          <button
                            title="View Details"
                            onClick={() => navigate(`/dashboard/settings/number-series/${item.id}`)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            title="Edit Series"
                            onClick={() => navigate(`/dashboard/settings/number-series/${item.id}/edit`)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            title="Reset Sequence"
                            onClick={() => navigate(`/dashboard/settings/number-series/${item.id}/reset`)}
                          >
                            <RotateCcw size={14} />
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
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function FormGroup({ label, required, help, children }) {
  return (
    <div className="series-form-group">
      {label ? (
        <label className="series-form-label">
          {label} {required ? <span style={{ color: "#e53e3e", marginLeft: "2px" }}>*</span> : null}
        </label>
      ) : null}
      {children}
      {help ? <small className="field-help">{help}</small> : null}
    </div>
  );
}

function AddNumberSeriesScreen({ onSave }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    module: "Staff Management",
    entity: "Teaching Staff",
    prefix: "PCTCH",
    suffix: "",
    startingNumber: 1,
    currentNumber: 0,
    paddingWidth: 4,
    resetFrequency: "Never",
    description: "",
    active: true,
  });

  const presets = [
    {
      label: "Teaching Staff ID",
      name: "Teaching Staff Employee ID",
      key: "teaching-staff-emp-id",
      module: "Staff Management",
      entity: "Teaching Staff",
      prefix: "PCTCH",
      paddingWidth: 4,
      startingNumber: 1,
      resetFrequency: "Never",
    },
    {
      label: "Non-Teaching Staff ID",
      name: "Non-Teaching Staff Employee ID",
      key: "non-teaching-staff-emp-id",
      module: "Staff Management",
      entity: "Non-Teaching Staff",
      prefix: "PCNT",
      paddingWidth: 3,
      startingNumber: 1,
      resetFrequency: "Never",
    },
    {
      label: "Student Admission No",
      name: "Student Admission Number",
      key: "student-admission-num",
      module: "Student Admission",
      entity: "Student",
      prefix: "ADM{YYYY}",
      paddingWidth: 4,
      startingNumber: 100,
      resetFrequency: "Academic Year",
    },
    {
      label: "Student Roll No",
      name: "Student Roll Number",
      key: "student-roll-num",
      module: "Student Management",
      entity: "Student",
      prefix: "ROLL{YY}",
      paddingWidth: 4,
      startingNumber: 50,
      resetFrequency: "Academic Year",
    },
    {
      label: "Exam Hall Ticket",
      name: "Exam Hall Ticket Series",
      key: "exam-hall-ticket-series",
      module: "Examination",
      entity: "Hall Ticket",
      prefix: "EXAM{YYYY}",
      paddingWidth: 5,
      startingNumber: 1000,
      resetFrequency: "Academic Year",
    },
  ];

  const applyPreset = (p) => {
    setFormData((prev) => ({
      ...prev,
      name: p.name,
      key: p.key,
      module: p.module,
      entity: p.entity,
      prefix: p.prefix,
      paddingWidth: p.paddingWidth,
      startingNumber: p.startingNumber,
      resetFrequency: p.resetFrequency,
    }));
  };

  const previewFormatted = useMemo(() => {
    return formatSeriesNumber(
      {
        prefix: formData.prefix,
        suffix: formData.suffix,
        paddingWidth: formData.paddingWidth,
      },
      Number(formData.startingNumber || 1)
    );
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.prefix) return;
    const newSeries = {
      ...formData,
      id: `series-${Date.now()}`,
      key: formData.key || formData.name.toLowerCase().replace(/\s+/g, "-"),
      startingNumber: Number(formData.startingNumber || 1),
      currentNumber: Number(formData.startingNumber || 1) - 1,
      paddingWidth: Number(formData.paddingWidth || 3),
      createdOn: new Date().toISOString().slice(0, 10),
    };
    onSave(newSeries);
  };

  return (
    <DashboardLayout
      title="Add Number Series"
      subtitle="Configure automatic numbering rules and prefix formats for a new module."
      breadcrumb={["Home", "Settings", "ID & Number Series", "Add Number Series"]}
    >
      <main className="series-page-container">
        <Link to="/dashboard/settings/number-series" className="cms-back-link">
          <ArrowLeft size={14} /> Back to ID & Number Series
        </Link>

        <form className="series-form-card" onSubmit={handleSubmit}>
          <div className="preset-bar" style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--cms-subtle)", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "var(--cms-muted)" }}>
              <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Quick Preset Templates (Click to auto-fill)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ fontSize: "12px", padding: "4px 10px", height: "auto" }}
                  onClick={() => applyPreset(p)}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section-title" style={{ marginBottom: "8px", paddingBottom: "4px" }}>
            <h3>Series Metadata</h3>
          </div>

          <div className="form-grid-4">
            <FormGroup label="Series Name" required>
              <input
                type="text"
                required
                placeholder="e.g. Teaching Staff Employee ID"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="System Key">
              <input
                type="text"
                placeholder="e.g. teaching-staff"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Module" required>
              <select
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              >
                <option value="Staff Management">Staff Management</option>
                <option value="Student Admission">Student Admission</option>
                <option value="Student Management">Student Management</option>
                <option value="Examination">Examination</option>
                <option value="Fee Management">Fee Management</option>
                <option value="Academics">Academics</option>
              </select>
            </FormGroup>

            <FormGroup label="Target Entity" required>
              <input
                type="text"
                required
                placeholder="e.g. Teaching Staff / Student"
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
              />
            </FormGroup>
          </div>

          <div className="form-section-title">
            <h3>Format & Prefix Configuration</h3>
          </div>

          <div className="form-grid-3">
            <FormGroup label="Prefix Pattern" required help="Tokens: {YYYY}, {YY}, {GRP}, {SEC}">
              <input
                type="text"
                required
                placeholder="e.g. PCTCH or ADM{YYYY}"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Suffix (Optional)">
              <input
                type="text"
                placeholder="e.g. -2026"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Padding Digits (Width)">
              <input
                type="number"
                min="1"
                max="10"
                value={formData.paddingWidth}
                onChange={(e) => setFormData({ ...formData, paddingWidth: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Starting Number">
              <input
                type="number"
                min="1"
                value={formData.startingNumber}
                onChange={(e) => setFormData({ ...formData, startingNumber: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Reset Frequency">
              <select
                value={formData.resetFrequency}
                onChange={(e) => setFormData({ ...formData, resetFrequency: e.target.value })}
              >
                <option value="Never">Never</option>
                <option value="Academic Year">Academic Year</option>
                <option value="Calendar Year">Calendar Year</option>
                <option value="Monthly">Monthly</option>
              </select>
            </FormGroup>

            <FormGroup label="Status">
              <select
                value={formData.active ? "Active" : "Inactive"}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === "Active" })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormGroup>
          </div>

          <div className="preview-live-box" style={{ background: "#edf7e2", borderColor: "#496d12" }}>
            <div>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#496d12" }}>Live Generated Output Sample:</span>
              <div style={{ fontSize: "11px", color: "var(--cms-muted)" }}>This is what the first generated ID will look like in the system.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <code style={{ fontSize: "18px", fontWeight: "700", color: "#496d12", fontFamily: "monospace" }}>{previewFormatted}</code>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ padding: "4px 8px", fontSize: "12px" }}
                onClick={() => {
                  navigator.clipboard?.writeText(previewFormatted);
                  setToast(`Copied sample: ${previewFormatted}`);
                }}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => navigate("/dashboard/settings/number-series")}
            >
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary">
              <Plus size={15} /> Save Series
            </button>
          </div>
        </form>
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function EditNumberSeriesScreen({ series, onSave }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(series || {});

  useEffect(() => {
    if (series) setFormData(series);
  }, [series]);

  if (!series) {
    return (
      <DashboardLayout
        title="Number Series Not Found"
        breadcrumb={["Home", "Settings", "ID & Number Series"]}
      >
        <main className="series-page-container">
          <p>The requested number series does not exist.</p>
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/settings/number-series")}
          >
            Back to ID & Number Series
          </button>
        </main>
      </DashboardLayout>
    );
  }

  const previewFormatted = formatSeriesNumber(
    {
      prefix: formData.prefix,
      suffix: formData.suffix,
      paddingWidth: formData.paddingWidth,
    },
    Number(formData.currentNumber || 0) + 1
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      paddingWidth: Number(formData.paddingWidth),
      currentNumber: Number(formData.currentNumber),
    });
  };

  return (
    <DashboardLayout
      title="Edit Number Series"
      subtitle={`Modify rule configurations for ${series.name}.`}
      breadcrumb={["Home", "Settings", "ID & Number Series", "Edit Number Series"]}
    >
      <main className="series-page-container">
        <Link to="/dashboard/settings/number-series" className="cms-back-link">
          <ArrowLeft size={14} /> Back to ID & Number Series
        </Link>

        <form className="series-form-card" onSubmit={handleSubmit}>
          <div className="form-section-title">
            <h3>Edit Series Metadata & Rules</h3>
          </div>

          <div className="form-grid-2">
            <Field label="Series Name" required>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>

            <Field label="Module">
              <input type="text" disabled value={formData.module} />
            </Field>

            <Field label="Prefix Pattern" required>
              <input
                type="text"
                required
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              />
            </Field>

            <Field label="Suffix">
              <input
                type="text"
                value={formData.suffix || ""}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
              />
            </Field>

            <Field label="Padding Digits (Width)">
              <input
                type="number"
                min="1"
                max="10"
                value={formData.paddingWidth}
                onChange={(e) => setFormData({ ...formData, paddingWidth: e.target.value })}
              />
            </Field>

            <Field label="Current Sequence Value">
              <input
                type="number"
                min="0"
                value={formData.currentNumber}
                onChange={(e) => setFormData({ ...formData, currentNumber: e.target.value })}
              />
              <small className="field-help">Next generated ID will be counter + 1.</small>
            </Field>

            <Field label="Reset Frequency">
              <select
                value={formData.resetFrequency}
                onChange={(e) => setFormData({ ...formData, resetFrequency: e.target.value })}
              >
                <option value="Never">Never</option>
                <option value="Academic Year">Academic Year</option>
                <option value="Calendar Year">Calendar Year</option>
                <option value="Monthly">Monthly</option>
              </select>
            </Field>

            <Field label="Status">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                Active Series
              </label>
            </Field>
          </div>

          <div className="preview-live-box">
            <span>Next Generated ID Sample:</span>
            <strong>{previewFormatted}</strong>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => navigate("/dashboard/settings/number-series")}
            >
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function NumberSeriesDetailsScreen({ series, initialEditing = false, onSave }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [formData, setFormData] = useState(series || {});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (series) setFormData(series);
  }, [series]);

  useEffect(() => {
    setIsEditing(initialEditing);
  }, [initialEditing]);

  if (!series) {
    return (
      <DashboardLayout title="Series Details" breadcrumb={["Home", "Settings", "ID & Number Series"]}>
        <main className="series-page-container">
          <p>Series not found.</p>
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/settings/number-series")}
          >
            Back to ID & Number Series
          </button>
        </main>
      </DashboardLayout>
    );
  }

  const activeData = isEditing ? formData : series;
  const nextVal = formatSeriesNumber(
    activeData,
    Number(activeData.currentNumber !== undefined ? activeData.currentNumber : 0) + 1
  );

  const handleSave = () => {
    const updated = {
      ...series,
      ...formData,
      paddingWidth: Number(formData.paddingWidth || 3),
      currentNumber: Number(formData.currentNumber || 0),
    };
    if (onSave) {
      onSave(updated);
    }
    setIsEditing(false);
    setToast("Series updated successfully!");
  };

  return (
    <DashboardLayout
      title={isEditing ? "Edit Number Series" : "Series Details"}
      subtitle={isEditing ? `Edit rules and values directly for ${series.name}.` : `Detailed configuration and sequence state for ${series.name}.`}
      breadcrumb={["Home", "Settings", "ID & Number Series", isEditing ? "Edit Number Series" : "Series Details"]}
    >
      <main className="series-page-container">
        <Link to="/dashboard/settings/number-series" className="cms-back-link">
          <ArrowLeft size={14} /> Back to ID & Number Series
        </Link>

        <section className={`series-details-card ${isEditing ? "is-editing-card" : ""}`}>
          <header className="details-header">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  className="inline-edit-title-input"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              ) : (
                <h2>{series.name}</h2>
              )}
              <span className="series-tag">{series.module}</span>
            </div>
            <div className="details-actions">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => navigate(`/dashboard/settings/number-series/${series.id}/reset`)}
                  >
                    <RotateCcw size={14} /> Reset Counter
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 size={14} /> Edit Series
                  </button>
                </>
              ) : null}
            </div>
          </header>

          <div className="details-grid">
            <div className="detail-item">
              <span>Target Entity</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.entity || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, entity: e.target.value }))}
                />
              ) : (
                <strong>{series.entity}</strong>
              )}
            </div>

            <div className="detail-item">
              <span>Prefix Pattern</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.prefix || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prefix: e.target.value }))}
                />
              ) : (
                <code>{series.prefix}</code>
              )}
            </div>

            <div className="detail-item">
              <span>Suffix Pattern</span>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="Optional suffix"
                  value={formData.suffix || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, suffix: e.target.value }))}
                />
              ) : (
                <strong>{series.suffix || "—"}</strong>
              )}
            </div>

            <div className="detail-item">
              <span>Current Sequence Counter</span>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={formData.currentNumber !== undefined ? formData.currentNumber : 0}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentNumber: e.target.value }))}
                />
              ) : (
                <strong>{series.currentNumber}</strong>
              )}
            </div>

            <div className="detail-item">
              <span>Next Generated ID</span>
              <strong className="next-value-highlight">{nextVal}</strong>
            </div>

            <div className="detail-item">
              <span>Padding Width (Digits)</span>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.paddingWidth !== undefined ? formData.paddingWidth : 3}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paddingWidth: e.target.value }))}
                />
              ) : (
                <strong>{series.paddingWidth} digits</strong>
              )}
            </div>

            <div className="detail-item">
              <span>Reset Policy</span>
              {isEditing ? (
                <select
                  value={formData.resetFrequency || "Never"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, resetFrequency: e.target.value }))}
                >
                  <option value="Never">Never</option>
                  <option value="Academic Year">Academic Year</option>
                  <option value="Calendar Year">Calendar Year</option>
                  <option value="Monthly">Monthly</option>
                </select>
              ) : (
                <strong>{series.resetFrequency || "Never"}</strong>
              )}
            </div>

            <div className="detail-item">
              <span>Status</span>
              {isEditing ? (
                <select
                  value={formData.active ? "Active" : "Inactive"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.value === "Active" }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              ) : (
                <span className={`status-badge ${series.active ? "is-active" : "is-inactive"}`}>
                  {series.active ? "Active" : "Inactive"}
                </span>
              )}
            </div>
          </div>

          {isEditing ? (
            <footer className="card-edit-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--cms-border)" }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  setFormData(series);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleSave}
              >
                Save
              </button>
            </footer>
          ) : null}
        </section>
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function NumberSeriesPreviewScreen({ seriesList }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [selectedKey, setSelectedKey] = useState(seriesList[0]?.key || "teaching-staff");
  const [count, setCount] = useState(5);

  const active = seriesList.find((s) => s.key === selectedKey || s.id === selectedKey) || seriesList[0];

  const generatedSamples = useMemo(() => {
    if (!active) return [];
    const list = [];
    const current = Number(active.currentNumber || 0);
    for (let i = 1; i <= count; i++) {
      list.push({
        step: i,
        sequenceNum: current + i,
        formatted: formatSeriesNumber(active, current + i),
      });
    }
    return list;
  }, [active, count]);

  const copyAll = () => {
    const text = generatedSamples.map((s) => s.formatted).join("\n");
    navigator.clipboard?.writeText(text);
    setToast(`Copied ${generatedSamples.length} generated sample IDs to clipboard!`);
  };

  return (
    <DashboardLayout
      title="Number Series Preview Generator"
      subtitle="Simulate and test automatic numbering rules in real time."
      breadcrumb={["Home", "Settings", "ID & Number Series", "Preview Generator"]}
    >
      <main className="series-page-container">
        <Link to="/dashboard/settings/number-series" className="cms-back-link">
          <ArrowLeft size={14} /> Back to ID & Number Series
        </Link>

        <section className="preview-simulator-panel">
          <div className="simulator-controls">
            <Field label="Select Number Series">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                {seriesList.map((s) => (
                  <option key={s.id} value={s.key}>
                    {s.name} ({s.module})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Number of Samples to Generate">
              <div style={{ display: "flex", gap: "6px" }}>
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`cms-btn ${count === n ? "cms-btn-primary" : "cms-btn-ghost"}`}
                    style={{ flex: 1, padding: "6px 0", textAlign: "center" }}
                    onClick={() => setCount(n)}
                  >
                    {n} IDs
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {active ? (
            <div className="series-summary-card" style={{ marginBottom: "20px", padding: "16px", background: "var(--cms-subtle)", borderRadius: "8px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--cms-muted)", display: "block" }}>Module</span>
                <strong>{active.module}</strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--cms-muted)", display: "block" }}>Prefix Pattern</span>
                <code className="series-code-badge">{active.prefix}</code>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--cms-muted)", display: "block" }}>Current Sequence Counter</span>
                <strong>{active.currentNumber || 0}</strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--cms-muted)", display: "block" }}>Reset Frequency</span>
                <strong>{active.resetFrequency || "Never"}</strong>
              </div>
            </div>
          ) : null}

          <div className="simulator-results">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Generated Sample IDs ({generatedSamples.length} Items)</h3>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={copyAll}
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Copy size={14} /> Copy All Generated Samples
              </button>
            </div>
            <div className="series-table-wrapper">
              <table className="series-table">
                <thead>
                  <tr>
                    <th>Sample #</th>
                    <th>Next Counter Value</th>
                    <th>Generated Output ID Code</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedSamples.map((sample) => (
                    <tr key={sample.step}>
                      <td>Sample #{sample.step}</td>
                      <td>
                        <span style={{ fontWeight: "600" }}>{sample.sequenceNum}</span>
                      </td>
                      <td>
                        <code className="series-code-badge bold" style={{ fontSize: "14px", color: "var(--cms-primary)", padding: "4px 10px" }}>
                          {sample.formatted}
                        </code>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => {
                            navigator.clipboard?.writeText(sample.formatted);
                            setToast(`Copied ${sample.formatted}`);
                          }}
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function ResetNumberSeriesScreen({ series, onReset }) {
  const navigate = useNavigate();
  const [newCurrent, setNewCurrent] = useState(0);

  if (!series) {
    return (
      <DashboardLayout title="Reset Series" breadcrumb={["Home", "Settings", "ID & Number Series"]}>
        <main className="series-page-container">
          <p>Series not found.</p>
        </main>
      </DashboardLayout>
    );
  }

  const handleConfirm = (e) => {
    e.preventDefault();
    onReset(series.id, Number(newCurrent));
  };

  return (
    <DashboardLayout
      title="Reset Number Series Sequence"
      subtitle={`Reset counter for ${series.name}.`}
      breadcrumb={["Home", "Settings", "ID & Number Series", "Reset Number Series"]}
    >
      <main className="series-page-container">
        <Link to="/dashboard/settings/number-series" className="cms-back-link">
          <ArrowLeft size={14} /> Back to ID & Number Series
        </Link>

        <form className="series-form-card warning-card" onSubmit={handleConfirm}>
          <div className="warning-banner">
            <ShieldAlert size={20} />
            <div>
              <strong>Sequence Reset Warning</strong>
              <p>
                Resetting the counter for <strong>{series.name}</strong> will alter the sequence counter.
                Existing records will not be changed, but future generated IDs will start after this counter.
              </p>
            </div>
          </div>

          <div className="form-grid-2">
            <Field label="Current Counter">
              <input type="number" disabled value={series.currentNumber} />
            </Field>

            <Field label="New Counter Value" required>
              <input
                type="number"
                min="0"
                required
                value={newCurrent}
                onChange={(e) => setNewCurrent(e.target.value)}
              />
              <small className="field-help">Next generated ID will be {Number(newCurrent) + 1}.</small>
            </Field>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => navigate("/dashboard/settings/number-series")}
            >
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary">
              Confirm Sequence Reset
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

