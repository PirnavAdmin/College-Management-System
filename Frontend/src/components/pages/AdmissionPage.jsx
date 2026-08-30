import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ClipboardList,
  Edit3,
  Eye,
  GraduationCap,
  IndianRupee,
  MapPin,
  Plus,
  School,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
import {
  DEFAULT_INSTALLMENT_COUNT,
  INSTALLMENT_COUNTS,
  PAYMENT_METHODS,
  buildInstallmentSchedule,
  feeScheduleLabel,
  formatCurrency,
  formatDate,
  todayISO,
} from "@/data/feeManagementData.js";

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;
const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `\u20b9${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN")}`;
};
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
const ADMISSION_GENDER_OPTIONS = ["Male", "Female", "Other"];

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

const getObject = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  if (data?.Data && !Array.isArray(data.Data)) return data.Data;
  if (data && !Array.isArray(data)) return data;
  return {};
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

const isLooseId = (value) => {
  const text = String(value ?? "").trim();
  return text === "" || text === "0";
};

const idsMatchOrLoose = (selected, candidate) => (
  !selected || isLooseId(candidate) || String(candidate) === String(selected)
);

const textMatchesOrLoose = (selected, candidate) => (
  !selected || !candidate || String(candidate).trim().toLowerCase() === String(selected).trim().toLowerCase()
);

const isPlaceholderOption = (value) => String(value || "").startsWith("__");

function optionLabel(list, value) {
  return list?.find((option) => String(option.value) === String(value))?.label || "";
}

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

const feeTypeIdentity = (item) => {
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  return [
    getFeeTypeName(item),
    readText(item, "feeTypeCode", "FeeTypeCode", "code", "Code"),
    readText(feeType, "feeTypeCode", "FeeTypeCode", "code", "Code"),
  ].join(" ").toLowerCase();
};

const classifyFeeItem = (item) => {
  const identity = feeTypeIdentity(item);
  if (identity.includes("admission")) return "admission";
  if (identity.includes("course") || identity.includes("tuition")) return "course";
  return "optional";
};

const isActiveRecord = (item) => {
  const status = read(item, "status", "Status");
  const isActive = read(item, "isActive", "IsActive", "active", "Active");
  if (typeof status === "string") return status.toLowerCase() !== "inactive";
  if (typeof isActive === "boolean") return isActive;
  return true;
};

const normalizeFeeStructureItem = (item, structure = {}) => {
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  const structureId = readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId")
    || readId(structure, "feeStructureId", "FeeStructureId", "id", "Id");
  const feeStructureItemId = readId(item, "feeStructureItemId", "FeeStructureItemId", "structureItemId", "StructureItemId", "itemId", "ItemId", "id", "Id");
  const feeTypeId = readId(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId")
    || readId(feeType, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId");
  const name = getFeeTypeName(item);
  const amount = readNumber(item, "amount", "Amount", "feeAmount", "FeeAmount", "originalAmount", "OriginalAmount") ?? 0;
  const mandatoryValue = read(item, "isMandatory", "IsMandatory", "required", "Required", "mandatory", "Mandatory");
  const required = typeof mandatoryValue === "string"
    ? mandatoryValue.toLowerCase() === "true" || mandatoryValue.toLowerCase() === "mandatory"
    : Boolean(mandatoryValue);
  if (!feeTypeId || !name || !structureId) return null;
  const id = feeStructureItemId || `${structureId}-${feeTypeId}`;
  return {
    id,
    structureId,
    feeStructureId: structureId,
    feeStructureItemId,
    structureItemId: feeStructureItemId,
    feeTypeId,
    type: name,
    originalAmount: amount,
    payableAmount: amount,
    required,
    selected: required,
    kind: classifyFeeItem(item),
  };
};

const normalizeFeeStructureSummary = (item) => {
  const group = read(item, "group", "Group");
  const program = read(item, "program", "Program");
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const id = readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId", "id", "Id");
  if (!id) return null;
  return {
    raw: item,
    id,
    boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
    academicYearId: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    groupId: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
    programId: readId(item, "programId", "ProgramId") || readId(program, "programId", "ProgramId", "id", "Id"),
    status: readText(item, "status", "Status") || (read(item, "isActive", "IsActive") === false ? "Inactive" : "Active"),
  };
};

const normalizeScholarship = (item) => {
  const id = readId(item, "scholarshipId", "ScholarshipId", "id", "Id");
  const name = readText(item, "scholarshipName", "ScholarshipName", "name", "Name", "title", "Title");
  if (!id || !name || !isActiveRecord(item)) return null;
  const discountType = readText(item, "discountType", "DiscountType", "type", "Type") || "Percentage";
  return {
    id,
    name,
    discountType: discountType === "%" ? "Percentage" : discountType,
    discountValue: readNumber(item, "discountValue", "DiscountValue", "value", "Value", "percentage", "Percentage", "amount", "Amount") ?? 0,
  };
};

const paymentPlanLabel = (plan) => COURSE_PAYMENT_PLAN_LABELS[plan] || feeScheduleLabel(plan);

const toOption = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) || value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const compactIds = (values = []) => (
  Array.isArray(values)
    ? values.map((value) => String(value ?? "").trim()).filter(Boolean)
    : []
);

const normalizeBoardOption = (item) => {
  const option = toOption(item, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "boardCode", "BoardCode", "name", "Name"]);
  if (!option) return null;
  const levels = getCollection(read(item, "academicLevels", "AcademicLevels", "levels", "Levels"));
  const academicLevelIds = compactIds(read(item, "academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds"));
  const academicLevelNames = compactIds(read(item, "academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames"));
  const nestedLevelIds = levels.map((level) => readId(level, "academicLevelId", "AcademicLevelId", "id", "Id")).filter(Boolean);
  const nestedLevelNames = levels.map((level) => readText(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name")).filter(Boolean);
  return {
    ...option,
    academicLevelIds: academicLevelIds.length ? academicLevelIds : nestedLevelIds,
    academicLevelNames: academicLevelNames.length ? academicLevelNames : nestedLevelNames,
    levelMappingLoaded: Boolean(academicLevelIds.length || academicLevelNames.length || levels.length),
  };
};

const normalizeLevelOption = (item) => {
  const option = toOption(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]);
  return option ? {
    ...option,
    boardId: readId(item, "boardId", "BoardId"),
  } : null;
};

const toDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const localISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const yesterdayISO = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localISODate(date);
};

const isTodayOrFutureDate = (value) => {
  if (!value) return false;
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) && normalized >= localISODate(new Date());
};

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const ADMISSION_DRAFT_KEY = "studentAdmissionDraft";
const ADMISSION_DRAFT_VERSION = 2;
const ADMISSION_STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];
const COURSE_PAYMENT_PLANS = ["Full Payment", "Installment Payment"];
const COURSE_PAYMENT_PLAN_LABELS = {
  "Full Payment": "Full Course Payment",
  "Installment Payment": "Course Fee Schedule",
};
const PAGE_SIZE = 8;

const steps = [
  {
    title: "Admission",
    fields: [
      { name: "admissionNo", label: "Admission Number", required: true },
      { name: "admissionDate", label: "Admission Date", type: "date", required: true },
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "admissionType", label: "Admission Type", type: "select", options: ["Regular", "Lateral Entry", "Transfer"] },
      { name: "quota", label: "Admission Quota", type: "select", options: ["Regular", "Merit", "Management", "Sports", "Reserved","other"] },
    ],
  },
  {
    title: "Student Details",
    fields: [
      { name: "photo", label: "Student Photo", type: "file" },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "gender", label: "Gender", type: "select", options: ADMISSION_GENDER_OPTIONS, required: true },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "bloodGroup", label: "Blood Group", type: "select", options: [], required: true },
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
      { name: "fatherName", label: "Father Name" },
      { name: "fatherOccupation", label: "Father Occupation" },
      { name: "fatherMobile", label: "Father Mobile", type: "tel" },
      { name: "motherName", label: "Mother Name" },
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
      { name: "address1", label: "Address", required: true, full: true },
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
      { name: "prevBoard", label: "Previous Board", type: "select", options: [] },
      { name: "passYear", label: "Year of Passing", type: "number" },
      { name: "prevMarks", label: "Marks / GPA Obtained" },
      { name: "hallTicket", label: "Hall Ticket Number" },
    ],
  },
  {
    title: "Academic Details",
    fields: [
      { name: "level", label: "Academic Level", type: "select", options: [], required: true },
      { name: "group", label: "Group", type: "select", options: [] },
      { name: "program", label: "Program", type: "select", options: [] },
      { name: "medium", label: "Medium", type: "select", options: ["English", "Telugu", "Hindi"] },
      { name: "secondLanguage", label: "Second Language", type: "select", options: ["Sanskrit", "Telugu", "Hindi", "French"] },
    ],
  },
  {
    title: "Fee",
    custom: "fee",
    fields: [],
  },
];

// The stepper adds a final read-only Preview step after all data steps.
const allSteps = [...steps, { title: "Preview", fields: [] }];

const stepIcons = {
  Admission: ClipboardList,
  "Admission Details": ClipboardList,
  "Personal Details": User,
  "Student Details": User,
  "Contact Details": MapPin,
  "Parent / Guardian": Users,
  "Parent Details": Users,
  Address: MapPin,
  "Previous School": School,
  "Academic Details": GraduationCap,
  Fee: IndianRupee,
  Preview: Eye,
};

const OPTIONAL_STUDENT_PHOTO_FALLBACK = {
  fileName: "student-photo-placeholder.png",
  contentType: "image/png",
  base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
};

