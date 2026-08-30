import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Search, UserRoundCheck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./StudentManagementPage.css";

export const pageConfig = { title: "Student Management", rows: [], fields: [] };
const list = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  return data?.data ?? data?.Data ?? data?.items ?? data?.Items ?? data?.results ?? data?.Results ?? data?.$values ?? [];
};
const value = (record, ...keys) => keys.map((key) => record?.[key]).find((item) => item != null && item !== "");
const normalizedName = (item) => String(item ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const nameFor = (items, id, idKeys, labelKeys) => value(items.find((item) => String(value(item, ...idKeys)) === String(id)), ...labelKeys) ?? "";
export default function StudentManagementPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    academicYear: "",
    level: "",
    group: "",
    programme: "",
    section: "",
    status: "",
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiClient
      .get(apiEndpoints.students.getAll)
      .then(({ data }) => {
        const source = Array.isArray(data)
          ? data
          : data?.data || data?.items || data?.results || [];
        const mapped = source.map((x, index) => ({
          ...x,
          id: x.studentId ?? x.id ?? index,
          studentId: x.studentId ?? x.id ?? "—",
          name: x.studentName ?? x.fullName ?? x.name ?? "Unnamed Student",
          admissionNo: x.admissionNo ?? x.admissionNumber ?? "—",
          academicYear: x.academicYearName ?? x.academicYear ?? "",
          level: x.academicLevelName ?? x.academicLevel ?? x.levelName ?? "",
          group: x.groupName ?? x.group ?? "",
          programme: x.programmeName ?? x.programName ?? x.programme ?? x.program ?? "",
          section: x.sectionName ?? x.section ?? "",
          roll: x.rollNumber ?? x.rollNo ?? x.roll ?? "",
          status: x.status ?? x.studentStatus ?? "Pending assignment",
        }));
        if (active) setStudents(mapped.filter((student) => Boolean(student.roll)));
        return Promise.allSettled([
          apiClient.get(apiEndpoints.admissions.getAll), apiClient.get(apiEndpoints.academicYears.list),
          apiClient.get(apiEndpoints.academicLevels.list), apiClient.get(apiEndpoints.groups.list),
          apiClient.get(apiEndpoints.programs.list), apiClient.get(apiEndpoints.sections.list),
        ]).then((responses) => {
          const [admissions, years, levels, groups, programs, sections] = responses.map((response) =>
            response.status === "fulfilled" ? list(response.value.data) : [],
          );
          const byNo = new Map(admissions.map((item) => [String(value(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim(), item]));
          const byStudentId = new Map(admissions.map((item) => [String(value(item, "studentId", "StudentId") ?? ""), item]));
          const admissionName = (item) => value(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
            ?? [value(item, "firstName", "FirstName"), value(item, "lastName", "LastName")].filter(Boolean).join(" ");
          const byName = new Map(admissions.map((item) => [normalizedName(admissionName(item)), item]));
          const enriched = mapped.map((student) => {
            const admission = byStudentId.get(String(student.studentId ?? ""))
              ?? byNo.get(String(student.admissionNo ?? "").trim())
              ?? byName.get(normalizedName(student.name));
            const yearId = value(student, "academicYearId", "AcademicYearId") ?? value(admission, "academicYearId", "AcademicYearId");
            const levelId = value(student, "academicLevelId", "AcademicLevelId") ?? value(admission, "academicLevelId", "AcademicLevelId");
            const groupId = value(student, "groupId", "GroupId") ?? value(admission, "groupId", "GroupId");
            const programId = value(student, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? value(admission, "programId", "ProgramId", "programmeId", "ProgrammeId");
            const sectionId = value(student, "sectionId", "SectionId") ?? value(admission, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId");
            return {
              ...student,
              academicYear: student.academicYear || value(admission, "academicYearName", "AcademicYearName") || nameFor(years, yearId, ["academicYearId", "AcademicYearId", "id"], ["academicYearName", "AcademicYearName", "name"]),
              level: student.level || value(admission, "academicLevelName", "AcademicLevelName") || nameFor(levels, levelId, ["academicLevelId", "AcademicLevelId", "id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name"]),
              group: student.group || value(admission, "groupName", "GroupName") || nameFor(groups, groupId, ["groupId", "GroupId", "id"], ["groupName", "GroupName", "name"]),
              programme: student.programme || value(admission, "programName", "ProgramName", "programmeName", "ProgrammeName") || nameFor(programs, programId, ["programId", "ProgramId", "programmeId", "ProgrammeId", "id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name"]),
              section: student.section || value(admission, "sectionName", "SectionName") || nameFor(sections, sectionId, ["sectionId", "SectionId", "id"], ["sectionName", "SectionName", "name"]),
              mobile: student.mobileNumber ?? student.mobile ?? "",
              // The students endpoint does not expose an approval flag. A
              // linked admission is preferred; a generated roll number is a
              // reliable completed-placement fallback for this API.
              approved: Boolean(admission) || Boolean(student.roll),
            };
          });
          const visibleStudents = enriched.filter((student) => student.approved);
          if (active && visibleStudents.length) setStudents(visibleStudents);
        });
      })
      .catch((e) => active && setError(getApiErrorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const rows = useMemo(
    () =>
      students.filter(
        (student) =>
          `${student.name} ${student.studentId} ${student.admissionNo} ${student.roll || ""} ${student.mobile}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          Object.entries(filters).every(
            ([key, value]) => !value || String(student[key] || "") === value,
          ),
      ),
    [students, query, filters],
  );
  const values = (key) => [...new Set(students.map((student) => student[key]).filter(Boolean))];
  return (
    <DashboardLayout
      title="Student Management"
      subtitle="View students with completed admission and academic placement."
      breadcrumb={["People"]}
      actions={
        <Link className="cms-btn cms-btn-primary" to="/dashboard/section-allocation">
          Section Allocation
        </Link>
      }
    >
      <section className="student-summary">
        <div>
          <span>Total Students</span>
          <strong>{students.length}</strong>
        </div>
        <div>
          <span>Section Allocated</span>
          <strong>{students.filter((s) => s.section).length}</strong>
        </div>
        <div>
          <span>Roll Number Allocated</span>
          <strong>{students.filter((s) => s.roll).length}</strong>
        </div>
        <div>
          <span>Pending Allocation</span>
          <strong>{students.filter((s) => !s.section || !s.roll).length}</strong>
        </div>
      </section>
      <section className="cms-card">
        <div className="cms-card-body">
          <label className="student-management-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, ID, admission no, roll no or mobile"
            />
          </label>
        </div>
        <div className="student-management-filters">
          {[
            ["Academic Year", "academicYear"],
            ["Academic Level", "level"],
            ["Group", "group"],
            ["Programme", "programme"],
            ["Section", "section"],
            ["Status", "status"],
          ].map(([label, key]) => (
            <label className="cms-field" key={key}>
              <span>{label}</span>
              <select
                value={filters[key]}
                onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
              >
                <option value="">All {label}s</option>
                {values(key).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                {[
                  "Student ID",
                  "Admission No",
                  "Student Name",
                  "Academic Year",
                  "Academic Level",
                  "Group",
                  "Programme",
                  "Section",
                  "Roll No",
                  "Status",
                  "Actions",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11"><div className="cms-empty">Loading approved students...</div></td></tr>
              ) : rows.length ? (
                rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.studentId}</td>
                    <td>{s.admissionNo}</td>
                    <td className="cms-font-semibold">{s.name}</td>
                    <td>{s.academicYear || "—"}</td>
                    <td>{s.level || "—"}</td>
                    <td>{s.group || "—"}</td>
                    <td>{s.programme || "—"}</td>
                    <td>{s.section ? `Section ${s.section}` : "—"}</td>
                    <td>{s.roll || "—"}</td>
                    <td>
                      <StatusBadge value={s.status || "Pending assignment"} />
                    </td>
                    <td>
                      <div className="student-action-buttons">
                        <Link to={`/dashboard/students/${s.id}`} aria-label="View student" title="View student">
                          <Eye size={16} />
                        </Link>
                        <Link to={`/dashboard/students/${s.id}/enroll`} aria-label="Edit profile" title="Edit profile">
                          <UserRoundCheck size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11">
                    <div className="cms-empty">{error || "No approved students match your search."}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
