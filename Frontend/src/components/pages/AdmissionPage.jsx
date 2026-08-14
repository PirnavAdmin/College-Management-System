import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  Edit3,
  Eye,
  FileCheck,
  GraduationCap,
  IndianRupee,
  MapPin,
  School,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast } from "@/components/common/Ui.jsx";
import { options } from "@/data/mockData.js";

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;
// Payment modes mirror the existing Fee Management implementation.
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Net Banking", "Cheque"];
const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `\u20b9${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN")}`;
};
const formatRowAmount = (value) => (value === undefined || value === null || value === "" ? "-" : formatAmount(value));
const MOBILE_FIELDS = new Set(["mobile", "fatherMobile", "motherMobile", "guardianMobile"]);
const DIGIT_LIMITS = { aadhaar: 12, pincode: 6, passYear: 4 };
const AMOUNT_FIELDS = new Set(["feeAmount", "totalFee", "discount", "fine", "netPayable", "amountPaid", "balanceAmount"]);
const ALPHA_FIELDS = new Set([
  "firstName",
  "lastName",
  "religion",
  "fatherName",
  "fatherOccupation",
  "motherName",
  "motherOccupation",
  "guardianName",
  "city",
  "district",
  "prevSchool",
]);

const getCollection = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
};

const isSchemaPlaceholder = (value) => {
  if (typeof value !== "string") return false;
  return ["string", "number", "integer", "object", "array", "boolean"].includes(value.trim().toLowerCase());
};

const readText = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return "";
  if (typeof value === "object") return "";
  return String(value);
};

const readNumber = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const readId = (item, ...keys) => {
  const value = read(item, ...keys);
  return value === undefined || value === null || value === "" || isSchemaPlaceholder(value) ? "" : String(value);
};

const formatFeeDate = (value) => {
  if (!value || isSchemaPlaceholder(value)) return "";
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
};

const getFeeTypeName = (item) => {
  const directName = readText(
    item,
    "feeTypeName",
    "FeeTypeName",
    "feeName",
    "FeeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
  );
  if (directName) return directName;

  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  if (typeof feeType === "string") return isSchemaPlaceholder(feeType) ? "" : feeType;
  if (!feeType || typeof feeType !== "object") return "";

  return readText(
    feeType,
    "feeTypeName",
    "FeeTypeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
    "title",
    "Title",
  );
};

const getNestedRows = (item, ...keys) => {
  const value = read(item, ...keys);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  return [];
};

const expandFeeStructureItems = (item) => {
  const components = getNestedRows(
    item,
    "feeComponents",
    "FeeComponents",
    "components",
    "Components",
    "feeDetails",
    "FeeDetails",
    "details",
    "Details",
  );
  if (!components.length) return [item];

  return components.map((component) => {
    const structureId = read(
      component,
      "feeStructureId",
      "FeeStructureId",
      "structureId",
      "StructureId",
      "feeComponentId",
      "FeeComponentId",
      "id",
      "Id",
    );
    return {
      ...item,
      ...component,
      ...(structureId !== undefined && structureId !== null && structureId !== "" ? { feeStructureId: structureId } : {}),
    };
  });
};

const toOption = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) || value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const toDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const ADMISSION_DRAFT_KEY = "studentAdmissionDraft";

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
      { name: "bloodGroup", label: "Blood Group", type: "select", options: options.bloodGroup, required: true },
      { name: "aadhaar", label: "Aadhaar Number", required: true },
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
      { name: "guardianMobile", label: "Guardian Mobile", type: "tel" },
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
      { name: "rollNumber", label: "Roll Number" },
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
  {
    title: "Fee",
    custom: "fee",
    fields: [
      { name: "discount", label: "Discount", type: "number" },
      { name: "fine", label: "Fine", type: "number" },
      { name: "amountPaid", label: "Amount Paid", type: "number" },
      { name: "paymentMode", label: "Payment Mode", type: "select", options: PAYMENT_MODES },
      { name: "transactionNumber", label: "Transaction Number" },
    ],
    previewFields: [
      { name: "totalFee", label: "Total Fee" },
      { name: "discount", label: "Discount" },
      { name: "fine", label: "Fine" },
      { name: "netPayable", label: "Net Payable" },
      { name: "amountPaid", label: "Amount Paid" },
      { name: "balanceAmount", label: "Balance" },
      { name: "paymentMode", label: "Payment Mode" },
      { name: "transactionNumber", label: "Transaction Number" },
    ],
  },
];

