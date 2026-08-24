import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import "./AttendancePage.css";

const TODAY = "2026-08-24";
const STATUS = [
  ["Present", "P"],
  ["Absent", "A"],
  ["Late", "L"],
];
const STUDENT_MARK_STATUS = STATUS.slice(0, 2);
const STAFF_MARK_STATUS = [
  ["Present", "P"],
  ["Absent", "A"],
  ["Leave", "LV"],
  ["Late", "L"],
];
const students = [
  ["101", "Aarav Kumar", "MPC", "A"],
  ["102", "Rahul Sharma", "MPC", "A"],
  ["103", "Priya Reddy", "MPC", "A"],
  ["104", "Anil Kumar", "MPC", "B"],
  ["105", "Sneha Rao", "BIPC", "A"],
  ["106", "Kiran Kumar", "CEC", "A"],
].map(([code, name, group, section], i) => ({ id: i + 1, code, name, group, section }));
const staff = [
  ["FAC001", "Ramesh Kumar", "Mathematics", "Lecturer", "Teaching Staff"],
  ["FAC002", "Suresh Rao", "Physics", "Lecturer", "Teaching Staff"],
  ["FAC003", "Priya Sharma", "Chemistry", "Lecturer", "Teaching Staff"],
  ["NTS001", "Ravi Teja", "Administration", "Office Assistant", "Non-Teaching Staff"],
  ["NTS002", "Lakshmi Devi", "Accounts", "Accountant", "Non-Teaching Staff"],
].map(([code, name, department, designation, staffType], i) => ({
  id: `s${i + 1}`,
  code,
  name,
  department,
  designation,
  staffType,
}));
const dates = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return Array.from(
    { length: new Date(year, monthNumber, 0).getDate() },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
};
const defaultStatus = (id, date, isStaff = false) => {
  const value = (String(id).length * 7 + Number(date.slice(-2)) * 3) % 11;
  if (value === 2) return "Absent";
  if (value === 5) return isStaff ? "Late" : "Absent";
  return "Present";
};

export default function AttendancePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState("");
  const isStaff = pathname.includes("/staff"),
    isReports = pathname.endsWith("/reports"),
    area = isStaff ? "staff" : "student";
  const go = (reports) => navigate(`/dashboard/attendance/${area}${reports ? "/reports" : ""}`);
  const title = `${isStaff ? "Staff" : "Student"} Attendance${isReports ? " Reports" : ""}`;
  return (
    <>
      <DashboardLayout
        title={title}
        subtitle={
          isReports
            ? "Monthly date-wise attendance history."
            : isStaff
              ? "Mark daily attendance for teaching and non-teaching staff."
              : "Today's attendance"
        }
        breadcrumb={["Academic Management", "Attendance", isStaff ? "Staff" : "Student"]}
      >
        <main className="attendance-module">
          <nav className="att-nav">
            <button type="button" className={!isReports ? "active" : ""} onClick={() => go(false)}>
              Mark Attendance
            </button>
            <button type="button" className={isReports ? "active" : ""} onClick={() => go(true)}>
              Reports
            </button>
          </nav>
          {isReports ? (
            <Reports isStaff={isStaff} records={records} />
          ) : (
            <Mark isStaff={isStaff} records={records} setRecords={setRecords} say={setToast} />
          )}
        </main>
      </DashboardLayout>
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}