const optionalStudentPhotoFile = () => {
  if (typeof File === "undefined" || typeof atob === "undefined") return null;
  const bytes = Uint8Array.from(atob(OPTIONAL_STUDENT_PHOTO_FALLBACK.base64), (char) => char.charCodeAt(0));
  return new File([bytes], OPTIONAL_STUDENT_PHOTO_FALLBACK.fileName, { type: OPTIONAL_STUDENT_PHOTO_FALLBACK.contentType });
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
  if (typeof File !== "undefined" && values.photo instanceof File) {
    formData.append("StudentPhoto", values.photo);
  } else {
    const fallbackPhoto = optionalStudentPhotoFile();
    if (fallbackPhoto) formData.append("StudentPhoto", fallbackPhoto);
  }
  appendIfPresent(formData, "Email", values.email);
  appendIfPresent(formData, "MobileNumber", values.mobile);
  appendIfPresent(formData, "HallTicketNumber", values.hallTicket);
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
  appendIfPresent(formData, "AcademicLevelId", values.level);
  appendIfPresent(formData, "AcademicLevel", values.levelName || values.level);
  appendIfPresent(formData, "GroupId", values.group);
  appendIfPresent(formData, "ProgramId", values.program);
  appendIfPresent(formData, "Medium", values.medium);
  appendIfPresent(formData, "SecondLanguage", values.secondLanguage);
  appendIfPresent(formData, "AdmissionType", values.admissionType);
  appendIfPresent(formData, "ScholarshipStatus", values.scholarshipStatus);
  appendIfPresent(formData, "PreviousSchool", values.prevSchool);
  appendIfPresent(formData, "PreviousBoard", values.prevBoard);
  appendIfPresent(formData, "PreviousYearOfPassing", values.passYear);
  appendIfPresent(formData, "PreviousPercentage", values.prevMarks);
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

const migrateDraftStep = (draft) => {
  const parsed = Number(draft?.currentStep);
  if (!Number.isInteger(parsed)) return 0;
  if (Number(draft?.version) === ADMISSION_DRAFT_VERSION) return safeStepIndex(parsed);
  if (parsed === 6 || parsed === 7) return steps.findIndex((section) => section.title === "Fee");
  if (parsed > 7) return allSteps.length - 1;
  return safeStepIndex(parsed);
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
      step: migrateDraftStep(draft),
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
    version: ADMISSION_DRAFT_VERSION,
    currentStep: safeStepIndex(currentStep),
    formData: toSerializableAdmissionValues(formData),
    feeSelection: Array.isArray(feeSelection) ? feeSelection.map(String) : [],
    updatedAt: new Date().toISOString(),
  }));
};

const clearAdmissionDraft = () => {
  if (isBrowserStorageAvailable()) window.localStorage.removeItem(ADMISSION_DRAFT_KEY);
};

const normalizeAdmissionStatus = (value, fallback = "Pending") => {
  const status = String(value || "").trim().toLowerCase();
  if (["approved", "approve", "active", "completed", "complete", "submitted"].includes(status)) return "Approved";
  if (["rejected", "reject", "inactive", "cancelled", "canceled", "denied"].includes(status)) return "Rejected";
  if (["pending", "draft", "incomplete", "new", "created"].includes(status)) return "Pending";
  return fallback;
};

const admissionStatusClass = (status) => {
  if (status === "Approved") return "cms-badge-active";
  if (status === "Rejected") return "cms-badge-danger";
  return "cms-badge-warn";
};

