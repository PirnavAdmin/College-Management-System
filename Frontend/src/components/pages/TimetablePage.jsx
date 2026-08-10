import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, FormModal, Loader, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./TimetablePage.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const getTimetable = () => apiClient.get(apiEndpoints.timetable.getAll);
const createTimetable = (entry) => apiClient.post(apiEndpoints.timetable.create, entry);
const getTimetableById = (id) => apiClient.get(apiEndpoints.timetable.getById(id));
const updateTimetable = (id, entry) => apiClient.put(apiEndpoints.timetable.update(id), entry);
const deleteTimetable = (id) => apiClient.delete(apiEndpoints.timetable.delete(id));
const getAllocatedFaculties = () => apiClient.get(apiEndpoints.timetable.getAllocatedFaculties);
const getFacultyTimetable = (facultyId) => apiClient.get(apiEndpoints.timetable.getByFaculty(facultyId));
const getStudentTimetable = (studentId) => apiClient.get(apiEndpoints.timetable.getByStudent(studentId));
const getSectionTimetable = (sectionId) => apiClient.get(apiEndpoints.timetable.getBySection(sectionId));
const copyTimetable = (data) => apiClient.post(apiEndpoints.timetable.copy, data);
const publishTimetable = (id) => apiClient.patch(apiEndpoints.timetable.publish(id));
const publishSectionTimetable = (sectionId) => apiClient.patch(apiEndpoints.timetable.publishSection(sectionId));

const getBoards = () => apiClient.get(apiEndpoints.boards.getAll);
const getGroups = () => apiClient.get(apiEndpoints.groups.getAll, { params: { pageNumber: 1, pageSize: 20 } });
const getAcademicLevels = () => apiClient.get(apiEndpoints.boards.getAcademicLevels);
const getSubjects = () => apiClient.get(apiEndpoints.subjects.getAll);
const getFaculty = () => apiClient.get(apiEndpoints.faculty.getAll);
const getPeriods = () => apiClient.get(apiEndpoints.periods.getAll);
const getRooms = () => apiClient.get(apiEndpoints.rooms.getAll);

const valueFor = (entry, keys) => keys.map((key) => entry[key]).find((value) => value !== undefined && value !== null && value !== "");
const facultyName = (faculty) => faculty.fullName || faculty.name || [faculty.firstName, faculty.lastName].filter(Boolean).join(" ");
const dayFromValue = (value) => {
  const numericDay = Number(value);
  // The existing timetable data mixes 0-based and 1-based weekday values.
  // Treat 0 as Monday so it stays in the same school-week row as the related records.
  if (numericDay === 0 && String(value).trim() !== "") return "Monday";
  if (Number.isInteger(numericDay) && String(value).trim() !== "") return DAYS[numericDay - 1] || String(value);
  return String(value || "");
};
const periodFromValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  return typeof value === "number" || /^\d+$/.test(String(value)) ? `Period ${value}` : String(value);
};
const periodOrder = (period) => Number(String(period).match(/\d+/)?.[0]) || Number.MAX_SAFE_INTEGER;
const entryDay = (entry) => dayFromValue(valueFor(entry, ["day", "dayOfWeek", "weekday"]));
const entryPeriod = (entry) => periodFromValue(valueFor(entry, ["period", "periodNumber", "periodName", "timeSlot", "periodTime"]));
const entrySubject = (entry) => valueFor(entry, ["subjectName", "subject"]);
const entryFaculty = (entry) => valueFor(entry, ["facultyName", "faculty"]);
const entryRoom = (entry) => valueFor(entry, ["room", "roomName", "roomNumber"]);

