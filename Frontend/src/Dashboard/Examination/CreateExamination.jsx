import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { routePaths } from "../../routes/routePaths";
import "./CreateExamination.css";

const EXAMINATIONS_STORAGE_KEY = "cms_examinations";
const BOARDS = [
  "Andhra Pradesh Board of Intermediate Education (BIEAP)",
  "Telangana State Board of Intermediate Education (TSBIE)",
  "CBSE",
  "CISCE",
  "NIOS",
  "Karnataka PUE",
  "Tamil Nadu HSE",
  "Kerala DHSE",
  "Maharashtra HSC",
  "Gujarat HSC",
  "Rajasthan Board",
  "Punjab School Education Board",
  "Haryana Board",
  "Odisha CHSE",
  "West Bengal HS",
  "Assam AHSEC",
  "Bihar BSEB",
  "Uttar Pradesh Board",
  "Other",
];
const ACADEMIC_YEARS = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];
const ACADEMIC_LEVELS = ["Intermediate 1st Year", "Intermediate 2nd Year"];
const GROUPS = ["MPC", "BiPC", "MEC", "CEC", "HEC"];
const EXAM_TYPES = [
  "Unit Test",
  "Monthly Test",
  "Quarterly",
  "Half Yearly",
  "Pre Final",
  "Annual",
  "Practical",
  "Supplementary",
  "Internal Assessment",
  "Model Exam",
  "Other",
];
const STATUSES = ["Active", "Draft", "Completed"];

const SUBJECT_MAPPING = {
  "Intermediate 1st Year": {
    MPC: ["English", "Second Language", "Mathematics IA", "Mathematics IB", "Physics", "Chemistry"],
    BiPC: ["English", "Second Language", "Botany", "Zoology", "Physics", "Chemistry"],
    MEC: ["English", "Second Language", "Mathematics", "Economics", "Commerce"],
    CEC: ["English", "Second Language", "Civics", "Economics", "Commerce"],
    HEC: ["English", "Second Language", "History", "Economics", "Civics"],
  },
  "Intermediate 2nd Year": {
    MPC: ["English", "Second Language", "Mathematics IIA", "Mathematics IIB", "Physics", "Chemistry"],
    BiPC: ["English", "Second Language", "Botany", "Zoology", "Physics", "Chemistry"],
    MEC: ["English", "Second Language", "Mathematics", "Economics", "Commerce"],
    CEC: ["English", "Second Language", "Civics", "Economics", "Commerce"],
    HEC: ["English", "Second Language", "History", "Economics", "Civics"],
  },
};

const SUBJECT_CODE_PREFIXES = {
  English: "ENG",
  "Second Language": "SL",
  "Mathematics IA": "MIA",
  "Mathematics IB": "MIB",
  "Mathematics IIA": "MIIA",
  "Mathematics IIB": "MIIB",
  Mathematics: "MAT",
  Physics: "PHY",
  Chemistry: "CHE",
  Botany: "BOT",
  Zoology: "ZOO",
  Economics: "ECO",
  Commerce: "COM",
  Civics: "CIV",
  History: "HIS",
};

const createInitialForm = () => ({
  examCode: generateExamCode(),
  examName: "",
  board: "",
  academicYear: "",
  academicLevel: "",
  group: "",
  examType: "",
  status: "",
  startDate: "",
  endDate: "",
});

