const NUMBER_SERIES_STORAGE_KEY = "pirnav_number_series_settings";

export const FIXED_NUMBER_SERIES = [
  {
    id: "employee-id",
    key: "employee-id",
    name: "Employee ID",
    category: "Staff Management",
    prefix: "PCTCH",
    format: "PCTCH{SEQ}",
    numberLength: 4,
    startNumber: 1,
    currentNumber: 39,
    totalGenerated: 39,
    currentExample: "PCTCH0039",
    description: "Configure employee ID format for teaching and non-teaching staff.",
    status: "Active",
    allowedTokens: ["{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}"],
    sampleFormats: [
      { format: "PCTCH{SEQ}", example: "PCTCH0001" },
      { format: "EMP-{YYYY}-{SEQ}", example: "EMP-2026-0001" },
      { format: "FAC-{DEPT}-{SEQ}", example: "FAC-MATH-0001" },
    ],
  },
  {
    id: "admission-no",
    key: "admission-no",
    name: "Admission No.",
    category: "Student Admissions",
    prefix: "ADM",
    format: "ADM-{SEQ}",
    numberLength: 2,
    startNumber: 1,
    currentNumber: 17,
    totalGenerated: 17,
    currentExample: "ADM-17",
    description: "Configure admission number format for students.",
    status: "Active",
    allowedTokens: ["{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{AY}", "{BOARD}"],
    sampleFormats: [
      { format: "ADM-{SEQ}", example: "ADM-01" },
      { format: "ADM-{AY}-{SEQ}", example: "ADM-2026-0001" },
      { format: "ADM-{BOARD}-{SEQ}", example: "ADM-BIEAP-0001" },
    ],
  },
  {
    id: "certificate-number",
    key: "certificate-number",
    name: "Certificate Number",
    category: "Certificates & Degrees",
    prefix: "CND",
    format: "CND-{YEAR}-{RANDOM}",
    numberLength: 6,
    startNumber: 1,
    currentNumber: 439,
    totalGenerated: 439,
    currentExample: "CND-2026-82FC40",
    description: "Configure certificate number format for generated certificates.",
    status: "Active",
    allowedTokens: ["{CERT}", "{TYPE}", "{YEAR}", "{SEQ}", "{RANDOM}"],
    sampleFormats: [
      { format: "CND-{YEAR}-{RANDOM}", example: "CND-2026-82FC40" },
      { format: "CERT-{YEAR}-{SEQ}", example: "CERT-2026-000001" },
      { format: "TC-{YEAR}-{RANDOM}", example: "TC-2026-A94F12" },
    ],
  },
  {
    id: "receipt-no",
    key: "receipt-no",
    name: "Receipt No.",
    category: "Fee Management",
    prefix: "FEE",
    format: "FEE-{YYYYMMDD}-{SEQ}",
    numberLength: 6,
    startNumber: 1,
    currentNumber: 11,
    totalGenerated: 11,
    currentExample: "FEE-20260904-000011",
    description: "Configure receipt number format for fee collections.",
    status: "Active",
    allowedTokens: ["{PREFIX}", "{YYYYMMDD}", "{YYYY}", "{MM}", "{DD}", "{SEQ}"],
    sampleFormats: [
      { format: "FEE-{YYYYMMDD}-{SEQ}", example: "FEE-20260904-000011" },
      { format: "RCP-{YYYY}-{SEQ}", example: "RCP-2026-000001" },
      { format: "FEE-{SEQ}", example: "FEE-000001" },
    ],
  },
];

