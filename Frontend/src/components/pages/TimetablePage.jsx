import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, Edit3, GraduationCap, Plus, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./TimetablePage.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
  { id: "P1", start: "09:00", end: "09:45", type: "Class" },
  { id: "P2", start: "09:45", end: "10:30", type: "Class" },
  { id: "P3", start: "10:30", end: "11:15", type: "Class" },
  { id: "B1", start: "11:15", end: "11:30", type: "Break" },
  { id: "P4", start: "11:30", end: "12:15", type: "Class" },
  { id: "P5", start: "12:15", end: "01:00", type: "Class" },
  { id: "P6", start: "01:30", end: "02:15", type: "Class" },
];
const SECTIONS = ["MPC-A", "MPC-B", "MPC-C", "MPC-D"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English", "Physics Practical"];
const FACULTY = {
  Mathematics: ["Ravi Kumar"], Physics: ["Suresh Rao"], Chemistry: ["Kumar Das"], English: ["Priya Menon"], "Physics Practical": ["Suresh Rao"],
};
const ROOM = { "MPC-A": "Room 101", "MPC-B": "Room 102", "MPC-C": "Room 103", "MPC-D": "Room 104" };
const context = { academicYear: "2026-27", board: "BIEAP", level: "Intermediate", group: "MPC" };
const theory = ["Mathematics", "Physics", "English", "Chemistry", "Mathematics", "Physics"];

const initialSlots = (periodsList = PERIODS) => SECTIONS.flatMap((section, sectionIndex) => DAYS.flatMap((day, dayIndex) => periodsList.filter((period) => period.type === "Class").map((period, periodIndex) => {
  const subject = theory[(periodIndex + dayIndex + sectionIndex) % theory.length];
  return { id: `${section}-${day}-${period.id}`, section, day, period: period.id, subject, faculty: FACULTY[subject][0], room: ROOM[section], type: "Theory" };
})));

function Select({ value, onChange, options }) { return <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function Modal({ title, children, onClose }) { return <div className="ttm-overlay" onMouseDown={onClose}><section className="ttm-modal" onMouseDown={(e) => e.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose}>×</button></header>{children}</section></div>; }
function Page({ title, subtitle, children, action }) { return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Academics"]} actions={action}><main className="timetable-module">{children}</main></DashboardLayout>; }

function AcademicContextFields({
  academicYears = [],
  academicYearId = "",
  onAcademicYearChange,
  loadingAcademicYears = false,
  boards = [],
  boardId = "",
  onBoardChange,
  loadingBoards = false,
  academicLevels = [],
  academicLevelId = "",
  onAcademicLevelChange,
  loadingAcademicLevels = false,
  groups = [],
  groupId = "",
  onGroupChange,
  loadingGroups = false,
}) {
  return <div className="ttm-fields">
    <label>Academic Year<select value={academicYearId} onChange={(e) => onAcademicYearChange?.(e.target.value)} disabled={loadingAcademicYears || !academicYears.length}>
      {loadingAcademicYears && <option value="">Loading academic years...</option>}
      {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
    </select></label>
    <label>Board<select value={boardId} onChange={(e) => onBoardChange?.(e.target.value)} disabled={loadingBoards || !boards.length}>
      {loadingBoards && <option value="">Loading boards...</option>}
      {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
    </select></label>
    <label>Academic Level<select value={academicLevelId} onChange={(e) => onAcademicLevelChange?.(e.target.value)} disabled={loadingAcademicLevels || !academicLevels.length}>
      {loadingAcademicLevels && <option value="">Loading academic levels...</option>}
      {academicLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
    </select></label>
    <label>Group<select value={groupId} onChange={(e) => onGroupChange?.(e.target.value)} disabled={loadingGroups || !groups.length}>
      {loadingGroups && <option value="">Loading groups...</option>}
      {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
    </select></label>
  </div>;
}

function Setup({ academicYears, academicYearId, onAcademicYearChange, loadingAcademicYears, boards, boardId, onBoardChange, loadingBoards, academicLevels, academicLevelId, onAcademicLevelChange, loadingAcademicLevels, groups, groupId, onGroupChange, loadingGroups, periods = PERIODS, onPeriodsChange }) {
  const [days, setDays] = useState(DAYS);
  const [saved, setSaved] = useState(false);
  const [isEditingPeriods, setIsEditingPeriods] = useState(false);
  const [draftPeriods, setDraftPeriods] = useState(periods);

  useEffect(() => {
    setDraftPeriods(periods);
  }, [periods]);

  const toggleDay = (day) => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);

  const handleStartEdit = () => {
    setDraftPeriods(JSON.parse(JSON.stringify(periods)));
    setIsEditingPeriods(true);
  };

  const handleCancelEdit = () => {
    setDraftPeriods(periods);
    setIsEditingPeriods(false);
  };

  const handleSavePeriods = () => {
    if (onPeriodsChange) {
      onPeriodsChange(draftPeriods);
    }
    setIsEditingPeriods(false);
    setSaved(true);
  };

  const handleUpdatePeriod = (index, field, value) => {
    setDraftPeriods((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddPeriod = () => {
    setDraftPeriods((prev) => {
      const classCount = prev.filter(p => p.type === "Class").length + 1;
      return [
        ...prev,
        { id: `P${classCount}`, start: "02:15", end: "03:00", type: "Class" }
      ];
    });
  };

  const handleRemovePeriod = (index) => {
    setDraftPeriods((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Page title="Timetable Setup" subtitle="Configure the academic context, working days and period schedule." action={<Link className="ttm-secondary" to="/dashboard/timetable">Back</Link>}>
      <section className="ttm-card ttm-setup">
        <div className="ttm-card-title">
          <Settings2/>
          <div>
            <h2>Academic configuration</h2>
            <p>Period timing is defined here and is never changed by the generator.</p>
          </div>
        </div>
        
        <AcademicContextFields academicYears={academicYears} academicYearId={academicYearId} onAcademicYearChange={onAcademicYearChange} loadingAcademicYears={loadingAcademicYears} boards={boards} boardId={boardId} onBoardChange={onBoardChange} loadingBoards={loadingBoards} academicLevels={academicLevels} academicLevelId={academicLevelId} onAcademicLevelChange={onAcademicLevelChange} loadingAcademicLevels={loadingAcademicLevels} groups={groups} groupId={groupId} onGroupChange={onGroupChange} loadingGroups={loadingGroups}/>
        
        <h3>Working days</h3>
        <div className="ttm-days">
          {[...DAYS, "Sunday"].map((day) => (
            <label key={day}>
              <input type="checkbox" checked={days.includes(day)} onChange={() => toggleDay(day)}/>
              {day.slice(0, 3)}
            </label>
          ))}
        </div>

        <div className="ttm-period-header">
          <h3>Period schedule</h3>
          {!isEditingPeriods ? (
            <button className="ttm-secondary" type="button" onClick={handleStartEdit}>
              <Edit3 size={16} /> Edit Schedule
            </button>
          ) : (
            <div className="ttm-actions">
              <button className="ttm-secondary" type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="ttm-primary" type="button" onClick={handleSavePeriods}>
                Save Schedule
              </button>
            </div>
          )}
        </div>

        {isEditingPeriods ? (
          <div className="ttm-period-edit-wrapper">
            <div className="ttm-period-table ttm-period-table-editing">
              <div>Period</div>
              <div>Start time</div>
              <div>End time</div>
              <div>Type</div>
              <div className="ttm-period-action-heading">Action</div>
              
              {draftPeriods.map((period, index) => (
                <React.Fragment key={index}>
                  <input
                    type="text"
                    className="ttm-period-input"
                    value={period.id}
                    onChange={(e) => handleUpdatePeriod(index, "id", e.target.value)}
                    placeholder="ID"
                  />
                  <input
                    type="text"
                    className="ttm-period-input"
                    value={period.start}
                    onChange={(e) => handleUpdatePeriod(index, "start", e.target.value)}
                    placeholder="09:00"
                  />
                  <input
                    type="text"
                    className="ttm-period-input"
                    value={period.end}
                    onChange={(e) => handleUpdatePeriod(index, "end", e.target.value)}
                    placeholder="09:45"
                  />
                  <select
                    className="ttm-period-input"
                    value={period.type}
                    onChange={(e) => handleUpdatePeriod(index, "type", e.target.value)}
                  >
                    <option value="Class">Class</option>
                    <option value="Break">Break</option>
                  </select>
                  <button
                    type="button"
                    className="ttm-period-delete"
                    onClick={() => handleRemovePeriod(index)}
                    title="Delete period"
                    disabled={draftPeriods.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="ttm-period-add">
              <button
                type="button"
                className="ttm-secondary"
                onClick={handleAddPeriod}
              >
                <Plus size={16} /> Add Period
              </button>
            </div>
          </div>
        ) : (
          <div className="ttm-period-table">
            <div>Period</div>
            <div>Start time</div>
            <div>End time</div>
            <div>Type</div>
            {periods.map((period, idx) => (
              <React.Fragment key={`${period.id}-${idx}`}>
                <strong>{period.id}</strong>
                <span>{period.start}</span>
                <span>{period.end}</span>
                <span className={period.type === "Break" ? "break" : ""}>{period.type}</span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="ttm-screen-nav">
          <button className="ttm-primary" onClick={() => setSaved(true)}><CheckCircle2/> Save Setup</button>
          <Link className="ttm-primary" to="/dashboard/timetable">Next: Generate</Link>
        </div>
        {saved && <p className="ttm-success">Setup saved. You can now generate a timetable draft.</p>}
      </section>
    </Page>
  );
}

function Generate({ onGenerate, academicYears, academicYearId, onAcademicYearChange, loadingAcademicYears, boards, boardId, onBoardChange, loadingBoards, academicLevels, academicLevelId, onAcademicLevelChange, loadingAcademicLevels, groups, groupId, onGroupChange, loadingGroups, sections, loadingSections }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generateError, setGenerateError] = useState("");
  useEffect(() => { setSelected(sections.map((section) => section.name)); }, [sections]);
  const generate = async () => {
    if (!boardId || !academicYearId || !academicLevelId || !groupId || !sections.length) return;
    setBusy(true);
    setGenerateError("");
    try {
      const subjectsResponse = await apiClient.get(apiEndpoints.subjects.getByGroup(groupId));
      const subjectData = subjectsResponse.data?.data ?? subjectsResponse.data?.items ?? subjectsResponse.data;
      const subjectRequirements = (Array.isArray(subjectData) ? subjectData : [])
        .filter((subject) => subject.isActive !== false)
        .map((subject) => ({
          subjectId: Number(subject.subjectId ?? subject.id),
          weeklyPeriods: Number(subject.weeklyPeriods) || 5,
        }))
        .filter((subject) => Number.isInteger(subject.subjectId) && subject.subjectId > 0);

      if (!subjectRequirements.length) throw new Error("No subjects are available for the selected group.");

      const response = await apiClient.post("/api/v1/timetable/generate", {
        boardId: Number(boardId),
        academicLevelId: Number(academicLevelId),
        academicYearId: Number(academicYearId),
        groupId: Number(groupId),
        sectionIds: sections.map((section) => Number(section.id)).filter(Number.isInteger),
        workingDays: [1, 2, 3, 4, 5, 6],
        subjectRequirements,
      });
      const result = response.data?.data ?? response.data;
      if (result?.isSuccess === false) throw new Error(result.message || "Timetable generation failed.");
      onGenerate(result);
    } catch (error) {
      setGenerateError(error.response?.data?.message || error.message || "Unable to generate the timetable.");
    } finally {
      setBusy(false);
    }
  };
  return <Page title="Generate Timetable" subtitle="Generate a theory timetable for all selected sections together." action={<Link className="cms-btn cms-btn-ghost ttm-generate-back" to="/dashboard/timetable/setup">Back: Setup</Link>}><section className="ttm-card ttm-generate"><AcademicContextFields academicYears={academicYears} academicYearId={academicYearId} onAcademicYearChange={onAcademicYearChange} loadingAcademicYears={loadingAcademicYears} boards={boards} boardId={boardId} onBoardChange={onBoardChange} loadingBoards={loadingBoards} academicLevels={academicLevels} academicLevelId={academicLevelId} onAcademicLevelChange={onAcademicLevelChange} loadingAcademicLevels={loadingAcademicLevels} groups={groups} groupId={groupId} onGroupChange={onGroupChange} loadingGroups={loadingGroups}/><h3>Sections</h3><div className="ttm-check-list">{loadingSections ? <span>Loading sections...</span> : sections.map((section) => <label key={section.id}><input type="checkbox" checked={selected.includes(section.name)} disabled/>{section.name}</label>)}</div>{!loadingSections && !sections.length && <p className="ttm-empty">No active sections are available for this group.</p>}{generateError && <p className="ttm-warning">{generateError}</p>}<div className="ttm-info"><Sparkles/> Theory timetable only. Labs and practicals can be added manually after the draft is generated.</div><div className="ttm-screen-nav"><Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/setup">Back</Link><button className="cms-btn cms-btn-primary" disabled={!selected.length || busy || loadingSections} onClick={generate}>{busy ? "Generating draft..." : <><Sparkles/> Generate Timetable</>}</button></div></section></Page>;
}

function FacultyView({ periods = PERIODS, academicYearId = "" }) {
  const [facultyList, setFacultyList] = useState([]);
  const [facultyId, setFacultyId] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedFaculty = facultyList.find((item) => item.id === facultyId);

  useEffect(() => {
    let active = true;
    apiClient.get(apiEndpoints.faculty.getAll, { params: { PageNumber: 1, PageSize: 100, Status: "Active" } })
      .then((response) => {
        if (!active) return;
        const body = response.data?.data ?? response.data;
        const records = Array.isArray(body) ? body : body?.items ?? body?.data ?? [];
        const options = records.map((item) => ({ id: String(item.facultyId ?? item.id), name: item.facultyName ?? item.fullName ?? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(), employeeId: item.employeeId ?? item.facultyEmployeeId })).filter((item) => item.id && item.name);
        setFacultyList(options);
        setFacultyId(options[0]?.id ?? "");
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || requestError.message || "Unable to load faculty."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!facultyId) { setSchedule([]); return undefined; }
    let active = true;
    setLoading(true);
    apiClient.get(apiEndpoints.timetable.getByFaculty(facultyId), { params: academicYearId ? { academicYearId: Number(academicYearId) } : undefined })
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data ?? response.data?.items ?? [];
        setSchedule(records.map((item) => ({ id: String(item.id), section: item.sectionName, day: item.dayName, period: item.periodName, subject: item.subjectName ?? "", faculty: item.facultyName ?? selectedFaculty?.name ?? "", room: item.roomName ?? item.roomCode ?? "", type: item.remarks?.toLowerCase().includes("practical") ? "Practical" : "Theory" })).filter((item) => item.day && item.period));
      })
      .catch((requestError) => { if (active) { setSchedule([]); setError(requestError.response?.data?.message || requestError.message || "Unable to load faculty timetable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [facultyId, academicYearId, selectedFaculty?.name]);

  return (
    <div className="ttm-faculty-container" style={{ marginTop: "1rem" }}>
      <div className="ttm-faculty-select" style={{ marginBottom: "1.25rem" }}>
        <label>Select Faculty
          <select value={facultyId} disabled={loading && !facultyList.length} onChange={(event) => setFacultyId(event.target.value)}>
            {!facultyList.length && <option value="">{loading ? "Loading faculty..." : "No faculty found"}</option>}
            {facultyList.map((item) => <option key={item.id} value={item.id}>{item.name}{item.employeeId ? ` (${item.employeeId})` : ""}</option>)}
          </select>
        </label>
        <div>
          <GraduationCap/>
          <strong>{selectedFaculty?.name ?? "Faculty"}</strong>
          <span>Faculty timetable</span>
        </div>
      </div>
      {error && <p className="ttm-warning">{error}</p>}
      {loading && <p className="ttm-empty">Loading faculty timetable...</p>}
      {!loading && !error && !schedule.length && <p className="ttm-empty">No timetable entries found for this faculty.</p>}
      <WeeklyGrid slots={schedule} section="Faculty" onEdit={() => {}} periods={periods}/>
    </div>
  );
}

function Draft({ slots, periods = PERIODS, sections = [], academicYearId = "", boardId = "", academicLevelId = "", groupId = "", subjects = [], loadingSubjects = false, initialTab = "section" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sectionId, setSectionId] = useState("");
  const [sectionSlots, setSectionSlots] = useState([]);
  const [draftMeta, setDraftMeta] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [approving, setApproving] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [editing, setEditing] = useState(null); 
  const [dialog, setDialog] = useState(null); 
  const [status, setStatus] = useState("DRAFT");

  const selectedSection = sections.find((item) => item.id === sectionId) ?? sections[0];
  const section = selectedSection?.name ?? "";
  const subjectNames = subjects.map((item) => item.name).filter(Boolean);

  useEffect(() => {
    if (sections.length && !sections.some((item) => item.id === sectionId)) setSectionId(sections[0].id);
  }, [sections, sectionId]);

  useEffect(() => {
    if (!selectedSection?.id) {
      setSectionSlots([]);
      return undefined;
    }

    let active = true;
    setLoadingTimetable(true);
    setTimetableError("");
    apiClient.get(apiEndpoints.timetable.getBySection(selectedSection.id), {
      params: academicYearId ? { academicYearId: Number(academicYearId) } : undefined,
    })
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data ?? response.data?.items ?? [];
        const mappedSlots = records.map((item) => ({
          id: String(item.id),
          isPersisted: true,
          section: item.sectionName ?? selectedSection.name,
          day: item.dayName,
          dayOfWeek: item.dayOfWeek,
          period: item.periodName,
          periodId: item.periodId,
          subject: item.subjectName ?? "",
          subjectId: item.subjectId,
          faculty: item.facultyName ?? "",
          facultyId: item.facultyId,
          room: item.roomName ?? item.roomCode ?? "",
          roomId: item.roomId ?? 0,
          type: item.remarks?.toLowerCase().includes("practical") ? "Practical" : "Theory",
        })).filter((item) => item.day && item.period);
        setSectionSlots(mappedSlots);
        setDraftMeta(records[0] ?? null);
        setStatus(records[0]?.approvalStatusName?.toUpperCase() ?? "DRAFT");
        setIsValidated(false);
      })
      .catch((error) => {
        if (!active) return;
        setSectionSlots(slots.filter((item) => item.section === selectedSection.name));
        setTimetableError(error.response?.data?.message || error.message || "Unable to load this section's timetable.");
      })
      .finally(() => { if (active) setLoadingTimetable(false); });

    return () => { active = false; };
  }, [selectedSection?.id, selectedSection?.name, academicYearId, slots]);

  const saveSlot = async (slot) => {
    const selectedSubject = subjects.find((item) => item.name === slot.subject);
    const payload = {
      boardId: Number(boardId), academicLevelId: Number(academicLevelId), academicYearId: Number(academicYearId),
      groupId: Number(groupId), sectionId: Number(selectedSection?.id), dayOfWeek: Number(slot.dayOfWeek),
      periodId: Number(slot.periodId), subjectId: Number(slot.subjectId ?? selectedSubject?.id), facultyId: Number(slot.facultyId),
      roomId: Number(slot.roomId) || 0, isPublished: false, remarks: slot.type === "Practical" ? "Manual practical slot" : "Manual timetable update",
    };
    if (Object.values(payload).some((value) => Number.isNaN(value))) throw new Error("Select a valid subject and allocated faculty before saving.");
    const response = slot.isPersisted
      ? await apiClient.put(apiEndpoints.timetable.update(slot.id), payload)
      : await apiClient.post(apiEndpoints.timetable.create, payload);
    const saved = response.data?.data ?? response.data;
    const updatedSlot = {
      ...slot, id: String(saved.id ?? slot.id), isPersisted: true,
      subject: saved.subjectName ?? slot.subject, subjectId: saved.subjectId ?? payload.subjectId,
      faculty: saved.facultyName ?? slot.faculty, facultyId: saved.facultyId ?? payload.facultyId,
      room: saved.roomName ?? slot.room, roomId: saved.roomId ?? payload.roomId,
    };
    setSectionSlots((items) => items.some((item) => item.id === slot.id) ? items.map((item) => item.id === slot.id ? updatedSlot : item) : [...items, updatedSlot]);
    setIsValidated(false);
    setValidationResult(null);
    return updatedSlot;
  };

  const approveSection = async () => {
    if (!selectedSection?.id) return;
    setApproving(true);
    setApprovalError("");
    try {
      const response = await apiClient.post(apiEndpoints.timetable.approveSection(selectedSection.id), null, {
        params: academicYearId ? { academicYearId: Number(academicYearId) } : undefined,
      });
      const result = response.data?.data ?? response.data;
      if (result?.isSuccess === false) throw new Error(result.message || "Unable to approve this section timetable.");
      setStatus("APPROVED");
      setDraftMeta(result?.approvedSlots?.[0] ?? draftMeta);
      setDialog(null);
    } catch (error) {
      setApprovalError(error.response?.data?.message || error.message || "Unable to approve this section timetable.");
    } finally {
      setApproving(false);
    }
  };

  const validateSection = async () => {
    if (!selectedSection?.id) return;
    setValidating(true);
    setValidationError("");
    setValidationResult(null);
    try {
      const response = await apiClient.post(apiEndpoints.timetable.validateSection(selectedSection.id), null, {
        params: academicYearId ? { academicYearId: Number(academicYearId) } : undefined,
      });
      const result = response.data?.data ?? response.data;
      setValidationResult(result);
      setIsValidated(result?.isValid === true);
    } catch (error) {
      setValidationError(error.response?.data?.message || error.message || "Unable to validate this section timetable.");
    } finally {
      setValidating(false);
    }
  };

  const publishSection = async () => {
    if (!selectedSection?.id) return;
    setPublishing(true);
    setPublishError("");
    try {
      const response = await apiClient.patch(apiEndpoints.timetable.publishSection(selectedSection.id), { isPublished: true }, {
        params: academicYearId ? { academicYearId: Number(academicYearId) } : undefined,
      });
      const result = response.data?.data ?? response.data;
      if (result?.isSuccess === false) throw new Error(result.message || "Unable to publish this section timetable.");
      setStatus("PUBLISHED");
      setDialog(null);
    } catch (error) {
      setPublishError(error.response?.data?.message || error.message || "Unable to publish this section timetable.");
    } finally {
      setPublishing(false);
    }
  };

  const groupName = draftMeta?.groupName ?? context.group;
  const yearName = draftMeta?.academicYearName ?? context.academicYear;
  const boardName = draftMeta?.boardName ?? context.board;

  // Header Actions
  const headerActions = activeTab === "section" ? (
    <div className="ttm-actions">
      <button className="ttm-secondary" disabled={validating} onClick={() => { setDialog("validate"); validateSection(); }}>
        <ClipboardCheck size={16}/> {validating ? "Validating..." : "Validate"}
      </button>
      <button className="ttm-secondary" onClick={() => setStatus("DRAFT")}>
        Save Draft
      </button>
      <button className="ttm-secondary" disabled={status !== "DRAFT" || approving || !isValidated} onClick={() => setDialog("approve")}>
        {approving ? "Approving..." : "Approve"}
      </button>

      <button
        className="ttm-primary"
        disabled={status !== "APPROVED" || publishing}
        onClick={() => setDialog("publish")}
      >
        <Send size={16} />
        {publishing ? "Publishing..." : "Publish"}
      </button>
    </div>
  ) : (
    <Link className="ttm-secondary" to="/dashboard/timetable/setup">Back: Setup</Link>
  );

  return (
    <Page title="Timetable Management" subtitle="Review, swap views, validate and publish the generated timetable." action={headerActions}>
      <section className="ttm-card">
        <div className="ttm-view-switcher">
          <button
            type="button"
            className={`ttm-tab-btn ${activeTab === "section" ? "active" : ""}`}
            onClick={() => setActiveTab("section")}
          >
            Section Timetable
          </button>
          <button
            type="button"
            className={`ttm-tab-btn ${activeTab === "faculty" ? "active" : ""}`}
            onClick={() => setActiveTab("faculty")}
          >
            <GraduationCap size={18} /> Faculty Timetable
          </button>
        </div>

        {/* SECTION TIMETABLE TAB */}
        {activeTab === "section" ? (
          <>
            <div className="ttm-draft-meta">
              <div>
                <strong>{groupName} Group</strong>
                <span>{yearName} · {boardName}</span>
              </div>
              <b data-status={status}>{status}</b>
            </div>

            <div className="ttm-tabs">
              {sections.map((item) => (
                <button className={item.id === sectionId ? "active" : ""} key={item.id} onClick={() => setSectionId(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>

            {loadingTimetable && <p className="ttm-empty">Loading section timetable...</p>}
            {loadingSubjects && <p className="ttm-empty">Loading group subjects...</p>}
            {timetableError && <p className="ttm-warning">{timetableError}</p>}
            {approvalError && <p className="ttm-warning">{approvalError}</p>}
            {publishError && <p className="ttm-warning">{publishError}</p>}
            {!loadingTimetable && !timetableError && !sectionSlots.length && <p className="ttm-empty">No timetable entries are available for this section.</p>}

            <WeeklyGrid slots={sectionSlots} section={section} onEdit={setEditing} periods={periods} defaultSubject={subjectNames[0] ?? ""}/>

            <div className="ttm-screen-nav" style={{ marginTop: "1.5rem" }}>
              <Link className="ttm-secondary" to="/dashboard/timetable/setup">Back to Setup</Link>
              <button className="ttm-primary" onClick={() => setActiveTab("faculty")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <GraduationCap size={16} /> Switch to Faculty View
              </button>
            </div>
          </>
        ) : (
          /* FACULTY TIMETABLE TAB */
          <>
            <FacultyView periods={periods} academicYearId={academicYearId} />
            
            <div className="ttm-screen-nav" style={{ marginTop: "1.5rem" }}>
              <button className="ttm-secondary" onClick={() => setActiveTab("section")}>
                Back to Section View
              </button>
              <Link className="ttm-primary" to="/dashboard/timetable">Finish</Link>
            </div>
          </>
        )}
      </section>

      {/* Modals & Dialogs */}
      {editing && <SlotEditor slot={editing} section={section} subjects={subjects} contextIds={{ boardId, academicLevelId, academicYearId, groupId, sectionId: selectedSection?.id }} onClose={() => setEditing(null)} onSave={saveSlot}/>} 
      {dialog === "validate" && <Validation loading={validating} result={validationResult} error={validationError} onClose={() => setDialog(null)}/>} 
      {dialog === "approve" && <Confirm title="Approve Timetable" text={`Approve the timetable for ${section || "this section"}?`} confirm={approving ? "Approving..." : "Approve Draft"} onClose={() => setDialog(null)} onConfirm={approveSection}/>} 
      {dialog === "publish" && <Confirm title="Publish Timetable" text="This approved timetable will become visible to students and faculty." confirm={publishing ? "Publishing..." : "Publish Now"} onClose={() => setDialog(null)} onConfirm={publishSection}/>}
    </Page>
  );
}

function WeeklyGrid({ slots, section, onEdit, periods = PERIODS, defaultSubject = "" }) { return <div className="ttm-grid-wrap"><div className="ttm-grid"> <div className="ttm-grid-head">Period</div>{DAYS.map((day) => <div className="ttm-grid-head" key={day}>{day.slice(0,3)}</div>)}{periods.map((period) => <React.Fragment key={period.id}><div className={`ttm-period ${period.type === "Break" ? "is-break" : ""}`}>{period.id}<small>{period.start}–{period.end}</small></div>{DAYS.map((day, dayIndex) => { const slot = slots.find((item) => item.period === period.id && item.day === day); return <div className={`ttm-cell ${period.type === "Break" ? "is-break" : ""}`} key={`${period.id}-${day}`}>{period.type === "Break" ? "BREAK" : slot ? <button className="ttm-slot" onClick={() => onEdit(slot)}><strong>{slot.subject}</strong><span>{slot.faculty}</span><small>{slot.room}</small><Edit3/></button> : <button className="ttm-empty-slot" disabled={!defaultSubject} onClick={() => onEdit({ id: `${section}-${day}-${period.id}`, section, day, dayOfWeek: dayIndex + 1, period: period.id, periodId: period.periodId, subject: defaultSubject, faculty: "", room: ROOM[section] ?? "", roomId: 0, type: "Practical" })}><Plus/> Add lab</button>}</div>; })}</React.Fragment>)}</div></div>; }

function SlotEditor({ slot, section, subjects = [], contextIds = {}, onClose, onSave }) {
  const [value, setValue] = useState(slot);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const subjectOptions = subjects.map((subject) => subject.name).filter(Boolean);
  const selectedSubject = subjects.find((subject) => subject.name === value.subject);

  useEffect(() => {
    if (!selectedSubject?.id) {
      setFacultyOptions([]);
      return undefined;
    }
    let active = true;
    setLoadingFaculty(true);
    const params = Object.fromEntries(Object.entries({ ...contextIds, subjectId: Number(selectedSubject.id) })
      .filter(([, id]) => id !== "" && id !== undefined && id !== null));
    apiClient.get(apiEndpoints.timetable.getAllocatedFaculties, { params })
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data ?? response.data?.items ?? [];
        const options = records.map((faculty) => ({ id: faculty.facultyId, name: faculty.facultyName })).filter((faculty) => faculty.id && faculty.name);
        setFacultyOptions(options);
        setValue((current) => {
          const selectedFaculty = options.find((faculty) => faculty.id === current.facultyId || faculty.name === current.faculty) ?? options[0];
          return { ...current, faculty: selectedFaculty?.name ?? "", facultyId: selectedFaculty?.id ?? "", subjectId: selectedSubject.id };
        });
      })
      .catch(() => { if (active) setFacultyOptions([]); })
      .finally(() => { if (active) setLoadingFaculty(false); });
    return () => { active = false; };
  }, [selectedSubject?.id, contextIds.boardId, contextIds.academicLevelId, contextIds.academicYearId, contextIds.groupId, contextIds.sectionId]);

  const save = async () => { setSaving(true); setSaveError(""); try { await onSave(value); onClose(); } catch (error) { setSaveError(error.response?.data?.message || error.message || "Unable to save this timetable slot."); } finally { setSaving(false); } };
  return <Modal title={slot.type === "Practical" ? "Add Practical / Lab Slot" : "Edit Timetable Slot"} onClose={onClose}><div className="ttm-modal-body"><p><b>{section}</b> · {value.day} · {value.period}</p><label>Subject<Select value={value.subject} onChange={(subject) => setValue((item) => ({ ...item, subject, subjectId: subjects.find((item) => item.name === subject)?.id ?? "", faculty: "", facultyId: "" }))} options={subjectOptions}/></label><label>Faculty<select value={value.faculty} disabled={loadingFaculty || !facultyOptions.length} onChange={(event) => { const faculty = facultyOptions.find((item) => item.name === event.target.value); setValue((item) => ({ ...item, faculty: event.target.value, facultyId: faculty?.id ?? "" })); }}>{loadingFaculty && <option value="">Loading allocated faculty...</option>}{!loadingFaculty && !facultyOptions.length && <option value="">No faculty allocated</option>}{facultyOptions.map((faculty) => <option key={faculty.id} value={faculty.name}>{faculty.name}</option>)}</select></label><label>Room<select value={value.room} onChange={(e) => setValue((item) => ({ ...item, room: e.target.value }))}><option>{ROOM[section] ?? value.room}</option><option>Physics Lab</option></select></label>{saveError && <p className="ttm-warning">{saveError}</p>}<p className="ttm-info">{value.type === "Practical" ? "Manual lab room selected." : `${ROOM[section] ?? value.room} is the section default room.`}</p><div className="ttm-actions"><button className="ttm-secondary" onClick={onClose}>Cancel</button><button className="ttm-primary" disabled={saving || !value.facultyId} onClick={save}>{saving ? "Saving..." : "Save"}</button></div></div></Modal>;
}

function Validation({ loading, result, error, onClose }) { return <Modal title="Timetable Validation" onClose={onClose}><div className="ttm-modal-body">{loading && <p>Validating timetable...</p>}{error && <p className="ttm-warning">{error}</p>}{result && <><p className={result.isValid ? "ttm-success" : "ttm-warning"}>{result.isValid ? `✓ ${result.sectionName || "Section"} timetable is valid.` : "Validation found issues."}</p><p>{result.totalSlots ?? 0} timetable slot(s) checked.</p>{result.errors?.length > 0 && <ul className="ttm-validation">{result.errors.map((item, index) => <li key={`error-${index}`}>✕ {item}</li>)}</ul>}{result.warnings?.length > 0 && <ul className="ttm-validation">{result.warnings.map((item, index) => <li key={`warning-${index}`}>⚠ {item}</li>)}</ul>}</>}<button className="ttm-primary" onClick={onClose}>Done</button></div></Modal>; }

function Confirm({ title, text, confirm, onClose, onConfirm }) { return <Modal title={title} onClose={onClose}><div className="ttm-modal-body"><p>{text}</p><div className="ttm-actions"><button className="ttm-secondary" onClick={onClose}>Cancel</button><button className="ttm-primary" onClick={onConfirm}>{confirm}</button></div></div></Modal>; }

export default function TimetablePage({ screen = "generate" }) {
  const [periods, setPeriods] = useState(PERIODS);
  const [slots, setSlots] = useState(() => initialSlots(PERIODS));
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [academicLevelId, setAcademicLevelId] = useState("");
  const [loadingAcademicLevels, setLoadingAcademicLevels] = useState(true);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    let active = true;

    apiClient.get(apiEndpoints.periods.getAll)
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const schedule = records
          .filter((period) => period.isActive !== false)
          .sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0))
          .map((period) => ({
            id: period.periodName ?? `Period ${period.periodId ?? ""}`.trim(),
            periodId: period.periodId ?? period.id,
            start: String(period.startTime ?? "").slice(0, 5),
            end: String(period.endTime ?? "").slice(0, 5),
            type: period.isBreak ? "Break" : "Class",
          }))
          .filter((period) => period.id && period.start && period.end);
        if (schedule.length) setPeriods(schedule);
      })
      .catch(() => { /* Keep fallback schedule if API is unavailable. */ });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    apiClient.get(apiEndpoints.academicYears.getAll)
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const options = records
          .filter((year) => year.isActive === true)
          .map((year) => ({ id: String(year.academicYearId ?? year.id), name: year.academicYearName ?? year.name }))
          .filter((year) => year.id && year.name);
        setAcademicYears(options);
        setAcademicYearId(options[0]?.id ?? "");
      })
      .catch(() => { if (active) setAcademicYears([]); })
      .finally(() => { if (active) setLoadingAcademicYears(false); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    if (!boardId || !academicYearId || !academicLevelId) {
      setGroups([]);
      setGroupId("");
      setLoadingGroups(true);
      return () => { active = false; };
    }

    const params = {
      boardId: Number(boardId),
      academicYearId: Number(academicYearId),
      academicLevelId: Number(academicLevelId),
      isActive: true,
    };

    setLoadingGroups(true);
    apiClient.get(apiEndpoints.groups.getAll, { params })
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const options = records
          .filter((group) => group.isActive !== false)
          .map((group) => ({ id: String(group.groupId ?? group.id), name: group.groupName ?? group.name ?? group.groupCode }))
          .filter((group) => group.id && group.name);
        setGroups(options);
        setGroupId((currentId) => options.some((group) => group.id === currentId) ? currentId : options[0]?.id ?? "");
      })
      .catch(() => {
        if (!active) return;
        setGroups([]);
        setGroupId("");
      })
      .finally(() => { if (active) setLoadingGroups(false); });

    return () => { active = false; };
  }, [academicYearId, academicLevelId, boardId]);

  useEffect(() => {
    let active = true;

    if (!groupId) {
      setSections([]);
      setLoadingSections(true);
      return () => { active = false; };
    }

    setLoadingSections(true);
    apiClient.get(apiEndpoints.sections.byGroup(groupId))
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const options = records
          .filter((section) => section.isActive !== false)
          .map((section) => ({ id: String(section.sectionId ?? section.id), name: section.sectionName ?? section.name }))
          .filter((section) => section.id && section.name);
        setSections(options);
      })
      .catch(() => { if (active) setSections([]); })
      .finally(() => { if (active) setLoadingSections(false); });

    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    let active = true;

    if (!groupId) {
      setSubjects([]);
      return () => { active = false; };
    }

    setLoadingSubjects(true);
    apiClient.get(apiEndpoints.subjects.getByGroup(groupId))
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        setSubjects(records
          .filter((subject) => subject.isActive !== false)
          .map((subject) => ({ id: String(subject.subjectId ?? subject.id), name: subject.subjectName ?? subject.name }))
          .filter((subject) => subject.id && subject.name));
      })
      .catch(() => { if (active) setSubjects([]); })
      .finally(() => { if (active) setLoadingSubjects(false); });

    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    let active = true;

    apiClient.get(apiEndpoints.boards.list)
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const options = records
          .map((board) => ({ id: String(board.boardId ?? board.id), name: board.boardName ?? board.name ?? board.boardCode }))
          .filter((board) => board.id && board.name);
        setBoards(options);
        setBoardId(options[0]?.id ?? "");
      })
      .catch(() => { if (active) setBoards([]); })
      .finally(() => { if (active) setLoadingBoards(false); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    apiClient.get(apiEndpoints.boards.academicLevels)
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.items || [];
        const options = records
          .map((level) => ({ id: String(level.academicLevelId ?? level.id), name: level.levelName ?? level.name }))
          .filter((level) => level.id && level.name);
        setAcademicLevels(options);
        setAcademicLevelId(options[0]?.id ?? "");
      })
      .catch(() => { if (active) setAcademicLevels([]); })
      .finally(() => { if (active) setLoadingAcademicLevels(false); });

    return () => { active = false; };
  }, []);

  const academicYearProps = {
    academicYears, academicYearId, onAcademicYearChange: setAcademicYearId, loadingAcademicYears,
    boards, boardId, onBoardChange: setBoardId, loadingBoards,
    academicLevels, academicLevelId, onAcademicLevelChange: setAcademicLevelId, loadingAcademicLevels,
    groups, groupId, onGroupChange: setGroupId, loadingGroups,
    sections, loadingSections,
    periods, onPeriodsChange: setPeriods,
  };
  
  if (screen === "setup") return <Setup {...academicYearProps}/>;
  if (screen === "draft") return <Draft slots={slots} periods={periods} sections={sections} boardId={boardId} academicLevelId={academicLevelId} academicYearId={academicYearId} groupId={groupId} subjects={subjects} loadingSubjects={loadingSubjects}/>;
  if (screen === "faculty") return <Draft slots={slots} periods={periods} sections={sections} boardId={boardId} academicLevelId={academicLevelId} academicYearId={academicYearId} groupId={groupId} subjects={subjects} loadingSubjects={loadingSubjects} initialTab="faculty"/>;
  return <Generate {...academicYearProps} onGenerate={() => { window.location.assign("/dashboard/timetable/draft"); }}/>;
}
