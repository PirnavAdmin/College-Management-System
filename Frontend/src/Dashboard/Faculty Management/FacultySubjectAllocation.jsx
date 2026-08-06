import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiAward, FiBookOpen, FiCheckCircle, FiEdit2, FiFilter, FiLayers, FiPrinter, FiRefreshCw, FiSearch, FiTrash2, FiDownload, FiClock, FiUser } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import EmptyState from "../../shared/components/EmptyState";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import { apiEndpoints } from "../../services/apiEndpoints";
import "./FacultySubjectAllocation.css";

const fields = [["faculty", "Faculty"], ["board", "Board"], ["academicYear", "Academic Year"], ["group", "Group"], ["academicLevel", "Academic Level"], ["section", "Section"], ["subject", "Subject"]];
const idFields = { academicYear: "academicYearId", group: "groupId", academicLevel: "academicLevelId", section: "sectionId", subject: "subjectId" };
const initialForm = { ...fields.reduce((acc, [key]) => ({ ...acc, [key]: "" }), {}), facultyId: "", boardId: "", academicYearId: "", groupId: "", academicLevelId: "", sectionId: "", subjectId: "" };

export default function FacultySubjectAllocation() {
  const [form, setForm] = useState(initialForm);
  const [allocations, setAllocations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [boardOptions, setBoardOptions] = useState([]);
  const [academicOptions, setAcademicOptions] = useState({ academicYear: [], group: [], academicLevel: [], section: [], subject: [] });
  const [workload, setWorkload] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState({ board: "", academicYear: "", academicLevel: "" });
  const persistedFacultyKey = "facultySubjectAllocationSelectedFacultyId";

  const createAllocation = async (payload) => api.post(apiEndpoints.faculty.assignSubject, payload);
  const updateAllocation = async (id, payload) => api.put(apiEndpoints.faculty.assignment(id), payload);
  const deleteAllocation = async (id) => api.delete(apiEndpoints.faculty.assignment(id));
  const fetchFacultyDropdown = async (signal) => {
    try {
      const response = await api.get(apiEndpoints.faculty.dropdown, { signal, params: { "api-version": "1.0" } });
      const dropdownFaculty = asArray(response.data).map((item) => ({
        id: item.id ?? item.facultyId ?? item.value,
        name: item.fullName ?? item.name ?? item.label ?? [item.firstName, item.lastName].filter(Boolean).join(" "),
      })).filter((item) => item.id && item.name);
      if (dropdownFaculty.length) setFacultyOptions(dropdownFaculty);
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    }
  };
  const fetchBoards = async (signal) => {
    try {
      const response = await api.get(apiEndpoints.boards.list, { signal });
      const payload = response.data;
      const records = [payload, payload?.data, payload?.items, payload?.data?.items, payload?.data?.boards, payload?.boards, payload?.content].find(Array.isArray) || [];
      const dropdownBoards = records.map((item) => ({
        id: item.boardId ?? item.id,
        name: item.boardName ?? item.name ?? item.boardCode,
      })).filter((item) => item.id && item.name);
      if (dropdownBoards.length) setBoardOptions(dropdownBoards);
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    }
  };
  const fetchAcademicOptions = async (signal) => {
    const requests = {
      academicYear: api.get(apiEndpoints.academicYears.list, { signal }),
      group: api.get(apiEndpoints.groups.list, { signal }),
      academicLevel: api.get(apiEndpoints.boards.academicLevels, { signal }),
      section: api.get(apiEndpoints.sections.list, { signal }),
      subject: api.get(apiEndpoints.subjects.list, { signal }),
    };
    const results = await Promise.allSettled(Object.values(requests));
    if (signal.aborted) return;
    const nextOptions = {};
    Object.keys(requests).forEach((key, index) => {
      if (results[index].status === "fulfilled") {
        const options = toDropdownOptions(results[index].value.data);
        if (key === "group") {
          nextOptions[key] = toDropdownOptions(results[index].value.data, false);
        } else if (key === "subject") {
          nextOptions[key] = options.filter((item) => String(item.name).trim().toLowerCase() !== "physics lab");
        } else {
          nextOptions[key] = options;
        }
      }
    });
    setAcademicOptions((current) => ({ ...current, ...nextOptions }));
  };
  const mapWorkloadAllocations = (allocations = []) => {
    return allocations.map((item) => ({
      id: item.id || item.assignmentId || Date.now(),
      facultyId: item.facultyId,
      faculty: item.facultyName || item.faculty || "",
      board: item.boardName || item.board || "",
      academicYear: item.academicYearName || item.academicYear || "",
      group: item.groupName || item.group || "",
      academicLevel: item.academicLevelName || item.academicLevel || "",
      section: item.sectionName || item.section || "",
      subject: item.subjectName || item.subject || "",
      weeklyClasses: item.weeklyClasses ?? item.totalWorkloadHours ?? 0,
      status: item.status || "Allocated",
      ...item,
    }));
  };

  const fetchWorkload = async (facultyId = form.facultyId) => {
    if (!facultyId) {
      setError("Select a faculty member to view their workload.");
      return;
    }
    try {
      setError("");
      setLoading(true);
      const response = await api.get(apiEndpoints.faculty.workload(facultyId), { params: { "api-version": "1.0" } });
      const payload = response.data?.data ?? response.data;
      setWorkload(payload);
      setAllocations(mapWorkloadAllocations(payload?.allocations || []));
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchFacultyDropdown(controller.signal);
    fetchBoards(controller.signal);
    fetchAcademicOptions(controller.signal);
    return () => controller.abort();
  }, []);

  const setFaculty = (id) => {
    const selected = facultyOptions.find((item) => String(item.id) === id);
    setForm((current) => ({ ...current, facultyId: id, faculty: selected?.name || "" }));
    setWorkload(null);
    setAllocations([]);
    if (id) {
      window.localStorage.setItem(persistedFacultyKey, id);
    } else {
      window.localStorage.removeItem(persistedFacultyKey);
    }
  };

  useEffect(() => {
    const persistedFacultyId = window.localStorage.getItem(persistedFacultyKey);
    if (persistedFacultyId) {
      setForm((current) => ({ ...current, facultyId: persistedFacultyId }));
    }
  }, []);

  useEffect(() => {
    if (!form.facultyId) return;
    fetchWorkload(form.facultyId);
  }, [form.facultyId]);

  const setBoard = (id) => {
    const selected = boardOptions.find((item) => String(item.id) === id);
    setForm((current) => ({ ...current, boardId: id, board: selected?.name || id }));
  };
  const selectAcademicOption = (key, id) => {
    const selected = academicOptions[key].find((item) => String(item.id) === id);
    setForm((current) => ({ ...current, [key]: selected?.name || "", [idFields[key]]: id }));
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter((allocation) => {
      const matchesSearch = searchTerm
        ? [allocation.subject, allocation.group, allocation.section].some((value) =>
            String(value || "").toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : true;
      const matchesBoard = filterValues.board ? allocation.board === filterValues.board : true;
      const matchesAcademicYear = filterValues.academicYear ? allocation.academicYear === filterValues.academicYear : true;
      const matchesAcademicLevel = filterValues.academicLevel ? allocation.academicLevel === filterValues.academicLevel : true;
      return matchesSearch && matchesBoard && matchesAcademicYear && matchesAcademicLevel;
    });
  }, [allocations, searchTerm, filterValues]);

  const boardFilterOptions = useMemo(() => [...new Set(allocations.map((item) => item.board).filter(Boolean))], [allocations]);
  const academicYearFilterOptions = useMemo(() => [...new Set(allocations.map((item) => item.academicYear).filter(Boolean))], [allocations]);
  const academicLevelFilterOptions = useMemo(() => [...new Set(allocations.map((item) => item.academicLevel).filter(Boolean))], [allocations]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterValues({ board: "", academicYear: "", academicLevel: "" });
  };
  const getDropdownOptions = (key) => key === "faculty" ? facultyOptions : key === "board" ? boardOptions : academicOptions[key] || [];
  const getDropdownValue = (key) => key === "faculty" ? form.facultyId : key === "board" ? form.boardId : form[idFields[key]];
  const resetForm = () => { setForm(initialForm); setEditingId(null); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const payload = {
      facultyId: Number(form.facultyId),
      boardId: Number(form.boardId),
      academicLevelId: Number(form.academicLevelId),
      academicYearId: Number(form.academicYearId),
      groupId: Number(form.groupId),
      sectionId: Number(form.sectionId),
      subjectId: Number(form.subjectId),
    };
    if (Object.values(payload).some((value) => !Number.isInteger(value) || value <= 0)) {
      setError("Select every allocation field before saving.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await (editingId ? updateAllocation(editingId, payload) : createAllocation(payload));
      await fetchWorkload(form.facultyId);
      resetForm();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  const removeAllocation = async (id) => {
    if (!window.confirm("Delete this subject allocation?")) return;
    try {
      await deleteAllocation(id);
      await fetchWorkload(form.facultyId);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  return (
    <section className="facultySubjectAllocation">
      <PageHeader title="Faculty Subject Allocation" subtitle="Assign subjects to faculty using safe academic-context selections." actions={<Button onClick={fetchWorkload}><FiRefreshCw /> Refresh</Button>} />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card className="workloadHeaderCard">
        <div className="workloadHeaderContent">
          <div>
            <h2>Faculty Workload</h2>
            <p>View faculty workload and subject allocation details.</p>
          </div>
          <div className="headerActions">
            <Button variant="secondary" onClick={() => navigate("/dashboard/faculty") }><FiArrowLeft /> Back</Button>
            <Button variant="outline"><FiPrinter /> Print</Button>
            <Button variant="outline"><FiDownload /> Export</Button>
          </div>
        </div>
      </Card>

      <Card className="allocationFormCard workloadFormCard">
        <form className="allocationForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            {fields.map(([key, label]) => (
              <FormField label={label} key={key}>
                <select
                  className={`select ${key === "board" ? "boardSelect" : ""}`}
                  title={key === "board" ? form.board : undefined}
                  value={getDropdownValue(key)}
                  onChange={(event) =>
                    key === "faculty"
                      ? setFaculty(event.target.value)
                      : key === "board"
                      ? setBoard(event.target.value)
                      : selectAcademicOption(key, event.target.value)
                  }
                >
                  <option value="">Select {label}</option>
                  {getDropdownOptions(key).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ))}
          </div>
          <div className="page-actions">
            <Button variant="primary" disabled={submitting}>
              <FiCheckCircle /> {submitting ? "Saving..." : editingId ? "Update Allocation" : "Allocate Subject"}
            </Button>
            <Button type="button" onClick={resetForm}>Reset</Button>
          </div>
        </form>
      </Card>

      <Card className="workloadControlsCard">
        <div className="workloadControls">
          <div className="workloadSearchGroup">
            <label htmlFor="workloadSearch">Search</label>
            <div className="searchInput">
              <FiSearch />
              <input id="workloadSearch" type="search" placeholder="Search subject, group, section" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          </div>
          <div className="filterGroup">
            <FormField label="Board">
              <select value={filterValues.board} onChange={(event) => setFilterValues((current) => ({ ...current, board: event.target.value }))}>
                <option value="">All boards</option>
                {boardFilterOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </FormField>
            <FormField label="Academic Year">
              <select value={filterValues.academicYear} onChange={(event) => setFilterValues((current) => ({ ...current, academicYear: event.target.value }))}>
                <option value="">All years</option>
                {academicYearFilterOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </FormField>
            <FormField label="Academic Level">
              <select value={filterValues.academicLevel} onChange={(event) => setFilterValues((current) => ({ ...current, academicLevel: event.target.value }))}>
                <option value="">All levels</option>
                {academicLevelFilterOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </FormField>
            <button type="button" className="filterClearButton" onClick={clearFilters}><FiFilter /> Clear</button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="errorCard">
          <div>
            <strong>Unable to load workload.</strong>
            <p>{error}</p>
          </div>
          <Button variant="primary" onClick={() => fetchWorkload(form.facultyId)}>Retry</Button>
        </Card>
      ) : null}

      <div className="workloadSummaryGrid">
        <Card className="infoCard">
          <div className="infoIcon"><FiUser /></div>
          <div>
            <h4>{workload?.facultyName || "Faculty name"}</h4>
            <p>{workload?.employeeId || "Employee ID"}</p>
            <span>{workload?.department || "Department"}</span>
            <span>{workload?.designation || "Designation"}</span>
          </div>
        </Card>
        <Card className="statCard primary">
          <div>
            <span>Assigned Subjects</span>
            <h3>{workload?.totalAssignedSubjects ?? 0}</h3>
          </div>
          <FiBookOpen />
        </Card>
        <Card className="statCard success">
          <div>
            <span>Assigned Sections</span>
            <h3>{workload?.totalSections ?? 0}</h3>
          </div>
          <FiLayers />
        </Card>
        <Card className="statCard warning">
          <div>
            <span>Weekly Classes</span>
            <h3>{workload?.weeklyClasses ?? 0}</h3>
          </div>
          <FiClock />
        </Card>
        <Card className="statCard info">
          <div>
            <span>Workload Hours</span>
            <h3>{workload?.totalWorkloadHours ?? 0}</h3>
          </div>
          <FiAward />
        </Card>
      </div>

      <Card className="tableCard">
        <div className="tableHeaderRow">
          <h3>Subject Allocations</h3>
          <span>{filteredAllocations.length} allocations</span>
        </div>
        {loading ? (
          <div className="tableSkeleton">
            {[...Array(5)].map((_, index) => <div key={index} className="skeletonRow" />)}
          </div>
        ) : filteredAllocations.length === 0 ? (
          <EmptyState title="No subject allocations found." message="Use the faculty selector above to view assignments." />
        ) : (
          <div className="tableWrapper">
            <table className="workloadTable">
              <thead>
                <tr>
                  <th>Board</th>
                  <th>Academic Level</th>
                  <th>Academic Year</th>
                  <th>Group</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Weekly Classes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td>{allocation.board}</td>
                    <td>{allocation.academicLevel}</td>
                    <td>{allocation.academicYear}</td>
                    <td>{allocation.group}</td>
                    <td>{allocation.section}</td>
                    <td>{allocation.subject}</td>
                    <td>{allocation.weeklyClasses}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" type="button" title="Edit allocation" onClick={() => {
                          setEditingId(allocation.id);
                          setForm((current) => ({
                            ...current,
                            facultyId: allocation.facultyId || current.facultyId,
                            boardId: allocation.boardId || current.boardId,
                            academicYearId: allocation.academicYearId || current.academicYearId,
                            groupId: allocation.groupId || current.groupId,
                            academicLevelId: allocation.academicLevelId || current.academicLevelId,
                            sectionId: allocation.sectionId || current.sectionId,
                            subjectId: allocation.subjectId || current.subjectId,
                          }));
                        }}>
                          <FiEdit2 />
                        </button>
                        <button className="icon-button" type="button" title="Delete allocation" onClick={() => removeAllocation(allocation.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

function toDropdownOptions(data, deduplicate = true) {
  const payload = data?.data ?? data;
  const records = Array.isArray(payload) ? payload : payload?.items ?? payload?.content ?? payload?.records ?? [];
  const options = records.map((item) => ({
    id: item.id ?? item.academicYearId ?? item.groupId ?? item.academicLevelId ?? item.sectionId ?? item.subjectId ?? item.value ?? item.code,
    name: item.name ?? item.academicYearName ?? item.academicYear ?? item.yearName ?? item.groupName ?? item.levelName ?? item.sectionName ?? item.subjectName ?? item.label ?? item.code,
  })).filter((item) => item.id && item.name);
  return deduplicate ? options.filter((item, index) => options.findIndex((candidate) => String(candidate.name).trim().toLowerCase() === String(item.name).trim().toLowerCase()) === index) : options;
}
