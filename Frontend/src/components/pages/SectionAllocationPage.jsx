import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./StudentManagementPage.css";
import "./SectionAllocationPage.css";
const list = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.items)) return d.data.items;
  if (Array.isArray(d?.result)) return d.result;
  return [];
};
const EXCLUDED_NOTIFICATION_SOURCES = ["certificates"];
const valueOf = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const objectFrom = (payload) => payload?.data?.data ?? payload?.data ?? payload?.result ?? payload ?? {};
const programIdOf = (program) => valueOf(program, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id", "groupProgramId", "GroupProgramId");
const programNameOf = (program) => valueOf(program, "programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme", "name", "Name");
const sectionIdOf = (section) => valueOf(section, "sectionId", "SectionId", "id", "Id");
const sectionNameOf = (section) => valueOf(section, "sectionName", "SectionName", "name", "Name");

const changeStudentAllocation = async ({ admissionId, studentId, currentProgramId, programId, sectionId }) => {
  if (String(programId) !== String(currentProgramId)) {
    throw new Error("Changing program is not supported by the current backend API contract.");
  }
  const response = await apiClient.put(apiEndpoints.students.updateSection(studentId), { sectionId });
  await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, {
    sectionId,
    startingRollNumber: 1,
    admissionIds: [admissionId],
  });
  const refreshed = await Promise.allSettled([
    admissionId ? apiClient.get(apiEndpoints.studentAdmissions.getById(admissionId)) : Promise.resolve({ data: {} }),
    apiClient.get(apiEndpoints.students.getById(studentId)),
  ]);
  return {
    ...response,
    data: {
      ...objectFrom(response.data),
      ...(refreshed[0].status === "fulfilled" ? objectFrom(refreshed[0].value.data) : {}),
      ...(refreshed[1].status === "fulfilled" ? objectFrom(refreshed[1].value.data) : {}),
    },
  };
};
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
    [sectionDirectory, setSectionDirectory] = useState([]),
    [students, setStudents] = useState([]),
    [message, setMessage] = useState(""),
    [messageType, setMessageType] = useState("success"),
    [changingStudent, setChangingStudent] = useState(null),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    Promise.all([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.active),
      apiClient.get(apiEndpoints.groups.list),
      apiClient.get(apiEndpoints.sections.list),
      apiClient.get(apiEndpoints.admissions.getAll),
      apiClient.get(apiEndpoints.students.getAll),
    ])
      .then(([b, y, g, allSectionsResponse, admissionsResponse, studentsResponse]) => {
        setBoards(list(b.data));
        setYears(list(y.data));
        setGroups(list(g.data));
        setSectionDirectory(list(allSectionsResponse.data));
        const studentsByAdmissionNumber = new Map(
          list(studentsResponse.data).map((student) => [
            String(student.admissionNo ?? student.admissionNumber ?? "").trim(),
            student,
          ]),
        );
        setStudents(
          list(admissionsResponse.data).map((admission, i) => {
            const x = studentsByAdmissionNumber.get(
              String(admission.admissionNo ?? admission.admissionNumber ?? "").trim(),
            ) ?? {};
            const approved = admission?.isApproved ?? admission?.IsApproved ?? admission?.approved ?? admission?.Approved
              ?? admission?.approvalStatus ?? admission?.ApprovalStatus;
            const verified = admission?.isVerified ?? admission?.IsVerified ?? admission?.verified ?? admission?.Verified
              ?? admission?.verificationStatus ?? admission?.VerificationStatus;
            const admissionStatus = String(
              admission?.status ?? admission?.Status ?? admission?.admissionStatus ?? admission?.AdmissionStatus ?? "",
            ).trim().toLowerCase();
            const isApproved =
              approved === true ||
              approved === 1 ||
              String(approved).toLowerCase() === "true" ||
              ["approved", "active", "completed"].includes(admissionStatus);
            const isVerified =
              verified == null ||
              verified === true ||
              verified === 1 ||
              String(verified).toLowerCase() === "true" ||
              ["approved", "active", "completed"].includes(admissionStatus);
            return ({
            ...x,
            id: x.studentId ?? x.id ?? `admission-${admission.admissionId ?? i}`,
            // The bulk allocation endpoint accepts admission IDs only. A
            // student ID is a different record and makes the backend look up
            // a non-existent admission.
            // Prefer the admission foreign key already returned by the
            // student record. Fall back to the admission-number lookup for
            // older API responses that do not expose it.
            admissionId:
              x.admissionId ??
              x.AdmissionId ??
              x.studentAdmissionId ??
              x.StudentAdmissionId ??
              admission?.admissionId ??
              admission?.studentAdmissionId ??
              admission?.id ??
              "",
            studentId: x.studentId ?? x.id ?? "",
            name: [admission.firstName, admission.lastName].filter(Boolean).join(" ") || x.studentName || x.fullName || x.name || "Unnamed Student",
            admissionNo: admission.admissionNo ?? admission.admissionNumber ?? x.admissionNo ?? x.admissionNumber ?? "—",
            boardId: admission.boardId ?? admission.BoardId ?? x.boardId ?? x.BoardId,
            academicYearId: admission.academicYearId ?? admission.AcademicYearId ?? x.academicYearId ?? x.AcademicYearId,
            academicLevelId: admission.academicLevelId ?? admission.AcademicLevelId ?? x.academicLevelId ?? x.AcademicLevelId,
            groupId: admission.groupId ?? admission.GroupId ?? x.groupId,
            programId:
              x.programId ??
              x.programmeId ??
              admission?.programId ??
              admission?.ProgramId ??
              admission?.programmeId ??
              admission?.ProgrammeId ??
              admission?.program?.programId ??
              admission?.Program?.programId,
            group: admission.groupName ?? admission.GroupName ?? x.groupName ?? x.group ?? "",
            programme:
              x.programmeName ??
              x.programName ??
              x.programme ??
              admission?.programmeName ??
              admission?.ProgrammeName ??
              admission?.programName ??
              admission?.ProgramName ??
              admission?.programme?.programmeName ??
              admission?.program?.programName ??
              admission?.Program?.programName ??
              "",
            // Keep the ID as well as the label. The roll-number action must
            // compare IDs; comparing a section label to the selected ID makes
            // every allocated student appear ineligible after a reload.
            sectionId:
              x.sectionId ??
              x.SectionId ??
              x.allocatedSectionId ??
              x.AllocatedSectionId ??
              x.assignedSectionId ??
              x.AssignedSectionId ??
              admission?.sectionId ??
              admission?.SectionId ??
              admission?.allocatedSectionId ??
              admission?.AllocatedSectionId ??
              admission?.assignedSectionId ??
              admission?.AssignedSectionId ??
              admission?.section?.sectionId ??
              admission?.Section?.sectionId ??
              "",
            section:
              x.sectionName ??
              x.section ??
              admission?.sectionName ??
              admission?.SectionName ??
              admission?.allocatedSectionName ??
              admission?.AllocatedSectionName ??
              admission?.assignedSectionName ??
              admission?.AssignedSectionName ??
              admission?.section?.sectionName ??
              admission?.Section?.sectionName ??
              "",
            roll: admission.rollNumber ?? admission.RollNumber ?? admission.rollNo ?? admission.RollNo ?? x.rollNumber ?? x.rollNo ?? "",
            status: admission.status ?? admission.Status ?? x.status ?? "Pending allocation",
            isApproved: isApproved && isVerified,
          });
          }),
        );
      })
      .catch((e) => { setMessageType("error"); setMessage(getApiErrorMessage(e)); })
      .finally(() => setStudentsLoading(false));
  }, []);
  useEffect(() => {
    if (!ctx.board) return;
    apiClient
      .get(apiEndpoints.boards.academicLevels, { params: { boardId: ctx.board } })
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
          (!ctx.board || String(s.boardId ?? "") === String(ctx.board)) &&
          (!ctx.year || String(s.academicYearId ?? "") === String(ctx.year)) &&
          (!ctx.level || String(s.academicLevelId ?? "") === String(ctx.level)) &&
          (!ctx.group || String(s.groupId ?? s.group) === String(ctx.group)) &&
          (!ctx.program || String(s.programId ?? s.programme) === String(ctx.program)) &&
          (!ctx.section || String(s.sectionId ?? "") === String(ctx.section)),
      ).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
    [students, ctx],
  );
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [ctx, rows.length]);
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
    const ids = rows
        .filter((student) => student.isApproved)
        .map((student) => Number(student.admissionId))
        .filter(Number.isFinite),
      sectionId = Number(ctx.section);
    if (!sectionId || !ids.length)
      return setMessage("Only verified and approved admissions can be allocated to a section.");
    setBusy("save");
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkSection, {
        sectionId,
        admissionIds: ids,
      });
      await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, {
        sectionId,
        startingRollNumber: 1,
        admissionIds: ids,
      });
      const refreshedStudentsResponse = await apiClient.get(apiEndpoints.students.getAll);
      const refreshedRolls = new Map(
        list(refreshedStudentsResponse.data).map((student) => [
          String(student.admissionNo ?? student.admissionNumber ?? "").trim(),
          student.rollNumber ?? student.RollNumber ?? student.rollNo ?? student.RollNo ?? student.roll ?? "",
        ]),
      );
      const sectionName = sections.find(
        (section) => String(section.sectionId ?? section.id) === String(sectionId),
      )?.sectionName;
      setStudents((current) =>
        current.map((student) =>
          ids.includes(Number(student.admissionId))
            ? {
                ...student,
                sectionId,
                section: sectionName ?? student.section,
                roll: refreshedRolls.get(String(student.admissionNo).trim()) || "",
              }
            : student,
        ),
      );
      setMessageType("success");
      setMessage("Section allocation and roll numbers saved successfully.");
    } catch (e) {
      setMessage(getApiErrorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const rolls = async () => {
    const sectionId = Number(ctx.section);
    const selectedSectionName = sections.find(
      (section) => String(section.sectionId ?? section.id) === String(sectionId),
    )?.sectionName;
    const admissionIds = rows
        .filter(
          (student) =>
            Number(student.sectionId) === sectionId ||
            (!student.sectionId &&
              String(student.section).trim().toLowerCase() ===
                String(selectedSectionName ?? "").trim().toLowerCase()),
        )
        .map((student) => Number(student.admissionId))
        .filter(Number.isFinite);
    if (!admissionIds.length)
      return setMessage("Allocate students to a section before generating roll numbers.");
    setBusy("roll");
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, {
        sectionId,
        startingRollNumber: 1,
        admissionIds,
      });
      // The generation endpoint updates student records on the server. Reload
      // them instead of retaining the stale list that was fetched on mount.
      const refreshedStudentsResponse = await apiClient.get(apiEndpoints.students.getAll);
      const refreshedRolls = new Map(
        list(refreshedStudentsResponse.data).map((student) => [
          String(student.studentId ?? student.StudentId ?? student.id ?? student.Id ?? ""),
          student.rollNumber ?? student.RollNumber ?? student.rollNo ?? student.RollNo ?? student.roll ?? "",
        ]),
      );
      setStudents((current) =>
        current.map((student) => ({
          ...student,
          roll: refreshedRolls.get(String(student.studentId)) ?? student.roll,
        })),
      );
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
  const allocationChanged = (student, updated) => {
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, ...updated } : item));
    setChangingStudent(null);
    setMessageType("success");
    setMessage("Program/Section changed successfully.");
  };
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
            ["Program", "program", programs, "programId", "programName"],
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
                <th>Program</th>
                <th>Section</th>
                <th>Roll No.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                <tr>
                  <td colSpan="7">
                    <div className="cms-empty">Loading admitted students...</div>
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.admissionNo}</td>
                    <td>{s.programme || programs.find((program) => String(program.programId ?? program.id) === String(s.programId))?.programName || "—"}</td>
                    <td>{s.section || sectionDirectory.find((section) => String(section.sectionId ?? section.id) === String(s.sectionId))?.sectionName || sections.find((section) => String(section.sectionId ?? section.id) === String(s.sectionId))?.sectionName || "Pending"}</td>
                    <td>{s.roll || "Pending"}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                    <td><button type="button" className="cms-action-btn" aria-label={`Edit allocation for ${s.name}`} title="Edit program or section" disabled={!Number(s.studentId) || !Number(s.groupId)} onClick={() => setChangingStudent(s)}><Pencil size={16} aria-hidden="true" /></button></td>
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
        {!studentsLoading && <footer className="section-allocation-pagination">
          <span>
            Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, rows.length)} of {rows.length} students
          </span>
          <div className="section-allocation-pagination-actions">
            <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>
        </footer>}
      </section>
      {changingStudent ? <ChangeAllocationModal student={changingStudent} onClose={() => setChangingStudent(null)} onChanged={allocationChanged} /> : null}
      <Toast message={message} type={messageType} onClose={() => setMessage("")} />
    </DashboardLayout>
  );
}

