import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./AttendancePage.css";

const STATUS = [
  ["Present", 1, "P"],
  ["Absent", 2, "A"],
  ["Late", 3, "L"],
  ["Leave", 4, "LV"],
];
const TODAY = new Date().toISOString().slice(0, 10);
const MORNING_SESSION = "__morning_session__";
const AFTERNOON_SESSION = "__afternoon_session__";
const list = (x) => {
  if (Array.isArray(x)) return x;
  if (!x || typeof x !== "object") return [];
  for (const key of ["data", "items", "result", "results", "records", "value", "$values"]) {
    if (Array.isArray(x[key])) return x[key];
    if (x[key] && typeof x[key] === "object") {
      const nested = list(x[key]);
      if (nested.length) return nested;
    }
  }
  return [];
};
const reportList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of [
    "staffRows",
    "StaffRows",
    "studentRows",
    "StudentRows",
    "rows",
    "Rows",
    "students",
    "Students",
    "studentAttendance",
    "studentAttendances",
    "studentAttendanceReport",
    "studentAttendanceReports",
    "staffAttendance",
    "staffAttendances",
    "staffAttendanceReport",
    "staffAttendanceReports",
    "monthlyAttendance",
    "monthlyReport",
    "reportData",
    "reports",
    "records",
    "items",
    "data",
    "result",
    "results",
    "value",
    "$values",
  ]) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      const nested = reportList(payload[key]);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = reportList(value);
      if (nested.length) return nested;
    }
  }
  return [];
};
const val = (x, ...keys) => keys.map((k) => x?.[k]).find((v) => v !== undefined && v !== null);
const status = (x) => {
  if (["h", "holiday"].includes(String(x ?? "").toLowerCase())) return "Holiday";
  return STATUS.find(
    ([n, id, code]) =>
      String(id) === String(x)
      || n.toLowerCase() === String(x ?? "").toLowerCase()
      || code.toLowerCase() === String(x ?? "").toLowerCase(),
  )?.[0] ?? "Present";
};
const toOptions = (data, ids, names) =>
  list(data)
    .map((x) => ({ id: String(val(x, ...ids) ?? ""), name: val(x, ...names) ?? "", raw: x }))
    .filter((x, index, all) => x.id && x.name && all.findIndex((item) => item.id === x.id) === index);
