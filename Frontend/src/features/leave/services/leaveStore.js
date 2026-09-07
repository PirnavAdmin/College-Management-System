import { mockLeaveRequests } from "@/data/attendanceMockData.js";

const STORAGE_KEY = "cms.leave-requests";
const CHANGE_EVENT = "cms:leave-requests-changed";

const seedRequests = [
  { id: 3, staffId: "FAC005", staffName: "Ravi Kumar", department: "Mathematics", staffType: "Teaching Staff", leaveType: "Casual Leave", fromDate: "2026-09-10", toDate: "2026-09-10", days: 1, reason: "Personal work", status: "Approved", createdDate: "2026-09-08", reviewedBy: "Admin", reviewedOn: "08-Sep-2026" },
  ...mockLeaveRequests.map((request) => ({ ...request, createdDate: request.fromDate })),
];

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : seedRequests;
  } catch {
    return seedRequests;
  }
};

const write = (requests) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return requests;
};

export const getLeaveRequests = () => read();

export const subscribeToLeaveRequests = (listener) => {
  const onChange = () => listener(read());
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export const submitLeaveRequest = (request) => {
  const requests = read();
  const nextId = Math.max(0, ...requests.map((item) => Number(item.id) || 0)) + 1;
  const record = { ...request, id: nextId, status: "Pending", createdDate: new Date().toISOString().slice(0, 10) };
  write([record, ...requests]);
  return record;
};

export const reviewLeaveRequest = (id, status, adminRemark = "") => {
  if (!["Approved", "Rejected"].includes(status)) throw new Error("Invalid leave status.");
  const requests = read();
  const record = requests.find((item) => String(item.id) === String(id));
  if (!record || record.status !== "Pending") throw new Error("Only pending leave requests can be reviewed.");
  const reviewed = { ...record, status, adminRemark, reviewedBy: "Admin", reviewedOn: new Date().toLocaleDateString("en-IN") };
  write(requests.map((item) => String(item.id) === String(id) ? reviewed : item));
  return reviewed;
};

export const revokeApprovedLeave = (id, adminRemark) => {
  if (!adminRemark?.trim()) throw new Error("Please enter a reason before rejecting the approved leave.");
  const requests = read();
  const record = requests.find((item) => String(item.id) === String(id));
  if (!record || record.status !== "Approved") throw new Error("Only approved leave requests can be revoked.");
  const reviewedOn = new Date().toLocaleDateString("en-IN");
  const statusHistory = [...(record.statusHistory || []), { from: "Approved", to: "Rejected", remark: adminRemark.trim(), reviewedBy: "Admin", reviewedOn }];
  const revoked = { ...record, status: "Rejected", adminRemark: adminRemark.trim(), reviewedBy: "Admin", reviewedOn, statusHistory };
  write(requests.map((item) => String(item.id) === String(id) ? revoked : item));
  return revoked;
};
