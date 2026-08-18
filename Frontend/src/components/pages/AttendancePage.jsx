import { useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./AttendancePage.css";

const marksList = ["Present", "Absent", "Late", "Leave"];

const today = new Date().toISOString().split("T")[0];

/* ============================================================
   STATIC STUDENT DATA
   ============================================================ */

const mockStudents = [
  {
    id: 1,
    roll: "101",
    name: "Aarav Kumar",
    group: "MPC",
    section: "Section A",
  },
  {
    id: 2,
    roll: "102",
    name: "Rahul Sharma",
    group: "MPC",
    section: "Section A",
  },
  {
    id: 3,
    roll: "103",
    name: "Priya Reddy",
    group: "MPC",
    section: "Section A",
  },
  {
    id: 4,
    roll: "104",
    name: "Sneha Rao",
    group: "MPC",
    section: "Section A",
  },
  {
    id: 5,
    roll: "105",
    name: "Kiran Kumar",
    group: "MPC",
    section: "Section B",
  },
  {
    id: 6,
    roll: "106",
    name: "Anjali Devi",
    group: "MPC",
    section: "Section B",
  },
  {
    id: 7,
    roll: "107",
    name: "Vijay Sai",
    group: "MPC",
    section: "Section B",
  },
  {
    id: 8,
    roll: "108",
    name: "Pooja Reddy",
    group: "MPC",
    section: "Section B",
  },
];

/* ============================================================
   STATIC FACULTY DATA
   ============================================================ */

const mockFaculty = [
  {
    id: 1,
    employeeId: "FAC001",
    name: "Dr. Ramesh Kumar",
    department: "Mathematics",
  },
  {
    id: 2,
    employeeId: "FAC002",
    name: "Suresh Reddy",
    department: "Physics",
  },
  {
    id: 3,
    employeeId: "FAC003",
    name: "Lakshmi Devi",
    department: "Chemistry",
  },
  {
    id: 4,
    employeeId: "FAC004",
    name: "Anitha Rao",
    department: "English",
  },
  {
    id: 5,
    employeeId: "FAC005",
    name: "Prakash Kumar",
    department: "Computer Science",
  },
];

/* ============================================================
   INITIAL STUDENT HISTORY
   Only these 8 students are used.
   ============================================================ */

const initialStudentHistory = [
  {
    id: "S-1",
    personId: 1,
    type: "Student",
    date: today,
    roll: "101",
    name: "Aarav Kumar",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-2",
    personId: 2,
    type: "Student",
    date: today,
    roll: "102",
    name: "Rahul Sharma",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Absent",
    remarks: "",
  },
  {
    id: "S-3",
    personId: 3,
    type: "Student",
    date: today,
    roll: "103",
    name: "Priya Reddy",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-4",
    personId: 4,
    type: "Student",
    date: today,
    roll: "104",
    name: "Sneha Rao",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Late",
    remarks: "",
  },
  {
    id: "S-5",
    personId: 5,
    type: "Student",
    date: today,
    roll: "105",
    name: "Kiran Kumar",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-6",
    personId: 6,
    type: "Student",
    date: today,
    roll: "106",
    name: "Anjali Devi",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Leave",
    remarks: "",
  },
  {
    id: "S-7",
    personId: 7,
    type: "Student",
    date: today,
    roll: "107",
    name: "Vijay Sai",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-8",
    personId: 8,
    type: "Student",
    date: today,
    roll: "108",
    name: "Pooja Reddy",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Absent",
    remarks: "",
  },

  /* Previous-day records for report demonstration */

  {
    id: "S-9",
    personId: 1,
    type: "Student",
    date: "2026-08-17",
    roll: "101",
    name: "Aarav Kumar",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-10",
    personId: 2,
    type: "Student",
    date: "2026-08-17",
    roll: "102",
    name: "Rahul Sharma",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-11",
    personId: 3,
    type: "Student",
    date: "2026-08-17",
    roll: "103",
    name: "Priya Reddy",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-12",
    personId: 4,
    type: "Student",
    date: "2026-08-17",
    roll: "104",
    name: "Sneha Rao",
    department: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    status: "Absent",
    remarks: "",
  },
  {
    id: "S-13",
    personId: 5,
    type: "Student",
    date: "2026-08-17",
    roll: "105",
    name: "Kiran Kumar",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-14",
    personId: 6,
    type: "Student",
    date: "2026-08-17",
    roll: "106",
    name: "Anjali Devi",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Leave",
    remarks: "",
  },
  {
    id: "S-15",
    personId: 7,
    type: "Student",
    date: "2026-08-17",
    roll: "107",
    name: "Vijay Sai",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Present",
    remarks: "",
  },
  {
    id: "S-16",
    personId: 8,
    type: "Student",
    date: "2026-08-17",
    roll: "108",
    name: "Pooja Reddy",
    department: "MPC",
    section: "Section B",
    subject: "Physics",
    faculty: "Suresh Reddy",
    status: "Absent",
    remarks: "",
  },
];

/* ============================================================
   INITIAL FACULTY HISTORY
   ============================================================ */

const initialFacultyHistory = [
  {
    id: "F-1",
    personId: 1,
    type: "Faculty",
    date: today,
    employeeId: "FAC001",
    name: "Dr. Ramesh Kumar",
    department: "Mathematics",
    status: "Present",
    remarks: "",
  },
  {
    id: "F-2",
    personId: 2,
    type: "Faculty",
    date: today,
    employeeId: "FAC002",
    name: "Suresh Reddy",
    department: "Physics",
    status: "Present",
    remarks: "",
  },
  {
    id: "F-3",
    personId: 3,
    type: "Faculty",
    date: today,
    employeeId: "FAC003",
    name: "Lakshmi Devi",
    department: "Chemistry",
    status: "Absent",
    remarks: "",
  },
  {
    id: "F-4",
    personId: 4,
    type: "Faculty",
    date: today,
    employeeId: "FAC004",
    name: "Anitha Rao",
    department: "English",
    status: "Present",
    remarks: "",
  },
  {
    id: "F-5",
    personId: 5,
    type: "Faculty",
    date: today,
    employeeId: "FAC005",
    name: "Prakash Kumar",
    department: "Computer Science",
    status: "Leave",
    remarks: "",
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

const getCount = (records, status) =>
  records.filter((record) => record.status === status).length;

const getPercentage = (records) => {
  if (!records.length) return 0;

  const present = records.filter(
    (record) => record.status === "Present"
  ).length;

  return Math.round((present / records.length) * 100);
};

/* ============================================================
   COMPONENT
   ============================================================ */

export default function AttendancePage() {
  const [attendanceMode, setAttendanceMode] = useState("student");
  const [attendanceStep, setAttendanceStep] = useState(1);
  const [toast, setToast] = useState("");

  /* ============================================================
     STUDENT FILTERS
     ============================================================ */

  const defaultStudentFilters = {
    date: today,
    board: "Board of Intermediate Education, Andhra Pradesh",
    academicYear: "2026-2027",
    group: "MPC",
    section: "Section A",
    subject: "Mathematics",
    faculty: "Dr. Ramesh Kumar",
    period: "Period 1",
  };

  const [studentFilters, setStudentFilters] = useState(
    defaultStudentFilters
  );

  /* ============================================================
     STUDENT ROWS
     ============================================================ */

  const [studentRows, setStudentRows] = useState(
    mockStudents.map((student) => ({
      ...student,
      mark: "Present",
    }))
  );

  /* ============================================================
     FACULTY FILTERS
     ============================================================ */

  const defaultFacultyFilters = {
    date: today,
    department: "All Departments",
  };

  const [facultyFilters, setFacultyFilters] = useState(
    defaultFacultyFilters
  );

  /* ============================================================
     FACULTY ROWS
     ============================================================ */

  const [facultyRows, setFacultyRows] = useState(
    mockFaculty.map((faculty) => ({
      ...faculty,
      mark: "Present",
    }))
  );

  /* ============================================================
     HISTORY
     ============================================================ */

  const [studentHistory, setStudentHistory] =
    useState(initialStudentHistory);

  const [facultyHistory, setFacultyHistory] =
    useState(initialFacultyHistory);

  const [historyFilter, setHistoryFilter] = useState("Student");

  const [historySearch, setHistorySearch] = useState("");

  /* ============================================================
     HISTORY PAGINATION
     ============================================================ */

  const [historyPage, setHistoryPage] = useState(1);

  const historyPageSize = 8;

  /* ============================================================
     REPORT
     ============================================================ */

  const [reportType, setReportType] = useState("Student");

  const [reportFromDate, setReportFromDate] =
    useState("2026-08-17");

  const [reportToDate, setReportToDate] =
    useState(today);

  const [reportGenerated, setReportGenerated] = useState(true);

  /* ============================================================
     REPORT PAGINATION
     ============================================================ */

  const [reportPage, setReportPage] = useState(1);

  const reportPageSize = 8;

  /* ============================================================
     STUDENT MARK
     ============================================================ */

  const setStudentMark = (id, mark) => {
    setStudentRows((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              mark,
            }
          : row
      )
    );
  };

  /* ============================================================
     FACULTY MARK
     ============================================================ */

  const setFacultyMark = (id, mark) => {
    setFacultyRows((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              mark,
            }
          : row
      )
    );
  };

  /* ============================================================
     MARK ALL STUDENTS PRESENT
     ============================================================ */

  const markAllStudentsPresent = () => {
    setStudentRows((rows) =>
      rows.map((row) => ({
        ...row,
        mark: "Present",
      }))
    );

    setToast("All students marked present");
  };

  /* ============================================================
     MARK ALL FACULTY PRESENT
     ============================================================ */

  const markAllFacultyPresent = () => {
    setFacultyRows((rows) =>
      rows.map((row) => ({
        ...row,
        mark: "Present",
      }))
    );

    setToast("All faculty marked present");
  };

  /* ============================================================
     SAVE STUDENT ATTENDANCE
     ============================================================ */

  const saveStudentAttendance = () => {
    if (!studentRows.length) {
      setToast("Please add students before saving attendance");
      return;
    }

    const newRecords = studentRows.map((student) => ({
      id: `student-${Date.now()}-${student.id}-${Math.random()}`,
      personId: student.id,
      type: "Student",
      date: studentFilters.date,
      roll: student.roll,
      name: student.name,
      department: student.group,
      section: student.section,
      subject: studentFilters.subject,
      faculty: studentFilters.faculty,
      status: student.mark,
      remarks: "",
    }));

    /*
     * IMPORTANT:
     * Remove existing records for the same student/date/subject/faculty
     * before adding the newly saved records.
     *
     * This prevents duplicate records when the same attendance is saved
     * multiple times.
     */

    setStudentHistory((previous) => {
      const filteredPrevious = previous.filter(
        (oldRecord) =>
          !newRecords.some(
            (newRecord) =>
              oldRecord.personId === newRecord.personId &&
              oldRecord.date === newRecord.date &&
              oldRecord.subject === newRecord.subject &&
              oldRecord.faculty === newRecord.faculty
          )
      );

      return [...newRecords, ...filteredPrevious];
    });

    setHistoryPage(1);
    setReportPage(1);

    setToast("Student attendance saved successfully");
  };

  /* ============================================================
     SAVE FACULTY ATTENDANCE
     ============================================================ */

  const saveFacultyAttendance = () => {
    if (!facultyRows.length) {
      setToast("Please add faculty before saving attendance");
      return;
    }

    const newRecords = facultyRows.map((faculty) => ({
      id: `faculty-${Date.now()}-${faculty.id}-${Math.random()}`,
      personId: faculty.id,
      type: "Faculty",
      date: facultyFilters.date,
      employeeId: faculty.employeeId,
      name: faculty.name,
      department: faculty.department,
      status: faculty.mark,
      remarks: "",
    }));

    /*
     * Prevent duplicate attendance for the same faculty/date.
     */

    setFacultyHistory((previous) => {
      const filteredPrevious = previous.filter(
        (oldRecord) =>
          !newRecords.some(
            (newRecord) =>
              oldRecord.personId === newRecord.personId &&
              oldRecord.date === newRecord.date
          )
      );

      return [...newRecords, ...filteredPrevious];
    });

    setHistoryPage(1);
    setReportPage(1);

    setToast("Faculty attendance saved successfully");
  };

  /* ============================================================
     RESET STUDENT
     ============================================================ */

  const resetStudent = () => {
    setStudentFilters(defaultStudentFilters);

    setStudentRows(
      mockStudents.map((student) => ({
        ...student,
        mark: "Present",
      }))
    );
  };

  /* ============================================================
     RESET FACULTY
     ============================================================ */

  const resetFaculty = () => {
    setFacultyFilters(defaultFacultyFilters);

    setFacultyRows(
      mockFaculty.map((faculty) => ({
        ...faculty,
        mark: "Present",
      }))
    );
  };

  /* ============================================================
     HISTORY FILTERING
     ============================================================ */

  const filteredHistory = useMemo(() => {
    const source =
      historyFilter === "Student"
        ? studentHistory
        : facultyHistory;

    const search = historySearch.trim().toLowerCase();

    if (!search) return source;

    return source.filter((record) => {
      return (
        record.name?.toLowerCase().includes(search) ||
        record.roll?.toLowerCase().includes(search) ||
        record.employeeId?.toLowerCase().includes(search) ||
        record.department?.toLowerCase().includes(search) ||
        record.subject?.toLowerCase().includes(search) ||
        record.faculty?.toLowerCase().includes(search)
      );
    });
  }, [
    historyFilter,
    historySearch,
    studentHistory,
    facultyHistory,
  ]);

  /* ============================================================
     HISTORY PAGINATION DATA
     ============================================================ */

  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / historyPageSize)
  );

  const paginatedHistory = useMemo(() => {
    const start =
      (historyPage - 1) * historyPageSize;

    return filteredHistory.slice(
      start,
      start + historyPageSize
    );
  }, [
    filteredHistory,
    historyPage,
  ]);

  /* ============================================================
     CHANGE HISTORY FILTER
     ============================================================ */

  const changeHistoryFilter = (filter) => {
    setHistoryFilter(filter);
    setHistorySearch("");
    setHistoryPage(1);
  };

  /* ============================================================
     REPORT DATA
     ============================================================ */

  const reportRows = useMemo(() => {
    const source =
      reportType === "Student"
        ? studentHistory
        : facultyHistory;

    const filtered = source.filter((record) => {
      return (
        record.date >= reportFromDate &&
        record.date <= reportToDate
      );
    });

    const people = {};

    filtered.forEach((record) => {
      const key = record.personId;

      if (!people[key]) {
        people[key] = {
          personId: key,
          name: record.name,
          roll: record.roll || "-",
          employeeId: record.employeeId || "-",
          department: record.department || "-",
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
        };
      }

      people[key].total += 1;

      if (record.status === "Present") {
        people[key].present += 1;
      }

      if (record.status === "Absent") {
        people[key].absent += 1;
      }

      if (record.status === "Late") {
        people[key].late += 1;
      }

      if (record.status === "Leave") {
        people[key].leave += 1;
      }
    });

    return Object.values(people)
      .sort((a, b) => {
        if (reportType === "Student") {
          return a.roll.localeCompare(b.roll);
        }

        return a.employeeId.localeCompare(b.employeeId);
      })
      .map((person) => ({
        ...person,
        percentage:
          person.total > 0
            ? Math.round(
                (person.present / person.total) * 100
              )
            : 0,
      }));
  }, [
    reportType,
    reportFromDate,
    reportToDate,
    studentHistory,
    facultyHistory,
  ]);

  /* ============================================================
     REPORT SUMMARY
     ============================================================ */

  const reportSummary = useMemo(() => {
    const total = reportRows.reduce(
      (sum, row) => sum + row.total,
      0
    );

    const present = reportRows.reduce(
      (sum, row) => sum + row.present,
      0
    );

    const absent = reportRows.reduce(
      (sum, row) => sum + row.absent,
      0
    );

    const late = reportRows.reduce(
      (sum, row) => sum + row.late,
      0
    );

    const leave = reportRows.reduce(
      (sum, row) => sum + row.leave,
      0
    );

    return {
      total,
      present,
      absent,
      late,
      leave,
      percentage:
        total > 0
          ? Math.round((present / total) * 100)
          : 0,
    };
  }, [reportRows]);

  /* ============================================================
     REPORT PAGINATION
     ============================================================ */

  const reportTotalPages = Math.max(
    1,
    Math.ceil(reportRows.length / reportPageSize)
  );

  const paginatedReportRows = useMemo(() => {
    const start =
      (reportPage - 1) * reportPageSize;

    return reportRows.slice(
      start,
      start + reportPageSize
    );
  }, [reportRows, reportPage]);

  /* ============================================================
     CHANGE REPORT TYPE
     ============================================================ */

  const changeReportType = (type) => {
    setReportType(type);
    setReportGenerated(true);
    setReportPage(1);
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <DashboardLayout
      title="Attendance Management"
      subtitle="Manage student and faculty attendance."
      breadcrumb={["Operations"]}
    >
      {/* ======================================================
          ATTENDANCE TYPE
          ====================================================== */}

      <div
        className="cms-card"
        style={{ marginBottom: 16 }}
      >
        <div
          className="cms-card-body"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className={`cms-btn ${
              attendanceMode === "student"
                ? "cms-btn-primary"
                : "cms-btn-ghost"
            }`}
            onClick={() => setAttendanceMode("student")}
          >
            Student Attendance
          </button>

          <button
            className={`cms-btn ${
              attendanceMode === "faculty"
                ? "cms-btn-primary"
                : "cms-btn-ghost"
            }`}
            onClick={() => setAttendanceMode("faculty")}
          >
            Faculty Attendance
          </button>
        </div>
      </div>

      {/* ======================================================
          STEP NAVIGATION
          ====================================================== */}

      <div
        className="cms-card"
        style={{ marginBottom: 16 }}
      >
        <div
          className="cms-card-body"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            className={`cms-btn ${
              attendanceStep === 1
                ? "cms-btn-primary"
                : "cms-btn-ghost"
            }`}
            onClick={() => setAttendanceStep(1)}
          >
            1. Mark Attendance
          </button>

          <button
            className={`cms-btn ${
              attendanceStep === 2
                ? "cms-btn-primary"
                : "cms-btn-ghost"
            }`}
            onClick={() => setAttendanceStep(2)}
          >
            2. Attendance History
          </button>

          <button
            className={`cms-btn ${
              attendanceStep === 3
                ? "cms-btn-primary"
                : "cms-btn-ghost"
            }`}
            onClick={() => setAttendanceStep(3)}
          >
            3. Attendance Report
          </button>
        </div>
      </div>

      {/* ======================================================
          STEP 1 — MARK ATTENDANCE
          ====================================================== */}

      {attendanceStep === 1 && (
        <>
          {/* ==================================================
              STUDENT ATTENDANCE
              ================================================== */}

          {attendanceMode === "student" && (
            <>
              <div
                className="cms-card"
                style={{ marginBottom: 16 }}
              >
                <div className="cms-card-head">
                  <h2>Student Attendance</h2>
                </div>

                <div className="cms-card-body">
                  <div className="cms-filters">
                    {/* DATE */}

                    <div className="cms-field">
                      <label>Date</label>

                      <input
                        type="date"
                        value={studentFilters.date}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* BOARD */}

                    <div className="cms-field">
                      <label>Board</label>

                      <select
                        value={studentFilters.board}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            board: e.target.value,
                          }))
                        }
                      >
                        <option>
                          Board of Intermediate Education, Andhra Pradesh
                        </option>

                        <option>
                          Telangana State Board
                        </option>
                      </select>
                    </div>

                    {/* YEAR */}

                    <div className="cms-field">
                      <label>Academic Year</label>

                      <select
                        value={studentFilters.academicYear}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            academicYear: e.target.value,
                          }))
                        }
                      >
                        <option>2026-2027</option>
                        <option>2025-2026</option>
                      </select>
                    </div>

                    {/* GROUP */}

                    <div className="cms-field">
                      <label>Group</label>

                      <select
                        value={studentFilters.group}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            group: e.target.value,
                          }))
                        }
                      >
                        <option>MPC</option>
                        <option>BiPC</option>
                        <option>CEC</option>
                      </select>
                    </div>

                    {/* SECTION */}

                    <div className="cms-field">
                      <label>Section</label>

                      <select
                        value={studentFilters.section}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            section: e.target.value,
                          }))
                        }
                      >
                        <option>Section A</option>
                        <option>Section B</option>
                      </select>
                    </div>

                    {/* SUBJECT */}

                    <div className="cms-field">
                      <label>Subject</label>

                      <select
                        value={studentFilters.subject}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            subject: e.target.value,
                          }))
                        }
                      >
                        <option>Mathematics</option>
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>English</option>
                        <option>Computer Science</option>
                      </select>
                    </div>

                    {/* FACULTY */}

                    <div className="cms-field">
                      <label>Faculty</label>

                      <select
                        value={studentFilters.faculty}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            faculty: e.target.value,
                          }))
                        }
                      >
                        <option>Dr. Ramesh Kumar</option>
                        <option>Suresh Reddy</option>
                        <option>Lakshmi Devi</option>
                        <option>Anitha Rao</option>
                        <option>Prakash Kumar</option>
                      </select>
                    </div>

                    {/* PERIOD */}

                    <div className="cms-field">
                      <label>Period</label>

                      <select
                        value={studentFilters.period}
                        onChange={(e) =>
                          setStudentFilters((prev) => ({
                            ...prev,
                            period: e.target.value,
                          }))
                        }
                      >
                        <option>Period 1</option>
                        <option>Period 2</option>
                        <option>Period 3</option>
                        <option>Period 4</option>
                        <option>Period 5</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="cms-btn cms-btn-ghost"
                      onClick={resetStudent}
                    >
                      Reset
                    </button>

                    <button
                      className="cms-btn cms-btn-primary"
                      onClick={markAllStudentsPresent}
                    >
                      Mark All Present
                    </button>
                  </div>
                </div>
              </div>

              {/* STUDENT TABLE */}

              <div className="cms-card">
                <div className="cms-card-head">
                  <h2>Student Attendance</h2>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {marksList.map((status) => (
                      <span
                        key={status}
                        className="cms-badge cms-badge-info"
                      >
                        {status}:{" "}
                        {getCount(studentRows, status)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="cms-table-wrap">
                  <table className="cms-table cms-attendance-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Group</th>
                        <th>Section</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              padding: 20,
                            }}
                          >
                            No students available.
                            Click Reset to restore the
                            static students.
                          </td>
                        </tr>
                      ) : (
                        studentRows.map((student) => (
                          <tr key={student.id}>
                            <td className="cms-strong">
                              {student.roll}
                            </td>

                            <td>{student.name}</td>

                            <td>{student.group}</td>

                            <td>{student.section}</td>

                            <td>
                              <div className="cms-radio-row">
                                {marksList.map((mark) => (
                                  <label
                                    key={mark}
                                    className={`cms-radio ${
                                      student.mark === mark
                                        ? `on-${mark.toLowerCase()}`
                                        : ""
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`student-${student.id}`}
                                      checked={
                                        student.mark === mark
                                      }
                                      onChange={() =>
                                        setStudentMark(
                                          student.id,
                                          mark
                                        )
                                      }
                                    />

                                    {mark}
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cms-modal-foot">
                  <button
                    className="cms-btn cms-btn-ghost"
                    onClick={() => {
                      setStudentRows([]);
                      setToast(
                        "Student list cleared. Click Reset to restore students."
                      );
                    }}
                  >
                    Clear
                  </button>

                  <button
                    className="cms-btn cms-btn-primary"
                    onClick={saveStudentAttendance}
                  >
                    Save Attendance
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ==================================================
              FACULTY ATTENDANCE
              ================================================== */}

          {attendanceMode === "faculty" && (
            <>
              <div
                className="cms-card"
                style={{ marginBottom: 16 }}
              >
                <div className="cms-card-head">
                  <h2>Faculty Attendance</h2>
                </div>

                <div className="cms-card-body">
                  <div className="cms-filters">
                    <div className="cms-field">
                      <label>Date</label>

                      <input
                        type="date"
                        value={facultyFilters.date}
                        onChange={(e) =>
                          setFacultyFilters((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="cms-field">
                      <label>Department</label>

                      <select
                        value={facultyFilters.department}
                        onChange={(e) =>
                          setFacultyFilters((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                      >
                        <option>All Departments</option>
                        <option>Mathematics</option>
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>English</option>
                        <option>Computer Science</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      className="cms-btn cms-btn-ghost"
                      onClick={resetFaculty}
                    >
                      Reset
                    </button>

                    <button
                      className="cms-btn cms-btn-primary"
                      onClick={markAllFacultyPresent}
                    >
                      Mark All Present
                    </button>
                  </div>
                </div>
              </div>

              <div className="cms-card">
                <div className="cms-card-head">
                  <h2>Faculty Attendance</h2>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {marksList.map((status) => (
                      <span
                        key={status}
                        className="cms-badge cms-badge-info"
                      >
                        {status}:{" "}
                        {getCount(facultyRows, status)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="cms-table-wrap">
                  <table className="cms-table cms-attendance-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Faculty Name</th>
                        <th>Department</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>

                    <tbody>
                      {facultyRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              textAlign: "center",
                              padding: 20,
                            }}
                          >
                            No faculty available.
                            Click Reset to restore the
                            static faculty.
                          </td>
                        </tr>
                      ) : (
                        facultyRows.map((faculty) => (
                          <tr key={faculty.id}>
                            <td className="cms-strong">
                              {faculty.employeeId}
                            </td>

                            <td>{faculty.name}</td>

                            <td>{faculty.department}</td>

                            <td>
                              <div className="cms-radio-row">
                                {marksList.map((mark) => (
                                  <label
                                    key={mark}
                                    className={`cms-radio ${
                                      faculty.mark === mark
                                        ? `on-${mark.toLowerCase()}`
                                        : ""
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`faculty-${faculty.id}`}
                                      checked={
                                        faculty.mark === mark
                                      }
                                      onChange={() =>
                                        setFacultyMark(
                                          faculty.id,
                                          mark
                                        )
                                      }
                                    />

                                    {mark}
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cms-modal-foot">
                  <button
                    className="cms-btn cms-btn-ghost"
                    onClick={() => {
                      setFacultyRows([]);
                      setToast(
                        "Faculty list cleared. Click Reset to restore faculty."
                      );
                    }}
                  >
                    Clear
                  </button>

                  <button
                    className="cms-btn cms-btn-primary"
                    onClick={saveFacultyAttendance}
                  >
                    Save Attendance
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ======================================================
          STEP 2 — ATTENDANCE HISTORY
          ====================================================== */}

      {attendanceStep === 2 && (
        <div className="cms-card">
          <div className="cms-card-head">
            <h2>Attendance History</h2>
          </div>

          <div className="cms-card-body">
            {/* STUDENT / FACULTY */}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <button
                className={`cms-btn ${
                  historyFilter === "Student"
                    ? "cms-btn-primary"
                    : "cms-btn-ghost"
                }`}
                onClick={() =>
                  changeHistoryFilter("Student")
                }
              >
                Student History
              </button>

              <button
                className={`cms-btn ${
                  historyFilter === "Faculty"
                    ? "cms-btn-primary"
                    : "cms-btn-ghost"
                }`}
                onClick={() =>
                  changeHistoryFilter("Faculty")
                }
              >
                Faculty History
              </button>
            </div>

            {/* SEARCH */}

            <div
              className="cms-filters"
              style={{ marginBottom: 16 }}
            >
              <div className="cms-field">
                <label>Search</label>

                <input
                  type="text"
                  placeholder={
                    historyFilter === "Student"
                      ? "Search student..."
                      : "Search faculty..."
                  }
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                />
              </div>
            </div>

            {/* SUMMARY */}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {marksList.map((status) => (
                <span
                  key={status}
                  className="cms-badge cms-badge-info"
                >
                  {status}:{" "}
                  {getCount(filteredHistory, status)}
                </span>
              ))}

              <span className="cms-badge cms-badge-success">
                Attendance:{" "}
                {getPercentage(filteredHistory)}%
              </span>

              <span className="cms-badge cms-badge-info">
                Records: {filteredHistory.length}
              </span>
            </div>
          </div>

          {/* HISTORY TABLE */}

          <div className="cms-table-wrap">
            <table className="cms-table cms-attendance-table">
              <thead>
                {historyFilter === "Student" ? (
                  <tr>
                    <th>Date</th>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Group</th>
                    <th>Section</th>
                    <th>Subject</th>
                    <th>Faculty</th>
                    <th>Attendance</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Date</th>
                    <th>Employee ID</th>
                    <th>Faculty Name</th>
                    <th>Department</th>
                    <th>Attendance</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {paginatedHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        historyFilter === "Student"
                          ? 8
                          : 5
                      }
                      style={{
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      No attendance records found.
                    </td>
                  </tr>
                )}

                {paginatedHistory.map((record) =>
                  historyFilter === "Student" ? (
                    <tr key={record.id}>
                      <td>{record.date}</td>

                      <td className="cms-strong">
                        {record.roll}
                      </td>

                      <td>{record.name}</td>

                      <td>{record.department}</td>

                      <td>{record.section || "-"}</td>

                      <td>{record.subject}</td>

                      <td>{record.faculty}</td>

                      <td>
                        <span
                          className={`cms-badge ${
                            record.status === "Present"
                              ? "cms-badge-success"
                              : record.status === "Absent"
                              ? "cms-badge-warn"
                              : "cms-badge-info"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={record.id}>
                      <td>{record.date}</td>

                      <td className="cms-strong">
                        {record.employeeId}
                      </td>

                      <td>{record.name}</td>

                      <td>{record.department}</td>

                      <td>
                        <span
                          className={`cms-badge ${
                            record.status === "Present"
                              ? "cms-badge-success"
                              : record.status === "Absent"
                              ? "cms-badge-warn"
                              : "cms-badge-info"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* HISTORY PAGINATION */}

          {filteredHistory.length > 0 && (
            <div
              className="cms-modal-foot"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="cms-strong">
                Page {historyPage} of {historyTotalPages}
              </span>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="cms-btn cms-btn-ghost"
                  disabled={historyPage === 1}
                  onClick={() =>
                    setHistoryPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                >
                  ← Previous
                </button>

                <button
                  className="cms-btn cms-btn-primary"
                  disabled={
                    historyPage === historyTotalPages
                  }
                  onClick={() =>
                    setHistoryPage((page) =>
                      Math.min(
                        historyTotalPages,
                        page + 1
                      )
                    )
                  }
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          STEP 3 — ATTENDANCE REPORT
          ====================================================== */}

      {attendanceStep === 3 && (
        <>
          <div
            className="cms-card"
            style={{ marginBottom: 16 }}
          >
            <div className="cms-card-head">
              <h2>Attendance Report</h2>
            </div>

            <div className="cms-card-body">
              {/* REPORT TYPE */}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className={`cms-btn ${
                    reportType === "Student"
                      ? "cms-btn-primary"
                      : "cms-btn-ghost"
                  }`}
                  onClick={() =>
                    changeReportType("Student")
                  }
                >
                  Student Report
                </button>

                <button
                  className={`cms-btn ${
                    reportType === "Faculty"
                      ? "cms-btn-primary"
                      : "cms-btn-ghost"
                  }`}
                  onClick={() =>
                    changeReportType("Faculty")
                  }
                >
                  Faculty Report
                </button>
              </div>

              {/* DATE RANGE */}

              <div className="cms-filters">
                <div className="cms-field">
                  <label>From Date</label>

                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => {
                      setReportFromDate(e.target.value);
                      setReportPage(1);
                    }}
                  />
                </div>

                <div className="cms-field">
                  <label>To Date</label>

                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => {
                      setReportToDate(e.target.value);
                      setReportPage(1);
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    setReportPage(1);
                    setReportGenerated(true);
                    setToast("Attendance report generated");
                  }}
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* REPORT SUMMARY */}

          {reportGenerated && (
            <>
              <div
                className="cms-card"
                style={{ marginBottom: 16 }}
              >
                <div className="cms-card-body">
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="cms-badge cms-badge-info">
                      Total: {reportSummary.total}
                    </span>

                    <span className="cms-badge cms-badge-success">
                      Present: {reportSummary.present}
                    </span>

                    <span className="cms-badge cms-badge-warn">
                      Absent: {reportSummary.absent}
                    </span>

                    <span className="cms-badge cms-badge-info">
                      Late: {reportSummary.late}
                    </span>

                    <span className="cms-badge cms-badge-info">
                      Leave: {reportSummary.leave}
                    </span>

                    <span className="cms-badge cms-badge-success">
                      Overall: {reportSummary.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* REPORT TABLE */}

              <div className="cms-card">
                <div className="cms-card-head">
                  <h2>
                    {reportType === "Student"
                      ? "Student-wise Attendance Report"
                      : "Faculty-wise Attendance Report"}
                  </h2>

                  <span className="cms-badge cms-badge-info">
                    {reportFromDate} → {reportToDate}
                  </span>
                </div>

                <div className="cms-table-wrap">
                  <table className="cms-table cms-attendance-table">
                    <thead>
                      {reportType === "Student" ? (
                        <tr>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Group</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Late</th>
                          <th>Leave</th>
                          <th>Total</th>
                          <th>Percentage</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Employee ID</th>
                          <th>Faculty Name</th>
                          <th>Department</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Late</th>
                          <th>Leave</th>
                          <th>Total</th>
                          <th>Percentage</th>
                        </tr>
                      )}
                    </thead>

                    <tbody>
                      {paginatedReportRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            style={{
                              textAlign: "center",
                              padding: 20,
                            }}
                          >
                            No attendance data found for
                            the selected dates.
                          </td>
                        </tr>
                      )}

                      {paginatedReportRows.map((row) => (
                        <tr key={row.personId}>
                          <td className="cms-strong">
                            {reportType === "Student"
                              ? row.roll
                              : row.employeeId}
                          </td>

                          <td>{row.name}</td>

                          <td>{row.department}</td>

                          <td>{row.present}</td>

                          <td>{row.absent}</td>

                          <td>{row.late}</td>

                          <td>{row.leave}</td>

                          <td>{row.total}</td>

                          <td>
                            <span
                              className={`cms-badge ${
                                row.percentage >= 75
                                  ? "cms-badge-success"
                                  : "cms-badge-warn"
                              }`}
                            >
                              {row.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* REPORT PAGINATION */}

                {reportRows.length > 0 && (
                  <div
                    className="cms-modal-foot"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="cms-strong">
                      Page {reportPage} of {reportTotalPages}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <button
                        className="cms-btn cms-btn-ghost"
                        disabled={reportPage === 1}
                        onClick={() =>
                          setReportPage((page) =>
                            Math.max(1, page - 1)
                          )
                        }
                      >
                        ← Previous
                      </button>

                      <button
                        className="cms-btn cms-btn-primary"
                        disabled={
                          reportPage === reportTotalPages
                        }
                        onClick={() =>
                          setReportPage((page) =>
                            Math.min(
                              reportTotalPages,
                              page + 1
                            )
                          )
                        }
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ======================================================
          PREVIOUS / NEXT
          ====================================================== */}

      <div
        className="cms-card"
        style={{ marginTop: 16 }}
      >
        <div
          className="cms-card-body"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            className="cms-btn cms-btn-ghost"
            disabled={attendanceStep === 1}
            onClick={() =>
              setAttendanceStep((step) =>
                Math.max(1, step - 1)
              )
            }
          >
            ← Previous
          </button>

          <span className="cms-strong">
            Step {attendanceStep} of 3
          </span>

          <button
            className="cms-btn cms-btn-primary"
            disabled={attendanceStep === 3}
            onClick={() =>
              setAttendanceStep((step) =>
                Math.min(3, step + 1)
              )
            }
          >
            Next →
          </button>
        </div>
      </div>

      {/* ======================================================
          SUCCESS TOAST
          ====================================================== */}

      {toast && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 9999,
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #ddd)",
            borderRadius: 10,
            padding: "14px 18px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
            minWidth: 280,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
          }}
        >
          <span>{toast}</span>

          <button
            className="cms-btn cms-btn-ghost"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}