import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Eye,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import {
  ConfirmDialog,
  Field,
  Modal,
  StatusBadge,
  Toast,
  useForm,
} from "@/components/common/Ui.jsx";
import "./FacultyManagementPage.css";

const fields = [
  { name: "empId", label: "Employee ID", required: true },
  { name: "firstName", label: "First Name", required: true },
  { name: "lastName", label: "Last Name", required: true },
  { name: "gender", label: "Gender", type: "select", options: [], required: true },
  { name: "dob", label: "Date of Birth", type: "date", required: true },
  { name: "aadhaar", label: "Aadhaar Number" },
  { name: "mobile", label: "Mobile", type: "tel", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "bloodGroup", label: "Blood Group" },
  { name: "qualification", label: "Qualification", required: true },
  { name: "designation", label: "Designation", required: true },
  {
    name: "facultyType",
    label: "Faculty Type",
    type: "select",
    options: ["Teaching Staff", "Non-Teaching Staff"],
    required: true,
  },
  { name: "department", label: "Department", type: "select", options: [], required: true },
  { name: "joining", label: "Joining Date", type: "date", required: true },
  { name: "experience", label: "Experience (years)", type: "number" },
];
const extractItems = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.$values ||
      payload?.items ||
      payload?.Items ||
      payload?.results ||
      payload?.Results ||
      payload?.value ||
      payload?.Value ||
      payload?.data?.$values ||
      payload?.data?.items ||
      payload?.data?.Items ||
      payload?.data?.results ||
      payload?.data?.Results ||
      payload?.data?.value ||
      payload?.data?.Value ||
      payload?.data ||
      [];
const extractRecord = (payload) => payload?.data ?? payload?.Data ?? payload;
const facultyName = (item = {}) =>
  item?.fullName || item?.name || [item?.firstName, item?.lastName].filter(Boolean).join(" ") || "Unsaved faculty";
const dateOnly = (date) => (date ? String(date).split("T")[0] : "");
const facultyId = (item = {}) => item.facultyId ?? item.id ?? item.FacultyId ?? item.Id;
const firstValue = (item = {}, ...keys) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "") ??
  Object.entries(item || {}).find(([key, value]) =>
    keys.some((expected) => key.toLowerCase() === expected.toLowerCase()) &&
    value !== undefined && value !== null && value !== "",
  )?.[1];
const lookupValue = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== "object") return value;
  return firstValue(value, "name", "Name", "value", "Value", "bloodGroup", "BloodGroup", "bloodType", "BloodType", "bloodGroupName", "BloodGroupName", "facultyTypeName", "FacultyTypeName", "typeName", "TypeName") ?? "";
};
const facultyTypeValue = (item = {}) => {
  const value = lookupValue(firstValue(item, "facultyType", "FacultyType", "facultyTypeName", "FacultyTypeName", "type", "Type"));
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "teaching" || normalized === "teachingstaff") return "Teaching Staff";
  if (normalized === "nonteaching" || normalized === "nonteachingstaff") return "Non-Teaching Staff";
  return value ?? "";
};
const subjectId = (item = {}) => item.subjectId ?? item.id ?? item.SubjectId ?? item.Id;
const subjectName = (item = {}) =>
  item.subjectName || item.name || item.SubjectName || "Unnamed subject";
const allocationId = (item = {}) =>
  item.assignmentId ?? item.allocationId ?? item.id ?? item.AssignmentId ?? item.AllocationId;
