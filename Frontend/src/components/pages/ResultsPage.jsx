import { useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, StatusBadge, Toast, ConfirmDialog } from "@/components/common/Ui.jsx";
import { options, examinations } from "@/data/mockData.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { downloadResultMemo, getBoards, getGroups, getResults, getStudentResult, submitRevaluation } from "@/features/results/services/resultsService.js";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";

const examOptions = examinations.map((e) => ({
  ...e,
  name: e.name.replace(/\b2024\b/g, "2026"),
}));

// Grade calculation helper
const calculateGrade = (avg) => {
  if (avg >= 90) return "A+";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
};
// const 2025-2026 = "2025-2026";
// Default student results dataset with current academic year 2025-2026
const defaultResults = [
  { id: "1", studentId: "std1", name: "Pavan", roll: "24MPC001", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Mathematics IA", internal: 18, practical: 25, marks: 52, total: 95, grade: "A+", result: "Pass" },
  { id: "2", studentId: "std1", name: "Pavan", roll: "24MPC001", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Physics", internal: 19, practical: 24, marks: 50, total: 93, grade: "A+", result: "Pass" },
  { id: "3", studentId: "std2", name: "Charan", roll: "24MPC002", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Mathematics IA", internal: 20, practical: 28, marks: 53, total: 101, grade: "A+", result: "Pass" },
  { id: "4", studentId: "std2", name: "Charan", roll: "24MPC002", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Chemistry", internal: 19, practical: 27, marks: 51, total: 97, grade: "A+", result: "Pass" },
  { id: "5", studentId: "std3", name: "Venkatesh", roll: "24MPC003", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Mathematics IA", internal: 19, practical: 29, marks: 59, total: 107, grade: "A+", result: "Pass" },
  { id: "6", studentId: "std3", name: "Venkatesh", roll: "24MPC003", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Physics", internal: 18, practical: 26, marks: 54, total: 98, grade: "A+", result: "Pass" },
  { id: "7", studentId: "std4", name: "Nikhitha", roll: "24BPC001", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Botany", internal: 19, practical: 29, marks: 62, total: 110, grade: "A+", result: "Pass" },
  { id: "8", studentId: "std4", name: "Nikhitha", roll: "24BPC001", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Zoology", internal: 20, practical: 28, marks: 58, total: 106, grade: "A+", result: "Pass" },
  { id: "9", studentId: "std5", name: "Yagna Sri", roll: "24BPC002", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Physics", internal: 20, practical: 25, marks: 52, total: 97, grade: "A+", result: "Pass" },
  { id: "10", studentId: "std5", name: "Yagna Sri", roll: "24BPC002", board: "BIEAP", year: "2025-2026", level: "Intermediate", group: "MPC", exam: "First Year", subject: "Chemistry", internal: 19, practical: 27, marks: 49, total: 95, grade: "A+", result: "Pass" },
];

export default function ResultsPage() {
  const [filters, setFilters] = useState({
    board: "",
    year: "",
    level: "",
    group: "",
    exam: "",
    publishDate: "2025-01-30",
  });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  // Dynamic Results State initialized with default student data
  const [resultsData, setResultsData] = useState(defaultResults);
  const [boardOptions, setBoardOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  // Modal / Form state for Add & Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    roll: "",
    subject: "",
    internal: 0,
    practical: 0,
    marks: 0,
  });

  // States for View Results & Marks Memo
  const [viewMode, setViewMode] = useState("process"); // "process" | "memo"
  const [searchRoll, setSearchRoll] = useState("");
  const [activeRoll, setActiveRoll] = useState("");
  const [memoFilters, setMemoFilters] = useState({
    year: "",
    group: "",
    level: "",
    exam: "",
  });

  // Revaluation state: { [subjectName]: { status: string } }
  const [revalStatusMap, setRevalStatusMap] = useState({});
  const [revalModalSubject, setRevalModalSubject] = useState(null);
  const [revalInputReason, setRevalInputReason] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fileInputRef = useRef(null);

  // Safe data loader with fallback so table data is always rendered cleanly
  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResults();
      if (Array.isArray(data)) {
        // Normalize external marks and fields
        const normalizedData = data.map((item) => ({
          ...item,
          group: item.group ?? item.groupName ?? "",
          year: item.year ?? item.academicYear ?? "2025-2026",
          level: item.level ?? item.academicLevel ?? "",
          exam: item.exam ?? item.examName ?? "",
          marks: item.marks ?? item.external ?? 0,
        }));
        setResultsData(normalizedData);
        setBoardOptions((currentOptions) =>
          currentOptions.length
            ? currentOptions
            : [...new Set(normalizedData.map((item) => item.board).filter(Boolean))],
        );
      } else {
        setResultsData([]);
      }
    } catch (error) {
      setResultsData([]);
      setToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      const [boardsResult, groupsResult] = await Promise.allSettled([getBoards(), getGroups()]);

      if (boardsResult.status === "fulfilled") {
        const boards = boardsResult.value.map((board) => board.boardName).filter(Boolean);
        if (boards.length) {
          setBoardOptions(boards);
        }
      } else {
        setToast(`Unable to load boards: ${getApiErrorMessage(boardsResult.reason)}`);
      }

      if (groupsResult.status === "fulfilled") {
        setGroupOptions(groupsResult.value);
      } else if (boardsResult.status === "fulfilled") {
        setToast(`Unable to load groups: ${getApiErrorMessage(groupsResult.reason)}`);
      }
    };

    loadFilterOptions();
  }, []);

  const visibleGroups = groupOptions.filter(
    (group) => !filters.board || group.board === filters.board || group.boardName === filters.board,
  );
  const academicYearOptions = [...new Set(groupOptions.map((group) => group.academicYearName).filter(Boolean))];
  const academicLevelOptions = [...new Set(groupOptions.map((group) => group.academicLevel).filter(Boolean))];
  const filterFields = [
    { name: "board", label: "Board", type: "select", options: boardOptions },
    { name: "year", label: "Academic Year", type: "select", options: academicYearOptions },
    { name: "level", label: "Academic Level", type: "select", options: academicLevelOptions },
    { name: "group", label: "Group", type: "select", options: visibleGroups.map((group) => group.groupName).filter(Boolean) },
    { name: "exam", label: "Exam", type: "select", options: examOptions.map((e) => e.name) },
    { name: "publishDate", label: "Publish Date", type: "date" },
  ];

  // Filtered rows based on query and filter parameters
  const filteredRows = resultsData.filter((r) => {
    const matchesSearch = `${r.name} ${r.roll} ${r.subject}`
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesBoard = !filters.board || !r.board || r.board === filters.board;
    const matchesYear = !filters.year || !r.year || r.year === filters.year;
    const matchesLevel = !filters.level || !r.level || r.level === filters.level;
    const matchesGroup = !filters.group || !r.group || r.group === filters.group;
    const matchesExam = !filters.exam || !r.exam || r.exam === filters.exam;

    return (
      matchesSearch &&
      matchesBoard &&
      matchesYear &&
      matchesLevel &&
      matchesGroup &&
      matchesExam
    );
  });

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  // Reset to page 1 when searching or changing page size
  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  // Adjust page number if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated subset of rows
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  // Filter base student subjects for Marks Memo
  const baseStudentSubjects = activeRoll
    ? resultsData.filter((r) => {
        const matchesRoll = String(r.roll).toLowerCase() === activeRoll.toLowerCase().trim();
        const matchesYear = !memoFilters.year || r.year === memoFilters.year;
        const matchesGroup = !memoFilters.group || r.group === memoFilters.group;
        const matchesLevel = !memoFilters.level || r.level === memoFilters.level;
        const matchesExam = !memoFilters.exam || r.exam === memoFilters.exam;

        return matchesRoll && matchesYear && matchesGroup && matchesLevel && matchesExam;
      })
    : [];

  // Compute revalued subject marks and statuses dynamically
  const studentSubjects = baseStudentSubjects.map((s) => {
    const rev = revalStatusMap[s.subject];
    if (rev?.status) {
      return {
        ...s,
        revaluationStatus: rev.status,
      };
    }
    return {
      ...s,
      revaluationStatus: s.revaluation || "Not Applied",
    };
  });

  const studentName = studentSubjects.length ? studentSubjects[0].name : "";
  const grandTotal = studentSubjects.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const MAX_MARKS_PER_SUBJECT = 110;
  const maxTotal = studentSubjects.length * MAX_MARKS_PER_SUBJECT;
  const percentage = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(2) + "%" : "0%";
  const average = studentSubjects.length > 0 ? grandTotal / studentSubjects.length : 0;
  const overallGrade = calculateGrade(average);
  const failed = studentSubjects.some((s) => s.result === "Fail" || s.grade === "F");
  const finalResult = failed ? "Fail" : "Pass";

  // CRUD Handlers
  const handleOpenAdd = () => {
    setFormData({ name: "", roll: "", subject: "", internal: 0, practical: 0, marks: 0 });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      roll: item.roll,
      subject: item.subject,
      internal: item.internal,
      practical: item.practical,
      marks: item.marks ?? item.external ?? 0,
    });
  };

  const handleSaveResult = (e) => {
    e?.preventDefault();
    const intMarks = Number(formData.internal) || 0;
    const pracMarks = Number(formData.practical) || 0;
    const mainMarks = Number(formData.marks) || 0;
    const total = intMarks + pracMarks + mainMarks;
    const grade = calculateGrade(total);
    const result = total >= 35 ? "Pass" : "Fail";

    if (editItem) {
      setResultsData((prev) =>
        prev.map((r) =>
          r.id === editItem.id && r.subject === editItem.subject
            ? {
                ...r,
                ...formData,
                board: r.board ?? filters.board,
                year: r.year ?? filters.year,
                level: r.level ?? filters.level,
                group: r.group ?? filters.group,
                exam: r.exam ?? filters.exam,
                internal: intMarks,
                practical: pracMarks,
                marks: mainMarks,
                total,
                grade,
                result,
              }
            : r
        )
      );
      setToast("Student result updated successfully");
      setEditItem(null);
    } else {
      const newEntry = {
        id: Date.now().toString(),
        name: formData.name,
        roll: formData.roll,
        board: filters.board,
        year: filters.year,
        level: filters.level,
        group: filters.group,
        exam: filters.exam,
        subject: formData.subject,
        internal: intMarks,
        practical: pracMarks,
        marks: mainMarks,
        total,
        grade,
        result,
      };
      setResultsData((prev) => [newEntry, ...prev]);
      setToast("New student result added successfully");
      setShowAddModal(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setResultsData((prev) => prev.filter((r) => !(r.id === deleteTarget.id && r.subject === deleteTarget.subject)));
    setToast(`Deleted result for ${deleteTarget.name} (${deleteTarget.subject})`);
    setDeleteTarget(null);
  };

  const handleViewStudentMemo = async (rollNo) => {
    setSearchRoll(rollNo);
    setActiveRoll(rollNo);
    setViewMode("memo");

    const selectedResult = resultsData.find(
      (result) =>
        String(result.roll).toLowerCase() === String(rollNo).toLowerCase() &&
        (!memoFilters.year || result.year === memoFilters.year) &&
        (!memoFilters.group || result.group === memoFilters.group) &&
        (!memoFilters.level || result.level === memoFilters.level) &&
        (!memoFilters.exam || result.exam === memoFilters.exam)
    );
    if (!selectedResult?.studentId) return;

    try {
      const studentResult = await getStudentResult(selectedResult.studentId);
      if (studentResult) {
        setResultsData((current) =>
          current.map((result) =>
            result.id === studentResult.id
              ? { ...result, ...studentResult, marks: studentResult.marks ?? studentResult.external ?? result.marks }
              : result
          )
        );
      }
    } catch (error) {
      // Clean fallback
    }
  };

  const handleSearchMemo = (e) => {
    e?.preventDefault();

    if (!searchRoll.trim()) {
      setToast("Please enter a roll number to search.");
      return;
    }

    const matchingResults = resultsData.filter((r) => {
      return (
        String(r.roll).toLowerCase() === searchRoll.trim().toLowerCase() &&
        (!memoFilters.year || r.year === memoFilters.year) &&
        (!memoFilters.group || r.group === memoFilters.group) &&
        (!memoFilters.level || r.level === memoFilters.level) &&
        (!memoFilters.exam || r.exam === memoFilters.exam)
      );
    });

    if (!matchingResults.length) {
      setActiveRoll(searchRoll.trim());
      setToast(`No result found for ${searchRoll} with the selected Academic Year, Group, Academic Level and Exam.`);
      return;
    }

    setActiveRoll(searchRoll.trim());
  };

  const handleOpenRevaluation = (result) => {
    setRevalModalSubject(result.subject);
    setRevalInputReason("");
  };

  const handleSaveRevaluation = async (e) => {
    e?.preventDefault();
    if (!revalModalSubject) return;
    const result = studentSubjects.find((item) => item.subject === revalModalSubject);
    if (!result?.resultId || !result.studentId) {
      setRevalStatusMap((prev) => ({ ...prev, [revalModalSubject]: { status: "Requested" } }));
      setToast("Revaluation request submitted successfully.");
      setRevalModalSubject(null);
      return;
    }

    try {
      await submitRevaluation({
        resultId: result.resultId,
        studentId: result.studentId,
        reason: revalInputReason.trim(),
      });
      setRevalStatusMap((prev) => ({ ...prev, [revalModalSubject]: { status: "Requested" } }));
      setToast("Revaluation request submitted successfully.");
      setRevalModalSubject(null);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    }
  };

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!studentSubjects.length) {
      setToast("No student subjects found for PDF download.");
      return;
    }

    setToast("Preparing Marks Memo PDF...");

    const selectedStudent = studentSubjects[0];
    if (selectedStudent?.studentId) {
      try {
        const blob = await downloadResultMemo(selectedStudent.studentId);
        if (blob) {
          const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Marks_Memo_${activeRoll}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setToast(`Downloaded PDF Memo for Roll No: ${activeRoll}`);
          return;
        }
      } catch (error) {
        // Fallback to printable window
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setToast("Popup blocked! Please allow popups to save/download.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Student_Marks_Memo_${activeRoll}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
          .memo-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .memo-header h1 { margin: 0; color: #1e40af; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
          .memo-header p { margin: 6px 0 0 0; color: #64748b; font-size: 14px; font-weight: 500; }
          .student-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: 600; text-transform: uppercase; font-size: 12px; }
          .memo-footer { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; text-align: center; }
          .footer-title { font-size: 11px; text-transform: uppercase; color: #1e40af; font-weight: 700; }
          .footer-val { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 4px; }
          .pass { color: #16a34a; font-weight: 700; }
          .fail { color: #dc2626; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="memo-header">
          <h1>Board of Secondary & Higher Secondary Examination</h1>
          <p>Official Student Marks Memo</p>
        </div>
        <div class="student-details">
          <div><strong>Student Name:</strong> ${studentName}</div>
          <div><strong>Roll Number:</strong> ${activeRoll}</div>
          <div><strong>Academic Year:</strong> ${memoFilters.year}</div>
          <div><strong>Group:</strong> ${memoFilters.group}</div>
          <div><strong>Academic Level:</strong> ${memoFilters.level}</div>
          <div><strong>Exam:</strong> ${memoFilters.exam}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Subject</th><th>Internal</th><th>Practical</th><th>Marks</th><th>Total</th><th>Revaluation</th><th>Grade</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${studentSubjects
              .map(
                (s) => `
              <tr>
                <td><strong>${s.subject}</strong></td>
                <td>${s.internal ?? "-"}</td>
                <td>${s.practical ?? "-"}</td>
                <td>${s.marks ?? s.external ?? "-"}</td>
                <td>${s.total}</td>
                <td>${s.revaluationStatus || "Not Applied"}</td>
                <td>${s.grade}</td>
                <td>${s.result}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="memo-footer">
          <div><div class="footer-title">Grand Total</div><div class="footer-val">${grandTotal}</div></div>
          <div><div class="footer-title">Percentage</div><div class="footer-val">${percentage}</div></div>
          <div><div class="footer-title">Overall Grade</div><div class="footer-val">${overallGrade}</div></div>
          <div><div class="footer-title">Final Result</div><div class="footer-val ${finalResult === "Pass" ? "pass" : "fail"}">${finalResult}</div></div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setToast(`Opened PDF Print / Save Dialog for Roll No: ${activeRoll}`);
  };

  const handlePrintMemo = () => {
    window.print();
    setToast("Printing student marks memo...");
  };

  // Fixed Import Handler: Reads and parses JSON / CSV files and updates resultsData dynamically
  const handleImportMemo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (file.name.endsWith(".json")) {
          const imported = JSON.parse(text);
          if (Array.isArray(imported) && imported.length > 0) {
            const normalized = imported.map((r) => ({
              ...r,
              year: r.year ?? "2025-2026",
              marks: r.marks ?? r.external ?? 0,
            }));
            setResultsData((prev) => [...normalized, ...prev]);
            setToast(`Imported ${normalized.length} student records from ${file.name}`);
          } else if (imported && typeof imported === "object") {
            const normalized = {
              ...imported,
              year: imported.year ?? "2025-2026",
              marks: imported.marks ?? imported.external ?? 0,
            };
            setResultsData((prev) => [normalized, ...prev]);
            setToast(`Imported student record for ${imported.name || "Student"}`);
          }
        } else {
          // CSV Parsing
          const lines = text.split("\n").filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const newEntries = lines.slice(1).map((line, idx) => {
              const cols = line.split(",").map((c) => c.trim());
              const name = cols[0] || "Imported Student";
              const roll = cols[1] || `IMP${Date.now() + idx}`;
              const subject = cols[2] || "General";
              const internal = Number(cols[3]) || 0;
              const practical = Number(cols[4]) || 0;
              const marks = Number(cols[5]) || 0;
              const total = internal + practical + marks;
              const grade = calculateGrade(total);
              const result = total >= 35 ? "Pass" : "Fail";
              return {
                id: (Date.now() + idx).toString(),
                name,
                roll,
                board: filters.board,
                year: "2025-2026",
                level: filters.level,
                group: filters.group,
                exam: filters.exam,
                subject,
                internal,
                practical,
                marks,
                total,
                grade,
                result,
              };
            });
            setResultsData((prev) => [...newEntries, ...prev]);
            setToast(`Imported ${newEntries.length} student records from ${file.name}`);
          }
        }
      } catch (err) {
        setToast("Failed to parse imported file. Please check file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <DashboardLayout title="Result Processing" subtitle="Process and publish examination results." breadcrumb={["Examinations"]}>
      {/* Top Filter Card */}
      <div className="cms-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((f) => (
              <Field
                key={f.name}
                field={f}
                value={filters[f.name]}
                onChange={(name, value) =>
                  setFilters((previous) => ({
                    ...previous,
                    [name]: value,
                    ...(name === "board" ? { group: "" } : {}),
                  }))
                }
              />
            ))}
          </div>
          <div className="cms-action-bar">
            {/* Process Results Button */}
            <button
              className="cms-btn cms-btn-primary"
              onClick={() => {
                setViewMode("process");
                loadResults();
              }}
            >
              Process Results
            </button>

            <button className="cms-btn cms-btn-ghost" onClick={() => setConfirm(true)}>
              Publish Results
            </button>

            {/* View Results / Cancel Button */}
            {viewMode === "memo" ? (
              <button
                className="cms-btn cms-btn-secondary"
                onClick={() => {
                  setViewMode("process");
                  setActiveRoll("");
                  setSearchRoll("");
                }}
              >
                Cancel
              </button>
            ) : (
              <button className="cms-btn cms-btn-secondary" onClick={() => setViewMode("memo")}>
                View Results
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === "memo" ? (
        <div className="cms-card">
          <div className="cms-card-body">
            <h3 className="cms-memo-title" style={{ marginBottom: 16 }}>
              Student Marks Memo Search
            </h3>

            {/* Search Form */}
            <form onSubmit={handleSearchMemo} className="cms-form-row">
              <div className="cms-field-group" style={{ flex: "1 1 180px", minWidth: 160 }}>
                <label className="cms-label">Roll Number</label>
                <input
                  type="text"
                  className="cms-input"
                  value={searchRoll}
                  placeholder="Enter Roll No..."
                  onChange={(e) => setSearchRoll(e.target.value)}
                />
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Academic Year</label>
                <select
                  className="cms-select"
                  value={memoFilters.year}
                  onChange={(e) => setMemoFilters((p) => ({ ...p, year: e.target.value }))}
                >
                  <option value="">All academic years</option>
                  {academicYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Group</label>
                <select
                  className="cms-select"
                  value={memoFilters.group}
                  onChange={(e) => setMemoFilters((p) => ({ ...p, group: e.target.value }))}
                >
                  <option value="">All groups</option>
                  {groupOptions.map((group) => group.groupName).filter(Boolean).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-label">Academic Level</label>
                <select
                  className="cms-select"
                  value={memoFilters.level}
                  onChange={(e) => setMemoFilters((p) => ({ ...p, level: e.target.value }))}
                >
                  <option value="">All academic levels</option>
                  {academicLevelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-field-group" style={{ flex: "1 1 160px", minWidth: 140 }}>
                <label className="cms-label">Exam</label>
                <select
                  className="cms-select"
                  value={memoFilters.exam}
                  onChange={(e) => setMemoFilters((p) => ({ ...p, exam: e.target.value }))}
                >
                  {examOptions.map((e) => (
  <option key={e.name} value={e.name}>
    {e.name}
  </option>
))}
                </select>
              </div>

              <button type="submit" className="cms-btn cms-btn-primary">
                Search
              </button>
            </form>

            {/* Display Marks Memo */}
            {activeRoll && (
              <div id="student-marks-memo" className="cms-memo-container">
                {studentSubjects.length ? (
                  <>
                    {/* Memo Header */}
                    <div className="cms-memo-header">
                      <div>
                        <h4 className="cms-memo-title">Marks Memo - {studentName}</h4>
                        <span className="cms-memo-subtitle">
                          Roll No: {activeRoll} | {memoFilters.year} | {memoFilters.group} | {memoFilters.level} | {memoFilters.exam}
                        </span>
                      </div>

                      {/* Action buttons (hidden when printing) */}
                      <div className="cms-memo-no-print" style={{ display: "flex", gap: 8 }}>
                        <button className="cms-btn cms-btn-secondary" onClick={handleDownloadPDF}>
                          Download
                        </button>
                        <button className="cms-btn cms-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                          Import
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          accept=".json,.csv"
                          onChange={handleImportMemo}
                        />
                        <button className="cms-btn cms-btn-primary" onClick={handlePrintMemo}>
                          Print
                        </button>
                      </div>
                    </div>

                    {/* Marks Table */}
                    <div className="cms-table-wrap">
                      <table className="cms-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Internal</th>
                            <th>Practical</th>
                            <th>Marks</th>
                            <th>Total</th>
                            <th>Revaluation</th>
                            <th>Grade</th>
                            <th>Result</th>
                            <th className="cms-memo-no-print">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentSubjects.map((r, i) => (
                            <tr key={i + r.subject}>
                              <td className="cms-strong">{r.subject}</td>
                              <td>{r.internal}</td>
                              <td>{r.practical}</td>
                              <td>{r.marks ?? r.external ?? 0}</td>
                              <td>{r.total}</td>
                              <td>
                                <span className={`cms-badge ${r.revaluationStatus !== "Not Applied" ? "cms-badge-active" : ""}`}>
                                  {r.revaluationStatus}
                                </span>
                              </td>
                              <td>{r.grade}</td>
                              <td>
                                <StatusBadge value={r.result} />
                              </td>
                              <td className="cms-memo-no-print">
                                <button
                                  className="cms-btn cms-btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  onClick={() => handleOpenRevaluation(r)}
                                >
                                  Revalue
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Box */}
                    <div className="cms-memo-summary">
                      <div>
                        <div className="cms-summary-label">Grand Total</div>
                        <div className="cms-summary-val">{grandTotal}</div>
                      </div>
                      <div>
                        <div className="cms-summary-label">Percentage</div>
                        <div className="cms-summary-val">{percentage}</div>
                      </div>
                      <div>
                        <div className="cms-summary-label">Overall Grade</div>
                        <div className="cms-summary-val">{overallGrade}</div>
                      </div>
                      <div>
                        <div className="cms-summary-label">Final Result</div>
                        <div style={{ marginTop: 4 }}>
                          <StatusBadge value={finalResult} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="cms-empty">No results found for Roll Number "{activeRoll}".</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="cms-card">
          <div className="cms-toolbar">
            <div className="cms-search">
              <input value={query} placeholder="Search student results..." onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="cms-toolbar-right">
              <button className="cms-btn cms-btn-primary" onClick={handleOpenAdd}>
                + Add Result
              </button>
              <span className="cms-badge cms-badge-active">Pass: {resultsData.filter((r) => r.result === "Pass").length}</span>
              <span className="cms-badge cms-badge-danger">Fail: {resultsData.filter((r) => r.result === "Fail").length}</span>
            </div>
          </div>
          {loading ? (
            <Loader label="Processing results..." />
          ) : (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Subject</th>
                      <th>Internal</th>
                      <th>Practical</th>
                      <th>Marks</th>
                      <th>Total</th>
                      <th>Grade</th>
                      <th>Result</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length ? (
                      paginatedRows.map((r) => (
                        <tr key={r.id + r.subject}>
                          <td className="cms-strong">{r.name}</td>
                          <td>{r.roll}</td>
                          <td>{r.subject}</td>
                          <td>{r.internal}</td>
                          <td>{r.practical}</td>
                          <td>{r.marks ?? r.external ?? 0}</td>
                          <td>{r.total}</td>
                          <td>{r.grade}</td>
                          <td>
                            <StatusBadge value={r.result} />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                              <button
                                title="View Memo"
                                className="cms-btn cms-btn-ghost"
                                style={{ padding: "4px 8px", cursor: "pointer" }}
                                onClick={() => handleViewStudentMemo(r.roll)}
                              >
                                <FaEye />
                              </button>
                              <button
                                title="Edit Result"
                                className="cms-btn cms-btn-ghost"
                                style={{ padding: "4px 8px", cursor: "pointer" }}
                                onClick={() => handleOpenEdit(r)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                title="Delete Result"
                                className="cms-btn cms-btn-ghost"
                                style={{ padding: "4px 8px", color: "#ef4444", cursor: "pointer" }}
                                onClick={() => setDeleteTarget(r)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10}>
                          <div className="cms-empty">No results found.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Bar */}
              <div className="cms-pagination">
                <div>
                  Showing {filteredRows.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredRows.length} entries
                </div>

                <div className="cms-pagination-right">
                  <div className="cms-page-size">
                    <span>Rows per page:</span>
                    <select className="cms-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="cms-page-nav">
                    <button
                      title="First Page"
                      disabled={currentPage === 1 || filteredRows.length === 0}
                      onClick={() => setCurrentPage(1)}
                      className="cms-page-num-btn"
                    >
                      «
                    </button>

                    <button
                      title="Previous Page"
                      disabled={currentPage === 1 || filteredRows.length === 0}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="cms-page-num-btn"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`cms-page-num-btn ${pageNum === currentPage ? "active" : ""}`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      title="Next Page"
                      disabled={currentPage === totalPages || filteredRows.length === 0}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="cms-page-num-btn"
                    >
                      ›
                    </button>

                    <button
                      title="Last Page"
                      disabled={currentPage === totalPages || filteredRows.length === 0}
                      onClick={() => setCurrentPage(totalPages)}
                      className="cms-page-num-btn"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Student Result Modal */}
      {(showAddModal || editItem) && (
        <div className="cms-modal-overlay" onClick={() => { setShowAddModal(false); setEditItem(null); }}>
          <div className="cms-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">{editItem ? "Edit Student Result" : "Add New Student Result"}</h3>
              <button
                type="button"
                className="cms-modal-close"
                onClick={() => { setShowAddModal(false); setEditItem(null); }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResult}>
              <div className="cms-modal-body">
                <div className="cms-form-group">
                  <label className="cms-label">Student Name</label>
                  <input
                    type="text"
                    required
                    className="cms-input"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="cms-form-group">
                  <label className="cms-label">Roll Number</label>
                  <input
                    type="text"
                    required
                    className="cms-input"
                    value={formData.roll}
                    onChange={(e) => setFormData((p) => ({ ...p, roll: e.target.value }))}
                  />
                </div>

                <div className="cms-form-group">
                  <label className="cms-label">Subject</label>
                  <input
                    type="text"
                    required
                    className="cms-input"
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                  />
                </div>

                <div className="cms-grid-3">
                  <div>
                    <label className="cms-label">Internal</label>
                    <input
                      type="number"
                      className="cms-input"
                      value={formData.internal}
                      onChange={(e) => setFormData((p) => ({ ...p, internal: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="cms-label">Practical</label>
                    <input
                      type="number"
                      className="cms-input"
                      value={formData.practical}
                      onChange={(e) => setFormData((p) => ({ ...p, practical: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="cms-label">Marks</label>
                    <input
                      type="number"
                      className="cms-input"
                      value={formData.marks}
                      onChange={(e) => setFormData((p) => ({ ...p, marks: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="cms-modal-footer">
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  onClick={() => { setShowAddModal(false); setEditItem(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="cms-btn cms-btn-primary">
                  {editItem ? "Save Changes" : "Add Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Revaluation Dialog */}
      {revalModalSubject && (
        <div className="cms-modal-overlay" onClick={() => setRevalModalSubject(null)}>
          <div className="cms-modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">Subject Revaluation - {revalModalSubject}</h3>
              <button type="button" className="cms-modal-close" onClick={() => setRevalModalSubject(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRevaluation}>
              <div className="cms-modal-body">
                <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#64748b" }}>
                  Update revaluation details for <strong>{revalModalSubject}</strong>:
                </p>
                <div className="cms-form-group">
                  <label className="cms-label">Revaluation Reason</label>
                  <input
                    type="text"
                    required
                    className="cms-input"
                    value={revalInputReason}
                    placeholder="Explain why this result should be reviewed"
                    onChange={(e) => setRevalInputReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="cms-modal-footer">
                <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setRevalModalSubject(null)}>
                  Cancel
                </button>
                <button type="submit" className="cms-btn cms-btn-primary">
                  Save Revaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Student Result"
          message={`Are you sure you want to delete the result entry for ${deleteTarget.name} (${deleteTarget.subject})?`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Publish Results Confirmation Dialog */}
      {confirm && (
        <div className="cms-modal-overlay" onClick={() => setConfirm(false)}>
          <div className="cms-modal-content" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">Publish Results</h3>
              <button type="button" className="cms-modal-close" onClick={() => setConfirm(false)}>
                ✕
              </button>
            </div>

            <div className="cms-modal-body">
              <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                Published results become visible to students and parents. Continue?
              </p>
            </div>

            <div className="cms-modal-footer">
              <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  setConfirm(false);
                  setToast("Results published successfully");
                }}
              >
                Publish Results
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
