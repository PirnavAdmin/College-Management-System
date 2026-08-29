import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  let value = x;
  // APIs in this module return both { data: [] } and { data: { data: [] } }.
  // Unwrap response envelopes until the collection is reached.
  for (let depth = 0; depth < 4 && value && !Array.isArray(value); depth += 1) {
    if (Array.isArray(value?.$values)) return value.$values;
    const next = value?.data ?? value?.items ?? value?.result ?? value?.results
      ?? value?.timetableSlots ?? value?.slots ?? value?.generatedSlots
      ?? value?.programs ?? value?.sections;
    if (next === undefined || next === value) break;
    value = next;
  }
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
const sameOptions = (left, right) =>
  left.length === right.length && left.every((item, index) => item.id === right[index].id && item.name === right[index].name);
const sectionsForProgramme = (payload, program, groupId) => {
  if (!program) return [];
  const programId = String(pick(program.raw, "programId", "ProgramId", "id", "Id") ?? "");
  const groupProgramId = String(pick(program.raw, "groupProgramId", "GroupProgramId") ?? "");
  const programmeName = String(program.name || "").trim().toLowerCase();
  const matched = list(payload).filter((section) => {
    const sectionProgramId = String(pick(section, "programId", "ProgramId") ?? "");
    const sectionGroupProgramId = String(pick(section, "groupProgramId", "GroupProgramId") ?? "");
    const sectionProgramme = String(pick(section, "programme", "program", "programName", "Programme", "Program") ?? "").trim().toLowerCase();
    return (programId && sectionProgramId === programId)
      || (groupProgramId && sectionGroupProgramId === groupProgramId)
      || (programmeName && sectionProgramme === programmeName);
  });
  const matchingGroup = matched.filter((section) => String(pick(section, "groupId", "GroupId") ?? "") === String(groupId));
  return matchingGroup.length ? matchingGroup : matched;
};
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
const slotSubjectName = (slot, subjects) =>
  pick(slot, "subjectName", "SubjectName")
  ?? pick(slot?.subject, "subjectName", "SubjectName", "name", "Name")
  ?? subjects.find((subject) => String(subject.id) === String(pick(slot, "subjectId", "SubjectId")))?.name
  ?? "Untitled subject";
