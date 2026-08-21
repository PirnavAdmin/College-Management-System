import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import "./BoardAcademicYearManagementPage.css";

const PAGE_SIZE = 5;
const API_VERSION = "1.0";
const ACADEMIC_YEAR_API = {
  list: "/api/v1/academic-years",
  create: "/api/v1/academic-years",
  active: "/api/v1/academic-years/active",
  byId: (id) => `/api/v1/academic-years/${id}`,
  delete: (id) => `/api/v1/academic-years/${id}`,
  activate: (id) => `/api/v1/academic-years/${id}/activate`,
  deactivate: (id) => `/api/v1/academic-years/${id}/deactivate`,
  exportCsv: "/api/v1/academic-years/export/csv",
  exportExcel: "/api/v1/academic-years/export/excel",
};
const BOARD_API = {
  list: "/api/v1/boards",
  create: "/api/v1/boards",
  byId: (id) => `/api/v1/boards/${id}`,
  status: (id) => `/api/v1/boards/${id}/status`,
  summary: "/api/v1/boards/summary",
  exportCsv: "/api/v1/boards/export/csv",
  exportExcel: "/api/v1/boards/export/excel",
  exportPdf: "/api/v1/boards/export/pdf",
  countries: "/api/v1/boards/countries",
  formData: "/api/v1/boards/form-data",
  states: (countryId) => `/api/v1/boards/states/${countryId}`,
  academicPatterns: "/api/v1/boards/academic-patterns",
  academicLevels: "/api/v1/boards/academic-levels",
  gradingSystems: "/api/v1/boards/grading-systems",
  validateBoardCode: "/api/v1/boards/validate-board-code",
  history: (id) => `/api/v1/boards/${id}/history`,
};
const INDIA_REGION_ORDER = [
  "All India",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];
const INDIA_REGION_NAMES = new Set(INDIA_REGION_ORDER);
const ALL_INDIA_STATE_ID = "__ALL_INDIA__";
const BOARD_ACADEMIC_LEVEL_ORDER = [
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Class XII / ISC", "Senior Secondary", "1st PUC", "2nd PUC", "Plus One", "Plus Two",
  "Higher Secondary 1st Year", "Higher Secondary 2nd Year", "Std XI", "Std XII",
  "+2 First Year", "+2 Second Year", "Plus One / Class XI", "Plus Two / Class XII",
];
const PRIMARY_BOARD_LEVEL_NAMES = new Set([
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Senior Secondary", "1st PUC", "2nd PUC", "Higher Secondary 1st Year",
  "Higher Secondary 2nd Year",
]);
const FRONTEND_BOARD_LEVELS = [
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Senior Secondary", "1st PUC", "2nd PUC", "Higher Secondary 1st Year",
  "Higher Secondary 2nd Year",
];
const DEFAULT_BOARD_CONFIG = {
  "Board of Intermediate Education, Andhra Pradesh": {
    boardCode: "BIEAP", boardType: "State Board", stateName: "Andhra Pradesh",
    academicLevelNames: ["Intermediate 1st Year", "Intermediate 2nd Year"],
  },
  "Telangana Board of Intermediate Education": {
    boardCode: "TGBIE", boardType: "State Board", stateName: "Telangana",
    academicLevelNames: ["Intermediate 1st Year", "Intermediate 2nd Year"],
  },
  "Central Board of Secondary Education": {
    boardCode: "CBSE", boardType: "Central Board", stateName: "All India",
    academicLevelNames: ["Class XI", "Class XII"],
  },
  "Council for the Indian School Certificate Examinations": {
    boardCode: "CISCE", boardType: "National / Central Board", stateName: "All India",
    academicLevelNames: ["Class XI", "Class XII"],
  },
  "Karnataka Pre-University Education / PUC System": {
    boardCode: "PUC-KA", boardType: "State Board", stateName: "Karnataka",
    academicLevelNames: ["1st PUC", "2nd PUC"],
  },
  "Tamil Nadu State Board – Higher Secondary": {
    boardCode: "DGE-TN", boardType: "State Board", stateName: "Tamil Nadu",
    academicLevelNames: ["Higher Secondary 1st Year", "Higher Secondary 2nd Year"],
  },
};
const normalizeMasterName = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const NORMALIZED_DEFAULT_BOARD_CONFIG = Object.fromEntries(
  Object.entries(DEFAULT_BOARD_CONFIG).map(([name, config]) => [normalizeMasterName(name), config]),
);
const BOARD_NAME_OPTIONS = Object.keys(DEFAULT_BOARD_CONFIG).map((boardName) => ({ boardName }));

const emptyBoardForm = {
  boardName: "",
  boardCode: "",
  boardType: "",
  description: "",
  countryId: "",
  stateId: "",
  academicPatternId: "",
  academicLevelIds: [],
  internalAssessment: false,
  practicalExams: false,
  boardExams: false,
  passPercentage: "",
  gradingSystemId: "",
  rankCalculation: false,
  status: "",
  rowVersion: null,
};

/* Board rows and form masters intentionally start empty. The Board API is the only data source. */
const mapBoardListItem = (item = {}) => ({
  id: item.boardId ?? item.BoardId ?? item.id ?? item.Id,
  board: item.boardName ?? item.BoardName ?? "",
  code: item.boardCode ?? item.BoardCode ?? "",
  type: item.boardType ?? item.BoardType ?? "",
  countryId: item.countryId ?? item.CountryId ?? null,
  country: item.countryName ?? item.CountryName ?? "",
  stateId: item.stateId ?? item.StateId ?? null,
  state: item.stateName ?? item.StateName ?? "",
  pattern: item.academicPatternName ?? item.AcademicPatternName ?? "",
  level: (item.academicLevelNames ?? item.AcademicLevelNames ?? []).join?.(", ") || "",
  status: (item.status ?? item.Status) === false ? "Inactive" : "Active",
  rowVersion: item.rowVersion ?? item.RowVersion ?? null,
  createdDate: item.createdDate ?? item.CreatedDate ?? null,
});

const mapBoardDetails = (item = {}) => ({
  ...mapBoardListItem(item),
  description: item.description ?? item.Description ?? "",
  academicPatternId: item.academicPatternId ?? item.AcademicPatternId ?? null,
  academicLevelIds: item.academicLevelIds ?? item.AcademicLevelIds ?? [],
  level: (item.academicLevelNames ?? item.AcademicLevelNames ?? []).join(", "),
  internalAssessment: Boolean(item.internalAssessment ?? item.InternalAssessment),
  practicalExams: Boolean(item.practicalExams ?? item.PracticalExams),
  boardExams: Boolean(item.boardExams ?? item.BoardExams),
  passPercentage: item.passPercentage ?? item.PassPercentage ?? "",
  gradingSystemId: item.gradingSystemId ?? item.GradingSystemId ?? null,
  gradingSystem: item.gradingSystemName ?? item.GradingSystemName ?? "",
  rankCalculation: Boolean(item.rankCalculation ?? item.RankCalculation),
});