export default function CreateExamination() {
  const navigate = useNavigate();
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [subjectEditErrors, setSubjectEditErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "subjectName", direction: "asc" });
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSubjects = subjects.filter((subject) => selectedSubjectIds.includes(subject.id));
  const totalMaximumMarks = selectedSubjects.reduce(
    (total, subject) => total + Number(subject.maximumMarks),
    0,
  );
  const totalPassMarks = selectedSubjects.reduce(
    (total, subject) => total + Number(subject.passMarks),
    0,
  );
  const filteredSubjects = subjects
    .filter((subject) =>
      `${subject.subjectCode} ${subject.subjectName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
    .sort((first, second) => {
      const firstValue = String(first[sortConfig.key]).toLowerCase();
      const secondValue = String(second[sortConfig.key]).toLowerCase();
      const comparison = firstValue.localeCompare(secondValue, undefined, { numeric: true });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

  const setField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setErrors((current) => ({ ...current, [field]: "" }));

    if (field === "academicLevel" || field === "group") {
      setSubjects(createSubjects(nextForm.academicLevel, nextForm.group));
      setSelectedSubjectIds([]);
      setEditingSubjectId(null);
      setEditedValues({});
      setSubjectEditErrors({});
    }
  };

  const validate = () => {
    const nextErrors = {};
    ["examName", "board", "academicYear", "academicLevel", "group", "examType", "status", "startDate", "endDate"].forEach((field) => {
      if (!form[field].trim()) nextErrors[field] = "This field is required.";
    });

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = "End date cannot be before start date.";
    }
    if (!selectedSubjectIds.length) {
      nextErrors.subjects = "Select at least one subject.";
    }
    if (selectedSubjects.some((subject) => Number(subject.maximumMarks) <= Number(subject.passMarks))) {
      nextErrors.subjects = "Maximum marks must be greater than pass marks for every selected subject.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const examination = {
      id: createId(),
      ...form,
      subjects: selectedSubjects,
    };
    const examinations = readExaminations();
    localStorage.setItem(EXAMINATIONS_STORAGE_KEY, JSON.stringify([...examinations, examination]));

    setSuccessMessage("Examination created successfully.");
    window.setTimeout(() => {
      navigate(routePaths.examSchedule, { state: { examination } });
    }, 700);
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setErrors({});
    setSubjects([]);
    setSelectedSubjectIds([]);
    setEditingSubjectId(null);
    setEditedValues({});
    setSubjectEditErrors({});
    setSearchTerm("");
    setSuccessMessage("");
  };

  const hasUnsavedChanges = Boolean(
    form.examName || form.board || form.academicYear || form.academicLevel || form.group ||
    form.examType || form.status || form.startDate || form.endDate || selectedSubjectIds.length ||
    subjects.some((subject) => subject.maximumMarks !== "100" || subject.passMarks !== "35"),
  );

  const handleReset = () => {
    if (window.confirm("Reset all examination information and subject selections?")) resetForm();
  };

  const handleCancel = () => {
    if (!hasUnsavedChanges || window.confirm("You have unsaved changes. Do you want to cancel?")) {
      resetForm();
    }
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );
  };

  const toggleAllSubjects = () => {
    setSelectedSubjectIds((current) =>
      current.length === subjects.length ? [] : subjects.map((subject) => subject.id),
    );
  };

  const startEditing = (subject) => {
    setEditingSubjectId(subject.id);
    setEditedValues({ maximumMarks: subject.maximumMarks, passMarks: subject.passMarks });
    setSubjectEditErrors({});
  };

  const saveSubject = (subjectId) => {
    const nextErrors = {};
    const maximumMarks = Number(editedValues.maximumMarks);
    const passMarks = Number(editedValues.passMarks);

    if (!editedValues.maximumMarks?.trim() || maximumMarks <= 0) {
      nextErrors.maximumMarks = "Enter maximum marks greater than zero.";
    }
    if (!editedValues.passMarks?.trim() || passMarks < 0) {
      nextErrors.passMarks = "Enter valid pass marks.";
    } else if (passMarks >= maximumMarks) {
      nextErrors.passMarks = "Pass marks must be less than maximum marks.";
    }
    if (Object.keys(nextErrors).length) {
      setSubjectEditErrors(nextErrors);
      return;
    }

    setSubjects((current) => current.map((subject) =>
      subject.id === subjectId ? { ...subject, ...editedValues } : subject,
    ));
    setEditingSubjectId(null);
    setEditedValues({});
    setSubjectEditErrors({});
  };

  const requestSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <section className="createExamination">
      <PageHeader
        title="Create Examination"
        subtitle="Dashboard / Examination / Create Examination"
      />

      {successMessage ? <div className="createExaminationToast">{successMessage}</div> : null}

      <section className="createExaminationTopSummary" aria-label="Examination summary">
        <SummaryCard label="Total Subjects" value={subjects.length} />
        <SummaryCard label="Selected Subjects" value={`${selectedSubjectIds.length} of ${subjects.length}`} tone="success" />
        <SummaryCard label="Exam Duration" value={getDuration(form.startDate, form.endDate)} tone="accent" />
      </section>

      <form className="createExaminationForm" noValidate onSubmit={handleSubmit}>
        <Card className="createExaminationCard">
          <SectionTitle title="Examination Information" />
          <div className="createExaminationGrid">
            <ReadOnlyField label="Exam Code" value={form.examCode} />
            <SelectField label="Group" field="group" placeholder="Select group" options={GROUPS} form={form} errors={errors} setField={setField} />
            <TextField label="Exam Name" field="examName" placeholder="Enter examination name" form={form} errors={errors} setField={setField} />
            <SelectField label="Exam Type" field="examType" placeholder="Select exam type" options={EXAM_TYPES} form={form} errors={errors} setField={setField} />
            <SelectField label="Board" field="board" placeholder="Select board" options={BOARDS} form={form} errors={errors} setField={setField} />
            <DateField label="Start Date" field="startDate" form={form} errors={errors} setField={setField} />
            <SelectField label="Academic Year" field="academicYear" placeholder="Select academic year" options={ACADEMIC_YEARS} form={form} errors={errors} setField={setField} />
            <DateField label="End Date" field="endDate" form={form} errors={errors} setField={setField} />
            <SelectField label="Academic Level" field="academicLevel" placeholder="Select academic level" options={ACADEMIC_LEVELS} form={form} errors={errors} setField={setField} />
            <SelectField label="Status" field="status" placeholder="Select status" options={STATUSES} form={form} errors={errors} setField={setField} />
          </div>
        </Card>

        <Card className="createExaminationSubjectsCard" padded={false}>
          <div className="createExaminationSubjectsHeader">
            <div>
              <SectionTitle title="Subject Allocation" />
              <p>Selected Subjects: {selectedSubjectIds.length} of {subjects.length}</p>
            </div>
            <input
              className="input createExaminationSearch"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search subjects..."
              aria-label="Search subjects"
            />
          </div>
          {errors.subjects ? <p className="createExaminationSubjectsError">{errors.subjects}</p> : null}

          <DataTable
            columns={[
              {
                key: "selection",
                label: (
                  <label className="createExaminationSelectAll">
                    <input type="checkbox" checked={subjects.length > 0 && selectedSubjectIds.length === subjects.length} onChange={toggleAllSubjects} />
                    <span>Select All</span>
                  </label>
                ),
                render: (row) => <input aria-label={`Select ${row.subjectName}`} type="checkbox" checked={selectedSubjectIds.includes(row.id)} onChange={() => toggleSubject(row.id)} />,
              },
              {
                key: "subjectCode",
                label: <SortButton label="Subject Code" field="subjectCode" sortConfig={sortConfig} requestSort={requestSort} />,
                render: (row) => <span className="createExaminationCode">{row.subjectCode}</span>,
              },
              {
                key: "subjectName",
                label: <SortButton label="Subject Name" field="subjectName" sortConfig={sortConfig} requestSort={requestSort} />,
                render: (row) => <strong>{row.subjectName}</strong>,
              },
              {
                key: "maximumMarks",
                label: "Maximum Marks",
                render: (row) => editingSubjectId === row.id ? (
                  <InlineNumber field="maximumMarks" value={editedValues.maximumMarks} error={subjectEditErrors.maximumMarks} setEditedValues={setEditedValues} />
                ) : row.maximumMarks,
              },
              {
                key: "passMarks",
                label: "Pass Marks",
                render: (row) => editingSubjectId === row.id ? (
                  <InlineNumber field="passMarks" value={editedValues.passMarks} error={subjectEditErrors.passMarks} setEditedValues={setEditedValues} />
                ) : row.passMarks,
              },
              {
                key: "action",
                label: "Action",
                render: (row) => editingSubjectId === row.id ? (
                  <div className="createExaminationRowActions">
                    <Button type="button" variant="primary" onClick={() => saveSubject(row.id)}>Save</Button>
                    <Button type="button" onClick={() => setEditingSubjectId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button type="button" onClick={() => startEditing(row)}>Edit</Button>
                ),
              },
            ]}
            rows={filteredSubjects}
            empty={<EmptyState title="Select academic level and group" message="Matching subjects will be loaded automatically." />}
          />
        </Card>

        <Card className="createExaminationSummaryCard">
          <SectionTitle title="Examination Summary" />
          <div className="createExaminationSummaryGrid">
            <SummaryCard label="Total Subjects" value={subjects.length} />
            <SummaryCard label="Total Maximum Marks" value={totalMaximumMarks} tone="accent" />
            <SummaryCard label="Total Pass Marks" value={totalPassMarks} tone="success" />
            <SummaryCard label="Exam Duration" value={getDuration(form.startDate, form.endDate)} tone="warning" />
          </div>
        </Card>

        <div className="createExaminationActions">
          <Button type="button" onClick={handleCancel}>Cancel</Button>
          <Button type="button" onClick={handleReset}>Reset</Button>
          <Button type="submit" variant="primary">Create Examination</Button>
        </div>
      </form>
    </section>
  );
}

function SectionTitle({ title }) {
  return <h2 className="createExaminationSectionTitle">{title}</h2>;
}

function SummaryCard({ label, value, tone = "default" }) {
  return <div className={`createExaminationMetric createExaminationMetric-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function ReadOnlyField({ label, value }) {
  return <FormField label={label}><input className="input createExaminationReadonly" value={value} readOnly /></FormField>;
}

function TextField({ label, field, placeholder, form, errors, setField }) {
  return <FormField label={<>{label} <b>*</b></>} error={errors[field]}><input className="input" type="text" value={form[field]} onChange={(event) => setField(field, event.target.value)} placeholder={placeholder} required /></FormField>;
}

function DateField({ label, field, form, errors, setField }) {
  return <FormField label={<>{label} <b>*</b></>} error={errors[field]}><input className="input" type="date" value={form[field]} onChange={(event) => setField(field, event.target.value)} required /></FormField>;
}

function SelectField({ label, field, placeholder, options, form, errors, setField }) {
  return <FormField label={<>{label} <b>*</b></>} error={errors[field]}><select className="select" value={form[field]} onChange={(event) => setField(field, event.target.value)} required><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormField>;
}

function SortButton({ label, field, sortConfig, requestSort }) {
  const direction = sortConfig.key === field ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";
  return <button className="createExaminationSortButton" type="button" onClick={() => requestSort(field)}>{label} {direction}</button>;
}

function InlineNumber({ field, value, error, setEditedValues }) {
  return <div className="createExaminationInlineField"><input className="input createExaminationMarksInput" type="number" min="0" value={value} onChange={(event) => setEditedValues((current) => ({ ...current, [field]: event.target.value }))} />{error ? <span className="field-error">{error}</span> : null}</div>;
}

function createSubjects(academicLevel, group) {
  const yearCode = academicLevel.includes("1st") ? "101" : "201";
  return (SUBJECT_MAPPING[academicLevel]?.[group] || []).map((subjectName) => ({
    id: `${academicLevel}-${group}-${subjectName}`,
    subjectCode: `${SUBJECT_CODE_PREFIXES[subjectName]}${yearCode}`,
    subjectName,
    maximumMarks: "100",
    passMarks: "35",
  }));
}

function getDuration(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return "—";
  const duration = Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1;
  return `${duration} day${duration === 1 ? "" : "s"}`;
}

function generateExamCode() {
  return `EX-${Date.now().toString().slice(-6)}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readExaminations() {
  try {
    const storedExaminations = JSON.parse(localStorage.getItem(EXAMINATIONS_STORAGE_KEY) || "[]");
    return Array.isArray(storedExaminations) ? storedExaminations : [];
  } catch {
    return [];
  }
}
