import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaPrint, FaSave, FaTrashAlt, FaUndo } from "react-icons/fa";
import "./FeeCollection.css";

const students = [
  { id: 1, admissionNo: "ADM-2026-001", name: "Aarav Sharma", board: "State Board", academicYear: "2025-2026", group: "MPC" },
  { id: 2, admissionNo: "ADM-2026-002", name: "Diya Reddy", board: "State Board", academicYear: "2025-2026", group: "BiPC" },
  { id: 3, admissionNo: "ADM-2026-003", name: "Kabir Mehta", board: "CBSE", academicYear: "2026-2027", group: "Commerce" },
  { id: 4, admissionNo: "ADM-2026-004", name: "Meera Nair", board: "ICSE", academicYear: "2026-2027", group: "Computer Science" },
];

const initialForm = {
  studentId: "",
  studentSearch: "",
  receiptNumber: createReceiptNumber(),
  paymentDate: "",
  amount: "",
  discount: "",
  fine: "",
  paymentMode: "",
  transactionNumber: "",
};

const initialFilters = {
  search: "",
  student: "",
  paymentMode: "",
  paymentDate: "",
};

const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
const pageSize = 5;

const demoCollections = [
  {
    id: 1,
    receiptNumber: "RCPT-260801-101",
    studentId: 1,
    studentName: "Aarav Sharma",
    paymentDate: "2026-08-01",
    amount: "12000",
    discount: "500",
    fine: "0",
    paymentMode: "UPI",
    transactionNumber: "UPI9832741",
    status: "Paid",
  },
  {
    id: 2,
    receiptNumber: "RCPT-260802-102",
    studentId: 2,
    studentName: "Diya Reddy",
    paymentDate: "2026-08-02",
    amount: "8000",
    discount: "0",
    fine: "150",
    paymentMode: "Cash",
    transactionNumber: "",
    status: "Paid",
  },
];

