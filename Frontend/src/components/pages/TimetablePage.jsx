import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./TimetablePage.css";

const EMPTY = {
  boardId: "",
  academicYearId: "",
  academicLevelId: "",
  groupId: "",
  programId: "",
  sectionId: "",
};
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const WORKING_DAY_OPTIONS = DEFAULT_WORKING_DAYS.map((value) => ({
  value,
  shortLabel: DAYS[value].slice(0, 3),
}));
const list = (x) => {
  const value = Array.isArray(x)
    ? x
    : (x?.data ?? x?.items ?? x?.result ?? x?.results ?? x?.programs ?? x?.sections ?? []);
  return Array.isArray(value) ? value : (Array.isArray(value?.$values) ? value.$values : []);
};
const pick = (x, ...keys) =>
  keys
    .map((key) => x?.[key])
    .find((value) => value !== undefined && value !== null && value !== "");
const optionize = (x, ids, labels) =>
  list(x)
    .map((raw) => ({
      id: String(pick(raw, ...ids) ?? ""),
      name: String(pick(raw, ...labels) ?? ""),
      raw,
    }))
    .filter((item) => item.id && item.name);
const activeYearId = (payload) => {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : payload
          ? [payload]
          : [];
  const active = entries.find((entry) => {
    const status = pick(entry, "isActive", "IsActive", "active", "Active", "status", "Status");
    return typeof status === "string" ? status.toLowerCase() === "active" : status !== false;
  });
  return pick(active ?? entries[0], "academicYearId", "yearId", "id", "Id");
};
const valuesOf = (value) =>
  Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
