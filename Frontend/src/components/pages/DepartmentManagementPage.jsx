import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Download,
  Eye,
  FileSpreadsheet,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import "./DepartmentManagementPage.css";

const unwrapRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "results", "Results", "$values", "value", "Value"])
    if (Array.isArray(value?.[key])) return value[key];
  return [];
};
const pick = (row, ...keys) =>
  keys
    .map((key) => row?.[key])
    .find((value) => value !== undefined && value !== null && value !== "");
const normalizeDepartment = (row) => ({
  id: pick(row, "departmentId", "DepartmentId", "id", "Id"),
  name: String(pick(row, "departmentName", "DepartmentName", "name", "Name") || "").trim(),
  code: String(pick(row, "departmentCode", "DepartmentCode", "code", "Code") || "—").trim(),
  shortName: String(pick(row, "shortName", "ShortName") || "—").trim(),
  staffType: String(pick(row, "staffType", "StaffType") || "Both").trim(),
  status:
    pick(row, "isActive", "IsActive") === false ||
    String(pick(row, "status", "Status") || "").toLowerCase() === "inactive"
      ? "Inactive"
      : "Active",
});
const PAGE_SIZE = 6;
const UI_DEPARTMENTS_KEY = "pjc-ui-departments";
const readUiDepartments = () => {
  try {
    return JSON.parse(sessionStorage.getItem(UI_DEPARTMENTS_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeUiDepartments = (items) =>
  sessionStorage.setItem(UI_DEPARTMENTS_KEY, JSON.stringify(items));

function Pager({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <footer className="master-pager">
      <span>
        Showing {start} to {end} of {total} entries
      </span>
      <div>
        <button disabled={page === 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
        <strong>{page}</strong>
        <button disabled={page === pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </footer>
  );
}

function EmptyTable({ text, colSpan = 6 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="master-empty">
        {text}
      </td>
    </tr>
  );
}

function MasterCreateModal({ kind, staffType, onClose, onDepartmentSaved }) {
  const label = kind === "department" ? "Department" : "Designation";
  const [values, setValues] = useState({
    status: "Active",
    staffType: staffType === "Non-Teaching" ? "NonTeaching" : "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState(() => readUiDepartments());
  const [departmentOpen, setDepartmentOpen] = useState(false);
  // The active Teaching / Non-Teaching tab determines the staff type, so it is not editable here.
  const fields = formDefinitions[kind].filter(([name]) => name !== "staffType");
  useEffect(() => {
    if (kind !== "designation") return;
    apiClient
      .get(apiEndpoints.departments.getAll, {
        params: { PageNumber: 1, PageSize: 1000 },
        skipGlobalLoader: true,
      })
      .then((response) =>
        setDepartmentOptions(
          [...unwrapRows(response.data).map(normalizeDepartment), ...readUiDepartments()].filter(
            (item, index, items) =>
              item.name &&
              items.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index,
          ),
        ),
      )
      .catch(() => setDepartmentOptions(readUiDepartments()));
  }, [kind]);
  const matchingDepartments = departmentOptions.filter((department) =>
    department.name.toLowerCase().includes(String(values.departmentId || "").toLowerCase()),
  );
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) next[name] = `${fieldLabel} is required.`;
    });
    setErrors(next);
    if (Object.keys(next).length || kind !== "department") return;
    const saved = readUiDepartments();
    const name = String(values.departmentName).trim();
    if (saved.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setErrors({ departmentName: "This department already exists in this UI session." });
      return;
    }
    const item = {
      id: `ui-${Date.now()}`,
      name,
      staffType: values.staffType,
      status: values.status,
      code: "â€”",
      shortName: "â€”",
      uiOnly: true,
    };
    writeUiDepartments([...saved, item]);
    onDepartmentSaved(item);
    onClose();
  };
  return (
    <Modal title={`Add ${label}`} onClose={onClose} className="master-create-modal">
      <form className="master-form" onSubmit={submit} noValidate>
        <div className="master-form-grid">
          {fields.map(([name, fieldLabel, required, placeholder, type = "text", options = []]) => (
            <label key={name}>
              <span>{fieldLabel}{required ? <b> *</b> : null}</span>
              {type === "select" ? (
                <select value={values[name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}>
                  <option value="">{placeholder}</option>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : type === "department-search" ? (
                <div className="master-department-picker">
                  <input
                    value={values[name] ?? ""}
                    placeholder={placeholder}
                    autoComplete="off"
                    onFocus={() => setDepartmentOpen(true)}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [name]: e.target.value }));
                      setDepartmentOpen(true);
                    }}
                  />
                  {departmentOpen ? (
                    <div className="master-department-options" role="listbox">
                      {matchingDepartments.length ? (
                        matchingDepartments.map((department) => (
                          <button
                            type="button"
                            role="option"
                            key={department.id ?? department.name}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setValues((v) => ({ ...v, [name]: department.name }));
                              setDepartmentOpen(false);
                            }}
                          >
                            {department.name}
                          </button>
                        ))
                      ) : (
                        <span>No departments found.</span>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : <input value={values[name] ?? ""} placeholder={placeholder} onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))} />}
              {errors[name] ? <small>{errors[name]}</small> : null}
            </label>
          ))}
        </div>
        {kind === "designation" ? <p className="master-modal-note">Designation saving will be enabled when its backend API is available.</p> : null}
        <footer>
          <button type="button" className="cms-btn secondary" onClick={onClose}>Cancel</button>
          <button className="cms-btn primary" disabled={kind === "designation"}>Save {label}</button>
        </footer>
      </form>
    </Modal>
  );
}

export default function DepartmentManagementPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState(() => readUiDepartments());
  const [staffType, setStaffType] = useState("Teaching");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [designationQuery, setDesignationQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [createKind, setCreateKind] = useState(null);

  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.departments.getAll, {
        params: { PageNumber: 1, PageSize: 1000 },
        skipGlobalLoader: true,
      });
      const apiDepartments = unwrapRows(response.data)
        .map(normalizeDepartment)
        .filter((item) => item.name);
      const savedDepartments = readUiDepartments();
      setDepartments(
        [...apiDepartments, ...savedDepartments].filter(
          (item, index, items) =>
            items.findIndex(
              (candidate) => candidate.name.toLowerCase() === item.name.toLowerCase(),
            ) === index,
        ),
      );
      if (isManual) setToast("Departments data refreshed successfully.");
    } catch (error) {
      setDepartments(readUiDepartments());
      if (isManual) {
        setToast(
          getApiErrorMessage(
            error,
            "Backend departments could not be loaded. Showing departments saved in this UI session.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matchesStaffType = (item) => {
      const type = String(item.staffType || "Both")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
      return type === "both" || type === staffType.toLowerCase().replace(/-/g, "");
    };
    const staffTypeDepartments = departments.filter(matchesStaffType);
    return needle
      ? staffTypeDepartments.filter((item) =>
          [item.name, item.code, item.shortName].some((value) =>
            value.toLowerCase().includes(needle),
          ),
        )
      : staffTypeDepartments;
  }, [departments, query, staffType]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeDepartments = filtered.filter((item) => item.status === "Active").length;
  const pageActions = (
    <div className="master-page-actions master-summary-actions">
      <article>
        <Building2 />
        <span>
          Total Departments<strong>{filtered.length}</strong>
          <small>{activeDepartments} Active Departments</small>
        </span>
      </article>
      <article>
        <Users />
        <span>
          Total Designations<strong>—</strong>
          <small>Awaiting backend API</small>
        </span>
      </article>
      <button
        type="button"
        className="cms-btn cms-btn-ghost"
        disabled={loading}
        onClick={() => load(true)}
      >
        <RefreshCw className={loading ? "is-spinning" : ""} /> Refresh
      </button>
    </div>
  );
  return (
    <DashboardLayout
      title="Department Management"
      subtitle="Manage departments and designations used across the staff management system."
      breadcrumb={["Administration"]}
    >
      <main className="master-page">
        <div className="master-filter-row">
          <div className="master-staff-tabs" role="tablist" aria-label="Staff type">
            {["Teaching", "Non-Teaching"].map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={staffType === type}
                className={staffType === type ? "is-active" : ""}
                onClick={() => {
                  setStaffType(type);
                  setPage(1);
                }}
              >
                {type} Staff
              </button>
            ))}
          </div>
          {pageActions}
        </div>
        <section className="master-grid">
          <article className="master-card">
            <header>
              <div>
                <h2>Departments</h2>
                <p>Add, edit and manage {staffType.toLowerCase()} departments.</p>
              </div>
              <div className="master-actions">
                <button
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/departments/import")}
                >
                  <FileSpreadsheet /> Import Excel
                </button>
                <button
                  className="cms-btn primary"
                  onClick={() => setCreateKind("department")}
                >
                  <Plus /> Add Department
                </button>
              </div>
            </header>
            <label className="master-search">
              <Search />
              <span className="sr-only">Search departments</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search departments..."
              />
            </label>
            <div className="master-table-wrap">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <EmptyTable colSpan={3} text="Loading departments..." />
                  ) : visible.length ? (
                    visible.map((item) => (
                      <tr key={item.id ?? item.name}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.staffType}</small>
                        </td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>
                          <div className="master-row-actions">
                            <button
                              className="master-icon-button"
                              aria-label={`View ${item.name}`}
                              disabled={!item.id}
                              onClick={() => navigate(`/dashboard/departments/${item.id}/view`)}
                            >
                              <Eye />
                            </button>
                            <button
                              className="master-icon-button is-delete"
                              aria-label={`Delete ${item.name}`}
                              disabled={!item.id}
                              onClick={() => setPendingDelete(item)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTable
                      colSpan={3}
                      text={
                        query
                          ? "No departments match your search."
                          : "No departments have been added yet."
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={filtered.length} onChange={setPage} />
          </article>
          <article className="master-card is-unavailable">
            <header>
              <div>
                <h2>Designations</h2>
                <p>Add, edit and manage {staffType.toLowerCase()} designations.</p>
              </div>
              <div className="master-actions">
                <button
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/designations/import")}
                >
                  <FileSpreadsheet /> Import Excel
                </button>
                <button
                  className="cms-btn primary"
                  onClick={() => setCreateKind("designation")}
                >
                  <Plus /> Add Designation
                </button>
              </div>
            </header>
            <label className="master-search">
              <Search />
              <span className="sr-only">Search designations</span>
              <input
                value={designationQuery}
                onChange={(event) => setDesignationQuery(event.target.value)}
                placeholder="Search designations..."
              />
            </label>
            <div className="master-table-wrap">
              <table className="designation-table">
                <thead>
                  <tr>
                    <th>Designation Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <EmptyTable
                    colSpan={3}
                    text={
                      designationQuery
                        ? "No designations match your search."
                        : "No designation API is available yet."
                    }
                  />
                </tbody>
              </table>
            </div>
            <Pager page={1} total={0} onChange={() => {}} />
          </article>
        </section>
        <aside className="master-note">
          <Info />
          <span>
            Departments and Designations added here will be available in the Staff Management module
            for assigning during staff creation or update.
          </span>
        </aside>
      </main>
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete department?"
          message={
            pendingDelete.uiOnly
              ? `${pendingDelete.name} will be removed from this UI session.`
              : `${pendingDelete.name} cannot be deleted until the backend provides a confirmed delete or deactivate operation.`
          }
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete.uiOnly) {
              const next = readUiDepartments().filter((item) => item.id !== pendingDelete.id);
              writeUiDepartments(next);
              setDepartments((current) => current.filter((item) => item.id !== pendingDelete.id));
            } else
              setToast(
                "Department deletion is not available until the backend contract is published.",
              );
            setPendingDelete(null);
          }}
        />
      ) : null}
      {createKind ? (
        <MasterCreateModal
          kind={createKind}
          staffType={staffType}
          onClose={() => setCreateKind(null)}
          onDepartmentSaved={(item) => setDepartments((current) => [...current, item])}
        />
      ) : null}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </DashboardLayout>
  );
}

