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
import {
  createFaculty,
  deleteFaculty,
  getDepartments,
  getFaculty,
  getFacultyById,
  updateFaculty,
  uploadFacultyPhoto,
} from "../../api/authApi";
import "./FacultyList.css";

const PAGE_SIZE = 5;

const DEFAULT_DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Commerce",
  "Botany",
  "Zoology",
].map((name, index) => ({ id: index + 1, name }));

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
  departmentId: "",
  department: "",
  joiningDate: "",
  experience: "",
  username: "",
  password: "",
  status: "Active",
  photoPath: "",
};

const responseList = (data) =>
  Array.isArray(data) ? data : data?.content || data?.data || data?.items || [];

const normalizeFaculty = (faculty) => ({
  ...faculty,
  id: faculty.id ?? faculty.facultyId ?? faculty.employeeId,
  firstName: faculty.firstName ?? "",
  lastName: faculty.lastName ?? "",
  name: faculty.fullName ?? faculty.name ?? [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
  dob: faculty.dateOfBirth?.slice(0, 10) ?? "",
  aadhar: faculty.aadhaar ?? faculty.aadhar ?? "",
  departmentId: String(faculty.departmentId ?? faculty.department?.id ?? ""),
  joiningDate: faculty.joiningDate?.slice(0, 10) ?? "",
  mobile: faculty.mobile ?? faculty.mobileNumber ?? "",
  department: faculty.department?.name ?? faculty.departmentName ?? faculty.department ?? "",
  status: faculty.status ?? (faculty.isActive === false ? "Inactive" : "Active"),
});

const normalizeDepartment = (department) => ({
  id: department.id ?? department.departmentId,
  name: department.name ?? department.departmentName ?? department.department ?? "",
});

const mergeDepartments = (apiDepartments) => {
  const byName = new Map(DEFAULT_DEPARTMENTS.map((item) => [item.name, item]));
  apiDepartments.forEach((item) => byName.set(item.name, item));
  return [...byName.values()];
};

const toIsoDate = (date) => (date ? `${date}T00:00:00.000Z` : null);

const facultyPayload = (form) => ({
  employeeId: form.employeeId.trim(),
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  gender: form.gender,
  dateOfBirth: toIsoDate(form.dob),
  aadhaar: form.aadhar.trim(),
  mobile: form.mobile.trim(),
  email: form.email.trim(),
  bloodGroup: form.bloodGroup.trim(),
  qualification: form.qualification.trim(),
  designation: form.designation,
  departmentId: Number(form.departmentId),
  department: form.department,
  joiningDate: toIsoDate(form.joiningDate),
  experience: Number(form.experience || 0),
  username: form.username.trim(),
  password: form.password,
  status: form.status,
});


const initials = (name) =>
  name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function FacultyList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [requestError, setRequestError] = useState("");

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setPhotoPreview("");
    setShowPhotoPreview(false);
    setPhotoFile(null);
    setEditingFacultyId(null);
    setRequestError("");
    setShowAdd(true);
  };

  const selectPhoto = (file) => {
    if (!file) {
      setField("photoPath", "");
      setPhotoPreview("");
      return;
    }

    setField("photoPath", file.name);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submitFaculty = async (e) => {
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
    if (!form.departmentId) next.departmentId = "Department is required";
    if (!form.mobile.trim()) next.mobile = "Mobile number is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      setRequestError("");
      const payload = facultyPayload(form);
      const response = editingFacultyId
        ? await updateFaculty(editingFacultyId, payload)
        : await createFaculty(payload);
      const saved = normalizeFaculty(response.data?.data ?? response.data);
      const facultyId = saved.id ?? editingFacultyId;
      if (photoFile && facultyId) await uploadFacultyPhoto(facultyId, photoFile);
      await refresh();
      setShowAdd(false);
      setPage(1);
    } catch (error) {
      console.error("Unable to save faculty:", error);
      setRequestError(error.response?.data?.message || "Unable to save faculty. Please try again.");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [facultyResponse, departmentResponse] = await Promise.all([
          getFaculty({ PageNumber: 1, PageSize: 1000 }),
          getDepartments(),
        ]);
        setRows(responseList(facultyResponse.data).map(normalizeFaculty));
        setDepartments(
          mergeDepartments(
            responseList(departmentResponse.data)
              .map(normalizeDepartment)
              .filter((item) => item.id && item.name),
          ),
        );
      } catch (error) {
        console.error("Unable to load faculty data:", error);
        setRequestError("Unable to load faculty data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((f) => {
      const matchQ =
        !q ||
        [f.id, f.name, f.email, f.mobile, f.department].some((v) =>
          String(v ?? "").toLowerCase().includes(q),
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

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await getFaculty({ PageNumber: 1, PageSize: 1000 });
      setRows(responseList(response.data).map(normalizeFaculty));
      setRequestError("");
    } catch (error) {
      console.error("Unable to refresh faculty:", error);
      setRequestError("Unable to refresh faculty data.");
    } finally {
      setLoading(false);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Delete this faculty member?")) return;
    try {
      await deleteFaculty(id);
      setRows((list) => list.filter((faculty) => faculty.id !== id));
    } catch (error) {
      console.error("Unable to delete faculty:", error);
      setRequestError("Unable to delete faculty member.");
    }
  };

  const editFaculty = async (id) => {
    try {
      const response = await getFacultyById(id);
      const faculty = normalizeFaculty(response.data?.data ?? response.data);
      setForm({ ...EMPTY_FORM, ...faculty, photoPath: "" });
      setEditingFacultyId(id);
      setPhotoFile(null);
      setPhotoPreview("");
      setRequestError("");
      setShowAdd(true);
    } catch (error) {
      console.error("Unable to load faculty:", error);
      setRequestError("Unable to load faculty details.");
    }
  };

  const viewFaculty = async (id) => {
    try {
      const response = await getFacultyById(id);
      const faculty = normalizeFaculty(response.data?.data ?? response.data);
      alert(
        `Faculty Details\n\nEmployee ID: ${faculty.employeeId || "-"}\nName: ${faculty.name || "-"}\nDepartment: ${faculty.department || "-"}\nDesignation: ${faculty.designation || "-"}\nMobile: ${faculty.mobile || "-"}\nEmail: ${faculty.email || "-"}\nStatus: ${faculty.status || "-"}`,
      );
    } catch (error) {
      console.error("Unable to load faculty:", error);
      setRequestError(error.response?.data?.detail || "Faculty record was not found.");
    }
  };

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
            <Link to="/dashboard/faculty">Faculty Management</Link>
            <span>/</span>
            <span className="fm-crumb-current">Faculty List</span>
          </nav>
        </div>
        <div className="fm-actions">
          <button type="button" className="fm-btn fm-btn-primary" onClick={openAdd}>
            <FiPlus /> Add Faculty
          </button>
          <Link to="/dashboard/faculty/subject-allocation" className="fm-btn">
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
              <option key={d.id} value={d.name}>{d.name}</option>
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
                          <span className="fm-avatar">{initials(f.name || `${f.firstName} ${f.lastName}`)}</span>
                          <span>
                            {f.name || `${f.firstName} ${f.lastName}`}
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
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="View"
                            onClick={() => viewFaculty(f.id)}
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="Edit"
                            onClick={() => editFaculty(f.id)}
                          >
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
                <h3>{editingFacultyId ? "Edit Faculty" : "Add Faculty"}</h3>
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
                {requestError && <p className="fm-request-error">{requestError}</p>}
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
type="number"
min="0"
className="fm-input"
value={form.experience}
onChange={(e)=>setField("experience",e.target.value)}
placeholder="5"
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


<div className="fm-field fm-photo-field">
<label htmlFor="fm-photo">Photo</label>
<div className="fm-photo-control">
  <input
    id="fm-photo"
    className="fm-input"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={(e) => selectPhoto(e.target.files?.[0])}
  />
  <button
    type="button"
    className="fm-btn fm-photo-preview-btn"
    disabled={!photoPreview}
    onClick={() => setShowPhotoPreview(true)}
  >
    <FiEye /> Preview
  </button>
</div>
<span className="fm-photo-name">{form.photoPath || "No photo selected"}</span>
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
                    value={form.departmentId}
                    onChange={(e) => {
                      const selected = departments.find((item) => String(item.id) === e.target.value);
                      setForm((current) => ({
                        ...current,
                        departmentId: e.target.value,
                        department: selected?.name ?? "",
                      }));
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <span className="fm-field-error">{errors.departmentId}</span>
                  )}
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
                  <FiPlus /> {editingFacultyId ? "Update Faculty" : "Save Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPhotoPreview && photoPreview && (
        <div
          className="fm-photo-preview-overlay"
          role="presentation"
          onClick={() => setShowPhotoPreview(false)}
        >
          <div
            className="fm-photo-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Faculty photo preview"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fm-modal-head">
              <h3>Photo Preview</h3>
              <button
                type="button"
                className="fm-icon-btn"
                title="Close preview"
                onClick={() => setShowPhotoPreview(false)}
              >
                <FiX />
              </button>
            </div>
            <img src={photoPreview} alt="Selected faculty" />
          </div>
        </div>
      )}
    </div>
  );
}
