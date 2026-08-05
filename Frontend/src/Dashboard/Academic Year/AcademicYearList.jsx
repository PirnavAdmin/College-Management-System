import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import "./AcademicYearList.css";

export default function AcademicYearList() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAcademicYears = async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/v1/academic-years", { signal });
      setYears(asArray(response.data));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const deleteAcademicYear = async (id) => {
    if (!window.confirm("Delete this academic year?")) return;
    try {
      await api.delete(`/api/v1/academic-years/${id}`);
      await fetchAcademicYears();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAcademicYears(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <section className="academicYearList">
      <PageHeader
        title="Academic Year List"
        subtitle="Maintain academic calendars and active admission windows."
        actions={<><Button onClick={() => fetchAcademicYears()}><FiRefreshCw /> Refresh</Button><Link className="btn btn-primary" to="/dashboard/academic-years/new"><FiPlus /> Add Academic Year</Link></>}
      />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card padded={false}>
        {loading ? <EmptyState title="Loading academic years" /> : (
          <DataTable
            columns={[
              { key: "academicYearName", label: "Academic Year", render: (row) => row.academicYearName || row.name || row.academicYear },
              { key: "startDate", label: "Start Date" },
              { key: "endDate", label: "End Date" },
              { key: "status", label: "Status", render: (row) => <span className="badge">{row.status || (row.isActive ? "Active" : "Inactive")}</span> },
            ]}
            rows={years}
            empty={<EmptyState title="No academic years found" message="Add an academic year to begin setup." />}
            renderActions={(row) => (
              <button className="icon-button" type="button" title="Delete" onClick={() => deleteAcademicYear(row.id || row.academicYearId)}>
                <FiTrash2 />
              </button>
            )}
          />
        )}
      </Card>
    </section>
  );
}