const normalizeAdmissionRow = (item) => {
  const admissionId = readId(item, "admissionId", "AdmissionId", "id", "Id");
  const student = read(item, "student", "Student");
  const firstName = readText(item, "firstName", "FirstName");
  const lastName = readText(item, "lastName", "LastName");
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  const group = read(item, "group", "Group");
  const program = read(item, "program", "Program");
  const studentName = readText(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
    || [firstName, lastName].filter(Boolean).join(" ");
  const admissionNo = readText(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
  const status = normalizeAdmissionStatus(readText(item, "status", "Status", "admissionStatus", "AdmissionStatus"));
  const programName = readText(item, "programName", "ProgramName")
    || (typeof program === "string" ? program : readText(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"));

  return {
    id: admissionId || admissionNo,
    admissionId,
    studentId: readId(item, "studentId", "StudentId") || readId(student, "studentId", "StudentId", "id", "Id"),
    admissionNo,
    studentName,
    admissionDate: readText(item, "admissionDate", "AdmissionDate", "date", "Date"),
    academicYear: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id") || readText(item, "academicYearName", "AcademicYearName"),
    board: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id") || readText(item, "boardName", "BoardName"),
    group: readText(item, "groupName", "GroupName", "course", "Course") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")),
    program: programName,
    status,
    currentStep: 0,
    source: "api",
    raw: item,
    values: {
      admissionNo,
      admissionDate: readText(item, "admissionDate", "AdmissionDate", "date", "Date").slice(0, 10),
      admissionType: readText(item, "admissionType", "AdmissionType"),
      quota: readText(item, "admissionQuota", "AdmissionQuota", "quota", "Quota"),
      board: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
      year: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
      firstName,
      lastName,
      gender: readText(item, "gender", "Gender"),
      dob: readText(item, "dateOfBirth", "DateOfBirth", "dob", "DOB").slice(0, 10),
      bloodGroup: readText(item, "bloodGroup", "BloodGroup"),
      aadhaar: readText(item, "aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar"),
      mobile: readText(item, "mobileNumber", "MobileNumber", "mobile", "Mobile"),
      email: readText(item, "email", "Email"),
      religion: readText(item, "religion", "Religion"),
      caste: readText(item, "category", "Category", "caste", "Caste"),
      fatherName: readText(item, "fatherName", "FatherName"),
      fatherOccupation: readText(item, "fatherOccupation", "FatherOccupation"),
      fatherMobile: readText(item, "fatherMobile", "FatherMobile"),
      fatherEmail: readText(item, "fatherEmail", "FatherEmail"),
      motherName: readText(item, "motherName", "MotherName"),
      motherOccupation: readText(item, "motherOccupation", "MotherOccupation"),
      motherMobile: readText(item, "motherMobile", "MotherMobile"),
      motherEmail: readText(item, "motherEmail", "MotherEmail"),
      guardianName: readText(item, "guardianName", "GuardianName"),
      guardianMobile: readText(item, "guardianMobile", "GuardianMobile"),
      guardianEmail: readText(item, "guardianEmail", "GuardianEmail"),
      annualIncome: readText(item, "annualIncome", "AnnualIncome"),
      address1: readText(item, "addressLine1", "AddressLine1", "address", "Address"),
      address2: readText(item, "addressLine2", "AddressLine2"),
      city: readText(item, "city", "City"),
      district: readText(item, "district", "District"),
      state: readText(item, "state", "State"),
      pincode: readText(item, "pincode", "Pincode", "pinCode", "PinCode"),
      prevSchool: readText(item, "previousSchool", "PreviousSchool", "prevSchool", "PrevSchool"),
      prevBoard: readText(item, "previousBoard", "PreviousBoard", "prevBoard", "PrevBoard"),
      passYear: readText(item, "previousYearOfPassing", "PreviousYearOfPassing", "passYear", "PassYear"),
      prevMarks: readText(item, "previousPercentage", "PreviousPercentage", "prevMarks", "PrevMarks"),
      hallTicket: readText(item, "hallTicketNumber", "HallTicketNumber"),
      group: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
      groupName: readText(item, "groupName", "GroupName") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")),
      program: readId(item, "programId", "ProgramId") || readId(program, "programId", "ProgramId", "id", "Id"),
      programName,
      level: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
      levelName: readText(item, "academicLevelName", "AcademicLevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "academicLevelName", "AcademicLevelName", "name", "Name")),
      rollNumber: readText(item, "rollNo", "RollNo", "rollNumber", "RollNumber"),
      medium: readText(item, "medium", "Medium"),
      secondLanguage: readText(item, "secondLanguage", "SecondLanguage"),
    },
  };
};

const numericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const readStudentFeeAssignmentId = (payload) => {
  const data = getObject(payload);
  const rows = getCollection(payload);
  const source = rows[0] || data;
  return readId(
    source,
    "studentFeeAssignmentId",
    "StudentFeeAssignmentId",
    "studentFeeId",
    "StudentFeeId",
    "assignmentId",
    "AssignmentId",
    "id",
    "Id",
  );
};

const readPaymentPlanId = (payload) => readId(
  getObject(payload),
  "paymentPlanId",
  "PaymentPlanId",
  "id",
  "Id",
);

const resolveApprovedStudentId = (...sources) => {
  for (const source of sources) {
    const student = read(source, "student", "Student");
    const id = readId(source, "studentId", "StudentId") || readId(student, "studentId", "StudentId", "id", "Id");
    if (numericId(id)) return numericId(id);
  }
  return null;
};

const admissionFeeApprovalBody = (admissionId, status) => {
  const id = numericId(admissionId);
  if (status === "Rejected") {
    return { admissionId: id, rejectionReason: "Rejected from admission screen", remarks: "" };
  }
  return { admissionId: id, remarks: "" };
};

const collectPayload = ({ studentId, studentFeeId, amount, values, feeInstallmentId = null, note = "" }) => ({
  studentId: Number(studentId),
  studentFeeId: Number(studentFeeId),
  feeInstallmentId: feeInstallmentId ? Number(feeInstallmentId) : null,
  amount: Number(amount),
  paymentDate: toDateTime(values.paymentDate || values.admissionDate || todayISO()),
  paymentMode: values.paymentMethod || values.paymentMode || "Cash",
  discount: 0,
  fine: 0,
  transactionReference: values.transactionNumber || "",
  note,
});

const findApplicableFeeStructure = async ({ boardId, academicYearId, groupId, programId }) => {
  if (!boardId || !academicYearId || !groupId) {
    throw new Error("Fee account was not created because Board, Academic Year and Group are required to find a fee structure.");
  }
  const response = await apiClient.get(apiEndpoints.fee.getStructures);
  const summaries = getCollection(response.data)
    .flatMap(expandFeeStructureItems)
    .map(normalizeFeeStructureSummary)
    .filter(Boolean)
    .filter((item) => item.status.toLowerCase() !== "inactive");
  const matching = summaries.find((item) => (
    String(item.boardId) === String(boardId)
    && String(item.academicYearId) === String(academicYearId)
    && String(item.groupId) === String(groupId)
    && (programId ? String(item.programId) === String(programId) || !item.programId : !item.programId)
  ));
  if (!matching) throw new Error("No active fee structure is configured for the approved student's academic combination.");
  return matching;
};

// Derives fee numbers only from backend fee rows loaded into the form state.
const deriveAdmissionFee = (values) => {
  const baseItems = Array.isArray(values.feeItems) ? values.feeItems : [];
  const feeItems = baseItems.map((item, index) => {
    const originalAmount = Number(item.originalAmount ?? item.amount ?? 0);
    const required = Boolean(item.required);
    return {
      ...item,
      id: item.id || item.feeStructureItemId || item.feeTypeId || `fee-${index + 1}`,
      type: item.type || `Fee ${index + 1}`,
      originalAmount,
      selected: required || item.selected !== false,
      required,
      payableAmount: originalAmount,
      dueDate: item.dueDate || "",
      kind: item.kind || classifyFeeItem(item),
    };
  });
  const selectedItems = feeItems.filter((item) => item.selected);
  const admissionItems = selectedItems.filter((item) => item.kind === "admission");
  const courseItems = selectedItems.filter((item) => item.kind === "course");
  const optionalItems = selectedItems.filter((item) => item.kind === "optional");
  const admissionFee = admissionItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const courseFeeOriginal = courseItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const optionalFeesTotal = optionalItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const originalTotal = admissionFee + courseFeeOriginal + optionalFeesTotal;
  const concessionType = values.concessionType || values.scholarshipDiscountType || "Fixed";
  const concessionValue = Number(values.concessionValue || 0);
  const rawConcession = concessionType === "Percentage"
    ? (courseFeeOriginal * concessionValue) / 100
    : concessionValue;
  const courseConcession = Math.min(Math.max(Math.round(rawConcession), 0), courseFeeOriginal);
  const courseFeePayable = Math.max(courseFeeOriginal - courseConcession, 0);
  const totalCommitment = admissionFee + courseFeePayable + optionalFeesTotal;
  const schedule = Array.isArray(values.installments) ? values.installments : [];
  const isInstallment = values.paymentPlan === "Installment Payment";
  const firstInstallment = schedule[0]?.amount ? Number(schedule[0].amount) : 0;
  const coursePaidToday = isInstallment ? (values.collectFirstInstallment ? firstInstallment : 0) : courseFeePayable;
  const paidToday = admissionFee + optionalFeesTotal + coursePaidToday;
  const courseScheduleBalance = isInstallment ? Math.max(courseFeePayable - coursePaidToday, 0) : 0;

  return {
    feeStructureId: values.feeStructureId || "",
    admissionFee,
    courseFee: courseFeePayable,
    courseFeeOriginal,
    courseConcession,
    courseFeePayable,
    optionalFeesTotal,
    totalCommitment,
    admissionFeeDueToday: admissionFee,
    coursePaidToday,
    courseScheduleBalance,
    feeItems,
    selectedFeeItems: selectedItems,
    originalTotal,
    concessionName: values.concessionName || "",
    concessionType,
    concessionValue,
    concessionTotal: courseConcession,
    totalPayable: totalCommitment,
    paidToday,
    remaining: Math.max(totalCommitment - paidToday, 0),
    remainingBalance: Math.max(totalCommitment - paidToday, 0),
    paymentPlan: values.paymentPlan || "",
    paymentMethod: values.paymentMethod || "",
    schedule: schedule.map((row, index) => ({
      ...row,
      no: row.no ?? index + 1,
      paidAmount: isInstallment && values.collectFirstInstallment && index === 0 ? Number(row.amount || 0) : 0,
    })),
    courseSchedules: schedule.map((row, index) => ({
      ...row,
      no: row.no ?? index + 1,
      paidAmount: isInstallment && values.collectFirstInstallment && index === 0 ? Number(row.amount || 0) : 0,
    })),
  };
};

const feeStepErrors = (values) => {
  const next = {};
  const fee = deriveAdmissionFee(values);
  if (!values.feeStructureId || !fee.feeItems.length) return next;
  if (!fee.admissionFee) next.feeStructure = "Admission Fee is not configured in the selected fee structure";
  if (!fee.courseFeeOriginal) next.feeStructure = "Course Fee is not configured in the selected fee structure";
  if (fee.feeItems.some((item) => item.required && !item.selected)) next.feeItems = "Mandatory fees cannot be removed";
  if (!values.paymentPlan) next.paymentPlan = "Select a course fee payment plan";
  if (!values.paymentMethod) next.paymentMethod = "Payment Method is required when collecting money";
  if (!fee.selectedFeeItems.length) next.feeItems = "Select at least one applicable fee";
  if (fee.concessionType === "Percentage" && fee.concessionValue > 100) next.concessionValue = "Percentage concession cannot exceed 100%";
  if (fee.courseConcession > fee.courseFeeOriginal) next.concessionValue = "Concession cannot exceed the course fee";
  if (values.paymentMethod && values.paymentMethod !== "Cash" && !String(values.transactionNumber || "").trim()) {
    next.transactionNumber = "Transaction / Reference Number is required for this payment method";
  }

  if (values.paymentPlan === "Installment Payment") {
    const schedule = Array.isArray(values.installments) ? values.installments : [];
    const total = schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (schedule.length < 2) next.installments = "At least 2 fee schedules are required";
    else if (schedule.some((row) => Number(row.amount || 0) <= 0)) next.installments = "Every fee schedule amount must be greater than zero";
    else if (total !== fee.courseFeePayable) next.installments = `Course Fee Schedule total (${formatCurrency(total)}) must equal the course fee payable amount (${formatCurrency(fee.courseFeePayable)})`;
    else if (schedule.some((row) => !row.dueDate)) next.installments = "Every fee schedule needs a due date";
    else if (schedule.some((row, index) => index > 0 && String(row.dueDate) <= String(schedule[index - 1].dueDate))) {
      next.installments = "Course Fee Schedule due dates must be in ascending order and cannot conflict";
    }
  }
  return next;
};

// Renders a stored admission value for the read-only Preview step.
const formatPreviewValue = (field, value) => {
  if (value === undefined || value === null || String(value).trim() === "") return "-";
  if (field.type === "file") return value?.name || "Uploaded";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (AMOUNT_FIELDS.has(field.name)) return formatAmount(value);
  return String(value);
};

function AdmissionPreview({ sections, values, errors, onEdit, feeNode }) {
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
          {section.custom === "fee" ? (
            <div className="cms-preview-fee">{feeNode}</div>
          ) : (
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
          )}
        </section>
      ))}
    </div>
  );
}

function AdmissionField({ field, value, error, onChange, onFileChange, onFileRemove, inputRef }) {
  if (field.type === "select" && field.selectPlaceholder) {
    const normalizedOptions = (field.options || []).map((option) => (
      option && typeof option === "object"
        ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
        : { value: option, label: option, disabled: false }
    ));
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`}>
        <label htmlFor={`f-${field.name}`}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        <select
          id={`f-${field.name}`}
          value={value ?? ""}
          disabled={field.disabled}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">{field.selectPlaceholder}</option>
          {normalizedOptions.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
        {error ? <span className="cms-error">{error}</span> : null}
      </div>
    );
  }

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

function FeeSummaryRows({ fee }) {
  return (
    <div className="cms-fee-summary">
      <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
      <div><span>Course Fee Before Scholarship</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
      <div><span>Scholarship / Concession</span><strong>-{formatCurrency(fee.courseConcession)}</strong></div>
      <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
      <div><span>Optional Selected Fees</span><strong>{formatCurrency(fee.optionalFeesTotal)}</strong></div>
      <div className="is-total"><span>Total Fee Commitment</span><strong>{formatCurrency(fee.totalCommitment)}</strong></div>
      <div><span>Paid Today</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
      <div><span>Future Scheduled Course Fee</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
      <div className="is-total"><span>Remaining Balance</span><strong>{formatCurrency(fee.remainingBalance)}</strong></div>
      <div><span>Payment Plan</span><strong>{fee.paymentPlan ? paymentPlanLabel(fee.paymentPlan) : "Not selected"}</strong></div>
      <div><span>Payment Method</span><strong>{fee.paymentMethod || "Not selected"}</strong></div>
    </div>
  );
}

function FeeItemsTable({ feeItems, errors, onChange }) {
  const updateItem = (id, patch) => {
    onChange("feeItems", feeItems.map((item) => {
      if (item.id !== id) return item;
      return { ...item, ...patch };
    }));
  };

  return (
    <div className="cms-fee-scroll">
      <table className="cms-fee-table">
        <thead>
          <tr>
            <th>Apply</th>
            <th>Fee Type</th>
            <th>Default Rule</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {feeItems.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={item.required}
                  aria-label={`Apply ${item.type}`}
                  onChange={(event) => updateItem(item.id, { selected: event.target.checked })}
                />
              </td>
              <td>
                <strong>{item.type}</strong>
                {item.required ? <small className="cms-fee-required">Mandatory</small> : null}
              </td>
              <td>{item.required ? "Mandatory" : "Optional"}</td>
              <td className="num">{formatCurrency(item.originalAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Selected Fee Items Total</td>
            <td className="num">{formatCurrency(feeItems.filter((item) => item.selected).reduce((sum, item) => sum + item.originalAmount, 0))}</td>
          </tr>
        </tfoot>
      </table>
      {errors.feeItems ? <span className="cms-error">{errors.feeItems}</span> : null}
    </div>
  );
}

function ConcessionPanel({ fee, values, errors, onChange, scholarships }) {
  const scholarshipOptions = scholarships.map((item) => ({ value: item.id, label: item.name }));
  return (
    <section className="cms-fee-block">
      <h3>Scholarship / Concession</h3>
      <div className="cms-form-grid cols-3">
        <Field
          field={{ name: "scholarshipId", label: "Scholarship", type: "select", options: scholarshipOptions }}
          value={values.scholarshipId}
          error={errors.scholarshipId}
          onChange={onChange}
        />
        <div className="cms-fee-readonly-field">
          <span>Discount Type</span>
          <strong>{values.concessionType || "-"}</strong>
        </div>
        <div className="cms-fee-readonly-field">
          <span>Discount Value</span>
          <strong>{values.concessionType === "Percentage" ? `${Number(values.concessionValue || 0)}%` : formatCurrency(values.concessionValue || 0)}</strong>
        </div>
      </div>
      <div className="cms-fee-concession-summary">
        <div><span>Course Fee Before Scholarship</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
        <div><span>Course Scholarship</span><strong>-{formatCurrency(fee.courseConcession)}</strong></div>
        <div className="is-total"><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
      </div>
    </section>
  );
}

function InstallmentScheduleTable({ schedule, editable, onChange }) {
  return (
    <div className="cms-fee-scroll">
      <table className="cms-fee-table">
        <thead>
          <tr>
            <th>Course Fee Schedule</th>
            <th className="num">Amount</th>
            <th>Due Date</th>
            <th className="num">Paid Amount</th>
            <th className="num">Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, index) => (
            <tr key={row.no}>
              <td>Course Fee Schedule {row.no}</td>
              <td className="num">
                {editable ? (
                  <input
                    className="cms-mini-input"
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={(event) => onChange(index, "amount", event.target.value)}
                    aria-label={`Course Fee Schedule ${row.no} amount`}
                  />
                ) : formatCurrency(row.amount)}
              </td>
              <td>
                {editable ? (
                  <input
                    className="cms-mini-input"
                    type="date"
                    value={row.dueDate || ""}
                    onChange={(event) => onChange(index, "dueDate", event.target.value)}
                    aria-label={`Course Fee Schedule ${row.no} due date`}
                  />
                ) : formatDate(row.dueDate)}
              </td>
              <td className="num">{formatCurrency(row.paidAmount || 0)}</td>
              <td className="num">{formatCurrency(Math.max(Number(row.amount || 0) - Number(row.paidAmount || 0), 0))}</td>
              <td>
                <span className={`cms-badge ${row.paidAmount ? "cms-badge-active" : "cms-badge-warn"}`}>
                  {row.paidAmount ? "Paid" : "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{formatCurrency(schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FeeStep({ context, fee, values, errors, onChange, onInstallmentChange, onPlanChange, onInstallmentCountChange, scholarships = [], feeStructureLoading, feeStructureError }) {
  const hasStructure = fee.feeItems.length > 0;
  const isInstallment = values.paymentPlan === "Installment Payment";
  const schedule = fee.schedule;

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

      {feeStructureLoading ? (
        <section className="cms-fee-block">
          <p className="cms-fee-empty">Loading applicable fee structure...</p>
        </section>
      ) : !hasStructure ? (
        <section className="cms-fee-block">
          <p className="cms-fee-empty">
            {feeStructureError || "No active fee structure is configured for the selected academic combination. Configure it in Fee Management -> Fee Setup -> Fee Structure."}
          </p>
          {errors.feeStructure ? <span className="cms-error">{errors.feeStructure}</span> : null}
        </section>
      ) : (
        <>
          <section className="cms-fee-block">
            <h3>Applicable Fee Structure</h3>
            <FeeItemsTable feeItems={fee.feeItems} errors={errors} onChange={onChange} />
          </section>

          <section className="cms-fee-block">
            <h3>Admission Fee - Due Today</h3>
            <div className="cms-fee-summary">
              <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
              <div><span>Payment Requirement</span><strong>Due on admission</strong></div>
            </div>
          </section>

          <ConcessionPanel fee={fee} values={values} errors={errors} onChange={onChange} scholarships={scholarships} />

          <section className="cms-fee-block">
            <h3>Course Fee Payment Plan</h3>
            <div className="cms-fee-plan-grid">
              {COURSE_PAYMENT_PLANS.map((plan) => (
                <button
                  type="button"
                  key={plan}
                  className={`cms-fee-plan ${values.paymentPlan === plan ? "is-active" : ""}`}
                  onClick={() => onPlanChange(plan)}
                  aria-pressed={values.paymentPlan === plan}
                >
                  <span className="cms-fee-radio" aria-hidden="true" />
                  <span>
                    <strong>{paymentPlanLabel(plan)}</strong>
                    <small>{plan === "Full Payment" ? "Collect Admission Fee and the full Course Fee payable today." : "Collect Admission Fee today and schedule only the Course Fee payable."}</small>
                  </span>
                </button>
              ))}
            </div>
            {errors.paymentPlan ? <span className="cms-error">{errors.paymentPlan}</span> : null}
          </section>

          {isInstallment ? (
            <section className="cms-fee-block">
              <h3>Course Fee Schedule</h3>
              <div className="cms-fee-inline-fields">
                <div className="cms-field">
                  <label htmlFor="f-installmentCount">Number of Course Fee Schedules</label>
                  <select
                    id="f-installmentCount"
                    value={String(values.installmentCount || DEFAULT_INSTALLMENT_COUNT)}
                    onChange={(event) => onInstallmentCountChange(Number(event.target.value))}
                  >
                    {INSTALLMENT_COUNTS.map((count) => <option key={count} value={String(count)}>{count} Course Fee Schedules</option>)}
                  </select>
                </div>
                <label className="cms-fee-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(values.collectFirstInstallment)}
                    onChange={(event) => onChange("collectFirstInstallment", event.target.checked)}
                  />
                  <span>Collect First Course Fee Schedule Now</span>
                </label>
              </div>
              <InstallmentScheduleTable schedule={schedule} editable onChange={onInstallmentChange} />
              {errors.installments ? <span className="cms-error">{errors.installments}</span> : null}
            </section>
          ) : (
            <section className="cms-fee-block">
              <h3>Full Course Payment</h3>
              <div className="cms-fee-summary">
                <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
                <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
                <div><span>Optional One-Time Fees</span><strong>{formatCurrency(fee.optionalFeesTotal)}</strong></div>
                <div className="is-total"><span>Total Collecting Today</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
              </div>
            </section>
          )}

          <section className="cms-fee-block">
            <h3>Payment Today</h3>
            <div className="cms-fee-summary">
              <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFeeDueToday)}</strong></div>
              <div><span>Course Fee Paid Today</span><strong>{formatCurrency(fee.coursePaidToday)}</strong></div>
              {fee.optionalFeesTotal ? <div><span>Additional One-Time Fees Paid Today</span><strong>{formatCurrency(fee.optionalFeesTotal)}</strong></div> : null}
              <div className="is-total"><span>Total Collecting Today</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
            </div>
            <div className="cms-form-grid cols-3">
              <Field
                field={{ name: "paymentMethod", label: "Payment Method", type: "select", options: PAYMENT_METHODS, required: true }}
                value={values.paymentMethod}
                error={errors.paymentMethod}
                onChange={onChange}
              />
              <Field
                field={{
                  name: "transactionNumber",
                  label: "Transaction / Reference Number",
                  placeholder: values.paymentMethod === "Cash" ? "Optional for cash payments" : "Reference number",
                }}
                value={values.transactionNumber}
                error={errors.transactionNumber}
                onChange={onChange}
              />
              <Field
                field={{ name: "paymentDate", label: "Payment Date", type: "date" }}
                value={values.paymentDate || values.admissionDate || ""}
                error={errors.paymentDate}
                onChange={onChange}
              />
            </div>
          </section>

          <section className="cms-fee-block">
            <h3>Final Fee Summary</h3>
            <FeeSummaryRows fee={fee} />
          </section>
        </>
      )}
    </div>
  );
}

function FeePreview({ fee, values }) {
  return (
    <div className="cms-fee-preview">
      <div className="cms-fee-kv-grid">
        <div><span>Group</span><strong>{values.group || "Not provided"}</strong></div>
        <div><span>Program</span><strong>{values.programName || values.program || "Not provided"}</strong></div>
        <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
        <div><span>Course Fee</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
        <div><span>Scholarship</span><strong>{fee.concessionName || "No scholarship"}</strong></div>
        <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
        <div><span>Payment Plan</span><strong>{values.paymentPlan ? paymentPlanLabel(values.paymentPlan) : "Not selected"}</strong></div>
        <div><span>Paid Today</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
        <div><span>Future Course Schedules</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
        <div><span>Remaining Balance</span><strong>{formatCurrency(fee.remainingBalance)}</strong></div>
        <div><span>Payment Method</span><strong>{values.paymentMethod || "Not selected"}</strong></div>
      </div>
      {fee.selectedFeeItems.length ? (
        <div className="cms-fee-preview-schedule">
          <h4>Selected Fee Items</h4>
          <div className="cms-fee-scroll">
            <table className="cms-fee-table">
              <thead>
                <tr><th>Fee Type</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {fee.selectedFeeItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.type}</strong></td>
                    <td className="num">{formatCurrency(item.originalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {values.paymentPlan === "Installment Payment" && fee.courseSchedules.length ? (
        <div className="cms-fee-preview-schedule">
          <h4>Course Fee Schedule</h4>
          <InstallmentScheduleTable schedule={fee.courseSchedules} editable={false} onChange={() => {}} />
        </div>
      ) : null}
    </div>
  );
}

export default function AdmissionPage() {
  const [initialDraft] = useState(readAdmissionDraft);
  const [viewMode, setViewMode] = useState("list");
  const [step, setStep] = useState(initialDraft.step);
  const [values, setValues] = useState(initialDraft.values);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ year: "", group: "", program: "", status: "" });
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState("");
  const [masterOptions, setMasterOptions] = useState({});
  const [masterStatus, setMasterStatus] = useState({ groupsLoading: false, groupsError: "", sectionsError: "", programsLoading: false, programsError: "" });
  const [scholarships, setScholarships] = useState([]);
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [feeStructureError, setFeeStructureError] = useState("");
  const [admissionNumberLoading, setAdmissionNumberLoading] = useState(false);
  const [admissionNumberError, setAdmissionNumberError] = useState("");
  const [editingAdmissionId, setEditingAdmissionId] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [feeSelection, setFeeSelection] = useState(initialDraft.feeSelection);
  const fileInputRefs = useRef({});
  const stepNavRef = useRef(null);
  const stepButtonRefs = useRef({});
  const persistTimerRef = useRef(null);
  const suppressPersistRef = useRef(false);
  const feeSelectionInitializedRef = useRef(initialDraft.hasFeeSelection);
  const admissionNumberInFlightRef = useRef(false);
  const pincodeRequestRef = useRef(0);
  const programRequestRef = useRef(0);
  const boardMappingRequestRef = useRef(0);
  const autoLocationRef = useRef({ city: "", district: "", state: "" });

  const current = allSteps[step];
  const isPreview = current.title === "Preview";
  const isFeeStep = current.custom === "fee";
  const groupOptions = useMemo(() => {
    const rows = masterOptions.groups || [];
    return rows.filter((item) => (
      idsMatchOrLoose(values.board, item.boardId)
      && idsMatchOrLoose(values.year, item.academicYearId)
      && idsMatchOrLoose(values.level, item.academicLevelId)
    ));
  }, [masterOptions.groups, values.board, values.level, values.year]);
  const sectionOptions = useMemo(() => {
    const rows = masterOptions.sections || [];
    const selectedGroupName = values.groupName || optionLabel(masterOptions.groups, values.group);
    const selectedLevelName = values.levelName || optionLabel(masterOptions.levels, values.level);
    const selectedBoardName = optionLabel(masterOptions.boards, values.board);
    return rows.filter((item) => (
      (!values.group || idsMatchOrLoose(values.group, item.groupId) || textMatchesOrLoose(selectedGroupName, item.groupName))
      && idsMatchOrLoose(values.year, item.academicYearId)
      && (idsMatchOrLoose(values.level, item.academicLevelId) || textMatchesOrLoose(selectedLevelName, item.academicLevelName))
      && (!values.board || idsMatchOrLoose(values.board, item.boardId) || textMatchesOrLoose(selectedBoardName, item.boardName))
    ));
  }, [masterOptions.boards, masterOptions.groups, masterOptions.levels, masterOptions.sections, values.board, values.group, values.groupName, values.level, values.levelName, values.year]);
  const programOptions = useMemo(() => masterOptions.programs || [], [masterOptions.programs]);
  const academicYearOptions = useMemo(() => uniqueAcademicYearsByName(
    (masterOptions.years || []).filter((item) => (
      !values.board || !item.boardId || String(item.boardId) === String(values.board)
    )),
    (item) => item.label,
  ), [masterOptions.years, values.board]);
  const levelOptions = useMemo(() => {
    if (!values.board) return [];
    const levels = masterOptions.levels || [];
    const selectedBoard = (masterOptions.boards || []).find((item) => String(item.value) === String(values.board));
    if (!selectedBoard) return [];
    const mappedIds = new Set((selectedBoard.academicLevelIds || []).map(String));
    if (mappedIds.size) return levels.filter((item) => mappedIds.has(String(item.value)));
    const mappedNames = new Set((selectedBoard.academicLevelNames || []).map((name) => String(name).trim().toLowerCase()));
    if (mappedNames.size) return levels.filter((item) => mappedNames.has(String(item.label).trim().toLowerCase()));
    return levels.filter((item) => item.boardId && String(item.boardId) === String(values.board));
  }, [masterOptions.boards, masterOptions.levels, values.board]);
  const enhanceField = (field) => {
    if (field.name === "admissionNo" && !editingAdmissionId) {
      return {
        ...field,
        disabled: true,
        placeholder: admissionNumberLoading ? "Generating admission number..." : "Admission Number",
      };
    }
    if (field.name === "dob") return { ...field, max: yesterdayISO() };
    if (field.name === "board" && masterOptions.boards?.length) return { ...field, options: masterOptions.boards };
    if (field.name === "prevBoard" && masterOptions.boards?.length) return { ...field, options: masterOptions.boards };
    if (field.name === "year" && masterOptions.years?.length) return { ...field, options: academicYearOptions };
    if (field.name === "level") {
      if (!values.board) return { ...field, options: [], selectPlaceholder: "Select Board first", disabled: true };
      return {
        ...field,
        options: levelOptions,
        selectPlaceholder: levelOptions.length ? "Select Academic Level" : "No academic levels available",
        disabled: !levelOptions.length,
      };
    }
    if (field.name === "group") {
      if (!values.board || !values.year || !values.level) {
        return { ...field, options: [], selectPlaceholder: "Select Board, Academic Year and Academic Level first", disabled: true };
      }
      if (masterStatus.groupsLoading) return { ...field, options: [{ value: "__loading_groups", label: "Loading groups...", disabled: true }] };
      if (masterStatus.groupsError) return { ...field, options: [{ value: "__groups_error", label: "Unable to load groups. Please try again.", disabled: true }] };
      return { ...field, options: groupOptions.length ? groupOptions : [{ value: "__no_groups", label: "No groups available", disabled: true }] };
    }
    if (field.name === "section") {
      if (masterStatus.sectionsError) return { ...field, options: [{ value: "__sections_error", label: "Unable to load sections. Please try again.", disabled: true }] };
      return { ...field, options: sectionOptions.length ? sectionOptions : [{ value: "__no_sections", label: "No sections available", disabled: true }] };
    }
    if (field.name === "program") {
      if (!values.group) return { ...field, options: [{ value: "__select_group", label: "Select Group first", disabled: true }] };
      if (masterStatus.programsLoading) return { ...field, options: [{ value: "__loading_programs", label: "Loading programs...", disabled: true }] };
      if (masterStatus.programsError) return { ...field, options: [{ value: "__programs_error", label: "Unable to load programs. Please try again.", disabled: true }] };
      return { ...field, options: programOptions.length ? programOptions : [{ value: "__no_programs", label: "No programs available", disabled: true }] };
    }
    if (field.name === "bloodGroup" && masterOptions.bloodGroups?.length) return { ...field, options: masterOptions.bloodGroups };
    return field;
  };
  const currentFields = current.fields.map(enhanceField);
  const previewSections = steps.map((section) => ({
    ...section,
    fields: section.fields.map(enhanceField),
  }));
  const displayedAdmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return admissions.filter((row) => {
      const matchesSearch = !term
        || String(row.studentName || "").toLowerCase().includes(term)
        || String(row.admissionNo || "").toLowerCase().includes(term);
      const matchesYear = !filters.year || String(row.academicYear) === String(filters.year);
      const matchesGroup = !filters.group || String(row.group) === String(filters.group);
      const rowProgram = row.program;
      const matchesProgram = !filters.program || String(rowProgram) === String(filters.program);
      const matchesStatus = !filters.status || row.status === filters.status;
      return matchesSearch && matchesYear && matchesGroup && matchesProgram && matchesStatus;
    });
  }, [admissions, filters.group, filters.program, filters.status, filters.year, search]);
  const totalPages = Math.max(1, Math.ceil(displayedAdmissions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAdmissions = displayedAdmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const refreshAdmissions = async () => {
    setListLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.admissions.getAll);
      const apiRows = getCollection(response.data).map(normalizeAdmissionRow);
      setAdmissions(apiRows);
    } catch (err) {
      setAdmissions([]);
      setToast(getApiErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmissions();
  }, []);

  useEffect(() => {
    const container = stepNavRef.current;
    const activeStep = stepButtonRefs.current[step];
    if (!container || !activeStep) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const targetLeft = activeStep.offsetLeft - ((container.clientWidth - activeStep.offsetWidth) / 2);
      container.scrollTo({ left: Math.max(targetLeft, 0), behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (suppressPersistRef.current) return undefined;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistAdmissionDraft({ currentStep: step, formData: values, feeSelection });
    }, 250);

    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [feeSelection, step, values, viewMode]);

  // Keeps the fee step consistent: default plan, and an installment schedule
  // that always matches the applicable course fee.
  useEffect(() => {
    if (!values.feeStructureId || !values.feeItems?.length) return;
    const courseFeePayable = deriveAdmissionFee(values).courseFeePayable;
    setValues((current) => {
      const next = { ...current };
      let changed = false;
      if (!next.paymentPlan) {
        next.paymentPlan = "Full Payment";
        changed = true;
      }
      if (next.paymentPlan === "Installment Payment") {
        const count = Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT;
        const schedule = Array.isArray(next.installments) ? next.installments : [];
        const scheduleTotal = schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        if (schedule.length !== count || scheduleTotal !== courseFeePayable) {
          next.installmentCount = count;
          next.installments = buildInstallmentSchedule(courseFeePayable, count, next.admissionDate || todayISO());
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [values]);

  useEffect(() => {
    if (!isFeeStep) return;
    window.requestAnimationFrame(() => {
      document.querySelector(".cms-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [isFeeStep]);

  useEffect(() => {
    let ignore = false;

    const loadAdmissionMasters = async () => {
      setMasterStatus((current) => ({ ...current, groupsLoading: true, groupsError: "", sectionsError: "" }));
      const fetchGroups = () => apiClient.get(apiEndpoints.groups.dropdown)
        .catch((dropdownError) => {
          console.error("Unable to load group dropdown endpoint, falling back to groups list", dropdownError);
          return apiClient.get(apiEndpoints.groups.getAll, { params: { isActive: true } });
        });
      const [boardsResult, yearsResult, levelsResult, groupsResult, sectionsResult, bloodGroupsResult, scholarshipsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.boards.getAll),
        apiClient.get(apiEndpoints.academicYears.getAll),
        apiClient.get(apiEndpoints.boards.getAcademicLevels),
        fetchGroups(),
        apiClient.get(apiEndpoints.sections.getAll),
        apiClient.get(apiEndpoints.admissions.bloodGroups),
        apiClient.get(apiEndpoints.fee.scholarships),
      ]);

      if (ignore) return;
      if (groupsResult.status === "rejected") console.error("Unable to load admission groups", groupsResult.reason);
      if (sectionsResult.status === "rejected") console.error("Unable to load admission sections", sectionsResult.reason);
      if (scholarshipsResult.status === "fulfilled") {
        setScholarships(getCollection(scholarshipsResult.value.data).map(normalizeScholarship).filter(Boolean));
      } else {
        setScholarships([]);
      }
      setMasterOptions({
        boards: boardsResult.status === "fulfilled"
          ? getCollection(boardsResult.value.data)
            .map(normalizeBoardOption)
            .filter(Boolean)
          : [],
        years: yearsResult.status === "fulfilled"
          ? getCollection(yearsResult.value.data)
            .map((item) => {
              const option = toOption(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]);
              return option ? { ...option, boardId: readId(item, "boardId", "BoardId") } : null;
            })
            .filter(Boolean)
          : [],
        levels: levelsResult.status === "fulfilled"
          ? getCollection(levelsResult.value.data)
            .map(normalizeLevelOption)
            .filter(Boolean)
          : [],
        groups: groupsResult.status === "fulfilled"
          ? getCollection(groupsResult.value.data)
            .map((item) => {
              const option = toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
              return option ? {
                ...option,
                boardId: readId(item, "boardId", "BoardId"),
                academicYearId: readId(item, "academicYearId", "AcademicYearId"),
                academicLevelId: readId(item, "academicLevelId", "AcademicLevelId"),
              } : null;
            })
            .filter((item) => item?.value)
          : [],
        sections: sectionsResult.status === "fulfilled"
          ? getCollection(sectionsResult.value.data)
            .map((item) => {
              const option = toOption(item, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "section", "Section", "name", "Name"]);
              const group = read(item, "group", "Group");
              const board = read(item, "board", "Board");
              const academicLevel = read(item, "academicLevel", "AcademicLevel");
              return option ? {
                ...option,
                boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
                boardName: readText(item, "boardName", "BoardName") || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode")),
                groupId: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
                groupName: readText(item, "groupName", "GroupName") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name")),
                academicYearId: readId(item, "academicYearId", "AcademicYearId"),
                academicLevelId: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
                academicLevelName: readText(item, "academicLevelName", "AcademicLevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name")),
              } : null;
            })
            .filter((item) => item?.value)
          : [],
        bloodGroups: bloodGroupsResult.status === "fulfilled"
          ? getCollection(bloodGroupsResult.value.data).map((item) => (
            typeof item === "string"
              ? { value: item, label: item }
              : toOption(item, ["bloodGroupId", "BloodGroupId", "id", "Id", "name", "Name", "value", "Value"], ["bloodGroupName", "BloodGroupName", "name", "Name", "value", "Value"])
          )).filter(Boolean)
          : [],
      });
      setMasterStatus((current) => ({
        ...current,
        groupsLoading: false,
        groupsError: groupsResult.status === "rejected" ? "Unable to load groups. Please try again." : "",
        sectionsError: sectionsResult.status === "rejected" ? "Unable to load sections. Please try again." : "",
      }));
    };

    loadAdmissionMasters();
    return () => {
      ignore = true;
      setMasterStatus((current) => ({ ...current, groupsLoading: false }));
    };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (editingAdmissionId || values.admissionNo) return undefined;
    if (admissionNumberInFlightRef.current) return undefined;

    let ignore = false;
    admissionNumberInFlightRef.current = true;
    setAdmissionNumberError("");
    setErrors((current) => ({ ...current, admissionNo: undefined }));
    setAdmissionNumberLoading(true);

    apiClient.post(apiEndpoints.admissions.generateNumber)
      .then((response) => {
        if (ignore) return;
        const data = response.data?.data ?? response.data?.Data ?? response.data;
        const generatedNumber = typeof data === "string"
          ? data
          : read(data, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
        if (generatedNumber) {
          setValues((currentValues) => ({ ...currentValues, admissionNo: String(generatedNumber) }));
          return;
        }
        const message = "Admission number could not be generated by the backend.";
        setAdmissionNumberError(message);
        setErrors((current) => ({ ...current, admissionNo: message }));
        setToast(message);
      })
      .catch((err) => {
        if (ignore) return;
        const message = getApiErrorMessage(err);
        setAdmissionNumberError(message);
        setErrors((current) => ({ ...current, admissionNo: message }));
        setToast(message);
      })
      .finally(() => {
        if (!ignore) setAdmissionNumberLoading(false);
        admissionNumberInFlightRef.current = false;
      });

    return () => {
      ignore = true;
      admissionNumberInFlightRef.current = false;
    };
  }, [editingAdmissionId, values.admissionNo, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (!values.board) return undefined;
    const selectedBoard = (masterOptions.boards || []).find((item) => String(item.value) === String(values.board));
    if (!selectedBoard || selectedBoard.levelMappingLoaded) return undefined;
    const requestId = boardMappingRequestRef.current + 1;
    boardMappingRequestRef.current = requestId;
    apiClient.get(apiEndpoints.boards.getById(values.board))
      .then((response) => {
        if (boardMappingRequestRef.current !== requestId) return;
        const board = normalizeBoardOption(getObject(response.data));
        if (!board) return;
        setMasterOptions((current) => ({
          ...current,
          boards: (current.boards || []).map((item) => (
            String(item.value) === String(values.board)
              ? { ...item, ...board, levelMappingLoaded: true }
              : item
          )),
        }));
      })
      .catch(() => {
        if (boardMappingRequestRef.current !== requestId) return;
        setMasterOptions((current) => ({
          ...current,
          boards: (current.boards || []).map((item) => (
            String(item.value) === String(values.board)
              ? { ...item, levelMappingLoaded: true }
              : item
          )),
        }));
      });
    return undefined;
  }, [masterOptions.boards, values.board, viewMode]);

  useEffect(() => {
    if (viewMode !== "form" || !values.board || !values.level) return;
    if (levelOptions.some((item) => String(item.value) === String(values.level))) return;
    setValues((current) => ({
      ...current,
      level: "",
      levelName: "",
      group: "",
      groupName: "",
      program: "",
      programName: "",
      feeStructureId: "",
      feeItems: [],
      installments: [],
    }));
  }, [levelOptions, values.board, values.level, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (!values.board || !values.year || !values.level) {
      setMasterOptions((current) => ({ ...current, groups: [] }));
      setMasterStatus((current) => ({ ...current, groupsLoading: false, groupsError: "" }));
      return undefined;
    }
    let ignore = false;
    setMasterStatus((current) => ({ ...current, groupsLoading: true, groupsError: "" }));
    const params = {
      boardId: values.board || undefined,
      academicYearId: values.year || undefined,
      academicLevelId: values.level || undefined,
      isActive: true,
    };
    apiClient.get(apiEndpoints.groups.getAll, { params })
      .then((response) => {
        if (ignore) return;
        const groups = getCollection(response.data)
          .map((item) => {
            const option = toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
            return option ? {
              ...option,
              boardId: readId(item, "boardId", "BoardId"),
              academicYearId: readId(item, "academicYearId", "AcademicYearId"),
              academicLevelId: readId(item, "academicLevelId", "AcademicLevelId"),
            } : null;
          })
          .filter((item) => item?.value);
        setMasterOptions((current) => ({ ...current, groups }));
      })
      .catch(() => {
        if (!ignore) {
          setMasterOptions((current) => ({ ...current, groups: [] }));
          setMasterStatus((current) => ({ ...current, groupsError: "Unable to load groups. Please try again." }));
        }
      })
      .finally(() => {
        if (!ignore) setMasterStatus((current) => ({ ...current, groupsLoading: false }));
      });
    return () => { ignore = true; };
  }, [values.board, values.level, values.year, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const groupId = values.group;
    const requestId = programRequestRef.current + 1;
    programRequestRef.current = requestId;
    setMasterOptions((current) => ({ ...current, programs: [] }));
    setMasterStatus((current) => ({ ...current, programsError: "" }));
    if (!groupId) {
      setMasterStatus((current) => ({ ...current, programsLoading: false }));
      return undefined;
    }
    setMasterStatus((current) => ({ ...current, programsLoading: true }));
    apiClient.get(apiEndpoints.programs.byGroup(groupId))
      .then((response) => {
        if (programRequestRef.current !== requestId) return;
        const programs = getCollection(response.data)
          .map((item) => toOption(item, ["programId", "ProgramId", "id", "Id"], ["programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"]))
          .filter(Boolean);
        setMasterOptions((current) => ({ ...current, programs }));
        setValues((current) => {
          if (String(current.group) !== String(groupId)) return current;
          const selectedProgram = programs.find((item) => item.value === String(current.program));
          if (selectedProgram) return { ...current, programName: selectedProgram.label };
          return {
            ...current,
            program: "",
            programName: "",
            feeItems: [],
            installments: [],
          };
        });
      })
      .catch((err) => {
        if (programRequestRef.current !== requestId) return;
        setMasterStatus((current) => ({ ...current, programsError: getApiErrorMessage(err) }));
      })
      .finally(() => {
        if (programRequestRef.current === requestId) {
          setMasterStatus((current) => ({ ...current, programsLoading: false }));
        }
      });
    return undefined;
  }, [values.group, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const boardId = values.board;
    const academicYearId = values.year;
    const groupId = values.group;
    const programId = values.program;
    setFeeStructureError("");
    if (!boardId || !academicYearId || !groupId) {
      setFeeStructureLoading(false);
      setValues((current) => ({
        ...current,
        feeStructureId: "",
        feeItems: [],
        installments: [],
        paymentPlan: "",
        collectFirstInstallment: false,
      }));
      return undefined;
    }

    let ignore = false;
    setFeeStructureLoading(true);
    apiClient.get(apiEndpoints.fee.getStructures)
      .then(async (response) => {
        if (ignore) return;
        const summaries = getCollection(response.data)
          .flatMap(expandFeeStructureItems)
          .map(normalizeFeeStructureSummary)
          .filter(Boolean)
          .filter((item) => item.status.toLowerCase() !== "inactive");
        const matching = summaries.find((item) => (
          String(item.boardId) === String(boardId)
          && String(item.academicYearId) === String(academicYearId)
          && String(item.groupId) === String(groupId)
          && (programId ? String(item.programId) === String(programId) || !item.programId : !item.programId)
        ));
        if (!matching) {
          if (!ignore) {
            setValues((current) => ({
              ...current,
              feeStructureId: "",
              feeItems: [],
              installments: [],
              paymentPlan: "",
              collectFirstInstallment: false,
            }));
            setFeeStructureError("No active fee structure is configured for the selected academic combination. Configure it in Fee Management -> Fee Setup -> Fee Structure.");
          }
          return;
        }

        const [detailResult, itemsResult] = await Promise.allSettled([
          apiClient.get(apiEndpoints.fee.getStructureById(matching.id)),
          apiClient.get(apiEndpoints.fee.getStructureItems(matching.id)),
        ]);
        if (ignore) return;
        const detail = detailResult.status === "fulfilled" ? getObject(detailResult.value.data) : matching.raw;
        const itemSource = itemsResult.status === "fulfilled"
          ? getCollection(itemsResult.value.data)
          : [
            ...expandFeeStructureItems(detail),
            ...summaries.filter((item) => item.id === matching.id).map((item) => item.raw),
          ];
        const feeItems = itemSource
          .map((item) => normalizeFeeStructureItem({ ...detail, ...item }, { ...matching.raw, ...detail, feeStructureId: matching.id }))
          .filter(Boolean);
        if (!feeItems.length) {
          setValues((current) => ({
            ...current,
            feeStructureId: "",
            feeItems: [],
            installments: [],
            paymentPlan: "",
            collectFirstInstallment: false,
          }));
          setFeeStructureError("The matched fee structure has no configured fee items.");
          return;
        }
        setValues((current) => {
          if (String(current.board) !== String(boardId) || String(current.year) !== String(academicYearId) || String(current.group) !== String(groupId) || String(current.program || "") !== String(programId || "")) return current;
          return {
            ...current,
            feeStructureId: matching.id,
            feeItems,
            paymentPlan: current.paymentPlan || "Full Payment",
            installments: [],
            collectFirstInstallment: false,
          };
        });
      })
      .catch((err) => {
        if (ignore) return;
        setValues((current) => ({
          ...current,
          feeStructureId: "",
          feeItems: [],
          installments: [],
          paymentPlan: "",
          collectFirstInstallment: false,
        }));
        setFeeStructureError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setFeeStructureLoading(false);
      });
    return () => { ignore = true; };
  }, [values.board, values.group, values.program, values.year, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const pincode = String(values.pincode || "").trim();
    if (!/^[0-9]{6}$/.test(pincode)) {
      pincodeRequestRef.current += 1;
      setValues((current) => {
        const next = { ...current };
        let changed = false;
        ["city", "district", "state"].forEach((key) => {
          if (autoLocationRef.current[key] && current[key] === autoLocationRef.current[key]) {
            next[key] = "";
            changed = true;
          }
        });
        return changed ? next : current;
      });
      autoLocationRef.current = { city: "", district: "", state: "" };
      return undefined;
    }
    let ignore = false;
    const requestId = pincodeRequestRef.current + 1;
    pincodeRequestRef.current = requestId;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.location.byPincode(pincode));
        const data = response.data?.data ?? response.data?.Data ?? response.data;
        const city = readText(data, "city", "City", "mandal", "Mandal", "postOffice", "PostOffice");
        const district = readText(data, "district", "District");
        const state = readText(data, "state", "State");
        if (ignore || pincodeRequestRef.current !== requestId) return;
        setValues((current) => {
          const next = { ...current };
          const incoming = { city, district, state };
          ["city", "district", "state"].forEach((key) => {
            const wasAutoFilled = autoLocationRef.current[key] && current[key] === autoLocationRef.current[key];
            if (!current[key] || wasAutoFilled) next[key] = incoming[key] || "";
          });
          autoLocationRef.current = {
            city: next.city === city ? city : "",
            district: next.district === district ? district : "",
            state: next.state === state ? state : "",
          };
          return next;
        });
      } catch {
        if (!ignore && pincodeRequestRef.current === requestId) setToast("Pincode details could not be loaded. You can enter address details manually.");
      }
    }, 450);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [values.pincode, viewMode]);

  const fee = deriveAdmissionFee(values);

  const changePlan = (plan) => {
    setErrors((current) => ({ ...current, paymentPlan: undefined, installments: undefined }));
    setValues((current) => {
      const count = Number(current.installmentCount) || DEFAULT_INSTALLMENT_COUNT;
      if (plan !== "Installment Payment") {
        return { ...current, paymentPlan: plan, installments: [], collectFirstInstallment: false };
      }
      return {
        ...current,
        paymentPlan: plan,
        installmentCount: count,
        installments: buildInstallmentSchedule(deriveAdmissionFee({ ...current, paymentPlan: plan }).courseFeePayable, count, current.admissionDate || todayISO()),
      };
    });
  };

  const changeInstallmentCount = (count) => {
    setErrors((current) => ({ ...current, installments: undefined }));
    setValues((current) => ({
      ...current,
      installmentCount: count,
      installments: buildInstallmentSchedule(deriveAdmissionFee(current).courseFeePayable, count, current.admissionDate || todayISO()),
    }));
  };

  const changeInstallment = (index, key, value) => {
    setErrors((current) => ({ ...current, installments: undefined }));
    setValues((current) => {
      const schedule = (Array.isArray(current.installments) ? current.installments : []).map((row, rowIndex) => (
        rowIndex === index
          ? { ...row, [key]: key === "amount" ? Number(String(value).replace(/[^\d]/g, "") || 0) : value }
          : row
      ));
      return { ...current, installments: schedule };
    });
  };

  const groupFilterOptions = useMemo(() => {
    const optionsFromRows = (masterOptions.groups || []).map((item) => ({ value: item.label, label: item.label }));
    return Array.from(new Map(optionsFromRows.filter((item) => item.value).map((item) => [item.value, item])).values());
  }, [masterOptions.groups]);
  const academicYearFilterOptions = useMemo(() => uniqueAcademicYearsByName(
    (masterOptions.years || []).map((item) => ({ value: item.label, label: item.label })),
    (item) => item.label,
  ), [masterOptions.years]);
  const programFilterOptions = useMemo(() => {
    const filteredRows = filters.group
      ? admissions.filter((item) => String(item.group) === String(filters.group))
      : admissions;
    return Array.from(new Map(filteredRows
      .map((item) => {
        const value = item.program || item.section;
        return value ? { value, label: value } : null;
      })
      .filter(Boolean)
      .map((item) => [item.value, item])).values());
  }, [admissions, filters.group]);

  const feeContext = [
    { label: "Student", value: [values.firstName, values.lastName].filter(Boolean).join(" ") },
    { label: "Admission No", value: values.admissionNo },
    { label: "Academic Year", value: optionLabel(masterOptions.years, values.year) || values.year },
    { label: "Academic Level", value: optionLabel(masterOptions.levels, values.level) || values.levelName || values.level },
    { label: "Group", value: values.groupName || optionLabel(masterOptions.groups, values.group) || values.group },
    { label: "Program", value: values.programName || optionLabel(programOptions, values.program) || values.program },
  ];

  const setValue = (name, val) => {
    const field = fieldByName[name] || {};
    if (isPlaceholderOption(val)) return;
    if (name === "feeItems") {
      setValues((v) => ({ ...v, feeItems: val, installments: v.paymentPlan === "Installment Payment"
        ? buildInstallmentSchedule(deriveAdmissionFee({ ...v, feeItems: val }).courseFeePayable, Number(v.installmentCount) || DEFAULT_INSTALLMENT_COUNT, v.admissionDate || todayISO())
        : v.installments }));
      setErrors((e) => ({ ...e, feeItems: undefined, installments: undefined }));
      return;
    }
    if (name === "scholarshipId") {
      const scholarship = scholarships.find((item) => String(item.id) === String(val));
      setValues((v) => {
        const next = {
          ...v,
          scholarshipId: val,
          concessionName: scholarship?.name || "",
          concessionType: scholarship?.discountType || "",
          concessionValue: scholarship ? String(scholarship.discountValue || 0) : "",
        };
        return {
          ...next,
          installments: next.paymentPlan === "Installment Payment"
            ? buildInstallmentSchedule(deriveAdmissionFee(next).courseFeePayable, Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT, next.admissionDate || todayISO())
            : next.installments,
        };
      });
      setErrors((e) => ({ ...e, scholarshipId: undefined, concessionValue: undefined, installments: undefined }));
      return;
    }
    if (["concessionName", "concessionType", "concessionValue"].includes(name)) {
      setValues((v) => {
        const next = {
          ...v,
          [name]: name === "concessionValue" ? String(val).replace(/[^\d.]/g, "") : val,
          ...(name === "concessionType" ? { concessionValue: "" } : {}),
        };
        return {
          ...next,
          installments: next.paymentPlan === "Installment Payment"
            ? buildInstallmentSchedule(deriveAdmissionFee(next).courseFeePayable, Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT, next.admissionDate || todayISO())
            : next.installments,
        };
      });
      setErrors((e) => ({ ...e, [name]: undefined, installments: undefined }));
      return;
    }
    if (["board", "year", "level", "group", "program"].includes(name)) {
      feeSelectionInitializedRef.current = false;
      setFeeSelection([]);
    }
    if (["board", "year", "level"].includes(name)) {
      const labelKey = name === "level" ? "levelName" : null;
      const labelValue = name === "level" ? optionLabel(levelOptions, val) : "";
      setMasterOptions((current) => ({ ...current, programs: [] }));
      setValues((v) => ({
        ...v,
        [name]: sanitizeValue(field, val),
        ...(labelKey ? { [labelKey]: labelValue } : {}),
        ...(name === "board" ? { year: "", level: "", levelName: "" } : {}),
        group: "",
        groupName: "",
        program: "",
        programName: "",
        feeStructureId: "",
        feeItems: [],
        installments: [],
      }));
      setErrors((e) => ({ ...e, [name]: undefined, group: undefined, program: undefined, feeStructure: undefined }));
      return;
    }
    if (name === "collectFirstInstallment") {
      setValues((v) => ({ ...v, collectFirstInstallment: Boolean(val) }));
      setErrors((e) => ({ ...e, collectFirstInstallment: undefined }));
      return;
    }
    if (name === "group") {
      // Program depends on Group: reset the program and the fee schedule.
      setMasterOptions((current) => ({ ...current, programs: [] }));
      setValues((v) => ({
        ...v,
        group: val,
        groupName: optionLabel(groupOptions, val),
        program: "",
        programName: "",
        feeStructureId: "",
        feeItems: [],
        installments: [],
      }));
      setErrors((e) => ({ ...e, group: undefined, program: undefined, feeStructure: undefined }));
      return;
    }
    if (name === "program") {
      setValues((v) => ({ ...v, program: val, programName: optionLabel(programOptions, val), feeStructureId: "", feeItems: [], installments: [] }));
      setErrors((e) => ({ ...e, program: undefined, feeStructure: undefined }));
      return;
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
      if (f.required && (!String(val ?? "").trim() || isPlaceholderOption(val))) next[f.name] = `${f.label} is required`;
      else if (f.name === "dob" && val && isTodayOrFutureDate(val)) next[f.name] = "Date of Birth must be before today";
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

  const validateStepAt = (stepIndex) => {
    const section = steps[stepIndex];
    if (!section) return {};
    if (section.custom === "fee") return feeStepErrors(values);
    return validateFields(section.fields);
  };

  const validateStep = (stepIndex = step) => {
    const next = validateStepAt(stepIndex);
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateAdmission = () => {
    const next = steps.reduce((all, section) => ({
      ...all,
      ...(section.custom === "fee" ? feeStepErrors(values) : validateFields(section.fields)),
    }), {});
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateBeforeStep = (targetStep) => {
    const relevantSteps = steps.slice(0, Math.min(targetStep, steps.length));
    const next = {};
    let firstInvalidStep = -1;

    relevantSteps.forEach((section, index) => {
      const sectionErrors = section.custom === "fee" ? feeStepErrors(values) : validateFields(section.fields);
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

    returnToAdmissions();
  };

  const editPreviewStep = (targetStep) => {
    persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
    setStep(targetStep);
  };

  const openAdmissionForm = ({ formValues = {}, targetStep = 0, selection = [], admissionId = "" } = {}) => {
    suppressPersistRef.current = false;
    setAdmissionNumberError("");
    setEditingAdmissionId(admissionId ? String(admissionId) : "");
    setValues(formValues);
    setFeeSelection(Array.isArray(selection) ? selection : []);
    feeSelectionInitializedRef.current = Array.isArray(selection);
    setErrors({});
    setStep(safeStepIndex(targetStep));
    setViewMode("form");
  };

  const addNewAdmission = () => {
    clearAdmissionDraft();
    openAdmissionForm({ formValues: {}, targetStep: 0, selection: [] });
  };

  const continueAdmission = async (record) => {
    const admissionId = record.admissionId || record.id;
    if (!admissionId) {
      setToast("Admission ID is required to load admission details.");
      return;
    }
    setActionBusy(`Load-${record.id}`);
    try {
      const response = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
      const detailRow = normalizeAdmissionRow(getObject(response.data));
      openAdmissionForm({
        formValues: detailRow.values || {},
        targetStep: record.currentStep || 0,
        selection: [],
        admissionId,
      });
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setActionBusy("");
    }
  };

  const returnToAdmissions = () => {
    persistAdmissionDraft({ currentStep: step, formData: values, feeSelection });
    setViewMode("list");
    setPage(1);
    refreshAdmissions();
  };

  const ensureApprovedStudentFeeAccount = async ({ admissionId, approvedPayload }) => {
    const detailResponse = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
    const detail = getObject(detailResponse.data);
    const detailRow = normalizeAdmissionRow(detail);
    const studentId = resolveApprovedStudentId(approvedPayload, detail, detailRow.raw, detailRow);
    if (!studentId) {
      throw new Error("Admission was approved, but the approved student ID was not returned by the backend.");
    }

    try {
      const existingResponse = await apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(studentId));
      const existingStudentFeeId = readStudentFeeAssignmentId(existingResponse.data);
      if (existingStudentFeeId) return { studentId, studentFeeId: existingStudentFeeId, reused: true };
    } catch (err) {
      if (err?.response?.status && err.response.status !== 404) throw err;
    }

    const feeStructure = await findApplicableFeeStructure({
      boardId: detailRow.values.board,
      academicYearId: detailRow.values.year,
      groupId: detailRow.values.group,
      programId: detailRow.values.program,
    });

    const assignResponse = await apiClient.post(apiEndpoints.fee.assignStudentFee, {
      studentId,
      feeStructureId: Number(feeStructure.id),
    });
    const studentFeeId = readStudentFeeAssignmentId(assignResponse.data);
    if (!studentFeeId) throw new Error("Fee structure was assigned, but the student fee assignment ID was not returned.");

    if (Number(detailRow.values.scholarshipId)) {
      await apiClient.post(apiEndpoints.fee.concession, {
        studentId,
        studentFeeId: Number(studentFeeId),
        scholarshipId: Number(detailRow.values.scholarshipId),
        scholarshipName: detailRow.values.concessionName || null,
        discountType: detailRow.values.concessionType || null,
        discountValue: Number(detailRow.values.concessionValue || 0),
        reason: "Applied during admission approval",
      });
    }

    const fee = deriveAdmissionFee(detailRow.values);
    if (fee.paymentPlan) {
      const planResponse = await apiClient.post(apiEndpoints.fee.createPaymentPlan, {
        studentFeeId: Number(studentFeeId),
        planName: fee.paymentPlan,
        numberOfInstallments: fee.paymentPlan === "Installment Payment" ? Math.max(fee.courseSchedules.length, 1) : 1,
        installments: null,
      });
      const paymentPlanId = readPaymentPlanId(planResponse.data);
      if (paymentPlanId && fee.paymentPlan === "Installment Payment") {
        await Promise.all(fee.courseSchedules.map((item, index) => apiClient.post(apiEndpoints.fee.addPaymentPlanInstallment(paymentPlanId), {
          installmentNumber: Number(item.no || index + 1),
          amount: Number(item.amount || 0),
          dueDate: toDateTime(item.dueDate || detailRow.values.admissionDate || todayISO()),
        })));
      }
    }

    if (fee.paidToday > 0) {
      await apiClient.post(apiEndpoints.fee.collect, collectPayload({
        studentId,
        studentFeeId,
        amount: fee.paidToday,
        values: detailRow.values,
        note: "Initial admission payment",
      }));
    }

    return { studentId, studentFeeId, reused: false };
  };

  const updateAdmissionStatus = async (record, status) => {
    setActionBusy(`${status}-${record.id}`);
    const endpoint = status === "Approved" ? apiEndpoints.admissions.approve : apiEndpoints.admissions.reject;
    try {
      const admissionId = record.admissionId || record.id;
      if (!admissionId) throw new Error("Admission ID is required for this action.");
      const response = await apiClient.post(endpoint(admissionId), admissionFeeApprovalBody(admissionId, status));
      if (status === "Approved") {
        try {
          await ensureApprovedStudentFeeAccount({ admissionId, approvedPayload: getObject(response.data) });
        } catch (feeErr) {
          await refreshAdmissions();
          setToast(`Admission ${record.admissionNo} was approved, but fee account creation failed: ${getApiErrorMessage(feeErr)}`);
          return;
        }
      }
      await refreshAdmissions();
      setToast(status === "Approved"
        ? `Admission ${record.admissionNo} approved and fee account is ready.`
        : `Admission ${record.admissionNo} marked as ${status}.`);
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setActionBusy("");
      setApproveTarget(null);
      setRejectTarget(null);
    }
  };

  const submit = async () => {
    if (saving) return;
    if (!validateAdmission()) {
      setToast("Please complete required admission details before submitting");
      return;
    }
    if (!editingAdmissionId && (!values.admissionNo || admissionNumberError)) {
      const message = admissionNumberError || "Admission number must be generated by the backend before submitting.";
      setAdmissionNumberError(message);
      setToast(message);
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingAdmissionId
        ? apiEndpoints.admissions.update(editingAdmissionId)
        : apiEndpoints.admissions.create;
      const method = editingAdmissionId ? "put" : "post";
      await apiClient[method](endpoint, buildAdmissionFormData(values), {
        headers: { "Content-Type": undefined },
      });
    } catch (err) {
      setToast(getApiErrorMessage(err));
      setSaving(false);
      return;
    }

    setToast(`Admission ${values.admissionNo} ${editingAdmissionId ? "updated" : "submitted"} successfully.`);
    resetAdmissionDraftState();
    setViewMode("list");
    setPage(1);
    await refreshAdmissions();
    setSaving(false);
  };

  if (viewMode === "list") {
    return (
      <DashboardLayout
        title="Student Admission"
        subtitle="Manage student admission applications and admissions."
        breadcrumb={["People"]}
        actions={(
          <button type="button" className="cms-btn cms-btn-primary" onClick={addNewAdmission}>
            <Plus size={15} /> Add New Admission
          </button>
        )}
      >
        <div className="cms-card cms-admission-list-card">
          <div className="cms-admission-toolbar">
            <div className="cms-search cms-admission-search">
              <Search size={16} />
              <input
                value={search}
                placeholder="Search by student name or admission number"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="cms-admission-filters">
              <Field field={{ name: "year", label: "Academic Year", type: "select", options: academicYearFilterOptions }} value={filters.year} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
              <Field field={{ name: "group", label: "Group", type: "select", options: groupFilterOptions }} value={filters.group} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value, program: name === "group" ? "" : current.program })); setPage(1); }} />
              <Field field={{ name: "program", label: "Program", type: "select", options: programFilterOptions }} value={filters.program} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
              <Field field={{ name: "status", label: "Status", type: "select", options: ADMISSION_STATUS_OPTIONS }} value={filters.status} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
            </div>
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table cms-admission-table">
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Admission Date</th>
                  <th>Academic Year</th>
                  <th>Board</th>
                  <th>Group</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan={9}><div className="cms-empty">Loading admissions...</div></td></tr>
                ) : pagedAdmissions.length ? pagedAdmissions.map((row) => (
                  <tr key={`${row.source}-${row.id}`}>
                    <td className="cms-strong">{row.admissionNo}</td>
                    <td>{row.studentName}</td>
                    <td>{formatDate(row.admissionDate) || "-"}</td>
                    <td>{optionLabel(masterOptions.years, row.academicYear) || row.academicYear || "-"}</td>
                    <td>{optionLabel(masterOptions.boards, row.board) || row.board || "-"}</td>
                    <td>{row.group || "-"}</td>
                    <td>{row.program || "-"}</td>
                    <td><span className={`cms-badge ${admissionStatusClass(row.status)}`}>{row.status}</span></td>
                    <td>
                      <div className="cms-actions cms-admission-actions">
                        <button type="button" className="cms-action-btn view" title="View / edit admission" aria-label="View or edit admission" disabled={actionBusy === `Load-${row.id}`} onClick={() => continueAdmission(row)}>
                          <Eye size={15} />
                        </button>
                        <button type="button" className="cms-action-btn edit" title="Approve admission" aria-label="Approve admission" disabled={actionBusy === `Approved-${row.id}` || row.status === "Approved"} onClick={() => setApproveTarget(row)}>
                          <Check size={15} />
                        </button>
                        <button type="button" className="cms-action-btn danger" title="Reject admission" aria-label="Reject admission" disabled={actionBusy === `Rejected-${row.id}` || row.status === "Rejected"} onClick={() => setRejectTarget(row)}>
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9}><div className="cms-empty">No admissions found.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cms-pagination">
            <span className="cms-page-info">
              Showing {displayedAdmissions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, displayedAdmissions.length)} of {displayedAdmissions.length} admissions
            </span>
            <button className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Prev</button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button key={index} className={`cms-page-btn ${currentPage === index + 1 ? "is-active" : ""}`} onClick={() => setPage(index + 1)}>
                {index + 1}
              </button>
            ))}
            <button className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>
        </div>

        {approveTarget ? (
          <Modal
            title="Approve Admission?"
            size="sm"
            onClose={() => setApproveTarget(null)}
            footer={(
              <>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setApproveTarget(null)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => updateAdmissionStatus(approveTarget, "Approved")}>Approve</button>
              </>
            )}
          >
            <p style={{ margin: 0, color: "var(--cms-muted)" }}>Are you sure you want to approve this admission? This will mark the student's admission as approved.</p>
          </Modal>
        ) : null}

        {rejectTarget ? (
          <Modal
            title="Reject Admission?"
            size="sm"
            onClose={() => setRejectTarget(null)}
            footer={(
              <>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-danger" onClick={() => updateAdmissionStatus(rejectTarget, "Rejected")}>Reject</button>
              </>
            )}
          >
            <p style={{ margin: 0, color: "var(--cms-muted)" }}>Are you sure you want to reject this admission?</p>
          </Modal>
        ) : null}
        <Toast message={toast} onClose={() => setToast("")} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Student Admission"
      subtitle="Multi-step admission form."
      breadcrumb={["People"]}
      actions={(
        <button type="button" className="cms-btn cms-btn-ghost" onClick={returnToAdmissions}>
          Back to Admissions
        </button>
      )}
    >
      <div
        ref={stepNavRef}
        className="cms-steps"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {allSteps.map((s, i) => {
          const StepIcon = stepIcons[s.title] || BookOpen;
          return (
            <button
              key={s.title}
              ref={(element) => { stepButtonRefs.current[i] = element; }}
              type="button"
              className={`cms-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
              onClick={() => goToStep(i)}
              style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
            >
              <span
                className="cms-step-num"
                style={{ background: "#fff", color: "currentColor", boxShadow: "inset 0 0 0 1px currentColor" }}
              >
                <StepIcon size={13} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="cms-step-label">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Step {step + 1} of {allSteps.length} - {current.title}</h2>
        </div>
        <div className="cms-card-body">
          {isPreview ? (
            <AdmissionPreview
              sections={previewSections}
              values={values}
              errors={errors}
              onEdit={editPreviewStep}
              feeNode={<FeePreview fee={fee} values={values} />}
            />
          ) : isFeeStep ? (
            <FeeStep
              context={feeContext}
              fee={fee}
              values={values}
              errors={errors}
              onChange={setValue}
              onPlanChange={changePlan}
              onInstallmentCountChange={changeInstallmentCount}
              onInstallmentChange={changeInstallment}
              scholarships={scholarships}
              feeStructureLoading={feeStructureLoading}
              feeStructureError={feeStructureError}
            />
          ) : (
            <div className={`cms-form-grid cols-3 ${current.title === "Address" ? "cms-admission-address-grid" : ""}`}>
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
            {step === 0 ? "Back to Admissions" : isPreview ? "Back" : "Previous"}
          </button>
          {!isPreview ? (
            <button className="cms-btn cms-btn-primary" onClick={next} disabled={admissionNumberLoading || (!editingAdmissionId && (!values.admissionNo || admissionNumberError))}>
              {admissionNumberLoading ? "Generating Number..." : step === steps.length - 1 ? "Preview" : "Save & Continue"}
            </button>
          ) : (
            <button className="cms-btn cms-btn-primary" onClick={submit} disabled={saving || admissionNumberLoading || (!editingAdmissionId && (!values.admissionNo || admissionNumberError))}>
              {saving ? "Submitting..." : "Submit Admission"}
            </button>
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
