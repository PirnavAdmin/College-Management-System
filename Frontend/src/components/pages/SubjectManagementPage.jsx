import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Download, Plus, Save, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./SubjectManagementPage.css";

const MASTER = [];
const TYPES = ["Theory", "Practical", "Language"];
const SUBJECT_CONTEXT = {
  board: "",
  boardId: "",
  group: "",
  groupId: "",
  academicLevel: "",
  academicLevelId: "",
};
const DEFAULT = [];
const DEFAULT_BIPC_SUBJECTS = [
  ["English", "ENG1", ["Language"], 20, 80, 0, 35],
  ["Telugu", "TEL1", ["Language"], 20, 80, 0, 35],
  ["Sanskrit", "SAN1", ["Language"], 20, 80, 0, 35],
  ["Physics", "PHY1", ["Theory", "Practical"], 20, 50, 30, 35],
  ["Chemistry", "CHE1", ["Theory", "Practical"], 20, 50, 30, 35],
  ["Botany", "BOT1", ["Theory", "Practical"], 20, 50, 30, 35],
  ["Zoology", "ZOO1", ["Theory", "Practical"], 20, 50, 30, 35],
];
const defaultSubjectsForContext = (context) => {
  const group = String(context?.group ?? "").trim().toLowerCase();
  if (group !== "bipc") return [];

  return DEFAULT_BIPC_SUBJECTS.map(([subjectName, subjectCode, components, internalMarks, externalMarks, practicalMarks, passingMarks]) => ({
    id: `new-default-${subjectCode}`,
    subjectName,
    subjectCode,
    components,
    internalMarks,
    externalMarks,
    practicalMarks,
    passingMarks,
    configured: true,
    ...context,
  }));
};
const groupContext = (group) => ({
  boardId: group?.boardId ?? group?.BoardId ?? "",
  board: group?.boardName ?? group?.BoardName ?? "",
  groupId: group?.groupId ?? group?.GroupId ?? group?.id ?? group?.Id ?? "",
  group: group?.groupName ?? group?.GroupName ?? group?.name ?? group?.Name ?? "",
  academicLevelId: group?.academicLevelId ?? group?.AcademicLevelId ?? "",
  academicLevel: group?.academicLevelName ?? group?.AcademicLevelName ?? "",
});
const itemsFromResponse = (data) => {
  const body = data?.data ?? data;
  return Array.isArray(body) ? body : body?.items ?? body?.records ?? body?.results ?? body?.boards ?? body?.data ?? body?.$values ?? [];
};
const academicLevelsForBoard = (board) => {
  if (!board) return [];

  const levelIds = board.academicLevelIds ?? board.AcademicLevelIds ?? [];
  const levelNames = board.academicLevelNames ?? board.AcademicLevelNames ??
    board.academicLevels ?? board.AcademicLevels ?? [];

  if (Array.isArray(levelIds) && levelIds.length) {
    return levelIds.map((levelId, index) => {
      const level = typeof levelNames[index] === "object" ? levelNames[index] : null;
      return {
        value: levelId ?? level?.academicLevelId ?? level?.AcademicLevelId ?? level?.id ?? level?.Id,
        label: level?.levelName ?? level?.LevelName ?? level?.academicLevelName ?? level?.AcademicLevelName ?? level?.name ?? level?.Name ?? levelNames[index],
      };
    }).filter((level) => level.value != null && level.label);
  }

  return Array.isArray(levelNames)
    ? levelNames.map((level) => ({
      value: level?.academicLevelId ?? level?.AcademicLevelId ?? level?.id ?? level?.Id,
      label: level?.levelName ?? level?.LevelName ?? level?.academicLevelName ?? level?.AcademicLevelName ?? level?.name ?? level?.Name,
    })).filter((level) => level.value != null && level.label)
    : [];
};
const apiRecord = (record) => {
  const types = componentsOf(record);
  const subjectType = types.includes("Language")
    ? "Language"
    : types.length === 2 ? "Theory + Practical" : types[0] || "";
  const id = (key) => record[`${key}Id`] ?? record[`${key[0].toUpperCase()}${key.slice(1)}Id`];
  return {
    boardId: Number(id("board")) || 0,
    groupId: Number(id("group")) || 0,
    academicLevelId: Number(id("academicLevel")) || 0,
    subjectName: record.subjectName,
    subjectCode: record.subjectCode,
    subjectType,
    theory: types.includes("Theory") || types.includes("Language"),
    practical: types.includes("Practical"),
    language: types.includes("Language"),
    elective: false,
    internalMarks: Number(record.internalMarks || 0),
    practicalMarks: Number(record.practicalMarks || 0),
    externalMarks: Number(record.externalMarks || 0),
    totalMarks: total(record),
    passingMarks: Number(record.passingMarks || 0),
    isActive: record.isActive ?? record.IsActive ?? true,
  };
};
const master = (id) =>
  MASTER.find((x) => x.subjectId === id) || { subjectName: "Select Subject", subjectCode: "—" };