const slotFacultyName = (slot) => pick(slot, "facultyName", "FacultyName", "staffName", "StaffName") ?? pick(slot?.faculty, "facultyName", "FacultyName", "staffName", "StaffName", "fullName", "FullName", "name", "Name") ?? "Unassigned";
const slotRoomName = (slot) => pick(slot, "roomName", "RoomName", "roomCode", "RoomCode") ?? pick(slot?.room, "roomName", "RoomName", "roomCode", "RoomCode", "name", "Name") ?? "—";
const isBreakPeriod = (period) => {
  const raw = period?.raw ?? period;
  const isBreak = pick(raw, "isBreak", "IsBreak", "isBreakPeriod", "IsBreakPeriod");
  const type = String(pick(raw, "periodType", "PeriodType", "type", "Type", "slotType", "SlotType") ?? "").toLowerCase();
  const name = String(pick(raw, "periodName", "name", "Name") ?? period?.name ?? "").toLowerCase();
  return isBreak === true || isBreak === "true" || type.includes("break") || /(break|lunch|interval)/.test(name);
};
const newestSection = (sections) =>
  [...sections].sort((left, right) => {
    const createdKeys = ["createdAt", "CreatedAt", "createdOn", "CreatedOn", "createdDate", "CreatedDate"];
    const rightCreated = Date.parse(pick(right.raw, ...createdKeys) ?? "") || 0;
    const leftCreated = Date.parse(pick(left.raw, ...createdKeys) ?? "") || 0;
    if (rightCreated !== leftCreated) return rightCreated - leftCreated;
    return Number(right.id) - Number(left.id);
  })[0];
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
  const [sectionsReloadKey, setSectionsReloadKey] = useState(0);
  const [data, setData] = useState({
    boards: [],
    years: [],
    allYears: [],
    levels: [],
    allLevels: [],
    groups: [],
    programs: [],
    sections: [],
    sectionsLoading: false,
    sectionsError: false,
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
            // A generated draft is opened with its full context. Do not
            // replace that context while the lookup data is refreshing,
            // otherwise the Draft screen is left with only the board value
            // and appears to return to the setup screen.
            current.boardId === value.boardId && !current.academicYearId && selectedYear
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
            current.boardId === value.boardId && !current.academicYearId
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
    const selectedProgram = data.programs.find((program) => String(program.id) === String(value.programId));
    setData((current) => ({
      ...current,
      sections: value.programId ? current.sections : [],
      sectionsLoading: Boolean(value.programId),
      sectionsError: false,
    }));
    Promise.allSettled([
      apiClient.get(apiEndpoints.groups.programs(value.groupId)),
      value.programId && selectedProgram
        ? apiClient.get(apiEndpoints.sections.search, {
            params: {
              // Programme is the required dependency for this dropdown. Do
              // not over-constrain it with optional context IDs because older
              // section records can carry a different year/level mapping.
              Programme: selectedProgram?.name,
              ProgramId: pick(selectedProgram?.raw, "programId", "ProgramId", "id", "Id"),
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
        programs: (() => {
          const nextPrograms = r[0].status === "fulfilled"
            ? optionize(r[0].value.data, ["programId", "ProgramId", "id", "Id", "groupProgramId", "GroupProgramId"], ["programName", "programme", "program", "name", "Name"])
            : [];
          return sameOptions(current.programs, nextPrograms) ? current.programs : nextPrograms;
        })(),
        sections:
          r[1].status === "fulfilled"
            ? optionize(sectionsForProgramme(r[1].value.data, selectedProgram, value.groupId), ["sectionId", "id", "Id"], ["sectionName", "name", "Name"])
            : [],
        sectionsLoading: false,
        sectionsError: Boolean(value.programId) && r[1].status === "rejected",
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
  }, [value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId, data.programs, sectionsReloadKey]);
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
      if (key === "programId") {
        setData((data) => ({ ...data, sections: [], sectionsLoading: Boolean(next), sectionsError: false }));
        return { ...current, programId: next, sectionId: "" };
      }
      return { ...current, [key]: next };
    });
  const reloadSections = () => {
    if (value.programId) setSectionsReloadKey((key) => key + 1);
  };
  return { value, data, change, setValue, reloadSections };
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
      {select("Programme", "programId", data.programs, !value.groupId)}
      {section && select("Section", "sectionId", data.sections, !value.programId)}
    </div>
  );
}
function ProgrammeSections({ data, onRetry }) {
  return (
    <section className="ttm-programme-sections" aria-live="polite">
      <header>
        <b>Sections for this Programme</b>
        <span>Sections are automatically loaded from the selected programme.</span>
      </header>
      {data.sectionsLoading ? <p>Loading sections...</p> : null}
      {data.sectionsError ? (
        <div className="ttm-sections-error">
          <p className="ttm-validation-error">Unable to load sections. Please try again.</p>
          <Btn className="cms-btn cms-btn-ghost" onClick={onRetry}>Retry sections</Btn>
        </div>
      ) : null}
      {!data.sectionsLoading && !data.sectionsError && !data.sections.length ? <p>No sections found for this programme.</p> : null}
      {!data.sectionsLoading && data.sections.length ? (
        <div className="ttm-section-chips">
          {data.sections.map((section) => <span key={section.id}>{section.name}</span>)}
        </div>
      ) : null}
    </section>
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
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();
  const load = useCallback(
    () =>
      apiClient
        .get(apiEndpoints.periodStructures.list)
        .then((r) => setItems(list(r.data)))
        .catch((e) => notify(getApiErrorMessage(e))),
    [notify],
  );
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);
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
        <div className="ttm-page-actions">
          <Btn onClick={() => { setItem(null); setModal("form"); }}>+ Create Structure</Btn>
          <Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/generate">Next: Generate Timetable →</Link>
        </div>
      }
    >
      <section className="ttm-card">
        {loading ? (
          <p className="ttm-empty">Loading period structures…</p>
        ) : !items.length ? (
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
  // The periods endpoint can include break slots. Capacity is based on actual
  // teaching periods, not every timeline entry returned by the API.
  const periodsPerDay = data.periods.filter((period) => !isBreakPeriod(period)).length;
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
    value.programId &&
    data.sections.length &&
    !data.sectionsLoading &&
    workingDays.length;
  const toggleWorkingDay = (day) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
    setCapacityError("");
  };
  const generate = async () => {
    if (busy) return;
    const selectedProgram = data.programs.find((program) => String(program.id) === String(value.programId));
    const programId = Number(pick(selectedProgram?.raw, "programId", "ProgramId", "id", "Id"));
    const sectionIds = data.sections
      .map((section) => Number(pick(section.raw, "sectionId", "SectionId", "id", "Id", section.id)))
      .filter((sectionId) => Number.isInteger(sectionId) && sectionId > 0);
    if (!Number.isInteger(programId) || programId <= 0) {
      notify("Please select a valid programme.");
      return;
    }
    if (!sectionIds.length) {
      notify("No sections found for this programme. Create sections in Section Management first.");
      return;
    }
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
      if (!subjectRequirements.length) {
        notify("Enter at least one subject weekly-period requirement before generating the timetable.");
        return;
      }
      const response = await apiClient.post(
        apiEndpoints.timetable.generate,
        {
          boardId: Number(value.boardId),
          academicYearId: Number(value.academicYearId),
          academicLevelId: Number(value.academicLevelId),
          groupId: Number(value.groupId),
          programId,
          p_ProgramId: programId,
          sectionIds,
          workingDays,
          subjectRequirements,
        },
        {
          // The live endpoint reports this exact parameter name. Include it
          // in the query collection as well as the JSON command body.
          params: { p_ProgramId: programId },
        },
      );
      const result = response.data?.data ?? response.data ?? {};
      const generatedSlots = list(result.generatedSlots);
      if (result.isSuccess === false || Number(result.totalSlotsGenerated ?? generatedSlots.length) <= 0) {
        notify(result.message ?? "The timetable generator did not create any slots. Check the subject requirements and faculty assignments, then try again.");
        return;
      }
      notify(result.message ?? "Timetable generated.");
      // Draft chooses the newest section returned by the existing Section
      // API, while the generator still receives every programme section.
      goDraft({ ...value, sectionId: "", workingDays, generatedSlots });
    } catch (e) {
      const message = `${getApiErrorMessage(e)} ${e?.response?.data?.details ?? ""}`;
      notify(
        /SaveChanges|saving the entity changes|database|duplicate|constraint/i.test(message)
          ? "The timetable could not be saved because generated data already exists or conflicts with a database rule. Refresh the Draft screen and avoid generating the same timetable again."
          : /LINQ|StaffSubjectAllocation|allocation/i.test(message)
          ? "Timetable generation could not resolve staff-subject allocations. Allocate faculty to the requested subjects, then try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="Generate Timetable"
      subtitle="Generate a conflict-free theory timetable in DRAFT state."
      action={<Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/setup">← Back to Period Structures</Link>}
    >
      <section className="ttm-card">
        <Context state={state} section={false} />
        {value.programId ? (
          <div className="ttm-generation-content">
            <ProgrammeSections data={data} onRetry={state.reloadSections} />
            <section className="ttm-working-days" aria-labelledby="working-days-label">
              <header className="ttm-working-days-head">
                <span id="working-days-label">Working Days</span>
                <span className="ttm-capacity">Weekly Capacity: {weeklyCapacity} periods</span>
              </header>
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
              <p className="ttm-generation-help">
                Set the weekly teaching periods for each subject. These values tell the generator how many slots to create for every loaded section.
              </p>
            </section>
            <section className="ttm-subject-period-section">
              <div className="ttm-subject-period-grid">
                {data.subjects.map((subject) => (
                  <div className="ttm-subject-card" key={subject.id}>
                    <Field label={`${subject.name} weekly periods`}>
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
                  </div>
                ))}
              </div>
            </section>
            {capacityError ? <p className="ttm-validation-error ttm-capacity-error">{capacityError}</p> : null}
          </div>
        ) : null}
        <footer className={`ttm-screen-actions${value.programId ? " ttm-generation-footer" : ""}`}>
          <Btn disabled={!ready || busy} onClick={generate}>
            {busy ? "Generating…" : "Generate Timetable"}
          </Btn>
        </footer>
      </section>
    </Page>
  );
}

function SlotEditor({ context, data, slot, workingDays, close, saved, notify, lab = false }) {
  const [form, setForm] = useState({
    dayOfWeek: String(pick(slot, "dayOfWeek", "DayOfWeek") ?? ""),
    periodId: String(pick(slot, "periodId", "PeriodId") ?? ""),
    subjectId: String(pick(slot, "subjectId", "SubjectId") ?? ""),
    facultyId: String(pick(slot, "facultyId", "FacultyId") ?? ""),
    roomId: String(pick(slot, "roomId", "RoomId") ?? ""),
    remarks: pick(slot, "remarks", "Remarks") ?? "",
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
  }, [context, form.subjectId, notify]);
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
    <Modal title={lab ? "Add Lab / Practical" : timetableId(slot) ? "Edit Timetable Slot" : "Add Timetable Slot"} onClose={close}>
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          {select(
            "Day",
            "dayOfWeek",
            workingDays.map((day) => ({ id: day, name: DAYS[day] })),
          )}
          {select("Period", "periodId", data.periods.filter((period) => !isBreakPeriod(period)))}
          {select("Subject", "subjectId", data.subjects)}
          {select("Staff", "facultyId", faculty)}
          {select("Room", "roomId", data.rooms)}
          <Field label="Remarks">
            <input value={form.remarks} onChange={set("remarks")} />
          </Field>
        </div>
        <footer>
      <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>
            Cancel
          </Btn>
      <Btn disabled={saving} onClick={save}>{saving ? "Saving…" : lab ? "Add Lab" : "Save Slot"}</Btn>
        </footer>
      </div>
    </Modal>
  );
}
function Draft({ initial, notify }) {
  const state = useLookups(initial);
  const { value, data, setValue } = state;
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copyTarget, setCopyTarget] = useState({ academicYearId: "", sectionId: "" });
  const [actionBusy, setActionBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [published, setPublished] = useState(Boolean(initial?.isPublished));
  const [approved, setApproved] = useState(Boolean(initial?.isApproved || initial?.status === "Approved"));
  const firstSection = useRef(true);
  const [validation, setValidation] = useState(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [publishedFilter, setPublishedFilter] = useState(
    initial?.isPublished === undefined ? "" : String(Boolean(initial.isPublished)),
  );
  const workingDays = (initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS)
    .map(Number)
    .filter((day) => WORKING_DAY_OPTIONS.some((option) => option.value === day));
  const generatedSlots = useMemo(() => list(initial?.generatedSlots), [initial?.generatedSlots]);
  useEffect(() => {
    if (!value.programId || !data.sections.length) return;
    if (value.sectionId) return;
    const defaultSection = newestSection(data.sections);
    if (!defaultSection) return;
    setValue((current) =>
      current.programId === value.programId
        ? { ...current, sectionId: defaultSection.id }
        : current,
    );
  }, [data.sections, setValue, value.programId, value.sectionId]);
  const load = useCallback(async () => {
    if (!value.sectionId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const r = await apiClient.get(apiEndpoints.timetable.getBySection(value.sectionId), {
        params: {
          academicYearId: value.academicYearId,
          ...(publishedFilter === "true" || publishedFilter === "false" ? { isPublished: publishedFilter } : {}),
        },
      });
      const fetchedSlots = list(r.data);
      const responseSlots = generatedSlots.filter(
        (slot) => String(pick(slot, "sectionId", "SectionId")) === String(value.sectionId),
      );
      setSlots(fetchedSlots.length ? fetchedSlots : responseSlots);
    } catch (e) {
      setSlots([]);
      notify(getApiErrorMessage(e));
    } finally {
      setSlotsLoading(false);
    }
  }, [generatedSlots, notify, publishedFilter, value.academicYearId, value.sectionId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (publishedFilter === "true") {
      setPublished(true);
      setApproved(true);
    } else if (publishedFilter === "false") {
      setPublished(false);
    }
  }, [publishedFilter]);
  useEffect(() => {
    if (firstSection.current) {
      firstSection.current = false;
      return;
    }
    setValidation(null);
    setApproved(false);
    setPublished(false);
  }, [value.sectionId]);
  const find = (day, periodId) =>
    slots.find(
      (slot) =>
        (String(pick(slot, "dayOfWeek", "DayOfWeek", "dayNumber", "DayNumber")) === String(day)
          || String(pick(slot, "day", "Day")).toLowerCase() === String(DAYS[day]).toLowerCase()) &&
        String(pick(slot, "periodId", "PeriodId", "periodNumber", "PeriodNumber")) === String(periodId),
    );
  const action = async (path, method = "post", body) => {
    if (actionBusy) return;
    const actionName = path.includes("validate") ? "validate" : path.includes("approve") ? "approve" : path.includes("publish") ? "publish" : "action";
    setActiveAction(actionName);
    setActionBusy(true);
    try {
      const r = await apiClient[method](path, body, {
        params: { academicYearId: value.academicYearId },
      });
      if (method === "post" && path.includes("validate")) {
        setValidation(r.data);
        setValidationOpen(true);
      }
      else notify(r.data?.message ?? "Timetable updated.");
      load();
      return true;
    } catch (e) {
      notify(getApiErrorMessage(e));
      return false;
    } finally {
      setActionBusy(false);
      setActiveAction("");
    }
  };
  const copyTimetable = async () => {
    if (actionBusy) return;
    if (!copyTarget.academicYearId || !copyTarget.sectionId) {
      notify("Select a target academic year and section.");
      return;
    }
    if (String(copyTarget.academicYearId) === String(value.academicYearId) && String(copyTarget.sectionId) === String(value.sectionId)) {
      const sectionName = data.sections.find((section) => String(section.id) === String(value.sectionId))?.name || "this section";
      notify(`This timetable has already been copied for ${sectionName}. Select a different target section or academic year.`);
      return;
    }
    setActionBusy(true);
    setActiveAction("copy");
    try {
      await apiClient.post(apiEndpoints.timetable.copy, {
        sourceAcademicYearId: Number(value.academicYearId),
        sourceSectionId: Number(value.sectionId),
        targetAcademicYearId: Number(copyTarget.academicYearId),
        targetSectionId: Number(copyTarget.sectionId),
      });
      setCopying(false);
      notify("Timetable copied successfully.");
      load();
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setActionBusy(false);
      setActiveAction("");
    }
  };
  const viewPublished = async (kind) => {
    if (actionBusy) return;
    const staffId = pick(slots[0], "facultyId", "FacultyId", "staffId", "StaffId")
      ?? pick(JSON.parse(localStorage.getItem("user") || "{}"), "id", "userId");
    if (kind === "faculty" && !staffId) {
      notify("No faculty assignment is available for this timetable.");
      return;
    }
    setActionBusy(true);
    setActiveAction(kind);
    try {
      const endpoint = kind === "student"
        ? apiEndpoints.timetable.getBySection(value.sectionId)
        : apiEndpoints.timetable.getByFaculty(staffId);
      const params = kind === "student"
        ? { academicYearId: value.academicYearId, isPublished: true }
        : { academicYearId: value.academicYearId };
      const response = await apiClient.get(endpoint, { params });
      const viewed = list(response.data);
      if (viewed.length) setSlots(viewed);
      notify(`${kind === "student" ? "Student" : "Faculty"} timetable loaded.`);
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };
  return (
    <Page
      title="Generated Draft Grid"
      subtitle="Review, validate, approve and publish the section timetable."
      action={
        <Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/generate" state={{ timetableContext: value }}>
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
                <label className="ttm-inline-filter">
                  <span>Status</span>
                  <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)} disabled={actionBusy}>
                    <option value="">All</option>
                    <option value="false">Draft</option>
                    <option value="true">Published</option>
                  </select>
                </label>
                <Btn className="cms-btn cms-btn-ghost" disabled={activeAction === "copy"} onClick={() => setCopying(true)}>
                  Copy Timetable
                </Btn>
                <Btn className="cms-btn cms-btn-ghost" onClick={() => setEditing({})}>
                  + Add Slot
                </Btn>
                <Btn className="cms-btn cms-btn-ghost" onClick={() => setEditing({ remarks: "Lab / Practical", __lab: true })}>
                  + Add Lab
                </Btn>
                <Btn
                  className="cms-btn cms-btn-ghost"
                  disabled={published || activeAction === "validate"}
                  onClick={() => action(apiEndpoints.timetable.validateSection(value.sectionId))}
                >
                  {activeAction === "validate" ? "Validating…" : "Validate"}
                </Btn>
                <Btn disabled={published || activeAction === "approve" || !validation?.isValid || approved} onClick={async () => {
                  const ok = await action(apiEndpoints.timetable.approveSection(value.sectionId));
                  if (ok) setApproved(true);
                }}>
                  {activeAction === "approve" ? "Approving…" : "Approve"}
                </Btn>
                <Btn disabled={activeAction === "publish" || !approved || published}
                  onClick={async () => {
                    const ok = await action(apiEndpoints.timetable.publishSection(value.sectionId), "patch", { isPublished: true });
                    if (ok) setPublished(true);
                  }}
                >
                  {activeAction === "publish" ? "Publishing…" : published ? "Published" : approved ? "Publish" : "Approve first"}
                </Btn>
                {published && (
                  <>
                    <Btn className="cms-btn cms-btn-ghost" disabled={activeAction === "faculty"} onClick={() => viewPublished("faculty")}>Faculty View Timetable</Btn>
                    <Btn className="cms-btn cms-btn-ghost" disabled={activeAction === "student"} onClick={() => viewPublished("student")}>Student View Timetable</Btn>
                  </>
                )}
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
                        if (isBreakPeriod(period)) {
                          return (
                            <td className="break" key={period.id}>
                              {period.name}
                            </td>
                          );
                        }
                        const slot = find(dayOfWeek, period.id);
                        return (
                          <td className="slot" key={period.id}>
                            <button
                              onClick={() => setEditing(slot)}
                              disabled={!slot}
                            >
                              {slot ? (
                                <>
                                  <b>{slotSubjectName(slot, data.subjects)}</b>
                                  <span>{slotFacultyName(slot)}</span>
                                  <small>{slotRoomName(slot)}</small>
                                  <i className="ttm-slot-edit">Edit</i>
                                </>
                              ) : (
                                slotsLoading ? "Loading…" : "No generated subject"
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
      {validationOpen && validation && (
        <Modal title="Validate Timetable" onClose={() => setValidationOpen(false)}>
          <div className="ttm-modal-body">
            <div className={`ttm-validation-result${validation.isValid ? "" : " has-errors"}`}>
              <b>{validation.isValid ? "Timetable is valid" : "Validation failed"}</b>
              <span>{(validation.errors ?? []).length} Errors · {(validation.warnings ?? []).length} Warnings</span>
              {[...(validation.errors ?? []), ...(validation.warnings ?? [])].map((entry, index) => <p key={index}>{entry.message ?? entry}</p>)}
            </div>
            <footer><Btn className="cms-btn cms-btn-ghost" onClick={() => setValidationOpen(false)}>Close</Btn></footer>
          </div>
        </Modal>
      )}
      {editing && (
        <SlotEditor
          context={value}
          data={data}
          slot={editing}
          lab={Boolean(editing.__lab)}
          workingDays={workingDays}
          close={() => setEditing(null)}
          notify={notify}
          saved={() => {
            setEditing(null);
            // Any change to a published slot creates a new draft revision.
            // Require validation and approval before it can be published again.
            setPublished(false);
            setApproved(false);
            setValidation(null);
            notify("Timetable slot saved.");
            load();
          }}
        />
      )}
      {copying && (
        <Modal title="Copy Timetable" onClose={() => setCopying(false)}>
          <div className="ttm-modal-body">
            <p>Copy the currently selected timetable to another academic year and section.</p>
            <div className="ttm-form-grid">
              <Field label="Target Academic Year">
                <select value={copyTarget.academicYearId} onChange={(e) => setCopyTarget((x) => ({ ...x, academicYearId: e.target.value }))}>
                  <option value="">Select Academic Year</option>
                  {data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                </select>
              </Field>
              <Field label="Target Section">
                <select value={copyTarget.sectionId} onChange={(e) => setCopyTarget((x) => ({ ...x, sectionId: e.target.value }))}>
                  <option value="">Select Section</option>
                  {data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </select>
              </Field>
            </div>
            <footer>
              <Btn className="cms-btn cms-btn-ghost" onClick={() => setCopying(false)}>Cancel</Btn>
              <Btn disabled={activeAction === "copy"} onClick={copyTimetable}>
                {activeAction === "copy" ? "Copying…" : "Copy Timetable"}
              </Btn>
            </footer>
          </div>
        </Modal>
      )}
    </Page>
  );
}
function LatestDraft({ notify }) {
  const [state, setState] = useState({ loading: true, context: null });
  useEffect(() => {
    let active = true;
    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Timetable request timed out.")), 15000);
    });
    Promise.race([
      apiClient.get(apiEndpoints.timetable.getAll, { params: { pageNumber: 1, pageSize: 20 } }),
      timeout,
    ])
      .then((response) => {
        if (!active) return;
        const rows = list(response.data);
        const latest = [...rows].sort((a, b) => {
          const date = (entry) => Date.parse(pick(entry, "generatedAt", "GeneratedAt", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt", "date", "Date") ?? "") || 0;
          return date(b) - date(a) || Number(pick(b, "id", "Id", "timetableId", "TimetableId") ?? 0) - Number(pick(a, "id", "Id", "timetableId", "TimetableId") ?? 0);
        })[0];
        if (!latest) return setState({ loading: false, context: null });
        const section = latest.section ?? latest.Section ?? {};
        const program = latest.program ?? latest.Program ?? latest.programme ?? latest.Programme ?? {};
        const year = latest.academicYear ?? latest.AcademicYear ?? {};
        const board = latest.board ?? latest.Board ?? {};
        const level = latest.academicLevel ?? latest.AcademicLevel ?? {};
        const group = latest.group ?? latest.Group ?? {};
        setState({
          loading: false,
          context: {
            boardId: pick(latest, "boardId", "BoardId") ?? pick(board, "boardId", "BoardId", "id", "Id") ?? "",
            academicYearId: pick(latest, "academicYearId", "AcademicYearId") ?? pick(year, "academicYearId", "AcademicYearId", "id", "Id") ?? "",
            academicLevelId: pick(latest, "academicLevelId", "AcademicLevelId") ?? pick(level, "academicLevelId", "AcademicLevelId", "id", "Id") ?? "",
            groupId: pick(latest, "groupId", "GroupId") ?? pick(group, "groupId", "GroupId", "id", "Id") ?? "",
            programId: pick(latest, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? pick(program, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id") ?? "",
            sectionId: pick(latest, "sectionId", "SectionId") ?? pick(section, "sectionId", "SectionId", "id", "Id") ?? "",
            isPublished: pick(latest, "isPublished", "IsPublished"),
            workingDays: latest.workingDays ?? latest.WorkingDays,
          },
        });
      })
      .catch((error) => {
        if (active) {
          notify(getApiErrorMessage(error));
          setState({ loading: false, context: null });
        }
      });
    return () => { active = false; };
  }, [notify]);
  if (state.loading) return <Page title="Generated Timetable" subtitle="Loading the latest generated timetable…"><section className="ttm-card"><p className="ttm-empty">Loading timetable…</p></section></Page>;
  if (!state.context?.sectionId) return <Page title="Generated Timetable" subtitle="Review generated timetables."><section className="ttm-card"><p className="ttm-empty">No generated timetable available.</p><div className="ttm-screen-actions"><Link className="cms-btn cms-btn-primary" to="/dashboard/timetable/generate">Generate Timetable</Link></div></section></Page>;
  return <Draft initial={state.context} notify={notify} />;
}
export default function TimetablePage({ screen = "latest" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState("");
  const view =
    screen === "latest" ? (
      <LatestDraft notify={setToast} />
    ) : screen === "draft" ? (
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
