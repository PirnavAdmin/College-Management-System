import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  CircleDollarSign,
  Eye,
  Filter,
  IndianRupee,
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
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  ADMISSION_FEE,
  COLLEGE_NAME,
  PAYMENT_METHODS,
  PAYMENT_PLANS,
  allTransactions,
  collectPayment,
  courseFeeFor,
  feeAccountsDerived,
  feeItemsForStructure,
  feeScheduleLabel,
  feeStatusTone,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  groupWiseTotals,
  isDuplicateStructure,
  overviewTotals,
  saveFeeStructure,
  todayISO,
  upcomingInstallments,
  useFeeState,
} from "@/data/feeManagementData.js";
import "./FeeManagementPage.css";

const TABS = ["Overview", "Student Fee Ledger", "Fee Structure", "Payment History"];
const PAYMENT_TYPES = ["Admission Fee", "Full Course Fee", "Course Fee", "Full Remaining Balance", "Installment 1", "Installment 2", "Installment 3", "Installment 4"];
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

const dateInputValue = (value) => String(value || "").slice(0, 10);

const toSelectOptions = (rows, idKeys, labelKeys) => rows
  .map((item) => {
    const value = read(item, ...idKeys);
    const label = read(item, ...labelKeys) ?? value;
    if (value === undefined || value === null || value === "") return null;
    return { value: String(value), label: String(label) };
  })
  .filter(Boolean);