const payloadFor = (values) => ({
  employeeId: values.empId,
  firstName: values.firstName,
  lastName: values.lastName,
  gender: values.gender,
  dateOfBirth: values.dob,
  aadhaar: values.aadhaar,
  mobile: values.mobile,
  email: values.email,
  bloodGroup: values.bloodGroup,
  qualification: values.qualification,
  designation: values.designation,
  facultyType: values.facultyType,
  department: values.department,
  joiningDate: values.joining,
  experience: Number(values.experience) || 0,
  status: values.status || "Active",
});
const rowFor = (item) => ({
  ...item,
  id: facultyId(item),
  empId: item.employeeId ?? item.employeeCode ?? item.empId,
  name: facultyName(item),
  mobile: item.mobile ?? item.phoneNumber,
  status:
    typeof item.status === "boolean"
      ? item.status
        ? "Active"
        : "Inactive"
      : item.status || "Active",
  department: item.department,
  designation: item.designation,
});
const valuesFor = (item = {}) => ({
  empId: firstValue(item, "employeeId", "EmployeeId", "employeeCode", "EmployeeCode", "empId", "EmpId"),
  firstName: firstValue(item, "firstName", "FirstName"),
  lastName: firstValue(item, "lastName", "LastName"),
  gender: lookupValue(firstValue(item, "gender", "Gender")),
  dob: dateOnly(firstValue(item, "dateOfBirth", "DateOfBirth", "dob", "Dob")),
  aadhaar: firstValue(item, "aadhaar", "Aadhaar", "aadhaarNumber", "AadhaarNumber"),
  mobile: firstValue(item, "mobile", "Mobile", "phoneNumber", "PhoneNumber"),
  email: firstValue(item, "email", "Email"),
  bloodGroup: lookupValue(firstValue(item, "bloodGroup", "BloodGroup", "bloodGroupName", "BloodGroupName", "bloodType", "BloodType", "blood", "Blood")),
  qualification: firstValue(item, "qualification", "Qualification"),
  designation: lookupValue(firstValue(item, "designation", "Designation", "designationName", "DesignationName")),
  facultyType: facultyTypeValue(item),
  department: lookupValue(firstValue(item, "department", "Department", "departmentName", "DepartmentName")),
  joining: dateOnly(firstValue(item, "joiningDate", "JoiningDate", "joining", "Joining")),
  experience: firstValue(item, "experience", "Experience"),
  status: firstValue(item, "status", "Status") || "Active",
});

