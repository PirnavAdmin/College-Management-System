import { useCallback, useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../api/axios";
import { asArray, readEntity } from "../../shared/utils/responseHelpers";
import "./createAssignment.css";

const emptyForm = {
  title: "",
  subject: "",
  faculty: "",
  description: "",
  dueDate: "",
  academicYearId: "",
  academicLevel: "",
  attachment: null,
  attachmentName: "",
  attachmentPath: "",
  maxMarks: "",
};

const apiVersionConfig = { params: { "api-version": "1.0" } };
const assignmentEndpoints = {
  list: "/api/v1/assignments",
  detail: (id) => `/api/v1/assignments/${id}`,
  submissions: (id) => `/api/v1/assignments/${id}/submissions`,
};
const toAssignmentFormData = (assignment) => {
  const data = new FormData();
  data.append("Title", assignment.title.trim());
  data.append("Subject", assignment.subject);
  data.append("Faculty", assignment.faculty.trim());
  data.append("Description", assignment.description.trim());
  data.append("DueDate", assignment.dueDate);
  data.append("AcademicYearId", assignment.academicYearId);
  data.append("AcademicLevel", assignment.academicLevel);
  data.append("MaximumMarks", String(Number(assignment.maxMarks)));
  if (assignment.attachment) data.append("Attachment", assignment.attachment);
  if (assignment.attachmentPath) data.append("AttachmentPath", assignment.attachmentPath);
  return data;
};
const multipartConfig = { ...apiVersionConfig, headers: { "Content-Type": "multipart/form-data" } };

const assignmentId = (assignment) => assignment.id ?? assignment.assignmentId ?? assignment._id;
const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");
const today = () => new Date().toLocaleDateString("en-CA");
const academicYearId = (year) => year.academicYearId ?? year.id ?? year.yearId;
const academicYearLabel = (year) => year.academicYearName ?? year.name ?? year.academicYear ?? year.yearName ?? "Academic Year";
const facultyId = (faculty) => faculty.facultyId ?? faculty.id ?? faculty.userId;
const facultyLabel = (faculty) => faculty.facultyName ?? faculty.name ?? faculty.fullName ?? faculty.userName ?? "Faculty";
const academicLevelLabel = (level) => typeof level === "string" ? level : level.academicLevelName ?? level.name ?? level.levelName ?? level.academicLevel ?? "Academic Level";
const formatDate = (value) => {
  const date = dateOnly(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
};
const attachmentLabel = (value) => (value ? String(value).split(/[\\/]/).pop() : "—");

const toFormData = (assignment) => ({
  ...emptyForm,
  title: assignment.title ?? assignment.assignmentTitle ?? "",
  subject: assignment.subject ?? assignment.subjectName ?? "",
  faculty: assignment.faculty ?? assignment.facultyName ?? assignment.createdByName ?? "",
  description: assignment.description ?? assignment.details ?? "",
  dueDate: dateOnly(assignment.dueDate ?? assignment.dueDateTime ?? assignment.deadline),
  academicYearId: String(assignment.academicYearId ?? assignment.yearId ?? ""),
  academicLevel: assignment.academicLevel ?? assignment.academicLevelName ?? assignment.levelName ?? "",
  attachmentName: assignment.attachmentName ?? assignment.fileName ?? assignment.attachment ?? "",
  attachmentPath: assignment.attachmentPath ?? assignment.attachment ?? "",
  maxMarks: assignment.maximumMarks ?? assignment.maxMarks ?? "",
});

const CreateAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAssignments, setShowAssignments] = useState(false);
  const [showSubmissionStatus, setShowSubmissionStatus] = useState(false);
  const [submissionStatuses, setSubmissionStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [academicYearsLoading, setAcademicYearsLoading] = useState(true);
  const [academicLevelsLoading, setAcademicLevelsLoading] = useState(true);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState("");
  const [academicYearsError, setAcademicYearsError] = useState("");
  const [academicLevelsError, setAcademicLevelsError] = useState("");
  const [facultyError, setFacultyError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");

  const fetchAssignments = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(assignmentEndpoints.list, { ...apiVersionConfig, signal });
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

  useEffect(() => {
    const controller = new AbortController();

    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        setSubjectsError("");
        const response = await api.get("/api/Subjects", { ...apiVersionConfig, signal: controller.signal });
        setSubjects(asArray(response.data));
      } catch (fetchError) {
        if (fetchError.name !== "CanceledError") setSubjectsError(getApiErrorMessage(fetchError));
      } finally {
        if (!controller.signal.aborted) setSubjectsLoading(false);
      }
    };

    fetchSubjects();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAcademicYears = async () => {
      try {
        setAcademicYearsLoading(true);
        setAcademicYearsError("");
        const response = await api.get("/api/v1/academic-years", { ...apiVersionConfig, signal: controller.signal });
        setAcademicYears(asArray(response.data));
      } catch (fetchError) {
        if (fetchError.name !== "CanceledError") setAcademicYearsError(getApiErrorMessage(fetchError));
      } finally {
        if (!controller.signal.aborted) setAcademicYearsLoading(false);
      }
    };

    fetchAcademicYears();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAcademicLevels = async () => {
      try {
        setAcademicLevelsLoading(true);
        setAcademicLevelsError("");
        const response = await api.get("/api/v1/boards/academic-levels", { ...apiVersionConfig, signal: controller.signal });
        setAcademicLevels(asArray(response.data));
      } catch (fetchError) {
        if (fetchError.name !== "CanceledError") setAcademicLevelsError(getApiErrorMessage(fetchError));
      } finally {
        if (!controller.signal.aborted) setAcademicLevelsLoading(false);
      }
    };

    fetchAcademicLevels();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchFaculty = async () => {
      try {
        setFacultyLoading(true);
        setFacultyError("");
        const response = await api.get("/api/v1/faculty", { ...apiVersionConfig, signal: controller.signal });
        setFacultyMembers(asArray(response.data));
      } catch (fetchError) {
        if (fetchError.name !== "CanceledError") setFacultyError(getApiErrorMessage(fetchError));
      } finally {
        if (!controller.signal.aborted) setFacultyLoading(false);
      }
    };

    fetchFaculty();
    return () => controller.abort();
  }, []);

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
    if (!formData.academicYearId) newErrors.academicYearId = "Academic year is required";
    if (!formData.academicLevel) newErrors.academicLevel = "Academic level is required";
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
      const payload = toAssignmentFormData(formData);
      if (editingId) await api.put(assignmentEndpoints.detail(editingId), payload, multipartConfig);
      else await api.post(assignmentEndpoints.list, payload, multipartConfig);
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
      const response = await api.get(assignmentEndpoints.detail(id), apiVersionConfig);
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
      await api.delete(assignmentEndpoints.detail(id), apiVersionConfig);
      if (editingId === id) resetForm();
      await fetchAssignments();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  const handleSubmissionStatus = async () => {
    if (showSubmissionStatus) {
      setShowSubmissionStatus(false);
      return;
    }

    setShowSubmissionStatus(true);
    setSubmissionsError("");
    if (!assignments.length) {
      setSubmissionStatuses([]);
      return;
    }

    try {
      setSubmissionsLoading(true);
      const statuses = await Promise.all(
        assignments.map(async (assignment) => {
          const id = assignmentId(assignment);
          if (!id) return { assignment, status: "Unavailable", count: 0 };

          try {
            const response = await api.get(assignmentEndpoints.submissions(id), apiVersionConfig);
            const submissions = asArray(response.data);
            return { assignment, status: submissions.length ? "Submitted" : "Pending", count: submissions.length };
          } catch {
            return { assignment, status: "Unavailable", count: 0 };
          }
        }),
      );
      setSubmissionStatuses(statuses);
      if (statuses.some(({ status }) => status === "Unavailable")) setSubmissionsError("Some submission statuses could not be loaded.");
    } finally {
      setSubmissionsLoading(false);
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
          <div className="form-group"><label htmlFor="subject" className="form-label">Subject <span className="error-text">*</span></label><select id="subject" name="subject" className="form-select" value={formData.subject} onChange={handleChange} required disabled={subjectsLoading}><option value="">{subjectsLoading ? "Loading subjects..." : "Select Subject"}</option>{subjects.map((subject) => <option key={subject.subjectId ?? subject.id ?? subject.subjectName} value={subject.subjectName}>{subject.subjectName}{subject.subjectCode ? ` (${subject.subjectCode})` : ""}</option>)}</select>{subjectsError && <span className="error-text">Unable to load subjects: {subjectsError}</span>}{errors.subject && <span className="error-text">{errors.subject}</span>}</div>
          <div className="form-group"><label htmlFor="faculty" className="form-label">Faculty <span className="error-text">*</span></label><select id="faculty" name="faculty" className="form-select" value={formData.faculty} onChange={handleChange} required disabled={facultyLoading}><option value="">{facultyLoading ? "Loading faculty..." : "Select Faculty"}</option>{facultyMembers.map((faculty) => <option key={facultyId(faculty) ?? facultyLabel(faculty)} value={facultyLabel(faculty)}>{facultyLabel(faculty)}</option>)}</select>{facultyError && <span className="error-text">Unable to load faculty: {facultyError}</span>}{errors.faculty && <span className="error-text">{errors.faculty}</span>}</div>
          <div className="form-group full"><label htmlFor="description" className="form-label">Description <span className="error-text">*</span></label><textarea id="description" name="description" className="form-textarea" rows={3} placeholder="Enter assignment description" value={formData.description} onChange={handleChange} required />{errors.description && <span className="error-text">{errors.description}</span>}</div>
          <div className="assignment-meta-row form-group full">
            <div className="form-group"><label htmlFor="academicYearId" className="form-label">Academic Year <span className="error-text">*</span></label><select id="academicYearId" name="academicYearId" className="form-select" value={formData.academicYearId} onChange={handleChange} required disabled={academicYearsLoading}><option value="">{academicYearsLoading ? "Loading academic years..." : "Select Academic Year"}</option>{academicYears.map((year) => <option key={academicYearId(year)} value={academicYearId(year)}>{academicYearLabel(year)}</option>)}</select>{academicYearsError && <span className="error-text">Unable to load academic years: {academicYearsError}</span>}{errors.academicYearId && <span className="error-text">{errors.academicYearId}</span>}</div>
            <div className="form-group"><label htmlFor="academicLevel" className="form-label">Academic Level <span className="error-text">*</span></label><select id="academicLevel" name="academicLevel" className="form-select" value={formData.academicLevel} onChange={handleChange} required disabled={academicLevelsLoading}><option value="">{academicLevelsLoading ? "Loading academic levels..." : "Select Academic Level"}</option>{academicLevels.map((level) => <option key={level.id ?? level.academicLevelId ?? academicLevelLabel(level)} value={academicLevelLabel(level)}>{academicLevelLabel(level)}</option>)}</select>{academicLevelsError && <span className="error-text">Unable to load academic levels: {academicLevelsError}</span>}{errors.academicLevel && <span className="error-text">{errors.academicLevel}</span>}</div>
            <div className="form-group"><label htmlFor="dueDate" className="form-label">Due Date <span className="error-text">*</span></label><input type="date" id="dueDate" name="dueDate" className="form-input" min={today()} value={formData.dueDate} onChange={handleChange} required />{errors.dueDate && <span className="error-text">{errors.dueDate}</span>}</div>
          </div>
          <div className="form-group"><label htmlFor="attachment" className="form-label">Attachment {!editingId && <span className="error-text">*</span>}</label><input type="file" id="attachment" name="attachment" className="form-file" placeholder="upload file" onChange={handleChange} required={!editingId} />{errors.attachment && <span className="error-text">{errors.attachment}</span>}{formData.attachmentName && <span className="page-subtitle">Current file: {formData.attachmentName}</span>}</div>
          <div className="form-group"><label htmlFor="maxMarks" className="form-label">Maximum Marks <span className="error-text">*</span></label><input type="number" id="maxMarks" name="maxMarks" className="form-input" placeholder="Enter maximum marks" min={1} value={formData.maxMarks} onChange={handleChange} required />{errors.maxMarks && <span className="error-text">{errors.maxMarks}</span>}</div>
          <div className="button-group"><button type="submit" className="create-btn" disabled={submitting}>{submitting ? "Saving..." : editingId ? "Update Assignment" : "Create Assignment"}</button><button type="button" className="cancel-btn" onClick={resetForm} disabled={submitting}>{editingId ? "Cancel Edit" : "Clear Form"}</button><button type="button" className="cancel-btn" onClick={() => setShowAssignments((current) => !current)}>Created Assignments</button><button type="button" className="cancel-btn" onClick={handleSubmissionStatus} disabled={submissionsLoading}>{submissionsLoading ? "Loading Status..." : "Submitted Assignments"}</button></div>
        </form>

        {showAssignments && (
          <section className="submitted-assignments" aria-label="Created assignments">
            <h2 className="page-title">Created Assignments</h2>
            {loading ? (
              <p className="page-subtitle">Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p className="page-subtitle">No assignments have been created yet.</p>
            ) : (
              <div className="assignment-table-wrapper">
                <table className="assignment-table">
                  <colgroup>
                    <col className="assignment-column-number" />
                    <col className="assignment-column-title" />
                    <col className="assignment-column-subject" />
                    <col className="assignment-column-faculty" />
                    <col className="assignment-column-description" />
                    <col className="assignment-column-date" />
                    <col className="assignment-column-marks" />
                    <col className="assignment-column-attachment" />
                    <col className="assignment-column-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">S.No.</th>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Faculty</th>
                      <th>Description</th>
                      <th>Due Date</th>
                      <th>Max Marks</th>
                      <th>Attachment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment, index) => {
                      const id = assignmentId(assignment);
                      const display = toFormData(assignment);
                      return (
                        <tr key={id ?? `${display.title}-${display.dueDate}`}>
                          <td className="assignment-number-cell">{index + 1}</td>
                          <td className="assignment-title-cell">{display.title || "—"}</td>
                          <td><span className="assignment-subject-chip">{display.subject || "—"}</span></td>
                          <td>{display.faculty || "—"}</td>
                          <td className="assignment-description">{display.description || "—"}</td>
                          <td className="assignment-date-cell">{formatDate(display.dueDate)}</td>
                          <td className="assignment-marks-cell">{display.maxMarks || "—"}</td>
                          <td><span className="assignment-file-name" title={display.attachmentName}>{attachmentLabel(display.attachmentName)}</span></td>
                          <td className="assignment-actions-cell">
                            <div className="assignment-actions">
                              <button type="button" className="create-btn assignment-action-button" onClick={() => handleEdit(assignment)}>Edit</button>
                              <button type="button" className="cancel-btn assignment-action-button" onClick={() => handleDelete(id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showSubmissionStatus && (
          <section className="submitted-assignments" aria-label="Assignment submission status">
            <h2 className="page-title">Submitted Assignments</h2>
            {submissionsLoading ? (
              <p className="page-subtitle">Loading submission status...</p>
            ) : submissionStatuses.length === 0 ? (
              <p className="page-subtitle">No assignments are available to check.</p>
            ) : (
              <div className="assignment-table-wrapper">
                <table className="assignment-table submission-status-table">
                  <thead><tr><th>S.No.</th><th>Title</th><th>Subject</th><th>Due Date</th><th>Submissions</th><th>Status</th></tr></thead>
                  <tbody>{submissionStatuses.map(({ assignment, status, count }, index) => {
                    const display = toFormData(assignment);
                    return <tr key={assignmentId(assignment) ?? `${display.title}-${index}`}><td className="assignment-number-cell">{index + 1}</td><td className="assignment-title-cell">{display.title || "—"}</td><td><span className="assignment-subject-chip">{display.subject || "—"}</span></td><td className="assignment-date-cell">{formatDate(display.dueDate)}</td><td className="assignment-marks-cell">{count}</td><td><span className={`submission-status submission-status-${status.toLowerCase()}`}>{status}</span></td></tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            {submissionsError && <p className="error-text">{submissionsError}</p>}
          </section>
        )}

      </div>
    </div>
  );
};

export default CreateAssignment;
