import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiRotateCcw, FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { env } from "../../config/env";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import PageHeader from "../../shared/components/PageHeader";
import "./AddGroup.css";

const STORAGE_KEY = "cms_demo_groups";

const DEFAULT_GROUPS = [
  {
    groupId: 1,
    groupName: "MPC",
    groupCode: "MPC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate First Year",
    totalSubjects: 6,
    description: "Mathematics, Physics and Chemistry group",
    isActive: true,
  },
  {
    groupId: 2,
    groupName: "BiPC",
    groupCode: "BIPC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate First Year",
    totalSubjects: 6,
    description: "Biology, Physics and Chemistry group",
    isActive: true,
  },
  {
    groupId: 3,
    groupName: "CEC",
    groupCode: "CEC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate Second Year",
    totalSubjects: 5,
    description: "Commerce, Economics and Civics group",
    isActive: false,
  },
];

const BOARDS = ["State Board", "CBSE", "ICSE", "Intermediate Board", "University", "Autonomous", "Technical Board"];
const ACADEMIC_YEARS = [
  { id: 2022, name: "2022-2023" },
  { id: 2023, name: "2023-2024" },
  { id: 2024, name: "2024-2025" },
  { id: 2025, name: "2025-2026" },
];
const ACADEMIC_LEVELS = ["Intermediate First Year", "Intermediate Second Year", "UG", "PG", "Diploma"];

const initialForm = {
  board: "",
  academicYearId: "",
  academicLevel: "",
  groupName: "",
  groupCode: "",
  description: "",
  status: "Active",
};

