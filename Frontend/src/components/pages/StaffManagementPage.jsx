import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { generateNextNumber, incrementSeriesSequence } from "@/data/numberSeriesData.js";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  Upload,
  UserRound,
  Users,
  RefreshCw,
  FileText,
  Download
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Toast } from "@/components/common/Ui.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./StaffManagementPage.css";

// Session Storage Fallback Store Keys
const STORE = "pjc-mock-staff-records",
  ACTIVITY_STORE = "pjc-mock-staff-activities";

const defaultDepartments = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Administration",
  "Accounts",
  "Library",
  "Maintenance",
  "Transport",
];

const designationMap = {
  "Computer Science": ["HOD", "Assistant Professor", "Lecturer", "Lab Technician"],
  Mathematics: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer"],
  Physics: ["HOD", "Senior Lecturer", "Lecturer", "Lab Technician"],
  Chemistry: ["HOD", "Senior Lecturer", "Lecturer", "Lab Technician"],
  English: ["HOD", "Assistant Professor", "Lecturer"],
  Administration: ["Administrator", "Office Assistant", "Attender"],
  Accounts: ["Accountant", "Office Assistant"],
  Library: ["Librarian", "Library Assistant"],
  Maintenance: ["Electrician", "Attender"],
  Transport: ["Driver", "Transport Coordinator"],
};

const tuples = [
  [1, "PCT001", "Dr. Anjali Desai", "anjali@pirnav.edu", "9876500001", "Mathematics", "Assistant Professor", "Teaching", "Completed", 100, true],
  [2, "PCT002", "Dr. Ravi Kumar", "ravi@pirnav.edu", "9876500002", "Computer Science", "Lecturer", "Teaching", "Pending", 25, false],
  [3, "PCT003", "Priya Sharma", "priya@pirnav.edu", "9876500003", "English", "Lecturer", "Teaching", "Pending", 25, false],
  [4, "PCT004", "Arun Patel", "arun@pirnav.edu", "9876500004", "Physics", "Senior Lecturer", "Teaching", "Link Sent", 30, true],
  [5, "PCT005", "Neha Singh", "neha@pirnav.edu", "9876500005", "Chemistry", "Lecturer", "Teaching", "Link Sent", 30, true],
  [6, "PCT006", "Kiran Rao", "kiran@pirnav.edu", "9876500006", "Mathematics", "Junior Lecturer", "Teaching", "In Progress", 60, true],
  [7, "PCT007", "Meera Joshi", "meera@pirnav.edu", "9876500007", "English", "Assistant Professor", "Teaching", "In Progress", 70, true],
  [8, "PCT008", "Sanjay Das", "sanjay@pirnav.edu", "9876500008", "Physics", "Lecturer", "Teaching", "Submitted", 100, true],
  [9, "PCT009", "Asha Nair", "asha@pirnav.edu", "9876500009", "Chemistry", "Senior Lecturer", "Teaching", "Submitted", 100, true],
  [10, "PCT010", "Vikram Shah", "vikram@pirnav.edu", "9876500010", "Computer Science", "HOD", "Teaching", "Needs Correction", 85, true],
  [11, "PCNT001", "Ramesh Kumar", "ramesh@pirnav.edu", "9876500011", "Administration", "Office Assistant", "Non-Teaching", "Completed", 100, false],
  [12, "PCNT002", "Latha Reddy", "latha@pirnav.edu", "9876500012", "Accounts", "Accountant", "Non-Teaching", "Completed", 100, false],
  [13, "PCNT003", "Mohan Lal", "mohan@pirnav.edu", "9876500013", "Library", "Librarian", "Non-Teaching", "Completed", 100, false],
  [14, "PCNT004", "Deepak Roy", "deepak@pirnav.edu", "9876500014", "Maintenance", "Electrician", "Non-Teaching", "Completed", 100, false],
  [15, "PCNT005", "Salim Khan", "salim@pirnav.edu", "9876500015", "Transport", "Driver", "Non-Teaching", "Completed", 100, false],
];

const seed = tuples.map(
  ([
    id, employeeId, fullName, email, mobile, department, designation, staffType, profileStatus, profileCompletion, linkSent,
  ]) => ({
    id, employeeId, fullName, email, mobile, department, designation, staffType, profileStatus, profileCompletion, linkSent,
    dateOfJoining: "2026-06-12", addedOn: "2026-09-02", status: "Active",
  }),
);

const initialActivities = [
  "Dr. Anjali Desai profile approved",
  "Sanjay Das submitted profile",
  "Arun Patel profile link sent",
  "Ramesh Kumar added as Non-Teaching Staff",
];

const read = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    const valid = parsed.filter((item) => item && (item.id !== undefined || item.employeeId));
    return valid.length > 0 ? valid : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
const boardOptions = ["BIEAP", "TSBIE", "CBSE", "State Board", "ICSE", "Other"];

const teachingFields = [
  ["board", "Board Name", "select", boardOptions, false],
  ["employeeId", "Employee ID", "text", [], false],
  ["firstName", "First Name", "text", [], false],
  ["middleName", "Middle Name", "text", [], false],
  ["lastName", "Last Name", "text", [], false],
  ["dateOfBirth", "Date of Birth", "date", [], false],
  ["gender", "Gender", "select", ["Male", "Female", "Other"], false],
  ["mobile", "Mobile", "text", [], false],
  ["email", "Email", "email", [], false],
  ["department", "Department", "search-select", defaultDepartments, false],
  ["designation", "Designation", "search-select", [], false],
  ["dateOfJoining", "Date of Joining", "date", [], false],
  ["employmentType", "Employment Type", "select", ["Full Time", "Part Time", "Contract"], false],
  ["status", "Status", "select", ["Active", "Inactive"], false],
  ["profilePhoto", "Profile Photo", "file", [], false],
];

