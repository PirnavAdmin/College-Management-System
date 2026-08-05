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
      <Card>
        <EmptyState title="No live dashboard data yet" message="Dashboard widgets are ready for backend statistics." />
      </Card>
    </section>
  );
}
