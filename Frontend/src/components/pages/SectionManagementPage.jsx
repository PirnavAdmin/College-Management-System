import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Plus,
  Search,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Building2,
  Layers,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "../layout/DashboardLayout";
import "./SectionManagementPage.css";

const PAGE_SIZE = 5;
const BULK_ROOM_PAGE_SIZE = 5;
const normalizeId = (value) => String(value ?? "");
const isActiveRecord = (item) =>
  item?.isActive === true ||
  item?.status === true ||
  String(item?.status ?? "").toLowerCase() === "active" ||
  String(item?.status ?? "").toLowerCase() === "true";

const unwrapList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "items", "records", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeBoard = (item) => ({
  ...item,
  id: normalizeId(item.boardId ?? item.id),
  name: item.boardName ?? item.name ?? "",
  code: item.boardCode ?? item.code ?? "",
  academicLevelIds: Array.isArray(item.academicLevelIds) ? item.academicLevelIds : [],
  academicLevelNames: Array.isArray(item.academicLevelNames)
    ? item.academicLevelNames
    : Array.isArray(item.academicLevels)
      ? item.academicLevels
      : [],
  isActive: isActiveRecord(item),
});

const normalizeYear = (item) => ({
  ...item,
  id: normalizeId(item.academicYearId ?? item.id),
  boardId: normalizeId(item.boardId),
  name: item.academicYearName ?? item.name ?? "",
  isActive: isActiveRecord(item),
});

const normalizeLevel = (item) => ({
  ...item,
  id: normalizeId(item.academicLevelId ?? item.id),
  name: item.academicLevelName ?? item.levelName ?? item.yearOfStudy ?? item.name ?? "",
  isActive: isActiveRecord(item),
});

const normalizeGroup = (item) => ({
  ...item,
  id: normalizeId(item.groupId ?? item.id),
  boardId: normalizeId(item.boardId),
  academicYearId: normalizeId(item.academicYearId),
  academicLevelId: normalizeId(item.academicLevelId),
  name: item.groupName ?? item.name ?? "",
  code: item.groupCode ?? item.code ?? "",
  isActive: isActiveRecord(item),
});

const normalizeProgram = (item) => ({
  ...item,
  id: normalizeId(item.programId ?? item.id),
  programId: normalizeId(item.programId ?? item.id),
  groupProgramId: normalizeId(item.groupProgramId ?? item.programId ?? item.id),
  groupId: normalizeId(item.groupId),
  name: item.programName ?? item.name ?? "",
  code: item.programCode ?? item.code ?? "",
  isActive: isActiveRecord(item),
});

const normalizeTeacher = (item) => ({
  ...item,
  id: normalizeId(item.staffId ?? item.facultyId ?? item.id ?? item.userId ?? (Number.isFinite(Number(item.employeeId)) ? item.employeeId : "")),
  name: item.staffName ?? item.facultyName ?? item.fullName ?? item.name ?? item.employeeName ?? "",
  employeeId: item.employeeId ?? item.employeeCode ?? "",
  isActive: (item.isActive !== undefined || item.status !== undefined) ? isActiveRecord(item) : true,
  staffType: item.staffType ?? item.type ?? "Teaching",
});

const normalizeRoom = (item) => ({
  ...item,
  id: normalizeId(item.roomId ?? item.id),
  roomNo: item.roomNumber ?? item.roomNo ?? item.roomCode ?? item.name ?? "",
  capacity: item.capacity ?? 0,
  roomType: item.roomType ?? "",
  building: item.buildingName ?? item.blockName ?? item.building ?? item.block ?? "",
  floor: item.floor ?? "",
  isActive: isActiveRecord(item),
  status: isActiveRecord(item) ? "Active" : "Inactive",
});

