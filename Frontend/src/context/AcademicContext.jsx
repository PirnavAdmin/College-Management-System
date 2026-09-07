import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/api/axios.js";

const DEFAULT_BOARDS = [
  { id: "1", code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh", boardName: "Board of Intermediate Education, Andhra Pradesh", fullName: "Board of Intermediate Education, Andhra Pradesh" },
  { id: "2", code: "TSBIE", name: "Telangana Board of Intermediate Education", boardName: "Telangana Board of Intermediate Education", fullName: "Telangana Board of Intermediate Education" },
  { id: "3", code: "CBSE", name: "Central Board of Secondary Education", boardName: "Central Board of Secondary Education", fullName: "Central Board of Secondary Education" },
  { id: "4", code: "ICSE", name: "Council for the Indian School Certificate Examinations", boardName: "Council for the Indian School Certificate Examinations", fullName: "Council for the Indian School Certificate Examinations" },
  { id: "5", code: "NIOS", name: "National Institute of Open Schooling", boardName: "National Institute of Open Schooling", fullName: "National Institute of Open Schooling" },
  { id: "6", code: "IGCSE", name: "International General Certificate of Secondary Education", boardName: "International General Certificate of Secondary Education", fullName: "International General Certificate of Secondary Education" },
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
        (b) =>
          String(b.code) === String(boardOrCode) ||
          String(b.id) === String(boardOrCode) ||
          String(b.name) === String(boardOrCode) ||
          String(b.boardName) === String(boardOrCode)
      );
      target = found || { id: String(boardOrCode), code: String(boardOrCode), name: String(boardOrCode), boardName: String(boardOrCode) };
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

    const fetchMasters = async () => {
      const asArray = (res) => {
        if (!res) return [];
        const raw = res.data ?? res;
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object") {
          if (Array.isArray(raw.data)) return raw.data;
          if (Array.isArray(raw.items)) return raw.items;
          if (Array.isArray(raw.records)) return raw.records;
          if (Array.isArray(raw.results)) return raw.results;
          if (Array.isArray(raw.$values)) return raw.$values;
          if (Array.isArray(raw.Data)) return raw.Data;
          if (Array.isArray(raw.Items)) return raw.Items;
        }
        return [];
      };

      try {
        const boardRes = await apiClient.get("/api/v1/boards");
        if (!isMounted) return;
        const rawBoards = asArray(boardRes);
        if (rawBoards.length > 0) {
          const mapped = rawBoards.map((item, idx) => {
            const code = item.boardCode || item.code || `BOARD-${idx + 1}`;
            const boardName = item.boardName || item.fullName || item.name || item.boardCode || code;
            return {
              id: String(item.boardId || item.id || idx + 1),
              code: String(code),
              name: String(boardName),
              boardName: String(boardName),
              fullName: String(boardName),
            };
          });
          setBoards(mapped);

          setSelectedBoardState((current) => {
            if (!current) return mapped[0];
            const match = mapped.find(
              (b) =>
                String(b.id) === String(current.id) ||
                String(b.code).toLowerCase() === String(current.code).toLowerCase() ||
                String(b.name).toLowerCase() === String(current.name).toLowerCase() ||
                String(b.boardName || "").toLowerCase() === String(current.name || current.boardName || "").toLowerCase()
            );
            const chosen = match || mapped[0];
            try {
              localStorage.setItem("cms_selected_board", JSON.stringify(chosen));
            } catch {
              /* ignore */
            }
            return chosen;
          });
        }
      } catch (err) {
        /* ignore */
      }

      try {
        const yearRes = await apiClient.get("/api/v1/academic-years");
        if (!isMounted) return;
        const rawYears = asArray(yearRes);
        if (rawYears.length > 0) {
          const mapped = rawYears.map((item, idx) => {
            const yrName = item.academicYearName || item.yearName || item.name || item.code || "2025–2026";
            const isCurr = Boolean(item.isCurrent || item.isActive || String(item.status).toLowerCase() === "active");
            return {
              id: String(item.academicYearId || item.id || idx + 1),
              code: String(yrName),
              name: String(yrName),
              label: String(yrName),
              isCurrent: isCurr,
            };
          });
          setAcademicYears(mapped);

          setSelectedAcademicYearState((current) => {
            const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
            if (!current) {
              const activeYr = mapped.find((y) => y.isCurrent) || mapped[0];
              return activeYr;
            }
            const currNorm = normalize(current.code || current.name || current.label || current.id);
            const match = mapped.find(
              (y) =>
                normalize(y.id) === currNorm ||
                normalize(y.code) === currNorm ||
                normalize(y.name) === currNorm ||
                normalize(y.label) === currNorm
            );
            const chosen = match || mapped.find((y) => y.isCurrent) || mapped[0];
            try {
              localStorage.setItem("cms_selected_academic_year", JSON.stringify(chosen));
            } catch {
              /* ignore */
            }
            return chosen;
          });
        }
      } catch (err) {
        /* ignore */
      }
    };

    fetchMasters();

    const handleUpdate = () => fetchMasters();
    window.addEventListener("cms_academic_masters_updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("cms_academic_masters_updated", handleUpdate);
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