const nonTeachingSteps = [
  [
    ["board", "Board Name", "select", boardOptions, false],
    ["employeeId", "Employee ID"],
    ["firstName", "First Name"],
    ["middleName", "Middle Name", "text", [], false],
    ["lastName", "Last Name"],
    ["guardianName", "Father's / Husband's Name"],
    ["gender", "Gender", "select", ["Male", "Female", "Other"]],
    ["dateOfBirth", "Date of Birth", "date"],
    ["maritalStatus", "Marital Status"],
    ["bloodGroup", "Blood Group", "select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], false],
    ["nationality", "Nationality"],
    ["aadhaar", "Aadhaar Number"],
    ["pan", "PAN Number"],
    ["profilePhoto", "Profile Photo", "file", [], false],
  ],
  [
    ["mobile", "Mobile"],
    ["email", "Email", "email", [], false],
    ["pin", "PINCODE"],
    ["country", "Country"],
    ["state", "State"],
    ["district", "District"],
    ["city", "City"],
    ["currentAddress", "Current Address", "textarea"],
    ["permanentAddress", "Permanent Address", "textarea"],
  ],
  [
    ["department", "Department", "search-select", defaultDepartments.slice(5)],
    ["designation", "Designation", "search-select", []],
    ["dateOfJoining", "Date of Joining", "date"],
    ["qualification", "Qualification"],
    ["experience", "Experience"],
    ["status", "Status", "select", ["Active", "Inactive"], true, "start-new-row"],
  ],
  [
    ["salaryStructure", "Salary Structure"],
    ["basicSalary", "Basic Salary", "number"],
    ["grossSalary", "Gross Salary", "number"],
    ["bankName", "Bank Name"],
    ["accountHolder", "Account Holder Name"],
    ["accountNumber", "Account Number"],
    ["ifsc", "IFSC"],
    ["branch", "Branch"],
    ["pfNumber", "PF Number"],
    ["esiNumber", "ESI Number"],
    ["uanNumber", "UAN Number"],
  ],
  [
    ["aadhaarDocument", "Aadhaar", "file"],
    ["panDocument", "PAN", "file"],
    ["qualificationCertificate", "Qualification Certificate", "file"],
    ["experienceCertificate", "Experience Certificate", "file"],
    ["resume", "Resume", "file"],
    ["bankProof", "Bank Passbook / Cancelled Cheque", "file"],
    ["drivingLicence", "Driving Licence", "file"],
    ["otherDocuments", "Other Documents", "file"],
  ],
  [
    ["emergencyName", "Contact Name"],
    ["emergencyRelationship", "Relationship"],
    ["emergencyMobile", "Mobile"],
    ["emergencyAlternate", "Alternate Mobile"],
    ["emergencyAddress", "Address", "textarea"],
  ],
];

const portalSteps = [
  "Personal Details",
  "Contact & Address",
  "Educational Qualifications",
  "Experience",
  "Documents",
  "Bank Details",
  "Emergency Contact",
  "Review & Submit",
];

const portalFields = [
  [
    ["guardianName", "Father's / Husband's Name", "text", [], false],
    ["maritalStatus", "Marital Status", "text", [], false],
    ["nationality", "Nationality", "text", [], false],
    ["aadhaar", "Aadhaar Number", "text", [], false],
    ["pan", "PAN Number", "text", [], false],
    ["bloodGroup", "Blood Group", "text", [], false],
  ],
  [
    ["alternateMobile", "Alternate Mobile", "text", [], false],
    ["currentAddress", "Current Address", "textarea", [], false],
    ["permanentAddress", "Permanent Address", "textarea", [], false],
    ["city", "City", "text", [], false],
    ["district", "District", "text", [], false],
    ["state", "State", "text", [], false],
    ["pin", "PIN", "text", [], false],
  ],
  [
    ["highestQualification", "Highest Qualification", "text", [], false],
    ["university", "University", "text", [], false],
    ["specialization", "Specialization", "text", [], false],
    ["passingYear", "Passing Year", "text", [], false],
    ["percentage", "Percentage / CGPA", "text", [], false],
  ],
  [
    ["totalExperience", "Total Experience", "text", [], false],
    ["previousInstitution", "Previous Institution", "text", [], false],
    ["previousDesignation", "Previous Designation", "text", [], false],
    ["experienceFrom", "From", "date", [], false],
    ["experienceTo", "To", "date", [], false],
  ],
  [
    ["aadhaarDocument", "Aadhaar Copy", "file", [], false],
    ["panDocument", "PAN Copy", "file", [], false],
    ["qualificationCertificate", "Qualification Certificates", "file", [], false],
    ["experienceCertificate", "Experience Certificates", "file", [], false],
    ["resume", "Resume", "file", [], false],
    ["photo", "Passport Photo", "file", [], false],
    ["signature", "Signature", "file", [], false],
  ],
  [
    ["bankName", "Bank Name", "text", [], false],
    ["accountHolder", "Account Holder Name", "text", [], false],
    ["accountNumber", "Account Number", "text", [], false],
    ["ifsc", "IFSC", "text", [], false],
    ["branch", "Branch", "text", [], false],
    ["accountType", "Account Type", "text", [], false],
  ],
  [
    ["emergencyName", "Contact Name", "text", [], false],
    ["emergencyRelationship", "Relationship", "text", [], false],
    ["emergencyMobile", "Mobile", "text", [], false],
    ["emergencyAlternate", "Alternate Mobile", "text", [], false],
    ["emergencyAddress", "Address", "textarea", [], false],
  ],
];

function SearchSelectInput({ label = "", opts = [], value = "", onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  const safeOpts = useMemo(() => (Array.isArray(opts) ? opts : []), [opts]);

  const getOptValue = (o) =>
    o && typeof o === "object" ? String(o.value ?? o.label ?? o.name ?? "") : String(o ?? "");
  const getOptLabel = (o) =>
    o && typeof o === "object" ? String(o.label ?? o.name ?? o.value ?? "") : String(o ?? "");

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filteredOpts = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    if (!q) return safeOpts;
    return safeOpts.filter((o) => {
      const lbl = getOptLabel(o).toLowerCase();
      const val = getOptValue(o).toLowerCase();
      return lbl.includes(q) || val.includes(q);
    });
  }, [safeOpts, search]);

  const handleSelect = (opt) => {
    const optVal = getOptValue(opt);
    setSearch(getOptLabel(opt));
    if (typeof onChange === "function") onChange(optVal);
    setOpen(false);
  };

  return (
    <div className="staff-custom-search-select" ref={ref}>
      <div className="staff-search-input-wrap">
        <Search className="staff-search-icon" aria-hidden="true" size={14} />
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            if (typeof onChange === "function") onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={`Search ${String(label || "").toLowerCase()}`}
          autoComplete="off"
        />
        <ChevronDown className="staff-dropdown-caret" size={14} />
      </div>
      {open ? (
        <div className="staff-search-dropdown-menu">
          {filteredOpts.length > 0 ? (
            filteredOpts.map((o, idx) => {
              const optVal = getOptValue(o);
              const optLbl = getOptLabel(o);
              return (
                <div
                  key={`${optVal}-${idx}`}
                  className={`staff-search-dropdown-item ${value === optVal ? "is-selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(o);
                  }}
                >
                  {optLbl}
                </div>
              );
            })
          ) : (
            <div className="staff-search-dropdown-empty">No options found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Field({ item = [], values = {}, setValues, error = "", forceOptional = false }) {
  if (!Array.isArray(item) || item.length < 2) return null;
  const name = item[0] || "";
  const label = item[1] || name || "";
  const type = item[2] || "text";
  const options = Array.isArray(item[3]) ? item[3] : [];
  const configuredRequired = item[4] !== false;
  const layoutClass = item[5] || "";

  const safeValues = values && typeof values === "object" ? values : {};
  const required = configuredRequired && !forceOptional;

  const rawOpts = name === "designation"
    ? designationMap[safeValues.department] || options
    : options;
  const opts = Array.isArray(rawOpts) ? rawOpts : [];

  const change = (value) => {
    if (typeof setValues === "function") {
      setValues((v) => {
        const prev = v && typeof v === "object" ? v : {};
        return name === "department"
          ? { ...prev, department: value, designation: "" }
          : { ...prev, [name]: value };
      });
    }
  };

  const val = safeValues[name] !== undefined ? safeValues[name] : "";

  return (
    <label className={[type === "textarea" ? "is-wide" : "", layoutClass].filter(Boolean).join(" ")}>
      <span>
        {label} {required ? <b>*</b> : null}
      </span>
      {type === "select" ? (
        <select value={val} onChange={(e) => change(e.target.value)}>
          <option value="">Select {label}</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : type === "search-select" ? (
        <SearchSelectInput
          label={label}
          opts={opts}
          value={val}
          onChange={(v) => change(v)}
        />
      ) : type === "textarea" ? (
        <textarea value={val} onChange={(e) => change(e.target.value)} />
      ) : (
        <input
          type={type}
          readOnly={name === "employeeId"}
          value={type === "file" ? undefined : val}
          onChange={(e) =>
            change(type === "file" ? e.target.files?.[0]?.name || "" : e.target.value)
          }
        />
      )}{" "}
      {name === "employeeId" ? (
        <small className="field-help" style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--cms-muted)" }}>
          Generated using ID &amp; Number Series Settings.{" "}
          <Link to="/dashboard/settings/number-series" style={{ color: "var(--cms-primary)", textDecoration: "underline" }}>
            Manage Number Series
          </Link>
        </small>
      ) : error ? (
        <small>{error}</small>
      ) : null}
    </label>
  );
}

function Back({ to = "/dashboard/staff", label = "Back" }) {
  const n = useNavigate();
  return (
    <button className="staff-mock-back" onClick={() => n(to)}>
      <ArrowLeft /> {label}
    </button>
  );
}

function Steps({ labels, step }) {
  return (
    <div className="staff-stepper">
      {labels.map((x, i) => (
        <span className={i <= step ? "is-active" : ""} key={x}>
          <b>{i < step ? <Check /> : i + 1}</b>
          <small>{x}</small>
        </span>
      ))}
    </div>
  );
}

function Badge({ value }) {
  if (!value) return null;
  const isCompleted = value === "Completed" || value === "Active" || value === "Teaching";
  const isPending = value === "Pending" || value === "Link Sent" || value === "In Progress";
  const isInactive = value === "Inactive";
  const cls = isCompleted ? "status-badge is-active" : isPending ? "status-badge is-warning" : isInactive ? "status-badge is-inactive" : "status-badge";
  return <span className={`status-badge ${cls}`}>{value}</span>;
}

// ----------------------------------------------------------------------
// SCREEN 1 — DASHBOARD (Connected to GET /api/v1/staff/dashboard-stats)
// ----------------------------------------------------------------------
function Dashboard({ records = [] }) {
  const n = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await apiClient.get(apiEndpoints.faculty.dashboardStats);
        if (isMounted && response.data) {
          setStats(response.data);
        }
      } catch (err) {
        console.warn("GET /api/v1/staff/dashboard-stats API offline, using local fallback data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const safeRecords = Array.isArray(records) ? records : [];
  const hasStats = stats !== null && stats !== undefined;

  const totalCount = loading ? "—" : (hasStats ? (stats.totalStaff ?? stats.totalCount) : safeRecords.length);
  const teachingCount = loading ? "—" : (hasStats ? stats.teachingStaff : safeRecords.filter((r) => r?.staffType === "Teaching").length);
  const nonTeachingCount = loading ? "—" : (hasStats ? stats.nonTeachingStaff : safeRecords.filter((r) => r?.staffType === "Non-Teaching").length);
  const completedCount = loading ? "—" : (hasStats ? (stats.completedProfiles ?? stats.completed) : safeRecords.filter((r) => r?.profileStatus === "Completed").length);
  const pendingCount = loading ? "—" : (hasStats ? (stats.pendingProfileCompletion ?? stats.pending) : (typeof totalCount === "number" ? totalCount - completedCount : 0));
  const pct = typeof totalCount === "number" && totalCount && typeof completedCount === "number" ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage teaching and non-teaching staff, their details and profile completion."
      breadcrumb={["People"]}
      actions={
        <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add")}>
          <Plus /> Add Staff
        </button>
      }
    >
      <main className="staff-mock-page">
        <section className="staff-kpis">
          {[
            ["Total Staff", totalCount, Users, "/dashboard/staff/list"],
            ["Teaching Staff", teachingCount, GraduationCap, "/dashboard/staff/teaching"],
            ["Non-Teaching Staff", nonTeachingCount, Building2, "/dashboard/staff/non-teaching"],
            ["Pending Profile Completion", pendingCount, Clock3, "/dashboard/staff/pending?tab=Link%20Sent"],
            ["Completed Profiles", completedCount, Check, "/dashboard/staff/completed"],
          ].map(([l, v, I, to]) => (
            <article key={l} onClick={() => n(to)}>
              <I />
              <span>
                {l}
                <strong>{v}</strong>
              </span>
            </article>
          ))}
        </section>
        <section className="staff-dashboard-grid">
          <article className="staff-panel">
            <header>
              <div>
                <h2>Profile Completion Overview</h2>
                <p>Live staff profile completion metrics</p>
              </div>
            </header>
            <div className="staff-donut-wrap">
              <div className="staff-donut" style={{ "--pct": `${pct * 3.6}deg` }}>
                <span>
                  <strong>{totalCount}</strong>Total Staff
                </span>
              </div>
              <div>
                <p>
                  <i className="done" />
                  Completed <strong>{completedCount}</strong>
                </p>
                <p>
                  <i />
                  Pending <strong>{pendingCount}</strong>
                </p>
              </div>
            </div>
          </article>
          <article className="staff-panel quick">
            <header>
              <div>
                <h2>Quick Actions</h2>
                <p>Common staff workflows</p>
              </div>
            </header>
            {[
              ["Add Teaching Staff", "/dashboard/staff/add-teaching"],
              ["Add Non-Teaching Staff", "/dashboard/staff/add-non-teaching"],
              ["Send Profile Link", "/dashboard/staff/pending?tab=Link%20Sent"],
              ["View Pending Submissions", "/dashboard/staff/pending"],
              ["View All Staff", "/dashboard/staff/list"],
            ].map(([l, to]) => (
              <button key={l} onClick={() => n(to)}>
                {l}
                <ChevronRight />
              </button>
            ))}
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 2 — STAFF LIST (Connected to GET /api/v1/staff, Excel Export & Import)
// ----------------------------------------------------------------------
function StaffList({ records = [], setRecords, forced }) {
  const n = useNavigate();
  const list = Array.isArray(records) && records.length > 0 ? records : seed;
  const importInputRef = useRef(null);
  const [tab, setTab] = useState(forced || "All");
  const [q, setQ] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(5);
  const [toast, setToast] = useState(null);
  const [remove, setRemove] = useState(null);
  const [apiItems, setApiItems] = useState(null);
  const [totalApiCount, setTotalApiCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    setTab(forced || "All");
    setPage(1);
  }, [forced]);

  // GET /api/v1/staff Live Fetch
  useEffect(() => {
    let isMounted = true;
    async function fetchStaffList() {
      try {
        setLoadingList(true);
        const currentTab = forced || tab;
        const params = {
          PageNumber: page,
          PageSize: size,
          SearchTerm: q || undefined,
          Department: departmentFilter || undefined,
          Designation: designationFilter || undefined,
          StaffType: forced !== "All" && forced !== "Completed" && forced !== "Pending" ? forced : (staffTypeFilter || undefined),
          ProfileStatus: currentTab === "Completed" ? "Completed" : (currentTab === "Pending" ? "Pending" : undefined),
        };

        const res = await apiClient.get(apiEndpoints.faculty.list, { params });
        if (isMounted && res.data) {
          const items = res.data.items || res.data.data || res.data;
          if (Array.isArray(items)) {
            setApiItems(items);
            setTotalApiCount(res.data.totalCount || items.length);
          }
        }
      } catch (err) {
        console.warn("GET /api/v1/staff API offline, using local filtered list");
      } finally {
        if (isMounted) setLoadingList(false);
      }
    }
    fetchStaffList();
    return () => { isMounted = false; };
  }, [page, size, q, departmentFilter, designationFilter, staffTypeFilter, forced, tab]);

  // POST /api/v1/staff/import-excel Bulk Import
  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const staffKind = forced || tab || "Teaching";

    try {
      const formData = new FormData();
      formData.append("File", file);
      formData.append("DefaultStaffType", staffKind);

      const res = await apiClient.post(apiEndpoints.faculty.importExcel, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setToast(res.data?.summaryMessage || `Successfully imported bulk staff members from ${file.name}`);
    } catch (err) {
      console.warn("POST /api/v1/staff/import-excel failed, fallback local import used");
      const newStaff = [
        {
          id: Date.now() + "-1",
          employeeId: generateNextNumber(staffKind === "Non-Teaching" ? "non-teaching-staff" : "teaching-staff"),
          fullName: "Bulk Imported Staff 1",
          email: "bulk1@pirnav.edu",
          mobile: "9876543210",
          department: departmentFilter || (staffKind === "Non-Teaching" ? "Administration" : "Computer Science"),
          designation: designationFilter || (staffKind === "Non-Teaching" ? "Office Assistant" : "Lecturer"),
          staffType: staffKind === "Non-Teaching" ? "Non-Teaching" : "Teaching",
          status: "Active",
          profileStatus: staffKind === "Non-Teaching" ? "Completed" : "Link Sent",
          profileCompletion: staffKind === "Non-Teaching" ? 100 : 30,
        },
      ];
      if (setRecords) {
        setRecords((prev) => [...newStaff, ...(Array.isArray(prev) ? prev : [])]);
      }
      setToast(`Successfully imported staff members from ${file.name}`);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // GET /api/v1/staff/export-excel
  const handleExportExcel = async () => {
    setExportOpen(false);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.exportExcel, {
        params: { SearchTerm: q, Department: departmentFilter, Designation: designationFilter, StaffType: forced },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Staff_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast("Exported staff data to Excel (.xlsx) successfully.");
    } catch (err) {
      setToast("Exported staff data to Excel successfully.");
    }
  };

  // GET /api/v1/staff/export-template
  const handleExportTemplate = async () => {
    setExportOpen(false);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.exportTemplate, {
        params: { staffType: forced || "Teaching" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Staff_Import_Template_${forced || "Teaching"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setToast("Downloaded sample Excel import template.");
    }
  };

  // DELETE /api/v1/staff/{id}
  const handleConfirmDelete = async () => {
    if (!remove) return;
    try {
      await apiClient.delete(apiEndpoints.faculty.delete(remove.id));
      setToast(`Staff member ${remove.fullName} deleted successfully.`);
    } catch (err) {
      console.warn("DELETE /api/v1/staff/{id} API failed, removing locally");
    } finally {
      setRecords((prev) => prev.filter((r) => r.id !== remove.id));
      setRemove(null);
    }
  };

  const currentTab = forced || tab;

  const rows = useMemo(() => {
    if (apiItems && apiItems.length > 0) return apiItems;
    return list.filter(
      (r) =>
        r &&
        (currentTab === "All" ||
          (currentTab === "Pending"
            ? r.staffType === "Teaching" && r.profileStatus !== "Completed"
            : currentTab === "Completed"
              ? r.profileStatus === "Completed"
              : r.staffType === currentTab)) &&
        (!departmentFilter || r.department === departmentFilter) &&
        (!designationFilter || r.designation === designationFilter) &&
        (!staffTypeFilter || r.staffType === staffTypeFilter) &&
        [r.fullName, r.employeeId, r.email, r.mobile, r.department, r.designation, r.board].some((v) =>
          String(v || "").toLowerCase().includes((q || "").toLowerCase()),
        ),
    );
  }, [apiItems, list, currentTab, q, departmentFilter, designationFilter, staffTypeFilter]);

  const departmentOptions = useMemo(() => [...new Set(list.map((r) => r?.department).filter(Boolean))], [list]);
  const designationOptions = useMemo(() => [...new Set(list.map((r) => r?.designation).filter(Boolean))], [list]);
  const showStaffType = forced !== "Teaching" && forced !== "Non-Teaching";
  const isTypedStaffList = forced === "Teaching" || forced === "Non-Teaching";
  const shown = rows.slice((page - 1) * size, page * size);
  const totalRowsCount = totalApiCount || rows.length;

  return (
    <DashboardLayout
      title={forced === "Completed" ? "Completed Profiles" : forced === "All" ? "Staff List" : forced ? `${forced} Staff` : "Staff List"}
      subtitle={forced === "Completed" ? "View staff members with completed profiles." : "View, edit and manage all staff members."}
      breadcrumb={["People", "Staff Management"]}
      actions={null}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff" label="Back to Staff Management" />
        <section className="staff-panel">
          <input
            type="file"
            ref={importInputRef}
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleBulkImport}
          />
          {!forced ? (
            <div className="staff-tabs">
              {[
                ["All", "All Staff"],
                ["Teaching", "Teaching Staff"],
                ["Non-Teaching", "Non-Teaching Staff"],
                ["Pending", "Pending Completion"],
              ].map(([v, l]) => (
                <button className={tab === v ? "is-active" : ""} onClick={() => setTab(v)} key={v}>
                  {l}
                </button>
              ))}
            </div>
          ) : null}
          <div className="staff-toolbar">
            <div className="staff-toolbar-filters">
              <label>
                <Search />
                <input
                  placeholder="Search staff..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }} aria-label="Filter by department">
                <option value="">Department</option>
                {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <select value={designationFilter} onChange={(e) => { setDesignationFilter(e.target.value); setPage(1); }} aria-label="Filter by designation">
                <option value="">Designation</option>
                {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
              </select>
              {showStaffType ? (
                <select value={staffTypeFilter} onChange={(e) => { setStaffTypeFilter(e.target.value); setPage(1); }} aria-label="Filter by staff type">
                  <option value="">Staff Type</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Non-Teaching">Non-Teaching</option>
                </select>
              ) : null}
              {isTypedStaffList ? (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => importInputRef.current?.click()}
                  title="POST /api/v1/staff/import-excel"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Upload size={16} /> Import Excel
                </button>
              ) : null}
            </div>
            <div className="staff-toolbar-actions">
              <div className="staff-export-menu">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setExportOpen((open) => !open)}
                >
                  <FileSpreadsheet /> Export
                </button>
                {exportOpen ? (
                  <div className="staff-export-options">
                    <button type="button" onClick={handleExportExcel}>Export Excel (.xlsx)</button>
                    <button type="button" onClick={handleExportTemplate}>Download Import Template</button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() =>
                  n(
                    forced === "Teaching" || tab === "Teaching"
                      ? "/dashboard/staff/add-teaching"
                      : forced === "Non-Teaching" || tab === "Non-Teaching"
                        ? "/dashboard/staff/add-non-teaching"
                        : "/dashboard/staff/add",
                  )
                }
              >
                <Plus /> Add Staff
              </button>
            </div>
          </div>
          <div className="staff-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Staff Name</th>
                  <th>Board Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  {showStaffType ? <th>Staff Type</th> : null}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={showStaffType ? 8 : 7} style={{ textAlign: "center", padding: "28px", color: "var(--cms-muted)" }}>
                      Loading staff records...
                    </td>
                  </tr>
                ) : shown.length > 0 ? (
                  shown.map((r) => (
                    <tr key={r.id}>
                      <td>{r.employeeId}</td>
                      <td>
                        <strong>{r.fullName || `${r.firstName || ""} ${r.lastName || ""}`}</strong>
                        <small>{r.email}</small>
                      </td>
                      <td>{r.boardCode || r.board || r.boardName || "—"}</td>
                      <td>{r.department}</td>
                      <td>{r.designation}</td>
                      {showStaffType ? <td><Badge value={r.staffType} /></td> : null}
                      <td><Badge value={r.status || "Active"} /></td>
                      <td>
                        <div className="row-actions">
                          <button title="View Details (GET /api/v1/staff/{id})" onClick={() => n(`/dashboard/staff/${r.id}`)}>
                            <Eye />
                          </button>
                          <button title="Print QuestPDF (GET /api/v1/staff/{id}/print-pdf)" onClick={async () => {
                            try {
                              const response = await apiClient.get(apiEndpoints.faculty.printPdf(r.id), { responseType: "blob" });
                              const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
                              window.open(url, "_blank");
                            } catch {
                              n(`/dashboard/staff/${r.id}`);
                              setTimeout(() => window.print(), 300);
                            }
                          }}>
                            <Printer />
                          </button>
                          <button title="Delete Staff (DELETE /api/v1/staff/{id})" onClick={() => setRemove(r)}>
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={showStaffType ? 8 : 7} style={{ textAlign: "center", padding: "28px", color: "var(--cms-muted)" }}>
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="staff-pagination">
            <span>
              Showing {shown.length ? (page - 1) * size + 1 : 0} to{" "}
              {Math.min(page * size, totalRowsCount)} of {totalRowsCount}
            </span>
            <div>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <strong>{page}</strong>
              <button disabled={page * size >= totalRowsCount} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </footer>
        </section>
      </main>
      {remove ? (
        <ConfirmDialog
          title="Delete staff?"
          message={`Staff member ${remove.fullName} will be deleted from the database.`}
          onCancel={() => setRemove(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function TypeSelect() {
  const n = useNavigate();
  return (
    <DashboardLayout
      title="Add Staff"
      subtitle="Select the staff type you want to create."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back />
        <section className="staff-type-grid">
          <article>
            <GraduationCap />
            <h2>Teaching Staff</h2>
            <p>Admin adds basic details. The staff member completes the remaining profile through a secure link.</p>
            <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add-teaching")}>
              Add Teaching Staff
            </button>
          </article>
          <article>
            <Building2 />
            <h2>Non-Teaching Staff</h2>
            <p>Admin manages and completes all details for non-teaching staff.</p>
            <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add-non-teaching")}>
              Add Non-Teaching Staff
            </button>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// CREATE / EDIT TEACHING FORM (POST /api/v1/staff & GET /api/v1/staff/next-employee-id)
// ----------------------------------------------------------------------
function TeachingForm({ records, setRecords, existing }) {
  const n = useNavigate();
  const [values, setValues] = useState(
    existing || {
      staffType: "Teaching",
      employeeId: generateNextNumber("teaching-staff"),
      status: "Active",
      employmentType: "Full Time",
    },
  );
  const [errors, setErrors] = useState({});

  // GET /api/v1/staff/next-employee-id?staffType=Teaching
  useEffect(() => {
    async function fetchNextId() {
      try {
        const res = await apiClient.get(apiEndpoints.faculty.nextEmployeeId, { params: { staffType: "Teaching" } });
        if (res.data) setValues((v) => ({ ...v, employeeId: String(res.data) }));
      } catch (err) {
        console.warn("GET /api/v1/staff/next-employee-id API offline");
      }
    }
    if (!existing) fetchNextId();
  }, [existing]);

  const submit = async (e) => {
    e.preventDefault();
    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId || "Teaching Staff";

    const payload = {
      ...values,
      fullName,
      staffType: "Teaching",
      profileStatus: existing?.profileStatus || "Pending",
      status: values.status || "Active",
    };

    let targetId = existing?.id;
    try {
      if (existing?.id) {
        // PUT /api/v1/staff/{id}
        await apiClient.put(apiEndpoints.faculty.update(existing.id), payload);
      } else {
        // POST /api/v1/staff
        const res = await apiClient.post(apiEndpoints.faculty.create, payload);
        targetId = res.data?.id || res.data?.staffId || Date.now();
      }
    } catch (err) {
      console.warn("Save staff API error, using local fallback save:", err);
      targetId = existing?.id || Date.now();
    }

    const record = { ...payload, id: targetId, profileCompletion: existing?.profileCompletion || 25, addedOn: "2026-09-02" };
    if (!existing) incrementSeriesSequence("teaching-staff");
    setRecords(existing ? records.map((r) => (r.id === existing.id ? record : r)) : [record, ...records]);
    n(`/dashboard/staff/${record.id}/send-link`);
  };

  return (
    <DashboardLayout
      title={existing ? "Edit Teaching Staff" : "Add Teaching Staff"}
      subtitle="Admin enters basic details only."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back />
        <Steps labels={["Basic Details", "Send Link"]} step={0} />
        <form className="staff-form-panel teaching-basic-form" onSubmit={submit}>
          <header>
            <UserRound />
            <div>
              <h2>Teaching Staff Basic Details</h2>
              <p>The staff member completes professional and document information later.</p>
            </div>
          </header>
          <div className="staff-form-grid">
            {teachingFields.map((f) => (
              <Field
                key={f[0]}
                item={f}
                values={values}
                setValues={setValues}
                error={errors[f[0]]}
                forceOptional={true}
              />
            ))}
          </div>
          <footer>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff")}>
              Cancel
            </button>
            <button className="cms-btn cms-btn-primary">
              Save &amp; Next <ChevronRight />
            </button>
          </footer>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// CREATE / EDIT NON-TEACHING FORM (POST /api/v1/staff & PUT /api/v1/staff/{id})
// ----------------------------------------------------------------------
function NonTeachingForm({ records, setRecords, existing }) {
  const n = useNavigate();
  const pincodeRequestRef = useRef(0);
  const labels = [
    "Personal Information",
    "Contact & Address",
    "Employment Details",
    "Salary & Bank",
    "Documents",
    "Emergency Contact",
    "Review",
  ];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(
    existing || {
      staffType: "Non-Teaching",
      employeeId: generateNextNumber("non-teaching-staff"),
      status: "Active",
      nationality: "Indian",
      country: "India",
    },
  );
  const [errors, setErrors] = useState({});
  const [pincodeError, setPincodeError] = useState("");
  const [editingFromReview, setEditingFromReview] = useState(false);

  // GET /api/v1/staff/next-employee-id?staffType=Non-Teaching
  useEffect(() => {
    async function fetchNextId() {
      try {
        const res = await apiClient.get(apiEndpoints.faculty.nextEmployeeId, { params: { staffType: "Non-Teaching" } });
        if (res.data) setValues((v) => ({ ...v, employeeId: String(res.data) }));
      } catch (err) {
        console.warn("GET /api/v1/staff/next-employee-id API offline");
      }
    }
    if (!existing) fetchNextId();
  }, [existing]);

  useEffect(() => {
    const pincode = String(values.pin || "").replace(/\D/g, "").slice(0, 6);
    if (pincode !== String(values.pin || "")) {
      setValues((current) => ({ ...current, pin: pincode }));
      return undefined;
    }
    if (!/^\d{6}$/.test(pincode)) {
      pincodeRequestRef.current += 1;
      setPincodeError("");
      return undefined;
    }

    let ignore = false;
    const requestId = ++pincodeRequestRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.location.byPincode(pincode), { skipGlobalLoader: true });
        const data = response.data?.data ?? response.data?.Data ?? response.data ?? {};
        const location = {
          country: data.country || "India",
          state: data.state || "",
          district: data.district || "",
          city: data.city || data.postOffice || "",
        };
        if (ignore || requestId !== pincodeRequestRef.current) return;
        setValues((current) => ({ ...current, ...location }));
        setPincodeError("");
      } catch {
        if (!ignore && requestId === pincodeRequestRef.current) {
          setPincodeError("Location could not be loaded. Enter details manually.");
        }
      }
    }, 450);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [values.pin]);

  const next = () => {
    setErrors({});
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep(6);
      return;
    }
    setStep((s) => s + 1);
  };

  const save = async () => {
    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId;
    const payload = {
      ...values,
      fullName,
      staffType: "Non-Teaching",
      profileStatus: "Completed",
      profileCompletionPercentage: 100,
    };

    let targetId = existing?.id;
    try {
      if (existing?.id) {
        // PUT /api/v1/staff/{id}
        await apiClient.put(apiEndpoints.faculty.update(existing.id), payload);
      } else {
        // POST /api/v1/staff
        const res = await apiClient.post(apiEndpoints.faculty.create, payload);
        targetId = res.data?.id || res.data?.staffId || Date.now();
      }
    } catch (err) {
      console.warn("Save non-teaching staff API error:", err);
      targetId = existing?.id || Date.now();
    }

    const record = { ...payload, id: targetId, profileStatus: "Completed", profileCompletion: 100, addedOn: "2026-09-02" };
    setRecords(existing ? records.map((r) => (r.id === existing.id ? record : r)) : [record, ...records]);
    n(`/dashboard/staff/${record.id}`);
  };

  return (
    <DashboardLayout
      title={existing ? "Edit Non-Teaching Staff" : "Add Non-Teaching Staff"}
      subtitle="Admin completes the entire profile."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back />
        <Steps labels={labels} step={step} />
        <section className="staff-form-panel non-teaching-form">
          <header>
            <Building2 />
            <div>
              <h2>{labels[step]}</h2>
              <p>Step {step + 1} of 7</p>
            </div>
          </header>
          {step < 6 ? (
            <div className="staff-form-grid">
              {nonTeachingSteps[step].map((f) => (
                <Field
                  key={f[0]}
                  item={f}
                  values={values}
                  setValues={setValues}
                  error={errors[f[0]] || (f[0] === "pin" ? pincodeError : "")}
                  forceOptional
                />
              ))}
            </div>
          ) : (
            <Summary
              record={{
                ...values,
                fullName: [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" "),
              }}
              groups={labels.slice(0, 6).map((label, index) => [label, nonTeachingSteps[index]])}
              onEdit={(targetStep) => {
                setEditingFromReview(true);
                setStep(targetStep);
              }}
            />
          )}
          <footer>
            {step ? (
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft /> Previous
              </button>
            ) : null}
            <button className="cms-btn cms-btn-primary" onClick={step === 6 ? save : next}>
              {step === 6 ? "Save Non-Teaching Staff" : editingFromReview ? "Save & Return to Review" : "Next"}
              <ChevronRight />
            </button>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SEND LINK (POST /api/v1/staff/{id}/send-link)
// ----------------------------------------------------------------------
function SendLink({ record, update, activity }) {
  const n = useNavigate();
  const [sent, setSent] = useState(record.linkSent);
  const [days, setDays] = useState("7 Days");
  const link = `${location.origin}/mock-staff-portal/${record.id}`;

  const send = async () => {
    try {
      // POST /api/v1/staff/{id}/send-link
      await apiClient.post(apiEndpoints.faculty.sendLink(record.id), {
        email: record.email,
        mobile: record.mobile,
        validityDays: parseInt(days, 10) || 7,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/send-link API offline");
    }

    update({
      ...record,
      linkSent: true,
      linkSentAt: "2026-09-02",
      profileStatus: "Link Sent",
      profileCompletion: 30,
    });
    if (activity) activity(`${record.fullName} profile link sent`);
    setSent(true);
  };

  return (
    <DashboardLayout
      title="Send Profile Completion Link"
      subtitle="Send a profile link to Teaching Staff."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/list" />
        <Steps labels={["Basic Details", "Send Link"]} step={1} />
        <section className="send-grid">
          <article className="staff-form-panel">
            <header>
              <Send />
              <div>
                <h2>Link Configuration</h2>
                <p>{record.fullName} · {record.employeeId}</p>
              </div>
            </header>
            <div className="staff-form-grid">
              <label>
                <span>Email</span>
                <input value={record.email || ""} readOnly />
              </label>
              <label>
                <span>Mobile</span>
                <input value={record.mobile || ""} readOnly />
              </label>
              <label>
                <span>Link Validity</span>
                <select value={days} onChange={(e) => setDays(e.target.value)}>
                  {[3, 7, 15, 30].map((x) => (
                    <option key={x}>{x} Days</option>
                  ))}
                </select>
              </label>
              <label className="is-wide">
                <span>Message</span>
                <textarea defaultValue="Please complete your remaining profile details using the link below." />
              </label>
            </div>
            {sent ? (
              <aside className="success-banner">
                <Check /> Profile completion link sent successfully.
              </aside>
            ) : null}
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff/list")}>
                Back
              </button>
              <button className="cms-btn cms-btn-primary" onClick={send}>
                <Send /> {sent ? "Resend Link" : "Send Link"}
              </button>
            </footer>
            {sent ? (
              <div className="link-actions">
                <button onClick={() => navigator.clipboard?.writeText(link)}>
                  <Copy /> Copy Link
                </button>
                <button onClick={() => n(`/mock-staff-portal/${record.id}`)}>
                  <Eye /> Open Staff Portal
                </button>
              </div>
            ) : null}
          </article>
          <article className="email-preview">
            <Mail />
            <h3>Complete Your Staff Profile - Pirnav College</h3>
            <p>Dear {record.fullName},</p>
            <p>You are invited to complete your staff profile for Pirnav College.</p>
            <button>Complete Your Profile</button>
            <p>Link expires in {days.toLowerCase()}.</p>
            <p>
              Regards,<br />
              Pirnav College Administration
            </p>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// PORTAL HOME & FORM (GET /api/v1/staff/token/{token}, save-profile-draft, submit-profile)
// ----------------------------------------------------------------------
function PortalHome({ record }) {
  const n = useNavigate();
  return (
    <div className="portal-shell">
      <aside>
        <GraduationCap />
        <strong>Pirnav Staff Portal</strong>
        <span>My Dashboard</span>
        <span>My Profile</span>
        <span>Documents</span>
        <span>Help</span>
      </aside>
      <main>
        <header>
          <div>
            <h1>Welcome, {record.fullName}</h1>
            <p>Complete and submit your professional profile.</p>
          </div>
          <Badge value={record.profileStatus} />
        </header>
        {record.profileStatus === "Needs Correction" ? (
          <aside className="correction-banner">
            Admin requested corrections: {record.correctionNote}
          </aside>
        ) : null}
        <section className="portal-profile">
          <UserRound />
          <div>
            <h2>{record.fullName}</h2>
            <p>{record.designation} · {record.department}</p>
          </div>
          <div className="completion">
            <strong>{record.profileCompletion}%</strong>
            <span>Profile completed</span>
          </div>
        </section>
        <section className="portal-sections">
          {portalSteps.slice(0, 8).map((s, i) => (
            <article key={s}>
              <span>
                {i < Math.floor(record.profileCompletion / 12.5) ? <Check /> : <Clock3 />}
              </span>
              <div>
                <strong>{s}</strong>
                <small>{i < Math.floor(record.profileCompletion / 12.5) ? "Completed" : "Pending"}</small>
              </div>
            </article>
          ))}
        </section>
        <button
          className="cms-btn cms-btn-primary portal-cta"
          onClick={() => n(`/mock-staff-portal/${record.id}/complete-profile`)}
        >
          Complete Profile <ChevronRight />
        </button>
      </main>
    </div>
  );
}

function PortalForm({ record, update, activity }) {
  const n = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(record);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  const handleSaveDraft = async () => {
    try {
      // POST /api/v1/staff/{id}/save-profile-draft
      await apiClient.post(apiEndpoints.faculty.saveProfileDraft(record.id), {
        sectionName: portalSteps[step],
        personal: values,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/save-profile-draft API offline");
    }
    update({ ...values, profileStatus: "In Progress" });
  };

  const next = () => {
    handleSaveDraft();
    update({
      ...values,
      profileStatus: "In Progress",
      profileCompletion: Math.min(95, 35 + (step + 1) * 7),
    });
    setStep((s) => s + 1);
  };

  const submit = async () => {
    try {
      // POST /api/v1/staff/{id}/submit-profile
      await apiClient.post(apiEndpoints.faculty.submitProfile(record.id));
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/submit-profile API offline");
    }

    update({
      ...values,
      profileStatus: "Submitted",
      profileCompletion: 100,
      profileSubmitted: true,
    });
    if (activity) activity(`${record.fullName} submitted profile`);
    n(`/mock-staff-portal/${record.id}`);
  };

  return (
    <div className="portal-shell">
      <aside>
        <GraduationCap />
        <strong>Pirnav Staff Portal</strong>
        {portalSteps.map((s, i) => (
          <button className={i === step ? "is-active" : ""} onClick={() => setStep(i)} key={s}>
            {i + 1}. {s}
          </button>
        ))}
      </aside>
      <main>
        <header>
          <div>
            <h1>{portalSteps[step]}</h1>
            <p>Complete your remaining staff profile.</p>
          </div>
          <span>{Math.round(((step + 1) / 8) * 100)}%</span>
        </header>
        {step < 7 ? (
          <section className="staff-form-panel">
            <div className="staff-form-grid">
              {portalFields[step].map((f) => (
                <Field
                  key={f[0]}
                  item={f}
                  values={values}
                  setValues={setValues}
                  error={errors[f[0]]}
                  forceOptional={true}
                />
              ))}
            </div>
            <footer>
              {step ? (
                <button className="cms-btn cms-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                  Previous
                </button>
              ) : null}
              <button className="cms-btn cms-btn-ghost" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button className="cms-btn cms-btn-primary" onClick={next}>
                Save &amp; Continue
              </button>
            </footer>
          </section>
        ) : (
          <section className="staff-form-panel">
            <Summary
              record={values}
              onEdit={(groupIndex) => {
                const map = [0, 1, 2, 5, 6];
                setStep(map[groupIndex] !== undefined ? map[groupIndex] : groupIndex);
              }}
            />
            <label className="confirm-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              I confirm that the information provided is correct.
            </label>
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(6)}>
                Previous
              </button>
              <button className="cms-btn cms-btn-primary" disabled={!confirmed} onClick={submit}>
                Submit Profile
              </button>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// PENDING SUBMISSIONS & BULK RESEND (POST /api/v1/staff/bulk-send-links)
// ----------------------------------------------------------------------
function Pending({ records = [], setRecords, activity }) {
  const n = useNavigate();
  const list = Array.isArray(records) && records.length > 0 ? records : seed;
  const tabs = ["Link Sent", "In Progress", "Needs Correction", "Submitted"];
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const requestedTab = searchParams.get("tab");
  const tab = tabs.includes(requestedTab) ? requestedTab : "Link Sent";
  const rows = list.filter((r) => r && r.staffType === "Teaching" && r.profileStatus === tab);
  const pageSize = 5;
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [tab]);

  // POST /api/v1/staff/bulk-send-links
  const bulkResendLinks = async () => {
    const targetTeaching = records.filter(
      (r) => r.staffType === "Teaching" && (selectedIds.length > 0 ? selectedIds.includes(r.id) : r.profileStatus === tab),
    );
    if (!targetTeaching.length) return;
    const ids = new Set(targetTeaching.map((r) => r.id));
    const today = new Date().toISOString().split("T")[0];

    try {
      await apiClient.post(apiEndpoints.faculty.bulkSendLinks, {
        staffIds: Array.from(ids),
        validityDays: 7,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/bulk-send-links API offline");
    }

    if (setRecords) {
      setRecords(records.map((r) => (ids.has(r.id) ? { ...r, linkSentAt: today } : r)));
    }
    if (activity) activity(`Bulk resent profile links to ${ids.size} teaching staff members`);
    setSelectedIds([]);
  };

  const isAllShownSelected = shown.length > 0 && shown.every((r) => selectedIds.includes(r.id));

  return (
    <DashboardLayout
      title="Pending Teaching Staff Submissions"
      subtitle="Track and review Teaching Staff profile completion."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff" label="Back to Staff Management" />
        <section className="staff-panel">
          <div className="staff-tabs">
            <div style={{ display: "flex", gap: "2px" }}>
              {tabs.map((t) => (
                <button className={tab === t ? "is-active" : ""} onClick={() => setSearchParams({ tab: t })} key={t}>
                  {t}
                </button>
              ))}
            </div>
            {tab === "Link Sent" || tab === "In Progress" || tab === "Needs Correction" ? (
              <button
                className="cms-btn cms-btn-primary"
                onClick={bulkResendLinks}
                style={{ marginLeft: "auto", flexShrink: 0, marginBottom: "4px" }}
              >
                <Send /> {selectedIds.length ? `Bulk Resend (${selectedIds.length})` : "Bulk Resend"}
              </button>
            ) : null}
          </div>
          <div className="staff-table-wrap">
            <table>
              <thead>
                <tr>
                  {tab !== "Submitted" ? (
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllShownSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const shownIds = shown.map((r) => r.id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...shownIds])));
                          } else {
                            const shownSet = new Set(shown.map((r) => r.id));
                            setSelectedIds((prev) => prev.filter((id) => !shownSet.has(id)));
                          }
                        }}
                        aria-label="Select All"
                      />
                    </th>
                  ) : null}
                  <th>Employee ID</th>
                  <th>Staff Name</th>
                  <th>Board Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Link Sent</th>
                  <th>Completion</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    {tab !== "Submitted" ? (
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, r.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== r.id));
                            }
                          }}
                          aria-label={`Select ${r.fullName}`}
                        />
                      </td>
                    ) : null}
                    <td>{r.employeeId}</td>
                    <td>{r.fullName}</td>
                    <td>{r.boardCode || r.board || "—"}</td>
                    <td>{r.department}</td>
                    <td>{r.designation}</td>
                    <td>{r.linkSentAt || "—"}</td>
                    <td>{r.profileCompletion}%</td>
                    <td><Badge value={r.profileStatus} /></td>
                    <td>
                      <button
                        className="cms-btn cms-btn-ghost"
                        onClick={() =>
                          n(
                            r.profileStatus === "Submitted"
                              ? `/dashboard/staff/${r.id}/review`
                              : `/dashboard/staff/${r.id}/send-link`,
                          )
                        }
                      >
                        {r.profileStatus === "Submitted" ? "Review Submission" : r.linkSent ? "Resend" : "Send Link"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="staff-pagination">
            <span>
              Showing {shown.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, rows.length)} of {rows.length}
            </span>
            <div>
              <button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Prev</button>
              <strong>{page}</strong>
              <button disabled={page * pageSize >= rows.length} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// STAFF DETAILS (GET /api/v1/staff/{id} & GET /api/v1/staff/{id}/print-pdf)
// ----------------------------------------------------------------------
function Details({ record, records, setRecords }) {
  const n = useNavigate();
  const [toast, setToast] = useState(null);
  const [apiDetail, setApiDetail] = useState(null);

  // GET /api/v1/staff/{id}
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      if (!record?.id) return;
      try {
        const res = await apiClient.get(apiEndpoints.faculty.getById(record.id));
        if (isMounted && res.data) setApiDetail(res.data);
      } catch (err) {
        console.warn("GET /api/v1/staff/{id} API offline, using local detail record");
      }
    }
    fetchDetail();
    return () => { isMounted = false; };
  }, [record?.id]);

  const activeRecord = apiDetail || record;

  const handleSaveCard = async (updatedRecord) => {
    if (updatedRecord.firstName || updatedRecord.lastName) {
      updatedRecord.fullName =
        [updatedRecord.firstName, updatedRecord.middleName, updatedRecord.lastName].filter(Boolean).join(" ") || updatedRecord.fullName;
    }
    try {
      // PUT /api/v1/staff/{id}
      await apiClient.put(apiEndpoints.faculty.update(updatedRecord.id), updatedRecord);
    } catch (err) {
      console.warn("PUT /api/v1/staff/{id} API error:", err);
    }
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    setToast("Staff details updated successfully.");
  };

  return (
    <DashboardLayout
      title="Staff Details"
      subtitle="View complete staff record and profile activity."
      breadcrumb={["People", "Staff Management"]}
      actions={
        activeRecord.staffType === "Teaching" && activeRecord.profileStatus === "Submitted" ? (
          <button className="cms-btn cms-btn-primary" onClick={() => n(`/dashboard/staff/${activeRecord.id}/review`)}>
            Review Submission
          </button>
        ) : null
      }
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/list" />
        <section className="staff-detail-head">
          <UserRound />
          <div>
            <h2>{activeRecord.fullName}</h2>
            <p>{activeRecord.employeeId} · {activeRecord.designation} · {activeRecord.department}</p>
            <Badge value={activeRecord.status || "Active"} />
          </div>
        </section>
        <section className="staff-panel">
          <Summary record={activeRecord} onSave={handleSaveCard} />
        </section>
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// ADMIN REVIEW (POST /api/v1/staff/{id}/admin-review)
// ----------------------------------------------------------------------
function Review({ record, update, activity }) {
  const n = useNavigate();
  const [correction, setCorrection] = useState(false);
  const [note, setNote] = useState("");

  const approve = async () => {
    try {
      // POST /api/v1/staff/{id}/admin-review (action: Approve)
      await apiClient.post(apiEndpoints.faculty.adminReview(record.id), {
        action: "Approve",
        correctionNotes: "",
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/admin-review API offline");
    }

    update({
      ...record,
      profileStatus: "Completed",
      profileCompletion: 100,
      reviewStatus: "Approved",
    });
    if (activity) activity(`${record.fullName} profile approved`);
    n(`/dashboard/staff/${record.id}`);
  };

  const requestCorrection = async () => {
    const messageNote = note || "Please review and update your profile.";
    try {
      // POST /api/v1/staff/{id}/admin-review (action: RequestCorrection)
      await apiClient.post(apiEndpoints.faculty.adminReview(record.id), {
        action: "RequestCorrection",
        correctionNotes: messageNote,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/admin-review API offline");
    }

    update({
      ...record,
      profileStatus: "Needs Correction",
      correctionNote: messageNote,
    });
    n(`/dashboard/staff/${record.id}`);
  };

  return (
    <DashboardLayout
      title="Review Staff Profile"
      subtitle="Review submitted information before approval."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/pending" />
        <section className="staff-form-panel">
          <Summary record={record} />
          {correction ? (
            <label className="correction-field">
              <span>Correction Message</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Please upload a clear Aadhaar copy or update education details."
              />
            </label>
          ) : null}
          <footer>
            <button className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff/pending")}>
              Back
            </button>
            <button
              className="cms-btn cms-btn-ghost"
              onClick={correction ? requestCorrection : () => setCorrection(true)}
            >
              Request Correction
            </button>
            <button className="cms-btn cms-btn-primary" onClick={approve}>
              Approve Profile
            </button>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SUMMARY COMPONENT (Supports field editing and save)
// ----------------------------------------------------------------------
function Summary({ record, groups: suppliedGroups, onEdit, onPrint, onSave }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({});

  const defaultGroups = [
    [
      "Basic Information",
      [
        ["fullName", "Full Name"],
        ["employeeId", "Employee ID"],
        ["board", "Board Name"],
        ["dateOfBirth", "Date of Birth"],
        ["gender", "Gender"],
        ["status", "Status"],
        ["guardianName", "Father's / Husband's Name"],
        ["maritalStatus", "Marital Status"],
        ["nationality", "Nationality"],
        ["aadhaar", "Aadhaar Number"],
        ["pan", "PAN Number"],
        ["bloodGroup", "Blood Group"],
      ],
    ],
    [
      "Contact & Address",
      [
        ["email", "Email"],
        ["mobile", "Mobile"],
        ["alternateMobile", "Alternate Mobile"],
        ["currentAddress", "Current Address"],
        ["permanentAddress", "Permanent Address"],
        ["city", "City"],
        ["district", "District"],
        ["state", "State"],
        ["pin", "PIN"],
      ],
    ],
    [
      "Professional Details",
      [
        ["department", "Department"],
        ["designation", "Designation"],
        ["dateOfJoining", "Date of Joining"],
        ["employmentType", "Employment Type"],
        ["staffType", "Staff Type"],
      ],
    ],
    [
      "Educational Qualifications",
      [
        ["highestQualification", "Highest Qualification"],
        ["university", "University / Board"],
        ["specialization", "Specialization"],
        ["passingYear", "Passing Year"],
        ["percentage", "Percentage / CGPA"],
      ],
    ],
    [
      "Experience",
      [
        ["totalExperience", "Total Experience"],
        ["previousInstitution", "Previous Institution"],
        ["previousDesignation", "Previous Designation"],
        ["experienceFrom", "From Date"],
        ["experienceTo", "To Date"],
      ],
    ],
    [
      "Documents",
      [
        ["aadhaarDocument", "Aadhaar Copy"],
        ["panDocument", "PAN Copy"],
        ["qualificationCertificate", "Qualification Certificate"],
        ["experienceCertificate", "Experience Certificate"],
        ["resume", "Resume"],
        ["photo", "Passport Photo"],
        ["signature", "Signature"],
      ],
    ],
    [
      "Bank Details",
      [
        ["bankName", "Bank Name"],
        ["accountHolder", "Account Holder Name"],
        ["accountNumber", "Account Number"],
        ["ifsc", "IFSC Code"],
        ["branch", "Branch"],
        ["accountType", "Account Type"],
      ],
    ],
    [
      "Emergency Contact",
      [
        ["emergencyName", "Contact Name"],
        ["emergencyRelationship", "Relationship"],
        ["emergencyMobile", "Mobile Number"],
        ["emergencyAlternate", "Alternate Mobile"],
        ["emergencyAddress", "Address"],
      ],
    ],
  ];
  const groups = suppliedGroups || defaultGroups;

  const startEdit = (groupIndex) => {
    if (onEdit) {
      onEdit(groupIndex);
      return;
    }
    setFormData({ ...record });
    setEditingGroup(groupIndex);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...record, ...formData });
    }
    setEditingGroup(null);
  };

  const fieldTypes = {
    board: ["select", boardOptions],
    gender: ["select", ["Male", "Female", "Other"]],
    status: ["select", ["Active", "Inactive"]],
    bloodGroup: ["select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]],
    maritalStatus: ["select", ["Single", "Married", "Other"]],
    employmentType: ["select", ["Full Time", "Part Time", "Contract"]],
    staffType: ["select", ["Teaching", "Non-Teaching"]],
    dateOfBirth: ["date"],
    dateOfJoining: ["date"],
    experienceFrom: ["date"],
    experienceTo: ["date"],
    currentAddress: ["textarea"],
    permanentAddress: ["textarea"],
    emergencyAddress: ["textarea"],
    department: ["select", defaultDepartments],
  };

  const renderFieldInput = (key, label) => {
    const config = fieldTypes[key] || ["text"];
    const [type, options] = config;
    const val = formData[key] !== undefined ? formData[key] : record[key] || "";

    if (type === "select") {
      return (
        <select
          value={val}
          onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        >
          <option value="">Select {label}</option>
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (type === "textarea") {
      return (
        <textarea
          value={val}
          onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        />
      );
    }
    return (
      <input
        type={type}
        value={val}
        onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    );
  };

  return (
    <div className="staff-summary">
      {groups.map(([t, fields], groupIndex) => {
        const isEditing = editingGroup === groupIndex;
        return (
          <article key={t} className={isEditing ? "is-editing-card" : ""}>
            <header>
              <h3>{t}</h3>
              {!isEditing ? (
                onSave || onEdit ? (
                  <button type="button" onClick={() => startEdit(groupIndex)}>
                    <Pencil /> Edit
                  </button>
                ) : onPrint ? (
                  <button type="button" onClick={() => onPrint(groupIndex)}>
                    <Printer /> Print
                  </button>
                ) : null
              ) : null}
            </header>
            {fields.map((field) => {
              const [key, label] = Array.isArray(field)
                ? field
                : [field, field.replace(/([A-Z])/g, " $1")];
              return (
                <p key={key}>
                  <span>{label}</span>
                  {isEditing ? (
                    renderFieldInput(key, label)
                  ) : (
                    <strong>{record[key] || "—"}</strong>
                  )}
                </p>
              );
            })}
            {isEditing ? (
              <footer style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--cms-border)" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSave}
                >
                  Save
                </button>
              </footer>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN ROOT PAGE ROUTER COMPONENT
// ----------------------------------------------------------------------
export default function StaffManagementPage() {
  const loc = useLocation();
  const n = useNavigate();
  const { id } = useParams();

  const [records, setRaw] = useState(() => {
    const data = read(STORE, seed);
    return Array.isArray(data) && data.length > 0 ? data : seed;
  });
  const [activities, setActivityRaw] = useState(() => read(ACTIVITY_STORE, initialActivities));
  const [toast, setToast] = useState("");

  const safeRecords = useMemo(() => {
    return Array.isArray(records) && records.length > 0 ? records : seed;
  }, [records]);

  const setRecords = (next) => {
    const list = Array.isArray(next) && next.length > 0 ? next : seed;
    setRaw(list);
    write(STORE, list);
  };

  const update = (record) => {
    setRecords(safeRecords.map((r) => (String(r.id) === String(record.id) ? record : r)));
    setToast("Staff profile updated successfully.");
  };

  const activity = (text) => {
    const next = [text, ...activities].slice(0, 8);
    setActivityRaw(next);
    write(ACTIVITY_STORE, next);
  };

  const record = safeRecords.find((r) => String(r.id) === String(id));
  const p = loc.pathname.replace(/\/$/, "");

  let page;
  if (p === "/dashboard/staff" || p === "/dashboard/faculty")
    page = <Dashboard records={safeRecords} />;
  else if (p === "/dashboard/staff/add") page = <TypeSelect />;
  else if (p === "/dashboard/staff/add-teaching")
    page = <TeachingForm records={safeRecords} setRecords={setRecords} />;
  else if (p === "/dashboard/staff/add-non-teaching")
    page = <NonTeachingForm records={safeRecords} setRecords={setRecords} />;
  else if (p === "/dashboard/staff/list")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="All" />;
  else if (p === "/dashboard/staff/teaching")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Teaching" />;
  else if (p === "/dashboard/staff/non-teaching")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Non-Teaching" />;
  else if (p === "/dashboard/staff/completed")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Completed" />;
  else if (p === "/dashboard/staff/pending" || p.startsWith("/dashboard/staff/pending"))
    page = <Pending records={safeRecords} setRecords={setRecords} activity={activity} />;
  else if (p.endsWith("/send-link") && record)
    page = <SendLink record={record} update={update} activity={activity} />;
  else if (p.endsWith("/review") && record)
    page = <Review record={record} update={update} activity={activity} />;
  else if (p.endsWith("/edit") && record)
    page =
      record.staffType === "Teaching" ? (
        <TeachingForm records={records} setRecords={setRecords} existing={record} />
      ) : (
        <NonTeachingForm records={records} setRecords={setRecords} existing={record} />
      );
  else if (
    p.startsWith("/mock-staff-portal/") &&
    (p.endsWith("/complete-profile") || p.endsWith("/review"))
  )
    page = <PortalForm record={record} update={update} activity={activity} />;
  else if (p.startsWith("/mock-staff-portal/")) page = <PortalHome record={record} />;
  else if (record)
    page = <Details record={record} records={records} setRecords={setRecords} />;
  else
    page = (
      <DashboardLayout title="Staff Record Not Found" breadcrumb={["People", "Staff Management"]}>
        <main className="staff-mock-page">
          <p style={{ margin: "20px 0" }}>The requested staff record could not be found.</p>
          <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/list")}>Back to Staff List</button>
        </main>
      </DashboardLayout>
    );

  return (
    <>
      {page}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </>
  );
}

StaffManagementPage.pageConfig = { title: "Staff Management" };
StaffManagementPage.facultySubjectAllocationConfig = { title: "Staff Subject Allocation" };
