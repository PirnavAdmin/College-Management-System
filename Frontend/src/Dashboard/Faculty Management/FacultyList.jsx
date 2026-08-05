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
import "./FacultyList.css";

const normalizeFaculty = (faculty) => ({
  ...faculty,
  id: faculty.id ?? faculty.facultyId ?? faculty.employeeId,
  employeeId: faculty.employeeId ?? faculty.id ?? faculty.facultyId,
  name: faculty.fullName ?? faculty.name ?? [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
  mobile: faculty.mobile ?? faculty.mobileNumber ?? "",
  department: faculty.department?.name ?? faculty.departmentName ?? faculty.department ?? "",
  status: faculty.status ?? (faculty.isActive === false ? "Inactive" : "Active"),
});

export default function FacultyList() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFaculty = async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/v1/faculty", {
        signal,
        params: { "api-version": "1.0", PageNumber: 1, PageSize: 1000 },
      });
      setFaculty(asArray(response.data).map(normalizeFaculty));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const deleteFaculty = async (facultyId) => {
    if (!window.confirm("Delete this faculty member?")) return;
    try {
      await api.delete(`/api/v1/faculty/${facultyId}`, { params: { "api-version": "1.0" } });
      await fetchFaculty();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchFaculty(controller.signal);
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
              { key: "department", label: "Department" },
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
