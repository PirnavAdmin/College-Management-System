import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiPlus,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiGrid,
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiRotateCcw,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiInbox,
  FiLink,
  FiX,
} from "react-icons/fi";
import "./FacultyList.css";

const FACULTY_DATA = [
  { id: "EMP-1001", name: "Dr. Ananya Sharma", designation: "Professor", mobile: "+91 98450 11223", email: "ananya.sharma@college.edu", department: "Computer Science", status: "Active" },
  { id: "EMP-1002", name: "Prof. Rajesh Kumar", designation: "Associate Professor", mobile: "+91 98860 44521", email: "rajesh.kumar@college.edu", department: "Mechanical", status: "Active" },
  { id: "EMP-1003", name: "Dr. Meera Iyer", designation: "Head of Department", mobile: "+91 99012 78345", email: "meera.iyer@college.edu", department: "Electronics", status: "Active" },
  { id: "EMP-1004", name: "Mr. Sandeep Verma", designation: "Assistant Professor", mobile: "+91 97411 22890", email: "sandeep.verma@college.edu", department: "Civil", status: "Inactive" },
  { id: "EMP-1005", name: "Dr. Fatima Khan", designation: "Professor", mobile: "+91 96320 55471", email: "fatima.khan@college.edu", department: "Mathematics", status: "Active" },
  { id: "EMP-1006", name: "Ms. Priya Nair", designation: "Lecturer", mobile: "+91 90080 63214", email: "priya.nair@college.edu", department: "Computer Science", status: "Active" },
  { id: "EMP-1007", name: "Dr. Vikram Desai", designation: "Associate Professor", mobile: "+91 93412 77120", email: "vikram.desai@college.edu", department: "Electronics", status: "Inactive" },
  { id: "EMP-1008", name: "Prof. Neha Gupta", designation: "Assistant Professor", mobile: "+91 98999 30012", email: "neha.gupta@college.edu", department: "Mathematics", status: "Active" },
  { id: "EMP-1009", name: "Mr. Arjun Menon", designation: "Lecturer", mobile: "+91 88670 91234", email: "arjun.menon@college.edu", department: "Mechanical", status: "Active" },
  { id: "EMP-1010", name: "Dr. Kavya Reddy", designation: "Professor", mobile: "+91 91760 45098", email: "kavya.reddy@college.edu", department: "Civil", status: "Inactive" },
];

const PAGE_SIZE = 5;

const EMPTY_FORM = {
  employeeId: "",
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  aadhar: "",
  mobile: "",
  email: "",
  bloodGroup: "",
  qualification: "",
  designation: "Assistant Professor",
  department: "Computer Science",
  joiningDate: "",
  experience: "",
  username: "",
  password: "",
  status: "Active",
  photoPath: "",
};


const initials = (name) =>
  name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function FacultyList() {
  const [rows, setRows] = useState(FACULTY_DATA);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowAdd(true);
  };

  const submitFaculty = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.firstName.trim())
  next.firstName = "First name is required";

if (!form.lastName.trim())
  next.lastName = "Last name is required";

if (!form.mobile.trim())
  next.mobile = "Mobile number is required";