function Steps({ step, onSelect }) {
  return (
    <div className="faculty-steps">
      {[
        ["Details", UserRound, 0],
        ["Subjects", GraduationCap, 3],
      ].map(([label, Icon, targetStep]) => (
        <button type="button" className={targetStep <= step ? "is-active" : ""} key={label} onClick={() => onSelect(targetStep)}>
          <span>
            <Icon size={15} />
          </span>
          <small>{label === "Details" ? "Step 1" : "Step 2"}</small>
          <strong>{label}</strong>
        </button>
      ))}
    </div>
  );
}
function Preview({ values }) {
  const groups = [
    ["Personal Information", UserRound, ["firstName", "lastName", "gender", "dob"]],
    ["Contact Information", Mail, ["mobile", "email", "aadhaar", "bloodGroup"]],
    [
      "Professional Information",
      BriefcaseBusiness,
      [
        "empId",
        "department",
        "designation",
        "qualification",
        "facultyType",
        "experience",
        "joining",
      ],
    ],
  ];
  return (
    <div className="faculty-preview">
      {groups.map(([title, Icon, names]) => (
        <section
          key={title}
          className={`faculty-preview-section ${title.split(" ")[0].toLowerCase()}`}
        >
          <h3>
            <Icon size={18} />
            {title}
          </h3>
          <div>
            {names.map((name) => (
              <p key={name}>
                <span>{fields.find((f) => f.name === name)?.label}</span>
                <strong>
                  {name === "firstName"
                    ? `${values.firstName || ""} ${values.lastName || ""}`
                    : (name === "dob" || name === "joining" ? dateOnly(values[name]) : values[name]) || "—"}
                </strong>
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Workflow({ existingId }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [departments, setDepartments] = useState([]);
  const [genders, setGenders] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [removing, setRemoving] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const formFields = useMemo(
    () =>
      fields.map((field) =>
        field.name === "department"
          ? { ...field, options: departments }
          : field.name === "gender"
            ? { ...field, options: genders }
            : field,
      ),
    [departments, genders],
  );
  const { values, errors, setValue, setValues } = useForm(formFields, {});
  useEffect(() => {
    apiClient
      .get(apiEndpoints.departments.getAll)
      .then((departmentResponse) => {
        setDepartments(
          extractItems(departmentResponse.data)
            .filter((d) => d.isActive !== false)
            .map((d) => d.departmentName || d.departmentCode)
            .filter(Boolean),
        );
        setGenders(["Male", "Female", "Other"]);
      })
      .catch((e) => setToast(getApiErrorMessage(e)));
  }, []);
  useEffect(() => {
    if (!existingId) return;
    apiClient
      .get(apiEndpoints.faculty.getById(existingId))
      .then((r) => {
        const record = extractRecord(r.data);
        setValues(valuesFor(record));
        setSaved(record);
      })
      .catch(async (detailError) => {
        try {
          const listResponse = await apiClient.get(apiEndpoints.faculty.getAll);
          const record = extractItems(listResponse.data).find(
            (item) => String(facultyId(item)) === String(existingId),
          );
          if (!record) throw detailError;
          setValues(valuesFor(record));
          setSaved(record);
          setToast("Loaded faculty details from the directory because the individual record endpoint is unavailable.");
        } catch {
          setToast(getApiErrorMessage(detailError));
        }
      });
  }, [existingId, setValues]);
  const loadAllocation = async (faculty) => {
    const loadSubjects = apiClient
      .get(apiEndpoints.subjects.getAll)
      .then((subjectResponse) => {
        setSubjects(
          extractItems(subjectResponse.data).filter(
            (subject) => subject.isActive !== false && subject.status?.toLowerCase?.() !== "inactive",
          ),
        );
      })
      .catch((e) => setToast(getApiErrorMessage(e)));

    const loadWorkload = apiClient
      .get(apiEndpoints.faculty.getWorkload(facultyId(faculty)))
      .then((workloadResponse) => {
      const data = workloadResponse.data;
      const list = extractItems(
        data?.allocations ??
          data?.Allocations ??
          data?.subjectAssignments ??
          data?.SubjectAssignments ??
          data?.assignedSubjects ??
          data?.AssignedSubjects ??
          data,
      );
      setAllocations(list);
      })
      .catch((e) => setToast(getApiErrorMessage(e)));

    await Promise.all([loadSubjects, loadWorkload]);
  };
  useEffect(() => {
    if (step === 3 && saved) loadAllocation(saved);
  }, [step, saved]);
  const preview = (e) => {
    e.preventDefault();
    setStep(1);
  };
  const confirm = async () => {
    setSaving(true);
    try {
      const response = existingId
        ? await apiClient.put(apiEndpoints.faculty.update(existingId), payloadFor(values))
        : await apiClient.post(apiEndpoints.faculty.create, payloadFor(values));
      const record = extractRecord(response.data);
      const next = {
        ...record,
        ...valuesFor(record),
        id: facultyId(record) ?? existingId,
        facultyId: facultyId(record) ?? existingId,
      };
      setSaved(next);
      setStep(2);
      setToast("Faculty saved successfully.");
    } catch (e) {
      setToast(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const allocate = async (subject) => {
    if (!saved) return;
    const selectedId = subjectId(subject);
    const selectedFacultyId = facultyId(saved);
    if (selectedId === undefined || selectedId === null || !selectedFacultyId) {
      return setToast("A valid faculty and subject must be selected.");
    }
    if (
      allocations.some(
        (a) =>
          String(a.subjectId ?? a.subject?.subjectId ?? a.subject) === String(selectedId) ||
          subjectName(a) === subjectName(subject),
      )
    )
      return setToast("This subject is already allocated.");
    try {
      await apiClient.post(apiEndpoints.faculty.assignSubject, {
        facultyId: selectedFacultyId,
        subjectId: selectedId,
      });
      await loadAllocation(saved);
      setToast(`${subjectName(subject)} allocated successfully.`);
    } catch (e) {
      setToast(getApiErrorMessage(e));
    }
  };
  const remove = async () => {
    try {
      await apiClient.delete(apiEndpoints.faculty.deleteSubjectAssignment(allocationId(removing)));
      setRemoving(null);
      await loadAllocation(saved);
      setToast("Subject allocation removed.");
    } catch (e) {
      setToast(getApiErrorMessage(e));
    }
  };
  const allocatedIds = new Set(
    allocations.map((a) => String(a.subjectId ?? a.subject?.subjectId ?? a.subjectId)),
  );
  const available = subjects.filter(
    (s) =>
      !allocatedIds.has(String(subjectId(s))) &&
      !allocations.some((a) => subjectName(a) === subjectName(s)),
  );
  const selectedAvailableSubject = available.find(
    (subject) => String(subjectId(subject)) === selectedSubject,
  );
  const allocateSelectedSubject = async () => {
    if (!selectedAvailableSubject) return setToast("Select a subject to allocate.");
    await allocate(selectedAvailableSubject);
    setSelectedSubject("");
  };
  return (
    <DashboardLayout
      title="Faculty Management"
      subtitle="Faculty details and subject allocation."
      breadcrumb={["People"]}
    >
      <main className="faculty-workflow">
        <Steps step={step} onSelect={setStep} />
        {step === 0 && (
          <form className="faculty-form" onSubmit={preview}>
            <header>
              <UserRound />{" "}
              <div>
                <h2>Faculty Details</h2>
                <p>Enter the faculty profile details below.</p>
              </div>
            </header>
            <div className="faculty-form-grid">
              {formFields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={setValue}
                />
              ))}
            </div>
            <footer>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => navigate("/dashboard/faculty")}
              >
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary">Next</button>
            </footer>
          </form>
        )}
        {step === 1 && (
          <section className="faculty-stage">
            <header>
              <Eye />{" "}
              <div>
                <h2>Review Faculty Details</h2>
                <p>Check the information before saving it.</p>
              </div>
            </header>
            <Preview values={values} />
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(0)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="cms-btn cms-btn-primary" disabled={saving} onClick={confirm}>
                {saving ? "Saving..." : "Confirm & Save"}
              </button>
            </footer>
          </section>
        )}
        {step === 2 && (
          <section className="faculty-stage faculty-saved">
            <span className="faculty-success">
              <Check size={28} />
            </span>
            <h2>Faculty Saved Successfully</h2>
            <p>
              {facultyName(saved)} · {saved?.employeeId ?? saved?.empId ?? values.empId}
            </p>
            <div className="faculty-summary">
              <span>
                Department<strong>{saved?.department ?? values.department}</strong>
              </span>
              <span>
                Designation<strong>{saved?.designation ?? values.designation}</strong>
              </span>
            </div>
            <footer>
              <button className="cms-btn cms-btn-primary" onClick={() => setStep(3)}>
                Allocate Subject
              </button>
            </footer>
          </section>
        )}
        {step === 3 && (
          <section className="faculty-allocation">
            <header>
              <GraduationCap />{" "}
              <div>
                <h2>Subject Allocation</h2>
                <p>
                  {facultyName(saved)} · {saved?.employeeId ?? values.empId} ·{" "}
                  {saved?.department ?? values.department}
                </p>
              </div>
            </header>
            <div className="faculty-subject-columns">
              <section className="faculty-subject-list available">
                <h3>
                  Available Subjects <small>{available.length}</small>
                </h3>
                <div className="faculty-subject-selector">
                  <label htmlFor="available-subject">Select a subject</label>
                  <div>
                    <select id="available-subject" value={selectedSubject} disabled={!available.length} onChange={(event) => setSelectedSubject(event.target.value)}>
                      <option value="">{available.length ? "Choose an available subject" : "No subjects available"}</option>
                      {available.map((subject) => <option key={subjectId(subject) ?? subjectName(subject)} value={String(subjectId(subject))}>{subjectName(subject)}</option>)}
                    </select>
                    <button type="button" className="cms-btn" disabled={!selectedAvailableSubject} onClick={allocateSelectedSubject}>
                      <Plus size={15} /> Allocate
                    </button>
                  </div>
                  {!available.length && <p className="faculty-empty">Add or activate subjects in Subject Management, then return here to allocate them.</p>}
                </div>
              </section>
              <section className="faculty-subject-list allocated">
                <h3>
                  Allocated Subjects <small>{allocations.length}</small>
                </h3>
                {allocations.map((allocation, index) => (
                  <article
                    key={
                      allocationId(allocation) ??
                      `${subjectId(allocation) ?? subjectName(allocation)}-${index}`
                    }
                  >
                    <span>{subjectName(allocation)}</span>
                    <button className="cms-btn" onClick={() => setRemoving(allocation)}>
                      <X size={15} /> Remove
                    </button>
                  </article>
                ))}
                {!allocations.length && <p className="faculty-empty">No subjects allocated yet.</p>}
              </section>
            </div>
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={() => navigate("/dashboard/faculty")}
              >
                Finish
              </button>
            </footer>
          </section>
        )}
      </main>
      {removing && (
        <ConfirmDialog
          message={`Remove ${subjectName(removing)} from this faculty member?`}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

export default function FacultyManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [toast, setToast] = useState("");
  const isWorkflow = location.pathname !== "/dashboard/faculty";
  const load = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.getAll);
      setRows(extractItems(response.data).map(rowFor));
    } catch (e) {
      setToast(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const viewFaculty = async (row) => {
    setViewing(row);
    setViewLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.getById(row.id));
      setViewing({ ...row, ...response.data });
    } catch (e) {
      setViewing(null);
      setToast(getApiErrorMessage(e));
    } finally {
      setViewLoading(false);
    }
  };
  useEffect(() => {
    if (!isWorkflow) load();
  }, [isWorkflow]);
  if (isWorkflow) return <Workflow existingId={id} />;
  return (
    <DashboardLayout
      title="Faculty Management"
      subtitle="Faculty directory, credentials and departments."
      breadcrumb={["People"]}
    >
      <div className="faculty-list">
        <DataTable
          title="Faculty List"
          addLabel="Add Faculty"
          columns={[
            { key: "empId", label: "Employee ID", strong: true },
            { key: "name", label: "Faculty Name" },
            { key: "mobile", label: "Mobile" },
            { key: "email", label: "Email" },
            { key: "department", label: "Department" },
            { key: "designation", label: "Designation" },
            { key: "status", label: "Status", badge: true },
          ]}
          rows={rows}
          loading={loading}
          onAdd={() => navigate("/dashboard/faculty/add")}
          onView={viewFaculty}
          onEdit={(row) => navigate(`/dashboard/faculty/${row.id}/edit`)}
          onDelete={setDeleting}
        />
        {viewing && (
          <Modal
            title="Faculty Details"
            onClose={() => setViewing(null)}
            footer={
              <>
                <button className="cms-btn cms-btn-ghost" onClick={() => setViewing(null)}>
                  Close
                </button>
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={() =>
                    navigate(`/dashboard/faculty/${viewing.id ?? facultyId(viewing)}/edit`)
                  }
                >
                  <Pencil size={15} /> Edit
                </button>
              </>
            }
          >
            <div className="cms-kv">
              {viewLoading ? (
                <div className="cms-empty">Loading faculty details...</div>
              ) : (
                <>
                  {[
                    ["Employee ID", viewing.employeeId ?? viewing.empId],
                    ["Faculty Name", facultyName(viewing)],
                    ["Mobile", viewing.mobile ?? viewing.phoneNumber],
                    ["Email", viewing.email],
                    ["Department", viewing.department],
                    ["Designation", viewing.designation],
                    ["Qualification", viewing.qualification],
                    ["Faculty Type", viewing.facultyType],
                    ["Joining Date", dateOnly(viewing.joiningDate ?? viewing.joining)],
                    ["Status", viewing.status],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      {label === "Status" ? (
                        <StatusBadge
                          value={
                            typeof value === "boolean"
                              ? value
                                ? "Active"
                                : "Inactive"
                              : value || "Active"
                          }
                        />
                      ) : (
                        <strong>{value || "-"}</strong>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </Modal>
        )}
        {deleting && (
          <ConfirmDialog
            message={`Delete ${deleting.name}? This action cannot be undone.`}
            onCancel={() => setDeleting(null)}
            onConfirm={async () => {
              try {
                await apiClient.delete(apiEndpoints.faculty.delete(deleting.id));
                setDeleting(null);
                await load();
                setToast("Faculty deleted successfully.");
              } catch (e) {
                setToast(getApiErrorMessage(e));
              }
            }}
          />
        )}
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

FacultyManagementPage.pageConfig = { title: "Faculty Management" };
FacultyManagementPage.facultySubjectAllocationConfig = { title: "Faculty Subject Allocation" };