export function DepartmentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiClient
      .get(apiEndpoints.departments.getAll, {
        params: { PageNumber: 1, PageSize: 1000 },
        skipGlobalLoader: true,
      })
      .then((response) => {
        if (!active) return;
        const match = [
          ...unwrapRows(response.data).map(normalizeDepartment),
          ...readUiDepartments(),
        ].find((item) => String(item.id) === String(id));
        setDepartment(match || null);
        if (!match) setError("Department details were not found.");
      })
      .catch((requestError) => {
        if (!active) return;
        const savedMatch = readUiDepartments().find((item) => String(item.id) === String(id));
        if (savedMatch) setDepartment(savedMatch);
        else setError(getApiErrorMessage(requestError, "Department details could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <DashboardLayout
      title="Department Details"
      subtitle="View department master information."
      breadcrumb={["Administration", "Department Management"]}
      actions={
        department ? (
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate(`/dashboard/departments/${department.id}/edit`)}
          >
            <Pencil /> Edit Department
          </button>
        ) : null
      }
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section className="master-details-card">
          <header>
            <Building2 />
            <div>
              <h1>{department?.name || "Department Details"}</h1>
              <p>Department master record</p>
            </div>
          </header>
          {loading ? (
            <p className="master-details-state">Loading department details...</p>
          ) : error ? (
            <p className="master-details-state">{error}</p>
          ) : (
            <dl>
              <div>
                <dt>Department Name</dt>
                <dd>{department.name}</dd>
              </div>
              <div>
                <dt>Staff Type Applicability</dt>
                <dd>{department.staffType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={department.status} />
                </dd>
              </div>
            </dl>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}

export function DesignationDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const designation = location.state?.designation || null;
  return (
    <DashboardLayout
      title="Designation Details"
      subtitle="View designation master information."
      breadcrumb={["Administration", "Department Management"]}
      actions={
        designation ? (
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate(`/dashboard/designations/${id}/edit`)}
          >
            <Pencil /> Edit Designation
          </button>
        ) : null
      }
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section className="master-details-card">
          <header>
            <Users />
            <div>
              <h1>{designation?.name || "Designation Details"}</h1>
              <p>Designation master record</p>
            </div>
          </header>
          {designation ? (
            <dl>
              <div>
                <dt>Designation Name</dt>
                <dd>{designation.name}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={designation.status} />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="master-details-state">
              Designation details cannot be loaded until the backend provides a Designation API.
            </p>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}

const formDefinitions = {
  department: [
    ["departmentName", "Department Name", true, "Enter department name"],
    [
      "staffType",
      "Staff Type Applicability",
      true,
      "Select staff type",
      "select",
      ["Teaching", "NonTeaching", "Both"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
  designation: [
    ["designationName", "Designation Name", true, "Enter designation name"],
    ["departmentId", "Department", true, "Search department", "department-search", []],
    [
      "staffType",
      "Staff Type",
      true,
      "Select staff type",
      "select",
      ["Teaching", "NonTeaching", "Both"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
};

export function MasterFormPage({ kind }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const edit = Boolean(id);
  const label = kind === "department" ? "Department" : "Designation";
  const [values, setValues] = useState({ status: "Active", staffType: "Both" });
  const [errors, setErrors] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState(() => readUiDepartments());
  const fields = formDefinitions[kind];
  useEffect(() => {
    if (kind !== "designation") return;
    let active = true;
    apiClient
      .get(apiEndpoints.departments.getAll, {
        params: { PageNumber: 1, PageSize: 1000 },
        skipGlobalLoader: true,
      })
      .then((response) => {
        if (!active) return;
        const apiDepartments = unwrapRows(response.data)
          .map(normalizeDepartment)
          .filter((item) => item.name && item.status === "Active");
        const combined = [...apiDepartments, ...readUiDepartments()].filter(
          (item, index, items) =>
            items.findIndex(
              (candidate) => candidate.name.toLowerCase() === item.name.toLowerCase(),
            ) === index,
        );
        setDepartmentOptions(combined);
      })
      .catch(() => {
        if (active) setDepartmentOptions(readUiDepartments());
      });
    return () => {
      active = false;
    };
  }, [kind]);
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) next[name] = `${fieldLabel} is required.`;
    });
    if (
      kind === "designation" &&
      values.departmentId &&
      !departmentOptions.some(
        (item) => item.name.toLowerCase() === String(values.departmentId).trim().toLowerCase(),
      )
    )
      next.departmentId = "Select a saved department from the list.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (kind === "department") {
      const saved = readUiDepartments();
      const name = String(values.departmentName).trim();
      if (saved.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        setErrors({ departmentName: "This department already exists in this UI session." });
        return;
      }
      writeUiDepartments([
        ...saved,
        {
          id: `ui-${Date.now()}`,
          name,
          staffType: values.staffType,
          status: values.status,
          code: "—",
          shortName: "—",
          uiOnly: true,
        },
      ]);
      navigate("/dashboard/departments");
    }
  };
  return (
    <DashboardLayout
      title={`${edit ? "Edit" : "Add"} ${label}`}
      subtitle={`${edit ? "Update" : "Create"} ${label.toLowerCase()} master details.`}
      breadcrumb={["Administration", "Department Management"]}
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <form className="master-form" onSubmit={submit} noValidate>
          <header>
            <Building2 />
            <div>
              <h1>
                {edit ? "Edit" : "Add"} {label}
              </h1>
              <p>
                {edit ? "Review and update" : "Create a new"} {label.toLowerCase()} for your
                institution.
              </p>
            </div>
          </header>
          <div className="master-form-grid">
            {fields.map(
              ([name, fieldLabel, required, placeholder, type = "text", options = []]) => (
                <label key={name} className={type === "textarea" ? "is-wide" : ""}>
                  <span>
                    {fieldLabel}
                    {required ? <b> *</b> : null}
                  </span>
                  {type === "select" ? (
                    <select
                      value={values[name] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    >
                      <option value="">{placeholder}</option>
                      {options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : type === "department-search" ? (
                    <>
                      <span className="master-department-search">
                        <Search aria-hidden="true" />
                        <input
                          type="search"
                          list="designation-departments"
                          value={values[name] ?? ""}
                          placeholder={placeholder}
                          autoComplete="off"
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        />
                      </span>
                      <datalist id="designation-departments">
                        {departmentOptions.map((department) => (
                          <option key={department.id ?? department.name} value={department.name} />
                        ))}
                      </datalist>
                    </>
                  ) : type === "textarea" ? (
                    <textarea
                      value={values[name] ?? ""}
                      placeholder={placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={type}
                      min={type === "number" ? 0 : undefined}
                      value={values[name] ?? ""}
                      placeholder={placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    />
                  )}{" "}
                  {errors[name] ? <small>{errors[name]}</small> : null}
                </label>
              ),
            )}
          </div>
          <aside className="master-contract-note">
            <Info />{" "}
            {kind === "department"
              ? "Departments saved in this UI phase are available immediately in Add Designation for this browser session."
              : "Search and select a Department saved in Department Management."}
          </aside>
          <footer>
            <button
              type="button"
              className="cms-btn secondary"
              onClick={() => navigate("/dashboard/departments")}
            >
              Cancel
            </button>
            <button className="cms-btn primary" disabled={kind === "designation"}>
              Save {label}
            </button>
          </footer>
        </form>
      </main>
    </DashboardLayout>
  );
}

const importColumns = {
  department: [
    "Department Name",
    "Department Code",
    "Short Name",
    "Description",
    "Category",
    "HOD Employee ID",
    "Staff Type",
    "Status",
    "Display Order",
  ],
  designation: [
    "Designation Name",
    "Designation Code",
    "Department Code",
    "Staff Type",
    "Designation Level",
    "Reports To Designation Code",
    "Maximum Weekly Hours",
    "Description",
    "Status",
    "Display Order",
  ],
};
export function MasterImportPage({ kind }) {
  const navigate = useNavigate();
  const label = kind === "department" ? "Departments" : "Designations";
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const download = () => {
    const sheet = XLSX.utils.aoa_to_sheet([importColumns[kind]]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, label);
    XLSX.writeFile(book, `${kind}-import-template.xlsx`);
  };
  const parse = async (file) => {
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const book = XLSX.read(data);
      const json = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
      const required = importColumns[kind].slice(0, kind === "department" ? 2 : 4);
      const codes = new Set();
      setRows(
        json.map((row, index) => {
          const problems = required
            .filter((column) => !String(row[column]).trim())
            .map((column) => `Missing ${column}`);
          const codeKey = kind === "department" ? "Department Code" : "Designation Code";
          const code = String(row[codeKey]).trim().toUpperCase();
          if (code && codes.has(code)) problems.push(`Duplicate ${codeKey}`);
          codes.add(code);
          if (row.Status && !["Active", "Inactive"].includes(String(row.Status)))
            problems.push("Invalid Status");
          if (
            row["Staff Type"] &&
            !["Teaching", "NonTeaching", "Both"].includes(String(row["Staff Type"]))
          )
            problems.push("Invalid Staff Type");
          return { index: index + 2, row, problems };
        }),
      );
    } finally {
      setParsing(false);
    }
  };
  const valid = rows.filter((row) => !row.problems.length).length;
  const duplicates = rows.filter((row) =>
    row.problems.some((problem) => problem.startsWith("Duplicate")),
  ).length;
  return (
    <DashboardLayout
      title={`Import ${label}`}
      subtitle={`Validate ${label.toLowerCase()} before importing.`}
      breadcrumb={["Administration", "Department Management"]}
    >
      <main className="master-import">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section>
          <header>
            <div>
              <h1>Import {label}</h1>
              <p>Upload XLSX or XLS and review every row before import.</p>
            </div>
            <button className="cms-btn secondary" onClick={download}>
              <Download /> Download Template
            </button>
          </header>
          <label className="master-drop">
            <Upload />
            <strong>
              {parsing ? "Parsing file..." : fileName || `Choose ${label} Excel file`}
            </strong>
            <span>Accepted formats: .xlsx, .xls</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={parsing}
              onChange={(event) => parse(event.target.files?.[0])}
            />
          </label>
          {rows.length ? (
            <>
              <div className="import-summary">
                <article>
                  Total Rows<strong>{rows.length}</strong>
                </article>
                <article>
                  Valid Rows<strong>{valid}</strong>
                </article>
                <article>
                  Invalid Rows<strong>{rows.length - valid}</strong>
                </article>
                <article>
                  Duplicates<strong>{duplicates}</strong>
                </article>
              </div>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Data</th>
                      <th>Validation Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.index}>
                        <td>{item.index}</td>
                        <td>{Object.values(item.row).filter(Boolean).join(" · ") || "—"}</td>
                        <td>
                          <StatusBadge value={item.problems.length ? "Invalid" : "Valid"} />
                        </td>
                        <td>{item.problems.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <aside className="master-contract-note">
                <Info /> Preview is complete. Import remains disabled until the backend publishes a
                bulk-upload contract.
              </aside>
              <footer>
                <button className="cms-btn primary" disabled>
                  Import {label}
                </button>
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </DashboardLayout>
  );
}
