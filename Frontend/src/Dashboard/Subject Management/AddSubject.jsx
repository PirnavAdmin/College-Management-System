import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./AddSubject.css";

const BOARDS = ["State Board", "CBSE", "ICSE"];
const GROUPS = ["MPC", "BiPC", "CEC", "MEC", "HEC"];
const ACADEMIC_LEVELS = ["First Year", "Second Year"];
const SUBJECT_TYPES = ["Theory", "Practical", "Language", "Elective"];
const initialForm = { board: "", group: "", academicLevel: "", subjectName: "", subjectCode: "", subjectTypes: [], internalMarks: "", practicalMarks: "", externalMarks: "", passingMarks: "" };
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function AddSubject() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(subjectId);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const totalMarks = useMemo(() => toNumber(form.internalMarks) + toNumber(form.practicalMarks) + toNumber(form.externalMarks), [form]);

  const fetchSubject = useCallback(async (signal) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/Subjects/${subjectId}`, { signal });
      const subject = response.data?.data || response.data;
      setForm({
        board: subject.board || "",
        group: subject.group || "",
        academicLevel: subject.academicLevel || "",
        subjectName: subject.subjectName || "",
        subjectCode: subject.subjectCode || "",
        subjectTypes: subject.subjectType ? subject.subjectType.split(", ") : [],
        internalMarks: subject.internalMarks ?? "",
        practicalMarks: subject.practicalMarks ?? "",
        externalMarks: subject.externalMarks ?? "",
        passingMarks: subject.passingMarks ?? "",
      });
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [subjectId]);

  const saveSubject = async (payload) => {
    if (editMode) return api.put(`/api/Subjects/${subjectId}`, payload);
    return api.post("/api/Subjects", payload);
  };

  useEffect(() => {
    if (!editMode) return undefined;
    const controller = new AbortController();
    fetchSubject(controller.signal);
    return () => controller.abort();
  }, [editMode, subjectId, fetchSubject]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleType = (type) => setForm((current) => ({ ...current, subjectTypes: current.subjectTypes.includes(type) ? current.subjectTypes.filter((item) => item !== type) : [...current.subjectTypes, type] }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.board || !form.group || !form.academicLevel || !form.subjectName || !form.subjectCode || !form.subjectTypes.length || !form.passingMarks || totalMarks <= 0) {
      setError("Complete all required subject fields and marks.");
      return;
    }
    const payload = {
      board: form.board,
      group: form.group,
      academicLevel: form.academicLevel,
      subjectName: form.subjectName,
      subjectCode: form.subjectCode,
      subjectType: form.subjectTypes.join(", "),
      theory: form.subjectTypes.includes("Theory"),
      practical: form.subjectTypes.includes("Practical"),
      language: form.subjectTypes.includes("Language"),
      elective: form.subjectTypes.includes("Elective"),
      internalMarks: toNumber(form.internalMarks),
      practicalMarks: toNumber(form.practicalMarks),
      externalMarks: toNumber(form.externalMarks),
      totalMarks,
      passingMarks: toNumber(form.passingMarks),
    };
    try {
      setSubmitting(true);
      setError("");
      await saveSubject(payload);
      navigate("/dashboard/subjects");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addSubject">
      <PageHeader title={editMode ? "Edit Subject" : "Add Subject"} subtitle="Configure subject identity, type, and marks." actions={<Link className="btn btn-secondary" to="/dashboard/subjects">Cancel</Link>} />
      <Card>
        {loading ? <p>Loading subject details...</p> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addSubjectForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Board" required><select className="select" value={form.board} onChange={(event) => setField("board", event.target.value)}><option value="">Select Board</option>{BOARDS.map((item) => <option key={item}>{item}</option>)}</select></FormField>
            <FormField label="Group" required><select className="select" value={form.group} onChange={(event) => setField("group", event.target.value)}><option value="">Select Group</option>{GROUPS.map((item) => <option key={item}>{item}</option>)}</select></FormField>
            <FormField label="Academic Level" required><select className="select" value={form.academicLevel} onChange={(event) => setField("academicLevel", event.target.value)}><option value="">Select Academic Level</option>{ACADEMIC_LEVELS.map((item) => <option key={item}>{item}</option>)}</select></FormField>
            <FormField label="Subject Name" required><input className="input" value={form.subjectName} onChange={(event) => setField("subjectName", event.target.value)} /></FormField>
            <FormField label="Subject Code" required><input className="input" value={form.subjectCode} onChange={(event) => setField("subjectCode", event.target.value)} /></FormField>
          </div>
          <FormField label="Subject Type" required>
            <div className="subjectTypeGrid">
              {SUBJECT_TYPES.map((type) => <label className="subjectTypeOption" key={type}><input type="checkbox" checked={form.subjectTypes.includes(type)} onChange={() => toggleType(type)} />{type}</label>)}
            </div>
          </FormField>
          <div className="form-grid">
            <FormField label="Internal Marks"><input className="input" type="number" value={form.internalMarks} onChange={(event) => setField("internalMarks", event.target.value)} /></FormField>
            <FormField label="Practical Marks"><input className="input" type="number" value={form.practicalMarks} onChange={(event) => setField("practicalMarks", event.target.value)} /></FormField>
            <FormField label="External Marks"><input className="input" type="number" value={form.externalMarks} onChange={(event) => setField("externalMarks", event.target.value)} /></FormField>
            <FormField label="Total Marks"><input className="input" value={totalMarks} readOnly disabled /></FormField>
            <FormField label="Passing Marks" required><input className="input" type="number" value={form.passingMarks} onChange={(event) => setField("passingMarks", event.target.value)} /></FormField>
          </div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : editMode ? "Update Subject" : "Add Subject"}</Button></div>
        </form>
      </Card>
    </section>
  );
}
