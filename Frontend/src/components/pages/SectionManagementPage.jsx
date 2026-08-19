import React, { useEffect, useMemo, useState } from "react";
import { Eye, Plus, RotateCcw, Search, X, CheckCircle2, Pencil } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./SectionManagementPage.css";

const BOARDS = ["AP State Board"];
const ACADEMIC_YEARS = ["2025-26", "2026-27"];
const GROUPS = ["MPC", "BiPC", "CEC"];
const PROGRAMMES = { MPC: ["JEE Main", "JEE Advanced", "EAPCET"], BiPC: ["NEET", "Medical Foundation"], CEC: ["CA Foundation"] };
const YEARS_OF_STUDY = ["1st Year", "2nd Year"];
const TEACHERS = ["Ravi Kumar", "Suresh", "Priya", "Anil"];
const ROOMS = ["Room 101", "Room 102", "Room 103"];
const INITIAL_SECTIONS = [
  { id: 1, board: "AP State Board", academicYear: "2026-27", group: "MPC", programme: "JEE Main", yearOfStudy: "1st Year", name: "JEE-A", room: "Room 101", teacher: "Ravi Kumar", strength: 40, status: "Active" },
  { id: 2, board: "AP State Board", academicYear: "2026-27", group: "MPC", programme: "JEE Main", yearOfStudy: "1st Year", name: "JEE-B", room: "Room 102", teacher: "Suresh", strength: 45, status: "Active" },
  { id: 3, board: "AP State Board", academicYear: "2026-27", group: "MPC", programme: "JEE Advanced", yearOfStudy: "2nd Year", name: "JEE-Adv-1", room: "Room 103", teacher: "Priya", strength: 35, status: "Active" },
  { id: 4, board: "AP State Board", academicYear: "2026-27", group: "BiPC", programme: "NEET", yearOfStudy: "1st Year", name: "NEET-1", room: "Room 101", teacher: "Priya", strength: 38, status: "Active" },
  { id: 5, board: "AP State Board", academicYear: "2026-27", group: "CEC", programme: "CA Foundation", yearOfStudy: "2nd Year", name: "CA-Alpha", room: "Room 102", teacher: "Anil", strength: 30, status: "Inactive" }
];
const EMPTY_FORM = { board: "", academicYear: "", group: "", programme: "", yearOfStudy: "", name: "", room: "", teacher: "", strength: "", status: "Active" };
const EMPTY_FILTERS = { board: "", academicYear: "", group: "", programme: "", yearOfStudy: "" };
const PAGE_SIZE = 10;

export const pageConfig = { title: "Section Management", subtitle: "Manage academic sections, classrooms and teacher assignments.", breadcrumb: ["Academics"] };

