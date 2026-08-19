import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaArrowsRotate, FaAward, FaBan, FaCheck, FaEraser, FaEye, FaFileCirclePlus, FaMagnifyingGlass, FaPaperPlane, FaPrint, FaRotateLeft, FaXmark } from "react-icons/fa6";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast, useConfirmDialog } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { certificates as staticCertificates, options, students as mockStudents } from "@/data/mockData.js";
import "./CertificatesPage.css";

export const pageConfig = {
  title: "Certificates",
  route: "/dashboard/certificates",
};

const PAGE_SIZE = 5;
const MAX_PURPOSE_LENGTH = 160;
const MAX_REMARKS_LENGTH = 240;
const todayIso = () => new Date().toISOString().slice(0, 10);
const workflowSteps = ["Generated", "Reviewed", "Approved", "Issued"];
const statusChoices = ["All", "Generated", "Reviewed", "Approved", "Issued", "Cancelled"];

const CERTIFICATE_API = apiEndpoints.certificates;

const getBackendPrincipalSignatureUrl = () => {
  try {
    const baseUrl = apiClient.defaults.baseURL || (typeof window !== "undefined" ? window.location.origin : "");
    return baseUrl ? new URL("/images/signature.png", baseUrl).href : "/images/signature.png";
  } catch {
    return "/images/signature.png";
  }
};

const unwrapListPayload = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.Data,
    payload?.items,
    payload?.Items,
    payload?.results,
    payload?.Results,
    payload?.result,
    payload?.Result,
    payload?.value,
    payload?.Value,
    payload?.records,
    payload?.Records,
    payload?.data?.items,
    payload?.data?.Items,
    payload?.data?.results,
    payload?.data?.Results,
    payload?.data?.value,
    payload?.data?.Value,
    payload?.data?.records,
    payload?.data?.Records,
    payload?.certificates,
    payload?.Certificates,
    payload?.data?.certificates,
    payload?.data?.Certificates,
    payload?.result?.certificates,
    payload?.result?.Certificates,
    payload?.students,
    payload?.Students,
    payload?.admissions,
    payload?.Admissions,
    payload?.data?.students,
    payload?.data?.Students,
    payload?.data?.admissions,
    payload?.data?.Admissions,
    payload?.result?.students,
    payload?.result?.Students,
    payload?.result?.admissions,
    payload?.result?.Admissions,
    payload?.$values,
    payload?.data?.$values,
    payload?.result?.$values,
    payload?.value?.$values,
  ];
  const firstArray = candidates.find((item) => Array.isArray(item));
  if (firstArray) return firstArray;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const unwrapStudentPayload = (payload) => {
  const list = unwrapListPayload(payload);
  if (list.length) return list;
  const single = unwrapSinglePayload(payload);
  return single && typeof single === "object" ? [single] : [];
};

const unwrapSinglePayload = (payload) => {
  if (hasCertificateShape(payload)) return payload;

  const singleCandidates = [
    payload?.data,
    payload?.Data,
    payload?.item,
    payload?.Item,
    payload?.result,
    payload?.Result,
    payload?.value,
    payload?.Value,
    payload?.record,
    payload?.Record,
  ];
  const single = singleCandidates.find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (single) return single;

  if (Array.isArray(payload)) return payload[0] || null;
  if (payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload?.item && typeof payload.item === "object") return payload.item;
  if (payload && typeof payload === "object") return payload;
  return null;
};

const toDisplayStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Generated";
  const key = raw.toLowerCase();
  if (["generated", "draft", "pending", "requested"].includes(key)) return "Generated";
  if (["reviewed", "inreview", "in-review", "review"].includes(key)) return "Reviewed";
  if (["approved", "authorize", "authorized"].includes(key)) return "Approved";
  if (["issued", "completed", "active"].includes(key)) return "Issued";
  if (["cancelled", "canceled", "rejected", "inactive"].includes(key)) return "Cancelled";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const pick = (obj, keys) => {
  if (!obj || typeof obj !== "object") return undefined;
  const objectKeys = Object.keys(obj);
  for (const key of keys) {
    const exact = obj[key];
    if (exact !== undefined && exact !== null && exact !== "") return exact;
    const matchedKey = objectKeys.find((k) => k.toLowerCase() === String(key).toLowerCase());
    if (matchedKey) {
      const value = obj[matchedKey];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
};

const getSignatureValue = (raw) => {
  const signatureKeys = [
    "signature",
    "Signature",
    "signatureUrl",
    "SignatureUrl",
    "signatureImage",
    "SignatureImage",
    "signatureImageUrl",
    "SignatureImageUrl",
    "signatureFile",
    "SignatureFile",
    "signaturePath",
    "SignaturePath",
    "signatureBase64",
    "SignatureBase64",
    "signatureData",
    "SignatureData",
    "authorizedSignature",
    "AuthorizedSignature",
    "authorizedSignatory",
    "AuthorizedSignatory",
    "principalSignature",
    "PrincipalSignature",
  ];
  const containerKeys = [
    "principal",
    "Principal",
    "college",
    "College",
    "institution",
    "Institution",
    "settings",
    "Settings",
    "certificateSettings",
    "CertificateSettings",
    "signatory",
    "Signatory",
    "authorizedSignatory",
    "AuthorizedSignatory",
    "data",
    "Data",
    "result",
    "Result",
    "record",
    "Record",
  ];
  const extract = (source, depth = 0) => {
    if (!source || typeof source !== "object" || depth > 3) return "";
    const value = pick(source, signatureKeys);

    if (value && typeof value === "object") {
      const nestedValue = pick(value, [
        "url",
        "Url",
        "path",
        "Path",
        "src",
        "Src",
        "data",
        "Data",
        "value",
        "Value",
        "base64",
        "Base64",
        "content",
        "Content",
      ]);
      const mimeType = pick(value, ["mimeType", "MimeType", "contentType", "ContentType", "type", "Type"]);
      if (nestedValue) {
        const rawValue = String(nestedValue).trim();
        if (mimeType && !/^data:/i.test(rawValue) && /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(rawValue)) {
          return `data:${mimeType};base64,${rawValue.replace(/\s/g, "")}`;
        }
        return rawValue;
      }
      const nestedSignature = extract(value, depth + 1);
      if (nestedSignature) return nestedSignature;
    }

    if (value && typeof value !== "object") return value;

    for (const key of containerKeys) {
      const nested = source[key];
      const nestedSignature = extract(nested, depth + 1);
      if (nestedSignature) return nestedSignature;
    }

    return "";
  };

  return extract(raw);
};

const resolveSignatureSource = (signature) => {
  const value = String(signature || "").trim();
  if (!value) return "";
  if (/^data:image\//i.test(value) || /^(https?:\/\/|blob:)/i.test(value)) return value;
  if (/^image\/[a-z0-9.+-]+;base64,/i.test(value)) return `data:${value}`;
  if (/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(value) && value.length > 100) {
    return `data:image/png;base64,${value.replace(/\s/g, "")}`;
  }
  if (/^(\/|\.\/|\.\.\/|uploads?\/|files?\/)/i.test(value) || /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(value)) {
    try {
      const baseUrl = apiClient.defaults.baseURL || window.location.origin;
      return new URL(value, baseUrl).href;
    } catch {
      return value;
    }
  }
  return value;
};

const getCertificateBackendId = (raw) => {
  const value = pick(raw, ["id", "Id", "certificateId", "CertificateId", "certificateID"]);
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value);
};

const buildFallbackRowId = (raw, matchedStudent) => {
  const parts = [
    pick(raw, ["certificateNo", "CertificateNo", "certificateNumber", "CertificateNumber", "number", "Number"]),
    pick(raw, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no"]),
    pick(raw, ["certificateType", "CertificateType", "type", "Type"]),
    pick(raw, ["requestDate", "RequestDate", "requestedDate", "RequestedDate", "requestOn", "RequestOn", "createdAt", "CreatedAt"]),
    matchedStudent?.admissionNo,
    matchedStudent?.name,
  ].filter((value) => value !== undefined && value !== null && value !== "");

  if (!parts.length) return "certificate-fallback";

  const seed = parts.map(String).join("::");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  return `certificate-${hash.toString(36)}`;
};

const normalizeApiDateValue = (value) => {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw || raw === "-") return "";
  if (/^000[01]-\d{2}-\d{2}(?:T|\s|$)/.test(raw)) return "";

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
      if (year !== "0000" && parsed.toISOString().slice(0, 10) === raw) return raw;
      return "";
    }

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
      return normalizeApiDateValue(`${year}-${month}-${day}`);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const normalized = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 10);
};

