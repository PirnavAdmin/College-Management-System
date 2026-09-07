import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { groupSubjectMap, subjectMaster } from "@/data/subjectMasterData.js";
import "./SubjectManagementPage.css";

const groups = ["MPC", "BiPC", "MEC", "CEC", "HEC"];
const types = ["Theory", "Practical", "Language"];
const cloneMap = () => Object.fromEntries(Object.entries(groupSubjectMap).map(([group, ids]) => [group, ids.map((subjectId) => ({ subjectId, overrides: {} }))]));
const empty = () => ({ id: "", name: "", code: "", type: [], marks: { theory: 0, practical: 0, internal: 0, passing: 0 } });
const markValue = (value) => {
  const raw = value && typeof value === "object" ? value.value ?? value.mark ?? value.marks ?? 0 : value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};
const total = (marks = {}) => markValue(marks.theory) + markValue(marks.practical) + markValue(marks.internal);

export const pageConfig = { title: "Subject Management", rows: [], fields: [] };

export default function SubjectManagementPage() {
  const [context, setContext] = useState({ board: "BIEAP", year: "2026-2027", level: "Intermediate 1st Year", group: "MPC" });
  const [master, setMaster] = useState(() => subjectMaster.map((item) => ({ ...item, marks: { ...item.marks } })));
  const [mapping, setMapping] = useState(cloneMap);
  const [addOpen, setAddOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState("");
  const assigned = mapping[context.group] || [];
  const subjects = useMemo(() => assigned.map((item) => {
    const base = master.find((subject) => subject.id === item.subjectId);
    return base && { ...base, ...item.overrides, marks: { ...base.marks, ...(item.overrides.marks || {}) } };
  }).filter(Boolean), [assigned, master]);
  const available = master.filter((subject) => !assigned.some((item) => item.subjectId === subject.id));
  const editDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const editMark = (key, value) => setDraft((current) => ({ ...current, marks: { ...current.marks, [key]: Math.max(0, Number(value) || 0) } }));
  const toggleType = (type) => setDraft((current) => {
    const next = current.type.includes(type) ? current.type.filter((item) => item !== type) : [...current.type, type];
    return { ...current, type: type === "Language" ? ["Language"] : next.filter((item) => item !== "Language") };
  });
  const configureChoice = (id) => {
    setChoice(id);
    const subject = master.find((item) => item.id === id);
    setDraft(id === "others" || !subject ? empty() : { ...subject, type: [...subject.type], marks: { ...subject.marks } });
  };
  const valid = (newMaster) => {
    if (!draft.name.trim() || !draft.code.trim()) return "Subject name and subject code are required.";
    if (!draft.type.length) return "Select at least one subject type.";
    if (Number(draft.marks.passing) > total(draft.marks)) return "Passing marks cannot exceed total marks.";
    if (newMaster && master.some((subject) => subject.code.toLowerCase() === draft.code.trim().toLowerCase())) return "Subject code already exists in Subject Master.";
    return "";
  };
  const add = () => {
    if (!choice) return setToast("Select a subject to add.");
    const isNew = choice === "others", error = valid(isNew);
    if (error) return setToast(error);
    const id = isNew ? draft.code.trim().toUpperCase() : choice;
    if (assigned.some((item) => item.subjectId === id)) return setToast(draft.name + " is already assigned to " + context.group + ".");
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), type: [...draft.type], marks: { ...draft.marks, total: total(draft.marks) } };
    if (isNew) setMaster((current) => [...current, { ...configuration, id }]);
    setMapping((current) => ({ ...current, [context.group]: [...assigned, { subjectId: id, overrides: isNew ? {} : configuration }] }));
    setAddOpen(false); setChoice(""); setDraft(empty()); setToast((isNew ? "Subject created and added to " : "Subject added to ") + context.group + ".");
  };
  const save = () => {
    const error = valid(false);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), type: [...draft.type], marks: { ...draft.marks, total: total(draft.marks) } };
    setMapping((current) => ({ ...current, [context.group]: current[context.group].map((item) => item.subjectId === editing.id ? { ...item, overrides: configuration } : item) }));
    setEditing(null); setToast("Subject configuration saved for " + context.group + ".");
  };
  const remove = () => {
    setMapping((current) => ({ ...current, [context.group]: current[context.group].filter((item) => item.subjectId !== removing.id) }));
    setToast(removing.name + " removed from " + context.group + "."); setRemoving(null);
  };
  const openEdit = (subject) => { setEditing(subject); setDraft({ ...subject, type: [...subject.type], marks: { ...subject.marks } }); };

  return <DashboardLayout title="Subject Management" subtitle="Manage reusable subjects and group-wise marks configuration." breadcrumb={["Academics", "Subject Management"]}>
    <main className="subject-screen subject-master-screen">
      <section className="subject-master-context">
        <Select label="Board" value={context.board} options={["BIEAP"]} onChange={(board) => setContext({ ...context, board })} />
        <Select label="Academic Year" value={context.year} options={["2026-2027"]} onChange={(year) => setContext({ ...context, year })} />
        <Select label="Academic Level" value={context.level} options={["Intermediate 1st Year", "Intermediate 2nd Year"]} onChange={(level) => setContext({ ...context, level })} />
        <GroupCombobox value={context.group} onChange={(group) => setContext({ ...context, group })} />
      </section>
      <section className="subject-table-card">
        <header className="subject-table-head"><h2>Assigned Subjects - {context.group}</h2><button className="cms-btn cms-btn-primary" type="button" onClick={() => { setChoice(""); setDraft(empty()); setAddOpen(true); }}><Plus size={16} /> Add Subject</button></header>
        <div className="subject-table-scroll"><table className="subject-table subject-master-table"><thead><tr><th>Subject Name</th><th>Subject Code</th><th>Subject Type</th><th>Theory Marks</th><th>Practical Marks</th><th>Internal Marks</th><th>Total Marks</th><th>Passing Marks</th><th>Action</th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td>{subject.name}</td><td><b>{subject.code}</b></td><td><span className="subject-tag type">{subject.type.join(" + ")}</span></td><td>{markValue(subject.marks.theory)}</td><td>{markValue(subject.marks.practical)}</td><td>{markValue(subject.marks.internal)}</td><td>{total(subject.marks)}</td><td>{markValue(subject.marks.passing)}</td><td><div className="subject-master-actions"><button className="cms-action-btn" title="Edit subject" onClick={() => openEdit(subject)}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Remove from group" onClick={() => setRemoving(subject)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
      </section>
    </main>
    {addOpen && <Modal title="Add Subject to Group" onClose={() => setAddOpen(false)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={add}>{choice === "others" ? "Create & Add Subject" : "Add to Group"}</button></>}><div className="subject-modal"><SubjectCombobox options={available} value={choice} onChange={configureChoice} />{choice && <Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} />}</div></Modal>}
    {editing && <Modal title={"Edit Subject - " + editing.name} onClose={() => setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={save}>Save Changes</button></>}><div className="subject-modal"><Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} /></div></Modal>}
    {removing && <Modal title="Remove Subject" size="sm" onClose={() => setRemoving(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRemoving(null)}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={remove}>Remove</button></>}><p>Remove <b>{removing.name}</b> from {context.group}? It will remain available in Subject Master and other groups.</p></Modal>}
    <Toast message={toast} onClose={() => setToast("")} />
  </DashboardLayout>;
}

