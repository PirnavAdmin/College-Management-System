
import { useEffect, useMemo, useState } from "react";
import { Ban, FilePenLine, Printer, RotateCcw, Search, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast } from "@/components/common/Ui.jsx";
import { academicYears, certificates as seedCertificates, options, students } from "@/data/mockData.js";
import "./CertificatesPage.css";

export const pageConfig = {
  title: "Certificates",
  route: "/dashboard/certificates",
};

const PAGE_SIZE = 5;
const CERT_STORAGE_KEY = "cms.certificates.rows.v1";
const MAX_PURPOSE_LENGTH = 160;
const MAX_REMARKS_LENGTH = 240;
const todayIso = () => new Date().toISOString().slice(0, 10);
const workflowSteps = ["Generated", "Reviewed", "Approved", "Issued"];
const statusChoices = ["All", "Generated", "Reviewed", "Approved", "Issued", "Cancelled"];

const CERT_PAGE_STYLES = `
  .cert-page {
    display: grid;
    gap: 16px;
  }
  .cert-section-gap {
    margin-bottom: 0;
  }
  .cert-form-card .cms-card-head {
    align-items: flex-start;
  }
  .cert-form-card .cms-card-head p {
    margin: 6px 0 0;
    color: var(--cms-muted);
    font-size: 13px;
  }
  .cert-student-fields {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 12px;
  }
  .cert-readonly input {
    background: var(--cms-subtle);
    color: var(--cms-muted);
  }
  .cert-toolbar-select,
  .cert-workflow-select {
    border: 1px solid var(--cms-border);
    border-radius: 10px;
    background: var(--cms-surface);
    color: var(--cms-text);
    font: inherit;
    min-height: 40px;
    padding: 9px 12px;
    outline: none;
  }
  .cert-toolbar-select:focus,
  .cert-workflow-select:focus {
    border-color: var(--cms-primary);
    box-shadow: 0 0 0 3px var(--cms-primary-soft);
  }
  .cert-table-fit {
    min-width: 980px;
  }
  .cert-actions-header {
    text-align: right;
  }
  .cert-actions-right {
    justify-content: flex-end;
    gap: 8px;
  }
  .cert-workflow-select {
    min-width: 124px;
  }
  .cert-status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 92px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid transparent;
  }
  .cert-status-success {
    color: var(--cms-green);
    background: var(--cms-green-soft);
    border-color: color-mix(in srgb, var(--cms-green) 18%, transparent);
  }
  .cert-status-info {
    color: var(--cms-primary);
    background: var(--cms-primary-soft);
    border-color: color-mix(in srgb, var(--cms-primary) 18%, transparent);
  }
  .cert-status-warn {
    color: var(--cms-amber);
    background: var(--cms-amber-soft);
    border-color: color-mix(in srgb, var(--cms-amber) 18%, transparent);
  }
  .cert-status-pending {
    color: var(--cms-violet);
    background: var(--cms-violet-soft);
    border-color: color-mix(in srgb, var(--cms-violet) 18%, transparent);
  }
  .cert-status-danger {
    color: var(--cms-red);
    background: var(--cms-red-soft);
    border-color: color-mix(in srgb, var(--cms-red) 18%, transparent);
  }
  .cert-status-neutral {
    color: var(--cms-muted);
    background: var(--cms-subtle);
    border-color: var(--cms-border);
  }
  .cert-print-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(15, 23, 42, 0.55);
  }
  .cert-print-shell {
    width: min(100%, 1120px);
    max-height: calc(100vh - 36px);
    background: var(--cms-surface);
    border: 1px solid var(--cms-border);
    border-radius: 16px;
    box-shadow: var(--cms-shadow-lg);
    overflow: hidden;
  }
  .cert-print-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--cms-border);
  }
  .cert-print-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cert-print-body {
    max-height: calc(100vh - 128px);
    overflow: auto;
    padding: 18px;
    background: var(--cms-bg);
  }
  .cert-preview-paper {
    position: relative;
    width: 100%;
    max-width: 820px;
    min-height: 1080px;
    margin: 0 auto;
    padding: 42px 44px;
    background: #fff;
    color: #18253f;
    border: 1px solid #c5d3ec;
    border-radius: 8px;
    box-shadow: 0 14px 36px rgba(17, 38, 74, 0.14);
    overflow: hidden;
  }
  .cert-preview-paper::before,
  .cert-preview-paper::after {
    content: "";
    position: absolute;
    border: 2px solid #d5e0f5;
    pointer-events: none;
  }
  .cert-preview-paper::before { inset: 14px; }
  .cert-preview-paper::after { inset: 24px; }
  .cert-preview-paper .watermark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    opacity: 0.06;
    font-size: 120px;
    letter-spacing: 4px;
    font-weight: 700;
    color: #21437f;
    text-transform: uppercase;
  }
  .cert-doc-head,
  .cert-preview-meta,
  .cert-doc-subject,
  .cert-doc-body,
  .cert-remarks,
  .cert-issue-note,
  .cert-preview-paper footer {
    position: relative;
    z-index: 1;
  }
  .cert-doc-head {
    text-align: center;
    border-bottom: 1px solid #cdd9ef;
    padding-bottom: 14px;
  }
  .cert-doc-college-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0 auto 10px;
  }
  .cert-doc-mark {
    width: 56px;
    height: 56px;
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
  .cert-doc-college {
    margin: 0;
    font-size: 16px;
    letter-spacing: 0.3px;
    color: #37527f;
    font-weight: 700;
  }
  .cert-doc-title {
    margin: 0;
    font-size: 34px;
    letter-spacing: 0.3px;
    font-weight: 800;
    color: #14366e;
    text-transform: uppercase;
    line-height: 1.05;
  }
  .cert-doc-motto {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: #5a6f93;
    letter-spacing: 0.3px;
    font-style: italic;
  }
  .cert-preview-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    font-size: 13px;
    color: #2e4269;
  }
  .cert-doc-subject {
    margin-top: 22px;
    text-align: center;
    font-size: 14px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #304c7d;
    font-weight: 700;
  }
  .cert-doc-body {
    margin-top: 28px;
    font-size: 20px;
    line-height: 1.8;
    text-align: justify;
    color: #1d3156;
  }
  .cert-doc-body p,
  .cert-remarks {
    margin: 0 0 16px;
  }
  .cert-doc-body strong,
  .cert-preview-paper footer strong {
    color: #13284c;
  }
  .cert-issue-note {
    margin-top: 36px;
    font-size: 12px;
    color: #4f6388;
    line-height: 1.5;
  }
  .cert-preview-paper footer {
    margin-top: 52px;
    display: grid;
    justify-content: end;
    text-align: center;
  }
  .cert-preview-paper footer span {
    display: block;
    font-size: 12px;
    color: #4f6388;
  }
  .cert-preview-paper footer strong {
    display: block;
    margin-top: 42px;
    border-top: 1px solid #354f7f;
    padding-top: 10px;
    min-width: 250px;
    font-size: 15px;
  }
  @media (max-width: 960px) {
    .cert-student-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .cert-preview-paper {
      padding: 28px 26px;
      min-height: auto;
    }
  }
  @media (max-width: 720px) {
    .cert-student-fields,
    .cert-preview-meta {
      grid-template-columns: 1fr;
    }
    .cert-preview-meta {
      display: grid;
    }
    .cert-actions-right {
      justify-content: flex-start;
    }
    .cert-workflow-select {
      min-width: 100%;
    }
    .cert-print-topbar {
      align-items: stretch;
      flex-direction: column;
    }
    .cert-print-actions {
      width: 100%;
      justify-content: space-between;
    }
    .cert-preview-paper footer {
      justify-content: stretch;
    }
    .cert-preview-paper footer strong {
      min-width: 0;
    }
  }
`;

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