const normalizeFeeStructure = (item) => {
  const id = readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId", "id", "Id");
  const boardId = readId(item, "boardId", "BoardId");
  const academicYearId = readId(item, "academicYearId", "AcademicYearId", "yearId", "YearId");
  const groupId = readId(item, "groupId", "GroupId");
  const due = read(item, "dueDate", "DueDate", "due", "Due");
  return {
    id,
    boardId,
    academicYearId,
    groupId,
    type: getFeeTypeName(item),
    amount: readNumber(item, "amount", "Amount", "feeAmount", "FeeAmount", "totalAmount", "TotalAmount"),
    due: formatFeeDate(due),
  };
};

const matchesAdmission = (structure, values) => (
  (!values.board || !structure.boardId || structure.boardId === String(values.board))
  && (!values.year || !structure.academicYearId || structure.academicYearId === String(values.year))
  && (!values.group || !structure.groupId || structure.groupId === String(values.group))
);

const previewStep = { title: "Preview", fields: [] };
const allSteps = [...steps, previewStep];
const stepIcons = {
  Admission: ClipboardList,
  "Student Details": User,
  "Parent Details": Users,
  Address: MapPin,
  "Previous School": School,
  "Academic Details": GraduationCap,
  Documents: FileCheck,
  Fee: IndianRupee,
  Preview: Eye,
};

const formatPreviewValue = (field, value) => {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (field.type === "file") return value.name || String(value).split("\\").pop() || "Selected";
  if (field.type === "select") return field.options?.find((option) => String(option.value ?? option) === String(value))?.label || String(value);
  if (field.type === "checkbox") return value ? "Yes" : "No";
  return String(value);
};

const buildAdmissionFormData = (values) => {
  const formData = new FormData();
  appendIfPresent(formData, "AdmissionNo", values.admissionNo);
  appendIfPresent(formData, "AdmissionDate", toDateTime(values.admissionDate));
  appendIfPresent(formData, "AdmissionQuota", values.quota);
  appendIfPresent(formData, "FirstName", values.firstName);
  appendIfPresent(formData, "LastName", values.lastName);
  appendIfPresent(formData, "Gender", values.gender);
  appendIfPresent(formData, "DateOfBirth", toDateTime(values.dob));
  appendIfPresent(formData, "BloodGroup", values.bloodGroup);
  appendIfPresent(formData, "StudentPhoto", values.photo);
  appendIfPresent(formData, "Email", values.email);
  appendIfPresent(formData, "MobileNumber", values.mobile);
  appendIfPresent(formData, "RollNo", values.rollNumber);
  appendIfPresent(formData, "AadhaarNumber", values.aadhaar);
  appendIfPresent(formData, "Nationality", values.nationality);
  appendIfPresent(formData, "Religion", values.religion);
  appendIfPresent(formData, "Category", values.caste);
  appendIfPresent(formData, "FatherName", values.fatherName);
  appendIfPresent(formData, "FatherOccupation", values.fatherOccupation);
  appendIfPresent(formData, "FatherMobile", values.fatherMobile);
  appendIfPresent(formData, "FatherEmail", values.fatherEmail);
  appendIfPresent(formData, "MotherName", values.motherName);
  appendIfPresent(formData, "MotherOccupation", values.motherOccupation);
  appendIfPresent(formData, "MotherMobile", values.motherMobile);
  appendIfPresent(formData, "MotherEmail", values.motherEmail);
  appendIfPresent(formData, "GuardianName", values.guardianName);
  appendIfPresent(formData, "GuardianMobile", values.guardianMobile);
  appendIfPresent(formData, "GuardianEmail", values.guardianEmail);
  appendIfPresent(formData, "AnnualIncome", values.annualIncome);
  appendIfPresent(formData, "Address", [values.address1, values.address2, values.city, values.district, values.state, values.pincode].filter(Boolean).join(", "));
  appendIfPresent(formData, "AddressLine1", values.address1);
  appendIfPresent(formData, "AddressLine2", values.address2);
  appendIfPresent(formData, "City", values.city);
  appendIfPresent(formData, "District", values.district);
  appendIfPresent(formData, "State", values.state);
  appendIfPresent(formData, "Pincode", values.pincode);
  appendIfPresent(formData, "BoardId", values.board);
  appendIfPresent(formData, "AcademicYearId", values.year);
  appendIfPresent(formData, "AcademicLevel", values.level);
  appendIfPresent(formData, "GroupId", values.group);
  appendIfPresent(formData, "SectionId", values.section);
  appendIfPresent(formData, "Medium", values.medium);
  appendIfPresent(formData, "SecondLanguage", values.secondLanguage);
  appendIfPresent(formData, "AdmissionType", values.admissionType);
  appendIfPresent(formData, "ScholarshipStatus", values.scholarshipStatus);
  appendIfPresent(formData, "PreviousSchool", values.prevSchool);
  appendIfPresent(formData, "PreviousBoard", values.prevBoard);
  appendIfPresent(formData, "PreviousYearOfPassing", values.passYear);
  appendIfPresent(formData, "PreviousPercentage", values.prevMarks);
  appendIfPresent(formData, "TransferCertificate", values.docTc);
  appendIfPresent(formData, "MarksMemo", values.docMarks);
  appendIfPresent(formData, "AadhaarDocument", values.docAadhaar);
  appendIfPresent(formData, "CasteCertificate", values.docCaste);
  appendIfPresent(formData, "IncomeCertificate", values.docIncome);
  appendIfPresent(formData, "Remarks", values.remarks);
  appendIfPresent(formData, "TotalFee", values.totalFee);
  appendIfPresent(formData, "Discount", values.discount);
  appendIfPresent(formData, "Fine", values.fine);
  appendIfPresent(formData, "NetPayable", values.netPayable);
  appendIfPresent(formData, "AmountPaid", values.amountPaid);
  appendIfPresent(formData, "BalanceAmount", values.balanceAmount);
  appendIfPresent(formData, "PaymentMode", values.paymentMode);
  appendIfPresent(formData, "TransactionNumber", values.transactionNumber);
  return formData;
};