function ChangeAllocationModal({ student, onClose, onChanged }) {
  const [detail, setDetail] = useState(student);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [programId, setProgramId] = useState(String(student.programId ?? ""));
  const [sectionId, setSectionId] = useState(String(student.sectionId ?? ""));
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groupId = valueOf(detail, "groupId", "GroupId") ?? student.groupId;
  const currentProgramId = String(valueOf(detail, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? student.programId ?? "");
  const currentSectionId = String(valueOf(detail, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId") ?? student.sectionId ?? "");
  const currentProgramName = valueOf(detail, "programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme") ?? student.programme ?? "—";
  const currentSectionName = valueOf(detail, "sectionName", "SectionName", "allocatedSectionName", "AllocatedSectionName") ?? student.section ?? "—";
  const currentRoll = valueOf(detail, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? student.roll ?? "Pending";

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      student.admissionId ? apiClient.get(apiEndpoints.studentAdmissions.getById(student.admissionId)) : Promise.resolve({ data: {} }),
      apiClient.get(apiEndpoints.groups.programs(student.groupId)),
    ]).then(([detailResult, programsResult]) => {
      if (!active) return;
      if (detailResult.status === "fulfilled") {
        const current = objectFrom(detailResult.value.data);
        setDetail((value) => ({ ...value, ...current }));
        setProgramId(String(valueOf(current, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? student.programId ?? ""));
        setSectionId(String(valueOf(current, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId") ?? student.sectionId ?? ""));
      }
      if (programsResult.status === "fulfilled") setPrograms(list(programsResult.value.data));
      else setError(getApiErrorMessage(programsResult.reason));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [student]);

  useEffect(() => {
    if (!programId) { setSections([]); return undefined; }
    let active = true;
    const selectedProgram = programs.find((program) => String(programIdOf(program)) === String(programId));
    const actualProgramId = valueOf(selectedProgram, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? programId;
    const groupProgramId = valueOf(selectedProgram, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId");
    setSectionsLoading(true);
    setError("");
    apiClient.get(apiEndpoints.sections.list, { params: { ProgramId: actualProgramId, IsActive: true } })
      .then((response) => {
        if (!active) return;
        const available = list(response.data).filter((section) => {
          const sectionProgramId = valueOf(section, "programId", "ProgramId", "programmeId", "ProgrammeId");
          const sectionGroupProgramId = valueOf(section, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId");
          const sectionGroupId = valueOf(section, "groupId", "GroupId");
          const belongsToProgram = String(sectionProgramId ?? "") === String(actualProgramId)
            || (groupProgramId != null && String(sectionGroupProgramId ?? "") === String(groupProgramId));
          return belongsToProgram && (sectionGroupId == null || String(sectionGroupId) === String(groupId));
        });
        setSections(available);
        setSectionId((current) => available.some((section) => String(sectionIdOf(section)) === String(current)) ? current : "");
      })
      .catch((requestError) => active && setError(getApiErrorMessage(requestError)))
      .finally(() => active && setSectionsLoading(false));
    return () => { active = false; };
  }, [groupId, programId, programs]);

  const unchanged = String(programId) === currentProgramId && String(sectionId) === currentSectionId;
  const selectedSection = sections.find((section) => String(sectionIdOf(section)) === String(sectionId));
  const selectedProgram = programs.find((program) => String(programIdOf(program)) === String(programId));
  const confirm = async () => {
    const admissionId = Number(student.admissionId);
    const studentId = Number(student.studentId);
    const nextProgramId = Number(programId);
    const nextSectionId = Number(sectionId);
    if (!studentId) return setError("This student does not contain a valid Student ID.");
    if (!nextProgramId || !nextSectionId) return setError("New Program and New Section are required.");
    if (!selectedSection) return setError("The selected section does not belong to the selected program.");
    if (unchanged) return setError("Please select a different program or section.");
    setSaving(true); setError("");
    try {
      const response = await changeStudentAllocation({ admissionId: admissionId || undefined, studentId, currentProgramId: Number(currentProgramId), programId: nextProgramId, sectionId: nextSectionId });
      const result = objectFrom(response.data);
      onChanged(student, {
        programId: nextProgramId,
        programme: valueOf(result, "programName", "ProgramName", "programmeName", "ProgrammeName") ?? programNameOf(selectedProgram),
        sectionId: nextSectionId,
        section: valueOf(result, "sectionName", "SectionName") ?? sectionNameOf(selectedSection),
        roll: valueOf(result, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? "",
      });
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSaving(false); }
  };

  return <Modal title="Change Program / Section" size="sm" className="section-allocation-change-modal" onClose={saving ? () => {} : onClose} footer={<><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" onClick={confirm} disabled={loading || sectionsLoading || saving || !programId || !sectionId}>{saving ? "Changing..." : "Confirm Change"}</button></>}>
    <div className="section-allocation-change-content">
      <div className="section-allocation-student"><strong>{student.name}</strong><span>· {student.admissionNo}</span></div>
      <p>Current: {currentProgramName} · Section {currentSectionName} · Roll No {currentRoll}</p>
      {error ? <div className="section-allocation-change-error" role="alert">{error}</div> : null}
      <div className="section-allocation-change-fields">
        <label className="cms-field"><span>New Program <span className="req">*</span></span><select value={programId} disabled={loading || saving} onChange={(event) => { setProgramId(event.target.value); setSectionId(""); setError(""); }}><option value="">Select New Program</option>{programs.map((program) => <option key={String(programIdOf(program))} value={programIdOf(program)}>{programNameOf(program)}</option>)}</select></label>
        <label className="cms-field"><span>New Section <span className="req">*</span></span><select value={sectionId} disabled={!programId || sectionsLoading || saving} onChange={(event) => { setSectionId(event.target.value); setError(""); }}><option value="">{sectionsLoading ? "Loading sections..." : "Select New Section"}</option>{sections.map((section) => <option key={String(sectionIdOf(section))} value={sectionIdOf(section)}>{sectionNameOf(section)}</option>)}</select></label>
      </div>
    </div>
  </Modal>;
}
