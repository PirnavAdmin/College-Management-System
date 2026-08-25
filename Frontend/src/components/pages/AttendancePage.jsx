import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AttendancePage.css";

const STATUS = [
  ["Present", 1, "P"],
  ["Absent", 2, "A"],
  ["Late", 3, "L"],
  ["Leave", 4, "LV"],
];
const TODAY = new Date().toISOString().slice(0, 10);
const list = (x) => (Array.isArray(x) ? x : (x?.data ?? x?.items ?? x?.result ?? x?.results ?? []));
const val = (x, ...keys) => keys.map((k) => x?.[k]).find((v) => v !== undefined && v !== null);
const status = (x) =>
  STATUS.find(
    ([n, id]) => String(id) === String(x) || n.toLowerCase() === String(x ?? "").toLowerCase(),
  )?.[0] ?? "Present";
const toOptions = (data, ids, names) =>
  list(data)
    .map((x) => ({ id: String(val(x, ...ids) ?? ""), name: val(x, ...names) ?? "", raw: x }))
    .filter((x, index, all) => x.id && x.name && all.findIndex((item) => item.id === x.id) === index);
const activeYearsForBoard = (data, boardId) =>
  toOptions(
    list(data).filter(
      (year) =>
        String(val(year, "boardId", "BoardId") ?? "") === String(boardId) &&
        val(year, "isActive", "IsActive") === true,
    ),
    ["academicYearId", "id", "Id"],
    ["academicYearName", "yearName", "name", "Name"],
  );
