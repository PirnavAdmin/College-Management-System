import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, Search, X, CheckCircle2, Pencil, ChevronDown } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./SectionManagementPage.css";

const BOARDS = ["AP State Board"];
const YEARS = ["2025-26", "2026-27"];
const GROUPS = ["MPC", "BiPC", "CEC"];
const PROGRAMS = {
  MPC: ["JEE Main", "JEE Advanced", "EAPCET"],
  BiPC: ["NEET", "Medical Foundation"],
  CEC: ["CA Foundation"],
};
const LEVELS = ["1st Year", "2nd Year"];
const TEACHERS = ["Ravi Kumar", "Suresh", "Priya", "Anil"];
const PAGE_SIZE = 10;
const ROOMS = [
  {
    id: 1,
    roomCode: "A-101",
    roomName: "Classroom A-101",
    capacity: 50,
    roomType: "Classroom",
    building: "A",
    floor: "1",
    isActive: true,
  },
  {
    id: 2,
    roomCode: "A-102",
    roomName: "Classroom A-102",
    capacity: 50,
    roomType: "Classroom",
    building: "A",
    floor: "1",
    isActive: true,
  },
  {
    id: 3,
    roomCode: "A-103",
    roomName: "Classroom A-103",
    capacity: 50,
    roomType: "Classroom",
    building: "A",
    floor: "1",
    isActive: true,
  },
  {
    id: 4,
    roomCode: "A-104",
    roomName: "Classroom A-104",
    capacity: 50,
    roomType: "Classroom",
    building: "A",
    floor: "1",
    isActive: true,
  },
  {
    id: 5,
    roomCode: "B-101",
    roomName: "Classroom B-101",
    capacity: 50,
    roomType: "Classroom",
    building: "B",
    floor: "1",
    isActive: true,
  },
  {
    id: 6,
    roomCode: "B-102",
    roomName: "Classroom B-102",
    capacity: 50,
    roomType: "Classroom",
    building: "B",
    floor: "1",
    isActive: true,
  },
];
const SECTIONS = [
  {
    id: 1,
    board: "AP State Board",
    academicYear: "2026-27",
    group: "MPC",
    program: "JEE Main",
    academicLevel: "1st Year",
    name: "JEE-A",
    room: "A-101",
    teacher: "Ravi Kumar",
    strength: 40,
    status: "Active",
  },
  {
    id: 2,
    board: "AP State Board",
    academicYear: "2026-27",
    group: "MPC",
    program: "JEE Main",
    academicLevel: "1st Year",
    name: "JEE-B",
    room: "A-102",
    teacher: "Suresh",
    strength: 45,
    status: "Active",
  },
  {
    id: 3,
    board: "AP State Board",
    academicYear: "2026-27",
    group: "MPC",
    program: "JEE Advanced",
    academicLevel: "2nd Year",
    name: "JEE-Adv-1",
    room: "A-103",
    teacher: "Priya",
    strength: 35,
    status: "Active",
  },
  {
    id: 4,
    board: "AP State Board",
    academicYear: "2026-27",
    group: "BiPC",
    program: "NEET",
    academicLevel: "1st Year",
    name: "NEET-1",
    room: "A-104",
    teacher: "Anil",
    strength: 38,
    status: "Active",
  },
  {
    id: 5,
    board: "AP State Board",
    academicYear: "2026-27",
    group: "CEC",
    program: "CA Foundation",
    academicLevel: "2nd Year",
    name: "CA-Alpha",
    room: "A-102",
    teacher: "Anil",
    strength: 30,
    status: "Inactive",
  },
];
const EMPTY = {
  board: "",
  academicYear: "",
  group: "",
  program: "",
  academicLevel: "",
  name: "",
  room: "",
  teacher: "",
  strength: "",
  status: "Active",
};
const EMPTY_ROOM = {
  roomCode: "",
  roomName: "",
  capacity: "",
  roomType: "",
  building: "",
  floor: "",
  isActive: true,
};
const EMPTY_FILTERS = { board: "", academicYear: "", group: "", program: "", academicLevel: "" };
const label = (room) => room.roomCode;