const sanitizeValue = (field, value) => {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (MOBILE_FIELDS.has(field.name)) return text.replace(/\D/g, "").slice(0, 10);
  if (field.name === "aadhaar") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.aadhaar);
  if (field.name === "pincode") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.pincode);
  if (field.name === "annualIncome") return text.replace(/[^\d.]/g, "");
  if (AMOUNT_FIELDS.has(field.name)) return text.replace(/[^\d.]/g, "");
  if (field.name === "passYear") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.passYear);
  if (ALPHA_FIELDS.has(field.name)) return text.replace(/[^A-Za-z ]/g, "").replace(/\s{2,}/g, " ");
  return text;
};

const fieldByName = steps
  .flatMap((section) => section.fields)
  .reduce((lookup, field) => ({ ...lookup, [field.name]: field }), {});

const focusFirstError = (nextErrors) => {
  const [firstName] = Object.keys(nextErrors);
  if (!firstName) return;
  window.setTimeout(() => {
    const input = document.getElementById(`f-${firstName}`) || document.getElementById(`file-${firstName}`);
    input?.focus();
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 0);
};

const isBrowserStorageAvailable = () => typeof window !== "undefined" && window.localStorage;

const isFileFieldName = (name) => fieldByName[name]?.type === "file";

const toSerializableAdmissionValues = (currentValues) => Object.entries(currentValues).reduce((draftValues, [name, value]) => {
  if (isFileFieldName(name)) return draftValues;
  if (typeof File !== "undefined" && value instanceof File) return draftValues;
  if (value === undefined) return draftValues;
  draftValues[name] = value;
  return draftValues;
}, {});

const safeStepIndex = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), allSteps.length - 1);
};

const readAdmissionDraft = () => {
  if (!isBrowserStorageAvailable()) return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };

  const raw = window.localStorage.getItem(ADMISSION_DRAFT_KEY);
  if (!raw) return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };

  try {
    const draft = JSON.parse(raw);
    const values = draft?.formData && typeof draft.formData === "object" ? draft.formData : {};
    const feeSelection = Array.isArray(draft?.feeSelection) ? draft.feeSelection.map(String) : [];
    return {
      values,
      step: safeStepIndex(draft?.currentStep),
      feeSelection,
      hasFeeSelection: Array.isArray(draft?.feeSelection),
    };
  } catch {
    window.localStorage.removeItem(ADMISSION_DRAFT_KEY);
    return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };
  }
};