export default function FeeCollection() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [collections, setCollections] = useState(demoCollections);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const selectedStudent = students.find((student) => String(student.id) === String(form.studentId));
  const totalPayable = Math.max(0, Number(form.amount || 0) - Number(form.discount || 0) + Number(form.fine || 0));
  const transactionRequired = form.paymentMode && form.paymentMode !== "Cash";

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return collections.filter((row) => {
      if (filters.student && String(row.studentId) !== String(filters.student)) return false;
      if (filters.paymentMode && row.paymentMode !== filters.paymentMode) return false;
      if (filters.paymentDate && row.paymentDate !== filters.paymentDate) return false;
      if (!search) return true;
      return `${row.receiptNumber} ${row.studentName} ${row.paymentMode}`.toLowerCase().includes(search);
    });
  }, [collections, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredRows.length ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "studentSearch") {
      const matchedStudent = students.find((student) => getStudentLabel(student).toLowerCase() === value.toLowerCase());
      setForm((current) => ({
        ...current,
        studentSearch: value,
        studentId: matchedStudent ? matchedStudent.id : "",
      }));
      setErrors((current) => ({ ...current, studentId: "" }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
      transactionNumber: name === "paymentMode" && value === "Cash" ? "" : current.transactionNumber,
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.studentId) nextErrors.studentId = "Student is required.";
    if (!form.paymentDate) nextErrors.paymentDate = "Payment Date is required.";
    if (!form.amount) nextErrors.amount = "Amount is required.";
    else if (Number(form.amount) <= 0) nextErrors.amount = "Amount must be greater than zero.";
    if (!form.paymentMode) nextErrors.paymentMode = "Payment Mode is required.";
    if (transactionRequired && !form.transactionNumber.trim()) {
      nextErrors.transactionNumber = "Transaction Number is required for this payment mode.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const payload = {
      receiptNumber: form.receiptNumber,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      paymentDate: form.paymentDate,
      amount: form.amount,
      discount: form.discount || "0",
      fine: form.fine || "0",
      paymentMode: form.paymentMode,
      transactionNumber: form.transactionNumber,
      status: "Paid",
    };

    window.setTimeout(() => {
      if (editingId) {
        setCollections((current) => current.map((row) => (row.id === editingId ? { ...row, ...payload } : row)));
      } else {
        setCollections((current) => [{ id: Date.now(), ...payload }, ...current]);
      }
      handleClear();
      setSaving(false);
    }, 400);
  };

  const handleClear = () => {
    setForm({ ...initialForm, receiptNumber: createReceiptNumber() });
    setErrors({});
    setEditingId(null);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const editRow = (row) => {
    const student = students.find((item) => String(item.id) === String(row.studentId));
    setForm({
      studentId: row.studentId,
      studentSearch: student ? getStudentLabel(student) : row.studentName,
      receiptNumber: row.receiptNumber,
      paymentDate: row.paymentDate,
      amount: row.amount,
      discount: row.discount,
      fine: row.fine,
      paymentMode: row.paymentMode,
      transactionNumber: row.transactionNumber,
    });
    setEditingId(row.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = (id) => {
    setCollections((current) => current.filter((row) => row.id !== id));
    if (editingId === id) handleClear();
  };

  const printReceipt = (row) => {
    window.alert(`Receipt ready to print: ${row.receiptNumber}`);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  return (
    <section className="feeCollection">
      <header className="collectionHeader">
        <div>
          <h1>Fee Collection</h1>
          <p>Collect student fees.</p>
        </div>
        <button className="collectionBtn collectionBtnSecondary" type="button" onClick={handleCancel}>
          <FaArrowLeft /> Back to List
        </button>
      </header>

      <form className="collectionStack" noValidate onSubmit={handleSubmit}>
        <section className="collectionCard">
          <h2>Student Information</h2>
          <div className="collectionGrid">
            <label className="collectionField">
              <span>Student <b>*</b></span>
              <input
                className={errors.studentId ? "collectionInput hasError" : "collectionInput"}
                list="student-options"
                name="studentSearch"
                value={form.studentSearch}
                onChange={handleChange}
                placeholder="Search by student name or admission number"
              />
              <datalist id="student-options">
                {students.map((student) => <option key={student.id} value={getStudentLabel(student)} />)}
              </datalist>
              {errors.studentId ? <small>{errors.studentId}</small> : null}
            </label>
            <ReadOnlyField label="Admission Number" value={selectedStudent?.admissionNo || ""} placeholder="Auto-filled admission number" />
            <ReadOnlyField label="Student Name" value={selectedStudent?.name || ""} placeholder="Auto-filled student name" />
            <ReadOnlyField label="Board" value={selectedStudent?.board || ""} placeholder="Auto-filled board" />
            <ReadOnlyField label="Academic Year" value={selectedStudent?.academicYear || ""} placeholder="Auto-filled academic year" />
            <ReadOnlyField label="Group" value={selectedStudent?.group || ""} placeholder="Auto-filled group" />
          </div>
        </section>

        <section className="collectionCard">
          <h2>Fee Details</h2>
          <div className="collectionGrid">
            <ReadOnlyField label="Receipt Number" value={form.receiptNumber} placeholder="Auto-generated receipt number" />
            <TextField name="paymentDate" label="Payment Date" type="date" required value={form.paymentDate} error={errors.paymentDate} onChange={handleChange} placeholder="Select payment date" />
            <TextField name="amount" label="Amount" type="number" required value={form.amount} error={errors.amount} onChange={handleChange} placeholder="Enter amount" min="1" />
            <TextField name="discount" label="Discount" type="number" value={form.discount} error={errors.discount} onChange={handleChange} placeholder="Enter discount" min="0" />
            <TextField name="fine" label="Fine" type="number" value={form.fine} error={errors.fine} onChange={handleChange} placeholder="Enter fine" min="0" />
            <ReadOnlyField label="Total Payable" value={formatCurrency(totalPayable)} placeholder="Calculated total payable" />
            <SelectField name="paymentMode" label="Payment Mode" required value={form.paymentMode} error={errors.paymentMode} onChange={handleChange} options={paymentModes} placeholder="Select payment mode" />
            <TextField
              name="transactionNumber"
              label="Transaction Number"
              required={Boolean(transactionRequired)}
              value={form.transactionNumber}
              error={errors.transactionNumber}
              onChange={handleChange}
              placeholder={transactionRequired ? "Enter transaction number" : "Not required for cash"}
              disabled={form.paymentMode === "Cash"}
            />
          </div>

          <div className="collectionActions">
            <button className="collectionBtn collectionBtnPrimary" type="submit" disabled={saving}>
              <FaSave /> {saving ? "Collecting..." : "Collect Fee"}
            </button>
            <button className="collectionBtn collectionBtnSecondary" type="button" disabled={saving} onClick={handleClear}>
              <FaUndo /> Clear
            </button>
            <button className="collectionBtn collectionBtnGhost" type="button" disabled={saving} onClick={handleCancel}>
              <FaArrowLeft /> Cancel
            </button>
          </div>
        </section>
      </form>

      <section className="collectionCard">
        <div className="collectionTableHeader">
          <h2>Fee Collection History</h2>
          <div className="collectionFilters">
            <input className="collectionInput" type="search" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search receipt, student or payment mode" />
            <select className="collectionInput" name="student" value={filters.student} onChange={handleFilterChange}>
              <option value="">All Students</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
            <select className="collectionInput" name="paymentMode" value={filters.paymentMode} onChange={handleFilterChange}>
              <option value="">All Payment Modes</option>
              {paymentModes.map((mode) => <option key={mode}>{mode}</option>)}
            </select>
            <input className="collectionInput" type="date" name="paymentDate" value={filters.paymentDate} onChange={handleFilterChange} placeholder="Filter by date" />
            <button className="collectionBtn collectionBtnSecondary" type="button" onClick={clearFilters}>
              <FaUndo /> Reset
            </button>
          </div>
        </div>

        <div className="collectionTableWrap">
          <table className="collectionTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Receipt Number</th>
                <th>Student Name</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Fine</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? (
                visibleRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{startIndex + index + 1}</td>
                    <td><strong>{row.receiptNumber}</strong></td>
                    <td>{row.studentName}</td>
                    <td>{formatDate(row.paymentDate)}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{formatCurrency(row.discount)}</td>
                    <td>{formatCurrency(row.fine)}</td>
                    <td>{row.paymentMode}</td>
                    <td><span className="collectionBadge">{row.status}</span></td>
                    <td>
                      <div className="collectionRowActions">
                        <button className="collectionTextBtn" type="button" onClick={() => editRow(row)}><FaEdit /> Edit</button>
                        <button className="collectionTextBtn" type="button" onClick={() => printReceipt(row)}><FaPrint /> Print</button>
                        <button className="collectionTextBtn collectionTextDanger" type="button" onClick={() => deleteRow(row.id)}><FaTrashAlt /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="collectionEmpty">No fee collection history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex} total={filteredRows.length} onPageChange={setPage} />
      </section>
    </section>
  );
}

function TextField({ name, label, required = false, value, error, onChange, placeholder, type = "text", ...props }) {
  return (
    <label className="collectionField">
      <span>{label}{required ? <b> *</b> : null}</span>
      <input className={error ? "collectionInput hasError" : "collectionInput"} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} {...props} />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function SelectField({ name, label, required, value, error, onChange, options, placeholder }) {
  return (
    <label className="collectionField">
      <span>{label}{required ? <b> *</b> : null}</span>
      <select className={error ? "collectionInput hasError" : "collectionInput"} name={name} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function ReadOnlyField({ label, value, placeholder }) {
  return (
    <label className="collectionField">
      <span>{label}</span>
      <input className="collectionInput isReadonly" value={value} placeholder={placeholder} readOnly />
    </label>
  );
}

function Pagination({ currentPage, totalPages, startIndex, endIndex, total, onPageChange }) {
  return (
    <div className="collectionPagination">
      <span>Showing {total ? startIndex + 1 : 0}-{endIndex} of {total}</span>
      <div className="collectionPageButtons">
        <button className="collectionBtn collectionBtnSecondary" type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button className={pageNumber === currentPage ? "collectionPageBtn isActive" : "collectionPageBtn"} key={pageNumber} type="button" onClick={() => onPageChange(pageNumber)}>
            {pageNumber}
          </button>
        ))}
        <button className="collectionBtn collectionBtnSecondary" type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}

function getStudentLabel(student) {
  return `${student.name} - ${student.admissionNo}`;
}

function createReceiptNumber() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `RCPT-${stamp}-${Math.floor(100 + Math.random() * 900)}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