const unwrapPayload = (value) => value?.data ?? value?.Data ?? value;
const asArray = (value) => {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? payload?.Items ?? payload?.records ?? payload?.Records ?? [];
};

const optionValue = (item, camel, pascal) => item?.[camel] ?? item?.[pascal];

function SearchableApiSelect({ value, options, idKey, nameKey, placeholder, onChange, disabled = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => String(optionValue(item, idKey, idKey[0].toUpperCase() + idKey.slice(1))) === String(value));
  const filtered = options.filter((item) =>
    String(optionValue(item, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1)) || "")
      .toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="bay-api-picker" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="bay-api-picker-input">
        <Search size={16} />
        <input
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : optionValue(selected, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1)) || ""}
          placeholder={placeholder}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              onChange(optionValue(filtered[0], idKey, idKey[0].toUpperCase() + idKey.slice(1)));
              setOpen(false);
            }
          }}
        />
      </div>
      {open ? <div className="bay-api-options" role="listbox">
        {filtered.map((item) => {
          const id = optionValue(item, idKey, idKey[0].toUpperCase() + idKey.slice(1));
          const name = optionValue(item, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1));
          const frontendOnly = Boolean(item.frontendOnly);
          return <button type="button" role="option" aria-selected={String(id) === String(value)} aria-disabled={frontendOnly} disabled={frontendOnly} key={id} onClick={() => { onChange(id); setOpen(false); }}>
            <span>{name}{frontendOnly ? <small>Not configured in API</small> : null}</span>
          </button>;
        })}
        {!filtered.length ? <span>No matching options found.</span> : null}
      </div> : null}
    </div>
  );
}

function ApiLevelMultiSelect({ value, options, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const selectedIds = value.map(String);
  const selected = options.filter((item) => selectedIds.includes(String(optionValue(item, "academicLevelId", "AcademicLevelId"))));
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((item) => {
    const name = String(optionValue(item, "levelName", "LevelName") || "");
    if (normalizedQuery) return name.toLowerCase().includes(normalizedQuery);
    return showOthers || PRIMARY_BOARD_LEVEL_NAMES.has(name);
  });
  const toggle = (id) => {
    if (selectedIds.includes(String(id))) onChange(value.filter((item) => String(item) !== String(id)));
    else onChange([...value, id]);
    setQuery("");
  };
  return (
    <div className="bay-level-picker bay-api-level-picker" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="bay-level-combobox">
        <Search size={16} />
        <input role="combobox" aria-expanded={open} value={query} placeholder={selected.length ? "Search another level" : "Search academic level"}
          onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              toggle(optionValue(filtered[0], "academicLevelId", "AcademicLevelId"));
            }
          }} />
        {selected.length ? <span className="bay-level-count">{selected.length} selected</span> : null}
      </div>
      {open ? <div className="bay-level-options" role="listbox">
        {filtered.map((item) => {
          const id = optionValue(item, "academicLevelId", "AcademicLevelId");
          const isSelected = selectedIds.includes(String(id));
          const frontendOnly = Boolean(item.frontendOnly);
          return <button type="button" role="option" aria-selected={isSelected} aria-disabled={frontendOnly} disabled={frontendOnly} key={id} onClick={() => toggle(id)}>
            <span>{optionValue(item, "levelName", "LevelName")}{frontendOnly ? <small>Not configured in API</small> : null}</span>{isSelected ? <X size={13} /> : null}
          </button>;
        })}
        {!normalizedQuery && !showOthers ? (
          <button type="button" className="bay-level-others" onClick={() => setShowOthers(true)}>
            <span>Others</span>
          </button>
        ) : null}
        {!filtered.length ? <span>No academic levels found.</span> : null}
      </div> : null}
    </div>
  );
}

