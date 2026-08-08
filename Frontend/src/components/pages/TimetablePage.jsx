import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, FormModal, Loader, Toast } from "@/components/common/Ui.jsx";
import { options, timetableGrid } from "@/data/mockData.js";

const filterFields = [
  { name: "board", label: "Board", type: "select", options: options.board },
  { name: "year", label: "Academic Year", type: "select", options: options.year },
  { name: "level", label: "Academic Level", type: "select", options: options.level },
  { name: "group", label: "Group", type: "select", options: options.group },
  { name: "section", label: "Section", type: "select", options: options.section },
];

const periodFields = [
  { name: "day", label: "Day", type: "select", options: timetableGrid.days, required: true },
  { name: "period", label: "Period", type: "select", options: timetableGrid.periods, required: true },
  { name: "subject", label: "Subject", type: "select", options: options.subject, required: true },
  { name: "faculty", label: "Faculty", type: "select", options: options.faculty, required: true },
  { name: "room", label: "Room", required: true },
];

export default function TimetablePage() {
  const [filters, setFilters] = useState({ board: "BIEAP", year: "2024-2025", level: "1st Year", group: "MPC", section: "Section A" });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <DashboardLayout
      title="Timetable Management"
      subtitle="Weekly class timetable with subject, faculty and room allocation."
      breadcrumb={["Operations"]}
      actions={<button className="cms-btn cms-btn-primary" onClick={() => setAdding(true)}>Add Period</button>}
    >
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="cms-btn cms-btn-primary" onClick={load}>Load Timetable</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Weekly Timetable</h2><span className="cms-badge cms-badge-info">{filters.group || "All"} • {filters.section || "All"}</span></div>
        {loading ? <Loader label="Loading timetable..." /> : (
          <div className="cms-table-wrap" style={{ padding: 12 }}>
            <table className="cms-tt">
              <thead>
                <tr>
                  <th>Day / Period</th>
                  {timetableGrid.periods.map((p) => <th key={p}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {timetableGrid.days.map((day) => (
                  <tr key={day}>
                    <td className="cms-tt-day">{day}</td>
                    {timetableGrid.cells[day].map((cell, i) => {
                      const [subject, faculty, room] = cell.split("|");
                      const empty = subject === "-";
                      return (
                        <td key={day + i} className={empty ? "empty" : ""}>
                          <strong>{empty ? "Free" : subject}</strong>
                          {!empty ? <span>{faculty} • {room}</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding ? (
        <FormModal
          title="Add Timetable Period"
          fields={periodFields}
          initial={{}}
          onCancel={() => setAdding(false)}
          onSave={() => { setAdding(false); setToast("Timetable period saved successfully"); }}
        />
      ) : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


