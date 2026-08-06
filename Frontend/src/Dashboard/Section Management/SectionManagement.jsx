import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSave, FiRotateCcw } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { env } from "../../config/env";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import "./SectionManagement.css";

const initialForm = {
  board: "",
  academicYearId: "",
  groupId: "",
  academicLevel: "",
  sectionName: "",
  roomNumber: "",
  classTeacherId: "",
  maxStrength: "",
};

const initialDropdowns = {
  boards: [],
  academicYears: [],
  groups: [],
  academicLevels: [
    "Intermediate First Year",
    "Intermediate Second Year",
    "UG",
    "PG",
    "Diploma",
  ],
  teachers: [],
};

const FALLBACK_BOARDS = [
  { id: 1, name: "State Board" },
  { id: 2, name: "CBSE" },
  { id: 3, name: "ICSE" },
];

const FALLBACK_ACADEMIC_YEARS = [
  { id: 2024, name: "2024-2025" },
  { id: 2025, name: "2025-2026" },
  { id: 2026, name: "2026-2027" },
];

const FALLBACK_GROUPS = [
  { id: 1, name: "MPC" },
  { id: 2, name: "BiPC" },
  { id: 3, name: "CEC" },
];

const FALLBACK_TEACHERS = [
  { id: 1, name: "Asha Reddy" },
  { id: 2, name: "Rahul Sharma" },
  { id: 3, name: "Priya Nair" },
];