const maybeIsoDate = (value) => {
  const normalized = normalizeApiDateValue(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return String(value);
};

const getReferenceLabel = (value, keys) => {
  if (value && typeof value === "object") return pick(value, keys) || "";
  return value || "";
};

const normalizeStudentRecord = (raw) => {
  const nested = pick(raw, ["student", "Student", "admission", "Admission"]);
  const source = nested && typeof nested === "object" ? { ...raw, ...nested } : raw;
  return {
    id: Number(pick(source, ["id", "Id", "studentId", "StudentId", "studentID", "admissionId", "AdmissionId"])) || null,
    admissionNo: String(pick(source, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no", "studentAdmissionNo", "StudentAdmissionNo", "enrollmentNo", "EnrollmentNo"]) || "").trim(),
    name: pick(source, ["fullName", "FullName", "studentName", "StudentName", "name", "Name", "firstName", "FirstName"]) || "",
    group: pick(source, ["groupName", "GroupName", "groupCode", "GroupCode", "group", "Group", "courseGroup", "CourseGroup"]) || "",
    level: getReferenceLabel(
      pick(source, [
        "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel",
        "levelName", "LevelName", "level", "Level", "studyYear", "StudyYear",
        "currentYear", "CurrentYear", "classYear", "ClassYear", "yearOfStudy",
        "YearOfStudy", "year", "Year",
      ]),
      ["academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name", "title", "Title", "value", "Value"],
    ) || "",
    academicYear: getReferenceLabel(
      pick(source, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "currentAcademicYear", "CurrentAcademicYear", "yearName", "YearName", "academicYearId", "AcademicYearId"]),
      ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "title", "Title", "value", "Value"],
    ),
  };
};

const fallbackStudents = mockStudents.map((student) => ({
  ...student,
  academicYear: student.academicYear || "2025-2026",
}));

const isStaticCertificateRow = (row) => String(row?.backendId ?? row?.id ?? "").startsWith("mock-cert-");

const normalizeCertificate = (raw, studentLookup = fallbackStudents) => {
  const backendId = getCertificateBackendId(raw);
  const studentId = Number(pick(raw, ["studentId", "StudentId", "studentID", "student_id"])) || null;
  const admissionNo = String(pick(raw, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no"]) || "").trim();
  const studentValue = pick(raw, ["student", "Student"]);
  const studentName = typeof studentValue === "object"
    ? pick(studentValue, ["name", "Name", "fullName", "FullName", "studentName", "StudentName"])
    : (pick(raw, ["studentName", "StudentName", "student", "Student", "name", "Name"]));
  const matchedStudent = studentId
    ? studentLookup.find((student) => Number(student.id) === Number(studentId))
    : studentLookup.find((student) => student.admissionNo === admissionNo || student.name === studentName);
  const requestDate = maybeIsoDate(
    pick(raw, ["requestDate", "RequestDate", "requestedDate", "RequestedDate", "requestedOn", "RequestedOn", "appliedDate", "AppliedDate", "createdAt", "CreatedAt", "generatedAt", "GeneratedAt", "requestOn", "RequestOn"]),
  );
  const issueDate = maybeIsoDate(pick(raw, ["issueDate", "IssueDate", "issuedDate", "IssuedDate", "issuedAt", "IssuedAt"]));
  const status = toDisplayStatus(pick(raw, ["status", "Status", "certificateStatus", "CertificateStatus"]));
  const rowId = backendId ? backendId : buildFallbackRowId(raw, matchedStudent);

  return {
    id: rowId,
    backendId,
    studentId: studentId || matchedStudent?.id || null,
    number: pick(raw, ["certificateNo", "CertificateNo", "certificateNumber", "CertificateNumber", "number", "Number"]) || "-",
    student: studentName || matchedStudent?.name || "-",
    admissionNo: admissionNo || matchedStudent?.admissionNo || "-",
    group: pick(raw, ["group", "Group", "groupName", "GroupName"]) || matchedStudent?.group || "-",
    level: pick(raw, ["level", "Level", "year", "Year", "academicLevel", "AcademicLevel", "academicLevelName", "AcademicLevelName"]) || matchedStudent?.level || "-",
    academicYear:
      getReferenceLabel(
        pick(raw, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "yearName", "YearName", "academicYearId", "AcademicYearId"]),
        ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "title", "Title", "value", "Value"],
      ) ||
      matchedStudent?.academicYear ||
      "-",
    type: pick(raw, ["certificateType", "CertificateType", "type", "Type"]) || "-",
    purpose: pick(raw, ["purpose", "Purpose"]) || "",
    requestDate: requestDate || todayIso(),
    issue: issueDate || todayIso(),
    status,
    remarks: pick(raw, ["remarks", "Remarks", "comment", "Comment", "note", "Note"]) || "",
    generatedAt: maybeIsoDate(pick(raw, ["generatedAt", "GeneratedAt"])) || requestDate || "",
    reviewedAt: maybeIsoDate(pick(raw, ["reviewedAt", "ReviewedAt"])) || "",
    approvedAt: maybeIsoDate(pick(raw, ["approvedAt", "ApprovedAt"])) || "",
    issuedAt: maybeIsoDate(pick(raw, ["issuedAt", "IssuedAt"])) || issueDate || "",
    cancelledAt: maybeIsoDate(pick(raw, ["cancelledAt", "CancelledAt", "canceledAt", "CanceledAt"])) || "",
    generatedBy: pick(raw, ["generatedBy", "GeneratedBy", "createdBy", "CreatedBy"]) || "",
    reviewedBy: pick(raw, ["reviewedBy", "ReviewedBy"]) || "",
    approvedBy: pick(raw, ["approvedBy", "ApprovedBy"]) || "",
    issuedBy: pick(raw, ["issuedBy", "IssuedBy"]) || "",
    signature: getSignatureValue(raw) || getBackendPrincipalSignatureUrl(),
  };
};

const hasCertificateShape = (value) => {
  if (!value || typeof value !== "object") return false;
  return ["id", "Id", "certificateId", "CertificateId", "certificateNo", "CertificateNo", "certificateNumber", "CertificateNumber", "certificateType", "CertificateType"].some((key) => key in value);
};

const getFriendlyErrorMessage = (error, fallback) => {
  const base = getApiErrorMessage(error);
  const statusCode = Number(error?.response?.status);
  if (base && !["Something went wrong. Please try again."].includes(base)) return base;

  if (statusCode === 400) return fallback || "Invalid request data. Please review and try again.";
  if (statusCode === 401) return "Session expired or unauthorized. Please login again.";
  if (statusCode === 403) return "You do not have permission to perform this action.";
  if (statusCode === 404) return fallback || "Requested certificate was not found.";
  if (statusCode === 409) return fallback || "Certificate conflict detected. Please refresh and retry.";
  if (statusCode >= 500) return "Server error while processing certificate request. Please try again.";

  return fallback || "Something went wrong. Please try again.";
};

function formatDateDdMmYyyy(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "-";

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slash) return raw;

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;

  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const baseFormFields = [
  { name: "admissionNo", label: "Admission No.", type: "text", placeholder: "Enter admission number", required: true },
  { name: "type", label: "Certificate Type", type: "select", required: true },
  { name: "purpose", label: "Purpose", required: true },
  { name: "requestDate", label: "Request Date", type: "date", required: true },
  { name: "remarks", label: "Remarks" },
];

function certStatusClass(value) {
  const status = String(value || "").toLowerCase();
  if (status === "issued") return "cert-status-success";
  if (status === "approved") return "cert-status-info";
  if (status === "reviewed") return "cert-status-warn";
  if (status === "generated") return "cert-status-pending";
  if (status === "cancelled") return "cert-status-danger";
  return "cert-status-neutral";
}

function canMoveTo(current, target) {
  const idxCurrent = workflowSteps.indexOf(current);
  const idxTarget = workflowSteps.indexOf(target);
  if (idxCurrent === -1 || idxTarget === -1) return false;
  return idxTarget === idxCurrent + 1;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function withOptionalRemarks(payload, remarksValue) {
  const remarks = normalizeText(remarksValue);
  return { ...payload, remarks: remarks || "" };
}

const certificateGenerationEndpoints = {
  Bonafide: "bonafide",
  Study: "study",
  Conduct: "conduct",
  Fee: "fee",
  TC: "tc",
};

function getGenerationEndpoint(certificateType) {
  const type = String(certificateType || "").trim();

  if (!type) return null;

  const directMatch = Object.keys(certificateGenerationEndpoints).find(
    (key) => key.toLowerCase() === type.toLowerCase(),
  );
  if (directMatch) {
    return CERTIFICATE_API[certificateGenerationEndpoints[directMatch]];
  }

  const lowerType = type.toLowerCase();
  if (lowerType.includes("bonafide")) return CERTIFICATE_API.bonafide;
  if (lowerType.includes("study")) return CERTIFICATE_API.study;
  if (lowerType.includes("conduct")) return CERTIFICATE_API.conduct;
  if (lowerType.includes("fee")) return CERTIFICATE_API.fee;
  if (lowerType.includes("transfer") || lowerType === "tc" || lowerType.includes("tc")) return CERTIFICATE_API.tc;

  return null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSignatureHtml(signature) {
  const value = resolveSignatureSource(signature);
  if (!value) return "";

  const isImage = /^(data:image\/|https?:\/\/|blob:)/i.test(value);
  return isImage
    ? `<img class="certificate-signature" src="${escapeHtml(value)}" alt="Authorized signature" onerror="this.style.display='none';" />`
    : "";
}

function getCertificateTemplate(type, record) {
  const safePurpose = record.purpose || "official purpose";
  const institutionName = "Pirnav Junior College";
  const admissionNo = record.admissionNo || "-";
  const year = record.year || record.level || "-";
  const group = record.group || "-";
  const academicYear = record.academicYear || "-";
  const studyInfo = `with Admission No. ${admissionNo}, currently studying in ${year} (${group}) during the academic year ${academicYear}`;
  const studentRecord = `with Admission No. ${admissionNo}, in ${year} (${group}) during the academic year ${academicYear}`;

  switch (String(type || "").toLowerCase()) {
    case "bonafide certificate":
      return {
        heading: "Bonafide Certificate",
        paragraphOne: `${studyInfo}, and is a bonafide student of ${institutionName}.`,
        paragraphTwo: `This certificate is issued upon request to authenticate the student's status and is valid for the stated purpose of ${safePurpose}.`,
      };
    case "study certificate":
      return {
        heading: "Study Certificate",
        paragraphOne: `${studyInfo}, and has pursued studies at ${institutionName} in accordance with the institution's academic records.`,
        paragraphTwo: `This certificate is issued as an official record confirming the student's academic status and is valid for the purpose of ${safePurpose}.`,
      };
    case "transfer certificate":
    case "tc":
      return {
        heading: "Transfer Certificate",
        paragraphOne: `The student ${studentRecord} has been relieved from ${institutionName} as per the institutional records and is eligible to continue studies at another recognized institution.`,
        paragraphTwo: `This transfer certificate is issued for the purpose of ${safePurpose} and serves as an official record of the student's withdrawal from the institution.`,
      };
    case "conduct certificate":
      return {
        heading: "Conduct Certificate",
        paragraphOne: `${studyInfo}, and has maintained satisfactory conduct and discipline during the period of study at ${institutionName}.`,
        paragraphTwo: `This conduct certificate is issued to certify the student's behavior and is valid for the purpose of ${safePurpose}.`,
      };
    case "migration certificate":
      return {
        heading: "Migration Certificate",
        paragraphOne: `The student ${studentRecord} is permitted to migrate from ${institutionName} in accordance with the institution's academic regulations and official records.`,
        paragraphTwo: `This migration certificate is issued for the purpose of ${safePurpose} and is recognized as an official transfer of academic status.`,
      };
    case "fee certificate":
    case "fee":
      return {
        heading: "Fee Certificate",
        paragraphOne: `${studyInfo}. The fee particulars for the stated academic year have been verified from the official accounts records of ${institutionName}.`,
        paragraphTwo: `This fee certificate is issued as evidence of the student's fee record and is valid for the purpose of ${safePurpose}.`,
      };
    default:
      return {
        heading: "Student Certificate",
        paragraphOne: `${studyInfo}, and is/was a bonafide student of ${institutionName}.`,
        paragraphTwo: `This certificate is issued as an official academic document for the purpose of ${safePurpose}.`,
      };
  }
}

const CERTIFICATE_PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  body {
    margin: 0;
    font-family: "Times New Roman", Georgia, serif;
    background: #eef3fb;
    color: #18253f;
  }
  .page {
    min-height: 297mm;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: 14mm;
  }
  .cert {
    width: 100%;
    max-width: 820px;
    min-height: 1080px;
    box-sizing: border-box;
    background: #fff;
    border: 1px solid #c5d3ec;
    border-radius: 8px;
    box-shadow: 0 14px 36px rgba(17, 38, 74, 0.14);
    padding: 42px 44px;
    position: relative;
    overflow: hidden;
  }
  .watermark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 0;
    opacity: 0.06;
    font-size: 120px;
    letter-spacing: 4px;
    font-weight: 700;
    color: #21437f;
    text-transform: uppercase;
  }
  .cert::before,
  .cert::after {
    content: "";
    position: absolute;
    border: 2px solid #d5e0f5;
    pointer-events: none;
  }
  .cert::before { inset: 14px; }
  .cert::after { inset: 24px; }
  .inner {
    position: relative;
    z-index: 1;
  }
  .head {
    text-align: center;
    border-bottom: 1px solid #cdd9ef;
    padding-bottom: 14px;
  }
  .college-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0 auto 10px;
  }
  .seal {
    width: 56px;
    height: 56px;
    margin: 0;
    border-radius: 50%;
    border: 1px solid #b9cbec;
    background: #edf3ff;
    color: #2954a8;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.8px;
  }
  .head h1 {
    margin: 0;
    font-size: 34px;
    letter-spacing: 0.3px;
    font-weight: 800;
    color: #14366e;
    text-transform: uppercase;
    line-height: 1.05;
  }
  .head p {
    margin: 0;
    font-size: 16px;
    letter-spacing: 0.3px;
    color: #37527f;
    font-weight: 700;
  }
  .motto {
    margin-top: 10px;
    font-size: 12px;
    color: #5a6f93;
    letter-spacing: 0.3px;
    font-style: italic;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    font-size: 13px;
    color: #2e4269;
  }
  .body {
    margin-top: 28px;
    font-size: 20px;
    line-height: 1.8;
    text-align: justify;
    color: #1d3156;
  }
  .subject {
    margin-top: 22px;
    text-align: center;
    font-size: 14px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #304c7d;
    font-weight: 700;
  }
  .body strong {
    color: #13284c;
  }
  .footer {
    margin-top: 52px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    column-gap: 24px;
    text-align: center;
  }
  .issue-note {
    text-align: left;
    font-size: 12px;
    color: #4f6388;
    line-height: 1.5;
  }
  .footer strong {
    display: block;
    margin-top: 42px;
    border-top: 1px solid #354f7f;
    padding-top: 10px;
    min-width: 250px;
    font-size: 15px;
  }
  .certificate-signature {
    display: block;
    width: 180px;
    height: auto;
    max-height: 70px;
    object-fit: contain;
    margin: 0 auto 8px;
  }
  .certificate-signature-text {
    display: block;
    margin: 0 auto 8px;
    font-family: "Segoe Script", "Brush Script MT", cursive;
    font-size: 24px;
    color: #18253f;
  }
  .authorized-signatory {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #4f6388;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 14mm; min-height: 297mm; }
    .cert {
      max-width: none;
      min-height: auto;
      border-radius: 0;
      box-shadow: none;
      border-color: #cfd8ea;
      padding: 28px;
      break-inside: avoid;
      min-height: 269mm;
    }
  }
`;

function buildPrintHtml(record) {
  const certificateNo = escapeHtml(record.number);
  const student = escapeHtml(record.student);
  const template = getCertificateTemplate(record.type, record);
  const templateHeading = escapeHtml(template.heading);
  const templateParaOne = escapeHtml(template.paragraphOne);
  const templateParaTwo = escapeHtml(template.paragraphTwo);
  const issueDate = escapeHtml(formatDateDdMmYyyy(record.issue));
  const status = escapeHtml(record.status || "Draft");
  const signature = renderSignatureHtml(record.signature);
  const remarks = record.remarks ? `<p><strong>Remarks:</strong> ${escapeHtml(record.remarks)}</p>` : "";

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>Certificate ${certificateNo}</title>
<style>${CERTIFICATE_PRINT_CSS}</style>
</head>
<body>
  <div class="page">
    <section class="cert">
      <div class="watermark">PJC</div>
      <div class="inner">
      <header class="head">
        <div class="college-row">
          <div class="seal">PJC</div>
          <p>Pirnav Junior College</p>
        </div>
        <h1>${templateHeading}</h1>
        <div class="motto">Empowering learners with integrity, discipline and excellence</div>
      </header>

      <div class="meta">
        <span>Certificate No: <strong>${certificateNo}</strong></span>
        <span>Status: <strong>${status}</strong></span>
      </div>

      <div class="subject">To Whom It May Concern</div>

      <div class="body">
        This is to certify that <strong>${student}</strong> ${templateParaOne}
        ${templateParaTwo}
        <br /><br />
        <strong>Issue Date:</strong> ${issueDate}
        ${remarks}
      </div>

      <footer class="footer">
        <div class="issue-note">
          This is a system-generated institutional certificate and is valid without alteration.
        </div>
        <div>
          ${signature}
          <span class="authorized-signatory">Authorized Signatory</span>
          <strong>Principal, Pirnav Junior College</strong>
        </div>
      </footer>
      </div>
    </section>
  </div>
</body>
</html>`;
}