if (!form.email.trim())
  next.email = "Email is required";
    if (!form.mobile.trim()) next.mobile = "Mobile number is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setRows((r) => {
      const maxId = r.reduce((m, f) => {
        const n = Number(String(f.id).replace(/\D/g, ""));
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 1000);
      return [...r, { ...form, id: `EMP-${maxId + 1}` }];
    });
    setShowAdd(false);
    setPage(1);
  };


  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const departments = useMemo(
    () => [...new Set(FACULTY_DATA.map((f) => f.department))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((f) => {
      const matchQ =
        !q ||
        [f.id, f.name, f.email, f.mobile, f.department].some((v) =>
          v.toLowerCase().includes(q),
        );
      const matchD = !department || f.department === department;
      const matchS = !status || f.status === status;
      return matchQ && matchD && matchS;
    });
    return [...list].sort((a, b) => {
      const res = String(a[sort.key]).localeCompare(String(b[sort.key]));
      return sort.dir === "asc" ? res : -res;
    });
  }, [rows, search, department, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((f) => f.status === "Active").length,
      inactive: rows.filter((f) => f.status === "Inactive").length,
      departments: new Set(rows.map((f) => f.department)).size,
    }),
    [rows],
  );

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setDepartment("");
    setStatus("");
    setPage(1);
  };

  const refresh = () => {
    setLoading(true);
    setRows(FACULTY_DATA);
    setTimeout(() => setLoading(false), 600);
  };

  const removeRow = (id) => setRows((r) => r.filter((f) => f.id !== id));

  const sortIcon = (key) =>
    sort.key !== key ? null : sort.dir === "asc" ? <FiChevronUp /> : <FiChevronDown />;

  const columns = [
    { key: "id", label: "Employee ID" },
    { key: "name", label: "Faculty Name" },
    { key: "mobile", label: "Mobile", sortable: false },
    { key: "email", label: "Email" },
    { key: "department", label: "Department" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="fm-page">
      <div className="fm-topbar">
        <div>
          <h1 className="fm-title">Faculty Management</h1>
          <nav className="fm-crumb">
            <Link to="/">Dashboard</Link>
            <span>/</span>
            <Link to="/faculty">Faculty Management</Link>
            <span>/</span>
            <span className="fm-crumb-current">Faculty List</span>
          </nav>
        </div>
        <div className="fm-actions">
          <button type="button" className="fm-btn fm-btn-primary" onClick={openAdd}>
            <FiPlus /> Add Faculty
          </button>
          <Link to="/faculty/subject-allocation" className="fm-btn">
            <FiLink /> Allocate Subjects
          </Link>
          <button type="button" className="fm-btn fm-btn-ghost">
            <FiDownload /> Export
          </button>
          <button type="button" className="fm-btn fm-btn-ghost" onClick={refresh}>
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="fm-stats">
        <div className="fm-stat">
          <div className="fm-stat-icon fm-i-blue"><FiUsers /></div>
          <div>
            <div className="fm-stat-label">Total Faculty</div>
            <div className="fm-stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="fm-stat">
          <div className="fm-stat-icon fm-i-green"><FiUserCheck /></div>
          <div>
            <div className="fm-stat-label">Active Faculty</div>
            <div className="fm-stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="fm-stat">
          <div className="fm-stat-icon fm-i-red"><FiUserX /></div>
          <div>
            <div className="fm-stat-label">Inactive Faculty</div>
            <div className="fm-stat-value">{stats.inactive}</div>
          </div>
        </div>
        <div className="fm-stat">
          <div className="fm-stat-icon fm-i-amber"><FiGrid /></div>
          <div>
            <div className="fm-stat-label">Departments Covered</div>
            <div className="fm-stat-value">{stats.departments}</div>
          </div>
        </div>
      </div>

      <div className="fm-card">
        <div className="fm-filters">
          <div className="fm-search">
            <FiSearch />
            <input
              className="fm-input"
              type="text"
              placeholder="Search faculty by name, ID, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="fm-select"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="fm-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button type="button" className="fm-btn" onClick={resetFilters}>
            <FiRotateCcw /> Reset
          </button>
        </div>

        {loading ? (
          <div className="fm-loading">
            <div className="fm-spinner" />
            <p>Loading faculty records…</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="fm-empty">
            <div className="fm-empty-art"><FiInbox /></div>
            <h4>No faculty found</h4>
            <p>Try adjusting your search or filters to find what you are looking for.</p>
          </div>
        ) : (
          <>
            <div className="fm-table-wrap">
              <table className="fm-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className={c.sortable === false ? undefined : "fm-th-sort"}
                        onClick={
                          c.sortable === false ? undefined : () => toggleSort(c.key)
                        }
                      >
                        <span>{c.label} {sortIcon(c.key)}</span>
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((f) => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td>
                        <div className="fm-name">
                          <span className="fm-avatar">{initials(`${f.firstName} ${f.lastName}`)}</span>
                          <span>
                            {f.firstName} {f.lastName}
                            <span className="fm-sub">{f.designation}</span>
                          </span>
                        </div>
                      </td>
                      <td>{f.mobile}</td>
                      <td>{f.email}</td>
                      <td>{f.department}</td>
                      <td>
                        <span
                          className={`fm-badge ${
                            f.status === "Active"
                              ? "fm-badge-active"
                              : "fm-badge-inactive"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div className="fm-row-actions">
                          <button type="button" className="fm-icon-btn" title="View">
                            <FiEye />
                          </button>
                          <button type="button" className="fm-icon-btn" title="Edit">
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="fm-icon-btn fm-danger"
                            title="Delete"
                            onClick={() => removeRow(f.id)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fm-pagination">
              <span className="fm-page-info">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} records
              </span>
              <div className="fm-pages">
                <button
                  type="button"
                  className="fm-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <FiChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`fm-page-btn ${p === currentPage ? "fm-active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="fm-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <div
          className="fm-modal-overlay"
          role="presentation"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="fm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add Faculty"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitFaculty}>
              <div className="fm-modal-head">
                <h3>Add Faculty</h3>
                <button
                  type="button"
                  className="fm-icon-btn"
                  title="Close"
                  onClick={() => setShowAdd(false)}
                >
                  <FiX />
                </button>
              </div>

              <div className="fm-modal-body">
                <div className="fm-field">
<label>Employee ID</label>
<input
className="fm-input"
value={form.employeeId}
onChange={(e)=>setField("employeeId",e.target.value)}
placeholder="EMP-1001"
/>
</div>


<div className="fm-field">
<label>First Name</label>
<input
className="fm-input"
value={form.firstName}
onChange={(e)=>setField("firstName",e.target.value)}
placeholder="First Name"
/>
</div>


<div className="fm-field">
<label>Last Name</label>
<input
className="fm-input"
value={form.lastName}
onChange={(e)=>setField("lastName",e.target.value)}
placeholder="Last Name"
/>
</div>


<div className="fm-field">
<label>Gender</label>
<select
className="fm-select"
value={form.gender}
onChange={(e)=>setField("gender",e.target.value)}
>
<option value="">Select Gender</option>
<option>Male</option>
<option>Female</option>
<option>Other</option>
</select>
</div>


<div className="fm-field">
<label>Date of Birth</label>
<input
type="date"
className="fm-input"
value={form.dob}
onChange={(e)=>setField("dob",e.target.value)}
/>
</div>


<div className="fm-field">
<label>Aadhar Number</label>
<input
className="fm-input"
value={form.aadhar}
onChange={(e)=>setField("aadhar",e.target.value)}
placeholder="XXXX XXXX XXXX"
/>
</div>


<div className="fm-field">
<label>Blood Group</label>
<input
className="fm-input"
value={form.bloodGroup}
onChange={(e)=>setField("bloodGroup",e.target.value)}
placeholder="O+"
/>
</div>


<div className="fm-field">
<label>Qualification</label>
<input
className="fm-input"
value={form.qualification}
onChange={(e)=>setField("qualification",e.target.value)}
placeholder="M.Tech"
/>
</div>


<div className="fm-field">
<label>Joining Date</label>
<input
type="date"
className="fm-input"
value={form.joiningDate}
onChange={(e)=>setField("joiningDate",e.target.value)}
/>
</div>


<div className="fm-field">
<label>Experience</label>
<input
className="fm-input"
value={form.experience}
onChange={(e)=>setField("experience",e.target.value)}
placeholder="5 Years"
/>
</div>


<div className="fm-field">
<label>Username</label>
<input
className="fm-input"
value={form.username}
onChange={(e)=>setField("username",e.target.value)}
/>
</div>


<div className="fm-field">
<label>Password</label>
<input
type="password"
className="fm-input"
value={form.password}
onChange={(e)=>setField("password",e.target.value)}
/>
</div>


<div className="fm-field">
<label>Photo Path</label>
<input
className="fm-input"
value={form.photoPath}
onChange={(e)=>setField("photoPath",e.target.value)}
placeholder="/uploads/faculty/photo.jpg"
/>
</div>

                <div className="fm-field">
                  <label htmlFor="fm-designation">Designation</label>
                  <select
                    id="fm-designation"
                    className="fm-select"
                    value={form.designation}
                    onChange={(e) => setField("designation", e.target.value)}
                  >
                    <option>Professor</option>
                    <option>Associate Professor</option>
                    <option>Assistant Professor</option>
                    <option>Head of Department</option>
                    <option>Lecturer</option>
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="fm-mobile">Mobile</label>
                  <input
                    id="fm-mobile"
                    className="fm-input"
                    value={form.mobile}
                    onChange={(e) => setField("mobile", e.target.value)}
                    placeholder="+91 98450 11223"
                  />
                  {errors.mobile && (
                    <span className="fm-field-error">{errors.mobile}</span>
                  )}
                </div>

                <div className="fm-field">
                  <label htmlFor="fm-email">Email</label>
                  <input
                    id="fm-email"
                    className="fm-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="name@college.edu"
                  />
                  {errors.email && (
                    <span className="fm-field-error">{errors.email}</span>
                  )}
                </div>

                <div className="fm-field">
                  <label htmlFor="fm-dept">Department</label>
                  <select
                    id="fm-dept"
                    className="fm-select"
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="fm-status">Status</label>
                  <select
                    id="fm-status"
                    className="fm-select"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="fm-modal-foot">
                <button
                  type="button"
                  className="fm-btn"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fm-btn fm-btn-primary">
                  <FiPlus /> Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
