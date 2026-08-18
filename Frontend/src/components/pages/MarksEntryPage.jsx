import React, { useState, useMemo, useCallback, useEffect, useRef } from "react"; 
import DashboardLayout from "../layout/DashboardLayout"; 
import apiClient, { getApiErrorMessage } from "@/api/axios.js"; 
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
 
const STUDENTS_PER_PAGE = 10; 
const STUDENT_MARKS_PER_PAGE = 10; 
 
const STATUS_META = { 
  DRAFT: { label: "DRAFT", badgeClass: "cms-status-submitted" }, 
  SUBMITTED: { label: "SUBMITTED", badgeClass: "cms-status-submitted" }, 
  VERIFIED: { label: "VERIFIED", badgeClass: "cms-status-verified" }, 
  APPROVED: { label: "APPROVED", badgeClass: "cms-status-approved" }, 
  REJECTED: { label: "REJECTED", badgeClass: "cms-status-rejected" }, 
  UNKNOWN: { label: "UNKNOWN", badgeClass: "cms-status-submitted" } 
}; 
 
const PRACTICAL_SUBJECT_NAMES = ["physics", "chemistry", "zoology", "botany"]; 
 
const isPracticalSubject = (subjectName) => { 
  if (!subjectName) return false; 
  const name = String(subjectName).toLowerCase().trim(); 
  return PRACTICAL_SUBJECT_NAMES.some((p) => name.includes(p)); 
}; 
 
const getResponseItems = (payload) => { 
  if (Array.isArray(payload)) return payload; 
  if (!payload || typeof payload !== "object") return []; 
  const items = payload.students ?? payload.marksList ?? payload.items ?? payload.data ?? payload.results; 
  return Array.isArray(items) ? items : getResponseItems(items); 
}; 
 
const normalizeStatus = (status) => { 
  if (status === null || status === undefined || String(status).trim() === "") return "UNKNOWN"; 
  const value = String(status).toUpperCase(); 
  return ({ 0: "DRAFT", 1: "SUBMITTED", 2: "VERIFIED", 3: "APPROVED", 4: "REJECTED" })[value] ?? value; 
}; 
 
const toEvaluationRow = (item) => ({ 
  ...item, 
  evaluationId: item.evaluationId ?? item.id, 
  subjectId: item.subjectId ?? item.subject?.subjectId ?? item.evaluationId ?? item.id, 
  subjectName: item.subjectName ?? item.subject?.subjectName ?? item.subject?.name ?? "—", 
  subjectCode: item.subjectCode ?? item.subject?.subjectCode ?? item.subject?.code ?? "—", 
  facultyName: item.facultyName ?? item.faculty?.facultyName ?? item.faculty?.name ?? "—", 
  facultyCode: item.facultyCode ?? item.faculty?.facultyCode ?? item.faculty?.code ?? "—", 
  obtainedMarks: item.obtainedMarks ?? "—", 
  totalMarks: item.totalMarks ?? item.maximumMarks ?? item.maxMarks ?? "—", 
  totalStudents: item.totalStudents ?? item.studentCount ?? 0, 
  averageMarks: item.averageMarks ?? item.average ?? "—", 
  highestMarks: item.highestMarks ?? item.highest ?? "—", 
  lowestMarks: item.lowestMarks ?? item.lowest ?? "—", 
  status: normalizeStatus(item.status ?? item.evaluationStatus), 
}); 
 
const toStudentMarksRow = (item) => ({ 
  ...item, 
  studentId: item.studentId ?? item.id, 
  rollNo: item.rollNo ?? item.rollNumber ?? "—", 
  studentName: item.studentName ?? item.name ?? item.fullName ?? "—", 
  internal: item.internal ?? item.internalMarks ?? "—", 
  practical: item.practical ?? item.practicalMarks ?? "—", 
  theory: item.theory ?? item.theoryMarks ?? "—", 
  totalMarks: item.totalMarks ?? item.obtainedMarks ?? "—", 
  remarks: item.remarks ?? "—", 
  isAbsent: Boolean(item.isAbsent ?? item.absent), 
}); 
 
const toStudentAnalysisRow = (item) => ({ 
  ...item, 
  studentId: item.studentId ?? item.id, 
  rollNo: item.rollNo ?? item.rollNumber ?? "—", 
  studentName: item.studentName ?? item.name ?? item.fullName ?? "—", 
  subjectMarks: item.subjectMarks ?? {}, 
  subjects: Array.isArray(item.subjects) ? item.subjects : [], 
  totalMarks: item.totalMarks ?? "—", 
  maxTotal: item.maxTotal ?? item.maximumMarks ?? item.totalMaximumMarks ?? "—", 
  grade: item.grade ?? "—", 
}); 
 
/* ============================================================  
   MAIN COMPONENT  
   ============================================================ */ 