const boardMappedOptions = (options, boards, boardId, idKeys, nameKeys) => {
  if (!boardId) return [];
  const direct = options.filter((option) => String(pick(option.raw, "boardId", "BoardId") ?? "") === String(boardId));
  if (direct.length) return direct;
  const board = boards.find((option) => String(option.id) === String(boardId))?.raw;
  if (!board) return [];
  const ids = new Set(idKeys.flatMap((key) => valuesOf(board[key])).map(String));
  if (ids.size) return options.filter((option) => ids.has(String(option.id)));
  const names = new Set(nameKeys.flatMap((key) => valuesOf(board[key])).map((name) => String(name).toLowerCase()));
  return names.size ? options.filter((option) => names.has(option.name.toLowerCase())) : [];
};
const structureId = (x) => pick(x, "id", "Id", "periodStructureId");
const timetableId = (x) => pick(x, "id", "Id", "timetableId");
const toBreakDefinitions = (items) => {
  let precedingPeriod = 0;
  return list(items)
    .sort((left, right) => Number(pick(left, "sequenceOrder") ?? 0) - Number(pick(right, "sequenceOrder") ?? 0))
    .flatMap((entry) => {
      const breakTypeId = pick(entry, "breakTypeId");
      const periodNumber = Number(pick(entry, "periodNumber") ?? 0);
      if (!breakTypeId && periodNumber > 0) precedingPeriod = periodNumber;
      if (breakTypeId === undefined || breakTypeId === null) return [];
      const afterPeriod = Number(pick(entry, "afterPeriod") ?? precedingPeriod);
      const durationMinutes = Number(pick(entry, "durationMinutes"));
      if (!afterPeriod || !durationMinutes) return [];
      return [{
        breakTypeId: Number(breakTypeId),
        afterPeriod,
        durationMinutes,
        customName: pick(entry, "name", "breakTypeName") ?? null,
      }];
    });
};
function Page({ title, subtitle, action, children }) {
  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      breadcrumb={["Academics", "Timetable"]}
      actions={action}
    >
      <main className="ttm-page">{children}</main>
    </DashboardLayout>
  );
}
function Btn({ children, className = "cms-btn cms-btn-primary", ...props }) {
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return (
    <label className="ttm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="ttm-overlay">
      <section className="ttm-modal">
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function ConfirmDelete({ name, busy, error, onCancel, onConfirm }) {
  return (
    <Modal title="Delete Period Structure?" onClose={busy ? () => {} : onCancel}>
      <div className="ttm-modal-body">
        <p>
          Are you sure you want to delete {name ? `“${name}”` : "this period structure"}? This
          action cannot be undone.
        </p>
        {error && <p className="ttm-validation-error">{error}</p>}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Btn>
          <Btn disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}

function useLookups(initial = {}) {
  const [value, setValue] = useState({ ...EMPTY, ...initial });
  const [data, setData] = useState({
    boards: [],
    years: [],
    allYears: [],
    levels: [],
    allLevels: [],
    groups: [],
    programs: [],
    sections: [],
    subjects: [],
    periods: [],
    rooms: [],
  });
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.list),
      apiClient.get(apiEndpoints.academicYears.list),
      apiClient.get(apiEndpoints.boards.academicLevels),
      apiClient.get(apiEndpoints.rooms.getAll),
    ]).then((r) =>
      setData((current) => ({
        ...current,
        boards:
          r[0].status === "fulfilled"
            ? optionize(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"])
            : [],
        years:
          r[1].status === "fulfilled"
            ? optionize(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              )
            : [],
        allYears:
          r[1].status === "fulfilled"
            ? optionize(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              )
            : [],
        levels:
          r[2].status === "fulfilled"
            ? optionize(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["academicLevelName", "levelName", "name", "Name"],
              )
            : [],
        allLevels:
          r[2].status === "fulfilled"
            ? optionize(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["academicLevelName", "levelName", "name", "Name"],
              )
            : [],
        rooms:
          r[3].status === "fulfilled"
            ? optionize(
                r[3].value.data,
                ["roomId", "id", "Id"],
                ["roomName", "name", "Name", "roomCode"],
              )
            : [],
      })),
    );
  }, []);
  useEffect(() => {
    if (!value.boardId) return undefined;
    let cancelled = false;
    apiClient
      .get(apiEndpoints.academicYears.active, { params: { boardId: value.boardId } })
      .then((response) => {
        const yearId = activeYearId(response.data);
        if (!cancelled) {
          const mappedYears = boardMappedOptions(
            data.allYears,
            data.boards,
            value.boardId,
            ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
            ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
          );
          const selectedYear = yearId ? String(yearId) : mappedYears[0]?.id;
          setValue((current) =>
            current.boardId === value.boardId && selectedYear
              ? { ...current, academicYearId: selectedYear, academicLevelId: "", groupId: "", programId: "", sectionId: "" }
              : current,
          );
        }
      })
      .catch(() => {
        const mappedYears = boardMappedOptions(
          data.allYears,
          data.boards,
          value.boardId,
          ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
          ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
        );
        if (!cancelled && mappedYears[0]?.id) {
          setValue((current) =>
            current.boardId === value.boardId
              ? { ...current, academicYearId: mappedYears[0].id, academicLevelId: "", groupId: "", programId: "", sectionId: "" }
              : current,
          );
        }
      });
    return () => { cancelled = true; };
  }, [value.boardId, data.allYears, data.boards]);
  useEffect(() => {
    if (!value.boardId) return;
    apiClient
      .get(apiEndpoints.groups.list, {
        params: {
          boardId: value.boardId,
          academicYearId: value.academicYearId || undefined,
          academicLevelId: value.academicLevelId || undefined,
          isActive: true,
        },
      })
      .then((r) =>
        setData((current) => ({
          ...current,
          years: boardMappedOptions(
            current.allYears,
            current.boards,
            value.boardId,
            ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
            ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
          ),
          levels: boardMappedOptions(
            current.allLevels,
            current.boards,
            value.boardId,
            ["academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds"],
            ["academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames"],
          ),
          groups: optionize(r.data, ["groupId", "id", "Id"], ["groupName", "name", "Name"]),
        })),
      )
      .catch(() => setData((current) => ({ ...current, groups: [] })));
  }, [
    value.boardId,
    value.academicYearId,
    value.academicLevelId,
    data.allYears,
    data.allLevels,
    data.boards,
  ]);
  useEffect(() => {
    if (!value.groupId) return;
    Promise.allSettled([
      apiClient.get(apiEndpoints.groups.programs(value.groupId)),
      value.programId
        ? apiClient.get(apiEndpoints.sections.search, {
            params: {
              BoardId: value.boardId,
              AcademicYearId: value.academicYearId,
              AcademicLevelId: value.academicLevelId,
              GroupId: value.groupId,
              ProgramId: value.programId,
              IsActive: true,
            },
          })
        : Promise.resolve({ data: [] }),
      apiClient.get(apiEndpoints.subjects.context, {
        params: {
          boardId: value.boardId,
          groupId: value.groupId,
          academicLevelId: value.academicLevelId,
        },
      }),
      apiClient.get(apiEndpoints.periods.getAll, {
        params: {
          boardId: value.boardId,
          academicYearId: value.academicYearId,
          academicLevelId: value.academicLevelId,
          groupId: value.groupId,
        },
      }),
    ]).then((r) =>
      setData((current) => ({
        ...current,
        programs:
          r[0].status === "fulfilled"
            ? optionize(r[0].value.data, ["programId", "id", "Id"], ["programName", "name", "Name"])
            : [],
        sections:
          r[1].status === "fulfilled"
            ? optionize(r[1].value.data, ["sectionId", "id", "Id"], ["sectionName", "name", "Name"])
            : [],
        subjects:
          r[2].status === "fulfilled"
            ? optionize(r[2].value.data, ["subjectId", "id", "Id"], ["subjectName", "name", "Name"])
            : [],
        periods:
          r[3].status === "fulfilled"
            ? optionize(r[3].value.data, ["periodId", "id", "Id"], ["periodName", "name", "Name"])
            : [],
      })),
    );
  }, [value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId]);
  const change = (key) => (event) =>
    setValue((current) => {
      const next = event.target.value;
      if (key === "boardId") return { ...EMPTY, boardId: next };
      if (key === "academicYearId")
        return {
          ...current,
          academicYearId: next,
          academicLevelId: "",
          groupId: "",
          programId: "",
          sectionId: "",
        };
      if (key === "academicLevelId")
        return { ...current, academicLevelId: next, groupId: "", programId: "", sectionId: "" };
      if (key === "groupId") return { ...current, groupId: next, programId: "", sectionId: "" };
      if (key === "programId") return { ...current, programId: next, sectionId: "" };
      return { ...current, [key]: next };
    });
  return { value, data, change };
}
function Context({ state, section = true }) {
  const { value, data, change } = state;
  const select = (label, key, values, disabled) => (
    <Field label={label}>
      <select value={value[key]} onChange={change(key)} disabled={disabled}>
        <option value="">Select {label}</option>
        {values.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className="ttm-context">
      {select("Board", "boardId", data.boards)}
      {select("Academic Year", "academicYearId", data.years, !value.boardId)}
      {select("Academic Level", "academicLevelId", data.levels, !value.academicYearId)}
      {select("Group", "groupId", data.groups, !value.academicLevelId)}
      {section && (
        <>
          {select("Programme", "programId", data.programs, !value.groupId)}
          {select("Section", "sectionId", data.sections, !value.programId)}
        </>
      )}
    </div>
  );
}

function StructureForm({ item, close, saved }) {
  const [form, setForm] = useState({
    name: pick(item, "name") ?? "",
    dayStartTime: pick(item, "dayStartTime") ?? "",
    periodDurationMinutes: pick(item, "periodDurationMinutes") ?? "",
    totalTeachingPeriods: pick(item, "totalTeachingPeriods") ?? "",
    isActive: pick(item, "isActive") ?? true,
    breaks: [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [breakTypes, setBreakTypes] = useState([]);
  useEffect(() => {
    apiClient
      .get(apiEndpoints.breakTypes.list)
      .then((response) => setBreakTypes(optionize(response.data, ["id", "breakTypeId", "Id"], ["name", "breakTypeName", "Name"])))
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
    if (!structureId(item)) return;
    apiClient
      .get(apiEndpoints.periodStructures.getById(structureId(item)))
      .then((response) => {
        const detail = response.data;
        const breaks = toBreakDefinitions(detail?.items).map((entry) => ({
          ...entry,
          breakTypeId: String(entry.breakTypeId),
          afterPeriod: String(entry.afterPeriod),
          durationMinutes: String(entry.durationMinutes),
        }));
        setForm((current) => ({ ...current, breaks }));
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
  }, [item]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        dayStartTime: /^\d{2}:\d{2}$/.test(form.dayStartTime)
          ? `${form.dayStartTime}:00`
          : form.dayStartTime,
        periodDurationMinutes: Number(form.periodDurationMinutes),
        totalTeachingPeriods: Number(form.totalTeachingPeriods),
        breaks: form.breaks.map((breakItem) => ({
          breakTypeId: Number(breakItem.breakTypeId),
          afterPeriod: Number(breakItem.afterPeriod),
          durationMinutes: Number(breakItem.durationMinutes),
          customName: breakItem.customName || null,
        })),
      };
      structureId(item)
        ? await apiClient.put(apiEndpoints.periodStructures.update(structureId(item)), payload)
        : await apiClient.post(apiEndpoints.periodStructures.create, payload);
      saved();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const set = (key) => (e) => setForm((x) => ({ ...x, [key]: e.target.value }));
  return (
    <Modal
      title={structureId(item) ? "Edit Period Structure" : "Create Period Structure"}
      onClose={close}
    >
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          <Field label="Structure Name">
            <input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Day Start Time">
            <input type="time" value={form.dayStartTime} onChange={set("dayStartTime")} />
          </Field>
          <Field label="Period Duration (minutes)">
            <input
              type="number"
              min="1"
              value={form.periodDurationMinutes}
              onChange={set("periodDurationMinutes")}
            />
          </Field>
          <Field label="Teaching Periods">
            <input
              type="number"
              min="1"
              value={form.totalTeachingPeriods}
              onChange={set("totalTeachingPeriods")}
            />
          </Field>
        </div>
        <div className="ttm-break-head">
          <b>Break configuration</b>
          <Btn
            className="cms-btn cms-btn-ghost"
            disabled={!breakTypes.length}
            onClick={() =>
              setForm((current) => ({
                ...current,
                breaks: [
                  ...current.breaks,
                  { breakTypeId: String(breakTypes[0]?.id ?? ""), afterPeriod: "", durationMinutes: "", customName: "" },
                ],
              }))
            }
          >
            + Add Break
          </Btn>
        </div>
        {form.breaks.map((breakItem, index) => (
          <div className="ttm-break-row" key={`${breakItem.breakTypeId}-${index}`}>
            <select
              value={breakItem.breakTypeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  breaks: current.breaks.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, breakTypeId: event.target.value } : entry,
                  ),
                }))
              }
            >
              <option value="">Select break type</option>
              {breakTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <select
              value={breakItem.afterPeriod}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  breaks: current.breaks.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, afterPeriod: event.target.value } : entry,
                  ),
                }))
              }
            >
              <option value="">After period</option>
              {Array.from({ length: Number(form.totalTeachingPeriods) || 0 }, (_, number) => (
                <option key={number + 1} value={number + 1}>After P{number + 1}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              aria-label="Break duration in minutes"
              placeholder="Minutes"
              value={breakItem.durationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  breaks: current.breaks.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, durationMinutes: event.target.value } : entry,
                  ),
                }))
              }
            />
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, breaks: current.breaks.filter((_, entryIndex) => entryIndex !== index) }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        {error && <p className="ttm-validation-error">{error}</p>}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>
            Cancel
          </Btn>
          <Btn
            disabled={
              saving ||
              !form.name ||
              !form.dayStartTime ||
              !form.periodDurationMinutes ||
              !form.totalTeachingPeriods
            }
            onClick={save}
          >
            {saving ? "Saving…" : "Save Structure"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}

