import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdmissionForm.css";

const initialForm = {
  admissionNo: "",
  admissionDate: "",
  studentPhoto: null,
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  aadhaar: "",
  bloodGroup: "",
  nationality: "",
  religion: "",
  caste: "",
  category: "",
  fatherName: "",
  motherName: "",
  guardian: "",
  parentMobile: "",
  parentEmail: "",
  occupation: "",
  annualIncome: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  board: "",
  academicYear: "",
  academicLevel: "",
  group: "",
  section: "",
  previousSchool: "",
  previousBoard: "",
  previousPercentage: "",
  birthCertificate: null,
  tc: null,
  studyCertificate: null,
  aadhaarDocument: null,
  communityCertificate: null,
  incomeCertificate: null,
  passportPhoto: null,
};

const requiredFields = {
  admissionNo: "Admission Number is required.",
  admissionDate: "Admission Date is required.",
  firstName: "First Name is required.",
  lastName: "Last Name is required.",
  gender: "Gender is required.",
  dob: "DOB is required.",
  aadhaar: "Aadhaar Number is required.",
  fatherName: "Father Name is required.",
  parentMobile: "Parent Mobile is required.",
  board: "Board is required.",
  academicYear: "Academic Year is required.",
  academicLevel: "Academic Level is required.",
  group: "Group is required.",
  section: "Section is required.",
};

const boardOptions = ["State Board", "CBSE", "ICSE", "Intermediate Board", "University", "Autonomous"];
const academicYearOptions = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];
const academicLevelOptions = ["Intermediate First Year", "Intermediate Second Year", "Undergraduate", "Postgraduate", "Diploma"];
const groupOptions = ["MPC", "BiPC", "CEC", "MEC", "HEC", "Computer Science", "Commerce"];
const sectionOptions = ["A", "B", "C", "D"];
const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const categoryOptions = ["General", "OBC", "SC", "ST", "EWS", "Minority"];

const documentUploads = [
  { name: "birthCertificate", label: "Birth Certificate", placeholder: "Upload birth certificate" },
  { name: "tc", label: "Transfer Certificate (TC)", placeholder: "Upload transfer certificate" },
  { name: "studyCertificate", label: "Study Certificate", placeholder: "Upload study certificate" },
  { name: "aadhaarDocument", label: "Aadhaar Document", placeholder: "Upload Aadhaar document" },
  { name: "communityCertificate", label: "Community Certificate", placeholder: "Upload community certificate" },
  { name: "incomeCertificate", label: "Income Certificate", placeholder: "Upload income certificate" },
  { name: "passportPhoto", label: "Passport Photo", placeholder: "Upload passport photo" },
];