const formFields = [
  { name: "admissionNo", label: "Admission No.", type: "select", options: students.map((s) => s.admissionNo), required: true },
  { name: "type", label: "Certificate Type", type: "select", options: options.certificateType, required: true },
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

function readOperator() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.name || user?.email || "Admin";
  } catch {
    return "Admin";
  }
}

function normalizeSeed(rows) {
  return rows.map((row) => {
    const issued = row.status === "Active";
    const matchedStudent = students.find((student) => student.name === row.student);
    const activeYear = academicYears.find((year) => year.status === "Active")?.name || "-";
    return {
      id: row.id,
      number: row.number,
      student: row.student || matchedStudent?.name || "-",
      admissionNo: row.admissionNo || matchedStudent?.admissionNo || "-",
      group: row.group || matchedStudent?.group || "-",
      level: row.level || matchedStudent?.level || "-",
      academicYear: row.academicYear || activeYear,
      type: row.type,
      purpose: row.purpose,
      requestDate: row.issue,
      issue: issued ? row.issue : "-",
      status: issued ? "Issued" : "Cancelled",
      remarks: "",
      generatedAt: row.issue,
      reviewedAt: issued ? row.issue : "",
      approvedAt: issued ? row.issue : "",
      issuedAt: issued ? row.issue : "",
      cancelledAt: issued ? "" : row.issue,
      generatedBy: "System Migration",
      reviewedBy: issued ? "System Migration" : "",
      approvedBy: issued ? "System Migration" : "",
      issuedBy: issued ? "System Migration" : "",
    };
  });
}