function StructurePreview({ item, close, notify }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const detail = await apiClient.get(apiEndpoints.periodStructures.getById(structureId(item)));
        const breaks = toBreakDefinitions(detail.data?.items);
        const response = await apiClient.post(apiEndpoints.periodStructures.preview, {
          dayStartTime: pick(item, "dayStartTime"),
          periodDurationMinutes: Number(pick(item, "periodDurationMinutes")),
          totalTeachingPeriods: Number(pick(item, "totalTeachingPeriods")),
          breaks,
        });
        setPreview(response.data);
      } catch (requestError) {
        const message = getApiErrorMessage(requestError);
        setError(message);
        notify(message);
      }
    };
    loadPreview();
  }, [item, notify]);
  return (
    <Modal title={`Preview: ${pick(item, "name")}`} onClose={close}>
      <div className="ttm-modal-body">
        {error ? <p className="ttm-validation-error">{error}</p> : null}
        {!preview && !error ? <p>Loading preview…</p> : null}
        {preview?.timeline?.length ? (
          <div className="ttm-period-list">
            {preview.timeline.map((slot) => (
              <div className={slot.isBreak ? "break" : ""} key={slot.sequenceOrder}>
                <b>{slot.slotName ?? `Period ${slot.periodNumber}`}</b>
                <span>{slot.startTime} – {slot.endTime}</span>
              </div>
            ))}
          </div>
        ) : null}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" onClick={close}>Close</Btn>
        </footer>
      </div>
    </Modal>
  );
}

