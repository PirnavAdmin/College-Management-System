import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Check as FiCheck, Pencil as FiEdit2, Save as FiSave, Trash2 as FiTrash2 } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout";
import "./MarksEntryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sterile-retorted-tightness.ngrok-free.dev";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    "ngrok-skip-browser-warning": "true"
  };
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = data?.message ?? data?.title ?? (typeof data === "string" ? data : "API request failed");
    throw new Error(message);
  }
  return data;
};

const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

// Fallback Data definitions
const FALLBACK_ACADEMIC_YEARS = [
  { id: 1, year: "2025-2026" },
  { id: 2, year: "2026-2027" }
];
const FALLBACK_SECTIONS = [
  { id: 1, sectionName: "Section A" },
  { id: 2, sectionName: "Section B" }
];
const FALLBACK_SUBJECTS = [
  { subjectId: 1, subjectName: "Mathematics", subjectCode: "MATH101", passingMarks: 35 },
  { subjectId: 2, subjectName: "Physics", subjectCode: "PHY101", passingMarks: 35 },
  { subjectId: 3, subjectName: "Chemistry", subjectCode: "CHEM101", passingMarks: 35 }
];
const FALLBACK_STUDENTS = [
  { studentId: 101, rollNo: "UG2026001", studentName: "Rahul Kumar" },
  { studentId: 102, rollNo: "UG2026002", studentName: "Sai Kiran" },
  { studentId: 103, rollNo: "UG2026003", studentName: "Ananya Reddy" }
].map((s) => ({
  ...s,
  markId: null,
  internalMarks: "",
  practicalMarks: "",
  theoryMarks: "",
  passingMarks: 35,
  verified: false
}));

const blankFilters = {
  board: "",
  academicYearId: "",
  academicLevel: "",
  groupId: "",
  sectionId: "",
  examinationId: "",
  subjectId: ""
};
const fieldLabels = {
  board: "Board",
  academicYearId: "Academic Year",
  academicLevel: "Academic Level",
  groupId: "Group",
  sectionId: "Section",
  examinationId: "Examination",
  subjectId: "Subject"
};

const totalOf = (s) =>
  (Number(s.internalMarks) || 0) + (Number(s.practicalMarks) || 0) + (Number(s.theoryMarks) || 0);
const isComplete = (s) => s.internalMarks !== "" && s.practicalMarks !== "" && s.theoryMarks !== "";
const gradeOf = (total) =>
  total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";
const validateMark = (value, maximum) =>
  value === "" || value === null || value === undefined
    ? "Required"
    : !/^\d+$/.test(String(value))
    ? "Whole numbers only"
    : Number(value) > maximum
    ? `0-${maximum} max`
    : "";
