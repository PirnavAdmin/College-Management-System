import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3, FiRotateCcw, FiSave, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { env } from "../../config/env";
import { apiEndpoints } from "../../services/apiEndpoints";
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

const FALLBACK_SECTIONS = [
  { id: 101, sectionName: "A", roomNumber: "101", board: "State Board", academicLevel: "Intermediate First Year", maxStrength: 40 },
  { id: 102, sectionName: "B", roomNumber: "102", board: "CBSE", academicLevel: "Intermediate Second Year", maxStrength: 38 },
];

export default function SectionManagement() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [dropdowns, setDropdowns] = useState(initialDropdowns);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setLoadError("");
        setFeedback({ type: "", message: "" });

        if (env.enableMockAuth) {
          setDropdowns({
            boards: FALLBACK_BOARDS,
            academicYears: FALLBACK_ACADEMIC_YEARS,
            groups: FALLBACK_GROUPS,
            academicLevels: initialDropdowns.academicLevels,
            teachers: FALLBACK_TEACHERS,
          });
          setSections(FALLBACK_SECTIONS);
          return;
        }

        const [boardResponse, yearResponse, groupResponse, facultyResponse, sectionResponse] = await Promise.all([
          api.get(apiEndpoints.boards.list, { signal: controller.signal }),
          api.get(apiEndpoints.academicYears.list, { signal: controller.signal }),
          api.get(apiEndpoints.groups.list, { signal: controller.signal }),
          api.get(apiEndpoints.faculty.list, { signal: controller.signal }),
          api.get(apiEndpoints.sections.list, { signal: controller.signal }),
        ]);

        setDropdowns({
          boards: normalizeBoards(boardResponse.data),
          academicYears: normalizeAcademicYears(yearResponse.data),
          groups: normalizeGroups(groupResponse.data),
          academicLevels: initialDropdowns.academicLevels,
          teachers: normalizeTeachers(facultyResponse.data),
        });
        setSections(asArray(sectionResponse.data).map(normalizeSection));
      } catch (error) {
        if (error.name !== "CanceledError") {
          setLoadError(getRequestErrorMessage(error));
          setDropdowns({
            boards: FALLBACK_BOARDS,
            academicYears: FALLBACK_ACADEMIC_YEARS,
            groups: FALLBACK_GROUPS,
            academicLevels: initialDropdowns.academicLevels,
            teachers: FALLBACK_TEACHERS,
          });
          setSections(FALLBACK_SECTIONS);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadInitialData();
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
    setEditingSectionId(null);
    setFeedback({ type: "", message: "" });
  };

  const loadSections = async (groupId = "") => {
    try {
      setSectionsLoading(true);
      const endpoint = groupId ? apiEndpoints.sections.byGroup(groupId) : apiEndpoints.sections.list;
      const response = await api.get(endpoint);
      setSections(asArray(response.data).map(normalizeSection));
    } catch (error) {
      setLoadError(getRequestErrorMessage(error));
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleGroupFilterChange = async (event) => {
    const nextGroupId = event.target.value;
    setSelectedGroupId(nextGroupId);
    await loadSections(nextGroupId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const selectedBoard = dropdowns.boards.find((board) => String(board.name) === String(form.board));
    const selectedGroup = dropdowns.groups.find((group) => String(group.id) === String(form.groupId));

    const payload = {
      board: selectedBoard?.name ?? String(form.board),
      academicYearId: Number(form.academicYearId),
      group: selectedGroup?.name ?? String(form.groupId),
      academicLevel: form.academicLevel,
      sectionName: form.sectionName.trim(),
      roomNumber: form.roomNumber.trim(),
      classTeacherId: Number(form.classTeacherId),
      maximumStrength: Number(form.maxStrength),
    };

    try {
      setSubmitting(true);
      setSubmitError("");
      setFeedback({ type: "", message: "" });

      if (editingSectionId) {
        await api.put(apiEndpoints.sections.update(editingSectionId), payload);
      } else {
        await api.post(apiEndpoints.sections.create, payload);
      }

      await loadSections(selectedGroupId);
      setFeedback({
        type: "success",
        message: editingSectionId ? "Section updated successfully." : "Section created successfully.",
      });
      resetForm();
    } catch (error) {
      setSubmitError(getRequestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSectionId(section.id);
    setForm({
      board: section.board ?? "",
      academicYearId: section.academicYearId ?? "",
      groupId: section.groupId ?? "",
      academicLevel: section.academicLevel ?? "",
      sectionName: section.sectionName ?? "",
      roomNumber: section.roomNumber ?? "",
      classTeacherId: section.classTeacherId ?? "",
      maxStrength: section.maxStrength ?? "",
    });
    setErrors({});
    setSubmitError("");
  };

  const handleDelete = async (sectionId) => {
    if (!window.confirm("Delete this section?")) return;

    try {
      setSubmitError("");
      setFeedback({ type: "", message: "" });
      await api.delete(apiEndpoints.sections.remove(sectionId));
      await loadSections(selectedGroupId);
      if (editingSectionId === sectionId) resetForm();
      setFeedback({ type: "success", message: "Section deleted successfully." });
    } catch (error) {
      setSubmitError(getRequestErrorMessage(error));
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
        {feedback.message ? <div className={`notice ${feedback.type === "success" ? "notice-success" : "notice-error"}`}>{feedback.message}</div> : null}

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
              <FiSave /> {submitting ? "Saving..." : editingSectionId ? "Update Section" : "Save Section"}
            </Button>
            <Button type="button" onClick={resetForm} disabled={submitting || loading}>
              <FiRotateCcw /> Reset
            </Button>
            <Link className="btn btn-secondary" to="/dashboard">Cancel</Link>
          </div>
        </form>

        <div className="sectionManagementActions" style={{ marginTop: "1rem" }}>
          <label className="formField" style={{ minWidth: "220px" }}>
            <span>Filter by Group</span>
            <select className="select" value={selectedGroupId} onChange={handleGroupFilterChange} disabled={loading}>
              <option value="">All Groups</option>
              {dropdowns.groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
        </div>

        {sectionsLoading ? <p>Loading sections...</p> : null}

        <div className="sectionsTableWrap">
          <table className="sectionsTable">
            <thead>
              <tr>
                <th>Section</th>
                <th>Room</th>
                <th>Board</th>
                <th>Academic Level</th>
                <th>Max Strength</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.length > 0 ? sections.map((section) => (
                <tr key={section.id}>
                  <td>{section.sectionName}</td>
                  <td>{section.roomNumber}</td>
                  <td>{section.board}</td>
                  <td>{section.academicLevel}</td>
                  <td>{section.maxStrength}</td>
                  <td>
                    <div className="sectionsRowActions">
                      <Button type="button" className="iconBtn iconBtn--edit" onClick={() => handleEdit(section)}>
                        <FiEdit3 /> Edit
                      </Button>
                      <Button type="button" className="iconBtn iconBtn--delete" onClick={() => handleDelete(section.id)}>
                        <FiTrash2 /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="sectionsEmptyRow">No sections found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
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

function normalizeSection(item) {
  return {
    id: item.sectionId ?? item.id ?? item.sectionID ?? item.section_id,
    board: item.board ?? item.boardName ?? "",
    academicYearId: item.academicYearId ?? item.academicYear?.id ?? "",
    groupId: item.groupId ?? item.group?.id ?? "",
    academicLevel: item.academicLevel ?? item.academicLevelName ?? "",
    sectionName: item.sectionName ?? item.name ?? "",
    roomNumber: item.roomNumber ?? item.room ?? "",
    classTeacherId: item.classTeacherId ?? item.classTeacher?.id ?? "",
    maxStrength: item.maxStrength ?? item.maximumStrength ?? "",
  };
}

function getRequestErrorMessage(error) {
  if (!error?.response) {
    return "Network error. Please check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Unauthorized. Please sign in again and try the request.";
  }

  if (error.response.status === 404) {
    return "The requested section was not found.";
  }

  if (error.response.status >= 500) {
    return "The server is currently unavailable. Please try again later.";
  }

  return getApiErrorMessage(error);
}