const levelsForBoard = (levels, board) => {
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
  code: val(x, "rollNo", "RollNo", "admissionNo", "AdmissionNo", "studentCode") ?? "—",
  name: val(x, "studentName", "StudentName", "name", "Name", "fullName") ?? "—",
  group: val(x, "groupName", "GroupName", "group") ?? "—",
  status: status(val(x, "status", "Status", "attendanceStatus")),
});
const staff = (x) => ({
  id: val(x, "facultyId", "FacultyId", "staffId", "StaffId", "id", "Id"),
  code: val(x, "employeeId", "EmployeeId", "staffCode", "StaffCode") ?? "—",
  name: val(x, "facultyName", "FacultyName", "staffName", "StaffName", "name", "Name") ?? "—",
  department: val(x, "departmentName", "DepartmentName", "department") ?? "—",
  status: status(val(x, "status", "Status", "attendanceStatus")),
});

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
        breadcrumb={["Academic Management", "Attendance", isStaff ? "Staff" : "Student"]}
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
      sections: [],
      subjects: [],
      periods: [],
      teachers: [],
    }),
    [f, setF] = useState({
      date: TODAY,
      boardId: "",
      academicYearId: "",
      academicLevelId: "",
      groupId: "",
      sectionId: "",
      subjectId: "",
      periodId: "",
      classTeacherId: "",
    }),
    [rows, setRows] = useState([]),
    [yearLoading, setYearLoading] = useState(false),
    [levelLoading, setLevelLoading] = useState(false),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false);
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
          sectionId: "",
          subjectId: "",
          periodId: "",
          classTeacherId: "",
        };
      if (k === "academicYearId")
        return {
          ...c,
          academicYearId: value,
          academicLevelId: "",
          groupId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          classTeacherId: "",
        };
      if (k === "academicLevelId")
        return {
          ...c,
          academicLevelId: value,
          groupId: "",
          sectionId: "",
          subjectId: "",
          periodId: "",
          classTeacherId: "",
        };
      if (k === "groupId")
        return {
          ...c,
          groupId: value,
          sectionId: "",
          subjectId: "",
          periodId: "",
          classTeacherId: "",
        };
      if (k === "sectionId")
        return { ...c, sectionId: value, subjectId: "", periodId: "", classTeacherId: "" };
      if (k === "periodId") return { ...c, periodId: value, classTeacherId: "" };
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
    Promise.allSettled([
      apiClient.get(apiEndpoints.sections.byGroup(f.groupId)),
      apiClient.get(apiEndpoints.subjects.context, {
        params: { boardId: f.boardId, groupId: f.groupId, academicLevelId: f.academicLevelId },
      }),
    ]).then((r) => {
      if (!active) return;
      setM((c) => ({
        ...c,
        sections:
          r[0].status === "fulfilled"
            ? toOptions(r[0].value.data, ["sectionId", "id", "Id"], ["sectionName", "name", "Name"])
            : [],
        subjects:
          r[1].status === "fulfilled"
            ? toOptions(r[1].value.data, ["subjectId", "id", "Id"], ["subjectName", "name", "Name"])
            : [],
      }));
      setF((c) => ({ ...c, sectionId: "", subjectId: "", periodId: "", classTeacherId: "" }));
    });
    return () => { active = false; };
  }, [f.boardId, f.academicLevelId, f.groupId]);
  useEffect(() => {
    if (!f.groupId || !f.sectionId) return;
    apiClient
      .get(apiEndpoints.attendance.academicContext, {
        params: { groupId: f.groupId, sectionId: f.sectionId },
      })
      .then((r) =>
        setF((c) => ({
          ...c,
          classTeacherId: String(
            val(
              r.data?.data ?? r.data,
              "classTeacherId",
              "ClassTeacherId",
              "facultyId",
              "FacultyId",
            ) ?? c.classTeacherId,
          ),
        })),
      )
      .catch(() => {});
  }, [f.groupId, f.sectionId]);
  useEffect(() => {
    if (!f.groupId || !f.sectionId || !f.periodId) return;
    apiClient
      .get(apiEndpoints.attendance.facultySubject, {
        params: { date: f.date, groupId: f.groupId, sectionId: f.sectionId, periodId: f.periodId },
      })
      .then((r) => {
        const context = r.data?.data ?? r.data;
        setF((c) => ({
          ...c,
          subjectId: String(val(context, "subjectId", "SubjectId") ?? c.subjectId),
          classTeacherId: String(
            val(context, "facultyId", "FacultyId", "classTeacherId", "ClassTeacherId") ??
              c.classTeacherId,
          ),
        }));
      })
      .catch(() => {});
  }, [f.date, f.groupId, f.sectionId, f.periodId]);
  const load = async () => {
    if ([f.academicYearId, f.academicLevelId, f.groupId, f.sectionId, f.subjectId, f.periodId].some((v) => !v))
      return say("Select all attendance fields.");
    setLoading(true);
    try {
      const r = await apiClient.post(apiEndpoints.attendance.students, {
        attendanceDate: f.date,
        academicYearId: +f.academicYearId,
        groupId: +f.groupId,
        sectionId: +f.sectionId,
        subjectId: +f.subjectId,
        periodId: +f.periodId,
      });
      setRows(
        list(r.data)
          .map(student)
          .filter((x) => x.id),
      );
    } catch (e) {
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
        groupId: +f.groupId,
        sectionId: +f.sectionId,
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
            <Select l="Section" v={f.sectionId} on={change("sectionId")} o={m.sections} empty="All sections" />
            <Select l="Subject" v={f.subjectId} on={change("subjectId")} o={m.subjects} empty="All subjects" />
            <Select l="Period" v={f.periodId} on={change("periodId")} o={m.periods} empty="All periods" />
            <Field l="Class Teacher">
              <input
                value={m.teachers.find((x) => x.id === f.classTeacherId)?.name ?? "Not assigned"}
                readOnly
              />
            </Field>
          </div>
        </div>
        <button className="cms-btn cms-btn-ghost" disabled={loading} onClick={load}>
          {loading ? "Loading..." : "Load Records"}
        </button>
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
    [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.departments.getAll),
      apiClient.get(apiEndpoints.academicYears.list),
    ]).then((r) => {
      if (r[0].status === "fulfilled")
        setBoards(
          toOptions(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"]),
        );
      if (r[1].status === "fulfilled")
        setDepts(
          toOptions(
            r[1].value.data,
            ["departmentId", "id", "Id"],
            ["departmentName", "name", "Name"],
          ),
        );
      if (r[2].status === "fulfilled")
        setYears(
          toOptions(
            r[2].value.data,
            ["academicYearId", "id", "Id"],
            ["academicYearName", "yearName", "name", "Name"],
          ),
        );
    });
  }, []);
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
      setRows(
        list(r.data)
          .map(staff)
          .filter((x) => x.id),
      );
    } catch (e) {
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
                <th>{staffMode ? "Staff ID" : "Roll No"}</th>
                <th>{staffMode ? "Staff Name" : "Student Name"}</th>
                <th>{staffMode ? "Department" : "Status"}</th>
                <th>{staffMode ? "Attendance" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4">Loading attendance...</td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{staffMode ? r.department : r.status}</td>
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
                  <td colSpan="4">Load attendance to view records.</td>
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
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.departments.getAll),
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
      if (results[2].status === "fulfilled")
        setDepartments(
          toOptions(
            results[2].value.data,
            ["departmentId", "id", "Id"],
            ["departmentName", "name", "Name"],
          ),
        );
    });
  }, []);
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
      const response = await apiClient.post(apiEndpoints.staffAttendance.monthlyReport, {
        date,
        staffType,
        departmentId: departmentId ? Number(departmentId) : null,
      });
      setRows(list(response.data));
    } catch (error) {
      say(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => setDate(`${e.target.value}-01`)}
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
        </div>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <b>Attendance Report</b>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Department</th>
                <th>Total Working Days</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Leave</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">Loading report...</td>
                </tr>
              ) : reportRows.length ? (
                reportRows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.department}</td>
                    <td>{row.workingDays}</td>
                    <td>{row.present}</td>
                    <td>{row.absent}</td>
                    <td>{row.leave}</td>
                    <td>
                      {row.percentage}
                      {String(row.percentage).includes("%") ? "" : "%"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">Apply filters to load the report.</td>
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
      sections: [],
      subjects: [],
      periods: [],
      teachers: [],
    }),
    [rows, setRows] = useState([]),
    [yearLoading, setYearLoading] = useState(false),
    [levelLoading, setLevelLoading] = useState(false),
    [loading, setLoading] = useState(false);
  const change = (k) => (e) =>
    setF((x) => {
      const value = e.target.value;
      if (k === "board")
        return { ...x, board: value, year: "", level: "", group: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "year")
        return { ...x, year: value, level: "", group: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "level")
        return { ...x, level: value, group: "", section: "", subject: "", period: "", teacher: "" };
      if (k === "group")
        return { ...x, group: value, section: "", subject: "", period: "", teacher: "" };
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
    Promise.allSettled([
      apiClient.get(apiEndpoints.sections.byGroup(f.group)),
      apiClient.get(apiEndpoints.subjects.context, {
        params: { boardId: f.board, groupId: f.group, academicLevelId: f.level },
      }),
    ]).then((r) => {
      if (!active) return;
      setM((x) => ({
        ...x,
        sections:
          r[0].status === "fulfilled"
            ? toOptions(r[0].value.data, ["sectionId", "id", "Id"], ["sectionName", "name", "Name"])
            : [],
        subjects:
          r[1].status === "fulfilled"
            ? toOptions(r[1].value.data, ["subjectId", "id", "Id"], ["subjectName", "name", "Name"])
            : [],
      }));
    });
    return () => { active = false; };
  }, [f.board, f.level, f.group]);
  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.post(
        staffMode
          ? apiEndpoints.staffAttendance.monthlyReport
          : apiEndpoints.attendance.studentMonthlyReport,
        staffMode
          ? { date: f.date, staffType: 1, departmentId: null }
          : {
              date: f.date,
              groupId: f.group ? +f.group : null,
              sectionId: f.section ? +f.section : null,
            },
      );
      setRows(list(r.data));
    } catch (e) {
      say(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const columns = rows.length ? Object.keys(rows[0]) : [];
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
              <Select
                l="Section"
                v={f.section}
                on={change("section")}
                o={m.sections}
                empty="All sections"
              />
              <Select
                l="Subject"
                v={f.subject}
                on={change("subject")}
                o={m.subjects}
                empty="All subjects"
              />
              <Select
                l="Period"
                v={f.period}
                on={change("period")}
                o={m.periods}
                empty="All periods"
              />
              <Field l="Class Teacher">
                <input value="All Class Teachers" readOnly />
              </Field>
            </>
          )}
        </div>
        <div className="att-report-actions att-student-report-actions">
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={load}>
            {loading ? "Loading..." : "Apply Filters"}
          </button>
        </div>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <b>Attendance Report</b>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-month-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td>Loading report...</td>
                </tr>
              ) : rows.length ? (
                rows.map((row, i) => (
                  <tr key={val(row, "studentId", "facultyId", "id", "Id") ?? i}>
                    {columns.map((c) => (
                      <td key={c}>{String(row[c] ?? "—")}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td>Apply filters to load the monthly report.</td>
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
  return (
    <Field l={l}>
      <select value={v} onChange={on} disabled={disabled}>
        <option value="">{empty}</option>
        {o.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
