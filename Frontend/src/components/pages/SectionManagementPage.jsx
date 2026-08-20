import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, Search, X, CheckCircle2, Pencil, ChevronDown } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./SectionManagementPage.css";

const BOARDS = ["AP State Board"];
const YEARS = ["2025-26", "2026-27"];
const GROUPS = ["MPC", "BiPC", "CEC"];
const PROGRAMS = { MPC: ["JEE Main", "JEE Advanced", "EAPCET"], BiPC: ["NEET", "Medical Foundation"], CEC: ["CA Foundation"] };
const LEVELS = ["1st Year", "2nd Year"];
const TEACHERS = ["Ravi Kumar", "Suresh", "Priya", "Anil"];
const PAGE_SIZE = 10;
const ROOMS = [{ id: 1, roomNumber: "101", floorNumber: "1", status: "Active" }, { id: 2, roomNumber: "102", floorNumber: "1", status: "Active" }, { id: 3, roomNumber: "103", floorNumber: "1", status: "Active" }, { id: 4, roomNumber: "104", floorNumber: "1", status: "Active" }];
const SECTIONS = [
  { id: 1, board: "AP State Board", academicYear: "2026-27", group: "MPC", program: "JEE Main", academicLevel: "1st Year", name: "JEE-A", room: "Floor 1 - Room 101", teacher: "Ravi Kumar", strength: 40, status: "Active" },
  { id: 2, board: "AP State Board", academicYear: "2026-27", group: "MPC", program: "JEE Main", academicLevel: "1st Year", name: "JEE-B", room: "Floor 1 - Room 102", teacher: "Suresh", strength: 45, status: "Active" },
  { id: 3, board: "AP State Board", academicYear: "2026-27", group: "MPC", program: "JEE Advanced", academicLevel: "2nd Year", name: "JEE-Adv-1", room: "Floor 1 - Room 103", teacher: "Priya", strength: 35, status: "Active" },
  { id: 4, board: "AP State Board", academicYear: "2026-27", group: "BiPC", program: "NEET", academicLevel: "1st Year", name: "NEET-1", room: "Floor 1 - Room 104", teacher: "Anil", strength: 38, status: "Active" },
  { id: 5, board: "AP State Board", academicYear: "2026-27", group: "CEC", program: "CA Foundation", academicLevel: "2nd Year", name: "CA-Alpha", room: "Floor 1 - Room 102", teacher: "Anil", strength: 30, status: "Inactive" }
];
const EMPTY = { board: "", academicYear: "", group: "", program: "", academicLevel: "", name: "", room: "", teacher: "", strength: "", status: "Active" };
const EMPTY_FILTERS = { board: "", academicYear: "", group: "", program: "", academicLevel: "" };
const EMPTY_ROOM = { roomNumber: "", floorNumber: "", status: "Active" };
const label = room => `Floor ${room.floorNumber} - Room ${room.roomNumber}`;

