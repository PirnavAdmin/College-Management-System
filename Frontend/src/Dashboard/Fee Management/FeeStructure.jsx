import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaSave, FaTrashAlt, FaUndo } from "react-icons/fa";
import "./FeeStructure.css";

const initialForm = {
  board: "",
  academicYear: "",
  group: "",
  feeType: "",
  amount: "",
  dueDate: "",
};

const initialFilters = {
  search: "",
  board: "",
  academicYear: "",
  group: "",
};

const boardOptions = ["State Board", "CBSE", "ICSE", "Intermediate Board", "University", "Autonomous"];
const academicYearOptions = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];
const groupOptions = ["MPC", "BiPC", "CEC", "MEC", "HEC", "Computer Science", "Commerce"];
const feeTypeOptions = [
  "Tuition Fee",
  "Admission Fee",
  "Exam Fee",
  "Transport Fee",
  "Library Fee",
  "Laboratory Fee",
  "Hostel Fee",
  "Sports Fee",
  "Other",
];

const pageSize = 5;

const demoFees = [
  {
    id: 1,
    board: "State Board",
    academicYear: "2025-2026",
    group: "MPC",
    feeType: "Tuition Fee",
    amount: "25000",
    dueDate: "2026-09-10",
    status: "Active",
  },
  {
    id: 2,
    board: "State Board",
    academicYear: "2025-2026",
    group: "BiPC",
    feeType: "Laboratory Fee",
    amount: "6500",
    dueDate: "2026-09-20",
    status: "Active",
  },
  {
    id: 3,
    board: "CBSE",
    academicYear: "2026-2027",
    group: "Commerce",
    feeType: "Admission Fee",
    amount: "10000",
    dueDate: "2026-08-30",
    status: "Draft",
  },
];