const markErrors = (s) => ({
  internalMarks: s.internalMarks === "" ? "" : validateMark(s.internalMarks, 30),
  practicalMarks: s.practicalMarks === "" ? "" : validateMark(s.practicalMarks, 30),
  theoryMarks: s.theoryMarks === "" ? "" : validateMark(s.theoryMarks, 40)
});
const isStudentValid = (s) => Object.values(markErrors(s)).every((error) => !error);
const extractArray = (response) =>
  Array.isArray(response)
    ? response
    : ["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key]))
    ? response[["data", "items", "result", "records"].find((key) => Array.isArray(response?.[key]))]
    : null;
const asValue = (value) => (value === null || value === undefined ? "" : String(value));

function GradeBadge({ total, complete }) {
  const grade = complete ? gradeOf(total) : "—";
  return (
    <span className={`cms-badge-grade ${complete ? `cms-grade-${grade.toLowerCase().replace("+", "-plus")}` : "cms-is-empty"}`}>
      {grade}
    </span>
  );
}

function StatusBadge({ verified }) {
  return (
    <span className={`cms-badge-status ${verified ? "cms-status-verified" : "cms-status-pending"}`}>
      <span className="cms-badge-dot" />
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

export default function MarksEntry() {
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState(blankFilters);
  const [filterErrors, setFilterErrors] = useState({});
  const [apiFieldErrors, setApiFieldErrors] = useState({});
  const [students, setStudents] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [editingIds, setEditingIds] = useState(new Set());
  const [selectedVerifyIds, setSelectedVerifyIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("entry");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [boardInfoOpen, setBoardInfoOpen] = useState(false);

  const loadOptions = useCallback(async (url, fallback, setOptions, errorField, errorMessage) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, { headers: getAuthHeaders() });
      const items = response.ok ? extractArray(await response.json()) : null;
      if (!items?.length) throw new Error("No usable data");
      setOptions(items);
      setApiFieldErrors((previous) => ({ ...previous, [errorField]: undefined }));
    } catch {
      setOptions(fallback);
      setApiFieldErrors((previous) => ({ ...previous, [errorField]: errorMessage }));
    }
  }, []);

  useEffect(() => {
    loadOptions("/api/v1/boards", [], setBoards, "board", "Unable to load boards. Please try again.");
    loadOptions("/api/v1/academic-years", FALLBACK_ACADEMIC_YEARS, setAcademicYears, "academicYearId", "Unable to load academic years. Please try again.");
    loadOptions("/api/v1/boards/academic-levels", [], setAcademicLevels, "academicLevel", "Unable to load academic levels. Please try again.");
    loadOptions("/api/v1/groups?pageNumber=1&pageSize=20", [], setGroups, "groupId", "Unable to load groups. Please try again.");
    loadOptions("/api/v1/examinations", [], setExams, "examinationId", "Unable to load examinations. Please try again.");
    loadOptions("/api/v1/Sections", FALLBACK_SECTIONS, setSections, "sectionId", "Unable to load sections. Using temporary sections.");
  }, [loadOptions]);

  useEffect(() => {
    if (!filters.groupId) {
      setSubjects([]);
      return;
    }
    loadOptions(`/api/v1/subjects/group/${filters.groupId}`, FALLBACK_SUBJECTS, setSubjects, "subjectId", "Unable to load subjects. Please try again.");
  }, [filters.groupId, loadOptions]);

  const allFiltersSelected = useMemo(() => Object.values(filters).every(Boolean), [filters]);
  const selectedBoard = useMemo(
    () => boards.find((board) => String(board.boardId ?? board.id) === String(filters.board)),
    [boards, filters.board]
  );
  const selectedBoardLabel = selectedBoard
    ? [selectedBoard.boardCode ?? selectedBoard.code, selectedBoard.boardName ?? selectedBoard.name].filter(Boolean).join(" — ")
    : "";
  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.groupId ?? group.id) === String(filters.groupId)),
    [filters.groupId, groups]
  );
  const availableSections = useMemo(() => {
    if (!selectedGroup) return [];
    const groupName = normalized(selectedGroup.groupName ?? selectedGroup.name);
    return sections.filter((section) => {
      const sectionGroup = normalized(section.group ?? section.groupName);
      return !sectionGroup || sectionGroup === groupName;
    });
  }, [sections, selectedGroup]);
  const fieldError = useCallback((name) => apiFieldErrors[name] ?? filterErrors[name], [apiFieldErrors, filterErrors]);
  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? students.filter((s) => s.rollNo.toLowerCase().includes(term) || s.studentName.toLowerCase().includes(term))
      : students;
  }, [search, students]);

  const stats = useMemo(() => {
    const entered = students.filter(isComplete);
    const totals = entered.map(totalOf);
    return {
      total: students.length,
      entered: entered.length,
      verified: students.filter((s) => s.verified).length,
      pending: students.filter((s) => !s.verified).length,
      average: totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 0,
      highest: totals.length ? Math.max(...totals, 0) : 0
    };
  }, [students]);

  const submitBlocker = useMemo(
    () =>
      !students.length
        ? "Load student records before submitting."
        : !students.some((student) => student.verified && !student.submitted)
        ? "Verify at least one student before submission."
        : "",
    [students]
  );

  const mapStudent = useCallback(
    (student, mark = {}) => ({
      studentId: student.studentId ?? student.student_id ?? student.id ?? mark.studentId ?? mark.student_id,
      rollNo: student.rollNo ?? student.roll_no ?? mark.rollNo ?? mark.roll_no ?? "—",
      studentName: student.studentName ?? student.student_name ?? student.name ?? mark.studentName ?? mark.student_name ?? "Student",
      markId: mark.markId ?? mark.mark_id ?? mark.id ?? null,
      internalMarks: asValue(mark.internalMarks ?? mark.internal_marks ?? student.internalMarks ?? student.internal_marks),
      practicalMarks: asValue(mark.practicalMarks ?? mark.practical_marks ?? student.practicalMarks ?? student.practical_marks),
      theoryMarks: asValue(mark.theoryMarks ?? mark.theory_marks ?? student.theoryMarks ?? student.theory_marks),
      passingMarks: Number(mark.passingMarks ?? mark.passing_marks ?? student.passingMarks ?? student.passing_marks) || 35,
      verified: Boolean(mark.verified ?? mark.isVerified ?? mark.is_verified ?? student.verified),
      submitted: Boolean(mark.submitted ?? mark.isSubmitted ?? mark.is_submitted ?? student.submitted)
    }),
    []
  );

  const changeFilter = useCallback((name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "groupId" ? { subjectId: "", sectionId: "" } : {})
    }));
    setFilterErrors((previous) => ({ ...previous, [name]: undefined }));
  }, []);

  const validateFilter = useCallback(
    (name) =>
      setFilterErrors((previous) => ({
        ...previous,
        [name]: filters[name] ? undefined : `Select ${fieldLabels[name]}`
      })),
    [filters]
  );

  const checkStudents = useCallback(async () => {
    const errors = Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => !value)
        .map(([name]) => [name, `Select ${fieldLabels[name]}`])
    );
    setFilterErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Please complete all assessment filters.");
      return;
    }
    setLoading(true);
    setRowErrors({});
    setSelectedVerifyIds(new Set());
    setSearch("");
    setActiveTab("entry");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students`, { headers: getAuthHeaders() });
      const records = response.ok ? extractArray(await response.json()) : null;
      if (!records?.length) throw new Error("No usable data");
      const loaded = records.map((record) => mapStudent(record, record)).filter((student) => student.studentId !== undefined);
      if (!loaded.length) throw new Error("Missing student fields");
      setStudents(loaded);
      setEditingIds(new Set(loaded.filter((student) => !student.markId && !student.verified).map((student) => student.studentId)));
      toast.success("Students loaded successfully.");
    } catch(error){
      console.error("Failed to load students:", error);

    // Do NOT load fallback/mock students
    setStudents([]);
    setEditingIds(new Set());
    setSelectedVerifyIds(new Set());
    setRowErrors({});

    toast.error(
      error?.message ||
        "Unable to load students. Please check your connection and try again."
    );
      
    } finally {
      setLoading(false);
    }
  }, [filters, mapStudent]);

  const changeMark = useCallback((studentId, field, value) => {
    if (value !== "" && !/^\d*$/.test(value)) return;
    setStudents((previous) =>
      previous.map((student) =>
        student.studentId === studentId && !student.verified && !student.submitted
          ? { ...student, [field]: value, verified: false }
          : student
      )
    );
    setRowErrors((previous) => ({
      ...previous,
      [studentId]: {
        ...previous[studentId],
        [field]: value === "" ? "" : validateMark(value, field === "theoryMarks" ? 40 : 30)
      }
    }));
  }, []);

  const payloadFor = useCallback(
    (records) => ({
      marks: records.map((student) => ({
        board: String(filters.board),
        academicYearId: Number(filters.academicYearId),
        academicLevel: String(filters.academicLevel),
        groupId: Number(filters.groupId),
        sectionId: Number(filters.sectionId),
        examinationId: Number(filters.examinationId),
        subjectId: Number(filters.subjectId),
        studentId: Number(student.studentId),
        rollNo: String(student.rollNo),
        studentName: String(student.studentName),
        internalMarks: Number(student.internalMarks) || 0,
        practicalMarks: Number(student.practicalMarks) || 0,
        theoryMarks: Number(student.theoryMarks) || 0,
        passingMarks: Number(student.passingMarks) || 35
      }))
    }),
    [filters]
  );

  const saveMarks = useCallback(
    async (ids) => {
      const records = students.filter((student) => ids.includes(student.studentId));
      if (records.length !== 1) {
        toast.error("Save marks one student at a time.");
        return false;
      }
      const [student] = records;
      const errors = { [student.studentId]: markErrors(student) };
      setRowErrors((previous) => ({ ...previous, ...errors }));
      if (Object.values(errors).some((row) => Object.values(row).some(Boolean))) {
        toast.error("Please fix all mark validation errors.");
        return false;
      }
      try {
        const updatePayload = {
          internalMarks: Number(student.internalMarks),
          practicalMarks: Number(student.practicalMarks),
          theoryMarks: Number(student.theoryMarks),
          passingMarks: Number(student.passingMarks) || 35
        };
        const response = student.markId
          ? await apiRequest(`/api/v1/marks/${student.markId}`, { method: "PUT", body: JSON.stringify(updatePayload) })
          : await apiRequest("/api/v1/marks", { method: "POST", body: JSON.stringify(payloadFor([student]).marks[0]) });
        const savedMark = response?.data ?? response?.result ?? response;
        const savedMarkId = savedMark?.markId ?? savedMark?.mark_id ?? savedMark?.id ?? student.markId;

        if (!savedMarkId) {
          throw new Error("Marks were saved, but the server did not return a mark ID.");
        }
        setStudents((previous) =>
          previous.map((item) => (item.studentId === student.studentId ? { ...item, markId: savedMarkId } : item))
        );
        setEditingIds((previous) => {
          const next = new Set(previous);
          next.delete(student.studentId);
          return next;
        });
        toast.success(student.markId ? "Marks updated successfully." : "Marks saved successfully.");
        return true;
      } catch (error) {
        console.error("Failed to save marks:", error);
        toast.error(error.message || "Unable to save marks. Please try again.");
        return false;
      }
    },
    [payloadFor, students]
  );

  const editRow = useCallback((id) => setEditingIds((previous) => new Set([...previous, id])), []);

  const deleteMark = useCallback(
    async (studentId) => {
      const student = students.find((item) => item.studentId === studentId);
      if (!student?.markId) {
        toast.error("This student's marks have not been saved yet.");
        return;
      }
      if (!window.confirm(`Delete marks for ${student.studentName}?`)) return;

      try {
        await apiRequest(`/api/v1/marks/${student.markId}`, { method: "DELETE" });
        setStudents((previous) =>
          previous.map((item) =>
            item.studentId === studentId
              ? { ...item, markId: null, internalMarks: "", practicalMarks: "", theoryMarks: "", verified: false, submitted: false }
              : item
          )
        );
        setEditingIds((previous) => new Set([...previous, studentId]));
        setSelectedVerifyIds((previous) => {
          const next = new Set(previous);
          next.delete(studentId);
          return next;
        });
        setRowErrors((previous) => {
          const next = { ...previous };
          delete next[studentId];
          return next;
        });
        toast.success("Marks deleted successfully.");
      } catch (error) {
        console.error("Failed to delete marks:", error);
        toast.error(error.message || "Unable to delete marks. Please try again.");
      }
    },
    [students]
  );

  const verifyStudent = useCallback(
    async (studentId) => {
      const student = students.find((item) => item.studentId === studentId);
      const eligible =
        student &&
        !student.verified &&
        !student.submitted &&
        isComplete(student) &&
        isStudentValid(student) &&
        Boolean(student.markId) &&
        !editingIds.has(studentId);
      if (!eligible) {
        toast.error("Save complete marks before verifying this student.");
        return;
      }

      try {
        await apiRequest("/api/v1/marks/verify", {
          method: "POST",
          body: JSON.stringify({
            examinationId: Number(filters.examinationId),
            subjectId: Number(filters.subjectId),
            sectionId: Number(filters.sectionId),
            verifiedBy: "Evaluator"
          })
        });
        setStudents((previous) =>
          previous.map((item) => (item.studentId === studentId ? { ...item, verified: true } : item))
        );
        setSelectedVerifyIds((previous) => {
          const next = new Set(previous);
          next.delete(studentId);
          return next;
        });
        toast.success(`${student.studentName}'s marks verified successfully.`);
      } catch (error) {
        console.error("Failed to verify marks:", error);
        toast.error(error.message || "Unable to verify marks. Please try again.");
      }
    },
    [editingIds, filters, students]
  );

  const verifyAllEligible = useCallback(async () => {
    const eligible = students.filter(
      (student) =>
        selectedVerifyIds.has(student.studentId) &&
        !student.verified &&
        isComplete(student) &&
        isStudentValid(student) &&
        student.markId &&
        !editingIds.has(student.studentId)
    );
    const skipped = students.filter((student) => !student.verified).length - eligible.length;
    if (!eligible.length) {
      toast.error("No eligible saved students are ready for verification.");
      return;
    }
    const verifyPayload = {
      examinationId: Number(filters.examinationId),
      subjectId: Number(filters.subjectId),
      sectionId: Number(filters.sectionId),
      verifiedBy: "Evaluator"
    };
    try {
      await apiRequest("/api/v1/marks/verify", {
        method: "POST",
        body: JSON.stringify(verifyPayload)
      });
    } catch (error) {
      console.error("Failed to verify marks:", error);
      toast.error(error.message || "Unable to verify marks. Please try again.");
      return;
    }
    const eligibleIds = new Set(eligible.map((student) => student.studentId));
    setStudents((previous) => previous.map((student) => (eligibleIds.has(student.studentId) ? { ...student, verified: true } : student)));
    setSelectedVerifyIds(new Set());
    toast.success(`Verified: ${eligible.length}. Skipped: ${skipped}.`);
  }, [editingIds, filters, selectedVerifyIds, students]);

  const eligibleVerifyIds = useMemo(
    () =>
      students
        .filter(
          (student) =>
            !student.verified &&
            isComplete(student) &&
            isStudentValid(student) &&
            student.markId &&
            !editingIds.has(student.studentId)
        )
        .map((student) => student.studentId),
    [editingIds, students]
  );

  useEffect(() => {
    if (activeTab === "verify") setSelectedVerifyIds(new Set(eligibleVerifyIds));
  }, [activeTab, eligibleVerifyIds]);

  const toggleVerifyStudent = useCallback(
    (id) =>
      setSelectedVerifyIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    []
  );

  const submitEvaluation = useCallback(async () => {
    if (submitBlocker) {
      toast.error(submitBlocker);
      return;
    }
    const verifiedStudents = students.filter((student) => student.verified && !student.submitted);
    const isSingleStudentSubmission = verifiedStudents.length === 1;
    const bulkPayload = payloadFor(verifiedStudents);
    const endpoint = isSingleStudentSubmission ? "/api/v1/marks" : "/api/v1/marks/bulk";
    const requestBody = isSingleStudentSubmission ? bulkPayload.marks[0] : bulkPayload;

    try {
      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(requestBody)
      });
      setStudents((previous) =>
        previous.map((student) => (student.verified && !student.submitted ? { ...student, submitted: true } : student))
      );
      toast.success(isSingleStudentSubmission ? "Evaluation submitted for 1 student." : `Evaluation submitted for ${verifiedStudents.length} students.`);
    } catch (error) {
      console.error("Failed to submit evaluation:", error);
      toast.error(error.message || "Unable to submit evaluation. Please try again.");
    }
  }, [payloadFor, students, submitBlocker]);

  const clearMarks = useCallback(() => {
    setStudents((previous) =>
      previous.map((student) =>
        student.submitted ? student : { ...student, markId: null, internalMarks: "", practicalMarks: "", theoryMarks: "", verified: false }
      )
    );
    setEditingIds(new Set(students.filter((student) => !student.submitted).map((student) => student.studentId)));
    setRowErrors({});
    setDeleteOpen(false);
    toast.warning("All editable marks cleared.");
  }, [students]);

  return (
    <DashboardLayout title="Marks Entry" subtitle="Enter internal, practical and theory marks." breadcrumb={["Examinations"]}>
      <section className="cms-marks-entry cms-anim-up" aria-label="Marks entry module">
        <div className="cms-card cms-card-filter">
          <div className="cms-section-heading">
            <div>
              <h2>Assessment Details</h2>
              <p>All filter selections are required before loading student records.</p>
            </div>
            <button
              className="cms-btn cms-btn-primary"
              type="button"
              disabled={!allFiltersSelected || loading}
              onClick={checkStudents}
            >
              {loading ? "Loading..." : "Check Students"}
            </button>
          </div>

          <div className="cms-filter-grid">
            <div className="cms-board-select-wrap">
              <SelectField
                label="Board"
                name="board"
                value={filters.board}
                onChange={changeFilter}
                onBlur={validateFilter}
                error={fieldError("board")}
              >
                <option value="">Select Board</option>
                {boards.map((board) => (
                  <option key={board.boardId ?? board.id} value={board.boardId ?? board.id}>
                    {[board.boardCode ?? board.code, board.boardName ?? board.name].filter(Boolean).join(" — ")}
                  </option>
                ))}
              </SelectField>
              {selectedBoardLabel.length > 34 && (
                <button
                  type="button"
                  className="cms-board-overflow-btn"
                  aria-label="Show full board name"
                  title="Show full board name"
                  onClick={() => setBoardInfoOpen(true)}
                >
                  …
                </button>
              )}
            </div>

            <SelectField
              label="Academic Year"
              name="academicYearId"
              value={filters.academicYearId}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("academicYearId")}
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((year) => (
                <option key={year.id ?? year.academicYearId} value={year.id ?? year.academicYearId}>
                  {year.year ?? year.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Academic Level"
              name="academicLevel"
              value={filters.academicLevel}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("academicLevel")}
            >
              <option value="">Select Academic Level</option>
              {academicLevels.map((level) => (
                <option key={level.academicLevelId ?? level.id} value={level.levelName ?? level.name}>
                  {level.levelName ?? level.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Group"
              name="groupId"
              value={filters.groupId}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("groupId")}
            >
              <option value="">Select Group</option>
              {groups.map((group) => (
                <option key={group.id ?? group.groupId} value={group.id ?? group.groupId}>
                  {group.groupName ?? group.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Section"
              name="sectionId"
              value={filters.sectionId}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("sectionId")}
              disabled={!filters.groupId}
            >
              <option value="">Select Section</option>
              {availableSections.map((section) => (
                <option key={section.id ?? section.sectionId} value={section.id ?? section.sectionId}>
                  {section.sectionName ?? section.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Examination"
              name="examinationId"
              value={filters.examinationId}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("examinationId")}
            >
              <option value="">Select Examination</option>
              {exams.map((exam) => (
                <option key={exam.id ?? exam.examinationId} value={exam.id ?? exam.examinationId}>
                  {exam.examName ?? exam.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Subject"
              name="subjectId"
              value={filters.subjectId}
              onChange={changeFilter}
              onBlur={validateFilter}
              error={fieldError("subjectId")}
              disabled={!filters.groupId}
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.subjectId ?? subject.id} value={subject.subjectId ?? subject.id}>
                  {subject.subjectName ?? subject.name} ({subject.subjectCode ?? subject.code ?? "—"})
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        {students.length > 0 && (
          <>
            <div className="cms-stats-grid">
              {[
                ["Total Students", stats.total],
                ["Marks Entered", stats.entered],
                ["Verified Students", stats.verified],
                ["Pending Students", stats.pending],
                ["Average Marks", stats.average],
                ["Highest Marks", stats.highest]
              ].map(([label, value]) => (
                <div className="cms-stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="cms-card">
              <div className="cms-table-toolbar">
                <div className="cms-tab-bar">
                  <button
                    className={`cms-tab-btn ${activeTab === "entry" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("entry")}
                    type="button"
                  >
                    Marks Entry
                  </button>
                  <button
                    className={`cms-tab-btn ${activeTab === "verify" ? "cms-active" : ""}`}
                    onClick={() => setActiveTab("verify")}
                    type="button"
                  >
                    Verification{" "}
                    <span className="cms-tab-badge">
                      {stats.verified}/{stats.total}
                    </span>
                  </button>
                </div>

                <div className="cms-search-wrap">
                  <input
                    className="cms-search-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by roll number or student name"
                  />
                </div>

                {activeTab === "verify" && (
                  <div className="cms-toolbar-actions">
                    <button type="button" className="cms-btn cms-btn-success" onClick={verifyAllEligible}>
                      Verify Eligible Students
                    </button>
                  </div>
                )}
              </div>

              <StudentTable
                students={visibleStudents}
                editingIds={editingIds}
                rowErrors={rowErrors}
                changeMark={changeMark}
                editRow={editRow}
                saveRow={(id) => saveMarks([id])}
                deleteRow={deleteMark}
                verifyRow={verifyStudent}
                activeTab={activeTab}
                selectedVerifyIds={selectedVerifyIds}
                toggleVerifyStudent={toggleVerifyStudent}
              />
            </div>

            <div className="cms-card cms-footer-actions">
              <p>{submitBlocker || "Only complete and verified marks can be submitted."}</p>
              <div className="cms-footer-btn-group">
                <button type="button" className="cms-btn cms-btn-danger-outline" onClick={() => setDeleteOpen(true)}>
                  Clear All Marks
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  disabled={Boolean(submitBlocker)}
                  title={submitBlocker}
                  onClick={submitEvaluation}
                >
                  Submit Evaluation
                </button>
              </div>
            </div>
          </>
        )}

        {deleteOpen && (
          <div className="cms-modal-overlay" role="presentation">
            <div className="cms-modal-content" role="dialog" aria-modal="true" aria-labelledby="delete-title">
              <h2 id="delete-title">Clear all marks?</h2>
              <p>Are you sure you want to clear all entered marks? This action cannot be undone.</p>
              <div className="cms-modal-actions">
                <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="cms-btn cms-btn-danger" onClick={clearMarks}>
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {boardInfoOpen && selectedBoard && (
          <div className="cms-modal-overlay" role="presentation">
            <div className="cms-modal-content" role="dialog" aria-modal="true" aria-labelledby="board-info-title">
              <h2 id="board-info-title">Board</h2>
              <p>{selectedBoardLabel}</p>
              <div className="cms-modal-actions">
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setBoardInfoOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position={students.length ? "bottom-right" : "top-right"} theme="colored" newestOnTop closeOnClick />
      </section>
    </DashboardLayout>
  );
}

function SelectField({ label, name, value, onChange, onBlur, error, children, disabled = false }) {
  return (
    <div className={`cms-field-group ${error ? "cms-has-error" : ""}`}>
      <label className="cms-field-label">{label}</label>
      <select
        className="cms-select-input"
        value={value}
        disabled={disabled}
        onBlur={() => onBlur(name)}
        onChange={(event) => onChange(name, event.target.value)}
      >
        {children}
      </select>
      {error && <small className="cms-field-error">{error}</small>}
    </div>
  );
}

function StudentTable({ students, editingIds, rowErrors, changeMark, editRow, saveRow, deleteRow, verifyRow, activeTab, selectedVerifyIds, toggleVerifyStudent }) {
  return (
    <div className="cms-table-container">
      <table className="cms-table">
        <thead>
          <tr>
            <th className="cms-th-select">{activeTab === "verify" ? "SELECT" : "SELECT"}</th>
            <th className="cms-th-student">STUDENT</th>
            <th className="cms-th-marks">INTERNAL</th>
            <th className="cms-th-marks">PRACTICAL</th>
            <th className="cms-th-marks">THEORY</th>
            <th className="cms-th-total">TOTAL</th>
            <th className="cms-th-grade">GRADE</th>
            <th className="cms-th-status">STATUS</th>
            <th className="cms-th-actions">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {students.length ? (
            students.map((student) => {
              const editing = editingIds.has(student.studentId);
              const complete = isComplete(student);
              const eligible =
                !student.verified && complete && isStudentValid(student) && Boolean(student.markId) && !editing && !student.submitted;
              return (
                <tr key={student.studentId} className={editing ? "cms-row-editing" : ""}>
                  <td className="cms-td-select">
                    <input
                      aria-label={`${student.studentName} ${activeTab === "verify" ? "verification selection" : "completion status"}`}
                      type="checkbox"
                      className="cms-checkbox"
                      checked={activeTab === "verify" ? selectedVerifyIds.has(student.studentId) : complete}
                      disabled={activeTab === "verify" ? !eligible : false}
                      readOnly={activeTab !== "verify"}
                      onChange={activeTab === "verify" ? () => toggleVerifyStudent(student.studentId) : undefined}
                      tabIndex={activeTab === "verify" ? 0 : -1}
                    />
                  </td>
                  <td className="cms-td-student">
                    <div className="cms-student-info">
                      <strong className="cms-student-name">{student.studentName}</strong>
                      <span className="cms-student-roll">{student.rollNo}</span>
                    </div>
                  </td>
                  {["internalMarks", "practicalMarks", "theoryMarks"].map((key) => (
                    <td key={key} className="cms-td-mark-input">
                      <div className="cms-input-wrap">
                        <input
                          className={`cms-mark-input ${rowErrors[student.studentId]?.[key] ? "cms-invalid" : ""}`}
                          disabled={!editing || student.verified || student.submitted}
                          inputMode="numeric"
                          value={student[key]}
                          onChange={(event) => changeMark(student.studentId, key, event.target.value)}
                        />
                        {rowErrors[student.studentId]?.[key] && (
                          <small className="cms-mark-error">{rowErrors[student.studentId][key]}</small>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="cms-td-total">
                    <span className="cms-total-val">{complete ? totalOf(student) : "0"}</span>
                  </td>
                  <td className="cms-td-grade">
                    <GradeBadge complete={complete} total={totalOf(student)} />
                  </td>
                  <td className="cms-td-status">
                    <StatusBadge verified={student.verified} />
                  </td>
                  {activeTab === "entry" ? (
                    <td className="cms-td-actions">
                      <div className="cms-row-actions">
                        <button
                          type="button"
                          className="cms-btn-icon"
                          disabled={student.verified || student.submitted}
                          aria-label={student.submitted ? "Submitted" : student.verified ? "Verified" : editing ? "Save marks" : "Edit marks"}
                          title={student.submitted ? "Submitted" : student.verified ? "Verified" : editing ? "Save marks" : "Edit marks"}
                          onClick={() => (editing ? saveRow(student.studentId) : editRow(student.studentId))}
                        >
                          {student.verified ? <FiCheck /> : editing ? <FiSave /> : <FiEdit2 />}
                        </button>
                        <button
                          type="button"
                          className="cms-btn-icon cms-btn-icon-delete"
                          disabled={!student.markId || student.submitted}
                          aria-label={student.submitted ? "Submitted marks cannot be deleted" : "Delete marks"}
                          title={student.submitted ? "Submitted marks cannot be deleted" : "Delete marks"}
                          onClick={() => deleteRow(student.studentId)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <td className="cms-td-actions">
                      <div className="cms-row-actions">
                        <button
                          type="button"
                          className="cms-btn-icon"
                          disabled={student.verified || student.submitted}
                          aria-label={student.submitted ? "Submitted" : student.verified ? "Verified" : editing ? "Save marks" : "Edit marks"}
                          title={student.submitted ? "Submitted" : student.verified ? "Verified" : editing ? "Save marks" : "Edit marks"}
                          onClick={() => (editing ? saveRow(student.studentId) : editRow(student.studentId))}
                        >
                          {student.verified ? <FiCheck /> : editing ? <FiSave /> : <FiEdit2 />}
                        </button>
                        <button
                          type="button"
                          className="cms-btn-icon cms-btn-icon-verify"
                          disabled={!eligible}
                          aria-label={student.verified ? "Verified" : "Verify marks"}
                          title={student.verified ? "Verified" : "Verify marks"}
                          onClick={() => verifyRow(student.studentId)}
                        >
                          <FiCheck />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="cms-empty-table">
                No students match your search criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
