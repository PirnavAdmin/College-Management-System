import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const AcademicContext = createContext(null);
const BOARD_STORAGE_KEY = "cms_selected_board";
const YEAR_STORAGE_KEY = "cms_selected_academic_year";

const asList = (response) => {
  const value = response?.data ?? response;
  if (Array.isArray(value)) return value;
  for (const key of ["data", "Data", "items", "Items", "records", "Records", "results", "Results", "$values"]) if (Array.isArray(value?.[key])) return value[key];
  return [];
};
const valueOf = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
const isActive = (item) => {
  const value = valueOf(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  const text = String(value ?? "").trim().toLowerCase();
  return value == null || !(value === false || value === 0 || text === "false" || text === "inactive");
};
const boardIdOf = (board) => valueOf(board, "id", "boardId", "BoardId");
const yearIdOf = (year) => valueOf(year, "id", "academicYearId", "AcademicYearId");
const readStored = (key) => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : null; } catch { return null; } };
const persist = (key, value) => { try { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); } catch { /* storage can be unavailable */ } };
const mapBoard = (item, index) => {
  const id = valueOf(item, "boardId", "BoardId", "id", "Id") ?? index + 1;
  const code = valueOf(item, "boardCode", "BoardCode", "code", "Code") ?? `BOARD-${id}`;
  const name = valueOf(item, "boardName", "BoardName", "fullName", "FullName", "name", "Name") ?? code;
  return { ...item, id: String(id), code: String(code), name: String(name), boardName: String(name) };
};
const mapYear = (item, index) => {
  const id = valueOf(item, "academicYearId", "AcademicYearId", "id", "Id") ?? index + 1;
  const name = valueOf(item, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "code", "Code") ?? id;
  return { ...item, id: String(id), code: String(name), name: String(name), label: String(name) };
};
const sameBoard = (left, right) => String(boardIdOf(left) ?? "") === String(boardIdOf(right) ?? "") || normalize(left?.code ?? left?.name ?? left?.boardName) === normalize(right?.code ?? right?.name ?? right?.boardName);
const sameYear = (left, right) => String(yearIdOf(left) ?? "") === String(yearIdOf(right) ?? "") || normalize(left?.code ?? left?.name ?? left?.label) === normalize(right?.code ?? right?.name ?? right?.label);

export function AcademicProvider({ children }) {
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [academicYearsLoading, setAcademicYearsLoading] = useState(false);
  const [selectedBoard, setSelectedBoardState] = useState(() => readStored(BOARD_STORAGE_KEY));
  const [selectedAcademicYear, setSelectedAcademicYearState] = useState(() => readStored(YEAR_STORAGE_KEY));
  const [refreshToken, setRefreshToken] = useState(0);
  const selectedBoardId = boardIdOf(selectedBoard);
  const selectedAcademicYearId = yearIdOf(selectedAcademicYear);
  const refreshAcademicContext = useCallback(() => setRefreshToken((value) => value + 1), []);

  const setSelectedBoard = useCallback((boardOrId) => {
    const board = typeof boardOrId === "object" && boardOrId !== null ? boardOrId : boards.find((item) => String(item.id) === String(boardOrId) || String(item.code) === String(boardOrId) || String(item.name) === String(boardOrId)) ?? null;
    setSelectedBoardState(board);
    persist(BOARD_STORAGE_KEY, board);
  }, [boards]);
  const setSelectedAcademicYear = useCallback((yearOrId) => {
    const year = typeof yearOrId === "object" && yearOrId !== null ? yearOrId : academicYears.find((item) => String(item.id) === String(yearOrId) || normalize(item.code) === normalize(yearOrId) || normalize(item.name) === normalize(yearOrId)) ?? null;
    setSelectedAcademicYearState(year);
    persist(YEAR_STORAGE_KEY, year);
  }, [academicYears]);

  useEffect(() => {
    window.addEventListener("cms_academic_masters_updated", refreshAcademicContext);
    return () => window.removeEventListener("cms_academic_masters_updated", refreshAcademicContext);
  }, [refreshAcademicContext]);

  useEffect(() => {
    let active = true;
    setBoardsLoading(true);
    apiClient.get(apiEndpoints.boards.list, { params: { Status: true } }).then((response) => {
      if (!active) return;
      const nextBoards = asList(response).filter(isActive).map(mapBoard);
      setBoards(nextBoards);
      setSelectedBoardState((current) => {
        const next = nextBoards.find((board) => sameBoard(board, current)) ?? nextBoards[0] ?? null;
        persist(BOARD_STORAGE_KEY, next);
        return next;
      });
    }).catch(() => {
      if (!active) return;
      setBoards([]);
      setSelectedBoardState(null);
      persist(BOARD_STORAGE_KEY, null);
    }).finally(() => active && setBoardsLoading(false));
    return () => { active = false; };
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    if (!selectedBoardId) {
      setAcademicYears([]);
      setSelectedAcademicYearState(null);
      persist(YEAR_STORAGE_KEY, null);
      setAcademicYearsLoading(false);
      return () => { active = false; };
    }
    setAcademicYearsLoading(true);
    setAcademicYears([]);
    apiClient.get(apiEndpoints.academicYears.active, { params: { boardId: selectedBoardId, isActive: true } }).then((response) => {
      if (!active) return;
      const nextYears = asList(response).filter((year) => {
        const boardId = valueOf(year, "boardId", "BoardId");
        return (boardId == null || String(boardId) === String(selectedBoardId)) && isActive(year);
      }).map(mapYear);
      setAcademicYears(nextYears);
      setSelectedAcademicYearState((current) => {
        const next = nextYears.find((year) => sameYear(year, current)) ?? nextYears[0] ?? null;
        persist(YEAR_STORAGE_KEY, next);
        return next;
      });
    }).catch(() => {
      if (!active) return;
      setAcademicYears([]);
      setSelectedAcademicYearState(null);
      persist(YEAR_STORAGE_KEY, null);
    }).finally(() => active && setAcademicYearsLoading(false));
    return () => { active = false; };
  }, [selectedBoardId, refreshToken]);

  const value = useMemo(() => ({
    boards, academicYears, selectedBoard, selectedBoardId, selectedAcademicYear, selectedAcademicYearId,
    setSelectedBoard, setSelectedAcademicYear, boardsLoading, academicYearsLoading, refreshAcademicContext,
  }), [academicYears, academicYearsLoading, boards, boardsLoading, refreshAcademicContext, selectedAcademicYear, selectedAcademicYearId, selectedBoard, selectedBoardId, setSelectedAcademicYear, setSelectedBoard]);
  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);
  return context ?? {
    boards: [], academicYears: [], selectedBoard: null, selectedBoardId: undefined,
    selectedAcademicYear: null, selectedAcademicYearId: undefined, boardsLoading: false, academicYearsLoading: false,
    setSelectedBoard: () => {}, setSelectedAcademicYear: () => {}, refreshAcademicContext: () => {},
  };
}
