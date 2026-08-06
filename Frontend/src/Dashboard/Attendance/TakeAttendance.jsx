import { useState } from "react";
import "./TakeAttendance.css";

const statusOptions = ["Present", "Absent", "Late", "Leave"];

const initialFilters = {
  date: new Date().toISOString().split("T")[0],
  board: "",
  academicYear: "",
  academicLevel: "",
  group: "",
  section: "",
  subject: "",
  faculty: "",
};

export default function TakeAttendance() {
  const [filters, setFilters] = useState(initialFilters);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleLoadStudents = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        date: filters.date,
        board: filters.board,
        academicYear: filters.academicYear,
        academicLevel: filters.academicLevel,
        group: filters.group,
        section: filters.section,
        subject: filters.subject,
        faculty: filters.faculty,
      });

      const response = await fetch(`/api/attendance/students?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Unable to load students (${response.status})`);
      }

      const data = await response.json();
      const payload = Array.isArray(data) ? data : data?.students ?? [];

      const normalizedStudents = payload.map((student, index) => ({
        rollNo: student.rollNo ?? student.roll_number ?? index + 1,
        studentName: student.studentName ?? student.name ?? `Student ${index + 1}`,
        status: student.status ?? "Present",
      }));

      setStudents(normalizedStudents);

      if (normalizedStudents.length === 0) {
        setMessage("No students found for the selected filters.");
      }
    } catch (error) {
      console.error(error);
      setStudents([]);
      setMessage(error.message || "Unable to load students right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStudentStatus = (rollNo, status) => {
    setStudents((previous) =>
      previous.map((student) => (student.rollNo === rollNo ? { ...student, status } : student))
    );
  };

  const applyBulkStatus = (status) => {
    setStudents((previous) => previous.map((student) => ({ ...student, status })));
  };

  const handleSubmitAttendance = async () => {
    if (students.length === 0) {
      setMessage("Load students before submitting attendance.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const payload = {
      date: filters.date,
      board: filters.board,
      academicYear: filters.academicYear,
      academicLevel: filters.academicLevel,
      group: filters.group,
      section: filters.section,
      subject: filters.subject,
      faculty: filters.faculty,
      records: students.map(({ rollNo, studentName, status }) => ({ rollNo, studentName, status })),
    };

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Submission failed (${response.status})`);
      }

      setMessage("Attendance submitted successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Attendance could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="takeAttendance">
      <div className="takeAttendance__card">
        <div className="takeAttendance__header">
          <div>
            <p className="takeAttendance__eyebrow">Attendance</p>
            <h2>Take Attendance</h2>
          </div>
          <p className="takeAttendance__description">
            Select the class details, load students, and submit their attendance in one step.
          </p>
        </div>

        <form className="takeAttendance__filters" onSubmit={handleLoadStudents}>
          <div className="filterGrid">
            <div className="formField">
              <label htmlFor="date">Date</label>
              <input id="date" name="date" type="date" value={filters.date} onChange={handleFilterChange} />
            </div>

            <div className="formField">
              <label htmlFor="board">Board</label>
              <select id="board" name="board" value={filters.board} onChange={handleFilterChange}>
                <option value="">Select board</option>
                {/* TODO: Replace these placeholder values with real board options from the Board Management module. */}
                <option value="board-a">Board A</option>
                <option value="board-b">Board B</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="academicYear">Academic Year</label>
              <select id="academicYear" name="academicYear" value={filters.academicYear} onChange={handleFilterChange}>
                <option value="">Select academic year</option>
                {/* TODO: Replace these placeholder values with real academic year options from the Academic Year module. */}
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="academicLevel">Academic Level</label>
              <select id="academicLevel" name="academicLevel" value={filters.academicLevel} onChange={handleFilterChange}>
                <option value="">Select academic level</option>
                {/* TODO: Replace these placeholder values with real academic level options from the Academic Level module. */}
                <option value="grade-10">Grade 10</option>
                <option value="grade-11">Grade 11</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="group">Group</label>
              <select id="group" name="group" value={filters.group} onChange={handleFilterChange}>
                <option value="">Select group</option>
                {/* TODO: Replace these placeholder values with real group options from the Group Management module. */}
                <option value="science">Science</option>
                <option value="commerce">Commerce</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="section">Section</label>
              <select id="section" name="section" value={filters.section} onChange={handleFilterChange}>
                <option value="">Select section</option>
                {/* TODO: Replace these placeholder values with real section options from the Section Management module. */}
                <option value="a">Section A</option>
                <option value="b">Section B</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="subject">Subject</label>
              <select id="subject" name="subject" value={filters.subject} onChange={handleFilterChange}>
                <option value="">Select subject</option>
                {/* TODO: Replace these placeholder values with real subject options from the Subject Management module. */}
                <option value="math">Mathematics</option>
                <option value="physics">Physics</option>
              </select>
            </div>

            <div className="formField">
              <label htmlFor="faculty">Faculty</label>
              <select id="faculty" name="faculty" value={filters.faculty} onChange={handleFilterChange}>
                <option value="">Select faculty</option>
                {/* TODO: Replace these placeholder values with real faculty options from the Faculty Management module. */}
                <option value="teacher-1">Teacher One</option>
                <option value="teacher-2">Teacher Two</option>
              </select>
            </div>
          </div>

          <div className="actionsRow">
            <button className="primaryButton" type="submit" disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Students"}
            </button>
            <span className="helperText">Students will be fetched for the selected group, section, and subject.</span>
          </div>
        </form>

        {message ? <div className={`message ${message.includes("success") ? "success" : "info"}`}>{message}</div> : null}

        <div className="attendanceTableCard">
          <div className="bulkActions">
            <span className="bulkActions__label">Mark all as:</span>
            {statusOptions.map((status) => (
              <button key={status} type="button" className="secondaryButton" onClick={() => applyBulkStatus(status)}>
                {status}
              </button>
            ))}
          </div>

          {students.length > 0 ? (
            <div className="tableWrap">
              <table className="attendanceTable">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={`${student.rollNo}-${student.studentName}`}>
                      <td>{student.rollNo}</td>
                      <td>{student.studentName}</td>
                      <td>
                        <div className="statusGroup">
                          {statusOptions.map((status) => (
                            <label key={status} className="statusOption">
                              <input
                                type="radio"
                                name={`status-${student.rollNo}`}
                                value={status}
                                checked={student.status === status}
                                onChange={() => updateStudentStatus(student.rollNo, status)}
                              />
                              <span>{status}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="emptyState">Load students to begin marking attendance.</div>
          )}

          <div className="submitArea">
            <button className="primaryButton" type="button" onClick={handleSubmitAttendance} disabled={isSubmitting || students.length === 0}>
              {isSubmitting ? "Submitting..." : "Submit Attendance"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
