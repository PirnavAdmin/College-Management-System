import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./AddAcademicYear.css";

const initialForm = {
  academicYearName: "",
  startDate: "",
  endDate: "",
  admissionStartDate: "",
  admissionEndDate: "",
  isActive: false,
};

export default function AddAcademicYear() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createAcademicYear = async (payload) => api.post("/api/v1/academic-years", payload);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.academicYearName || !form.startDate || !form.endDate) {
      setError("Academic year name, start date, and end date are required.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await createAcademicYear(form);
      setForm(initialForm);
      navigate("/dashboard/academic-years");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addAcademicYear">
      <PageHeader title="Add Academic Year" subtitle="Create a new academic year and admission date range." actions={<Link className="btn btn-secondary" to="/dashboard/academic-years">Cancel</Link>} />
      <Card>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addAcademicYearForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Academic Year Name"><input className="input" value={form.academicYearName} onChange={(event) => setField("academicYearName", event.target.value)} /></FormField>
            <FormField label="Start Date"><input className="input" type="date" value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} /></FormField>
            <FormField label="End Date"><input className="input" type="date" value={form.endDate} onChange={(event) => setField("endDate", event.target.value)} /></FormField>
            <FormField label="Admission Start Date"><input className="input" type="date" value={form.admissionStartDate} onChange={(event) => setField("admissionStartDate", event.target.value)} /></FormField>
            <FormField label="Admission End Date"><input className="input" type="date" value={form.admissionEndDate} onChange={(event) => setField("admissionEndDate", event.target.value)} /></FormField>
            <FormField label="Is Active"><select className="select" value={String(form.isActive)} onChange={(event) => setField("isActive", event.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></select></FormField>
          </div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : "Add Academic Year"}</Button></div>
        </form>
      </Card>
    </section>
  );
}