function hydrateStoredRows(rows) {
  const activeYear = academicYears.find((year) => year.status === "Active")?.name || "-";
  return rows.map((row) => {
    const matchedStudent = students.find((student) => student.admissionNo === row.admissionNo || student.name === row.student);
    return {
      ...row,
      student: row.student || matchedStudent?.name || "-",
      admissionNo: row.admissionNo || matchedStudent?.admissionNo || "-",
      group: row.group || matchedStudent?.group || "-",
      level: row.level || matchedStudent?.level || "-",
      academicYear: row.academicYear || activeYear,
      remarks: row.remarks || "",
    };
  });
}

function getInitialRows() {
  try {
    const raw = localStorage.getItem(CERT_STORAGE_KEY);
    if (!raw) return normalizeSeed(seedCertificates);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeSeed(seedCertificates);
    return hydrateStoredRows(parsed);
  } catch {
    return normalizeSeed(seedCertificates);
  }
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

  switch (String(type || "").toLowerCase()) {
    case "bonafide certificate":
      return {
        heading: "Bonafide Certificate",
        paragraphOne: `, Admission No. ${admissionNo}, is a bonafide student of ${institutionName} studying in ${year} (${group}) during the academic year ${academicYear}.`,
        paragraphTwo: `This certificate is issued on the student's request for the purpose of ${safePurpose}.`,
      };
    case "study certificate":
      return {
        heading: "Study Certificate",
        paragraphOne: `has pursued studies at ${institutionName} as per institutional academic records.`,
        paragraphTwo: `This study certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "transfer certificate":
      return {
        heading: "Transfer Certificate",
        paragraphOne: `has completed/withdrawn from studies at ${institutionName} and is eligible for transfer processing.`,
        paragraphTwo: `This transfer certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "conduct certificate":
      return {
        heading: "Conduct Certificate",
        paragraphOne: `has maintained satisfactory conduct and discipline during the period of study at ${institutionName}.`,
        paragraphTwo: `This conduct certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "migration certificate":
      return {
        heading: "Migration Certificate",
        paragraphOne: `is permitted to migrate from ${institutionName} as per academic regulations and records.`,
        paragraphTwo: `This migration certificate is issued for the purpose of ${safePurpose}.`,
      };
    default:
      return {
        heading: "Official Student Certificate",
        paragraphOne: `is/was a bonafide student of ${institutionName}.`,
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

export default function CertificatesPage() {
  const [rows, setRows] = useState(() => getInitialRows());
  const activeAcademicYear = useMemo(
    () => academicYears.find((year) => year.status === "Active")?.name || academicYears[0]?.name || "-",
    [],
  );

  const [form, setForm] = useState({
    admissionNo: "",
    student: "",
    group: "",
    level: "",
    academicYear: activeAcademicYear,
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
    academicYear: activeAcademicYear,
    purpose: "",
    remarks: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [toast, setToast] = useState("");
  const operator = useMemo(() => readOperator(), []);

  useEffect(() => {
    try {
      localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // Ignore storage failures (private mode/quota issues).
    }
  }, [rows]);

  const findStudentByAdmission = (admissionNo) =>
    students.find((student) => student.admissionNo === admissionNo) || null;

  const nextNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `CERT-${year}-`;
    const current = rows
      .map((row) => (String(row.number || "").startsWith(prefix) ? Number(String(row.number).slice(prefix.length)) : 0))
      .filter((n) => Number.isFinite(n));
    const sequence = Math.max(0, ...current) + 1;
    return `${prefix}${String(sequence).padStart(4, "0")}`;
  };

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      return { ...row, ...patch };
    }));
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
      academicYear: activeAcademicYear,
      type: "",
      purpose: "",
      requestDate: todayIso(),
      remarks: "",
    });
    setErrors({});
  };

  const clearSavedCertificates = () => {
    const ok = window.confirm("This will clear all saved certificate records and reset defaults. Continue?");
    if (!ok) return;

    try {
      localStorage.removeItem(CERT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }

    setRows(normalizeSeed(seedCertificates));
    setPrintPreview(null);
    setEditRow(null);
    setPage(1);
    setToast("Saved certificates cleared and defaults restored");
  };

  const generateCertificate = () => {
    if (!validate()) return;
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

    const number = nextNumber();
    const draft = {
      id: Date.now(),
      number,
      student: selectedStudent.name,
      admissionNo,
      group: selectedStudent.group,
      level: selectedStudent.level,
      academicYear: form.academicYear,
      type,
      purpose,
      requestDate,
      issue: "-",
      status: "Generated",
      remarks,
      generatedAt: todayIso(),
      reviewedAt: "",
      approvedAt: "",
      issuedAt: "",
      cancelledAt: "",
      generatedBy: operator,
      reviewedBy: "",
      approvedBy: "",
      issuedBy: "",
    };
    setRows((prev) => [draft, ...prev]);
    resetForm();
    setToast(`Certificate draft ${number} generated`);
  };

  const handleWorkflowChange = (row, action) => {
    if (action === "review") moveToReviewed(row);
    if (action === "approve") approveCertificate(row);
    if (action === "issue") issueCertificate(row);
  };

  const moveToReviewed = (row) => {
    if (!canMoveTo(row.status, "Reviewed")) return;
    const patch = { status: "Reviewed", reviewedAt: todayIso(), reviewedBy: operator };
    updateRow(row.id, patch);
    setToast(`Certificate ${row.number} moved to reviewed`);
  };

  const approveCertificate = (row) => {
    if (!canMoveTo(row.status, "Approved")) return;
    const patch = { status: "Approved", approvedAt: todayIso(), approvedBy: operator };
    updateRow(row.id, patch);
    setToast(`Certificate ${row.number} approved`);
  };

  const issueCertificate = (row) => {
    if (!canMoveTo(row.status, "Issued")) return;
    const issueDate = todayIso();
    const patch = { status: "Issued", issue: issueDate, issuedAt: issueDate, issuedBy: operator };
    updateRow(row.id, patch);
    setToast(`Certificate ${row.number} issued`);
  };

  const cancelCertificate = (row) => {
    const patch = { status: "Cancelled", cancelledAt: todayIso() };
    updateRow(row.id, patch);
    setToast(`Certificate ${row.number} cancelled`);
  };

  const regenerateCertificate = (row) => {
    const patch = {
      status: "Generated",
      generatedAt: todayIso(),
      reviewedAt: "",
      approvedAt: "",
      issuedAt: "",
      cancelledAt: "",
      issue: "-",
      reviewedBy: "",
      approvedBy: "",
      issuedBy: "",
      generatedBy: operator,
    };
    updateRow(row.id, patch);
    setToast(`Certificate ${row.number} moved back to generated state`);
  };

  const printCertificate = (record) => {
    const target = record;
    if (!target) return;
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
    setPrintPreview(record);
  };

  const openEditDialog = (row) => {
    setEditRow(row);
    const selectedStudent = findStudentByAdmission(row.admissionNo || "");
    setEditForm({
      admissionNo: row.admissionNo || "",
      student: row.student || selectedStudent?.name || "",
      group: row.group || selectedStudent?.group || "",
      level: row.level || selectedStudent?.level || "",
      academicYear: row.academicYear || activeAcademicYear,
      purpose: row.purpose || "",
      remarks: row.remarks || "",
    });
    setEditErrors({});
  };

  const handleEditAdmissionChange = (value) => {
    const selectedStudent = findStudentByAdmission(value);
    setEditForm((prev) => ({
      ...prev,
      admissionNo: value,
      student: selectedStudent?.name || "",
      group: selectedStudent?.group || "",
      level: selectedStudent?.level || "",
      academicYear: prev.academicYear || activeAcademicYear,
    }));
    setEditErrors((prev) => ({ ...prev, admissionNo: undefined }));
  };

  const closeEditDialog = () => {
    setEditRow(null);
    setEditErrors({});
  };

  const saveEditDialog = () => {
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

    updateRow(editRow.id, {
      admissionNo: editForm.admissionNo.trim(),
      student: selectedStudent.name,
      group: selectedStudent.group,
      level: selectedStudent.level,
      academicYear: editForm.academicYear.trim(),
      purpose: normalizeText(editForm.purpose),
      remarks: normalizeText(editForm.remarks),
    });
    setToast(`Certificate ${editRow.number} updated`);
    closeEditDialog();
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
      subtitle="Generate, review, issue, and print certificates with a real-time preview."
      breadcrumb={["Administration"]}
    >
      <style>{CERT_PAGE_STYLES}</style>
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
                          academicYear: activeAcademicYear,
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
                <button type="button" className="cms-btn cms-btn-ghost" onClick={resetForm}>Reset</button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={clearSavedCertificates}>Clear Saved Certificates</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={generateCertificate}>Generate Draft</button>
              </div>
            </div>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-toolbar">
            <div className="cms-search">
              <Search size={16} />
              <input
                value={query}
                placeholder="Search certificate number, student, type, purpose..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="cms-toolbar-right">
              <select
                className="cert-toolbar-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {statusChoices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
              </select>
            </div>
          </div>

          <div className="cms-table-wrap">
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
                {!pageRows.length ? (
                  <tr>
                    <td colSpan={7}><div className="cms-empty">No certificate records found.</div></td>
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
                          disabled={row.status === "Issued" || row.status === "Cancelled"}
                          onChange={(e) => {
                            handleWorkflowChange(row, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">Workflow</option>
                          <option value="review" disabled={row.status !== "Generated"}>Review</option>
                          <option value="approve" disabled={row.status !== "Reviewed"}>Approve</option>
                          <option value="issue" disabled={row.status !== "Approved"}>Issue</option>
                        </select>

                        {row.status === "Issued" ? (
                          <button className="cms-action-btn" title="Print Certificate" onClick={() => openPrintPreview(row)}>
                            <Printer size={15} />
                          </button>
                        ) : null}

                        <button className="cms-action-btn" title="Edit Certificate" onClick={() => openEditDialog(row)}>
                          <FilePenLine size={15} />
                        </button>

                        {row.status !== "Cancelled" ? (
                          <button className="cms-action-btn danger" title="Cancel" onClick={() => cancelCertificate(row)}>
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button className="cms-action-btn" title="Regenerate" onClick={() => regenerateCertificate(row)}>
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
            <span className="cms-page-info">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records
            </span>
            <button className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`cms-page-btn ${currentPage === i + 1 ? "is-active" : ""}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              Next
            </button>
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
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => printCertificate(printPreview)}>
                  <Printer size={15} /> Print
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
                  <select
                    value={editForm.admissionNo}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleEditAdmissionChange(value);
                    }}
                  >
                    <option value="">Select admission number</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.admissionNo}>{student.admissionNo}</option>
                    ))}
                  </select>
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
              <button type="button" className="cms-btn cms-btn-primary" onClick={saveEditDialog}>Save Changes</button>
            </div>
          </div>
        </div>
      ) : null}

      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
