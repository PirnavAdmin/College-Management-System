import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Helper: Check if staff type matches current tab (supports Teaching, Non-Teaching, Both, All)
export const isStaffTypeMatch = (itemStaffType, currentTab) => {
  if (!itemStaffType) return true;
  const normItem = String(itemStaffType).trim().toLowerCase().replace(/[-_\s]/g, "");
  const normTab = String(currentTab).trim().toLowerCase().replace(/[-_\s]/g, "");
  if (normItem === "both" || normItem === "all") return true;
  return normItem === normTab;
};

// Helper: Convert UI staffType label to backend API expected string
export const toApiStaffType = (uiValue) => {
  if (!uiValue || uiValue === "Both" || uiValue === "All") return "";
  if (uiValue === "Non-Teaching" || uiValue === "NonTeaching") return "NonTeaching";
  if (uiValue === "Teaching") return "Teaching";
  return uiValue;
};

const unwrapRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "results", "Results", "$values", "value", "Value"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const pick = (row, ...keys) =>
  keys
    .map((key) => row?.[key])
    .find((value) => value !== undefined && value !== null && value !== "");

export const normalizeDepartment = (row) => ({
  id: pick(row, "departmentId", "DepartmentId", "id", "Id"),
  departmentId: pick(row, "departmentId", "DepartmentId", "id", "Id"),
  name: String(pick(row, "departmentName", "DepartmentName", "name", "Name") || "").trim(),
  departmentName: String(pick(row, "departmentName", "DepartmentName", "name", "Name") || "").trim(),
  code: String(pick(row, "departmentCode", "DepartmentCode", "code", "Code") || "—").trim(),
  departmentCode: String(pick(row, "departmentCode", "DepartmentCode", "code", "Code") || "—").trim(),
  staffType: String(pick(row, "staffType", "StaffType") || "Teaching").trim(),
  description: String(pick(row, "description", "Description") || "—").trim(),
  isActive: Boolean(pick(row, "isActive", "IsActive") ?? true),
  status:
    pick(row, "isActive", "IsActive") === false ||
    String(pick(row, "status", "Status") || "").toLowerCase() === "inactive"
      ? "Inactive"
      : "Active",
  createdAt: pick(row, "createdAt", "CreatedAt") || null,
  updatedAt: pick(row, "updatedAt", "UpdatedAt") || null,
});

export const normalizeDesignation = (row) => {
  const idVal = pick(row, "id", "Id", "designationId", "DesignationId");
  return {
    id: idVal,
    designationId: idVal,
    name: String(pick(row, "designationName", "DesignationName", "name", "Name") || "").trim(),
    designationName: String(pick(row, "designationName", "DesignationName", "name", "Name") || "").trim(),
    code: String(pick(row, "designationCode", "DesignationCode", "code", "Code") || "—").trim(),
    designationCode: String(pick(row, "designationCode", "DesignationCode", "code", "Code") || "—").trim(),
    staffType: String(pick(row, "staffType", "StaffType") || "Teaching").trim(),
    isActive: Boolean(pick(row, "isActive", "IsActive") ?? true),
    status:
      pick(row, "isActive", "IsActive") === false ||
      String(pick(row, "status", "Status") || "").toLowerCase() === "inactive"
        ? "Inactive"
        : "Active",
    createdAt: pick(row, "createdAt", "CreatedAt") || null,
    updatedAt: pick(row, "updatedAt", "UpdatedAt") || null,
  };
};

const PAGE_SIZE = 6;

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
        <button disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </footer>
  );
}

function EmptyTable({ text, colSpan = 3 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="master-empty">
        {text}
      </td>
    </tr>
  );
}

