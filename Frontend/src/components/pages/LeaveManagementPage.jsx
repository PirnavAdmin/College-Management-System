import { useMemo, useState, useEffect } from "react";
import { CalendarDays, CheckCircle2, Clock3, Eye, FileText, History as HistoryIcon, Search, ShieldCheck, UserRound, UsersRound, XCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { 
  getLeaveRequests, 
  getLeaveDetails, 
  reviewLeaveRequest, 
  getLeaveHistorySummary, 
  getLeaveHistory, 
  getAffectedClasses, 
  getEligibleSubstitutes, 
  assignSubstitutes 
} from "@/features/leave/services/leaveStore.js";
import "./LeaveManagementPage.css";

const Field = ({ label, children }) => <label className="att-field"><span>{label}</span>{children}</label>;

const prettyDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const manage = (request) => request.status === "Approved" && request.staffType === "Teaching Staff";

function LeaveStatus({ status }) {
  const normalized = String(status).toLowerCase();
  const Icon = normalized === "approved" ? CheckCircle2 : normalized === "rejected" ? XCircle : Clock3;
  return <span className={`leave-detail-status ${normalized}`}><Icon size={15} />{status}</span>;
}

function LeaveDetails({ leave, remark, setRemark, onClose, onReview, onAffected }) {
  const pending = getStatusLabel(leave.status) === "Pending";
  const staffName = leave.staffName || leave.facultyName || "";
  const initials = staffName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const balance = leave.balance || null;
  const title = <span className="leave-details-title"><i><FileText size={18} /></i><span>Leave Request Details<small>Complete information about the leave request</small></span></span>;
  const footer = pending ? <><button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button><button className="cms-btn cms-btn-danger" onClick={() => onReview("Rejected")}>Reject</button><button className="cms-btn cms-btn-primary" onClick={() => onReview("Approved")}>Approve</button></> : <><button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>{manage(leave) && <button className="cms-btn cms-btn-primary" onClick={onAffected}><UsersRound size={16} /> View Affected Classes</button>}</>;
  
  return <Modal title={title} className="leave-details-modal" onClose={onClose} footer={footer}>
    <section className="leave-identity-row"><div className="leave-person"><span className="leave-avatar">{initials}</span><div><div className="leave-person-name"><strong>{staffName}</strong><b>{leave.staffId || leave.facultyId}</b></div><span>{leave.department} <i>·</i> {leave.staffType}</span></div></div><div className="leave-type-card"><CalendarDays size={19} /><div><span>Leave Type</span><strong>{leave.leaveType}</strong></div></div></section>
    <section className="leave-date-grid"><div className="leave-detail-card date"><CalendarDays size={17} /><span>From Date</span><strong>{leave.fromDate}</strong></div><div className="leave-detail-card date"><CalendarDays size={17} /><span>To Date</span><strong>{leave.toDate}</strong></div><div className="leave-detail-card days"><Clock3 size={17} /><span>Total Days</span><strong>{leave.days} {Number(leave.days) === 1 ? "day" : "days"}</strong></div></section>
    <section className="leave-reason-status"><div className="leave-detail-panel"><span>Reason</span><strong>{leave.reason || "No reason provided."}</strong></div><div className="leave-detail-panel"><span>Current Status</span><LeaveStatus status={leave.status} /></div></section>
    {balance && <section className="leave-detail-balance"><span>Leave Balance</span><div><b>Total <strong>{balance.total} days</strong></b><b>Used <strong>{balance.used} {balance.used === 1 ? "day" : "days"}</strong></b><b>Remaining <strong>{balance.remaining} days</strong></b></div></section>}
    <section className="leave-remark"><div><FileText size={17} /><strong>Admin Remark</strong></div>{pending ? <Field label="Add a remark"><textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add an optional review remark" /></Field> : <p>{leave.adminRemark || "No remarks added."}</p>}</section>
    {!pending && <section className="leave-reviewed"><UserRound size={16} /><span>Reviewed by <strong>{leave.reviewedBy || "Admin"}</strong></span><i /> <span>Reviewed on <strong>{leave.reviewedOn || "—"}</strong></span></section>}
  </Modal>;
}

function AffectedClasses({ leave, close, assign }) {
  const date = leave.fromDate;
  const [rows, setRows] = useState([]);
  useEffect(() => {
    getAffectedClasses(leave.staffLeaveRequestId || leave.id).then(data => setRows(data)).catch(console.error);
  }, [leave]);
  
  const assigned = rows.filter((row) => row.substitution || row.isAssigned).length;
  
  return <Modal title="Affected Classes" className="leave-affected-modal" onClose={close} footer={<button className="cms-btn cms-btn-ghost" onClick={close}>Close</button>}>
    <div className="leave-context"><div><span>Staff</span><strong>{leave.staffName}</strong></div><div><span>Leave date</span><strong>{prettyDate(date)}</strong></div><div><span>Leave status</span><b className="leave-sub-status assigned">Approved</b></div></div>
    <div className="leave-progress"><div><strong>{assigned} of {rows.length} classes assigned</strong><span>Temporary coverage for {prettyDate(date)}</span></div><div className="leave-progress-track"><i style={{ width: `${rows.length ? assigned / rows.length * 100 : 0}%` }} /></div></div>
    <div className="att-scroll leave-sub-scroll"><table className="cms-table leave-sub-table"><thead><tr>{["Period", "Time", "Program / Group", "Section", "Subject", "Original Faculty", "Status", "Action"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.timetableId || row.id}><td><b>{row.period}</b></td><td>{row.time || row.startTime + " - " + row.endTime}</td><td>{row.program}</td><td>{row.section}</td><td>{row.subject}</td><td>{leave.staffName}</td><td><span className={`leave-sub-status ${row.substitution || row.isAssigned ? "assigned" : "not-assigned"}`}>{row.substitution || row.isAssigned ? "Assigned" : "Not Assigned"}</span></td><td><button className="cms-btn cms-btn-primary leave-compact-btn" onClick={() => assign({ ...row, date, leave })}>{row.substitution || row.isAssigned ? "View" : "Assign"}</button></td></tr>)}</tbody></table></div>
  </Modal>;
}

function Assignment({ item, close, save, toast }) {
  const existing = item.substitution || (item.isAssigned && item.substituteDetails ? { faculty: item.substituteDetails } : null);
  const [candidates, setCandidates] = useState([]);
  useEffect(() => {
    if (!existing) {
      getEligibleSubstitutes(item.leave.staffLeaveRequestId || item.leave.id, item.timetableId || item.id, item.date).then(data => setCandidates(data)).catch(console.error);
    }
  }, [item, existing]);

  const [choice, setChoice] = useState(""); const [checked, setChecked] = useState(false);
  const chosen = candidates.find((person) => person.staffId === choice || person.facultyId === choice || person.id === choice);
  
  const submitAssignment = () => {
     assignSubstitutes(item.leave.staffLeaveRequestId || item.leave.id, {
         timetableId: item.timetableId || item.id,
         substituteStaffId: chosen.staffId || chosen.facultyId || chosen.id,
         date: item.date
     }).then(() => {
         save();
     }).catch(console.error);
  };

  return <Modal title={existing ? "Substitution Assignment" : "Assign Substitute"} className="leave-assignment-modal" onClose={close} footer={<><button className="cms-btn cms-btn-ghost" onClick={close}>Cancel</button>{!existing && <button className="cms-btn cms-btn-primary" disabled={!checked} onClick={submitAssignment}>Confirm Assignment</button>}</>}>
    <section className="leave-assignment-context"><div><span>Subject</span><strong>{item.subject}</strong></div><div><span>Class</span><strong>{item.program} - {item.section}</strong></div><div><span>Date & period</span><strong>{prettyDate(item.date)} · {item.period}</strong></div><div><span>Time</span><strong>{item.time || item.startTime + " - " + item.endTime}</strong></div><div><span>Original faculty</span><strong>{item.leave.staffName}</strong><small>On leave</small></div></section>
    {existing ? <div className="leave-existing"><CheckCircle2 size={20} /><div><strong>{existing.faculty.staffName || existing.faculty.name} is assigned</strong><span>This date-specific override does not change the published timetable.</span></div></div> : <><div className="leave-candidate-head"><div><h4>Eligible substitute faculty</h4><p>Active, subject-qualified faculty who are free this period and not on leave.</p></div><span>{candidates.length} available</span></div>{candidates.length ? <div className="leave-candidates">{candidates.map((person, index) => {
        const id = person.staffId || person.facultyId || person.id;
        return <label className={`leave-candidate ${choice === id ? "selected" : ""}`} key={id}><input type="radio" checked={choice === id} name="substitute" onChange={() => { setChoice(id); setChecked(false); }} /><div><strong>{person.staffName || person.name}</strong><span>{id} · {person.department}</span></div><div className="leave-candidate-checks"><span>✓ Eligible</span><span>✓ Period free</span><span>✓ Not on leave</span></div><div><b>{person.classes || 0}</b><span>classes today</span></div>{index === 0 && <em>Recommended</em>}</label>;
    })}</div> : <div className="cms-empty">No eligible faculty members are available for this class.</div>}{chosen && <div className={`leave-availability ${checked ? "available" : ""}`}><div><ShieldCheck size={18} /><span>{checked ? "Available for substitution" : "Validate the selected faculty before assignment."}</span></div><button className="cms-btn cms-btn-ghost" onClick={() => { setChecked(true); toast(`${chosen.staffName || chosen.name} is available for substitution.`); }}>Check Availability</button></div>}</>}
  </Modal>;
}

function LeaveHistory({ onSelect }) {
  const [historyData, setHistoryData] = useState([]);
  useEffect(() => {
    getLeaveHistorySummary().then(data => setHistoryData(data)).catch(console.error);
  }, []);

  const [staffType, setStaffType] = useState("All Staff"), [query, setQuery] = useState(""), [status, setStatus] = useState("All Status");
  const people = useMemo(() => historyData.filter((person) => (staffType === "All Staff" || person.staffType === staffType) && (`${person.staffName} ${person.staffId} ${person.department}`).toLowerCase().includes(query.toLowerCase())), [historyData, staffType, query]);

  return <main className="attendance-module leave-history-screen"><section className="att-card leave-history-card"><div className="leave-history-filters"><div className="leave-type-toggle">{["All Staff", "Teaching Staff", "Non-Teaching Staff"].map((type) => <button key={type} className={staffType === type ? "active" : ""} onClick={() => setStaffType(type)}>{type}</button>)}</div><div className="leave-history-controls"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search faculty..." /></label><select value={status} onChange={(event) => setStatus(event.target.value)}>{["All Status", "Approved", "Pending", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select></div></div>
    <div className="leave-history-table-wrap"><table className="cms-table leave-history-table"><thead><tr>{["Staff", "Department", "Staff Type", "Total Requests", "Total Leaves", "Used", "Remaining", "Approved", "Pending", "Rejected", "Action"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{people.length ? people.map((person) => { 
        const total = person.totalLeaves || 0;
        const used = person.used || 0;
        const remaining = person.remaining || 0;
        return <tr key={person.staffId}><td><div className="history-staff"><b>{(person.staffName || "").split(" ").map((part) => part[0]).join("").slice(0, 2)}</b><div><strong>{person.staffName}</strong><span>{person.staffId}</span></div></div></td><td>{person.department}</td><td>{person.staffType}</td><td>{person.totalRequests || 0}</td><td>{total} days</td><td>{used} {used === 1 ? "day" : "days"}</td><td>{remaining} days</td><td><LeaveStatus status="Approved" /> <small>{person.approved || 0}</small></td><td><LeaveStatus status="Pending" /> <small>{person.pending || 0}</small></td><td><LeaveStatus status="Rejected" /> <small>{person.rejected || 0}</small></td><td><button className="cms-btn cms-btn-ghost leave-view-history" onClick={() => onSelect(person)}>View History</button></td></tr>; 
    }) : <tr><td colSpan="11"><div className="cms-empty">No staff leave history matches these filters.</div></td></tr>}</tbody></table></div></section></main>;
}

function StaffLeaveHistory({ person, onClose, onLeave }) {
  const [detailHistory, setDetailHistory] = useState(null);
  useEffect(() => {
    getLeaveHistory(person.staffId).then(data => setDetailHistory(data)).catch(console.error);
  }, [person]);

  if (!detailHistory) {
      return <Modal title="Faculty Leave History" className="leave-staff-history-modal" onClose={onClose} footer={<button className="cms-btn cms-btn-ghost" onClick={onClose}>Back to History</button>}><p>Loading...</p></Modal>;
  }

  const { balance = {}, requests = [], approved = 0, pending = 0, rejected = 0 } = detailHistory;
  const total = balance.total || 0;
  const used = balance.used || 0;
  const remaining = balance.remaining || 0;
  const percent = total ? Math.min(100, Math.round(used / total * 100)) : 0;
  
  return <Modal title="Faculty Leave History" className="leave-staff-history-modal" onClose={onClose} footer={<button className="cms-btn cms-btn-ghost" onClick={onClose}>Back to History</button>}>
    <section className="history-person-head"><span>{(person.staffName || "").split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h4>{person.staffName} <b>{person.staffId}</b></h4><p>{person.department} · {person.staffType}</p></div></section>
    <section className="history-balance"><h4>Leave Balance</h4><div className="history-balance-grid"><div><span>Total Leaves</span><strong>{total} days</strong></div><div><span>Used Leaves</span><strong>{used} {used === 1 ? "day" : "days"}</strong></div><div><span>Remaining</span><strong>{remaining} days</strong></div></div><div className="history-usage"><div><strong>Leave Usage</strong><span>{used} of {total} days used · {percent}%</span></div><i><b style={{ width: `${percent}%` }} /></i></div></section>
    <section className="history-request-summary"><strong>Total Requests: {requests.length}</strong><span>Approved: {approved}</span><span>Pending: {pending}</span><span>Rejected: {rejected}</span></section><section className="history-leaves"><h4>Leave History</h4>{requests.length ? <div className="leave-history-table-wrap"><table className="cms-table leave-history-table"><thead><tr>{["Leave Type", "From Date", "To Date", "Days", "Status"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{requests.map((leave) => <tr key={leave.staffLeaveRequestId || leave.id}><td>{leave.leaveType}</td><td>{prettyDate(leave.fromDate)}</td><td>{prettyDate(leave.toDate)}</td><td>{leave.days} {Number(leave.days) === 1 ? "day" : "days"}</td><td><button className="history-status-link" onClick={() => onLeave(leave)}><LeaveStatus status={leave.status} /></button></td></tr>)}</tbody></table></div> : <div className="cms-empty">No leave history found.</div>}</section>
  </Modal>;
}

function RejectLeaveConfirmation({ leave, remark, setRemark, onCancel, onConfirm }) {
  return <Modal title="Reject Leave Request?" size="sm" className="leave-reject-modal" onClose={onCancel} footer={<><button className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={onConfirm}>Reject Leave</button></>}><div className="leave-reject-copy"><p>Are you sure you want to reject this leave request?</p><strong>{leave.staffName}</strong><span>{leave.leaveType} · {prettyDate(leave.fromDate)} to {prettyDate(leave.toDate)}</span><Field label="Admin Remark (optional)"><textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Enter rejection reason..." /></Field></div></Modal>;
}

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [affected, setAffected] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [staffHistory, setStaffHistory] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const loadRequests = () => {
    getLeaveRequests().then(data => setRequests(data)).catch(console.error);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openDetails = (req) => {
    getLeaveDetails(req.staffLeaveRequestId || req.id).then(detail => {
        setSelected(detail);
        setRemark(detail.adminRemark || "");
    }).catch(console.error);
  };

  const commitReview = (status) => { 
    const statusVal = status === "Approved" ? 1 : 2;
    reviewLeaveRequest(selected.staffLeaveRequestId || selected.id, {
        status: statusVal,
        rejectionReason: remark
    }).then(() => {
        loadRequests();
        setSelected(null);
        setRejecting(null);
        setMessage(`Leave request ${status.toLowerCase()}.`);
    }).catch(console.error);
  };
  
  const review = (status) => { if (status === "Rejected") { setRejecting(selected); return; } commitReview(status); };
  const openAssignment = (item) => setAssignment(item);
  const save = () => { 
      setAssignment(null); 
      setMessage("Temporary substitution assigned."); 
      setAffected({ ...affected });
  };

  if (historyOpen) return <><DashboardLayout title="Leave History" subtitle="View staff leave usage, requests, and approval history" breadcrumb={["Operations", "Leave Management", "Leave History"]} actions={<button className="cms-btn cms-btn-ghost leave-history-button" onClick={() => { setHistoryOpen(false); setStaffHistory(null); }}>Back to Leave Management</button>}><LeaveHistory onSelect={setStaffHistory} /></DashboardLayout>
    {staffHistory && <StaffLeaveHistory person={staffHistory} onClose={() => setStaffHistory(null)} onLeave={(leave) => { setStaffHistory(null); openDetails(leave); }} />}{selected && <LeaveDetails leave={selected} remark={remark} setRemark={setRemark} onClose={() => setSelected(null)} onReview={review} onAffected={() => { setAffected(selected); setSelected(null); }} />}{rejecting && <RejectLeaveConfirmation leave={rejecting} remark={remark} setRemark={setRemark} onCancel={() => setRejecting(null)} onConfirm={() => commitReview("Rejected")} />}{affected && <AffectedClasses leave={affected} close={() => setAffected(null)} assign={openAssignment} />}{assignment && <Assignment item={assignment} close={() => setAssignment(null)} save={save} toast={setMessage} />}<Toast message={message} onClose={() => setMessage("")} /></>;
  
  return <><DashboardLayout title="Leave Management" subtitle="Review leave requests and arrange temporary class coverage" breadcrumb={["Operations", "Leave Management"]} actions={<button className="cms-btn cms-btn-ghost leave-history-button" onClick={() => setHistoryOpen(true)}><HistoryIcon size={16} /> History</button>}><main className="attendance-module"><section className="att-summary att-leave-summary">{["Total Requests", "Pending", "Approved", "Rejected"].map((label) => <div key={label}><span>{label}</span><b>{label === "Total Requests" ? requests.length : requests.filter((request) => getStatusLabel(request.status) === label).length}</b></div>)}</section><section className="att-card att-table-card"><div className="att-scroll"><table className="cms-table"><thead><tr>{["Request ID", "Staff Name", "Department", "Staff Type", "Leave Type", "From Date", "To Date", "Days", "Reason", "Status", "Action"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{requests.map((request) => {
      const rid = request.staffLeaveRequestId || request.id;
      return <tr key={rid}><td>LR-{String(rid).padStart(3, "0")}</td><td>{request.staffName}</td><td>{request.department}</td><td>{request.staffType}</td><td>{request.leaveType}</td><td>{request.fromDate}</td><td>{request.toDate}</td><td>{request.days}</td><td>{request.reason}</td><td><span className="att-status">{getStatusLabel(request.status)}</span></td><td><button className="cms-action-btn" onClick={() => { openDetails(request); }} aria-label="View request"><Eye size={16} /></button></td></tr>;
  })}</tbody></table></div></section></main></DashboardLayout>
    {selected && <LeaveDetails leave={selected} remark={remark} setRemark={setRemark} onClose={() => setSelected(null)} onReview={review} onAffected={() => { setAffected(selected); setSelected(null); }} />}{rejecting && <RejectLeaveConfirmation leave={rejecting} remark={remark} setRemark={setRemark} onCancel={() => setRejecting(null)} onConfirm={() => commitReview("Rejected")} />}
    {affected && <AffectedClasses leave={affected} close={() => setAffected(null)} assign={openAssignment} />}{assignment && <Assignment item={assignment} close={() => setAssignment(null)} save={save} toast={setMessage} />}<Toast message={message} onClose={() => setMessage("")} /></>;
}
