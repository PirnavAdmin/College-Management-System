import { useState } from "react";
import { Eye } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { mockLeaveRequests } from "@/data/attendanceMockData.js";
import "./LeaveManagementPage.css";

const Field = ({ label, children }) => <label className="att-field"><span>{label}</span>{children}</label>;

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState(mockLeaveRequests);
  const [selected, setSelected] = useState(null);
  const [remark, setRemark] = useState("");
  const [toast, setToast] = useState("");

  const review = (status) => {
    setRequests(requests.map((request) => request.id === selected.id ? {
      ...request,
      status,
      adminRemark: remark,
      reviewedBy: "Admin",
      reviewedOn: new Date().toLocaleDateString("en-IN"),
    } : request));
    setSelected(null);
    setToast(`Leave request ${status.toLowerCase()}.`);
  };

  return <>
    <DashboardLayout title="Leave Management" subtitle="Review and manage staff leave requests" breadcrumb={["Operations", "Leave Management"]}>
      <main className="attendance-module">
        <section className="att-summary att-leave-summary">
          {["Total Requests", "Pending", "Approved", "Rejected"].map((label) => <div key={label}>
            <span>{label}</span>
            <b>{label === "Total Requests" ? requests.length : requests.filter((request) => request.status === label).length}</b>
          </div>)}
        </section>

        <section className="att-card att-table-card">
          <div className="att-scroll">
            <table className="cms-table">
              <thead><tr>{["Request ID", "Staff Name", "Department", "Staff Type", "Leave Type", "From Date", "To Date", "Days", "Reason", "Status", "Action"].map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>{requests.length ? requests.map((request) => <tr key={request.id}>
                <td>LR-{String(request.id).padStart(3, "0")}</td>
                <td>{request.staffName}</td>
                <td>{request.department}</td>
                <td>{request.staffType}</td>
                <td>{request.leaveType}</td>
                <td>{request.fromDate}</td>
                <td>{request.toDate}</td>
                <td>{request.days}</td>
                <td>{request.reason}</td>
                <td><span className="att-status">{request.status}</span></td>
                <td><button className="cms-action-btn" onClick={() => { setSelected(request); setRemark(request.adminRemark || ""); }} title="View request" aria-label="View request"><Eye size={16} /></button></td>
              </tr>) : <tr><td colSpan="11"><div className="cms-empty">No leave requests are available.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      </main>
    </DashboardLayout>

    {selected && <Modal title="Leave Request Details" onClose={() => setSelected(null)} footer={selected.status === "Pending" ? <><button className="cms-btn cms-btn-ghost" onClick={() => review("Rejected")}>Reject</button><button className="cms-btn cms-btn-primary" onClick={() => review("Approved")}>Approve Request</button></> : <button className="cms-btn cms-btn-primary" onClick={() => setSelected(null)}>Close</button>}>
      <div className="att-modal-fields">
        <p><b>{selected.staffName}</b> · {selected.staffId}</p>
        <p>{selected.department} · {selected.staffType}</p>
        <p>{selected.leaveType}: {selected.fromDate} to {selected.toDate} ({selected.days} days)</p>
        <p>Reason: {selected.reason}</p>
        <p>Current Status: <b>{selected.status}</b></p>
        <Field label="Admin Remark"><textarea value={remark} disabled={selected.status !== "Pending"} onChange={(event) => setRemark(event.target.value)} /></Field>
        {selected.status !== "Pending" && <p>Reviewed By: {selected.reviewedBy || "Admin"} · Reviewed On: {selected.reviewedOn || "02-Sep-2026"}</p>}
      </div>
    </Modal>}
    <Toast message={toast} onClose={() => setToast("")} />
  </>;
}