function Select({ label, value, options, onChange, placeholder, other }) { return <label className="subject-master-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder || "Select " + label}</option>{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}{other && <option value="others">Others / Add New Subject</option>}</select></label>; }
function GroupCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(value), [active, setActive] = useState(0);
  const root = useRef(null);
  const matches = groups.filter((group) => group.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) { setOpen(false); setQuery(value); } }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, [value]);
  const choose = (group) => { onChange(group); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  return <div className="subject-combobox subject-group-combobox" ref={root}><label className="subject-master-field"><span>Group</span><input role="combobox" aria-expanded={open} aria-controls="group-options" aria-autocomplete="list" value={query} placeholder="Search or select group..." onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} /></label>{open && <div id="group-options" className="subject-combobox-options" role="listbox">{matches.length ? matches.map((group, index) => <button key={group} type="button" role="option" aria-selected={group === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(group)}><strong>{group}</strong></button>) : <div className="subject-combobox-empty">No groups found.</div>}</div>}</div>;
}
function SubjectCombobox({ options, value, onChange }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const root = useRef(null);
  const selected = options.find((subject) => subject.id === value);
  const filtered = options.filter((subject) => (subject.name + " " + subject.code).toLowerCase().includes(query.toLowerCase()));
  const items = [...filtered, { id: "others", name: "Others / Add New Subject", code: "Create a new reusable subject", type: [] }];
  useEffect(() => { setQuery(value === "others" ? "Others / Add New Subject" : selected?.name || ""); }, [value, selected?.name]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const choose = (item) => { onChange(item.id); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, items.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && items[active]) { event.preventDefault(); choose(items[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  return <div className="subject-combobox" ref={root}><label className="subject-master-field"><span>Subject</span><input role="combobox" aria-expanded={open} aria-controls="subject-options" aria-autocomplete="list" value={query} placeholder="Search or select subject..." onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} /></label>{open && <div id="subject-options" className="subject-combobox-options" role="listbox">{items.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={item.id === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><strong>{item.name}</strong><span>{item.id === "others" ? item.code : item.code + " · " + item.type.join(" + ")}</span></button>)}</div>}</div>;
}
function Form({ draft, editDraft, editMark, toggleType }) { return <><div className="subject-form-grid"><Text label="Subject Name *" value={draft.name} onChange={(value) => editDraft("name", value)} /><Text label="Subject Code *" value={draft.code} onChange={(value) => editDraft("code", value)} /></div><fieldset className="subject-types"><legend>Subject Type *</legend>{types.map((type) => <label key={type}><input type="checkbox" checked={draft.type.includes(type)} onChange={() => toggleType(type)} /> {type}</label>)}</fieldset><div className="subject-form-grid subject-marks-grid"><MarkNumber label="Theory Marks" value={draft.marks.theory} onChange={(value) => editMark("theory", value)} /><MarkNumber label="Practical Marks" value={draft.marks.practical} onChange={(value) => editMark("practical", value)} /><MarkNumber label="Internal Marks" value={draft.marks.internal} onChange={(value) => editMark("internal", value)} /><Text label="Total Marks" value={total(draft.marks)} disabled /><MarkNumber label="Passing Marks *" value={draft.marks.passing} onChange={(value) => editMark("passing", value)} /></div></>; }
function Text({ label, value, onChange, disabled }) { return <label className="subject-master-field"><span>{label}</span><input value={value} disabled={disabled} onChange={(event) => onChange && onChange(event.target.value)} /></label>; }
function MarkNumber({ label, value, onChange }) { return <label className="subject-master-field"><span>{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