const formDefinitions = {
  department: [
    ["departmentName", "Department Name", true, "Enter department name"],
    [
      "staffType",
      "Staff Type",
      true,
      "Select staff type",
      "select",
      ["Teaching", "Non-Teaching", "Both"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
  designation: [
    ["designationName", "Designation Name", true, "Enter designation name"],
    [
      "staffType",
      "Staff Type",
      true,
      "Select staff type",
      "select",
      ["Teaching", "Non-Teaching"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
};

function MasterCreateModal({ kind, staffType, onClose, onSaved }) {
  const label = kind === "department" ? "Department" : "Designation";
  const [values, setValues] = useState({
    departmentName: "",
    departmentCode: "",
    designationName: "",
    description: "",
    status: "Active",
    staffType: staffType === "Non-Teaching" ? "Non-Teaching" : "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fields = formDefinitions[kind];

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) {
        nextErrors[name] = `${fieldLabel} is required.`;
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (kind === "department") {
        const deptCode = values.departmentCode?.trim() || values.departmentName.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 10);
        const payload = {
          departmentId: 0,
          departmentName: values.departmentName.trim(),
          departmentCode: deptCode,
          staffType: toApiStaffType(values.staffType || staffType),
          description: values.description ? values.description.trim() : "",
          isActive: values.status === "Active",
        };
        const response = await apiClient.post(apiEndpoints.departments.create, payload);
        const created = normalizeDepartment(response.data);
        onSaved("Department created successfully.", created);
      } else {
        const payload = {
          name: values.designationName.trim(),
          staffType: toApiStaffType(values.staffType),
          isActive: values.status === "Active",
        };
        const response = await apiClient.post(apiEndpoints.designations.create, payload);
        const created = normalizeDesignation(response.data);
        onSaved("Designation created successfully.", created);
      }
      onClose();
    } catch (error) {
      const errMsg = getApiErrorMessage(
        error,
        `Unable to create ${label.toLowerCase()}. Please verify details.`
      );
      setErrors({ apiError: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Add ${label}`} onClose={onClose} className="master-create-modal">
      <form className="master-form" onSubmit={submit} noValidate>
        {errors.apiError && (
          <div className="master-form-error-alert">
            <Info /> <span>{errors.apiError}</span>
          </div>
        )}
        <div className="master-form-grid">
          {fields.map(([name, fieldLabel, required, placeholder, type = "text", options = []]) => (
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
              ) : type === "textarea" ? (
                <textarea
                  value={values[name] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                />
              ) : (
                <input
                  type={type}
                  value={values[name] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                />
              )}
              {errors[name] ? <small>{errors[name]}</small> : null}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" className="cms-btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="cms-btn primary" disabled={submitting}>
            {submitting ? "Saving..." : `Save ${label}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function DepartmentManagementPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [staffType, setStaffType] = useState("Teaching");
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [designationsLoading, setDesignationsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [designationQuery, setDesignationQuery] = useState("");
  const [deptPage, setDeptPage] = useState(1);
  const [desigPage, setDesigPage] = useState(1);
  const [toast, setToast] = useState("");
  const [pendingDeleteDept, setPendingDeleteDept] = useState(null);
  const [pendingDeleteDesig, setPendingDeleteDesig] = useState(null);
  const [createKind, setCreateKind] = useState(null);
  const [deletingDesig, setDeletingDesig] = useState(false);

  const requestSeqRef = useRef(0);

  const fetchMasterData = useCallback(async (isManual = false) => {
    const currentSeq = ++requestSeqRef.current;
    if (isManual) {
      setIsRefreshing(true);
    }
    setDepartmentsLoading(true);
    setDesignationsLoading(true);

    let deptSuccess = false;
    let desigSuccess = false;

    try {
      // 1. Fetch Departments (GET /api/v1/departments)
      const deptRes = await apiClient.get(apiEndpoints.departments.getAll, {
        skipGlobalLoader: true,
      });
      if (requestSeqRef.current === currentSeq) {
        const rows = unwrapRows(deptRes.data).map(normalizeDepartment).filter((d) => d.name);
        setDepartments(rows);
        deptSuccess = true;
      }
    } catch (err) {
      console.warn("Failed to load departments:", err);
    } finally {
      if (requestSeqRef.current === currentSeq) setDepartmentsLoading(false);
    }

    try {
      // 2. Fetch Designations (GET /api/v1/designations?includeInactive=true)
      const desigRes = await apiClient.get(apiEndpoints.designations.getAll, {
        params: { includeInactive: true },
        skipGlobalLoader: true,
      });
      if (requestSeqRef.current === currentSeq) {
        const rows = unwrapRows(desigRes.data).map(normalizeDesignation).filter((d) => d.name);
        setDesignations(rows);
        desigSuccess = true;
      }
    } catch (err) {
      console.warn("Failed to load designations:", err);
    } finally {
      if (requestSeqRef.current === currentSeq) {
        setDesignationsLoading(false);
        setIsRefreshing(false);
      }
    }

    if (isManual && requestSeqRef.current === currentSeq) {
      setToast("Department and Designation data refreshed successfully.");
    }
  }, []);

  // Fetch initial data once on mount; admin can manually refresh on demand
  useEffect(() => {
    fetchMasterData(false);
  }, [fetchMasterData]);

  // Department Client-side Filtering
  const filteredDepartments = useMemo(() => {
    const byStaff = departments.filter((item) => isStaffTypeMatch(item.staffType, staffType));
    const q = deptQuery.trim().toLowerCase();
    if (!q) return byStaff;
    return byStaff.filter((item) =>
      [item.name, item.code, item.description, item.staffType].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [departments, staffType, deptQuery]);

  const visibleDepartments = useMemo(() => {
    return filteredDepartments.slice((deptPage - 1) * PAGE_SIZE, deptPage * PAGE_SIZE);
  }, [filteredDepartments, deptPage]);

  const activeDepartmentsCount = useMemo(() => {
    return filteredDepartments.filter((d) => d.status === "Active").length;
  }, [filteredDepartments]);

  // Designation Client-side Filtering
  const filteredDesignations = useMemo(() => {
    const byStaff = designations.filter((item) => isStaffTypeMatch(item.staffType, staffType));
    const q = designationQuery.trim().toLowerCase();
    if (!q) return byStaff;
    return byStaff.filter((item) =>
      [item.name, item.code, item.staffType].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [designations, staffType, designationQuery]);

  const visibleDesignations = useMemo(() => {
    return filteredDesignations.slice((desigPage - 1) * PAGE_SIZE, desigPage * PAGE_SIZE);
  }, [filteredDesignations, desigPage]);

  const activeDesignationsCount = useMemo(() => {
    return filteredDesignations.filter((d) => d.status === "Active").length;
  }, [filteredDesignations]);

  // Delete Designation Handler (DELETE /api/v1/designations/{id})
  const handleDeleteDesignation = async () => {
    if (!pendingDeleteDesig?.id) return;
    setDeletingDesig(true);
    try {
      await apiClient.delete(apiEndpoints.designations.delete(pendingDeleteDesig.id));
      setToast(`Designation "${pendingDeleteDesig.name}" deleted successfully.`);
      setDesignations((prev) => prev.filter((d) => d.id !== pendingDeleteDesig.id));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setToast("Designation was not found on the server.");
        setDesignations((prev) => prev.filter((d) => d.id !== pendingDeleteDesig.id));
      } else {
        const msg = getApiErrorMessage(
          error,
          "This designation cannot be deleted because it is currently assigned to staff."
        );
        setToast(msg);
      }
    } finally {
      setDeletingDesig(false);
      setPendingDeleteDesig(null);
    }
  };

  const pageActions = (
    <div className="master-page-actions master-summary-actions">
      <article>
        <Building2 />
        <span>
          Total Departments<strong>{filteredDepartments.length}</strong>
          <small>{activeDepartmentsCount} Active Departments</small>
        </span>
      </article>
      <article>
        <Users />
        <span>
          Total Designations<strong>{filteredDesignations.length}</strong>
          <small>{activeDesignationsCount} Active Designations</small>
        </span>
      </article>
      <button
        type="button"
        className="cms-btn cms-btn-ghost master-refresh-btn"
        onClick={() => fetchMasterData(true)}
        title="Click to refresh department and designation data"
        aria-label="Refresh department and designation data"
      >
        <RefreshCw className={isRefreshing || departmentsLoading || designationsLoading ? "is-spinning" : ""} />
        <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
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
                  setDeptPage(1);
                  setDesigPage(1);
                }}
              >
                {type} Staff
              </button>
            ))}
          </div>
          {pageActions}
        </div>

        <section className="master-grid">
          {/* DEPARTMENTS CARD */}
          <article className="master-card">
            <header>
              <div>
                <h2>Departments</h2>
                <p>Add and view {staffType.toLowerCase()} departments.</p>
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
                value={deptQuery}
                onChange={(event) => {
                  setDeptQuery(event.target.value);
                  setDeptPage(1);
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
                  {departmentsLoading ? (
                    <EmptyTable colSpan={3} text="Loading departments..." />
                  ) : visibleDepartments.length > 0 ? (
                    visibleDepartments.map((item) => (
                      <tr key={item.id || item.name}>
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
                              onClick={() => navigate(`/dashboard/departments/${item.id}/view`)}
                            >
                              <Eye />
                            </button>
                            <button
                              className="master-icon-button"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => navigate(`/dashboard/departments/${item.id}/edit`)}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="master-icon-button is-delete"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setPendingDeleteDept(item)}
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
                        deptQuery
                          ? "No departments match your search."
                          : "No departments have been added for this staff type yet."
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={deptPage} total={filteredDepartments.length} onChange={setDeptPage} />
          </article>

          {/* DESIGNATIONS CARD */}
          <article className="master-card">
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
                onChange={(event) => {
                  setDesignationQuery(event.target.value);
                  setDesigPage(1);
                }}
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
                  {designationsLoading ? (
                    <EmptyTable colSpan={3} text="Loading designations..." />
                  ) : visibleDesignations.length > 0 ? (
                    visibleDesignations.map((item) => (
                      <tr key={item.id || item.name}>
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
                              onClick={() => navigate(`/dashboard/designations/${item.id}/view`, { state: { designation: item } })}
                            >
                              <Eye />
                            </button>
                            <button
                              className="master-icon-button"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => navigate(`/dashboard/designations/${item.id}/edit`)}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="master-icon-button is-delete"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setPendingDeleteDesig(item)}
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
                        designationQuery
                          ? "No designations match your search."
                          : "No designations have been added for this staff type yet."
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={desigPage} total={filteredDesignations.length} onChange={setDesigPage} />
          </article>
        </section>

        <aside className="master-note">
          <Info />
          <span>
            Departments and Designations created here are retrieved live from the backend server API
            and available across the Staff Management module.
          </span>
        </aside>
      </main>

      {/* DEPARTMENT DELETE NOTICE DIALOG (No Backend Delete API) */}
      {pendingDeleteDept ? (
        <ConfirmDialog
          title="Delete department?"
          message={`Department deletion is not available because the backend DELETE endpoint has not been provided.`}
          confirmLabel="OK"
          onCancel={() => setPendingDeleteDept(null)}
          onConfirm={() => setPendingDeleteDept(null)}
        />
      ) : null}

      {/* DESIGNATION DELETE CONFIRM DIALOG (DELETE /api/v1/designations/{id}) */}
      {pendingDeleteDesig ? (
        <ConfirmDialog
          title="Delete designation?"
          message={`Are you sure you want to delete designation "${pendingDeleteDesig.name}"? This action cannot be undone.`}
          confirmLabel={deletingDesig ? "Deleting..." : "Delete"}
          onCancel={() => setPendingDeleteDesig(null)}
          onConfirm={handleDeleteDesignation}
        />
      ) : null}

      {/* CREATE MODAL */}
      {createKind ? (
        <MasterCreateModal
          kind={createKind}
          staffType={staffType}
          onClose={() => setCreateKind(null)}
          onSaved={(msg, newItem) => {
            setToast(msg);
            if (newItem) {
              if (createKind === "department") {
                setDepartments((prev) => [newItem, ...prev]);
              } else {
                setDesignations((prev) => [newItem, ...prev]);
              }
            }
          }}
        />
      ) : null}

      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// DEPARTMENT DETAILS PAGE
// ----------------------------------------------------------------------
export function DepartmentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient
      .get(apiEndpoints.departments.getAll, { skipGlobalLoader: true })
      .then((response) => {
        if (!active) return;
        const list = unwrapRows(response.data).map(normalizeDepartment);
        const match = list.find((item) => String(item.id) === String(id));
        if (match) {
          setDepartment(match);
        } else {
          setError("Department details were not found.");
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError, "Department details could not be loaded."));
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

// ----------------------------------------------------------------------
// DESIGNATION DETAILS PAGE (GET /api/v1/designations/{id})
// ----------------------------------------------------------------------
export function DesignationDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [designation, setDesignation] = useState(location.state?.designation || null);
  const [loading, setLoading] = useState(!designation);
  const [error, setError] = useState("");

  useEffect(() => {
    if (designation) return;
    let active = true;
    setLoading(true);
    apiClient
      .get(apiEndpoints.designations.getById(id), { skipGlobalLoader: true })
      .then((response) => {
        if (!active) return;
        setDesignation(normalizeDesignation(response.data));
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err, "Designation details could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, designation]);

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
          {loading ? (
            <p className="master-details-state">Loading designation details...</p>
          ) : error ? (
            <p className="master-details-state">{error}</p>
          ) : designation ? (
            <dl>
              <div>
                <dt>Designation Name</dt>
                <dd>{designation.name}</dd>
              </div>
              <div>
                <dt>Designation Code</dt>
                <dd><code>{designation.code}</code></dd>
              </div>
              <div>
                <dt>Staff Type</dt>
                <dd>{designation.staffType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={designation.status} />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="master-details-state">Designation details could not be found.</p>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// MASTER FORM PAGE (ADD/EDIT DEPARTMENT & DESIGNATION)
// ----------------------------------------------------------------------
export function MasterFormPage({ kind }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const edit = Boolean(id);
  const label = kind === "department" ? "Department" : "Designation";

  const [values, setValues] = useState({
    departmentName: "",
    departmentCode: "",
    designationName: "",
    description: "",
    status: "Active",
    staffType: "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(edit);
  const [submitting, setSubmitting] = useState(false);
  const [apiNotice, setApiNotice] = useState("");

  const fields = formDefinitions[kind];

  useEffect(() => {
    if (!edit) return;
    let active = true;
    setLoading(true);

    if (kind === "department") {
      setApiNotice("Department update API is not available in the current backend contract.");
      apiClient
        .get(apiEndpoints.departments.getAll, { skipGlobalLoader: true })
        .then((res) => {
          if (!active) return;
          const match = unwrapRows(res.data).map(normalizeDepartment).find((d) => String(d.id) === String(id));
          if (match) {
            setValues({
              departmentName: match.name,
              departmentCode: match.code,
              description: match.description !== "—" ? match.description : "",
              status: match.status,
              staffType: match.staffType === "NonTeaching" ? "Non-Teaching" : "Teaching",
            });
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      // Edit Designation: GET /api/v1/designations/{id}
      apiClient
        .get(apiEndpoints.designations.getById(id), { skipGlobalLoader: true })
        .then((res) => {
          if (!active) return;
          const match = normalizeDesignation(res.data);
          setValues({
            designationName: match.name,
            status: match.status,
            staffType: match.staffType === "NonTeaching" ? "Non-Teaching" : "Teaching",
          });
        })
        .catch((err) => {
          if (!active) return;
          setErrors({ apiError: getApiErrorMessage(err, "Failed to load designation details.") });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [edit, id, kind]);

  const submit = async (event) => {
    event.preventDefault();

    if (kind === "department" && edit) {
      setErrors({ apiError: "Department update API is not supported by the backend." });
      return;
    }

    const nextErrors = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) {
        nextErrors[name] = `${fieldLabel} is required.`;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (kind === "department") {
        const deptCode = values.departmentCode?.trim() || values.departmentName.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 10);
        const payload = {
          departmentId: 0,
          departmentName: values.departmentName.trim(),
          departmentCode: deptCode,
          staffType: toApiStaffType(values.staffType || "Teaching"),
          description: values.description ? values.description.trim() : "",
          isActive: values.status === "Active",
        };
        await apiClient.post(apiEndpoints.departments.create, payload);
        navigate("/dashboard/departments");
      } else {
        const payload = {
          name: values.designationName.trim(),
          staffType: toApiStaffType(values.staffType),
          isActive: values.status === "Active",
        };
        if (edit) {
          await apiClient.put(apiEndpoints.designations.update(id), payload);
        } else {
          await apiClient.post(apiEndpoints.designations.create, payload);
        }
        navigate("/dashboard/departments");
      }
    } catch (error) {
      setErrors({
        apiError: getApiErrorMessage(
          error,
          `Unable to ${edit ? "update" : "create"} ${label.toLowerCase()}.`
        ),
      });
    } finally {
      setSubmitting(false);
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
        {loading ? (
          <p className="master-details-state">Loading form details...</p>
        ) : (
          <form className="master-form" onSubmit={submit} noValidate>
            <header>
              <Building2 />
              <div>
                <h1>
                  {edit ? "Edit" : "Add"} {label}
                </h1>
                <p>
                  {edit ? "Review and update" : "Create a new"} {label.toLowerCase()} for your institution.
                </p>
              </div>
            </header>

            {apiNotice && (
              <div className="master-contract-note" style={{ marginBottom: 16 }}>
                <Info /> <span>{apiNotice}</span>
              </div>
            )}

            {errors.apiError && (
              <div className="master-form-error-alert" style={{ marginBottom: 16, color: "#dc2626" }}>
                <Info /> <span>{errors.apiError}</span>
              </div>
            )}

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
                        disabled={kind === "department" && edit}
                        value={values[name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      >
                        <option value="">{placeholder}</option>
                        {options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : type === "textarea" ? (
                      <textarea
                        readOnly={kind === "department" && edit}
                        value={values[name] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      />
                    ) : (
                      <input
                        type={type}
                        readOnly={kind === "department" && edit}
                        value={values[name] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      />
                    )}
                    {errors[name] ? <small>{errors[name]}</small> : null}
                  </label>
                )
              )}
            </div>

            <footer>
              <button
                type="button"
                className="cms-btn secondary"
                onClick={() => navigate("/dashboard/departments")}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cms-btn primary"
                disabled={submitting || (kind === "department" && edit)}
              >
                {submitting ? "Saving..." : `Save ${label}`}
              </button>
            </footer>
          </form>
        )}
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// EXCEL IMPORT PAGE (VALIDATION PREVIEW ONLY, NO BACKEND BULK UPLOAD API)
// ----------------------------------------------------------------------
const importColumns = {
  department: [
    "Department Name",
    "Department Code",
    "Staff Type",
    "Description",
    "Status",
  ],
  designation: [
    "Designation Name",
    "Staff Type",
    "Status",
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
      const required = importColumns[kind].slice(0, 1);
      const names = new Set();
      setRows(
        json.map((row, index) => {
          const problems = required
            .filter((column) => !String(row[column]).trim())
            .map((column) => `Missing ${column}`);
          const nameKey = kind === "department" ? "Department Name" : "Designation Name";
          const nameVal = String(row[nameKey]).trim().toLowerCase();
          if (nameVal && names.has(nameVal)) problems.push(`Duplicate ${nameKey}`);
          names.add(nameVal);
          if (row.Status && !["Active", "Inactive"].includes(String(row.Status))) {
            problems.push("Invalid Status");
          }
          if (
            row["Staff Type"] &&
            !["Teaching", "Non-Teaching", "NonTeaching", "Both"].includes(String(row["Staff Type"]))
          ) {
            problems.push("Invalid Staff Type");
          }
          return { index: index + 2, row, problems };
        })
      );
    } finally {
      setParsing(false);
    }
  };

  const valid = rows.filter((row) => !row.problems.length).length;
  const duplicates = rows.filter((row) =>
    row.problems.some((problem) => problem.startsWith("Duplicate"))
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
                <Info /> Preview is complete. Bulk import API is not available in the current backend contract.
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