export default function CertificatesPage() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [rows, setRows] = useState(() => staticCertificates.map((item) => normalizeCertificate(item, fallbackStudents)));
  const [studentRows, setStudentRows] = useState(fallbackStudents);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyAction, setBusyAction] = useState({ id: null, type: "" });
  const [bulkAction, setBulkAction] = useState("");
  const [printingId, setPrintingId] = useState(null);

  const [form, setForm] = useState({
    admissionNo: "",
    student: "",
    group: "",
    level: "",
    academicYear: "",
    type: "",
    customType: "",
    purpose: "",
    requestDate: todayIso(),
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [activeTab, setActiveTab] = useState("generate");
  const [page, setPage] = useState(1);
  const [actionPage, setActionPage] = useState(1);
  const [printPreview, setPrintPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({
    admissionNo: "",
    student: "",
    group: "",
    level: "",
    academicYear: "",
    purpose: "",
    remarks: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [toast, setToast] = useState("");
  const admissionLookupRef = useRef(0);

  const formFields = useMemo(
    () => baseFormFields.map((field) => {
      if (field.name === "admissionNo") return { ...field, disabled: loadingStudents };
      if (field.name === "type") return { ...field, options: options.certificateType };
      return field;
    }),
    [loadingStudents],
  );

  const isRowBusy = (rowId, action = "") => {
    if (!busyAction.id) return false;
    if (busyAction.id !== rowId) return false;
    return action ? busyAction.type === action : true;
  };

  const canResolveStudentIdFromRow = (row) => {
    if (Number(row?.studentId)) return true;
    const matchedStudent = findStudentByAdmission(row?.admissionNo);
    return Number(matchedStudent?.id) > 0;
  };

  const hasServerCertificateId = (row) => {
    const value = row?.backendId ?? row?.id;
    return value !== undefined && value !== null && String(value).trim() !== "";
  };

  const resolveServerCertificateId = async (row) => {
    if (!row) return null;
    if (hasServerCertificateId(row)) {
      return String(row.backendId ?? row.id);
    }

    return null;
  };

  const reloadCurrentView = async () => {
    await loadCertificates({ showLoader: false });
  };

  const loadCertificates = async ({ showLoader = true, studentLookup = studentRows } = {}) => {
    if (showLoader) setLoadingList(true);
    try {
      const response = await apiClient.get(CERTIFICATE_API.list);
      const mapped = unwrapListPayload(response?.data).map((item) => normalizeCertificate(item, studentLookup));
      setRows(mapped.length ? mapped : staticCertificates.map((item) => normalizeCertificate(item, studentLookup)));
      return true;
    } catch (error) {
      setRows(staticCertificates.map((item) => normalizeCertificate(item, studentLookup)));
      const message = getFriendlyErrorMessage(error, "Failed to load certificates. Please try again.");
      setToast(message);
      return false;
    } finally {
      if (showLoader) setLoadingList(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const endpoints = [
        apiEndpoints.students.getAll,
        apiEndpoints.students.getActive,
        apiEndpoints.admissions.getAll,
      ].filter(Boolean);
      const responses = await Promise.allSettled(endpoints.map((endpoint) => apiClient.get(endpoint)));
      const records = responses.flatMap((result) => (
        result.status === "fulfilled" ? unwrapStudentPayload(result.value?.data) : []
      ));
      const studentsByAdmission = new Map();
      records.map(normalizeStudentRecord).filter((student) => student.admissionNo).forEach((student) => {
        const key = student.admissionNo.toLowerCase();
        const current = studentsByAdmission.get(key) || {};
        studentsByAdmission.set(key, {
          id: student.id || current.id || null,
          admissionNo: student.admissionNo || current.admissionNo || "",
          name: student.name || current.name || "",
          group: student.group || current.group || "",
          level: student.level || current.level || "",
          academicYear: student.academicYear || current.academicYear || "",
        });
      });
      const apiStudents = [...studentsByAdmission.values()];
      const mapped = [
        ...apiStudents,
        ...fallbackStudents.filter((mockStudent) => !studentsByAdmission.has(mockStudent.admissionNo.toLowerCase())),
      ];
      setStudentRows(mapped);
      return mapped;
    } catch (error) {
      setStudentRows(fallbackStudents);
      setToast(getFriendlyErrorMessage(error, "Failed to load students."));
      return fallbackStudents;
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    (async () => {
      const studentLookup = await loadStudents();
      await loadCertificates({ studentLookup });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findStudentByAdmission = (admissionNo) =>
    studentRows.find((student) => String(student.admissionNo).trim().toLowerCase() === String(admissionNo).trim().toLowerCase()) || null;

  useEffect(() => {
    const admissionNo = String(form.admissionNo || "").trim();
    if (!admissionNo || admissionNo.length < 2) return undefined;

    const lookupId = admissionLookupRef.current + 1;
    admissionLookupRef.current = lookupId;
    const timer = window.setTimeout(async () => {
      try {
        let candidates = [];
        try {
          const response = await apiClient.get(apiEndpoints.students.search, {
            params: { admissionNo, search: admissionNo },
          });
          candidates = unwrapStudentPayload(response?.data);
        } catch {
          const responses = await Promise.allSettled([
            apiClient.get(apiEndpoints.students.getAll),
            apiClient.get(apiEndpoints.admissions.getAll),
          ]);
          candidates = responses.flatMap((result) => (
            result.status === "fulfilled" ? unwrapStudentPayload(result.value?.data) : []
          ));
        }
        if (!candidates.length) {
          const admissionsResponse = await apiClient.get(apiEndpoints.admissions.getAll);
          candidates = unwrapStudentPayload(admissionsResponse?.data);
        }
        const matchedStudent = candidates
          .map(normalizeStudentRecord)
          .find((student) => student.admissionNo.trim().toLowerCase() === admissionNo.toLowerCase());
        if (!matchedStudent || admissionLookupRef.current !== lookupId) return;

        const existingStudent = findStudentByAdmission(admissionNo);
        const resolvedStudent = {
          ...matchedStudent,
          id: matchedStudent.id || existingStudent?.id || null,
          name: matchedStudent.name || existingStudent?.name || "",
          group: matchedStudent.group || existingStudent?.group || "",
          level: matchedStudent.level || existingStudent?.level || "",
          academicYear: matchedStudent.academicYear || existingStudent?.academicYear || "",
        };

        setStudentRows((current) => [
          ...current.filter((student) => student.admissionNo !== resolvedStudent.admissionNo),
          resolvedStudent,
        ]);
        setForm((current) => ({
          ...current,
          student: resolvedStudent.name,
          group: resolvedStudent.group,
          level: resolvedStudent.level,
          academicYear: resolvedStudent.academicYear,
        }));
        setErrors((current) => ({ ...current, admissionNo: undefined }));
      } catch {
        // Validation reports an unknown admission number when no student is found.
      }
    }, 350);

    return () => window.clearTimeout(timer);
    // Admission changes intentionally drive the lookup; studentRows is merged inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.admissionNo]);

  const upsertFromApiResponse = async (id, responseData) => {
    const single = unwrapSinglePayload(responseData);
    if (hasCertificateShape(single)) {
      const normalized = normalizeCertificate(single, studentRows);
      setRows((prev) => {
        const index = prev.findIndex((row) => String(row.id) === String(normalized.id));
        if (index === -1) return [normalized, ...prev];
        const next = [...prev];
        next[index] = { ...next[index], ...normalized };
        return next;
      });
      return;
    }

    if (id !== undefined && id !== null) {
      try {
        const byIdResponse = await apiClient.get(CERTIFICATE_API.getById(id));
        
        const byIdData = unwrapSinglePayload(byIdResponse.data);
        if (hasCertificateShape(byIdData)) {
          const normalizedById = normalizeCertificate(byIdData, studentRows);
          setRows((prev) => {
            const index = prev.findIndex((row) => String(row.id) === String(normalizedById.id));
            if (index === -1) return [normalizedById, ...prev];
            const next = [...prev];
            next[index] = { ...next[index], ...normalizedById };
            return next;
          });
          return;
        }
      } catch {
        // Fallback to list refresh when by-id is not available.
      }
    }

    await loadCertificates({ showLoader: false });
  };

  const validate = () => {
    const next = {};
    const admissionNo = String(form.admissionNo || "").trim();
    const selectedType = String(form.type || "").trim();
    const type = selectedType === "Others" ? normalizeText(form.customType) : selectedType;
    const purpose = normalizeText(form.purpose);
    const requestDate = String(form.requestDate || "").trim();
    const remarks = normalizeText(form.remarks);

    formFields.forEach((field) => {
      const value = form[field.name];
      if (field.required && !String(value || "").trim()) next[field.name] = `${field.label} is required`;
    });

    if (admissionNo && !findStudentByAdmission(admissionNo)) {
      next.admissionNo = "Select a valid admission number";
    }

    if (selectedType && selectedType !== "Others" && !options.certificateType.includes(selectedType)) {
      next.type = "Select a valid certificate type";
    }

    if (selectedType === "Others" && !type) {
      next.customType = "Enter the certificate type";
    }

    if (purpose.length < 5) {
      next.purpose = "Purpose should be at least 5 characters";
    } else if (purpose.length > MAX_PURPOSE_LENGTH) {
      next.purpose = `Purpose should not exceed ${MAX_PURPOSE_LENGTH} characters`;
    }

    if (!requestDate) {
      next.requestDate = "Request Date is required";
    } else if (!isValidDateInput(requestDate)) {
      next.requestDate = "Enter a valid request date";
    } else if (requestDate > todayIso()) {
      next.requestDate = "Request Date cannot be in the future";
    }

    if (remarks.length > MAX_REMARKS_LENGTH) {
      next.remarks = `Remarks should not exceed ${MAX_REMARKS_LENGTH} characters`;
    }

    const duplicate = rows.some(
      (row) =>
        row.admissionNo === admissionNo &&
        row.type === type &&
        row.status !== "Cancelled",
    );

    if (duplicate) {
      next.admissionNo = "This admission number already has this certificate type";
      next.type = "Duplicate certificate type for this student";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setForm({
      admissionNo: "",
      student: "",
      group: "",
      level: "",
      academicYear: "",
      type: "",
      customType: "",
      purpose: "",
      requestDate: todayIso(),
      remarks: "",
    });
    setErrors({});
  };

  const refreshCertificates = async () => {
    const ok = await loadCertificates();
    setPage(1);
    setPrintPreview(null);
    setEditRow(null);
    if (ok) setToast("Certificates refreshed from server");
  };

  const generateCertificate = async () => {
    if (!validate()) return;
    if (creating) return;

    const admissionNo = String(form.admissionNo || "").trim();
    const selectedType = String(form.type || "").trim();
    const type = selectedType === "Others" ? normalizeText(form.customType) : selectedType;
    const purpose = normalizeText(form.purpose);
    const requestDate = String(form.requestDate || "").trim();
    const remarks = normalizeText(form.remarks);
    const selectedStudent = findStudentByAdmission(admissionNo);
    if (!selectedStudent) {
      setErrors((prev) => ({ ...prev, admissionNo: "Select a valid admission number" }));
      return;
    }

    setCreating(true);
    try {
      const endpoint = selectedType === "Others" ? CERTIFICATE_API.other : getGenerationEndpoint(type);
      if (!endpoint) {
        setToast("This certificate type is not supported by the backend endpoint configuration.");
        return;
      }
      const normalizedRequestDate = normalizeApiDateValue(requestDate);
      const specializedPayload = withOptionalRemarks({
        admissionNo,
        studentId: Number(selectedStudent.id),
        certificateType: type,
        purpose,
        requestDate: normalizedRequestDate,
        issueDate: normalizedRequestDate,
        ...(selectedType === "Others" ? { status: "Generated" } : {}),
      }, remarks);
      const response = await apiClient.post(endpoint, specializedPayload);
      await upsertFromApiResponse(undefined, response.data);
      await reloadCurrentView();
      resetForm();
      setActiveTab("certificates");
      setToast(selectedType === "Others" ? "Other certificate draft created successfully." : "Certificate generated successfully.");
    } catch (error) {
      const canUseDemoFallback = selectedType === "Others" && (
        !error?.response || Number(error.response.status) >= 500
      );

      if (canUseDemoFallback) {
        const demoId = `mock-cert-${Date.now()}`;
        const demoCertificate = normalizeCertificate({
          id: demoId,
          certificateNo: `DEMO-${Date.now().toString().slice(-6)}`,
          studentId: selectedStudent.id,
          admissionNo,
          studentName: selectedStudent.name,
          group: selectedStudent.group,
          level: selectedStudent.level,
          academicYear: selectedStudent.academicYear,
          certificateType: type,
          purpose,
          requestDate,
          issueDate: requestDate,
          status: "Generated",
          remarks,
        }, studentRows);

        setRows((currentRows) => [demoCertificate, ...currentRows]);
        resetForm();
        setActiveTab("certificates");
        setPage(1);
        setToast("The server could not create the certificate, so a demo draft was created locally for workflow testing.");
        return;
      }

      setToast(getFriendlyErrorMessage(error, "Failed to generate certificate. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const handleWorkflowChange = async (row, action) => {
    if (busyAction.id) return;
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) return;

    const actionMap = {
      review: { endpoint: CERTIFICATE_API.review, method: "patch", nextStatus: "Reviewed", success: "moved to reviewed" },
      approve: { endpoint: CERTIFICATE_API.approve, method: "patch", nextStatus: "Approved", success: "approved" },
      issue: { endpoint: CERTIFICATE_API.issue, method: "patch", nextStatus: "Issued", success: "issued" },
    };
    const selected = actionMap[action];
    if (!selected) return;
    if (!canMoveTo(row.status, selected.nextStatus)) return;

    setBusyAction({ id: row.id, type: action });

    if (isStaticCertificateRow(row)) {
      setRows((currentRows) => currentRows.map((currentRow) => (
        String(currentRow.id) === String(row.id)
          ? {
            ...currentRow,
            status: selected.nextStatus,
            ...(action === "review" ? { reviewedAt: todayIso() } : {}),
            ...(action === "approve" ? { approvedAt: todayIso() } : {}),
            ...(action === "issue" ? { issuedAt: todayIso(), issue: todayIso() } : {}),
          }
          : currentRow
      )));
      if (action === "review") {
        setPrintPreview(null);
        setActiveTab("actions");
        setActionPage(1);
      }
      setToast(`Demo certificate ${row.number} ${selected.success}`);
      setBusyAction({ id: null, type: "" });
      return;
    }

    try {
      const response = await apiClient[selected.method](selected.endpoint(actionId));
      setRows((currentRows) => currentRows.map((currentRow) => (
        String(currentRow.id) === String(row.id)
          ? {
            ...currentRow,
            status: selected.nextStatus,
            ...(action === "review" ? { reviewedAt: todayIso() } : {}),
            ...(action === "approve" ? { approvedAt: todayIso() } : {}),
            ...(action === "issue" ? { issuedAt: todayIso(), issue: todayIso() } : {}),
          }
          : currentRow
      )));
      await upsertFromApiResponse(actionId, response.data);
      await reloadCurrentView();
      if (action === "review") {
        setPrintPreview(null);
        setActiveTab("actions");
        setActionPage(1);
      }
      setToast(`Certificate ${row.number} ${selected.success}`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, `Failed to ${action} certificate. Please try again.`));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const handleBulkWorkflow = async (action) => {
    if (bulkAction || busyAction.id) return;

    const actionMap = {
      review: { currentStatus: "Generated", nextStatus: "Reviewed", endpoint: CERTIFICATE_API.review, label: "reviewed" },
      approve: { currentStatus: "Reviewed", nextStatus: "Approved", endpoint: CERTIFICATE_API.approve, label: "approved" },
      issue: { currentStatus: "Approved", nextStatus: "Issued", endpoint: CERTIFICATE_API.issue, label: "issued" },
    };
    const selected = actionMap[action];
    if (!selected) return;

    const eligibleRows = rows.filter((row) => row.status === selected.currentStatus && hasServerCertificateId(row));
    if (!eligibleRows.length) {
      setToast(`No ${selected.currentStatus.toLowerCase()} certificates are available for bulk ${action}.`);
      return;
    }

    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} all?`,
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} all ${eligibleRows.length} eligible certificate${eligibleRows.length === 1 ? "" : "s"}?`,
      confirmLabel: `${action.charAt(0).toUpperCase() + action.slice(1)} all`,
    });
    if (!confirmed) return;

    setBulkAction(action);
    try {
      const results = await Promise.all(eligibleRows.map(async (row) => {
        if (isStaticCertificateRow(row)) return { row, succeeded: true };
        try {
          const actionId = await resolveServerCertificateId(row);
          if (!actionId) return { row, succeeded: false };
          await apiClient.patch(selected.endpoint(actionId));
          return { row, succeeded: true };
        } catch {
          return { row, succeeded: false };
        }
      }));

      const succeededIds = new Set(results.filter((result) => result.succeeded).map((result) => String(result.row.id)));
      const succeededCount = succeededIds.size;
      const failedCount = results.length - succeededCount;

      setRows((currentRows) => currentRows.map((row) => (
        succeededIds.has(String(row.id))
          ? {
            ...row,
            status: selected.nextStatus,
            ...(action === "review" ? { reviewedAt: todayIso() } : {}),
            ...(action === "approve" ? { approvedAt: todayIso() } : {}),
            ...(action === "issue" ? { issuedAt: todayIso(), issue: todayIso() } : {}),
          }
          : row
      )));

      if (action === "review" && succeededCount) {
        setPrintPreview(null);
        setActiveTab("actions");
        setActionPage(1);
      }
      setToast(`${succeededCount} certificate${succeededCount === 1 ? "" : "s"} ${selected.label}${failedCount ? `; ${failedCount} failed` : ""}.`);
    } finally {
      setBulkAction("");
    }
  };

  const cancelCertificate = async (row) => {
    if (busyAction.id) return;
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) return;
    const ok = await confirm({
      title: "Cancel certificate",
      message: `Cancel certificate ${row.number}?`,
      confirmLabel: "Cancel certificate",
      danger: true,
    });
    if (!ok) return;

    setBusyAction({ id: row.id, type: "cancel" });
    if (isStaticCertificateRow(row)) {
      setRows((currentRows) => currentRows.map((currentRow) => (
        String(currentRow.id) === String(row.id)
          ? { ...currentRow, status: "Cancelled", cancelledAt: todayIso() }
          : currentRow
      )));
      setToast(`Demo certificate ${row.number} cancelled`);
      setBusyAction({ id: null, type: "" });
      return;
    }

    try {
      const response = await apiClient.patch(CERTIFICATE_API.cancel(actionId));
      await upsertFromApiResponse(actionId, response.data);
      await reloadCurrentView();
      setToast(`Certificate ${row.number} cancelled`);
    } catch (error) {
      const canUseLocalFallback = !error?.response || Number(error.response.status) >= 500;
      if (canUseLocalFallback) {
        setRows((currentRows) => currentRows.map((currentRow) => (
          String(currentRow.id) === String(row.id)
            ? { ...currentRow, status: "Cancelled", cancelledAt: todayIso() }
            : currentRow
        )));
        setToast(`Certificate ${row.number} cancelled locally because the server could not complete the request.`);
      } else {
        setToast(getFriendlyErrorMessage(error, "Failed to cancel certificate. Please try again."));
      }
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const regenerateCertificate = async (row) => {
    if (busyAction.id) return;
    if (row.reissuedAt) {
      setToast(`Certificate ${row.number} has already been reissued as ${row.reissuedCertificateNo || "a new certificate"}.`);
      return;
    }
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) return;
    const confirmed = await confirm({
      title: "Reissue certificate",
      message: `Do you want to reissue certificate ${row.number}? A new certificate number will be generated.`,
      confirmLabel: "Reissue",
    });
    if (!confirmed) return;
    setBusyAction({ id: row.id, type: "reissue" });

    if (isStaticCertificateRow(row)) {
      const reissuedId = `mock-cert-${Date.now()}`;
      const reissued = {
        ...row,
        id: reissuedId,
        backendId: reissuedId,
        number: `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        status: "Issued",
        requestDate: todayIso(),
        issue: todayIso(),
        generatedAt: todayIso(),
        reviewedAt: "",
        approvedAt: "",
        issuedAt: todayIso(),
        cancelledAt: "",
      };
      setRows((currentRows) => [
        reissued,
        ...currentRows.map((currentRow) => (
          String(currentRow.id) === String(row.id)
            ? { ...currentRow, reissuedAt: todayIso(), reissuedCertificateNo: reissued.number }
            : currentRow
        )),
      ]);
      setActiveTab("actions");
      setActionPage(1);
      setToast(`Demo certificate ${row.number} reissued as ${reissued.number}`);
      setBusyAction({ id: null, type: "" });
      return;
    }

    try {
      let resolvedStudentId = Number(row.studentId) || null;
      if (!resolvedStudentId) {
        const matchedStudent = findStudentByAdmission(row.admissionNo);
        resolvedStudentId = Number(matchedStudent?.id) || null;
      }

      if (!resolvedStudentId) {
        try {
          const byIdResponse = await apiClient.get(CERTIFICATE_API.getById(row.id));
          const byIdData = unwrapSinglePayload(byIdResponse.data);
          const normalizedById = normalizeCertificate(byIdData || {}, studentRows);
          resolvedStudentId = Number(normalizedById.studentId) || null;
        } catch {
          // Keep graceful error below if student id still cannot be resolved.
        }
      }

      if (!resolvedStudentId) {
        setToast("Unable to reissue certificate because student ID is missing.");
        return;
      }

      const response = await apiClient.post(CERTIFICATE_API.reissue, withOptionalRemarks({
        certificateId: actionId,
        studentId: resolvedStudentId,
        admissionNo: String(row.admissionNo || findStudentByAdmission(row.admissionNo)?.admissionNo || "").trim(),
        certificateType: String(row.type || "").trim(),
        purpose: String(row.purpose || "").trim(),
        requestDate: normalizeApiDateValue(row.requestDate) || todayIso(),
      }, row.remarks));
      const responseRecord = unwrapSinglePayload(response.data);
      const normalizedResponse = hasCertificateShape(responseRecord)
        ? normalizeCertificate(responseRecord, studentRows)
        : null;
      const generatedNumber = `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const responseNumber = String(normalizedResponse?.number || "").trim();
      const hasNewServerNumber = responseNumber && responseNumber !== "-" && responseNumber !== String(row.number);
      const responseId = normalizedResponse?.backendId;
      const hasNewServerId = responseId && String(responseId) !== String(actionId);
      const reissuedId = hasNewServerId ? String(responseId) : `mock-cert-${Date.now()}`;
      const reissued = {
        ...row,
        ...(normalizedResponse || {}),
        id: reissuedId,
        backendId: reissuedId,
        number: hasNewServerNumber ? responseNumber : generatedNumber,
        status: "Issued",
        requestDate: normalizedResponse?.requestDate || todayIso(),
        issue: normalizedResponse?.issue || todayIso(),
        generatedAt: normalizedResponse?.generatedAt || todayIso(),
        reviewedAt: normalizedResponse?.reviewedAt || todayIso(),
        approvedAt: normalizedResponse?.approvedAt || todayIso(),
        issuedAt: normalizedResponse?.issuedAt || todayIso(),
        cancelledAt: "",
      };
      setRows((currentRows) => [
        reissued,
        ...currentRows
          .filter((item) => String(item.id) !== String(reissued.id))
          .map((currentRow) => (
            String(currentRow.id) === String(row.id)
              ? { ...currentRow, reissuedAt: todayIso(), reissuedCertificateNo: reissued.number }
              : currentRow
          )),
      ]);
      setPrintPreview(null);
      setActiveTab("actions");
      setActionPage(1);
      setToast(`Certificate ${row.number} reissued as ${reissued.number}`);
    } catch (error) {
      const canUseLocalFallback = !error?.response || Number(error.response.status) >= 500;
      if (canUseLocalFallback) {
        const reissuedId = `mock-cert-${Date.now()}`;
        const reissuedNumber = `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const reissued = {
          ...row,
          id: reissuedId,
          backendId: reissuedId,
          number: reissuedNumber,
          status: "Issued",
          requestDate: todayIso(),
          issue: todayIso(),
          generatedAt: todayIso(),
          reviewedAt: "",
          approvedAt: "",
          issuedAt: todayIso(),
          cancelledAt: "",
        };
        setRows((currentRows) => [
          reissued,
          ...currentRows.map((currentRow) => (
            String(currentRow.id) === String(row.id)
              ? { ...currentRow, reissuedAt: todayIso(), reissuedCertificateNo: reissued.number }
              : currentRow
          )),
        ]);
        setActiveTab("actions");
        setActionPage(1);
        setToast(`Certificate ${row.number} reissued locally as ${reissuedNumber}.`);
      } else {
        setToast(getFriendlyErrorMessage(error, "Failed to reissue certificate. Please try again."));
      }
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const printCertificate = async (record) => {
    let target = record;
    if (!target) return;

    if (printingId) return;
    setPrintingId(target.id);

    try {
      const popup = window.open("", "_blank", "width=1000,height=760");
      if (!popup) {
        setToast("Please allow popups to print certificate");
        return;
      }

      const resolvedId = await resolveServerCertificateId(record);
      if (resolvedId) {
        try {
          const response = await apiClient.get(CERTIFICATE_API.getById(resolvedId));
          const details = unwrapSinglePayload(response.data);
          if (hasCertificateShape(details)) {
            const normalizedDetails = normalizeCertificate(details, studentRows);
            target = {
              ...record,
              ...normalizedDetails,
              signature: normalizedDetails.signature || getSignatureValue(response.data) || record.signature || "",
            };
          }
        } catch {
          // Retain the already loaded record when certificate details are unavailable.
        }
      }

      const openPrintDialog = () => {
        const images = Array.from(popup.document.images || []);
        const imageLoads = images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
        });

        Promise.all(imageLoads).then(() => {
          window.setTimeout(() => {
            try {
              popup.focus();
              popup.print();
            } catch {
              // Ignore browser print blockers.
            }
          }, 250);
        });
      };

      popup.onload = openPrintDialog;
      popup.document.open();
      popup.document.write(buildPrintHtml(target));
      popup.document.close();

      // Some browsers complete the popup document before firing the assigned
      // load callback. Keep a safe fallback so the print dialog still opens.
      if (popup.document.readyState === "complete") {
        openPrintDialog();
      }
    } catch {
      setToast("Unable to open print preview for this certificate.");
    } finally {
      setTimeout(() => setPrintingId(null), 400);
    }
  };

  const openPrintPreview = (record) => {
    if (!record) return;
    (async () => {
      const resolvedId = await resolveServerCertificateId(record);
      if (!resolvedId) {
        setPrintPreview(record);
        return;
      }
      try {
        const response = await apiClient.get(CERTIFICATE_API.getById(resolvedId));
        const details = unwrapSinglePayload(response.data);
        if (hasCertificateShape(details)) {
          const normalizedDetails = normalizeCertificate(details, studentRows);
          setPrintPreview({
            ...normalizedDetails,
            signature: normalizedDetails.signature || getSignatureValue(response.data) || record.signature || "",
          });
          return;
        }
      } catch {
        // keep fallback below
      }
      setPrintPreview(record);
    })();
  };

  const openEditDialog = (row) => {
    if (!row) return;
    (async () => {
      let source = row;
      const resolvedId = await resolveServerCertificateId(row);
      if (!resolvedId) {
        setEditRow(source);
        const selectedStudent = findStudentByAdmission(source.admissionNo || "");
        setEditForm({
          admissionNo: source.admissionNo || "",
          student: source.student || selectedStudent?.name || "",
          group: source.group || selectedStudent?.group || "",
          level: source.level || selectedStudent?.level || "",
          academicYear: source.academicYear || selectedStudent?.academicYear || "",
          purpose: source.purpose || "",
          remarks: source.remarks || "",
        });
        setEditErrors({});
        return;
      }
      try {
        const response = await apiClient.get(CERTIFICATE_API.getById(resolvedId));
        const details = unwrapSinglePayload(response.data);
        if (hasCertificateShape(details)) source = normalizeCertificate(details, studentRows);
      } catch {
        // Keep row fallback
      }
      setEditRow(source);
      const selectedStudent = findStudentByAdmission(source.admissionNo || "");
      setEditForm({
        admissionNo: source.admissionNo || "",
        student: source.student || selectedStudent?.name || "",
        group: source.group || selectedStudent?.group || "",
        level: source.level || selectedStudent?.level || "",
        academicYear: source.academicYear || selectedStudent?.academicYear || "",
        purpose: source.purpose || "",
        remarks: source.remarks || "",
      });
      setEditErrors({});
    })();
  };

  const handleEditAdmissionChange = (value) => {
    const selectedStudent = findStudentByAdmission(value);
    setEditForm((prev) => ({
      ...prev,
      admissionNo: value,
      student: selectedStudent?.name || "",
      group: selectedStudent?.group || "",
      level: selectedStudent?.level || "",
      academicYear: selectedStudent?.academicYear || "",
    }));
    setEditErrors((prev) => ({ ...prev, admissionNo: undefined }));
  };

  const closeEditDialog = () => {
    setEditRow(null);
    setEditErrors({});
  };

  const saveEditDialog = async () => {
    if (!editRow) return;

    const certificateId = editRow.backendId ?? editRow.id;
    if (!certificateId || !String(certificateId).trim()) {
      setToast("Certificate edit is not supported by the available backend APIs.");
      closeEditDialog();
      return;
    }

    const nextErrors = {};
    if (!String(editForm.admissionNo || "").trim()) nextErrors.admissionNo = "Admission No. is required";

    const selectedStudent = findStudentByAdmission(editForm.admissionNo);
    if (!selectedStudent) nextErrors.admissionNo = "Select a valid admission number";

    if (!String(editForm.purpose || "").trim()) {
      nextErrors.purpose = "Purpose is required";
    } else if (normalizeText(editForm.purpose).length < 5) {
      nextErrors.purpose = "Purpose should be at least 5 characters";
    } else if (normalizeText(editForm.purpose).length > MAX_PURPOSE_LENGTH) {
      nextErrors.purpose = `Purpose should not exceed ${MAX_PURPOSE_LENGTH} characters`;
    }

    if (normalizeText(editForm.remarks).length > MAX_REMARKS_LENGTH) {
      nextErrors.remarks = `Remarks should not exceed ${MAX_REMARKS_LENGTH} characters`;
    }

    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (savingEdit) return;
    setSavingEdit(true);
    try {
      setToast("Certificate editing is not supported by the backend. Please use the available review/approve/issue workflow.");
      closeEditDialog();
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Certificate editing is not supported by the backend."));
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const passStatus = status === "All" || row.status === status;
      if (!passStatus) return false;
      if (!q) return true;
      return [row.number, row.student, row.admissionNo, row.level, row.group, row.academicYear, row.type, row.purpose, row.status]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [rows, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const actionRows = rows.filter((row) => ["Reviewed", "Approved", "Issued", "Cancelled"].includes(row.status));
  const actionTotalPages = Math.max(1, Math.ceil(actionRows.length / PAGE_SIZE));
  const currentActionPage = Math.min(actionPage, actionTotalPages);
  const actionPageRows = actionRows.slice((currentActionPage - 1) * PAGE_SIZE, currentActionPage * PAGE_SIZE);

  const printTemplate = printPreview ? getCertificateTemplate(printPreview.type, printPreview) : null;
  const previewSignature = resolveSignatureSource(printPreview?.signature);
  const previewSignatureIsImage = /^(data:image\/|https?:\/\/|blob:)/i.test(previewSignature);
  const tabButtonStyle = (tab) => ({
    border: "1px solid var(--cms-border)",
    borderRadius: "var(--cms-radius)",
    padding: "9px 14px",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    color: activeTab === tab ? "#ffffff" : "var(--cms-text)",
    background: activeTab === tab ? "var(--cms-primary)" : "var(--cms-surface)",
  });
  const workflowButtonStyle = (action, enabled) => {
    const styles = {
      review: { background: "#e0f2fe", borderColor: "#7dd3fc", color: "#0369a1" },
      approve: { background: "#ecfdf5", borderColor: "#6ee7b7", color: "#047857" },
      issue: { background: "#0f766e", borderColor: "#0f766e", color: "#ffffff" },
    };
    const current = styles[action];
    return {
      minWidth: 38,
      minHeight: 34,
      padding: 6,
      border: "1px solid",
      borderRadius: 7,
      font: "inherit",
      fontSize: 12,
      fontWeight: 700,
      ...current,
      opacity: enabled ? 1 : 0.52,
      cursor: enabled ? "pointer" : "not-allowed",
    };
  };

  return (
    <DashboardLayout
      title="Certificate Management"
      subtitle="Generate certificates, view requests, and process approval ."
      breadcrumb={["Administration"]}
    >
      <div className="cert-page">
        <nav className="cert-internal-tabs" aria-label="Certificate sections" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" style={tabButtonStyle("generate")} title="Generate Certificate" aria-label="Generate Certificate" aria-current={activeTab === "generate" ? "page" : undefined} onClick={() => setActiveTab("generate")}>
            <FaAward size={14} aria-hidden="true" /> Generate Certificate
          </button>
          <button type="button" style={tabButtonStyle("certificates")} title="Certificates" aria-label="Certificates" aria-current={activeTab === "certificates" ? "page" : undefined} onClick={() => setActiveTab("certificates")}>
            <FaMagnifyingGlass size={13} aria-hidden="true" /> Certificates
          </button>
          <button type="button" style={tabButtonStyle("actions")} title="Approve, Issue" aria-label="Approve, Issue" aria-current={activeTab === "actions" ? "page" : undefined} onClick={() => setActiveTab("actions")}>
            <FaCheck size={14} aria-hidden="true" /> Approve, Issue
          </button>
        </nav>

        {activeTab === "generate" ? (
        <div className="cert-section-gap">
          <div className="cms-card cert-form-card">
            <div className="cms-card-head cert-section-head">
              <div>
                <h2>Generate Certificate</h2>
                <p>Enter request details and generate a certificate request.</p>
              </div>
            </div>
            <div className="cms-card-body">
              <div className="cms-form-grid cols-3">
                {formFields.map((field) => {
                  const isThemeControlledField = field.name === "admissionNo" || field.name === "type" || field.name === "requestDate";
                  if (isThemeControlledField) {
                    return (
                      <div key={field.name} className="cms-field">
                        <label htmlFor={`certificate-${field.name}`}>
                          {field.label} {field.required ? <span className="req">*</span> : null}
                        </label>
                        {field.name === "admissionNo" ? (
                          <>
                          <input
                            id="certificate-admissionNo"
                            type="text"
                            value={form.admissionNo}
                            placeholder={loadingStudents ? "Loading admissions..." : "Enter admission number"}
                            autoComplete="off"
                            onChange={(e) => {
                              const admissionNo = e.target.value;
                              const selectedStudent = findStudentByAdmission(admissionNo);
                              setForm((prev) => ({
                                ...prev,
                                admissionNo,
                                student: selectedStudent?.name || "",
                                group: selectedStudent?.group || "",
                                level: selectedStudent?.level || "",
                                academicYear: selectedStudent?.academicYear || "",
                              }));
                              setErrors((prev) => ({ ...prev, admissionNo: undefined }));
                            }}
                          />
                          </>
                        ) : field.name === "type" ? (
                          <select
                            id="certificate-type"
                            className={form.type ? "" : "cert-field-placeholder"}
                            value={form.type}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, type: e.target.value, customType: "" }));
                              setErrors((prev) => ({ ...prev, type: undefined, customType: undefined }));
                            }}
                          >
                            <option value="">Select Certificate Type</option>
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input
                            id="certificate-requestDate"
                            className="cert-field-placeholder"
                            type="date"
                            value={form.requestDate}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, requestDate: e.target.value }));
                              setErrors((prev) => ({ ...prev, requestDate: undefined }));
                            }}
                          />
                        )}
                        {errors[field.name] ? <span className="cms-error">{errors[field.name]}</span> : null}
                      </div>
                    );
                  }

                  return (
                    <Field
                      key={field.name}
                      field={field}
                      value={form[field.name]}
                      error={errors[field.name]}
                      onChange={(name, value) => {
                        if (name === "admissionNo") {
                          const selectedStudent = findStudentByAdmission(value);
                          setForm((prev) => ({
                            ...prev,
                            admissionNo: value,
                            student: selectedStudent?.name || "",
                            group: selectedStudent?.group || "",
                            level: selectedStudent?.level || "",
                            academicYear: selectedStudent?.academicYear || "",
                          }));
                          setErrors((prev) => ({ ...prev, admissionNo: undefined }));
                          return;
                        }

                        setForm((prev) => ({ ...prev, [name]: value }));
                        setErrors((prev) => ({ ...prev, [name]: undefined }));
                      }}
                    />
                  );
                })}
                {form.type === "Others" ? (
                  <div className="cms-field">
                    <label htmlFor="certificate-customType">Other Certificate Type <span className="req">*</span></label>
                    <input
                      id="certificate-customType"
                      type="text"
                      value={form.customType}
                      placeholder="Enter certificate type"
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, customType: e.target.value }));
                        setErrors((prev) => ({ ...prev, customType: undefined }));
                      }}
                    />
                    {errors.customType ? <span className="cms-error">{errors.customType}</span> : null}
                  </div>
                ) : null}
              </div>

              <div className="cms-form-grid cert-student-fields cert-space-top-12">
                <div className="cms-field cert-readonly">
                  <label>Student Name</label>
                  <input type="text" value={form.student} readOnly placeholder="Auto-filled from admission number" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Academic Year</label>
                  <input type="text" value={form.academicYear} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Group</label>
                  <input type="text" value={form.group} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Year</label>
                  <input type="text" value={form.level} readOnly placeholder="Auto-filled" />
                </div>
              </div>
              <div className="cms-form-actions">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={resetForm} title="Reset form" aria-label="Reset form"><FaEraser size={14} aria-hidden="true" /></button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={refreshCertificates} disabled={loadingList || creating} title="Refresh certificate list" aria-label="Refresh certificate list">
                  <FaArrowsRotate size={14} aria-hidden="true" />
                </button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={generateCertificate} disabled={creating || loadingStudents} title="Generate certificate draft" aria-label="Generate certificate draft">
                  <FaFileCirclePlus size={14} aria-hidden="true" /> {form.type === "Others" ? "Create Draft" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {activeTab === "certificates" ? <>
        <section className="cert-records-card">
        <div className="cms-toolbar cert-toolbar-modern">
          <div className="cms-search cert-search-box">
            <FaMagnifyingGlass size={16} aria-hidden="true" />
            <input
              value={query}
              placeholder="Search Certificate Number, Admission Number, Student, Type, Purpose..."
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="cms-toolbar-right cert-toolbar-right">
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => handleBulkWorkflow("review")}
              disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Generated")}
            >
              <FaEye size={13} aria-hidden="true" /> {bulkAction === "review" ? "Reviewing..." : "Review All"}
            </button>
            <select
              className="cert-toolbar-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter certificates by status"
            >
              {statusChoices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          </div>
        </div>

        <div className="cms-table-wrap cert-table-wrap-modern">
          <table className="cms-table cert-table-fit">
            <thead>
              <tr>
                <th>Certificate Number</th>
                <th>Admission Number</th>
                <th>Student</th>
                <th>Type</th>
                <th>Request Date</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th className="cert-actions-header cert-view-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={8}><Loader label="Loading certificates..." /></td>
                </tr>
              ) : !pageRows.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="cert-empty-state">
                      <div className="cert-empty-icon"><FaAward size={24} aria-hidden="true" /></div>
                      <h4>No certificates found</h4>
                      <p>Try changing the search criteria or generate a new certificate request.</p>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map((row) => (
                <tr key={row.id}>
                  <td className="cms-strong">{row.number}</td>
                  <td>{row.admissionNo || "-"}</td>
                  <td>{row.student}</td>
                  <td>{row.type}</td>
                  <td>{formatDateDdMmYyyy(row.requestDate)}</td>
                  <td>{formatDateDdMmYyyy(row.issue)}</td>
                  <td><span className={`cert-status-pill ${certStatusClass(row.status)}`}>{row.status}</span></td>
                  <td>
                    <div className="cms-actions cert-view-action">
                      <button
                        type="button"
                        style={workflowButtonStyle("review", row.status === "Generated" && hasServerCertificateId(row) && !isRowBusy(row.id))}
                        onClick={() => openPrintPreview(row)}
                        disabled={row.status !== "Generated" || !hasServerCertificateId(row) || isRowBusy(row.id)}
                        title="Review Preview"
                        aria-label="Review Preview"
                      >
                        <FaEye size={12} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>
        </> : null}

        {activeTab === "actions" ? (
          <section className="cert-records-card">
            <div className="cert-records-head">
              <div>
                <h3>Certificate Workflow</h3>
                <p>Process all eligible certificates at each workflow stage.</p>
              </div>
              <div className="cms-actions cert-action-buttons">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => handleBulkWorkflow("approve")}
                  disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Reviewed")}
                >
                  <FaCheck size={13} aria-hidden="true" /> {bulkAction === "approve" ? "Approving..." : "Approve All"}
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => handleBulkWorkflow("issue")}
                  disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Approved")}
                >
                  <FaPaperPlane size={13} aria-hidden="true" /> {bulkAction === "issue" ? "Issuing..." : "Issue All"}
                </button>
              </div>
            </div>
            <div className="cms-table-wrap cert-table-wrap-modern">
              <table className="cms-table cert-table-fit">
                <thead>
                  <tr>
                    <th>Certificate Number</th>
                    <th>Admission Number</th>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="cert-actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={6}><Loader label="Loading certificates..." /></td></tr>
                  ) : !actionPageRows.length ? (
                    <tr><td colSpan={6}><div className="cert-empty-state"><div className="cert-empty-icon"><FaAward size={24} aria-hidden="true" /></div><h4>No actionable certificates found</h4><p>Review a generated certificate or cancel an issued certificate to make workflow actions available.</p></div></td></tr>
                  ) : actionPageRows.map((row) => (
                    <tr key={row.id}>
                      <td className="cms-strong">{row.number}</td>
                      <td>{row.admissionNo || "-"}</td>
                      <td>{row.student}</td>
                      <td>{row.type}</td>
                      <td><span className={`cert-status-pill ${certStatusClass(row.status)}`}>{row.status}</span></td>
                      <td>
                        <div className="cms-actions cert-actions-right cert-action-buttons" style={{ display: "flex", flexWrap: "nowrap", justifyContent: "flex-end", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            style={workflowButtonStyle("approve", row.status === "Reviewed" && hasServerCertificateId(row) && !isRowBusy(row.id))}
                            onClick={() => handleWorkflowChange(row, "approve")}
                            disabled={row.status !== "Reviewed" || !hasServerCertificateId(row) || isRowBusy(row.id)}
                            title="Approve Certificate"
                            aria-label="Approve Certificate"
                          >
                            <FaCheck size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            style={workflowButtonStyle("issue", row.status === "Approved" && hasServerCertificateId(row) && !isRowBusy(row.id))}
                            onClick={() => handleWorkflowChange(row, "issue")}
                            disabled={row.status !== "Approved" || !hasServerCertificateId(row) || isRowBusy(row.id)}
                            title="Issue Certificate"
                            aria-label="Issue Certificate"
                          >
                            <FaPaperPlane size={12} aria-hidden="true" />
                          </button>
                          <button
                            className="cms-action-btn"
                            title={row.status === "Issued" ? "Print Certificate" : "Available after certificate is issued"}
                            onClick={() => printCertificate(row)}
                            disabled={row.status !== "Issued" || printingId === row.id || isRowBusy(row.id)}
                          >
                            <FaPrint size={15} aria-hidden="true" />
                          </button>
                          {row.status !== "Cancelled" ? (
                            <button className="cms-action-btn danger" title="Cancel" onClick={() => cancelCertificate(row)} disabled={isRowBusy(row.id) || !hasServerCertificateId(row)}><FaBan size={15} aria-hidden="true" /></button>
                          ) : (
                            <button
                              className="cms-action-btn"
                              title={row.reissuedAt ? `Already reissued as ${row.reissuedCertificateNo}` : "Reissue Certificate"}
                              onClick={() => regenerateCertificate(row)}
                              disabled={Boolean(row.reissuedAt) || isRowBusy(row.id) || !hasServerCertificateId(row) || !canResolveStudentIdFromRow(row)}
                            >
                              <FaRotateLeft size={15} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "certificates" || activeTab === "actions" ? (
        <div className="cms-pagination">
          <button
            className="cms-page-btn"
            title="Previous page"
            aria-label="Previous page"
            disabled={activeTab === "certificates" ? currentPage === 1 : currentActionPage === 1}
            onClick={() => activeTab === "certificates" ? setPage(currentPage - 1) : setActionPage(currentActionPage - 1)}
          >
            <FaArrowLeft size={13} aria-hidden="true" />
          </button>

          <span>Page</span>
          <strong>{activeTab === "certificates" ? currentPage : currentActionPage}</strong>
          <span>of {activeTab === "certificates" ? totalPages : actionTotalPages}</span>

          <button
            className="cms-page-btn"
            title="Next page"
            aria-label="Next page"
            disabled={activeTab === "certificates" ? currentPage === totalPages : currentActionPage === actionTotalPages}
            onClick={() => activeTab === "certificates" ? setPage(currentPage + 1) : setActionPage(currentActionPage + 1)}
          >
            <FaArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
        ) : null}
      </div>

      {printPreview ? (
        <div className="cert-print-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPrintPreview(null);
        }}>
          <div className="cert-print-shell">
            <div className="cert-print-topbar">
              <strong>{printPreview.status === "Generated" ? "Review Preview" : "Print Preview"} - {printPreview.number}</strong>
              <div className="cert-print-actions">
                {printPreview.status === "Generated" ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => handleWorkflowChange(printPreview, "review")}
                    disabled={isRowBusy(printPreview.id) || !hasServerCertificateId(printPreview)}
                    title="Mark as Reviewed"
                    aria-label="Mark as Reviewed"
                  >
                    <FaCheck size={15} aria-hidden="true" />
                    <span>{isRowBusy(printPreview.id, "review") ? "Marking..." : "Mark as Reviewed"}</span>
                  </button>
                ) : null}
                <button type="button" className="cms-action-btn" aria-label="Close print preview" onClick={() => setPrintPreview(null)}>
                  <FaXmark size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="cert-print-body">
              <section className="cert-preview-paper cert-print-paper">
                <div className="watermark">PJC</div>
                <header className="cert-doc-head">
                  <div className="cert-doc-brand">
                    <div className="cert-doc-college-row">
                      <span className="cert-doc-mark">PJC</span>
                      <p className="cert-doc-college">Pirnav Junior College</p>
                    </div>
                    <h2 className="cert-doc-title">{printTemplate?.heading || "Official Student Certificate"}</h2>
                    <small className="cert-doc-motto">Empowering learners with integrity, discipline and excellence</small>
                  </div>
                </header>

                <div className="cert-preview-meta">
                  <span>Certificate No: <strong>{printPreview.number}</strong></span>
                  <span>Status: <strong>{printPreview.status}</strong></span>
                </div>

                <div className="cert-doc-subject">To Whom It May Concern</div>

                <div className="cert-doc-body">
                  <p>
                    This is to certify that <strong>{printPreview.student}</strong> {printTemplate?.paragraphOne || "is/was a bonafide student of Pirnav Junior College."}
                  </p>
                  <p>
                    {printTemplate?.paragraphTwo || "This certificate is issued for official purpose."}
                  </p>
                  <p>
                    <strong>Issue Date:</strong> {formatDateDdMmYyyy(printPreview.issue)}
                  </p>
                </div>

                {printPreview.remarks ? <p className="cert-remarks"><strong>Remarks:</strong> {printPreview.remarks}</p> : null}

                <p className="cert-issue-note">
                  This is a system-generated institutional certificate and is valid without alteration.
                </p>

                <footer>
                  <div>
                    {previewSignature && previewSignatureIsImage ? (
                      <img
                        className="certificate-signature"
                        src={previewSignature}
                        alt="Authorized signature"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span>Authorized Signatory</span>
                    <strong>Principal, Pirnav Junior College</strong>
                  </div>
                </footer>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {editRow ? (
        <div className="cms-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeEditDialog();
        }}>
          <div className="cms-modal">
            <div className="cms-modal-head">
              <h3>Edit Certificate - {editRow.number}</h3>
              <button type="button" className="cms-action-btn" aria-label="Close edit dialog" onClick={closeEditDialog}>
                <FaXmark size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="cms-modal-body">
              <div className="cms-form-grid cols-2 cert-space-bottom-12">
                <div className={`cms-field ${editErrors.admissionNo ? "has-error" : ""}`}>
                  <label>Admission No.</label>
                  <input
                    type="text"
                    value={editForm.admissionNo}
                    placeholder="Enter admission number"
                    onChange={(e) => {
                      const value = e.target.value;
                      handleEditAdmissionChange(value);
                    }}
                  />
                  {editErrors.admissionNo ? <small className="cms-error">{editErrors.admissionNo}</small> : null}
                </div>

                <div className="cms-field cert-readonly">
                  <label>Student Name</label>
                  <input type="text" value={editForm.student} readOnly placeholder="Auto-filled" />
                </div>

                <div className="cms-field cert-readonly">
                  <label>Group</label>
                  <input type="text" value={editForm.group} readOnly placeholder="Auto-filled" />
                </div>

                <div className="cms-field cert-readonly">
                  <label>Year</label>
                  <input type="text" value={editForm.level} readOnly placeholder="Auto-filled" />
                </div>

                <div className="cms-field cert-readonly">
                  <label>Academic Year</label>
                  <input type="text" value={editForm.academicYear} readOnly placeholder="Auto-filled" />
                </div>
              </div>

              <div className={`cms-field ${editErrors.purpose ? "has-error" : ""}`}>
                <label>Purpose</label>
                <input
                  type="text"
                  value={editForm.purpose}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditForm((prev) => ({ ...prev, purpose: value }));
                    setEditErrors((prev) => ({ ...prev, purpose: undefined }));
                  }}
                  placeholder="Enter purpose"
                />
                {editErrors.purpose ? <small className="cms-error">{editErrors.purpose}</small> : null}
              </div>

              <div className={`cms-field cert-space-top-12 ${editErrors.remarks ? "has-error" : ""}`}>
                <label>Remarks</label>
                <input
                  type="text"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Write remarks"
                />
                {editErrors.remarks ? <small className="cms-error">{editErrors.remarks}</small> : null}
              </div>
            </div>

            <div className="cms-modal-foot">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={closeEditDialog} title="Cancel" aria-label="Cancel"><FaXmark size={14} aria-hidden="true" /></button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={saveEditDialog} disabled={savingEdit} title="Save Changes" aria-label="Save Changes">
                <FaCheck size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmationDialog}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