function AssignStructureForm({ item, close, assigned, notify }) {
  const state = useLookups();
  const { value, data, change } = state;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ready = value.boardId && value.academicYearId && value.academicLevelId && value.groupId;
  const assign = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.post(apiEndpoints.periodStructures.assign(structureId(item)), {
        periodStructureId: Number(structureId(item)),
        boardId: Number(value.boardId),
        academicYearId: Number(value.academicYearId),
        academicLevelId: Number(value.academicLevelId),
        groupId: Number(value.groupId),
        isActive: true,
      });
      assigned(value);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notify(message);
    } finally {
      setSaving(false);
    }
  };
  const select = (label, key, values, disabled) => (
    <Field label={label}>
      <select value={value[key]} onChange={change(key)} disabled={disabled}>
        <option value="">Select {label}</option>
        {values.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </select>
    </Field>
  );
  return (
    <Modal title="Assign Structure to Group" onClose={saving ? () => {} : close}>
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          {select("Board", "boardId", data.boards)}
          {select("Academic Year", "academicYearId", data.years, true)}
          {select("Academic Level", "academicLevelId", data.levels, !value.academicYearId)}
          {select("Group", "groupId", data.groups, !value.academicLevelId)}
        </div>
        <Field label="Period Structure">
          <input value={pick(item, "name") ?? ""} readOnly />
        </Field>
        {error ? <p className="ttm-validation-error">{error}</p> : null}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>Cancel</Btn>
          <Btn disabled={!ready || saving} onClick={assign}>
            {saving ? "Assigning…" : "Assign & Continue"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}
function Structures({ notify }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [item, setItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();
  const load = () =>
    apiClient
      .get(apiEndpoints.periodStructures.list)
      .then((r) => setItems(list(r.data)))
      .catch((e) => notify(getApiErrorMessage(e)));
  useEffect(() => {
    load();
  }, []);
  const remove = async () => {
    if (deleting || !item) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete(apiEndpoints.periodStructures.delete(structureId(item)));
      setModal(null);
      notify("Period structure deleted.");
      load();
    } catch (e) {
      setDeleteError(getApiErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Page
      title="Period Structures"
      subtitle="Manage reusable schedules for groups."
      action={
        <Btn onClick={() => { setItem(null); setModal("form"); }}>
          + Create Structure
        </Btn>
      }
    >
      <section className="ttm-card">
        {!items.length ? (
          <p className="ttm-empty">No period structures are available.</p>
        ) : (
          <table className="cms-table ttm-table">
            <thead>
              <tr>
                <th>Structure Name</th>
                <th>Periods</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={structureId(row)}>
                  <td>
                    <b>{pick(row, "name")}</b>
                  </td>
                  <td>{pick(row, "totalTeachingPeriods")}</td>
                  <td>{pick(row, "periodDurationMinutes")} min</td>
                  <td>
                    <span className="ttm-badge">
                      {pick(row, "isActive") ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="ttm-actions">
                    <button
                      onClick={() => {
                        setItem(row);
                        setModal("form");
                      }}
                    >
                      Edit
                    </button>
                    <button onClick={() => { setItem(row); setModal("preview"); }}>Preview</button>
                    <button onClick={() => { setItem(row); setModal("assign"); }}>Assign</button>
                    <button
                      onClick={async () => {
                        try {
                          const detail = await apiClient.get(apiEndpoints.periodStructures.getById(structureId(row)));
                          const breaks = toBreakDefinitions(detail.data?.items);
                          await apiClient.put(apiEndpoints.periodStructures.update(structureId(row)), {
                            name: pick(row, "name"),
                            dayStartTime: pick(row, "dayStartTime"),
                            periodDurationMinutes: Number(pick(row, "periodDurationMinutes")),
                            totalTeachingPeriods: Number(pick(row, "totalTeachingPeriods")),
                            breaks,
                            isActive: !pick(row, "isActive"),
                          });
                          notify(`Period structure ${pick(row, "isActive") ? "deactivated" : "activated"}.`);
                          load();
                        } catch (requestError) {
                          notify(getApiErrorMessage(requestError));
                        }
                      }}
                    >
                      {pick(row, "isActive") ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        setItem(row);
                        setDeleteError("");
                        setModal("delete");
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {modal === "form" && (
        <StructureForm
          item={item}
          close={() => setModal(null)}
          saved={() => {
            setModal(null);
            notify("Period structure saved.");
            load();
          }}
        />
      )}
      {modal === "preview" && <StructurePreview item={item} close={() => setModal(null)} notify={notify} />}
      {modal === "assign" && (
        <AssignStructureForm
          item={item}
          close={() => setModal(null)}
          notify={notify}
          assigned={(context) => {
            setModal(null);
            notify("Period structure assigned.");
            navigate("/dashboard/timetable/generate", { state: { timetableContext: context } });
          }}
        />
      )}
      {modal === "delete" && (
        <ConfirmDelete
          name={pick(item, "name")}
          busy={deleting}
          error={deleteError}
          onCancel={() => setModal(null)}
          onConfirm={remove}
        />
      )}
    </Page>
  );
}

function Generate({ goDraft, notify, initial }) {
  const state = useLookups(initial);
  const { value, data } = state;
  const [requirements, setRequirements] = useState({});
  const [workingDays, setWorkingDays] = useState(() =>
    (initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS).map(Number),
  );
  const [capacityError, setCapacityError] = useState("");
  const [busy, setBusy] = useState(false);
  const periodsPerDay = data.periods.length;
  const weeklyCapacity = periodsPerDay * workingDays.length;
  const totalRequiredPeriods = Object.values(requirements).reduce(
    (total, weeklyPeriods) => total + (Number(weeklyPeriods) || 0),
    0,
  );
  const ready =
    value.boardId &&
    value.academicYearId &&
    value.academicLevelId &&
    value.groupId &&
    value.sectionId &&
    workingDays.length;
  const toggleWorkingDay = (day) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
    setCapacityError("");
  };
  const generate = async () => {
    if (busy) return;
    if (totalRequiredPeriods > weeklyCapacity) {
      setCapacityError(`Subject requirements total ${totalRequiredPeriods} periods, but the selected working days allow only ${weeklyCapacity} periods.`);
      return;
    }
    try {
      setBusy(true);
      const subjectRequirements = data.subjects
        .map((subject) => ({
          subjectId: Number(subject.id),
          weeklyPeriods: Number(requirements[subject.id] || 0),
        }))
        .filter((entry) => entry.weeklyPeriods > 0);
      const response = await apiClient.post(apiEndpoints.timetable.generate, {
        boardId: Number(value.boardId),
        academicYearId: Number(value.academicYearId),
        academicLevelId: Number(value.academicLevelId),
        groupId: Number(value.groupId),
        sectionIds: [Number(value.sectionId)],
        workingDays,
        subjectRequirements,
      });
      notify(response.data?.message ?? "Timetable generated.");
      goDraft({ ...value, workingDays });
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="Generate Timetable"
      subtitle="Generate a conflict-free theory timetable in DRAFT state."
    >
      <section className="ttm-card">
        <Context state={state} />
        {value.programId && value.sectionId ? (
          <>
            <div className="ttm-working-days" aria-labelledby="working-days-label">
              <span id="working-days-label">Working Days</span>
              <div className="ttm-day-toggles">
                {WORKING_DAY_OPTIONS.map((day) => (
                  <button
                    type="button"
                    key={day.value}
                    className={workingDays.includes(day.value) ? "active" : ""}
                    aria-pressed={workingDays.includes(day.value)}
                    onClick={() => toggleWorkingDay(day.value)}
                  >
                    {day.shortLabel}
                  </button>
                ))}
              </div>
              <span className="ttm-capacity">Weekly Capacity: {weeklyCapacity} periods</span>
            </div>
            <p className="ttm-generation-help">
              Set the weekly teaching periods for each subject. These values tell the generator how many slots to create for the selected section.
            </p>
            <div className="ttm-form-grid">
              {data.subjects.map((subject) => (
                <Field key={subject.id} label={`${subject.name} weekly periods`}>
                  <input
                    type="number"
                    min="0"
                    value={requirements[subject.id] ?? ""}
                    onChange={(e) => {
                      setRequirements((current) => ({ ...current, [subject.id]: e.target.value }));
                      setCapacityError("");
                    }}
                  />
                </Field>
              ))}
            </div>
            {capacityError ? <p className="ttm-validation-error ttm-capacity-error">{capacityError}</p> : null}
          </>
        ) : null}
        <footer className="ttm-screen-actions">
          <Btn disabled={!ready || busy} onClick={generate}>
            {busy ? "Generating…" : "Generate Timetable"}
          </Btn>
        </footer>
      </section>
    </Page>
  );
}

function SlotEditor({ context, data, slot, workingDays, close, saved, notify }) {
  const [form, setForm] = useState({
    dayOfWeek: String(pick(slot, "dayOfWeek") ?? ""),
    periodId: String(pick(slot, "periodId") ?? ""),
    subjectId: String(pick(slot, "subjectId") ?? ""),
    facultyId: String(pick(slot, "facultyId") ?? ""),
    roomId: String(pick(slot, "roomId") ?? ""),
    remarks: pick(slot, "remarks") ?? "",
  });
  const [faculty, setFaculty] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!form.subjectId) return;
    apiClient
      .get(apiEndpoints.timetable.getAllocatedFaculties, {
        params: { ...context, subjectId: form.subjectId },
      })
      .then((r) =>
        setFaculty(optionize(r.data, ["facultyId", "id", "Id"], ["facultyName", "name", "Name"])),
      )
      .catch((e) => notify(getApiErrorMessage(e)));
  }, [form.subjectId]);
  const set = (key) => (e) => setForm((x) => ({ ...x, [key]: e.target.value }));
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(Object.entries(context).map(([key, val]) => [key, Number(val)])),
        ...Object.fromEntries(
          Object.entries(form).map(([key, val]) => [
            key === "remarks" ? key : key,
            key === "remarks" ? val : Number(val),
          ]),
        ),
        isPublished: Boolean(pick(slot, "isPublished") ?? false),
      };
      timetableId(slot)
        ? await apiClient.put(apiEndpoints.timetable.update(timetableId(slot)), payload)
        : await apiClient.post(apiEndpoints.timetable.create, payload);
      saved();
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const select = (label, key, values) => (
    <Field label={label}>
      <select value={form[key]} onChange={set(key)}>
        <option value="">Select {label}</option>
        {values.map((entry) => (
          <option key={entry.id ?? entry.value} value={entry.id ?? entry.value}>
            {entry.name ?? entry.label}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal title={timetableId(slot) ? "Edit Timetable Slot" : "Add Timetable Slot"} onClose={close}>
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          {select(
            "Day",
            "dayOfWeek",
            workingDays.map((day) => ({ id: day, name: DAYS[day] })),
          )}
          {select("Period", "periodId", data.periods)}
          {select("Subject", "subjectId", data.subjects)}
          {select("Faculty", "facultyId", faculty)}
          {select("Room", "roomId", data.rooms)}
          <Field label="Remarks">
            <input value={form.remarks} onChange={set("remarks")} />
          </Field>
        </div>
        <footer>
      <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>
            Cancel
          </Btn>
      <Btn disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Slot"}</Btn>
        </footer>
      </div>
    </Modal>
  );
}
function Draft({ initial, notify }) {
  const state = useLookups(initial);
  const { value, data } = state;
  const [slots, setSlots] = useState([]);
  const [editing, setEditing] = useState(null);
  const [validation, setValidation] = useState(null);
  const workingDays = (initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS)
    .map(Number)
    .filter((day) => WORKING_DAY_OPTIONS.some((option) => option.value === day));
  const load = () =>
    value.sectionId &&
    apiClient
      .get(apiEndpoints.timetable.getBySection(value.sectionId), {
        params: { academicYearId: value.academicYearId },
      })
      .then((r) => setSlots(list(r.data)))
      .catch((e) => notify(getApiErrorMessage(e)));
  useEffect(load, [value.sectionId, value.academicYearId]);
  const find = (day, periodId) =>
    slots.find(
      (slot) =>
        String(pick(slot, "dayOfWeek")) === String(day) &&
        String(pick(slot, "periodId")) === String(periodId),
    );
  const action = async (path, method = "post", body) => {
    try {
      const r = await apiClient[method](path, body, {
        params: { academicYearId: value.academicYearId },
      });
      if (method === "post" && path.includes("validate")) setValidation(r.data);
      else notify(r.data?.message ?? "Timetable updated.");
      load();
    } catch (e) {
      notify(getApiErrorMessage(e));
    }
  };
  return (
    <Page
      title="Generated Draft Grid"
      subtitle="Review, validate, approve and publish the section timetable."
      action={
        <Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/generate">
          Back to Generate
        </Link>
      }
    >
      <section className="ttm-card">
        <Context state={state} />
        {value.sectionId && (
          <>
            <div className="ttm-grid-head">
              <b>Section timetable</b>
              <div>
                <Btn className="cms-btn cms-btn-ghost" onClick={() => setEditing({})}>
                  + Add Slot
                </Btn>
                <Btn
                  className="cms-btn cms-btn-ghost"
                  onClick={() => action(apiEndpoints.timetable.validateSection(value.sectionId))}
                >
                  Validate
                </Btn>
                <Btn onClick={() => action(apiEndpoints.timetable.approveSection(value.sectionId))}>
                  Approve
                </Btn>
                <Btn
                  onClick={() =>
                    action(apiEndpoints.timetable.publishSection(value.sectionId), "patch", {
                      isPublished: true,
                    })
                  }
                >
                  Publish
                </Btn>
              </div>
            </div>
            {validation && (
              <div className={`ttm-validation-result${validation.isValid ? "" : " has-errors"}`}>
                <b>{validation.isValid ? "Timetable is valid" : "Validation failed"}</b>
                {[...(validation.errors ?? []), ...(validation.warnings ?? [])].map(
                  (entry, index) => (
                    <p key={index}>{entry.message}</p>
                  ),
                )}
              </div>
            )}
            <div className="ttm-grid-wrap">
              <table className="ttm-grid">
                <thead>
                  <tr>
                    <th>Day</th>
                    {data.periods.map((period) => (
                      <th key={period.id}>{period.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workingDays.map((dayOfWeek) => (
                    (() => {
                      const dayName = DAYS[dayOfWeek];
                      return (
                    <tr key={dayName}>
                      <th>{dayName}</th>
                      {data.periods.map((period) => {
                        const slot = find(dayOfWeek, period.id);
                        return (
                          <td className="slot" key={period.id}>
                            <button
                              onClick={() =>
                                setEditing(
                                  slot ?? { dayOfWeek, periodId: period.id },
                                )
                              }
                            >
                              {slot ? (
                                <>
                                  <b>{pick(slot, "subjectName") ?? "—"}</b>
                                  <span>{pick(slot, "facultyName") ?? "Unassigned"}</span>
                                  <small>{pick(slot, "roomName") ?? "—"}</small>
                                </>
                              ) : (
                                "+ Add"
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {editing && (
        <SlotEditor
          context={value}
          data={data}
          slot={editing}
          workingDays={workingDays}
          close={() => setEditing(null)}
          notify={notify}
          saved={() => {
            setEditing(null);
            notify("Timetable slot saved.");
            load();
          }}
        />
      )}
    </Page>
  );
}
export default function TimetablePage({ screen = "structures" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState("");
  const view =
    screen === "draft" ? (
      <Draft initial={location.state?.timetableContext} notify={setToast} />
    ) : screen === "generate" ? (
      <Generate
        notify={setToast}
        initial={location.state?.timetableContext}
        goDraft={(context) =>
          navigate("/dashboard/timetable/draft", { state: { timetableContext: context } })
        }
      />
    ) : (
      <Structures notify={setToast} />
    );
  return (
    <div className="timetable-module">
      {view}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
