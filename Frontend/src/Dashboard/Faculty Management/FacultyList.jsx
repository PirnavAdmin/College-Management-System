import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import { apiEndpoints } from "../../services/apiEndpoints";
import "./FacultyList.css";

const normalizeFaculty = (faculty) => ({
  ...faculty,
  id: faculty.facultyId ?? faculty.id ?? null,
  employeeId: faculty.employeeId ?? faculty.facultyCode ?? faculty.facultyId ?? faculty.id,
  name:
    faculty.fullName ?? faculty.name ?? faculty.employeeId ?? [faculty.firstName, faculty.lastName].filter(Boolean).join(" ") ?? "",
  mobile: faculty.mobile ?? faculty.mobileNumber ?? "",
  department:
    faculty.department?.name ?? faculty.department?.departmentName ?? faculty.departmentName ?? faculty.department ?? faculty.departmentId ?? "",
  status: faculty.status ?? (faculty.isActive === false ? "Inactive" : "Active"),
});

export default function FacultyList() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFaculty = async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(apiEndpoints.faculty.list, {
        signal,
        params: { "api-version": "1.0", PageNumber: 1, PageSize: 1000 },
      });
      const records = asArray(response.data).map(normalizeFaculty);
      // map department ids to names if department missing
      const deptMap = (departments || []).reduce((acc, d) => ({ ...acc, [String(d.id)]: d.name }), {});
      const augmented = records.map((f) => ({ ...f, department: f.department || deptMap[String(f.departmentId)] || f.department }));
      setFaculty(augmented);
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchDepartments = async (signal) => {
    try {
      const response = await api.get(apiEndpoints.departments.list, { signal, params: { "api-version": "1.0" } });
      const apiDepartments = asArray(response.data).map((item) => ({ id: item.id ?? item.departmentId, name: item.name ?? item.departmentName })).filter((item) => item.id && item.name);
      if (apiDepartments.length) setDepartments(apiDepartments);
    } catch (err) {
      // ignore — department column will try other fallbacks
    }
  };

  const deleteFaculty = async (facultyId) => {
    if (!window.confirm("Delete this faculty member?")) return;
    if (!facultyId) {
      setError("This faculty record has no Faculty ID, so it cannot be deleted.");
      return;
    }
    try {
      await api.delete(apiEndpoints.faculty.remove(facultyId), { params: { "api-version": "1.0" } });
      await fetchFaculty();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await fetchDepartments(controller.signal);
      await fetchFaculty(controller.signal);
    })();
    return () => controller.abort();
  }, []);

  const filteredFaculty = useMemo(() => {
    const term = search.trim().toLowerCase();
    return faculty.filter((item) =>
      !term || [item.employeeId, item.name, item.mobile, item.email, item.department].join(" ").toLowerCase().includes(term),
    );
  }, [faculty, search]);

  return (
    <section className="facultyList">
      <PageHeader title="Faculty List" subtitle="Manage faculty records, departments, and status." actions={<><Button onClick={() => fetchFaculty()}><FiRefreshCw /> Refresh</Button><Link className="btn btn-primary" to="/dashboard/faculty/new"><FiPlus /> Add Faculty</Link></>} />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card padded={false}>
        <div className="facultyToolbar">
          <input className="input" placeholder="Search faculty" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Link className="btn btn-secondary" to="/dashboard/faculty/subject-allocation">Subject Allocation</Link>
        </div>
        {loading ? <EmptyState title="Loading faculty" /> : (
          <DataTable
            columns={[
              { key: "employeeId", label: "Employee ID" },
              { key: "name", label: "Faculty Name" },
              { key: "mobile", label: "Mobile" },
              { key: "email", label: "Email" },
              { key: "department", label: "Department", render: (row) => row.department || row.departmentId || "—" },
              { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
            ]}
            rows={filteredFaculty}
            empty={<EmptyState title="No faculty found" message="Add faculty or adjust search filters." />}
            renderActions={(row) => (
              <div className="row-actions">
                <button className="icon-button" type="button" title="Edit" onClick={() => navigate(`/dashboard/faculty/${row.id}/edit`)}><FiEdit2 /></button>
                <button className="icon-button" type="button" title="Delete" onClick={() => deleteFaculty(row.id)}><FiTrash2 /></button>
              </div>
            )}
          />
        )}
      </Card>
    </section>
  );
}
