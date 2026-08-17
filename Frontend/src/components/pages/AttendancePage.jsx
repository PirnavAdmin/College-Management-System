import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Toast } from "@/components/common/Ui.jsx";
import { sections as mockSections } from "@/data/mockData.js";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AttendancePage.css";

const marksList = ["Present", "Absent", "Late", "Leave"];
const defaultSectionNames = ["Section A", "Section B"];

// Maps UI labels to the numeric status codes the backend expects.
// Confirm against the AttendanceStatus enum in Swagger's "Schemas" section.
const statusMap = { Present: 1, Absent: 2, Late: 3, Leave: 4 };
const reverseStatusMap = { 1: "Present", 2: "Absent", 3: "Late", 4: "Leave" };

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.data || data?.Data || data?.items || data?.Items || [];
};

const mapNameId = (items, idKeys, nameKeys) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined && v !== null);
    const name = nameKeys.map((k) => it[k]).find((v) => v !== undefined && v !== null && v !== "");
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
};

const getFallbackSections = (groupName) => {
  const matchingSections = mockSections
    .filter((section) => section.group === groupName)
    .map((section) => section.name);
  return matchingSections.length ? matchingSections : defaultSectionNames;
};

// Normalizes a raw attendance record from search responses into a shape the
// history table can render, tolerating PascalCase or camelCase payloads.
const mapRecord = (r) => ({
  attendanceId: r.attendanceId ?? r.AttendanceId,
  attendanceSessionId: r.attendanceSessionId ?? r.AttendanceSessionId ?? null,
  date: (r.attendanceDate ?? r.AttendanceDate ?? "").toString().split("T")[0],
  roll: r.rollNumber ?? r.RollNumber ?? "",
  name: r.studentName ?? r.StudentName ?? "",
  subject: r.subjectName ?? r.SubjectName ?? "",
  faculty: r.facultyName ?? r.FacultyName ?? "",
  status: r.status ?? r.Status,
  remarks: r.remarks ?? r.Remarks ?? "",
  isActive: r.isActive ?? r.IsActive ?? true,
  isLocked: r.isLocked ?? r.IsLocked ?? false,
});

// Normalizes a raw row from the percentage report endpoint.
const mapPercentageRow = (r) => ({
  studentId: r.studentId ?? r.StudentId,
  roll: r.rollNumber ?? r.RollNumber ?? "",
  name: r.studentName ?? r.StudentName ?? "",
  totalDays: r.totalDays ?? r.TotalDays ?? r.totalSessions ?? r.TotalSessions ?? 0,
  presentDays: r.presentDays ?? r.PresentDays ?? r.presentCount ?? r.PresentCount ?? 0,
  percentage: r.percentage ?? r.Percentage ?? r.attendancePercentage ?? r.AttendancePercentage ?? 0,
});

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [toast, setToast] = useState("");

  // ---- Shared lookup data (loaded once, used across all sections) ----
  const [boards, setBoards] = useState([]);
  const [boardMap, setBoardMap] = useState({});
  const [years, setYears] = useState([]);
  const [yearMap, setYearMap] = useState({});
  const [levels, setLevels] = useState([]);
  const [levelMap, setLevelMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [subjectMap, setSubjectMap] = useState({});
  const [faculty, setFaculty] = useState([]);
  const [facultyMap, setFacultyMap] = useState({});
  const [periods, setPeriods] = useState([]);
  const [periodMap, setPeriodMap] = useState({});
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      setLookupsLoading(true);
      try {
        const results = await Promise.allSettled([
          apiClient.get(apiEndpoints.boards.getAll),
          apiClient.get(apiEndpoints.academicYears.getAll),
          apiClient.get(apiEndpoints.boards.academicLevels),
          apiClient.get(apiEndpoints.groups.getAll),
          apiClient.get(apiEndpoints.subjects.getAll),
          apiClient.get(apiEndpoints.faculty.getAll),
          apiClient.get(apiEndpoints.periods.getAll),
        ]);
        if (!mounted) return;

        const loadOptions = (index, setNames, setMap, idKeys, nameKeys) => {
          const result = results[index];
          if (result.status !== "fulfilled") return false;
          const mapped = mapNameId(unwrapList(result.value.data), idKeys, nameKeys);
          setNames(mapped.names);
          setMap(mapped.map);
          return true;
        };

        const succeeded = [
          loadOptions(0, setBoards, setBoardMap, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]),
          loadOptions(1, setYears, setYearMap, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]),
          loadOptions(2, setLevels, setLevelMap, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "name", "Name"]),
          loadOptions(3, setGroups, setGroupMap, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]),
          loadOptions(4, setSubjects, setSubjectMap, ["subjectId", "SubjectId", "id", "Id"], ["subjectName", "SubjectName", "name", "Name"]),
          loadOptions(5, setFaculty, setFacultyMap, ["id", "Id", "facultyId", "FacultyId"], ["fullName", "FullName", "name", "Name"]),
          loadOptions(6, setPeriods, setPeriodMap, ["periodId", "PeriodId", "id", "Id"], ["periodName", "PeriodName", "name", "Name"]),
        ];
        if (succeeded.some((success) => !success)) {
          setToast("Some filter options could not be loaded. The available dropdowns can still be used.");
        }
      } catch {
        setToast("Failed to load filter options. Please refresh and try again.");
      } finally {
        if (mounted) setLookupsLoading(false);
      }
    };
    loadLookups();
    return () => (mounted = false);
  }, []);

  // =====================================================================
  // SECTION 1 — Mark Attendance (today's roster, bulk save)
  // =====================================================================
  const [markFilters, setMarkFilters] = useState({ date: today });
  const [markSections, setMarkSections] = useState([]);
  const [markSectionMap, setMarkSectionMap] = useState({});
