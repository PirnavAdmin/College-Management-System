import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { routePaths } from "../../routes/routePaths";
import "./ExamSchedule.css";

const SCHEDULES_STORAGE_KEY = "cms_exam_schedules";
const EXAMINATIONS_STORAGE_KEY = "cms_examinations";

const initialForm = {
  examId: "",
  examCode: "",
  examName: "",
  board: "",
  academicYear: "",
  academicLevel: "",
  group: "",
  examType: "",
  subject: "",
  examDate: "",
  startTime: "",
  endTime: "",
  roomNumber: "",
  invigilator: "",
};

export default function ExamSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(() =>
    location.state?.examination
      ? createExaminationForm(location.state.examination)
      : initialForm,
  );
  const [errors, setErrors] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSchedules(readStorage(SCHEDULES_STORAGE_KEY));
    setExaminations(readStorage(EXAMINATIONS_STORAGE_KEY));
  }, []);

  const selectedExamination = examinations.find(
    (examination) => examination.id === form.examId,
  );
  const availableSubjects = selectedExamination?.subjects || [];
  const examinationSchedules = schedules.filter(
    (schedule) => schedule.examId === form.examId,
  );
  const filteredSchedules = examinationSchedules.filter((schedule) =>
    schedule.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const scheduledCount = examinationSchedules.filter(
    (schedule) => (schedule.status || "Scheduled") === "Scheduled",
  ).length;
  const pendingCount = Math.max(availableSubjects.length - scheduledCount, 0);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    ["subject", "examDate", "startTime", "endTime", "roomNumber", "invigilator"].forEach(
      (field) => {
        if (!form[field].trim()) nextErrors[field] = "This field is required.";
      },
    );

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveSchedules = (nextSchedules) => {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(nextSchedules));
    setSchedules(nextSchedules);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const existingSchedule = schedules.find((schedule) => schedule.id === editingScheduleId);
    const schedule = {
      id: editingScheduleId || createScheduleId(),
      ...form,
      status: existingSchedule?.status || "Scheduled",
    };
    const nextSchedules = editingScheduleId
      ? schedules.map((item) => (item.id === editingScheduleId ? schedule : item))
      : [...schedules, schedule];

    saveSchedules(nextSchedules);
    resetScheduleDetails();
  };

  const handleEdit = (schedule) => {
    setForm((current) => ({ ...current, ...schedule }));
    setEditingScheduleId(schedule.id);
    setErrors({});
  };

  const handleDelete = (schedule) => {
    if (!window.confirm(`Delete the ${schedule.subject} schedule?`)) return;

    saveSchedules(schedules.filter((item) => item.id !== schedule.id));
    if (editingScheduleId === schedule.id) resetScheduleDetails();
  };

  const resetScheduleDetails = () => {
    setForm((current) => ({
      ...current,
      subject: "",
      examDate: "",
      startTime: "",
      endTime: "",
      roomNumber: "",
      invigilator: "",
    }));
    setErrors({});
    setEditingScheduleId(null);
  };

  if (!examinations.length) {
    return (
      <section className="examSchedule">
        <PageHeader title="Exam Schedule" subtitle="Schedule subjects for a created examination." />
        <Card className="examScheduleEmptyCard">
          <EmptyState
            title="No examination has been created yet."
            message="Please create an examination first."
          />
          <div className="examScheduleEmptyAction">
            <Button type="button" variant="primary" onClick={() => navigate(routePaths.examinations)}>
              Go to Create Examination
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="examSchedule">
      <PageHeader
        title="Exam Schedule"
        subtitle="Dashboard / Examination / Exam Schedule"
      />

      <Card className="examScheduleInfoCard">
        <SectionTitle title="Examination Information" />
        <div className="examScheduleInfoGrid">
          <InfoItem label="Exam Code" value={form.examCode} />
          <InfoItem label="Exam Name" value={form.examName} />
          <InfoItem label="Board" value={form.board} />
          <InfoItem label="Academic Year" value={form.academicYear} />
          <InfoItem label="Academic Level" value={form.academicLevel} />
          <InfoItem label="Group" value={form.group} />
          <InfoItem label="Exam Type" value={form.examType} />
        </div>
      </Card>

      <Card className="examScheduleCard">
        <SectionTitle title="Schedule Details" />
        <form className="examScheduleForm" noValidate onSubmit={handleSubmit}>
          <div className="examScheduleGrid">
            <FormField label={<>Subject <b>*</b></>} error={errors.subject}>
              <select
                className="select"
                value={form.subject}
                onChange={(event) => setField("subject", event.target.value)}
                disabled={!form.examId}
                required
              >
                <option value="">Select a subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id || subject.subjectCode} value={subject.subjectName}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
            </FormField>

            <ScheduleInput label="Exam Date" field="examDate" type="date" form={form} errors={errors} setField={setField} />
            <ScheduleInput label="Start Time" field="startTime" type="time" form={form} errors={errors} setField={setField} />
            <ScheduleInput label="End Time" field="endTime" type="time" form={form} errors={errors} setField={setField} />
            <ScheduleInput label="Room Number" field="roomNumber" type="text" placeholder="Enter room number" form={form} errors={errors} setField={setField} />
            <ScheduleInput label="Invigilator" field="invigilator" type="text" placeholder="Enter invigilator name" form={form} errors={errors} setField={setField} />
          </div>

          <div className="examScheduleActions">
            <Button type="button" onClick={resetScheduleDetails}>Reset</Button>
            <Button type="submit" variant="primary">
              {editingScheduleId ? "Update Schedule" : "Save Schedule"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="examScheduleSummary" aria-label="Schedule summary">
        <SummaryCard label="Total Subjects" value={availableSubjects.length} />
        <SummaryCard label="Scheduled" value={scheduledCount} tone="success" />
        <SummaryCard label="Pending" value={pendingCount} tone="pending" />
      </section>

      <Card className="examScheduleTableCard" padded={false}>
        <div className="examScheduleTableHeader">
          <SectionTitle title="Scheduled Subjects" />
          <input
            className="input examScheduleSearch"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by Subject..."
            aria-label="Search by subject"
          />
        </div>

        <DataTable
          columns={[
            {
              key: "subjectCode",
              label: "Subject Code",
              render: (row) => getSubjectCode(row, availableSubjects),
            },
            { key: "subject", label: "Subject Name" },
            { key: "examDate", label: "Exam Date", render: (row) => formatDate(row.examDate) },
            { key: "startTime", label: "Start Time" },
            { key: "endTime", label: "End Time" },
            { key: "roomNumber", label: "Room Number" },
            { key: "invigilator", label: "Invigilator" },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status || "Scheduled"} />,
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <div className="examScheduleRowActions">
                  <Button type="button" onClick={() => handleEdit(row)}>Edit</Button>
                  <Button type="button" variant="ghost" onClick={() => handleDelete(row)}>Delete</Button>
                </div>
              ),
            },
          ]}
          rows={filteredSchedules}
          empty={<EmptyState title="No scheduled subjects" message="Add subject schedules using the form above." />}
        />
      </Card>
    </section>
  );
}

