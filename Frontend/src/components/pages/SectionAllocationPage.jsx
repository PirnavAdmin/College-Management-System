import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./StudentManagementPage.css";
const list = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.items)) return d.data.items;
  if (Array.isArray(d?.result)) return d.result;
  return [];
};
const EXCLUDED_NOTIFICATION_SOURCES = ["certificates"];
export default function SectionAllocationPage() {
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [ctx, setCtx] = useState({
      board: "",
      year: "",
      level: "",
      group: "",
      program: "",
      section: "",
    }),
    [boards, setBoards] = useState([]),
    [years, setYears] = useState([]),
    [levels, setLevels] = useState([]),
    [groups, setGroups] = useState([]),
    [programs, setPrograms] = useState([]),
    [sections, setSections] = useState([]),
    [students, setStudents] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    Promise.all([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.active),
      apiClient.get(apiEndpoints.groups.list),
      apiClient.get(apiEndpoints.admissions.getAll),
    ])
      .then(([b, y, g, s]) => {
        setBoards(list(b.data));
        setYears(list(y.data));
        setGroups(list(g.data));
        setStudents(
          list(s.data).filter((x) => {
            const approved = x.isApproved ?? x.IsApproved ?? x.approved ?? x.Approved;
            return approved === true || approved === 1 || String(approved).toLowerCase() === "true";
          }).map((x, i) => ({
            ...x,
            id: x.studentId ?? x.id ?? i,
            // The bulk allocation endpoint accepts admission IDs only. A
            // student ID is a different record and makes the backend look up
            // a non-existent admission.
            admissionId: x.admissionId ?? x.studentAdmissionId ?? x.id,
            studentId: x.studentId ?? x.student?.studentId ?? "",
            name: x.studentName ?? x.fullName ?? x.name ?? "Unnamed Student",
            admissionNo: x.admissionNo ?? x.admissionNumber ?? "—",
            groupId: x.groupId,
            programId: x.programId ?? x.programmeId,
            group: x.groupName ?? x.group ?? "",
            programme: x.programmeName ?? x.programName ?? x.programme ?? "",
            section: x.sectionName ?? x.section ?? "",
            roll: x.rollNumber ?? x.rollNo ?? "",
            status: x.status ?? "Pending allocation",
            isApproved: true,
          })),
        );
      })
      .catch((e) => setMessage(getApiErrorMessage(e)));
  }, []);
  useEffect(() => {
    if (!ctx.board) return;
    apiClient
      .get(apiEndpoints.academicLevels.list, { params: { boardId: ctx.board } })
      .then((r) => setLevels(list(r.data)))
      .catch((e) => setMessage(getApiErrorMessage(e)));
    const active = years.find((y) => String(y.boardId) === String(ctx.board) && y.isActive);
    if (active) setCtx((c) => ({ ...c, year: String(active.academicYearId) }));
  }, [ctx.board, years]);
  useEffect(() => {
    if (!ctx.group) return;
    const g = groups.find((x) => String(x.groupId ?? x.id) === String(ctx.group));
    const embedded = g?.programs || g?.programmes;
    if (embedded?.length) {
      setPrograms(embedded);
      return;
    }
    apiClient
      .get(apiEndpoints.groups.programs(ctx.group))
      .then((r) => setPrograms(list(r.data)))
      .catch((e) => setMessage(getApiErrorMessage(e)));
  }, [ctx.group, groups]);
  useEffect(() => {
    // A section belongs to a programme.  Group-program records expose both a
    // link ID and the actual ProgramId; the latter is what the sections API
    // expects.  Supplying the link ID as every possible query parameter made
    // valid sections disappear from this dropdown.
    if (!ctx.program) {
      setSections([]);
      return;
    }
    const selectedProgram = programs.find(
      (program) =>
        String(program.programId ?? program.programmeId ?? program.id ?? program.groupProgramId) ===
        String(ctx.program),
    );
    const programId = selectedProgram?.programId ?? selectedProgram?.programmeId ?? ctx.program;
    const groupProgramId = selectedProgram?.groupProgramId ?? selectedProgram?.groupProgrammeId;
    const programme =
      selectedProgram?.programName ??
      selectedProgram?.programmeName ??
      selectedProgram?.programme ??
      selectedProgram?.name;
    apiClient
      .get(apiEndpoints.sections.list, {
        params: {
          ProgramId: programId,
          ...(programme ? { Programme: programme } : {}),
          IsActive: true,
        },
      })
      .then((r) => {
        // Some backend versions return every section even when ProgramId is
        // provided. Filter the response as a final guard so this select can
        // only contain sections linked to the selected programme.
        const programmeName = String(programme ?? "").trim().toLowerCase();
        const programmeSections = list(r.data).filter((section) => {
          const sectionProgramId = section?.programId ?? section?.ProgramId ?? section?.programmeId ?? section?.ProgrammeId;
          const sectionGroupProgramId = section?.groupProgramId ?? section?.GroupProgramId ?? section?.groupProgrammeId;
          const sectionProgrammeName = String(
            section?.programme ?? section?.Programme ?? section?.program ?? section?.Program ?? section?.programName ?? section?.ProgramName ?? "",
          ).trim().toLowerCase();
          return (
            String(sectionProgramId ?? "") === String(programId) ||
            (groupProgramId != null && String(sectionGroupProgramId ?? "") === String(groupProgramId)) ||
            (programmeName && sectionProgrammeName === programmeName)
          );
        });
        // Prefer the selected group's subset when sections include group IDs;
        // retain the programme result for older records that omit that field.
        const groupSections = programmeSections.filter(
          (section) => String(section?.groupId ?? section?.GroupId ?? "") === String(ctx.group),
        );
        setSections(groupSections.length ? groupSections : programmeSections);
      })
      .catch((e) => {
        setSections([]);
        setMessage(getApiErrorMessage(e));
      });
  }, [ctx.group, ctx.program, groups, programs]);
  const rows = useMemo(
    () =>
      students.filter(
        (s) =>
          (!ctx.group || String(s.groupId ?? s.group) === String(ctx.group)) &&
          (!ctx.program || String(s.programId ?? s.programme) === String(ctx.program)),
      ),
    [students, ctx],
  );
  const academicYearOptions = useMemo(() => uniqueAcademicYearsByName(
    years.filter((year) => {
      const boardId = year.boardId ?? year.BoardId;
      return !ctx.board || boardId == null || String(boardId) === String(ctx.board);
    }),
    (year) => year.academicYearName ?? year.AcademicYearName ?? year.yearName ?? year.YearName,
  ), [ctx.board, years]);
  const update = (k, v) =>
    setCtx((c) => ({
      ...c,
      [k]: v,
      ...(k === "group" ? { program: "", section: "" } : {}),
      ...(k === "program" ? { section: "" } : {}),
    }));
  const save = async () => {
    const ids = rows.map((s) => Number(s.admissionId)).filter(Number.isFinite),
      sectionId = Number(ctx.section);
    if (!sectionId || !ids.length)
      return setMessage("Only verified and approved admissions can be allocated to a section.");
    setBusy("save");
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkSection, {
        sectionId,
        admissionIds: ids,
      });
      setMessage("Section allocation saved successfully.");
    } catch (e) {
      setMessage(getApiErrorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const rolls = async () => {
    const ids = rows
        .filter((s) => s.section === ctx.section)
        .map((s) => Number(s.admissionId))
        .filter(Number.isFinite),
      sectionId = Number(ctx.section);
    if (!ids.length)
      return setMessage("Allocate students to a section before generating roll numbers.");
    setBusy("roll");
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, {
        sectionId,
        startingRollNumber: 1,
        admissionIds: ids,
      });
      setMessage("Roll numbers generated successfully.");
    } catch (e) {
      setMessage(getApiErrorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const opt = (arr, idKey, labelKey) =>
    (arr || []).map((x) => {
      const id =
        x?.[idKey] ??
        (idKey === "programId" ? x?.programmeId ?? x?.groupProgramId : undefined) ??
        x?.id ??
        x?.value ??
        x;
      const label =
        x?.[labelKey] ??
        (labelKey === "programName" ? x?.programmeName ?? x?.programme : undefined) ??
        x?.name ??
        x?.label ??
        x;
      return (
        <option key={String(id)} value={id}>
          {label}
        </option>
      );
    });
  return (
    <DashboardLayout
      title="Section Allocation"
      subtitle="Allocate admitted students by admission order before generating roll numbers."
      breadcrumb={["People", "Section Allocation"]}
      excludeNotificationSources={EXCLUDED_NOTIFICATION_SOURCES}
      actions={
        <Link className="cms-btn cms-btn-ghost" to="/dashboard/students">
          Student Management
        </Link>
      }
    >
      <section className="cms-card">
        <div className="cms-card-body student-management-filters">
          {[
            ["Board", "board", boards, "boardId", "boardName"],
            ["Academic Year", "year", academicYearOptions, "academicYearId", "academicYearName"],
            ["Academic Level", "level", levels, "academicLevelId", "levelName"],
            ["Group", "group", groups, "groupId", "groupName"],
            ["Programme", "program", programs, "programId", "programName"],
            ["Section", "section", sections, "sectionId", "sectionName"],
          ].map(([l, k, a, i, n]) => (
            <label className="cms-field" key={k}>
              <span>{l}</span>
              <select value={ctx[k]} onChange={(e) => update(k, e.target.value)}>
                <option value="">Select {l}</option>
                {opt(a, i, n)}
              </select>
            </label>
          ))}
        </div>
        <div className="student-management-actions">
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={!!busy}>
            {busy === "save" ? "Saving..." : "Save Section Allocation"}
          </button>
          <button className="cms-btn cms-btn-ghost" onClick={rolls} disabled={!!busy}>
            {busy === "roll" ? "Generating..." : "Generate Roll Numbers"}
          </button>
        </div>
      </section>
      <section className="cms-card">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Admission No.</th>
                <th>Programme</th>
                <th>Current Section</th>
                <th>Allocation Section</th>
                <th>Roll No.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.admissionNo}</td>
                    <td>{s.programme || programs.find((program) => String(program.programId ?? program.id) === String(s.programId))?.programName || "—"}</td>
                    <td>{s.section || sections.find((section) => String(section.sectionId ?? section.id) === String(s.sectionId))?.sectionName || "Pending"}</td>
                    <td>{sections.find((section) => String(section.sectionId ?? section.id) === String(ctx.section))?.sectionName || ctx.section || "-"}</td>
                    <td>{s.roll || "Pending"}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="cms-empty">No admitted students found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Toast message={message} onClose={() => setMessage("")} />
    </DashboardLayout>
  );
}
