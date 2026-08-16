import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./StudentManagementPage.css";

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;
const value = (source, ...keys) => keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null && item !== "");
const collection = (payload, ...keys) => keys.map((key) => unwrap(payload)?.[key]).find(Array.isArray) || [];

export default function StudentProfilePage({ id }) {
  const [student, setStudent] = useState(null);
  const [dashboard, setDashboard] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([apiClient.get(apiEndpoints.students.getProfile(id)), apiClient.get(apiEndpoints.students.getDashboard(id)).catch(() => ({ data: {} }))])
      .then(([profileResponse, dashboardResponse]) => {
        if (!active) return;
        const profile = unwrap(profileResponse.data);
        const status = value(profile, "status", "isActive");
        setStudent({
          name: value(profile, "fullName", "studentName", "name") || "Student",
          admissionNo: value(profile, "admissionNo", "admissionNumber") || "—",
          roll: value(profile, "rollNo", "rollNumber", "roll") || "—",
          gender: value(profile, "gender") || "—",
          mobile: value(profile, "mobileNumber", "mobile", "phoneNumber") || "—",
          father: value(profile, "fatherName", "father") || "—",
          group: value(profile, "groupName", "groupCode", "group") || "—",
          level: value(profile, "academicLevelName", "academicLevel", "level") || "—",
          section: value(profile, "sectionName", "sectionCode", "section") || "—",
          status: typeof status === "boolean" ? (status ? "Active" : "Inactive") : status || "Active",
        });
        setDashboard(unwrap(dashboardResponse.data) || {});
      })
      .catch(() => { if (active) setError("Unable to load this student profile."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{error}</div></div></DashboardLayout>;
  if (!student) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">Loading student profile...</div></div></DashboardLayout>;

  const initials = student.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  const payments = collection(dashboard, "feeTransactions", "payments", "transactions");
  const marks = collection(dashboard, "results", "marks", "examinationPerformance");
  const feeAmount = value(dashboard, "totalFee", "feeAmount", "totalPayable") ?? "—";
  const attendance = value(dashboard, "attendancePercentage", "attendance") ?? "—";
  const percentage = value(dashboard, "percentage", "performancePercentage", "aggregatePercentage") ?? "—";
  const pct = (item) => item === "—" ? 0 : Number(item) || 0;

  return <DashboardLayout title={student.name} subtitle={`Admission No ${student.admissionNo}`} breadcrumb={["People", "Students"]} actions={<Link to="/dashboard/students" className="cms-btn cms-btn-ghost">Back to list</Link>}>
    <div className="cms-card" style={{ marginBottom: 16 }}><div className="cms-card-body"><div className="cms-profile-hero"><div className="cms-photo">{initials}</div><div><h2 style={{ margin: "0 0 6px" }}>{student.name}</h2><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span className="cms-badge cms-badge-info">{student.group}</span><span className="cms-badge cms-badge-info">{student.level}</span><span className="cms-badge cms-badge-info">Section {student.section}</span><StatusBadge value={student.status} /></div></div></div></div></div>
    <div className="cms-grid-2" style={{ marginBottom: 16 }}><ProfileCard title="Student Information" items={[["Roll Number", student.roll], ["Gender", student.gender], ["Admission Number", student.admissionNo], ["Mobile", student.mobile], ["Group", student.group], ["Academic Level", student.level]]} /><ProfileCard title="Parent Information" items={[["Father Name", student.father], ["Contact", student.mobile], ["Section", student.section]]} /></div>
    <div className="cms-grid-3" style={{ marginBottom: 16 }}><Metric title="Fee Summary" value={feeAmount === "—" ? feeAmount : `₹${Number(feeAmount).toLocaleString("en-IN")}`} text="Total payable this year" /><Metric title="Attendance Summary" value={`${attendance}${attendance === "—" ? "" : "%"}`} text="Overall present days" progress={pct(attendance)} /><Metric title="Performance Summary" value={`${percentage}${percentage === "—" ? "" : "%"}`} text="Aggregate score" progress={pct(percentage)} /></div>
    <DataCard title="Fee Transactions" headers={["Receipt", "Date", "Amount", "Mode", "Status"]} rows={payments} empty="No fee transactions returned by the dashboard API." render={(payment) => [value(payment, "receipt", "receiptNo", "paymentId") || "—", value(payment, "date", "paymentDate", "paidDate") || "—", value(payment, "amount", "paidAmount") ?? "—", value(payment, "mode", "paymentMode") || "—", <StatusBadge value={value(payment, "status", "paymentStatus") || "—"} />]} />
    <DataCard title="Examination Performance" headers={["Subject", "Internal", "Practical", "External", "Total", "Grade", "Result"]} rows={marks} empty="No examination results returned by the dashboard API." render={(mark) => [value(mark, "subject", "subjectName") || "—", value(mark, "internal", "internalMarks") ?? "—", value(mark, "practical", "practicalMarks") ?? "—", value(mark, "external", "externalMarks") ?? "—", value(mark, "total", "totalMarks") ?? "—", value(mark, "grade") || "—", <StatusBadge value={value(mark, "result", "status") || "—"} />]} />
  </DashboardLayout>;
}

function ProfileCard({ title, items }) { return <div className="cms-card"><div className="cms-card-head"><h2>{title}</h2></div><div className="cms-card-body"><div className="cms-kv">{items.map(([label, item]) => <div key={label}><span>{label}</span><strong>{item}</strong></div>)}</div></div></div>; }
function Metric({ title, value: metricValue, text, progress }) { return <div className="cms-card"><div className="cms-card-head"><h2>{title}</h2></div><div className="cms-card-body"><div className="cms-stat-value">{metricValue}</div><p style={{ color: "var(--cms-muted)", margin: "4px 0 10px" }}>{text}</p>{progress !== undefined ? <div className="cms-progress"><i style={{ width: `${progress}%` }} /></div> : null}</div></div>; }
function DataCard({ title, headers, rows, empty, render }) { return <div className="cms-card" style={{ marginBottom: 16 }}><div className="cms-card-head"><h2>{title}</h2></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id ?? row.paymentId ?? row.resultId ?? index}>{render(row).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}><div className="cms-empty">{empty}</div></td></tr>}</tbody></table></div></div>; }
