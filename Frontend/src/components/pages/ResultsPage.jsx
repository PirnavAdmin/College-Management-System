import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, StatusBadge, Toast, ConfirmDialog } from "@/components/common/Ui.jsx";
import { results, options, examinations } from "@/data/mockData.js";

const filterFields = [
  { name: "board", label: "Board", type: "select", options: options.board },
  { name: "year", label: "Academic Year", type: "select", options: options.year },
  { name: "level", label: "Academic Level", type: "select", options: options.level },
  { name: "group", label: "Group", type: "select", options: options.group },
  { name: "exam", label: "Exam", type: "select", options: examinations.map((e) => e.name) },
  { name: "publishDate", label: "Publish Date", type: "date" },
];

export default function ResultsPage() {
  const [filters, setFilters] = useState({ board: "BIEAP", group: "MPC", publishDate: "2025-01-30" });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  const rows = results.filter((r) => `${r.name} ${r.roll} ${r.subject}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <DashboardLayout title="Result Processing" subtitle="Process and publish examination results." breadcrumb={["Examinations"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600); }}>
              Process Results
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setConfirm(true)}>Publish Results</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-toolbar">
          <div className="cms-search">
            <input value={query} placeholder="Search student results..." onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="cms-toolbar-right">
            <span className="cms-badge cms-badge-active">Pass: {results.filter((r) => r.result === "Pass").length}</span>
            <span className="cms-badge cms-badge-danger">Fail: {results.filter((r) => r.result === "Fail").length}</span>
          </div>
        </div>
        {loading ? <Loader label="Processing results..." /> : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr><th>Student Name</th><th>Roll Number</th><th>Subject</th><th>Internal</th><th>Practical</th><th>External</th><th>Total</th><th>Grade</th><th>Result</th></tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id + r.subject}>
                    <td className="cms-strong">{r.name}</td><td>{r.roll}</td><td>{r.subject}</td>
                    <td>{r.internal}</td><td>{r.practical}</td><td>{r.external}</td><td>{r.total}</td><td>{r.grade}</td>
                    <td><StatusBadge value={r.result} /></td>
                  </tr>
                )) : <tr><td colSpan={9}><div className="cms-empty">No results found.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirm ? (
        <ConfirmDialog
          title="Publish results"
          message="Published results become visible to students and parents. Continue?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); setToast("Results published successfully"); }}
        />
      ) : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