export default function SectionManagementPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const filteredSections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sections.filter((section) => {
      if (appliedFilters.board && section.board !== appliedFilters.board) return false;
      if (appliedFilters.academicYear && section.academicYear !== appliedFilters.academicYear) return false;
      if (appliedFilters.group && section.group !== appliedFilters.group) return false;
      if (appliedFilters.programme && section.programme !== appliedFilters.programme) return false;
      if (appliedFilters.yearOfStudy && section.yearOfStudy !== appliedFilters.yearOfStudy) return false;
      return !query || [section.name, section.group, section.programme, section.teacher].some((value) => value.toLowerCase().includes(query));
    });
  }, [appliedFilters, searchTerm, sections]);

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / PAGE_SIZE));
  const paginatedSections = filteredSections.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isModalOpen]);

  const updateCascading = (setValue, field, value) => setValue((current) => {
    const next = { ...current, [field]: value };
    if (field === "board") Object.assign(next, { academicYear: "", group: "", programme: "", yearOfStudy: "" });
    if (field === "academicYear") Object.assign(next, { group: "", programme: "", yearOfStudy: "" });
    if (field === "group") Object.assign(next, { programme: "", yearOfStudy: "" });
    if (field === "programme") next.yearOfStudy = "";
    return next;
  });
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setSearchTerm(""); };
  const closeModal = () => { setIsModalOpen(false); setSelectedId(null); setIsEditMode(false); setIsPreviewMode(false); };
  const openAddModal = () => { setSelectedId(null); setIsEditMode(true); setIsPreviewMode(false); setForm({ ...EMPTY_FORM, ...filters }); setIsModalOpen(true); };
  const openEditModal = (section) => {
    setSelectedId(section.id);
    setIsEditMode(true);
    setIsPreviewMode(false);
    setForm({ ...section, strength: String(section.strength) });
    setIsModalOpen(true);
  };
  const openPreviewModal = (section) => {
    setSelectedId(section.id);
    setIsEditMode(false);
    setIsPreviewMode(true);
    setForm({ ...section, strength: String(section.strength) });
    setIsModalOpen(true);
  };

  const saveSection = (event) => {
    event.preventDefault();
    const isEditing = Boolean(selectedId);
    const section = { ...form, id: selectedId ?? Date.now(), name: form.name.trim(), strength: Number(form.strength) };
    setSections((current) => selectedId ? current.map((item) => item.id === selectedId ? section : item) : [section, ...current]);
    closeModal();
    showToast(isEditing ? `Section "${section.name}" updated successfully!` : `Section "${section.name}" added successfully!`);
  };

  const field = (label, key, options, disabled = false, required = false, placeholder = "-- Select --") => (
    <SelectField label={label} value={form[key]} onChange={(value) => updateCascading(setForm, key, value)} options={options} disabled={disabled || (selectedId && !isEditMode)} required={required} placeholder={placeholder} />
  );

  return (
    <DashboardLayout title={pageConfig.title} subtitle={pageConfig.subtitle} breadcrumb={pageConfig.breadcrumb} actions={<button className="cms-btn cms-btn-primary cms-sec-compact-btn" onClick={openAddModal}><Plus size={16} />Add Section</button>}>
      <div className="cms-sec-container">
        <div className="cms-card cms-sec-filter-card">
          <div className="cms-sec-filter-grid">
            <SelectField label="Board" value={filters.board} onChange={(value) => updateCascading(setFilters, "board", value)} options={BOARDS} placeholder="All Boards" />
            <SelectField label="Academic Year" value={filters.academicYear} onChange={(value) => updateCascading(setFilters, "academicYear", value)} options={ACADEMIC_YEARS} placeholder="All Academic Years" disabled={!filters.board} />
            <SelectField label="Group" value={filters.group} onChange={(value) => updateCascading(setFilters, "group", value)} options={GROUPS} placeholder="All Groups" disabled={!filters.academicYear} />
            <SelectField label="Programme" value={filters.programme} onChange={(value) => updateCascading(setFilters, "programme", value)} options={filters.group ? PROGRAMMES[filters.group] : []} placeholder="All Programmes" disabled={!filters.group} />
            <SelectField label="Year Of Study" value={filters.yearOfStudy} onChange={(value) => updateCascading(setFilters, "yearOfStudy", value)} options={YEARS_OF_STUDY} placeholder="All Years" disabled={!filters.programme} />
          </div>
          <div className="cms-sec-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={() => setAppliedFilters(filters)}>Fetch Sections</button>
            <button className="cms-btn cms-btn-ghost" onClick={resetFilters}><RotateCcw size={15} />Reset</button>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-toolbar cms-sec-toolbar">
            <div className="cms-search cms-sec-search">
              <Search size={16} />
              <input type="search" placeholder="Search by section, group, programme or teacher..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              {searchTerm && <button className="cms-sec-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search"><X size={14} /></button>}
            </div>
            <span className="cms-sec-count-badge">Showing {filteredSections.length} {filteredSections.length === 1 ? "section" : "sections"}</span>
          </div>

          <div className="cms-table-wrap cms-sec-table-wrap">
            <table className="cms-table cms-sec-table">
              <thead>
                <tr>
                  <th>Section Name</th>
                  <th>Group</th>
                  <th>Programme</th>
                  <th>Year Of Study</th>
                  <th>Room Number</th>
                  <th>Class Teacher</th>
                  <th className="cms-sec-align-center">Capacity</th>
                  <th>Status</th>
                  <th className="cms-sec-align-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSections.length ? paginatedSections.map((row) => (
                  <tr key={row.id}>
                    <td className="cms-strong cms-sec-name-cell">{row.name}</td>
                    <td>{row.group}</td>
                    <td>{row.programme}</td>
                    <td>{row.yearOfStudy}</td>
                    <td>{row.room}</td>
                    <td>{row.teacher}</td>
                    <td className="cms-sec-align-center">{row.strength}</td>
                    <td><span className={`cms-badge ${row.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}>{row.status}</span></td>
                    <td className="cms-sec-align-center">
                      <div className="cms-sec-table-actions">
                        <button type="button" className="cms-sec-action-btn" onClick={() => openPreviewModal(row)} title="Preview section" aria-label="Preview section">
                          <Eye size={14} />
                        </button>
                        <button type="button" className="cms-sec-action-btn" onClick={() => openEditModal(row)} title="Edit section" aria-label="Edit section">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan="9" className="cms-empty">No sections found matching your criteria.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="cms-sec-pagination">
            <button className="cms-btn cms-btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button>
            <span>{currentPage} / {totalPages}</span>
            <button className="cms-btn cms-btn-ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
          </div>
        </div>

        {isModalOpen && (
          <div className="cms-sec-overlay" onClick={closeModal}>
            <div className="cms-modal cms-sec-modal" onClick={(event) => event.stopPropagation()}>
              <div className="cms-modal-head">
                <h3>{isPreviewMode ? "Preview Section" : selectedId ? "Edit Section" : "Add Section"}</h3>
                <button type="button" className="cms-icon-btn" onClick={closeModal} aria-label="Close modal"><X size={16} /></button>
              </div>
              <form onSubmit={saveSection}>
                <div className="cms-modal-body">
                  <div className="cms-form-grid cms-sec-form-grid">
                    {field("Board", "board", BOARDS, false, true)}
                    {field("Academic Year", "academicYear", ACADEMIC_YEARS, !form.board, true)}
                    {field("Group", "group", GROUPS, !form.academicYear, true)}
                    {field("Programme", "programme", form.group ? PROGRAMMES[form.group] : [], !form.group, true)}
                    {field("Year Of Study", "yearOfStudy", YEARS_OF_STUDY, !form.programme, true)}
                    <div className="cms-field">
                      <label>Section Name <span className="req">*</span></label>
                      <input value={form.name} onChange={(event) => updateCascading(setForm, "name", event.target.value)} placeholder="e.g. JEE-A" disabled={selectedId && !isEditMode} required />
                    </div>
                    {field("Room Number", "room", ROOMS, false, true)}
                    {field("Class Teacher", "teacher", TEACHERS, false, true)}
                    <div className="cms-field">
                      <label>Capacity <span className="req">*</span></label>
                      <input type="number" min="1" max="150" value={form.strength} onChange={(event) => updateCascading(setForm, "strength", event.target.value)} disabled={selectedId && !isEditMode} required />
                    </div>
                    {field("Status", "status", ["Active", "Inactive"], false, true)}
                  </div>
                </div>
                <div className="cms-modal-foot">
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>Cancel</button>
                  {isPreviewMode ? null : selectedId && !isEditMode ? (
                    <button type="button" className="cms-btn cms-btn-primary" onClick={() => setIsEditMode(true)}>Edit</button>
                  ) : (
                    <button type="submit" className="cms-btn cms-btn-primary">{selectedId ? "Save Changes" : "Add Section"}</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {toastMessage && (
          <div className="cms-toast">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SelectField({ label, value, onChange, options, placeholder = "-- Select --", disabled = false, required = false }) {
  return (
    <div className="cms-field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required={required}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

