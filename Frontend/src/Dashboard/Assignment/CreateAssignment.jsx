import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../../api/axios";
import { assignmentService } from "../../services/assignmentService";
import { asArray, readEntity } from "../../shared/utils/responseHelpers";
import "./createAssignment.css";

const emptyForm = {
  title: "",
  subject: "",
  faculty: "",
  description: "",
  dueDate: "",
  attachment: null,
  attachmentName: "",
  attachmentPath: "",
  maxMarks: "",
};

const assignmentId = (assignment) => assignment.id ?? assignment.assignmentId ?? assignment._id;
const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");
const today = () => new Date().toLocaleDateString("en-CA");

const toFormData = (assignment) => ({
  ...emptyForm,
  title: assignment.title ?? assignment.assignmentTitle ?? "",
  subject: assignment.subject ?? assignment.subjectName ?? "",
  faculty: assignment.faculty ?? assignment.facultyName ?? assignment.createdByName ?? "",
  description: assignment.description ?? assignment.details ?? "",
  dueDate: dateOnly(assignment.dueDate ?? assignment.dueDateTime ?? assignment.deadline),
  attachmentName: assignment.attachmentName ?? assignment.fileName ?? assignment.attachment ?? "",
  attachmentPath: assignment.attachmentPath ?? assignment.attachment ?? "",
  maxMarks: assignment.maximumMarks ?? assignment.maxMarks ?? "",
});

const CreateAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAssignments, setShowAssignments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchAssignments = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await assignmentService.list({ signal });
      setAssignments(asArray(response.data));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAssignments(controller.signal);
    return () => controller.abort();
  }, [fetchAssignments]);

  const resetForm = () => {
    setFormData(emptyForm);
    setErrors({});
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    setFormData((current) => ({ ...current, [name]: files ? files[0] : value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Assignment title is required";
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.faculty.trim()) newErrors.faculty = "Faculty name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    else if (formData.dueDate < today()) newErrors.dueDate = "Due date must be today or later";
    if (!editingId && !formData.attachment) newErrors.attachment = "An attachment is required";
    if (!formData.maxMarks || Number(formData.maxMarks) <= 0) newErrors.maxMarks = "Maximum marks must be greater than 0";
    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    try {
      setSubmitting(true);
      setError("");
      if (editingId) await assignmentService.update(editingId, formData);
      else await assignmentService.create(formData);
      resetForm();
      setShowAssignments(true);
      await fetchAssignments();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (assignment) => {
    const id = assignmentId(assignment);
    if (!id) return setError("This assignment has no ID and cannot be edited.");
    try {
      setError("");
      const response = await assignmentService.getById(id);
      setFormData(toFormData(readEntity(response.data)));
      setEditingId(id);
      setErrors({});
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm("Delete this assignment?")) return;
    try {
      setError("");
      await assignmentService.remove(id);
      if (editingId === id) resetForm();
      await fetchAssignments();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  return (
    <div className="create-assignment-page">
      <div className="create-assignment-card">
        <h1 className="page-title">Create Assignment</h1>
        <p className="page-subtitle">Add a new assignment for a subject and publish it to students.</p>
        {error && <p className="error-text" role="alert">{error}</p>}

        <form className="assignment-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group full"><label htmlFor="title" className="form-label">Assignment Title <span className="error-text">*</span></label><input type="text" id="title" name="title" className="form-input" placeholder="Enter assignment title" value={formData.title} onChange={handleChange} required />{errors.title && <span className="error-text">{errors.title}</span>}</div>
          <div className="form-group"><label htmlFor="subject" className="form-label">Subject <span className="error-text">*</span></label><select id="subject" name="subject" className="form-select" value={formData.subject} onChange={handleChange} required><option value="">Select Subject</option><option value="Mathematics">Mathematics</option><option value="Physics">Physics</option><option value="Chemistry">Chemistry</option><option value="Computer Science">Computer Science</option><option value="English">English</option></select>{errors.subject && <span className="error-text">{errors.subject}</span>}</div>
          <div className="form-group"><label htmlFor="faculty" className="form-label">Faculty <span className="error-text">*</span></label><input type="text" id="faculty" name="faculty" className="form-input" placeholder="Enter faculty name" value={formData.faculty} onChange={handleChange} required />{errors.faculty && <span className="error-text">{errors.faculty}</span>}</div>
          <div className="form-group full"><label htmlFor="description" className="form-label">Description <span className="error-text">*</span></label><textarea id="description" name="description" className="form-textarea" rows={5} placeholder="Enter assignment description" value={formData.description} onChange={handleChange} required />{errors.description && <span className="error-text">{errors.description}</span>}</div>
          <div className="form-group"><label htmlFor="dueDate" className="form-label">Due Date <span className="error-text">*</span></label><input type="date" id="dueDate" name="dueDate" className="form-input" min={today()} value={formData.dueDate} onChange={handleChange} required />{errors.dueDate && <span className="error-text">{errors.dueDate}</span>}</div>
          <div className="form-group full"><label htmlFor="attachment" className="form-label">Attachment {!editingId && <span className="error-text">*</span>}</label><input type="file" id="attachment" name="attachment" className="form-file" placeholder="upload file" onChange={handleChange} required={!editingId} />{errors.attachment && <span className="error-text">{errors.attachment}</span>}{formData.attachmentName && <span className="page-subtitle">Current file: {formData.attachmentName}</span>}</div>
          <div className="form-group"><label htmlFor="maxMarks" className="form-label">Maximum Marks <span className="error-text">*</span></label><input type="number" id="maxMarks" name="maxMarks" className="form-input" placeholder="Enter maximum marks" min={1} value={formData.maxMarks} onChange={handleChange} required />{errors.maxMarks && <span className="error-text">{errors.maxMarks}</span>}</div>
          <div className="button-group"><button type="submit" className="create-btn" disabled={submitting}>{submitting ? "Saving..." : editingId ? "Update Assignment" : "Create Assignment"}</button><button type="button" className="cancel-btn" onClick={resetForm} disabled={submitting}>{editingId ? "Cancel Edit" : "Clear Form"}</button><button type="button" className="cancel-btn" onClick={() => setShowAssignments((current) => !current)}>Created Assignments</button></div>
        </form>

        {showAssignments && <section className="submitted-assignments" aria-label="Submitted assignments"><h2 className="page-title">Created Assignments</h2>{loading ? <p className="page-subtitle">Loading assignments...</p> : assignments.length === 0 ? <p className="page-subtitle">No assignments have been created yet.</p> : <ul className="assignment-list">{assignments.map((assignment) => { const id = assignmentId(assignment); const display = toFormData(assignment); return <li className="assignment-item" key={id}><div className="assignment-item-head"><h3 className="assignment-item-title">{display.title}</h3><span className="assignment-badge">{display.subject}</span></div><p className="assignment-item-desc">{display.description}</p><div className="assignment-meta"><span>Faculty: {display.faculty}</span><span>Due: {display.dueDate}</span><span>Max marks: {display.maxMarks}</span>{display.attachmentName && <span>File: {display.attachmentName}</span>}</div><button type="button" className="create-btn assignment-delete" onClick={() => handleEdit(assignment)}>Edit</button><button type="button" className="cancel-btn assignment-delete" onClick={() => handleDelete(id)}>Delete</button></li>; })}</ul>}</section>}
      </div>
    </div>
  );
};

export default CreateAssignment;