const [rows, setRows] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const groupId = groupMap[markFilters.group];
    if (!groupId) {
      setMarkSections([]);
      setMarkSectionMap({});
      return;
    }
    apiClient
      .get(apiEndpoints.sections.byGroup(groupId))
      .then((res) => {
        if (!mounted) return;
        const mapped = mapNameId(unwrapList(res.data), ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
        if (mapped.names.length) {
          setMarkSections(mapped.names);
          setMarkSectionMap(mapped.map);
        } else {
          const fallback = getFallbackSections(markFilters.group);
          const fallbackMap = {};
          fallback.forEach((name, index) => (fallbackMap[name] = index + 1));
          setMarkSections(fallback);
          setMarkSectionMap(fallbackMap);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = getFallbackSections(markFilters.group);
        const fallbackMap = {};
        fallback.forEach((name, index) => (fallbackMap[name] = index + 1));
        setMarkSections(fallback);
        setMarkSectionMap(fallbackMap);
      });
    return () => (mounted = false);
  }, [markFilters.group, groupMap]);

  const markFilterFields = [
    { name: "date", label: "Date", type: "date" },
    { name: "board", label: "Board", type: "select", options: boards },
    { name: "year", label: "Academic Year", type: "select", options: years },
    { name: "level", label: "Academic Level", type: "select", options: levels },
    { name: "group", label: "Group", type: "select", options: groups },
    { name: "section", label: "Section", type: "select", options: markSections },
    { name: "subject", label: "Subject", type: "select", options: subjects },
    { name: "period", label: "Period", type: "select", options: periods },
    { name: "faculty", label: "Faculty", type: "select", options: faculty },
  ];

  const setMark = (id, mark) => setRows((r) => r.map((x) => (x.id === id ? { ...x, mark } : x)));
  const markAll = () => {
    setRows((r) => r.map((x) => ({ ...x, mark: "Present" })));
    setToast("All students marked present");
  };

  // FIX (bug #1): unselected filters now resolve to `undefined` (omitted
  // from the JSON payload) instead of `0`. Sending a literal 0 for, say,
  // subjectId tells the backend "match subject id 0", which returns no
  // results — it does NOT mean "any subject". This matches the convention
  // already used in buildHistoryFilterPayload() below.
  const loadRoster = async () => {
    setLoadingRoster(true);
    try {
      const payload = {
        boardId: boardMap[markFilters.board] || undefined,
        academicYearId: yearMap[markFilters.year] || undefined,
        academicLevelId: levelMap[markFilters.level] || undefined,
        groupId: groupMap[markFilters.group] || undefined,
        sectionId: markSectionMap[markFilters.section] || undefined,
        subjectId: subjectMap[markFilters.subject] || undefined,
        facultyId: facultyMap[markFilters.faculty] || undefined,
        periodId: periodMap[markFilters.period] || undefined,
        fromDate: markFilters.date,
        toDate: markFilters.date,
        pageNumber: 1,
        pageSize: 200,
      };
      const res = await apiClient.post(apiEndpoints.attendance.students, payload);
      const list = unwrapList(res.data).map((s) => ({
        id: s.studentId,
        roll: s.rollNumber,
        name: s.studentName,
        mark: s.isAttendanceMarked ? (reverseStatusMap[s.status] || "Present") : "Present",
      }));
      setRows(list);
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setLoadingRoster(false);
    }
  };

  // FIX (bug #1, same reasoning as loadRoster above).
  const saveRoster = async () => {
    setSaving(true);
    try {
      const payload = {
        attendanceDate: markFilters.date,
        boardId: boardMap[markFilters.board] || undefined,
        academicYearId: yearMap[markFilters.year] || undefined,
        academicLevelId: levelMap[markFilters.level] || undefined,
        groupId: groupMap[markFilters.group] || undefined,
        sectionId: markSectionMap[markFilters.section] || undefined,
        subjectId: subjectMap[markFilters.subject] || undefined,
        facultyId: facultyMap[markFilters.faculty] || undefined,
        periodId: periodMap[markFilters.period] || undefined,
        students: rows.map((r) => ({
          studentId: r.id,
          status: statusMap[r.mark],
          remarks: "",
        })),
      };
      await apiClient.post(apiEndpoints.attendance.bulk, payload);
      setToast("Attendance saved successfully");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const markSummary = marksList.map((m) => ({ m, n: rows.filter((r) => r.mark === m).length }));

  // =====================================================================
  // SECTION 2 — Attendance History (search, review, correct saved records)
  // =====================================================================
  const [historyFilters, setHistoryFilters] = useState({ fromDate: today, toDate: today });
  const [historySections, setHistorySections] = useState([]);
  const [historySectionMap, setHistorySectionMap] = useState({});
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // Multi-select for bulk-update
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("Present");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Session lock/unlock in-flight tracking (per attendanceSessionId)
  const [sessionActionId, setSessionActionId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const groupId = groupMap[historyFilters.group];
    if (!groupId) {
      setHistorySections([]);
      setHistorySectionMap({});
      return;
    }
    apiClient
      .get(apiEndpoints.sections.byGroup(groupId))
      .then((res) => {
        if (!mounted) return;
        const mapped = mapNameId(unwrapList(res.data), ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
        setHistorySections(mapped.names);
        setHistorySectionMap(mapped.map);
      })
      .catch(() => {
        if (!mounted) return;
        setHistorySections([]);
        setHistorySectionMap({});
      });
    return () => (mounted = false);
  }, [historyFilters.group, groupMap]);

  const buildHistoryFilterPayload = () => ({
    boardId: boardMap[historyFilters.board] || undefined,
    academicYearId: yearMap[historyFilters.year] || undefined,
    groupId: groupMap[historyFilters.group] || undefined,
    sectionId: historySectionMap[historyFilters.section] || undefined,
    subjectId: subjectMap[historyFilters.subject] || undefined,
    facultyId: facultyMap[historyFilters.faculty] || undefined,
    fromDate: historyFilters.fromDate ? `${historyFilters.fromDate}T00:00:00` : undefined,
    toDate: historyFilters.toDate ? `${historyFilters.toDate}T23:59:59` : undefined,
  });

  const searchHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const payload = { ...buildHistoryFilterPayload(), pageNumber: page, pageSize };
      const res = await apiClient.post(apiEndpoints.attendance.search, payload);
      const data = res.data || {};
      setRecords(unwrapList(data).map(mapRecord));
      setTotalCount(data.totalCount ?? data.TotalCount ?? 0);
      setTotalPages(data.totalPages ?? data.TotalPages ?? 1);
      setPageNumber(data.currentPage ?? data.CurrentPage ?? page);
      setSelectedIds([]);
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadHistorySummary = async () => {
    try {
      const res = await apiClient.post(apiEndpoints.attendance.summary, buildHistoryFilterPayload());
      setSummary(res.data);
    } catch {
      setSummary(null);
    }
  };

  const runHistorySearch = () => {
    searchHistory(1);
    loadHistorySummary();
  };

  const changeHistoryPage = (page) => {
    if (page < 1 || page > totalPages) return;
    searchHistory(page);
  };

  const updateRecordStatus = async (record, newMarkLabel) => {
    if (record.isLocked) {
      setToast("This session is locked. Ask an admin to unlock it first.");
      return;
    }
    setSavingId(record.attendanceId);
    try {
      await apiClient.put(apiEndpoints.attendance.update, {
        attendanceId: record.attendanceId,
        status: statusMap[newMarkLabel],
        remarks: record.remarks,
      });
      setRecords((rs) =>
        rs.map((r) => (r.attendanceId === record.attendanceId ? { ...r, status: statusMap[newMarkLabel] } : r))
      );
      setToast("Attendance updated");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const toggleRecordActive = async (record) => {
    if (record.isLocked) {
      setToast("This session is locked. Ask an admin to unlock it first.");
      return;
    }
    setSavingId(record.attendanceId);
    try {
      await apiClient.patch(`${apiEndpoints.attendance.updateStatus(record.attendanceId)}?isActive=${!record.isActive}`);
      setRecords((rs) =>
        rs.map((r) => (r.attendanceId === record.attendanceId ? { ...r, isActive: !r.isActive } : r))
      );
      setToast(record.isActive ? "Record deactivated" : "Record activated");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const deleteRecord = async (record) => {
    if (record.isLocked) {
      setToast("This session is locked. Ask an admin to unlock it first.");
      return;
    }
    if (!window.confirm(`Delete attendance record for ${record.name} on ${record.date}?`)) return;
    setSavingId(record.attendanceId);
    try {
      await apiClient.delete(apiEndpoints.attendance.delete(record.attendanceId));
      setRecords((rs) => rs.filter((r) => r.attendanceId !== record.attendanceId));
      setSelectedIds((ids) => ids.filter((id) => id !== record.attendanceId));
      setToast("Record deleted");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  // ---- Bulk-update (PUT /attendance/bulk-update) ----
  // Groups selected rows by attendanceSessionId, since the backend expects
  // one session id + a list of {attendanceId, status, remarks} per call.
  // If a selection spans multiple sessions, we fire one request per session.
  const toggleSelected = (record) => {
    if (record.isLocked) return;
    setSelectedIds((ids) =>
      ids.includes(record.attendanceId) ? ids.filter((id) => id !== record.attendanceId) : [...ids, record.attendanceId]
    );
  };

  const toggleSelectAll = () => {
    const selectable = records.filter((r) => !r.isLocked).map((r) => r.attendanceId);
    const allSelected = selectable.length > 0 && selectable.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : selectable);
  };

  // FIX (bug #2 + #3):
  //  - Only ids that were actually sent to the server in a successful PUT
  //    are now applied to local state (updatedIds), instead of blindly
  //    applying the new status to every selectedId, which previously made
  //    skipped (no-session-id) records look updated in the UI when they
  //    weren't touched on the backend.
  //  - The "some records skipped" warning is no longer silently overwritten
  //    by the final success toast — we track hadSkipped and choose one
  //    final message at the end instead of calling setToast twice.
  const applyBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      setToast("Select at least one record to bulk update");
      return;
    }
    const selectedRecords = records.filter((r) => selectedIds.includes(r.attendanceId));
    const bySession = new Map();
    selectedRecords.forEach((r) => {
      const key = r.attendanceSessionId ?? "unknown";
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key).push(r);
    });

    setBulkUpdating(true);
    const updatedIds = [];
    let hadSkipped = false;
    try {
      for (const [sessionId, recs] of bySession.entries()) {
        if (sessionId === "unknown" || sessionId === null) {
          hadSkipped = true;
          continue;
        }
        await apiClient.put(apiEndpoints.attendance.bulkUpdate, {
          attendanceSessionId: sessionId,
          updates: recs.map((r) => ({
            attendanceId: r.attendanceId,
            status: statusMap[bulkStatus],
            remarks: r.remarks,
          })),
        });
        updatedIds.push(...recs.map((r) => r.attendanceId));
      }
      setRecords((rs) =>
        rs.map((r) => (updatedIds.includes(r.attendanceId) ? { ...r, status: statusMap[bulkStatus] } : r))
      );
      setSelectedIds([]);
      setToast(
        hadSkipped
          ? "Bulk update applied. Some records had no session id and were skipped — update them individually."
          : "Bulk update applied"
      );
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setBulkUpdating(false);
    }
  };

  // ---- Lock / Unlock session ----
  const lockSession = async (record) => {
    if (!record.attendanceSessionId) {
      setToast("Missing session id for this record — cannot lock.");
      return;
    }
    setSessionActionId(record.attendanceSessionId);
    try {
      await apiClient.post(apiEndpoints.attendance.lockSession(record.attendanceSessionId));
      setRecords((rs) =>
        rs.map((r) => (r.attendanceSessionId === record.attendanceSessionId ? { ...r, isLocked: true } : r))
      );
      setSelectedIds((ids) => ids.filter((id) => !records.some((r) => r.attendanceId === id && r.attendanceSessionId === record.attendanceSessionId)));
      setToast("Session locked");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSessionActionId(null);
    }
  };

  const unlockSession = async (record) => {
    if (!record.attendanceSessionId) {
      setToast("Missing session id for this record — cannot unlock.");
      return;
    }
    setSessionActionId(record.attendanceSessionId);
    try {
      await apiClient.post(apiEndpoints.attendance.unlockSession(record.attendanceSessionId));
      setRecords((rs) =>
        rs.map((r) => (r.attendanceSessionId === record.attendanceSessionId ? { ...r, isLocked: false } : r))
      );
      setToast("Session unlocked");
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setSessionActionId(null);
    }
  };

  const historyFilterFields = [
    { name: "fromDate", label: "From Date", type: "date" },
    { name: "toDate", label: "To Date", type: "date" },
    { name: "board", label: "Board", type: "select", options: boards },
    { name: "year", label: "Academic Year", type: "select", options: years },
    { name: "group", label: "Group", type: "select", options: groups },
    { name: "section", label: "Section", type: "select", options: historySections },
    { name: "subject", label: "Subject", type: "select", options: subjects },
    { name: "faculty", label: "Faculty", type: "select", options: faculty },
  ];

  // =====================================================================
  // SECTION 3 — Attendance Percentage Report (POST /attendance/percentage)
  // =====================================================================
  const [pctFilters, setPctFilters] = useState({ fromDate: today, toDate: today });
  const [pctSections, setPctSections] = useState([]);
  const [pctSectionMap, setPctSectionMap] = useState({});
  const [pctRows, setPctRows] = useState([]);
  const [loadingPct, setLoadingPct] = useState(false);
  const [pctSearched, setPctSearched] = useState(false);

  useEffect(() => {
    let mounted = true;
    const groupId = groupMap[pctFilters.group];
    if (!groupId) {
      setPctSections([]);
      setPctSectionMap({});
      return;
    }
    apiClient
      .get(apiEndpoints.sections.byGroup(groupId))
      .then((res) => {
        if (!mounted) return;
        const mapped = mapNameId(unwrapList(res.data), ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
        setPctSections(mapped.names);
        setPctSectionMap(mapped.map);
      })
      .catch(() => {
        if (!mounted) return;
        setPctSections([]);
        setPctSectionMap({});
      });
    return () => (mounted = false);
  }, [pctFilters.group, groupMap]);

  const pctFilterFields = [
    { name: "fromDate", label: "From Date", type: "date" },
    { name: "toDate", label: "To Date", type: "date" },
    { name: "board", label: "Board", type: "select", options: boards },
    { name: "year", label: "Academic Year", type: "select", options: years },
    { name: "group", label: "Group", type: "select", options: groups },
    { name: "section", label: "Section", type: "select", options: pctSections },
    { name: "subject", label: "Subject", type: "select", options: subjects },
  ];

  const loadPercentageReport = async () => {
    setLoadingPct(true);
    setPctSearched(true);
    try {
      const payload = {
        boardId: boardMap[pctFilters.board] || undefined,
        academicYearId: yearMap[pctFilters.year] || undefined,
        groupId: groupMap[pctFilters.group] || undefined,
        sectionId: pctSectionMap[pctFilters.section] || undefined,
        subjectId: subjectMap[pctFilters.subject] || undefined,
        fromDate: pctFilters.fromDate ? `${pctFilters.fromDate}T00:00:00` : undefined,
        toDate: pctFilters.toDate ? `${pctFilters.toDate}T23:59:59` : undefined,
      };
      const res = await apiClient.post(apiEndpoints.attendance.percentage, payload);
      setPctRows(unwrapList(res.data).map(mapPercentageRow));
    } catch (err) {
      setToast(getApiErrorMessage(err));
      setPctRows([]);
    } finally {
      setLoadingPct(false);
    }
  };

  // =====================================================================
  // Render
  // =====================================================================
  return (
    <DashboardLayout title="Attendance Management" subtitle="Mark daily attendance and review saved records." breadcrumb={["Operations"]}>
      {/* ---------- Mark Attendance ---------- */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-head">
          <h2>Mark Attendance</h2>
        </div>
        <div className="cms-card-body">
          {lookupsLoading ? (
            <Loader label="Loading filter options..." />
          ) : (
            <div className="cms-filters">
              {markFilterFields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  value={markFilters[f.name]}
                  onChange={(name, value) => setMarkFilters((previous) => (
                    name === "group" ? { ...previous, group: value, section: "" } : { ...previous, [name]: value }
                  ))}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={loadRoster}>Load Students</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setMarkFilters({ date: markFilters.date })}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card" style={{ marginBottom: 32 }}>
        <div className="cms-card-head">
          <h2>Student Attendance</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {markSummary.map((s) => (
              <span key={s.m} className="cms-badge cms-badge-info">{s.m}: {s.n}</span>
            ))}
            <button className="cms-btn cms-btn-ghost" onClick={markAll}>Mark All Present</button>
          </div>
        </div>
     {loadingRoster ? (
          <Loader label="Loading students..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table cms-attendance-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: 20 }}>
                      Select filters above and click "Load Students" to view the roster.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    <td>
                      <div className="cms-radio-row">
                        {marksList.map((m) => (
                          <label key={m} className={`cms-radio ${r.mark === m ? `on-${m.toLowerCase()}` : ""}`}>
                            <input type="radio" name={`att-${r.id}`} checked={r.mark === m} onChange={() => setMark(r.id, m)} />
                            {m}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot">
<button className="cms-btn cms-btn-ghost" onClick={() => setRows([])}>Cancel</button>          <button className="cms-btn cms-btn-primary" onClick={saveRoster} disabled={saving}>{saving ? "Saving..." : "Save Attendance"}</button>
        </div>
      </div>

      {/* ---------- Attendance History ---------- */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-head">
          <h2>Attendance History</h2>
        </div>
        <div className="cms-card-body">
          {lookupsLoading ? (
            <Loader label="Loading filter options..." />
          ) : (
            <div className="cms-filters">
              {historyFilterFields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  value={historyFilters[f.name]}
                  onChange={(name, value) => setHistoryFilters((previous) => (
                    name === "group" ? { ...previous, group: value, section: "" } : { ...previous, [name]: value }
                  ))}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={runHistorySearch}>Search</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setHistoryFilters({ fromDate: today, toDate: today })}>Reset</button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="cms-card" style={{ marginBottom: 16 }}>
          <div className="cms-card-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="cms-badge cms-badge-info">Total: {summary.totalStudents ?? summary.TotalStudents ?? "-"}</span>
            <span className="cms-badge cms-badge-info">Present: {summary.present ?? summary.Present ?? "-"}</span>
            <span className="cms-badge cms-badge-info">Absent: {summary.absent ?? summary.Absent ?? "-"}</span>
            <span className="cms-badge cms-badge-info">Late: {summary.late ?? summary.Late ?? "-"}</span>
            <span className="cms-badge cms-badge-info">Leave: {summary.leave ?? summary.Leave ?? "-"}</span>
            {(summary.percentage ?? summary.Percentage) !== undefined && (
              <span className="cms-badge cms-badge-info">Percentage: {summary.percentage ?? summary.Percentage}%</span>
            )}
          </div>
        </div>
      )}

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Records ({totalCount})</h2>
        </div>

        {/* Bulk-update toolbar — only shows once something is selected */}
        {selectedIds.length > 0 && (
          <div className="cms-card-body" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid var(--border, #e5e5e5)" }}>
            <span className="cms-strong">{selectedIds.length} selected</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              {marksList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button className="cms-btn cms-btn-primary" onClick={applyBulkUpdate} disabled={bulkUpdating}>
              {bulkUpdating ? "Updating..." : `Set ${selectedIds.length} to ${bulkStatus}`}
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds([])}>Clear selection</button>
          </div>
        )}

        {loadingHistory ? (
          <Loader label="Loading records..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table cms-attendance-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={records.length > 0 && records.filter((r) => !r.isLocked).every((r) => selectedIds.includes(r.attendanceId)) && records.some((r) => !r.isLocked)}
                      aria-label="Select all records"
                    />
                  </th>
                  <th>Date</th>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th>Faculty</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  <th>Session</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: 20 }}>No records found. Adjust filters and search.</td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.attendanceId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.attendanceId)}
                        disabled={r.isLocked}
                        onChange={() => toggleSelected(r)}
                        aria-label={`Select record for ${r.name}`}
                      />
                    </td>
                    <td>{r.date}</td>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    <td>{r.subject}</td>
                    <td>{r.faculty}</td>
                    <td>
                      <select
                        value={reverseStatusMap[r.status] || "Present"}
                        disabled={r.isLocked || savingId === r.attendanceId}
                        onChange={(e) => updateRecordStatus(r, e.target.value)}
                      >
                        {marksList.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {r.isLocked && <span className="cms-badge cms-badge-warn">Locked</span>}
                      {!r.isLocked && !r.isActive && <span className="cms-badge cms-badge-muted">Inactive</span>}
                      {!r.isLocked && r.isActive && <span className="cms-badge cms-badge-success">Active</span>}
                    </td>
                    <td>
                      {r.isLocked ? (
                        <button
                          className="cms-btn cms-btn-ghost"
                          disabled={sessionActionId === r.attendanceSessionId}
                          onClick={() => unlockSession(r)}
                        >
                          {sessionActionId === r.attendanceSessionId ? "..." : "Unlock"}
                        </button>
                      ) : (
                        <button
                          className="cms-btn cms-btn-ghost"
                          disabled={sessionActionId === r.attendanceSessionId || !r.attendanceSessionId}
                          onClick={() => lockSession(r)}
                        >
                          {sessionActionId === r.attendanceSessionId ? "..." : "Lock"}
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="cms-btn cms-btn-ghost"
                          disabled={r.isLocked || savingId === r.attendanceId}
                          onClick={() => toggleRecordActive(r)}
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="cms-btn cms-btn-danger"
                          disabled={r.isLocked || savingId === r.attendanceId}
                          onClick={() => deleteRecord(r)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cms-modal-foot" style={{ justifyContent: "space-between" }}>
          <span>Page {pageNumber} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cms-btn cms-btn-ghost" disabled={pageNumber <= 1} onClick={() => changeHistoryPage(pageNumber - 1)}>Previous</button>
            <button className="cms-btn cms-btn-ghost" disabled={pageNumber >= totalPages} onClick={() => changeHistoryPage(pageNumber + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* ---------- Attendance Percentage Report ---------- */}
      <div className="cms-card" style={{ marginTop: 32, marginBottom: 16 }}>
        <div className="cms-card-head">
          <h2>Attendance Percentage Report</h2>
        </div>
        <div className="cms-card-body">
          {lookupsLoading ? (
            <Loader label="Loading filter options..." />
          ) : (
            <div className="cms-filters">
              {pctFilterFields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  value={pctFilters[f.name]}
                  onChange={(name, value) => setPctFilters((previous) => (
                    name === "group" ? { ...previous, group: value, section: "" } : { ...previous, [name]: value }
                  ))}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="cms-btn cms-btn-primary" onClick={loadPercentageReport}>Generate Report</button>
            <button className="cms-btn cms-btn-ghost" onClick={() => { setPctFilters({ fromDate: today, toDate: today }); setPctRows([]); setPctSearched(false); }}>Reset</button>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Student-wise Percentage</h2>
        </div>
        {loadingPct ? (
          <Loader label="Calculating attendance percentage..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table cms-attendance-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {pctRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                      {pctSearched ? "No data for the selected filters." : "Choose filters and click Generate Report."}
                    </td>
                  </tr>
                )}
                {pctRows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="cms-strong">{r.roll}</td>
                    <td>{r.name}</td>
                    <td>{r.presentDays}</td>
                    <td>{r.totalDays}</td>
                    <td>
                      <span className={`cms-badge ${r.percentage >= 75 ? "cms-badge-success" : "cms-badge-warn"}`}>
                        {r.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