export function normalizeNumberSeriesItem(item = {}) {
  const code = item.seriesCode || item.slug || item.key || item.id || "";
  const name = item.seriesName || item.name || code;
  const format = item.formatPattern || item.format || "{SEQ}";
  const prefix = item.prefix || "";
  const numberLength = Number(item.numberLength ?? 4);
  const startNumber = Number(item.startNumber ?? 1);
  const currentSequence = Number(item.currentSequence ?? item.currentNumber ?? 0);
  const allowedTokens = item.availablePlaceholders || item.allowedTokens || ["{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}"];
  const sampleFormats = (item.sampleFormats || []).map((sf) => ({
    format: sf.pattern || sf.format || "",
    pattern: sf.pattern || sf.format || "",
    example: sf.example || "",
  }));
  const description = item.description || "";
  const isActive = item.isActive ?? true;
  const currentExample = item.currentExample || item.livePreview || format;
  const livePreview = item.livePreview || item.currentExample || format;

  return {
    ...item,
    id: code,
    key: code,
    seriesCode: code,
    slug: item.slug || code,
    name,
    seriesName: name,
    prefix,
    format,
    formatPattern: format,
    numberLength,
    startNumber,
    currentSequence,
    currentNumber: currentSequence,
    totalGenerated: item.totalGenerated ?? currentSequence,
    allowedTokens,
    availablePlaceholders: allowedTokens,
    sampleFormats,
    description,
    isActive,
    status: isActive ? "Active" : "Inactive",
    currentExample,
    livePreview,
  };
}

