import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ClipboardList, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Modal, StatusBadge, Toast, useConfirmDialog } from "@/components/common/Ui.jsx";
import * as data from "@/data/mockData.js";
import "./ExaminationPage.css";

const EXAMS_KEY = "cms.examinations";
const SCHEDULES_KEY = "cms.examinationSchedules";
const initialSchedule = () => ({
  subjectId: "",
  date: "",
  startTime: "",
  endTime: "",
  duration: "",
  invigilator: "",
  status: "Draft",
});
const initialForm = () => ({
  code: "",
  name: "",
  board: "",
  year: "",
  level: "",
  group: "",
  type: "",
  sessions: ["Morning"],
  status: "Draft",
});
const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const makeCode = (exams) => {
  let n = exams.length + 1;
  let code;
  do {
    code = `EXM-${new Date().getFullYear()}-${String(n++).padStart(3, "0")}`;
  } while (exams.some((exam) => exam.code === code));
  return code;
};
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

function safeExaminations() {
  const fallback = data.examinations.map((exam, index) => ({
    ...exam,
    code: `EXM-2024-${String(index + 1).padStart(3, "0")}`,
    sessions: ["Morning"],
    status: exam.status === "Active" ? "Scheduled" : "Draft",
  }));
  const examinations = read(EXAMS_KEY, fallback).map(({ category, examCategory, ...exam }) => exam);
  write(EXAMS_KEY, examinations);
  return examinations;
}

export const pageConfig = {
  title: "Examination Management",
  subtitle: "Create examinations and publish subject-wise schedules.",
  breadcrumb: ["Examinations"],
};

