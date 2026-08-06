import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./AddEditBoard.css";

const initialForm = { boardName: "", boardCode: "", description: "", country: "", state: "", academicPattern: "", academicLevels: "", internalAssessment: false, practicalExams: false, boardExams: false, passPercentage: "", gradingSystem: "", rankCalculation: false, status: "Active" };

export default function AddEditBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(boardId);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchBoard = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/api/v1/boards/${boardId}`, { signal });
      setForm({ ...initialForm, ...(response.data?.data || response.data) });
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError("Unable to load board. Please check backend API connection.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [boardId]);

  const saveBoard = async (payload) => {
    if (editMode) return api.put(`/api/v1/boards/${boardId}`, payload);
    return api.post("/api/v1/boards", payload);
  };

  useEffect(() => {
    if (!editMode) return undefined;
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [editMode, boardId, fetchBoard]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.boardName.trim() || !form.boardCode.trim()) {
      setError("Board name and board code are required.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await saveBoard({ ...form, boardCode: form.boardCode.trim().toUpperCase(), isActive: form.status === "Active" });
      navigate("/dashboard/boards");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addEditBoard">
      <PageHeader title={editMode ? "Edit Board" : "Add Board"} subtitle="Configure board identity, academic pattern, assessment rules, and status." actions={<Link className="btn btn-secondary" to="/dashboard/boards">Cancel</Link>} />
      <Card>
        {loading ? <p>Loading board details...</p> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addEditBoardForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Board Name"><input className="input" value={form.boardName} onChange={(event) => setField("boardName", event.target.value)} /></FormField>
            <FormField label="Board Code"><input className="input" value={form.boardCode} onChange={(event) => setField("boardCode", event.target.value)} /></FormField>
            <FormField label="Description"><textarea className="textarea" value={form.description} onChange={(event) => setField("description", event.target.value)} /></FormField>
            <FormField label="Country"><input className="input" value={form.country} onChange={(event) => setField("country", event.target.value)} /></FormField>
            <FormField label="State"><input className="input" value={form.state} onChange={(event) => setField("state", event.target.value)} /></FormField>
            <FormField label="Academic Pattern"><input className="input" value={form.academicPattern} onChange={(event) => setField("academicPattern", event.target.value)} /></FormField>
            <FormField label="Academic Levels"><input className="input" value={form.academicLevels} onChange={(event) => setField("academicLevels", event.target.value)} /></FormField>
            <FormField label="Pass Percentage"><input className="input" type="number" value={form.passPercentage} onChange={(event) => setField("passPercentage", event.target.value)} /></FormField>
            <FormField label="Grading System"><input className="input" value={form.gradingSystem} onChange={(event) => setField("gradingSystem", event.target.value)} /></FormField>
            <FormField label="Status"><select className="select" value={form.status} onChange={(event) => setField("status", event.target.value)}><option>Active</option><option>Inactive</option></select></FormField>
          </div>
          <div className="optionGrid">{["internalAssessment", "practicalExams", "boardExams", "rankCalculation"].map((key) => <label className="checkOption" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setField(key, event.target.checked)} />{key.replace(/([A-Z])/g, " $1")}</label>)}</div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : editMode ? "Update Board" : "Add Board"}</Button></div>
        </form>
      </Card>
    </section>
  );
}
