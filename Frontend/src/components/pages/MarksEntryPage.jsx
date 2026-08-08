import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { marks as marksData, options, examinations } from "@/data/mockData.js";
import "./MarksEntryPage.css";

const filterFields = [
  { name: "board", label: "Board", type: "select", options: options.board },
  { name: "year", label: "Academic Year", type: "select", options: options.year },
  { name: "level", label: "Academic Level", type: "select", options: options.level },
  { name: "group", label: "Group", type: "select", options: options.group },
  { name: "section", label: "Section", type: "select", options: options.section },
  { name: "exam", label: "Exam", type: "select", options: examinations.map((e) => e.name) },
  { name: "subject", label: "Subject", type: "select", options: options.subject },
];

export default function MarksEntryPage() {
  const [filters, setFilters] = useState({ board: "BIEAP", group: "MPC", section: "Section A", subject: "Physics" });
  const [rows, setRows] = useState(marksData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const update = (id, key, value) => {
    const num = value === "" ? "" : Math.max(0, Number(value) || 0);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: num } : x)));
  };
  const total = (r) => Number(r.internal || 0) + Number(r.practical || 0) + Number(r.theory || 0);

  return (
    <DashboardLayout title="Marks Entry" subtitle="Enter internal, practical and theory marks." breadcrumb={["Examinations"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="cms-btn cms-btn-primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600); }}>
              Load Students
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Student Marks</h2><span className="cms-badge cms-badge-info">{rows.length} students</span></div>
        {loading ? <Loader label="Loading marks sheet..." /> : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Roll Number</th><th>Student Name</th><th>Internal</th><th>Practical</th><th>Theory</th><th>Total</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    {["internal", "practical", "theory"].map((k) => (
                      <td key={k}>
                        <input className="cms-mini-input" style={{ border: "1px solid var(--cms-border)", borderRadius: 8, padding: "6px 10px" }}
                          type="number" value={r[k]} onChange={(e) => update(r.id, k, e.target.value)} />
                      </td>
                    ))}
                    <td className="cms-strong">{total(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={() => setRows(marksData)}>Cancel</button>
          <button className="cms-btn cms-btn-primary" disabled={saving}
            onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); setToast("Marks saved successfully"); }, 600); }}>
            {saving ? "Saving..." : "Save Marks"}
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