const persistAdmissionDraft = ({ currentStep, formData, feeSelection }) => {
  if (!isBrowserStorageAvailable()) return;

  window.localStorage.setItem(ADMISSION_DRAFT_KEY, JSON.stringify({
    currentStep: safeStepIndex(currentStep),
    formData: toSerializableAdmissionValues(formData),
    feeSelection: Array.isArray(feeSelection) ? feeSelection.map(String) : [],
    updatedAt: new Date().toISOString(),
  }));
};

const clearAdmissionDraft = () => {
  if (isBrowserStorageAvailable()) window.localStorage.removeItem(ADMISSION_DRAFT_KEY);
};

const hasDraftContent = (formData, feeSelection) => (
  Object.values(toSerializableAdmissionValues(formData)).some((value) => value !== undefined && value !== null && String(value).trim() !== "")
  || feeSelection.length > 0
);

function AdmissionPreview({ sections, values, errors, onEdit }) {
  return (
    <div className="cms-admission-preview">
      {sections.map((section, index) => (
        <section key={section.title} className="cms-preview-section">
          <div className="cms-preview-head">
            <h3>{section.title}</h3>
            <button type="button" className="cms-btn cms-btn-ghost cms-preview-edit" onClick={() => onEdit(index)}>
              <Edit3 size={14} /> Edit
            </button>
          </div>
          <div className="cms-preview-grid">
            {(section.previewFields ?? section.fields).map((field) => {
              const value = values[field.name];
              const missingRequired = field.required && (value === undefined || value === null || String(value).trim() === "");
              return (
                <div key={field.name} className={`cms-preview-item ${missingRequired ? "is-missing" : ""}`}>
                  <span>{field.label}</span>
                  <strong>{formatPreviewValue(field, value)}</strong>
                  {errors[field.name] || missingRequired ? <small>{errors[field.name] || `${field.label} is required`}</small> : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function AdmissionField({ field, value, error, onChange, onFileChange, onFileRemove, inputRef }) {
  if (field.type !== "file") {
    return <Field field={field} value={value} error={error} onChange={onChange} />;
  }

  const fileName = value?.name || "";
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      <label htmlFor={`file-${field.name}`}>
        {field.label} {field.required ? <span className="req">*</span> : null}
      </label>
      <div className={`cms-file-control ${fileName ? "has-file" : ""}`}>
        <input
          ref={inputRef}
          id={`file-${field.name}`}
          type="file"
          onChange={(event) => onFileChange(field, event.target.files?.[0] || null)}
        />
        {fileName ? (
          <span>{fileName}</span>
        ) : null}
        {fileName ? (
          <button type="button" className="cms-file-remove" onClick={() => onFileRemove(field.name)} aria-label={`Remove ${field.label}`}>
            <X size={14} />
          </button>
        ) : null}
      </div>
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

function FeeStep({ context, structures, selectedIds, onToggleStructure, loading, error, fields, values, errors, onChange }) {
  const totalFee = Number(values.totalFee || 0);
  const discount = Number(values.discount || 0);
  const fine = Number(values.fine || 0);
  const netPayable = Math.max(totalFee - discount + fine, 0);
  const amountPaid = Number(values.amountPaid || 0);
  const balance = Math.max(netPayable - amountPaid, 0);

  return (
    <div className="cms-fee-step">
      <div className="cms-fee-context">
        {context.map((item) => (
          <div key={item.label} className="cms-fee-context-item">
            <span>{item.label}</span>
            <strong>{item.value || "Not provided"}</strong>
          </div>
        ))}
      </div>

      <section className="cms-fee-block">
        <h3>Applicable Fee Structure</h3>
        {loading ? (
          <p className="cms-fee-empty">Loading fee structure...</p>
        ) : error ? (
          <p className="cms-fee-empty">{error}</p>
        ) : structures.length === 0 ? (
          <p className="cms-fee-empty">No fee structure is configured for the selected board, academic year and group.</p>
        ) : (
          <table className="cms-fee-table">
            <thead>
              <tr>
                <th aria-label="Select" />
                <th>Fee Type</th>
                <th className="num">Amount</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {structures.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => onToggleStructure(row.id)}
                      aria-label={`Include ${row.type || "fee structure"}`}
                    />
                  </td>
                  <td>{row.type || "Fee type information is unavailable."}</td>
                  <td className="num">{formatRowAmount(row.amount)}</td>
                  <td>{row.due || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td>Total</td>
                <td className="num">{formatAmount(totalFee)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className="cms-fee-block">
        <h3>Payment Summary</h3>
        <div className="cms-fee-summary">
          <div><span>Total Fee</span><strong>{formatAmount(totalFee)}</strong></div>
          <div><span>Discount</span><strong>{formatAmount(discount)}</strong></div>
          <div><span>Fine</span><strong>{formatAmount(fine)}</strong></div>
          <div className="is-total"><span>Net Payable</span><strong>{formatAmount(netPayable)}</strong></div>
          <div><span>Amount Paid</span><strong>{formatAmount(amountPaid)}</strong></div>
          <div className="is-total"><span>Balance</span><strong>{formatAmount(balance)}</strong></div>
        </div>
      </section>

      <section className="cms-fee-block">
        <h3>Payment Details</h3>
        <div className="cms-form-grid cols-3">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={onChange}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdmissionPage() {
  const [initialDraft] = useState(readAdmissionDraft);
  const [step, setStep] = useState(initialDraft.step);
  const [values, setValues] = useState(initialDraft.values);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [masterOptions, setMasterOptions] = useState({});
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeSelection, setFeeSelection] = useState(initialDraft.feeSelection);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const fileInputRefs = useRef({});
  const stepNavRef = useRef(null);
  const stepButtonRefs = useRef({});
  const persistTimerRef = useRef(null);
  const suppressPersistRef = useRef(false);
  const feeSelectionInitializedRef = useRef(initialDraft.hasFeeSelection);

  const current = allSteps[step];
  const isPreview = current.title === "Preview";
  const isFeeStep = current.custom === "fee";
  const enhanceField = (field) => {
    if (field.name === "board" && masterOptions.boards?.length) return { ...field, options: masterOptions.boards };
    if (field.name === "year" && masterOptions.years?.length) return { ...field, options: masterOptions.years };
    if (field.name === "group" && masterOptions.groups?.length) return { ...field, options: masterOptions.groups };
    if (field.name === "section" && masterOptions.sections?.length) return { ...field, options: masterOptions.sections };
    return field;
  };
  const currentFields = current.fields.map(enhanceField);
  const previewSections = steps.map((section) => ({
    ...section,
    fields: section.fields.map(enhanceField),
  }));

  useEffect(() => {
    const container = stepNavRef.current;
    const activeButton = stepButtonRefs.current[step];
    if (!container || !activeButton) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const containerWidth = container.clientWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      const targetLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      container.scrollTo({ left: Math.max(targetLeft, 0), behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (!values.board || !values.year || !values.group) {
      setFeeStructures([]);
      setFeeSelection([]);
      feeSelectionInitializedRef.current = false;
      return undefined;
    }

    let ignore = false;
    setFeeLoading(true);
    setFeeError("");

    apiClient.get(apiEndpoints.fee.getStructures)
      .then((response) => {
        if (ignore) return;
        const rows = getCollection(response.data)
          .flatMap(expandFeeStructureItems)
          .map(normalizeFeeStructure)
          .filter((row) => row.id && matchesAdmission(row, values));
        const availableIds = rows.map((row) => row.id);
        setFeeStructures(rows);
        setFeeSelection((currentSelection) => {
          if (feeSelectionInitializedRef.current) {
            return currentSelection.filter((id) => availableIds.includes(id));
          }
          feeSelectionInitializedRef.current = true;
          return availableIds;
        });
      })
      .catch((error) => {
        if (ignore) return;
        setFeeStructures([]);
        setFeeSelection([]);
        setFeeError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!ignore) setFeeLoading(false);
      });

    return () => { ignore = true; };
  }, [values.board, values.year, values.group]);

  useEffect(() => {
    if (suppressPersistRef.current) return undefined;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistAdmissionDraft({ currentStep: step, formData: values, feeSelection });
    }, 250);

    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [step, values, feeSelection]);

  useEffect(() => {
    const total = feeStructures
      .filter((row) => feeSelection.includes(row.id))
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const nextTotal = total ? String(total) : "";
    setValues((currentValues) => (currentValues.totalFee === nextTotal ? currentValues : { ...currentValues, totalFee: nextTotal }));
  }, [feeStructures, feeSelection]);

  useEffect(() => {
    const totalFee = Number(values.totalFee || 0);
    const discount = Number(values.discount || 0);
    const fine = Number(values.fine || 0);
    const amountPaid = Number(values.amountPaid || 0);
    const netPayable = Math.max(totalFee - discount + fine, 0);
    const balanceAmount = Math.max(netPayable - amountPaid, 0);
    const nextNetPayable = totalFee || discount || fine ? String(netPayable) : "";
    const nextBalanceAmount = totalFee || discount || fine || amountPaid ? String(balanceAmount) : "";

    if (values.netPayable !== nextNetPayable || values.balanceAmount !== nextBalanceAmount) {
      setValues((currentValues) => ({
        ...currentValues,
        netPayable: nextNetPayable,
        balanceAmount: nextBalanceAmount,
      }));
    }
  }, [values.totalFee, values.discount, values.fine, values.amountPaid, values.netPayable, values.balanceAmount]);

  useEffect(() => {
    let ignore = false;

    const loadAdmissionMasters = async () => {
      const [boardsResult, yearsResult, groupsResult, sectionsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.boards.getAll),
        apiClient.get(apiEndpoints.academicYears.getAll),
        apiClient.get(apiEndpoints.groups.getAll),
        apiClient.get(apiEndpoints.sections.getAll),
      ]);

      if (ignore) return;
      setMasterOptions({
        boards: boardsResult.status === "fulfilled"
          ? getCollection(boardsResult.value.data)
            .map((item) => toOption(item, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "boardCode", "BoardCode", "name", "Name"]))
            .filter(Boolean)
          : [],
        years: yearsResult.status === "fulfilled"
          ? getCollection(yearsResult.value.data)
            .map((item) => toOption(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]))
            .filter(Boolean)
          : [],
        groups: groupsResult.status === "fulfilled"
          ? getCollection(groupsResult.value.data)
            .map((item) => toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]))
            .filter(Boolean)
          : [],
        sections: sectionsResult.status === "fulfilled"
          ? getCollection(sectionsResult.value.data)
            .map((item) => toOption(item, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "section", "Section", "name", "Name"]))
            .filter(Boolean)
          : [],
      });
    };

    const generateAdmissionNumber = async () => {
      try {
        const response = await apiClient.post(apiEndpoints.admissions.generateNumber);
        const data = response.data?.data ?? response.data?.Data ?? response.data;
        const generatedNumber = typeof data === "string"
          ? data
          : read(data, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
        if (!ignore && generatedNumber) {
          setValues((currentValues) => currentValues.admissionNo ? currentValues : { ...currentValues, admissionNo: String(generatedNumber) });
        }
      } catch {
        if (!ignore) setToast("Admission number can be entered manually if generation is unavailable");
      }
    };

    loadAdmissionMasters();
    generateAdmissionNumber();
    return () => { ignore = true; };
  }, []);

  const toggleFeeStructure = (id) => {
    feeSelectionInitializedRef.current = true;
    setFeeSelection((selected) => (selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]));
  };

  const optionLabel = (list, value) => list?.find((option) => String(option.value) === String(value))?.label || "";

  const feeContext = [
    { label: "Student", value: [values.firstName, values.lastName].filter(Boolean).join(" ") },
    { label: "Admission Number", value: values.admissionNo },
    { label: "Board", value: optionLabel(masterOptions.boards, values.board) || values.board },
    { label: "Academic Year", value: optionLabel(masterOptions.years, values.year) || values.year },
    { label: "Group", value: optionLabel(masterOptions.groups, values.group) || values.group },
    { label: "Section", value: optionLabel(masterOptions.sections, values.section) || values.section },
  ];

  const setValue = (name, val) => {
    const field = fieldByName[name] || {};
    if (["board", "year", "group"].includes(name)) {
      feeSelectionInitializedRef.current = false;
      setFeeSelection([]);
    }
    setValues((v) => ({ ...v, [name]: sanitizeValue(field, val) }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const setFileValue = (field, file) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_SIZE) {
      if (fileInputRefs.current[field.name]) fileInputRefs.current[field.name].value = "";
      setValues((v) => {
        const next = { ...v };
        delete next[field.name];
        return next;
      });
      setErrors((e) => ({ ...e, [field.name]: "File size must not exceed 2 MB." }));
      return;
    }
    setValues((v) => ({ ...v, [field.name]: file }));
    setErrors((e) => ({ ...e, [field.name]: undefined }));
  };

  const removeFileValue = (name) => {
    if (fileInputRefs.current[name]) fileInputRefs.current[name].value = "";
    setValues((v) => {
      const next = { ...v };
      delete next[name];
      return next;
    });
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validateFields = (fields) => {
    const next = {};
    fields.forEach((f) => {
      const val = values[f.name];
      if (f.required && !String(val ?? "").trim()) next[f.name] = `${f.label} is required`;
      else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) next[f.name] = "Enter a valid email";
      else if (MOBILE_FIELDS.has(f.name) && val && !/^[0-9]{10}$/.test(String(val))) next[f.name] = "Enter a valid 10 digit number";
      else if (f.name === "aadhaar" && val && !/^[0-9]{12}$/.test(String(val))) next[f.name] = "Enter a valid 12 digit Aadhaar number";
      else if (f.name === "pincode" && val && !/^[0-9]{6}$/.test(String(val))) next[f.name] = "Enter a valid 6 digit pincode";
      else if (ALPHA_FIELDS.has(f.name) && val && !/^[A-Za-z ]+$/.test(String(val))) next[f.name] = `${f.label} can contain only letters and spaces`;
      else if (f.type === "number" && val && Number.isNaN(Number(val))) next[f.name] = "Enter a valid number";
      else if (f.type === "file" && val?.size > MAX_DOCUMENT_SIZE) next[f.name] = "File size must not exceed 2 MB.";
      else if (f.name === "paymentMode" && !val && Number(values.amountPaid || 0) > 0) next[f.name] = "Payment Mode is required when an amount is paid";
      else if (f.name === "amountPaid" && Number(val || 0) > Number(values.netPayable || 0)) next[f.name] = "Amount Paid cannot exceed Net Payable";
    });
    return next;
  };

  const validateStepAt = (stepIndex) => validateFields(steps[stepIndex]?.fields || []);

  const validateStep = (stepIndex = step) => {
    const next = validateStepAt(stepIndex);
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateAdmission = () => {
    const next = steps.reduce((all, section) => ({ ...all, ...validateFields(section.fields) }), {});
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateBeforeStep = (targetStep) => {
    const relevantSteps = steps.slice(0, Math.min(targetStep, steps.length));
    const next = {};
    let firstInvalidStep = -1;

    relevantSteps.forEach((section, index) => {
      const sectionErrors = validateFields(section.fields);
      if (Object.keys(sectionErrors).length && firstInvalidStep === -1) firstInvalidStep = index;
      Object.assign(next, sectionErrors);
    });

    if (firstInvalidStep !== -1) {
      setErrors(next);
      setStep(firstInvalidStep);
      focusFirstError(next);
      setToast(`Please complete ${steps[firstInvalidStep].title} before continuing`);
      return false;
    }
    return true;
  };

  const goToStep = (targetStep) => {
    if (targetStep <= step) {
      persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
      setStep(targetStep);
      return;
    }
    if (validateBeforeStep(targetStep)) {
      persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
      setStep(targetStep);
    }
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < allSteps.length - 1) {
      const nextStep = step + 1;
      persistAdmissionDraft({ currentStep: nextStep, formData: values, feeSelection });
      setStep(nextStep);
    }
  };

  const resetAdmissionDraftState = () => {
    suppressPersistRef.current = true;
    clearAdmissionDraft();
    setValues({});
    setFeeSelection([]);
    feeSelectionInitializedRef.current = false;
    Object.values(fileInputRefs.current).forEach((input) => {
      if (input) input.value = "";
    });
    setStep(0);
    window.setTimeout(() => { suppressPersistRef.current = false; }, 0);
  };

  const backOrCancel = () => {
    if (step !== 0) {
      const previousStep = step - 1;
      persistAdmissionDraft({ currentStep: previousStep, formData: values, feeSelection });
      setStep(previousStep);
      return;
    }

    if (hasDraftContent(values, feeSelection)) {
      const discard = window.confirm("You have an unfinished admission draft. Do you want to discard it?");
      if (!discard) return;
    }
    resetAdmissionDraftState();
  };

  const editPreviewStep = (targetStep) => {
    persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
    setStep(targetStep);
  };

  // Reuses the existing Fee Collection contract:
  // studentId, feeStructureId, amount, paymentMode, discount, fine, transactionNumber
  const collectAdmissionFee = (studentId) => {
    const amountPaid = Number(values.amountPaid || 0);
    const selected = feeStructures.filter((row) => feeSelection.includes(row.id));
    if (!studentId || amountPaid <= 0 || selected.length === 0) return Promise.resolve();

    let remaining = amountPaid;
    const payments = [];
    selected.forEach((row) => {
      if (remaining <= 0) return;
      const amount = Math.min(remaining, Number(row.amount ?? 0)) || remaining;
      remaining -= amount;
      payments.push({ structureId: row.id, amount });
    });
    if (remaining > 0 && payments.length) payments[payments.length - 1].amount += remaining;

    return Promise.allSettled(payments.map((payment, index) => apiClient.post(apiEndpoints.fee.collect, {
      studentId: Number(studentId),
      feeStructureId: Number(payment.structureId),
      amount: Number(payment.amount),
      paymentMode: values.paymentMode || "",
      discount: index === 0 ? Number(values.discount || 0) : 0,
      fine: index === 0 ? Number(values.fine || 0) : 0,
      transactionNumber: values.transactionNumber || "",
    })));
  };

  const submit = () => {
    if (!validateAdmission()) {
      setToast("Please complete required admission details before submitting");
      return;
    }
    setSaving(true);
    apiClient.post(apiEndpoints.admissions.create, buildAdmissionFormData(values), {
      headers: { "Content-Type": undefined },
    }).then((response) => {
      const data = response.data?.data ?? response.data?.Data ?? response.data;
      const savedNumber = read(data, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || values.admissionNo;
      const studentId = read(data, "studentId", "StudentId", "id", "Id");
      collectAdmissionFee(studentId);
      setToast(savedNumber ? `Admission ${savedNumber} submitted successfully` : "Admission submitted successfully");
      resetAdmissionDraftState();
    }).catch((error) => {
      setToast(getApiErrorMessage(error));
    }).finally(() => {
      setSaving(false);
    });
  };

  return (
    <DashboardLayout
      title="Student Admission"
      subtitle="Multi-step admission form with document upload."
      breadcrumb={["People"]}
    >
      <div className="cms-steps" ref={stepNavRef}>
        {allSteps.map((s, i) => {
          const StepIcon = stepIcons[s.title] || BookOpen;
          return (
            <button
              key={s.title}
              ref={(element) => { stepButtonRefs.current[i] = element; }}
              type="button"
              className={`cms-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
              onClick={() => goToStep(i)}
            >
              <span className="cms-step-num"><StepIcon size={13} strokeWidth={2.2} /></span>
              <span className="cms-step-label">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Step {step + 1} of {allSteps.length} - {current.title}</h2>
          {current.title === "Documents" ? (
            <span className="cms-badge cms-badge-info"><Upload size={12} /> Max 2 MB per file</span>
          ) : null}
        </div>
        <div className="cms-card-body">
          {isPreview ? (
            <AdmissionPreview sections={previewSections} values={values} errors={errors} onEdit={editPreviewStep} />
          ) : isFeeStep ? (
            <FeeStep
              context={feeContext}
              structures={feeStructures}
              selectedIds={feeSelection}
              onToggleStructure={toggleFeeStructure}
              loading={feeLoading}
              error={feeError}
              fields={currentFields}
              values={values}
              errors={errors}
              onChange={setValue}
            />
          ) : (
            <div className="cms-form-grid cols-3">
              {currentFields.map((f) => (
                <AdmissionField
                  key={f.name}
                  field={f}
                  value={values[f.name]}
                  error={errors[f.name]}
                  onChange={setValue}
                  onFileChange={setFileValue}
                  onFileRemove={removeFileValue}
                  inputRef={(element) => { fileInputRefs.current[f.name] = element; }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={backOrCancel}>
            {step === 0 ? "Cancel" : isPreview ? "Back" : "Previous"}
          </button>
          {!isPreview ? (
            <button className="cms-btn cms-btn-primary" onClick={next}>
              {step === steps.length - 1 ? "Preview" : "Save & Continue"}
            </button>
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