export default function MarksEntryPage() { 
  const [filters, setFilters] = useState({ 
    board: "", 
    academicYear: "", 
    academicLevel: "", 
    group: "", 
    section: "", 
    examination: "" 
  }); 
 
  const [ready, setReady] = useState(false); 
  const [isLoading, setIsLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState("evaluations"); 
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState(""); 
  const [studentAnalysisSearchTerm, setStudentAnalysisSearchTerm] = useState(""); 
  const [toastMessage, setToastMessage] = useState(null); 
  const toastTimeoutRef = useRef(null); 
  const [boards, setBoards] = useState([]); 
  const [academicYears, setAcademicYears] = useState([]); 
  const [academicLevels, setAcademicLevels] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [sections, setSections] = useState([]); 
  const [examinations, setExaminations] = useState([]); 
 
  const [evaluations, setEvaluations] = useState([]); 
  const [studentAnalysis, setStudentAnalysis] = useState([]); 
  const [selectedStudent, setSelectedStudent] = useState(null); 
  const [studentDetails, setStudentDetails] = useState(null); 
  const [studentViewMode, setStudentViewMode] = useState("list"); 
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null); 
  const [modalRows, setModalRows] = useState([]); 
  const [viewMode, setViewMode] = useState("list"); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [studentMarksPage, setStudentMarksPage] = useState(1); 
  const [showRejectModal, setShowRejectModal] = useState(false); 
  const [showGlobalActionModal, setShowGlobalActionModal] = useState(false); 
  const [rejectReason, setRejectReason] = useState(""); 
  const [statusEditMode, setStatusEditMode] = useState(false); 
  const [pendingStatus, setPendingStatus] = useState(null); 
 
  const selectedEvaluation = useMemo( 
    () => 
      evaluations.find( 
        (item) => String(item.evaluationId) === String(selectedEvaluationId) 
      ) ?? null, 
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
 
  useEffect(() => { 
    let cancelled = false; 
 
    const loadFilterData = async () => { 
      try { 
        setIsLoading(true); 
        const [boardsResponse, yearsResponse, levelsResponse, groupsResponse, examsResponse] = await Promise.all([ 
          apiClient.get("/api/v1/boards"), 
          apiClient.get("/api/v1/academic-years"), 
          apiClient.get("/api/v1/boards/academic-levels"), 
          apiClient.get("/api/v1/groups"), 
          apiClient.get("/api/v1/examinations"), 
        ]); 
        if (cancelled) return; 
 
        const activeBoards = getResponseItems(boardsResponse.data).filter(board => board.status); 
        const activeAcademicYears = getResponseItems(yearsResponse.data).filter(year => year.isActive); 
 
        setBoards(activeBoards); 
        setAcademicYears(activeAcademicYears); 
        setAcademicLevels(getResponseItems(levelsResponse.data)); 
        setGroups(getResponseItems(groupsResponse.data)); 
        setExaminations(getResponseItems(examsResponse.data)); 
      } catch (error) { 
        if (!cancelled) showToast(getApiErrorMessage(error), "error"); 
      } finally { 
        if (!cancelled) setIsLoading(false); 
      } 
    }; 
 
    loadFilterData(); 
    return () => { cancelled = true; }; 
  }, [showToast]); 
 
  useEffect(() => { 
    let cancelled = false; 
    if (!filters.group) { 
      setSections([]); 
      return undefined; 
    } 
 
    const loadSections = async () => { 
      try { 
        setIsLoading(true); 
        const response = await apiClient.get(`/api/v1/Sections/group/${filters.group}`); 
        if (!cancelled) setSections(getResponseItems(response.data)); 
      } catch (error) { 
        if (!cancelled) { 
          setSections([]); 
          showToast(getApiErrorMessage(error), "error"); 
        } 
      } finally { 
        if (!cancelled) setIsLoading(false); 
      } 
    }; 
 
    loadSections(); 
    return () => { cancelled = true; }; 
  }, [filters.group, showToast]); 
 
  const boardOptions = useMemo( 
    () => boards.map((board) => ({ label: board.boardName, value: String(board.boardId) })), 
    [boards] 
  ); 
  const academicYearOptions = useMemo( 
    () => academicYears.map((year) => ({ label: year.academicYearName, value: String(year.academicYearId) })), 
    [academicYears] 
  ); 
  const academicLevelOptions = useMemo(() => { 
    return academicLevels.map((level) => ({ 
      label: level.levelName, 
      value: String(level.academicLevelId), 
    })); 
  }, [academicLevels]); 
 
  const groupOptions = useMemo(() => { 
    return groups 
      .filter( 
        (group) => (!filters.academicLevel || 
          String(group.academicLevelId) === filters.academicLevel) 
      ) 
      .map((group) => ({ 
        label: group.groupName, 
        value: String(group.groupId), 
      })); 
  }, [groups, filters.academicLevel]); 

  const examinationOptions = useMemo(() => { 
    return examinations.filter((exam) => { 
      const matchesContext = (value, selected) => value === undefined || value === null || value === "" || String(value) === selected; 
      return matchesContext(exam.boardId, filters.board) 
        && matchesContext(exam.academicYearId, filters.academicYear) 
        && matchesContext(exam.academicLevelId, filters.academicLevel); 
    }).map((exam) => ({ 
      label: exam.examName, 
      value: String(exam.examinationId), 
    })); 
  }, [examinations, filters.board, filters.academicYear, filters.academicLevel]); 
 
  const sectionOptions = useMemo(() => { 
    return sections.map((section) => ({ 
      label: section.sectionName, 
      value: String(section.sectionId), 
    })); 
  }, [sections]); 
 
  const displayFilters = useMemo(() => { 
    return { 
      group: groups.find((g) => String(g.groupId) === filters.group)?.groupName || "-", 
      section: sections.find((s) => String(s.sectionId) === filters.section)?.sectionName || "-", 
      examination: examinations.find((e) => String(e.examinationId) === filters.examination)?.examName || "-", 
    }; 
  }, [filters.group, filters.section, filters.examination, groups, sections, examinations]); 
 
  const getCurrentStatus = useCallback( 
    (status) => normalizeStatus(status), 
    [] 
  ); 
 
  const evaluationSubjects = useMemo(() => { 
    const subjects = evaluations.map((evaluation) => ({ 
      subjectId: evaluation.subjectId, 
      subjectName: evaluation.subjectName, 
    })); 
    const source = subjects.length ? subjects : studentAnalysis.flatMap((student) => 
      (student.subjects || []).map((subject) => ({ 
        subjectId: subject.subjectId ?? subject.id, 
        subjectName: subject.subjectName ?? subject.name, 
      })) 
    ); 
    return Array.from(new Map(source.filter((subject) => subject.subjectId != null) 
      .map((subject) => [String(subject.subjectId), subject])).values()); 
  }, [evaluations, studentAnalysis]); 
 
  const handleFetchData = async (preserveSelectedId = false) => { 
    const selectedId = preserveSelectedId ? selectedEvaluationId : null; 
    try { 
      setIsLoading(true); 
      const payload = { 
        boardId: Number(filters.board), 
        academicYearId: Number(filters.academicYear), 
        academicLevelId: Number(filters.academicLevel), 
        groupId: Number(filters.group), 
        sectionId: Number(filters.section), 
        examinationId: Number(filters.examination), 
      }; 
      const [evaluationsResponse, studentAnalysisResponse] = await Promise.all([ 
        apiClient.post("/api/v1/evaluations/search", payload), 
        apiClient.get("/api/v1/student-analysis", { params: payload }), 
      ]); 
      const newEvaluations = getResponseItems(evaluationsResponse.data).map(toEvaluationRow); 
 
      setEvaluations(newEvaluations); 
      setStudentAnalysis(getResponseItems(studentAnalysisResponse.data).map(toStudentAnalysisRow)); 
      if (!selectedId) { 
        setEvaluationSearchTerm(""); 
        setStudentAnalysisSearchTerm(""); 
        setSelectedStudent(null); 
        setStudentDetails(null); 
        setStudentViewMode("list"); 
        setSelectedEvaluationId(null); 
        setModalRows([]); 
        setCurrentPage(1); 
        setStudentMarksPage(1); 
      } else if (newEvaluations.some((item) => String(item.evaluationId) === String(selectedId))) { 
        setSelectedEvaluationId(selectedId); 
        setViewMode("details"); 
      } 
      setReady(true); 
      if (!selectedId) setViewMode("list"); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally { 
      setIsLoading(false); 
    } 
  }; 
 
  const handleFilterChange = (key, value) => { 
    setReady(false); 
    setSelectedStudent(null); 
    setStudentDetails(null); 
    setStudentViewMode("list"); 
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
 
  const handleRowClick = async (item) => { 
    setSelectedEvaluationId(item.evaluationId); 
    setCurrentPage(1); 
    setViewMode("details"); 
    setStatusEditMode(false); 
    setPendingStatus(null); 
    try { 
      setIsLoading(true); 
      const response = await apiClient.get( 
        `/api/v1/evaluations/${item.evaluationId}/students` 
      ); 
      const rows = getResponseItems(response.data).map(toStudentMarksRow); 
      setModalRows(rows); 
    } catch (error) { 
      setModalRows([]); 
      showToast(getApiErrorMessage(error), "error"); 
    } finally { 
      setIsLoading(false); 
    } 
  }; 
 
  const handleBackToEvaluations = () => { 
    setSelectedEvaluationId(null); 
    setModalRows([]); 
    setCurrentPage(1); 
    setViewMode("list"); 
    setStatusEditMode(false); 
    setPendingStatus(null); 
  }; 
 
  const handleStudentRowClick = async (student) => { 
    if (!student?.studentId) return; 
    try { 
      setIsLoading(true); 
      const response = await apiClient.get(`/api/v1/student-analysis/${student.studentId}/details`); 
      const details = response.data?.data ?? response.data; 
      setSelectedStudent(student); 
      setStudentDetails(details); 
      setStudentViewMode("details"); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally { 
      setIsLoading(false); 
    } 
  }; 
 
  const handleBackToStudentAnalysis = () => { 
    setSelectedStudent(null); 
    setStudentDetails(null); 
    setStudentViewMode("list"); 
  }; 
 
  const handleUpdateStatus = async (targetStatusNum) => { 
    if (!selectedEvaluation?.evaluationId) return; 
    if (selectedEvaluation.status === "UNKNOWN") { 
      showToast("This evaluation has an unknown status and cannot be updated.", "error"); 
      return; 
    } 
    if (statusEditMode) { 
      if (targetStatusNum === 2) { 
        setPendingStatus("VERIFIED"); 
        showToast("Status changed to Verify. Click Save Changes to confirm.", "success"); 
        return; 
      } 
      if (targetStatusNum === 3) { 
        setPendingStatus("APPROVED"); 
        showToast("Status changed to Approve. Click Save Changes to confirm.", "success"); 
        return; 
      } 
      if (targetStatusNum === 4) { 
        setPendingStatus("REJECTED"); 
        setRejectReason(""); 
        setShowRejectModal(true); 
        return; 
      } 
      return; 
    } 

    if (targetStatusNum === 4) { 
      setRejectReason(""); 
      setShowRejectModal(true); 
      return; 
    } 
 
    const action = { 
      2: "verify", 
      3: "approve", 
    }[targetStatusNum]; 
 
    if (!action) return; 
 
    try { 
      setIsLoading(true); 
      await apiClient.patch( 
        `/api/v1/evaluations/${selectedEvaluation.evaluationId}/${action}` 
      ); 
 
      const actionMessage = { 
        verify: "verified", 
        approve: "approved", 
      }[action]; 
 
      showToast(`Subject ${actionMessage} successfully`, "success"); 
      await handleFetchData(true); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally { 
      setIsLoading(false); 
    } 
  }; 
 
  const handleEditStatus = () => { 
    setStatusEditMode(true); 
    setPendingStatus(null); 
    showToast( 
      "Status editing enabled. Choose Verify, Approve, or Reject, then click Save Changes.", 
      "success" 
    ); 
  }; 
 
  const handleSaveStatusChanges = async () => { 
    if (!selectedEvaluation?.evaluationId) return; 
 
    if (!pendingStatus) { 
      showToast("Please select a target status (Verify, Approve, or Reject) before saving.", "error"); 
      return; 
    } 
 
    try { 
      setIsLoading(true);
      if (pendingStatus === "VERIFIED") { 
        await apiClient.patch(`/api/v1/evaluations/${selectedEvaluation.evaluationId}/verify`); 
      } 

      if (pendingStatus === "APPROVED") { 
        await apiClient.patch(`/api/v1/evaluations/${selectedEvaluation.evaluationId}/approve`); 
      } 
 
      if (pendingStatus === "REJECTED") { 
        await apiClient.post( 
          `/api/v1/evaluations/${selectedEvaluation.evaluationId}/reject`, 
          { reason: rejectReason.trim(), notifyFaculty: true } 
        ); 
      } 
 
      showToast(`Evaluation status changed to ${pendingStatus}`, "success"); 
      setStatusEditMode(false); 
      setPendingStatus(null); 
      setRejectReason(""); 
      await handleFetchData(true); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally {
      setIsLoading(false);
    }
  }; 
 
  const handleRejectEvaluation = async () => { 
    if (!selectedEvaluation?.evaluationId) return; 
 
    if (rejectReason.trim().length < 5) { 
      showToast("Please enter a rejection reason of at least 5 characters.", "error"); 
      return; 
    } 
 
    if (statusEditMode) { 
      setPendingStatus("REJECTED"); 
      setShowRejectModal(false); 
      showToast("Rejection selected. Click Save Changes to confirm.", "success"); 
      return; 
    } 
 
    try { 
      setIsLoading(true);
      await apiClient.post( 
        `/api/v1/evaluations/${selectedEvaluation.evaluationId}/reject`, 
        { reason: rejectReason.trim(), notifyFaculty: true } 
      ); 
 
      setShowRejectModal(false); 
      setRejectReason(""); 
      showToast("Evaluation rejected successfully", "success"); 
      await handleFetchData(true); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally {
      setIsLoading(false);
    }
  }; 

  /* API Integration for Global Action (/api/v1/evaluations/verify-all & /api/v1/evaluations/approve-all) */
  const submittedEvaluations = useMemo( 
    () => evaluations.filter((item) => item.evaluationId && (item.status === "SUBMITTED" || item.status === "DRAFT")), 
    [evaluations] 
  ); 
 
  const verifiedEvaluations = useMemo( 
    () => evaluations.filter((item) => item.evaluationId && item.status === "VERIFIED"), 
    [evaluations] 
  ); 

  const globalActionStage = useMemo(() => {
    if (submittedEvaluations.length > 0) return "VERIFY_ALL";
    if (verifiedEvaluations.length > 0) return "APPROVE_ALL";
    return "NONE";
  }, [submittedEvaluations.length, verifiedEvaluations.length]);
 
  const handleGlobalAction = async () => { 
    if (!isAllFiltersSelected || evaluations.length === 0) return; 
    if (globalActionStage === "NONE") return; 
 
    try { 
      setIsLoading(true); 
      const payload = { 
        boardId: Number(filters.board), 
        academicYearId: Number(filters.academicYear), 
        academicLevelId: Number(filters.academicLevel), 
        groupId: Number(filters.group), 
        sectionId: Number(filters.section), 
        examinationId: Number(filters.examination), 
      };

      if (globalActionStage === "VERIFY_ALL") {
        await apiClient.post("/api/v1/evaluations/verify-all", payload);
        showToast("All eligible subjects verified successfully", "success"); 
      } else if (globalActionStage === "APPROVE_ALL") {
        await apiClient.post("/api/v1/evaluations/approve-all", payload);
        showToast("All eligible subjects approved successfully", "success"); 
      }

      await handleFetchData(); 
    } catch (error) { 
      showToast(getApiErrorMessage(error), "error"); 
    } finally { 
      setIsLoading(false); 
    } 
  }; 
 
  const filteredEvaluations = useMemo(() => { 
    return evaluations.filter((item) => { 
      if (!evaluationSearchTerm.trim()) return true; 
      const term = evaluationSearchTerm.toLowerCase(); 
      const statusStr = getCurrentStatus(item.status); 
      return ( 
        (item.subjectName || "").toLowerCase().includes(term) || 
        (item.facultyName || "").toLowerCase().includes(term) || 
        (item.subjectCode || "").toLowerCase().includes(term) || 
        (item.facultyCode || "").toLowerCase().includes(term) || 
        String(statusStr).toLowerCase().includes(term) 
      ); 
    }); 
  }, [evaluations, evaluationSearchTerm, getCurrentStatus]); 
 
  const studentSubjectMarksList = useMemo(() => { 
    return studentAnalysis; 
  }, [studentAnalysis]); 
 
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
      title="Marks Evaluation" 
      subtitle="Review, verify and approve faculty submitted evaluations." 
      breadcrumb={["Examinations"]} 
    > 
      <div className="cms-marks-entry cms-anim-up"> 
        {isLoading && ( 
          <div className="cms-loading-overlay" role="status" aria-label="Loading"> 
            <div className="cms-loading-spinner" /> 
          </div> 
        )} 
 
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
              onClick={() => handleFetchData(false)} 
            > 
              Check Evaluation Data 
            </button> 
          </div> 
 
          <div className="cms-filter-grid"> 
            <SelectFilter 
              label="Board" 
              value={filters.board} 
              options={boardOptions} 
              onChange={(v) => handleFilterChange("board", v)} 
            /> 
            <SelectFilter 
              label="Academic Year" 
              value={filters.academicYear} 
              disabled={!filters.board} 
              options={academicYearOptions} 
              onChange={(v) => handleFilterChange("academicYear", v)} 
            /> 
            <SelectFilter 
              label="Academic Level" 
              value={filters.academicLevel} 
              disabled={!filters.board || !filters.academicYear} 
              options={academicLevelOptions} 
              onChange={(v) => handleFilterChange("academicLevel", v)} 
            /> 
            <SelectFilter 
              label="Group" 
              value={filters.group} 
              disabled={!filters.academicLevel} 
              options={groupOptions} 
              onChange={(v) => handleFilterChange("group", v)} 
            /> 
            <SelectFilter 
              label="Section" 
              value={filters.section} 
              disabled={!filters.group} 
              options={sectionOptions} 
              onChange={(v) => handleFilterChange("section", v)} 
            /> 
            <SelectFilter 
              label="Examination" 
              value={filters.examination} 
              disabled={!filters.section} 
              options={examinationOptions} 
              onChange={(v) => handleFilterChange("examination", v)} 
            /> 
          </div> 
        </div> 
 
        {/* Content Section */} 
        {ready ? ( 
          viewMode === "list" ? ( 
            activeTab === "studentAnalysis" && studentViewMode === "details" && studentDetails ? ( 
              <StudentDetailsView 
                selectedStudent={selectedStudent} 
                studentDetails={studentDetails} 
                filters={displayFilters} 
                onBack={handleBackToStudentAnalysis} 
              /> 
            ) : ( 
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
                      <button 
                        className={`cms-btn ${globalActionStage === "VERIFY_ALL" ? "cms-btn-info" : "cms-btn-success"}`} 
                        disabled={globalActionStage === "NONE"} 
                        onClick={() => setShowGlobalActionModal(true)} 
                      > 
                        {globalActionStage === "VERIFY_ALL" ? "Verify All" : "Approve All"} 
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
                          <th className="cms-text-center">AVERAGE MARKS</th> 
                          <th className="cms-text-center">STATUS</th> 
                        </tr> 
                      </thead> 
                      <tbody> 
                        {filteredEvaluations.length > 0 ? ( 
                          filteredEvaluations.map((item) => { 
                            const statusStr = getCurrentStatus(item.status); 
                            return ( 
                              <tr 
                                key={item.evaluationId} 
                                className="cms-clickable-row" 
                                onClick={() => handleRowClick(item)} 
                              > 
                                <td className="cms-font-semibold cms-text-left cms-single-line"> 
                                  {item.subjectName} - {item.subjectCode} 
                                </td> 
 
                                <td className="cms-text-muted cms-text-left cms-single-line"> 
                                  {item.facultyName} - {item.facultyCode} 
                                </td> 
 
                                <td className="cms-font-semibold cms-text-center"> 
                                  {item.averageMarks} / {item.totalMarks} 
                                </td> 
 
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
                            {evaluationSubjects.map((subject) => ( 
                              <th key={subject.subjectId} className="cms-text-center"> 
                                {String(subject.subjectName || "—").toUpperCase()} 
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
                                <tr 
                                  key={stu.studentId || index} 
                                  className="cms-clickable-row" 
                                  onClick={() => handleStudentRowClick(stu)} 
                                  onKeyDown={(event) => { 
                                    if (event.key === "Enter" || event.key === " ") { 
                                      event.preventDefault(); 
                                      handleStudentRowClick(stu); 
                                    } 
                                  }} 
                                  role="button" 
                                  tabIndex={0} 
                                  aria-label={`View detailed report for ${stu.studentName}`} 
                                > 
                                  <td className="cms-font-semibold cms-text-left"> 
                                    {stu.rollNo || "—"} 
                                  </td> 
                                  <td className="cms-text-left">{stu.studentName}</td> 
 
                                  {evaluationSubjects.map((subject, subjectIndex) => ( 
                                    <td key={subject.subjectId} className="cms-text-center"> 
                                      {marksObj[evaluations[subjectIndex]?.subjectId] ?? "—"} 
                                    </td> 
                                  ))} 
 
                                  <td className="cms-font-semibold cms-text-center"> 
                                    {stu.totalMarks} / {stu.maxTotal} 
                                  </td> 
 
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
                              <td colSpan={evaluationSubjects.length + 4} className="cms-empty-td"> 
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
            ) 
          ) : selectedEvaluation ? ( 
            /* Subject Detail View (Image 2 Fluid Design) */ 
            <EvaluationDetailsView 
              selectedEvaluation={selectedEvaluation} 
              currentStatus={getCurrentStatus(selectedEvaluation.status)} 
              filters={displayFilters} 
              rows={paginatedRows} 
              totalPages={totalPages} 
              currentPage={safeCurrentPage} 
              onBack={handleBackToEvaluations} 
              onUpdateStatus={handleUpdateStatus} 
              statusEditMode={statusEditMode} 
              pendingStatus={pendingStatus} 
              onEdit={handleEditStatus} 
              onSaveStatus={handleSaveStatusChanges} 
              onPreviousPage={() => 
                setCurrentPage((page) => Math.max(1, page - 1)) 
              } 
              onNextPage={() => 
                setCurrentPage((page) => 
                  Math.min(totalPages, page + 1) 
                ) 
              } 
            /> 
          ) : null 
        ) : ( 
          <div className="cms-card cms-empty-table"> 
            <p>Select all 6 evaluation filters and click <strong>Check Evaluation Data</strong> to view evaluation status &amp; student marks.</p> 
          </div> 
        )} 
 
        {/* Rejection Modal */} 
        {showRejectModal && ( 
          <div className="cms-overlay" role="presentation"> 
            <div className="cms-modal sm" role="dialog" aria-modal="true" aria-labelledby="reject-evaluation-title"> 
              <div className="cms-modal-head"> 
                <h3 id="reject-evaluation-title">Reject Evaluation</h3> 
              </div> 
              <div className="cms-modal-body"> 
                <div className="cms-field-group"> 
                  <label className="cms-field-label" htmlFor="reject-reason">Reason</label> 
                  <textarea 
                    id="reject-reason" 
                    className="cms-marks-textarea" 
                    value={rejectReason} 
                    onChange={(event) => setRejectReason(event.target.value)} 
                    placeholder="Enter rejection reason (at least 5 characters)" 
                    rows={4} 
                  /> 
                </div> 
              </div> 
              <div className="cms-modal-foot"> 
                <button className="cms-btn" onClick={() => { 
                  setShowRejectModal(false); 
                  setRejectReason(""); 
                  if (statusEditMode) { 
                    setPendingStatus(null); 
                  } 
                }}> 
                  Cancel 
                </button> 
                <button className="cms-btn cms-btn-danger" disabled={rejectReason.trim().length < 5} onClick={handleRejectEvaluation}> 
                  Confirm Reject 
                </button> 
              </div> 
            </div> 
          </div> 
        )} 
 
        {/* Global Action Confirmation Modal */} 
        {showGlobalActionModal && ( 
          <div className="cms-overlay" role="presentation"> 
            <div className="cms-modal sm" role="dialog" aria-modal="true" aria-labelledby="global-action-title"> 
              <div className="cms-modal-head"> 
                <h3 id="global-action-title"> 
                  {globalActionStage === "VERIFY_ALL" ? "Verify All Evaluations" : "Approve All Evaluations"} 
                </h3> 
              </div> 
              <div className="cms-modal-body"> 
                {globalActionStage === "VERIFY_ALL" 
                  ? `Verify All will apply to ${submittedEvaluations.length} SUBMITTED/DRAFT evaluations in this selection context.` 
                  : `Approve All will apply to ${verifiedEvaluations.length} VERIFIED evaluations in this selection context.`} 
              </div> 
              <div className="cms-modal-foot"> 
                <button className="cms-btn" onClick={() => setShowGlobalActionModal(false)}>Cancel</button> 
                <button 
                  className={`cms-btn ${globalActionStage === "VERIFY_ALL" ? "cms-btn-info" : "cms-btn-success"}`} 
                  onClick={() => { 
                    setShowGlobalActionModal(false); 
                    handleGlobalAction(); 
                  }} 
                > 
                  Confirm {globalActionStage === "VERIFY_ALL" ? "Verify All" : "Approve All"} 
                </button> 
              </div> 
            </div> 
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
   EVALUATION DETAILS VIEW (Image 2 Layout & Dedicated Pagination)
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
  statusEditMode, 
  pendingStatus, 
  onEdit, 
  onSaveStatus, 
  onPreviousPage, 
  onNextPage 
}) { 
  const hasPractical = isPracticalSubject(selectedEvaluation?.subjectName) 
    || rows.some((row) => row.practicalMarks !== undefined || (row.practical !== undefined && row.practical !== "—")); 
 
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
 
      {/* Dynamic Fluid Table (Image 2 Standard View) */} 
      <div className="cms-table-container cms-details-table-wrap"> 
        <table className="cms-table cms-details-table"> 
          <thead> 
            <tr> 
              <th className="cms-text-left">ROLL NO</th> 
              <th className="cms-text-left">STUDENT NAME</th> 
              <th className="cms-text-center">INTERNAL</th> 
              {hasPractical && <th className="cms-text-center">PRACTICAL</th>} 
              <th className="cms-text-center">THEORY</th> 
              <th className="cms-text-center">TOTAL MARKS</th> 
              <th className="cms-text-left">REMARKS</th> 
              <th className="cms-text-center">ABSENT</th> 
            </tr> 
          </thead> 
          <tbody> 
            {rows.length > 0 ? ( 
              rows.map((row, pageIndex) => { 
                return ( 
                  <tr key={row.studentId || pageIndex}> 
                    <td className="cms-font-semibold cms-text-left">{row.rollNo}</td> 
                    <td className="cms-text-left">{row.studentName}</td> 
                    <td className="cms-text-center">{row.internal}</td> 
                    {hasPractical && ( 
                      <td className="cms-text-center">{row.practical}</td> 
                    )} 
                    <td className="cms-text-center">{row.theory}</td> 
                    <td className="cms-font-semibold cms-text-center">{row.totalMarks}</td> 
                    <td className="cms-text-left">{row.remarks}</td> 
                    <td className="cms-text-center">{row.isAbsent ? "Yes" : "No"}</td> 
                  </tr> 
                ); 
              }) 
            ) : ( 
              <tr> 
                <td colSpan={hasPractical ? 8 : 7} className="cms-empty-td">No student mark details available.</td> 
              </tr> 
            )} 
          </tbody> 
        </table> 
      </div> 

      {/* Dedicated Subject Breakdown Pagination Bar */} 
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
 
      {/* Action Buttons & Read-Only Status Pills */} 
      <div className="cms-modal-actions"> 
        {!statusEditMode && (currentStatus === "SUBMITTED" || currentStatus === "DRAFT") && ( 
          <> 
            <button 
              className="cms-btn cms-btn-info" 
              onClick={() => onUpdateStatus(2)} 
            > 
              <IconCheck /> 
              Verify 
            </button> 
 
            <button 
              className="cms-btn cms-btn-danger" 
              onClick={() => onUpdateStatus(4)} 
            > 
              <IconXCircle /> 
              Reject 
            </button> 

            <button 
              className="cms-btn" 
              onClick={onEdit} 
            > 
              Edit 
            </button> 
          </> 
        )} 
 
        {!statusEditMode && currentStatus === "VERIFIED" && ( 
          <> 
            <button 
              className="cms-btn cms-btn-success" 
              onClick={() => onUpdateStatus(3)} 
            > 
              <IconCheck /> 
              Approve 
            </button> 
 
            <button 
              className="cms-btn cms-btn-danger" 
              onClick={() => onUpdateStatus(4)} 
            > 
              <IconXCircle /> 
              Reject 
            </button> 

            <button 
              className="cms-btn" 
              onClick={onEdit} 
            > 
              Edit 
            </button> 
          </> 
        )} 
 
        {!statusEditMode && currentStatus === "APPROVED" && ( 
          <> 
            <span className="cms-status-pill cms-status-approved"> 
              <IconCheck /> 
              Approved 
            </span> 
 
            <button 
              className="cms-btn" 
              onClick={onEdit} 
            > 
              Edit 
            </button> 
          </> 
        )} 
 
        {!statusEditMode && currentStatus === "REJECTED" && ( 
          <> 
            <span className="cms-status-pill cms-status-rejected"> 
              <IconXCircle /> 
              Rejected 
            </span> 
 
            <button 
              className="cms-btn" 
              onClick={onEdit} 
            > 
              Edit 
            </button> 
          </> 
        )} 
 
        {statusEditMode && ( 
          <> 
            <button 
              className={`cms-btn cms-btn-info ${pendingStatus === "VERIFIED" ? "cms-btn-selected" : ""}`} 
              onClick={() => onUpdateStatus(2)} 
            > 
              <IconCheck /> 
              Verify 
            </button> 

            <button 
              className={`cms-btn cms-btn-success ${pendingStatus === "APPROVED" ? "cms-btn-selected" : ""}`} 
              onClick={() => onUpdateStatus(3)} 
            > 
              <IconCheck /> 
              Approve 
            </button> 
 
            <button 
              className={`cms-btn cms-btn-danger ${pendingStatus === "REJECTED" ? "cms-btn-selected" : ""}`} 
              onClick={() => onUpdateStatus(4)} 
            > 
              <IconXCircle /> 
              Reject 
            </button> 
 
            <button 
              className="cms-btn cms-btn-primary" 
              disabled={!pendingStatus} 
              onClick={onSaveStatus} 
            > 
              Save Changes 
            </button> 
          </> 
        )} 
      </div> 
    </div> 
  ); 
} 
 
function StudentDetailsView({ selectedStudent, studentDetails, filters, onBack }) { 
  const subjects = Array.isArray(studentDetails?.subjects) ? studentDetails.subjects : []; 
  const detail = { 
    rollNo: studentDetails?.rollNo ?? selectedStudent?.rollNo ?? "—", 
    studentName: studentDetails?.studentName ?? selectedStudent?.studentName ?? "—", 
    totalMarks: studentDetails?.totalMarks ?? selectedStudent?.totalMarks ?? "—", 
    maxMarks: studentDetails?.maxMarks ?? studentDetails?.maximumMarks ?? selectedStudent?.maxTotal ?? "—", 
    percentage: studentDetails?.percentage ?? "—", 
    grade: studentDetails?.grade ?? selectedStudent?.grade ?? "—", 
  }; 
 
  return ( 
    <div className="cms-card cms-main-card cms-student-details"> 
      <div className="cms-details-header"> 
        <div> 
          <button className="cms-back-btn" onClick={onBack}>← Back To Student Analysis</button> 
          <h2 className="cms-details-title">Student Detailed Report</h2> 
          <span className="cms-details-subtitle">Subject-wise marks and academic performance</span> 
        </div> 
      </div> 
 
      <div className="cms-details-section"> 
        <h3 className="cms-details-section-title">Student Information</h3> 
        <div className="cms-detail-grid cms-student-info-grid"> 
          <DetailCard label="Roll Number" value={detail.rollNo} /> 
          <DetailCard label="Student Name" value={detail.studentName} /> 
          <DetailCard label="Group" value={filters.group} /> 
          <DetailCard label="Section" value={filters.section} /> 
          <DetailCard label="Examination" value={filters.examination} /> 
          <DetailCard label="Grade" value={detail.grade} /> 
          <DetailCard label="Percentage" value={detail.percentage === "—" ? "—" : `${detail.percentage}%`} /> 
        </div> 
      </div> 
 
      <div className="cms-table-container cms-details-table-wrap"> 
        <table className="cms-table cms-details-table"> 
          <thead> 
            <tr> 
              <th className="cms-text-left">SUBJECT</th> 
              <th className="cms-text-center">INTERNAL</th> 
              <th className="cms-text-center">PRACTICAL</th> 
              <th className="cms-text-center">THEORY</th> 
              <th className="cms-text-center">TOTAL</th> 
            </tr> 
          </thead> 
          <tbody> 
            {subjects.length ? subjects.map((subject, index) => ( 
              <tr key={subject.subjectId ?? index}> 
                <td className="cms-font-semibold cms-text-left">{subject.subjectName ?? "—"}</td> 
                <td className="cms-text-center">{subject.internal ?? "—"}</td> 
                <td className="cms-text-center">{subject.practical ?? "—"}</td> 
                <td className="cms-text-center">{subject.theory ?? "—"}</td> 
                <td className="cms-font-semibold cms-text-center">{subject.total ?? subject.totalMarks ?? "—"}</td> 
              </tr> 
            )) : ( 
              <tr><td colSpan={5} className="cms-empty-td">No subject mark details available.</td></tr> 
            )} 
          </tbody> 
        </table> ,
      </div> 
 
      <div className="cms-details-section"> 
        <h3 className="cms-details-section-title">Performance Summary</h3> 
        <div className="cms-detail-grid cms-summary-grid"> 
          <DetailCard label="Total Marks" value={detail.totalMarks} /> 
          <DetailCard label="Maximum Marks" value={detail.maxMarks} /> 
          <DetailCard label="Percentage" value={detail.percentage === "—" ? "—" : `${detail.percentage}%`} /> 
          <DetailCard label="Grade" value={detail.grade} /> 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
function DetailCard({ label, value }) { 
  return ( 
    <div className="cms-detail-card"> 
      <span className="cms-detail-label">{label}</span> 
      <span className="cms-detail-value">{value}</span> 
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