export default function AddGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(groupId);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const academicYearName = useMemo(
    () => ACADEMIC_YEARS.find((year) => String(year.id) === String(form.academicYearId))?.name || "",
    [form.academicYearId],
  );

  const loadGroup = useCallback(async () => {
    if (!isEditMode) return;

    try {
      setLoading(true);
      setSubmitError("");

      let group;
      if (env.enableMockAuth) {
        group = findDemoGroup(groupId);
      } else {
        try {
          const response = await api.get(`/api/v1/groups/${groupId}`);
          group = response?.data?.group || response?.data?.data || response?.data;
        } catch (fetchError) {
          group = findDemoGroup(groupId);
          setSubmitError(`${getApiErrorMessage(fetchError)} Loaded local demo group instead.`);
        }
      }

      if (!group) throw new Error("Group was not found.");
      const isActive = typeof group.isActive === "boolean" ? group.isActive : String(group.status || "Active") === "Active";
      setForm({
        board: group.board || group.boardName || "",
        academicYearId: group.academicYearId || group.yearId || "",
        academicLevel: group.academicLevel || group.level || "",
        groupName: group.groupName || group.name || "",
        groupCode: sanitizeGroupCode(group.groupCode || group.code || ""),
        description: group.description || "",
        status: isActive ? "Active" : "Inactive",
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [groupId, isEditMode]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: key === "groupCode" ? sanitizeGroupCode(value) : value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.board) nextErrors.board = "Board is required.";
    if (!form.academicYearId) nextErrors.academicYearId = "Academic Year is required.";
    if (!form.academicLevel) nextErrors.academicLevel = "Academic Level is required.";
    if (!form.groupName.trim()) nextErrors.groupName = "Group Name is required.";
    if (!form.groupCode.trim()) nextErrors.groupCode = "Group Code is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveGroup = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      board: form.board,
      academicYearId: Number(form.academicYearId),
      academicYearName,
      academicLevel: form.academicLevel,
      groupName: form.groupName.trim(),
      groupCode: sanitizeGroupCode(form.groupCode),
      description: form.description.trim(),
      isActive: form.status === "Active",
    };

    try {
      setSaving(true);
      setSubmitError("");

      if (env.enableMockAuth) {
        if (isEditMode) {
          updateDemoGroup(groupId, payload);
        } else {
          createDemoGroup(payload);
        }
      } else {
        try {
          if (isEditMode) {
            await api.put(`/api/v1/groups/${groupId}`, payload);
          } else {
            await api.post("/api/v1/groups", payload);
          }
        } catch (saveError) {
          if (isEditMode) {
            updateDemoGroup(groupId, payload);
          } else {
            createDemoGroup(payload);
          }
          setSubmitError(`${getApiErrorMessage(saveError)} Saved to local demo groups instead.`);
        }
      }

      navigate("/dashboard/groups", {
        state: { successMessage: isEditMode ? "Group updated successfully" : "Group added successfully" },
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (isEditMode) {
      loadGroup();
    } else {
      setForm(initialForm);
    }
    setErrors({});
    setSubmitError("");
  };

  return (
    <section className="addGroup">
      <PageHeader
        title={isEditMode ? "Edit Group" : "Add Group"}
        subtitle={isEditMode ? "Update academic group configuration." : "Create a new academic group."}
        actions={
          <Button type="button" onClick={() => navigate("/dashboard/groups")}>
            <FiArrowLeft /> Back to List
          </Button>
        }
      />

      <Card className="addGroupCard">
        {submitError ? <div className="notice notice-error">{submitError}</div> : null}
        {loading ? (
          <div className="addGroupLoading">Loading group details...</div>
        ) : (
          <form className="addGroupForm" noValidate onSubmit={saveGroup}>
            <div className="addGroupGrid">
              <label className="form-field">
                <span>
                  Board <b>*</b>
                </span>
                <select className="select" value={form.board} onChange={(event) => updateField("board", event.target.value)}>
                  <option value="">Select Board</option>
                  {BOARDS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {errors.board ? <small className="field-error">{errors.board}</small> : null}
              </label>

              <label className="form-field">
                <span>
                  Academic Year <b>*</b>
                </span>
                <select
                  className="select"
                  value={form.academicYearId}
                  onChange={(event) => updateField("academicYearId", event.target.value)}
                >
                  <option value="">Select Academic Year</option>
                  {ACADEMIC_YEARS.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                {errors.academicYearId ? <small className="field-error">{errors.academicYearId}</small> : null}
              </label>

              <label className="form-field">
                <span>
                  Academic Level <b>*</b>
                </span>
                <select
                  className="select"
                  value={form.academicLevel}
                  onChange={(event) => updateField("academicLevel", event.target.value)}
                >
                  <option value="">Select Academic Level</option>
                  {ACADEMIC_LEVELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {errors.academicLevel ? <small className="field-error">{errors.academicLevel}</small> : null}
              </label>

              <label className="form-field">
                <span>
                  Group Name <b>*</b>
                </span>
                <input
                  className="input"
                  value={form.groupName}
                  onChange={(event) => updateField("groupName", event.target.value)}
                  placeholder="Enter group name"
                />
                {errors.groupName ? <small className="field-error">{errors.groupName}</small> : null}
              </label>

              <label className="form-field">
                <span>
                  Group Code <b>*</b>
                </span>
                <input
                  className="input"
                  value={form.groupCode}
                  onChange={(event) => updateField("groupCode", event.target.value)}
                  placeholder="Enter group code"
                />
                {errors.groupCode ? <small className="field-error">{errors.groupCode}</small> : null}
              </label>

              <label className="form-field">
                <span>Status</span>
                <select className="select" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className="form-field addGroupFull">
                <span>Description</span>
                <textarea
                  className="textarea"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Enter description"
                  rows={4}
                />
              </label>
            </div>

            <div className="addGroupActions">
              <Button type="submit" variant="primary" disabled={saving}>
                <FiSave /> {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
              </Button>
              <Button type="button" disabled={saving} onClick={resetForm}>
                <FiRotateCcw /> {isEditMode ? "Reset" : "Clear"}
              </Button>
              <Button type="button" disabled={saving} onClick={() => navigate("/dashboard/groups")}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}

function sanitizeGroupCode(value = "") {
  return String(value).replace(/\s+/g, "").toUpperCase();
}

function readDemoGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Reset local demo groups if storage was manually edited.
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
  return DEFAULT_GROUPS;
}

function writeDemoGroups(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function findDemoGroup(groupId) {
  return readDemoGroups().find((group) => String(group.groupId) === String(groupId) || String(group.id) === String(groupId));
}

function createDemoGroup(payload) {
  const groups = readDemoGroups();
  const nextId = groups.reduce((maxId, group) => Math.max(maxId, Number(group.groupId || group.id || 0)), 0) + 1;
  const nextGroup = {
    groupId: nextId,
    id: nextId,
    totalSubjects: 0,
    ...payload,
  };
  writeDemoGroups([...groups, nextGroup]);
}

function updateDemoGroup(groupId, payload) {
  const groups = readDemoGroups();
  const index = groups.findIndex((group) => String(group.groupId) === String(groupId) || String(group.id) === String(groupId));
  if (index === -1) throw new Error("Group was not found.");
  const nextGroups = [...groups];
  nextGroups[index] = {
    ...groups[index],
    ...payload,
    groupId: groups[index].groupId || Number(groupId),
    id: groups[index].id || groups[index].groupId || Number(groupId),
  };
  writeDemoGroups(nextGroups);
}