const groupOption = (item) => {
  const option = toSelectOptions([item], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"])[0];
  return option ? {
    ...option,
    boardId: textValue(item, "boardId", "BoardId"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId"),
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId"),
  } : null;
};

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

const feeTypeOption = (item) => ({
  id: String(read(item, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId") ?? ""),
  name: textValue(item, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type", "label", "Label") || "Fee Type",
});

const normalizeFeeStructureRows = (rows) => rows.map((item, index) => {
  const feeType = feeTypeOption(item);
  const amount = numberValue(item, "amount", "Amount", "feeAmount", "FeeAmount");
  const group = textValue(item, "groupName", "GroupName", "group", "Group", "courseName", "CourseName") || textValue(item, "groupId", "GroupId");
  const section = textValue(item, "sectionName", "SectionName", "section", "Section") || "-";
  const academicYear = textValue(item, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear") || textValue(item, "academicYearId", "AcademicYearId");
  const academicLevel = textValue(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel") || textValue(item, "academicLevelId", "AcademicLevelId");
  return {
    id: String(read(item, "feeStructureId", "FeeStructureId", "id", "Id") ?? `api-${index}`),
    boardId: textValue(item, "boardId", "BoardId"),
    board: textValue(item, "boardName", "BoardName", "board", "Board") || textValue(item, "boardId", "BoardId"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId"),
    academicYear,
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId"),
    academicLevel,
    groupId: textValue(item, "groupId", "GroupId"),
    group,
    sectionId: textValue(item, "sectionId", "SectionId"),
    section,
    dueDate: dateInputValue(read(item, "dueDate", "DueDate")),
    status: textValue(item, "status", "Status") || "Active",
    feeItems: [{
      id: feeType.id || `type-${index}`,
      feeTypeId: feeType.id,
      type: feeType.name,
      originalAmount: amount,
      payableAmount: amount,
      selected: true,
      required: Boolean(read(item, "isMandatory", "IsMandatory", "required", "Required")),
      structureId: String(read(item, "feeStructureId", "FeeStructureId", "id", "Id") ?? ""),
    }],
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
        <SummaryCard icon={CircleDollarSign} tone="violet" label="Total Fee Expected" value={formatCompactCurrency(totals.totalExpected)} hint="Admission + course fees" />
        <SummaryCard icon={WalletCards} tone="green" label="Total Collected" value={formatCompactCurrency(totals.totalCollected)} hint={`${totals.collectedPercent.toFixed(1)}% of expected`} />
        <SummaryCard icon={IndianRupee} tone="amber" label="Outstanding Amount" value={formatCompactCurrency(totals.outstanding)} hint="Yet to be collected" />
        <SummaryCard icon={AlertCircle} tone="red" label="Pending / Overdue" value={`${totals.pendingStudents} Students`} hint={`${totals.overdueStudents} overdue`} />
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Fee Collection Progress</h2></div>
        <div className="cms-card-body">
          <div className="cms-fee-progress-head">
            <span>Collected {formatCompactCurrency(totals.totalCollected)} of {formatCompactCurrency(totals.totalExpected)}</span>
            <strong>{totals.collectedPercent.toFixed(1)}% Collected</strong>
          </div>
          <div className="cms-fee-progress"><span style={{ width: `${Math.min(totals.collectedPercent, 100)}%` }} /></div>
        </div>
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
    setSaving(true);
    try {
      if (account.assignmentId || account.studentFeeAssignmentId) {
        await apiClient.post(apiEndpoints.fee.collect, {
          studentFeeAssignmentId: Number(account.assignmentId || account.studentFeeAssignmentId),
          amount: netAmount,
          paymentMode: method,
          transactionNumber: reference,
          remarks: note,
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSaving(false);
      return null;
    }

    const saved = collectPayment(account.id, {
      mode: target === "full" ? "full" : "installment",
      installmentNo: target === "full" ? null : Number(target),
      amount: target === "full" ? account.balance : value,
      discount: discountValue,
      fine: fineValue,
      date,
      method,
      reference,
      note,
    });
    if (!saved) {
      setSaving(false);
      return setError("Payment could not be recorded");
    }
    setSaving(false);
    return onSaved(saved);
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
function LedgerTab({ accounts, onView, onCollect, onPrint, masters }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ academicYear: "", group: "", section: "", paymentPlan: "", feeStatus: "" });
  const setFilter = (key) => (value) => setFilters((current) => ({ ...current, [key]: value, ...(key === "group" ? { section: "" } : {}) }));

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

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Student Fee Ledger</h2>
        <span className="cms-badge cms-badge-info">{rows.length} of {accounts.length} students</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-fee-search">
          <Search size={15} />
          <input value={search} placeholder="Search by student name or admission number" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="cms-fee-filter-row">
          <span className="cms-fee-filter-label"><Filter size={14} /> Filters</span>
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
            ) : rows.map((item) => (
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
                    <button className="cms-action-btn" title="Collect payment" aria-label="Collect payment" disabled={item.balance === 0} onClick={() => onCollect(item.id)}>
                      <WalletCards size={15} />
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
    </div>
  );
}

/* ----------------------------- Fee structure ----------------------------- */
function StructureFormModal({ initial, onClose, onSaved, feeTypes, masters }) {
  const firstGroup = masters.groups[0];
  const firstSection = firstGroup
    ? masters.sections.find((item) => item.groupId === firstGroup.value)
    : null;
  const initialValues = initial || {
    boardId: masters.boards[0]?.value || "",
    academicYear: masters.years[0]?.label || "",
    academicYearId: masters.years[0]?.value || "",
    academicLevelId: masters.levels[0]?.value || "",
    group: firstGroup?.label || "",
    groupId: firstGroup?.value || "",
    section: firstSection?.label || "",
    sectionId: firstSection?.value || "",
    admissionFee: ADMISSION_FEE,
    courseFee: courseFeeFor(firstGroup?.label || "", firstSection?.label || ""),
    dueDate: todayISO(),
    status: "Active",
  };
  const backendFeeItems = feeTypes.map((item) => ({
    id: item.id,
    feeTypeId: item.id,
    type: item.name,
    originalAmount: initial?.feeItems?.find((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.id))?.originalAmount ?? "",
    payableAmount: initial?.feeItems?.find((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.id))?.payableAmount ?? "",
    selected: Boolean(initial?.feeItems?.some((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.id))),
    required: Boolean(initial?.feeItems?.find((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.id))?.required),
    structureId: initial?.feeItems?.find((feeItem) => String(feeItem.feeTypeId || feeItem.id) === String(item.id))?.structureId || initial?.id || "",
  }));
  const [values, setValues] = useState({
    ...initialValues,
    feeItems: backendFeeItems.length ? backendFeeItems : feeItemsForStructure(initialValues, initialValues.group, initialValues.section),
  });
  const [newFee, setNewFee] = useState({
    type: "",
    originalAmount: "",
    required: false,
    selected: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const groupOptions = useMemo(() => (
    masters.groups.filter((item) => (
      (!values.boardId || !item.boardId || item.boardId === String(values.boardId))
      && (!values.academicYearId || !item.academicYearId || item.academicYearId === String(values.academicYearId))
      && (!values.academicLevelId || !item.academicLevelId || item.academicLevelId === String(values.academicLevelId))
    ))
  ), [masters.groups, values.academicLevelId, values.academicYearId, values.boardId]);
  const sectionOptions = useMemo(() => (
    masters.sections.filter((item) => (
      (!values.groupId || !item.groupId || item.groupId === String(values.groupId))
      && (!values.academicYearId || !item.academicYearId || item.academicYearId === String(values.academicYearId))
      && (!values.academicLevelId || !item.academicLevelId || item.academicLevelId === String(values.academicLevelId))
    ))
  ), [masters.sections, values.academicLevelId, values.academicYearId, values.groupId]);

  const update = (key, value) => setValues((current) => {
    const nextGroup = key === "group" ? value : current.group;
    const nextSection = key === "group" ? "" : key === "section" ? value : current.section;
    const nextCourseFee = key === "group" || key === "section"
      ? courseFeeFor(nextGroup, nextSection)
      : current.courseFee;
    const next = {
      ...current,
      [key]: value,
      ...(["boardId", "academicYearId", "academicLevelId"].includes(key) ? { group: "", groupId: "", section: "", sectionId: "", feeItems: current.feeItems } : {}),
      ...(key === "group" ? { group: nextGroup, section: "", sectionId: "", courseFee: nextCourseFee } : {}),
      ...(key === "section" ? { section: nextSection, courseFee: nextCourseFee } : {}),
    };
    if (key === "admissionFee" || key === "courseFee" || key === "group" || key === "section") {
      const type = key === "admissionFee" ? "Admission Fee" : "Course Fee";
      next.feeItems = current.feeItems.map((item) => (
        item.type === type ? { ...item, originalAmount: Number(key === "admissionFee" ? value || 0 : nextCourseFee || value || 0), selected: true } : item
      ));
    }
    return next;
  });

  const updateNewFee = (key, value) => {
    setError("");
    setNewFee((current) => ({ ...current, [key]: value }));
  };

  const updateFeeItem = (id, patch) => {
    setValues((current) => {
      const feeItems = current.feeItems.map((item) => (item.id === id ? { ...item, ...patch } : item));
      const admissionFee = feeItems.find((item) => item.type === "Admission Fee")?.originalAmount ?? current.admissionFee;
      const courseFee = feeItems.find((item) => item.type === "Course Fee")?.originalAmount ?? current.courseFee;
      return { ...current, feeItems, admissionFee, courseFee };
    });
  };

  const addFeeType = () => {
    if (feeTypes.length) {
      return setError("Fee types are managed by the backend. No create fee type endpoint is available yet.");
    }
    const type = newFee.type.trim();
    const amount = Number(newFee.originalAmount || 0);
    if (!type) return setError("Fee Type Name is required");
    if (values.feeItems.some((item) => item.type.trim().toLowerCase() === type.toLowerCase())) {
      return setError(`${type} is already configured for this Group / Section`);
    }
    if (!Number.isFinite(amount) || amount < 0) return setError("Enter a valid Default Amount");

    setValues((current) => ({
      ...current,
      feeItems: [
        ...current.feeItems,
        {
          id: `custom-${Date.now()}`,
          type,
          originalAmount: amount,
          payableAmount: amount,
          selected: Boolean(newFee.selected),
          required: Boolean(newFee.required),
        },
      ],
    }));
    setNewFee({
      type: "",
      originalAmount: "",
      required: false,
      selected: true,
    });
    return null;
  };

  const buildStructurePayload = (item) => ({
    boardId: Number(values.boardId || values.board || 0),
    academicYearId: Number(values.academicYearId || values.academicYear || 0),
    academicLevelId: Number(values.academicLevelId || values.academicLevel || 0),
    groupId: Number(values.groupId || values.group || 0),
    sectionId: Number(values.sectionId || values.section || 0),
    feeTypeId: Number(item.feeTypeId || item.id || 0),
    amount: Number(item.originalAmount || 0),
    dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : new Date().toISOString(),
  });

  const save = async () => {
    const selectedItems = values.feeItems.filter((item) => item.selected);
    if (!values.academicYear && !values.academicYearId) return setError("Academic Year is required");
    if (!values.group && !values.groupId) return setError("Group / Course is required");
    if (!values.section && !values.sectionId) return setError("Section is required");
    if (!selectedItems.length) return setError("Select at least one fee type for this structure");
    if (values.feeItems.some((item) => Number(item.originalAmount || 0) < 0)) return setError("Fee amount cannot be negative");
    if (!initial?.id && isDuplicateStructure(values, initial?.id)) return setError("A fee structure already exists for this Academic Year, Group and Section");
    setSaving(true);
    try {
      if (feeTypes.length) {
        await Promise.all(selectedItems.map((item) => {
          const payload = buildStructurePayload(item);
          const structureId = item.structureId || (selectedItems.length === 1 ? initial?.id : "");
          return structureId
            ? apiClient.put(apiEndpoints.fee.updateStructure(structureId), payload)
            : apiClient.post(apiEndpoints.fee.createStructure, payload);
        }));
      } else {
        saveFeeStructure(values, initial?.id);
      }
      onSaved(initial?.id ? "Fee structure updated" : "Fee structure added", true);
    } catch (err) {
      if (feeTypes.length) {
        setError(getApiErrorMessage(err));
      } else {
        saveFeeStructure(values, initial?.id);
        onSaved(initial?.id ? "Fee structure updated locally" : "Fee structure added locally", false);
      }
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
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </>
      )}
    >
      <div className="cms-form-grid cols-3">
        <div className="cms-field">
          <label htmlFor="fs-board">Board <span className="req">*</span></label>
          <select id="fs-board" value={values.boardId || ""} onChange={(event) => update("boardId", event.target.value)}>
            <option value="">Select Board</option>
            {masters.boards.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-year">Academic Year <span className="req">*</span></label>
          <select id="fs-year" value={values.academicYearId || values.academicYear} onChange={(event) => {
            update("academicYearId", event.target.value);
            update("academicYear", masters.years.find((item) => item.value === event.target.value)?.label || event.target.value);
          }}>
            <option value="">Select Academic Year</option>
            {masters.years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-level">Academic Level <span className="req">*</span></label>
          <select id="fs-level" value={values.academicLevelId || ""} onChange={(event) => update("academicLevelId", event.target.value)}>
            <option value="">Select Academic Level</option>
            {masters.levels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-group">Group / Course <span className="req">*</span></label>
          <select id="fs-group" value={values.groupId || ""} onChange={(event) => {
            const label = groupOptions.find((item) => item.value === event.target.value)?.label || "";
            update("groupId", event.target.value);
            update("group", label);
          }}>
            <option value="">Select Group</option>
            {groupOptions.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-section">Section <span className="req">*</span></label>
          <select id="fs-section" value={values.sectionId || ""} onChange={(event) => {
            const label = sectionOptions.find((item) => item.value === event.target.value)?.label || "";
            update("sectionId", event.target.value);
            update("section", label);
          }}>
            <option value="">Select Section</option>
            {sectionOptions.map((section) => <option key={section.value} value={section.value}>{section.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-due">Due Date <span className="req">*</span></label>
          <input id="fs-due" type="date" value={values.dueDate || ""} onChange={(event) => update("dueDate", event.target.value)} />
        </div>
        <div className="cms-field">
          <label htmlFor="fs-status">Status</label>
          <select id="fs-status" value={values.status} onChange={(event) => update("status", event.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="cms-fee-structure-items">
        <div className="cms-fee-structure-items-head">
          <h4>Configured Fee Types</h4>
          <span>{values.academicYear} / {values.group || "Group"} / {values.section || "Section"}</span>
        </div>
        <div className="cms-table-wrap cms-fee-config-wrap">
          <table className="cms-table cms-fee-config-table">
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "26%" }} />
            </colgroup>
            <thead>
              <tr><th>Fee Type</th><th>Rule</th><th className="num">Amount</th><th>Status</th></tr>
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
                  <td>
                    <select
                      className="cms-mini-input"
                      value={item.selected ? "Active" : "Inactive"}
                      onChange={(event) => updateFeeItem(item.id, { selected: event.target.value === "Active" })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cms-fee-add-type">
          <h4><Plus size={14} /> Add Fee Type</h4>
          <div className="cms-form-grid cols-3">
            <div className="cms-field">
              <label htmlFor="fs-new-type">Fee Type Name <span className="req">*</span></label>
              <input id="fs-new-type" value={newFee.type} placeholder="Transport Fee" onChange={(event) => updateNewFee("type", event.target.value)} />
            </div>
            <div className="cms-field">
              <label htmlFor="fs-new-amount">Default Amount</label>
              <input id="fs-new-amount" type="number" min="0" value={newFee.originalAmount} onChange={(event) => updateNewFee("originalAmount", event.target.value)} />
            </div>
            <div className="cms-field">
              <label htmlFor="fs-new-rule">Mandatory / Optional</label>
              <select id="fs-new-rule" value={newFee.required ? "Mandatory" : "Optional"} onChange={(event) => updateNewFee("required", event.target.value === "Mandatory")}>
                <option value="Optional">Optional</option>
                <option value="Mandatory">Mandatory</option>
              </select>
            </div>
            <div className="cms-field">
              <label htmlFor="fs-new-status">Status</label>
              <select id="fs-new-status" value={newFee.selected ? "Active" : "Inactive"} onChange={(event) => updateNewFee("selected", event.target.value === "Active")}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <button type="button" className="cms-btn cms-btn-ghost cms-fee-add-type-btn" onClick={addFeeType}>
            <Plus size={14} /> Add Fee Type
          </button>
        </div>
        <p className="cms-fee-note"><CheckCircle size={14} /> Set optional fee types to Inactive or zero if they do not apply to this Group / Section.</p>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

function StructureTab({ structures, onToast, onRefresh, loading, error, feeTypes, masters }) {
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const deleteStructure = async (row) => {
    const ids = (row.feeItems || []).map((item) => item.structureId).filter(Boolean);
    const targets = ids.length ? ids : [row.id].filter(Boolean);
    if (!targets.length) return;
    setDeletingId(row.id);
    try {
      await Promise.all(targets.map((id) => apiClient.delete(apiEndpoints.fee.deleteStructure(id))));
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
        <table className="cms-table">
          <thead>
            <tr><th>Academic Year</th><th>Group</th><th>Section</th><th>Configured Fee Types</th><th className="num">Total Active Fees</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="cms-fee-empty-row">Loading fee structures...</td></tr>
            ) : structures.length === 0 ? (
              <tr><td colSpan={7} className="cms-fee-empty-row">{error || "No fee structures found."}</td></tr>
            ) : structures.map((row) => {
              const feeItems = row.feeItems?.length ? row.feeItems : feeItemsForStructure(row, row.group, row.section);
              const activeItems = feeItems.filter((item) => item.selected);
              const activeTotal = activeItems.reduce((sum, item) => sum + Number(item.originalAmount || 0), 0);
              return (
                <tr key={row.id}>
                  <td><strong>{row.academicYear}</strong></td>
                  <td>{row.group}</td>
                  <td>{row.section}</td>
                  <td>
                    <div className="cms-fee-type-list">
                      {feeItems.map((item) => (
                        <span key={item.id} className={item.selected ? "" : "is-inactive"}>
                          {item.type} - {formatCurrency(item.originalAmount)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="num">{formatCurrency(activeTotal)}</td>
                  <td><span className={`cms-badge ${row.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}>{row.status}</span></td>
                  <td>
                    <div className="cms-actions">
                      <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" onClick={() => setEditing(row)}><Pencil size={14} /> Edit</button>
                      <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={deletingId === row.id} onClick={() => deleteStructure(row)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cms-card-body">
        <p className="cms-fee-note">
          <CheckCircle size={14} /> Fee structure changes apply to future admissions only. Existing students keep the fee snapshot captured at admission.
        </p>
      </div>
      {editing ? (
        <StructureFormModal
          initial={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); onToast(message); onRefresh(); }}
          feeTypes={feeTypes}
          masters={masters}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------- Payment history ---------------------------- */
function HistoryTab({ accounts, onReceipt, masters }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ date: "", group: "", section: "", type: "", method: "" });
  const setFilter = (key) => (value) => setFilters((current) => ({ ...current, [key]: value, ...(key === "group" ? { section: "" } : {}) }));
  const transactions = useMemo(() => allTransactions(accounts), [accounts]);
  const optionLabel = (list, value) => list?.find((option) => String(option.value) === String(value))?.label || "";
  const selectedGroupLabel = optionLabel(masters.groups, filters.group);
  const sectionOptions = masters.sections.filter((item) => !filters.group || !item.groupId || item.groupId === String(filters.group));
  const paymentTypeOptions = PAYMENT_TYPES.map((type) => ({ value: type, label: feeScheduleLabel(type) }));

  const rows = transactions.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || row.studentName.toLowerCase().includes(term)
      || row.admissionNo.toLowerCase().includes(term)
      || row.receiptNo.toLowerCase().includes(term);
    return matchesSearch
      && (!filters.date || String(row.date).slice(0, 10) === filters.date)
      && (!filters.group || row.groupId === filters.group || row.group === selectedGroupLabel || row.group === filters.group)
      && (!filters.section || row.sectionId === filters.section || row.section === optionLabel(sectionOptions, filters.section) || row.section === filters.section)
      && (!filters.type || row.type === filters.type)
      && (!filters.method || row.method === filters.method);
  });

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Payment History</h2>
        <span className="cms-badge cms-badge-info">{rows.length} transactions</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-fee-search">
          <Search size={15} />
          <input value={search} placeholder="Search by student, admission number or receipt number" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="cms-fee-filter-row">
          <label className="cms-fee-filter">
            <span>Date</span>
            <input type="date" value={filters.date} onChange={(event) => setFilter("date")(event.target.value)} />
          </label>
          <SelectFilter label="Group" value={filters.group} options={masters.groups} onChange={setFilter("group")} />
          <SelectFilter label="Section" value={filters.section} options={sectionOptions} onChange={setFilter("section")} />
          <SelectFilter label="Payment Type" value={filters.type} options={paymentTypeOptions} onChange={setFilter("type")} />
          <SelectFilter label="Payment Method" value={filters.method} options={PAYMENT_METHODS} onChange={setFilter("method")} />
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
            ) : rows.map((row) => (
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
                  <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" onClick={() => onReceipt(row)}><ReceiptText size={14} /> View Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------- Page ---------------------------------- */
export default function FeeManagementPage() {
  const state = useFeeState();
  const [tab, setTab] = useState(TABS[0]);
  const [selectedId, setSelectedId] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState("");
  const [feeTypes, setFeeTypes] = useState([]);
  const [apiStructures, setApiStructures] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [masters, setMasters] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });

  const accounts = useMemo(() => feeAccountsDerived(state), [state]);
  const structures = apiStructures.length ? apiStructures : state.feeStructures;
  const selected = selectedId ? accounts.find((item) => item.id === selectedId) : null;
  const modalOpen = Boolean(selected || collecting || receipt);

  const loadFeeApiData = async () => {
    setStructureLoading(true);
    setStructureError("");
    const [typesResult, structuresResult, boardsResult, yearsResult, levelsResult, groupsResult, sectionsResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.feeTypes),
      apiClient.get(apiEndpoints.fee.getStructures),
      apiClient.get(apiEndpoints.boards.getAll),
      apiClient.get(apiEndpoints.academicYears.getAll),
      apiClient.get(apiEndpoints.boards.getAcademicLevels),
      apiClient.get(apiEndpoints.groups.getAll),
      apiClient.get(apiEndpoints.sections.getAll),
    ]);

    if (typesResult.status === "fulfilled") {
      setFeeTypes(getCollection(typesResult.value.data).map(feeTypeOption).filter((item) => item.id));
    }
    if (structuresResult.status === "fulfilled") {
      setApiStructures(normalizeFeeStructureRows(getCollection(structuresResult.value.data)));
    } else {
      setApiStructures([]);
      setStructureError(getApiErrorMessage(structuresResult.reason));
    }
    setMasters({
      boards: boardsResult.status === "fulfilled"
        ? toSelectOptions(getCollection(boardsResult.value.data), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"])
        : [],
      years: yearsResult.status === "fulfilled"
        ? toSelectOptions(getCollection(yearsResult.value.data), ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"])
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
    setStructureLoading(false);
  };

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
  }, []);

  return (
    <DashboardLayout
      title="Fee Management"
      subtitle="Admission fee, course fee, fee schedules and collections in one place."
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

      {tab === "Overview" ? <OverviewTab accounts={accounts} /> : null}
      {tab === "Student Fee Ledger" ? <LedgerTab accounts={accounts} onView={setSelectedId} onCollect={openCollectPayment} onPrint={printStudentStatement} masters={masters} /> : null}
      {tab === "Fee Structure" ? (
        <StructureTab
          structures={structures}
          onToast={setToast}
          onRefresh={loadFeeApiData}
          loading={structureLoading}
          error={structureError}
          feeTypes={feeTypes}
          masters={masters}
        />
      ) : null}
      {tab === "Payment History" ? <HistoryTab accounts={accounts} onReceipt={setReceipt} masters={masters} /> : null}

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
          }}
        />
      ) : null}

      {receipt ? <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} /> : null}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
