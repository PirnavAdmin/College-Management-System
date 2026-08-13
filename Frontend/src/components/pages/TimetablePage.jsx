import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Field, FormModal, Toast } from "@/components/common/Ui.jsx";
import "./TimetablePage.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00"];
const items = (payload) => Array.isArray(payload) ? payload : payload?.items || payload?.data || payload?.data?.items || [];
const names = (payload, keys) => items(payload).map((item) => keys.map((key) => item[key]).find(Boolean)).filter(Boolean);

export default function TimetablePage() {
  const [entries, setEntries] = useState([]);
  const [options, setOptions] = useState({ board: [], academicYear: [], academicLevel: [], group: [], section: [], faculty: [], subject: [], period: [], room: [] });
  const [draftFilters, setDraftFilters] = useState({});
  const [filters, setFilters] = useState({});
  const [viewBy, setViewBy] = useState("faculty");
  const [view, setView] = useState("weekly");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [board, academicYear, academicLevel, group, section, faculty, subject, period, room] = await Promise.all([
          apiClient.get(apiEndpoints.boards.getAll), apiClient.get(apiEndpoints.academicYears.getAll), apiClient.get(apiEndpoints.boards.getAcademicLevels), apiClient.get(apiEndpoints.groups.getAll), apiClient.get(apiEndpoints.sections.getAll), apiClient.get(apiEndpoints.faculty.getAll), apiClient.get(apiEndpoints.subjects.getAll), apiClient.get(apiEndpoints.periods.getAll), apiClient.get(apiEndpoints.rooms.getAll),
        ]);
        setOptions({ board: names(board.data, ["boardName", "boardCode"]), academicYear: names(academicYear.data, ["academicYearName", "name"]), academicLevel: names(academicLevel.data, ["levelName", "name"]), group: names(group.data, ["groupName", "groupCode"]), section: names(section.data, ["sectionName", "sectionCode", "name"]), faculty: items(faculty.data).map((item) => item.fullName || item.name || [item.firstName, item.lastName].filter(Boolean).join(" ")).filter(Boolean), subject: names(subject.data, ["subjectName", "name"]), period: names(period.data, ["periodName", "timeSlot", "name"]), room: names(room.data, ["roomName", "roomCode", "name"]) });
      } catch (error) { setToast(getApiErrorMessage(error)); }
    };
    loadOptions();
  }, []);

  const fields = useMemo(() => [
    { name: "board", label: "Board", type: "select", options: options.board, required: true }, { name: "academicYear", label: "Academic Year", type: "select", options: options.academicYear, required: true }, { name: "academicLevel", label: "Academic Level", type: "select", options: options.academicLevel, required: true }, { name: "group", label: "Group", type: "select", options: options.group, required: true }, { name: "section", label: "Section", type: "select", options: options.section, required: true }, { name: "day", label: "Day", type: "select", options: DAYS, required: true }, { name: "period", label: "Period", type: "select", options: options.period, required: true }, { name: "subject", label: "Subject", type: "select", options: options.subject, required: true }, { name: "faculty", label: "Faculty", type: "select", options: options.faculty, required: true }, { name: "room", label: "Room", type: "select", options: options.room, required: true },
  ], [options]);

  const visible = useMemo(() => entries.filter((entry) => Object.entries(filters).every(([key, value]) => !value || entry[key] === value)), [entries, filters]);
  const selectedValue = filters[viewBy] || "";
  const title = selectedValue ? `${selectedValue} — Weekly Timetable` : "College Weekly Timetable";
  const selectedDays = filters.day ? [filters.day] : DAYS;

  const save = (values) => {
    const conflictingFaculty = entries.some((entry) => entry.id !== editing?.id && entry.faculty === values.faculty && entry.day === values.day && entry.period === values.period);
    const conflictingSection = entries.some((entry) => entry.id !== editing?.id && entry.section === values.section && entry.day === values.day && entry.period === values.period);
    if (conflictingFaculty) return setToast("Faculty is already assigned during this period.");
    if (conflictingSection) return setToast("Section already has a class during this period.");
    if (editing) setEntries((current) => current.map((entry) => entry.id === editing.id ? { ...entry, ...values } : entry));
    else setEntries((current) => [...current, { id: Date.now(), ...values }]);
    setEditing(null);
    setToast(`Timetable ${editing ? "updated" : "created"} successfully.`);
  };

  const renderCard = (entry) => entry ? <article className="tt-entry"><strong>{entry.subject}</strong>{!filters.faculty ? <span>{entry.faculty}</span> : null}<span>{entry.group} · {entry.section}</span><span>{entry.room}</span><div className="tt-entry-actions"><button onClick={() => setEditing(entry)} aria-label="Edit timetable entry"><Pencil size={13} /></button><button onClick={() => setDeleting(entry)} aria-label="Delete timetable entry"><Trash2 size={13} /></button></div></article> : <span className="tt-free">Free</span>;

  return <DashboardLayout title="Timetable Management" subtitle="Create, modify and view college timetables" breadcrumb={["Operations"]} actions={<button className="cms-btn cms-btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Create Timetable</button>}>
    <section className="tt-panel"><div className="tt-panel-title"><div><h2>Filter & view controls</h2><p>Filter schedules or focus on a faculty, section, group, or day.</p></div><div className="tt-segment"><button className={viewBy === "faculty" ? "active" : ""} onClick={() => setViewBy("faculty")}>Faculty</button><button className={viewBy === "section" ? "active" : ""} onClick={() => setViewBy("section")}>Section</button><button className={viewBy === "group" ? "active" : ""} onClick={() => setViewBy("group")}>Group</button></div></div>
      <div className="tt-filter-grid">{[{ name: "board", label: "Board", options: options.board }, { name: "academicYear", label: "Academic Year", options: options.academicYear }, { name: "academicLevel", label: "Academic Level", options: options.academicLevel }, { name: "group", label: "Group", options: options.group }, { name: "section", label: "Section", options: options.section }, { name: "faculty", label: "Faculty", options: options.faculty }, { name: "day", label: "Day", options: ["All Days", ...DAYS] }].map((item) => <Field key={item.name} field={{ ...item, type: "select" }} value={draftFilters[item.name] || ""} onChange={(name, value) => setDraftFilters((current) => ({ ...current, [name]: value === "All Days" ? "" : value }))} />)}</div>
      <div className="tt-filter-actions"><button className="cms-btn cms-btn-primary" onClick={() => setFilters(draftFilters)}>Apply Filters</button><button className="cms-btn cms-btn-ghost" onClick={() => { setDraftFilters({}); setFilters({}); }}>Reset</button></div>
    </section>
    <section className="tt-panel"><div className="tt-panel-title"><div><h2>{title}</h2><p>{visible.length} scheduled classes match the current view.</p></div><div className="tt-segment"><button className={view === "weekly" ? "active" : ""} onClick={() => setView("weekly")}>Weekly View</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List View</button></div></div>
      {view === "weekly" ? <div className="tt-grid-wrap"><table className="tt-grid"><thead><tr><th>Time</th>{selectedDays.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>{PERIODS.map((period) => <tr key={period}><th>{period}</th>{selectedDays.map((day) => <td key={`${day}-${period}`}>{renderCard(visible.find((entry) => entry.day === day && entry.period === period))}</td>)}</tr>)}</tbody></table></div> : <div className="cms-table-wrap"><table className="cms-table tt-list"><thead><tr>{["Day", "Period", "Subject", "Faculty", "Group", "Section", "Room", "Actions"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((entry) => <tr key={entry.id}><td>{entry.day}</td><td>{entry.period}</td><td><strong>{entry.subject}</strong></td><td>{entry.faculty}</td><td>{entry.group}</td><td>{entry.section}</td><td>{entry.room}</td><td><button className="cms-action-btn edit" onClick={() => setEditing(entry)}><Pencil size={14} /></button><button className="cms-action-btn danger" onClick={() => setDeleting(entry)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>}
    </section>
    {editing ? <FormModal title={editing.id ? "Edit Timetable Entry" : "Create Timetable"} fields={fields} initial={editing} columns={2} onCancel={() => setEditing(null)} onSave={save} /> : null}
    {deleting ? <ConfirmDialog message="Are you sure you want to delete this timetable entry?" onCancel={() => setDeleting(null)} onConfirm={() => { setEntries((current) => current.filter((entry) => entry.id !== deleting.id)); setDeleting(null); setToast("Timetable deleted successfully."); }} /> : null}
    <Toast message={toast} onClose={() => setToast("")} />
  </DashboardLayout>;
}