export default function SectionManagement() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [dropdowns, setDropdowns] = useState(initialDropdowns);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadDropdowns = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (env.enableMockAuth) {
          setDropdowns({
            boards: FALLBACK_BOARDS,
            academicYears: FALLBACK_ACADEMIC_YEARS,
            groups: FALLBACK_GROUPS,
            academicLevels: initialDropdowns.academicLevels,
            teachers: FALLBACK_TEACHERS,
          });
          return;
        }

        const [boardResponse, yearResponse, groupResponse, facultyResponse] = await Promise.all([
          api.get("/api/v1/boards", { signal: controller.signal }),
          api.get("/api/v1/academic-years", { signal: controller.signal }),
          api.get("/api/v1/groups", { signal: controller.signal }),
          api.get("/api/v1/faculty", { signal: controller.signal }),
        ]);

        setDropdowns({
          boards: normalizeBoards(boardResponse.data),
          academicYears: normalizeAcademicYears(yearResponse.data),
          groups: normalizeGroups(groupResponse.data),
          academicLevels: initialDropdowns.academicLevels,
          teachers: normalizeTeachers(facultyResponse.data),
        });
      } catch (error) {
        if (error.name !== "CanceledError") {
          setLoadError("Unable to load dropdown data. Using fallback values where possible.");
          setDropdowns({
            boards: FALLBACK_BOARDS,
            academicYears: FALLBACK_ACADEMIC_YEARS,
            groups: FALLBACK_GROUPS,
            academicLevels: initialDropdowns.academicLevels,
            teachers: FALLBACK_TEACHERS,
          });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDropdowns();
    return () => controller.abort();
  }, []);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.board) nextErrors.board = "Board is required.";
    if (!form.academicYearId) nextErrors.academicYearId = "Academic Year is required.";
    if (!form.groupId) nextErrors.groupId = "Group is required.";
    if (!form.academicLevel) nextErrors.academicLevel = "Academic Level is required.";
    if (!form.sectionName.trim()) nextErrors.sectionName = "Section Name is required.";
    if (!form.roomNumber.trim()) nextErrors.roomNumber = "Room Number is required.";
    if (!form.classTeacherId) nextErrors.classTeacherId = "Class Teacher is required.";
    if (!form.maxStrength.trim()) {
      nextErrors.maxStrength = "Maximum Strength is required.";
    } else if (!/^[0-9]+$/.test(form.maxStrength.trim())) {
      nextErrors.maxStrength = "Maximum Strength must be a number.";
    } else if (Number(form.maxStrength) <= 0) {
      nextErrors.maxStrength = "Maximum Strength must be greater than zero.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const payload = {
      board: form.board,
      academicYearId: Number(form.academicYearId),
      groupId: Number(form.groupId),
      academicLevel: form.academicLevel,
      sectionName: form.sectionName.trim(),
      roomNumber: form.roomNumber.trim(),
      classTeacherId: Number(form.classTeacherId),
      maxStrength: Number(form.maxStrength),
    };

    try {
      setSubmitting(true);
      setSubmitError("");
      await createSection(payload);
      navigate("/dashboard", { state: { successMessage: "Section saved successfully." } });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sectionManagement">
      <PageHeader
        title="Section Management"
        subtitle="Create or update section details with board, class, and teacher assignments."
        actions={<Link className="btn btn-secondary" to="/dashboard">Cancel</Link>}
      />

      <Card className="sectionManagementCard">
        {loadError ? <div className="notice notice-error">{loadError}</div> : null}
        {submitError ? <div className="notice notice-error">{submitError}</div> : null}
        <form className="sectionManagementForm" onSubmit={handleSubmit} noValidate>
          <div className="sectionManagementGrid">
            <FormField label="Board" error={errors.board}>
              <select className="select" value={form.board} onChange={(event) => setField("board", event.target.value)} disabled={loading}>
                <option value="">Select Board</option>
                {dropdowns.boards.map((board) => (
                  <option key={board.id} value={board.name}>{board.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Academic Year" error={errors.academicYearId}>
              <select className="select" value={form.academicYearId} onChange={(event) => setField("academicYearId", event.target.value)} disabled={loading}>
                <option value="">Select Academic Year</option>
                {dropdowns.academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Group" error={errors.groupId}>
              <select className="select" value={form.groupId} onChange={(event) => setField("groupId", event.target.value)} disabled={loading}>
                <option value="">Select Group</option>
                {dropdowns.groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Academic Level" error={errors.academicLevel}>
              <select className="select" value={form.academicLevel} onChange={(event) => setField("academicLevel", event.target.value)} disabled={loading}>
                <option value="">Select Academic Level</option>
                {dropdowns.academicLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Section Name" error={errors.sectionName}>
              <input className="input" value={form.sectionName} onChange={(event) => setField("sectionName", event.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Room Number" error={errors.roomNumber}>
              <input className="input" value={form.roomNumber} onChange={(event) => setField("roomNumber", event.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Class Teacher" error={errors.classTeacherId}>
              <select className="select" value={form.classTeacherId} onChange={(event) => setField("classTeacherId", event.target.value)} disabled={loading}>
                <option value="">Select Class Teacher</option>
                {dropdowns.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Maximum Strength" error={errors.maxStrength}>
              <input className="input" type="number" min="1" value={form.maxStrength} onChange={(event) => setField("maxStrength", event.target.value)} disabled={loading} />
            </FormField>
          </div>

          <div className="sectionManagementActions">
            <Button type="submit" variant="primary" disabled={submitting || loading}>
              <FiSave /> {submitting ? "Saving..." : "Save Section"}
            </Button>
            <Button type="button" onClick={resetForm} disabled={submitting || loading}>
              <FiRotateCcw /> Reset
            </Button>
            <Link className="btn btn-secondary" to="/dashboard">Cancel</Link>
          </div>
        </form>
      </Card>
    </section>
  );
}

async function createSection(section) {
  // TODO: Replace placeholder endpoint with real section API path when available.
  return api.post("/api/v1/sections", section);
}

function normalizeBoards(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.boardId ?? item.id ?? item.boardID ?? item.boardId,
    name: item.boardName ?? item.name ?? item.boardCode ?? "",
  }));
}

function normalizeAcademicYears(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.academicYearId ?? item.id ?? item.yearId ?? item.id,
    name: item.academicYearName ?? item.name ?? item.yearName ?? item.name,
  }));
}

function normalizeGroups(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.groupId ?? item.id ?? item.id,
    name: item.groupName ?? item.name ?? item.groupCode ?? "",
  }));
}

function normalizeTeachers(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.facultyId ?? item.id ?? item.employeeId ?? item.id,
    name: item.fullName ?? item.name ?? [item.firstName, item.lastName].filter(Boolean).join(" ") ?? "",
  }));
}