const total = (x) =>
  Number(x.internalMarks || 0) + Number(x.externalMarks || 0) + Number(x.practicalMarks || 0);
const subjectDetails = (record) => {
  const existing = master(record?.subjectId);
  return {
    subjectName: record?.subjectName?.trim() || existing.subjectName,
    subjectCode: record?.subjectCode?.trim() || existing.subjectCode,
  };
};
const componentsOf = (record) => (Array.isArray(record?.components) ? record.components : []);
const subjectTypesFrom = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => subjectTypesFrom(
      typeof item === "string" ? item : item?.name ?? item?.type ?? item?.subjectType ?? item?.SubjectType,
    ));
  }
  if (typeof value !== "string") return [];
  const normalized = value.toLowerCase();
  return TYPES.filter((type) => normalized.includes(type.toLowerCase()));
};
const cleanSubjectTypes = (types) => {
  const selected = [...new Set(types.filter((type) => TYPES.includes(type)))];

  // Preserve the Theory/Practical pairing when cleaning legacy invalid data.
  return selected.includes("Language") && selected.some((type) => type !== "Language")
    ? selected.filter((type) => type !== "Language")
    : selected;
};
const subjectTypeError = (types) => {
  if (!types.length) return "Select at least one subject type.";
  if (types.some((type) => !TYPES.includes(type))) return "Select a valid subject type.";
  if (types.includes("Language") && types.some((type) => type !== "Language")) {
    return "Language cannot be combined with Theory or Practical.";
  }
  return "";
};
const normalize = (records) => {
  if (!Array.isArray(records)) return DEFAULT;

  return records.map((record, index) => {
    const fallback = records.length === DEFAULT.length ? DEFAULT[index] : null;
    const subject =
      MASTER.find(
        (item) => item.subjectId === record?.subjectId || item.subjectId === record?.id,
      ) ||
      MASTER.find(
        (item) =>
          item.subjectName === record?.subjectName || item.subjectCode === record?.subjectCode,
      ) ||
      (fallback ? MASTER.find((item) => item.subjectId === fallback.subjectId) : null);

    return {
      ...record,
      id: record?.id ?? record?.subjectId ?? record?.SubjectId ?? record?.Id ?? `subject-${index}`,
      subjectId: subject?.subjectId || record?.subjectId || record?.SubjectId || record?.id || "",
      subjectName: record?.subjectName || record?.SubjectName || subject?.subjectName || fallback?.subjectName || "",
      subjectCode: record?.subjectCode || record?.SubjectCode || subject?.subjectCode || fallback?.subjectCode || "",
      components: cleanSubjectTypes(
        subjectTypesFrom(
          record?.components ?? record?.subjectTypes ?? record?.subjectType ?? record?.SubjectType ?? record?.type ?? record?.Type,
        ).length
          ? subjectTypesFrom(
            record?.components ?? record?.subjectTypes ?? record?.subjectType ?? record?.SubjectType ?? record?.type ?? record?.Type,
          )
          : componentsOf(fallback),
      ),
      internalMarks: record?.internalMarks ?? record?.InternalMarks ?? record?.internal ?? record?.Internal ?? fallback?.internalMarks ?? 0,
      externalMarks: record?.externalMarks ?? record?.ExternalMarks ?? record?.external ?? record?.External ?? fallback?.externalMarks ?? 0,
      practicalMarks: record?.practicalMarks ?? record?.PracticalMarks ?? record?.practical ?? record?.Practical ?? fallback?.practicalMarks ?? 0,
      passingMarks: record?.passingMarks ?? record?.PassingMarks ?? record?.passing ?? record?.Passing ?? fallback?.passingMarks ?? 0,
      configured: record?.configured ?? record?.isConfigured ?? record?.IsConfigured ??
        Number(record?.totalMarks ?? record?.TotalMarks ?? 0) > 0,
    };
  });
};
export const pageConfig = { title: "Subject Management", rows: [], fields: [] };
export default function SubjectManagementPage({ screen = "list" }) {
  const nav = useNavigate(),
    location = useLocation(),
    [records, setRecords] = useState(() => normalize(DEFAULT)),
    [toast, setToast] = useState(""),
    [apiAvailable, setApiAvailable] = useState(false),
    [loading, setLoading] = useState(false);
  const subjectRequestId = useRef(0);
  const loadSubjects = useCallback(async (subjectContext) => {
    const requestId = ++subjectRequestId.current;
    if (!subjectContext?.boardId || !subjectContext?.groupId || !subjectContext?.academicLevelId) {
      // The landing view keeps Board unselected but still shows recently
      // added subjects. Once a group is chosen, use its scoped collection.
      try {
        const response = await apiClient.get(
          subjectContext?.groupId ? apiEndpoints.subjects.getByGroup(subjectContext.groupId) : apiEndpoints.subjects.getAll,
        );
        if (requestId !== subjectRequestId.current) return;
        setRecords(normalize(itemsFromResponse(response.data)));
        setApiAvailable(true);
      } catch (error) {
        if (requestId === subjectRequestId.current) {
          setRecords([]);
          setApiAvailable(false);
          setToast(getApiErrorMessage(error) || "Unable to load subjects.");
        }
      }
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.subjects.context, {
        params: {
          boardId: subjectContext.boardId,
          groupId: subjectContext.groupId,
          academicLevelId: subjectContext.academicLevelId,
        },
      });
      if (requestId !== subjectRequestId.current) return;
      const responseRecords = itemsFromResponse(response.data).map((record) => ({
        ...record,
        boardId: subjectContext.boardId,
        groupId: subjectContext.groupId,
        academicLevelId: subjectContext.academicLevelId,
      }));
      setRecords(normalize(responseRecords.length ? responseRecords : defaultSubjectsForContext(subjectContext)));
      setApiAvailable(true);
    } catch (error) {
      if (requestId !== subjectRequestId.current) return;
      setRecords([]);
      setApiAvailable(false);
      setToast(getApiErrorMessage(error) || "Unable to load subjects for the selected context.");
    } finally {
      if (requestId === subjectRequestId.current) setLoading(false);
    }
  }, []);
  const save = async (next, msg) => {
    const normalizedRecords = normalize(next);
    if (!apiAvailable) {
      setToast("Subjects could not be loaded for this context. Please retry before saving.");
      return false;
    }
    const missingContext = normalizedRecords.some((record) => {
      if (!String(record.id).startsWith("new-")) return false;
      const payload = apiRecord(record);
      return !payload.boardId || !payload.groupId || !payload.academicLevelId;
    });
    if (missingContext) {
      setToast("Select a Board, Group, and Academic Level before saving subjects.");
      return false;
    }
    const previous = new Map(records.map((record) => [String(record.id), record]));
    const nextIds = new Set(normalizedRecords.map((record) => String(record.id)));
    try {
      await Promise.all([
        ...normalizedRecords.flatMap((record) => {
          const existing = previous.get(String(record.id));
          if (!existing || String(record.id).startsWith("new-")) {
            return [apiClient.post(apiEndpoints.subjects.create, apiRecord(record))];
          }
          return JSON.stringify(apiRecord(existing)) === JSON.stringify(apiRecord(record))
            ? []
            : [apiClient.put(apiEndpoints.subjects.update(record.id), apiRecord(record))];
        }),
        ...records
          .filter((record) => !nextIds.has(String(record.id)))
          .map((record) => apiClient.delete(apiEndpoints.subjects.delete(record.id))),
      ]);
    } catch (error) {
      setToast(getApiErrorMessage(error) || "The server could not save this subject. Please try again.");
      return false;
    }
    setRecords(normalizedRecords);
    setToast(msg);
    return true;
  };
  let page =
    screen === "assign" ? (
      <Assign
        records={records}
        context={{ ...SUBJECT_CONTEXT, ...location.state?.subjectContext }}
        cancel={() => nav("/dashboard/subjects")}
        save={async (next) => {
          if (await save(next, "Subjects saved")) {
            nav("/dashboard/subjects");
          }
        }}
      />
    ) : (
      <List
        records={records}
        context={SUBJECT_CONTEXT}
        loading={loading}
        loadSubjects={loadSubjects}
        assign={(subjectContext) => nav("/dashboard/subjects/assign", {
          state: {
            subjectContext: {
              board: subjectContext.board,
              boardId: subjectContext.boardId,
              group: subjectContext.group,
              groupId: subjectContext.groupId,
              academicLevel: subjectContext.academicLevel,
              academicLevelId: subjectContext.academicLevelId,
            },
          },
        })}
      />
    );
  return (
    <>
      {page}
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
function List({ records, context, assign, loading, loadSubjects }) {
  const [q, setQ] = useState("");
  const [openingAssign, setOpeningAssign] = useState(false);
  const [selectedContext, setSelectedContext] = useState(context);
  const [boards, setBoards] = useState([]);
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get(apiEndpoints.boards.getAll),
      apiClient.get(apiEndpoints.groups.getAll),
    ]).then(([boardResponse, groupResponse]) => {
      if (!active) return;
      const nextBoards = itemsFromResponse(boardResponse.data);
      const nextGroups = itemsFromResponse(groupResponse.data);
      setBoards(nextBoards);
      setGroups(nextGroups);
    }).catch((error) => setToast(getApiErrorMessage(error) || "Unable to load boards and groups."));
    return () => { active = false; };
  }, []);
  const academicLevels = useMemo(() => academicLevelsForBoard(
    boards.find((board) => String(board.boardId ?? board.BoardId ?? board.id ?? board.Id) === String(selectedContext.boardId)),
  ), [boards, selectedContext.boardId]);
  useEffect(() => {
    loadSubjects({
      boardId: selectedContext.boardId,
      board: selectedContext.board,
      groupId: selectedContext.groupId,
      group: selectedContext.group,
      academicLevelId: selectedContext.academicLevelId,
      academicLevel: selectedContext.academicLevel,
    });
  }, [
    loadSubjects,
    selectedContext.boardId,
    selectedContext.board,
    selectedContext.groupId,
    selectedContext.group,
    selectedContext.academicLevelId,
    selectedContext.academicLevel,
  ]);
  const rows = useMemo(
    () =>
      records
        .filter((x) =>
          `${subjectDetails(x).subjectName} ${subjectDetails(x).subjectCode}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        ),
    [records, q],
  );
  return (
    <DashboardLayout
      title="Subject Management"
      subtitle="Manage subjects assigned to groups and academic levels."
      breadcrumb={["Academics"]}
    >
      <div className="subject-screen">
        <Table
          rows={rows}
          context={selectedContext}
          setContext={setSelectedContext}
          boards={boards}
          groups={groups}
          academicLevels={academicLevels}
          loading={loading}
          query={q}
          setQuery={setQ}
          openingAssign={openingAssign}
          assignDisabled={loading || openingAssign || !selectedContext.groupId || !selectedContext.academicLevelId}
          onAssign={() => {
            setOpeningAssign(true);
            window.setTimeout(() => assign(selectedContext), 120);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
function Assign({ records, context, cancel, save }) {
  const [rows, setRows] = useState(records);
  const [errors, setErrors] = useState({});
  const [typeMessage, setTypeMessage] = useState("");
  const [configurationMessage, setConfigurationMessage] = useState("");
  const [configureSubject, setConfigureSubject] = useState(null);
  const [saving, setSaving] = useState(false);
  const blankRow = () => ({
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    subjectId: "",
    subjectName: "",
    subjectCode: "",
    components: [],
    internalMarks: 0,
    externalMarks: 0,
    practicalMarks: 0,
    passingMarks: 0,
    configured: false,
    ...context,
  });
  const validateRows = (items, requireConfigured) => {
    const nextErrors = {};
    const names = new Set();
    const codes = new Set();
    items.forEach((row) => {
      const rowErrors = {};
      const name = row.subjectName?.trim();
      const code = row.subjectCode?.trim();
      if (!name) rowErrors.subjectName = "Subject name is required.";
      if (!code) rowErrors.subjectCode = "Subject code is required.";
      const typeError = subjectTypeError(componentsOf(row));
      if (typeError) rowErrors.components = typeError;
      if (name && names.has(name.toLowerCase())) rowErrors.subjectName = "Duplicate subject name.";
      if (code && codes.has(code.toLowerCase())) rowErrors.subjectCode = "Duplicate subject code.";
      if (name) names.add(name.toLowerCase());
      if (code) codes.add(code.toLowerCase());
      if (requireConfigured && !row.configured)
        rowErrors.configured = "Configure marks before saving.";
      if (Object.keys(rowErrors).length) nextErrors[row.id] = rowErrors;
    });
    return nextErrors;
  };
  const update = (id, key, value) =>
    setRows((items) =>
      items.map((x) => (x.id === id ? { ...x, [key]: value, configured: false } : x)),
    );
  const clearTypeError = (id) =>
    setErrors((current) => {
      if (!current[id]?.components) return current;
      const { components: _typeError, ...remainingRowErrors } = current[id];
      return {
        ...current,
        [id]: Object.keys(remainingRowErrors).length ? remainingRowErrors : undefined,
      };
    });
  const toggle = (row, component) => {
    const components = componentsOf(row);
    let nextComponents;
    if (components.includes(component)) {
      nextComponents = components.filter((type) => type !== component);
    } else if (component === "Language") {
      nextComponents = ["Language"];
    } else {
      nextComponents = [...components.filter((type) => type !== "Language"), component];
    }

    update(row.id, "components", nextComponents);
    clearTypeError(row.id);
    setTypeMessage("");
  };
  const add = () => setRows((items) => [...items, blankRow()]);
  const removeRow = (id) => {
    setRows((items) => items.filter((row) => row.id !== id));
    setErrors((current) => {
      const { [id]: _removed, ...remaining } = current;
      return remaining;
    });
  };
  const configureRow = (row) => {
    const nextErrors = validateRows(rows, false);
    setErrors(nextErrors);
    if (nextErrors[row.id]) {
      if (nextErrors[row.id].components) setTypeMessage(nextErrors[row.id].components);
      return;
    }
    setConfigureSubject(row);
  };
  const saveAssignments = async () => {
    const nextErrors = validateRows(rows, true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const typeError = Object.values(nextErrors).find((rowErrors) => rowErrors.components)
        ?.components;
      if (typeError) setTypeMessage(typeError);
      return;
    }
    setSaving(true);
    try {
      await save(rows);
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardLayout
      title="Assign Subjects"
      subtitle="Assign reusable subjects and subject types to a group."
      breadcrumb={["Academics", "Subject Management", "Assign Subjects"]}
    >
      <div className="subject-screen">
        <section className="subject-table-card assign-card">
          <div className="subject-table-head">
            <div className="assign-table-context">
              <ContextBadges context={context} />
            </div>
            <span>{rows.length} Subjects Assigned</span>
          </div>
          <div className="assignment-head">
            <span>Subject Name <RequiredMark /></span>
            <span>Subject Code <RequiredMark /></span>
            <span>Subject Type <RequiredMark /></span>
            <span>Action</span>
          </div>
          {rows.map((row) => {
            const components = componentsOf(row);
            const rowErrors = errors[row.id] || {};
            return (
              <div className="assignment-row" key={row.id}>
                <label className="assignment-field">
                  <input
                    value={row.subjectName}
                    onChange={(e) => update(row.id, "subjectName", e.target.value)}
                    placeholder="Subject name"
                  />
                  {rowErrors.subjectName && <small>{rowErrors.subjectName}</small>}
                </label>
                <label className="assignment-field">
                  <input
                    value={row.subjectCode}
                    onChange={(e) => update(row.id, "subjectCode", e.target.value)}
                    placeholder="Subject code"
                  />
                  {rowErrors.subjectCode && <small>{rowErrors.subjectCode}</small>}
                </label>
                <div className="component-picker assignment-components">
                  {TYPES.map((c) => (
                    <label key={c}>
                      <input
                        type="checkbox"
                        checked={components.includes(c)}
                        onChange={() => toggle(row, c)}
                      />
                      {c}
                    </label>
                  ))}
                </div>
                <div className="subject-row-actions">
                  <button
                    className="cms-btn cms-btn-primary subject-configure-button"
                    disabled={
                      !row.subjectName?.trim() || !row.subjectCode?.trim() || !components.length
                    }
                    onClick={() => configureRow(row)}
                  >
                    <span>Configure</span>
                    <span>Marks</span>
                  </button>
                  <button
                    className="subject-new-row-delete"
                    onClick={() => removeRow(row.id)}
                    aria-label={`Remove ${row.subjectName || "subject"}`}
                    title="Remove subject"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                  {rowErrors.configured && <small>{rowErrors.configured}</small>}
                </div>
              </div>
            );
          })}
          <button className="add-subject" onClick={add}>
            <Plus size={15} /> Add Subject
          </button>
          <footer className="assignment-footer">
            <span>{rows.length} Subjects Assigned</span>
            <div>
              <button className="cms-btn cms-btn-ghost" onClick={cancel} disabled={saving}>
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" onClick={saveAssignments} disabled={saving}>
                {saving ? "Saving subjects..." : <><Save size={15} /> Save &amp; Assign Subjects</>}
              </button>
            </div>
          </footer>
        </section>
      </div>
      {configureSubject && (
        <Configure
          item={configureSubject}
          cancel={() => setConfigureSubject(null)}
          save={async (next) => {
            setRows((items) => items.map((row) => (row.id === next.id ? next : row)));
            setConfigureSubject(null);
            setConfigurationMessage("Marks configuration saved.");
          }}
        />
      )}
      <Toast message={typeMessage} type="error" onClose={() => setTypeMessage("")} />
      <Toast message={configurationMessage} onClose={() => setConfigurationMessage("")} />
    </DashboardLayout>
  );
}
function Configure({ item, cancel, save }) {
  const [value, setValue] = useState(item);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef({});
  if (!value) return null;
  const components = cleanSubjectTypes(componentsOf(value));
  const theory = components.some((x) => ["Theory", "Language"].includes(x));
  const practical = components.includes("Practical");
  const applicableFields = [
    ...(theory ? ["internalMarks", "externalMarks"] : []),
    ...(practical ? ["practicalMarks"] : []),
    "passingMarks",
  ];
  const validate = (candidate = value) => {
    const nextErrors = {};
    const checkRequiredMark = (key, label) => {
      const raw = candidate[key];
      const mark = Number(raw);
      if (raw === "" || raw === null || raw === undefined || !Number.isFinite(mark) || mark < 0) {
        nextErrors[key] = `${label} must be a non-negative number.`;
      }
    };

    const typeError = subjectTypeError(componentsOf(candidate));
    if (typeError) nextErrors.form = typeError;
    if (!candidate.subjectName?.trim()) nextErrors.subjectName = "Subject name is required.";
    if (!candidate.subjectCode?.trim()) nextErrors.subjectCode = "Subject code is required.";
    if (theory) {
      checkRequiredMark("internalMarks", "Internal marks");
      checkRequiredMark("externalMarks", "External marks");
    }
    if (practical) checkRequiredMark("practicalMarks", "Practical marks");
    checkRequiredMark("passingMarks", "Passing marks");

    const passingMarks = Number(candidate.passingMarks);
    const totalMarks = total(candidate);
    if (!nextErrors.passingMarks && passingMarks > totalMarks) {
      nextErrors.passingMarks = "Passing marks cannot exceed total marks.";
    }
    if (!nextErrors.form && totalMarks <= 0) {
      nextErrors.form = "Total marks must be greater than zero.";
    }
    return nextErrors;
  };
  const set = (key, nextValue) => {
    const nextValueState = { ...value, [key]: nextValue };
    setValue(nextValueState);
    setTouched((current) => ({ ...current, [key]: true }));
    setErrors(validate(nextValueState));
    setSubmitMessage("");
  };
  const setSubjectDetail = (key, nextValue) => {
    const nextValueState = { ...value, [key]: nextValue };
    setValue(nextValueState);
    setTouched((current) => ({ ...current, [key]: true }));
    setErrors(validate(nextValueState));
    setSubmitMessage("");
  };
  const submit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setTouched(
        Object.fromEntries([...applicableFields, "subjectName", "subjectCode"].map((key) => [key, true])),
      );
      setSubmitMessage("Please fix the highlighted fields before saving.");
      const firstInvalid = applicableFields.find((key) => nextErrors[key]);
      if (firstInvalid) requestAnimationFrame(() => inputRefs.current[firstInvalid]?.focus());
      return;
    }
    setSaving(true);
    try {
      await save({ ...value, configured: true });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title="View / Edit Subject"
      className="subject-config-modal"
      onClose={cancel}
      closeOnOverlay={false}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={cancel} disabled={saving}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving marks..." : <><Save size={16} /> Save Configuration</>}
          </button>
        </>
      }
    >
      <div className="subject-config-modal-summary">
        <div className="subject-edit-fields">
          <label className={`mark-input${touched.subjectName && errors.subjectName ? " has-error" : ""}`}>
            <span>Subject Name <RequiredMark /></span>
            <input
              value={value.subjectName}
              onChange={(event) => setSubjectDetail("subjectName", event.target.value)}
              aria-invalid={Boolean(touched.subjectName && errors.subjectName)}
            />
            {touched.subjectName && errors.subjectName && <small>{errors.subjectName}</small>}
          </label>
          <label className={`mark-input${touched.subjectCode && errors.subjectCode ? " has-error" : ""}`}>
            <span>Subject Code <RequiredMark /></span>
            <input
              value={value.subjectCode}
              onChange={(event) => setSubjectDetail("subjectCode", event.target.value)}
              aria-invalid={Boolean(touched.subjectCode && errors.subjectCode)}
            />
            {touched.subjectCode && errors.subjectCode && <small>{errors.subjectCode}</small>}
          </label>
        </div>
        <p><Badges components={components} /></p>
        {value.group && <small>Group: {value.group}</small>}
      </div>
      <section className="subject-config-modal-marks">
        <h4>Marks Configuration</h4>
          {(submitMessage || errors.form) && (
            <p className="marks-validation-message">{submitMessage || errors.form}</p>
          )}
          <div className="marks-inputs">
            {theory && (
              <>
                <Mark
                  label="Internal Marks"
                  required
                  value={value.internalMarks}
                  change={(v) => set("internalMarks", v)}
                  error={touched.internalMarks ? errors.internalMarks : ""}
                  inputRef={(element) => {
                    inputRefs.current.internalMarks = element;
                  }}
                />
                <Mark
                  label="External Marks"
                  required
                  value={value.externalMarks}
                  change={(v) => set("externalMarks", v)}
                  error={touched.externalMarks ? errors.externalMarks : ""}
                  inputRef={(element) => {
                    inputRefs.current.externalMarks = element;
                  }}
                />
              </>
            )}
            {practical && (
              <Mark
                label="Practical Marks"
                required
                value={value.practicalMarks}
                change={(v) => set("practicalMarks", v)}
                error={touched.practicalMarks ? errors.practicalMarks : ""}
                inputRef={(element) => {
                  inputRefs.current.practicalMarks = element;
                }}
              />
            )}
            <Mark
              label="Passing Marks"
              required
              value={value.passingMarks}
              change={(v) => set("passingMarks", v)}
              error={touched.passingMarks ? errors.passingMarks : ""}
              inputRef={(element) => {
                inputRefs.current.passingMarks = element;
              }}
            />
            <label className="mark-input">
              <span>Total Marks</span>
              <input value={total(value)} readOnly />
            </label>
          </div>
      </section>
    </Modal>
  );
}
function Table({ rows, context, setContext, boards, groups, academicLevels, loading, query, setQuery, openingAssign, assignDisabled, onAssign }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [query, rows.length]);
  const applyGroupContext = (group) => {
    if (!group) return;
    // Group metadata may contain a default academic level, but the level is
    // intentionally a manual filter on this screen.
    setContext({ ...groupContext(group), academicLevelId: "", academicLevel: "" });
  };
  return (
    <section className="subject-table-card">
      <div className="subject-table-toolbar">
        <div className="subject-search">
          <div>
            <Search size={16} />
            <input aria-label="Search subject or code" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject / code" />
          </div>
        </div>
        <div className="subject-context-controls">
          <ContextSelect
            label="Board"
            value={context.boardId}
            options={boards.map((board) => ({
              value: board.boardId ?? board.BoardId ?? board.id ?? board.Id,
              label: board.boardName ?? board.BoardName ?? board.name ?? board.Name,
            }))}
            onChange={(boardId) => {
              const board = boards.find((item) => String(item.boardId ?? item.BoardId ?? item.id ?? item.Id) === String(boardId));
              setContext({
                boardId,
                board: board?.boardName ?? board?.BoardName ?? board?.name ?? board?.Name ?? "",
                groupId: "",
                group: "",
                academicLevelId: "",
                academicLevel: "",
              });
            }}
          />
          <ContextSelect
            label="Group"
            value={context.groupId}
            options={groups
              .filter((group) => !context.boardId || String(group.boardId ?? group.BoardId) === String(context.boardId))
              .map((group) => ({
                value: group.groupId ?? group.GroupId ?? group.id ?? group.Id,
                label: group.groupName ?? group.GroupName ?? group.name ?? group.Name,
              }))}
            onChange={(groupId) => {
              const group = groups.find((item) => String(item.groupId ?? item.GroupId ?? item.id ?? item.Id) === String(groupId));
              applyGroupContext(group);
            }}
          />
          <ContextSelect
            label="Academic Level"
            value={context.academicLevelId}
            options={academicLevels}
            onChange={(academicLevelId) => {
              const academicLevel = academicLevels.find((level) => String(level.value) === String(academicLevelId));
              setContext((current) => ({
                ...current,
                academicLevelId,
                academicLevel: academicLevel?.label || "",
              }));
            }}
          />
        </div>
        <div className="subject-toolbar-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            className={`cms-btn cms-btn-primary${openingAssign ? " is-loading" : ""}`}
            disabled={assignDisabled}
            onClick={onAssign}
          >
            {openingAssign ? <><span className="subject-btn-spinner" /> Opening Assign Subjects...</> : <><Plus size={16} /> Assign Subjects</>}
          </button>
        </div>
      </div>
      <div className="subject-table-head subject-table-title-row">
        <h2>Assigned Subjects</h2>
        <span>{rows.length} subjects</span>
      </div>
      <div className="subject-table-scroll">
        {loading ? <Loader /> : <table className="subject-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subject Name</th>
              <th>Subject Code</th>
              <th>Subject Type</th>
              <th>Total Marks</th>
              <th>Passing Marks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="7"><div className="cms-empty">No subjects are assigned to this context.</div></td></tr>
            ) : pageRows.map((x, i) => {
              const s = subjectDetails(x);
              return (
                <tr key={x.id}>
                  <td>{(currentPage - 1) * pageSize + i + 1}</td>
                  <td className="cms-strong">{s.subjectName}</td>
                  <td>{s.subjectCode}</td>
                  <td className="subject-type-text">{componentsOf(x).join(" · ")}</td>
                  <td>{total(x)}</td>
                  <td>{x.passingMarks}</td>
                  <td>
                    <span className={`subject-status ${x.configured ? "configured" : "pending"}`}>
                      {x.configured ? (
                        <>
                          <Check size={14} />
                          Configured
                        </>
                      ) : (
                        "Not Configured"
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
      {!loading && <footer className="subject-table-pagination">
        <span>
          Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, rows.length)} of {rows.length} subjects
        </span>
        <div>
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Prev</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              className={number === currentPage ? "is-active" : ""}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </footer>}
    </section>
  );
}
function ContextBadges({ context }) {
  return (
    <div className="subject-context-badges" aria-label="Selected academic context">
      {context.board && <span><b>Board</b>{context.board}</span>}
      <span><b>Group</b>{context.group}</span>
      <span><b>Academic Level</b>{context.academicLevel}</span>
    </div>
  );
}
function ContextSelect({ label, value, options, onChange }) {
  return (
    <div className="subject-context-select">
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label}</option>
        {options.map((option) => {
          const valueOption = typeof option === "object" ? option.value : option;
          const labelOption = typeof option === "object" ? option.label : option;
          return <option key={valueOption} value={valueOption}>{labelOption}</option>;
        })}
      </select>
    </div>
  );
}
function RequiredMark() {
  return <span className="subject-required-mark" aria-hidden="true">*</span>;
}
function Mark({ label, value, change, error, inputRef, required = false }) {
  const errorId = `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-error`;
  return (
    <label className={`mark-input${error ? " has-error" : ""}`}>
      <span>{label}{required && <> <RequiredMark /></>}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => change(e.target.value)}
        ref={inputRef}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}
function Badges({ components = [] }) {
  return (
    <span className="component-badges">
      {componentsOf({ components }).map((x) => (
        <span className={`subject-tag type component-${x.toLowerCase()}`} key={x}>
          {x}
        </span>
      ))}
    </span>
  );
}