export const pageConfig = { title: "Section Management", subtitle: "Manage academic sections, classrooms and teacher assignments.", breadcrumb: ["Academics"] };

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
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [toast, setToast] = useState(null);

  const say = message => { setToast(message); setTimeout(() => setToast(null), 3000); };
  const updateFilter = (key, value) => setFilters(current => {
    const next = { ...current, [key]: value };
    if (key === "board") Object.assign(next, { academicYear: "", group: "", program: "", academicLevel: "" });
    if (key === "academicYear") Object.assign(next, { group: "", program: "", academicLevel: "" });
    if (key === "group") Object.assign(next, { program: "", academicLevel: "" });
    if (key === "program") next.academicLevel = "";
    return next;
  });
  const change = (key, value) => setForm(current => {
    const next = { ...current, [key]: value };
    if (key === "board") Object.assign(next, { academicYear: "", group: "", program: "", academicLevel: "", room: "" });
    if (key === "academicYear") Object.assign(next, { group: "", program: "", academicLevel: "", room: "" });
    if (key === "group") Object.assign(next, { program: "", academicLevel: "", room: "" });
    if (key === "program") Object.assign(next, { academicLevel: "", room: "" });
    if (key === "academicLevel") next.room = "";
    return next;
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter(section => {
      if (appliedFilters.board && section.board !== appliedFilters.board) return false;
      if (appliedFilters.academicYear && section.academicYear !== appliedFilters.academicYear) return false;
      if (appliedFilters.group && section.group !== appliedFilters.group) return false;
      if (appliedFilters.program && section.program !== appliedFilters.program) return false;
      if (appliedFilters.academicLevel && section.academicLevel !== appliedFilters.academicLevel) return false;
      return !query || [section.name, section.group, section.program, section.academicLevel, section.teacher, section.room].some(value => String(value ?? "").toLowerCase().includes(query));
    });
  }, [sections, appliedFilters, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [appliedFilters, search]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  useEffect(() => {
    if (!modal && !roomModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modal, roomModal]);

  const readOnly = Boolean(selected && !edit);
  const availableRooms = useMemo(() => rooms.filter(room => room.status === "Active").filter(room => !sections.some(section => section.id !== selected && section.status === "Active" && section.board === form.board && section.academicYear === form.academicYear && section.academicLevel === form.academicLevel && section.room === label(room))).map(label), [rooms, sections, selected, form.board, form.academicYear, form.academicLevel]);
  const availableTeachers = useMemo(() => TEACHERS.filter(teacher => !sections.some(section => section.id !== selected && section.status === "Active" && section.board === form.board && section.academicYear === form.academicYear && section.teacher === teacher)), [sections, selected, form.board, form.academicYear]);

  const close = () => { setModal(false); setSelected(null); setEdit(false); setPreview(false); };
  const openAdd = () => {
    if (!context.board || !context.academicYear) return say("Please select Board and Academic Year before adding a section.");
    setSelected(null); setEdit(true); setPreview(false); setForm({ ...EMPTY, ...context }); setModal(true);
  };
  const openRow = (section, isPreview) => { setSelected(section.id); setEdit(false); setPreview(isPreview); setForm({ ...section, strength: String(section.strength) }); setModal(true); };
  const openRoomModal = () => { setRoomForm(EMPTY_ROOM); setRoomModal(true); };
  const save = event => {
    event.preventDefault();
    const required = ["board", "academicYear", "group", "program", "academicLevel", "name", "room", "teacher", "status"];
    if (required.some(key => !String(form[key] || "").trim())) return say("Please complete all required fields.");
    const capacity = Number(form.strength);
    if (!String(form.strength).trim()) return say("Capacity is required.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 150) return say("Capacity must be between 1 and 150.");
    const other = section => section.id !== selected;
    if (sections.some(section => other(section) && section.board === form.board && section.academicYear === form.academicYear && section.group === form.group && section.program === form.program && section.academicLevel === form.academicLevel && section.name.toLowerCase() === form.name.trim().toLowerCase())) return say("Section name already exists for the selected academic configuration.");
    if (form.status === "Active" && sections.some(section => other(section) && section.status === "Active" && section.board === form.board && section.academicYear === form.academicYear && section.academicLevel === form.academicLevel && section.room === form.room)) return say("Selected room is already assigned to another active section.");
    if (form.status === "Active" && sections.some(section => other(section) && section.status === "Active" && section.board === form.board && section.academicYear === form.academicYear && section.teacher === form.teacher)) return say("Selected class teacher is already assigned to another active section.");
    const item = { ...form, id: selected || Date.now(), name: form.name.trim(), strength: capacity };
    setSections(current => selected ? current.map(section => section.id === selected ? item : section) : [item, ...current]);
    close();
    say(selected ? `Section "${item.name}" updated successfully!` : `Section "${item.name}" added successfully!`);
  };
  const saveRoom = event => {
    event.preventDefault();
    const roomNumber = roomForm.roomNumber.trim(), floorNumber = roomForm.floorNumber.trim();
    if (!roomNumber || !floorNumber || !roomForm.status) return say("Please complete all room fields.");
    if (rooms.some(room => room.roomNumber.toLowerCase() === roomNumber.toLowerCase() && room.floorNumber === floorNumber)) return say("Room already exists for the selected floor.");
    const room = { id: Date.now(), roomNumber, floorNumber, status: roomForm.status };
    setRooms(current => [...current, room]); setForm(current => ({ ...current, room: label(room) })); setRoomModal(false); say("Room added successfully!");
  };

  return <DashboardLayout title={pageConfig.title} subtitle={pageConfig.subtitle} breadcrumb={pageConfig.breadcrumb}><div className="cms-sec-container">
    <div className="cms-card cms-sec-filter-card"><div className="cms-sec-filter-grid">
      <FilterField label="Board" value={filters.board} onChange={value => updateFilter("board", value)} options={BOARDS} />
      <FilterField label="Academic Year" value={filters.academicYear} onChange={value => updateFilter("academicYear", value)} options={YEARS} disabled={!filters.board} />
      <FilterField label="Group" value={filters.group} onChange={value => updateFilter("group", value)} options={GROUPS} disabled={!filters.academicYear} />
      <FilterField label="Program" value={filters.program} onChange={value => updateFilter("program", value)} options={filters.group ? PROGRAMS[filters.group] : []} disabled={!filters.group} />
      <FilterField label="Academic Level" value={filters.academicLevel} onChange={value => updateFilter("academicLevel", value)} options={LEVELS} disabled={!filters.program} />
    </div><div className="cms-sec-filter-actions"><button type="button" className="cms-btn cms-btn-ghost" onClick={() => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setSearch(""); setPage(1); }}>Reset</button><button type="button" className="cms-btn cms-btn-primary" onClick={() => { setAppliedFilters({ ...filters }); setPage(1); }}>Check Sections</button></div></div>
    <div className="cms-card"><div className="cms-toolbar cms-sec-toolbar cms-sec-context-toolbar"><div className="cms-search cms-sec-search"><Search size={16} /><input type="search" placeholder="Search sections..." value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" className="cms-sec-search-clear" onClick={() => setSearch("")}><X size={14} /></button>}</div><span className="cms-sec-all-tab">All Sections</span><Select value={context.board} onChange={value => setContext({ board: value, academicYear: "" })} options={BOARDS} placeholder="Board" /><Select value={context.academicYear} onChange={value => setContext(current => ({ ...current, academicYear: value }))} options={YEARS} placeholder="Academic Year" disabled={!context.board} /><button type="button" className="cms-btn cms-btn-primary cms-sec-compact-btn" onClick={openAdd}><Plus size={15} />Add</button></div>
      <div className="cms-table-wrap cms-sec-table-wrap"><table className="cms-table cms-sec-table"><thead><tr>{["Section Name", "Group", "Program", "Academic Level", "Room Number", "Class Teacher", "Capacity", "Status", "Actions"].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{shown.length ? shown.map(section => <tr key={section.id}><td className="cms-strong cms-sec-name-cell">{section.name}</td><td>{section.group}</td><td>{section.program}</td><td>{section.academicLevel}</td><td>{section.room}</td><td>{section.teacher}</td><td>{section.strength}</td><td><span className={`cms-badge ${section.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}>{section.status}</span></td><td><div className="cms-sec-table-actions"><button type="button" className="cms-sec-action-btn" onClick={() => openRow(section, true)}><Eye size={14} /></button><button type="button" className="cms-sec-action-btn" onClick={() => openRow(section, false)}><Pencil size={14} /></button></div></td></tr>) : <tr><td colSpan="9" className="cms-empty">No sections found matching your criteria.</td></tr>}</tbody></table></div><div className="cms-sec-pagination"><button type="button" className="cms-btn cms-btn-ghost" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Previous</button><span>{page} / {pages}</span><button type="button" className="cms-btn cms-btn-ghost" disabled={page === pages} onClick={() => setPage(current => current + 1)}>Next</button></div></div>
    {modal && <div className="cms-sec-overlay" onClick={close}><div className="cms-modal cms-sec-modal" onClick={event => event.stopPropagation()}><div className="cms-modal-head"><h3>{preview ? "Preview Section" : selected ? "Edit Section" : "Add Section"}</h3><button type="button" className="cms-icon-btn" onClick={close}><X size={16} /></button></div><form onSubmit={save}><div className="cms-modal-body"><div className="cms-form-grid cms-sec-form-grid"><FormField label="Board" value={form.board} field="board" options={BOARDS} disabled readOnly={readOnly} change={change} /><FormField label="Academic Year" value={form.academicYear} field="academicYear" options={YEARS} disabled readOnly={readOnly} change={change} /><FormField label="Group" value={form.group} field="group" options={GROUPS} disabled={!form.academicYear} readOnly={readOnly} change={change} /><FormField label="Program" value={form.program} field="program" options={form.group ? PROGRAMS[form.group] : []} disabled={!form.group} readOnly={readOnly} change={change} /><FormField label="Academic Level" value={form.academicLevel} field="academicLevel" options={LEVELS} disabled={!form.program} readOnly={readOnly} change={change} /><div className="cms-field"><label>Section Name <span className="req">*</span></label><input value={form.name} onChange={event => change("name", event.target.value)} disabled={readOnly} /></div><div className="cms-field cms-sec-field cms-sec-room-field"><label>Room Number <span className="req">*</span></label><div className="cms-sec-room-field-row"><Select value={form.room} onChange={value => change("room", value)} options={availableRooms} placeholder="Select Room Number" disabled={!form.academicLevel || readOnly} />{!readOnly && <button type="button" className="cms-btn cms-btn-ghost cms-sec-add-room-btn" onClick={openRoomModal}><Plus size={13} />Add Room</button>}</div></div><FormField label="Class Teacher" value={form.teacher} field="teacher" options={availableTeachers} disabled={!form.academicYear} readOnly={readOnly} change={change} /><div className="cms-field"><label>Capacity <span className="req">*</span></label><input type="number" value={form.strength} onChange={event => change("strength", event.target.value)} disabled={readOnly} /></div><FormField label="Status" value={form.status} field="status" options={["Active", "Inactive"]} readOnly={readOnly} change={change} /></div></div><div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn-ghost" onClick={close}>Cancel</button>{!preview && <button type={selected && !edit ? "button" : "submit"} className="cms-btn cms-btn-primary" onClick={selected && !edit ? () => setEdit(true) : undefined}>{selected ? (edit ? "Save Changes" : "Edit") : "Add Section"}</button>}</div></form></div></div>}
    {roomModal && <div className="cms-sec-overlay cms-sec-room-overlay" onClick={() => setRoomModal(false)}><div className="cms-modal cms-sec-modal cms-sec-room-modal" onClick={event => event.stopPropagation()}><div className="cms-modal-head"><h3>Add Room</h3><button type="button" className="cms-icon-btn" onClick={() => setRoomModal(false)}><X size={16} /></button></div><form onSubmit={saveRoom}><div className="cms-modal-body cms-sec-room-form"><div className="cms-field"><label>Room Number *</label><input value={roomForm.roomNumber} onChange={event => setRoomForm(current => ({ ...current, roomNumber: event.target.value }))} /></div><div className="cms-field"><label>Floor Number *</label><input value={roomForm.floorNumber} onChange={event => setRoomForm(current => ({ ...current, floorNumber: event.target.value }))} /></div><Select value={roomForm.status} onChange={value => setRoomForm(current => ({ ...current, status: value }))} options={["Active", "Inactive"]} placeholder="Status" /></div><div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn-ghost" onClick={() => setRoomModal(false)}>Cancel</button><button className="cms-btn cms-btn-primary">Save Room</button></div></form></div></div>}
    {toast && <div className="cms-toast"><CheckCircle2 size={18} /><span>{toast}</span></div>}
  </div></DashboardLayout>;
}

function FilterField({ label, value, onChange, options, disabled = false }) { return <div className="cms-field cms-sec-field"><label>{label}</label><Select value={value} onChange={onChange} options={options} placeholder={`Select ${label}`} disabled={disabled} /></div>; }
function FormField({ label, value, field, options, disabled = false, readOnly, change }) { return <div className="cms-field cms-sec-field"><label>{label} <span className="req">*</span></label><Select value={value} onChange={next => change(field, next)} options={options} placeholder={`Select ${label}`} disabled={disabled || readOnly} /></div>; }

function Select({ value, onChange, options, placeholder, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const handleOutsideClick = event => { if (!ref.current?.contains(event.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  const filteredOptions = options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
  const toggle = () => {
    if (disabled) return;
    setOpen(current => !current);
    setQuery("");
  };
  return <div className={`cms-sec-select ${disabled ? "is-disabled" : ""}`} ref={ref}>
    <button type="button" className="cms-sec-select-trigger" disabled={disabled} onClick={toggle} aria-expanded={open}>{value || placeholder}<ChevronDown size={14} /></button>
    {open && <div className="cms-sec-select-menu"><input autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); setQuery(""); } }} placeholder="Search..." /><div className="cms-sec-select-options">{filteredOptions.length > 0 ? filteredOptions.map(option => <button type="button" key={option} onClick={() => { onChange(option); setOpen(false); setQuery(""); }}>{option}</button>) : <span>No options found.</span>}</div></div>}
  </div>;
}