// --- MOCK GENERATED HISTORY DATA FOR EACH FIXED TYPE ---
export const MOCK_GENERATED_HISTORY = {
  "employee-id": [
    { id: 1, val: "PCTCH0039", name: "Dr. S. Ramesh", staffType: "Teaching", dept: "Mathematics", desig: "HOD", date: "12 May 2026" },
    { id: 2, val: "PCTCH0038", name: "Ms. Priya Sharma", staffType: "Teaching", dept: "Physics", desig: "Lecturer", date: "10 May 2026" },
    { id: 3, val: "PCTCH0037", name: "Mr. Kiran Kumar", staffType: "Teaching", dept: "Chemistry", desig: "Senior Lecturer", date: "09 May 2026" },
    { id: 4, val: "PCTCH0036", name: "Mrs. Anitha Rao", staffType: "Teaching", dept: "English", desig: "Lecturer", date: "08 May 2026" },
    { id: 5, val: "PCTCH0035", name: "Mr. Imran Khan", staffType: "Non-Teaching", dept: "Computer Science", desig: "Lab Technician", date: "07 May 2026" },
    { id: 6, val: "PCTCH0034", name: "Dr. Kavita Reddy", staffType: "Teaching", dept: "Computer Science", desig: "Professor", date: "05 May 2026" },
    { id: 7, val: "PCTCH0033", name: "Mr. Rajesh Varma", staffType: "Non-Teaching", dept: "Administration", desig: "Office Assistant", date: "02 May 2026" },
  ],
  "admission-no": [
    { id: 1, val: "ADM-17", name: "Rahul Kumar", year: "2026-2027", board: "BIEAP", group: "MPC", date: "12 May 2026" },
    { id: 2, val: "ADM-16", name: "Sneha Reddy", year: "2026-2027", board: "BIEAP", group: "BiPC", date: "11 May 2026" },
    { id: 3, val: "ADM-15", name: "Aditya Joshi", year: "2026-2027", board: "CBSE", group: "MPC", date: "10 May 2026" },
    { id: 4, val: "ADM-14", name: "Pooja Hegde", year: "2026-2027", board: "BIEAP", group: "CEC", date: "09 May 2026" },
    { id: 5, val: "ADM-13", name: "Venkatesh Rao", year: "2026-2027", board: "BIEAP", group: "HEC", date: "08 May 2026" },
  ],
  "roll-no": [
    { id: 1, val: "1", name: "Rahul Kumar", admNo: "ADM-17", level: "Senior Intermediate", group: "MPC", section: "Sec A", date: "12 May 2026" },
    { id: 2, val: "2", name: "Sneha Reddy", admNo: "ADM-16", level: "Senior Intermediate", group: "BiPC", section: "Sec A", date: "11 May 2026" },
    { id: 3, val: "Pending", name: "Manish Verma", admNo: "ADM-18", level: "Junior Intermediate", group: "MPC", section: "Unassigned", date: "13 May 2026" },
    { id: 4, val: "3", name: "Pooja Hegde", admNo: "ADM-14", level: "Senior Intermediate", group: "CEC", section: "Sec B", date: "09 May 2026" },
  ],
  "student-id": [
    { id: 1, val: "518", name: "Rahul Kumar", admNo: "ADM-17", year: "2026-2027", status: "Active", date: "12 May 2026" },
    { id: 2, val: "517", name: "Sneha Reddy", admNo: "ADM-16", year: "2026-2027", status: "Active", date: "11 May 2026" },
    { id: 3, val: "516", name: "Aditya Joshi", admNo: "ADM-15", year: "2026-2027", status: "Active", date: "10 May 2026" },
    { id: 4, val: "515", name: "Pooja Hegde", admNo: "ADM-14", year: "2026-2027", status: "Active", date: "09 May 2026" },
  ],
  "section-name": [
    { id: 1, val: "MPC-Section A", board: "BIEAP", year: "2026-2027", level: "Senior Intermediate", group: "MPC", status: "Active", date: "01 Apr 2026" },
    { id: 2, val: "MPC-Section B", board: "BIEAP", year: "2026-2027", level: "Senior Intermediate", group: "MPC", status: "Active", date: "01 Apr 2026" },
    { id: 3, val: "BiPC-1A", board: "BIEAP", year: "2026-2027", level: "Junior Intermediate", group: "BiPC", status: "Active", date: "05 Apr 2026" },
    { id: 4, val: "MPC-2A", board: "BIEAP", year: "2026-2027", level: "Senior Intermediate", group: "MPC", status: "Active", date: "05 Apr 2026" },
    { id: 5, val: "MPC-A", board: "CBSE", year: "2026-2027", level: "Class XII", group: "MPC", status: "Active", date: "10 Apr 2026" },
  ],
  "exam-code": [
    { id: 1, val: "MPC-FINAL-2025", examName: "MPC Annual Final Exam 2025", year: "2025-2026", board: "BIEAP", type: "Final", date: "15 Dec 2025" },
    { id: 2, val: "EXAM-2026-COMP", examName: "Computer Science Comprehensive", year: "2026-2027", board: "BIEAP", type: "Special", date: "10 Jan 2026" },
    { id: 3, val: "EXAM-2026-0019", examName: "Mid Term Assessment II", year: "2026-2027", board: "BIEAP", type: "Mid Term", date: "20 Feb 2026" },
    { id: 4, val: "EXAM-2026-0008", examName: "Physics Unit Test 1", year: "2026-2027", board: "BIEAP", type: "Unit Test", date: "05 Mar 2026" },
    { id: 5, val: "EXAM-2026-0007", examName: "Chemistry Lab Practicals", year: "2026-2027", board: "BIEAP", type: "Practical", date: "01 Mar 2026" },
  ],
  "certificate-number": [
    { id: 1, val: "CND-2026-82FC40", certType: "Conduct Certificate", student: "Rahul Kumar", admNo: "ADM-17", date: "01 Jun 2026", status: "Issued" },
    { id: 2, val: "CND-2026-C309B9", certType: "Transfer Certificate", student: "Sneha Reddy", admNo: "ADM-16", date: "28 May 2026", status: "Issued" },
    { id: 3, val: "CND-2026-E0ADA1", certType: "Bonafide Certificate", student: "Aditya Joshi", admNo: "ADM-15", date: "25 May 2026", status: "Issued" },
    { id: 4, val: "CND-2026-490097", certType: "Course Completion", student: "Pooja Hegde", admNo: "ADM-14", date: "20 May 2026", status: "Issued" },
    { id: 5, val: "CND-2026-723439", certType: "Study Certificate", student: "Venkatesh Rao", admNo: "ADM-13", date: "15 May 2026", status: "Issued" },
  ],
  "receipt-no": [
    { id: 1, val: "FEE-20260904-000011", student: "Rahul Kumar", admNo: "ADM-17", type: "Tuition Fee", amount: "₹25,000", date: "04 Sep 2026" },
    { id: 2, val: "FEE-20260904-000010", student: "Sneha Reddy", admNo: "ADM-16", type: "Admission Fee", amount: "₹15,000", date: "04 Sep 2026" },
    { id: 3, val: "FEE-20260903-000009", student: "Aditya Joshi", admNo: "ADM-15", type: "Lab & Library Fee", amount: "₹8,500", date: "03 Sep 2026" },
    { id: 4, val: "FEE-20260903-000008", student: "Pooja Hegde", admNo: "ADM-14", type: "Transport Fee", amount: "₹12,000", date: "03 Sep 2026" },
    { id: 5, val: "FEE-20260902-000007", student: "Venkatesh Rao", admNo: "ADM-13", type: "Hostel Fee", amount: "₹35,000", date: "02 Sep 2026" },
  ],
};