const normalizeSection = (item) => ({
  ...item,
  id: normalizeId(item.sectionId ?? item.id),
  boardId: normalizeId(item.boardId),
  board: item.boardName ?? item.board ?? "",
  boardCode: item.boardCode ?? "",
  academicYearId: normalizeId(item.academicYearId),
  academicYear: item.academicYearName ?? item.academicYear ?? "",
  academicLevelId: normalizeId(item.academicLevelId),
  academicLevel: item.academicLevelName ?? item.academicLevel ?? item.levelName ?? item.yearOfStudy ?? "",
  groupId: normalizeId(item.groupId),
  group: item.groupName ?? item.group ?? "",
  groupProgramId: normalizeId(item.groupProgramId),
  programId: normalizeId(item.programId),
  program: item.programName ?? item.program ?? item.programme ?? "",
  name: item.sectionName ?? item.name ?? "",
  roomId: normalizeId(item.roomId),
  roomNo: item.roomNumber ?? item.roomName ?? item.room ?? "",
  classTeacherId: normalizeId(item.inchargeId ?? item.classTeacherId ?? item.teacherId ?? item.facultyId),
  teacher: item.inchargeName ?? item.classTeacherName ?? item.facultyName ?? item.teacher ?? item.incharge ?? "",
  strength: item.maximumStrength ?? item.strength ?? item.capacity ?? 0,
  isActive: isActiveRecord(item),
  status: isActiveRecord(item) ? "Active" : "Inactive",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const ROOM_ENDPOINTS = {
  create: "/api/v1/rooms",
  update: (id) => `/api/v1/rooms/${id}`,
  delete: (id) => `/api/v1/rooms/${id}`,
  bulk: "/api/v1/rooms/bulk",
};
const SECTION_BULK_ENDPOINT = "/api/v1/Sections/bulk";

const sectionPayload = (form, context = form) => {
  const program = context.program;
  const teacherId = form.classTeacherId ? Number(form.classTeacherId) : null;
  const groupProgramId = program?.groupProgramId
    ? Number(program.groupProgramId)
    : context.groupProgramId
      ? Number(context.groupProgramId)
      : null;
  return {
    boardId: Number(context.boardId),
    academicYearId: Number(context.academicYearId),
    academicLevelId: Number(context.academicLevelId),
    groupId: Number(context.groupId),
    groupProgramId: groupProgramId,
    programId: Number(program?.programId ?? context.programId),
    sectionName: form.name.trim(),
    name: form.name.trim(),
    roomId: Number(form.roomId),
    inchargeId: teacherId,
    classTeacherId: teacherId,
    teacherId: teacherId,
    maximumStrength: Number(form.strength),
    strength: Number(form.strength),
    isActive: form.status === "Active",
    status: form.status,
  };
};

const roomPayload = (form) => ({
  roomNumber: form.roomNo.trim(),
  roomNo: form.roomNo.trim(),
  capacity: Number(form.capacity),
  roomType: form.roomType,
  building: form.building.trim(),
  floor: String(form.floor).trim(),
  isActive: form.isActive === "Active",
});

const sanitizeExcelCell = (value) => {
  if (typeof value !== "string") return Number.isNaN(value) ? 0 : value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
};

const getRoomAllocationDetails = (rooms, sections) =>
  rooms.map((room) => {
    const section = sections.find(
      (item) => item.status === "Active" && normalizeId(item.roomId) === normalizeId(room.id)
    );
    const eligible = room.isActive && room.roomType === "Classroom";
    return {
      room,
      section,
      allocationStatus: !room.isActive
        ? "Inactive"
        : room.roomType !== "Classroom"
          ? "Not Eligible for Section"
          : section
            ? "Allocated"
            : "Available",
      remainingCapacity: eligible ? Math.max(0, Number(room.capacity || 0) - Number(section?.strength || 0)) : 0,
    };
  });

const buildFeasibilitySummaryRows = (rooms, sections) => {
  const details = getRoomAllocationDetails(rooms, sections);
  const activeClassrooms = details.filter((item) => item.room.isActive && item.room.roomType === "Classroom");
  const allocated = activeClassrooms.filter((item) => item.section);
  const available = activeClassrooms.filter((item) => !item.section);
  const sumCapacity = (items) => items.reduce((sum, item) => sum + Number(item.room.capacity || 0), 0);
  const rows = [
    ["Total Rooms", rooms.length, sumCapacity(details)],
    ["Active Rooms", details.filter((item) => item.room.isActive).length, sumCapacity(details.filter((item) => item.room.isActive))],
    ["Active Classrooms", activeClassrooms.length, sumCapacity(activeClassrooms)],
    ["Allocated Active Classrooms", allocated.length, sumCapacity(allocated)],
    ["Available Active Classrooms", available.length, sumCapacity(available)],
    ["Inactive Rooms", details.filter((item) => !item.room.isActive).length, sumCapacity(details.filter((item) => !item.room.isActive))],
    ["Total Active Classroom Capacity", activeClassrooms.length, sumCapacity(activeClassrooms)],
    ["Allocated Section Strength", allocated.length, allocated.reduce((sum, item) => sum + Number(item.section?.strength || 0), 0)],
    ["Remaining Available Classroom Capacity", available.length, sumCapacity(available)],
  ];
  return rows.map(([Metric, Count, total]) => ({ Metric, Count, "Total Capacity": total }));
};

const buildRoomAvailabilityRows = (rooms, sections, resolveSection) =>
  getRoomAllocationDetails(rooms, sections).map((item, index) => {
    const detail = item.section ? resolveSection(item.section) : null;
    return {
      "S.No": index + 1,
      "Room No": sanitizeExcelCell(item.room.roomNo),
      Building: sanitizeExcelCell(item.room.building),
      Floor: sanitizeExcelCell(item.room.floor),
      "Room Type": sanitizeExcelCell(item.room.roomType),
      "Room Capacity": Number(item.room.capacity || 0),
      "Room Status": item.room.isActive ? "Active" : "Inactive",
      "Allocation Status": item.allocationStatus,
      "Allocated Section": sanitizeExcelCell(item.section?.name || "—"),
      Group: sanitizeExcelCell(detail?.groupName || "—"),
      Program: sanitizeExcelCell(detail?.programName || "—"),
      "Academic Level": sanitizeExcelCell(detail?.academicLevelName || "—"),
      "Section Strength": Number(item.section?.strength || 0),
      "Remaining Capacity": item.remainingCapacity,
    };
  });

const buildSectionAllocationRows = (sections, rooms, resolveSection) =>
  sections.map((section, index) => {
    const detail = resolveSection(section);
    const room = rooms.find((item) => normalizeId(item.id) === normalizeId(section.roomId));
    return {
      "S.No": index + 1,
      "Section Name": sanitizeExcelCell(section.name),
      Board: sanitizeExcelCell(detail.boardName),
      "Board Code": sanitizeExcelCell(detail.boardCode),
      "Academic Year": sanitizeExcelCell(detail.academicYearName),
      Group: sanitizeExcelCell(detail.groupName),
      Program: sanitizeExcelCell(detail.programName),
      "Academic Level": sanitizeExcelCell(detail.academicLevelName),
      "Room No": sanitizeExcelCell(detail.roomNo),
      "Room Capacity": Number(room?.capacity || 0),
      "Section Strength": Number(section.strength || 0),
      "Remaining Room Capacity": Math.max(0, Number(room?.capacity || 0) - Number(section.strength || 0)),
      Incharge: sanitizeExcelCell(detail.teacherName),
      "Section Status": section.status,
      "Created At": sanitizeExcelCell(section.createdAt || "—"),
      "Updated At": sanitizeExcelCell(section.updatedAt || "—"),
    };
  });

const autoSizeSheet = (sheet, rows) => {
  const keys = Object.keys(rows[0] || {});
  sheet["!cols"] = keys.map((key) => ({
    wch: Math.min(36, Math.max(key.length + 2, ...rows.map((row) => String(row[key] ?? "").length + 2))),
  }));
};

const downloadAllocationWorkbook = (rooms, sections, resolveSection) => {
  const workbook = XLSX.utils.book_new();
  const datasets = [
    ["Feasibility Summary", buildFeasibilitySummaryRows(rooms, sections)],
    ["Room Availability", buildRoomAvailabilityRows(rooms, sections, resolveSection)],
    ["Section Allocations", buildSectionAllocationRows(sections, rooms, resolveSection)],
  ];
  datasets.forEach(([name, rows]) => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    autoSizeSheet(sheet, rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `Section_Room_Allocation_Feasibility_${date}.xlsx`);
};

// ---------- DATASETS ----------
const ROOM_TYPES = [
  "Classroom",
  "Laboratory",
  "Computer Lab",
  "Seminar Hall",
  "Library",
  "Examination Hall",
  "Staff Room",
  "Other",
];

const EMPTY_BULK_ROOM_FORM = {
  building: "",
  floor: "",
  startRoomNo: "",
  roomCount: "",
  defaultCapacity: "",
  defaultRoomType: "",
  isActive: "Active",
};

const parseRoomNumberSequence = (value) => {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  return match ? { prefix: match[1], start: Number(match[2]), padding: match[2].length } : null;
};

const generateRoomNumbers = (startRoomNo, count) => {
  const sequence = parseRoomNumberSequence(startRoomNo);
  if (!sequence || !Number.isInteger(count) || count < 1 || count > 100) return [];
  return Array.from({ length: count }, (_, index) => `${sequence.prefix}${String(sequence.start + index).padStart(sequence.padding, "0")}`);
};

const reconcileBulkRoomAllocations = (current, form) =>
  generateRoomNumbers(form.startRoomNo, Number(form.roomCount)).map((roomNo, index) => ({
    key: current[index]?.key || `bulk-room-${index + 1}`,
    roomNo,
    capacity: current[index]?.capacity || String(form.defaultCapacity || ""),
    roomType: current[index]?.roomType || form.defaultRoomType || "",
  }));

const validateBulkRoomAllocations = (allocations, rooms, expectedCount) => {
  const errors = {};
  const seen = new Set();
  const existing = new Set(rooms.map((room) => room.roomNo.trim().toLowerCase()));
  if (allocations.length !== expectedCount) errors.bulk = "Prepare all Room Allocation Preview rows before creating Rooms.";
  allocations.forEach((allocation, index) => {
    const roomNo = allocation.roomNo.trim();
    const normalizedRoomNo = roomNo.toLowerCase();
    const capacity = Number(allocation.capacity);
    if (!parseRoomNumberSequence(roomNo)) errors[`bulk_roomNo_${index}`] = "Generated Room Number is invalid.";
    else if (seen.has(normalizedRoomNo)) errors[`bulk_roomNo_${index}`] = "Duplicate Room Number in preview.";
    else if (existing.has(normalizedRoomNo)) errors[`bulk_roomNo_${index}`] = `Room No "${roomNo}" already exists.`;
    seen.add(normalizedRoomNo);
    if (!String(allocation.capacity).trim() || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) errors[`bulk_capacity_${index}`] = "Capacity must be an integer from 1 to 1000.";
    if (!ROOM_TYPES.includes(allocation.roomType)) errors[`bulk_roomType_${index}`] = "Room Type is required.";
  });
  return errors;
};

const calculateBulkRoomFeasibility = (allocations, requested) => {
  const valid = allocations.filter(
    (row) =>
      parseRoomNumberSequence(row.roomNo) &&
      Number.isInteger(Number(row.capacity)) &&
      Number(row.capacity) > 0 &&
      Number(row.capacity) <= 1000 &&
      ROOM_TYPES.includes(row.roomType)
  );
  const countType = (type) => allocations.filter((row) => row.roomType === type).length;
  const summarized = ["Classroom", "Library", "Laboratory", "Computer Lab"];
  return {
    requested: Number.isInteger(Number(requested)) ? Number(requested) : 0,
    configured: valid.length,
    totalCapacity: valid.reduce((sum, row) => sum + Number(row.capacity), 0),
    classroom: countType("Classroom"),
    library: countType("Library"),
    laboratory: countType("Laboratory"),
    computerLab: countType("Computer Lab"),
    other: allocations.filter((row) => row.roomType && !summarized.includes(row.roomType)).length,
    incomplete: allocations.length - valid.length,
  };
};

let searchableSelectCounter = 0;

export const pageConfig = {
  title: "Section Management",
  subtitle: "Manage academic sections, classrooms and teacher assignments.",
  breadcrumb: ["Academics"],
};

// ---------- CUSTOM SEARCHABLE SELECT DROPDOWN ----------
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  emptyText = "No matching options",
  showSearch = true,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxId = useRef(`section-select-${++searchableSelectCounter}`).current;

  const normalizedOptions = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "object" && opt !== null
        ? { value: String(opt.value), label: String(opt.label) }
        : { value: String(opt), label: String(opt) }
    );
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === String(value));
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length ? 0 : -1);
  }, [filteredOptions]);

  const handleKeyboard = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (!filteredOptions.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((current) => (current + step + filteredOptions.length) % filteredOptions.length);
    } else if (event.key === "Enter" && open && highlightedIndex >= 0) {
      event.preventDefault();
      onChange(filteredOptions[highlightedIndex].value);
      setOpen(false);
      setSearchQuery("");
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`cms-searchable-select ${disabled ? "is-disabled" : ""} ${open ? "is-open" : ""} ${hasError ? "has-error" : ""}`}
    >
      <button
        type="button"
        className="cms-searchable-select-trigger"
        role="combobox"
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onKeyDown={handleKeyboard}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            setSearchQuery("");
          }
        }}
      >
        <span className="cms-searchable-select-label" title={selectedOption?.label || ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="cms-select-arrow" />
      </button>
      {open && (
        <div className="cms-searchable-select-menu">
          {showSearch && (
            <div className="cms-searchable-select-search">
              <Search size={14} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyboard}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cms-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <div className="cms-searchable-select-options" id={listboxId} role="listbox">
            <button
              type="button"
              className={`cms-select-option ${!value ? "is-selected" : ""}`}
              role="option"
              aria-selected={!value}
              title={placeholder}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cms-select-option ${String(value) === opt.value ? "is-selected" : ""} ${highlightedIndex === index ? "is-highlighted" : ""}`}
                  role="option"
                  aria-selected={String(value) === opt.value}
                  title={opt.label}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="cms-select-empty">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BulkRoomAllocationPreview({ allocations, requested, errors, onChange, page, setPage }) {
  const summary = calculateBulkRoomFeasibility(allocations, requested);
  if (!allocations.length) return null;
  const totalPages = Math.max(1, Math.ceil(allocations.length / BULK_ROOM_PAGE_SIZE));
  const start = (page - 1) * BULK_ROOM_PAGE_SIZE;
  const shownAllocations = allocations.slice(start, start + BULK_ROOM_PAGE_SIZE);
  return (
    <section className="cms-bulk-room-preview">
      <div className="cms-bulk-room-preview-head">
        <strong>Room Allocation Preview ({allocations.length})</strong>
      </div>
      <div className="cms-bulk-room-summary">
        <span>Rooms Requested <strong>{summary.requested}</strong></span>
        <span>Rooms Configured <strong>{summary.configured}</strong></span>
        <span>Total Planned Capacity <strong>{summary.totalCapacity}</strong></span>
        <span>Classrooms <strong>{summary.classroom}</strong></span>
        <span>Libraries <strong>{summary.library}</strong></span>
        <span>Laboratories <strong>{summary.laboratory}</strong></span>
        <span>Computer Labs <strong>{summary.computerLab}</strong></span>
        <span>Other Types <strong>{summary.other}</strong></span>
        <span>Invalid / Incomplete <strong>{summary.incomplete}</strong></span>
      </div>
      <div className="cms-bulk-room-allocation-list">
        {shownAllocations.map((allocation, pageIndex) => {
          const originalIndex = start + pageIndex;
          return (
            <div className="cms-bulk-room-allocation-row" key={allocation.key}>
              <span className="cms-bulk-room-index">{originalIndex + 1}</span>
              <div className="cms-field">
                <label>Room Number</label>
                <input value={allocation.roomNo} readOnly title={allocation.roomNo} />
                {errors[`bulk_roomNo_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_roomNo_${originalIndex}`]}</span>}
              </div>
              <div className="cms-field">
                <label>Capacity *</label>
                <input type="number" min="1" max="1000" step="1" value={allocation.capacity} placeholder="e.g. 40" onChange={(event) => onChange(originalIndex, "capacity", event.target.value)} />
                {errors[`bulk_capacity_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_capacity_${originalIndex}`]}</span>}
              </div>
              <div className="cms-field">
                <label>Room Type *</label>
                <SearchableSelect value={allocation.roomType} onChange={(value) => onChange(originalIndex, "roomType", value)} options={ROOM_TYPES} placeholder="Select Room Type" showSearch={true} hasError={Boolean(errors[`bulk_roomType_${originalIndex}`])} />
                {errors[`bulk_roomType_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_roomType_${originalIndex}`]}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cms-bulk-room-pagination">
        <span>Showing {start + 1}–{Math.min(start + BULK_ROOM_PAGE_SIZE, allocations.length)} of {allocations.length} rooms</span>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <strong>{page} / {totalPages}</strong>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
    </section>
  );
}

export default function SectionManagementPage() {
  // First Tab is Room Management ("rooms"), Second Tab is Section Management ("sections")
  const [activeTab, setActiveTab] = useState("rooms");

  const [boardsList, setBoardsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sections, setSections] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dependentLoading, setDependentLoading] = useState({ board: false, program: false });
  const [operation, setOperation] = useState("");
  const boardRequestRef = useRef(0);
  const programRequestRef = useRef(0);
  const createdSectionIdsRef = useRef(new Set());
  const createdRoomIdsRef = useRef(new Set());

  // Filter & Search state for tables
  const [filters, setFilters] = useState({ groupId: "", programId: "", academicLevelId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [roomFilters, setRoomFilters] = useState({ building: "", floor: "", roomType: "" });
  const [roomSearch, setRoomSearch] = useState("");
  const [roomPage, setRoomPage] = useState(1);

  // Screen View state replacing modals
  const [sectionView, setSectionView] = useState("list");
  const [sectionFormMode, setSectionFormMode] = useState("add");
  const [sectionCreationType, setSectionCreationType] = useState("single");

  const [roomView, setRoomView] = useState("list");
  const [roomFormMode, setRoomFormMode] = useState("add");
  const [roomCreationType, setRoomCreationType] = useState("single");

  // Form Data state: STATUS IS MANUAL ENTRY (STARTS EMPTY "")
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    boardId: "",
    academicYearId: "",
    groupId: "",
    programId: "",
    groupProgramId: "",
    academicLevelId: "",
    name: "",
    roomId: "",
    classTeacherId: "",
    strength: "",
    status: "Active",
  });
  const [bulkSections, setBulkSections] = useState([
    { name: "", roomId: "", classTeacherId: "", strength: "", status: "Active" },
  ]);

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNo: "",
    capacity: "",
    roomType: "",
    building: "",
    floor: "",
    isActive: "Active",
  });

  const [bulkRoomForm, setBulkRoomForm] = useState(EMPTY_BULK_ROOM_FORM);
  const [bulkRoomAllocations, setBulkRoomAllocations] = useState([]);
  const [bulkRoomPage, setBulkRoomPage] = useState(1);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(bulkRoomAllocations.length / BULK_ROOM_PAGE_SIZE));
    setBulkRoomPage((current) => Math.min(current, totalPages));
  }, [bulkRoomAllocations.length]);

  // Inline Validation Field Errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [roomFieldErrors, setRoomFieldErrors] = useState({});

  // UI Toast feedback
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const say = useCallback((message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3200);
  }, []);

  const loadRooms = useCallback(async () => {
    const response = await apiClient.get(apiEndpoints.rooms.getAll);
    const next = unwrapList(response).map(normalizeRoom);
    next.sort((a, b) => {
      const aNew = createdRoomIdsRef.current.has(normalizeId(a.id)) || createdRoomIdsRef.current.has(a.roomNo.trim().toLowerCase());
      const bNew = createdRoomIdsRef.current.has(normalizeId(b.id)) || createdRoomIdsRef.current.has(b.roomNo.trim().toLowerCase());
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
      return 0;
    });
    setRooms(next);
    return next;
  }, []);

  const loadSections = useCallback(async () => {
    const response = await apiClient.get(apiEndpoints.sections.getAll);
    const next = unwrapList(response).map(normalizeSection);
    next.sort((a, b) => {
      const aNew = createdSectionIdsRef.current.has(normalizeId(a.id)) || createdSectionIdsRef.current.has(a.name.trim().toLowerCase());
      const bNew = createdSectionIdsRef.current.has(normalizeId(b.id)) || createdSectionIdsRef.current.has(b.name.trim().toLowerCase());
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
      return 0;
    });
    setSections(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.getAll, { params: { isActive: true } }),
      apiClient.get(apiEndpoints.rooms.getAll),
      apiClient.get(apiEndpoints.sections.getAll),
      apiClient.get("/api/v1/staff/dropdown", { params: { staffType: "Teaching" } }),
    ]).then((results) => {
      if (!active) return;
      const [boardsResult, roomsResult, sectionsResult, staffResult] = results;
      if (boardsResult.status === "fulfilled") {
        setBoardsList(unwrapList(boardsResult.value).map(normalizeBoard).filter((item) => item.isActive));
      }
      if (roomsResult.status === "fulfilled") {
        const fetchedRooms = unwrapList(roomsResult.value).map(normalizeRoom);
        fetchedRooms.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
          return 0;
        });
        setRooms(fetchedRooms);
      }
      if (sectionsResult.status === "fulfilled") {
        const fetchedSections = unwrapList(sectionsResult.value).map(normalizeSection);
        fetchedSections.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
          return 0;
        });
        setSections(fetchedSections);
      }
      if (staffResult.status === "fulfilled") {
        const staffData = unwrapList(staffResult.value).map(normalizeTeacher);
        const teachingStaff = staffData.filter(
          (item) => item.isActive && String(item.staffType || "Teaching").toLowerCase() === "teaching"
        );
        setTeachersList(teachingStaff.length > 0 ? teachingStaff : staffData);
      }
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected) say(getApiErrorMessage(rejected.reason) || "Some Section Management data could not be loaded.");
    }).finally(() => { if (active) setInitialLoading(false); });
    return () => { active = false; if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [say]);

  const loadPrograms = useCallback(async (groupId) => {
    const requestId = ++programRequestRef.current;
    setProgramsList([]);
    if (!groupId) return;
    setDependentLoading((current) => ({ ...current, program: true }));
    try {
      const response = await apiClient.get(apiEndpoints.groups.getPrograms(groupId));
      if (requestId === programRequestRef.current) {
        setProgramsList(
          unwrapList(response)
            .map((item) => normalizeProgram({ ...item, groupId: item.groupId || groupId }))
            .filter((item) => item.isActive)
        );
      }
    } catch (error) {
      if (requestId === programRequestRef.current) say(getApiErrorMessage(error));
    } finally {
      if (requestId === programRequestRef.current) setDependentLoading((current) => ({ ...current, program: false }));
    }
  }, [say]);

  const loadBoardDependencies = useCallback(async (boardId, preserve = {}) => {
    const requestId = ++boardRequestRef.current;
    setAcademicYearsList([]);
    setAcademicLevelsList([]);
    setGroupsList([]);
    setProgramsList([]);
    if (!boardId) return;
    setDependentLoading((current) => ({ ...current, board: true }));

    const selectedBoard = boardsList.find((b) => normalizeId(b.id) === normalizeId(boardId));
    let embeddedLevels = [];
    if (selectedBoard?.academicLevelIds?.length) {
      embeddedLevels = selectedBoard.academicLevelIds.map((id, idx) => ({
        id: normalizeId(id),
        name: selectedBoard.academicLevelNames?.[idx] || `Academic Level ${id}`,
        isActive: true,
      }));
    }

    try {
      const [yearsResponse, levelsResponse, groupsResponse] = await Promise.allSettled([
        apiClient.get(apiEndpoints.academicYears.active, { params: { boardId, isActive: true } }),
        apiClient.get(`/api/v1/boards/${encodeURIComponent(boardId)}/academic-levels`),
        apiClient.get(apiEndpoints.groups.getByBoard(boardId)),
      ]);

      if (requestId !== boardRequestRef.current) return;

      if (yearsResponse.status === "fulfilled") {
        const nextYears = unwrapList(yearsResponse.value)
          .map(normalizeYear)
          .filter((year) => year.isActive)
          .filter((year) => !year.boardId || normalizeId(year.boardId) === normalizeId(boardId));
        setAcademicYearsList(nextYears);
      }

      let fetchedLevels = [];
      if (levelsResponse.status === "fulfilled") {
        fetchedLevels = unwrapList(levelsResponse.value).map(normalizeLevel).filter((item) => item.isActive);
      }

      const levelMap = new Map();
      fetchedLevels.forEach((lvl) => levelMap.set(normalizeId(lvl.id), lvl));
      embeddedLevels.forEach((lvl) => {
        if (!levelMap.has(normalizeId(lvl.id))) {
          levelMap.set(normalizeId(lvl.id), lvl);
        }
      });
      setAcademicLevelsList(Array.from(levelMap.values()));

      let nextGroups = [];
      if (groupsResponse.status === "fulfilled") {
        nextGroups = unwrapList(groupsResponse.value)
          .map(normalizeGroup)
          .filter((group) => group.isActive)
          .filter((group) => !group.boardId || normalizeId(group.boardId) === normalizeId(boardId));
        setGroupsList(nextGroups);
      }

      if (preserve.groupId) {
        const groupStillBelongsToBoard = nextGroups.some((g) => normalizeId(g.id) === normalizeId(preserve.groupId));
        if (groupStillBelongsToBoard) {
          await loadPrograms(preserve.groupId);
        }
      }
    } catch (error) {
      if (requestId === boardRequestRef.current) say(getApiErrorMessage(error));
    } finally {
      if (requestId === boardRequestRef.current) setDependentLoading((current) => ({ ...current, board: false }));
    }
  }, [boardsList, say, loadPrograms]);

  // Lookup maps
  const boardsById = useMemo(() => new Map(boardsList.map((b) => [String(b.id), b])), [boardsList]);
  const yearsById = useMemo(() => new Map(academicYearsList.map((y) => [String(y.id), y])), [academicYearsList]);
  const levelsById = useMemo(() => new Map(academicLevelsList.map((l) => [String(l.id), l])), [academicLevelsList]);
  const groupsById = useMemo(() => new Map(groupsList.map((g) => [String(g.id), g])), [groupsList]);
  const programsById = useMemo(() => new Map(programsList.map((p) => [String(p.programId), p])), [programsList]);
  const roomsById = useMemo(() => new Map(rooms.map((r) => [String(r.id), r])), [rooms]);
  const teachersById = useMemo(() => new Map(teachersList.map((t) => [String(t.id), t])), [teachersList]);

  const resolveSection = useCallback((section) => {
    const board = boardsById.get(String(section.boardId));
    const year = yearsById.get(String(section.academicYearId));
    const level = levelsById.get(String(section.academicLevelId));
    const group = groupsById.get(String(section.groupId));
    const program = programsById.get(String(section.programId));
    const room = roomsById.get(String(section.roomId));
    const teacher = teachersById.get(String(section.classTeacherId));

    return {
      boardName: board?.name || section.board || "—",
      boardCode: board?.code || section.boardCode || "—",
      academicYearName: year?.name || section.academicYear || "—",
      academicLevelName: level?.name || section.academicLevel || "—",
      groupName: group?.name || section.group || "—",
      programName: program?.name || section.program || "—",
      roomNo: room?.roomNo || section.roomNo || "—",
      teacherName: teacher ? (teacher.employeeId ? `${teacher.name} (${teacher.employeeId})` : teacher.name) : (section.teacher || "—"),
    };
  }, [boardsById, yearsById, levelsById, groupsById, programsById, roomsById, teachersById]);

  // Available Rooms: Active classrooms not assigned to another active section
  const availableRooms = useMemo(() => {
    const assignedRoomIds = new Set(
      sections
        .filter((s) => s.id !== selectedSectionId && s.status === "Active" && s.roomId)
        .map((s) => String(s.roomId))
    );

    const options = rooms
      .filter((r) => r.isActive && r.roomType === "Classroom")
      .filter((r) => !assignedRoomIds.has(String(r.id)))
      .map((r) => ({
        value: String(r.id),
        label: `${r.roomNo} (Cap: ${r.capacity})`,
      }));

    if (sectionForm.roomId && !options.some((o) => o.value === String(sectionForm.roomId))) {
      const currentRoom = roomsById.get(String(sectionForm.roomId));
      if (currentRoom?.isActive && currentRoom.roomType === "Classroom") {
        options.unshift({
          value: String(currentRoom.id),
          label: `${currentRoom.roomNo} (Cap: ${currentRoom.capacity}) [Current]`,
        });
      }
    }
    return options;
  }, [rooms, sections, selectedSectionId, sectionForm.roomId, roomsById]);

  const getAvailableRoomsForBulkRow = (rowIndex) => {
    const occupied = new Set(sections.filter((s) => s.status === "Active" && s.roomId).map((s) => normalizeId(s.roomId)));
    const usedByOtherRows = new Set(bulkSections.filter((_, index) => index !== rowIndex).map((row) => normalizeId(row.roomId)).filter(Boolean));
    const currentId = normalizeId(bulkSections[rowIndex]?.roomId);
    return rooms.filter((room) => room.isActive && room.roomType === "Classroom" && ((!occupied.has(normalizeId(room.id)) && !usedByOtherRows.has(normalizeId(room.id))) || normalizeId(room.id) === currentId)).map((room) => ({ value: normalizeId(room.id), label: `${room.roomNo} (Cap: ${room.capacity})` }));
  };

  // Available Teachers: Optional, active teachers not assigned as incharge elsewhere
  const availableTeachers = useMemo(() => {
    const assignedTeacherIds = new Set(
      sections
        .filter((s) => s.id !== selectedSectionId && s.status === "Active" && s.classTeacherId)
        .map((s) => String(s.classTeacherId))
    );

    const options = teachersList
      .filter((t) => t.isActive && !assignedTeacherIds.has(String(t.id)))
      .map((t) => ({
        value: String(t.id),
        label: t.employeeId ? `${t.name} (${t.employeeId})` : t.name,
      }));

    if (
      sectionForm.classTeacherId &&
      !options.some((o) => o.value === String(sectionForm.classTeacherId))
    ) {
      const currentTeacher = teachersById.get(String(sectionForm.classTeacherId));
      if (currentTeacher) {
        options.unshift({
          value: String(currentTeacher.id),
          label: currentTeacher.employeeId
            ? `${currentTeacher.name} (${currentTeacher.employeeId}) [Current]`
            : `${currentTeacher.name} [Current]`,
        });
      }
    }
    return options;
  }, [teachersList, sections, selectedSectionId, sectionForm.classTeacherId, teachersById]);

  // Filtering & Pagination
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter((sec) => {
      const d = resolveSection(sec);
      if (filters.groupId && normalizeId(sec.groupId) !== normalizeId(filters.groupId)) return false;
      if (filters.programId && normalizeId(sec.programId) !== normalizeId(filters.programId)) return false;
      if (filters.academicLevelId && normalizeId(sec.academicLevelId) !== normalizeId(filters.academicLevelId)) return false;

      if (!q) return true;
      return [
        sec.name,
        d.boardName,
        d.boardCode,
        d.academicYearName,
        d.groupName,
        d.programName,
        d.academicLevelName,
        d.roomNo,
        d.teacherName,
        sec.status,
      ].some((val) => String(val || "").toLowerCase().includes(q));
    });
  }, [sections, filters, search, resolveSection]);

  const sectionPages = Math.max(1, Math.ceil(filteredSections.length / PAGE_SIZE));
  const shownSections = filteredSections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      if (roomFilters.building && r.building !== roomFilters.building) return false;
      if (roomFilters.floor && String(r.floor) !== roomFilters.floor) return false;
      if (roomFilters.roomType && r.roomType !== roomFilters.roomType) return false;

      if (!q) return true;
      return [
        r.roomNo,
        r.building,
        r.floor,
        r.roomType,
        r.isActive ? "Active" : "Inactive",
      ].some((val) => String(val || "").toLowerCase().includes(q));
    });
  }, [rooms, roomSearch, roomFilters]);

  const roomPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const shownRooms = filteredRooms.slice((roomPage - 1) * PAGE_SIZE, roomPage * PAGE_SIZE);

  // Dropdowns
  const selectedSection = useMemo(() => sections.find((item) => normalizeId(item.id) === normalizeId(selectedSectionId)), [sections, selectedSectionId]);
  const boardOptions = useMemo(() => {
    const options = boardsList.filter((b) => b.isActive).map((b) => ({ value: String(b.id), label: b.name }));
    if (selectedSection?.boardId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.boardId))) {
      options.unshift({ value: String(selectedSection.boardId), label: selectedSection.board || "Current Board" });
    }
    return options;
  }, [boardsList, selectedSection]);

  const filteredYearOptions = useMemo(() => {
    const options = academicYearsList
      .filter((y) => y.isActive)
      .filter((y) => !sectionForm.boardId || !y.boardId || normalizeId(y.boardId) === normalizeId(sectionForm.boardId))
      .map((y) => ({ value: String(y.id), label: y.name }));
    if (selectedSection?.academicYearId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.academicYearId))) {
      options.unshift({ value: String(selectedSection.academicYearId), label: selectedSection.academicYear || "Current Academic Year" });
    }
    return options;
  }, [academicYearsList, sectionForm.boardId, selectedSection]);

  const filteredGroupOptions = useMemo(() => {
    const options = groupsList
      .filter((g) => g.isActive)
      .filter((g) => !sectionForm.boardId || !g.boardId || normalizeId(g.boardId) === normalizeId(sectionForm.boardId))
      .map((g) => ({ value: String(g.id), label: g.name }));
    if (selectedSection?.groupId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.groupId))) {
      options.unshift({ value: String(selectedSection.groupId), label: selectedSection.group || "Current Group" });
    }
    return options;
  }, [groupsList, sectionForm.boardId, selectedSection]);

  const filteredProgramOptions = useMemo(() => {
    const options = programsList
      .filter((p) => p.isActive)
      .filter((p) => !sectionForm.groupId || !p.groupId || normalizeId(p.groupId) === normalizeId(sectionForm.groupId))
      .map((p) => ({ value: String(p.programId), label: p.name }));
    if (selectedSection?.programId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.programId))) {
      options.unshift({ value: String(selectedSection.programId), label: selectedSection.program || "Current Program" });
    }
    return options;
  }, [programsList, sectionForm.groupId, selectedSection]);

  const levelOptions = useMemo(() => {
    const options = academicLevelsList.filter((l) => l.isActive).map((l) => ({ value: String(l.id), label: l.name }));
    if (selectedSection?.academicLevelId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.academicLevelId))) {
      options.unshift({ value: String(selectedSection.academicLevelId), label: selectedSection.academicLevel || "Current Academic Level" });
    }
    return options;
  }, [academicLevelsList, selectedSection]);

  const sectionGroupFilterOptions = useMemo(() => {
    const values = [...groupsList.filter((group) => group.isActive).map((group) => ({ value: normalizeId(group.id), label: group.name })), ...sections.filter((item) => item.groupId).map((item) => ({ value: normalizeId(item.groupId), label: item.group || "Group" }))];
    return values.filter((item, index) => values.findIndex((candidate) => candidate.value === item.value) === index);
  }, [groupsList, sections]);

  const sectionProgramFilterOptions = useMemo(() => {
    const values = [...programsList.filter((program) => program.isActive && normalizeId(program.groupId) === normalizeId(filters.groupId)).map((program) => ({ value: normalizeId(program.programId), label: program.name })), ...sections.filter((item) => normalizeId(item.groupId) === normalizeId(filters.groupId) && item.programId).map((item) => ({ value: normalizeId(item.programId), label: item.program || "Program" }))];
    return values.filter((item, index) => values.findIndex((candidate) => candidate.value === item.value) === index);
  }, [programsList, sections, filters.groupId]);

  const sectionLevelFilterOptions = useMemo(() => {
    const values = [...academicLevelsList.map((item) => ({ value: String(item.id), label: item.name })), ...sections.filter((item) => item.academicLevelId).map((item) => ({ value: String(item.academicLevelId), label: item.academicLevel || "Academic Level" }))];
    return values.filter((item, index) => values.findIndex((candidate) => normalizeId(candidate.value) === normalizeId(item.value)) === index);
  }, [academicLevelsList, sections]);

  const roomBuildings = useMemo(() => [...new Set(rooms.map((r) => r.building).filter(Boolean))], [rooms]);
  const roomFloors = useMemo(() => [...new Set(rooms.map((r) => String(r.floor)).filter(Boolean))], [rooms]);
  const roomFilterTypes = useMemo(() => [...new Set(rooms.map((r) => r.roomType).filter(Boolean))], [rooms]);

  const openAddSection = () => {
    setSelectedSectionId(null);
    setSectionFormMode("add");
    setSectionCreationType("single");
    setFieldErrors({});
    setSectionForm({
      boardId: "",
      academicYearId: "",
      groupId: "",
      programId: "",
      groupProgramId: "",
      academicLevelId: "",
      name: "",
      roomId: "",
      classTeacherId: "",
      strength: "",
      status: "Active",
    });
    setAcademicYearsList([]);
    setAcademicLevelsList([]);
    setGroupsList([]);
    setProgramsList([]);
    setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "Active" }]);
    setSectionView("form");
  };

  const openEditSection = (sec, isPreview = false) => {
    setSelectedSectionId(sec.id);
    setSectionFormMode(isPreview ? "preview" : "edit");
    setSectionCreationType("single");
    setFieldErrors({});
    setSectionForm({
      boardId: sec.boardId ? String(sec.boardId) : "",
      academicYearId: sec.academicYearId ? String(sec.academicYearId) : "",
      groupId: sec.groupId ? String(sec.groupId) : "",
      programId: sec.programId ? String(sec.programId) : "",
      groupProgramId: sec.groupProgramId ? String(sec.groupProgramId) : "",
      academicLevelId: sec.academicLevelId ? String(sec.academicLevelId) : "",
      name: sec.name || "",
      roomId: sec.roomId ? String(sec.roomId) : "",
      classTeacherId: sec.classTeacherId ? String(sec.classTeacherId) : "",
      strength: String(sec.strength || ""),
      status: sec.status || "",
    });
    setSectionView("form");
    if (!isPreview && sec.boardId) loadBoardDependencies(sec.boardId, { groupId: sec.groupId });
  };

  const openAddRoom = () => {
    setSelectedRoomId(null);
    setRoomFormMode("add");
    setRoomCreationType("single");
    setRoomFieldErrors({});
    setRoomForm({
      roomNo: "",
      capacity: "",
      roomType: "",
      building: "",
      floor: "",
      isActive: "Active",
    });
    setBulkRoomForm(EMPTY_BULK_ROOM_FORM);
    setBulkRoomAllocations([]);
    setBulkRoomPage(1);
    setRoomView("form");
  };

  const openEditRoom = (room, isPreview = false) => {
    setSelectedRoomId(room.id);
    setRoomFormMode(isPreview ? "preview" : "edit");
    setRoomCreationType("single");
    setRoomFieldErrors({});
    setRoomForm({
      roomNo: room.roomNo || "",
      capacity: String(room.capacity || ""),
      roomType: room.roomType || "Classroom",
      building: room.building || "",
      floor: String(room.floor || ""),
      isActive: room.isActive === true ? "Active" : room.isActive === false ? "Inactive" : "",
    });
    setRoomView("form");
  };

  const handleSectionRoomChange = (roomId) => {
    const selectedRoom = roomsById.get(String(roomId));
    setSectionForm((prev) => ({
      ...prev,
      roomId,
      strength: selectedRoom ? String(selectedRoom.capacity) : "",
    }));
    setFieldErrors((prev) => ({ ...prev, roomId: null, strength: null }));
  };

  const handleBulkSectionRoomChange = (index, roomId) => {
    const selectedRoom = roomsById.get(String(roomId));
    setBulkSections((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        roomId,
        strength: selectedRoom ? String(selectedRoom.capacity) : "",
      };
      return next;
    });
  };

  const prepareBulkRoomAllocations = () => {
    const count = Number(bulkRoomForm.roomCount);
    const sequence = parseRoomNumberSequence(bulkRoomForm.startRoomNo);
    const nextErrors = { ...roomFieldErrors };
    delete nextErrors.startRoomNo;
    delete nextErrors.roomCount;
    if (!sequence) nextErrors.startRoomNo = "First Room Number must end with a numeric suffix";
    if (!Number.isInteger(count) || count < 1 || count > 100) nextErrors.roomCount = "Room count must be between 1 and 100";
    if (!sequence || nextErrors.roomCount) return setRoomFieldErrors(nextErrors);
    const next = reconcileBulkRoomAllocations(bulkRoomAllocations, bulkRoomForm);
    const duplicateErrors = validateBulkRoomAllocations(next, rooms, count);
    Object.keys(nextErrors).filter((key) => key.startsWith("bulk_")).forEach((key) => delete nextErrors[key]);
    setBulkRoomAllocations(next);
    if (!bulkRoomAllocations.length) setBulkRoomPage(1);
    setRoomFieldErrors({ ...nextErrors, ...Object.fromEntries(Object.entries(duplicateErrors).filter(([key]) => key.startsWith("bulk_roomNo_"))) });
  };

  const updateBulkRoomAllocation = (index, field, value) => {
    setBulkRoomAllocations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setRoomFieldErrors((current) => ({ ...current, [`bulk_${field}_${index}`]: null }));
  };

  // ---------- SAVE HANDLERS WITH INLINE ERROR MESSAGES ----------
  const saveSection = async (e) => {
    e.preventDefault();
    if (operation) return;
    const errs = {};

    const { boardId, academicYearId, groupId, programId, academicLevelId } = sectionForm;
    if (!boardId) errs.boardId = "Board selection is required";
    if (!academicYearId) errs.academicYearId = "Academic Year selection is required";
    if (!groupId) errs.groupId = "Group selection is required";
    if (!programId) errs.programId = "Program selection is required";
    if (!academicLevelId) errs.academicLevelId = "Academic Level selection is required";

    const boardObj = boardsById.get(String(boardId));
    const yearObj = yearsById.get(String(academicYearId));
    const groupObj = groupsById.get(String(groupId));
    const programObj = programsById.get(String(programId));
    const levelObj = levelsById.get(String(academicLevelId));

    if (sectionCreationType === "single" || selectedSectionId) {
      if (!sectionForm.name.trim()) errs.name = "Section Name is required";
      if (!sectionForm.roomId) errs.roomId = "Room No selection is required";
      if (!sectionForm.status) errs.status = "Status selection is required (Active/Inactive)";

      const roomObj = roomsById.get(String(sectionForm.roomId));
      const strengthNum = Number(sectionForm.strength);
      const roomConflict = sections.some((item) => item.status === "Active" && normalizeId(item.id) !== normalizeId(selectedSectionId) && normalizeId(item.roomId) === normalizeId(sectionForm.roomId));
      if (roomObj && (!roomObj.isActive || roomObj.roomType !== "Classroom" || roomConflict)) errs.roomId = "Room is not available for Section allocation";
      if (sectionForm.classTeacherId) {
        const teacherObjForValidation = teachersById.get(normalizeId(sectionForm.classTeacherId));
        if (teacherObjForValidation && teacherObjForValidation.isActive === false) {
          errs.classTeacherId = "Selected Incharge is inactive";
        }
      }
      if (sections.some((item) => normalizeId(item.id) !== normalizeId(selectedSectionId) && item.name.trim().toLowerCase() === sectionForm.name.trim().toLowerCase() && normalizeId(item.boardId) === normalizeId(boardId) && normalizeId(item.academicYearId) === normalizeId(academicYearId) && normalizeId(item.groupId) === normalizeId(groupId) && normalizeId(item.programId) === normalizeId(programId) && normalizeId(item.academicLevelId) === normalizeId(academicLevelId))) errs.name = "Section Name already exists for this academic scope";

      if (!String(sectionForm.strength).trim()) {
        errs.strength = "Capacity is required";
      } else if (!Number.isInteger(strengthNum) || strengthNum <= 0) {
        errs.strength = "Capacity must be a positive integer";
      } else if (roomObj && strengthNum > Number(roomObj.capacity)) {
        errs.strength = `Section capacity (${strengthNum}) cannot exceed room capacity (${roomObj.capacity})`;
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      const teacherObj = sectionForm.classTeacherId ? teachersById.get(String(sectionForm.classTeacherId)) : null;

      const isEdit = Boolean(selectedSectionId);
      setOperation(isEdit ? "UPDATE_SECTION" : "ADD_SECTION");
      let apiSuccess = false;
      try {
        const payload = sectionPayload(sectionForm, { ...sectionForm, program: programObj });
        await (isEdit ? apiClient.put(apiEndpoints.sections.update(selectedSectionId), payload) : apiClient.post(apiEndpoints.sections.create, payload));
        apiSuccess = true;
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }
      const updatedItem = {
        id: isEdit ? selectedSectionId : String(Date.now()),
        boardId,
        board: boardObj?.name || "",
        boardCode: boardObj?.code || "",
        academicYearId,
        academicYear: yearObj?.name || "",
        academicLevelId,
        academicLevel: levelObj?.name || "",
        groupId,
        group: groupObj?.name || "",
        programId,
        program: programObj?.name || "",
        groupProgramId: programObj?.groupProgramId || "",
        name: sectionForm.name.trim(),
        roomId: roomObj.id,
        roomNo: roomObj.roomNo,
        classTeacherId: teacherObj ? teacherObj.id : "",
        teacher: teacherObj ? teacherObj.name : "—",
        strength: strengthNum,
        status: sectionForm.status,
        createdAt: isEdit ? sections.find((s) => s.id === selectedSectionId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEdit) {
        setSections((prev) => prev.map((s) => (s.id === selectedSectionId ? updatedItem : s)));
        say(`Section "${updatedItem.name}" updated & reassigned successfully!`);
      } else {
        // PREPEND NEW SECTION TO TOP
        createdSectionIdsRef.current.add(normalizeId(updatedItem.id));
        if (updatedItem.name) createdSectionIdsRef.current.add(updatedItem.name.trim().toLowerCase());
        setSections((prev) => [updatedItem, ...prev]);
        setPage(1);
        say(`Section "${updatedItem.name}" added successfully!`);
      }
      if (apiSuccess) {
        await Promise.all([loadSections().catch(() => { }), loadRooms().catch(() => { })]);
      }
      setSectionView("list");
    } else {
      // BULK SECTIONS SAVE
      if (!bulkSections.length) {
        errs.bulk = "Please configure at least one section";
        setFieldErrors(errs);
        return;
      }

      const newSections = [];
      const assignedRoomsInBatch = new Set();
      const assignedTeachersInBatch = new Set();
      const namesInBatch = new Set();
      const occupiedRoomIds = new Set(sections.filter((item) => item.status === "Active" && item.roomId).map((item) => normalizeId(item.roomId)));
      const occupiedTeacherIds = new Set(sections.filter((item) => item.status === "Active" && item.classTeacherId).map((item) => normalizeId(item.classTeacherId)));

      for (let i = 0; i < bulkSections.length; i++) {
        const sec = bulkSections[i];
        if (!sec.name.trim()) errs[`name_${i}`] = `Section Name required`;
        if (!sec.roomId) errs[`room_${i}`] = `Room No required`;
        if (!sec.status) errs[`status_${i}`] = `Status required`;
        const normalizedName = sec.name.trim().toLowerCase();
        if (normalizedName && namesInBatch.has(normalizedName)) errs[`name_${i}`] = "Duplicate Section Name in batch";
        if (normalizedName) namesInBatch.add(normalizedName);
        if (normalizedName && sections.some((item) => item.name.trim().toLowerCase() === normalizedName && normalizeId(item.boardId) === normalizeId(boardId) && normalizeId(item.academicYearId) === normalizeId(academicYearId) && normalizeId(item.groupId) === normalizeId(groupId) && normalizeId(item.programId) === normalizeId(programId) && normalizeId(item.academicLevelId) === normalizeId(academicLevelId))) errs[`name_${i}`] = "Section Name already exists for this academic scope";

        if (sec.roomId && assignedRoomsInBatch.has(sec.roomId)) {
          errs[`room_${i}`] = `Duplicate room assignment in batch`;
        }
        if (sec.roomId) assignedRoomsInBatch.add(sec.roomId);

        const roomObj = roomsById.get(String(sec.roomId));
        if (sec.roomId && (!roomObj?.isActive || roomObj?.roomType !== "Classroom" || occupiedRoomIds.has(normalizeId(sec.roomId)))) errs[`room_${i}`] = "Room is not available for Section allocation";
        if (sec.classTeacherId) {
          const teacherObj = teachersById.get(normalizeId(sec.classTeacherId));
          if (teacherObj && teacherObj.isActive === false) {
            errs[`teacher_${i}`] = "Selected Incharge is inactive";
          }
        }
        const strengthNum = Number(sec.strength);
        if (!String(sec.strength).trim() || !Number.isInteger(strengthNum) || strengthNum <= 0) {
          errs[`strength_${i}`] = `Valid capacity required`;
        } else if (roomObj && strengthNum > Number(roomObj.capacity)) {
          errs[`strength_${i}`] = `Exceeds room capacity (${roomObj.capacity})`;
        }
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      setOperation("BULK_SECTION");
      let apiSuccess = false;
      try {
        const context = { ...sectionForm, program: programObj };
        await apiClient.post(SECTION_BULK_ENDPOINT, bulkSections.map((item) => sectionPayload(item, context)));
        apiSuccess = true;
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }

      for (let i = 0; i < bulkSections.length; i++) {
        const sec = bulkSections[i];
        const roomObj = roomsById.get(String(sec.roomId));
        const teacherObj = sec.classTeacherId ? teachersById.get(String(sec.classTeacherId)) : null;

        const secItem = {
          id: String(Date.now() + i),
          boardId,
          board: boardObj?.name || "",
          boardCode: boardObj?.code || "",
          academicYearId,
          academicYear: yearObj?.name || "",
          academicLevelId,
          academicLevel: levelObj?.name || "",
          groupId,
          group: groupObj?.name || "",
          programId,
          program: programObj?.name || "",
          groupProgramId: programObj?.groupProgramId || "",
          name: sec.name.trim(),
          roomId: roomObj.id,
          roomNo: roomObj.roomNo,
          classTeacherId: teacherObj ? teacherObj.id : "",
          teacher: teacherObj ? teacherObj.name : "—",
          strength: Number(sec.strength),
          status: sec.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdSectionIdsRef.current.add(normalizeId(secItem.id));
        if (secItem.name) createdSectionIdsRef.current.add(secItem.name.trim().toLowerCase());
        newSections.push(secItem);
      }

      // PREPEND BULK SECTIONS TO TOP
      setSections((prev) => [...newSections, ...prev]);
      setPage(1);
      say(`${newSections.length} Sections created successfully!`);
      if (apiSuccess) {
        await Promise.all([loadSections().catch(() => { }), loadRooms().catch(() => { })]);
      }
      setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "Active" }]);
      setSectionView("list");
    }
  };

  const saveRoom = async (e) => {
    e.preventDefault();
    if (operation) return;
    const errs = {};

    if (roomCreationType === "single" || selectedRoomId) {
      const roomNoTrimmed = roomForm.roomNo.trim();
      if (!roomNoTrimmed) errs.roomNo = "Room No is required";
      if (!roomForm.building.trim()) errs.building = "Block Name is required";
      if (!String(roomForm.floor).trim()) errs.floor = "Floor is required";
      if (!roomForm.roomType) errs.roomType = "Room Type is required";
      if (!roomForm.isActive) errs.isActive = "Status selection is required";

      const cap = Number(roomForm.capacity);
      if (!String(roomForm.capacity).trim() || !Number.isInteger(cap) || cap <= 0) {
        errs.capacity = "Room capacity must be a positive integer";
      }

      const duplicate = rooms.find(
        (r) => r.id !== selectedRoomId && r.roomNo.toLowerCase() === roomNoTrimmed.toLowerCase()
      );
      if (duplicate) errs.roomNo = `Room No "${roomNoTrimmed}" already exists`;

      if (Object.keys(errs).length > 0) {
        setRoomFieldErrors(errs);
        return;
      }

      const isEdit = Boolean(selectedRoomId);
      setOperation(isEdit ? "UPDATE_ROOM" : "ADD_ROOM");
      let apiSuccess = false;
      try {
        await (isEdit ? apiClient.put(ROOM_ENDPOINTS.update(selectedRoomId), roomPayload(roomForm)) : apiClient.post(ROOM_ENDPOINTS.create, roomPayload(roomForm)));
        apiSuccess = true;
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }
      const roomObj = {
        id: isEdit ? selectedRoomId : String(Date.now()),
        roomNo: roomNoTrimmed,
        capacity: cap,
        roomType: roomForm.roomType,
        building: roomForm.building.trim(),
        floor: String(roomForm.floor).trim(),
        isActive: roomForm.isActive === "Active",
      };

      if (isEdit) {
        setRooms((prev) => prev.map((r) => (r.id === selectedRoomId ? roomObj : r)));
        say(`Room "${roomObj.roomNo}" updated successfully!`);
      } else {
        // PREPEND NEW ROOM TO TOP
        createdRoomIdsRef.current.add(normalizeId(roomObj.id));
        if (roomObj.roomNo) createdRoomIdsRef.current.add(roomObj.roomNo.trim().toLowerCase());
        setRooms((prev) => [roomObj, ...prev]);
        setRoomPage(1);
        say(`Room "${roomObj.roomNo}" added successfully!`);
      }
      if (apiSuccess) {
        await loadRooms().catch(() => { });
      }
      setRoomView("list");
    } else {
      // BULK ROOMS CREATION
      const { building, floor, startRoomNo, roomCount, defaultCapacity, defaultRoomType, isActive } = bulkRoomForm;

      if (!building.trim()) errs.building = "Block Name is required";
      if (!String(floor).trim()) errs.floor = "Floor is required";
      if (!startRoomNo.trim()) errs.startRoomNo = "Start Room No is required";
      if (!isActive || !["Active", "Inactive"].includes(isActive)) errs.isActive = "Valid Status is required";

      const countNum = Number(roomCount);
      if (!String(roomCount).trim() || !Number.isInteger(countNum) || countNum < 1 || countNum > 100) {
        errs.roomCount = "Room count must be between 1 and 100";
      }

      const capNum = Number(defaultCapacity);
      if (String(defaultCapacity).trim() && (!Number.isInteger(capNum) || capNum < 1 || capNum > 1000)) errs.defaultCapacity = "Capacity must be an integer from 1 to 1000";
      if (defaultRoomType && !ROOM_TYPES.includes(defaultRoomType)) errs.defaultRoomType = "Select a valid Room Type";
      if (!parseRoomNumberSequence(startRoomNo)) errs.startRoomNo = "First Room Number must end with a numeric suffix";
      Object.assign(errs, validateBulkRoomAllocations(bulkRoomAllocations, rooms, countNum));

      if (Object.keys(errs).length > 0) {
        setRoomFieldErrors(errs);
        const firstInvalidRow = Object.keys(errs)
          .map((key) => key.match(/^bulk_(?:capacity|roomType|roomNo)_(\d+)$/))
          .find(Boolean);
        if (firstInvalidRow) setBulkRoomPage(Math.floor(Number(firstInvalidRow[1]) / BULK_ROOM_PAGE_SIZE) + 1);
        return;
      }

      const bulkPayload = bulkRoomAllocations.map((allocation) => roomPayload({ ...allocation, building, floor, isActive }));
      setOperation("BULK_ROOM");
      let apiSuccess = false;
      try {
        await apiClient.post(ROOM_ENDPOINTS.bulk, bulkPayload);
        apiSuccess = true;
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }

      const idPrefix = `room-${Date.now()}`;
      const generated = bulkRoomAllocations.map((allocation, index) => {
        const rObj = {
          id: `${idPrefix}-${index + 1}`,
          roomNo: allocation.roomNo,
          capacity: Number(allocation.capacity),
          roomType: allocation.roomType,
          building: building.trim(),
          floor: String(floor).trim(),
          isActive: isActive === "Active",
        };
        createdRoomIdsRef.current.add(normalizeId(rObj.id));
        if (rObj.roomNo) createdRoomIdsRef.current.add(rObj.roomNo.trim().toLowerCase());
        return rObj;
      });

      // PREPEND BULK ROOMS TO TOP
      setRooms((prev) => [...generated, ...prev]);
      setRoomPage(1);
      say(`${generated.length} Rooms created successfully for ${building} (Floor ${floor})!`);
      setBulkRoomForm(EMPTY_BULK_ROOM_FORM);
      setBulkRoomAllocations([]);
      setBulkRoomPage(1);
      setRoomFieldErrors({});
      if (apiSuccess) {
        await loadRooms().catch(() => { });
      }
      setRoomView("list");
    }
  };

  const deleteSection = async (sec) => {
    if (operation) return;
    if (window.confirm(`Are you sure you want to delete section "${sec.name}"?`)) {
      setOperation(`DELETE_SECTION:${sec.id}`);
      let apiSuccess = false;
      try {
        await apiClient.delete(apiEndpoints.sections.delete(sec.id));
        apiSuccess = true;
        await Promise.all([loadSections(), loadRooms()]);
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }
      if (!apiSuccess) {
        setSections((prev) => prev.filter((s) => s.id !== sec.id));
      }
      say(`Section "${sec.name}" deleted successfully.`);
    }
  };

  const deleteRoom = async (room) => {
    if (operation) return;
    const assigned = sections.find((s) => s.status === "Active" && String(s.roomId) === String(room.id));
    if (assigned) {
      say(`Cannot delete room "${room.roomNo}" because it is assigned to active section "${assigned.name}".`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete room "${room.roomNo}"?`)) {
      setOperation(`DELETE_ROOM:${room.id}`);
      let apiSuccess = false;
      try {
        await apiClient.delete(ROOM_ENDPOINTS.delete(room.id));
        apiSuccess = true;
        await loadRooms();
      } catch (error) {
        say(getApiErrorMessage(error));
      } finally {
        setOperation("");
      }
      if (!apiSuccess) {
        setRooms((prev) => prev.filter((r) => r.id !== room.id));
      }
      say(`Room "${room.roomNo}" deleted successfully.`);
    }
  };

  const exportAllocationExcel = () => {
    if (!rooms.length && !sections.length) return say("No room or section allocation data is available to export.");
    downloadAllocationWorkbook(rooms, sections, resolveSection);
    say("Section and room allocation workbook downloaded successfully.");
  };

  // DYNAMIC HEADER DETAILS BASED ON ACTIVE TAB
  const dynamicHeader = useMemo(() => {
    if (activeTab === "rooms") {
      return {
        title: "Room Management",
        subtitle: "Manage classrooms, floor wise allocations, and room availability.",
      };
    }
    return {
      title: "Section Management",
      subtitle: "Manage academic sections, classrooms and teacher assignments.",
    };
  }, [activeTab]);

  return (
    <DashboardLayout
      title={dynamicHeader.title}
      subtitle={dynamicHeader.subtitle}
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="cms-sec-container">
        {initialLoading && <div className="cms-card cms-sec-loading" role="status">Loading Section and Room Management data...</div>}
        {/* Navigation Tabs - FIRST TAB IS ROOM MANAGEMENT, SECOND TAB IS SECTION MANAGEMENT */}
        <div className="cms-room-tabs" role="tablist" aria-label="Management modules">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "rooms"}
            className={`cms-room-tab ${activeTab === "rooms" ? "cms-room-tab-active" : ""}`}
            onClick={() => {
              setActiveTab("rooms");
              setRoomView("list");
            }}
          >
            Room Management
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sections"}
            className={`cms-room-tab ${activeTab === "sections" ? "cms-room-tab-active" : ""}`}
            onClick={() => {
              setActiveTab("sections");
              setSectionView("list");
            }}
          >
            Section Management
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ROOM MANAGEMENT (FIRST TAB)                        */}
        {/* ========================================================= */}
        {activeTab === "rooms" && (
          <>
            {roomView === "list" ? (
              /* ROOMS TABLE VIEW */
              <div className="cms-card">
                <div className="cms-toolbar cms-sec-toolbar">
                  <div className="cms-search cms-sec-search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search by Room No, block, floor..."
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                    />
                  </div>
                  <div className="cms-sec-toolbar-filters">
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.building}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, building: val }))}
                        options={roomBuildings}
                        placeholder="Block Name"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.floor}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, floor: val }))}
                        options={roomFloors}
                        placeholder="Floor"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.roomType}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, roomType: val }))}
                        options={roomFilterTypes}
                        placeholder="Room Type"
                        showSearch={true}
                      />
                    </div>
                  </div>
                  <div className="cms-sec-toolbar-spacer" />
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary cms-sec-compact-btn"
                    onClick={openAddRoom}
                  >
                    <Plus size={16} />
                    Add Room
                  </button>
                </div>

                {/* Rooms Table */}
                <div className="cms-table-wrap cms-sec-table-wrap">
                  <table className="cms-table cms-sec-table cms-room-table">
                    <thead>
                      <tr>
                        <th>Room No</th>
                        <th>Block Name</th>
                        <th>Floor</th>
                        <th>Room Type</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRooms.length ? (
                        shownRooms.map((room) => (
                          <tr key={room.id}>
                            <td className="cms-sec-name-cell">{room.roomNo}</td>
                            <td>{room.building}</td>
                            <td>{room.floor}</td>
                            <td>{room.roomType}</td>
                            <td>{room.capacity}</td>
                            <td>
                              <span
                                className={`cms-sec-status-badge ${room.isActive ? "cms-badge-active" : "cms-badge-inactive"
                                  }`}
                              >
                                {room.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div className="cms-sec-table-actions">
                                <button
                                  type="button"
                                  className="cms-sec-action-btn"
                                  title="View Details"
                                  onClick={() => openEditRoom(room, true)}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-sec-action-btn"
                                  title="Edit Room"
                                  onClick={() => openEditRoom(room, false)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-sec-action-btn cms-sec-delete-action"
                                  title={operation === `DELETE_ROOM:${room.id}` ? "Deleting..." : "Delete Room"}
                                  disabled={Boolean(operation)}
                                  onClick={() => deleteRoom(room)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: "24px" }}>
                            No rooms found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Room Pagination */}
                <div className="cms-sec-pagination">
                  <span className="cms-sec-record-summary">
                    Showing {shownRooms.length ? (roomPage - 1) * PAGE_SIZE + 1 : 0}–
                    {Math.min(roomPage * PAGE_SIZE, filteredRooms.length)} of {filteredRooms.length} records
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={roomPage === 1}
                    onClick={() => setRoomPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {roomPage} / {roomPages}
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={roomPage === roomPages}
                    onClick={() => setRoomPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              /* ROOM FULL SCREEN FORM VIEW */
              <div className="cms-sec-screen-container">
                <div className="cms-sec-screen-head">
                  <div className="cms-sec-screen-title-wrap">
                    <button
                      type="button"
                      className="cms-sec-back-btn"
                      onClick={() => setRoomView("list")}
                      title="Back to Rooms List"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h3>
                      {roomFormMode === "preview"
                        ? "Room Details"
                        : selectedRoomId
                          ? "Edit Room"
                          : "Add Room"}
                    </h3>
                  </div>

                  {roomFormMode === "add" && (
                    <div className="cms-sec-mode-toggle">
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${roomCreationType === "single" ? "is-active" : ""}`}
                        onClick={() => {
                          setRoomCreationType("single");
                          setRoomFieldErrors({});
                        }}
                      >
                        Single Room
                      </button>
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${roomCreationType === "bulk" ? "is-active" : ""}`}
                        onClick={() => {
                          setRoomCreationType("bulk");
                          setRoomFieldErrors({});
                          setBulkRoomForm(EMPTY_BULK_ROOM_FORM);
                          setBulkRoomAllocations([]);
                          setBulkRoomPage(1);
                        }}
                      >
                        Multiple Rooms
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={saveRoom}>
                  <div className="cms-sec-screen-body">
                    {/* SINGLE ROOM FORM */}
                    {(roomCreationType === "single" || selectedRoomId) && (
                      <div className="cms-sec-form-grid">
                        <div className={`cms-field ${roomFieldErrors.roomNo ? "has-error" : ""}`}>
                          <label>
                            Room No <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.roomNo}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. Block A-101"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, roomNo: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, roomNo: null }));
                            }}
                          />
                          {roomFieldErrors.roomNo && <span className="cms-field-error">{roomFieldErrors.roomNo}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.capacity ? "has-error" : ""}`}>
                          <label>
                            Capacity <span className="req">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={roomForm.capacity}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. 40"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, capacity: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, capacity: null }));
                            }}
                          />
                          {roomFieldErrors.capacity && <span className="cms-field-error">{roomFieldErrors.capacity}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.roomType ? "has-error" : ""}`}>
                          <label>
                            Room Type <span className="req">*</span>
                          </label>
                          <SearchableSelect
                            value={roomForm.roomType}
                            onChange={(val) => {
                              setRoomForm((f) => ({ ...f, roomType: val }));
                              setRoomFieldErrors((err) => ({ ...err, roomType: null }));
                            }}
                            options={ROOM_TYPES}
                            disabled={roomFormMode === "preview"}
                            showSearch={true}
                            hasError={Boolean(roomFieldErrors.roomType)}
                          />
                          {roomFieldErrors.roomType && <span className="cms-field-error">{roomFieldErrors.roomType}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.building ? "has-error" : ""}`}>
                          <label>
                            Block Name <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.building}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. Block A"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, building: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, building: null }));
                            }}
                          />
                          {roomFieldErrors.building && <span className="cms-field-error">{roomFieldErrors.building}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.floor ? "has-error" : ""}`}>
                          <label>
                            Floor <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.floor}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. 1"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, floor: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, floor: null }));
                            }}
                          />
                          {roomFieldErrors.floor && <span className="cms-field-error">{roomFieldErrors.floor}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.isActive ? "has-error" : ""}`}>
                          <label>
                            Status <span className="req">*</span>
                          </label>
                          <select
                            className="cms-sec-native-select"
                            value={roomForm.isActive}
                            onChange={(event) => {
                              setRoomForm((f) => ({ ...f, isActive: event.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, isActive: null }));
                            }}
                            disabled={roomFormMode === "preview"}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          {roomFieldErrors.isActive && <span className="cms-field-error">{roomFieldErrors.isActive}</span>}
                        </div>
                      </div>
                    )}

                    {/* BULK ROOMS FORM */}
                    {roomCreationType === "bulk" && !selectedRoomId && (
                      <>
                        <div className="cms-sec-form-grid">
                          <div className={`cms-field ${roomFieldErrors.building ? "has-error" : ""}`}>
                            <label>
                              Building / Block <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.building}
                              placeholder="e.g. Block A"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, building: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, building: null }));
                              }}
                            />
                            {roomFieldErrors.building && <span className="cms-field-error">{roomFieldErrors.building}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.floor ? "has-error" : ""}`}>
                            <label>
                              Floor <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.floor}
                              placeholder="e.g. 1"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, floor: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, floor: null }));
                              }}
                            />
                            {roomFieldErrors.floor && <span className="cms-field-error">{roomFieldErrors.floor}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.startRoomNo ? "has-error" : ""}`}>
                            <label>
                              First Room Number <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.startRoomNo}
                              placeholder="e.g. Block A-101"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, startRoomNo: e.target.value }));
                                setBulkRoomPage(1);
                                setRoomFieldErrors((err) => ({ ...err, startRoomNo: null }));
                              }}
                              onBlur={prepareBulkRoomAllocations}
                            />
                            {roomFieldErrors.startRoomNo && <span className="cms-field-error">{roomFieldErrors.startRoomNo}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.roomCount ? "has-error" : ""}`}>
                            <label>
                              Rooms to Create <span className="req">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={bulkRoomForm.roomCount}
                              placeholder="e.g. 30"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, roomCount: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, roomCount: null }));
                              }}
                              onBlur={prepareBulkRoomAllocations}
                            />
                            {roomFieldErrors.roomCount && <span className="cms-field-error">{roomFieldErrors.roomCount}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.defaultCapacity ? "has-error" : ""}`}>
                            <label>
                              Capacity
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              step="1"
                              value={bulkRoomForm.defaultCapacity}
                              placeholder="e.g. 40"
                              onChange={(e) => {
                                const value = e.target.value;
                                const previousValue = String(bulkRoomForm.defaultCapacity || "");
                                setBulkRoomForm((f) => ({ ...f, defaultCapacity: value }));
                                setBulkRoomAllocations((current) => current.map((row) =>
                                  !String(row.capacity).trim() || String(row.capacity) === previousValue
                                    ? { ...row, capacity: value }
                                    : row
                                ));
                                setRoomFieldErrors((err) => ({ ...err, defaultCapacity: null }));
                              }}
                            />
                            {roomFieldErrors.defaultCapacity && <span className="cms-field-error">{roomFieldErrors.defaultCapacity}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.defaultRoomType ? "has-error" : ""}`}>
                            <label>
                              Room Type
                            </label>
                            <SearchableSelect
                              value={bulkRoomForm.defaultRoomType}
                              onChange={(val) => {
                                const previousValue = bulkRoomForm.defaultRoomType || "";
                                setBulkRoomForm((f) => ({ ...f, defaultRoomType: val }));
                                setBulkRoomAllocations((current) => current.map((row) =>
                                  !row.roomType || row.roomType === previousValue
                                    ? { ...row, roomType: val }
                                    : row
                                ));
                                setRoomFieldErrors((err) => ({ ...err, defaultRoomType: null }));
                              }}
                              options={ROOM_TYPES}
                              placeholder="Select Room Type"
                              showSearch={true}
                              hasError={Boolean(roomFieldErrors.defaultRoomType)}
                            />
                            {roomFieldErrors.defaultRoomType && <span className="cms-field-error">{roomFieldErrors.defaultRoomType}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.isActive ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                            <label>
                              Status <span className="req">*</span>
                            </label>
                            <select
                              className="cms-sec-native-select"
                              value={bulkRoomForm.isActive}
                              onChange={(event) => {
                                setBulkRoomForm((f) => ({ ...f, isActive: event.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, isActive: null }));
                              }}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            {roomFieldErrors.isActive && <span className="cms-field-error">{roomFieldErrors.isActive}</span>}
                          </div>
                        </div>
                        <BulkRoomAllocationPreview
                          allocations={bulkRoomAllocations}
                          requested={bulkRoomForm.roomCount}
                          errors={roomFieldErrors}
                          onChange={updateBulkRoomAllocation}
                          page={bulkRoomPage}
                          setPage={setBulkRoomPage}
                        />
                        {roomFieldErrors.bulk && <div className="cms-bulk-room-error">{roomFieldErrors.bulk}</div>}
                      </>
                    )}
                  </div>

                  <div className="cms-sec-screen-foot">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => setRoomView("list")}
                    >
                      {roomFormMode === "preview" ? "Close" : "Cancel"}
                    </button>
                    {roomFormMode !== "preview" && (
                      <button type="submit" className="cms-btn cms-btn-primary" disabled={Boolean(operation)}>
                        {selectedRoomId
                          ? operation === "UPDATE_ROOM" ? "Updating..." : "Save Changes"
                          : roomCreationType === "bulk"
                            ? operation === "BULK_ROOM" ? "Creating..." : `Generate ${bulkRoomForm.roomCount || 0} Rooms`
                            : operation === "ADD_ROOM" ? "Adding..." : "Save Room"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SECTION MANAGEMENT (SECOND TAB)                     */}
        {/* ========================================================= */}
        {activeTab === "sections" && (
          <>
            {sectionView === "list" ? (
              /* SECTION TABLE VIEW */
              <div className="cms-card">
                <div className="cms-toolbar cms-sec-toolbar">
                  <div className="cms-search cms-sec-search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search by section, group, program..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="cms-sec-toolbar-filters">
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.groupId}
                        onChange={(groupId) => {
                          setFilters((current) => ({
                            ...current,
                            groupId,
                            programId: groupId && programsList.some((program) => program.isActive && normalizeId(program.groupId) === normalizeId(groupId) && normalizeId(program.programId) === normalizeId(current.programId)) ? current.programId : "",
                          }));
                          setPage(1);
                        }}
                        options={sectionGroupFilterOptions}
                        placeholder="Select Group"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.programId}
                        onChange={(programId) => {
                          setFilters((current) => ({ ...current, programId }));
                          setPage(1);
                        }}
                        options={filters.groupId ? sectionProgramFilterOptions : []}
                        disabled={!filters.groupId}
                        placeholder={filters.groupId ? "Select Program" : "Select Group First"}
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.academicLevelId}
                        onChange={(academicLevelId) => {
                          setFilters((current) => ({ ...current, academicLevelId }));
                          setPage(1);
                        }}
                        options={sectionLevelFilterOptions}
                        placeholder="Select Academic Level"
                        showSearch={true}
                      />
                    </div>
                  </div>
                  <div className="cms-sec-action-row">
                    <button type="button" className="cms-btn cms-btn-ghost cms-sec-compact-btn cms-allocation-export-btn" onClick={exportAllocationExcel}>
                      <Download size={15} /> Download Excel
                    </button>
                    <button type="button" className="cms-btn cms-btn-primary cms-sec-compact-btn" onClick={openAddSection}>
                      <Plus size={16} /> Add Section
                    </button>
                  </div>
                </div>

                {/* Sections Table */}
                <div className="cms-table-wrap cms-sec-table-wrap">
                  <table className="cms-table cms-sec-table cms-section-table">
                    <thead>
                      <tr>
                        <th>Section Name</th>
                        <th>Board</th>
                        <th>Academic Year</th>
                        <th>Group</th>
                        <th>Program</th>
                        <th>Academic Level</th>
                        <th>Room No</th>
                        <th>Incharge</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownSections.length ? (
                        shownSections.map((sec) => {
                          const detail = resolveSection(sec);
                          return (
                            <tr key={sec.id}>
                              <td className="cms-sec-name-cell">{sec.name}</td>
                              <td title={`${detail.boardName} (${detail.boardCode})`}>{detail.boardCode}</td>
                              <td title={detail.academicYearName}>{detail.academicYearName}</td>
                              <td title={detail.groupName}>{detail.groupName}</td>
                              <td title={detail.programName}>{detail.programName}</td>
                              <td title={detail.academicLevelName}>{detail.academicLevelName}</td>
                              <td title={detail.roomNo}>{detail.roomNo}</td>
                              <td title={detail.teacherName}>{detail.teacherName}</td>
                              <td>{sec.strength || "—"}</td>
                              <td>
                                <span
                                  className={`cms-sec-status-badge ${sec.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"
                                    }`}
                                >
                                  {sec.status}
                                </span>
                              </td>
                              <td>
                                <div className="cms-sec-table-actions">
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn"
                                    title="View Details"
                                    onClick={() => openEditSection(sec, true)}
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn"
                                    title="Edit Section"
                                    onClick={() => openEditSection(sec, false)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn cms-sec-delete-action"
                                    title={operation === `DELETE_SECTION:${sec.id}` ? "Deleting..." : "Delete Section"}
                                    disabled={Boolean(operation)}
                                    onClick={() => deleteSection(sec)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="11" style={{ textAlign: "center", padding: "24px" }}>
                            No sections found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section Pagination */}
                <div className="cms-sec-pagination">
                  <span className="cms-sec-record-summary">
                    Showing {shownSections.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
                    {Math.min(page * PAGE_SIZE, filteredSections.length)} of {filteredSections.length} records
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {page} / {sectionPages}
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={page === sectionPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              /* SECTION FULL SCREEN FORM VIEW */
              <div className="cms-sec-screen-container">
                <div className="cms-sec-screen-head">
                  <div className="cms-sec-screen-title-wrap">
                    <button
                      type="button"
                      className="cms-sec-back-btn"
                      onClick={() => setSectionView("list")}
                      title="Back to Sections List"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h3>
                      {sectionFormMode === "preview"
                        ? "Section Details"
                        : selectedSectionId
                          ? "Edit & Reassign Section"
                          : "Add Academic Section"}
                    </h3>
                  </div>

                  {sectionFormMode === "add" && (
                    <div className="cms-sec-mode-toggle">
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${sectionCreationType === "single" ? "is-active" : ""}`}
                        onClick={() => {
                          setSectionCreationType("single");
                          setFieldErrors({});
                        }}
                      >
                        Single Section
                      </button>
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${sectionCreationType === "bulk" ? "is-active" : ""}`}
                        onClick={() => {
                          setSectionCreationType("bulk");
                          setFieldErrors({});
                        }}
                      >
                        Multiple Sections
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={saveSection}>
                  <div className="cms-sec-screen-body">
                    {/* Academic Configuration Fields */}
                    <div className="cms-sec-form-section-title">
                      <Layers size={14} /> Academic Configuration
                    </div>
                    <div className="cms-sec-form-grid">
                      <div className={`cms-field ${fieldErrors.boardId ? "has-error" : ""}`}>
                        <label>
                          Board <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.boardId}
                          onChange={(val) => {
                            setSectionForm((f) => ({
                              ...f,
                              boardId: val,
                              academicYearId: "",
                              academicLevelId: "",
                              groupId: "",
                              programId: "",
                              groupProgramId: "",
                            }));
                            setFieldErrors((err) => ({
                              ...err,
                              boardId: null,
                              academicYearId: null,
                              academicLevelId: null,
                              groupId: null,
                              programId: null,
                            }));
                            loadBoardDependencies(val);
                          }}
                          options={boardOptions}
                          disabled={sectionFormMode === "preview" || dependentLoading.board}
                          placeholder="Select Board"
                          showSearch={true}
                          hasError={Boolean(fieldErrors.boardId)}
                        />
                        {fieldErrors.boardId && <span className="cms-field-error">{fieldErrors.boardId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.academicYearId ? "has-error" : ""}`}>
                        <label>
                          Academic Year <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.academicYearId}
                          onChange={(val) => {
                            setSectionForm((f) => ({ ...f, academicYearId: val }));
                            setFieldErrors((err) => ({ ...err, academicYearId: null }));
                          }}
                          options={filteredYearOptions}
                          disabled={sectionFormMode === "preview" || !sectionForm.boardId || dependentLoading.board}
                          placeholder={!sectionForm.boardId ? "Select Board First" : "Select Academic Year"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.academicYearId)}
                        />
                        {fieldErrors.academicYearId && <span className="cms-field-error">{fieldErrors.academicYearId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.groupId ? "has-error" : ""}`}>
                        <label>
                          Group <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.groupId}
                          onChange={(val) => {
                            setSectionForm((f) => ({ ...f, groupId: val, programId: "", groupProgramId: "" }));
                            setFieldErrors((err) => ({ ...err, groupId: null, programId: null }));
                            loadPrograms(val);
                          }}
                          options={filteredGroupOptions}
                          disabled={sectionFormMode === "preview" || !sectionForm.boardId || dependentLoading.board}
                          placeholder={!sectionForm.boardId ? "Select Board First" : "Select Group (e.g. MPC, BiPC)"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.groupId)}
                        />
                        {fieldErrors.groupId && <span className="cms-field-error">{fieldErrors.groupId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.programId ? "has-error" : ""}`}>
                        <label>
                          Program <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.programId}
                          onChange={(val) => {
                            const selectedProgram = programsList.find((item) => normalizeId(item.programId) === normalizeId(val));
                            setSectionForm((f) => ({ ...f, programId: val, groupProgramId: selectedProgram?.groupProgramId || "" }));
                            setFieldErrors((err) => ({ ...err, programId: null }));
                          }}
                          options={filteredProgramOptions}
                          disabled={sectionFormMode === "preview" || dependentLoading.program || !sectionForm.groupId}
                          placeholder={!sectionForm.groupId ? "Select Group First" : "Select Program (e.g. IIT, Mains)"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.programId)}
                        />
                        {fieldErrors.programId && <span className="cms-field-error">{fieldErrors.programId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.academicLevelId ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                        <label>
                          Academic Level <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.academicLevelId}
                          onChange={(val) => {
                            setSectionForm((f) => ({ ...f, academicLevelId: val }));
                            setFieldErrors((err) => ({ ...err, academicLevelId: null }));
                          }}
                          options={levelOptions}
                          disabled={sectionFormMode === "preview" || !sectionForm.boardId || dependentLoading.board}
                          placeholder={!sectionForm.boardId ? "Select Board First" : "Select Academic Level"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.academicLevelId)}
                        />
                        {fieldErrors.academicLevelId && <span className="cms-field-error">{fieldErrors.academicLevelId}</span>}
                      </div>
                    </div>

                    {/* SINGLE SECTION FORM */}
                    {(sectionCreationType === "single" || selectedSectionId) && (
                      <>
                        <div className="cms-sec-form-section-title" style={{ marginTop: "12px" }}>
                          <Building2 size={14} /> Section & Allocation Details
                        </div>
                        <div className="cms-sec-form-grid">
                          <div className={`cms-field ${fieldErrors.name ? "has-error" : ""}`}>
                            <label>
                              Section Name <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={sectionForm.name}
                              disabled={sectionFormMode === "preview"}
                              placeholder="e.g. Section A"
                              onChange={(e) => {
                                setSectionForm((f) => ({ ...f, name: e.target.value }));
                                setFieldErrors((err) => ({ ...err, name: null }));
                              }}
                            />
                            {fieldErrors.name && <span className="cms-field-error">{fieldErrors.name}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.roomId ? "has-error" : ""}`}>
                            <label>
                              Room No <span className="req">*</span>
                            </label>
                            <SearchableSelect
                              value={sectionForm.roomId}
                              onChange={handleSectionRoomChange}
                              options={availableRooms}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Select Room No"
                              emptyText="No eligible classrooms available"
                              showSearch={true}
                              hasError={Boolean(fieldErrors.roomId)}
                            />
                            {fieldErrors.roomId && <span className="cms-field-error">{fieldErrors.roomId}</span>}
                          </div>

                          <div className="cms-field">
                            <label>Incharge (Invigilator / Faculty)</label>
                            <SearchableSelect
                              value={sectionForm.classTeacherId}
                              onChange={(val) => setSectionForm((f) => ({ ...f, classTeacherId: val }))}
                              options={availableTeachers}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Select Incharge (Optional)"
                              emptyText="No unassigned faculty available"
                              showSearch={true}
                              hasError={Boolean(fieldErrors.classTeacherId)}
                            />
                            {fieldErrors.classTeacherId && <span className="cms-field-error">{fieldErrors.classTeacherId}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.strength ? "has-error" : ""}`}>
                            <label>
                              Capacity / Maximum Strength <span className="req">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={sectionForm.strength}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Capacity"
                              onChange={(e) => {
                                setSectionForm((f) => ({ ...f, strength: e.target.value }));
                                setFieldErrors((err) => ({ ...err, strength: null }));
                              }}
                            />
                            {fieldErrors.strength && <span className="cms-field-error">{fieldErrors.strength}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.status ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                            <label>
                              Status <span className="req">*</span>
                            </label>
                            <select
                              className="cms-sec-native-select"
                              value={sectionForm.status}
                              onChange={(event) => {
                                setSectionForm((f) => ({ ...f, status: event.target.value }));
                                setFieldErrors((err) => ({ ...err, status: null }));
                              }}
                              disabled={sectionFormMode === "preview"}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            {fieldErrors.status && <span className="cms-field-error">{fieldErrors.status}</span>}
                          </div>
                        </div>
                      </>
                    )}

                    {/* BULK SECTIONS FORM */}
                    {sectionCreationType === "bulk" && !selectedSectionId && (
                      <div className="cms-bulk-sections-container">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: "700" }}>
                            Configure Program Sections ({bulkSections.length})
                          </span>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            style={{ height: "30px", padding: "4px 10px", fontSize: "12px" }}
                            onClick={() =>
                              setBulkSections((prev) => [
                                ...prev,
                                {
                                  name: "",
                                  roomId: "",
                                  classTeacherId: "",
                                  strength: "",
                                  status: "Active",
                                },
                              ])
                            }
                          >
                            + Add Another Section
                          </button>
                        </div>

                        {bulkSections.map((sec, idx) => (
                          <div className="cms-bulk-section-row" key={idx}>
                            <div className="cms-field">
                              <input
                                type="text"
                                placeholder="Section Name"
                                value={sec.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].name = val;
                                    return next;
                                  });
                                }}
                              />
                              {fieldErrors[`name_${idx}`] && <span className="cms-field-error">{fieldErrors[`name_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <SearchableSelect
                                value={sec.roomId}
                                onChange={(roomId) => handleBulkSectionRoomChange(idx, roomId)}
                                options={getAvailableRoomsForBulkRow(idx)}
                                placeholder="Select Room No"
                                showSearch={true}
                                hasError={Boolean(fieldErrors[`room_${idx}`])}
                              />
                              {fieldErrors[`room_${idx}`] && <span className="cms-field-error">{fieldErrors[`room_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <SearchableSelect
                                value={sec.classTeacherId}
                                onChange={(val) => {
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].classTeacherId = val;
                                    return next;
                                  });
                                }}
                                options={availableTeachers}
                                placeholder="Select Incharge (Optional)"
                                showSearch={true}
                              />
                              {fieldErrors[`teacher_${idx}`] && <span className="cms-field-error">{fieldErrors[`teacher_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <input
                                type="number"
                                min="1"
                                placeholder="Capacity"
                                value={sec.strength}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].strength = val;
                                    return next;
                                  });
                                }}
                              />
                              {fieldErrors[`strength_${idx}`] && <span className="cms-field-error">{fieldErrors[`strength_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <select
                                className="cms-sec-native-select"
                                value={sec.status}
                                onChange={(event) => {
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].status = event.target.value;
                                    return next;
                                  });
                                }}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                              {fieldErrors[`status_${idx}`] && <span className="cms-field-error">{fieldErrors[`status_${idx}`]}</span>}
                            </div>

                            {bulkSections.length > 1 && (
                              <button
                                type="button"
                                className="cms-sec-action-btn cms-sec-delete-action"
                                title="Remove Row"
                                onClick={() => setBulkSections((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cms-sec-screen-foot">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => setSectionView("list")}
                    >
                      {sectionFormMode === "preview" ? "Close" : "Cancel"}
                    </button>
                    {sectionFormMode !== "preview" && (
                      <button type="submit" className="cms-btn cms-btn-primary" disabled={Boolean(operation)}>
                        {operation === "UPDATE_SECTION" ? "Updating..." : operation === "ADD_SECTION" ? "Adding..." : operation === "BULK_SECTION" ? "Creating..." : selectedSectionId ? "Save Changes" : "Create Section"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div className="cms-toast">
            <CheckCircle2 size={18} />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}