const emptyForm = {
  board: "",
  code: "",
  type: "",
  state: "",
  level: "",
  year: "",
  start: "",
  end: "",
  admissionStart: "",
  admissionEnd: "",
  duration: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "",
  description: "",
};
const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${value}T00:00:00`),
      )
    : "—";

const yearCode = (year = "") => `AY-${year.replace(/[^0-9]/g, "-").replace(/-+/g, "-")}`;

const dateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

const mapAcademicYearFromApi = (item = {}) => ({
  id: item.academicYearId ?? item.AcademicYearId ?? item.id ?? item.Id,
  year: item.academicYearName ?? item.AcademicYearName ?? item.year ?? "",
  start: dateInputValue(item.startDate ?? item.StartDate ?? item.start),
  end: dateInputValue(item.endDate ?? item.EndDate ?? item.end),
  admissionStart: dateInputValue(
    item.admissionStartDate ?? item.AdmissionStartDate ?? item.admissionStart,
  ),
  admissionEnd: dateInputValue(
    item.admissionEndDate ?? item.AdmissionEndDate ?? item.admissionEnd,
  ),
  status:
    (item.isActive ?? item.IsActive) === false ||
    String(item.status ?? item.Status ?? "").toLowerCase() === "inactive"
      ? "Inactive"
      : "Active",
  description: item.description ?? item.Description ?? "",
});

function unwrapAcademicYearItem(responseData) {
  const payload = responseData?.data ?? responseData?.Data ?? responseData;
  return mapAcademicYearFromApi(payload);
}

function normalizeAcademicYearList(responseData, requestedPage, requestedSize) {
  const envelope = responseData?.data ?? responseData?.Data ?? responseData ?? {};
  const items = Array.isArray(envelope)
    ? envelope
    : envelope.items ?? envelope.Items ?? envelope.records ?? envelope.Records ?? envelope.data ?? envelope.Data ?? [];
  const totalCount = Number(
    envelope.totalCount ??
      envelope.TotalCount ??
      responseData?.totalCount ??
      responseData?.TotalCount ??
      items.length,
  );
  const pageSize = Number(envelope.pageSize ?? envelope.PageSize ?? requestedSize) || requestedSize;
  const pageNumber = Number(envelope.pageNumber ?? envelope.PageNumber ?? requestedPage) || requestedPage;
  const totalPages = Number(
    envelope.totalPages ?? envelope.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return {
    items: (Array.isArray(items) ? items : []).map(mapAcademicYearFromApi),
    totalCount,
    pageNumber,
    pageSize,
    totalPages: Math.max(1, totalPages),
  };
}

const academicYearPayload = (draft) => {
  const payload = {
    academicYearName: draft.year.trim(),
    startDate: draft.start,
    endDate: draft.end,
    isActive: draft.status === "Active",
    description: draft.description?.trim() || "",
  };
  if (draft.admissionStart) payload.admissionStartDate = draft.admissionStart;
  if (draft.admissionEnd) payload.admissionEndDate = draft.admissionEnd;
  return payload;
};

function filenameFromDisposition(disposition, fallback) {
  const utfMatch = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition?.match(/filename="?([^";]+)"?/i);
  const value = utfMatch?.[1] ?? plainMatch?.[1];
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createPdfReport({ title, columns, rows, filename, orientation = "landscape" }) {
  const document = new jsPDF({ orientation, unit: "pt", format: "a4" });
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text("Pirnav Junior College", 36, 36);
  document.setFontSize(13);
  document.text(title, 36, 57);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(90, 105, 130);
  document.text(`Generated On: ${new Date().toLocaleString()}`, 36, 73);
  autoTable(document, {
    head: [columns],
    body: rows,
    startY: 86,
    margin: { right: 28, bottom: 28, left: 28 },
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [37, 86, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
  });
  document.save(filename);
}

function ExportDropdown({ onPdf, onExcel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  const toggleMenu = () => {
    setOpen((current) => {
      if (!current) {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
          setPosition({
            top: rect.bottom + 6,
            left: Math.max(8, Math.min(window.innerWidth - 178, rect.right - 170)),
          });
        }
      }
      return !current;
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  const runExport = (callback) => {
    setOpen(false);
    callback();
  };
  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    minHeight: 36,
    padding: "8px 10px",
    border: 0,
    borderRadius: 7,
    background: "transparent",
    color: "var(--cms-text)",
    font: "inherit",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
    cursor: "pointer",
  };
  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="cms-btn cms-btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggleMenu}
      >
        <Download size={16} /> Export <ChevronDown size={14} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Export options"
          style={{
            position: "fixed",
            zIndex: 1000,
            top: position.top,
            left: position.left,
            width: 170,
            padding: 5,
            border: "1px solid var(--cms-border)",
            borderRadius: 9,
            background: "var(--cms-surface, #fff)",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            onMouseEnter={(event) => (event.currentTarget.style.background = "var(--cms-hover, #f1f5f9)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
            onClick={() => runExport(onPdf)}
          >
            <FileText size={16} /> Export PDF
          </button>
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            onMouseEnter={(event) => (event.currentTarget.style.background = "var(--cms-hover, #f1f5f9)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
            onClick={() => runExport(onExcel)}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AcademicYearWorkspace() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchAcademicYears = useCallback(async (pageOverride = page) => {
    const sequence = ++requestSequence.current;
    setListLoading(true);
    try {
      const response = await apiClient.get(ACADEMIC_YEAR_API.list, {
        params: {
          Search: debouncedQuery || undefined,
          PageNumber: pageOverride,
          PageSize: PAGE_SIZE,
          "api-version": API_VERSION,
        },
      });
      if (sequence !== requestSequence.current) return;
      const normalized = normalizeAcademicYearList(response.data, pageOverride, PAGE_SIZE);
      setAcademicYears(normalized.items);
      setTotalCount(normalized.totalCount);
      setTotalPages(normalized.totalPages);
      if (normalized.pageNumber !== pageOverride) setPage(normalized.pageNumber);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setAcademicYears([]);
      setTotalCount(0);
      setTotalPages(1);
      setToast(getApiErrorMessage(error));
    } finally {
      if (sequence === requestSequence.current) setListLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const fetchAcademicYearDetails = async (id) => {
    setDetailsLoading(true);
    setSelected(null);
    setDetailsOpen(true);
    setFormOpen(false);
    try {
      const response = await apiClient.get(ACADEMIC_YEAR_API.byId(id), {
        params: { "api-version": API_VERSION },
      });
      const record = unwrapAcademicYearItem(response.data);
      setSelected(record);
      setEditingId(record.id);
      setDraft(record);
      setDetailsOpen(true);
      setFormOpen(false);
      return record;
    } catch (error) {
      setDetailsOpen(false);
      setToast(getApiErrorMessage(error));
      return null;
    } finally {
      setDetailsLoading(false);
    }
  };

  const currentPage = Math.min(page, totalPages);
  const pages = totalPages;
  const visible = academicYears;
  const edit = (row) => {
    setEditingId(row.id);
    setDraft({ ...row });
    setDetailsOpen(false);
    setFormOpen(true);
  };
  const update = (name, value) => setDraft((current) => ({ ...current, [name]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!draft.year?.trim() || !draft.start || !draft.end || !draft.status) {
      setToast("Complete all required fields.");
      return;
    }
    if (draft.start > draft.end) {
      setToast("Start Date cannot be after End Date.");
      return;
    }
    if (draft.admissionStart && draft.admissionEnd && draft.admissionStart > draft.admissionEnd) {
      setToast("Admission Start Date cannot be after Admission End Date.");
      return;
    }
    setSaving(true);
    try {
      const payload = academicYearPayload(draft);
      if (editingId) {
        const statusChanged = Boolean(selected) && selected.status !== draft.status;
        const contentChanged =
          !selected ||
          selected.year !== draft.year ||
          selected.start !== draft.start ||
          selected.end !== draft.end ||
          selected.admissionStart !== draft.admissionStart ||
          selected.admissionEnd !== draft.admissionEnd ||
          selected.description !== draft.description;
        if (statusChanged && !contentChanged) {
          const endpoint =
            draft.status === "Active"
              ? ACADEMIC_YEAR_API.activate(editingId)
              : ACADEMIC_YEAR_API.deactivate(editingId);
          await apiClient.patch(endpoint, null, { params: { "api-version": API_VERSION } });
        } else {
          await apiClient.put(ACADEMIC_YEAR_API.byId(editingId), payload, {
            params: { "api-version": API_VERSION },
          });
        }
        setToast("Academic Year updated successfully.");
      } else {
        await apiClient.post(ACADEMIC_YEAR_API.create, payload, {
          params: { "api-version": API_VERSION },
        });
        setToast("Academic Year added successfully.");
      }
      setDetailsOpen(false);
      setFormOpen(false);
      setSelected(null);
      setEditingId(null);
      setDraft(emptyForm);
      if (page !== 1) setPage(1);
      else await fetchAcademicYears(1);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const deleteAcademicYear = async (row) => {
    if (deletingId || !window.confirm(`Delete academic year ${row.year}? This action cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await apiClient.delete(ACADEMIC_YEAR_API.delete(row.id), {
        params: { "api-version": API_VERSION },
      });
      setToast("Academic Year deleted successfully.");
      if (selected?.id === row.id) {
        setSelected(null);
        setDetailsOpen(false);
        setFormOpen(false);
      }
      const targetPage = academicYears.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      else await fetchAcademicYears(targetPage);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };
  const academicYearColumns = [
    "Academic Year",
    "Start Date",
    "End Date",
    "Admission Start Date",
    "Admission End Date",
    "Status",
  ];
  const academicYearExportRows = () =>
    academicYears.map((row) => [
      row.year || "",
      fmt(row.start),
      fmt(row.end),
      fmt(row.admissionStart),
      fmt(row.admissionEnd),
      row.status || "",
    ]);
  const exportAcademicYearsPdf = () => {
    if (!academicYears.length) {
      setToast("No Academic Year records available to export.");
      return;
    }
    try {
      createPdfReport({
        title: `Academic Year Management Report (Page ${currentPage})`,
        columns: academicYearColumns,
        rows: academicYearExportRows(),
        filename: "Academic-Year-Report.pdf",
      });
    } catch (error) {
      console.error("Academic Year PDF export failed", error);
      setToast("Unable to export PDF.");
    }
  };
  const exportAcademicYearsExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await apiClient.get(ACADEMIC_YEAR_API.exportExcel, {
        params: {
          search: debouncedQuery || undefined,
          "api-version": API_VERSION,
        },
        responseType: "blob",
      });
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"],
        "Academic-Year-Report.xlsx",
      );
      downloadBlob(response.data, filename);
    } catch (error) {
      console.error("Academic Year Excel export failed", error);
      setToast("Unable to export Excel.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <section
      className={`ay-workspace${formOpen ? " is-form-open" : ""}${detailsOpen ? " is-details-open" : ""}`}
    >
      <section className="bay-card ay-list-card">
        <div className="bay-toolbar">
          <label className="bay-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search academic year, start date, end date, admission period..."
            />
          </label>
          <div className="bay-toolbar-actions">
            <ExportDropdown
              onPdf={exportAcademicYearsPdf}
              onExcel={exportAcademicYearsExcel}
              disabled={exporting || listLoading}
            />
            <button
              className="cms-btn cms-btn-primary"
              disabled={listLoading}
              onClick={() => {
                setEditingId(null);
                setSelected(null);
                setDraft(emptyForm);
                setDetailsOpen(false);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Add Academic Year
            </button>
          </div>
        </div>
        <div className="bay-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Admission Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="6" className="bay-empty">Loading academic years...</td>
                </tr>
              ) : null}
              {!listLoading && !visible.length ? (
                <tr>
                  <td colSpan="6" className="bay-empty">No academic years available.</td>
                </tr>
              ) : null}
              {!listLoading && visible.map((row) => (
                <tr key={row.id} className={selected?.id === row.id ? "is-selected" : ""}>
                  <td>
                    <strong>{row.year}</strong>
                  </td>
                  <td>{fmt(row.start)}</td>
                  <td>{fmt(row.end)}</td>
                  <td>
                    {fmt(row.admissionStart)} – {fmt(row.admissionEnd)}
                  </td>
                  <td>
                    <span className={`bay-status ${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td>
                    <div className="bay-actions">
                      <button
                        type="button"
                        className="bay-action-view"
                        aria-label={`View academic year ${row.year}`}
                        title="View academic year details"
                        disabled={detailsLoading}
                        onClick={() => fetchAcademicYearDetails(row.id)}
                      >
                        <Eye />
                      </button>
                      <button
                        type="button"
                        className="bay-action-delete"
                        aria-label={`Delete academic year ${row.year}`}
                        title="Delete academic year"
                        disabled={deletingId === row.id}
                        onClick={() => deleteAcademicYear(row)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer>
          <span>
            Showing {totalCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} records
          </span>
          <nav aria-label="Academic year pagination">
            <button
              className="bay-page-direction"
              disabled={listLoading || currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                className={number === currentPage ? "active" : ""}
                disabled={listLoading}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              className="bay-page-direction"
              disabled={listLoading || currentPage === pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
            >
              Next
            </button>
          </nav>
        </footer>
      </section>
      {formOpen || detailsOpen ? (
        <button
          type="button"
          className="cms-back-link ay-form-back"
          onClick={() => {
            setFormOpen(false);
            setDetailsOpen(false);
            setEditingId(selected?.id || null);
            setDraft(selected || emptyForm);
          }}
        >
          <ArrowLeft size={15} /> Back to Academic Year Management
        </button>
      ) : null}
      <div className="ay-lower-grid">
        <article className="bay-card bay-bottom bay-details ay-year-details-card">
          <header>
            <div>
              <Eye size={18} />
              <h2>Configuration Details</h2>
            </div>
            {selected ? (
              <button
                className="cms-btn cms-btn-ghost bay-details-edit"
                onClick={() => edit(selected)}
              >
                <Edit3 size={15} /> Edit Configuration
              </button>
            ) : null}
          </header>
          {detailsLoading ? (
            <p className="bay-empty">Loading academic year details...</p>
          ) : selected ? (
            <dl>
              {[
                ["Academic Year Name", selected.year],
                ["Start Date", fmt(selected.start)],
                ["End Date", fmt(selected.end)],
                ["Admission Start Date", fmt(selected.admissionStart)],
                ["Admission End Date", fmt(selected.admissionEnd)],
                ["Status", selected.status],
                ["Description / Notes", selected.description],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <span className="bay-detail-separator" aria-hidden="true">
                    –
                  </span>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="bay-empty">Select an academic year to view details.</p>
          )}
        </article>
        <article className="bay-card ay-form-card">
          <header>
            <div>
              <Edit3 size={18} />
              <h2>{editingId ? "Edit Academic Year" : "Add Academic Year"}</h2>
            </div>
          </header>
          <form onSubmit={save}>
            <label>
              <span>
                Academic Year Name <b>*</b>
              </span>
              <input
                value={draft.year || ""}
                onChange={(event) => update("year", event.target.value)}
                placeholder="2026–2027"
              />
            </label>
            <label>
              <span>
                Start Date <b>*</b>
              </span>
              <input
                type="date"
                value={draft.start || ""}
                onChange={(event) => update("start", event.target.value)}
              />
            </label>
            <label>
              <span>
                End Date <b>*</b>
              </span>
              <input
                type="date"
                value={draft.end || ""}
                onChange={(event) => update("end", event.target.value)}
              />
            </label>
            <label>
              <span>Admission Start Date</span>
              <input
                type="date"
                value={draft.admissionStart || ""}
                onChange={(event) => update("admissionStart", event.target.value)}
              />
            </label>
            <label>
              <span>Admission End Date</span>
              <input
                type="date"
                value={draft.admissionEnd || ""}
                onChange={(event) => update("admissionEnd", event.target.value)}
              />
            </label>
            <label className="ay-status-field">
              <span>
                Status <b>*</b>
              </span>
              <select
                value={draft.status || ""}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="">Select status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <label className="span-3">
              Description / Notes
              <textarea
                rows="3"
                value={draft.description || ""}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <div className="ay-form-actions span-3">
              <button className="cms-btn cms-btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Academic Year"}
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  setFormOpen(false);
                  setDetailsOpen(false);
                  setEditingId(selected?.id || null);
                  setDraft(selected || emptyForm);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </article>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </section>
  );
}

export default function BoardAcademicYearManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = searchParams.get("screen");
  const formOpen = screen === "form";
  const detailsOpen = screen === "details";
  const [boardRows, setBoardRows] = useState([]),
    [selected, setSelected] = useState(null),
    [form, setForm] = useState(emptyBoardForm),
    [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState(""),
    [debouncedQuery, setDebouncedQuery] = useState(""),
    [page, setPage] = useState(1),
    [boardTotalCount, setBoardTotalCount] = useState(0),
    [boardTotalPages, setBoardTotalPages] = useState(1),
    [toast, setToast] = useState("");
  const [boardListLoading, setBoardListLoading] = useState(false);
  const [boardDetailsLoading, setBoardDetailsLoading] = useState(false);
  const [boardFormDataLoading, setBoardFormDataLoading] = useState(false);
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardExporting, setBoardExporting] = useState(false);
  const [boardDeletingId, setBoardDeletingId] = useState(null);
  const [codeValidationMessage, setCodeValidationMessage] = useState("");
  const [formData, setFormData] = useState({
    countries: [],
    academicPatterns: [],
    academicLevels: [],
    gradingSystems: [],
  });
  const [states, setStates] = useState([]);
  const listRequestRef = useRef(0);
  const statesRequestRef = useRef(0);
  const boardSelectionRequestRef = useRef(0);
  const [activeTab, setActiveTab] = useState("boards");
  const indiaStates = useMemo(() => {
    const matching = states.filter((item) => INDIA_REGION_NAMES.has(optionValue(item, "stateName", "StateName")));
    const byName = new Map(matching.map((item) => [String(optionValue(item, "stateName", "StateName")).toLowerCase(), item]));
    return INDIA_REGION_ORDER.map((stateName) => {
      const apiState = byName.get(stateName.toLowerCase());
      if (apiState) return apiState;
      if (stateName === "All India") return { stateId: ALL_INDIA_STATE_ID, stateName };
      return { stateId: `frontend:${stateName}`, stateName, frontendOnly: true };
    });
  }, [states]);
  const boardAcademicLevels = useMemo(() => {
    const apiLevels = [...formData.academicLevels];
    const apiNames = new Set(apiLevels.map((item) => String(optionValue(item, "levelName", "LevelName")).trim().toLowerCase()));
    const frontendFallbacks = FRONTEND_BOARD_LEVELS
      .filter((name) => !apiNames.has(name.toLowerCase()))
      .map((name) => ({ academicLevelId: `frontend:${name}`, levelName: name, frontendOnly: true }));
    return [...apiLevels, ...frontendFallbacks].sort((a, b) => {
    const aName = optionValue(a, "levelName", "LevelName");
    const bName = optionValue(b, "levelName", "LevelName");
    const aIndex = BOARD_ACADEMIC_LEVEL_ORDER.indexOf(aName);
    const bIndex = BOARD_ACADEMIC_LEVEL_ORDER.indexOf(bName);
    if (aIndex !== bIndex) return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
    return String(aName).localeCompare(String(bName));
    });
  }, [formData.academicLevels]);
  const filtered = { length: boardTotalCount };
  const currentPage = page;
  const pages = boardTotalPages;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchBoards = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setBoardListLoading(true);
    try {
      const response = await apiClient.get(BOARD_API.list, {
        params: { Search: debouncedQuery || undefined, PageNumber: page, PageSize: PAGE_SIZE },
      });
      if (requestId !== listRequestRef.current) return;
      const envelope = unwrapPayload(response.data) ?? {};
      const items = asArray(response.data);
      setBoardRows(items.map(mapBoardListItem));
      setBoardTotalCount(Number(envelope.totalCount ?? envelope.TotalCount ?? items.length));
      setBoardTotalPages(
        Math.max(1, Number(envelope.totalPages ?? envelope.TotalPages ?? Math.ceil(items.length / PAGE_SIZE))),
      );
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      setBoardRows([]);
      setBoardTotalCount(0);
      setBoardTotalPages(1);
      setToast(getApiErrorMessage(error, "Unable to load boards."));
    } finally {
      if (requestId === listRequestRef.current) setBoardListLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    if (activeTab === "boards" && !formOpen && !detailsOpen) fetchBoards();
  }, [activeTab, detailsOpen, fetchBoards, formOpen]);

  const loadFormData = useCallback(async () => {
    if (formData.countries.length) return formData;
    setBoardFormDataLoading(true);
    try {
      let payload;
      try {
        payload = unwrapPayload((await apiClient.get(BOARD_API.formData)).data) ?? {};
      } catch (formDataError) {
        if (formDataError?.response?.status !== 404) throw formDataError;
        const [countries, academicPatterns, academicLevels, gradingSystems] = await Promise.all([
          apiClient.get(BOARD_API.countries),
          apiClient.get(BOARD_API.academicPatterns),
          apiClient.get(BOARD_API.academicLevels),
          apiClient.get(BOARD_API.gradingSystems),
        ]);
        payload = {
          countries: asArray(countries.data),
          academicPatterns: asArray(academicPatterns.data),
          academicLevels: asArray(academicLevels.data),
          gradingSystems: asArray(gradingSystems.data),
        };
      }
      const next = {
        countries: payload.countries ?? payload.Countries ?? [],
        academicPatterns: payload.academicPatterns ?? payload.AcademicPatterns ?? [],
        academicLevels: payload.academicLevels ?? payload.AcademicLevels ?? [],
        gradingSystems: payload.gradingSystems ?? payload.GradingSystems ?? [],
      };
      setFormData(next);
      return next;
    } catch (error) {
      setToast(getApiErrorMessage(error, "Unable to load Board form options."));
      return null;
    } finally {
      setBoardFormDataLoading(false);
    }
  }, [formData]);

  const loadStates = useCallback(async (countryId) => {
    const requestId = ++statesRequestRef.current;
    setStates([]);
    if (!countryId) return [];
    try {
      const response = await apiClient.get(BOARD_API.states(countryId));
      if (requestId !== statesRequestRef.current) return [];
      const values = asArray(response.data);
      setStates(values);
      return values;
    } catch (error) {
      if (requestId === statesRequestRef.current) {
        setToast(getApiErrorMessage(error, "Unable to load states."));
      }
      return [];
    }
  }, []);

  const fetchBoardDetails = useCallback(async (id, openDetails = true) => {
    setBoardDetailsLoading(true);
    try {
      const response = await apiClient.get(BOARD_API.byId(id));
      const record = mapBoardDetails(unwrapPayload(response.data));
      setSelected(record);
      if (openDetails) setSearchParams({ screen: "details", id: String(id) });
      return record;
    } catch (error) {
      setToast(getApiErrorMessage(error, "Unable to load Board details."));
      return null;
    } finally {
      setBoardDetailsLoading(false);
    }
  }, [setSearchParams]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const handleBoardNameChange = async (value) => {
    const requestId = ++boardSelectionRequestRef.current;
    const config = NORMALIZED_DEFAULT_BOARD_CONFIG[normalizeMasterName(value)];
    setCodeValidationMessage("");
    if (!config) {
      setForm((current) => ({ ...current, boardName: value }));
      return;
    }

    const masters = formData.countries.length ? formData : await loadFormData();
    if (!masters || requestId !== boardSelectionRequestRef.current) return;
    const india = masters.countries.find((item) => normalizeMasterName(optionValue(item, "countryName", "CountryName")) === "india");
    const countryId = form.countryId || optionValue(india, "countryId", "CountryId") || "";
    const availableStates = countryId ? await loadStates(countryId) : [];
    if (requestId !== boardSelectionRequestRef.current) return;

    const stateRecord = availableStates.find((item) =>
      normalizeMasterName(optionValue(item, "stateName", "StateName")) === normalizeMasterName(config.stateName),
    );
    const stateId = stateRecord
      ? optionValue(stateRecord, "stateId", "StateId")
      : (config.stateName === "All India" ? ALL_INDIA_STATE_ID : "");
    const resolvedLevels = config.academicLevelNames.map((levelName) => masters.academicLevels.find((item) =>
      normalizeMasterName(optionValue(item, "levelName", "LevelName")) === normalizeMasterName(levelName),
    )).filter(Boolean);
    setForm((current) => ({
      ...current,
      boardName: value,
      boardCode: config.boardCode,
      boardType: config.boardType,
      countryId,
      stateId,
      academicLevelIds: resolvedLevels.map((item) => optionValue(item, "academicLevelId", "AcademicLevelId")),
    }));

  };
  const startAdd = async () => {
    setEditingId(null);
    setForm(emptyBoardForm);
    setSelected(null);
    setStates([]);
    setCodeValidationMessage("");
    setSearchParams({ screen: "form", mode: "add" });
    const masters = await loadFormData();
    if (masters) {
      const india = masters.countries.find((item) =>
        String(optionValue(item, "countryName", "CountryName")).toLowerCase() === "india",
      ) ?? masters.countries[0];
      const countryId = optionValue(india, "countryId", "CountryId") ?? "";
      setForm((current) => ({
        ...current,
        countryId,
        academicPatternId: optionValue(masters.academicPatterns[0], "academicPatternId", "AcademicPatternId") ?? "",
        gradingSystemId: "",
        passPercentage: "0",
      }));
      if (countryId) await loadStates(countryId);
    }
  };
  const startEdit = async (row) => {
    const record = row.academicLevelIds ? row : await fetchBoardDetails(row.id, false);
    if (!record) return;
    await loadFormData();
    if (record.countryId) await loadStates(record.countryId);
    setEditingId(record.id);
    setForm({
      boardName: record.board,
      boardCode: record.code,
      boardType: record.type || "",
      description: record.description,
      countryId: record.countryId ?? "",
      stateId: record.stateId ?? (String(record.country).toLowerCase() === "india" ? ALL_INDIA_STATE_ID : ""),
      academicPatternId: record.academicPatternId ?? "",
      academicLevelIds: record.academicLevelIds ?? [],
      internalAssessment: record.internalAssessment,
      practicalExams: record.practicalExams,
      boardExams: record.boardExams,
      passPercentage: record.passPercentage,
      gradingSystemId: record.gradingSystemId ?? "",
      rankCalculation: record.rankCalculation,
      status: record.status === "Active" ? "Active" : "Inactive",
      rowVersion: record.rowVersion,
    });
    setSelected(record);
    setCodeValidationMessage("");
    setSearchParams({ screen: "form", mode: "edit", id: String(record.id) });
  };

  const validateBoardCode = async () => {
    const boardCode = form.boardCode.trim().toUpperCase();
    if (!boardCode) return false;
    try {
      const body = { boardCode, boardId: editingId ?? null };
      const result = unwrapPayload((await apiClient.post(BOARD_API.validateBoardCode, body)).data);
      const valid = result?.isValid ?? result?.IsValid ?? false;
      setCodeValidationMessage(valid ? "" : result?.message ?? result?.Message ?? "Board code is already in use.");
      return valid;
    } catch (error) {
      setCodeValidationMessage(getApiErrorMessage(error, "Unable to validate Board code."));
      return false;
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (boardSaving) return;
    const passPercentage = form.passPercentage === "" ? 0 : Number(form.passPercentage);
    const academicPatternId = form.academicPatternId ||
      optionValue(formData.academicPatterns[0], "academicPatternId", "AcademicPatternId") || "";
    const missingBoardFields = [
      [!form.boardName.trim(), "Board Name"],
      [!form.boardCode.trim(), "Board Code"],
      [!form.boardType, "Board Type"],
      [!form.countryId, "Country"],
      [!form.stateId, "State"],
      [!form.academicLevelIds.length, "Academic Levels"],
      [!form.gradingSystemId, "Grading System"],
      [!form.status, "Status"],
    ].filter(([missing]) => missing).map(([, label]) => label);
    if (
      missingBoardFields.length || !Number.isFinite(passPercentage) ||
      passPercentage < 0 || passPercentage > 100
    ) {
      setToast(missingBoardFields.length
        ? `Select the required field${missingBoardFields.length > 1 ? "s" : ""}: ${missingBoardFields.join(", ")}.`
        : "Enter a valid Pass Percentage between 0 and 100.");
      return;
    }
    if (!(await validateBoardCode())) return;
    const payload = {
      boardName: form.boardName.trim(),
      boardCode: form.boardCode.trim().toUpperCase(),
      description: form.description.trim() || null,
      countryId: Number(form.countryId),
      stateId: form.stateId === ALL_INDIA_STATE_ID ? null : (form.stateId ? Number(form.stateId) : null),
      academicPatternId: academicPatternId ? Number(academicPatternId) : null,
      academicLevelIds: form.academicLevelIds.map(Number),
      internalAssessment: Boolean(form.internalAssessment),
      practicalExams: Boolean(form.practicalExams),
      boardExams: Boolean(form.boardExams),
      passPercentage,
      gradingSystemId: Number(form.gradingSystemId),
      rankCalculation: Boolean(form.rankCalculation),
      status: form.status === "Active",
    };
    setBoardSaving(true);
    try {
      if (editingId) {
        const statusOnly = selected && Object.entries(payload).every(([key, value]) => {
          if (key === "status") return true;
          const comparable = {
            boardName: selected.board, boardCode: selected.code, description: selected.description || null,
            countryId: selected.countryId, stateId: selected.stateId, academicPatternId: selected.academicPatternId,
            academicLevelIds: selected.academicLevelIds, internalAssessment: selected.internalAssessment,
            practicalExams: selected.practicalExams, boardExams: selected.boardExams,
            passPercentage: Number(selected.passPercentage), gradingSystemId: selected.gradingSystemId,
            rankCalculation: selected.rankCalculation,
          }[key];
          return JSON.stringify(value) === JSON.stringify(comparable);
        });
        if (statusOnly && payload.status !== (selected.status === "Active")) {
          await apiClient.patch(BOARD_API.status(editingId), {
            status: payload.status,
            ...(form.rowVersion != null ? { rowVersion: form.rowVersion } : {}),
          });
        } else {
          await apiClient.put(BOARD_API.byId(editingId), {
            ...payload,
            ...(form.rowVersion != null ? { rowVersion: form.rowVersion } : {}),
          });
        }
        setToast("Board updated successfully.");
      } else {
        await apiClient.post(BOARD_API.create, payload);
        setToast("Board added successfully.");
        setPage(1);
      }
      setSelected(null);
      setEditingId(null);
      setForm(emptyBoardForm);
      setSearchParams({});
      await fetchBoards();
    } catch (error) {
      if (error?.response?.status === 409) {
        setToast("This Board was changed by another user. Please reload and try again.");
        if (editingId) await fetchBoardDetails(editingId, false);
      } else {
        setToast(getApiErrorMessage(error, "Unable to save Board."));
      }
    } finally {
      setBoardSaving(false);
    }
  };
  const exportBoards = async (kind) => {
    if (boardExporting) return;
    setBoardExporting(true);
    try {
      const response = await apiClient.get(
        kind === "pdf" ? BOARD_API.exportPdf : BOARD_API.exportExcel,
        {
          params: { Search: debouncedQuery || undefined },
          responseType: "blob",
        },
      );
      downloadBlob(
        response.data,
        filenameFromDisposition(
          response.headers?.["content-disposition"],
          kind === "pdf" ? "Board-Management-Report.pdf" : "Board-Management-Report.xlsx",
        ),
      );
    } catch (error) {
      setToast(getApiErrorMessage(error, `Unable to export Board ${kind.toUpperCase()}.`));
    } finally {
      setBoardExporting(false);
    }
  };
  const exportBoardsPdf = () => exportBoards("pdf");
  const exportBoardsExcel = () => exportBoards("excel");
  const deleteBoard = async (row) => {
    if (boardDeletingId || !window.confirm(`Delete ${row.board}? This action cannot be undone.`)) return;
    setBoardDeletingId(row.id);
    try {
      const detailsResponse = await apiClient.get(BOARD_API.byId(row.id));
      const currentBoard = mapBoardDetails(unwrapPayload(detailsResponse.data));
      const rowVersion = currentBoard.rowVersion ?? row.rowVersion;
      await apiClient.delete(BOARD_API.byId(row.id), {
        params: rowVersion != null ? { rowVersion } : undefined,
      });
      setToast("Board deleted successfully.");
      if (selected?.id === row.id) {
        setSelected(null);
        setSearchParams({});
      }
      const targetPage = boardRows.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      else await fetchBoards();
    } catch (error) {
      if (error?.response?.status === 404) {
        setToast("This Board no longer exists. The table has been refreshed.");
        await fetchBoards();
      } else if (error?.response?.status === 409) {
        setToast("This Board was changed by another user. Reload the page and try again.");
        await fetchBoards();
      } else {
        setToast(getApiErrorMessage(error) || "Unable to delete Board.");
      }
    } finally {
      setBoardDeletingId(null);
    }
  };
  return (
    <DashboardLayout
      title={activeTab === "academic-years" ? "Academic Year Management" : "Board Management"}
      subtitle={
        activeTab === "academic-years"
          ? "Create and manage academic years for boards and academic levels."
          : "Create and manage education boards, academic levels and status."
      }
      breadcrumb={["Academics"]}
    >
      <main className="bay-page">
        {!formOpen && !detailsOpen ? (
          <div className="bay-tabs" role="tablist" aria-label="Board and academic year sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "boards"}
              className={`bay-tab ${activeTab === "boards" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("boards");
                setPage(1);
              }}
            >
              Board Management
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "academic-years"}
              className={`bay-tab ${activeTab === "academic-years" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("academic-years");
                setPage(1);
              }}
            >
              Academic Year
            </button>
          </div>
        ) : null}
        {!formOpen && !detailsOpen && activeTab === "academic-years" ? (
          <AcademicYearWorkspace />
        ) : null}
        {!formOpen && !detailsOpen && activeTab === "boards" ? (
          <section className="bay-card bay-board-list-card">
            <div className="bay-toolbar">
              <label className="bay-search">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search board name, board code, board type, state, academic levels..."
                />
              </label>
              <div className="bay-toolbar-actions">
                <ExportDropdown
                  onPdf={exportBoardsPdf}
                  onExcel={exportBoardsExcel}
                  disabled={boardExporting}
                />
                <button className="cms-btn cms-btn-primary" onClick={startAdd} disabled={boardFormDataLoading}>
                  <Plus size={16} /> Add Board
                </button>
              </div>
            </div>
            <div className="bay-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Board Name</th>
                    <th>Board Code</th>
                    <th>Board Type</th>
                    <th>State</th>
                    <th>Academic Levels</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boardListLoading ? (
                    <tr><td colSpan="7" className="bay-empty">Loading boards...</td></tr>
                  ) : boardRows.length ? boardRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.board}</strong>
                      </td>
                      <td>{row.code}</td>
                      <td>{row.type || "—"}</td>
                      <td>{row.state || "—"}</td>
                      <td>{row.level || "—"}</td>
                      <td>
                        <span className={`bay-status ${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="bay-actions">
                          <button
                            type="button"
                            className="bay-action-view"
                            aria-label={`View ${row.board}`}
                            title="View configuration"
                            onClick={() => fetchBoardDetails(row.id)}
                          >
                            <Eye />
                          </button>
                          <button
                            type="button"
                            className="bay-action-delete"
                            aria-label={`Delete ${row.board}`}
                            title="Delete Board"
                            disabled={boardDeletingId === row.id}
                            onClick={() => deleteBoard(row)}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="bay-empty">No boards available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer>
              <span>
                Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </span>
              <nav aria-label="Configuration pagination">
                <button
                  className="bay-page-direction"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Prev
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    className={p === currentPage ? "active" : ""}
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="bay-page-direction"
                  disabled={currentPage === pages}
                  onClick={() => setPage((value) => Math.min(pages, value + 1))}
                >
                  Next
                </button>
              </nav>
            </footer>
          </section>
        ) : null}
        {formOpen || detailsOpen ? (
          <section className="bay-bottom">
            <button
              type="button"
              className="cms-back-link bay-back-link"
              onClick={() => setSearchParams({})}
            >
              <ArrowLeft size={15} /> Back to Board Management
            </button>
            {detailsOpen ? (
              <article className="bay-card bay-details">
                <header>
                  <div>
                    <Eye size={17} />
                    <h2>Configuration Details</h2>
                  </div>
                  <div className="bay-details-actions">
                    {selected ? (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost bay-details-edit"
                        onClick={() => startEdit(selected)}
                      >
                        <Edit3 size={16} /> Edit Configuration
                      </button>
                    ) : null}
                  </div>
                </header>
                {boardDetailsLoading ? (
                  <p className="bay-empty">Loading Board details...</p>
                ) : selected ? (
                  <dl>
                    {[
                      ["Board Name", selected.board],
                      ["Board Code", selected.code],
                      ["Board Type", selected.type],
                      ["State", selected.state],
                      ["Academic Levels", selected.level],
                      ["Grading System", selected.gradingSystem],
                      ["Status", selected.status],
                      ["Description / Notes", selected.description],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <span className="bay-detail-separator" aria-hidden="true">
                          –
                        </span>
                        <dd>{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="bay-empty">Select a configuration to view details.</p>
                )}
              </article>
            ) : (
              <article className="bay-card bay-form">
                <header>
                  <div>
                    <Edit3 size={17} />
                    <h2>{editingId ? "Edit Board" : "Add Board"}</h2>
                  </div>
                </header>
                <form onSubmit={save}>
                  <label className="span-2">
                    <span>
                      Board Name <b>*</b>
                    </span>
                    <SearchableApiSelect
                      value={form.boardName}
                      options={BOARD_NAME_OPTIONS.some((item) => item.boardName === form.boardName) || !form.boardName
                        ? BOARD_NAME_OPTIONS
                        : [...BOARD_NAME_OPTIONS, { boardName: form.boardName }]}
                      idKey="boardName"
                      nameKey="boardName"
                      placeholder="Search board name"
                      onChange={handleBoardNameChange}
                    />
                  </label>
                  <label>
                    <span>
                      Board Code <b>*</b>
                    </span>
                    <input
                      value={form.boardCode}
                      placeholder="Enter Board Code"
                      onChange={(e) => update("boardCode", e.target.value.toUpperCase())}
                      onBlur={validateBoardCode}
                    />
                    {codeValidationMessage ? <small className="bay-field-error">{codeValidationMessage}</small> : null}
                  </label>
                  <label>
                    <span>
                      Board Type <b>*</b>
                    </span>
                    <select value={form.boardType} onChange={(e) => update("boardType", e.target.value)}>
                      <option value="">Select type</option>
                      <option>State Board</option>
                      <option>Central Board</option>
                      <option>National / Central Board</option>
                      <option>Open Board</option>
                      <option>International Board</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      State <b>*</b>
                    </span>
                    <SearchableApiSelect
                      value={form.stateId}
                      options={indiaStates}
                      idKey="stateId"
                      nameKey="stateName"
                      placeholder="Search state"
                      onChange={(value) => update("stateId", value)}
                    />
                  </label>
                  <label>
                    <span>Academic Levels <b>*</b></span>
                    <ApiLevelMultiSelect
                      value={form.academicLevelIds}
                      options={boardAcademicLevels}
                      onChange={(value) => update("academicLevelIds", value)}
                    />
                  </label>
                  <label>
                    <span>Grading System <b>*</b></span>
                    <select
                      value={form.gradingSystemId}
                      disabled={boardFormDataLoading}
                      onChange={(e) => update("gradingSystemId", e.target.value)}
                    >
                      <option value="">Select grading system</option>
                      {formData.gradingSystems.map((item) => (
                        <option
                          key={optionValue(item, "gradingSystemId", "GradingSystemId")}
                          value={optionValue(item, "gradingSystemId", "GradingSystemId")}
                        >
                          {optionValue(item, "gradingSystemName", "GradingSystemName")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bay-board-status-field">
                    <span>
                      Status <b>*</b>
                    </span>
                    <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                      <option value="">Select Status</option>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </label>
                  <label className="span-4">
                    Description / Notes
                    <textarea
                      rows="3"
                      value={form.description}
                      placeholder="Enter Description / Notes"
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </label>
                  <div className="bay-form-actions span-4">
                    <button className="cms-btn cms-btn-primary" disabled={boardSaving || boardFormDataLoading}>
                      <Save size={17} /> {boardSaving ? "Saving..." : "Save Board"}
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => {
                        setForm(emptyBoardForm);
                        setEditingId(selected?.id || null);
                        setSearchParams({});
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </article>
            )}
          </section>
        ) : null}
        <Toast message={toast} onClose={() => setToast("")} />
      </main>
    </DashboardLayout>
  );
}