// --- MOCK CONFIGURATION HISTORY LOGS ---
export const MOCK_CONFIG_HISTORY = {
  "employee-id": [
    { version: "v1.0", format: "PCTCH{SEQ}", prefix: "PCTCH", length: 4, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
    { version: "v0.9", format: "PCTCH-{SEQ}", prefix: "PCTCH", length: 4, startNum: 1, changedBy: "Admin", date: "15 Mar 2026", status: "Previous" },
  ],
  "admission-no": [
    { version: "v1.0", format: "ADM-{SEQ}", prefix: "ADM", length: 2, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "roll-no": [
    { version: "v1.0", format: "{SEQ}", prefix: "", length: 1, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "student-id": [
    { version: "v1.0", format: "{SEQ}", prefix: "", length: 3, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "section-name": [
    { version: "v1.0", format: "{GROUP}-Section {SECTION}", prefix: "", length: 1, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "exam-code": [
    { version: "v1.0", format: "{GROUP}-{TYPE}-{YEAR}", prefix: "EXAM", length: 4, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "certificate-number": [
    { version: "v1.0", format: "CND-{YEAR}-{RANDOM}", prefix: "CND", length: 6, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
  "receipt-no": [
    { version: "v1.0", format: "FEE-{YYYYMMDD}-{SEQ}", prefix: "FEE", length: 6, startNum: 1, changedBy: "Admin", date: "01 Apr 2026", status: "Active" },
  ],
};

// --- HELPER STORAGE READ / WRITE ---
export function readNumberSeriesSettings() {
  try {
    const raw = localStorage.getItem(NUMBER_SERIES_STORAGE_KEY) || sessionStorage.getItem(NUMBER_SERIES_STORAGE_KEY);
    if (!raw) return FIXED_NUMBER_SERIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FIXED_NUMBER_SERIES;
    // Merge saved settings with FIXED structure to maintain non-deletable guarantees
    return FIXED_NUMBER_SERIES.map((fixed) => {
      const found = parsed.find((p) => p.id === fixed.id || p.key === fixed.key);
      return found ? { ...fixed, ...found } : fixed;
    });
  } catch {
    return FIXED_NUMBER_SERIES;
  }
}

export function writeNumberSeriesSettings(list) {
  try {
    const json = JSON.stringify(list);
    localStorage.setItem(NUMBER_SERIES_STORAGE_KEY, json);
    sessionStorage.setItem(NUMBER_SERIES_STORAGE_KEY, json);
  } catch (err) {
    console.error("Failed to save number series settings", err);
  }
}

// --- HELPER READ / WRITE CONFIG HISTORY ---
export function readConfigHistory(seriesId) {
  try {
    const raw = localStorage.getItem(`pirnav_config_hist_${seriesId}`);
    if (!raw) return MOCK_CONFIG_HISTORY[seriesId] || [];
    return JSON.parse(raw);
  } catch {
    return MOCK_CONFIG_HISTORY[seriesId] || [];
  }
}

export function appendConfigHistory(seriesId, newConfig) {
  const current = readConfigHistory(seriesId);
  const updatedPrevious = current.map((item) => ({ ...item, status: "Previous" }));
  const nextVersionNum = (updatedPrevious.length + 1.0).toFixed(1);
  const nowStr = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  
  const newRow = {
    version: `v${nextVersionNum}`,
    format: newConfig.format,
    prefix: newConfig.prefix || "—",
    length: newConfig.numberLength,
    startNum: newConfig.startNumber,
    changedBy: "Admin",
    date: nowStr,
    status: "Active",
  };
  const newList = [newRow, ...updatedPrevious];
  try {
    localStorage.setItem(`pirnav_config_hist_${seriesId}`, JSON.stringify(newList));
  } catch {}
  return newList;
}

// --- TOKEN REPLACEMENT & NUMBER FORMATTING ENGINE ---
export function buildNumberFromFormat(format, seqNum, numberLength = 4, customTokens = {}) {
  if (!format) return "—";
  const num = Number(seqNum || 1);
  const padded = String(num).padStart(Number(numberLength || 1), "0");

  const now = new Date();
  const year = now.getFullYear();
  const shortYear = String(year).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const yyyymmdd = `${year}${month}${day}`;

  // Random uppercase hex value for {RANDOM} token
  const randomVal = customTokens.RANDOM || "82FC40";

  let result = format;
  result = result.replace(/{SEQ}/g, padded);
  result = result.replace(/{YYYY}/g, customTokens.YYYY || String(year));
  result = result.replace(/{YY}/g, customTokens.YY || shortYear);
  result = result.replace(/{MM}/g, customTokens.MM || month);
  result = result.replace(/{DD}/g, customTokens.DD || day);
  result = result.replace(/{YYYYMMDD}/g, customTokens.YYYYMMDD || yyyymmdd);

  // Series specific tokens
  result = result.replace(/{DEPT}/g, customTokens.DEPT || "MATH");
  result = result.replace(/{DESIG}/g, customTokens.DESIG || "HOD");
  result = result.replace(/{STAFF}/g, customTokens.STAFF || "FAC");
  result = result.replace(/{AY}/g, customTokens.AY || `${year}-${year + 1}`);
  result = result.replace(/{BOARD}/g, customTokens.BOARD || "BIEAP");
  result = result.replace(/{GROUP}/g, customTokens.GROUP || "MPC");
  result = result.replace(/{LEVEL}/g, customTokens.LEVEL || "SR");
  result = result.replace(/{SECTION}/g, customTokens.SECTION || "A");
  result = result.replace(/{EXAM}/g, customTokens.EXAM || "FINAL");
  result = result.replace(/{TYPE}/g, customTokens.TYPE || "FINAL");
  result = result.replace(/{YEAR}/g, customTokens.YEAR || String(year));
  result = result.replace(/{CERT}/g, customTokens.CERT || "CND");
  result = result.replace(/{PREFIX}/g, customTokens.PREFIX || "FEE");
  result = result.replace(/{RANDOM}/g, randomVal);

  return result;
}

// --- BACKWARD COMPATIBILITY EXPORTS FOR OTHER MODULES (StaffManagementPage, etc.) ---
export const initialNumberSeries = FIXED_NUMBER_SERIES;

export function formatSeriesNumber(series, sequenceNum = null, customTokens = {}) {
  if (!series) return "—";
  const num = sequenceNum !== null ? sequenceNum : (Number(series.currentNumber || 0) + 1);
  return buildNumberFromFormat(series.format || "ID{SEQ}", num, series.numberLength || 4, customTokens);
}

export function findSeriesConfig(seriesKey) {
  const seriesList = readNumberSeriesSettings();
  const normalizedKey = String(seriesKey || "").trim().toLowerCase();
  let series = seriesList.find((s) =>
    s.key === seriesKey ||
    s.id === seriesKey ||
    String(s.slug || "").toLowerCase() === normalizedKey ||
    String(s.seriesCode || "").toLowerCase() === normalizedKey
  );
  if (!series) {
    if (normalizedKey.includes("staff") || normalizedKey.includes("employee") || normalizedKey.includes("teaching")) {
      series = seriesList.find((s) => s.id === "employee-id" || s.key === "employee-id" || s.seriesCode === "EMPLOYEE_ID");
    } else if (normalizedKey.includes("student") || normalizedKey.includes("admission")) {
      series = seriesList.find((s) => s.id === "admission-no" || s.key === "admission-no" || s.seriesCode === "ADMISSION_NO");
    } else if (normalizedKey.includes("cert")) {
      series = seriesList.find((s) => s.id === "certificate-number" || s.key === "certificate-number" || s.seriesCode === "CERTIFICATE_NUMBER");
    } else if (normalizedKey.includes("fee") || normalizedKey.includes("receipt")) {
      series = seriesList.find((s) => s.id === "receipt-no" || s.key === "receipt-no" || s.seriesCode === "RECEIPT_NO");
    }
  }
  return series;
}

export function generateNextNumber(seriesKey, customTokens = {}) {
  const series = findSeriesConfig(seriesKey);
  if (!series) {
    const norm = String(seriesKey || "").toLowerCase();
    if (norm.includes("staff") || norm.includes("employee") || norm.includes("teaching")) return "PCTCH0040";
    if (norm.includes("admission") || norm.includes("student")) return "ADM-18";
    if (norm.includes("roll")) return "2";
    if (norm.includes("receipt") || norm.includes("fee")) return "FEE-20260904-000012";
    return "ID001";
  }
  return formatSeriesNumber(series, Number(series.currentNumber || 0) + 1, customTokens);
}

export function incrementSeriesSequence(seriesKey) {
  const series = findSeriesConfig(seriesKey);
  const targetId = series?.id || series?.key || seriesKey;
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.id === targetId || s.key === targetId) {
      return { ...s, currentNumber: Number(s.currentNumber || 0) + 1, totalGenerated: Number(s.totalGenerated || 0) + 1 };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

export function resetNumberSeriesSequence(id, newCurrentNumber = 0) {
  const series = findSeriesConfig(id);
  const targetId = series?.id || series?.key || id;
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.id === targetId || s.key === targetId) {
      return { ...s, currentNumber: Number(newCurrentNumber) };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

// --- GET PREVIEW NEXT NUMBER FOR A SERIES ---
export function getNextNumberPreview(series, overrideConfig = null) {
  if (!series) return "—";
  const cfg = overrideConfig || series;
  const nextSeqNum = Number(cfg.currentNumber || 0) + 1;
  return buildNumberFromFormat(cfg.format, nextSeqNum, cfg.numberLength);
}

// --- FORMAT VALIDATION ENGINE ---
export function validateNumberSeries(format, numberLength, currentNumber, allowedTokens = []) {
  if (!format || !format.trim()) {
    return { valid: false, message: "Format cannot be empty." };
  }

  // Check sequence length overflow
  const nextNum = Number(currentNumber || 0) + 1;
  const maxPossible = Math.pow(10, Number(numberLength || 1)) - 1;
  if (numberLength < 6 && nextNum > maxPossible) {
    return {
      valid: false,
      message: `Sequence length (${numberLength}) is too small for current number (${nextNum}).`,
    };
  }

  // Extract all {TOKEN} patterns
  const tokens = format.match(/\{[^}]+\}/g) || [];
  const unsupported = tokens.filter((t) => !allowedTokens.includes(t));

  if (unsupported.length > 0) {
    return {
      valid: false,
      message: `Unsupported placeholder: ${unsupported.join(", ")}`,
    };
  }

  return { valid: true, message: "" };
}
