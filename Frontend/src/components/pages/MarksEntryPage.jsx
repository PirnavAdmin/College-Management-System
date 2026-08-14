import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import "./MarksEntryPage.css";

/* ============================================================
   SVG ICON COMPONENTS
   ============================================================ */
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconXCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ============================================================ 
   STATIC MASTER DATA (100% Offline & Pure Static Data) 
   ============================================================ */ 
const BOARDS_OPTIONS = [ 
  { label: "State Board of Intermediate Education (TSBIE)", value: "BOARD_TSBIE" }, 
  { label: "Central Board of Secondary Education (CBSE)", value: "BOARD_CBSE" }, 
  { label: "Indian Certificate of Secondary Education (ICSE)", value: "BOARD_ICSE" } 
]; 
 
const ACADEMIC_YEARS_OPTIONS = [ 
  { label: "2024 - 2025", value: "AY_2024_2025" }, 
  { label: "2025 - 2026", value: "AY_2025_2026" } 
]; 
 
const ACADEMIC_LEVELS_OPTIONS = [ 
  { label: "Senior Secondary (11th & 12th)", value: "LEVEL_SR_SEC" }, 
  { label: "Higher Secondary", value: "LEVEL_HR_SEC" } 
]; 
 
const GROUP_OPTIONS = [ 
  { label: "MPC", value: "MPC" }, 
  { label: "BiPC", value: "BiPC" }, 
  { label: "CEC", value: "CEC" }, 
  { label: "MEC", value: "MEC" } 
]; 
 
const SECTION_OPTIONS = [ 
  { label: "Section A", value: "Section A" }, 
  { label: "Section B", value: "Section B" }, 
  { label: "Section C", value: "Section C" } 
]; 
 
const EXAMINATIONS_OPTIONS = [ 
  { label: "Semester I", value: "Semester I" }, 
  { label: "Midterm Examination 2025", value: "Midterm Examination 2025" }, 
  { label: "Quarterly Assessment 1", value: "Quarterly Assessment 1" }, 
  { label: "Annual Pre-Board Exam", value: "Annual Pre-Board Exam" } 
]; 
 
const GROUP_SUBJECTS = { 
  MPC: { 
    firstYear: ["English", "Sanskrit", "Mathematics 1A", "Mathematics 1B", "Physics I", "Chemistry I"], 
    secondYear: ["English", "Sanskrit", "Mathematics 2A", "Mathematics 2B", "Physics II", "Chemistry II"] 
  }, 
  BiPC: { 
    firstYear: ["English", "Sanskrit", "Botany I", "Zoology I", "Physics I", "Chemistry I"], 
    secondYear: ["English", "Sanskrit", "Botany II", "Zoology II", "Physics II", "Chemistry II"] 
  }, 
  CEC: { 
    firstYear: ["English", "Sanskrit", "Civics I", "Economics I", "Commerce I"], 
    secondYear: ["English", "Sanskrit", "Civics II", "Economics II", "Commerce II"] 
  }, 
  MEC: { 
    firstYear: ["English", "Sanskrit", "Mathematics 1A", "Mathematics 1B", "Economics I", "Commerce I"], 
    secondYear: ["English", "Sanskrit", "Mathematics 2A", "Mathematics 2B", "Economics II", "Commerce II"] 
  } 
}; 
 
const SUBJECT_FACULTY = { 
  English: "Lakshmi", 
  Sanskrit: "Suresh", 
  Mathematics: "Ravi Kumar", 
  Physics: "Naresh", 
  Chemistry: "Kiran", 
  Botany: "Dr. S. Reddy", 
  Zoology: "Dr. P. Varma", 
  Civics: "M. Narayana", 
  Economics: "K. Swamy", 
  Commerce: "V. Rao" 
}; 

const SUBJECT_CODES = { 
  English: "ENG101", 
  Sanskrit: "SAN101", 
  Mathematics: "MAT101", 
  Physics: "PHY101", 
  Chemistry: "CHE101", 
  Botany: "BOT101", 
  Zoology: "ZOO101", 
  Civics: "CIV101", 
  Economics: "ECO101", 
  Commerce: "COM101" 
}; 

const FACULTY_CODES = { 
  Lakshmi: "FAC1001", 
  Suresh: "FAC1002", 
  "Ravi Kumar": "FAC1003", 
  Naresh: "FAC1004", 
  Kiran: "FAC1005", 
  "Dr. S. Reddy": "FAC1006", 
  "Dr. P. Varma": "FAC1007", 
  "M. Narayana": "FAC1008", 
  "K. Swamy": "FAC1009", 
  "V. Rao": "FAC1010" 
}; 

