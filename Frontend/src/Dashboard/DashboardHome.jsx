import { FiAward, FiBookOpen, FiCalendar, FiCreditCard, FiGrid, FiUsers } from "react-icons/fi";
import Card from "../shared/components/Card";
import EmptyState from "../shared/components/EmptyState";
import PageHeader from "../shared/components/PageHeader";
import StatCard from "../shared/components/StatCard";
import "./DashboardHome.css";

const stats = [
  ["Boards", 0, FiAward],
  ["Academic Years", 0, FiCalendar],
  ["Groups", 0, FiGrid],
  ["Subjects", 0, FiBookOpen],
  ["Faculty", 0, FiUsers],
  ["Students", 0, FiUsers],
  ["Attendance", 0, FiCalendar],
  ["Fees", 0, FiCreditCard],
];

export default function DashboardHome() {
  return (
    <section className="dashboardHome">
      <PageHeader title="Dashboard" subtitle="Administrative overview for the Intermediate College Management System." />
      <div className="stat-grid">
        {stats.map(([label, value, Icon]) => (
          <StatCard key={label} label={label} value={value} icon={<Icon />} />
        ))}
      </div>
      <div className="dashboard-widgets">
        <div className="widget widget-chart">
          <h3>Student Admission Graph</h3>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="line-chart">
              <path className="line-chart-path" d="M0,90 L60,78 L120,60 L180,48 L240,36 L300,40 L360,28 L420,50 L480,34 L540,22 L600,18" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="chart-legend">Revenue (in 000s)</div>
          </div>
        </div>
        <div className="widget widget-side">
          <div className="mini-chart">
            <h4>Top Subjects</h4>
            <ul className="bars">
              <li><span className="label">Mathematics</span><span className="bar" style={{ width: '78%' }} /><span className="value">78%</span></li>
              <li><span className="label">Physics</span><span className="bar" style={{ width: '62%' }} /><span className="value">62%</span></li>
              <li><span className="label">Chemistry</span><span className="bar" style={{ width: '54%' }} /><span className="value">54%</span></li>
            </ul>
          </div>
          <div className="recent-table">
            <h4>Recent Activities</h4>
            <table>
              <thead>
                <tr><th>Time</th><th>Activity</th><th>User</th></tr>
              </thead>
              <tbody>
                <tr><td>10:12</td><td>New student admission</td><td>Admin</td></tr>
                <tr><td>09:40</td><td>Added subject: Biology</td><td>Faculty</td></tr>
                <tr><td>08:30</td><td>Timetable updated</td><td>Scheduler</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
