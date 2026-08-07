import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit2, FiEye, FiPlus, FiRefreshCw, FiRotateCcw, FiTrash2, FiX } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import "./SubjectList.css";

const BOARDS = ["State Board", "CBSE", "ICSE"];
const GROUPS = ["MPC", "BiPC", "CEC", "MEC", "HEC"];
const ACADEMIC_LEVELS = ["First Year", "Second Year"];
const SUBJECT_TYPES = ["Theory", "Practical", "Language", "Elective"];
const initialFilters = { search: "", board: "", group: "", academicLevel: "", subjectType: "" };

export default function SubjectList() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSubjects = async (signal, group = filters.group) => {
    try {
      setLoading(true);
      setError("");
      const endpoint = group ? `/api/Subjects/group/${group}` : "/api/Subjects";
      const response = await api.get(endpoint, { signal });
      setSubjects(asArray(response.data));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchSubjectById = async (subjectId) => {
    try {
      const response = await api.get(`/api/Subjects/${subjectId}`);
      setSelectedSubject(response.data?.data || response.data);
    } catch (viewError) {
      setError(getApiErrorMessage(viewError));
    }
  };

  const deleteSubject = async (subjectId) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await api.delete(`/api/Subjects/${subjectId}`);
      await fetchSubjects();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSubjects(controller.signal, "");
    return () => controller.abort();
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === "group") fetchSubjects(undefined, value);
  };

  const filteredSubjects = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesSearch =
        !search ||
        subject.subjectName?.toLowerCase().includes(search) ||
        subject.subjectCode?.toLowerCase().includes(search);
      return (
        matchesSearch &&
        (!filters.board || subject.board === filters.board) &&
        (!filters.academicLevel || subject.academicLevel === filters.academicLevel) &&
        (!filters.subjectType || subject.subjectType?.includes(filters.subjectType))
      );
    });
  }, [filters, subjects]);

  return (
    <section className="subjectList">
      <PageHeader title="Subject List" subtitle="Manage subjects, academic levels, subject types, and marks." actions={<><Button onClick={() => fetchSubjects()}><FiRefreshCw /> Refresh</Button><Link className="btn btn-primary" to="/dashboard/subjects/new"><FiPlus /> Add Subject</Link></>} />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card padded={false}>
        <div className="filterToolbar">
          <input className="input" placeholder="Search subject" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          <select className="select" value={filters.board} onChange={(event) => updateFilter("board", event.target.value)}><option value="">All Boards</option>{BOARDS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="select" value={filters.group} onChange={(event) => updateFilter("group", event.target.value)}><option value="">All Groups</option>{GROUPS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="select" value={filters.academicLevel} onChange={(event) => updateFilter("academicLevel", event.target.value)}><option value="">All Levels</option>{ACADEMIC_LEVELS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="select" value={filters.subjectType} onChange={(event) => updateFilter("subjectType", event.target.value)}><option value="">All Types</option>{SUBJECT_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {loading ? <EmptyState title="Loading subjects" /> : (
          <DataTable
            columns={[
              { key: "subjectName", label: "Subject Name" },
              { key: "subjectCode", label: "Subject Code" },
              { key: "group", label: "Group" },
              { key: "academicLevel", label: "Academic Level" },
              { key: "subjectType", label: "Subject Type" },
              { key: "totalMarks", label: "Maximum Marks" },
              { key: "passingMarks", label: "Passing Marks" },
            ]}
            rows={filteredSubjects}
            empty={<EmptyState title="No subjects found" message="Add subjects or adjust filters." />}
            renderActions={(subject) => (
              <div className="row-actions">
                <button className="icon-button" type="button" title="View" onClick={() => fetchSubjectById(subject.subjectId || subject.id)}><FiEye /></button>
                <button className="icon-button" type="button" title="Edit" onClick={() => navigate(`/dashboard/subjects/${subject.subjectId || subject.id}/edit`)}><FiEdit2 /></button>
                <button className="icon-button" type="button" title="Delete" onClick={() => deleteSubject(subject.subjectId || subject.id)}><FiTrash2 /></button>
              </div>
            )}
          />
        )}
      </Card>
      {selectedSubject ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedSubject(null)}>
          <section className="card modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{selectedSubject.subjectName || "Subject Details"}</h2>
              <button className="icon-button" type="button" onClick={() => setSelectedSubject(null)}><FiX /></button>
            </div>
            <div className="subjectDetails">
              {["subjectCode", "board", "group", "academicLevel", "subjectType", "totalMarks", "passingMarks"].map((key) => (
                <div key={key}><strong>{key.replace(/([A-Z])/g, " $1")}</strong><span>{selectedSubject[key] || "-"}</span></div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