const INITIAL_STUDENTS_BASE = [ 
  { id: 101, rollNo: "001", studentName: "Rahul" }, 
  { id: 102, rollNo: "002", studentName: "Ramesh" }, 
  { id: 103, rollNo: "003", studentName: "Sai Kiran" }, 
  { id: 104, rollNo: "004", studentName: "Ananya Reddy" }, 
  { id: 105, rollNo: "005", studentName: "Venkatesh" }, 
  { id: 106, rollNo: "006", studentName: "Priyanka" },
  { id: 107, rollNo: "007", studentName: "Karthik" },
  { id: 108, rollNo: "008", studentName: "Sneha" },
  { id: 109, rollNo: "009", studentName: "Manish" },
  { id: 110, rollNo: "010", studentName: "Divya" }
]; 
 
const STUDENTS_PER_PAGE = 10; 
const STUDENT_MARKS_PER_PAGE = 10; 

const STATUS_META = { 
  DRAFT: { label: "DRAFT", badgeClass: "cms-status-submitted" }, 
  SUBMITTED: { label: "SUBMITTED", badgeClass: "cms-status-submitted" }, 
  VERIFIED: { label: "VERIFIED", badgeClass: "cms-status-verified" }, 
  APPROVED: { label: "APPROVED", badgeClass: "cms-status-approved" }, 
  REJECTED: { label: "REJECTED", badgeClass: "cms-status-rejected" } 
}; 
 
const PRACTICAL_SUBJECT_NAMES = ["physics", "chemistry", "zoology", "botany"]; 
 
const isPracticalSubject = (subjectName) => { 
  if (!subjectName) return false; 
  const name = String(subjectName).toLowerCase().trim(); 
  return PRACTICAL_SUBJECT_NAMES.some((p) => name.includes(p)); 
}; 
 
const getBaseSubjectName = (subjectName) => 
  String(subjectName || "").replace(/\s(?:1A|1B|2A|2B|I|II)$/i, ""); 
 
const isSecondYearExam = (examName) => 
  /(?:semester\s*(?:ii|2)|midterm\s*(?:ii|2)|quarterly\s*(?:ii|2)|annual|pre\s*-?\s*final|final)/i.test( 
    String(examName || "") 
  ); 
 
const calculateTotal = (row, isPractical) => { 
  const internal = Number(row.internalMarks || row.internal) || 0; 
  const theory = Number(row.theoryMarks || row.theory) || 0; 
  const practical = isPractical ? Number(row.practicalMarks || row.practical) || 0 : 0; 
  return internal + theory + practical; 
}; 
 
const getGrade = (totalMarks, maxMarks = 100) => { 
  const pct = (totalMarks / maxMarks) * 100; 
  if (pct >= 90) return "A+"; 
  if (pct >= 80) return "A"; 
  if (pct >= 70) return "B+"; 
  if (pct >= 60) return "B"; 
  if (pct >= 50) return "C"; 
  if (pct >= 40) return "D"; 
  return "F"; 
}; 

/* ============================================================ 
   MAIN COMPONENT 
   ============================================================ */ 
