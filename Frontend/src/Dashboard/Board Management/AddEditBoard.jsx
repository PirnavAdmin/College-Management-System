import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { env } from "../../config/env";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import "./AddEditBoard.css";

const STORAGE_KEY = "cms_demo_boards";

const DEFAULT_BOARDS = [
  {
    boardId: 1,
    boardName: "Board of Intermediate Education",
    boardCode: "BIEAP",
    country: "India",
    state: "Andhra Pradesh",
    academicStructure: "Intermediate",
    status: "Active",
    isActive: true,
    createdDate: "2026-08-01",
  },
  {
    boardId: 2,
    boardName: "Central Board of Secondary Education",
    boardCode: "CBSE",
    country: "India",
    state: "All India",
    academicStructure: "School Education",
    status: "Active",
    isActive: true,
    createdDate: "2026-08-01",
  },
];

const initialForm = {
  boardName: "",
  boardCode: "",
  description: "",
  country: "",
  state: "",
  academicPattern: "",
  academicLevels: "",
  internalAssessment: false,
  practicalExams: false,
  boardExams: false,
  passPercentage: "",
  gradingSystem: "",
  rankCalculation: false,
  status: "Active",
};

export default function AddEditBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(boardId);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchBoard = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");

      if (env.enableMockAuth) {
        setForm({ ...initialForm, ...findDemoBoard(boardId) });
        return;
      }

      const response = await api.get(`/api/v1/boards/${boardId}`, { signal });
      setForm({ ...initialForm, ...(response.data?.data || response.data) });
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") {
        const demoBoard = findDemoBoard(boardId);
        if (demoBoard) setForm({ ...initialForm, ...demoBoard });
        setError("Backend is not reachable from local development. Using demo mode or please check API/proxy.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [boardId]);

  const saveBoard = async (payload) => {
    if (env.enableMockAuth) {
      if (editMode) return updateDemoBoard(boardId, payload);
      return createDemoBoard(payload);
    }

    try {
      if (editMode) return await api.put(`/api/v1/boards/${boardId}`, payload);
      return await api.post("/api/v1/boards", payload);
    } catch (saveError) {
      if (editMode) updateDemoBoard(boardId, payload);
      else createDemoBoard(payload);
      setError(`${getApiErrorMessage(saveError)} Saved to local demo boards instead.`);
      return null;
    }
  };

  useEffect(() => {
    if (!editMode) return undefined;
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [editMode, boardId, fetchBoard]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.boardName.trim() || !form.boardCode.trim()) {
      setError("Board name and board code are required.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await saveBoard({
        ...form,
        boardCode: form.boardCode.trim().toUpperCase(),
        status: form.status,
        isActive: form.status === "Active",
      });
      navigate("/dashboard/boards");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addEditBoard">
      <PageHeader
        title={editMode ? "Edit Board" : "Add Board"}
        subtitle="Configure board identity, academic pattern, assessment rules, and status."
        actions={<Link className="btn btn-secondary" to="/dashboard/boards">Cancel</Link>}
      />
      <Card>
        {loading ? <p>Loading board details...</p> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addEditBoardForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Board Name"><input className="input" value={form.boardName} onChange={(event) => setField("boardName", event.target.value)} /></FormField>
            <FormField label="Board Code"><input className="input" value={form.boardCode} onChange={(event) => setField("boardCode", event.target.value)} /></FormField>
            <FormField label="Description"><textarea className="textarea" value={form.description} onChange={(event) => setField("description", event.target.value)} /></FormField>
            <FormField label="Country"><input className="input" value={form.country} onChange={(event) => setField("country", event.target.value)} /></FormField>
            <FormField label="State"><input className="input" value={form.state} onChange={(event) => setField("state", event.target.value)} /></FormField>
            <FormField label="Academic Pattern"><input className="input" value={form.academicPattern} onChange={(event) => setField("academicPattern", event.target.value)} /></FormField>
            <FormField label="Academic Levels"><input className="input" value={form.academicLevels} onChange={(event) => setField("academicLevels", event.target.value)} /></FormField>
            <FormField label="Pass Percentage"><input className="input" type="number" value={form.passPercentage} onChange={(event) => setField("passPercentage", event.target.value)} /></FormField>
            <FormField label="Grading System"><input className="input" value={form.gradingSystem} onChange={(event) => setField("gradingSystem", event.target.value)} /></FormField>
            <FormField label="Status"><select className="select" value={form.status} onChange={(event) => setField("status", event.target.value)}><option>Active</option><option>Inactive</option></select></FormField>
          </div>
          <div className="optionGrid">
            {["internalAssessment", "practicalExams", "boardExams", "rankCalculation"].map((key) => (
              <label className="checkOption" key={key}>
                <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setField(key, event.target.checked)} />
                {key.replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
          <div className="page-actions">
            <Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : editMode ? "Update Board" : "Add Board"}</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function readDemoBoards() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Reset demo boards if localStorage was manually edited.
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOARDS));
  return DEFAULT_BOARDS;
}

function writeDemoBoards(boards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

function findDemoBoard(boardId) {
  return readDemoBoards().find((board) => String(board.boardId) === String(boardId) || String(board.id) === String(boardId));
}

function createDemoBoard(payload) {
  const boards = readDemoBoards();
  const nextId = boards.reduce((maxId, board) => Math.max(maxId, Number(board.boardId || board.id || 0)), 0) + 1;
  const nextBoard = {
    boardId: nextId,
    id: nextId,
    createdDate: new Date().toISOString().slice(0, 10),
    ...payload,
  };
  writeDemoBoards([...boards, nextBoard]);
  return { data: nextBoard };
}

function updateDemoBoard(boardId, payload) {
  const boards = readDemoBoards();
  const index = boards.findIndex((board) => String(board.boardId) === String(boardId) || String(board.id) === String(boardId));
  if (index === -1) throw new Error("Board was not found.");

  const nextBoards = [...boards];
  nextBoards[index] = {
    ...boards[index],
    ...payload,
    boardId: boards[index].boardId || Number(boardId),
    id: boards[index].id || boards[index].boardId || Number(boardId),
  };
  writeDemoBoards(nextBoards);
  return { data: nextBoards[index] };
}
