import { useState } from "react";
import { FiCheckCircle, FiEdit2, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./FacultySubjectAllocation.css";

const options = {
  faculty: ["Dr. Ananya Sharma", "Prof. Rajesh Kumar", "Dr. Meera Iyer"],
  board: ["State Board", "CBSE", "ICSE"],
  academicYear: ["2024-2025", "2025-2026", "2026-2027"],
  group: ["MPC", "BiPC", "CEC", "MEC", "HEC"],
  academicLevel: ["First Year", "Second Year"],
  section: ["Section A", "Section B", "Section C"],
  subject: ["Mathematics", "Physics", "Chemistry", "English"],
};
const fields = [["faculty", "Faculty"], ["board", "Board"], ["academicYear", "Academic Year"], ["group", "Group"], ["academicLevel", "Academic Level"], ["section", "Section"], ["subject", "Subject"]];
const initialForm = fields.reduce((acc, [key]) => ({ ...acc, [key]: "" }), {});

export default function FacultySubjectAllocation() {
  const [form, setForm] = useState(initialForm);
  const [allocations, setAllocations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createAllocation = async (payload) => api.post("/api/v1/faculty/assign-subject", payload, { params: { "api-version": "1.0" } });
  const updateAllocation = async (id, payload) => api.put(`/api/v1/faculty/assign-subject/${id}`, payload, { params: { "api-version": "1.0" } });
  const deleteAllocation = async (id) => api.delete(`/api/v1/faculty/assign-subject/${id}`, { params: { "api-version": "1.0" } });
  const fetchWorkload = async () => {
    // TODO: Replace with allocation list endpoint when backend exposes one.
    setAllocations([]);
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setForm(initialForm); setEditingId(null); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (Object.values(form).some((value) => !value)) {
      setError("Select every allocation field before saving.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const response = editingId ? await updateAllocation(editingId, form) : await createAllocation(form);
      const saved = response.data?.data || response.data || {};
      const allocation = { id: saved.id || saved.assignmentId || editingId || Date.now(), ...form, ...saved, status: saved.status || "Allocated" };
      setAllocations((current) => editingId ? current.map((item) => item.id === editingId ? allocation : item) : [allocation, ...current]);
      resetForm();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  const removeAllocation = async (id) => {
    if (!window.confirm("Delete this subject allocation?")) return;
    try {
      await deleteAllocation(id);
      setAllocations((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  return (
    <section className="facultySubjectAllocation">
      <PageHeader title="Faculty Subject Allocation" subtitle="Assign subjects to faculty using safe academic-context selections." actions={<Button onClick={fetchWorkload}><FiRefreshCw /> Refresh</Button>} />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card className="allocationFormCard">
        <form className="allocationForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            {fields.map(([key, label]) => (
              <FormField label={label} key={key}>
                <select className="select" value={form[key]} onChange={(event) => setField(key, event.target.value)}>
                  <option value="">Select {label}</option>
                  {options[key].map((item) => <option key={item}>{item}</option>)}
                </select>
              </FormField>
            ))}
          </div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiCheckCircle /> {submitting ? "Saving..." : editingId ? "Update Allocation" : "Allocate Subject"}</Button><Button type="button" onClick={resetForm}>Reset</Button></div>
        </form>
      </Card>
      <Card padded={false}>
        <DataTable
          columns={[...fields.map(([key, label]) => ({ key, label })), { key: "status", label: "Status", render: (row) => <span className="badge badge-success">{row.status}</span> }]}
          rows={allocations}
          empty={<EmptyState title="No allocations yet" message="Use the form above to allocate a subject." />}
          renderActions={(row) => (
            <div className="row-actions">
              <button className="icon-button" type="button" title="Edit" onClick={() => { setEditingId(row.id); setForm(fields.reduce((acc, [key]) => ({ ...acc, [key]: row[key] || "" }), {})); }}><FiEdit2 /></button>
              <button className="icon-button" type="button" title="Delete" onClick={() => removeAllocation(row.id)}><FiTrash2 /></button>
            </div>
          )}
        />
      </Card>
    </section>
  );
}
