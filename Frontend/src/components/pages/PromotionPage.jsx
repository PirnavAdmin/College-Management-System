import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast, ConfirmDialog } from "@/components/common/Ui.jsx";
import { options, students } from "@/data/mockData.js";
import "./PromotionPage.css";

const filterFields = [
  { name: "curYear", label: "Current Academic Year", type: "select", options: options.year },
  { name: "curLevel", label: "Current Academic Level", type: "select", options: options.level },
  { name: "curGroup", label: "Current Group", type: "select", options: options.group },
  { name: "curSection", label: "Current Section", type: "select", options: options.section },
  { name: "toYear", label: "Promote To Academic Year", type: "select", options: options.year },
  { name: "toLevel", label: "Promote To Academic Level", type: "select", options: options.level },
  { name: "toSection", label: "Promote To Section", type: "select", options: options.section },
];

export default function PromotionPage() {
  const [filters, setFilters] = useState({ curYear: "2024-2025", curLevel: "1st Year", curGroup: "MPC", toYear: "2025-2026", toLevel: "2nd Year" });
  const [selected, setSelected] = useState(students.map((s) => s.id));
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState("");

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <DashboardLayout title="Promotion Management" subtitle="Promote students to the next academic level." breadcrumb={["Examinations"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="cms-btn cms-btn-primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600); }}>Load Students</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Students Eligible for Promotion</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="cms-badge cms-badge-info">{selected.length} selected</span>
            <button className="cms-btn cms-btn-ghost" onClick={() => setSelected(students.map((s) => s.id))}>Select All</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setSelected([])}>Clear</button>
          </div>
        </div>
        {loading ? <Loader label="Loading students..." /> : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Select</th><th>Roll Number</th><th>Student Name</th><th>Current Level</th><th>Promote To</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td><input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} /></td>
                    <td className="cms-strong">{s.roll}</td>
                    <td>{s.name}</td>
                    <td>{s.level}</td>
                    <td>{filters.toLevel || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={() => setSelected([])}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={() => setConfirm(true)} disabled={!selected.length}>Promote Students</button>
        </div>
      </div>

      {confirm ? (
        <ConfirmDialog
          title="Confirm promotion"
          message={`Promote ${selected.length} students to ${filters.toLevel || "the next level"}?`}
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); setToast("Students promoted successfully"); }}
        />
      ) : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


