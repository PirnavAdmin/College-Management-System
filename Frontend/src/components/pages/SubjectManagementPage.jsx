import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { commonSubjectIds, groupSubjectMap, loadSecondLanguages, saveSecondLanguages, secondLanguageOptions, subjectMaster } from "@/data/subjectMasterData.js";
import "./SubjectManagementPage.css";

const types = ["Theory", "Practical", "Language"];
const cloneMap = () => Object.fromEntries(Object.entries(groupSubjectMap).map(([group, ids]) => [group, ids.map((subjectId) => ({ subjectId, overrides: {} }))]));
const empty = () => ({ id: "", name: "", code: "", type: [], marks: { theory: "", practical: "", internal: "", passing: "" } });
const get = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const asList = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.Items) ? value.Items : Array.isArray(value?.records) ? value.records : Array.isArray(value?.results) ? value.results : Array.isArray(value?.$values) ? value.$values : Array.isArray(value?.data) ? value.data : Array.isArray(value?.Data) ? value.Data : [];
const body = (response) => response?.data?.data ?? response?.data?.Data ?? response?.data?.result ?? response?.data?.Result ?? response?.data ?? response ?? {};
const option = (item, idKeys, labelKeys) => ({ value: String(get(item, ...idKeys) ?? ""), label: String(get(item, ...labelKeys) ?? "") });
const groupNameOf = (group) => String(get(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode", "code", "Code") ?? "").trim();
const normalizeGroupName = (value = "") => String(value).trim().toUpperCase().replace(/\s+/g, "");
const markValue = (value) => {
  const raw = value && typeof value === "object" ? value.value ?? value.mark ?? value.marks ?? 0 : value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};
const total = (marks = {}) => markValue(marks.theory) + markValue(marks.practical) + markValue(marks.internal);
const editableMarks = (marks = {}) => ({
  theory: String(marks.theory ?? ""),
  practical: String(marks.practical ?? ""),
  internal: String(marks.internal ?? ""),
  passing: String(marks.passing ?? ""),
});
const savedMarks = (marks = {}) => ({
  theory: markValue(marks.theory),
  practical: markValue(marks.practical),
  internal: markValue(marks.internal),
  total: total(marks),
  passing: markValue(marks.passing),
});
const subjectFromApi = (item) => {
  const rawType = String(get(item, "subjectType", "SubjectType") ?? "");
  const type = [
    get(item, "theory", "Theory") ? "Theory" : null,
    get(item, "practical", "Practical") ? "Practical" : null,
    get(item, "language", "Language") ? "Language" : null,
  ].filter(Boolean);
  return {
    id: String(get(item, "subjectId", "SubjectId", "id", "Id") ?? ""),
    name: String(get(item, "subjectName", "SubjectName", "name", "Name") ?? ""),
    code: String(get(item, "subjectCode", "SubjectCode", "code", "Code") ?? ""),
    type: type.length ? type : rawType.split(/[,+/]/).map((value) => value.trim()).filter(Boolean),
    marks: {
      theory: markValue(get(item, "externalMarks", "ExternalMarks", "theoryMarks", "TheoryMarks")),
      practical: markValue(get(item, "practicalMarks", "PracticalMarks")),
      internal: markValue(get(item, "internalMarks", "InternalMarks")),
      total: markValue(get(item, "totalMarks", "TotalMarks")),
      passing: markValue(get(item, "passingMarks", "PassingMarks")),
    },
    raw: item,
  };
};

export const pageConfig = { title: "Subject Management", rows: [], fields: [] };

export default function SubjectManagementPage() {
  const { selectedBoardId: navbarBoardId, selectedAcademicYearId: navbarAcademicYearId } = useAcademicContext();
  const [context, setContext] = useState({ levelId: "", groupId: "" });
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [master, setMaster] = useState(() => subjectMaster.map((item) => ({ ...item, marks: { ...item.marks } })));
  const [mapping, setMapping] = useState(cloneMap);
  const [contextSubjects, setContextSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeSubjects, setActiveSubjects] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState("");
  const languages = secondLanguageOptions;
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  // A Second Language is one common-subject slot with many selectable
  // language options. Keep every selected option rather than a single value.
  const [secondLanguages, setSecondLanguages] = useState(loadSecondLanguages);
  const [languageChoice, setLanguageChoice] = useState("");
  // Retain the full backend group object for future API operations. The
  // frontend-only subject map deliberately uses a normalized group name.
  const selectedGroup = useMemo(() => groups.find((group) => group.value === String(context.groupId))?.raw ?? null, [context.groupId, groups]);
  const groupKey = normalizeGroupName(groupNameOf(selectedGroup));
  const commonSubjects = useMemo(() => master.filter((subject) => commonSubjectIds.includes(subject.id)), [master]);
  const secondLanguageSubjects = useMemo(() => secondLanguages.map((language) => ({
    ...language,
    id: language.code,
    type: language.type?.length ? language.type : ["Language"],
    marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35, ...(language.marks || {}) },
  })), [secondLanguages]);
  const assigned = useMemo(() => mapping[groupKey] ?? [], [mapping, groupKey]);
  const predefinedGroupSubjects = useMemo(() => (groupSubjectMap[groupKey] || [])
    .map((code) => master.find((subject) => String(subject.code ?? subject.subjectCode ?? subject.id).trim().toUpperCase() === String(code).trim().toUpperCase()))
    .filter(Boolean), [groupKey, master]);
  // Keep the backend context as the persisted source, while retaining the
  // predefined curriculum rows for a context whose backend data is partial.
  // This prevents adding one subject from hiding the group's existing rows.
  const subjects = useMemo(() => {
    const byCode = new Map(predefinedGroupSubjects.map((subject) => [String(subject.code ?? subject.id).trim().toUpperCase(), subject]));
    contextSubjects.forEach((subject) => byCode.set(String(subject.code ?? subject.id).trim().toUpperCase(), subject));
    return [...byCode.values()];
  }, [contextSubjects, predefinedGroupSubjects]);
  const available = useMemo(() => {
    const source = searchResults.length ? searchResults : activeSubjects.length ? activeSubjects : master;
    return source.filter((subject) => !commonSubjectIds.includes(subject.id) && !contextSubjects.some((item) => item.id === subject.id));
  }, [activeSubjects, contextSubjects, master, searchResults]);
  useEffect(() => {
    let active = true;
    setContext({ levelId: "", groupId: "" });
    setLevels([]);
    setGroups([]);
    if (!navbarBoardId) { setLevelsLoading(false); return undefined; }
    setLevelsLoading(true);
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: navbarBoardId } }).then((response) => {
      if (!active) return;
      setLevels(asList(body(response)).map((item) => option(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"])).filter((item) => item.value && item.label));
      setLevelsLoading(false);
    }).catch(() => { if (active) { setLevels([]); setLevelsLoading(false); } });
    return () => { active = false; };
  }, [navbarBoardId]);
  useEffect(() => {
    let active = true;
    setContext((current) => ({ ...current, groupId: "" }));
    setGroups([]);
    if (!navbarBoardId || !context.levelId) return undefined;
    const requestParams = { academicYearId: navbarAcademicYearId, academicLevelId: context.levelId, isActive: true };
    const rowsFrom = (response) => {
      const payload = body(response), wrappers = asList(payload);
      return Array.isArray(payload?.groups) ? payload.groups : Array.isArray(payload?.Groups) ? payload.Groups : wrappers.flatMap((item) => Array.isArray(item?.groups) ? item.groups : Array.isArray(item?.Groups) ? item.Groups : Array.isArray(item?.groupList) ? item.groupList : get(item, "groupId", "GroupId", "id", "Id") != null ? [item] : []);
    };
    const normalizeGroups = (rows) => rows.map((item) => ({ ...option(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode", "code", "Code"]), raw: item })).filter((item) => item.value && item.label);
    const loadGroups = async () => {
      try {
        const direct = await apiClient.get(apiEndpoints.groups.getByBoard(navbarBoardId), { params: requestParams });
        let next = normalizeGroups(rowsFrom(direct));
        // Some backend versions expose the same filtered data through the
        // general list endpoint instead of the board-specific endpoint.
        if (!next.length) {
          const listed = await apiClient.get(apiEndpoints.groups.list, { params: { boardId: navbarBoardId, ...requestParams } });
          next = normalizeGroups(rowsFrom(listed));
        }
        if (active) setGroups(next);
      } catch {
        if (active) setGroups([]);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, [context.levelId, navbarBoardId, navbarAcademicYearId]);
  const loadContextSubjects = useCallback(async () => {
    if (!navbarBoardId || !context.levelId || !context.groupId) {
      setContextSubjects([]);
      return;
    }
    setSubjectsLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.subjects.context, { params: { boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId } });
      setContextSubjects(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
    } catch (error) {
      setContextSubjects([]);
      setToast(getApiErrorMessage(error) || "Unable to load subjects.");
    } finally {
      setSubjectsLoading(false);
    }
  }, [context.groupId, context.levelId, navbarBoardId]);
  useEffect(() => { loadContextSubjects(); }, [loadContextSubjects]);
  useEffect(() => {
    if (!addOpen || !navbarBoardId) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.subjects.search, { params: { search: subjectSearch, boardId: navbarBoardId, groupId: context.groupId || undefined, academicLevelId: context.levelId || undefined, isActive: true } });
        setSearchResults(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
      } catch { setSearchResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [addOpen, context.groupId, context.levelId, navbarBoardId, subjectSearch]);
  useEffect(() => {
    let active = true;
    apiClient.get(apiEndpoints.subjects.active).then((response) => {
      if (active) setActiveSubjects(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
    }).catch(() => { if (active) setActiveSubjects([]); });
    return () => { active = false; };
  }, []);
  const editDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const editMark = (key, value) => setDraft((current) => ({ ...current, marks: { ...current.marks, [key]: value } }));
  const toggleType = (type) => setDraft((current) => {
    const next = current.type.includes(type) ? current.type.filter((item) => item !== type) : [...current.type, type];
    return { ...current, type: type === "Language" ? ["Language"] : next.filter((item) => item !== "Language") };
  });
  const configureChoice = (id) => {
    setChoice(id);
    const subject = available.find((item) => item.id === id) ?? master.find((item) => item.id === id);
    setDraft(id === "new" || !subject ? empty() : { ...subject, type: [...subject.type], marks: editableMarks(subject.marks) });
  };
  const valid = (newMaster) => {
    if (!draft.name.trim() || !draft.code.trim()) return "Subject name and subject code are required.";
    if (!draft.type.length) return "Select at least one subject type.";
    if (Number(draft.marks.passing) > total(draft.marks)) return "Passing marks cannot exceed total marks.";
    if (newMaster && master.some((subject) => subject.name.toLowerCase() === draft.name.trim().toLowerCase())) return "Subject already exists. Please select it from the available subjects.";
    if (newMaster && master.some((subject) => subject.code.toLowerCase() === draft.code.trim().toLowerCase())) return "Subject code already exists.";
    return "";
  };
  const subjectPayload = (configuration) => ({
    boardId: Number(navbarBoardId), groupId: Number(context.groupId), academicLevelId: Number(context.levelId),
    subjectName: configuration.name, subjectCode: configuration.code, subjectType: configuration.type.join(" + "),
    theory: configuration.type.includes("Theory"), practical: configuration.type.includes("Practical"), language: configuration.type.includes("Language"), elective: false,
    externalMarks: configuration.marks.theory, practicalMarks: configuration.marks.practical, internalMarks: configuration.marks.internal,
    totalMarks: configuration.marks.total, passingMarks: configuration.marks.passing, isActive: true,
  });
  const add = async () => {
    if (!choice) return setToast("Select a subject to add.");
    const isNew = choice === "new", error = valid(isNew);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), type: [...draft.type], marks: savedMarks(draft.marks) };
    if (!navbarBoardId || !context.levelId || !context.groupId) return setToast("Select Academic Level and Group before saving a subject.");
    setSubjectBusy(true);
    try {
      const codeCheck = await apiClient.get(apiEndpoints.subjects.checkCode, { params: { subjectCode: configuration.code, boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId } });
      if (body(codeCheck)?.exists) return setToast("Subject code already exists in this academic context.");
      await apiClient.post(apiEndpoints.subjects.create, subjectPayload(configuration));
      setAddOpen(false); setChoice(""); setDraft(empty()); setSubjectSearch(""); setToast("Subject saved successfully.");
      await loadContextSubjects();
    } catch (requestError) { setToast(getApiErrorMessage(requestError) || "Unable to create subject."); }
    finally { setSubjectBusy(false); }
  };
  const save = async () => {
    const error = valid(false);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), type: [...draft.type], marks: savedMarks(draft.marks) };
    if (editing.scope === "secondLanguage") {
      const duplicate = secondLanguages.some((language) => language.code !== editing.subject.code && (language.name.toLowerCase() === configuration.name.toLowerCase() || language.code.toLowerCase() === configuration.code.toLowerCase()));
      if (duplicate) return setToast("Language name or code already exists.");
      setSecondLanguages((current) => {
        const updated = current.map((language) => language.code === editing.subject.code ? configuration : language);
        saveSecondLanguages(updated);
        return updated;
      });
      setEditing(null); setToast("Second language updated successfully.");
      return;
    }
    if (editing.scope === "common") {
      setMaster((current) => current.map((subject) => subject.id === editing.subject.id ? { ...subject, ...configuration } : subject));
      setEditing(null); setToast("Common subject updated successfully.");
      return;
    }
    setSubjectBusy(true);
    try {
      if (configuration.code !== editing.subject.code) {
        const codeCheck = await apiClient.get(apiEndpoints.subjects.checkCode, { params: { subjectCode: configuration.code, boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId, excludeSubjectId: editing.subject.id } });
        if (body(codeCheck)?.exists) return setToast("Subject code already exists in this academic context.");
      }
      await apiClient.put(apiEndpoints.subjects.update(editing.subject.id), subjectPayload(configuration));
      setEditing(null); setToast("Subject updated successfully.");
      await loadContextSubjects();
    } catch (requestError) { setToast(getApiErrorMessage(requestError) || "Unable to update subject."); }
    finally { setSubjectBusy(false); }
  };
  const remove = async () => {
    if (removing.scope === "secondLanguage") {
      setSecondLanguages((current) => {
        const updated = current.filter((language) => language.code !== removing.code);
        saveSecondLanguages(updated);
        return updated;
      });
      setToast(removing.name + " removed from Second Languages."); setRemoving(null);
      return;
    }
    if (removing.scope === "common") {
      setMaster((current) => current.filter((subject) => subject.id !== removing.id));
      setToast(removing.name + " removed from Common Subjects."); setRemoving(null);
      return;
    }
    setSubjectBusy(true);
    try {
      await apiClient.delete(apiEndpoints.subjects.delete(removing.id));
      setToast(removing.name + " deleted successfully."); setRemoving(null);
      await loadContextSubjects();
    } catch (requestError) { setToast(getApiErrorMessage(requestError) || "Unable to delete subject."); }
    finally { setSubjectBusy(false); }
  };
  const openEdit = async (subject, scope = "group") => {
    if (scope !== "group") { setEditing({ subject, scope }); setDraft({ ...subject, type: [...subject.type], marks: editableMarks(subject.marks) }); return; }
    setSubjectBusy(true);
    try {
      const response = await apiClient.get(apiEndpoints.subjects.byId(subject.id));
      const latest = subjectFromApi(body(response));
      setEditing({ subject: latest.id ? latest : subject, scope });
      setDraft({ ...(latest.id ? latest : subject), type: [...(latest.type?.length ? latest.type : subject.type)], marks: editableMarks(latest.id ? latest.marks : subject.marks) });
    } catch (requestError) { setToast(getApiErrorMessage(requestError) || "Unable to load subject details."); }
    finally { setSubjectBusy(false); }
  };
  const addSecondLanguage = () => {
    const language = languages.find((item) => item.code === languageChoice);
    if (!language) return setToast("Select a language to add.");
    const duplicate = secondLanguages.some((item) =>
      item.name.trim().toLowerCase() === language.name.trim().toLowerCase() ||
      item.code.trim().toLowerCase() === language.code.trim().toLowerCase(),
    );
    if (duplicate) return setToast(language.name + " has already been added.");
    setSecondLanguages((current) => {
      const updated = [...current, { name: language.name, code: language.code, type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } }];
      saveSecondLanguages(updated);
      return updated;
    });
    setLanguageChoice("");
    setLanguageModalOpen(false);
    setToast(language.name + " added to Second Language.");
  };

  return <DashboardLayout title="Subject Management" subtitle="Manage reusable subjects and group-wise marks configuration." breadcrumb={["Academics", "Subject Management"]}>
    <main className="subject-screen subject-master-screen">
      <section className="subject-master-context">
        <Select label="Academic Level" value={context.levelId} options={levels} disabled={levelsLoading || !navbarBoardId || !levels.length} onChange={(levelId) => setContext({ levelId, groupId: "" })} placeholder={levelsLoading ? "Loading academic levels..." : !navbarBoardId ? "No active boards available" : !levels.length ? "No academic levels available" : "Select Academic Level"} />
        <GroupCombobox value={context.groupId} options={groups} onChange={(groupId) => { setContextSubjects([]); setContext((current) => ({ ...current, groupId })); }} disabled={!context.levelId} />
      </section>
      <section className="subject-table-card subject-common-card">
        <header className="subject-table-head subject-common-head"><div><h2>Common Subjects</h2><p>These subjects are applicable to all groups.</p></div><button className="cms-btn cms-btn-primary subject-add-language-btn" type="button" title={secondLanguages.length === languages.length ? "All available languages have been added" : "Add Second Language"} disabled={secondLanguages.length === languages.length} onClick={() => setLanguageModalOpen(true)}><Plus size={16} /> Add Language</button></header>
        <div className="subject-table-scroll"><table className="subject-table subject-master-table"><thead><tr><th>Subject Name</th><th>Subject Code</th><th>Subject Type</th><th>Theory Marks</th><th>Practical Marks</th><th>Internal Marks</th><th>Total Marks</th><th>Passing Marks</th><th>Action</th></tr></thead><tbody>{commonSubjects.filter((subject) => subject.id !== "SL1").map((subject) => <tr key={subject.id}><td>{subject.name}</td><td><b>{subject.code}</b></td><td><span className="subject-tag type">{subject.type.join(" + ")}</span></td><td>{markValue(subject.marks.theory)}</td><td>{markValue(subject.marks.practical)}</td><td>{markValue(subject.marks.internal)}</td><td>{total(subject.marks)}</td><td>{markValue(subject.marks.passing)}</td><td><div className="subject-master-actions"><button className="cms-action-btn" title="Edit common subject" onClick={() => openEdit(subject, "common")}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Delete common subject" onClick={() => setRemoving({ ...subject, scope: "common" })}><Trash2 size={16} /></button></div></td></tr>)}{secondLanguageSubjects.map((subject) => <tr key={subject.code}><td>{subject.name}</td><td><b>{subject.code}</b></td><td><span className="subject-tag type">{subject.type.join(" + ")}</span></td><td>{markValue(subject.marks.theory)}</td><td>{markValue(subject.marks.practical)}</td><td>{markValue(subject.marks.internal)}</td><td>{total(subject.marks)}</td><td>{markValue(subject.marks.passing)}</td><td><div className="subject-master-actions"><button className="cms-action-btn" title="Edit language" onClick={() => openEdit(subject, "secondLanguage")}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Delete language" onClick={() => setRemoving({ ...subject, scope: "secondLanguage" })}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
      </section>
      <section className="subject-table-card">
        <header className="subject-table-head"><h2>Assigned Subjects - {groupKey || "Select Group"}</h2><button className="cms-btn cms-btn-primary" type="button" disabled={!groupKey} onClick={() => { setChoice(""); setDraft(empty()); setAddOpen(true); }}><Plus size={16} /> Add Subject</button></header>
        <div className="subject-table-scroll"><table className="subject-table subject-master-table"><thead><tr><th>Subject Name</th><th>Subject Code</th><th>Subject Type</th><th>Theory Marks</th><th>Practical Marks</th><th>Internal Marks</th><th>Total Marks</th><th>Passing Marks</th><th>Action</th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td>{subject.name}</td><td><b>{subject.code}</b></td><td><span className="subject-tag type">{subject.type.join(" + ")}</span></td><td>{markValue(subject.marks.theory)}</td><td>{markValue(subject.marks.practical)}</td><td>{markValue(subject.marks.internal)}</td><td>{total(subject.marks)}</td><td>{markValue(subject.marks.passing)}</td><td><div className="subject-master-actions"><button className="cms-action-btn" title="Edit subject" onClick={() => openEdit(subject)}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Remove from group" onClick={() => setRemoving(subject)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
      </section>
    </main>
    {addOpen && <Modal title="Add Subject to Group" className="subject-add-modal" onClose={() => !subjectBusy && setAddOpen(false)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setAddOpen(false)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={add} disabled={!choice || subjectBusy}>{subjectBusy ? "Saving..." : "Save Subject"}</button></>}><div className="subject-modal"><SubjectCombobox options={available} value={choice} newName={draft.name} onSearch={setSubjectSearch} onNewName={(name) => { editDraft("name", name); setChoice("new"); }} onChange={configureChoice} />{choice && <Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} includeSubjectName={false} />}</div></Modal>}
    {editing && <Modal title={(editing.scope === "common" ? "Edit Common Subject - " : "Edit Subject - ") + editing.subject.name} onClose={() => !subjectBusy && setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={save} disabled={subjectBusy}>{subjectBusy ? "Saving..." : "Save Changes"}</button></>}><div className="subject-modal"><Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} /></div></Modal>}
    {languageModalOpen && <Modal title="Add Second Language" size="sm" onClose={() => { setLanguageModalOpen(false); setLanguageChoice(""); }} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => { setLanguageModalOpen(false); setLanguageChoice(""); }}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={addSecondLanguage}>Add</button></>}><div className="subject-modal"><label className="subject-master-field"><span>Language</span><select value={languageChoice} onChange={(event) => setLanguageChoice(event.target.value)}><option value="">Select Language</option>{languages.filter((language) => !secondLanguages.some((item) => item.code === language.code)).map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label></div></Modal>}
    {removing && <Modal title={removing.scope === "secondLanguage" ? "Delete Language" : removing.scope === "common" ? "Delete Common Subject" : "Remove Subject"} size="sm" onClose={() => !subjectBusy && setRemoving(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRemoving(null)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={remove} disabled={subjectBusy}>{subjectBusy ? "Removing..." : removing.scope === "common" || removing.scope === "secondLanguage" ? "Delete" : "Remove"}</button></>}>{removing.scope === "secondLanguage" ? <p>Remove <b>{removing.name}</b> from the Second Language options?</p> : removing.scope === "common" ? <p>Delete <b>{removing.name}</b> from Common Subjects?</p> : <p>Remove <b>{removing.name}</b> from {groupKey}? It will remain available in Subject Master and other groups.</p>}</Modal>}
    <Toast message={toast} onClose={() => setToast("")} />
  </DashboardLayout>;
}

function Select({ label, value, options, onChange, placeholder, disabled = false }) { return <label className="subject-master-field"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder || "Select " + label}</option>{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function GroupCombobox({ value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(value), [active, setActive] = useState(0);
  const root = useRef(null);
  const selected = options.find((group) => group.value === String(value));
  const matches = options.filter((group) => group.label.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { setQuery(selected?.label || ""); }, [selected?.label, value]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) { setOpen(false); setQuery(selected?.label || ""); } }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, [selected?.label]);
  const choose = (group) => { onChange(group.value); setQuery(group.label); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  return <div className="subject-combobox subject-group-combobox" ref={root}><label className="subject-master-field"><span>Group</span><div className="subject-group-input"><Search size={17} aria-hidden="true" /><input role="combobox" aria-expanded={open} aria-controls="group-options" aria-autocomplete="list" value={query} disabled={disabled} placeholder="Search or select group..." onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} /><ChevronDown size={17} aria-hidden="true" /></div></label>{open && !disabled && <div id="group-options" className="subject-combobox-options" role="listbox">{matches.length ? matches.map((group, index) => <button key={group.value} type="button" role="option" aria-selected={group.value === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(group)}><strong>{group.label}</strong></button>) : <div className="subject-combobox-empty">No groups found.</div>}</div>}</div>;
}
function SubjectCombobox({ options, value, onChange, newName, onNewName, onSearch }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const root = useRef(null);
  const selected = options.find((subject) => subject.id === value);
  const filtered = options.filter((subject) => (subject.name + " " + subject.code).toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setQuery(value === "new" ? newName || "" : selected?.name || ""); }, [value, selected?.name, newName]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const choose = (item) => { onChange(item.id); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(Boolean(filtered.length)); setActive((index) => Math.min(index + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  const type = (event) => {
    const text = event.target.value, matches = options.filter((subject) => (subject.name + " " + subject.code).toLowerCase().includes(text.toLowerCase()));
    setQuery(text); onSearch?.(text); setActive(0);
    if (matches.length) { if (value === "new") onChange(""); setOpen(true); }
    else { onNewName(text); setOpen(false); }
  };
  return <div className="subject-combobox subject-search-wrapper" ref={root}><label className="subject-master-field"><span>{value === "new" ? "Subject *" : "Subject"}</span><input className="subject-search-input" role="combobox" aria-expanded={open && Boolean(filtered.length)} aria-controls="subject-options" aria-autocomplete="list" value={query} placeholder={value === "new" ? "Enter subject name..." : "Search or select subject..."} onFocus={() => filtered.length && setOpen(true)} onChange={type} onKeyDown={keyDown} /></label>{open && filtered.length ? <div id="subject-options" className="subject-combobox-options subject-search-results" role="listbox">{filtered.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={item.id === value} className={"subject-search-option " + (index === active ? "is-active" : "")} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><strong>{item.name}</strong><span>{item.code + " · " + item.type.join(" + ")}</span></button>)}</div> : null}</div>;
}
function Form({ draft, editDraft, editMark, toggleType, includeSubjectName = true }) { return <><div className="subject-form-grid">{includeSubjectName ? <Text label="Subject Name *" value={draft.name} onChange={(value) => editDraft("name", value)} /> : null}<Text label="Subject Code *" value={draft.code} onChange={(value) => editDraft("code", value)} /></div><fieldset className="subject-types"><legend>Subject Type *</legend>{types.map((type) => <label key={type}><input type="checkbox" checked={draft.type.includes(type)} onChange={() => toggleType(type)} /> {type}</label>)}</fieldset><div className="subject-form-grid subject-marks-grid"><MarkNumber label="Theory Marks" value={draft.marks.theory} onChange={(value) => editMark("theory", value)} /><MarkNumber label="Practical Marks" value={draft.marks.practical} onChange={(value) => editMark("practical", value)} /><MarkNumber label="Internal Marks" value={draft.marks.internal} onChange={(value) => editMark("internal", value)} /><Text label="Total Marks" value={total(draft.marks)} type="number" readOnly /><MarkNumber label="Passing Marks *" value={draft.marks.passing} onChange={(value) => editMark("passing", value)} /></div></>; }
function Text({ label, value, onChange, disabled, readOnly = false, type = "text" }) { return <label className="subject-master-field"><span>{label}</span><input type={type} value={value} disabled={disabled} readOnly={readOnly} onChange={(event) => onChange && onChange(event.target.value)} /></label>; }
function MarkNumber({ label, value, onChange }) { return <label className="subject-master-field"><span>{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