export const pageConfig = {
  title: "Section Management",
  subtitle: "Manage academic sections, classrooms and teacher assignments.",
  breadcrumb: ["Academics"],
};

export default function SectionManagementPage() {
  const [context, setContext] = useState({ board: "", academicYear: "" });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [sections, setSections] = useState(SECTIONS);
  const [rooms, setRooms] = useState(ROOMS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(EMPTY);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [toast, setToast] = useState(null);

  const say = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };
  const updateFilter = (key, value) =>
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "board")
        Object.assign(next, { academicYear: "", group: "", program: "", academicLevel: "" });
      if (key === "academicYear")
        Object.assign(next, { group: "", program: "", academicLevel: "" });
      if (key === "group") Object.assign(next, { program: "", academicLevel: "" });
      if (key === "program") next.academicLevel = "";
      return next;
    });
  const change = (key, value) =>
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "board")
        Object.assign(next, {
          academicYear: "",
          group: "",
          program: "",
          academicLevel: "",
          room: "",
          teacher: "",
        });
      if (key === "academicYear")
        Object.assign(next, { group: "", program: "", academicLevel: "", room: "", teacher: "" });
      if (key === "group") Object.assign(next, { program: "", academicLevel: "", room: "" });
      if (key === "program") Object.assign(next, { academicLevel: "", room: "" });
      if (key === "academicLevel") next.room = "";
      return next;
    });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      if (appliedFilters.board && section.board !== appliedFilters.board) return false;
      if (appliedFilters.academicYear && section.academicYear !== appliedFilters.academicYear)
        return false;
      if (appliedFilters.group && section.group !== appliedFilters.group) return false;
      if (appliedFilters.program && section.program !== appliedFilters.program) return false;
      if (appliedFilters.academicLevel && section.academicLevel !== appliedFilters.academicLevel)
        return false;
      return (
        !query ||
        [
          section.name,
          section.group,
          section.program,
          section.academicLevel,
          section.teacher,
          section.room,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        )
      );
    });
  }, [sections, appliedFilters, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [appliedFilters, search]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  useEffect(() => {
    if (!modal && !roomModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, roomModal]);

  // `mode` is the single source of truth for add, edit, and preview states.
  const selected = selectedSectionId;
  const edit = mode === "edit";
  const preview = mode === "preview";
  const readOnly = mode === "preview";
  const availableRooms = useMemo(
    () =>
      rooms
        .filter((room) => room.isActive)
        .filter(
          (room) =>
            !sections.some(
              (section) =>
                section.id !== selectedSectionId &&
                section.status === "Active" &&
                section.board === form.board &&
                section.academicYear === form.academicYear &&
                section.academicLevel === form.academicLevel &&
                section.room === label(room),
            ),
        )
        .map(label),
    [rooms, sections, selectedSectionId, form.board, form.academicYear, form.academicLevel],
  );
  const availableTeachers = useMemo(
    () =>
      TEACHERS.filter(
        (teacher) =>
          !sections.some(
            (section) =>
              section.id !== selectedSectionId &&
              section.status === "Active" &&
              section.board === form.board &&
              section.academicYear === form.academicYear &&
              section.teacher === teacher,
          ),
      ),
    [sections, selectedSectionId, form.board, form.academicYear],
  );

  const close = () => {
    setModal(false);
    setSelectedSectionId(null);
    setMode("add");
  };
  const openAdd = () => {
    if (!context.board || !context.academicYear)
      return say("Please select Board and Academic Year before adding a section.");
    setSelectedSectionId(null);
    setMode("add");
    setForm({ ...EMPTY, ...context });
    setModal(true);
  };
  const openRow = (section, isPreview = false) => {
    setSelectedSectionId(section.id);
    setMode(isPreview ? "preview" : "edit");
    setForm({ ...section, strength: String(section.strength ?? "") });
    setModal(true);
  };
  const openRoomModal = () => {
    setRoomForm(EMPTY_ROOM);
    setRoomModal(true);
  };
  const save = (event) => {
    event.preventDefault();
    const required = [
      "board",
      "academicYear",
      "group",
      "program",
      "academicLevel",
      "name",
      "room",
      "teacher",
      "status",
    ];
    if (required.some((key) => !String(form[key] || "").trim()))
      return say("Please complete all required fields.");
    const capacity = Number(form.strength);
    if (!String(form.strength).trim()) return say("Capacity is required.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 150)
      return say("Capacity must be between 1 and 150.");
    const selectedRoom = rooms.find((room) => room.roomCode === form.room);
    if (selectedRoom && capacity > Number(selectedRoom.capacity))
      return say(`Section capacity cannot exceed room capacity (${selectedRoom.capacity}).`);
    const other = (section) => section.id !== selectedSectionId;
    if (
      sections.some(
        (section) =>
          other(section) &&
          section.board === form.board &&
          section.academicYear === form.academicYear &&
          section.group === form.group &&
          section.program === form.program &&
          section.academicLevel === form.academicLevel &&
          section.name.toLowerCase() === form.name.trim().toLowerCase(),
      )
    )
      return say("Section name already exists for the selected academic configuration.");
    if (
      form.status === "Active" &&
      sections.some(
        (section) =>
          other(section) &&
          section.status === "Active" &&
          section.board === form.board &&
          section.academicYear === form.academicYear &&
          section.academicLevel === form.academicLevel &&
          section.room === form.room,
      )
    )
      return say("Selected room is already assigned to another active section.");
    if (
      form.status === "Active" &&
      sections.some(
        (section) =>
          other(section) &&
          section.status === "Active" &&
          section.board === form.board &&
          section.academicYear === form.academicYear &&
          section.teacher === form.teacher,
      )
    )
      return say("Selected class teacher is already assigned to another active section.");
    const item = {
      ...form,
      id: selectedSectionId || Date.now(),
      name: form.name.trim(),
      strength: capacity,
    };
    const isEditing = Boolean(selectedSectionId);

    setSections((current) =>
      isEditing
        ? current.map((section) =>
          section.id === selectedSectionId ? item : section,
        )
        : [item, ...current],
    );

    close();

    say(
      isEditing
        ? `Section "${item.name}" updated successfully!`
        : `Section "${item.name}" added successfully!`,
    );
  };
  const saveRoom = (event) => {
    event.preventDefault();
    const room = {
      id: Date.now(),
      roomCode: roomForm.roomCode.trim(),
      roomName: roomForm.roomName.trim(),
      capacity: Number(roomForm.capacity),
      roomType: roomForm.roomType.trim(),
      building: roomForm.building.trim(),
      floor: roomForm.floor.trim(),
      isActive: roomForm.isActive,
    };
    if (
      !room.roomCode ||
      !room.roomName ||
      !room.roomType ||
      !room.building ||
      !room.floor ||
      !String(roomForm.capacity).trim()
    )
      return say("Please complete all required room fields.");
    if (!Number.isInteger(room.capacity) || room.capacity <= 0)
      return say("Room capacity must be greater than 0.");
    if (rooms.some((item) => item.roomCode.toLowerCase() === room.roomCode.toLowerCase()))
      return say("A room with this code already exists.");

    setRooms((current) => [...current, room]);
    setForm((current) => ({ ...current, room: room.roomCode }));
    setRoomModal(false);
    say("Room added successfully!");
  };

  return (
    <DashboardLayout
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="cms-sec-container">
        <div className="cms-card cms-sec-filter-card">
          <div className="cms-sec-filter-grid">
            <FilterField
              label="Board"
              value={filters.board}
              onChange={(value) => updateFilter("board", value)}
              options={BOARDS}
            />
            <FilterField
              label="Academic Year"
              value={filters.academicYear}
              onChange={(value) => updateFilter("academicYear", value)}
              options={YEARS}
              disabled={!filters.board}
            />
            <FilterField
              label="Group"
              value={filters.group}
              onChange={(value) => updateFilter("group", value)}
              options={GROUPS}
              disabled={!filters.academicYear}
            />
            <FilterField
              label="Program"
              value={filters.program}
              onChange={(value) => updateFilter("program", value)}
              options={filters.group ? PROGRAMS[filters.group] : []}
              disabled={!filters.group}
            />
            <FilterField
              label="Academic Level"
              value={filters.academicLevel}
              onChange={(value) => updateFilter("academicLevel", value)}
              options={LEVELS}
              disabled={!filters.program}
            />
          </div>
          <div className="cms-sec-filter-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setAppliedFilters(EMPTY_FILTERS);
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => {
                setAppliedFilters({ ...filters });
                setPage(1);
              }}
            >
              Check Sections
            </button>
          </div>
        </div>
        <div className="cms-card">
          <div className="cms-toolbar cms-sec-toolbar cms-sec-context-toolbar">
            <div className="cms-search cms-sec-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search sections..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="cms-sec-search-clear"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="cms-sec-all-tab">All Sections</span>
            <Select
              value={context.board}
              onChange={(value) => setContext({ board: value, academicYear: "" })}
              options={BOARDS}
              placeholder="Board"
            />
            <Select
              value={context.academicYear}
              onChange={(value) => setContext((current) => ({ ...current, academicYear: value }))}
              options={YEARS}
              placeholder="Academic Year"
              disabled={!context.board}
            />
            <button
              type="button"
              className="cms-btn cms-btn-primary cms-sec-compact-btn"
              onClick={openAdd}
            >
              <Plus size={15} />
              Add
            </button>
          </div>
          <div className="cms-table-wrap cms-sec-table-wrap">
            <table className="cms-table cms-sec-table">
              <thead>
                <tr>
                  {[
                    "Section Name",
                    "Group",
                    "Program",
                    "Academic Level",
                    "Room Number",
                    "Class Teacher",
                    "Capacity",
                    "Status",
                    "Actions",
                  ].map((title) => (
                    <th key={title}>{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.length ? (
                  shown.map((section) => (
                    <tr key={section.id}>
                      <td className="cms-strong cms-sec-name-cell">{section.name}</td>
                      <td>{section.group}</td>
                      <td>{section.program}</td>
                      <td>{section.academicLevel}</td>
                      <td>{section.room}</td>
                      <td>{section.teacher}</td>
                      <td>{section.strength}</td>
                      <td>
                        <span
                          className={`cms-badge ${section.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}
                        >
                          {section.status}
                        </span>
                      </td>
                      <td>
                        <div className="cms-sec-table-actions">
                          <button
                            type="button"
                            className="cms-sec-action-btn"
                            onClick={() => openRow(section, true)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="cms-sec-action-btn"
                            onClick={() => openRow(section, false)}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="cms-empty">
                      No sections found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="cms-sec-pagination">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={page === pages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
        {modal && (
          <div className="cms-sec-overlay" onClick={close}>
            <div className="cms-modal cms-sec-modal" onClick={(event) => event.stopPropagation()}>
              <div className="cms-modal-head">
                <h3>{preview ? "Preview Section" : selected ? (edit ? "Edit Section" : "View Section") : "Add Section"}</h3>
                <button type="button" className="cms-icon-btn" onClick={close}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={save}>
                <div className="cms-modal-body">
                  <div className="cms-form-grid cms-sec-form-grid">
                    <FormField
                      label="Board"
                      value={form.board}
                      field="board"
                      options={BOARDS}
                      disabled
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Academic Year"
                      value={form.academicYear}
                      field="academicYear"
                      options={YEARS}
                      disabled
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Group"
                      value={form.group}
                      field="group"
                      options={GROUPS}
                      disabled={!form.academicYear}
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Program"
                      value={form.program}
                      field="program"
                      options={form.group ? PROGRAMS[form.group] : []}
                      disabled={!form.group}
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Academic Level"
                      value={form.academicLevel}
                      field="academicLevel"
                      options={LEVELS}
                      disabled={!form.program}
                      readOnly={readOnly}
                      change={change}
                    />
                    <div className="cms-field">
                      <label>
                        Section Name <span className="req">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(event) => change("name", event.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="cms-field cms-sec-field cms-sec-room-field">
                      <label>
                        Room Number <span className="req">*</span>
                      </label>
                      <div className="cms-sec-room-field-row">
                        <Select
                          value={form.room}
                          onChange={(value) => change("room", value)}
                          options={availableRooms}
                          placeholder="Select Room Number"
                          disabled={!form.academicLevel || readOnly}
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost cms-sec-add-room-btn"
                            onClick={openRoomModal}
                          >
                            <Plus size={13} />
                            Add Room
                          </button>
                        )}
                      </div>
                    </div>
                    <FormField
                      label="Class Teacher"
                      value={form.teacher}
                      field="teacher"
                      options={availableTeachers}
                      disabled={!form.academicYear}
                      readOnly={readOnly}
                      change={change}
                    />
                    <div className="cms-field">
                      <label>
                        Capacity <span className="req">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.strength}
                        onChange={(event) => change("strength", event.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    <FormField
                      label="Status"
                      value={form.status}
                      field="status"
                      options={["Active", "Inactive"]}
                      searchable={false}
                      readOnly={readOnly}
                      change={change}
                    />
                  </div>
                </div>
                <div className="cms-modal-foot">
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  {!preview && (
                    <button
                      type={selected && !edit ? "button" : "submit"}
                      className="cms-btn cms-btn-primary"
                      onClick={selected && !edit ? enterEditMode : undefined}
                    >
                      {selected ? (edit ? "Save Changes" : "Edit") : "Add Section"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
        {roomModal && (
          <div className="cms-sec-overlay cms-sec-room-overlay" onClick={() => setRoomModal(false)}>
            <div
              className="cms-modal cms-sec-modal cms-sec-room-modal"
              style={{ width: "min(720px, 94%)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cms-modal-head">
                <h3>Add Room</h3>
                <button type="button" className="cms-icon-btn" onClick={() => setRoomModal(false)}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={saveRoom}>
                <div
                  className="cms-modal-body cms-sec-room-form"
                  style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 10px" }}
                >
                  <div className="cms-field">
                    <label>Room Code *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      value={roomForm.roomCode}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, roomCode: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field">
                    <label>Room Name *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      value={roomForm.roomName}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, roomName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field">
                    <label>Capacity *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      type="number"
                      value={roomForm.capacity}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, capacity: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field">
                    <label>Room Type *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      value={roomForm.roomType}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, roomType: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field">
                    <label>Building *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      value={roomForm.building}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, building: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field">
                    <label>Floor *</label>
                    <input
                      style={{ width: "100%", maxWidth: "none" }}
                      value={roomForm.floor}
                      onChange={(event) =>
                        setRoomForm((current) => ({ ...current, floor: event.target.value }))
                      }
                    />
                  </div>
                  <div className="cms-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Status *</label>
                    <Select
                      value={roomForm.isActive ? "Active" : "Inactive"}
                      onChange={(value) =>
                        setRoomForm((current) => ({ ...current, isActive: value === "Active" }))
                      }
                      options={["Active", "Inactive"]}
                      placeholder="Status"
                      searchable={false}
                    />
                  </div>
                </div>
                <div className="cms-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setRoomModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cms-btn cms-btn-primary">
                    Save Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

function FilterField({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="cms-field cms-sec-field">
      <label>{label}</label>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={`Select ${label}`}
        disabled={disabled}
      />
    </div>
  );
}
function FormField({
  label,
  value,
  field,
  options,
  disabled = false,
  searchable = true,
  readOnly,
  change,
}) {
  return (
    <div className="cms-field cms-sec-field">
      <label>
        {label} <span className="req">*</span>
      </label>
      <Select
        value={value}
        onChange={(next) => change(field, next)}
        options={options}
        placeholder={`Select ${label}`}
        disabled={disabled || readOnly}
        searchable={searchable}
      />
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled = false, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  const filteredOptions = searchable
    ? options.filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    : options;
  const toggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
    setQuery("");
  };
  return (
    <div className={`cms-sec-select ${disabled ? "is-disabled" : ""}`} ref={ref}>
      <button
        type="button"
        className="cms-sec-select-trigger"
        disabled={disabled}
        onClick={toggle}
        aria-expanded={open}
      >
        {value || placeholder}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="cms-sec-select-menu">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Search..."
            />
          )}
          <div className="cms-sec-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {option}
                </button>
              ))
            ) : (
              <span>No options found.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
