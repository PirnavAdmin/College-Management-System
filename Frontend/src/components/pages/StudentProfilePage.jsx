import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import { students, feeCollections, results } from "@/data/mockData.js";
import "./StudentManagementPage.css";

export default function StudentProfilePage({ id }) {
  const student = students.find((s) => String(s.id) === String(id)) || students[0];
  const initials = student.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const payments = feeCollections.filter((f) => f.student === student.name);
  const marks = results.filter((r) => r.name === student.name);

  return (
    <DashboardLayout title={student.name} subtitle={`Admission No ${student.admissionNo}`} breadcrumb={["People", "Students"]}
      actions={<Link to="/dashboard/students" className="cms-btn cms-btn-ghost">Back to list</Link>}>
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-profile-hero">
            <div className="cms-photo">{initials}</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h2 style={{ margin: "0 0 6px" }}>{student.name}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="cms-badge cms-badge-info">{student.group}</span>
                <span className="cms-badge cms-badge-info">{student.level}</span>
                <span className="cms-badge cms-badge-info">Section {student.section}</span>
                <StatusBadge value={student.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cms-grid-2" style={{ marginBottom: 16 }}>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Student Information</h2></div>
          <div className="cms-card-body">
            <div className="cms-kv">
              <div><span>Roll Number</span><strong>{student.roll}</strong></div>
              <div><span>Gender</span><strong>{student.gender}</strong></div>
              <div><span>Admission Number</span><strong>{student.admissionNo}</strong></div>
              <div><span>Mobile</span><strong>{student.mobile}</strong></div>
              <div><span>Group</span><strong>{student.group}</strong></div>
              <div><span>Academic Level</span><strong>{student.level}</strong></div>
            </div>
          </div>
        </div>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Parent Information</h2></div>
          <div className="cms-card-body">
            <div className="cms-kv">
              <div><span>Father Name</span><strong>{student.father}</strong></div>
              <div><span>Contact</span><strong>{student.mobile}</strong></div>
              <div><span>Occupation</span><strong>Business</strong></div>
              <div><span>Guardian</span><strong>{student.father}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div className="cms-grid-3" style={{ marginBottom: 16 }}>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Fee Summary</h2></div>
          <div className="cms-card-body">
            <div className="cms-stat-value">₹45,000</div>
            <p style={{ color: "var(--cms-muted)", margin: "4px 0 10px" }}>Total payable this year</p>
            <StatusBadge value={student.fee} />
          </div>
        </div>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Attendance Summary</h2></div>
          <div className="cms-card-body">
            <div className="cms-stat-value">{student.attendance}%</div>
            <p style={{ color: "var(--cms-muted)", margin: "4px 0 10px" }}>Overall present days</p>
            <div className="cms-progress"><i style={{ width: `${student.attendance}%` }} /></div>
          </div>
        </div>
        <div className="cms-card">
          <div className="cms-card-head"><h2>Performance Summary</h2></div>
          <div className="cms-card-body">
            <div className="cms-stat-value">{student.percentage}%</div>
            <p style={{ color: "var(--cms-muted)", margin: "4px 0 10px" }}>Aggregate score</p>
            <div className="cms-progress"><i style={{ width: `${student.percentage}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-head"><h2>Fee Transactions</h2></div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th></tr></thead>
            <tbody>
              {payments.length ? payments.map((p) => (
                <tr key={p.id}>
                  <td className="cms-strong">{p.receipt}</td><td>{p.date}</td>
                  <td>₹{p.amount.toLocaleString("en-IN")}</td><td>{p.mode}</td>
                  <td><StatusBadge value={p.status} /></td>
                </tr>
              )) : <tr><td colSpan={5}><div className="cms-empty">No transactions recorded.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Examination Performance</h2></div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr><th>Subject</th><th>Internal</th><th>Practical</th><th>External</th><th>Total</th><th>Grade</th><th>Result</th></tr></thead>
            <tbody>
              {marks.length ? marks.map((m) => (
                <tr key={m.id + m.subject}>
                  <td className="cms-strong">{m.subject}</td><td>{m.internal}</td><td>{m.practical}</td>
                  <td>{m.external}</td><td>{m.total}</td><td>{m.grade}</td>
                  <td><StatusBadge value={m.result} /></td>
                </tr>
              )) : <tr><td colSpan={7}><div className="cms-empty">No results published yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}




