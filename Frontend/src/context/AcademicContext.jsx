import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/api/axios.js";

const DEFAULT_BOARDS = [
  { id: "1", code: "BIEAP", name: "BIEAP", fullName: "Board of Intermediate Education, Andhra Pradesh" },
  { id: "2", code: "TSBIE", name: "Telangana State Board (TSBIE)", fullName: "Telangana Board of Intermediate Education" },
  { id: "3", code: "CBSE", name: "CBSE", fullName: "Central Board of Secondary Education" },
  { id: "4", code: "ICSE", name: "ICSE", fullName: "Council for the Indian School Certificate Examinations" },
  { id: "5", code: "NIOS", name: "NIOS", fullName: "National Institute of Open Schooling" },
  { id: "6", code: "IGCSE", name: "IGCSE", fullName: "International General Certificate of Secondary Education" },
];

const DEFAULT_YEARS = [
  { id: "1", code: "2025-2026", label: "2025–2026", name: "2025–2026", isCurrent: true },
  { id: "2", code: "2024-2025", label: "2024–2025", name: "2024–2025" },
  { id: "3", code: "2023-2024", label: "2023–2024", name: "2023–2024" },
  { id: "4", code: "2022-2023", label: "2022–2023", name: "2022–2023" },
  { id: "5", code: "2021-2022", label: "2021–2022", name: "2021–2022" },
];

const AcademicContext = createContext(null);

export function AcademicProvider({ children }) {
  const [boards, setBoards] = useState(DEFAULT_BOARDS);
  const [academicYears, setAcademicYears] = useState(DEFAULT_YEARS);

  const [selectedBoard, setSelectedBoardState] = useState(() => {
    try {
      const saved = localStorage.getItem("cms_selected_board");
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_BOARDS[0];
  });

  const [selectedAcademicYear, setSelectedAcademicYearState] = useState(() => {
    try {
      const saved = localStorage.getItem("cms_selected_academic_year");
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_YEARS[0];
  });

  const setSelectedBoard = (boardOrCode) => {
    let target = boardOrCode;
    if (typeof boardOrCode === "string" || typeof boardOrCode === "number") {
      const found = boards.find(
        (b) => String(b.code) === String(boardOrCode) || String(b.id) === String(boardOrCode) || String(b.name) === String(boardOrCode)
      );
      target = found || { id: String(boardOrCode), code: String(boardOrCode), name: String(boardOrCode) };
    }
    setSelectedBoardState(target);
    try {
      localStorage.setItem("cms_selected_board", JSON.stringify(target));
    } catch {
      /* ignore */
    }
  };

  const setSelectedAcademicYear = (yearOrCode) => {
    let target = yearOrCode;
    if (typeof yearOrCode === "string" || typeof yearOrCode === "number") {
      const normalize = (s) => String(s).trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
      const search = normalize(yearOrCode);
      const found = academicYears.find(
        (y) => normalize(y.code) === search || normalize(y.id) === search || normalize(y.name) === search || normalize(y.label) === search
      );
      target = found || { id: String(yearOrCode), code: String(yearOrCode), name: String(yearOrCode), label: String(yearOrCode) };
    }
    setSelectedAcademicYearState(target);
    try {
      localStorage.setItem("cms_selected_academic_year", JSON.stringify(target));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/v1/boards")
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data?.data || res?.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: String(item.boardId || item.id || idx + 1),
            code: item.boardCode || item.code || item.name || `BOARD-${idx}`,
            name: item.boardCode || item.boardName || item.name || "Board",
            fullName: item.boardName || item.fullName || item.name || "",
          }));
          setBoards(mapped);
        }
      })
      .catch(() => {});

    apiClient
      .get("/api/v1/academic-years")
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data?.data || res?.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: String(item.academicYearId || item.id || idx + 1),
            code: item.academicYearName || item.yearName || item.code || item.name || `2025-2026`,
            name: item.academicYearName || item.yearName || item.name || "2025–2026",
            label: item.academicYearName || item.yearName || item.name || "2025–2026",
            isCurrent: item.isCurrent || false,
          }));
          setAcademicYears(mapped);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AcademicContext.Provider
      value={{
        boards,
        academicYears,
        selectedBoard,
        selectedAcademicYear,
        setSelectedBoard,
        setSelectedAcademicYear,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);
  if (!context) {
    return {
      boards: DEFAULT_BOARDS,
      academicYears: DEFAULT_YEARS,
      selectedBoard: DEFAULT_BOARDS[0],
      selectedAcademicYear: DEFAULT_YEARS[0],
      setSelectedBoard: () => {},
      setSelectedAcademicYear: () => {},
    };
  }
  return context;
}

