import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { apiEndpoints } from "../../services/apiEndpoints";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import "./AddEditBoard.css";

const initialForm = {
  boardName: "",
  boardCode: "",
  description: "",
  countryId: "",
  stateId: "",
  academicPatternId: "",
  academicLevelIds: [],
  internalAssessment: false,
  practicalExams: false,
  boardExams: false,
  passPercentage: "",
  gradingSystemId: "",
  rankCalculation: false,
  status: "Active",
};

function normalizeCountries(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.countryId ?? item.id,
    name: item.countryName ?? item.name ?? "",
  }));
}

function normalizeStates(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.stateId ?? item.id,
    name: item.stateName ?? item.name ?? "",
  }));
}

function normalizeAcademicPatterns(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.academicPatternId ?? item.id,
    name: item.patternName ?? item.name ?? "",
  }));
}

function normalizeAcademicLevels(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.academicLevelId ?? item.id,
    name: item.levelName ?? item.name ?? "",
  }));
}

function normalizeGradingSystems(responseData) {
  return asArray(responseData).map((item) => ({
    id: item.gradingSystemId ?? item.id,
    name: item.gradingSystemName ?? item.name ?? "",
  }));
}

export default function AddEditBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(boardId);
  const [form, setForm] = useState(initialForm);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [academicPatterns, setAcademicPatterns] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [gradingSystems, setGradingSystems] = useState([]);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadLookups = async () => {
      try {
        const [countryRes, patternRes, levelRes, gradingRes] = await Promise.all([
          api.get(apiEndpoints.boards.countries, { signal: controller.signal }),
          api.get(apiEndpoints.boards.academicPatterns, { signal: controller.signal }),
          api.get(apiEndpoints.boards.academicLevels, { signal: controller.signal }),
          api.get(apiEndpoints.boards.gradingSystems, { signal: controller.signal }),
        ]);
        setCountries(normalizeCountries(countryRes.data));
        setAcademicPatterns(normalizeAcademicPatterns(patternRes.data));
        setAcademicLevels(normalizeAcademicLevels(levelRes.data));
        setGradingSystems(normalizeGradingSystems(gradingRes.data));
      } catch (fetchError) {
        if (fetchError.name !== "CanceledError") {
          setError("Unable to load form options. Please check backend API connection.");
        }
      }
    };
    loadLookups();
    return () => controller.abort();
  }, []);

  const loadStates = useCallback(async (countryId, signal) => {
    if (!countryId) {
      setStates([]);
      return;
    }
    try {
      setStatesLoading(true);
      const response = await api.get(apiEndpoints.boards.states(countryId), { signal });
      setStates(normalizeStates(response.data));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") {
        setStates([]);
      }
    } finally {
      if (!signal?.aborted) setStatesLoading(false);
    }
  }, []);

  const fetchBoard = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/api/v1/boards/${boardId}`, { signal });
      const data = response.data?.data || response.data;
      setForm({
        ...initialForm,
        ...data,
        countryId: data.countryId ?? "",
        stateId: data.stateId ?? "",
        academicPatternId: data.academicPatternId ?? "",
        academicLevelIds: (data.academicLevelIds ?? []).map(String),
        gradingSystemId: data.gradingSystemId ?? "",
        status: data.status === true || data.status === "Active" ? "Active" : "Inactive",
      });
      if (data.countryId) {
        await loadStates(data.countryId, signal);
      }
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError("Unable to load board. Please check backend API connection.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [boardId, loadStates]);

  const saveBoard = async (payload) => {
    if (editMode) return api.put(`/api/v1/boards/${boardId}`, payload);
    return api.post("/api/v1/boards", payload);
  };

  useEffect(() => {
    if (!editMode) return undefined;
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [editMode, boardId, fetchBoard]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleCountryChange = (event) => {
    const nextCountryId = event.target.value;
    setForm((current) => ({ ...current, countryId: nextCountryId, stateId: "" }));
    loadStates(nextCountryId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.boardName.trim() || !form.boardCode.trim()) {
      setError("Board name and board code are required.");
      return;
    }
    if (!form.countryId) {
      setError("Country is required.");
      return;
    }
    if (!form.academicLevelIds || form.academicLevelIds.length === 0) {
      setError("At least one academic level is required.");
      return;
    }

    const payload = {
      ...form,
      boardCode: form.boardCode.trim().toUpperCase(),
      status: form.status === "Active",
      countryId: Number(form.countryId),
      stateId: form.stateId ? Number(form.stateId) : null,
      academicPatternId: form.academicPatternId ? Number(form.academicPatternId) : null,
      academicLevelIds: form.academicLevelIds.map(Number),
      gradingSystemId: form.gradingSystemId ? Number(form.gradingSystemId) : null,
    };

    try {
      setSubmitting(true);
      setError("");
      await saveBoard(payload);
      navigate("/dashboard/boards");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addEditBoard">
      <PageHeader title={editMode ? "Edit Board" : "Add Board"} subtitle="Configure board identity, academic pattern, assessment rules, and status." actions={<Link className="btn btn-secondary" to="/dashboard/boards">Cancel</Link>} />
      <Card>
        {loading ? <p>Loading board details...</p> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addEditBoardForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Board Name"><input className="input" value={form.boardName} onChange={(event) => setField("boardName", event.target.value)} /></FormField>
            <FormField label="Board Code"><input className="input" value={form.boardCode} onChange={(event) => setField("boardCode", event.target.value)} /></FormField>
<FormField label="Description" className="formField--wide"><textarea className="textarea" value={form.description} onChange={(event) => setField("description", event.target.value)} /></FormField>
            <FormField label="Country">
              <select className="select" value={form.countryId} onChange={handleCountryChange}>
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="State">
              <select className="select" value={form.stateId} onChange={(event) => setField("stateId", event.target.value)} disabled={!form.countryId || statesLoading}>
                <option value="">{statesLoading ? "Loading states..." : "Select State"}</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Academic Pattern">
              <select className="select" value={form.academicPatternId} onChange={(event) => setField("academicPatternId", event.target.value)}>
                <option value="">Select Academic Pattern</option>
                {academicPatterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>{pattern.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Pass Percentage"><input className="input" type="number" value={form.passPercentage} onChange={(event) => setField("passPercentage", event.target.value)} /></FormField>

            <FormField label="Grading System">
              <select className="select" value={form.gradingSystemId} onChange={(event) => setField("gradingSystemId", event.target.value)}>
                <option value="">Select Grading System</option>
                {gradingSystems.map((system) => (
                  <option key={system.id} value={system.id}>{system.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Status"><select className="select" value={form.status} onChange={(event) => setField("status", event.target.value)}><option>Active</option><option>Inactive</option></select></FormField>
          </div>

          <FormField label="Academic Levels">
            <div className="optionGrid">
              {academicLevels.map((level) => {
                const idStr = String(level.id);
                const checked = form.academicLevelIds.includes(idStr);
                return (
                  <label className="checkOption" key={level.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextIds = event.target.checked
                          ? [...form.academicLevelIds, idStr]
                          : form.academicLevelIds.filter((id) => id !== idStr);
                        setField("academicLevelIds", nextIds);
                      }}
                    />
                    {level.name}
                  </label>
                );
              })}
            </div>
          </FormField>

          <div className="optionGrid">{["internalAssessment", "practicalExams", "boardExams", "rankCalculation"].map((key) => <label className="checkOption" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setField(key, event.target.checked)} />{key.replace(/([A-Z])/g, " $1")}</label>)}</div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : editMode ? "Update Board" : "Add Board"}</Button></div>
        </form>
      </Card>
    </section>
  );
}