export default function MarksEntryPage() { 
  // Core 6 Filter States
  const [filters, setFilters] = useState({ 
    board: "", 
    academicYear: "", 
    academicLevel: "", 
    group: "", 
    section: "", 
    examination: ""
  }); 
 
  const [ready, setReady] = useState(false); 
  const [activeTab, setActiveTab] = useState("evaluations"); // "evaluations" | "studentAnalysis"
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState(""); 
  const [studentAnalysisSearchTerm, setStudentAnalysisSearchTerm] = useState(""); 
  const [toastMessage, setToastMessage] = useState(null); 
  const toastTimeoutRef = useRef(null);
 
  // Data States 
  const [evaluations, setEvaluations] = useState([]); 
  const [subjectStatuses, setSubjectStatuses] = useState({}); 
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null); 
  const [subjectMarksData, setSubjectMarksData] = useState({}); 
  const [modalRows, setModalRows] = useState([]); 
  const [viewMode, setViewMode] = useState("list"); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [studentMarksPage, setStudentMarksPage] = useState(1); 

  const selectedEvaluation = useMemo(
    () => evaluations.find((item) => item.subjectId === selectedEvaluationId) ?? null,
    [evaluations, selectedEvaluationId]
  );

  const showToast = useCallback((message, type = "success") => { 
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = Date.now(); 
    setToastMessage({ id, msg: message, type }); 
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3500); 
  }, []); 

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const getCurrentStatus = useCallback( 
    (subjectId, fallbackStatus) => 
      subjectStatuses[subjectId] ?? fallbackStatus ?? "SUBMITTED", 
    [subjectStatuses] 
  ); 

  const currentGroupSubjects = useMemo(() => { 
    const grp = filters.group || "MPC";
    const groupSubjects = GROUP_SUBJECTS[grp] || GROUP_SUBJECTS.MPC; 
    return isSecondYearExam(filters.examination) 
      ? groupSubjects.secondYear 
      : groupSubjects.firstYear; 
  }, [filters.group, filters.examination]); 

  // Generate Fallback Static Marks Data for a Subject
  const createStaticMarksForSubject = useCallback((subjectName) => { 
    const sectionShort = (filters.section || "A").replace(/Section\s*/i, "").trim() || "A"; 
    const practicalSubject = isPracticalSubject(subjectName); 
    const grp = filters.group || "MPC";
    return INITIAL_STUDENTS_BASE.map((student, index) => ({ 
      studentId: student.id, 
      rollNo: `${grp}${sectionShort}${student.rollNo}`, 
      studentName: student.studentName, 
      internal: practicalSubject ? 15 + (index % 5) : 20, 
      theory: practicalSubject ? 40 + index * 2 : 60 + index * 2, 
      practical: practicalSubject ? 20 : 0, 
      remarks: "Good Performance", 
      isAbsent: false 
    })); 
  }, [filters.group, filters.section]); 

  // Static Data Generator on Click "Fetch Evaluation Data"
  const handleFetchData = () => { 
    const subjects = currentGroupSubjects; 
    const newEvaluations = subjects.map((subj, index) => { 
      const baseSubj = getBaseSubjectName(subj); 
      const facultyName = SUBJECT_FACULTY[baseSubj] || "Faculty Instructor"; 
      const facultyCode = FACULTY_CODES[facultyName] || `FAC100${index + 1}`;
      const subjectCode = SUBJECT_CODES[baseSubj] || `SUBJ${100 + index + 1}`;
      const isPrac = isPracticalSubject(subj);
      
      const avgTheory = 65 + index * 2;
      const avgPractical = isPrac ? 20 : 0;
      const totalAvg = avgTheory + avgPractical;

      return { 
        evaluationId: `EV-${1000 + index + 1}`, 
        subjectId: `SUBJ-${100 + index + 1}`, 
        subjectName: subj, 
        subjectCode,
        facultyName, 
        facultyCode,
        theoryMarks: avgTheory,
        practicalMarks: avgPractical,
        obtainedMarks: totalAvg,
        totalMarks: 100,
        totalStudents: INITIAL_STUDENTS_BASE.length, 
        averageMarks: totalAvg, 
        highestMarks: isPrac ? 95 : 98, 
        lowestMarks: 45, 
        status: index % 2 === 0 ? "SUBMITTED" : "VERIFIED"
      }; 
    }); 

    const newSubjectMarksData = {}; 
    newEvaluations.forEach((evaluation) => { 
      newSubjectMarksData[evaluation.subjectId] = createStaticMarksForSubject(evaluation.subjectName); 
    }); 

    setEvaluations(newEvaluations); 
    setSubjectStatuses( 
      newEvaluations.reduce((statuses, item) => { 
        statuses[item.subjectId] = item.status; 
        return statuses; 
      }, {}) 
    ); 
    setSubjectMarksData(newSubjectMarksData); 
    setEvaluationSearchTerm("");
    setStudentAnalysisSearchTerm("");
    setSelectedEvaluationId(null);
    setModalRows([]);
    setCurrentPage(1);
    setStudentMarksPage(1); 
    setReady(true); 
    setViewMode("list");
  }; 

  // Handle Cascading Filter Changes
  const handleFilterChange = (key, value) => { 
    setReady(false); 
    setSelectedEvaluationId(null); 
    setViewMode("list"); 
    setFilters((prev) => { 
      const next = { ...prev, [key]: value }; 
      if (key === "board") { 
        next.academicYear = ""; 
        next.academicLevel = ""; 
        next.group = ""; 
        next.section = ""; 
        next.examination = ""; 
      } else if (key === "academicYear") { 
        next.academicLevel = ""; 
        next.group = ""; 
        next.section = ""; 
        next.examination = ""; 
      } else if (key === "academicLevel") { 
        next.group = ""; 
        next.section = ""; 
        next.examination = ""; 
      } else if (key === "group") { 
        next.section = ""; 
        next.examination = ""; 
      } else if (key === "section") { 
        next.examination = ""; 
      } 
      return next; 
    }); 
  }; 

  const isAllFiltersSelected = useMemo(() => { 
    return Boolean( 
      filters.board && 
      filters.academicYear && 
      filters.academicLevel && 
      filters.group && 
      filters.section && 
      filters.examination 
    ); 
  }, [filters]); 

  // Row Click: Open Subject Evaluation Details
  const handleRowClick = (item) => {
    setSelectedEvaluationId(item.subjectId);
    const rows = subjectMarksData[item.subjectId] || createStaticMarksForSubject(item.subjectName);
    setModalRows(rows);
    setCurrentPage(1);
    setViewMode("details");
  };

  const handleBackToEvaluations = () => { 
    setSelectedEvaluationId(null); 
    setModalRows([]); 
    setCurrentPage(1); 
    setViewMode("list"); 
  }; 

  // Single Evaluation Status Change Action (Verify / Approve / Reject)
  const handleUpdateStatus = (targetStatusNum) => {
    if (!selectedEvaluation) return;
    const targetSid = selectedEvaluation.subjectId;
    const currentStatus = getCurrentStatus(targetSid, selectedEvaluation.status);

    if (targetStatusNum === 4) { 
      // Rejection is isolated to the selected subject.
      const updatedStatuses = { ...subjectStatuses, [targetSid]: "REJECTED" };

      setSubjectStatuses(updatedStatuses);
      setEvaluations((prev) =>
        prev.map((item) => ({
          ...item,
          status: updatedStatuses[item.subjectId] ?? item.status
        }))
      );

      showToast("Subject REJECTED successfully.", "error"); 
    } else {
      const statusMap = { 2: "VERIFIED", 3: "APPROVED", edit: "SUBMITTED" };
      const newStatusStr = statusMap[targetStatusNum] || "VERIFIED";
      if (newStatusStr === "APPROVED" && currentStatus !== "SUBMITTED" && currentStatus !== "VERIFIED") return;

      const updatedStatuses = { ...subjectStatuses, [targetSid]: newStatusStr };
      setSubjectStatuses(updatedStatuses);
      setEvaluations((prev) =>
        prev.map((item) => (item.subjectId === targetSid ? { ...item, status: newStatusStr } : item))
      );
      showToast(
        newStatusStr === "SUBMITTED"
          ? "Subject reverted to Submitted successfully"
          : `Subject status updated to ${newStatusStr} successfully`,
        "success"
      );
    }
  };

  // Global Approval Action ("Approve All")
  // Approves any subject that is currently SUBMITTED or VERIFIED to APPROVED, keeping REJECTED subjects intact.
  const handleGlobalApproval = () => { 
    if (!isAllFiltersSelected || evaluations.length === 0) return; 

    const updatedStatuses = { ...subjectStatuses };
    evaluations.forEach((item) => {
      const currentSubjStatus = updatedStatuses[item.subjectId] ?? item.status ?? "SUBMITTED";
      if (currentSubjStatus === "SUBMITTED" || currentSubjStatus === "VERIFIED") {
        updatedStatuses[item.subjectId] = "APPROVED";
      }
    });

    setSubjectStatuses(updatedStatuses);
    setEvaluations((prevEvaluations) =>
      prevEvaluations.map((item) => ({
        ...item,
        status: updatedStatuses[item.subjectId] ?? item.status
      }))
    );

    showToast("All eligible subjects (Submitted / Verified) approved successfully", "success"); 
  }; 

  const filteredEvaluations = useMemo(() => { 
    return evaluations.filter((item) => { 
      if (!evaluationSearchTerm.trim()) return true; 
      const term = evaluationSearchTerm.toLowerCase(); 
      const statusStr = getCurrentStatus(item.subjectId, item.status);
      return ( 
        (item.subjectName || "").toLowerCase().includes(term) || 
        (item.facultyName || "").toLowerCase().includes(term) || 
        (item.subjectCode || "").toLowerCase().includes(term) || 
        (item.facultyCode || "").toLowerCase().includes(term) || 
        String(statusStr).toLowerCase().includes(term) 
      ); 
    }); 
  }, [evaluations, evaluationSearchTerm, getCurrentStatus]); 

  // Student Analysis Dynamic Marks & Grade List
  const studentSubjectMarksList = useMemo(() => { 
    const sectionShort = (filters.section || "A").replace(/Section\s*/i, "").trim() || "A"; 
    const grp = filters.group || "MPC";
    return INITIAL_STUDENTS_BASE.map((student, idx) => { 
      const rollNo = `${grp}${sectionShort}${student.rollNo}`; 
      let studentTotal = 0; 
      const marksPerSubject = {}; 
      currentGroupSubjects.forEach((subj, subjectIndex) => { 
        const subjectId = evaluations[subjectIndex]?.subjectId;
        const subjRows = subjectId ? subjectMarksData[subjectId] || [] : []; 
        const match = subjRows.find((r) => r.studentId === student.id) || subjRows[idx]; 
        if (match) { 
          const isPractical = isPracticalSubject(subj); 
          const total = calculateTotal(match, isPractical); 
          marksPerSubject[subjectId] = total; 
          studentTotal += total; 
        } else { 
          marksPerSubject[subjectId] = null; 
        } 
      }); 
      const maxPossible = currentGroupSubjects.length * 100; 
      const overallGrade = getGrade(studentTotal, maxPossible); 
      return { 
        studentId: student.id, 
        rollNo, 
        studentName: student.studentName, 
        subjectMarks: marksPerSubject, 
        totalMarks: studentTotal, 
        maxTotal: maxPossible,
        grade: overallGrade 
      }; 
    }); 
  }, [subjectMarksData, currentGroupSubjects, evaluations, filters.group, filters.section]); 

  const filteredStudentMarks = useMemo(() => { 
    if (!studentAnalysisSearchTerm.trim()) return studentSubjectMarksList; 
    const term = studentAnalysisSearchTerm.toLowerCase().trim(); 
    return studentSubjectMarksList.filter((student) => 
      (student.rollNo || "").toLowerCase().includes(term) || 
      (student.studentName || "").toLowerCase().includes(term) || 
      String(student.totalMarks || "").includes(term) || 
      (student.grade || "").toLowerCase().includes(term) 
    ); 
  }, [studentSubjectMarksList, studentAnalysisSearchTerm]); 

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(modalRows.length / STUDENTS_PER_PAGE)); 
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safeCurrentPage - 1) * STUDENTS_PER_PAGE; 
  const paginatedRows = useMemo( 
    () => modalRows.slice(pageStart, pageStart + STUDENTS_PER_PAGE), 
    [modalRows, pageStart] 
  ); 

  const studentMarksTotalPages = Math.max( 
    1, 
    Math.ceil(filteredStudentMarks.length / STUDENT_MARKS_PER_PAGE) 
  ); 
  const safeStudentMarksPage = Math.min(Math.max(1, studentMarksPage), studentMarksTotalPages);
  const studentMarksPageStart = (safeStudentMarksPage - 1) * STUDENT_MARKS_PER_PAGE; 
  const paginatedStudentMarks = useMemo( 
    () => 
      filteredStudentMarks.slice( 
        studentMarksPageStart, 
        studentMarksPageStart + STUDENT_MARKS_PER_PAGE 
      ), 
    [filteredStudentMarks, studentMarksPageStart] 
  ); 

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setStudentMarksPage((page) => Math.min(Math.max(1, page), studentMarksTotalPages));
  }, [studentMarksTotalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [evaluationSearchTerm]);

  useEffect(() => {
    setStudentMarksPage(1);
  }, [studentAnalysisSearchTerm, activeTab]);

  return ( 
    <DashboardLayout 
      title="Academic Evaluation" 
      subtitle="Review, verify and approve faculty submitted evaluations." 
      breadcrumb={["Examinations", "Marks Evaluation"]} 
    > 
      <div className="cms-marks-entry cms-anim-up"> 
         
        {toastMessage && ( 
          <div key={toastMessage.id} className={`cms-toast-banner cms-toast-${toastMessage.type}`}> 
            <span>{toastMessage.msg}</span> 
          </div> 
        )} 

        {/* 6 Core Filters Grid */} 
        <div className="cms-card cms-card-filter"> 
          <div className="cms-section-heading"> 
            <div> 
              <h2>Evaluation Filters</h2> 
              <p>Choose the academic context before reviewing faculty submissions.</p> 
            </div> 
            <button 
              className="cms-btn cms-btn-primary" 
              disabled={!isAllFiltersSelected} 
              onClick={handleFetchData} 
            > 
              Fetch Evaluation Data
            </button> 
          </div> 

          <div className="cms-filter-grid"> 
            <SelectFilter 
              label="Board" 
              value={filters.board} 
              options={BOARDS_OPTIONS} 
              onChange={(v) => handleFilterChange("board", v)} 
            /> 
            <SelectFilter 
              label="Academic Year" 
              value={filters.academicYear} 
              disabled={!filters.board} 
              options={ACADEMIC_YEARS_OPTIONS} 
              onChange={(v) => handleFilterChange("academicYear", v)} 
            /> 
            <SelectFilter 
              label="Academic Level" 
              value={filters.academicLevel} 
              disabled={!filters.board || !filters.academicYear} 
              options={ACADEMIC_LEVELS_OPTIONS} 
              onChange={(v) => handleFilterChange("academicLevel", v)} 
            /> 
            <SelectFilter 
              label="Group" 
              value={filters.group} 
              disabled={!filters.academicLevel} 
              options={GROUP_OPTIONS} 
              onChange={(v) => handleFilterChange("group", v)} 
            /> 
            <SelectFilter 
              label="Section" 
              value={filters.section} 
              disabled={!filters.group} 
              options={SECTION_OPTIONS} 
              onChange={(v) => handleFilterChange("section", v)} 
            /> 
            <SelectFilter 
              label="Examination" 
              value={filters.examination} 
              disabled={!filters.section} 
              options={EXAMINATIONS_OPTIONS} 
              onChange={(v) => handleFilterChange("examination", v)} 
            /> 
          </div> 
        </div> 

        {/* Content Section */} 
        {ready ? ( 
          viewMode === "list" ? ( 
            <div className="cms-card cms-main-card"> 
              <div className="cms-table-toolbar"> 
                {/* 2 Main Tabs */} 
                <div className="cms-tab-bar"> 
                  <button 
                    className={`cms-tab-btn ${activeTab === "evaluations" ? "cms-active" : ""}`} 
                    onClick={() => setActiveTab("evaluations")} 
                  > 
                    Evaluation 
                  </button> 
                  <button 
                    className={`cms-tab-btn ${activeTab === "studentAnalysis" ? "cms-active" : ""}`} 
                    onClick={() => setActiveTab("studentAnalysis")} 
                  > 
                    Student Analysis 
                  </button> 
                </div> 

                {activeTab === "evaluations" && ( 
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}> 
                    {/* Global Approval Button */} 
                    <button 
                      className="cms-btn cms-btn-success" 
                      onClick={handleGlobalApproval} 
                    > 
                      Approve All 
                    </button> 

                    <div className="cms-search-wrap"> 
                      <span className="cms-search-icon"><IconSearch /></span> 
                      <input 
                        type="text" 
                        className="cms-search-input" 
                        placeholder="Search subject, faculty, status..." 
                        value={evaluationSearchTerm} 
                        onChange={(e) => setEvaluationSearchTerm(e.target.value)} 
                      /> 
                    </div> 
                  </div> 
                )} 

                {activeTab === "studentAnalysis" && ( 
                  <div className="cms-search-wrap"> 
                    <span className="cms-search-icon"><IconSearch /></span> 
                    <input 
                      type="text" 
                      className="cms-search-input" 
                      placeholder="Search roll no, student..." 
                      value={studentAnalysisSearchTerm} 
                      onChange={(e) => setStudentAnalysisSearchTerm(e.target.value)} 
                    /> 
                  </div> 
                )} 
              </div> 

              {/* Tab 1: Subject Evaluation */} 
              {activeTab === "evaluations" && ( 
                <div className="cms-table-container"> 
                  <table className="cms-table"> 
                    <thead> 
                      <tr> 
                        <th className="cms-text-left">SUBJECT NAME</th> 
                        <th className="cms-text-left">FACULTY</th> 
                        <th className="cms-text-center">TOTAL MARKS</th> 
                        <th className="cms-text-center">STATUS</th> 
                      </tr> 
                    </thead> 
                    <tbody> 
                      {filteredEvaluations.length > 0 ? ( 
                        filteredEvaluations.map((item) => { 
                          const statusStr = getCurrentStatus(item.subjectId, item.status); 
                          return ( 
                            <tr 
                              key={item.subjectId} 
                              className="cms-clickable-row" 
                              onClick={() => handleRowClick(item)} 
                            > 
                              {/* Subject Column: Left Aligned Single Line */}
                              <td className="cms-font-semibold cms-text-left cms-single-line">
                                {item.subjectName} - {item.subjectCode}
                              </td> 

                              {/* Faculty Column: Left Aligned Single Line */}
                              <td className="cms-text-muted cms-text-left cms-single-line">
                                {item.facultyName} - {item.facultyCode}
                              </td> 

                              {/* Total Marks: Center Aligned */}
                              <td className="cms-font-semibold cms-text-center">
                                {item.obtainedMarks} / {item.totalMarks}
                              </td> 

                              {/* Status Badge: Center Aligned */}
                              <td className="cms-text-center"> 
                                <StatusBadge status={statusStr} /> 
                              </td> 

                            </tr> 
                          ); 
                        }) 
                      ) : ( 
                        <tr> 
                          <td colSpan={4} className="cms-empty-td"> 
                            No evaluations found matching search criteria. 
                          </td> 
                        </tr> 
                      )} 
                    </tbody> 
                  </table> 
                </div> 
              )} 

              {/* Tab 2: Student Analysis Table */} 
              {activeTab === "studentAnalysis" && ( 
                <> 
                  <div className="cms-table-container"> 
                    <table className="cms-table"> 
                      <thead> 
                        <tr> 
                          <th className="cms-text-left">ROLL NO</th> 
                          <th className="cms-text-left">STUDENT NAME</th> 
                          {currentGroupSubjects.map((subj, subjectIndex) => ( 
                            <th key={evaluations[subjectIndex]?.subjectId || `${subj}-${subjectIndex}`} className="cms-text-center">
                              {String(subj).toUpperCase()}
                            </th> 
                          ))} 
                          <th className="cms-text-center">TOTAL MARKS</th> 
                          <th className="cms-text-center">GRADE</th> 
                        </tr> 
                      </thead> 
                      <tbody> 
                        {filteredStudentMarks.length > 0 ? ( 
                          paginatedStudentMarks.map((stu, index) => { 
                            const marksObj = stu.subjectMarks || {}; 
                            return ( 
                              <tr key={stu.studentId || index} className="cms-idle-row"> 
                                <td className="cms-font-semibold cms-text-left">
                                  {stu.rollNo || "—"}
                                </td> 
                                <td className="cms-text-left">{stu.studentName}</td> 

                                {currentGroupSubjects.map((subj, subjectIndex) => ( 
                                  <td key={evaluations[subjectIndex]?.subjectId || `${subj}-${subjectIndex}`} className="cms-text-center">
                                    {marksObj[evaluations[subjectIndex]?.subjectId] ?? "—"}
                                  </td> 
                                ))} 

                                {/* Student Analysis Total: Centered */}
                                <td className="cms-font-semibold cms-text-center">
                                  {stu.totalMarks} / {stu.maxTotal}
                                </td> 

                                {/* Grade Badge: Centered */}
                                <td className="cms-text-center"> 
                                  <span className={`cms-badge-grade cms-grade-${String(stu.grade || "A").toLowerCase().replace("+", "-plus")}`}> 
                                    {stu.grade || "A"} 
                                  </span> 
                                </td> 
                              </tr> 
                            ); 
                          }) 
                        ) : ( 
                          <tr> 
                            <td colSpan={currentGroupSubjects.length + 4} className="cms-empty-td"> 
                              No student analysis available. 
                            </td> 
                          </tr> 
                        )} 
                      </tbody> 
                    </table> 
                  </div> 

                  <div className="cms-pagination" aria-label="Student analysis pagination"> 
                    <button 
                      className="cms-page-btn" 
                      disabled={safeStudentMarksPage === 1} 
                      onClick={() => setStudentMarksPage((page) => Math.max(1, page - 1))} 
                    > 
                      Previous 
                    </button> 
                    <span> 
                      Page {safeStudentMarksPage} of {studentMarksTotalPages} 
                    </span> 
                    <button 
                      className="cms-page-btn" 
                      disabled={safeStudentMarksPage === studentMarksTotalPages} 
                      onClick={() => setStudentMarksPage((page) => Math.min(studentMarksTotalPages, page + 1))} 
                    > 
                      Next 
                    </button> 
                  </div> 
                </> 
              )} 
            </div> 
          ) : selectedEvaluation ? ( 
            /* Subject Detail View (Opened on Row Click) */
            <EvaluationDetailsView 
              selectedEvaluation={selectedEvaluation} 
              currentStatus={getCurrentStatus(selectedEvaluation.subjectId, selectedEvaluation.status)} 
              filters={filters} 
              rows={paginatedRows} 
              totalPages={totalPages} 
              currentPage={safeCurrentPage} 
              onBack={handleBackToEvaluations} 
              onUpdateStatus={handleUpdateStatus} 
              onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))} 
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} 
            /> 
          ) : null 
        ) : ( 
          <div className="cms-card cms-empty-table"> 
            <p>Select all 6 evaluation filters and click <strong>Fetch Evaluation Data</strong> to view evaluation status &amp; student marks.</p> 
          </div> 
        )} 
      </div> 
    </DashboardLayout> 
  ); 
} 

