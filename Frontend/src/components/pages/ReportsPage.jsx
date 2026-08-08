import { useState } from "react";
import { Users, GraduationCap, Wallet, AlertCircle, FileSpreadsheet, Award, Briefcase, Percent, Trophy, CalendarCheck } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader } from "@/components/common/Ui.jsx";
import { options, admissionTrend, feeTrend, students } from "@/data/mockData.js";

const filterFields = [
  { name: "board", label: "Board", type: "select", options: options.board },
  { name: "year", label: "Academic Year", type: "select", options: options.year },
  { name: "level", label: "Academic Level", type: "select", options: options.level },
  { name: "group", label: "Group", type: "select", options: options.group },
  { name: "section", label: "Section", type: "select", options: options.section },
  { name: "from", label: "From Date", type: "date" },
  { name: "to", label: "To Date", type: "date" },
];

const cards = [
  { label: "Admissions", value: "702", icon: GraduationCap, tone: "blue" },
  { label: "Attendance", value: "91.4%", icon: CalendarCheck, tone: "green" },
  { label: "Fee Collection", value: "₹1.62 Cr", icon: Wallet, tone: "violet" },
  { label: "Due Fees", value: "₹18.4 L", icon: AlertCircle, tone: "amber" },
  { label: "Examinations", value: "12", icon: FileSpreadsheet, tone: "blue" },
  { label: "Results Published", value: "9", icon: Award, tone: "green" },
  { label: "Faculty Workload", value: "22 hrs/wk", icon: Briefcase, tone: "violet" },
  { label: "Student Strength", value: "1,482", icon: Users, tone: "blue" },
  { label: "Pass Percentage", value: "94.2%", icon: Percent, tone: "green" },
  { label: "Toppers Identified", value: "18", icon: Trophy, tone: "amber" },
];

const attendanceTrend = [
  { month: "Jun", attendance: 92 }, { month: "Jul", attendance: 94 }, { month: "Aug", attendance: 89 },
  { month: "Sep", attendance: 91 }, { month: "Oct", attendance: 93 }, { month: "Nov", attendance: 90 },
];

export default function ReportsPage() {
  const [filters, setFilters] = useState({ board: "BIEAP", year: "2024-2025" });
  const [loading, setLoading] = useState(false);
  const toppers = [...students].sort((a, b) => b.percentage - a.percentage).slice(0, 5);

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Institution-wide insights across academics, fees and attendance." breadcrumb={["Administration"]}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field key={f.name} field={f} value={filters[f.name]} onChange={(n, v) => setFilters((p) => ({ ...p, [n]: v }))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="cms-btn cms-btn-primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 700); }}>Generate Report</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cms-card"><Loader label="Generating analytics..." /></div>
      ) : (
        <>
          <div className="cms-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div className="cms-stat" key={c.label}>
                  <span className={`cms-stat-icon tone-${c.tone}`}><Icon size={20} /></span>
                  <div>
                    <div className="cms-stat-label">{c.label}</div>
                    <div className="cms-stat-value">{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cms-grid-2" style={{ marginBottom: 16 }}>
            <div className="cms-card">
              <div className="cms-card-head"><h2>Admissions vs Target</h2></div>
              <div className="cms-card-body" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={admissionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip /><Legend />
                    <Area type="monotone" dataKey="admissions" stroke="#1d4ed8" fill="#dbe6ff" />
                    <Area type="monotone" dataKey="target" stroke="#94a3b8" fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="cms-card">
              <div className="cms-card-head"><h2>Attendance Trend (%)</h2></div>
              <div className="cms-card-body" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[80, 100]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="attendance" stroke="#0f9d58" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="cms-grid-2">
            <div className="cms-card">
              <div className="cms-card-head"><h2>Fee Collected vs Due (₹ Lakh)</h2></div>
              <div className="cms-card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey="collected" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="due" fill="#f5c26b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="cms-card">
              <div className="cms-card-head"><h2>Toppers</h2></div>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead><tr><th>Rank</th><th>Student</th><th>Group</th><th>Percentage</th></tr></thead>
                  <tbody>
                    {toppers.map((s, i) => (
                      <tr key={s.id}>
                        <td className="cms-strong">#{i + 1}</td><td>{s.name}</td><td>{s.group}</td><td>{s.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}


