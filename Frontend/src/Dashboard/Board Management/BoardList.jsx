import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import PageHeader from "../../shared/components/PageHeader";
import "./BoardList.css";

export default function BoardList() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBoards = async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/v1/boards", { signal });
      setBoards(getBoardsFromResponse(response).map(normalizeBoard));
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") {
        setBoards([]);
        setError("Unable to load boards. Please check backend API connection.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const deleteBoard = async (boardId) => {
    if (!window.confirm("Delete this board?")) return;
    try {
      await api.delete(`/api/v1/boards/${boardId}`);
      await fetchBoards();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchBoards(controller.signal);
    return () => controller.abort();
  }, []);

  const columns = [
    { key: "boardName", label: "Board Name" },
    { key: "boardCode", label: "Board Code" },
    { key: "country", label: "Country" },
    { key: "state", label: "State" },
    { key: "academicStructure", label: "Academic Structure" },
    { key: "status", label: "Status", render: (row) => <span className="badge">{row.status || (row.isActive === false ? "Inactive" : "Active")}</span> },
    { key: "createdDate", label: "Created Date" },
  ];

  return (
    <section className="boardList">
      <PageHeader title="Board List" subtitle="Manage education boards and academic structures." actions={<><Button onClick={() => fetchBoards()}><FiRefreshCw /> Refresh</Button><Link className="btn btn-primary" to="/dashboard/boards/new"><FiPlus /> Add Board</Link></>} />
      {error ? <div className="notice notice-error">{error}</div> : null}
      <Card padded={false}>
        {loading ? <EmptyState title="Loading boards" message="Please wait while board records are loaded." /> : (
          <DataTable columns={columns} rows={boards} empty={<EmptyState title="No boards found" message="Board setup is ready. Add a board to begin." />} renderActions={(board) => (
            <div className="row-actions">
              <button className="icon-button" type="button" title="Edit board" onClick={() => navigate(`/dashboard/boards/${board.boardId || board.id}/edit`)}><FiEdit2 /></button>
              <button className="icon-button" type="button" title="Delete board" onClick={() => deleteBoard(board.boardId || board.id)}><FiTrash2 /></button>
            </div>
          )} />
        )}
      </Card>
    </section>
  );
}

function getBoardsFromResponse(response) {
  const payload = response?.data ?? response;
  const candidates = [payload, payload?.data, payload?.items, payload?.data?.items, payload?.data?.content, payload?.data?.boards, payload?.boards, payload?.content, payload?.result, payload?.value, payload?.$values];
  return candidates.find(Array.isArray) || [];
}

function normalizeBoard(board = {}) {
  const boardId = board.boardId ?? board.id ?? board.boardID;
  const isActive = typeof board.isActive === "boolean" ? board.isActive : String(board.status || "Active") === "Active";
  return { ...board, id: board.id ?? boardId, boardId, boardName: board.boardName ?? board.name ?? "", boardCode: board.boardCode ?? board.code ?? "", country: board.country ?? "", state: board.state ?? "", academicStructure: board.academicStructure ?? board.academicPattern ?? "", status: board.status ?? (isActive ? "Active" : "Inactive"), isActive, createdDate: board.createdDate ?? board.createdAt ?? "" };
}