function SectionTitle({ title }) {
  return <h2 className="examScheduleSectionTitle">{title}</h2>;
}

function InfoItem({ label, value }) {
  return (
    <div className="examScheduleInfoItem">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Card className={`examScheduleSummaryCard examScheduleSummaryCard-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

function StatusBadge({ status }) {
  const statusClass = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`examScheduleStatus examScheduleStatus-${statusClass}`}>{status}</span>;
}

function ScheduleInput({ label, field, type, placeholder = "", form, errors, setField }) {
  return (
    <FormField label={<>{label} <b>*</b></>} error={errors[field]}>
      <input
        className="input"
        type={type}
        value={form[field]}
        onChange={(event) => setField(field, event.target.value)}
        placeholder={placeholder}
        required
      />
    </FormField>
  );
}

function createExaminationForm(examination) {
  return {
    ...initialForm,
    examId: examination.id,
    examCode: examination.examCode,
    examName: examination.examName,
    board: examination.board,
    academicYear: examination.academicYear,
    academicLevel: examination.academicLevel,
    group: examination.group,
    examType: examination.examType,
  };
}

function getSubjectCode(schedule, subjects) {
  return subjects.find((subject) => subject.subjectName === schedule.subject)?.subjectCode || "—";
}

function readStorage(key) {
  try {
    const storedData = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(storedData) ? storedData : [];
  } catch {
    return [];
  }
}

function createScheduleId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