export default function AdmissionForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadResetKey, setUploadResetKey] = useState(0);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!String(form[field] || "").trim()) {
        nextErrors[field] = message;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
    }, 800);
  };

  const clearForm = () => {
    setForm(initialForm);
    setErrors({});
    setUploadResetKey((current) => current + 1);
  };

  const goBack = () => {
    navigate("/dashboard/students");
  };

  return (
    <section className="admissionForm">
      <header className="admissionHeader">
        <div>
          <h1>Student Admission</h1>
          <p>Register a new student into the college.</p>
        </div>
        <button className="admissionBtn admissionBtnSecondary" type="button" onClick={goBack}>
          Back to List
        </button>
      </header>

      <form className="admissionFormStack" noValidate onSubmit={handleSubmit}>
        <FormSection title="Student Details">
          <TextField name="admissionNo" label="Admission No" required form={form} errors={errors} onChange={updateField} placeholder="Enter admission number" />
          <TextField name="admissionDate" label="Admission Date" type="date" required form={form} errors={errors} onChange={updateField} placeholder="Select admission date" />
          <UploadField key={`studentPhoto-${uploadResetKey}`} name="studentPhoto" label="Student Photo" file={form.studentPhoto} onChange={updateField} placeholder="Upload student photo" />
          <TextField name="firstName" label="First Name" required form={form} errors={errors} onChange={updateField} placeholder="Enter first name" />
          <TextField name="lastName" label="Last Name" required form={form} errors={errors} onChange={updateField} placeholder="Enter last name" />
          <SelectField name="gender" label="Gender" required form={form} errors={errors} onChange={updateField} options={genderOptions} placeholder="Select gender" />
          <TextField name="dob" label="DOB" type="date" required form={form} errors={errors} onChange={updateField} placeholder="Select date of birth" />
          <TextField name="aadhaar" label="Aadhaar Number" required form={form} errors={errors} onChange={updateField} placeholder="Enter Aadhaar number" maxLength={12} inputMode="numeric" />
          <SelectField name="bloodGroup" label="Blood Group" form={form} errors={errors} onChange={updateField} options={bloodGroupOptions} placeholder="Select blood group" />
          <TextField name="nationality" label="Nationality" form={form} errors={errors} onChange={updateField} placeholder="Enter nationality" />
          <TextField name="religion" label="Religion" form={form} errors={errors} onChange={updateField} placeholder="Enter religion" />
          <TextField name="caste" label="Caste" form={form} errors={errors} onChange={updateField} placeholder="Enter caste" />
          <SelectField name="category" label="Category" form={form} errors={errors} onChange={updateField} options={categoryOptions} placeholder="Select category" />
        </FormSection>

        <FormSection title="Parent Details">
          <TextField name="fatherName" label="Father Name" required form={form} errors={errors} onChange={updateField} placeholder="Enter father name" />
          <TextField name="motherName" label="Mother Name" required form={form} errors={errors} onChange={updateField} placeholder="Enter mother name" />
          <TextField name="guardian" label="Guardian Name" form={form} errors={errors} onChange={updateField} placeholder="Enter guardian name" />
          <TextField name="parentMobile" label="Parent Mobile" required form={form} errors={errors} onChange={updateField} placeholder="Enter parent mobile number" inputMode="tel" />
          <TextField name="parentEmail" label="Parent Email" type="email" form={form} errors={errors} onChange={updateField} placeholder="Enter parent email" />
          <TextField name="occupation" label="Occupation" form={form} errors={errors} onChange={updateField} placeholder="Enter occupation" />
          <TextField name="annualIncome" label="Annual Income" form={form} errors={errors} onChange={updateField} placeholder="Enter annual income" inputMode="decimal" />
        </FormSection>

        <FormSection title="Address Details">
          <TextareaField name="address" label="Address" form={form} errors={errors} onChange={updateField} placeholder="Enter complete address" />
          <TextField name="city" label="City" form={form} errors={errors} onChange={updateField} placeholder="Enter city" />
          <TextField name="district" label="District" form={form} errors={errors} onChange={updateField} placeholder="Enter district" />
          <TextField name="state" label="State" form={form} errors={errors} onChange={updateField} placeholder="Enter state" />
          <TextField name="pincode" label="Pincode" form={form} errors={errors} onChange={updateField} placeholder="Enter pincode" inputMode="numeric" />
        </FormSection>

        <FormSection title="Academic Details">
          <SelectField name="board" label="Board" required form={form} errors={errors} onChange={updateField} options={boardOptions} placeholder="Select board" />
          <SelectField name="academicYear" label="Academic Year" required form={form} errors={errors} onChange={updateField} options={academicYearOptions} placeholder="Select academic year" />
          <SelectField name="academicLevel" label="Academic Level" required form={form} errors={errors} onChange={updateField} options={academicLevelOptions} placeholder="Select academic level" />
          <SelectField name="group" label="Group" required form={form} errors={errors} onChange={updateField} options={groupOptions} placeholder="Select group" />
          <SelectField name="section" label="Section" required form={form} errors={errors} onChange={updateField} options={sectionOptions} placeholder="Select section" />
        </FormSection>

        <FormSection title="Previous School Details">
          <TextField name="previousSchool" label="Previous School" form={form} errors={errors} onChange={updateField} placeholder="Enter previous school" />
          <TextField name="previousBoard" label="Previous Board" form={form} errors={errors} onChange={updateField} placeholder="Enter previous board" />
          <TextField name="previousPercentage" label="Previous Percentage" form={form} errors={errors} onChange={updateField} placeholder="Enter previous percentage" inputMode="decimal" />
        </FormSection>

        <FormSection title="Documents Upload">
          {documentUploads.map((upload) => (
            <UploadField
              key={`${upload.name}-${uploadResetKey}`}
              name={upload.name}
              label={upload.label}
              file={form[upload.name]}
              onChange={updateField}
              placeholder={upload.placeholder}
            />
          ))}
        </FormSection>

        <div className="admissionActions">
          <button className="admissionBtn admissionBtnPrimary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="admissionBtn admissionBtnSecondary" type="button" disabled={saving} onClick={clearForm}>
            Clear
          </button>
          <button className="admissionBtn admissionBtnGhost" type="button" disabled={saving} onClick={goBack}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="admissionCard">
      <h2>{title}</h2>
      <div className="admissionGrid">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }) {
  return (
    <span className="admissionLabelText">
      {label}
      {required ? <span className="requiredMark"> *</span> : null}
    </span>
  );
}

function TextField({ name, label, required = false, type = "text", form, errors, onChange, placeholder, ...inputProps }) {
  return (
    <label className="admissionField">
      <FieldLabel label={label} required={required} />
      <input
        className={errors[name] ? "admissionInput hasError" : "admissionInput"}
        type={type}
        name={name}
        value={form[name]}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(errors[name])}
        {...inputProps}
      />
      {errors[name] ? <small className="admissionError">{errors[name]}</small> : null}
    </label>
  );
}

function SelectField({ name, label, required = false, form, errors, onChange, options, placeholder }) {
  return (
    <label className="admissionField">
      <FieldLabel label={label} required={required} />
      <select
        className={errors[name] ? "admissionInput admissionSelect hasError" : "admissionInput admissionSelect"}
        name={name}
        value={form[name]}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {errors[name] ? <small className="admissionError">{errors[name]}</small> : null}
    </label>
  );
}

function TextareaField({ name, label, required = false, form, errors, onChange, placeholder }) {
  return (
    <label className="admissionField admissionFieldFull">
      <FieldLabel label={label} required={required} />
      <textarea
        className={errors[name] ? "admissionTextarea hasError" : "admissionTextarea"}
        name={name}
        value={form[name]}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        rows={4}
        aria-invalid={Boolean(errors[name])}
      />
      {errors[name] ? <small className="admissionError">{errors[name]}</small> : null}
    </label>
  );
}

function UploadField({ name, label, file, onChange, placeholder }) {
  const inputId = `admission-${name}`;

  return (
    <div className="admissionField">
      <label className="admissionLabelText" htmlFor={inputId}>
        {label}
      </label>
      <label className="uploadBox" htmlFor={inputId}>
        <input id={inputId} name={name} type="file" onChange={(event) => onChange(name, event.target.files?.[0] || null)} />
        <span className="uploadIcon" aria-hidden="true">
          +
        </span>
        <span className="uploadText">{file?.name || placeholder}</span>
        <span className="uploadHint">PDF, JPG or PNG</span>
      </label>
    </div>
  );
}