function SelectFilter({ label, value, options, disabled, onChange }) { 
  return ( 
    <div className="cms-field-group"> 
      <label className="cms-field-label">{label}</label> 
      <select 
        className="cms-select-input" 
        value={value} 
        disabled={disabled} 
        onChange={(e) => onChange(e.target.value)} 
      > 
        <option value="">Select {label}</option> 
        {options.map((opt) => ( 
          <option key={opt.value} value={opt.value}> 
            {opt.label} 
          </option> 
        ))} 
      </select> 
    </div> 
  ); 
} 

/* ============================================================ 
   EVALUATION DETAILS VIEW (Same Container Size)
   ============================================================ */ 
function EvaluationDetailsView({ 
  selectedEvaluation, 
  currentStatus, 
  filters, 
  rows, 
  totalPages, 
  currentPage, 
  onBack, 
  onUpdateStatus, 
  onPreviousPage, 
  onNextPage 
}) { 
  const practical = isPracticalSubject(selectedEvaluation?.subjectName); 

  return ( 
    <div className="cms-card cms-main-card cms-evaluation-details"> 
      <div className="cms-details-header"> 
        <div> 
          <button className="cms-back-btn" onClick={onBack}>← Back to Evaluations</button> 
          <h2 className="cms-details-title"> 
            {selectedEvaluation?.subjectName} ({selectedEvaluation?.subjectCode}) Evaluation Marks Breakdown
          </h2> 
          <span className="cms-details-subtitle">Review student marks for this subject</span> 
        </div> 
      </div> 

      <div className="cms-detail-grid"> 
        <div className="cms-detail-card"> 
          <span className="cms-detail-label">Faculty</span> 
          <span className="cms-detail-value">{selectedEvaluation?.facultyName} - {selectedEvaluation?.facultyCode}</span> 
        </div> 
        <div className="cms-detail-card"> 
          <span className="cms-detail-label">Group</span> 
          <span className="cms-detail-value">{filters.group}</span> 
        </div> 
        <div className="cms-detail-card"> 
          <span className="cms-detail-label">Section</span> 
          <span className="cms-detail-value">{filters.section}</span> 
        </div> 
        <div className="cms-detail-card"> 
          <span className="cms-detail-label">Examination</span> 
          <span className="cms-detail-value">{filters.examination}</span> 
        </div> 
      </div> 

      {/* Marks Table */} 
      <div className="cms-table-container cms-details-table-wrap"> 
        <table className="cms-table cms-details-table"> 
          <thead> 
            <tr> 
              <th className="cms-text-left">ROLL NO</th> 
              <th className="cms-text-left">STUDENT NAME</th> 
              <th className="cms-text-center">INTERNAL</th> 
              {practical && <th className="cms-text-center">PRACTICAL</th>} 
              <th className="cms-text-center">THEORY</th> 
              <th className="cms-text-center">TOTAL MARKS</th> 
              <th className="cms-text-left">REMARKS</th> 
              <th className="cms-text-center">ABSENT</th> 
            </tr> 
          </thead> 
          <tbody> 
            {rows.length > 0 ? ( 
              rows.map((row, pageIndex) => { 
                const totalMarks = calculateTotal(row, practical); 
                return ( 
                  <tr key={row.studentId || pageIndex}> 
                    <td className="cms-font-semibold cms-text-left">{row.rollNo}</td> 
                    <td className="cms-text-left">{row.studentName}</td> 
                    <td className="cms-text-center">{row.internal}</td> 
                    {practical && <td className="cms-text-center">{row.practical}</td>} 
                    <td className="cms-text-center">{row.theory}</td> 
                    <td className="cms-font-semibold cms-text-center">{totalMarks}</td> 
                    <td className="cms-text-left">{row.remarks}</td> 
                    <td className="cms-text-center">{row.isAbsent ? "Yes" : "No"}</td> 
                  </tr> 
                ); 
              }) 
            ) : ( 
              <tr> 
                <td colSpan={8} className="cms-empty-td">No student mark details available.</td> 
              </tr> 
            )} 
          </tbody> 
        </table> 
      </div> 

      {totalPages > 1 && ( 
        <div className="cms-pagination" aria-label="Evaluation details pagination"> 
          <button 
            className="cms-page-btn" 
            disabled={currentPage === 1} 
            onClick={onPreviousPage} 
          > 
            Previous 
          </button> 

          <span> 
            Page {currentPage} of {totalPages} 
          </span> 

          <button 
            className="cms-page-btn" 
            disabled={currentPage === totalPages} 
            onClick={onNextPage} 
          > 
            Next 
          </button> 
        </div> 
      )} 

      {/* Admin Action Buttons & Read-Only Status Pills */}
      <div className="cms-modal-actions"> 
        {currentStatus === "SUBMITTED" && ( 
          <> 
            <button className="cms-btn cms-btn-info" onClick={() => onUpdateStatus(2)}><IconCheck /> Verify</button> 
            <button className="cms-btn cms-btn-danger" onClick={() => onUpdateStatus(4)}><IconXCircle /> Reject</button> 
            <button className="cms-btn" disabled>Edit</button>
          </> 
        )} 
        {currentStatus === "VERIFIED" && ( 
          <> 
            <button className="cms-btn cms-btn-success" onClick={() => onUpdateStatus(3)}><IconCheck /> Approve</button> 
            <button className="cms-btn cms-btn-danger" onClick={() => onUpdateStatus(4)}><IconXCircle /> Reject</button> 
            <button className="cms-btn" onClick={() => onUpdateStatus("edit")}>Edit</button>
          </> 
        )} 
        {currentStatus === "APPROVED" && ( 
          <span className="cms-status-pill cms-status-approved"><IconCheck /> Approved</span> 
        )} 
        {currentStatus === "REJECTED" && ( 
          <>
            <span className="cms-status-pill cms-status-rejected"><IconXCircle /> Rejected</span> 
            <button className="cms-btn" onClick={() => onUpdateStatus("edit")}>Edit</button>
          </>
        )} 
      </div> 
    </div> 
  ); 
} 

function StatusBadge({ status }) { 
  const s = String(status || "SUBMITTED").toUpperCase(); 
  const meta = STATUS_META[s] || STATUS_META.SUBMITTED; 

  return ( 
    <span className={`cms-badge-status ${meta.badgeClass}`}> 
      <span className="cms-badge-dot" /> 
      {meta.label} 
    </span> 
  ); 
}
