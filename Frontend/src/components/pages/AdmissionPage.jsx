import { useState } from "react";
import { Check, Upload } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast } from "@/components/common/Ui.jsx";
import { options } from "@/data/mockData.js";

const steps = [
  {
    title: "Admission",
    fields: [
      { name: "admissionNo", label: "Admission Number", required: true },
      { name: "admissionDate", label: "Admission Date", type: "date", required: true },
      { name: "board", label: "Board", type: "select", options: options.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: options.year, required: true },
      { name: "photo", label: "Student Photo", type: "file" },
      { name: "quota", label: "Admission Quota", type: "select", options: ["Merit", "Management", "Sports", "Reserved"] },
    ],
  },
  {
    title: "Student Details",
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "gender", label: "Gender", type: "select", options: options.gender, required: true },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "bloodGroup", label: "Blood Group", type: "select", options: options.bloodGroup },
      { name: "aadhaar", label: "Aadhaar Number" },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "religion", label: "Religion" },
      { name: "caste", label: "Caste Category", type: "select", options: ["General", "OBC", "SC", "ST", "EWS"] },
    ],
  },
  {
    title: "Parent Details",
    fields: [
      { name: "fatherName", label: "Father Name", required: true },
      { name: "fatherOccupation", label: "Father Occupation" },
      { name: "fatherMobile", label: "Father Mobile", type: "tel", required: true },
      { name: "motherName", label: "Mother Name", required: true },
      { name: "motherOccupation", label: "Mother Occupation" },
      { name: "motherMobile", label: "Mother Mobile", type: "tel" },
      { name: "guardianName", label: "Guardian Name" },
      { name: "annualIncome", label: "Annual Income", type: "number" },
    ],
  },
  {
    title: "Address",
    fields: [
      { name: "address1", label: "Address Line 1", required: true, full: true },
      { name: "address2", label: "Address Line 2", full: true },
      { name: "city", label: "City", required: true },
      { name: "district", label: "District", required: true },
      { name: "state", label: "State", type: "select", options: ["Andhra Pradesh", "Telangana", "Karnataka", "Maharashtra", "Delhi"], required: true },
      { name: "pincode", label: "Pincode", required: true },
    ],
  },
  {
    title: "Previous School",
    fields: [
      { name: "prevSchool", label: "Previous School Name", required: true },
      { name: "prevBoard", label: "Previous Board", type: "select", options: options.board },
      { name: "passYear", label: "Year of Passing", type: "number" },
      { name: "prevMarks", label: "Marks / GPA Obtained" },
    ],
  },
  {
    title: "Academic Details",
    fields: [
      { name: "level", label: "Academic Level", type: "select", options: options.level, required: true },
      { name: "group", label: "Group", type: "select", options: options.group, required: true },
      { name: "section", label: "Section", type: "select", options: options.section, required: true },
      { name: "medium", label: "Medium", type: "select", options: ["English", "Telugu", "Hindi"] },
      { name: "secondLanguage", label: "Second Language", type: "select", options: ["Sanskrit", "Telugu", "Hindi", "French"] },
    ],
  },
  {
    title: "Documents",
    fields: [
      { name: "docTc", label: "Transfer Certificate", type: "file" },
      { name: "docMarks", label: "Marks Memo", type: "file" },
      { name: "docAadhaar", label: "Aadhaar Copy", type: "file" },
      { name: "docCaste", label: "Caste Certificate", type: "file" },
      { name: "docIncome", label: "Income Certificate", type: "file" },
      { name: "remarks", label: "Remarks", type: "textarea", full: true },
    ],
  },
];

export default function AdmissionPage() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const current = steps[step];

  const setValue = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validateStep = () => {
    const next = {};
    current.fields.forEach((f) => {
      const val = values[f.name];
      if (f.required && !String(val ?? "").trim()) next[f.name] = `${f.label} is required`;
      else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) next[f.name] = "Enter a valid email";
      else if (f.type === "tel" && val && !/^[0-9]{10}$/.test(String(val))) next[f.name] = "Enter a valid 10 digit number";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) setStep(step + 1);
  };

  const submit = () => {
    if (!validateStep()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast("Admission submitted successfully");
      setStep(0);
    }, 700);
  };

  return (
    <DashboardLayout
      title="Student Admission"
      subtitle="Multi-step admission form with document upload."
      breadcrumb={["People"]}
    >
      <div className="cms-steps">
        {steps.map((s, i) => (
          <button
            key={s.title}
            className={`cms-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            onClick={() => setStep(i)}
          >
            <span className="cms-step-num">{i < step ? <Check size={12} /> : i + 1}</span>
            {s.title}
          </button>
        ))}
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Step {step + 1} of {steps.length} - {current.title}</h2>
          {current.title === "Documents" ? (
            <span className="cms-badge cms-badge-info"><Upload size={12} /> Max 2 MB per file</span>
          ) : null}
        </div>
        <div className="cms-card-body">
          <div className="cms-form-grid cols-3">
            {current.fields.map((f) => (
              <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
            ))}
          </div>
        </div>
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={() => (step === 0 ? setValues({}) : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Previous"}
          </button>
          {step < steps.length - 1 ? (
            <button className="cms-btn cms-btn-primary" onClick={next}>Save & Continue</button>
          ) : (
            <button className="cms-btn cms-btn-primary" onClick={submit} disabled={saving}>
              {saving ? "Submitting..." : "Submit Admission"}
            </button>
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


