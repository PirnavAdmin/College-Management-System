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
import apiClient from "@/api/axios.js";
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
  { name: "designation", label: "Designation", type: "select", options: [], required: true },
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
  facultyType: facultyTypeValue(item),
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

const BLOOD_GROUPS = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
const DESIGNATIONS = {
  "Teaching Staff": ["Lecturer", "Senior Lecturer", "Assistant Professor", "Professor", "Head of Department"],
  "Non-Teaching Staff": ["Principal", "Administrative Officer", "Accountant", "Librarian", "Lab Assistant", "Office Assistant", "Clerk", "Receptionist"],
};
const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const today = () => new Date().toISOString().slice(0, 10);
const ageOn = (date) => {
  const birth = new Date(`${date}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
};
const cleanFacultyValues = (source) => {
  const text = (name) => String(source[name] ?? "").trim();
  return {
    ...source,
    empId: text("empId"), firstName: text("firstName"), lastName: text("lastName"),
    aadhaar: text("aadhaar").replace(/\s/g, ""), mobile: text("mobile").replace(/\D/g, ""),
    email: text("email").toLowerCase(), qualification: text("qualification"),
    designation: text("designation"), department: text("department"),
    experience: text("experience"),
  };
};
const facultyValidation = (source, { departments = [], genders = [] } = {}) => {
  const values = cleanFacultyValues(source);
  const errors = {};
  if (!EMPLOYEE_ID_PATTERN.test(values.empId) || values.empId.length < 3 || values.empId.length > 20) errors.empId = "Employee ID must be 3–20 letters, numbers, or hyphens.";
  if (!NAME_PATTERN.test(values.firstName) || values.firstName.length < 2 || values.firstName.length > 50) errors.firstName = "Please enter a valid first name.";
  if (!NAME_PATTERN.test(values.lastName) || values.lastName.length > 50) errors.lastName = "Please enter a valid last name.";
  if (!genders.includes(values.gender)) errors.gender = "Please select a gender.";
  if (!values.dob) errors.dob = "Date of birth is required.";
  else if (values.dob > today()) errors.dob = "Date of birth cannot be in the future.";
  else if (Number.isNaN(new Date(`${values.dob}T00:00:00`).getTime())) errors.dob = "Please enter a valid date of birth.";
  else if (ageOn(values.dob) < 18) errors.dob = "Faculty member must be at least 18 years old.";
  if (values.aadhaar && !/^\d{12}$/.test(values.aadhaar)) errors.aadhaar = "Aadhaar number must contain exactly 12 digits.";
  if (!/^[6-9]\d{9}$/.test(values.mobile) || /^0+$/.test(values.mobile)) errors.mobile = "Please enter a valid 10-digit mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Please enter a valid email address.";
  if (values.bloodGroup && !BLOOD_GROUPS.has(values.bloodGroup)) errors.bloodGroup = "Please select a valid blood group.";
  if (!values.qualification || values.qualification.length > 100) errors.qualification = "Qualification is required.";
  if (!values.designation || values.designation.length > 100 || !(DESIGNATIONS[values.facultyType] || []).includes(values.designation)) errors.designation = "Please select a valid designation.";
  if (!["Teaching Staff", "Non-Teaching Staff"].includes(values.facultyType)) errors.facultyType = "Please select a faculty type.";
  if (!departments.includes(values.department)) errors.department = "Please select a department.";
  if (!values.joining) errors.joining = "Joining date is required.";
  else if (values.dob && values.joining <= values.dob) errors.joining = "Joining date cannot be before date of birth.";
  else if (Number.isNaN(new Date(`${values.joining}T00:00:00`).getTime())) errors.joining = "Please enter a valid joining date.";
  if (values.experience && (!/^\d+(\.\d+)?$/.test(values.experience) || Number(values.experience) > 80)) errors.experience = "Please enter a valid experience.";
  return { values, errors };
};
const friendlyFacultyError = (error) => {
  console.error("Faculty operation failed:", error);
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message ?? error?.response?.data?.Message ?? "").toLowerCase();
  if (message.includes("employee")) return "Employee ID already exists. Please use a different Employee ID.";
  if (message.includes("email")) return "Email already exists. Please use a different email address.";
  if (message.includes("mobile") || message.includes("phone")) return "Mobile number already exists. Please use a different mobile number.";
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 409) return "A faculty record with these details already exists.";
  if ([500, 502, 503, 504].includes(status)) return "Unable to complete the request right now. Please try again later.";
  if (error?.message === "Network Error") return "Unable to connect to the service. Please check your internet connection and try again.";
  return "Please check the entered information and try again.";
};

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
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(Boolean(existingId));
  const [genders, setGenders] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [removing, setRemoving] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedFacultyType, setSelectedFacultyType] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [pendingSubjects, setPendingSubjects] = useState([]);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const formFields = useMemo(
    () =>
      fields.map((field) =>
        field.name === "department"
          ? { ...field, options: departments, disabled: loadingDepartments }
          : field.name === "gender"
            ? { ...field, options: genders }
            : field.name === "designation"
              ? { ...field, options: DESIGNATIONS[selectedFacultyType] || [], disabled: !selectedFacultyType }
            : field,
      ),
    [departments, genders, loadingDepartments, selectedFacultyType],
  );
  const { values, errors, setValue, setValues, setErrors } = useForm(formFields, {});
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
      .catch((e) => setToast(friendlyFacultyError(e)))
      .finally(() => setLoadingDepartments(false));
  }, []);
  useEffect(() => {
    if (!existingId) return;
    apiClient
      .get(apiEndpoints.faculty.getById(existingId))
      .then((r) => {
        const record = extractRecord(r.data);
        setValues(valuesFor(record));
        setSelectedFacultyType(facultyTypeValue(record));
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
          setSelectedFacultyType(facultyTypeValue(record));
          setSaved(record);
          setToast("Loaded faculty details from the directory because the individual record endpoint is unavailable.");
        } catch {
          setToast(friendlyFacultyError(detailError));
        }
      }).finally(() => setLoadingDetails(false));
  }, [existingId, setValues]);
  const loadAllocation = async (faculty) => {
    setLoadingAllocation(true);
    const loadSubjects = apiClient
      .get(apiEndpoints.subjects.getAll)
      .then((subjectResponse) => {
        setSubjects(
          extractItems(subjectResponse.data).filter(
            (subject) => subject.isActive !== false && subject.status?.toLowerCase?.() !== "inactive",
          ),
        );
      })
      .catch((e) => setToast(friendlyFacultyError(e)));

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
      .catch((e) => setToast(friendlyFacultyError(e)));

    await Promise.all([loadSubjects, loadWorkload]);
    setLoadingAllocation(false);
  };
  useEffect(() => {
    if (step === 3 && saved) loadAllocation(saved);
  }, [step, saved]);
  const validateAndShow = (source = values) => {
    const result = facultyValidation(source, { departments, genders });
    setErrors(result.errors);
    return result;
  };
  const handleFieldChange = (name, value) => {
    const sanitized = name === "mobile" ? String(value).replace(/\D/g, "").slice(0, 10) : name === "aadhaar" ? String(value).replace(/\D/g, "").slice(0, 12) : value;
    setValue(name, sanitized);
    if (name === "facultyType") { setSelectedFacultyType(sanitized); if (values.designation) setValue("designation", ""); }
    const result = facultyValidation({ ...values, [name]: sanitized }, { departments, genders });
    if (!result.errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const handleFieldBlur = (name) => {
    const result = facultyValidation(values, { departments, genders });
    setValues(result.values);
    setErrors((current) => ({ ...current, [name]: result.errors[name] }));
  };
  const focusFirstError = (nextErrors) => {
    const field = Object.keys(nextErrors)[0];
    if (field) document.getElementById(`f-${field}`)?.focus();
  };
  const preview = (e) => {
    e.preventDefault();
    const result = validateAndShow();
    setValues(result.values);
    if (Object.keys(result.errors).length) return focusFirstError(result.errors);
    setStep(1);
  };
  const confirm = async () => {
    const result = validateAndShow();
    setValues(result.values);
    if (Object.keys(result.errors).length) {
      setStep(0);
      return focusFirstError(result.errors);
    }
    setSaving(true);
    try {
      const directory = await apiClient.get(apiEndpoints.faculty.getAll);
      const duplicate = extractItems(directory.data).find((faculty) => {
        if (existingId && String(facultyId(faculty)) === String(existingId)) return false;
        const record = valuesFor(faculty);
        return record.empId?.trim().toLowerCase() === result.values.empId.toLowerCase()
          || record.email?.trim().toLowerCase() === result.values.email
          || String(record.mobile ?? "").replace(/\D/g, "") === result.values.mobile;
      });
      if (duplicate) {
        const existing = valuesFor(duplicate);
        const duplicateErrors = {
          ...(existing.empId?.trim().toLowerCase() === result.values.empId.toLowerCase() ? { empId: "Employee ID already exists. Please use a different Employee ID." } : {}),
          ...(existing.email?.trim().toLowerCase() === result.values.email ? { email: "Email already exists. Please use a different email address." } : {}),
          ...(String(existing.mobile ?? "").replace(/\D/g, "") === result.values.mobile ? { mobile: "Mobile number already exists. Please use a different mobile number." } : {}),
        };
        setErrors(duplicateErrors); setStep(0); return focusFirstError(duplicateErrors);
      }
      const response = existingId
        ? await apiClient.put(apiEndpoints.faculty.update(existingId), payloadFor(result.values))
        : await apiClient.post(apiEndpoints.faculty.create, payloadFor(result.values));
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
      setToast(friendlyFacultyError(e));
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
      setToast(friendlyFacultyError(e));
    }
  };
  const remove = async () => {
    try {
      await apiClient.delete(apiEndpoints.faculty.deleteSubjectAssignment(allocationId(removing)));
      setRemoving(null);
      await loadAllocation(saved);
      setToast("Subject allocation removed.");
    } catch (e) {
      setToast(friendlyFacultyError(e));
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
  const matchingSubjects = available.filter((subject) => {
    const query = subjectSearch.trim().toLowerCase();
    return !query || `${subjectName(subject)} ${subject.subjectCode ?? subject.SubjectCode ?? ""}`.toLowerCase().includes(query);
  });
  const allocateSelectedSubject = async () => {
    if (!selectedAvailableSubject) return setToast("Select a subject to allocate.");
    await allocate(selectedAvailableSubject);
    setSelectedSubject("");
  };
  const addPendingSubject = (subject) => {
    const id = String(subjectId(subject) ?? "");
    if (!id) return setToast("Please select a valid subject.");
    if (pendingSubjects.some((item) => String(subjectId(item)) === id)) return setToast("This subject is already selected.");
    setPendingSubjects((current) => [...current, subject]);
  };
  const savePendingSubjects = async () => {
    if (!pendingSubjects.length) return setToast("Please select at least one subject.");
    if (!saved) return setToast("Faculty must be saved before subjects can be allocated.");
    setSavingAllocation(true);
    try {
      for (const subject of pendingSubjects) await apiClient.post(apiEndpoints.faculty.assignSubject, { facultyId: facultyId(saved), subjectId: subjectId(subject) });
      setPendingSubjects([]);
      await loadAllocation(saved);
      setToast("Selected subjects allocated successfully.");
    } catch (error) { setToast(friendlyFacultyError(error)); }
    finally { setSavingAllocation(false); }
  };
  return (
    <DashboardLayout
      title="Faculty Management"
      subtitle="Faculty details and subject allocation."
      breadcrumb={["People"]}
    >
      <main className="faculty-workflow">
        <Steps step={step} onSelect={setStep} />
        {step === 0 && loadingDetails ? <section className="faculty-stage"><p className="faculty-empty">Loading faculty details...</p></section> : step === 0 && (
          <form className="faculty-form" onSubmit={preview}>
            <header>
              <UserRound />{" "}
              <div>
                <h2>Faculty Details</h2>
                <p>Enter the faculty profile details below.</p>
              </div>
            </header>
            <div className="faculty-form-grid">
              {loadingDepartments ? <p className="faculty-empty">Loading departments...</p> : null}
              {formFields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={handleFieldChange}
                  onBlur={handleFieldBlur}
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
                  <label htmlFor="subject-search">Search subjects</label>
                  <div>
                    <input id="subject-search" value={subjectSearch} placeholder="Search by subject name or code" onChange={(event) => setSubjectSearch(event.target.value)} disabled={loadingAllocation} />
                  </div>
                  {loadingAllocation ? <p className="faculty-empty">Loading subjects...</p> : matchingSubjects.length ? <div className="faculty-search-results">{matchingSubjects.map((subject) => <button type="button" key={subjectId(subject)} onClick={() => addPendingSubject(subject)} disabled={savingAllocation}><Plus size={14}/>{subjectName(subject)}{subject.subjectCode ?? subject.SubjectCode ? ` (${subject.subjectCode ?? subject.SubjectCode})` : ""}</button>)}</div> : <p className="faculty-empty">No subjects found.</p>}
                  {pendingSubjects.length ? <><p className="faculty-selected-label">Selected subjects</p><div className="faculty-subject-chips">{pendingSubjects.map((subject) => <span key={subjectId(subject)}>{subjectName(subject)}<button type="button" onClick={() => setPendingSubjects((current) => current.filter((item) => String(subjectId(item)) !== String(subjectId(subject))))} aria-label={`Remove ${subjectName(subject)}`}><X size={13}/></button></span>)}</div><button type="button" className="cms-btn" disabled={savingAllocation} onClick={savePendingSubjects}>{savingAllocation ? "Saving..." : "Save selected subjects"}</button></> : null}
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
  const [facultyTypeFilter, setFacultyTypeFilter] = useState("");
  const isWorkflow = location.pathname !== "/dashboard/faculty";
  const load = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.getAll);
      setRows(extractItems(response.data).map(rowFor));
    } catch (e) {
      setToast(friendlyFacultyError(e));
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
      setToast(friendlyFacultyError(e));
    } finally {
      setViewLoading(false);
    }
  };
  useEffect(() => {
    if (!isWorkflow) load();
  }, [isWorkflow]);
  if (isWorkflow) return <Workflow existingId={id} />;
  const visibleRows = facultyTypeFilter ? rows.filter((row) => row.facultyType === facultyTypeFilter) : rows;
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
          rows={visibleRows}
          loading={loading}
          toolbarExtra={<label className="faculty-type-filter">Faculty Type<select value={facultyTypeFilter} onChange={(event) => setFacultyTypeFilter(event.target.value)}><option value="">All Faculty</option><option value="Teaching Staff">Teaching Staff</option><option value="Non-Teaching Staff">Non-Teaching Staff</option></select></label>}
          emptyMessage={facultyTypeFilter ? `No ${facultyTypeFilter.toLowerCase()} found.` : "No faculty members found."}
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
                setToast(friendlyFacultyError(e));
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
