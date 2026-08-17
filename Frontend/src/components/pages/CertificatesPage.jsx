import { useEffect, useMemo, useState } from "react";
import { Ban, Download, FilePenLine, RotateCcw, Search, X } from "lucide-react";
import jsPDF from "jspdf";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { options } from "@/data/mockData.js";
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

const unwrapSinglePayload = (payload) => {
  const singleCandidates = [
    payload,
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

const normalizeStudentRecord = (raw) => ({
  id: Number(pick(raw, ["id", "Id", "studentId", "StudentId", "studentID"])) || null,
  admissionNo: String(pick(raw, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no"]) || "").trim(),
  name: pick(raw, ["fullName", "FullName", "studentName", "StudentName", "name", "Name", "firstName", "FirstName"]) || "",
  group: pick(raw, ["groupName", "GroupName", "groupCode", "GroupCode", "group", "Group", "courseGroup", "CourseGroup"]) || "",
  level: pick(raw, ["academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "level", "Level", "year", "Year"]) || "",
  academicYear: pick(raw, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "yearName", "YearName"]) || "",
});

const fallbackStudents = [];

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
      pick(raw, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName"]) ||
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

function getGenerationEndpoint(certificateType) {
  const type = String(certificateType || "").trim().toLowerCase();
  if (type.includes("bonafide")) return CERTIFICATE_API.bonafide;
  if (type.includes("study")) return CERTIFICATE_API.study;
  if (type.includes("conduct")) return CERTIFICATE_API.conduct;
  if (type.includes("fee")) return CERTIFICATE_API.fee;
  if (type.includes("transfer") || type === "tc" || type.includes("tc")) return CERTIFICATE_API.tc;
  return CERTIFICATE_API.create;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
        paragraphTwo: `This certificate is issued on the student's request for the purpose of ${safePurpose}.`,
      };
    case "study certificate":
      return {
        heading: "Study Certificate",
        paragraphOne: `${studyInfo}, and has pursued studies at ${institutionName} as per institutional academic records.`,
        paragraphTwo: `This study certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "transfer certificate":
    case "tc":
      return {
        heading: "Transfer Certificate",
        paragraphOne: `The student ${studentRecord} has been relieved from ${institutionName} as per the institutional records and is eligible to continue studies at another institution.`,
        paragraphTwo: `This transfer certificate is issued on request for ${safePurpose}.`,
      };
    case "conduct certificate":
      return {
        heading: "Conduct Certificate",
        paragraphOne: `${studyInfo}, and has maintained satisfactory conduct and discipline during the period of study at ${institutionName}.`,
        paragraphTwo: `This conduct certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "migration certificate":
      return {
        heading: "Migration Certificate",
        paragraphOne: `The student ${studentRecord} is permitted to migrate from ${institutionName} in accordance with institutional academic records and regulations.`,
        paragraphTwo: `This migration certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "fee certificate":
    case "fee":
      return {
        heading: "Fee Certificate",
        paragraphOne: `${studyInfo}. The fee details for the stated academic year have been verified from the accounts records of ${institutionName}.`,
        paragraphTwo: `This fee certificate is issued for the purpose of ${safePurpose}.`,
      };
    default:
      return {
        heading: "Student Certificate",
        paragraphOne: `${studyInfo}, and is/was a bonafide student of ${institutionName}.`,
        paragraphTwo: `This certificate is issued for the purpose of ${safePurpose}.`,
      };
  }
}

const CERTIFICATE_PRINT_CSS = `
  @page { size: A4 portrait; margin: 14mm; }
  body {
    margin: 0;
    font-family: "Times New Roman", Georgia, serif;
    background: #eef3fb;
    color: #18253f;
  }
  .page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 20px;
  }
  .cert {
    width: 100%;
    max-width: 820px;
    min-height: 1080px;
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
  @media print {
    body { background: #fff; }
    .page { padding: 0; min-height: auto; }
    .cert {
      max-width: none;
      min-height: auto;
      border-radius: 0;
      box-shadow: none;
      border-color: #cfd8ea;
      padding: 28px;
      break-inside: avoid;
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
  const requestDate = escapeHtml(formatDateDdMmYyyy(record.requestDate));
  const issueDate = escapeHtml(formatDateDdMmYyyy(record.issue));
  const status = escapeHtml(record.status || "Draft");
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
        Request Date: <strong>${requestDate}</strong>
        <br />
        Issue Date: <strong>${issueDate}</strong>
        ${remarks}
      </div>

      <footer class="footer">
        <div class="issue-note">
          This is a system-generated institutional certificate and is valid without alteration.
        </div>
        <div>
          <strong>Principal, Pirnav Junior College</strong>
        </div>
      </footer>
      </div>
    </section>
  </div>
</body>
</html>`;
}

function downloadCertificatePdf(record) {
  const document = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  const template = getCertificateTemplate(record.type, record);
  const certificateNo = String(record.number || "-");
  const status = String(record.status || "Generated");
  const requestDate = formatDateDdMmYyyy(record.requestDate);
  const issueDate = formatDateDdMmYyyy(record.issue);
  const bodyLines = document.splitTextToSize(
    `This is to certify that ${record.student || "-"} ${template.paragraphOne} ${template.paragraphTwo}`,
    156,
  );

  document.setFillColor(255, 255, 255);
  document.rect(0, 0, width, height, "F");
  document.setDrawColor(197, 211, 236);
  document.setLineWidth(0.7);
  document.rect(10, 10, width - 20, height - 20);
  document.setDrawColor(213, 224, 245);
  document.setLineWidth(0.35);
  document.rect(14, 14, width - 28, height - 28);

  document.setFont("times", "bold");
  document.setFontSize(66);
  document.setTextColor(232, 238, 248);
  document.text("PJC", width / 2, height / 2 + 12, { align: "center", angle: 35 });

  document.setDrawColor(185, 203, 236);
  document.setFillColor(237, 243, 255);
  document.circle(34, 33, 10, "FD");
  document.setFont("helvetica", "bold");
  document.setFontSize(7);
  document.setTextColor(41, 84, 168);
  document.text("PJC", 34, 34, { align: "center" });

  document.setFont("times", "bold");
  document.setFontSize(15);
  document.setTextColor(55, 82, 127);
  document.text("PIRNAV JUNIOR COLLEGE", width / 2 + 7, 31, { align: "center" });
  document.setFontSize(22);
  document.setTextColor(20, 54, 110);
  document.text(template.heading.toUpperCase(), width / 2, 47, { align: "center" });
  document.setFont("times", "italic");
  document.setFontSize(8);
  document.setTextColor(90, 111, 147);
  document.text("Empowering learners with integrity, discipline and excellence", width / 2, 54, { align: "center" });
  document.setDrawColor(205, 217, 239);
  document.line(25, 60, width - 25, 60);

  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(46, 66, 105);
  document.text(`Certificate No: ${certificateNo}`, 26, 69);
  document.text(`Status: ${status}`, width - 26, 69, { align: "right" });
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.setTextColor(48, 76, 125);
  document.text("TO WHOM IT MAY CONCERN", width / 2, 82, { align: "center" });

  document.setFont("times", "normal");
  document.setFontSize(13);
  document.setLineHeightFactor(1.7);
  document.setTextColor(29, 49, 86);
  document.text(bodyLines, 27, 100, { maxWidth: 156, align: "justify" });
  const contentEnd = 100 + (bodyLines.length * 7.8);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text(`Request Date: ${requestDate}`, 27, contentEnd + 13);
  document.text(`Issue Date: ${issueDate}`, 27, contentEnd + 20);
  if (record.remarks) {
    const remarks = document.splitTextToSize(`Remarks: ${record.remarks}`, 156);
    document.text(remarks, 27, contentEnd + 30);
  }

  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(79, 99, 136);
  document.text("This is a system-generated institutional certificate and is valid without alteration.", 27, height - 38, { maxWidth: 92 });
  document.setDrawColor(53, 79, 127);
  document.line(width - 81, height - 45, width - 27, height - 45);
  document.setFont("times", "bold");
  document.setFontSize(10);
  document.setTextColor(24, 37, 63);
  document.text("Principal, Pirnav Junior College", width - 54, height - 38, { align: "center" });

  document.save(`${certificateNo.replace(/[^a-z0-9_-]/gi, "_") || "certificate"}.pdf`);
}

export default function CertificatesPage() {
  const [rows, setRows] = useState([]);
  const [studentRows, setStudentRows] = useState(fallbackStudents);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyAction, setBusyAction] = useState({ id: null, type: "" });
  const [printingId, setPrintingId] = useState(null);

  const [form, setForm] = useState({
    admissionNo: "",
    student: "",
    group: "",
    level: "",
    academicYear: "",
    type: "",
    purpose: "",
    requestDate: todayIso(),
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
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
      setRows(mapped);
      return true;
    } catch (error) {
      setRows([]);
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
      const response = await apiClient.get(apiEndpoints.students.getAll);
      const mapped = unwrapListPayload(response?.data)
        .map(normalizeStudentRecord)
        .filter((student) => student.id && student.admissionNo);
      setStudentRows(mapped.length ? mapped : fallbackStudents);
      return mapped.length ? mapped : fallbackStudents;
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
    studentRows.find((student) => student.admissionNo === admissionNo) || null;

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
    const type = String(form.type || "").trim();
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

    if (type && !options.certificateType.includes(type)) {
      next.type = "Select a valid certificate type";
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
    const type = String(form.type || "").trim();
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
      const endpoint = getGenerationEndpoint(type);
      const normalizedRequestDate = normalizeApiDateValue(requestDate);
      const specializedPayload = withOptionalRemarks({
        admissionNo,
        studentId: Number(selectedStudent.id),
        certificateType: type,
        purpose,
        requestDate: normalizedRequestDate,
        issueDate: normalizedRequestDate,
      }, remarks);
      const response = await apiClient.post(endpoint, specializedPayload);
      await upsertFromApiResponse(undefined, response.data);
      await reloadCurrentView();
      resetForm();
      setToast("Certificate generated successfully.");
    } catch (error) {
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
    try {
      const response = await apiClient[selected.method](selected.endpoint(actionId));
      await upsertFromApiResponse(actionId, response.data);
      await reloadCurrentView();
      setToast(`Certificate ${row.number} ${selected.success}`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, `Failed to ${action} certificate. Please try again.`));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const cancelCertificate = async (row) => {
    if (busyAction.id) return;
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) return;
    const ok = window.confirm(`Cancel certificate ${row.number}?`);
    if (!ok) return;

    setBusyAction({ id: row.id, type: "cancel" });
    try {
      const response = await apiClient.patch(CERTIFICATE_API.cancel(actionId));
      await upsertFromApiResponse(actionId, response.data);
      await reloadCurrentView();
      setToast(`Certificate ${row.number} cancelled`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to cancel certificate. Please try again."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const regenerateCertificate = async (row) => {
    if (busyAction.id) return;
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) return;
    setBusyAction({ id: row.id, type: "reissue" });
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
      await upsertFromApiResponse(row.id, response.data);
      await reloadCurrentView();
      setToast(`Certificate ${row.number} reissued`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to reissue certificate. Please try again."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const downloadCertificate = async (row) => {
    if (busyAction.id) return;
    const actionId = await resolveServerCertificateId(row);
    if (!actionId) {
      setToast("Unable to resolve certificate ID for download.");
      return;
    }

    setBusyAction({ id: row.id, type: "download" });
    try {
      let certificate = row;
      const response = await apiClient.get(CERTIFICATE_API.getById(actionId));
      const details = unwrapSinglePayload(response.data);
      if (hasCertificateShape(details)) certificate = normalizeCertificate(details, studentRows);

      downloadCertificatePdf(certificate);
      setToast("Certificate downloaded successfully.");
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Unable to download certificate. Please try again."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const printCertificate = async (record) => {
    const target = record;
    if (!target) return;

    const resolvedId = await resolveServerCertificateId(target);
    if (!resolvedId) {
      const popup = window.open("", "_blank", "width=1000,height=760");
      if (!popup) {
        setToast("Please allow popups to print certificate");
        return;
      }
      popup.document.open();
      popup.document.write(buildPrintHtml(target));
      popup.document.close();
      popup.focus();
      popup.onload = () => popup.print();
      return;
    }

    if (printingId) return;
    setPrintingId(target.id);

    try {
      const response = await apiClient.get(apiEndpoints.certificates.download(resolvedId), { responseType: "blob" });
      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("pdf") || contentType.includes("application/octet-stream")) {
        const blob = new Blob([response.data], { type: contentType || "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) {
          setToast("Please allow popups to print certificate");
        } else {
          popup.focus();
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        return;
      }
    } catch {
      // Fallback to existing preview template print.
    } finally {
      setPrintingId(null);
    }

    const popup = window.open("", "_blank", "width=1000,height=760");
    if (!popup) {
      setToast("Please allow popups to print certificate");
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintHtml(target));
    popup.document.close();
    popup.focus();
    popup.onload = () => popup.print();
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
          setPrintPreview(normalizeCertificate(details, studentRows));
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
      const certificateId = editRow.backendId ?? editRow.id;
      const payload = withOptionalRemarks({
        certificateId,
        studentId: Number(selectedStudent.id),
        certificateType: editRow.type,
        purpose: normalizeText(editForm.purpose),
        admissionNo: normalizeText(editForm.admissionNo),
      }, editForm.remarks);
      const response = await apiClient.put(`${CERTIFICATE_API.list}/admission-no`, payload);
      await upsertFromApiResponse(certificateId, response.data);
      await reloadCurrentView();
      setToast(`Certificate ${editRow.number} updated`);
      closeEditDialog();
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to update certificate. Please try again."));
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

  const printTemplate = printPreview ? getCertificateTemplate(printPreview.type, printPreview) : null;

  return (
    <DashboardLayout
      title="Certificate Management"
      subtitle="Generate, review, and issue certificates with a controlled workflow."
      breadcrumb={["Administration"]}
    >
      <div className="cert-page">
        <div className="cert-section-gap">
          <div className="cms-card cert-form-card">
            <div className="cms-card-head cert-section-head">
              <div>
                <h2>Generate Certificate</h2>
                <p>Enter request details and generate a controlled draft for approval flow.</p>
              </div>
            </div>
            <div className="cms-card-body">
              <div className="cms-form-grid cols-3">
                {formFields.map((field) => (
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
                ))}
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
                <button type="button" className="cms-btn cms-btn-ghost" onClick={resetForm} title="Reset form">Reset</button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={refreshCertificates} disabled={loadingList || creating} title="Refresh certificate list">
                  Refresh Certificates
                </button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={generateCertificate} disabled={creating || loadingStudents} title="Generate certificate draft">
                  {creating ? "Generating..." : loadingStudents ? "Loading Students..." : "Generate Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cms-toolbar cert-toolbar-modern">
          <div className="cms-search cert-search-box">
            <Search size={16} />
            <input
              value={query}
              placeholder="Search Certificate Number, Student, Type, Purpose..."
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="cms-toolbar-right cert-toolbar-right">
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
                <th>Student</th>
                <th>Type</th>
                <th>Request Date</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th className="cert-actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={7}><Loader label="Loading certificates..." /></td>
                </tr>
              ) : !pageRows.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="cert-empty-state">
                      <div className="cert-empty-icon">✦</div>
                      <h4>No certificates found</h4>
                      <p>Try changing the search criteria or generate a new certificate request.</p>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map((row) => (
                <tr key={row.id}>
                  <td className="cms-strong">{row.number}</td>
                  <td>{row.student}</td>
                  <td>{row.type}</td>
                  <td>{formatDateDdMmYyyy(row.requestDate)}</td>
                  <td>{formatDateDdMmYyyy(row.issue)}</td>
                  <td><span className={`cert-status-pill ${certStatusClass(row.status)}`}>{row.status}</span></td>
                  <td>
                    <div className="cms-actions cert-actions-right">
                      <select
                        className="cert-workflow-select"
                        value=""
                        disabled={row.status === "Issued" || row.status === "Cancelled" || !hasServerCertificateId(row) || isRowBusy(row.id)}
                        onChange={async (e) => {
                          handleWorkflowChange(row, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">Workflow</option>
                        <option value="review" disabled={row.status !== "Generated"}>Review</option>
                        <option value="approve" disabled={row.status !== "Reviewed"}>Approve</option>
                        <option value="issue" disabled={row.status !== "Approved"}>Issue</option>
                      </select>

                      <button
                        className="cms-action-btn"
                        title="Download Certificate"
                        onClick={() => downloadCertificate(row)}
                        disabled={row.status !== "Issued" || isRowBusy(row.id)}
                      >
                        <Download size={15} />
                      </button>

                      <button className="cms-action-btn" title="Edit Certificate" onClick={() => openEditDialog(row)} disabled={isRowBusy(row.id)}>
                        <FilePenLine size={15} />
                      </button>

                      {row.status !== "Cancelled" ? (
                        <button className="cms-action-btn danger" title="Cancel" onClick={() => cancelCertificate(row)} disabled={isRowBusy(row.id) || !hasServerCertificateId(row)}>
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          className="cms-action-btn"
                          title={canResolveStudentIdFromRow(row) ? "Regenerate" : "Regenerate unavailable: student ID missing"}
                          onClick={() => regenerateCertificate(row)}
                          disabled={isRowBusy(row.id) || !hasServerCertificateId(row) || !canResolveStudentIdFromRow(row)}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cms-pagination">
          <button className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            Prev
          </button>

          
            <span>Page</span>
            <strong>{currentPage}</strong>
            <span>of {totalPages}</span>
        

          <button className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage +1)}>      Next    </button>
        </div>
      </div>

      {printPreview ? (
        <div className="cert-print-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPrintPreview(null);
        }}>
          <div className="cert-print-shell">
            <div className="cert-print-topbar">
              <strong>Print Preview - {printPreview.number}</strong>
              <div className="cert-print-actions">
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => printCertificate(printPreview)} disabled={printingId === printPreview.id}>
                  <Printer size={15} /> {printingId === printPreview.id ? "Preparing..." : "Print"}
                </button>
                <button type="button" className="cms-action-btn" aria-label="Close print preview" onClick={() => setPrintPreview(null)}>
                  <X size={16} />
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
                    Request Date: <strong>{formatDateDdMmYyyy(printPreview.requestDate)}</strong>
                    {" | "}
                    Issue Date: <strong>{formatDateDdMmYyyy(printPreview.issue)}</strong>
                  </p>
                </div>

                {printPreview.remarks ? <p className="cert-remarks"><strong>Remarks:</strong> {printPreview.remarks}</p> : null}

                <p className="cert-issue-note">
                  This is a system-generated institutional certificate and is valid without alteration.
                </p>

                <footer>
                  <div>
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
                <X size={16} />
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
              <button type="button" className="cms-btn cms-btn-ghost" onClick={closeEditDialog}>Cancel</button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={saveEditDialog} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