function Mark({ isStaff, records, setRecords, say }) {
  const list = isStaff ? staff : students;
  const [date, setDate] = useState(TODAY);
  const [group, setGroup] = useState("MPC");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("Mathematics");
  const [period, setPeriod] = useState("Period 1");
  const [staffMember, setStaffMember] = useState("Dr. Ramesh Kumar");
  const [rows, setRows] = useState(() => list.map((person) => ({ ...person, status: "Present" })));
  const visibleRows = isStaff
    ? rows
    : rows.filter((person) => person.group === group && person.section === section);
  const load = () =>
    setRows(
      list.map((person) => ({
        ...person,
        status:
          records.find((record) => record.id === person.id && record.date === date)?.status ||
          "Present",
      })),
    );
  const save = () => {
    setRecords((current) => [
      ...current.filter(
        (record) =>
          !(record.date === date && visibleRows.some((person) => person.id === record.id)),
      ),
      ...visibleRows.map(({ id, status }) => ({ id, date, status })),
    ]);
    say("Attendance saved successfully.");
  };
  if (isStaff) return <StaffMark records={records} setRecords={setRecords} say={say} />;
  return (
    <>
      <section className="att-card att-filter-card">
        {isStaff ? (
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        ) : (
          <div className="att-context">
            <div className="att-context-fields">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Academic Year">
                <select>
                  <option>2026-2027</option>
                </select>
              </Field>
              <Field label="Group">
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option>MPC</option>
                  <option>BIPC</option>
                  <option>CEC</option>
                </select>
              </Field>
              <Field label="Section">
                <select value={section} onChange={(e) => setSection(e.target.value)}>
                  <option>A</option>
                  <option>B</option>
                </select>
              </Field>
              <Field label="Subject">
                <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
              </Field>
              <Field label="Period">
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option>Period 1</option>
                  <option>Period 2</option>
                </select>
              </Field>
              <Field label="Staff">
                <select value={staffMember} onChange={(e) => setStaffMember(e.target.value)}>
                  <option>Dr. Ramesh Kumar</option>
                  <option>Dr. Suresh Rao</option>
                </select>
              </Field>
            </div>
          </div>
        )}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={load}>
          Load Attendance
        </button>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <b>{isStaff ? "Today’s Attendance" : `Students: ${group} • Section ${section}`}</b>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() =>
              setRows((current) => current.map((row) => ({ ...row, status: "Present" })))
            }
          >
            Mark All Present
          </button>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-compact">
            <thead>
              <tr>
                <th>{isStaff ? "Employee ID" : "Roll No"}</th>
                <th>{isStaff ? "Staff Name" : "Student Name"}</th>
                <th>{isStaff ? "Department" : "Group"}</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{isStaff ? row.department : row.group}</td>
                  <td>
                    <div className="att-status">
                      {STUDENT_MARK_STATUS.map(([label, short]) => (
                        <button
                          type="button"
                          key={label}
                          className={row.status === label ? `is-${label.toLowerCase()}` : ""}
                          onClick={() =>
                            setRows((current) =>
                              current.map((item) =>
                                item.id === row.id ? { ...item, status: label } : item,
                              ),
                            )
                          }
                        >
                          {short}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="att-save">
          <button type="button" className="cms-btn cms-btn-primary" onClick={save}>
            Save Attendance
          </button>
        </div>
      </section>
    </>
  );
}

function StaffMark({ records, setRecords, say }) {
  const [staffType, setStaffType] = useState("Teaching Staff");
  const [date, setDate] = useState(TODAY);
  const [department, setDepartment] = useState("All Departments");
  const [rows, setRows] = useState(() => staff.map((person) => ({ ...person, status: "Present" })));
  const typeRows = rows.filter((person) => person.staffType === staffType);
  const departments = [
    ...new Set(
      staff.filter((person) => person.staffType === staffType).map((person) => person.department),
    ),
  ];
  const visibleRows = typeRows.filter(
    (person) => department === "All Departments" || person.department === department,
  );
  const load = () =>
    setRows(
      staff.map((person) => ({
        ...person,
        status:
          records.find((record) => record.id === person.id && record.date === date)?.status ||
          "Present",
      })),
    );
  const reset = () => {
    setDate(TODAY);
    setDepartment("All Departments");
  };
  const markAllPresent = () =>
    setRows((current) =>
      current.map((person) =>
        visibleRows.some((row) => row.id === person.id) ? { ...person, status: "Present" } : person,
      ),
    );
  const save = () => {
    setRecords((current) => [
      ...current.filter(
        (record) =>
          !(record.date === date && visibleRows.some((person) => person.id === record.id)),
      ),
      ...visibleRows.map(({ id, status }) => ({ id, date, status })),
    ]);
    say("Staff attendance saved successfully.");
  };
  const nonTeaching = staffType === "Non-Teaching Staff";
  return (
    <>
      <div className="att-staff-types" role="tablist" aria-label="Staff type">
        <button
          type="button"
          className={staffType === "Teaching Staff" ? "active" : ""}
          onClick={() => {
            setStaffType("Teaching Staff");
            setDepartment("All Departments");
          }}
        >
          Teaching Staff
        </button>
        <button
          type="button"
          className={nonTeaching ? "active" : ""}
          onClick={() => {
            setStaffType("Non-Teaching Staff");
            setDepartment("All Departments");
          }}
        >
          Non-Teaching Staff
        </button>
      </div>
      <section className="att-card att-staff-details">
        <b>Attendance Details</b>
        <div className="att-staff-fields">
          <Field label="Date">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Academic Year">
            <select>
              <option>2026-2027</option>
            </select>
          </Field>
          <Field label="Department">
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option>All Departments</option>
              {departments.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="att-detail-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={reset}>
            Reset
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={load}>
            Load Staff
          </button>
        </div>
      </section>
      <section className="att-card att-table-card">
        <div className="att-table-top">
          <b>
            {staffType} — {department}
          </b>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={markAllPresent}>
            Mark All Present
          </button>
        </div>
        <div className="att-scroll">
          <table className="cms-table att-table att-compact">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Department</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.department}</td>
                  <td>
                    <div className="att-status">
                      {STAFF_MARK_STATUS.map(([label, short]) => (
                        <button
                          type="button"
                          key={label}
                          className={row.status === label ? `is-${label.toLowerCase()}` : ""}
                          onClick={() =>
                            setRows((current) =>
                              current.map((person) =>
                                person.id === row.id ? { ...person, status: label } : person,
                              ),
                            )
                          }
                        >
                          {short}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="att-save">
          <button type="button" className="cms-btn cms-btn-primary" onClick={save}>
            Save Attendance
          </button>
        </div>
      </section>
    </>
  );
}

function Reports({ isStaff, records }) {
  const [filters, setFilters] = useState({
    date: TODAY,
    month: TODAY.slice(0, 7),
    group: "All",
    section: "All",
    subject: "Mathematics",
    period: "Period 1",
    staffType: "Teaching Staff",
    department: "All",
    student: "All Students",
    staff: "All Staff",
  });
  const [applied, setApplied] = useState(filters);
  const set = (key) => (e) => setFilters((current) => ({ ...current, [key]: e.target.value }));
  const setStaffType = (staffType) => {
    const next = {
      ...filters,
      staffType,
      department: "All",
      staff: "All Staff",
    };
    setFilters(next);
    setApplied((current) => ({
      ...current,
      staffType,
      department: "All",
      staff: "All Staff",
    }));
  };
  const people = useMemo(
    () =>
      !isStaff
        ? students.filter(
            (person) =>
              (applied.student === "All Students" || person.name === applied.student) &&
              (applied.group === "All" || person.group === applied.group) &&
              (applied.section === "All" || person.section === applied.section),
          )
        : staff.filter(
            (person) =>
              (applied.staffType === "All" || person.staffType === applied.staffType) &&
              (applied.department === "All" || person.department === applied.department) &&
              (applied.staff === "All Staff" || person.name === applied.staff),
          ),
    [applied, isStaff],
  );
  const days = useMemo(
    () => dates(isStaff ? applied.month : applied.date.slice(0, 7)),
    [applied.date, applied.month, isStaff],
  );
  const matchingStaff = staff.filter(
    (person) => filters.staffType === "All" || person.staffType === filters.staffType,
  );
  return (
    <>
      {isStaff ? (
        <div className="att-staff-types" role="tablist" aria-label="Staff type">
          <button
            type="button"
            className={filters.staffType === "Teaching Staff" ? "active" : ""}
            onClick={() => setStaffType("Teaching Staff")}
          >
            Teaching Staff
          </button>
          <button
            type="button"
            className={filters.staffType === "Non-Teaching Staff" ? "active" : ""}
            onClick={() => setStaffType("Non-Teaching Staff")}
          >
            Non-Teaching Staff
          </button>
        </div>
      ) : null}
      <section className="att-card att-report-card">
        <div className={`att-report-filters ${!isStaff ? "att-student-report-filters" : ""}`}>
          {isStaff ? (
            <>
              <Field label="Academic Year">
                <select>
                  <option>2026-2027</option>
                </select>
              </Field>
              <Field label="Month">
                <input type="month" value={filters.month} onChange={set("month")} />
              </Field>
            </>
          ) : null}
          {isStaff ? (
            <>
              <Field label="Department">
                <select value={filters.department} onChange={set("department")}>
                  <option value="All">All Departments</option>
                  {[...new Set(matchingStaff.map((person) => person.department))].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Staff">
                <select value={filters.staff} onChange={set("staff")}>
                  <option>All Staff</option>
                  {matchingStaff.map((person) => (
                    <option key={person.id}>{person.name}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Date">
                <input type="date" value={filters.date} onChange={set("date")} />
              </Field>
              <Field label="Academic Year">
                <select>
                  <option>2026-2027</option>
                </select>
              </Field>
              <Field label="Group">
                <select value={filters.group} onChange={set("group")}>
                  <option>All</option>
                  <option>MPC</option>
                  <option>BIPC</option>
                  <option>CEC</option>
                </select>
              </Field>
              <Field label="Section">
                <select value={filters.section} onChange={set("section")}>
                  <option>All</option>
                  <option>A</option>
                  <option>B</option>
                </select>
              </Field>
              <Field label="Subject">
                <select value={filters.subject} onChange={set("subject")}>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </select>
              </Field>
              <Field label="Period">
                <select value={filters.period} onChange={set("period")}>
                  <option>Period 1</option>
                  <option>Period 2</option>
                </select>
              </Field>
              <Field label="Staff">
                <select>
                  <option>Dr. Ramesh Kumar</option>
                  <option>Dr. Suresh Rao</option>
                </select>
              </Field>
            </>
          )}
        </div>
        <div className={`att-report-actions ${!isStaff ? "att-student-report-actions" : ""}`}>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setApplied(filters)}
          >
            Apply Filters
          </button>
        </div>
      </section>
      <MonthlyTable isStaff={isStaff} people={people} days={days} records={records} />
    </>
  );
}
function Field({ label, children }) {
  return (
    <label className="att-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function MonthlyTable({ isStaff, people, days, records }) {
  const reportStatuses = isStaff ? STAFF_MARK_STATUS : STUDENT_MARK_STATUS;
  return (
    <section className="att-card att-table-card">
      <div className="att-table-top">
        <div>
          <b>
            Monthly Attendance{" "}
            <span className="att-days-label">
              {days.length
                ? `${new Date(`${days[0]}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })} · ${days.length} days`
                : "Selected month"}
            </span>
          </b>
          <div className="att-legend">
            {reportStatuses.map(([label, short]) => (
              <span key={label}>
                {short} {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="att-scroll">
        <table
          className={`cms-table att-table att-month-table ${isStaff ? "att-staff-month-table" : "att-student-month-table"}`}
        >
          <thead>
            <tr>
              <th>{isStaff ? "Employee ID" : "Roll No"}</th>
              <th>{isStaff ? "Staff Name" : "Student Name"}</th>
              {isStaff ? <th>Department</th> : <th>Section</th>}
              {days.map((day) => (
                <th key={day} className="att-day-header">
                  <span>{Number(day.slice(-2))}</span>
                  <small>
                    {new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                  </small>
                </th>
              ))}
              {reportStatuses.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const attendance = Object.fromEntries(
                days.map((day) => [
                  day,
                  records.find((record) => record.id === person.id && record.date === day)
                    ?.status || defaultStatus(person.id, day, isStaff),
                ]),
              );
              const counts = Object.fromEntries(
                reportStatuses.map(([label]) => [
                  label,
                  Object.values(attendance).filter((value) => value === label).length,
                ]),
              );
              const percent = Math.round(
                ((counts.Present + (counts.Late || 0) * 0.5) / days.length) * 100,
              );
              return (
                <tr key={person.id}>
                  <td>{person.code}</td>
                  <td>{person.name}</td>
                  <td>{isStaff ? person.department : person.section}</td>
                  {days.map((day) => (
                    <td key={day}>
                      {new Date(`${day}T00:00:00`).getDay() === 0 ? (
                        <span className="att-status-dash">-</span>
                      ) : (
                        <span className={`att-status-pill att-${attendance[day].toLowerCase()}`}>
                          {(reportStatuses.find(([label]) => label === attendance[day]) || ["Absent", "A"])[1]}
                        </span>
                      )}
                    </td>
                  ))}
                  {reportStatuses.map(([label]) => (
                    <td key={label}>{counts[label]}</td>
                  ))}
                  <td>{percent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