export default function TimetablePage() {
  const [filters, setFilters] = useState({});
  const [options, setOptions] = useState({ board: [], group: [], level: [], subject: [], faculty: [], period: [], room: [] });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  const loadDropdowns = useCallback(async () => {
    try {
      const [boards, groups, levels, subjects, faculty, periods, rooms] = await Promise.all([getBoards(), getGroups(), getAcademicLevels(), getSubjects(), getFaculty(), getPeriods(), getRooms()]);
      setOptions({
        board: extractItems(boards.data).map((item) => item.boardCode || item.boardName).filter(Boolean),
        group: extractItems(groups.data).map((item) => item.groupCode || item.groupName).filter(Boolean),
        level: extractItems(levels.data).map((item) => item.levelName).filter(Boolean),
        subject: extractItems(subjects.data).map((item) => item.subjectName || item.name).filter(Boolean),
        faculty: extractItems(faculty.data).map(facultyName).filter(Boolean),
        period: extractItems(periods.data)
          .filter((item) => item.isActive !== false && item.isBreak !== true)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map((item) => item.periodName)
          .filter(Boolean),
        room: extractItems(rooms.data)
          .filter((item) => item.isActive !== false)
          .map((item) => item.roomName || item.roomCode)
          .filter(Boolean),
      });
    } catch (error) {
      setToast(getApiErrorMessage(error));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTimetable();
      setEntries(extractItems(response.data));
    } catch (error) {
      setToast(getApiErrorMessage(error));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDropdowns(); load(); }, [loadDropdowns, load]);

  const filterFields = useMemo(() => [
    { name: "board", label: "Board", type: "select", options: options.board },
    { name: "level", label: "Academic Level", type: "select", options: options.level },
    { name: "group", label: "Group", type: "select", options: options.group },
  ], [options]);

  const periodFields = useMemo(() => [
    { name: "board", label: "Board", type: "select", options: options.board, required: true },
    { name: "academicLevel", label: "Academic Level", type: "select", options: options.level, required: true },
    { name: "group", label: "Group", type: "select", options: options.group, required: true },
    { name: "day", label: "Day", type: "select", options: DAYS, required: true },
    { name: "period", label: "Period", type: "select", options: options.period, required: true },
    { name: "subject", label: "Subject", type: "select", options: options.subject, required: true },
    { name: "faculty", label: "Faculty", type: "select", options: options.faculty, required: true },
    { name: "room", label: "Room", type: "select", options: options.room, required: true },
  ], [options]);

  const periods = useMemo(() => [...new Set(entries.map(entryPeriod).filter(Boolean))].sort((a, b) => periodOrder(a) - periodOrder(b) || a.localeCompare(b)), [entries]);
  const days = useMemo(() => {
    const apiDays = [...new Set(entries.map(entryDay).filter(Boolean))];
    return [...DAYS, ...apiDays.filter((day) => !DAYS.includes(day))];
  }, [entries]);

  const addPeriod = async (values) => {
    try {
      await createTimetable(values);
      setAdding(false);
      setToast("Timetable period saved successfully");
      load();
    } catch (error) {
      setToast(getApiErrorMessage(error));
    }
  };

  return (
    <DashboardLayout title="Timetable Management" subtitle="Weekly class timetable with subject, faculty and room allocation." breadcrumb={["Operations"]} actions={<button className="cms-btn cms-btn-primary" onClick={() => setAdding(true)}>Add Period</button>}>
      <div className="cms-card" style={{ marginBottom: 16 }}><div className="cms-card-body"><div className="cms-filters">{filterFields.map((field) => <Field key={field.name} field={field} value={filters[field.name]} onChange={(name, value) => setFilters((previous) => ({ ...previous, [name]: value }))} />)}</div><div style={{ display: "flex", gap: 10, marginTop: 14 }}><button className="cms-btn cms-btn-primary" onClick={load}>Load Timetable</button><button className="cms-btn cms-btn-ghost" onClick={() => setFilters({})}>Reset</button></div></div></div>
      <div className="cms-card"><div className="cms-card-head"><h2>Weekly Timetable</h2><span className="cms-badge cms-badge-info">{filters.group || "All"} • {filters.level || "All"}</span></div>{loading ? <Loader label="Loading timetable..." /> : <div className="cms-table-wrap" style={{ padding: 12 }}><table className="cms-tt"><thead><tr><th>Day / Period</th>{periods.map((period) => <th key={period}>{period}</th>)}</tr></thead><tbody>{days.map((day) => <tr key={day}><td className="cms-tt-day">{day}</td>{periods.map((period) => { const entry = entries.find((item) => entryDay(item) === day && entryPeriod(item) === period); const subject = entry && entrySubject(entry); return <td key={`${day}-${period}`} className={subject ? "" : "empty"}><strong>{subject || "Free"}</strong>{subject ? <span>{entryFaculty(entry)} • {entryRoom(entry)}</span> : null}</td>; })}</tr>)}</tbody></table></div>}</div>
      {adding ? <FormModal title="Add Timetable Period" fields={periodFields} initial={{ board: filters.board || "", academicLevel: filters.level || "", group: filters.group || "" }} onCancel={() => setAdding(false)} onSave={addPeriod} /> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