const sectionsForProgram = (data, selectedProgramId, programs) => {
  const sections = list(data);
  if (!selectedProgramId) return sections;
  const selected = programs.find((program) => String(program.id) === String(selectedProgramId));
  const programIds = new Set([
    selectedProgramId,
    val(selected?.raw, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"),
    val(selected?.raw, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId"),
  ].filter((id) => id !== undefined && id !== null && id !== "").map(String));
  const programName = String(selected?.name ?? "").trim().toLowerCase();
  const hasProgramMapping = sections.some((section) =>
    val(section, "programId", "ProgramId", "programmeId", "ProgrammeId", "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId") != null
    || val(section, "programName", "ProgramName", "programme", "Programme", "program", "Program") != null,
  );
  if (!hasProgramMapping) return sections;
  return sections.filter((section) => {
    const sectionIds = [
      val(section, "programId", "ProgramId", "programmeId", "ProgrammeId"),
      val(section, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId"),
    ].filter((id) => id !== undefined && id !== null && id !== "").map(String);
    const sectionProgramName = String(val(section, "programName", "ProgramName", "programme", "Programme", "program", "Program") ?? "").trim().toLowerCase();
    return sectionIds.some((id) => programIds.has(id)) || Boolean(programName && sectionProgramName === programName);
  });
};
const activeYearsForBoard = (data, boardId) =>
  uniqueAcademicYearsByName(toOptions(
    list(data).filter(
      (year) =>
        String(val(year, "boardId", "BoardId") ?? "") === String(boardId) &&
        val(year, "isActive", "IsActive") === true,
    ),
    ["academicYearId", "id", "Id"],
    ["academicYearName", "yearName", "name", "Name"],
  ), (item) => item.name);
const levelsForBoard = (levels, board) => {
  // The Academic Levels endpoint is the authoritative active-level catalogue;
  // expose the complete list for manual selection after a board is chosen.
  if (levels?.length) return levels;
  const ids = board?.academicLevelIds ?? board?.AcademicLevelIds ?? [];
  const names = board?.academicLevelNames ?? board?.AcademicLevelNames ?? board?.academicLevels ?? board?.AcademicLevels ?? [];
  const idSet = new Set((Array.isArray(ids) ? ids : []).map(String));
  const nameSet = new Set(
    (Array.isArray(names) ? names : [])
      .map((level) => (typeof level === "string" ? level : val(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name")))
      .filter(Boolean)
      .map((name) => String(name).toLowerCase()),
  );
  return levels.filter((level) => idSet.has(String(level.id)) || nameSet.has(String(level.name).toLowerCase()));
};
const student = (x) => ({
  id: val(x, "studentId", "StudentId", "id", "Id"),
  admissionNumber: val(x, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo") ?? "—",
  rollNumber: val(x, "rollNumber", "RollNumber", "rollNo", "RollNo") || "—",
  code: val(x, "rollNo", "RollNo", "admissionNo", "AdmissionNo", "studentCode") ?? "—",
  name: val(x, "studentName", "StudentName", "name", "Name", "fullName") ?? "—",
  group: val(x, "groupName", "GroupName", "group") ?? "—",
  displayCode: val(x, "rollNumber", "RollNumber", "rollNo", "RollNo", "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo", "studentCode") || "—",
  status: status(val(x, "status", "Status", "attendanceStatus")),
  remarks: val(x, "remarks", "Remarks") ?? "",
  isAttendanceMarked: Boolean(val(x, "isAttendanceMarked", "IsAttendanceMarked")),
});
const dailyAttendanceRecords = (row) => {
  const source = val(
    row,
    "attendanceRecords", "AttendanceRecords",
    "dailyAttendance", "DailyAttendance",
    "dailyRecords", "DailyRecords",
    "attendanceDays", "AttendanceDays",
    "dayWiseAttendance", "DayWiseAttendance",
    "dailyStatuses", "DailyStatuses",
    "dailyStatus", "DailyStatus",
    "attendanceDetails", "AttendanceDetails",
    "attendanceByDate", "AttendanceByDate",
    "attendanceByDay", "AttendanceByDay",
    "records", "Records",
  );
  const records = list(source);
  if (records.length)
    return records.map((record, index) =>
      record && typeof record === "object"
        ? record
        : { day: index + 1, status: record, isAttendanceMarked: true },
    );
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  return Object.entries(source).map(([recordDate, record]) =>
    record && typeof record === "object"
      ? { date: recordDate, ...record }
      : { date: recordDate, status: record, isAttendanceMarked: true },
  );
};
const hasDateWiseAttendance = (row) =>
  dailyAttendanceRecords(row).length > 0
  || Object.keys(row ?? {}).some((key) => /^(day\d+|day\d+status|status\d+)$/i.test(key));
const attendanceTotals = (row) => {
  const nestedRecords = dailyAttendanceRecords(row);
  const records = nestedRecords.length ? nestedRecords : [row];
  return records.reduce((totals, record) => {
    if (val(record, "isAttendanceMarked", "IsAttendanceMarked") === false) return totals;
    const rawStatus = val(
      record,
      "status", "Status",
      "attendanceStatus", "AttendanceStatus",
      "statusId", "StatusId",
      "attendanceStatusId", "AttendanceStatusId",
      "statusCode", "StatusCode",
      "statusName", "StatusName",
    );
    if (rawStatus === undefined || rawStatus === null || rawStatus === "") return totals;
    const attendanceStatus = status(rawStatus);
    if (attendanceStatus === "Present") totals.present += 1;
    if (attendanceStatus === "Absent") totals.absent += 1;
    if (attendanceStatus === "Late") totals.late += 1;
    if (attendanceStatus === "Leave") totals.leave += 1;
    return totals;
  }, { present: 0, absent: 0, late: 0, leave: 0 });
};
const attendanceRecordForDay = (row, year, month, day, selectedDay) => {
  const nestedRecords = dailyAttendanceRecords(row);
  if (nestedRecords.length) {
    return nestedRecords.find((record) => {
      const recordDate = val(
        record,
        "date", "Date",
        "attendanceDate", "AttendanceDate",
        "day", "Day",
        "dayNumber", "DayNumber",
        "attendanceDay", "AttendanceDay",
      );
      if (!recordDate) return false;
      if (/^\d{1,2}$/.test(String(recordDate))) return Number(recordDate) === day;
      const parsed = new Date(String(recordDate).includes("T") ? recordDate : `${recordDate}T00:00:00`);
      return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day;
    });
  }
  const directStatus = val(
    row,
    `day${day}`, `Day${day}`,
    `day${day}Status`, `Day${day}Status`,
    `status${day}`, `Status${day}`,
  );
  if (directStatus !== undefined && directStatus !== null && directStatus !== "")
    return { status: directStatus, isAttendanceMarked: true };
  return day === selectedDay ? row : null;
};
const staff = (x) => ({
  id: val(x, "facultyId", "FacultyId", "staffId", "StaffId", "id", "Id"),
  code: val(x, "employeeId", "EmployeeId", "staffCode", "StaffCode") ?? "—",
  name: val(x, "facultyName", "FacultyName", "staffName", "StaffName", "name", "Name") ?? "—",
  department: val(x, "departmentName", "DepartmentName", "department") ?? "—",
  status: status(val(x, "status", "Status", "attendanceStatus")),
});
const isMorningSlot = (slot) => {
  const time = String(val(slot, "startTime", "StartTime", "periodStartTime", "PeriodStartTime") ?? "");
  const hour = Number(time.match(/\d{1,2}/)?.[0]);
  return Number.isFinite(hour) && hour < 12;
};
const filePart = (value, fallback) => String(value || fallback).trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;
const saveDownload = (data, filename) => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function AttendanceExportMenu({ disabled, exporting, onExport }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const choose = (format) => () => {
    setOpen(false);
    onExport(format);
  };
  return (
    <div ref={menuRef} className={`att-export-menu${open ? " is-open" : ""}${exporting ? " is-busy" : ""}`}>
      <button
        type="button"
        className="cms-btn cms-btn-ghost"
        aria-label="Export attendance"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || Boolean(exporting)}
        onClick={() => setOpen((current) => !current)}
      >
        <Download size={15} aria-hidden="true" /> {exporting ? "Exporting..." : "Export"} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? <div className="att-export-options" role="menu">
        <button type="button" disabled={disabled || Boolean(exporting)} onClick={choose("excel")}>
          <FileSpreadsheet size={16} aria-hidden="true" /> Export Excel
        </button>
        <button type="button" disabled={disabled || Boolean(exporting)} onClick={choose("csv")}>
          <FileText size={16} aria-hidden="true" /> Export CSV
        </button>
      </div> : null}
    </div>
  );
}

export default function AttendancePage() {
  const { pathname } = useLocation(),
    navigate = useNavigate();
  const [toast, setToast] = useState("");
  const isStaff = pathname.includes("/staff"),
    reports = pathname.endsWith("/reports"),
    area = isStaff ? "staff" : "student";
  return (
    <>
      <DashboardLayout
        title={`${isStaff ? "Staff" : "Student"} Attendance`}
        subtitle={
          reports
            ? "Monthly date-wise attendance history."
            : isStaff
              ? "View and manage staff attendance."
              : "View and manage student attendance."
        }
        breadcrumb={["Operations", "Attendance"]}
      >
        <main className="attendance-module">
          <nav className="att-nav">
            <button
              className={!reports ? "active" : ""}
              onClick={() => navigate(`/dashboard/attendance/${area}`)}
            >
              Attendance
            </button>
            <button
              className={reports ? "active" : ""}
              onClick={() => navigate(`/dashboard/attendance/${area}/reports`)}
            >
              Reports
            </button>
          </nav>
          {reports ? (
            isStaff ? (
              <StaffReports say={setToast} />
            ) : (
              <Reports staffMode={false} say={setToast} />
            )
          ) : isStaff ? (
            <StaffMark say={setToast} />
          ) : (
            <StudentMark say={setToast} />
          )}
        </main>
      </DashboardLayout>
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}

function StudentMark({ say }) {
  const [m, setM] = useState({
      boards: [],
      years: [],
      levels: [],
      groups: [],
      programs: [],
      sections: [],
      subjects: [],
      periods: [],
      teachers: [],
      sectionTimetable: [],
    }),
    [f, setF] = useState({
      date: TODAY,
      boardId: "",
      academicYearId: "",
      academicLevelId: "",
      groupId: "",
      programId: "",
      sectionId: "",
      subjectId: "",
      periodId: "",
      sectionClassTeacherId: "",
      sectionClassTeacherName: "",
      periodFacultyId: "",
      periodFacultyName: "",
    }),
    [rows, setRows] = useState([]),
    [yearLoading, setYearLoading] = useState(false),
    [levelLoading, setLevelLoading] = useState(false),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [exporting, setExporting] = useState("");
  const periodOptions = useMemo(() => {
    const subjectSlots = m.sectionTimetable.filter(
      (slot) => !f.subjectId || String(val(slot, "subjectId", "SubjectId")) === String(f.subjectId),
    );
    const seen = new Set();
    return subjectSlots.flatMap((slot) => {
      const id = String(val(slot, "periodId", "PeriodId") ?? "");
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const period = m.periods.find((entry) => entry.id === id);
      const periodName = val(slot, "periodName", "PeriodName") ?? period?.name ?? `Period ${id}`;
      const subjectName = val(slot, "subjectName", "SubjectName") ?? "";
      return [{ id, name: subjectName ? `${periodName} — ${subjectName}` : periodName }];
    });
  }, [f.subjectId, m.periods, m.sectionTimetable]);
  const programOptions = useMemo(() => {
    if (m.programs.length) return toOptions(m.programs, ["programId", "ProgramId", "id", "Id", "groupProgramId", "GroupProgramId"], ["programName", "ProgramName", "programme", "Programme", "name", "Name"]);
    const group = m.groups.find((item) => item.id === String(f.groupId));
    return toOptions(group?.raw?.programs ?? group?.raw?.Programs ?? [], ["programId", "ProgramId", "id", "Id"], ["programName", "ProgramName", "name", "Name"]);
  }, [f.groupId, m.groups, m.programs]);
  useEffect(() => {
    if (!f.groupId) { setM((current) => ({ ...current, programs: [] })); return; }
    let active = true;
    apiClient.get(apiEndpoints.groups.programs(f.groupId))
      .then((response) => active && setM((current) => ({ ...current, programs: list(response.data) })))
      .catch((error) => { if (active) { setM((current) => ({ ...current, programs: [] })); say(getApiErrorMessage(error)); } });
    return () => { active = false; };
  }, [f.groupId, say]);
  const attendancePeriodOptions = useMemo(() => {
    const scheduledIds = new Set(periodOptions.map((period) => period.id));
    return [
      { id: MORNING_SESSION, name: "Morning session", group: "Sessions" },
      { id: AFTERNOON_SESSION, name: "Afternoon session", group: "Sessions" },
      ...m.periods
        .filter((period) => !scheduledIds.has(period.id))
        .map((period) => ({ ...period, group: "All periods" })),
      ...periodOptions.map((period) => ({ ...period, group: "Scheduled subject periods" })),
    ];
  }, [m.periods, periodOptions]);
  const change = (k) => (e) =>
    setF((c) => {
      const value = e.target.value;
      if (k === "boardId")
        return {
          ...c,
          boardId: value,
          academicYearId: "",
          academicLevelId: "",
          groupId: "",
          programId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "",
        };
      if (k === "academicYearId")
        return {
          ...c,
          academicYearId: value,
          academicLevelId: "",
          groupId: "",
          programId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "",
        };
      if (k === "academicLevelId")
        return {
          ...c,
          academicLevelId: value,
          groupId: "",
          programId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "",
        };
      if (k === "groupId")
        return {
          ...c,
          groupId: value,
          programId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "",
        };
      if (k === "programId") return { ...c, programId: value, sectionId: "", subjectId: "", periodId: "" };
      if (k === "sectionId")
        return { ...c, sectionId: value, subjectId: "", periodId: "", sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "" };
      if (k === "subjectId") return { ...c, subjectId: value, periodId: "", periodFacultyId: "", periodFacultyName: "" };
      if (k === "periodId") return { ...c, periodId: value, periodFacultyId: "", periodFacultyName: "" };
      return { ...c, [k]: value };
    });
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.boards.academicLevels),
      apiClient.get(apiEndpoints.groups.getAll),
      apiClient.get(apiEndpoints.periods.getAll),
      apiClient.get(apiEndpoints.faculty.getAll),
    ]).then((r) =>
      setM((c) => ({
        ...c,
        boards:
          r[0].status === "fulfilled"
            ? toOptions(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"])
            : [],
        years:
          r[1].status === "fulfilled"
            ? toOptions(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              )
            : [],
        levels:
          r[2].status === "fulfilled"
            ? toOptions(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["levelName", "academicLevelName", "name", "Name"],
              )
            : [],
        groups:
          r[3].status === "fulfilled"
            ? toOptions(r[3].value.data, ["groupId", "id", "Id"], ["groupName", "name", "Name"])
            : [],
        periods:
          r[4].status === "fulfilled"
            ? toOptions(r[4].value.data, ["periodId", "id", "Id"], ["periodName", "name", "Name"])
            : [],
        teachers:
          r[5].status === "fulfilled"
            ? toOptions(
                r[5].value.data,
                ["facultyId", "id", "Id"],
                ["facultyName", "name", "Name", "fullName"],
              )
            : [],
      })),
    );
  }, []);
  useEffect(() => {
    if (!f.boardId) return;
    let active = true;
    setYearLoading(true);
    apiClient
      .get(apiEndpoints.academicYears.list)
      .then((r) => {
        if (!active) return;
        const years = activeYearsForBoard(r.data, f.boardId);
        setM((c) => ({ ...c, years }));
        setF((c) => ({ ...c, academicYearId: years[0]?.id ?? "" }));
        if (!years.length) say("No active academic year available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setYearLoading(false));
    return () => {
      active = false;
    };
  }, [f.boardId]);
  useEffect(() => {
    if (!f.boardId || !f.academicYearId) return;
    let active = true;
    setLevelLoading(true);
    Promise.all([apiClient.get(apiEndpoints.boards.academicLevels), apiClient.get(apiEndpoints.boards.getById(f.boardId))])
      .then(([levelsResult, boardResult]) => {
        if (!active) return;
        const levels = levelsForBoard(
          toOptions(
            levelsResult.data,
            ["academicLevelId", "levelId", "id", "Id"],
            ["levelName", "academicLevelName", "name", "Name"],
          ),
          boardResult.data?.data ?? boardResult.data,
        );
        setM((c) => ({ ...c, levels }));
        if (!levels.length) say("No academic levels available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setLevelLoading(false));
    return () => {
      active = false;
    };
  }, [f.boardId, f.academicYearId]);
  useEffect(() => {
    if (!f.groupId || !f.boardId || !f.academicLevelId) {
      setM((c) => ({ ...c, sections: [], subjects: [] }));
      return;
    }
    let active = true;
    const selectedProgram = programOptions.find((program) => String(program.id) === String(f.programId));
    Promise.allSettled([
      f.programId
        ? apiClient.get(apiEndpoints.sections.list, { params: {
            ProgramId: val(selectedProgram?.raw, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id") ?? f.programId,
            Programme: selectedProgram?.name || undefined,
            IsActive: true,
          } })
        : Promise.resolve({ data: [] }),
      apiClient.get(apiEndpoints.subjects.context, {
        params: { boardId: f.boardId, groupId: f.groupId, academicLevelId: f.academicLevelId },
      }),
    ]).then((r) => {
      if (!active) return;
      setM((c) => ({
        ...c,
        sections:
          r[0].status === "fulfilled"
            ? toOptions(sectionsForProgram(r[0].value.data, f.programId, programOptions), ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"])
            : [],
        subjects:
          r[1].status === "fulfilled"
            ? toOptions(r[1].value.data, ["subjectId", "id", "Id"], ["subjectName", "name", "Name"])
            : [],
      }));
      setF((c) => ({ ...c, sectionId: "", subjectId: "", periodId: "", sectionClassTeacherId: "", sectionClassTeacherName: "", periodFacultyId: "", periodFacultyName: "" }));
    });
    return () => { active = false; };
  }, [f.boardId, f.academicLevelId, f.groupId, f.programId, programOptions]);
  useEffect(() => {
    if (!f.groupId || !f.sectionId) {
      setM((c) => ({ ...c, sectionTimetable: [] }));
      return;
    }
    let active = true;
    const selectedSection = m.sections.find((section) => section.id === f.sectionId)?.raw;
    const fallbackTeacherId = val(selectedSection, "classTeacherId", "ClassTeacherId", "facultyId", "FacultyId");
    const fallbackTeacherName = val(selectedSection, "classTeacherName", "ClassTeacherName", "teacher", "Teacher");
    Promise.allSettled([
      f.subjectId && f.periodId
        ? apiClient.get(apiEndpoints.attendance.academicContext, {
            params: { groupId: f.groupId, sectionId: f.sectionId },
          })
        : Promise.resolve({ data: {} }),
      apiClient.get(apiEndpoints.timetable.getBySection(f.sectionId), {
        params: { academicYearId: f.academicYearId || undefined },
      }),
    ]).then((results) => {
      if (!active) return;
      const context = results[0].status === "fulfilled" ? results[0].value.data?.data ?? results[0].value.data : {};
      const teacherId = f.subjectId && f.periodId
        ? val(context, "classTeacherId", "ClassTeacherId", "facultyId", "FacultyId") ?? fallbackTeacherId ?? ""
        : "";
      const teacherName = f.subjectId && f.periodId
        ? val(context, "classTeacherName", "ClassTeacherName", "facultyName", "FacultyName", "staffName", "StaffName") ?? fallbackTeacherName ?? ""
        : "";
      setF((c) => ({
        ...c,
        sectionClassTeacherId: String(teacherId),
        sectionClassTeacherName: teacherName || "",
        periodFacultyId: "",
        periodFacultyName: "",
      }));
      setM((c) => ({
        ...c,
        sectionTimetable: results[1].status === "fulfilled" ? list(results[1].value.data) : [],
      }));
    });
    return () => { active = false; };
  }, [f.academicYearId, f.groupId, f.sectionId, f.subjectId, f.periodId, m.sections]);
  useEffect(() => {
    if (!f.sectionId || !f.periodId) return;
    let active = true;
    const applyFaculty = (entry) => {
      if (!active) return;
      setF((c) => ({
        ...c,
        periodFacultyId: String(val(entry, "facultyId", "FacultyId", "staffId", "StaffId") ?? ""),
        periodFacultyName: val(entry, "facultyName", "FacultyName", "staffName", "StaffName") ?? "",
      }));
    };
    if (f.periodId === MORNING_SESSION || f.periodId === AFTERNOON_SESSION) {
      const sessionSlots = m.sectionTimetable.filter((slot) => {
        if (f.subjectId && String(val(slot, "subjectId", "SubjectId")) !== String(f.subjectId)) return false;
        return f.periodId === MORNING_SESSION ? isMorningSlot(slot) : !isMorningSlot(slot);
      });
      const facultyNames = [...new Set(sessionSlots.map((slot) => val(slot, "facultyName", "FacultyName", "staffName", "StaffName")).filter(Boolean))];
      applyFaculty({ facultyName: facultyNames.join(", ") });
      return () => { active = false; };
    }
    if (!f.subjectId) return () => { active = false; };
    const slot = m.sectionTimetable.find(
      (entry) => String(val(entry, "subjectId", "SubjectId")) === String(f.subjectId)
        && String(val(entry, "periodId", "PeriodId")) === String(f.periodId),
    );
    if (slot) {
      applyFaculty(slot);
      return () => { active = false; };
    }
    apiClient
      .get(apiEndpoints.attendance.facultySubject, {
        params: { date: f.date, groupId: f.groupId, sectionId: f.sectionId, subjectId: f.subjectId, periodId: f.periodId },
      })
      .then((r) => {
        const context = r.data?.data ?? r.data;
        const returnedSubjectId = val(context, "subjectId", "SubjectId");
        if (returnedSubjectId && String(returnedSubjectId) !== String(f.subjectId)) return applyFaculty({});
        applyFaculty(context);
      })
      .catch(() => applyFaculty({}));
    return () => { active = false; };
  }, [f.date, f.groupId, f.sectionId, f.subjectId, f.periodId, m.sectionTimetable]);
  // Resolve the attendance subject/faculty from the timetable context API.
  // This keeps the student attendance form aligned with the selected section
  // and period instead of requiring the admin to re-enter the assignment.
  useEffect(() => {
    if (!f.date || !f.groupId || !f.sectionId || !f.subjectId || !f.periodId) {
      setF((current) => ({ ...current, periodFacultyId: "", periodFacultyName: "" }));
      return;
    }
    let active = true;
    const sessionType = f.periodId === MORNING_SESSION
      ? "Morning session"
      : f.periodId === AFTERNOON_SESSION
        ? "Afternoon session"
        : f.periodId
          ? "Scheduled period"
          : "All periods";
    apiClient
      .get(apiEndpoints.attendance.facultySubject, {
        params: {
          date: f.date,
          groupId: Number(f.groupId),
          sectionId: Number(f.sectionId),
          ...(f.periodId && ![MORNING_SESSION, AFTERNOON_SESSION].includes(f.periodId)
            ? { periodId: Number(f.periodId) }
            : {}),
          sessionType,
        },
      })
      .then((r) => {
        if (!active) return;
        const context = r.data?.data ?? r.data ?? {};
        const subjectId = val(context, "subjectId", "SubjectId");
        const facultyId = val(context, "facultyId", "FacultyId", "staffId", "StaffId");
        const facultyName = val(context, "facultyName", "FacultyName", "staffName", "StaffName");
        setF((current) => ({
          ...current,
          ...(subjectId && String(subjectId) !== "0" && !current.subjectId
            ? { subjectId: String(subjectId) }
            : {}),
          periodFacultyId: facultyId ? String(facultyId) : current.periodFacultyId,
          periodFacultyName: facultyName || current.periodFacultyName,
        }));
      })
      .catch(() => {
        // Timetable lookup is supplemental; attendance loading still uses its
        // existing validation and student APIs when no assignment is found.
      });
    return () => { active = false; };
  }, [f.date, f.groupId, f.sectionId, f.subjectId, f.periodId]);
  const load = async () => {
    if ([f.date, f.boardId, f.academicLevelId, f.groupId, f.programId, f.sectionId].some((v) => !v))
      return say("Select Board, Academic Level, Group, Program, and Section.");
    if (Boolean(f.subjectId) !== Boolean(f.periodId))
      return say("Select both Subject and Period, or leave both as All.");
    if ([MORNING_SESSION, AFTERNOON_SESSION].includes(f.periodId))
      return say("Select a scheduled subject period to load attendance records.");
    setLoading(true);
    try {
      const r = await apiClient.get(apiEndpoints.attendance.students, { params: {
        date: f.date,
        boardId: +f.boardId,
        academicLevelId: +f.academicLevelId,
        groupId: +f.groupId,
        sectionId: +f.sectionId,
        ...(f.subjectId ? { subjectId: +f.subjectId } : {}),
        ...(f.periodId ? { periodId: +f.periodId } : {}),
      } });
      const displayRows = list(r.data);
      setRows(
        displayRows
          .map(student)
          .filter((x, index, students) => x.id && students.findIndex((item) => String(item.id) === String(x.id)) === index),
      );
    } catch (e) {
      setRows([]);
      say(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post(apiEndpoints.attendance.bulk, {
        attendanceDate: f.date,
        academicYearId: +f.academicYearId,
        academicLevelId: +f.academicLevelId,
        programId: +f.programId,
        groupId: +f.groupId,
        sectionId: +f.sectionId,
        subjectId: f.subjectId ? +f.subjectId : null,
        periodId: f.periodId ? +f.periodId : null,
        facultyId: f.periodFacultyId ? +f.periodFacultyId : null,
        students: rows.map((x) => ({
          studentId: +x.id,
          status: STATUS.find((s) => s[0] === x.status)[1],
        })),
      });
      say("Attendance updated successfully.");
      await load();
    } catch (e) {
      say(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const teacherName = (id, name) =>
    name || m.teachers.find((teacher) => teacher.id === id)?.name || "Not assigned";
  const exportAttendance = async (format) => {
    if (exporting || !f.academicYearId) return;
    setExporting(format);
    try {
      const selectedDate = new Date(`${f.date}T00:00:00`);
      const response = await apiClient.get(
        format === "csv" ? apiEndpoints.attendance.studentMonthlyExportCsv : apiEndpoints.attendance.studentMonthlyExport,
        {
          params: {
            Date: f.date,
            Month: selectedDate.getMonth() + 1,
            Year: selectedDate.getFullYear(),
            BoardId: f.boardId ? Number(f.boardId) : undefined,
            AcademicYearId: Number(f.academicYearId),
            AcademicLevelId: f.academicLevelId ? Number(f.academicLevelId) : undefined,
            GroupId: f.groupId ? Number(f.groupId) : undefined,
            SectionId: f.sectionId ? Number(f.sectionId) : undefined,
            SubjectId: f.subjectId ? Number(f.subjectId) : undefined,
            PeriodId: f.periodId ? Number(f.periodId) : undefined,
          },
          responseType: "blob",
        },
      );
      const academicYear = m.years.find((item) => String(item.id) === String(f.academicYearId))?.name || f.date.slice(0, 7);
      saveDownload(response.data, `Student_Attendance_${filePart(academicYear, "Academic_Year")}.${format === "csv" ? "csv" : "xlsx"}`);
      say(`Student attendance ${format === "csv" ? "CSV" : "Excel"} downloaded.`);
    } catch (error) { say(getApiErrorMessage(error)); }
    finally { setExporting(""); }
  };
  return (
    <>
      <section className="att-card att-filter-card">
        <div className="att-context">
          <div className="att-context-fields">
            <Field l="Date">
              <input type="date" value={f.date} onChange={change("date")} />
            </Field>
            <Select l="Board" v={f.boardId} on={change("boardId")} o={m.boards} empty="All boards" />
            <Select
              l="Academic Year"
              v={f.academicYearId}
              on={change("academicYearId")}
              o={m.years}
              empty={yearLoading ? "Loading..." : "No active year"}
              disabled
            />
            <Select
              l="Academic Level"
              v={f.academicLevelId}
              on={change("academicLevelId")}
              o={m.levels}
              empty={levelLoading ? "Loading..." : "All levels"}
              disabled={!f.boardId || !f.academicYearId || levelLoading}
            />
            <Select l="Group" v={f.groupId} on={change("groupId")} o={m.groups} empty="All groups" />
            <Select l="Program" v={f.programId} on={change("programId")} o={programOptions} empty="Select Program" disabled={!f.groupId} />
            <Select l="Section" v={f.sectionId} on={change("sectionId")} o={m.sections} empty="All sections" disabled={!f.programId} />
            <Select l="Subject" v={f.subjectId} on={change("subjectId")} o={m.subjects} empty="All subjects" />
            <Select
              l="Period"
              v={f.periodId}
              on={change("periodId")}
              o={attendancePeriodOptions}
              empty="All periods"
              disabled={!f.sectionId}
            />
            <Field l="Class Teacher">
              <input
                value={
                  !f.subjectId && !f.periodId
                    ? "Not required"
                    : teacherName(f.periodFacultyId, f.periodFacultyName) !== "Not assigned"
                    ? teacherName(f.periodFacultyId, f.periodFacultyName)
                    : teacherName(f.sectionClassTeacherId, f.sectionClassTeacherName)
                }
                readOnly
              />
            </Field>
          </div>
        </div>
        <div className="att-detail-actions">
          <button className="cms-btn cms-btn-ghost" disabled={loading} onClick={load}>
            {loading ? "Loading..." : "Load Records"}
          </button>
          <AttendanceExportMenu disabled={loading || !f.academicYearId} exporting={exporting} onExport={exportAttendance} />
        </div>
      </section>
      <Table rows={rows} setRows={setRows} loading={loading} saving={saving} save={save} />
    </>
  );
}

function StaffMark({ say }) {
  const [date, setDate] = useState(TODAY),
    [type, setType] = useState(1),
    [board, setBoard] = useState(""),
    [boards, setBoards] = useState([]),
    [year, setYear] = useState(""),
    [years, setYears] = useState([]),
    [dept, setDept] = useState(""),
    [depts, setDepts] = useState([]),
    [rows, setRows] = useState([]),
    [yearLoading, setYearLoading] = useState(false),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [exporting, setExporting] = useState("");
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
    ]).then((r) => {
      if (r[0].status === "fulfilled")
        setBoards(
          toOptions(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"]),
        );
      if (r[1].status === "fulfilled")
        setYears(
          toOptions(
            r[1].value.data,
            ["academicYearId", "id", "Id"],
            ["academicYearName", "yearName", "name", "Name"],
          ),
        );
    });
  }, []);
  useEffect(() => {
    let active = true;
    setDept("");
    setRows([]);
    // Department API accepts a string staff type; attendance APIs continue
    // receiving their existing numeric 1/2 values.
    apiClient.get(apiEndpoints.departments.getAll, {
      params: { staffType: type === 1 ? "Teaching" : "Non-Teaching" },
    }).then((response) => {
      if (!active) return;
      const options = toOptions(response.data, ["departmentId", "id", "Id"], ["departmentName", "name", "Name"]);
      setDepts(options);
    }).catch((error) => active && say(getApiErrorMessage(error)));
    return () => { active = false; };
  }, [type]);
  useEffect(() => {
    if (!board) return;
    let active = true;
    setYearLoading(true);
    apiClient
      .get(apiEndpoints.academicYears.list)
      .then((r) => {
        if (!active) return;
        const options = activeYearsForBoard(r.data, board);
        setYears(options);
        setYear(options[0]?.id ?? "");
        if (!options.length) say("No active academic year available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setYearLoading(false));
    return () => {
      active = false;
    };
  }, [board]);
  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.post(apiEndpoints.staffAttendance.load, {
        attendanceDate: date,
        staffType: type,
        departmentId: dept ? +dept : null,
      });
      const displayRows = list(r.data);
      setRows(
        displayRows
          .map(staff)
          .filter((x) => x.id),
      );
    } catch (e) {
      setRows([]);
      say(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post(apiEndpoints.staffAttendance.bulk, {
        attendanceDate: date,
        staffType: type,
        staffAttendances: rows.map((x) => ({
          facultyId: +x.id,
          status: STATUS.find((s) => s[0] === x.status)[1],
        })),
      });
      say("Staff attendance saved successfully.");
    } catch (e) {
      say(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const exportAttendance = async (format) => {
    if (exporting || !board || !year) return;
    setExporting(format);
    try {
      const selectedDate = new Date(`${date}T00:00:00`);
      const response = await apiClient.get(
        format === "csv" ? apiEndpoints.staffAttendance.monthlyExportCsv : apiEndpoints.staffAttendance.monthlyExport,
        {
          params: {
            Month: selectedDate.getMonth() + 1,
            Year: selectedDate.getFullYear(),
            AcademicYearId: Number(year),
            BoardId: Number(board),
            DepartmentId: dept ? Number(dept) : 0,
            StaffType: type,
            FacultyId: 0,
          },
          responseType: "blob",
        },
      );
      const academicYear = years.find((item) => String(item.id) === String(year))?.name || date.slice(0, 7);
      saveDownload(response.data, `Faculty_Attendance_${filePart(academicYear, "Academic_Year")}.${format === "csv" ? "csv" : "xlsx"}`);
      say(`Faculty attendance ${format === "csv" ? "CSV" : "Excel"} downloaded.`);
    } catch (error) { say(getApiErrorMessage(error)); }
    finally { setExporting(""); }
  };
  return (
    <>
      <section className="att-card att-staff-details">
        <div className="att-staff-fields">
          <Field l="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Select
            l="Board"
            v={board}
            on={(e) => {
              setBoard(e.target.value);
              setYear("");
              setDept("");
              setRows([]);
            }}
            o={boards}
          />
          <Select l="Academic Year" v={year} on={(e) => { setYear(e.target.value); setRows([]); }} o={years} empty={yearLoading ? "Loading..." : "No active year"} disabled />
          <Field l="Staff Type">
            <select
              value={type}
              onChange={(e) => {
                setType(Number(e.target.value));
                setDept("");
                setRows([]);
              }}
            >
              <option value={1}>Teaching Staff</option>
              <option value={2}>Non-Teaching Staff</option>
            </select>
          </Field>
          <Select
            l="Department"
            v={dept}
            on={(e) => { setDept(e.target.value); setRows([]); }}
            o={depts}
            empty="All Departments"
          />
        </div>
        <div className="att-detail-actions">
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={load}>
            {loading ? "Loading..." : "Load Staff"}
          </button>
          <AttendanceExportMenu disabled={loading || !board || !year} exporting={exporting} onExport={exportAttendance} />
        </div>
      </section>
      <Table
        rows={rows}
        setRows={setRows}
        loading={loading}
        saving={saving}
        save={save}
        staffMode
      />
    </>
  );
}

function Table({ rows, setRows, loading, saving, save, staffMode = false }) {
  const [editing, setEditing] = useState(null);
  const statuses = staffMode ? STATUS : STATUS;
  const update = (name) =>
    setRows((x) => x.map((y) => (y.id === editing.id ? { ...y, status: name } : y)));
  return (
    <>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <b>{staffMode ? "Staff" : "Students"}</b>
          {staffMode && (
            <button
              className="cms-btn cms-btn-ghost"
              disabled={!rows.length}
              onClick={() => setRows((x) => x.map((y) => ({ ...y, status: "Present" })))}
            >
              Mark All Present
            </button>
          )}
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-compact">
            <thead>
              <tr>
                {!staffMode && <th>Admission No.</th>}
                <th>{staffMode ? "Staff ID" : "Roll No"}</th>
                <th>{staffMode ? "Staff Name" : "Student Name"}</th>
                <th>{staffMode ? "Department" : "Status"}</th>
                {!staffMode && <th>Remarks</th>}
                {!staffMode && <th>Marked</th>}
                <th>{staffMode ? "Attendance" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={staffMode ? 4 : 7}>Loading attendance...</td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    {!staffMode && <td>{r.admissionNumber}</td>}
                    <td>{staffMode ? r.code : r.rollNumber}</td>
                    <td>{r.name}</td>
                    <td>{staffMode ? r.department : r.status}</td>
                    {!staffMode && <td>{r.remarks || "—"}</td>}
                    {!staffMode && <td>{r.isAttendanceMarked ? "Yes" : "No"}</td>}
                    <td>
                      {staffMode ? (
                        <div className="att-status">
                          {statuses.map(([n, , s]) => (
                            <button
                              key={n}
                              className={r.status === n ? `is-${n.toLowerCase()}` : ""}
                              onClick={() =>
                                setRows((x) =>
                                  x.map((y) => (y.id === r.id ? { ...y, status: n } : y)),
                                )
                              }
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button className="cms-btn cms-btn-ghost" onClick={() => setEditing(r)}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={staffMode ? 4 : 7}>Load attendance to view records.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {staffMode && (
          <div className="att-save">
            <button
              className="cms-btn cms-btn-primary"
              disabled={!rows.length || saving}
              onClick={save}
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        )}
      </section>
      {editing && (
        <div className="att-edit-overlay">
          <section className="att-edit-modal">
            <h3>Edit Attendance</h3>
            <p>
              <b>{editing.name}</b> · Roll No: {editing.code}
            </p>
            <Field l="Current Status">
              <select
                value={rows.find((x) => x.id === editing.id)?.status ?? editing.status}
                onChange={(e) => update(e.target.value)}
              >
                {STATUS.map(([n]) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
            <div>
              <button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="cms-btn cms-btn-primary"
                disabled={saving}
                onClick={async () => {
                  await save();
                  setEditing(null);
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function StaffReports({ say }) {
  const [staffType, setStaffType] = useState(1);
  const [date, setDate] = useState(TODAY);
  const [board, setBoard] = useState("");
  const [year, setYear] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [years, setYears] = useState([]);
  const [boards, setBoards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [yearLoading, setYearLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
    ]).then((results) => {
      if (results[0].status === "fulfilled")
        setBoards(
          toOptions(results[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"]),
        );
      if (results[1].status === "fulfilled")
        setYears(
          toOptions(
            results[1].value.data,
            ["academicYearId", "id", "Id"],
            ["academicYearName", "yearName", "name", "Name"],
          ),
        );
    });
  }, []);
  useEffect(() => {
    let active = true;
    setDepartmentId("");
    setRows([]);
    apiClient.get(apiEndpoints.departments.getAll, {
      params: { staffType: staffType === 1 ? "Teaching" : "Non-Teaching" },
    }).then((response) => {
      if (active) setDepartments(toOptions(response.data, ["departmentId", "id", "Id"], ["departmentName", "name", "Name"]));
    }).catch((error) => active && say(getApiErrorMessage(error)));
    return () => { active = false; };
  }, [staffType]);
  useEffect(() => {
    if (!board) return;
    let active = true;
    setYearLoading(true);
    apiClient
      .get(apiEndpoints.academicYears.list)
      .then((r) => {
        if (!active) return;
        const options = activeYearsForBoard(r.data, board);
        setYears(options);
        setYear(options[0]?.id ?? "");
        if (!options.length) say("No active academic year available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setYearLoading(false));
    return () => {
      active = false;
    };
  }, [board]);
  const load = async () => {
    if (loading) return;
    if (!board || !year) return say("Select Board and Academic Year to load the staff monthly report.");
    setLoading(true);
    try {
      const selectedDate = new Date(`${date}T00:00:00`);
      const response = await apiClient.post(apiEndpoints.staffAttendance.monthlyReport, {
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear(),
        academicYearId: Number(year),
        boardId: Number(board),
        departmentId: departmentId ? Number(departmentId) : 0,
        staffType,
        facultyId: 0,
      });
      const reportData = val(response.data, "data", "Data") ?? response.data;
      const selectedDepartmentName = departments.find(
        (department) => String(department.id) === String(departmentId),
      )?.name;
      const reportRows = reportList(reportData).map((row) => ({
        ...row,
        departmentName: departmentId
          ? selectedDepartmentName
            ?? val(reportData, "departmentName", "DepartmentName")
            ?? val(row, "departmentName", "DepartmentName")
          : val(row, "departmentName", "DepartmentName")
            ?? val(reportData, "departmentName", "DepartmentName"),
        staffTypeName: val(row, "staffTypeName", "StaffTypeName")
          ?? val(reportData, "staffTypeName", "StaffTypeName"),
        totalWorkingDays: val(row, "totalWorkingDays", "TotalWorkingDays")
          ?? val(reportData, "totalWorkingDays", "TotalWorkingDays"),
      }));
      setRows(reportRows);
      if (!reportRows.length) say("No staff attendance records found for the selected month and filters.");
      else if (!reportRows.some(hasDateWiseAttendance))
        say("Monthly totals loaded. The API response does not include date-wise staff attendance records.");
    } catch (error) {
      setRows([]);
      say(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  const exportAttendance = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const selectedDate = new Date(`${date}T00:00:00`);
      const response = await apiClient.get(format === "csv" ? apiEndpoints.staffAttendance.monthlyExportCsv : apiEndpoints.staffAttendance.monthlyExport, {
        params: {
          Month: selectedDate.getMonth() + 1,
          Year: selectedDate.getFullYear(),
          AcademicYearId: Number(year),
          BoardId: Number(board),
          DepartmentId: departmentId ? Number(departmentId) : 0,
          StaffType: staffType,
          FacultyId: 0,
        },
        responseType: "blob",
      });
      const academicYear = years.find((item) => String(item.id) === String(year))?.name || date.slice(0, 7);
      saveDownload(response.data, `Faculty_Attendance_${filePart(academicYear, "Academic_Year")}.${format === "csv" ? "csv" : "xlsx"}`);
      say(`Faculty attendance ${format === "csv" ? "CSV" : "Excel"} downloaded.`);
    } catch (error) { say(getApiErrorMessage(error)); }
    finally { setExporting(""); }
  };
  const totals = rows.reduce(
    (summary, row) => ({
      total: summary.total + 1,
      present: summary.present + Number(val(row, "present", "presentCount", "Present") ?? 0),
      absent: summary.absent + Number(val(row, "absent", "absentCount", "Absent") ?? 0),
      leave: summary.leave + Number(val(row, "leave", "leaveCount", "Leave") ?? 0),
      percentage:
        summary.percentage +
        Number(val(row, "attendancePercentage", "percentage", "AttendancePercentage") ?? 0),
    }),
    { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
  );
  const facultyReportDate = new Date(`${date}T00:00:00`);
  const facultyReportYear = facultyReportDate.getFullYear();
  const facultyReportMonth = facultyReportDate.getMonth();
  const facultyReportDays = Array.from({ length: new Date(facultyReportYear, facultyReportMonth + 1, 0).getDate() }, (_, index) => index + 1);
  const facultyReportMonthLabel = facultyReportDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const reportRows = rows.map((row) => ({
    id: val(row, "facultyId", "staffId", "id", "Id"),
    code: val(row, "employeeId", "staffCode", "facultyCode", "EmployeeId") ?? "—",
    name: val(row, "facultyName", "staffName", "name", "Name") ?? "—",
    department: val(row, "departmentName", "department", "Department") ?? "—",
    workingDays: val(row, "totalWorkingDays", "workingDays", "TotalWorkingDays") ?? "—",
    present: val(row, "present", "presentCount", "Present") ?? 0,
    absent: val(row, "absent", "absentCount", "Absent") ?? 0,
    leave: val(row, "leave", "leaveCount", "Leave") ?? 0,
    percentage: val(row, "attendancePercentage", "percentage", "AttendancePercentage") ?? "—",
  }));
  return (
    <>
      <section className="att-card att-staff-details">
        <div className="att-staff-fields">
          <Field l="Date / Month">
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => {
                const nextDate = `${e.target.value}-01`;
                setDate(nextDate);
                setRows([]);
              }}
            />
          </Field>
          <Select
            l="Board"
            v={board}
            on={(e) => {
              setBoard(e.target.value);
              setYear("");
              setDepartmentId("");
              setRows([]);
            }}
            o={boards}
          />
          <Select
            l="Academic Year"
            v={year}
            on={(e) => { setYear(e.target.value); setRows([]); }}
            o={years}
            empty={yearLoading ? "Loading..." : "No active year"}
            disabled
          />
          <Field l="Staff Type">
            <select
              value={staffType}
              onChange={(e) => {
                setStaffType(Number(e.target.value));
                setDepartmentId("");
                setRows([]);
              }}
            >
              <option value={1}>Teaching Staff</option>
              <option value={2}>Non-Teaching Staff</option>
            </select>
          </Field>
          <Select
            l="Department"
            v={departmentId}
            on={(e) => { setDepartmentId(e.target.value); setRows([]); }}
            o={departments}
            empty="All Departments"
          />
        </div>
        <div className="att-detail-actions">
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={load}>
            {loading ? "Loading..." : "Apply"}
          </button>
          <AttendanceExportMenu disabled={loading || !board || !year} exporting={exporting} onExport={exportAttendance} />
        </div>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <div>
            <b>Monthly Faculty Attendance</b>
            <span className="att-days-label">{facultyReportMonthLabel} · {facultyReportDays.length} days</span>
            <div className="att-legend">P Present · A Absent · L Late · LV Leave</div>
          </div>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-month-table att-staff-month-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Department</th>
                {facultyReportDays.map((day) => <th className="att-day-header" key={day}><span>{day}</span><small>{new Date(facultyReportYear, facultyReportMonth, day).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}</small></th>)}
                <th className="att-month-summary">Present Days</th>
                <th className="att-month-summary">Absent Days</th>
                <th className="att-month-summary">Late Days</th>
                <th className="att-month-summary">Leave Days</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={facultyReportDays.length + 7}>Loading report...</td>
                </tr>
              ) : rows.length ? (
                rows.map((row, index) => {
                  const calculatedTotals = attendanceTotals(row);
                  const hasDailyRecords = dailyAttendanceRecords(row).length > 0;
                  const presentDays = hasDailyRecords ? calculatedTotals.present : val(row, "present", "presentCount", "Present") ?? calculatedTotals.present;
                  const absentDays = hasDailyRecords ? calculatedTotals.absent : val(row, "absent", "absentCount", "Absent") ?? calculatedTotals.absent;
                  const lateDays = hasDailyRecords ? calculatedTotals.late : val(row, "late", "lateCount", "Late") ?? calculatedTotals.late;
                  const leaveDays = hasDailyRecords ? calculatedTotals.leave : val(row, "leave", "leaveCount", "Leave") ?? calculatedTotals.leave;
                  return <tr key={val(row, "facultyId", "staffId", "id", "Id") ?? index}>
                    <td>{val(row, "employeeId", "staffCode", "facultyCode", "EmployeeId") || "—"}</td>
                    <td>{val(row, "facultyName", "staffName", "name", "Name") || "—"}</td>
                    <td>{val(row, "departmentName", "department", "Department") || "—"}</td>
                    {facultyReportDays.map((day) => {
                      const attendanceRecord = attendanceRecordForDay(row, facultyReportYear, facultyReportMonth, day, facultyReportDate.getDate());
                      const rawStatus = attendanceRecord && val(
                        attendanceRecord,
                        "status", "Status",
                        "attendanceStatus", "AttendanceStatus",
                        "statusId", "StatusId",
                        "attendanceStatusId", "AttendanceStatusId",
                        "statusCode", "StatusCode",
                        "statusName", "StatusName",
                      );
                      if (rawStatus === undefined || rawStatus === null || rawStatus === "" || val(attendanceRecord, "isAttendanceMarked", "IsAttendanceMarked") === false)
                        return <td key={day}><span className="att-status-dash">—</span></td>;
                      const attendanceStatus = status(rawStatus);
                      const statusCode = STATUS.find(([name]) => name === attendanceStatus)?.[2] ?? "—";
                      return <td key={day}><span className={`att-status-pill att-${attendanceStatus.toLowerCase()}`}>{statusCode}</span></td>;
                    })}
                    <td className="att-month-summary"><b>{presentDays}</b></td>
                    <td className="att-month-summary"><b>{absentDays}</b></td>
                    <td className="att-month-summary"><b>{lateDays}</b></td>
                    <td className="att-month-summary"><b>{leaveDays}</b></td>
                  </tr>;
                })
              ) : (
                <tr>
                  <td colSpan={facultyReportDays.length + 7}>No staff attendance records loaded. Apply filters to view the monthly report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Reports({ staffMode, say }) {
  const [f, setF] = useState({
      date: TODAY,
      board: "",
      year: "",
      level: "",
      group: "",
      program: "",
      section: "",
      subject: "",
      period: "",
      teacher: "",
    }),
    [m, setM] = useState({
      boards: [],
      years: [],
      levels: [],
      groups: [],
      programs: [],
      sections: [],
      subjects: [],
      periods: [],
      teachers: [],
    }),
    [rows, setRows] = useState([]),
    [yearLoading, setYearLoading] = useState(false),
    [levelLoading, setLevelLoading] = useState(false),
    [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState("");
  const change = (k) => (e) =>
    setF((x) => {
      const value = e.target.value;
      if (k === "board")
        return { ...x, board: value, year: "", level: "", group: "", program: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "year")
        return { ...x, year: value, level: "", group: "", program: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "level")
        return { ...x, level: value, group: "", program: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "group")
        return { ...x, group: value, program: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "program") return { ...x, program: value, section: "", subject: "", period: "", teacher: "" };
      if (k === "section") return { ...x, section: value, subject: "", period: "", teacher: "" };
      return { ...x, [k]: value };
    });
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.boards.academicLevels),
      apiClient.get(apiEndpoints.groups.getAll),
      apiClient.get(apiEndpoints.periods.getAll),
      apiClient.get(apiEndpoints.faculty.getAll),
    ]).then((r) =>
      setM((x) => ({
        ...x,
        boards:
          r[0].status === "fulfilled"
            ? toOptions(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"])
            : [],
        years:
          r[1].status === "fulfilled"
            ? toOptions(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              )
            : [],
        levels:
          r[2].status === "fulfilled"
            ? toOptions(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["levelName", "academicLevelName", "name", "Name"],
              )
            : [],
        groups:
          r[3].status === "fulfilled"
            ? toOptions(r[3].value.data, ["groupId", "id", "Id"], ["groupName", "name", "Name"])
            : [],
        periods:
          r[4].status === "fulfilled"
            ? toOptions(r[4].value.data, ["periodId", "id", "Id"], ["periodName", "name", "Name"])
            : [],
        teachers:
          r[5].status === "fulfilled"
            ? toOptions(r[5].value.data, ["facultyId", "id", "Id"], ["facultyName", "name", "Name"])
            : [],
      })),
    );
  }, []);
  useEffect(() => {
    if (!f.board) return;
    let active = true;
    setYearLoading(true);
    apiClient
      .get(apiEndpoints.academicYears.list)
      .then((r) => {
        if (!active) return;
        const years = activeYearsForBoard(r.data, f.board);
        setM((c) => ({ ...c, years }));
        setF((c) => ({ ...c, year: years[0]?.id ?? "" }));
        if (!years.length) say("No active academic year available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setYearLoading(false));
    return () => {
      active = false;
    };
  }, [f.board]);
  useEffect(() => {
    if (!f.board || !f.year) return;
    let active = true;
    setLevelLoading(true);
    Promise.all([apiClient.get(apiEndpoints.boards.academicLevels), apiClient.get(apiEndpoints.boards.getById(f.board))])
      .then(([levelsResult, boardResult]) => {
        if (!active) return;
        const levels = levelsForBoard(
          toOptions(
            levelsResult.data,
            ["academicLevelId", "levelId", "id", "Id"],
            ["levelName", "academicLevelName", "name", "Name"],
          ),
          boardResult.data?.data ?? boardResult.data,
        );
        setM((c) => ({ ...c, levels }));
        if (!levels.length) say("No academic levels available for this board.");
      })
      .catch((e) => active && say(getApiErrorMessage(e)))
      .finally(() => active && setLevelLoading(false));
    return () => {
      active = false;
    };
  }, [f.board, f.year]);
  useEffect(() => {
    if (!f.group || !f.board || !f.level) {
      setM((x) => ({ ...x, sections: [], subjects: [] }));
      return;
    }
    let active = true;
    const selectedProgram = programOptions.find((program) => String(program.id) === String(f.program));
    Promise.allSettled([
      f.program
        ? apiClient.get(apiEndpoints.sections.list, { params: {
            ProgramId: val(selectedProgram?.raw, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id") ?? f.program,
            Programme: selectedProgram?.name || undefined,
            IsActive: true,
          } })
        : Promise.resolve({ data: [] }),
      apiClient.get(apiEndpoints.subjects.context, {
        params: { boardId: f.board, groupId: f.group, academicLevelId: f.level },
      }),
    ]).then((r) => {
      if (!active) return;
      setM((x) => ({
        ...x,
        sections:
          r[0].status === "fulfilled"
            ? toOptions(sectionsForProgram(r[0].value.data, f.program, programOptions), ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"])
            : [],
        subjects:
          r[1].status === "fulfilled"
            ? toOptions(r[1].value.data, ["subjectId", "id", "Id"], ["subjectName", "name", "Name"])
            : [],
      }));
    });
    return () => { active = false; };
  }, [f.board, f.level, f.group, f.program, m.programs]);
  const programOptions = useMemo(() => {
    if (m.programs.length) return toOptions(m.programs, ["programId", "ProgramId", "id", "Id", "groupProgramId", "GroupProgramId"], ["programName", "ProgramName", "programme", "Programme", "name", "Name"]);
    const group = m.groups.find((item) => item.id === String(f.group));
    return toOptions(group?.raw?.programs ?? group?.raw?.Programs ?? [], ["programId", "ProgramId", "id", "Id"], ["programName", "ProgramName", "name", "Name"]);
  }, [f.group, m.groups, m.programs]);
  useEffect(() => {
    if (!f.group) { setM((current) => ({ ...current, programs: [] })); return; }
    let active = true;
    apiClient.get(apiEndpoints.groups.programs(f.group))
      .then((response) => active && setM((current) => ({ ...current, programs: list(response.data) })))
      .catch((error) => { if (active) { setM((current) => ({ ...current, programs: [] })); say(getApiErrorMessage(error)); } });
    return () => { active = false; };
  }, [f.group, say]);
  const load = async () => {
    if (!staffMode) {
      if ([f.date, f.board, f.level, f.group, f.program, f.section].some((value) => !value))
        return say("Select Board, Academic Level, Group, Program, and Section.");
    }
    setLoading(true);
    try {
      if (staffMode) {
        const response = await apiClient.post(
          apiEndpoints.staffAttendance.monthlyReport,
          { date: f.date, staffType: 1, departmentId: null },
        );
        setRows(list(response.data));
      } else {
        const response = await apiClient.post(apiEndpoints.attendance.studentMonthlyReport, {
          date: f.date,
          groupId: Number(f.group),
          sectionId: Number(f.section),
        });
        const displayRows = reportList(response.data);
        setRows(
          displayRows.filter((row, index, records) => {
            const studentId = val(row, "studentId", "StudentId", "id", "Id");
            return records.findIndex((item) => String(val(item, "studentId", "StudentId", "id", "Id")) === String(studentId)) === index;
          }),
        );
        if (!displayRows.length) say("No student attendance records found for the selected month and filters.");
        else if (!displayRows.some(hasDateWiseAttendance))
          say("Monthly totals loaded. The API response does not include date-wise student attendance records.");
      }
    } catch (e) {
      setRows([]);
      say(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const exportAttendance = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const selectedDate = new Date(`${f.date}T00:00:00`);
      const response = await apiClient.get(format === "csv" ? apiEndpoints.attendance.studentMonthlyExportCsv : apiEndpoints.attendance.studentMonthlyExport, {
        params: {
          Date: f.date,
          Month: selectedDate.getMonth() + 1,
          Year: selectedDate.getFullYear(),
          BoardId: f.board ? Number(f.board) : undefined,
          AcademicYearId: f.year ? Number(f.year) : undefined,
          AcademicLevelId: f.level ? Number(f.level) : undefined,
          GroupId: f.group ? Number(f.group) : undefined,
          SectionId: f.section ? Number(f.section) : undefined,
          SubjectId: f.subject ? Number(f.subject) : undefined,
          PeriodId: f.period ? Number(f.period) : undefined,
        },
        responseType: "blob",
      });
      const academicYear = m.years.find((item) => String(item.id) === String(f.year))?.name || f.date.slice(0, 7);
      saveDownload(response.data, `Student_Attendance_${filePart(academicYear, "Academic_Year")}.${format === "csv" ? "csv" : "xlsx"}`);
      say(`Student attendance ${format === "csv" ? "CSV" : "Excel"} downloaded.`);
    } catch (error) { say(getApiErrorMessage(error)); }
    finally { setExporting(""); }
  };
  const reportDate = new Date(`${f.date}T00:00:00`);
  const reportYear = reportDate.getFullYear();
  const reportMonth = reportDate.getMonth();
  const reportDays = Array.from({ length: new Date(reportYear, reportMonth + 1, 0).getDate() }, (_, index) => index + 1);
  const selectedReportDay = reportDate.getDate();
  const reportMonthLabel = reportDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedGroupName = m.groups.find((item) => String(item.id) === String(f.group))?.name ?? "—";
  const selectedSectionName = m.sections.find((item) => String(item.id) === String(f.section))?.name ?? "—";
  return (
    <>
      <section className="att-card att-report-card">
        <div className="att-report-filters att-student-report-filters">
          <Field l="Date">
            <input type="date" value={f.date} onChange={change("date")} />
          </Field>
          <Select l="Board" v={f.board} on={change("board")} o={m.boards} empty="All boards" />
          {!staffMode && (
            <>
              <Select
                l="Academic Year"
                v={f.year}
                on={change("year")}
                o={m.years}
                empty={yearLoading ? "Loading..." : "No active year"}
                disabled
              />
              <Select l="Academic Level" v={f.level} on={change("level")} o={m.levels} empty={levelLoading ? "Loading..." : "All levels"} disabled={!f.board || !f.year || levelLoading} />
              <Select l="Group" v={f.group} on={change("group")} o={m.groups} empty="All groups" />
              <Select l="Program" v={f.program} on={change("program")} o={programOptions} empty="Select Program" disabled={!f.group} />
              <Select
                l="Section"
                v={f.section}
                on={change("section")}
                o={m.sections}
                empty="All sections"
                disabled={!f.program}
              />
            </>
          )}
        </div>
        <div className="att-report-actions att-student-report-actions">
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={load}>
            {loading ? "Loading..." : "Apply Filters"}
          </button>
          <AttendanceExportMenu disabled={loading || !f.year} exporting={exporting} onExport={exportAttendance} />
        </div>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <div>
            <b>Monthly Attendance</b>
            <span className="att-days-label">{reportMonthLabel} · {reportDays.length} days</span>
            <div className="att-legend">P Present · A Absent · L Late · LV Leave</div>
          </div>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-month-table">
            <thead>
              <tr>
                <th>Roll No.</th>
                <th>Student Name</th>
                <th>Group</th>
                <th>Section</th>
                {reportDays.map((day) => <th className="att-day-header" key={day}><span>{day}</span><small>{new Date(reportYear, reportMonth, day).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}</small></th>)}
                <th className="att-month-summary">Present Days</th>
                <th className="att-month-summary">Absent Days</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={reportDays.length + 6}>Loading report...</td>
                </tr>
              ) : rows.length ? (
                rows.map((row, i) => (
                  <tr key={val(row, "studentId", "facultyId", "id", "Id") ?? i}>
                    <td>{val(row, "rollNumber", "RollNumber", "rollNo", "RollNo", "admissionNumber", "AdmissionNumber") || "—"}</td>
                    <td>{val(row, "studentName", "StudentName", "name", "Name") || "—"}</td>
                    <td>{val(row, "groupName", "GroupName") || selectedGroupName}</td>
                    <td>{val(row, "sectionName", "SectionName") || selectedSectionName}</td>
                    {reportDays.map((day) => {
                      const attendanceRecord = attendanceRecordForDay(row, reportYear, reportMonth, day, selectedReportDay);
                      if (!attendanceRecord || val(attendanceRecord, "isAttendanceMarked", "IsAttendanceMarked") === false)
                        return <td key={day}><span className="att-status-dash">—</span></td>;
                      const attendanceStatus = status(val(
                        attendanceRecord,
                        "status", "Status",
                        "attendanceStatus", "AttendanceStatus",
                        "statusId", "StatusId",
                        "attendanceStatusId", "AttendanceStatusId",
                        "statusCode", "StatusCode",
                        "statusName", "StatusName",
                      ));
                      const statusCode = STATUS.find(([name]) => name === attendanceStatus)?.[2] ?? "—";
                      return <td key={day}><span className={`att-status-pill att-${attendanceStatus.toLowerCase()}`}>{statusCode}</span></td>;
                    })}
                    <td className="att-month-summary"><b>{attendanceTotals(row).present}</b></td>
                    <td className="att-month-summary"><b>{attendanceTotals(row).absent}</b></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={reportDays.length + 6}>Apply filters to load the monthly report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Field({ l, children }) {
  return (
    <label className="att-field">
      <span>{l}</span>
      {children}
    </label>
  );
}
function Select({ l, v, on, o, empty = "Select", disabled = false }) {
  const groups = o.reduce((result, option) => {
    const key = option.group ?? "";
    if (!result[key]) result[key] = [];
    result[key].push(option);
    return result;
  }, {});
  return (
    <Field l={l}>
      <select value={v} onChange={on} disabled={disabled}>
        <option value="">{empty}</option>
        {Object.entries(groups).map(([group, options]) =>
          group ? (
            <optgroup key={group} label={group}>
              {options.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
          ) : options.map((x) => <option key={x.id} value={x.id}>{x.name}</option>),
        )}
      </select>
    </Field>
  );
}
