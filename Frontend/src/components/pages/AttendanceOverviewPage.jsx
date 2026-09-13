import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronDown, Download } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./AttendancePage.css";

const STUDENT_MONTHS = [
  ["June", 22, 20, 1, 1, "90.9%"], ["July", 26, 24, 2, 0, "92.3%"],
  ["August", 25, 22, 2, 1, "88.0%"], ["September", 24, 23, 1, 0, "95.8%"],
  ["October", 23, 20, 2, 1, "87.0%"],
  ["November", 24, 22, 1, 1, "91.7%"], ["December", 20, 18, 1, 1, "90.0%"],
  ["January", 25, 23, 1, 1, "92.0%"], ["February", 21, 19, 1, 1, "90.5%"],
  ["March", 10, 7, 2, 1, "70.0%"],
];
const STAFF_MONTHS = [
  ["June", 24, 22, 1, 1, "91.7%"], ["July", 26, 25, 0, 1, "96.2%"], ["August", 25, 22, 1, 2, "88.0%"],
];
function Metric({ label, value }) {
  return <article className="att-overview-metric"><span>{label}</span><strong>{value}</strong></article>;
}

function AttendanceMetric({ percentage, present, total }) {
  return <article className="att-overview-metric att-overview-attendance-metric">
    <span className="att-overview-ring" style={{ "--attendance-progress": `${percentage}%` }}><b>{percentage}%</b></span>
    <div><span>Attendance %</span><strong>★ Excellent</strong><small>{present} of {total} days</small></div>
  </article>;
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  return <div className="att-overview-export">
    <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setOpen((current) => !current)}>
      <Download size={16} /> Export <ChevronDown size={14} />
    </button>
    {open && <div role="menu"><button type="button">Export Excel</button><button type="button">Export PDF</button></div>}
  </div>;
}

export default function AttendanceOverviewPage() {
  const { area, staffId, studentId } = useParams();
  const staff = area === "staff" || Boolean(staffId);
  // TODO: Replace static overview data with backend attendance overview API when available.
  const [month, setMonth] = useState("All Months");
  const title = staff ? "Staff Attendance Overview" : "Student Attendance Overview";
  const backPath = staff ? "/dashboard/attendance/staff" : "/dashboard/attendance/student";
  const months = staff ? STAFF_MONTHS : STUDENT_MONTHS;
  const visibleMonths = month === "All Months" ? months : months.filter(([name]) => `${name} 2026` === month);

  return <DashboardLayout title={title} subtitle="Academic Year: 2026–2027" breadcrumb={["Operations", "Attendance", title]}>
    <main className="attendance-module att-overview-page" data-overview-id={staff ? staffId : studentId}>
      <Link className="cms-back-link" to={backPath}>← Back to {staff ? "Staff" : "Student"} Attendance</Link>
      <section className="att-card att-overview-card">
        <header className="att-overview-head"><h3>{staff ? "Staff Information" : "Student Information"}</h3></header>
        {staff ? <div className="att-overview-info-grid">
          <div><span>Staff ID</span><strong>EMP-0012</strong></div><div><span>Staff Name</span><strong>Ravi Kumar</strong></div>
          <div><span>Department</span><strong>Mathematics</strong></div><div><span>Designation</span><strong>Lecturer</strong></div><div><span>Staff Type</span><strong>Teaching Staff</strong></div>
        </div> : <><div className="att-overview-student"><span className="att-overview-photo">N</span><div><span>Student Name</span><strong>Nikhitha</strong></div><div><span>Roll No</span><strong>MPC-101</strong></div><div><span>Admission No</span><strong>ADM-2026-001</strong></div></div>
          <div className="att-overview-info-grid"><div><span>Academic Level</span><strong>1st Year</strong></div><div><span>Group</span><strong>MPC</strong></div><div><span>Program</span><strong>Regular</strong></div><div><span>Section</span><strong>A</strong></div></div></>}
      </section>

      <section className="att-overview-section"><h3>{staff ? "Yearly Summary" : "Yearly Attendance Summary"}</h3><div className="att-overview-metrics">
        {staff ? <><Metric label="Working Days" value="240" /><Metric label="Present" value="221" /><Metric label="Absent" value="7" /><Metric label="Leave" value="12" /><AttendanceMetric percentage="92.1" present="221" total="240" /></> : <><Metric label="Total Working Days" value="220" /><Metric label="Present" value="198" /><Metric label="Absent" value="14" /><Metric label="Leave" value="8" /><Metric label="Late" value="3" /><AttendanceMetric percentage="90" present="198" total="220" /></>}
      </div></section>

      <section className="att-card att-overview-records-card">
        <header className="att-overview-record-head"><h3>Attendance Records</h3><ExportMenu /></header>
        <label className="att-overview-month-selector"><CalendarDays size={17} /><select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Attendance month"><option>All Months</option>{months.map(([name]) => <option key={name}>{name} 2026</option>)}</select></label>
        <div className="att-scroll"><table className="cms-table"><thead><tr><th>Month</th><th>Working Days</th><th>Present</th><th>Absent</th><th>Leave</th><th>Attendance %</th></tr></thead><tbody>{visibleMonths.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div>
      </section>
    </main>
  </DashboardLayout>;
}
