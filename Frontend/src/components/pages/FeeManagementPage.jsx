import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Copy,
  Eye,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import {
  COLLEGE_NAME,
  PAYMENT_METHODS,
  PAYMENT_PLANS,
  allTransactions,
  deriveAccount,
  feeScheduleLabel,
  feeStatusTone,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  groupWiseTotals,
  overviewTotals,
  todayISO,
  upcomingInstallments,
} from "@/data/feeManagementData.js";
import "./FeeManagementPage.css";

const TABS = ["Overview", "Student Fee Ledger", "Fee Setup", "Fee Collection", "Payment History"];
const FEE_SETUP_TABS = ["Fee Types", "Fee Structure", "Scholarships"];
const FEE_TYPE_CATEGORIES = ["Admission", "Academic", "Examination", "Facility", "Activity", "Other"];
const PAGE_SIZE = 5;
const OVERVIEW_TABS = [
  { id: "upcoming", label: "Upcoming Fee Schedules", icon: CalendarClock },
  { id: "recent", label: "Recent Payments", icon: ReceiptText },
];

const getCollection = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getObject = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  if (data?.Data && !Array.isArray(data.Data)) return data.Data;
  if (data && !Array.isArray(data)) return data;
  return {};
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
};

const textValue = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value);
};

const numberValue = (item, ...keys) => {
  const value = read(item, ...keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSelectOptions = (rows, idKeys, labelKeys) => rows
  .map((item) => {
    const value = read(item, ...idKeys);
    const label = read(item, ...labelKeys) ?? value;
    if (value === undefined || value === null || value === "") return null;
    return { value: String(value), label: String(label) };
  })
  .filter(Boolean);

const groupOption = (item) => {
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  const option = toSelectOptions([item], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"])[0];
  return option ? {
    ...option,
    code: textValue(item, "groupCode", "GroupCode", "code", "Code") || option.label,
    boardId: textValue(item, "boardId", "BoardId") || textValue(board, "boardId", "BoardId", "id", "Id"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId") || textValue(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId") || textValue(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
  } : null;
};

const programOption = (item) => toSelectOptions(
  [item],
  ["programId", "ProgramId", "id", "Id"],
  ["programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"],
)[0] || null;

const sectionOption = (item) => {
  const group = read(item, "group", "Group");
  const option = toSelectOptions([item], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "section", "Section", "name", "Name"])[0];
  return option ? {
    ...option,
    groupId: textValue(item, "groupId", "GroupId") || textValue(group, "groupId", "GroupId", "id", "Id"),
    groupName: textValue(item, "groupName", "GroupName") || textValue(group, "groupName", "GroupName", "name", "Name"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId"),
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId"),
  } : null;
};

const categoryForFeeType = (name = "") => {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("admission")) return "Admission";
  if (normalized.includes("exam")) return "Examination";
  if (normalized.includes("transport") || normalized.includes("hostel") || normalized.includes("uniform") || normalized.includes("id card")) return "Facility";
  if (normalized.includes("activity") || normalized.includes("sports")) return "Activity";
  return "Academic";
};

const feeTypeCodeFor = (name = "") => {
  const normalized = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return normalized.length >= 2 ? normalized : `FT${normalized}`.slice(0, 30);
};

const feeTypeOption = (item) => {
  const feeType = read(item, "feeType", "FeeType");
  const name = textValue(item, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type", "label", "Label")
    || textValue(feeType, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type", "label", "Label")
    || "Fee Type";
  const status = read(item, "isActive", "IsActive", "active", "Active", "status", "Status") ?? read(feeType, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    id: String(read(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId") ?? read(feeType, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId") ?? read(item, "id", "Id") ?? ""),
    name,
    code: textValue(item, "feeTypeCode", "FeeTypeCode", "code", "Code") || textValue(feeType, "feeTypeCode", "FeeTypeCode", "code", "Code") || feeTypeCodeFor(name),
    category: textValue(item, "category", "Category", "feeCategory", "FeeCategory") || textValue(feeType, "category", "Category", "feeCategory", "FeeCategory") || categoryForFeeType(name),
    status: typeof status === "string" ? (status.toLowerCase() === "inactive" ? "Inactive" : "Active") : status === false ? "Inactive" : "Active",
  };
};

const feeTypeRowsFromMaster = (feeTypes) => {
  const source = feeTypes.filter((item) => item.status !== "Inactive");
  return source.map((item) => {
    return {
      id: String(item.id),
      feeTypeId: String(item.id).startsWith("custom-") ? "" : String(item.id),
      type: item.name,
      originalAmount: 0,
      payableAmount: 0,
      selected: true,
      required: false,
    };
  });
};

const hasBackendFeeTypeIds = (feeTypes) => feeTypes.some((item) => Number(item.id) > 0);

const pageItems = (items, page, pageSize = PAGE_SIZE) => items.slice((page - 1) * pageSize, page * pageSize);

const scholarshipValueLabel = (item) => (
  item.discountType === "Percentage" ? `${Number(item.discountValue || 0)}%` : formatCurrency(item.discountValue || 0)
);

const normalizeScholarshipRows = (rows) => rows.map((item, index) => {
  const id = read(item, "scholarshipId", "ScholarshipId", "id", "Id");
  const type = textValue(item, "discountType", "DiscountType", "type", "Type") || "Percentage";
  const status = read(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    id: String(id ?? `SCH-${index + 1}`),
    name: textValue(item, "scholarshipName", "ScholarshipName", "name", "Name", "title", "Title") || "Scholarship",
    discountType: type === "%" ? "Percentage" : type,
    discountValue: numberValue(item, "discountValue", "DiscountValue", "value", "Value", "percentage", "Percentage", "amount", "Amount"),
    status: typeof status === "string" ? (status.toLowerCase() === "inactive" ? "Inactive" : "Active") : status === false ? "Inactive" : "Active",
  };
});

const normalizeFeeStructureRows = (rows) => {
  const grouped = new Map();
  rows.forEach((item, index) => {
    const itemGroup = read(item, "group", "Group");
    const itemProgram = read(item, "program", "Program");
    const itemAcademicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
    const itemBoard = read(item, "board", "Board");
    const feeType = feeTypeOption(item);
    const amount = numberValue(item, "amount", "Amount", "feeAmount", "FeeAmount");
    const groupId = textValue(item, "groupId", "GroupId") || textValue(itemGroup, "groupId", "GroupId", "id", "Id");
    const group = textValue(item, "groupName", "GroupName", "courseName", "CourseName") || textValue(itemGroup, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode") || groupId;
    const academicYearId = textValue(item, "academicYearId", "AcademicYearId") || textValue(itemAcademicYear, "academicYearId", "AcademicYearId", "id", "Id");
    const academicYear = textValue(item, "academicYearName", "AcademicYearName") || textValue(itemAcademicYear, "academicYearName", "AcademicYearName", "name", "Name") || academicYearId;
    const programId = textValue(item, "programId", "ProgramId") || textValue(itemProgram, "programId", "ProgramId", "id", "Id");
    const program = textValue(item, "programName", "ProgramName") || textValue(itemProgram, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode") || programId || "Regular";
    const structureId = String(read(item, "feeStructureId", "FeeStructureId", "id", "Id") ?? `api-${index}`);
    const key = [academicYearId || academicYear, groupId || group, programId || program].join("|");
    const existing = grouped.get(key);
    const row = existing || {
      id: structureId,
      boardId: textValue(item, "boardId", "BoardId") || textValue(itemBoard, "boardId", "BoardId", "id", "Id"),
      board: textValue(item, "boardName", "BoardName") || textValue(itemBoard, "boardName", "BoardName", "name", "Name") || textValue(item, "boardId", "BoardId"),
      academicYearId,
      academicYear,
      groupId,
      group,
      programId,
      program,
      status: textValue(item, "status", "Status") || "Active",
      feeItems: [],
    };
    row.feeItems.push({
      id: feeType.id || `type-${index}`,
      feeTypeId: feeType.id,
      structureItemId: textValue(item, "feeStructureItemId", "FeeStructureItemId", "structureItemId", "StructureItemId", "itemId", "ItemId"),
      type: feeType.name,
      originalAmount: amount,
      payableAmount: amount,
      selected: textValue(item, "status", "Status") !== "Inactive",
      required: Boolean(read(item, "isMandatory", "IsMandatory", "required", "Required")),
      structureId,
    });
    grouped.set(key, row);
  });
  return Array.from(grouped.values());
};

const normalizeTransactionRows = (rows, account) => rows.map((item, index) => ({
  id: String(read(item, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id") ?? `${account.id}-TXN-${index + 1}`),
  feePaymentId: read(item, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"),
  receiptNo: textValue(item, "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber"),
  studentName: account.studentName,
  admissionNo: account.admissionNo,
  group: account.group,
  groupId: account.groupId,
  section: account.section,
  sectionId: account.sectionId,
  academicYear: account.academicYear,
  academicYearId: account.academicYearId,
  type: textValue(item, "paymentType", "PaymentType", "feeType", "FeeType", "type", "Type") || "Fee Payment",
  amount: numberValue(item, "amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"),
  baseAmount: numberValue(item, "baseAmount", "BaseAmount", "amount", "Amount"),
  discount: numberValue(item, "discount", "Discount", "discountAmount", "DiscountAmount"),
  fine: numberValue(item, "fine", "Fine", "fineAmount", "FineAmount"),
  method: textValue(item, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method") || "-",
  reference: textValue(item, "transactionNumber", "TransactionNumber", "reference", "Reference", "transactionReference", "TransactionReference"),
  date: textValue(item, "paymentDate", "PaymentDate", "date", "Date", "createdAt", "CreatedAt") || todayISO(),
}));

const normalizeInstallmentRows = (rows, account) => rows.map((item, index) => ({
  no: Number(read(item, "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo", "no", "No") || index + 1),
  amount: numberValue(item, "amount", "Amount", "installmentAmount", "InstallmentAmount", "payableAmount", "PayableAmount"),
  paid: numberValue(item, "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid"),
  dueDate: textValue(item, "dueDate", "DueDate", "date", "Date"),
  status: textValue(item, "status", "Status") || account.feeStatus || "Pending",
}));

const normalizeFeeAccountRows = (rows) => rows.map((item, index) => {
  const student = read(item, "student", "Student");
  const group = read(item, "group", "Group");
  const section = read(item, "section", "Section");
  const program = read(item, "program", "Program");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const account = {
    id: String(read(item, "studentFeeAssignmentId", "StudentFeeAssignmentId", "assignmentId", "AssignmentId", "studentId", "StudentId", "id", "Id") ?? `fee-account-${index + 1}`),
    assignmentId: read(item, "studentFeeAssignmentId", "StudentFeeAssignmentId", "assignmentId", "AssignmentId", "id", "Id"),
    studentFeeAssignmentId: read(item, "studentFeeAssignmentId", "StudentFeeAssignmentId", "assignmentId", "AssignmentId", "id", "Id"),
    studentId: read(item, "studentId", "StudentId") ?? read(student, "studentId", "StudentId", "id", "Id"),
    studentName: textValue(item, "studentName", "StudentName", "name", "Name") || textValue(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName") || "Student",
    admissionNo: textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || textValue(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || "-",
    rollNumber: textValue(item, "rollNumber", "RollNumber") || textValue(student, "rollNumber", "RollNumber"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId") || textValue(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    academicYear: textValue(item, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear") || textValue(academicYear, "academicYearName", "AcademicYearName", "name", "Name"),
    academicLevel: textValue(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel"),
    groupId: textValue(item, "groupId", "GroupId") || textValue(group, "groupId", "GroupId", "id", "Id"),
    group: textValue(item, "groupName", "GroupName", "group", "Group") || textValue(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"),
    sectionId: textValue(item, "sectionId", "SectionId") || textValue(section, "sectionId", "SectionId", "id", "Id") || textValue(program, "programId", "ProgramId", "id", "Id"),
    section: textValue(item, "sectionName", "SectionName", "section", "Section") || textValue(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"),
    admissionDate: textValue(item, "admissionDate", "AdmissionDate", "createdAt", "CreatedAt"),
    paymentPlan: textValue(item, "paymentPlan", "PaymentPlan", "plan", "Plan") || "Full Payment",
    admissionFee: numberValue(item, "admissionFee", "AdmissionFee"),
    courseFee: numberValue(item, "courseFee", "CourseFee", "totalPayable", "TotalPayable", "payable", "Payable"),
    totalPayable: numberValue(item, "totalPayable", "TotalPayable", "payable", "Payable", "netPayable", "NetPayable"),
    totalPaid: numberValue(item, "totalPaid", "TotalPaid", "paid", "Paid", "paidAmount", "PaidAmount"),
    balance: numberValue(item, "balance", "Balance", "outstanding", "Outstanding", "dueAmount", "DueAmount"),
    concessionAmount: numberValue(item, "concessionAmount", "ConcessionAmount", "discountAmount", "DiscountAmount"),
    feeStatus: textValue(item, "feeStatus", "FeeStatus", "status", "Status") || "Due",
    nextDueDate: textValue(item, "nextDueDate", "NextDueDate", "dueDate", "DueDate"),
    feeItems: getCollection(read(item, "feeItems", "FeeItems", "items", "Items")).map((feeItem, feeIndex) => ({
      id: String(read(feeItem, "feeTypeId", "FeeTypeId", "id", "Id") ?? `${index}-${feeIndex}`),
      type: textValue(feeItem, "feeTypeName", "FeeTypeName", "type", "Type", "name", "Name") || `Fee ${feeIndex + 1}`,
      originalAmount: numberValue(feeItem, "originalAmount", "OriginalAmount", "amount", "Amount"),
      payableAmount: numberValue(feeItem, "payableAmount", "PayableAmount", "amount", "Amount"),
      selected: read(feeItem, "selected", "Selected") !== false,
      required: Boolean(read(feeItem, "isMandatory", "IsMandatory", "required", "Required")),
    })),
    transactions: [],
    installments: [],
  };
  account.transactions = normalizeTransactionRows(getCollection(read(item, "transactions", "Transactions", "payments", "Payments")), account);
  account.installments = normalizeInstallmentRows(getCollection(read(item, "installments", "Installments", "schedules", "Schedules", "feeSchedules", "FeeSchedules")), account);
  const derived = deriveAccount(account);
  return {
    ...derived,
    totalPayable: account.totalPayable || derived.totalPayable,
    totalPaid: account.totalPaid || derived.totalPaid,
    balance: account.balance || derived.balance,
    feeStatus: account.feeStatus || derived.feeStatus,
    nextDueDate: account.nextDueDate || derived.nextDueDate,
  };
});

const printFeeTarget = (target) => {
  const className = `cms-fee-print-${target}`;
  const cleanup = () => {
    document.body.classList.remove(className);
    window.removeEventListener("afterprint", cleanup);
  };

  document.body.classList.add(className);
  window.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    window.print();
    window.setTimeout(cleanup, 500);
  }, 50);
};

function StatusBadge({ status }) {
  return <span className={`cms-badge ${feeStatusTone(status)}`}>{status}</span>;
}

function SummaryCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className={`cms-fee-stat tone-${tone}`}>
      <span className="cms-fee-stat-icon"><Icon size={18} /></span>
      <div>
        <span className="cms-fee-stat-label">{label}</span>
        <strong className="cms-fee-stat-value">{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  const emptyLabel = label === "Section" ? "No sections available" : `No ${label.toLowerCase()} available`;
  return (
    <label className="cms-fee-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => {
          const optionValue = option && typeof option === "object" ? option.value : option;
          const optionLabel = option && typeof option === "object" ? option.label : option;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
        {!options.length ? <option value="" disabled>{emptyLabel}</option> : null}
      </select>
    </label>
  );
}

function TablePagination({ page, pageSize = PAGE_SIZE, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems ? ((page - 1) * pageSize) + 1 : 0;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="cms-fee-pagination">
      <span className="cms-fee-pagination-info">Showing {start}-{end} of {totalItems}</span>
      <div className="cms-fee-pagination-actions">
        <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Next</button>
      </div>
    </div>
  );
}

/* ------------------------------- Overview ------------------------------- */
function OverviewTab({ accounts }) {
  const [overviewTab, setOverviewTab] = useState("upcoming");
  const totals = overviewTotals(accounts);
  const chartData = groupWiseTotals(accounts);
  const upcoming = upcomingInstallments(accounts);
  const recent = allTransactions(accounts).slice(0, 8);

  return (
    <div className="cms-fee-stack">
      <div className="cms-fee-stat-grid">
        <SummaryCard icon={Users} tone="blue" label="Total Students" value={`${totals.totalStudents} Students`} hint="With active fee accounts" />
        <SummaryCard icon={WalletCards} tone="green" label="Total Collected" value={formatCompactCurrency(totals.totalCollected)} hint={`${totals.collectedPercent.toFixed(1)}% of expected`} />
        <SummaryCard icon={AlertCircle} tone="red" label="Pending / Overdue" value={`${totals.pendingStudents} Students`} hint={`${totals.overdueStudents} overdue`} />
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Group-wise Collection</h2></div>
        <div className="cms-card-body">
          <div className="cms-fee-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--cms-border)" vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 12, fill: "var(--cms-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fontSize: 11, fill: "var(--cms-muted)" }} axisLine={false} tickLine={false} width={62} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--cms-border)", background: "var(--cms-surface)", color: "var(--cms-text)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="expected" name="Expected" fill="var(--cms-primary)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="collected" name="Collected" fill="var(--cms-green)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="outstanding" name="Outstanding" fill="var(--cms-amber)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cms-card cms-fee-overview-card">
        <div className="cms-card-head"><h2>Fee Management Overview</h2></div>
        <div className="cms-card-body cms-fee-overview-shell">
          <div className="cms-fee-overview-tabs" role="tablist" aria-label="Fee Management Overview">
            {OVERVIEW_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={overviewTab === id}
                className={`cms-fee-overview-tab ${overviewTab === id ? "is-active" : ""}`}
                onClick={() => setOverviewTab(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div className="cms-fee-overview-content">
            {overviewTab === "upcoming" ? (
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr><th>Student</th><th>Admission No</th><th>Group / Section</th><th>Fee Schedule</th><th>Due Date</th><th className="num">Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {upcoming.length === 0 ? (
                      <tr><td colSpan={7} className="cms-fee-empty-row">No pending fee schedules.</td></tr>
                    ) : upcoming.map((row) => (
                      <tr key={row.key}>
                        <td><strong>{row.studentName}</strong></td>
                        <td>{row.admissionNo}</td>
                        <td>{row.group} / {row.section}</td>
                        <td>Fee Schedule {row.no}</td>
                        <td>{formatDate(row.dueDate)}</td>
                        <td className="num">{formatCurrency(row.amount)}</td>
                        <td><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {overviewTab === "recent" ? (
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr><th>Receipt No</th><th>Student</th><th>Payment Type</th><th className="num">Amount</th><th>Payment Method</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={6} className="cms-fee-empty-row">No recent payments.</td></tr>
                    ) : recent.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.receiptNo}</strong></td>
                        <td>{row.studentName}</td>
                        <td>{feeScheduleLabel(row.type)}</td>
                        <td className="num">{formatCurrency(row.amount)}</td>
                        <td>{row.method}</td>
                        <td>{formatDate(row.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Collect payment ---------------------------- */
function CollectPaymentModal({ account, onClose, onSaved }) {
  const pending = account.installments.filter((item) => item.status !== "Paid");
  const [target, setTarget] = useState(pending.length ? String(pending[0].no) : "full");
  const [amount, setAmount] = useState(String(pending.length ? pending[0].balance : account.balance));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [fine, setFine] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isReferenceRequired = method && method !== "Cash";

  const selectTarget = (value) => {
    setTarget(value);
    setError("");
    if (value === "full") {
      setAmount(String(account.balance));
      return;
    }
    const installment = pending.find((item) => String(item.no) === value);
    setAmount(String(installment ? installment.balance : account.balance));
  };

  const save = async () => {
    const value = Number(amount || 0);
    const discountValue = Number(discount || 0);
    const fineValue = Number(fine || 0);
    const netAmount = Math.max(value + fineValue - discountValue, 0);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a valid payment amount");
    if (discountValue > value + fineValue) return setError("Discount cannot exceed the payment amount plus fine");
    if (netAmount > account.balance) return setError(`Amount cannot exceed the outstanding balance of ${formatCurrency(account.balance)}`);
    if (!method) return setError("Payment Method is required");
    if (isReferenceRequired && !reference.trim()) return setError("Transaction / Reference Number is required for this payment method");
    const assignmentId = account.assignmentId || account.studentFeeAssignmentId;
    if (!assignmentId) return setError("Student fee assignment ID is required to collect payment");
    const assignmentIdValue = Number(assignmentId);
    if (!Number.isFinite(assignmentIdValue) || assignmentIdValue <= 0) return setError("Student fee assignment ID must be a valid number");
    setSaving(true);
    try {
      const response = await apiClient.post(apiEndpoints.fee.collect, {
        studentFeeAssignmentId: assignmentIdValue,
        amount: netAmount,
        paymentMode: method,
        paymentDate: date,
        transactionNumber: reference,
        discount: discountValue,
        fine: fineValue,
        remarks: note,
      });
      const saved = getObject(response.data);
      setSaving(false);
      return onSaved({
        amount: numberValue(saved, "amount", "Amount", "paidAmount", "PaidAmount") || netAmount,
        receiptNo: textValue(saved, "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber") || "-",
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSaving(false);
      return null;
    }
  };

  return (
    <Modal
      title="Collect Payment"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Payment"}</button>
        </>
      )}
    >
      <div className="cms-fee-collect">
        <div className="cms-fee-context">
          <div className="cms-fee-context-item"><span>Student</span><strong>{account.studentName}</strong></div>
          <div className="cms-fee-context-item"><span>Admission No</span><strong>{account.admissionNo}</strong></div>
          <div className="cms-fee-context-item"><span>Group / Section</span><strong>{account.group} / {account.section}</strong></div>
          <div className="cms-fee-context-item"><span>Outstanding Balance</span><strong>{formatCurrency(account.balance)}</strong></div>
        </div>

        <div className="cms-form-grid cols-3">
          <div className="cms-field full">
            <label htmlFor="collect-target">Pay Towards</label>
            <select id="collect-target" value={target} onChange={(event) => selectTarget(event.target.value)}>
              {pending.map((item) => (
                <option key={item.no} value={String(item.no)}>
                  Fee Schedule {item.no} - {formatCurrency(item.balance)} due {formatDate(item.dueDate)}
                </option>
              ))}
              <option value="full">Pay Full Remaining Balance - {formatCurrency(account.balance)}</option>
            </select>
          </div>
          <div className="cms-field">
            <label htmlFor="collect-amount">Amount <span className="req">*</span></label>
            <input id="collect-amount" type="number" min="0" value={amount} disabled={target === "full"} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-date">Payment Date</label>
            <input id="collect-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-method">Payment Method <span className="req">*</span></label>
            <select id="collect-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="cms-field">
            <label htmlFor="collect-discount">Discount</label>
            <input id="collect-discount" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-fine">Fine</label>
            <input id="collect-fine" type="number" min="0" value={fine} onChange={(event) => setFine(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-ref">Transaction / Reference Number {isReferenceRequired ? <span className="req">*</span> : null}</label>
            <input id="collect-ref" value={reference} placeholder={method === "Cash" ? "Optional for cash" : "Reference number"} onChange={(event) => setReference(event.target.value)} />
          </div>
          <div className="cms-field full">
            <label htmlFor="collect-note">Note</label>
            <textarea id="collect-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        {error ? <p className="cms-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

/* ------------------------------- Receipt -------------------------------- */
function ReceiptModal({ receipt, onClose }) {
  return (
    <Modal
      title="Payment Receipt"
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
          <button className="cms-btn cms-btn-primary" onClick={() => printFeeTarget("receipt")}><Printer size={14} /> Print Receipt</button>
        </>
      )}
    >
      <div className="cms-fee-receipt cms-fee-receipt-print">
        <div className="cms-fee-receipt-head">
          <strong>{COLLEGE_NAME}</strong>
          <span>Fee Receipt</span>
        </div>
        <dl>
          <div><dt>Receipt Number</dt><dd>{receipt.receiptNo}</dd></div>
          <div><dt>Receipt Date</dt><dd>{formatDate(receipt.date)}</dd></div>
          <div><dt>Student Name</dt><dd>{receipt.studentName}</dd></div>
          <div><dt>Admission Number</dt><dd>{receipt.admissionNo}</dd></div>
          <div><dt>Group</dt><dd>{receipt.group}</dd></div>
          <div><dt>Section</dt><dd>{receipt.section}</dd></div>
          {receipt.academicYear ? <div><dt>Academic Year</dt><dd>{receipt.academicYear}</dd></div> : null}
          <div><dt>Payment Type</dt><dd>{feeScheduleLabel(receipt.type)}</dd></div>
          <div><dt>Payment Amount</dt><dd>{formatCurrency(receipt.baseAmount ?? receipt.amount)}</dd></div>
          <div><dt>Discount</dt><dd>{formatCurrency(receipt.discount || 0)}</dd></div>
          <div><dt>Fine</dt><dd>{formatCurrency(receipt.fine || 0)}</dd></div>
          <div><dt>Payment Method</dt><dd>{receipt.method}</dd></div>
          <div><dt>Transaction Reference</dt><dd>{receipt.reference || "-"}</dd></div>
          {receipt.previousBalance !== undefined ? <div><dt>Previous Outstanding</dt><dd>{formatCurrency(receipt.previousBalance)}</dd></div> : null}
          {receipt.balance !== undefined ? <div><dt>Remaining Balance</dt><dd>{formatCurrency(receipt.balance)}</dd></div> : null}
        </dl>
        <div className="cms-fee-receipt-total">
          <span>Amount Paid</span>
          <strong>{formatCurrency(receipt.amount)}</strong>
        </div>
        <div className="cms-fee-signature">Authorized Signature</div>
      </div>
    </Modal>
  );
}

/* --------------------------- Student fee details -------------------------- */
function StudentFeeDrawer({ account, onClose, onCollect, onReceipt }) {
  return (
    <div className="cms-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="cms-fee-drawer" role="dialog" aria-modal="true" aria-label="Student fee details">
        <header>
          <div>
            <h3>{account.studentName}</h3>
            <span>{account.admissionNo} &middot; {account.group} / {account.section}</span>
          </div>
          <div className="cms-fee-drawer-actions">
            <button className="cms-btn cms-btn-ghost" onClick={() => printFeeTarget("student")}>
              <Printer size={14} /> Print
            </button>
            <button className="cms-btn cms-btn-primary" onClick={onCollect} disabled={account.balance === 0}>
              <WalletCards size={14} /> Collect Payment
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
          </div>
        </header>

        <div className="cms-fee-drawer-body cms-fee-student-print">
          <section className="cms-fee-block">
            <h3>Student Information</h3>
            <div className="cms-fee-kv">
              <div><span>Name</span><strong>{account.studentName}</strong></div>
              <div><span>Admission Number</span><strong>{account.admissionNo}</strong></div>
              <div><span>Roll Number</span><strong>{account.rollNumber}</strong></div>
              <div><span>Group</span><strong>{account.group}</strong></div>
              <div><span>Section</span><strong>{account.section}</strong></div>
              <div><span>Academic Level</span><strong>{account.academicLevel}</strong></div>
              <div><span>Academic Year</span><strong>{account.academicYear}</strong></div>
              <div><span>Admission Date</span><strong>{formatDate(account.admissionDate)}</strong></div>
            </div>
          </section>

          <section className="cms-fee-block">
            <h3>Fee Summary</h3>
            <div className="cms-fee-kv">
              <div><span>Original Fee</span><strong>{formatCurrency(account.totalOriginal)}</strong></div>
              <div><span>Concession</span><strong>{formatCurrency(account.totalConcession)}</strong></div>
              <div><span>Scheduled Fees</span><strong>{formatCurrency(account.courseFee)}</strong></div>
              <div><span>Total Payable</span><strong>{formatCurrency(account.totalPayable)}</strong></div>
              <div><span>Total Paid</span><strong>{formatCurrency(account.totalPaid)}</strong></div>
              <div><span>Outstanding Balance</span><strong>{formatCurrency(account.balance)}</strong></div>
              <div><span>Payment Plan</span><strong>{feeScheduleLabel(account.paymentPlan)}</strong></div>
              <div><span>Fee Status</span><strong><StatusBadge status={account.feeStatus} /></strong></div>
            </div>
          </section>

          <section className="cms-fee-block">
            <h3>Applicable Fee Breakdown</h3>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead>
                  <tr><th>Fee Type</th><th className="num">Amount</th><th>Concession / Scheme</th><th className="num">Discount</th><th className="num">Payable</th></tr>
                </thead>
                <tbody>
                  {account.feeItems.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.type}</strong></td>
                      <td className="num">{formatCurrency(item.originalAmount)}</td>
                      <td>{item.concessionName || "-"} {item.concessionValue ? `(${item.concessionType === "Percentage" ? `${item.concessionValue}%` : formatCurrency(item.concessionValue)})` : ""}</td>
                      <td className="num">{formatCurrency(item.concessionAmount)}</td>
                      <td className="num"><strong>{formatCurrency(item.payableAmount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total Fee</strong></td>
                    <td className="num"><strong>{formatCurrency(account.totalOriginal)}</strong></td>
                    <td />
                    <td className="num"><strong>{formatCurrency(account.totalConcession)}</strong></td>
                    <td className="num"><strong>{formatCurrency(account.totalPayable)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {account.installments.length ? (
            <section className="cms-fee-block">
              <h3>Fee Schedule</h3>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr><th>Fee Schedule</th><th>Due Date</th><th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {account.installments.map((item) => (
                      <tr key={item.no}>
                        <td><strong>Fee Schedule {item.no}</strong></td>
                        <td>{formatDate(item.dueDate)}</td>
                        <td className="num">{formatCurrency(item.amount)}</td>
                        <td className="num">{formatCurrency(item.paid)}</td>
                        <td className="num">{formatCurrency(item.balance)}</td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="cms-fee-block">
            <h3>Payment History</h3>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead>
                  <tr><th>Receipt No</th><th>Payment Type</th><th className="num">Amount</th><th>Method</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {account.transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td><strong>{txn.receiptNo}</strong></td>
                      <td>{feeScheduleLabel(txn.type)}</td>
                      <td className="num">{formatCurrency(txn.amount)}</td>
                      <td>{txn.method}</td>
                      <td>{formatDate(txn.date)}</td>
                      <td>
                        <button className="cms-action-btn" title="View receipt" onClick={() => onReceipt({ ...txn, studentName: account.studentName, admissionNo: account.admissionNo, group: account.group, section: account.section, academicYear: account.academicYear, balance: account.balance })}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ----------------------------- Student ledger ---------------------------- */
function LedgerTab({ accounts, onView, onPrint, masters }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ academicYear: "", group: "", section: "", paymentPlan: "", feeStatus: "" });
  const [page, setPage] = useState(1);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };
  const setFilter = (key) => (value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "group" ? { section: "" } : {}) }));
    setPage(1);
  };

  const optionLabel = (list, value) => list?.find((option) => String(option.value) === String(value))?.label || "";
  const selectedYearLabel = optionLabel(masters.years, filters.academicYear);
  const selectedGroupLabel = optionLabel(masters.groups, filters.group);
  const groupOptions = masters.groups.filter((item) => (
    !filters.academicYear || !item.academicYearId || item.academicYearId === String(filters.academicYear)
  ));
  const sectionOptions = masters.sections.filter((item) => (
    (!filters.academicYear || !item.academicYearId || item.academicYearId === String(filters.academicYear))
    && (!filters.group || !item.groupId || item.groupId === String(filters.group))
  ));
  const paymentPlanOptions = PAYMENT_PLANS.map((plan) => ({ value: plan, label: feeScheduleLabel(plan) }));
  const rows = accounts.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || item.studentName.toLowerCase().includes(term)
      || item.admissionNo.toLowerCase().includes(term);
    return matchesSearch
      && (!filters.academicYear || item.academicYearId === filters.academicYear || item.academicYear === selectedYearLabel || item.academicYear === filters.academicYear)
      && (!filters.group || item.groupId === filters.group || item.group === selectedGroupLabel || item.group === filters.group)
      && (!filters.section || item.sectionId === filters.section || item.section === optionLabel(sectionOptions, filters.section) || item.section === filters.section)
      && (!filters.paymentPlan || item.paymentPlan === filters.paymentPlan)
      && (!filters.feeStatus || item.feeStatus === filters.feeStatus);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = pageItems(rows, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Student Fee Ledger</h2>
        <span className="cms-badge cms-badge-info">{rows.length} of {accounts.length} students</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls">
        <div className="cms-fee-search">
          <Search size={15} />
          <input value={search} placeholder="Search by student name or admission number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <div className="cms-fee-filter-row">
          <SelectFilter label="Academic Year" value={filters.academicYear} options={masters.years} onChange={setFilter("academicYear")} />
          <SelectFilter label="Group" value={filters.group} options={groupOptions} onChange={setFilter("group")} />
          <SelectFilter label="Section" value={filters.section} options={sectionOptions} onChange={setFilter("section")} />
          <SelectFilter label="Payment Plan" value={filters.paymentPlan} options={paymentPlanOptions} onChange={setFilter("paymentPlan")} />
          <SelectFilter label="Fee Status" value={filters.feeStatus} options={["Paid", "Partial", "Due", "Overdue"]} onChange={setFilter("feeStatus")} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Admission No</th><th>Student Name</th><th>Group</th><th>Section</th><th>Payment Plan</th>
              <th className="num">Total Payable</th><th className="num">Total Paid</th><th className="num">Balance</th>
              <th>Next Due Date</th><th>Fee Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">No students match the current search and filters.</td></tr>
            ) : paginatedRows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.admissionNo}</strong></td>
                <td>{item.studentName}</td>
                <td>{item.group}</td>
                <td>{item.section}</td>
                <td>{feeScheduleLabel(item.paymentPlan)}</td>
                <td className="num">{formatCurrency(item.totalPayable)}</td>
                <td className="num">{formatCurrency(item.totalPaid)}</td>
                <td className="num">{formatCurrency(item.balance)}</td>
                <td>{item.nextDueDate ? formatDate(item.nextDueDate) : "-"}</td>
                <td><StatusBadge status={item.feeStatus} /></td>
                <td>
                  <div className="cms-actions">
                    <button className="cms-action-btn" title="View fee account" aria-label="View fee account" onClick={() => onView(item.id)}>
                      <Eye size={15} />
                    </button>
                    <button className="cms-action-btn" title="Print fee statement" aria-label="Print fee statement" onClick={() => onPrint(item.id)}>
                      <Printer size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

function FeeCollectionTab({ accounts, onCollect }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };
  const rows = accounts.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term
      || item.studentName.toLowerCase().includes(term)
      || item.admissionNo.toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = pageItems(rows, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Fee Collection</h2>
        <span className="cms-badge cms-badge-info">{rows.length} accounts</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls cms-fee-search-only">
        <div className="cms-fee-search">
          <Search size={15} />
          <input value={search} placeholder="Search by student name or admission number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Admission No</th><th>Student</th><th>Group / Section</th><th className="num">Payable</th>
              <th className="num">Paid</th><th className="num">Balance</th><th>Next Due</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="cms-fee-empty-row">No fee accounts match the current search and filters.</td></tr>
            ) : paginatedRows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.admissionNo}</strong></td>
                <td>{item.studentName}</td>
                <td>{item.group} / {item.section}</td>
                <td className="num">{formatCurrency(item.totalPayable)}</td>
                <td className="num">{formatCurrency(item.totalPaid)}</td>
                <td className="num">{formatCurrency(item.balance)}</td>
                <td>{item.nextDueDate ? formatDate(item.nextDueDate) : "-"}</td>
                <td><StatusBadge status={item.feeStatus} /></td>
                <td>
                  <button className="cms-action-btn" title="Collect payment" aria-label="Collect payment" disabled={item.balance === 0} onClick={() => onCollect(item.id)}>
                    <WalletCards size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

/* ----------------------------- Fee structure ----------------------------- */
function StructureFormModal({ initial, structures = [], onClose, onSaved, feeTypes, masters, masterErrors = {}, masterLoading = false }) {
  const firstGroup = masters.groups[0];
  const initialGroup = initial?.groupId ? masters.groups.find((item) => item.value === String(initial.groupId)) : firstGroup;
  const initialProgram = initial?.programId || "";
  const initialValues = initial || {
    boardId: masters.boards[0]?.value || "",
    academicYear: masters.years[0]?.label || "",
    academicYearId: masters.years[0]?.value || "",
    group: firstGroup?.label || "",
    groupId: firstGroup?.value || "",
    programId: "",
    program: "",
    admissionFee: 0,
    courseFee: 0,
    status: "Active",
  };
  const configuredFeeItems = feeTypeRowsFromMaster(feeTypes);
  const [values, setValues] = useState({
    ...initialValues,
    programId: initialProgram,
    program: initial?.program || "",
    feeItems: initial?.feeItems?.length ? initial.feeItems : configuredFeeItems,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [programOptions, setProgramOptions] = useState([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState("");
  const programRequestRef = useRef(0);
  const groupOptions = useMemo(() => (
    masters.groups.filter((item) => (
      (!values.boardId || !item.boardId || item.boardId === String(values.boardId))
      && (!values.academicYearId || !item.academicYearId || item.academicYearId === String(values.academicYearId))
    ))
  ), [masters.groups, values.academicYearId, values.boardId]);

  useEffect(() => {
    const groupId = values.groupId;
    const requestId = programRequestRef.current + 1;
    programRequestRef.current = requestId;
    setProgramOptions([]);
    setProgramError("");
    if (!groupId) {
      setProgramLoading(false);
      return undefined;
    }
    setProgramLoading(true);
    apiClient.get(apiEndpoints.programs.byGroup(groupId))
      .then((response) => {
        if (programRequestRef.current !== requestId) return;
        const options = getCollection(response.data).map(programOption).filter(Boolean);
        setProgramOptions(options);
        setValues((current) => {
          if (String(current.groupId) !== String(groupId)) return current;
          const selectedProgram = options.find((item) => item.value === String(current.programId));
          if (selectedProgram) return { ...current, program: selectedProgram.label };
          return {
            ...current,
            programId: options[0]?.value || "",
            program: options[0]?.label || "",
          };
        });
      })
      .catch((err) => {
        if (programRequestRef.current !== requestId) return;
        setProgramError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (programRequestRef.current === requestId) setProgramLoading(false);
      });
    return undefined;
  }, [values.groupId]);

  const feeItemsForContext = (currentItems = []) => (
    feeTypeRowsFromMaster(feeTypes).map((item) => {
      const current = currentItems.find((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.feeTypeId || item.id));
      return current ? { ...item, ...current, structureId: current.structureId } : item;
    })
  );

  const changeGroup = (groupId) => {
    const group = groupOptions.find((item) => item.value === groupId);
    setValues((current) => ({
      ...current,
      groupId,
      group: group?.label || "",
      programId: "",
      program: "",
      feeItems: feeItemsForContext(current.feeItems),
    }));
  };

  const changeProgram = (programId) => {
    const program = programOptions.find((item) => item.value === programId);
    setValues((current) => ({
      ...current,
      programId,
      program: program?.label || "",
    }));
  };

  const update = (key, value) => setValues((current) => {
    const nextGroup = key === "group" ? value : current.group;
    const nextCourseFee = current.courseFee;
    const next = {
      ...current,
      [key]: value,
      ...(["boardId", "academicYearId"].includes(key) ? { group: "", groupId: "", programId: "", program: "", feeItems: current.feeItems } : {}),
      ...(key === "group" ? { group: nextGroup, courseFee: nextCourseFee } : {}),
    };
    if (key === "admissionFee" || key === "courseFee" || key === "group") {
      const type = key === "admissionFee" ? "Admission Fee" : "Course Fee";
      next.feeItems = current.feeItems.map((item) => (
        item.type === type ? { ...item, originalAmount: Number(key === "admissionFee" ? value || 0 : nextCourseFee || value || 0), selected: true } : item
      ));
    }
    return next;
  });

  const updateFeeItem = (id, patch) => {
    setValues((current) => {
      const feeItems = current.feeItems.map((item) => (item.id === id ? { ...item, ...patch } : item));
      const admissionFee = feeItems.find((item) => item.type === "Admission Fee")?.originalAmount ?? current.admissionFee;
      const courseFee = feeItems.find((item) => item.type === "Course Fee")?.originalAmount ?? current.courseFee;
      return { ...current, feeItems, admissionFee, courseFee };
    });
  };

  const buildStructurePayload = () => {
    const backendCompatibilitySectionId = Number(masters.sections.find((section) => section.groupId === values.groupId)?.value || masters.sections[0]?.value || 0);
    const backendCompatibilityAcademicLevelId = Number(masters.levels[0]?.value || 0);
    return {
      boardId: Number(values.boardId || values.board || 0),
      academicYearId: Number(values.academicYearId || values.academicYear || 0),
      // TODO: Remove academicLevelId compatibility fallback when the backend supports year/group/program fee structures.
      academicLevelId: backendCompatibilityAcademicLevelId,
      groupId: Number(values.groupId || values.group || 0),
      ...(Number(values.programId) ? { programId: Number(values.programId) } : {}),
      // TODO: Remove sectionId compatibility fallback when the backend supports section-independent fee structures.
      sectionId: backendCompatibilitySectionId,
    };
  };

  const buildStructureItemPayload = (item) => ({
    feeTypeId: Number(item.feeTypeId || item.id || 0),
    amount: Number(item.originalAmount || 0),
    isMandatory: Boolean(item.required),
    dueDate: new Date().toISOString(),
  });

  const save = async () => {
    const selectedItems = values.feeItems.filter((item) => item.selected && (item.required || Number(item.originalAmount || 0) > 0));
    if (!values.academicYear && !values.academicYearId) return setError("Academic Year is required");
    if (!values.group && !values.groupId) return setError("Group is required");
    if (!values.programId) return setError("Program is required");
    if (!selectedItems.length) return setError("Select at least one fee type for this structure");
    if (values.feeItems.some((item) => Number(item.originalAmount || 0) < 0)) return setError("Fee amount cannot be negative");
    const canUseFeeStructureApi = hasBackendFeeTypeIds(feeTypes);
    if (!canUseFeeStructureApi) return setError("Fee structures require saved backend fee types. Please save fee types successfully before creating a structure.");
    if (selectedItems.some((item) => !Number(item.feeTypeId || item.id))) return setError("Only saved backend fee types can be used for API fee structures.");
    const duplicate = structures.some((row) => (
      row.id !== initial?.id
      && row.status === "Active"
      && String(row.academicYearId || row.academicYear) === String(values.academicYearId || values.academicYear)
      && String(row.groupId || row.group) === String(values.groupId || values.group)
      && String(row.programId || row.program || "regular") === String(values.programId || values.program || "regular")
    ));
    if (duplicate) return setError("A fee structure already exists for the selected Academic Year, Group and Program.");
    setSaving(true);
    try {
      const structurePayload = buildStructurePayload();
      const structureResponse = initial?.id
        ? await apiClient.put(apiEndpoints.fee.updateStructure(initial.id), structurePayload)
        : await apiClient.post(apiEndpoints.fee.createStructure, structurePayload);
      const feeStructureId = initial?.id || read(getObject(structureResponse.data), "feeStructureId", "FeeStructureId", "id", "Id");
      if (!feeStructureId) throw new Error("Fee structure saved, but the structure ID was not returned.");
      await Promise.all(selectedItems.map((item) => (
        item.structureItemId
          ? apiClient.put(apiEndpoints.fee.updateStructureItem(item.structureItemId), buildStructureItemPayload(item))
          : apiClient.post(apiEndpoints.fee.addStructureItem(feeStructureId), buildStructureItemPayload(item))
      )));
      onSaved(initial?.id ? "Fee structure updated" : "Fee structure added", true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Modal
      title={initial?.id ? "Edit Fee Structure" : "Add Fee Structure"}
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Fee Structure"}</button>
        </>
      )}
    >
      <div className="cms-form-grid cols-3">
        <div className="cms-field">
          <label htmlFor="fs-board">Board <span className="req">*</span></label>
          <select id="fs-board" value={values.boardId || ""} onChange={(event) => update("boardId", event.target.value)}>
            <option value="">{masterErrors.boards ? "Unable to load boards" : masterLoading && !masters.boards.length ? "Loading boards..." : masters.boards.length ? "Select Board" : "No boards available"}</option>
            {masters.boards.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-year">Academic Year <span className="req">*</span></label>
          <select id="fs-year" value={values.academicYearId || values.academicYear} onChange={(event) => {
            update("academicYearId", event.target.value);
            update("academicYear", masters.years.find((item) => item.value === event.target.value)?.label || event.target.value);
          }}>
            <option value="">{masterErrors.years ? "Unable to load academic years" : masterLoading && !masters.years.length ? "Loading academic years..." : masters.years.length ? "Select Academic Year" : "No academic years available"}</option>
            {masters.years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-group">Group <span className="req">*</span></label>
          <select id="fs-group" value={values.groupId || ""} onChange={(event) => changeGroup(event.target.value)} disabled={!values.boardId || !values.academicYearId}>
            <option value="">{!values.boardId || !values.academicYearId ? "Select Board/Year first" : masterErrors.groups ? "Unable to load groups" : masterLoading && !groupOptions.length ? "Loading groups..." : groupOptions.length ? "Select Group" : "No groups available"}</option>
            {groupOptions.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-program">Program</label>
          <select id="fs-program" value={values.programId || ""} onChange={(event) => changeProgram(event.target.value)} disabled={!values.groupId || programLoading || !programOptions.length}>
            <option value="">{!values.groupId ? "Select Group first" : programLoading ? "Loading programs..." : programError ? "Unable to load programs" : programOptions.length ? "Select Program" : "No programs available"}</option>
            {programOptions.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
          </select>
        </div>
      </div>
      <div className="cms-fee-structure-items">
        <div className="cms-fee-structure-items-head">
          <h4>Configured Fee Types</h4>
          <span>{values.academicYear} / {values.group || "Group"} / {programOptions.find((item) => item.value === values.programId)?.label || "Program"}</span>
        </div>
        <div className="cms-table-wrap cms-fee-config-wrap">
          <table className="cms-table cms-fee-config-table cms-fee-setup-table cms-fee-types-table">
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr><th>Fee Type</th><th>Rule</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {values.feeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.type}</strong>{item.required ? <small className="cms-fee-required">Mandatory</small> : null}</td>
                  <td>
                    <select
                      className="cms-mini-input"
                      value={item.required ? "Mandatory" : "Optional"}
                      onChange={(event) => updateFeeItem(item.id, { required: event.target.value === "Mandatory" })}
                    >
                      <option value="Mandatory">Mandatory</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </td>
                  <td className="num">
                    <input
                      className="cms-mini-input"
                      type="number"
                      min="0"
                      value={item.originalAmount}
                      onChange={(event) => updateFeeItem(item.id, { originalAmount: Number(event.target.value || 0), selected: Number(event.target.value || 0) > 0 || item.required })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cms-fee-progress-head">
          <span>Total Active Fees</span>
          <strong>{formatCurrency(values.feeItems.filter((item) => item.selected).reduce((sum, item) => sum + Number(item.originalAmount || 0), 0))}</strong>
        </div>
        <p className="cms-fee-note"><CheckCircle size={14} /> Manage the reusable fee type list from the Fee Types tab, then adjust amounts here for this structure.</p>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

function FeeTypeFormModal({ initial, feeTypes, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    name: initial?.name || "",
    category: initial?.category || FEE_TYPE_CATEGORIES[1],
    status: initial?.status || "Active",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saveType = async () => {
    const name = draft.name.trim();
    if (!name) return setError("Fee Type Name is required");
    const duplicate = feeTypes.some((item) => item.id !== initial?.id && item.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) return setError(`${name} already exists`);
    const nextType = {
      id: initial?.id || `custom-${Date.now()}`,
      name,
      category: draft.category || "Other",
      status: draft.status || "Active",
    };
    setSaving(true);
    try {
      await onSaved(nextType, initial?.id ? "Fee type updated" : "Fee type added");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Modal
      title={initial?.id ? "Edit Fee Type" : "Add Fee Type"}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={saveType} disabled={saving}>{saving ? "Saving..." : "Save Fee Type"}</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        <div className="cms-field">
          <label htmlFor="ft-name">Fee Type Name <span className="req">*</span></label>
          <input id="ft-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="cms-field">
          <label htmlFor="ft-category">Category</label>
          <select id="ft-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
            {FEE_TYPE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="ft-status">Status</label>
          <select id="ft-status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

const feeTypePayload = (item) => ({
  FeeTypeName: item.name,
  FeeTypeCode: item.code || feeTypeCodeFor(item.name),
  Category: item.category || "Other",
  IsActive: item.status !== "Inactive",
});

const scholarshipPayload = (item) => ({
  ScholarshipName: item.name,
  DiscountType: item.discountType,
  DiscountValue: Number(item.discountValue || 0),
  IsActive: item.status !== "Inactive",
});

function FeeTypesTab({ feeTypes, onChange, onToast, onRefresh }) {
  const [formItem, setFormItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(feeTypes.length / PAGE_SIZE));
  const paginatedFeeTypes = pageItems(feeTypes, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const saveType = async (item, message) => {
    if (Number(item.id)) {
      await apiClient.put(apiEndpoints.fee.updateFeeType(item.id), feeTypePayload(item));
    } else {
      await apiClient.post(apiEndpoints.fee.createFeeType, feeTypePayload(item));
    }
    onToast(message);
    setFormItem(null);
    await onRefresh();
  };

  const deleteType = async (item) => {
    setDeletingId(item.id);
    try {
      if (Number(item.id)) {
        await apiClient.delete(apiEndpoints.fee.deleteFeeType(item.id));
        await onRefresh();
      } else {
        onChange(feeTypes.filter((feeType) => feeType.id !== item.id));
      }
      onToast("Fee type deleted");
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card cms-fee-types-card">
      <div className="cms-card-head">
        <div>
          <h2>Fee Types</h2>
          <p>Manage the reusable master list of fee types.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setFormItem({})}><Plus size={14} /> Add Fee Type</button>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-table-wrap cms-fee-config-wrap">
          <table className="cms-table cms-fee-config-table cms-fee-types-table">
            <thead>
              <tr><th>Fee Type</th><th>Category</th><th>Status</th><th className="cms-fee-actions-col">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedFeeTypes.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong>{String(item.id).startsWith("custom-") ? <small className="cms-fee-required">Local only</small> : null}</td>
                  <td>{item.category || "Other"}</td>
                  <td><span className={`cms-badge ${item.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}>{item.status}</span></td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button type="button" className="cms-action-btn" title="Edit fee type" aria-label="Edit fee type" onClick={() => setFormItem(item)}><Pencil size={15} /></button>
                      <button type="button" className="cms-action-btn" title="Delete fee type" aria-label="Delete fee type" disabled={deletingId === item.id} onClick={() => deleteType(item)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!feeTypes.length ? <tr><td colSpan={4} className="cms-fee-empty-row">No fee types found.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalItems={feeTypes.length} onPageChange={setPage} />
        <p className="cms-fee-note"><CheckCircle size={14} /> Fee Types define what can be charged. Amount, rule and active status are configured inside Fee Structure.</p>
      </div>
      {formItem ? (
        <FeeTypeFormModal
          initial={formItem.id ? formItem : null}
          feeTypes={feeTypes}
          onClose={() => setFormItem(null)}
          onSaved={saveType}
        />
      ) : null}
    </div>
  );
}

function ScholarshipFormModal({ initial, scholarships, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    name: initial?.name || "",
    discountType: initial?.discountType || "Percentage",
    discountValue: initial?.discountValue ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saveScholarship = async () => {
    const name = draft.name.trim();
    const discountValue = Number(draft.discountValue || 0);
    if (!name) return setError("Scholarship Name is required");
    if (!Number.isFinite(discountValue) || discountValue < 0) return setError("Discount Value must be 0 or greater");
    if (draft.discountType === "Percentage" && discountValue > 100) return setError("Percentage cannot exceed 100");
    if (scholarships.some((item) => item.id !== initial?.id && item.name.trim().toLowerCase() === name.toLowerCase())) return setError(`${name} already exists`);

    const nextScholarship = {
      id: initial?.id || `SCH-${Date.now()}`,
      name,
      discountType: draft.discountType,
      discountValue,
      status: initial?.status || "Active",
    };
    const nextScholarships = initial?.id
      ? scholarships.map((item) => (item.id === initial.id ? { ...item, ...nextScholarship } : item))
      : [...scholarships, nextScholarship];
    setSaving(true);
    try {
      await onSaved(nextScholarships, initial?.id ? "Scholarship updated" : "Scholarship added", nextScholarship);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Modal
      title={initial?.id ? "Edit Scholarship" : "Add Scholarship"}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={saveScholarship} disabled={saving}>{saving ? "Saving..." : "Save Scholarship"}</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        <div className="cms-field">
          <label htmlFor="sch-name">Scholarship Name</label>
          <input id="sch-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="cms-field">
          <label htmlFor="sch-type">Discount Type</label>
          <select id="sch-type" value={draft.discountType} onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value }))}>
            <option value="Percentage">Percentage</option>
            <option value="Fixed Amount">Fixed Amount</option>
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="sch-value">Discount Value</label>
          <input id="sch-value" type="number" min="0" max={draft.discountType === "Percentage" ? "100" : undefined} value={draft.discountValue} onChange={(event) => setDraft((current) => ({ ...current, discountValue: event.target.value }))} />
        </div>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

function ScholarshipsTab({ scholarships, onChange, onToast, onRefresh }) {
  const [formItem, setFormItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(scholarships.length / PAGE_SIZE));
  const paginatedScholarships = pageItems(scholarships, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const saveScholarship = async (nextScholarships, message, item) => {
    const payload = scholarshipPayload(item);
    if (Number(item.id)) {
      await apiClient.put(apiEndpoints.fee.updateScholarship(item.id), payload);
    } else {
      await apiClient.post(apiEndpoints.fee.createScholarship, payload);
    }
    onChange(nextScholarships);
    onToast(message);
    setFormItem(null);
    await onRefresh();
  };

  const deleteScholarship = async (item) => {
    setDeletingId(item.id);
    try {
      if (Number(item.id)) {
        await apiClient.delete(apiEndpoints.fee.deleteScholarship(item.id));
        await onRefresh();
      } else {
        onChange(scholarships.filter((scholarship) => scholarship.id !== item.id));
      }
      onToast("Scholarship deleted");
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card cms-fee-types-card">
      <div className="cms-card-head">
        <div>
          <h2>Scholarships</h2>
          <p>Manage scholarship and concession schemes available for student fee assignments.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setFormItem({})}><Plus size={14} /> Add Scholarship</button>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-table-wrap">
          <table className="cms-table cms-fee-setup-table cms-fee-scholarship-table">
            <colgroup>
              <col className="cms-fee-scholarship-name-col" />
              <col className="cms-fee-scholarship-type-col" />
              <col className="cms-fee-scholarship-value-col" />
              <col className="cms-fee-scholarship-actions-col" />
            </colgroup>
            <thead>
              <tr><th>Scholarship</th><th>Type</th><th className="cms-fee-value-col">Value</th><th className="cms-fee-actions-col">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedScholarships.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.discountType}</td>
                  <td className="cms-fee-value-col">{scholarshipValueLabel(item)}</td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button type="button" className="cms-action-btn" title="Edit scholarship" aria-label="Edit scholarship" onClick={() => setFormItem(item)}><Pencil size={15} /></button>
                      <button type="button" className="cms-action-btn" title="Delete scholarship" aria-label="Delete scholarship" disabled={deletingId === item.id} onClick={() => deleteScholarship(item)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!scholarships.length ? <tr><td colSpan={4} className="cms-fee-empty-row">No scholarships found.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalItems={scholarships.length} onPageChange={setPage} />
      </div>
      {formItem ? (
        <ScholarshipFormModal
          initial={formItem.id ? formItem : null}
          scholarships={scholarships}
          onClose={() => setFormItem(null)}
          onSaved={saveScholarship}
        />
      ) : null}
    </div>
  );
}

function StructureTab({ structures, onToast, onRefresh, loading, error, feeTypes, masters, masterErrors }) {
  const [editing, setEditing] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(structures.length / PAGE_SIZE));
  const paginatedStructures = pageItems(structures, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const copyStructure = (row) => {
    setEditing({
      ...row,
      id: "",
      status: "Active",
      feeItems: (row.feeItems || []).map((item) => ({
        ...item,
        structureId: "",
      })),
    });
  };

  const editStructure = async (row) => {
    setLoadingEditId(row.id);
    try {
      const [structureResult, itemsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.fee.getStructureById(row.id)),
        apiClient.get(apiEndpoints.fee.getStructureItems(row.id)),
      ]);
      const detail = structureResult.status === "fulfilled" ? getObject(structureResult.value.data) : row;
      const itemRows = itemsResult.status === "fulfilled"
        ? getCollection(itemsResult.value.data).map((item) => ({ ...row, ...detail, ...item }))
        : [];
      const [normalized] = normalizeFeeStructureRows(itemRows.length ? itemRows : [{ ...row, ...detail }]);
      setEditing({ ...row, ...normalized, feeItems: normalized?.feeItems?.length ? normalized.feeItems : row.feeItems });
    } catch (err) {
      onToast(getApiErrorMessage(err));
      setEditing(row);
    } finally {
      setLoadingEditId("");
    }
  };

  const deleteStructure = async (row) => {
    if (!row.id) return;
    setDeletingId(row.id);
    try {
      await apiClient.delete(apiEndpoints.fee.deleteStructure(row.id));
      onToast("Fee structure deleted");
      onRefresh();
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Fee Structure</h2>
        <button className="cms-btn cms-btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Fee Structure</button>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table cms-fee-setup-table cms-fee-structure-table">
          <colgroup>
            <col className="cms-fee-structure-year-col" />
            <col className="cms-fee-structure-group-col" />
            <col className="cms-fee-structure-program-col" />
            <col className="cms-fee-structure-types-col" />
            <col className="cms-fee-structure-total-col" />
            <col className="cms-fee-structure-actions-col" />
          </colgroup>
          <thead>
            <tr><th>Academic Year</th><th>Group</th><th>Program</th><th>Configured Fee Types</th><th className="num cms-fee-total-col">Total Fee</th><th className="cms-fee-actions-col">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="cms-fee-empty-row">Loading fee structures...</td></tr>
            ) : structures.length === 0 ? (
              <tr><td colSpan={6} className="cms-fee-empty-row">{error || "No fee structures found."}</td></tr>
            ) : paginatedStructures.map((row) => {
              const feeItems = row.feeItems || [];
              const activeItems = feeItems.filter((item) => item.selected);
              const activeTotal = activeItems.reduce((sum, item) => sum + Number(item.originalAmount || 0), 0);
              return (
                <tr key={row.id}>
                  <td><strong>{row.academicYear}</strong></td>
                  <td>{row.group}</td>
                  <td>{row.program || "Regular"}</td>
                  <td>
                    <div className="cms-fee-type-list">
                      {activeItems.slice(0, 4).map((item) => (
                        <span key={item.id} className={item.selected ? "" : "is-inactive"}>
                          {item.type}
                        </span>
                      ))}
                      {activeItems.length > 4 ? <span>+{activeItems.length - 4} more</span> : null}
                    </div>
                  </td>
                  <td className="num cms-fee-total-col">{formatCurrency(activeTotal)}</td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button className="cms-action-btn" title="Edit fee structure" aria-label="Edit fee structure" disabled={loadingEditId === row.id} onClick={() => editStructure(row)}><Pencil size={15} /></button>
                      <button className="cms-action-btn" title="Copy fee structure" aria-label="Copy fee structure" onClick={() => copyStructure(row)}><Copy size={15} /></button>
                      <button className="cms-action-btn" title="Delete fee structure" aria-label="Delete fee structure" disabled={deletingId === row.id} onClick={() => deleteStructure(row)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cms-card-body">
        <TablePagination page={page} totalItems={structures.length} onPageChange={setPage} />
        <p className="cms-fee-note">
          <CheckCircle size={14} /> Fee structure changes apply to future admissions only. Existing students keep the fee snapshot captured at admission.
        </p>
      </div>
      {editing ? (
        <StructureFormModal
          initial={Object.keys(editing).length ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); onToast(message); onRefresh(); }}
          feeTypes={feeTypes}
          masters={masters}
          masterErrors={masterErrors}
          masterLoading={loading}
          structures={structures}
        />
      ) : null}
    </div>
  );
}

function FeeSetupTab({ setupTab, onSetupTabChange, feeTypes, onFeeTypesChange, scholarships, onScholarshipsChange, structures, onToast, onRefresh, loading, error, masters, masterErrors }) {
  return (
    <div className="cms-fee-stack">
      <div className="cms-fee-tabs" role="tablist" aria-label="Fee setup">
        {FEE_SETUP_TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={setupTab === item}
            className={`cms-fee-tab ${setupTab === item ? "is-active" : ""}`}
            onClick={() => onSetupTabChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {setupTab === "Fee Types" ? <FeeTypesTab feeTypes={feeTypes} onChange={onFeeTypesChange} onToast={onToast} onRefresh={onRefresh} /> : null}
      {setupTab === "Fee Structure" ? (
        <StructureTab
          structures={structures}
          onToast={onToast}
          onRefresh={onRefresh}
          loading={loading}
          error={error}
          feeTypes={feeTypes}
          masters={masters}
          masterErrors={masterErrors}
        />
      ) : null}
      {setupTab === "Scholarships" ? <ScholarshipsTab scholarships={scholarships} onChange={onScholarshipsChange} onToast={onToast} onRefresh={onRefresh} /> : null}
    </div>
  );
}

/* ---------------------------- Payment history ---------------------------- */
function HistoryTab({ accounts, onReceipt }) {
  const [search, setSearch] = useState("");
  const [loadingReceiptId, setLoadingReceiptId] = useState("");
  const [page, setPage] = useState(1);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };
  const transactions = useMemo(() => allTransactions(accounts), [accounts]);

  const rows = transactions.filter((row) => {
    const term = search.trim().toLowerCase();
    return !term
      || row.studentName.toLowerCase().includes(term)
      || row.admissionNo.toLowerCase().includes(term)
      || row.receiptNo.toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = pageItems(rows, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const viewReceipt = async (row) => {
    const paymentId = row.feePaymentId || row.paymentId || row.id;
    setLoadingReceiptId(row.id);
    try {
      const response = row.receiptNo
        ? await apiClient.get(apiEndpoints.fee.receiptByNumber(row.receiptNo))
        : await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
      onReceipt({ ...row, ...getObject(response.data) });
    } catch {
      try {
        const response = await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
        onReceipt({ ...row, ...getObject(response.data) });
      } catch {
        onReceipt(row);
      }
    } finally {
      setLoadingReceiptId("");
    }
  };

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Payment History</h2>
        <span className="cms-badge cms-badge-info">{rows.length} transactions</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls cms-fee-search-only">
        <div className="cms-fee-search">
          <Search size={15} />
          <input value={search} placeholder="Search by student, admission number or receipt number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Receipt Number</th><th>Date</th><th>Admission No</th><th>Student Name</th><th>Group / Section</th>
              <th>Payment Type</th><th className="num">Amount</th><th>Payment Method</th><th>Transaction Reference</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">No payments match the current search and filters.</td></tr>
            ) : paginatedRows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.receiptNo}</strong></td>
                <td>{formatDate(row.date)}</td>
                <td>{row.admissionNo}</td>
                <td>{row.studentName}</td>
                <td>{row.group} / {row.section}</td>
                <td>{feeScheduleLabel(row.type)}</td>
                <td className="num">{formatCurrency(row.amount)}</td>
                <td>{row.method}</td>
                <td>{row.reference || "-"}</td>
                <td><StatusBadge status="Paid" /></td>
                <td>
                  <button className="cms-action-btn" title="View receipt" aria-label="View receipt" disabled={loadingReceiptId === row.id} onClick={() => viewReceipt(row)}><ReceiptText size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

/* -------------------------------- Page ---------------------------------- */
export default function FeeManagementPage() {
  const [tab, setTab] = useState(TABS[0]);
  const [setupTab, setSetupTab] = useState(FEE_SETUP_TABS[0]);
  const [selectedId, setSelectedId] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState("");
  const [feeTypes, setFeeTypes] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [apiStructures, setApiStructures] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [masters, setMasters] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [masterErrors, setMasterErrors] = useState({});
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [collectionAccounts, setCollectionAccounts] = useState([]);
  const [accountLoading, setAccountLoading] = useState({ ledger: false, collection: false });
  const [accountErrors, setAccountErrors] = useState({ ledger: "", collection: "" });

  const structures = apiStructures;
  const overviewAccounts = ledgerAccounts;
  const selected = selectedId ? [...ledgerAccounts, ...collectionAccounts].find((item) => item.id === selectedId) : null;
  const modalOpen = Boolean(selected || collecting || receipt);

  const saveFeeTypes = (nextTypes) => {
    setFeeTypes(nextTypes);
  };

  const saveScholarships = (nextScholarships) => {
    setScholarships(nextScholarships);
  };

  const loadFeeAccounts = useCallback(async (source) => {
    const endpoint = source === "collection" ? apiEndpoints.fee.collection : apiEndpoints.fee.ledger;
    setAccountLoading((current) => ({ ...current, [source]: true }));
    setAccountErrors((current) => ({ ...current, [source]: "" }));
    try {
      const response = await apiClient.get(endpoint);
      const accounts = normalizeFeeAccountRows(getCollection(response.data));
      if (source === "collection") {
        setCollectionAccounts(accounts);
      } else {
        setLedgerAccounts(accounts);
      }
    } catch (err) {
      if (source === "collection") {
        setCollectionAccounts([]);
      } else {
        setLedgerAccounts([]);
      }
      setAccountErrors((current) => ({ ...current, [source]: getApiErrorMessage(err) }));
    } finally {
      setAccountLoading((current) => ({ ...current, [source]: false }));
    }
  }, []);

  const loadFeeApiData = useCallback(async () => {
    setStructureLoading(true);
    setStructureError("");
    setMasterErrors({});
    const [typesResult, structuresResult, scholarshipsResult, boardsResult, yearsResult, levelsResult, groupsResult, sectionsResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.feeTypes),
      apiClient.get(apiEndpoints.fee.getStructures),
      apiClient.get(apiEndpoints.fee.scholarships),
      apiClient.get(apiEndpoints.boards.getAll),
      apiClient.get(apiEndpoints.academicYears.getAll),
      apiClient.get(apiEndpoints.boards.getAcademicLevels),
      apiClient.get(apiEndpoints.groups.dropdown).catch(() => apiClient.get(apiEndpoints.groups.getAll, { params: { isActive: true } })),
      apiClient.get(apiEndpoints.sections.getAll),
    ]);

    if (typesResult.status === "fulfilled") {
      const apiTypes = getCollection(typesResult.value.data).map(feeTypeOption).filter((item) => item.id);
      setFeeTypes(apiTypes);
    }
    if (structuresResult.status === "fulfilled") {
      setApiStructures(normalizeFeeStructureRows(getCollection(structuresResult.value.data)));
    } else {
      setApiStructures([]);
      setStructureError(getApiErrorMessage(structuresResult.reason));
    }
    if (scholarshipsResult.status === "fulfilled") {
      setScholarships(normalizeScholarshipRows(getCollection(scholarshipsResult.value.data)));
    }
    setMasters({
      boards: boardsResult.status === "fulfilled"
        ? toSelectOptions(getCollection(boardsResult.value.data), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"])
        : [],
      years: yearsResult.status === "fulfilled"
        ? uniqueAcademicYearsByName(
          toSelectOptions(getCollection(yearsResult.value.data), ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]),
          (item) => item.label,
        )
        : [],
      levels: levelsResult.status === "fulfilled"
        ? toSelectOptions(getCollection(levelsResult.value.data), ["academicLevelId", "AcademicLevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "name", "Name"])
        : [],
      groups: groupsResult.status === "fulfilled"
        ? getCollection(groupsResult.value.data).map(groupOption).filter(Boolean)
        : [],
      sections: sectionsResult.status === "fulfilled"
        ? getCollection(sectionsResult.value.data).map(sectionOption).filter(Boolean)
        : [],
    });
    setMasterErrors({
      boards: boardsResult.status === "rejected" ? getApiErrorMessage(boardsResult.reason) : "",
      years: yearsResult.status === "rejected" ? getApiErrorMessage(yearsResult.reason) : "",
      levels: levelsResult.status === "rejected" ? getApiErrorMessage(levelsResult.reason) : "",
      groups: groupsResult.status === "rejected" ? getApiErrorMessage(groupsResult.reason) : "",
      sections: sectionsResult.status === "rejected" ? getApiErrorMessage(sectionsResult.reason) : "",
      scholarships: scholarshipsResult.status === "rejected" ? getApiErrorMessage(scholarshipsResult.reason) : "",
    });
    setStructureLoading(false);
  }, []);

  const openCollectPayment = (id) => {
    setSelectedId(id);
    setCollecting(true);
  };

  const printStudentStatement = (id) => {
    setSelectedId(id);
    window.setTimeout(() => printFeeTarget("student"), 80);
  };

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    loadFeeApiData();
    loadFeeAccounts("ledger");
  }, [loadFeeApiData, loadFeeAccounts]);

  useEffect(() => {
    if (tab === "Fee Collection") loadFeeAccounts("collection");
    if (tab === "Student Fee Ledger" || tab === "Payment History" || tab === "Overview") loadFeeAccounts("ledger");
  }, [loadFeeAccounts, tab]);

  return (
    <DashboardLayout
      title="Fee Management"
      subtitle="Manage fee structures, scholarships, student balances and collections."
      breadcrumb={["Administration"]}
    >
      <div className="cms-fee-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`cms-fee-tab ${tab === item ? "is-active" : ""}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? <OverviewTab accounts={overviewAccounts} /> : null}
      {tab === "Student Fee Ledger" ? <LedgerTab accounts={ledgerAccounts} onView={setSelectedId} onPrint={printStudentStatement} masters={masters} loading={accountLoading.ledger} error={accountErrors.ledger} /> : null}
      {tab === "Fee Setup" ? (
        <FeeSetupTab
          setupTab={setupTab}
          onSetupTabChange={setSetupTab}
          feeTypes={feeTypes}
          onFeeTypesChange={saveFeeTypes}
          scholarships={scholarships}
          onScholarshipsChange={saveScholarships}
          structures={structures}
          onToast={setToast}
          onRefresh={loadFeeApiData}
          loading={structureLoading}
          error={structureError}
          masters={masters}
          masterErrors={masterErrors}
        />
      ) : null}
      {tab === "Fee Collection" ? <FeeCollectionTab accounts={collectionAccounts} onCollect={openCollectPayment} loading={accountLoading.collection} error={accountErrors.collection} /> : null}
      {tab === "Payment History" ? <HistoryTab accounts={ledgerAccounts} onReceipt={setReceipt} loading={accountLoading.ledger} error={accountErrors.ledger} /> : null}

      {selected ? (
        <StudentFeeDrawer
          account={selected}
          onClose={() => setSelectedId(null)}
          onCollect={() => setCollecting(true)}
          onReceipt={setReceipt}
        />
      ) : null}

      {selected && collecting ? (
        <CollectPaymentModal
          account={selected}
          onClose={() => setCollecting(false)}
          onSaved={(saved) => {
            setCollecting(false);
            setToast(`Payment of ${formatCurrency(saved.amount)} recorded - receipt ${saved.receiptNo}`);
            loadFeeAccounts("ledger");
            loadFeeAccounts("collection");
          }}
        />
      ) : null}

      {receipt ? <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} /> : null}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