export default function FeeStructure() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [feeRows, setFeeRows] = useState(demoFees);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return feeRows.filter((row) => {
      if (filters.board && row.board !== filters.board) return false;
      if (filters.academicYear && row.academicYear !== filters.academicYear) return false;
      if (filters.group && row.group !== filters.group) return false;
      if (!search) return true;
      return `${row.board} ${row.academicYear} ${row.group} ${row.feeType}`.toLowerCase().includes(search);
    });
  }, [feeRows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredRows.length ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.board) nextErrors.board = "Board is required.";
    if (!form.academicYear) nextErrors.academicYear = "Academic Year is required.";
    if (!form.group) nextErrors.group = "Group is required.";
    if (!form.feeType) nextErrors.feeType = "Fee Type is required.";
    if (!form.amount) nextErrors.amount = "Amount is required.";
    else if (Number(form.amount) <= 0) nextErrors.amount = "Amount must be greater than zero.";
    if (!form.dueDate) nextErrors.dueDate = "Due Date is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const payload = { ...form, status: "Active" };

    window.setTimeout(() => {
      if (editingId) {
        setFeeRows((current) => current.map((row) => (row.id === editingId ? { ...row, ...payload } : row)));
      } else {
        setFeeRows((current) => [{ id: Date.now(), ...payload }, ...current]);
      }
      handleClear();
      setSaving(false);
    }, 400);
  };

  const handleClear = () => {
    setForm(initialForm);
    setErrors({});
    setEditingId(null);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const editRow = (row) => {
    setForm({
      board: row.board,
      academicYear: row.academicYear,
      group: row.group,
      feeType: row.feeType,
      amount: row.amount,
      dueDate: row.dueDate,
    });
    setEditingId(row.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = (id) => {
    setFeeRows((current) => current.filter((row) => row.id !== id));
    if (editingId === id) handleClear();
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  return (
    <section className="feeStructure">
      <header className="feePageHeader">
        <div>
          <h1>Fee Structure</h1>
          <p>Configure fee structure for academic groups.</p>
        </div>
        <button className="feeBtn feeBtnSecondary" type="button" onClick={handleCancel}>
          <FaArrowLeft /> Back to List
        </button>
      </header>

      <form className="feeCard feeFormCard" noValidate onSubmit={handleSubmit}>
        <h2>{editingId ? "Edit Fee Structure" : "Add Fee Structure"}</h2>
        <div className="feeFormGrid">
          <SelectField name="board" label="Board" required value={form.board} error={errors.board} onChange={handleChange} options={boardOptions} placeholder="Select board" />
          <SelectField name="academicYear" label="Academic Year" required value={form.academicYear} error={errors.academicYear} onChange={handleChange} options={academicYearOptions} placeholder="Select academic year" />
          <SelectField name="group" label="Group" required value={form.group} error={errors.group} onChange={handleChange} options={groupOptions} placeholder="Select group" />
          <SelectField name="feeType" label="Fee Type" required value={form.feeType} error={errors.feeType} onChange={handleChange} options={feeTypeOptions} placeholder="Select fee type" />
          <TextField name="amount" label="Amount" type="number" required value={form.amount} error={errors.amount} onChange={handleChange} placeholder="Enter amount" min="1" />
          <TextField name="dueDate" label="Due Date" type="date" required value={form.dueDate} error={errors.dueDate} onChange={handleChange} placeholder="Select due date" />
        </div>

        <div className="feeActions">
          <button className="feeBtn feeBtnPrimary" type="submit" disabled={saving}>
            <FaSave /> {saving ? "Saving..." : "Save"}
          </button>
          <button className="feeBtn feeBtnSecondary" type="button" disabled={saving} onClick={handleClear}>
            <FaUndo /> Clear
          </button>
          <button className="feeBtn feeBtnGhost" type="button" disabled={saving} onClick={handleCancel}>
            <FaArrowLeft /> Cancel
          </button>
        </div>
      </form>

      <section className="feeCard">
        <div className="feeTableHeader">
          <h2>Fee Structure List</h2>
          <div className="feeFilters">
            <input className="feeInput" type="search" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search fee type, board or group" />
            <select className="feeInput" name="board" value={filters.board} onChange={handleFilterChange}>
              <option value="">All Boards</option>
              {boardOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="feeInput" name="academicYear" value={filters.academicYear} onChange={handleFilterChange}>
              <option value="">All Academic Years</option>
              {academicYearOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="feeInput" name="group" value={filters.group} onChange={handleFilterChange}>
              <option value="">All Groups</option>
              {groupOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button className="feeBtn feeBtnSecondary" type="button" onClick={clearFilters}>
              <FaUndo /> Reset
            </button>
          </div>
        </div>

        <div className="feeTableWrap">
          <table className="feeTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Board</th>
                <th>Academic Year</th>
                <th>Group</th>
                <th>Fee Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? (
                visibleRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{startIndex + index + 1}</td>
                    <td>{row.board}</td>
                    <td>{row.academicYear}</td>
                    <td>{row.group}</td>
                    <td><strong>{row.feeType}</strong></td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td><span className={row.status === "Active" ? "feeBadge feeBadgeSuccess" : "feeBadge feeBadgeMuted"}>{row.status}</span></td>
                    <td>
                      <div className="feeRowActions">
                        <button className="feeTextBtn" type="button" onClick={() => editRow(row)}><FaEdit /> Edit</button>
                        <button className="feeTextBtn feeTextDanger" type="button" onClick={() => deleteRow(row.id)}><FaTrashAlt /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="feeEmpty">No fee structures found.</td>
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

function TextField({ name, label, required, value, error, onChange, placeholder, type = "text", ...props }) {
  return (
    <label className="feeField">
      <span>{label}{required ? <b> *</b> : null}</span>
      <input className={error ? "feeInput hasError" : "feeInput"} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} {...props} />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function SelectField({ name, label, required, value, error, onChange, options, placeholder }) {
  return (
    <label className="feeField">
      <span>{label}{required ? <b> *</b> : null}</span>
      <select className={error ? "feeInput hasError" : "feeInput"} name={name} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function Pagination({ currentPage, totalPages, startIndex, endIndex, total, onPageChange }) {
  return (
    <div className="feePagination">
      <span>Showing {total ? startIndex + 1 : 0}-{endIndex} of {total}</span>
      <div className="feePageButtons">
        <button className="feeBtn feeBtnSecondary" type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button className={pageNumber === currentPage ? "feePageBtn isActive" : "feePageBtn"} key={pageNumber} type="button" onClick={() => onPageChange(pageNumber)}>
            {pageNumber}
          </button>
        ))}
        <button className="feeBtn feeBtnSecondary" type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