export default function ExaminationPage() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [exams, setExams] = useState(safeExaminations);
  const [schedules, setSchedules] = useState(() => read(SCHEDULES_KEY, []));
  const [form, setForm] = useState(() => {
    const existing = id ? safeExaminations().find((exam) => String(exam.id) === id) : null;
    return existing
      ? {
          ...initialForm(),
          ...existing,
          sessions: existing.sessions || (existing.session ? [existing.session] : ["Morning"]),
        }
      : { ...initialForm(), code: makeCode(safeExaminations()) };
  });
  const [errors, setErrors] = useState({});
  const [selectedExam, setSelectedExam] = useState(null);
  const [scheduleExam, setScheduleExam] = useState(null);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState("");
  const isForm = Boolean(id) || location.pathname.endsWith("/add");

  useEffect(() => {
    const scheduleExamId = location.state?.scheduleExamId;
    if (isForm || !scheduleExamId) return;
    const exam = exams.find((item) => String(item.id) === String(scheduleExamId));
    if (!exam) return;
    setScheduleOpen(true);
    setScheduleExam(exam);
    setEditingScheduleId(null);
    setSchedule(initialSchedule());
    setScheduleError("");
    navigate(location.pathname, { replace: true, state: null });
  }, [exams, isForm, location.pathname, location.state, navigate]);

  const setValue = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const saveExam = (event) => {
    event.preventDefault();
    const nextErrors = {};
    ["code", "name", "board", "year", "level", "group", "type", "status"].forEach(
      (field) => {
        if (!form[field]) nextErrors[field] = "Required";
      },
    );
    if (!form.sessions?.length) nextErrors.sessions = "Select at least one exam session.";
    if (exams.some((exam) => exam.code === form.code && String(exam.id) !== String(id)))
      nextErrors.code = "Exam code must be unique.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const { session, start, end, registrationDeadline, hallTicketRelease, resultPublication, ...examForm } = form;
    const record = { ...examForm, id: id || Date.now() };
    const next = id
      ? exams.map((exam) => (String(exam.id) === String(id) ? record : exam))
      : [record, ...exams];
    setExams(next);
    write(EXAMS_KEY, next);
    setToast(`Examination ${id ? "updated" : "created"} successfully.`);
    navigate("/dashboard/examinations", { state: { scheduleExamId: record.id } });
  };

  const saveSchedule = (event) => {
    event.preventDefault();
    setScheduleError("");
    const subject = data.subjects.find((item) => String(item.id) === String(schedule.subjectId));
    if (
      !subject ||
      !schedule.date ||
      !schedule.startTime ||
      !schedule.endTime ||
      !schedule.invigilator
    )
      return setScheduleError("Complete all required schedule details.");
    if (!scheduleExam) return setScheduleError("Select an examination before creating a schedule.");
    if (schedule.endTime <= schedule.startTime)
      return setScheduleError("End time must be after start time.");
    const conflicts = schedules.filter(
      (item) =>
        item.id !== editingScheduleId &&
        item.examId !== scheduleExam.id &&
        item.date === schedule.date &&
        overlaps(schedule.startTime, schedule.endTime, item.startTime, item.endTime),
    );
    if (
      schedules.some(
        (item) =>
          item.id !== editingScheduleId &&
          item.examId === scheduleExam.id &&
          String(item.subjectId) === String(subject.id),
      )
    )
      return setScheduleError("This subject is already scheduled for this examination.");
    if (conflicts.some((item) => item.invigilator === schedule.invigilator))
      return setScheduleError("This invigilator already has an overlapping schedule.");
    const item = {
      ...schedule,
      id: editingScheduleId || Date.now(),
      examId: scheduleExam.id,
      examCode: scheduleExam.code,
      subjectId: subject.id,
      subject: subject.name,
      subjectCode: subject.code,
    };
    const next = editingScheduleId
      ? schedules.map((entry) => (entry.id === editingScheduleId ? item : entry))
      : [...schedules, item];
    setSchedules(next);
    write(SCHEDULES_KEY, next);
    setSchedule(initialSchedule());
    setEditingScheduleId(null);
    setToast(`Schedule ${editingScheduleId ? "updated" : "saved"} successfully.`);
  };

  const publish = async (exam) => {
    const confirmed = await confirm({
      title: "Publish examination schedule",
      message: `Publish the schedule for ${exam.name}?`,
      confirmLabel: "Publish",
    });
    if (!confirmed) return;
    const next = exams.map((item) =>
      item.id === exam.id ? { ...item, status: "Published" } : item,
    );
    setExams(next);
    write(EXAMS_KEY, next);
    setToast("Examination schedule published.");
  };

  if (isForm)
    return (
      <ExamForm
        form={form}
        errors={errors}
        setValue={setValue}
        saveExam={saveExam}
        navigate={navigate}
        editing={Boolean(id)}
      />
    );
  return (
    <DashboardLayout
      title="Examination Management"
      subtitle="Create examinations and publish subject-wise schedules."
      breadcrumb={["Examinations"]}
    >
      <div className="exam-page-actions">
        <button
          className="cms-btn cms-btn-primary"
          onClick={() => navigate("/dashboard/examinations/add")}
        >
          <Plus size={16} /> Create Examination
        </button>
        <button
          className="cms-btn cms-btn-ghost"
          onClick={() => {
            setScheduleOpen(true);
            setScheduleExam(null);
            setEditingScheduleId(null);
            setSchedule(initialSchedule());
            setScheduleError("");
          }}
        >
          <CalendarDays size={16} /> Create Schedule
        </button>
      </div>
      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Exam Code</th>
                <th>Exam Name</th>
                <th>Board</th>
                <th>Academic Year</th>
                <th>Level / Group</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.length ? (
                exams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="cms-strong">{exam.code}</td>
                    <td>
                      {exam.name}
                      <small className="exam-muted">{exam.type}</small>
                    </td>
                    <td>{exam.board}</td>
                    <td>{exam.year}</td>
                    <td>
                      {exam.level} / {exam.group}
                    </td>
                    <td>
                      <StatusBadge value={exam.status} />
                    </td>
                    <td>
                      <div className="cms-actions">
                        <button
                          className="cms-action-btn view"
                          title="View"
                          onClick={() => setSelectedExam(exam)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="cms-action-btn edit"
                          title="Edit"
                          onClick={() => navigate(`/dashboard/examinations/${exam.id}/edit`)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="cms-action-btn"
                          title="Schedule"
                          onClick={() => {
                            setScheduleOpen(true);
                            setScheduleExam(exam);
                            setEditingScheduleId(null);
                            setSchedule(initialSchedule());
                            setScheduleError("");
                          }}
                        >
                          <CalendarDays size={15} />
                        </button>
                        <button
                          className="cms-action-btn"
                          title="Publish"
                          onClick={() => publish(exam)}
                          disabled={exam.status === "Published"}
                        >
                          <ClipboardList size={15} />
                        </button>
                        <button
                          className="cms-action-btn danger"
                          title="Delete"
                          onClick={() => setDeleting(exam)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="cms-empty">
                      No examinations yet. Create an examination to begin scheduling.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {scheduleOpen && (
        <SchedulePanel
          exam={scheduleExam}
          exams={exams}
          schedules={schedules}
          schedule={schedule}
          setSchedule={setSchedule}
          error={scheduleError}
          onSave={saveSchedule}
          onExamChange={(examId) => {
            setScheduleExam(exams.find((exam) => String(exam.id) === String(examId)) || null);
            setSchedule((current) => ({ ...current, subjectId: "" }));
          }}
          editing={Boolean(editingScheduleId)}
          onClose={() => {
            setScheduleOpen(false);
            setScheduleExam(null);
            setEditingScheduleId(null);
            setSchedule(initialSchedule());
          }}
        />
      )}
      <h2 className="exam-schedule-heading">Saved Schedules</h2>
      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Examination</th>
                <th>Exam Code</th>
                <th>Subject</th>
                <th>Date & Time</th>
                <th>Invigilator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length ? (
                schedules.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {exams.find((exam) => exam.id === entry.examId)?.name || "Saved examination"}
                    </td>
                    <td>{entry.examCode}</td>
                    <td>
                      {entry.subject}
                      <small className="exam-muted">{entry.subjectCode}</small>
                    </td>
                    <td>
                      {entry.date}
                      <small className="exam-muted">
                        {entry.startTime} - {entry.endTime}
                      </small>
                    </td>
                    <td>{entry.invigilator}</td>
                    <td>
                      <div className="cms-actions">
                        <button
                          className="cms-action-btn edit"
                          title="Edit schedule"
                          onClick={() => {
                            setScheduleOpen(true);
                            setScheduleExam(exams.find((exam) => exam.id === entry.examId) || null);
                            setSchedule({ ...entry, subjectId: String(entry.subjectId) });
                            setEditingScheduleId(entry.id);
                            setScheduleError("");
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="cms-action-btn danger"
                          title="Delete schedule"
                          onClick={() => setDeletingSchedule(entry)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="cms-empty">
                      No schedules saved yet. Select Create Schedule to begin.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedExam && (
        <ExamDetails
          exam={selectedExam}
          schedules={schedules}
          onClose={() => setSelectedExam(null)}
        />
      )}
      {confirmationDialog}
      {deleting && (
        <ConfirmDialog
          message={`Delete "${deleting.name}" and its saved schedules?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const next = exams.filter((exam) => exam.id !== deleting.id);
            setExams(next);
            write(EXAMS_KEY, next);
            const remaining = schedules.filter((item) => item.examId !== deleting.id);
            setSchedules(remaining);
            write(SCHEDULES_KEY, remaining);
            setDeleting(null);
            setToast("Examination deleted.");
          }}
        />
      )}
      {deletingSchedule && (
        <ConfirmDialog
          title="Delete schedule"
          message={`Delete the ${deletingSchedule.subject} schedule?`}
          onCancel={() => setDeletingSchedule(null)}
          onConfirm={() => {
            const next = schedules.filter((entry) => entry.id !== deletingSchedule.id);
            setSchedules(next);
            write(SCHEDULES_KEY, next);
            setDeletingSchedule(null);
            setToast("Schedule deleted.");
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function ExamForm({ form, errors, setValue, saveExam, navigate, editing }) {
  const fields = [
    ["name", "Exam Name"],
    ["code", "Exam Code"],
    ["board", "Board", data.options.board],
    ["year", "Academic Year", data.options.year],
    ["level", "Academic Level", data.options.level],
    ["group", "Group", data.options.group],
    [
      "type",
      "Exam Type",
      ["Internal", "Quarterly", "Half-Yearly", "Annual", "Semester", "Supplementary"],
    ],
    [
      "status",
      "Exam Status",
      ["Draft", "Scheduled", "Published", "Ongoing", "Completed", "Cancelled"],
    ],
  ];
  return (
    <DashboardLayout
      title={`${editing ? "Edit" : "Create"} Examination`}
      subtitle="Set the examination details and workflow state."
      breadcrumb={["Examinations"]}
    >
      <form className="cms-form-page examination-form-page" onSubmit={saveExam}>
        <div className="cms-card">
          <div className="cms-card-body">
            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <h2>Examination Information</h2>
                <p>Identification, academic configuration and workflow state.</p>
              </div>
              <div className="cms-form-grid cols-3">
                {fields.map(([name, label, options]) => (
                  <FormControl
                    key={name}
                    name={name}
                    label={label}
                    value={form[name]}
                    options={options}
                    error={errors[name]}
                    onChange={setValue}
                  />
                ))}
                <div className="cms-field">
                  <label>Exam Sessions</label>
                  <div className="exam-toggles">
                    {["Morning", "Afternoon"].map((session) => (
                      <label key={session}>
                        <input
                          type="checkbox"
                          checked={(form.sessions || []).includes(session)}
                          onChange={(event) =>
                            setValue(
                              "sessions",
                              event.target.checked
                                ? [...(form.sessions || []), session]
                                : (form.sessions || []).filter((item) => item !== session),
                            )
                          }
                        />{" "}
                        {session}
                      </label>
                    ))}
                  </div>
                  {errors.sessions && <span className="cms-error">{errors.sessions}</span>}
                </div>
              </div>
            </section>
            <section className="cms-form-section">
              {/*
                        <small>
                          {subject.code} · {subject.type} · Max {subject.max} · Pass {subject.pass}
                        </small>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="cms-empty">
                    Choose board, academic level and group to see eligible subjects.
                  </div>
                )}
              </div>
              */}
            </section>
            <div className="cms-form-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => navigate("/dashboard/examinations")}
              >
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" type="submit">
                {editing ? "Update Examination" : "Save Examination"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
function FormControl({ name, label, value, options, type = "text", error, onChange }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`exam-${name}`}>{label}</label>
      {options ? (
        <select
          id={`exam-${name}`}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map((option) => {
            const optionValue = typeof option === "object" ? option.value : option;
            return (
              <option key={optionValue} value={optionValue}>
                {typeof option === "object" ? option.label : option}
              </option>
            );
          })}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={`exam-${name}`}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          id={`exam-${name}`}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}
function ExamDetails({ exam, schedules, onClose }) {
  const entries = schedules.filter((item) => item.examId === exam.id);
  return (
    <Modal title="Examination Details" onClose={onClose}>
      <div className="exam-detail-summary">
        <div>
          <span>Exam code</span>
          <strong>{exam.code}</strong>
        </div>
        <div>
          <span>Academic setup</span>
          <strong>
            {exam.board} · {exam.year} · {exam.level} · {exam.group}
          </strong>
        </div>
        <div>
          <span>Status</span>
          <StatusBadge value={exam.status} />
        </div>
      </div>
      <div className="exam-summary">
        <span>
          Scheduled subjects: <strong>{entries.length}</strong>
        </span>
        <span>
          Examination status: <strong>{exam.status}</strong>
        </span>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {entry.subject}
                    <small className="exam-muted">{entry.subjectCode}</small>
                  </td>
                  <td>{entry.date}</td>
                  <td>
                    {entry.startTime} - {entry.endTime}
                  </td>
                  <td>
                    <StatusBadge value={entry.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">
                  <div className="cms-empty">No subjects are scheduled yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
function SchedulePanel({
  exam,
  exams,
  schedules,
  schedule,
  setSchedule,
  error,
  onSave,
  onExamChange,
  editing,
  onClose,
}) {
  const subjects = exam ? data.subjects.filter((subject) => subject.status !== "Inactive") : [];
  const entries = exam ? schedules.filter((item) => item.examId === exam.id) : [];
  const selectedSubject = data.subjects.find(
    (subject) => String(subject.id) === String(schedule.subjectId),
  );
  const change = (name, value) => setSchedule((current) => ({ ...current, [name]: value }));
  return (
    <section
      className="exam-schedule-panel"
      title={editing ? `Edit Schedule · ${exam?.name || ""}` : "Create Schedule"}
    >
      <div className="cms-form-section-heading">
        <div>
          <h2>{editing ? "Edit Schedule" : "Create Schedule"}</h2>
          <p>Schedule a subject for the selected examination.</p>
        </div>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
      <form onSubmit={onSave}>
        <p className="exam-schedule-context">
          {exam
            ? `${exam.code} · ${exam.name}`
            : "Select an examination to load its exam code and subjects."}
        </p>
        {error && <p className="cms-error">{error}</p>}
        <div className="cms-form-grid">
          <FormControl
            name="examination"
            label="Examination"
            value={exam?.id || ""}
            options={exams.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(_, value) => onExamChange(value)}
          />
          <div className="cms-field">
            <label>Exam Code</label>
            <input value={exam?.code || ""} readOnly />
          </div>
          <FormControl
            name="subjectId"
            label="Subject"
            value={schedule.subjectId}
            options={subjects
              .filter(
                (subject) =>
                  !entries.some((entry) => entry.subjectId === subject.id) ||
                  String(subject.id) === String(schedule.subjectId),
              )
              .map((subject) => ({
                value: subject.id,
                label: `${subject.name} (${subject.code})`,
              }))}
            onChange={change}
          />
          <div className="cms-field">
            <label>Subject Code</label>
            <input value={selectedSubject?.code || ""} readOnly />
          </div>
          <FormControl
            name="date"
            label="Exam Date"
            value={schedule.date}
            type="date"
            onChange={change}
          />
          <FormControl
            name="startTime"
            label="Start Time"
            value={schedule.startTime}
            type="time"
            onChange={change}
          />
          <FormControl
            name="endTime"
            label="End Time"
            value={schedule.endTime}
            type="time"
            onChange={change}
          />
          <FormControl
            name="duration"
            label="Duration"
            value={schedule.duration}
            onChange={change}
          />
          <FormControl
            name="invigilator"
            label="Invigilator"
            value={schedule.invigilator}
            options={data.options.faculty}
            onChange={change}
          />
          <FormControl
            name="status"
            label="Schedule Status"
            value={schedule.status}
            options={["Draft", "Scheduled", "Published", "Completed", "Cancelled"]}
            onChange={change}
          />
        </div>
        <div className="cms-form-actions">
          <button className="cms-btn cms-btn-primary" type="submit">
            Save Schedule
          </button>
        </div>
      </form>
      <h4 className="exam-schedule-heading">Saved schedules</h4>
      {entries.length ? (
        <ul className="exam-schedule-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.subject}</strong> — {entry.date}, {entry.startTime}-{entry.endTime}
            </li>
          ))}
        </ul>
      ) : (
        <div className="cms-empty">No schedules saved for this examination.</div>
      )}
    </section>
  );
}
