import { Link } from "react-router-dom";
import { Users, GraduationCap, Wallet, AlertCircle, ArrowUpRight, CalendarClock } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import { dashboardStats, admissionTrend, feeTrend, groupDistribution, students, examSchedule } from "@/data/mockData.js";
import "./DashboardPage.css";

const icons = [GraduationCap, Users, Wallet, AlertCircle];
const pieColors = ["#1d4ed8", "#60a5fa", "#6d28d9", "#0f9d58"];

export default function DashboardPage() {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Institution overview for academic year 2024-2025."
      actions={
        <>
          <Link to="/dashboard/admission" className="cms-btn cms-btn-ghost">New Admission</Link>
          <Link to="/dashboard/reports" className="cms-btn cms-btn-primary">
            <ArrowUpRight size={16} /> View Reports
          </Link>
        </>
      }
    >
      <div className="cms-stat-grid">
        {dashboardStats.map((s, i) => {
          const Icon = icons[i];
          return (
            <div className="cms-stat" key={s.label}>
              <span className={`cms-stat-icon tone-${s.tone}`}><Icon size={20} /></span>
              <div>
                <div className="cms-stat-label">{s.label}</div>
                <div className="cms-stat-value">{s.value}</div>
                <div className={`cms-stat-delta ${s.delta.startsWith("-") ? "down" : ""}`}>{s.delta} vs last term</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cms-grid-2" style={{ marginBottom: 16 }}>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Admissions Trend</h2><span className="cms-badge cms-badge-info">2024-2025</span></div>
          <div className="cms-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={admissionTrend}>
                <defs>
                  <linearGradient id="ad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="admissions" stroke="#1d4ed8" strokeWidth={2} fill="url(#ad)" />
                <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-card-head"><h2>Group Distribution</h2></div>
          <div className="cms-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={groupDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {groupDistribution.map((e, i) => <Cell key={e.name} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cms-grid-2">
        <div className="cms-card">
          <div className="cms-card-head"><h2>Recent Students</h2><Link to="/dashboard/students" className="cms-btn cms-btn-ghost">View all</Link></div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr><th>Admission No</th><th>Name</th><th>Group</th><th>Attendance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {students.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td className="cms-strong">{s.admissionNo}</td>
                    <td>{s.name}</td>
                    <td>{s.group}</td>
                    <td>{s.attendance}%</td>
                    <td><StatusBadge value={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-card-head"><h2>Fee Collection (₹ Lakh)</h2></div>
          <div className="cms-card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="collected" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="due" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cms-card" style={{ marginTop: 16 }}>
        <div className="cms-card-head">
          <h2><CalendarClock size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Upcoming Examinations</h2>
          <Link to="/dashboard/examinations" className="cms-btn cms-btn-ghost">Manage</Link>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Invigilator</th><th>Status</th></tr></thead>
            <tbody>
              {examSchedule.map((e) => (
                <tr key={e.id}>
                  <td className="cms-strong">{e.subject}</td>
                  <td>{e.date}</td><td>{e.time}</td><td>{e.hall}</td><td>{e.invigilator}</td>
                  <td><StatusBadge value={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}



