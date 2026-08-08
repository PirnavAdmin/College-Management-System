import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { attendanceRoster, options } from "@/data/mockData.js";
import "./AttendancePage.css";

const marks = ["Present", "Absent", "Late", "Leave"];

const filterFields = [
  { name: "date", label: "Date", type: "date" },
  { name: "board", label: "Board", type: "select", options: options.board },
  { name: "year", label: "Academic Year", type: "select", options: options.year },
  { name: "level", label: "Academic Level", type: "select", options: options.level },
  { name: "group", label: "Group", type: "select", options: options.group },
  { name: "section", label: "Section", type: "select", options: options.section },
  { name: "subject", label: "Subject", type: "select", options: options.subject },
  { name: "faculty", label: "Faculty", type: "select", options: options.faculty },
];

export default function AttendancePage() {
  const [filters, setFilters] = useState({ date: "2025-01-15", board: "BIEAP", group: "MPC", section: "Section A" });
  const [rows, setRows] = useState(attendanceRoster);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const setMark = (id, mark) => setRows((r) => r.map((x) => (x.id === id ? { ...x, mark } : x)));
  const markAll = () => { setRows((r) => r.map((x) => ({ ...x, mark: "Present" }))); setToast("All students marked present"); };
  const load = () => { setLoading(true); setTimeout(() => setLoading(false), 600); };
  const save = () => { setSaving(true); setTimeout(() => { setSaving(false); setToast("Attendance saved successfully"); }, 600); };

  const summary = marks.map((m) => ({ m, n: rows.filter((r) => r.mark === m).length }));

  return (
    <DashboardLayout title="Attendance Management" subtitle="Mark daily subject-wise attendance." breadcrumb={["Operations"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={load}>Load Students</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Student Attendance</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {summary.map((s) => <span key={s.m} className="cms-badge cms-badge-info">{s.m}: {s.n}</span>)}
            <button className="cms-btn cms-btn-ghost" onClick={markAll}>Mark All Present</button>
          </div>
        </div>
        {loading ? <Loader label="Loading students..." /> : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Roll Number</th><th>Student Name</th><th>Attendance</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    <td>
                      <div className="cms-radio-row">
                        {marks.map((m) => (
                          <label key={m} className={`cms-radio ${r.mark === m ? `on-${m.toLowerCase()}` : ""}`}>
                            <input type="radio" name={`att-${r.id}`} checked={r.mark === m} onChange={() => setMark(r.id, m)} />
                            {m}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={() => setRows(attendanceRoster)}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Attendance"}</button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


