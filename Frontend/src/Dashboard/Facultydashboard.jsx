import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, User, Calendar, BookOpen, UserCheck, MessageSquareQuote,
  GraduationCap, ClipboardCheck, Wallet, FileText, CalendarOff, Receipt,
  Bell, Moon, Sun, Search, Menu, ChevronRight, ChevronDown, Download, Printer,
  Eye, CheckCircle, AlertCircle, Plus, Send, Paperclip, LogOut, Building2,
  Users, Check, X, ShieldAlert, Award, Clock, DollarSign, TrendingUp, Sparkles,
  HelpCircle, ArrowLeft, Layers, Briefcase, FileSpreadsheet, RefreshCw,
  Upload, Trash2, Edit3, ShieldCheck, AlertTriangle, FileCheck, Phone, Mail,
  MapPin, CreditCard, Lock, Info, Save, File, ArrowRight
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getLeaveRequests, submitLeaveRequest } from "@/features/leave/services/leaveStore.js";
import "./facultydashboard.css";

// ==========================================================================
// MOCK DATA STRUCTURES & PROFILE HELPERS — PIRNAV FACULTY PORTAL
// ==========================================================================

const mockFaculty = {
  id: 1,
  employeeId: "PJCTCH0027",
  firstName: "Ravi",
  lastName: "Kumar",
  fullName: "Ravi Kumar",
  role: "Faculty",
  staffType: "Teaching",
  department: "Mathematics",
  designation: "Junior Lecturer",
  board: "BIEAP",
  academicYear: "2025-2026",
  dateOfJoining: "2024-06-10",
  gender: "Male",
  dob: "1990-08-14",
  bloodGroup: "O+",
  aadhaarMasked: "XXXX-XXXX-4829",
  panMasked: "ABCPS****F",
  mobile: "9876543210",
  altMobile: "9876543211",
  email: "Faculty@CMS.com",
  personalEmail: "ravikumar.maths@gmail.com",
  status: "Active",
  profileCompletion: 92,
  address: "Plot 42, Green Avenue, Jubilee Hills, Hyderabad, Telangana - 500033",
  bankName: "State Bank of India",
  accountHolder: "Ravi Kumar",
  accountMasked: "XXXXXX3482",
  ifsc: "SBIN0001234",
  branch: "Main Campus Branch",
  uan: "100982341234",
  pfNumber: "AP/HYD/0098234/000/00027",
};

// Masking helpers
const maskAadhaar = (val) => {
  if (!val) return "—";
  const clean = String(val).replace(/\D/g, "");
  if (clean.length < 4) return clean;
  return `XXXX-XXXX-${clean.slice(-4)}`;
};

const maskPan = (val) => {
  if (!val) return "—";
  const clean = String(val).trim().toUpperCase();
  if (clean.length < 5) return clean;
  return `${clean.slice(0, 5)}****${clean.slice(-1)}`;
};

const maskAccount = (val) => {
  if (!val) return "—";
  const clean = String(val).trim();
  if (clean.length < 4) return clean;
  return `XXXXXX${clean.slice(-4)}`;
};

// Dynamic helper to resolve the currently logged-in faculty user
const getCurrentFacultyUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user) {
        const submitted = JSON.parse(localStorage.getItem("pjc_submitted_faculty_list") || "[]");
        const storedRecords = JSON.parse(sessionStorage.getItem("pjc-mock-staff-records") || "[]");
        const empId = user.employeeId || user.id || "";
        const email = (user.email || "").toLowerCase().trim();
        const found = [...submitted, ...storedRecords].find(r => 
          (empId && (String(r.id) === String(empId) || String(r.employeeId).toLowerCase() === String(empId).toLowerCase())) ||
          (email && String(r.email || "").toLowerCase() === email)
        );
        return { ...mockFaculty, ...user, ...(found || {}) };
      }
    }
  } catch (e) {
    console.warn("Could not load user from localStorage", e);
  }
  return mockFaculty;
};

// Calculate profile completion percentage accurately across all sections
const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;
  let score = 0;
  let total = 0;

  // Personal (20 pts)
  total += 20;
  let personalScore = 0;
  if (profile.personal?.guardianName?.trim()) personalScore += 3;
  if (profile.personal?.gender) personalScore += 3;
  if (profile.personal?.dob) personalScore += 3;
  if (profile.personal?.bloodGroup) personalScore += 2;
  if (profile.personal?.maritalStatus) personalScore += 2;
  if (profile.personal?.aadhaar && profile.personal?.aadhaar.length >= 12) personalScore += 4;
  if (profile.personal?.pan && profile.personal?.pan.length >= 10) personalScore += 3;
  score += personalScore;

  // Contact (15 pts)
  total += 15;
  let contactScore = 0;
  if (profile.contact?.currentAddress?.trim()) contactScore += 4;
  if (profile.contact?.city?.trim()) contactScore += 3;
  if (profile.contact?.state?.trim()) contactScore += 3;
  if (profile.contact?.pincode?.trim()?.length >= 6) contactScore += 3;
  if (profile.contact?.personalEmail?.trim()) contactScore += 2;
  score += contactScore;

  // Professional (10 pts)
  total += 10;
  let profScore = 0;
  if (profile.professional?.specialization?.trim()) profScore += 5;
  if (profile.professional?.researchInterests?.trim() || profile.professional?.memberships?.trim()) profScore += 5;
  score += profScore;

  // Education (20 pts)
  total += 20;
  if (Array.isArray(profile.education) && profile.education.length > 0) {
    const hasValid = profile.education.some(e => e.degree && e.institution && e.passingYear);
    if (hasValid) score += 20;
    else score += 10;
  }

  // Experience (10 pts)
  total += 10;
  if (profile.experience?.isFresher) {
    score += 10;
  } else if (Array.isArray(profile.experience?.records) && profile.experience.records.length > 0) {
    score += 10;
  }

  // Bank (15 pts)
  total += 15;
  let bankScore = 0;
  if (profile.bank?.bankName?.trim()) bankScore += 3;
  if (profile.bank?.accountHolder?.trim()) bankScore += 3;
  if (profile.bank?.accountNumber?.trim()) bankScore += 3;
  if (profile.bank?.ifsc?.trim()) bankScore += 3;
  if (profile.bank?.branch?.trim()) bankScore += 3;
  score += bankScore;

  // Emergency (5 pts)
  total += 5;
  if (profile.emergency?.name?.trim() && profile.emergency?.mobile?.trim()) {
    score += 5;
  }

  // Documents (5 pts)
  total += 5;
  let docCount = 0;
  if (profile.documents?.photo?.name) docCount++;
  if (profile.documents?.signature?.name) docCount++;
  if (profile.documents?.aadhaar?.name) docCount++;
  if (profile.documents?.pan?.name) docCount++;
  if (docCount >= 2) score += 5;
  else if (docCount >= 1) score += 2;

  const pct = Math.round((score / total) * 100);
  return Math.min(100, Math.max(0, pct));
};

const getInitialProfileState = (facultyUser) => {
  const empId = facultyUser?.employeeId || facultyUser?.id || "PJCTCH0027";
  try {
    const saved = localStorage.getItem("pjc_faculty_profile_" + empId);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) return parsed;
    }
  } catch (e) {}

  return {
    baseline: {
      employeeId: facultyUser?.employeeId || "PJCTCH0027",
      fullName: facultyUser?.fullName || facultyUser?.name || "Ravi Kumar",
      staffType: facultyUser?.staffType || "Teaching Staff",
      department: facultyUser?.department || "Mathematics",
      designation: facultyUser?.designation || "Junior Lecturer",
      board: facultyUser?.board || "BIEAP",
      academicYear: facultyUser?.academicYear || "2025-2026",
      dateOfJoining: facultyUser?.dateOfJoining || facultyUser?.joiningDate || "2024-06-10",
      employmentType: facultyUser?.employmentType || "Permanent Full-Time",
      primaryEmail: facultyUser?.email || "Faculty@CMS.com",
      primaryMobile: facultyUser?.mobile || facultyUser?.phone || "9876543210",
      allocatedSubjects: facultyUser?.allocatedSubjects || ["Mathematics I-A", "Mathematics II-A"],
      status: facultyUser?.status || "Active",
      profileStatus: facultyUser?.profileStatus || "Draft",
      reviewStatus: facultyUser?.reviewStatus || "Pending",
      correctionRemarks: facultyUser?.correctionRemarks || "",
    },
    personal: {
      guardianName: facultyUser?.guardianName || facultyUser?.fatherName || "S. Narayana Murthy",
      gender: facultyUser?.gender || "Male",
      dob: facultyUser?.dob || facultyUser?.dateOfBirth || "1990-08-14",
      bloodGroup: facultyUser?.bloodGroup || "O+",
      maritalStatus: facultyUser?.maritalStatus || "Married",
      nationality: facultyUser?.nationality || "Indian",
      aadhaar: facultyUser?.aadhaar || facultyUser?.aadhaarNumber || "482910394829",
      pan: facultyUser?.pan || facultyUser?.panNumber || "ABCPS1234F",
      photoUrl: facultyUser?.photoUrl || facultyUser?.profilePhoto || null,
    },
    contact: {
      primaryMobile: facultyUser?.mobile || "9876543210",
      primaryEmail: facultyUser?.email || "Faculty@CMS.com",
      altMobile: facultyUser?.altMobile || "9876543211",
      personalEmail: facultyUser?.personalEmail || "ravikumar.maths@gmail.com",
      currentAddress: facultyUser?.currentAddress || facultyUser?.address || "Flat 302, Sri Sai Nilayam, Road No. 12, Banjara Hills",
      city: facultyUser?.city || "Hyderabad",
      district: facultyUser?.district || "Hyderabad",
      state: facultyUser?.state || "Telangana",
      pincode: facultyUser?.pincode || "500034",
      country: facultyUser?.country || "India",
      sameAsCurrent: facultyUser?.sameAsCurrent ?? true,
      permAddress: facultyUser?.permAddress || "Flat 302, Sri Sai Nilayam, Road No. 12, Banjara Hills",
      permCity: facultyUser?.permCity || "Hyderabad",
      permDistrict: facultyUser?.permDistrict || "Hyderabad",
      permState: facultyUser?.permState || "Telangana",
      permPincode: facultyUser?.permPincode || "500034",
      permCountry: facultyUser?.permCountry || "India",
    },
    professional: {
      specialization: facultyUser?.specialization || "Pure & Applied Mathematics, Real Analysis, Calculus",
      primaryTeachingDomain: facultyUser?.primaryTeachingDomain || "Senior Secondary & Intermediate Mathematics",
      researchInterests: facultyUser?.researchInterests || "Differential Equations, Numerical Methods & Pedagogy",
      memberships: facultyUser?.memberships || "AMTI (Association of Mathematics Teachers of India), IMS Life Member",
      languages: facultyUser?.languages || ["English", "Telugu", "Hindi"],
      maxWorkload: facultyUser?.maxWorkload || "20 Hours / Week",
    },
    education: facultyUser?.education || [
      {
        id: "edu-1",
        level: "Post Graduation",
        degree: "M.Sc Mathematics",
        institution: "University College of Science",
        university: "Osmania University",
        specialization: "Pure & Applied Mathematics",
        passingYear: "2018",
        percentage: "88.5% (8.85 CGPA)",
        studyMode: "Full-Time",
        docName: "MSc_Mathematics_Degree.pdf",
      },
      {
        id: "edu-2",
        level: "B.Ed",
        degree: "Bachelor of Education (B.Ed)",
        institution: "Kakatiya University College of Education",
        university: "Kakatiya University",
        specialization: "Mathematics Pedagogy & Physical Sciences",
        passingYear: "2019",
        percentage: "82.4%",
        studyMode: "Full-Time",
        docName: "BEd_Certificate.pdf",
      },
      {
        id: "edu-3",
        level: "NET / SET",
        degree: "CSIR-UGC NET Qualified (JRF & LS)",
        institution: "National Testing Agency (NTA)",
        university: "CSIR-HRDG",
        specialization: "Mathematical Sciences",
        passingYear: "2020",
        percentage: "AIR 142 (99.2 Percentile)",
        studyMode: "Full-Time",
        docName: "CSIR_NET_Scorecard.pdf",
      },
    ],
    experience: {
      isFresher: facultyUser?.experience?.isFresher || false,
      totalExperienceYears: facultyUser?.experience?.totalExperienceYears || "3.5 Years",
      records: facultyUser?.experience?.records || [
        {
          id: "exp-1",
          institution: "Sri Chaitanya Junior College",
          designation: "Lecturer in Mathematics",
          department: "Intermediate Sciences (MPC)",
          fromDate: "2021-07",
          toDate: "2024-05",
          isCurrent: false,
          responsibilities: "Curriculum delivery for senior intermediate calculus, algebra, and coordinate geometry. Mentored students for state board exams.",
          reasonForLeaving: "Joined PIRNAV College for academic growth.",
          docName: "Relieving_Experience_Letter_SCJC.pdf",
        },
      ],
    },
    bank: {
      bankName: facultyUser?.bankName || "State Bank of India",
      accountHolder: facultyUser?.accountHolder || facultyUser?.fullName || "Ravi Kumar",
      accountNumber: facultyUser?.accountNumber || "30982341298",
      confirmAccountNumber: facultyUser?.confirmAccountNumber || facultyUser?.accountNumber || "30982341298",
      ifsc: facultyUser?.ifsc || "SBIN0001234",
      branch: facultyUser?.branch || "Jubilee Hills Main Campus Branch",
      accountType: facultyUser?.accountType || "Savings",
      pfNumber: facultyUser?.pfNumber || "AP/HYD/0098234/000/00027",
      esiNumber: facultyUser?.esiNumber || "31000982340001",
      uanNumber: facultyUser?.uanNumber || "100982341234",
      cancelledChequeDoc: "SBI_Cancelled_Cheque.pdf",
    },
    emergency: {
      name: facultyUser?.emergency?.name || "Mrs. Sumathi Kumar",
      relationship: facultyUser?.emergency?.relationship || "Spouse",
      mobile: facultyUser?.emergency?.mobile || "9876543299",
      altMobile: facultyUser?.emergency?.altMobile || "9876543298",
      address: facultyUser?.emergency?.address || "Flat 302, Sri Sai Nilayam, Road No. 12, Banjara Hills, Hyderabad",
    },
    documents: facultyUser?.documents || {
      photo: { name: "Passport_Photo_RaviKumar.jpg", size: "245 KB", uploadedAt: "2024-06-11", status: "Verified" },
      signature: { name: "Signature_RaviKumar.png", size: "110 KB", uploadedAt: "2024-06-11", status: "Verified" },
      aadhaar: { name: "Aadhaar_Card_Verified.pdf", size: "890 KB", uploadedAt: "2024-06-11", status: "Verified" },
      pan: { name: "PAN_Card_Copy.pdf", size: "640 KB", uploadedAt: "2024-06-11", status: "Verified" },
      degreeCertificate: { name: "MSc_Degree_Certificate.pdf", size: "1.4 MB", uploadedAt: "2024-06-11", status: "Verified" },
      experienceLetter: { name: "Experience_Relieving_Letter.pdf", size: "1.1 MB", uploadedAt: "2024-06-11", status: "Verified" },
      resume: { name: "Ravi_Kumar_Curriculum_Vitae.pdf", size: "480 KB", uploadedAt: "2024-06-11", status: "Verified" },
      bankProof: { name: "Bank_Passbook_Cheque.pdf", size: "750 KB", uploadedAt: "2024-06-11", status: "Verified" },
    },
    isDeclared: facultyUser?.isDeclared ?? true,
    declaredAt: facultyUser?.declaredAt || "2024-06-11 11:30 AM",
    submittedAt: facultyUser?.submittedAt || "2024-06-11 11:30 AM",
  };
};


const mockSalaryData = {
  month: "May 2025",
  basicPay: 52000,
  hra: 10400,
  da: 5200,
  academicAllowance: 3000,
  transportAllowance: 1600,
  otherAllowances: 1000,
  grossSalary: 73200,
  pf: 6240,
  professionalTax: 200,
  tds: 3800,
  insurance: 500,
  lop: 2000,
  otherDeductions: 1000,
  totalDeductions: 13740,
  netSalary: 58460,
  lastPaymentDate: "30 Apr 2025",
  nextSalaryDate: "31 May 2025",
};

const mockPayslips = [
  { id: "ps-05", month: "May 2025", period: "01 May 2025 - 31 May 2025", grossSalary: 73200, totalDeductions: 13740, netSalary: 58460, paymentDate: "31 May 2025", status: "Upcoming", txnRef: "TXN250531901" },
  { id: "ps-04", month: "Apr 2025", period: "01 Apr 2025 - 30 Apr 2025", grossSalary: 73200, totalDeductions: 13740, netSalary: 58460, paymentDate: "30 Apr 2025", status: "Paid", txnRef: "TXN250430892" },
  { id: "ps-03", month: "Mar 2025", period: "01 Mar 2025 - 31 Mar 2025", grossSalary: 73200, totalDeductions: 12940, netSalary: 60260, paymentDate: "29 Mar 2025", status: "Paid", txnRef: "TXN250329712" },
  { id: "ps-02", month: "Feb 2025", period: "01 Feb 2025 - 28 Feb 2025", grossSalary: 73200, totalDeductions: 12740, netSalary: 60460, paymentDate: "28 Feb 2025", status: "Paid", txnRef: "TXN250228604" },
  { id: "ps-01", month: "Jan 2025", period: "01 Jan 2025 - 31 Jan 2025", grossSalary: 73200, totalDeductions: 12740, netSalary: 60460, paymentDate: "31 Jan 2025", status: "Paid", txnRef: "TXN250131490" },
];

const mockTimetableSlots = [
  { time: "09:00 - 10:00 AM", mon: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, tue: null, wed: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, thu: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, fri: null, sat: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" } },
  { time: "10:00 - 11:00 AM", mon: null, tue: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, wed: null, thu: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, fri: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, sat: null },
  { time: "11:15 - 12:15 PM", mon: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, tue: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, wed: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, thu: null, fri: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, sat: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" } },
  { time: "12:15 - 01:15 PM", mon: { subject: "Mathematics Lab", class: "MPC 1st Year", sec: "Section A", room: "Lab 2" }, tue: null, wed: null, thu: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, fri: null, sat: null },
  { time: "02:00 - 03:00 PM", mon: null, tue: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, wed: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, thu: null, fri: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, sat: null },
  { time: "03:00 - 04:00 PM", mon: { subject: "Tutorial", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, tue: null, wed: null, thu: null, fri: null, sat: null },
];

const mockClassesList = [
  { id: "c1", className: "MPC 1st Year", group: "MPC", level: "Senior Secondary", sec: "Section A", subject: "Mathematics I-A", totalStudents: 45, todayAttendance: "91%", nextClass: "Today 10:00 AM" },
  { id: "c2", className: "MPC 2nd Year", group: "MPC", level: "Senior Secondary", sec: "Section B", subject: "Mathematics II-A", totalStudents: 42, todayAttendance: "95%", nextClass: "Today 11:15 AM" },
  { id: "c3", className: "MEC 1st Year", group: "MEC", level: "Senior Secondary", sec: "Section A", subject: "Commercial Maths", totalStudents: 48, todayAttendance: "89%", nextClass: "Tomorrow 09:00 AM" },
  { id: "c4", className: "BiPC 2nd Year", group: "BiPC", level: "Senior Secondary", sec: "Section C", subject: "Biostatistics", totalStudents: 40, todayAttendance: "96%", nextClass: "Friday 02:00 PM" },
];

const mockStudentsList = [
  { rollNo: "25MPC001", name: "Aarav Sharma", attendancePct: "94%", marks: 45, status: "Submitted" },
  { rollNo: "25MPC002", name: "Ananya Reddy", attendancePct: "98%", marks: 48, status: "Submitted" },
  { rollNo: "25MPC003", name: "Bhavya Rao", attendancePct: "88%", marks: 39, status: "Submitted" },
  { rollNo: "25MPC004", name: "Devendra Verma", attendancePct: "92%", marks: 42, status: "Submitted" },
  { rollNo: "25MPC005", name: "Gautam Krishna", attendancePct: "85%", marks: 36, status: "Submitted" },
  { rollNo: "25MPC006", name: "Ishita Nair", attendancePct: "96%", marks: 47, status: "Submitted" },
  { rollNo: "25MPC007", name: "Kavya Joshi", attendancePct: "90%", marks: 41, status: "Submitted" },
];

const mockFeedbackData = {
  overall: 4.8,
  quality: 4.9,
  communication: 4.7,
  knowledge: 4.9,
  punctuality: 4.8,
  engagement: 4.7,
  monthlyTrend: [
    { month: "Jan", rating: 4.6 },
    { month: "Feb", rating: 4.7 },
    { month: "Mar", rating: 4.7 },
    { month: "Apr", rating: 4.8 },
    { month: "May", rating: 4.8 },
  ],
  reviews: [
    { id: 1, anonymous: true, rating: 5, category: "Teaching Quality", comment: "Sir explains complex calculus integration concepts with practical examples. Highly inspiring!", date: "10 May 2025" },
    { id: 2, anonymous: true, rating: 5, category: "Punctuality", comment: "Always arrives on time and clears all doubt questions patiently after class.", date: "04 May 2025" },
    { id: 3, anonymous: true, rating: 4, category: "Communication", comment: "Great speed and clarity. Would love a few more practice worksheets for Mid Term prep.", date: "28 Apr 2025" },
  ],
};

const mockExamDutiesList = [
  { id: "d1", exam: "BIEAP Intermediate Board Practical Exam", date: "20 May 2025", time: "09:00 AM - 12:00 PM", venue: "Physics Lab 1", type: "Invigilator", reportingTime: "08:30 AM", status: "Pending" },
  { id: "d2", exam: "Unit Test II Evaluation Duty", date: "25 May 2025", time: "01:00 PM - 04:00 PM", venue: "Evaluation Cell 3", type: "Evaluator", reportingTime: "12:45 PM", status: "Upcoming" },
  { id: "d3", exam: "Mid-Term General Observer", date: "12 Apr 2025", time: "09:00 AM - 12:00 PM", venue: "Main Auditorium", type: "Observer", reportingTime: "08:30 AM", status: "Completed" },
];

const mockLeavesList = [
  { id: "l1", type: "Casual Leave (CL)", from: "14 May 2025", to: "14 May 2025", days: 1, reason: "Family medical emergency", appliedOn: "12 May 2025", status: "Approved", approver: "HOD Mathematics" },
  { id: "l2", type: "Sick Leave (SL)", from: "02 Apr 2025", to: "03 Apr 2025", days: 2, reason: "Viral fever and doctor advice", appliedOn: "01 Apr 2025", status: "Approved", approver: "Principal Office" },
];

const mockReimbursementsList = [
  { id: "r1", claimId: "CLM250501", type: "Books & Journals", claimAmount: 1800, approvedAmount: 1800, date: "05 May 2025", status: "Approved", month: "May 2025" },
  { id: "r2", claimId: "CLM250412", type: "Academic Conference", claimAmount: 3500, approvedAmount: 3500, date: "12 Apr 2025", status: "Approved", month: "April 2025" },
];

const mockNoticesList = [
  { id: "n1", title: "Intermediate Board Internal Assessment Deadline", category: "Academic", date: "15 May 2025", priority: "Urgent", postedBy: "Exam Cell", desc: "All faculty must submit UT-2 internal marks by May 22, 2025." },
  { id: "n2", title: "Monthly Salary Disbursement Confirmation", category: "Salary", date: "30 Apr 2025", priority: "Normal", postedBy: "Accounts Dept", desc: "April 2025 salaries credited to registered Bank accounts." },
  { id: "n3", title: "Faculty Development Workshop on AI in Pedagogy", category: "Administration", date: "24 Apr 2025", priority: "High", postedBy: "Principal Office", desc: "Mandatory 1-day workshop for all junior & senior lecturers." },
];

const mockConversationsList = [
  { id: "c1", name: "HOD - Mathematics", role: "Department Head", unread: 1, lastMsg: "Please review the UT-2 Question Paper draft by 3 PM.", time: "10:15 AM" },
  { id: "c2", name: "Accounts Department", role: "Finance Division", unread: 0, lastMsg: "Your reimbursement claim CLM250501 has been processed.", time: "Yesterday" },
  { id: "c3", name: "Exam Cell", role: "Controller of Exams", unread: 0, lastMsg: "Duty roster for upcoming Board Practicals attached.", time: "12 May" },
];

const mockMessagesHistory = [
  { id: "m1", sender: "HOD - Mathematics", text: "Good morning Ravi. Have you finalized the Section A calculus worksheet?", time: "09:30 AM", self: false },
  { id: "m2", sender: "Ravi Kumar", text: "Good morning Ma'am. Yes, completed. I will upload it to My Classes by noon.", time: "09:34 AM", self: true },
  { id: "m3", sender: "HOD - Mathematics", text: "Please review the UT-2 Question Paper draft by 3 PM.", time: "10:15 AM", self: false },
];

// CHART COLOR TINTS
const COLORS = ["#6F8400", "#108E50", "#B7791F", "#D93636", "#2563EB"];

// ==========================================================================
// MAIN FACULTY DASHBOARD COMPONENT
// ==========================================================================

function FacultyDashboard() {
  const navigate = useNavigate();
  const {
    selectedBoard: globalBoard,
    selectedAcademicYear: globalYear,
    setSelectedBoard: setGlobalBoard,
    setSelectedAcademicYear: setGlobalYear,
  } = useAcademicContext();

  // Navigation & View States
  const [activeModule, setActiveModule] = useState("dashboard");
  const [selectedBoard, setSelectedBoardState] = useState(globalBoard?.code || globalBoard?.name || "BIEAP");
  const [selectedYear, setSelectedYearState] = useState(globalYear?.code || globalYear?.label || "2025-2026");

  useEffect(() => {
    if (globalBoard) setSelectedBoardState(globalBoard.code || globalBoard.name || "BIEAP");
  }, [globalBoard]);

  useEffect(() => {
    if (globalYear) setSelectedYearState(globalYear.code || globalYear.label || "2025-2026");
  }, [globalYear]);

  const setSelectedBoard = (val) => {
    setSelectedBoardState(val);
    setGlobalBoard(val);
  };

  const setSelectedYear = (val) => {
    setSelectedYearState(val);
    setGlobalYear(val);
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Auto Toast helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Faculty User Identity & Profile State
  const currentFacultyUser = useMemo(() => getCurrentFacultyUser(), []);
  const [facultyProfile, setFacultyProfile] = useState(() => getInitialProfileState(currentFacultyUser));
  const completionPercentage = useMemo(() => calculateProfileCompletion(facultyProfile), [facultyProfile]);

  // Profile Active Sub-Tab
  const [profileTab, setProfileTab] = useState("overview");

  // Add / Edit Qualification Modal State
  const [showQualModal, setShowQualModal] = useState(false);
  const [editingQualId, setEditingQualId] = useState(null);
  const [qualForm, setQualForm] = useState({
    level: "Graduation",
    degree: "",
    institution: "",
    university: "",
    specialization: "",
    passingYear: "",
    percentage: "",
    studyMode: "Full-Time",
    docName: "",
  });

  // Add / Edit Experience Modal State
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExpId, setEditingExpId] = useState(null);
  const [expForm, setExpForm] = useState({
    institution: "",
    designation: "",
    department: "",
    fromDate: "",
    toDate: "",
    isCurrent: false,
    responsibilities: "",
    reasonForLeaving: "",
    docName: "",
  });

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);

  // Profile Field Mutators
  const updateProfileSection = (section, field, value) => {
    setFacultyProfile((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value,
      },
    }));
  };

  // Save Draft to Local Storage
  const handleSaveProfileDraft = () => {
    const empId = facultyProfile.baseline?.employeeId || "PJCTCH0027";
    const updated = {
      ...facultyProfile,
      baseline: {
        ...facultyProfile.baseline,
        profileStatus: facultyProfile.baseline.profileStatus === "Submitted" ? "Submitted" : "Draft",
      },
    };
    setFacultyProfile(updated);
    try {
      localStorage.setItem("pjc_faculty_profile_" + empId, JSON.stringify(updated));
    } catch (e) {
      console.warn("Error saving profile draft:", e);
    }
    showToast("Profile draft saved successfully!");
  };

  // Submit Profile for Admin Verification
  const handleSubmitProfile = () => {
    if (!facultyProfile.isDeclared) {
      showToast("Please acknowledge the legal declaration before submitting.");
      return;
    }
    const empId = facultyProfile.baseline?.employeeId || "PJCTCH0027";
    const pct = calculateProfileCompletion(facultyProfile);
    if (pct < 70) {
      showToast(`Please complete more profile sections before submitting (currently ${pct}%).`);
      return;
    }

    const updated = {
      ...facultyProfile,
      baseline: {
        ...facultyProfile.baseline,
        profileStatus: "Submitted",
        reviewStatus: "Pending",
      },
      isDeclared: true,
      declaredAt: new Date().toLocaleString("en-IN"),
      submittedAt: new Date().toLocaleString("en-IN"),
    };
    setFacultyProfile(updated);

    try {
      localStorage.setItem("pjc_faculty_profile_" + empId, JSON.stringify(updated));

      // Sync with submitted list for Admin Review
      const list = JSON.parse(localStorage.getItem("pjc_submitted_faculty_list") || "[]");
      const submittedRecord = {
        id: empId,
        employeeId: empId,
        fullName: updated.baseline.fullName,
        email: updated.baseline.primaryEmail,
        mobile: updated.baseline.primaryMobile,
        department: updated.baseline.department,
        designation: updated.baseline.designation,
        board: updated.baseline.board,
        dateOfJoining: updated.baseline.dateOfJoining,
        staffType: updated.baseline.staffType,
        employmentType: updated.baseline.employmentType,
        profileStatus: "Submitted",
        reviewStatus: "Pending",
        profileCompletion: 100,
        submittedAt: new Date().toISOString(),
        personal: updated.personal,
        contact: updated.contact,
        education: updated.education,
        experience: updated.experience,
        bank: updated.bank,
        emergency: updated.emergency,
        documents: updated.documents,
      };
      const filtered = list.filter((r) => r && String(r.id || r.employeeId) !== String(empId));
      localStorage.setItem("pjc_submitted_faculty_list", JSON.stringify([submittedRecord, ...filtered]));

      // Update mock staff records session store
      const sessionRecords = JSON.parse(sessionStorage.getItem("pjc-mock-staff-records") || "[]");
      const updatedSession = sessionRecords.map((r) => {
        if (r && String(r.id || r.employeeId) === String(empId)) {
          return { ...r, ...submittedRecord };
        }
        return r;
      });
      sessionStorage.setItem("pjc-mock-staff-records", JSON.stringify(updatedSession));

      window.dispatchEvent(new Event("staff-records-updated"));
    } catch (e) {
      console.error("Storage sync error:", e);
    }

    showToast("Profile submitted successfully for Administrative Review!");
    setProfileTab("overview");
  };

  // Qualification Actions
  const handleOpenAddQual = () => {
    setEditingQualId(null);
    setQualForm({
      level: "Graduation",
      degree: "",
      institution: "",
      university: "",
      specialization: "",
      passingYear: "",
      percentage: "",
      studyMode: "Full-Time",
      docName: "",
    });
    setShowQualModal(true);
  };

  const handleOpenEditQual = (item) => {
    setEditingQualId(item.id);
    setQualForm({ ...item });
    setShowQualModal(true);
  };

  const handleSaveQual = (e) => {
    e?.preventDefault();
    if (!qualForm.degree.trim() || !qualForm.institution.trim() || !qualForm.passingYear.trim()) {
      showToast("Please provide Degree, Institution, and Passing Year.");
      return;
    }
    const currentList = facultyProfile.education || [];
    let updatedList;
    if (editingQualId) {
      updatedList = currentList.map((q) => (q.id === editingQualId ? { ...qualForm, id: editingQualId } : q));
    } else {
      updatedList = [...currentList, { ...qualForm, id: `edu-${Date.now()}` }];
    }
    setFacultyProfile((prev) => ({ ...prev, education: updatedList }));
    setShowQualModal(false);
    showToast(editingQualId ? "Qualification updated!" : "Qualification added!");
  };

  const handleDeleteQual = (id) => {
    const updated = (facultyProfile.education || []).filter((q) => q.id !== id);
    setFacultyProfile((prev) => ({ ...prev, education: updated }));
    showToast("Qualification removed.");
  };

  // Experience Actions
  const handleOpenAddExp = () => {
    setEditingExpId(null);
    setExpForm({
      institution: "",
      designation: "",
      department: "",
      fromDate: "",
      toDate: "",
      isCurrent: false,
      responsibilities: "",
      reasonForLeaving: "",
      docName: "",
    });
    setShowExpModal(true);
  };

  const handleOpenEditExp = (item) => {
    setEditingExpId(item.id);
    setExpForm({ ...item });
    setShowExpModal(true);
  };

  const handleSaveExp = (e) => {
    e?.preventDefault();
    if (!expForm.institution.trim() || !expForm.designation.trim()) {
      showToast("Please provide Institution and Designation.");
      return;
    }
    const currentList = facultyProfile.experience?.records || [];
    let updatedList;
    if (editingExpId) {
      updatedList = currentList.map((item) => (item.id === editingExpId ? { ...expForm, id: editingExpId } : item));
    } else {
      updatedList = [...currentList, { ...expForm, id: `exp-${Date.now()}` }];
    }
    setFacultyProfile((prev) => ({
      ...prev,
      experience: {
        ...(prev.experience || {}),
        isFresher: false,
        records: updatedList,
      },
    }));
    setShowExpModal(false);
    showToast(editingExpId ? "Experience record updated!" : "Experience record added!");
  };

  const handleDeleteExp = (id) => {
    const updated = (facultyProfile.experience?.records || []).filter((item) => item.id !== id);
    setFacultyProfile((prev) => ({
      ...prev,
      experience: {
        ...(prev.experience || {}),
        records: updated,
      },
    }));
    showToast("Experience record removed.");
  };

  const handleFresherToggle = (checked) => {
    setFacultyProfile((prev) => ({
      ...prev,
      experience: {
        ...(prev.experience || {}),
        isFresher: checked,
        totalExperienceYears: checked ? "0 Years (Fresher)" : prev.experience?.totalExperienceYears || "1 Year",
        records: checked ? [] : prev.experience?.records || [],
      },
    }));
  };

  // Document Upload Action (Simulated real upload + file meta)
  const handleDocFileUpload = (key, file) => {
    if (!file) return;
    setUploadingKey(key);
    setTimeout(() => {
      const docItem = {
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        uploadedAt: new Date().toISOString().split("T")[0],
        status: "Uploaded",
        type: file.type || "application/pdf",
      };
      setFacultyProfile((prev) => ({
        ...prev,
        documents: {
          ...(prev.documents || {}),
          [key]: docItem,
        },
      }));
      setUploadingKey(null);
      showToast(`${file.name} uploaded successfully!`);
    }, 600);
  };

  const handleRemoveDoc = (key) => {
    setFacultyProfile((prev) => {
      const updatedDocs = { ...(prev.documents || {}) };
      delete updatedDocs[key];
      return { ...prev, documents: updatedDocs };
    });
    showToast("Document removed.");
  };

  // Detail Modal States
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  // Dynamic Interactive Local States
  const [attendanceState, setAttendanceState] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState("2025-05-16");
  const [attendanceSection, setAttendanceSection] = useState("c1");
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  useEffect(() => {
    if (activeModule === "attendance") {
      setIsAttendanceLoading(true);
      import('@/api/attendanceService.js').then(({ attendanceService }) => {
        attendanceService.getFacultySubjectAttendance({ date: attendanceDate, sectionId: attendanceSection === "c1" ? 1 : 2 })
          .then(res => {
            const data = res?.data?.data || res?.data || res || [];
            if (Array.isArray(data) && data.length > 0) {
              setAttendanceState(data.map(s => ({
                studentId: s.studentId || s.id,
                rollNo: s.rollNo || s.rollNumber || "N/A",
                name: s.studentName || s.name || "Unknown",
                status: s.status || s.morningStatus || "Present"
              })));
            } else {
              setAttendanceState(mockStudentsList.map((s) => ({ ...s, status: "Present", studentId: s.id || s.rollNo })));
            }
          })
          .catch(() => {
            setAttendanceState(mockStudentsList.map((s) => ({ ...s, status: "Present", studentId: s.id || s.rollNo })));
          })
          .finally(() => setIsAttendanceLoading(false));
      });
    }
  }, [activeModule, attendanceDate, attendanceSection]);
  const [marksState, setMarksState] = useState(mockStudentsList);
  const [examDutiesState, setExamDutiesState] = useState(mockExamDutiesList);
  const [leavesState, setLeavesState] = useState([]);
  const [reimbursementsState, setReimbursementsState] = useState(mockReimbursementsList);
  const [messagesState, setMessagesState] = useState(mockMessagesHistory);
  const [newMessageText, setNewMessageText] = useState("");

  // Leave Form Local State
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual Leave (CL)",
    from: "2025-05-20",
    to: "2025-05-20",
    days: 1,
    reason: "",
  });

  // Reimbursement Form Local State
  const [reimbForm, setReimbForm] = useState({
    type: "Books & Journals",
    amount: 1500,
    desc: "",
  });

  useEffect(() => {
    let isMounted = true;
    getLeaveRequests().then((data) => {
      if (isMounted && Array.isArray(data)) {
        setLeavesState(data.filter((leave) => leave && leave.staffId === mockFaculty.employeeId));
      }
    }).catch(err => console.warn("Leave requests offline/error:", err));
    return () => { isMounted = false; };
  }, []);

  // Logout Handler
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    } catch {
      /* storage unavailable */
    }
    showToast("Logging out of Faculty Portal...");
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 400);
  };

  // Nav Switcher
  const handleNavClick = (moduleName) => {
    setActiveModule(moduleName);
    setIsSidebarOpen(false);
    setIsProfileDropdownOpen(false);
  };

  // ------------------------------------------------------------------------
  // REUSABLE INTERNAL COMPONENTS
  // ------------------------------------------------------------------------

  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    let badgeClass = "paid";
    if (s.includes("pending") || s.includes("upcoming") || s.includes("draft") || s.includes("late")) {
      badgeClass = "pending";
    } else if (s.includes("rejected") || s.includes("absent")) {
      badgeClass = "rejected";
    }
    return <span className={`faculty-badge ${badgeClass}`}>{status}</span>;
  };

  const renderHeader = (title, subtitle, actions = null) => (
    <div className="faculty-page-header">
      <div className="faculty-page-title-group">
        <h1>{title}</h1>
        {subtitle ? <p className="faculty-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="faculty-page-actions">{actions}</div> : null}
    </div>
  );

  // Donut Chart Data
  const chartData = [
    { name: "Net Salary (Take Home)", value: mockSalaryData.netSalary },
    { name: "Total Deductions", value: mockSalaryData.totalDeductions },
  ];

  // ------------------------------------------------------------------------
  // SCREEN 1 — FACULTY DASHBOARD VIEW
  // ------------------------------------------------------------------------
  const renderDashboardView = () => (
    <div>
      {renderHeader(
        "Faculty Dashboard",
        `Welcome back, ${facultyProfile.baseline?.fullName || mockFaculty.fullName}! Have a great day.`,
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--faculty-card-bg)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--faculty-border)", fontSize: "12px", fontWeight: 700 }}>
          <Calendar size={14} style={{ color: "var(--faculty-primary)" }} />
          <span>Today: 16 May 2025, Friday</span>
        </div>
      )}

      {/* PROFILE STATUS ALERT / BANNER */}
      {facultyProfile.baseline?.profileStatus === "Draft" || completionPercentage < 100 ? (
        <div className="faculty-profile-banner warning">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--faculty-warning)", color: "#ffffff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--faculty-text)" }}>
                Faculty Profile Incomplete ({completionPercentage}%)
              </div>
              <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "2px" }}>
                Complete your educational qualifications, previous experience, bank, and statutory details for official employment verification and payroll processing.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            onClick={() => {
              setProfileTab("overview");
              handleNavClick("profile");
            }}
          >
            Complete My Profile <ArrowRight size={14} />
          </button>
        </div>
      ) : facultyProfile.baseline?.profileStatus === "Submitted" ? (
        <div className="faculty-profile-banner info">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--faculty-info)", color: "#ffffff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--faculty-text)" }}>
                Profile Submitted & Under Administrative Review
              </div>
              <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "2px" }}>
                Your complete faculty profile was submitted on {facultyProfile.submittedAt || "recently"}. Baseline details are verified and active for teaching duties.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-ghost"
            style={{ fontSize: "12px" }}
            onClick={() => {
              setProfileTab("overview");
              handleNavClick("profile");
            }}
          >
            View Profile <Eye size={14} />
          </button>
        </div>
      ) : facultyProfile.baseline?.profileStatus === "Correction Required" ? (
        <div className="faculty-profile-banner danger">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--faculty-danger)", color: "#ffffff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--faculty-danger)" }}>
                Profile Correction Requested by Administration
              </div>
              <div style={{ fontSize: "12px", color: "var(--faculty-text)", marginTop: "2px" }}>
                Remarks: {facultyProfile.baseline?.correctionRemarks || "Please verify your uploaded certificates and resubmit."}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            style={{ fontSize: "12px" }}
            onClick={() => {
              setProfileTab("review");
              handleNavClick("profile");
            }}
          >
            Review & Edit <Edit3 size={14} />
          </button>
        </div>
      ) : null}

      {/* VERIFIED EMPLOYMENT DETAILS SUMMARY CARD */}
      <div className="faculty-card" style={{ marginBottom: "20px" }}>
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><Building2 size={16} /> Official Employment Profile (Verified by Administration)</h3>
          <span className="faculty-pill-tag" style={{ background: "var(--faculty-success-soft)", color: "var(--faculty-success)", borderColor: "#bbf7d0" }}>
            <ShieldCheck size={12} /> {facultyProfile.baseline?.status || "Active"}
          </span>
        </div>
        <div className="faculty-form-grid-3" style={{ marginTop: "10px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Employee ID</span>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--faculty-primary-dark)", marginTop: "2px" }}>
              {facultyProfile.baseline?.employeeId || mockFaculty.employeeId}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Designation & Dept</span>
            <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
              {facultyProfile.baseline?.designation} • {facultyProfile.baseline?.department}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Board & Category</span>
            <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
              {facultyProfile.baseline?.board || "BIEAP"} • {facultyProfile.baseline?.staffType || "Teaching Staff"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Date of Joining</span>
            <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>
              {facultyProfile.baseline?.dateOfJoining}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Employment Type</span>
            <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>
              {facultyProfile.baseline?.employmentType || "Permanent Full-Time"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Allocated Subjects</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
              {(facultyProfile.baseline?.allocatedSubjects || ["Mathematics I-A", "Mathematics II-A"]).map((sub, i) => (
                <span key={i} className="faculty-pill-tag">{sub}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP 4 SALARY KPI CARDS */}
      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green" onClick={() => handleNavClick("salary")}>
          <div className="faculty-kpi-icon"><Wallet size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Basic Pay (Monthly)</span>
            <span className="faculty-kpi-value">₹{mockSalaryData.basicPay.toLocaleString("en-IN")}</span>
            <span className="faculty-kpi-sub">Fixed component</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-blue" onClick={() => handleNavClick("salary")}>
          <div className="faculty-kpi-icon"><DollarSign size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Net Salary (This Month)</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-success)" }}>
              ₹{mockSalaryData.netSalary.toLocaleString("en-IN")}
            </span>
            <span className="faculty-kpi-sub">After all deductions</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-orange" onClick={() => handleNavClick("payslips")}>
          <div className="faculty-kpi-icon"><CheckCircle size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Last Payment Date</span>
            <span className="faculty-kpi-value" style={{ fontSize: "17px" }}>{mockSalaryData.lastPaymentDate}</span>
            <span className="faculty-kpi-sub">Salary credited</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-purple" onClick={() => handleNavClick("payslips")}>
          <div className="faculty-kpi-icon"><Clock size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Next Salary Date</span>
            <span className="faculty-kpi-value" style={{ fontSize: "17px" }}>{mockSalaryData.nextSalaryDate}</span>
            <span className="faculty-kpi-sub">Expected credit date</span>
          </div>
        </div>
      </div>

      {/* ADDITIONAL FACULTY KPI METRICS */}
      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card" onClick={() => handleNavClick("timetable")}>
          <div className="faculty-kpi-icon"><BookOpen size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Today's Classes</span>
            <span className="faculty-kpi-value">4 Classes</span>
            <span className="faculty-kpi-sub">Next at 10:00 AM</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("attendance")}>
          <div className="faculty-kpi-icon"><UserCheck size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Attendance This Month</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary)" }}>96%</span>
            <span className="faculty-kpi-sub">Avg Class Present Rate</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("marks")}>
          <div className="faculty-kpi-icon"><ClipboardCheck size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Pending Marks Entry</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-warning)" }}>2 Units</span>
            <span className="faculty-kpi-sub">UT-2 Internal Marks</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("leave")}>
          <div className="faculty-kpi-icon"><CalendarOff size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Leave Balance</span>
            <span className="faculty-kpi-value">8 Days</span>
            <span className="faculty-kpi-sub">4 CL • 3 SL • 1 EL</span>
          </div>
        </div>
      </div>

      {/* SALARY OVERVIEW PANEL */}
      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><Wallet size={16} /> Salary Overview (May 2025)</h3>
          <span className="faculty-card-link" onClick={() => handleNavClick("salary")}>
            View Full Salary Details <ChevronRight size={14} />
          </span>
        </div>

        <div className="faculty-salary-overview-grid">
          {/* DONUT CHART */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} dataKey="value" stroke="none">
                    <Cell fill="#6F8400" />
                    <Cell fill="#D93636" />
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <span style={{ fontSize: "10px", color: "var(--faculty-muted)", textTransform: "uppercase", fontWeight: 700 }}>Net Pay</span>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-success)" }}>₹58,460</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 600, marginTop: "8px" }}>
              <span style={{ color: "#6F8400" }}>● Take Home (80%)</span>
              <span style={{ color: "#D93636" }}>● Deductions (20%)</span>
            </div>
          </div>

          {/* EARNINGS COLUMN */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-primary)", marginBottom: "8px" }}>Monthly Earnings Breakdown</div>
            <div className="faculty-breakdown-list">
              <div className="faculty-breakdown-item"><span>Basic Pay</span><strong>₹52,000</strong></div>
              <div className="faculty-breakdown-item"><span>HRA (House Rent)</span><span>₹10,400</span></div>
              <div className="faculty-breakdown-item"><span>Dearness Allowance (DA)</span><span>₹5,200</span></div>
              <div className="faculty-breakdown-item"><span>Academic Allowance</span><span>₹3,000</span></div>
              <div className="faculty-breakdown-item"><span>Transport Allowance</span><span>₹1,600</span></div>
              <div className="faculty-breakdown-item"><span>Other Allowances</span><span>₹1,000</span></div>
              <div className="faculty-breakdown-item total">
                <span>Gross Salary</span>
                <strong style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</strong>
              </div>
            </div>
          </div>

          {/* DEDUCTIONS COLUMN */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-danger)", marginBottom: "8px" }}>Monthly Deductions Breakdown</div>
            <div className="faculty-breakdown-list">
              <div className="faculty-breakdown-item"><span>PF Contribution (12%)</span><span>₹6,240</span></div>
              <div className="faculty-breakdown-item"><span>Professional Tax (PT)</span><span>₹200</span></div>
              <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
              <div className="faculty-breakdown-item"><span>Group Insurance</span><span>₹500</span></div>
              <div className="faculty-breakdown-item"><span>LOP (1 Day)</span><span>₹2,000</span></div>
              <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹1,000</span></div>
              <div className="faculty-breakdown-item total">
                <span>Total Deductions</span>
                <strong style={{ color: "var(--faculty-danger)" }}>₹13,740</strong>
              </div>
            </div>
          </div>
        </div>

        {/* NET SALARY FORMULA BANNER */}
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--faculty-primary-soft)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>
            <span>Formula: </span>
            <strong style={{ color: "var(--faculty-text)" }}>Net Salary = Gross Salary (₹73,200) - Total Deductions (₹13,740)</strong>
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-success)" }}>
            Net Monthly Outflow: ₹58,460
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="faculty-quick-bar">
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-text)" }}>Quick Actions:</span>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("salary")}><Wallet size={13} /> Salary Details</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("payslips")}><FileText size={13} /> All Payslips</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("timetable")}><Calendar size={13} /> My Timetable</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("attendance")}><UserCheck size={13} /> Mark Attendance</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("marks")}><ClipboardCheck size={13} /> Enter Marks</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("leave")}><CalendarOff size={13} /> Apply Leave</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("reimbursements")}><Receipt size={13} /> Reimbursements</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("notices")}><Bell size={13} /> Notices</button>
      </div>

      {/* LATEST PAYSLIP & UPCOMING DATES GRID */}
      <div className="faculty-form-grid-2" style={{ marginBottom: "20px" }}>
        {/* LATEST PAYSLIP CARD */}
        <div className="faculty-card" style={{ marginBottom: 0 }}>
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><FileText size={16} /> Latest Payslip</h3>
            <span className="faculty-card-link" onClick={() => handleNavClick("payslips")}>View All Payslips →</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--faculty-subtle)", padding: "14px", borderRadius: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800 }}>April 2025 Payslip</div>
              <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Paid on: 30 Apr 2025</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--faculty-success)" }}>₹58,460</div>
              {renderStatusBadge("Paid")}
            </div>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setSelectedPayslip(mockPayslips[1]);
              handleNavClick("payslips");
            }}
          >
            <Eye size={14} /> View & Print April Payslip
          </button>
        </div>

        {/* UPCOMING SALARY DATES CARD */}
        <div className="faculty-card" style={{ marginBottom: 0 }}>
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><Clock size={16} /> Upcoming Salary Dates</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for May 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>31 May 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>

            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for Jun 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>30 Jun 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>

            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for Jul 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>31 Jul 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PAYSLIPS TABLE */}
      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><FileSpreadsheet size={16} /> Recent Salary Payslips History</h3>
        </div>
        <div className="faculty-table-wrap">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Gross Salary</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockPayslips.map((ps) => (
                <tr key={ps.id}>
                  <td><strong>{ps.month}</strong></td>
                  <td>₹{ps.grossSalary.toLocaleString("en-IN")}</td>
                  <td style={{ color: "var(--faculty-danger)" }}>₹{ps.totalDeductions.toLocaleString("en-IN")}</td>
                  <td><strong style={{ color: "var(--faculty-success)" }}>₹{ps.netSalary.toLocaleString("en-IN")}</strong></td>
                  <td>{ps.paymentDate}</td>
                  <td>{renderStatusBadge(ps.status)}</td>
                  <td>
                    <button
                      type="button"
                      className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                      onClick={() => {
                        setSelectedPayslip(ps);
                        handleNavClick("payslips");
                      }}
                    >
                      <Eye size={12} /> View Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HELP CARD */}
      <div className="faculty-card" style={{ background: "var(--faculty-primary-soft)", border: "1px dashed var(--faculty-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "var(--faculty-primary-dark)" }}>Need Help with Salary or Tax Deductions?</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--faculty-muted)" }}>
              For any salary structure queries, PF updates, or TDS tax declarations, please contact the Accounts Department.
            </p>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            onClick={() => showToast("Accounts Department contact details: accounts@pirnavcollege.edu | Ext: 402")}
          >
            <HelpCircle size={14} /> Contact Accounts
          </button>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // ------------------------------------------------------------------------
  // SCREEN 2 — MY PROFILE VIEW (PIRNAV FACULTY PROFILE COMPLETION SYSTEM)
  // ------------------------------------------------------------------------
  const renderProfileView = () => {
    const isSubmitted = facultyProfile.baseline?.profileStatus === "Submitted";
    const isApproved = facultyProfile.baseline?.profileStatus === "Approved" || facultyProfile.baseline?.reviewStatus === "Approved";

    return (
      <div>
        {renderHeader(
          "My Profile",
          "Complete and manage your official faculty credentials, qualifications, and records.",
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="faculty-btn faculty-btn-ghost"
              onClick={handleSaveProfileDraft}
            >
              <Save size={14} /> Save Draft
            </button>
            {profileTab !== "review" && (
              <button
                type="button"
                className="faculty-btn faculty-btn-primary"
                onClick={() => setProfileTab("review")}
              >
                <FileCheck size={14} /> Review & Submit
              </button>
            )}
          </div>
        )}

        {/* TOP STATUS NOTIFICATION IF SUBMITTED OR CORRECTION */}
        {isSubmitted && (
          <div className="faculty-profile-banner info">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Clock size={18} />
              <div>
                <strong>Profile Submitted for Administrative Review</strong>
                <div style={{ fontSize: "12px", opacity: 0.9 }}>
                  Submitted on {facultyProfile.submittedAt || "recently"}. Your profile is locked for editing while under review by the Principal & HR Office.
                </div>
              </div>
            </div>
            <span className="faculty-badge pending">Under Review</span>
          </div>
        )}

        {facultyProfile.baseline?.profileStatus === "Correction Required" && (
          <div className="faculty-profile-banner danger">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={18} />
              <div>
                <strong>Correction Requested by Admin</strong>
                <div style={{ fontSize: "12px" }}>
                  Remarks: {facultyProfile.baseline?.correctionRemarks || "Please update your documents."}
                </div>
              </div>
            </div>
            <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("documents")}>
              Update Documents
            </button>
          </div>
        )}

        {/* HEADER PROFILE CARD */}
        <div className="faculty-card" style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div className="faculty-avatar" style={{ width: "70px", height: "70px", fontSize: "24px", position: "relative" }}>
            {facultyProfile.personal?.photoUrl ? (
              <img
                src={facultyProfile.personal.photoUrl}
                alt="Profile"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              (facultyProfile.baseline?.fullName || "Ravi Kumar")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                {facultyProfile.baseline?.fullName || mockFaculty.fullName}
              </h2>
              {renderStatusBadge(facultyProfile.baseline?.profileStatus === "Submitted" ? "Submitted" : facultyProfile.baseline?.status || "Active")}
            </div>
            <div style={{ fontSize: "13px", color: "var(--faculty-muted)", marginTop: "4px" }}>
              Employee ID: <strong style={{ color: "var(--faculty-primary-dark)" }}>{facultyProfile.baseline?.employeeId}</strong> • {facultyProfile.baseline?.designation} ({facultyProfile.baseline?.department})
            </div>
            <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "2px" }}>
              Board: <strong>{facultyProfile.baseline?.board || "BIEAP"}</strong> • Joined: {facultyProfile.baseline?.dateOfJoining} • Email: {facultyProfile.baseline?.primaryEmail}
            </div>
          </div>
          <div style={{ background: "var(--faculty-subtle)", padding: "12px 20px", borderRadius: "12px", textAlign: "center", border: "1px solid var(--faculty-border)", minWidth: "150px" }}>
            <div style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700, textTransform: "uppercase" }}>Profile Completion</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: completionPercentage === 100 ? "var(--faculty-success)" : "var(--faculty-primary)", margin: "2px 0" }}>
              {completionPercentage}%
            </div>
            <div className="faculty-progress-container" style={{ width: "100px", margin: "4px auto 0 auto" }}>
              <div className="faculty-progress-bar" style={{ width: `${completionPercentage}%`, background: completionPercentage === 100 ? "var(--faculty-success)" : "var(--faculty-primary)" }} />
            </div>
          </div>
        </div>

        {/* PROFILE TABS NAVBAR */}
        <div className="faculty-profile-tabs">
          {[
            { id: "overview", label: "Overview & Verified", icon: <Building2 size={14} /> },
            { id: "personal", label: "Personal Info", icon: <User size={14} /> },
            { id: "contact", label: "Contact & Address", icon: <MapPin size={14} /> },
            { id: "academic", label: "Academic & Domains", icon: <BookOpen size={14} /> },
            { id: "qual", label: "Qualifications", icon: <GraduationCap size={14} /> },
            { id: "exp", label: "Experience", icon: <Briefcase size={14} /> },
            { id: "bank", label: "Bank & Statutory", icon: <CreditCard size={14} /> },
            { id: "emergency", label: "Emergency Contact", icon: <Phone size={14} /> },
            { id: "docs", label: "Documents", icon: <FileText size={14} /> },
            { id: "review", label: "Review & Submit", icon: <ShieldCheck size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`faculty-profile-tab-btn ${profileTab === tab.id ? "active" : ""}`}
              onClick={() => setProfileTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="faculty-card">
          {/* TAB 1: OVERVIEW & VERIFIED BASELINE */}
          {profileTab === "overview" && (
            <div>
              <div className="faculty-section-title">
                <ShieldCheck size={18} style={{ color: "var(--faculty-primary)" }} /> Official Baseline Employment Details (Verified by College Administration)
              </div>
              <p style={{ fontSize: "12px", color: "var(--faculty-muted)", marginBottom: "16px" }}>
                These official baseline details are provisioned and verified by College Administration. To request changes in department, designation, or subject allocation, please contact the Principal Office.
              </p>

              <div className="faculty-form-grid-3">
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Employee ID (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.employeeId}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Full Name (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.fullName}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Staff Category (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.staffType || "Teaching Staff"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Department (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.department}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Designation (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.designation}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Board / Curriculum (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.board || "BIEAP"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Date of Joining (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.dateOfJoining}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Employment Type (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.employmentType || "Permanent Full-Time"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Official College Email (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.primaryEmail}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Official Mobile Number (Read-Only)</label>
                  <div className="faculty-field-readonly">+91 {facultyProfile.baseline?.primaryMobile}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)" }}>Allocated Teaching Subjects (Read-Only)</label>
                  <div className="faculty-field-readonly" style={{ gap: "6px", flexWrap: "wrap" }}>
                    {(facultyProfile.baseline?.allocatedSubjects || ["Mathematics I-A", "Mathematics II-A"]).map((sub, i) => (
                      <span key={i} className="faculty-pill-tag">{sub}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>
                  Next step: Complete personal, contact, qualification, and banking records.
                </span>
                <button
                  type="button"
                  className="faculty-btn faculty-btn-primary"
                  onClick={() => setProfileTab("personal")}
                >
                  Edit Personal Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL INFO */}
          {profileTab === "personal" && (
            <div>
              <div className="faculty-section-title">
                <User size={18} style={{ color: "var(--faculty-primary)" }} /> Personal Information
              </div>

              <div className="faculty-form-grid-3">
                <div className="faculty-form-group">
                  <label>Full Name</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.fullName}</div>
                </div>
                <div className="faculty-form-group">
                  <label>Father's / Guardian's Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.personal?.guardianName || ""}
                    placeholder="Enter Father / Guardian Name"
                    onChange={(e) => updateProfileSection("personal", "guardianName", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Gender <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <select
                    value={facultyProfile.personal?.gender || "Male"}
                    onChange={(e) => updateProfileSection("personal", "gender", e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="faculty-form-group">
                  <label>Date of Birth <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={facultyProfile.personal?.dob || ""}
                    onChange={(e) => updateProfileSection("personal", "dob", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Blood Group <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <select
                    value={facultyProfile.personal?.bloodGroup || "O+"}
                    onChange={(e) => updateProfileSection("personal", "bloodGroup", e.target.value)}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="faculty-form-group">
                  <label>Marital Status</label>
                  <select
                    value={facultyProfile.personal?.maritalStatus || "Single"}
                    onChange={(e) => updateProfileSection("personal", "maritalStatus", e.target.value)}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="faculty-form-group">
                  <label>Nationality</label>
                  <input
                    type="text"
                    value={facultyProfile.personal?.nationality || "Indian"}
                    onChange={(e) => updateProfileSection("personal", "nationality", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Aadhaar Number (12 Digits) <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    maxLength={12}
                    value={facultyProfile.personal?.aadhaar || ""}
                    placeholder="Enter 12 Digit Aadhaar"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateProfileSection("personal", "aadhaar", val);
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>Masked display: {maskAadhaar(facultyProfile.personal?.aadhaar)}</span>
                </div>
                <div className="faculty-form-group">
                  <label>PAN Card Number (10 Characters) <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    maxLength={10}
                    value={facultyProfile.personal?.pan || ""}
                    placeholder="e.g. ABCPS1234F"
                    onChange={(e) => updateProfileSection("personal", "pan", e.target.value.toUpperCase())}
                  />
                  <span style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>Masked display: {maskPan(facultyProfile.personal?.pan)}</span>
                </div>
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("overview")}>
                  <ArrowLeft size={14} /> Back to Overview
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("contact")}>
                  Next: Contact & Address <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT & ADDRESS */}
          {profileTab === "contact" && (
            <div>
              <div className="faculty-section-title">
                <MapPin size={18} style={{ color: "var(--faculty-primary)" }} /> Contact & Residential Address
              </div>

              <div className="faculty-form-grid-2">
                <div className="faculty-form-group">
                  <label>Primary Mobile (Official - Read-Only)</label>
                  <div className="faculty-field-readonly">+91 {facultyProfile.baseline?.primaryMobile}</div>
                </div>
                <div className="faculty-form-group">
                  <label>Official College Email (Read-Only)</label>
                  <div className="faculty-field-readonly">{facultyProfile.baseline?.primaryEmail}</div>
                </div>
                <div className="faculty-form-group">
                  <label>Alternate / Personal Mobile (10 Digits)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={facultyProfile.contact?.altMobile || ""}
                    placeholder="Enter 10 Digit Mobile"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateProfileSection("contact", "altMobile", val);
                    }}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Personal Email Address</label>
                  <input
                    type="email"
                    value={facultyProfile.contact?.personalEmail || ""}
                    placeholder="e.g. personal@gmail.com"
                    onChange={(e) => updateProfileSection("contact", "personalEmail", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ margin: "20px 0 10px 0", fontWeight: 800, fontSize: "14px", color: "var(--faculty-text)" }}>
                Current Residential Address
              </div>
              <div className="faculty-form-grid-3">
                <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                  <label>Door / House / Flat & Street <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.contact?.currentAddress || ""}
                    placeholder="House No, Apartment, Street"
                    onChange={(e) => updateProfileSection("contact", "currentAddress", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>City <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.contact?.city || ""}
                    onChange={(e) => updateProfileSection("contact", "city", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>District</label>
                  <input
                    type="text"
                    value={facultyProfile.contact?.district || ""}
                    onChange={(e) => updateProfileSection("contact", "district", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>State <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.contact?.state || ""}
                    onChange={(e) => updateProfileSection("contact", "state", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Pincode (6 Digits) <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    maxLength={6}
                    value={facultyProfile.contact?.pincode || ""}
                    placeholder="6 Digit PIN"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateProfileSection("contact", "pincode", val);
                    }}
                  />
                </div>
              </div>

              <div style={{ margin: "24px 0 10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="sameAddressCheck"
                  style={{ width: "16px", height: "16px", accentColor: "var(--faculty-primary)" }}
                  checked={facultyProfile.contact?.sameAsCurrent ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFacultyProfile((prev) => ({
                      ...prev,
                      contact: {
                        ...(prev.contact || {}),
                        sameAsCurrent: checked,
                        ...(checked
                          ? {
                              permAddress: prev.contact?.currentAddress,
                              permCity: prev.contact?.city,
                              permDistrict: prev.contact?.district,
                              permState: prev.contact?.state,
                              permPincode: prev.contact?.pincode,
                            }
                          : {}),
                      },
                    }));
                  }}
                />
                <label htmlFor="sameAddressCheck" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  Permanent Address is same as Current Address
                </label>
              </div>

              {!facultyProfile.contact?.sameAsCurrent && (
                <div className="faculty-form-grid-3" style={{ marginTop: "12px" }}>
                  <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Permanent House & Street</label>
                    <input
                      type="text"
                      value={facultyProfile.contact?.permAddress || ""}
                      onChange={(e) => updateProfileSection("contact", "permAddress", e.target.value)}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Permanent City</label>
                    <input
                      type="text"
                      value={facultyProfile.contact?.permCity || ""}
                      onChange={(e) => updateProfileSection("contact", "permCity", e.target.value)}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Permanent State</label>
                    <input
                      type="text"
                      value={facultyProfile.contact?.permState || ""}
                      onChange={(e) => updateProfileSection("contact", "permState", e.target.value)}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Permanent Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={facultyProfile.contact?.permPincode || ""}
                      onChange={(e) => updateProfileSection("contact", "permPincode", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("personal")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("academic")}>
                  Next: Academic Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ACADEMIC & DOMAINS */}
          {profileTab === "academic" && (
            <div>
              <div className="faculty-section-title">
                <BookOpen size={18} style={{ color: "var(--faculty-primary)" }} /> Academic Specialization & Teaching Domains
              </div>

              <div className="faculty-form-grid-2">
                <div className="faculty-form-group">
                  <label>Primary Specialization / Teaching Domain <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.professional?.specialization || ""}
                    placeholder="e.g. Pure & Applied Mathematics, Calculus"
                    onChange={(e) => updateProfileSection("professional", "specialization", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Teaching Level / Secondary Domains</label>
                  <input
                    type="text"
                    value={facultyProfile.professional?.primaryTeachingDomain || ""}
                    placeholder="e.g. Senior Secondary & Intermediate MPC"
                    onChange={(e) => updateProfileSection("professional", "primaryTeachingDomain", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Research Interests & Publications Summary</label>
                  <textarea
                    rows={2}
                    value={facultyProfile.professional?.researchInterests || ""}
                    placeholder="e.g. Differential Equations, Mathematical Modelling"
                    onChange={(e) => updateProfileSection("professional", "researchInterests", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Professional Bodies & Memberships</label>
                  <textarea
                    rows={2}
                    value={facultyProfile.professional?.memberships || ""}
                    placeholder="e.g. AMTI, Indian Mathematical Society Life Member"
                    onChange={(e) => updateProfileSection("professional", "memberships", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("contact")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("qual")}>
                  Next: Educational Qualifications <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: QUALIFICATIONS */}
          {profileTab === "qual" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div className="faculty-section-title" style={{ margin: 0 }}>
                  <GraduationCap size={18} style={{ color: "var(--faculty-primary)" }} /> Educational Qualifications
                </div>
                <button
                  type="button"
                  className="faculty-btn faculty-btn-primary faculty-btn-sm"
                  onClick={handleOpenAddQual}
                >
                  <Plus size={14} /> Add Degree / Qualification
                </button>
              </div>

              {(!facultyProfile.education || facultyProfile.education.length === 0) ? (
                <div style={{ textAlign: "center", padding: "32px", border: "1px dashed var(--faculty-border)", borderRadius: "10px" }}>
                  <GraduationCap size={32} style={{ color: "var(--faculty-muted)", opacity: 0.5, margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>No qualifications added yet</div>
                  <p style={{ fontSize: "12px", color: "var(--faculty-muted)", margin: "4px 0 12px" }}>
                    Please add your highest qualification, graduation, and professional certifications.
                  </p>
                  <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleOpenAddQual}>
                    <Plus size={13} /> Add First Qualification
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {facultyProfile.education.map((q) => (
                    <div key={q.id} className="faculty-repeatable-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="faculty-pill-tag">{q.level}</span>
                            <strong style={{ fontSize: "14px", color: "var(--faculty-text)" }}>{q.degree}</strong>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "4px" }}>
                            Institution: <strong>{q.institution}</strong> • University/Board: {q.university || "—"}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "2px" }}>
                            Specialization: {q.specialization || "General"} • Passing Year: <strong>{q.passingYear}</strong> • Score: <strong>{q.percentage}</strong> ({q.studyMode || "Full-Time"})
                          </div>
                          {q.docName && (
                            <div style={{ fontSize: "11px", color: "var(--faculty-primary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FileCheck size={12} /> Certificate: {q.docName}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                            onClick={() => handleOpenEditQual(q)}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                            style={{ color: "var(--faculty-danger)" }}
                            onClick={() => handleDeleteQual(q.id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("academic")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("exp")}>
                  Next: Previous Experience <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: PREVIOUS EXPERIENCE */}
          {profileTab === "exp" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div className="faculty-section-title" style={{ margin: 0 }}>
                  <Briefcase size={18} style={{ color: "var(--faculty-primary)" }} /> Previous Teaching & Industry Experience
                </div>
                {!facultyProfile.experience?.isFresher && (
                  <button
                    type="button"
                    className="faculty-btn faculty-btn-primary faculty-btn-sm"
                    onClick={handleOpenAddExp}
                  >
                    <Plus size={14} /> Add Experience Record
                  </button>
                )}
              </div>

              {/* FRESHER TOGGLE */}
              <div style={{ background: "var(--faculty-subtle)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--faculty-border)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="fresherToggleCheck"
                  style={{ width: "18px", height: "18px", accentColor: "var(--faculty-primary)", cursor: "pointer" }}
                  checked={!!facultyProfile.experience?.isFresher}
                  onChange={(e) => handleFresherToggle(e.target.checked)}
                />
                <label htmlFor="fresherToggleCheck" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  I am a Fresher (No prior teaching or industry experience)
                </label>
              </div>

              {facultyProfile.experience?.isFresher ? (
                <div style={{ padding: "24px", background: "var(--faculty-primary-soft)", borderRadius: "10px", textAlign: "center", color: "var(--faculty-primary-dark)" }}>
                  <CheckCircle size={28} style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 800, fontSize: "14px" }}>Fresher Status Registered</div>
                  <div style={{ fontSize: "12px", marginTop: "2px" }}>Total prior experience marked as 0 Years. PIRNAV College will be your primary institution of record.</div>
                </div>
              ) : (!facultyProfile.experience?.records || facultyProfile.experience.records.length === 0) ? (
                <div style={{ textAlign: "center", padding: "32px", border: "1px dashed var(--faculty-border)", borderRadius: "10px" }}>
                  <Briefcase size={32} style={{ color: "var(--faculty-muted)", opacity: 0.5, margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>No previous experience records added</div>
                  <p style={{ fontSize: "12px", color: "var(--faculty-muted)", margin: "4px 0 12px" }}>
                    If you have prior teaching experience, click below to add your past institutions.
                  </p>
                  <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleOpenAddExp}>
                    <Plus size={13} /> Add Experience
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {facultyProfile.experience.records.map((exp) => (
                    <div key={exp.id} className="faculty-repeatable-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "14px", color: "var(--faculty-text)" }}>{exp.institution}</strong>
                            <span className="faculty-pill-tag">{exp.designation}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "4px" }}>
                            Department: {exp.department || "Academics"} • Period: <strong>{exp.fromDate}</strong> to <strong>{exp.isCurrent ? "Present" : exp.toDate || "—"}</strong>
                          </div>
                          {exp.responsibilities && (
                            <div style={{ fontSize: "12px", color: "var(--faculty-text)", marginTop: "4px" }}>
                              {exp.responsibilities}
                            </div>
                          )}
                          {exp.reasonForLeaving && (
                            <div style={{ fontSize: "11px", color: "var(--faculty-muted)", marginTop: "2px" }}>
                              Reason for leaving: {exp.reasonForLeaving}
                            </div>
                          )}
                          {exp.docName && (
                            <div style={{ fontSize: "11px", color: "var(--faculty-primary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FileCheck size={12} /> Relieving Letter: {exp.docName}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                            onClick={() => handleOpenEditExp(exp)}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                            style={{ color: "var(--faculty-danger)" }}
                            onClick={() => handleDeleteExp(exp.id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("qual")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("bank")}>
                  Next: Bank Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: BANK & STATUTORY */}
          {profileTab === "bank" && (
            <div>
              <div className="faculty-section-title">
                <CreditCard size={18} style={{ color: "var(--faculty-primary)" }} /> Bank & Statutory Details (For Payroll Processing)
              </div>

              <div className="faculty-form-grid-3">
                <div className="faculty-form-group">
                  <label>Bank Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.bank?.bankName || ""}
                    placeholder="e.g. State Bank of India"
                    onChange={(e) => updateProfileSection("bank", "bankName", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Account Holder Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.bank?.accountHolder || ""}
                    placeholder="As per bank passbook"
                    onChange={(e) => updateProfileSection("bank", "accountHolder", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Account Number <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="password"
                    value={facultyProfile.bank?.accountNumber || ""}
                    placeholder="Enter Account Number"
                    onChange={(e) => updateProfileSection("bank", "accountNumber", e.target.value.replace(/\D/g, ""))}
                  />
                  <span style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>Masked display: {maskAccount(facultyProfile.bank?.accountNumber)}</span>
                </div>
                <div className="faculty-form-group">
                  <label>Confirm Account Number <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.bank?.confirmAccountNumber || ""}
                    placeholder="Re-enter Account Number"
                    onChange={(e) => updateProfileSection("bank", "confirmAccountNumber", e.target.value.replace(/\D/g, ""))}
                  />
                  {facultyProfile.bank?.accountNumber && facultyProfile.bank?.confirmAccountNumber && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: facultyProfile.bank.accountNumber === facultyProfile.bank.confirmAccountNumber ? "var(--faculty-success)" : "var(--faculty-danger)" }}>
                      {facultyProfile.bank.accountNumber === facultyProfile.bank.confirmAccountNumber ? "✓ Account numbers match" : "✕ Account numbers do not match"}
                    </span>
                  )}
                </div>
                <div className="faculty-form-group">
                  <label>IFSC Code <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    maxLength={11}
                    value={facultyProfile.bank?.ifsc || ""}
                    placeholder="e.g. SBIN0001234"
                    onChange={(e) => updateProfileSection("bank", "ifsc", e.target.value.toUpperCase())}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    value={facultyProfile.bank?.branch || ""}
                    placeholder="Branch Location"
                    onChange={(e) => updateProfileSection("bank", "branch", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Account Type</label>
                  <select
                    value={facultyProfile.bank?.accountType || "Savings"}
                    onChange={(e) => updateProfileSection("bank", "accountType", e.target.value)}
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Salary">Salary Account</option>
                    <option value="Current">Current Account</option>
                  </select>
                </div>
                <div className="faculty-form-group">
                  <label>UAN Number (12 Digits - Optional)</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={facultyProfile.bank?.uanNumber || ""}
                    placeholder="Universal Account Number"
                    onChange={(e) => updateProfileSection("bank", "uanNumber", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>PF / Provident Fund Number (Optional)</label>
                  <input
                    type="text"
                    value={facultyProfile.bank?.pfNumber || ""}
                    placeholder="e.g. AP/HYD/0098234/000/00027"
                    onChange={(e) => updateProfileSection("bank", "pfNumber", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("exp")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("emergency")}>
                  Next: Emergency Contact <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: EMERGENCY CONTACT */}
          {profileTab === "emergency" && (
            <div>
              <div className="faculty-section-title">
                <Phone size={18} style={{ color: "var(--faculty-primary)" }} /> Emergency Contact Information
              </div>

              <div className="faculty-form-grid-3">
                <div className="faculty-form-group">
                  <label>Contact Person Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    value={facultyProfile.emergency?.name || ""}
                    placeholder="e.g. Mrs. Sumathi Kumar"
                    onChange={(e) => updateProfileSection("emergency", "name", e.target.value)}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Relationship <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <select
                    value={facultyProfile.emergency?.relationship || "Spouse"}
                    onChange={(e) => updateProfileSection("emergency", "relationship", e.target.value)}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="faculty-form-group">
                  <label>Emergency Primary Mobile <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                  <input
                    type="text"
                    maxLength={10}
                    value={facultyProfile.emergency?.mobile || ""}
                    placeholder="10 Digit Phone Number"
                    onChange={(e) => updateProfileSection("emergency", "mobile", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="faculty-form-group">
                  <label>Alternate Mobile</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={facultyProfile.emergency?.altMobile || ""}
                    placeholder="Alternate Phone"
                    onChange={(e) => updateProfileSection("emergency", "altMobile", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                  <label>Emergency Contact Address</label>
                  <input
                    type="text"
                    value={facultyProfile.emergency?.address || ""}
                    placeholder="Residential address of contact person"
                    onChange={(e) => updateProfileSection("emergency", "address", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("bank")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("docs")}>
                  Next: Document Uploads <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: DOCUMENTS */}
          {profileTab === "docs" && (
            <div>
              <div className="faculty-section-title">
                <FileText size={18} style={{ color: "var(--faculty-primary)" }} /> Mandatory & Supporting Documents
              </div>
              <p style={{ fontSize: "12px", color: "var(--faculty-muted)", marginBottom: "16px" }}>
                Upload clear scanned copies or photographs of your credentials (PDF, JPG, PNG under 5MB each).
              </p>

              <div className="faculty-form-grid-2">
                {[
                  { key: "photo", label: "Passport Size Photograph", req: true, hint: "Recent color photo (JPG/PNG)" },
                  { key: "signature", label: "Signature Copy", req: true, hint: "Black ink on white paper" },
                  { key: "aadhaar", label: "Aadhaar Card Copy", req: true, hint: "Front & back in PDF or image" },
                  { key: "pan", label: "PAN Card Copy", req: true, hint: "Clear readable copy" },
                  { key: "degreeCertificate", label: "Highest Degree Certificate", req: true, hint: "M.Sc / Ph.D / Post Graduation" },
                  { key: "experienceLetter", label: "Relieving / Experience Letter", req: false, hint: "Past institution service letter" },
                  { key: "resume", label: "Curriculum Vitae (Resume)", req: true, hint: "Updated academic CV (PDF)" },
                  { key: "bankProof", label: "Cancelled Cheque / Passbook", req: true, hint: "Showing Account No & IFSC" },
                ].map((item) => {
                  const doc = facultyProfile.documents?.[item.key];
                  const isUploading = uploadingKey === item.key;

                  return (
                    <div key={item.key} className="faculty-doc-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ fontSize: "13px", color: "var(--faculty-text)" }}>{item.label}</strong>
                          {item.req && <span style={{ color: "var(--faculty-primary)", fontSize: "12px", fontWeight: 800 }}>*</span>}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--faculty-muted)", marginTop: "2px" }}>
                          {item.hint}
                        </div>
                        {doc ? (
                          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="faculty-pill-tag" style={{ background: "var(--faculty-success-soft)", color: "var(--faculty-success)", borderColor: "#bbf7d0" }}>
                              <Check size={10} /> {doc.name} ({doc.size})
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {doc ? (
                          <>
                            <button
                              type="button"
                              className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                              title="Preview Document"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                              style={{ color: "var(--faculty-danger)" }}
                              title="Remove"
                              onClick={() => handleRemoveDoc(item.key)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <label className="faculty-btn faculty-btn-ghost faculty-btn-sm" style={{ cursor: "pointer" }}>
                            {isUploading ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
                            <span>{isUploading ? "Uploading..." : "Upload"}</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleDocFileUpload(item.key, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--faculty-border)", display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("emergency")}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => setProfileTab("review")}>
                  Next: Review & Final Submission <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: REVIEW & SUBMIT */}
          {profileTab === "review" && (
            <div>
              <div className="faculty-section-title">
                <ShieldCheck size={18} style={{ color: "var(--faculty-primary)" }} /> Comprehensive Profile Review & Final Declaration
              </div>
              <p style={{ fontSize: "12px", color: "var(--faculty-muted)", marginBottom: "18px" }}>
                Please review all information below carefully. Once submitted, your profile will be sent to the Principal Office for official employment verification.
              </p>

              {/* REVIEW SUMMARY CARDS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 1. Official Baseline */}
                <div style={{ padding: "14px 18px", border: "1px solid var(--faculty-border)", borderRadius: "10px", background: "var(--faculty-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>1. Baseline Administrative Record</strong>
                    <span className="faculty-pill-tag"><ShieldCheck size={10} /> Verified by Admin</span>
                  </div>
                  <div style={{ fontSize: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                    <div>ID: <strong>{facultyProfile.baseline?.employeeId}</strong></div>
                    <div>Designation: <strong>{facultyProfile.baseline?.designation}</strong></div>
                    <div>Department: <strong>{facultyProfile.baseline?.department}</strong></div>
                    <div>Board: <strong>{facultyProfile.baseline?.board}</strong></div>
                  </div>
                </div>

                {/* 2. Personal & Contact */}
                <div style={{ padding: "14px 18px", border: "1px solid var(--faculty-border)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>2. Personal & Contact Information</strong>
                    <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setProfileTab("personal")}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                    <div>Guardian: <strong>{facultyProfile.personal?.guardianName || "—"}</strong></div>
                    <div>DOB / Gender: <strong>{facultyProfile.personal?.dob} ({facultyProfile.personal?.gender})</strong></div>
                    <div>Blood Group: <strong>{facultyProfile.personal?.bloodGroup}</strong></div>
                    <div>Aadhaar: <strong>{maskAadhaar(facultyProfile.personal?.aadhaar)}</strong></div>
                    <div>PAN Card: <strong>{maskPan(facultyProfile.personal?.pan)}</strong></div>
                    <div>Address: <strong>{facultyProfile.contact?.currentAddress}, {facultyProfile.contact?.city} - {facultyProfile.contact?.pincode}</strong></div>
                  </div>
                </div>

                {/* 3. Qualifications */}
                <div style={{ padding: "14px 18px", border: "1px solid var(--faculty-border)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>3. Educational Qualifications ({facultyProfile.education?.length || 0} Records)</strong>
                    <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setProfileTab("qual")}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  {(facultyProfile.education || []).map((q, idx) => (
                    <div key={idx} style={{ fontSize: "12px", marginBottom: "4px" }}>
                      • <strong>{q.degree}</strong> from {q.institution} ({q.passingYear}) — {q.percentage}
                    </div>
                  ))}
                </div>

                {/* 4. Experience */}
                <div style={{ padding: "14px 18px", border: "1px solid var(--faculty-border)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>4. Previous Experience</strong>
                    <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setProfileTab("exp")}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  {facultyProfile.experience?.isFresher ? (
                    <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Registered as Fresher (No prior teaching experience)</div>
                  ) : (
                    (facultyProfile.experience?.records || []).map((exp, idx) => (
                      <div key={idx} style={{ fontSize: "12px", marginBottom: "4px" }}>
                        • <strong>{exp.designation}</strong> at {exp.institution} ({exp.fromDate} to {exp.isCurrent ? "Present" : exp.toDate})
                      </div>
                    ))
                  )}
                </div>

                {/* 5. Bank & Statutory */}
                <div style={{ padding: "14px 18px", border: "1px solid var(--faculty-border)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>5. Bank & Statutory Information</strong>
                    <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setProfileTab("bank")}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                    <div>Bank: <strong>{facultyProfile.bank?.bankName || "—"}</strong></div>
                    <div>Account Holder: <strong>{facultyProfile.bank?.accountHolder || "—"}</strong></div>
                    <div>Account No: <strong>{maskAccount(facultyProfile.bank?.accountNumber)}</strong></div>
                    <div>IFSC: <strong>{facultyProfile.bank?.ifsc || "—"}</strong></div>
                  </div>
                </div>
              </div>

              {/* MANDATORY LEGAL DECLARATION BOX */}
              <div className="faculty-declaration-box">
                <input
                  type="checkbox"
                  id="finalDeclarationCheckbox"
                  checked={!!facultyProfile.isDeclared}
                  onChange={(e) => updateProfileSection("isDeclared", "", e.target.checked)}
                />
                <label htmlFor="finalDeclarationCheckbox" style={{ fontSize: "12px", lineHeight: "1.6", cursor: "pointer" }}>
                  <strong>Mandatory Faculty Declaration:</strong> I hereby solemnly declare and affirm that all the information, educational qualifications, previous experience records, and documents uploaded by me in this portal are true, genuine, complete, and accurate to the best of my knowledge and belief. I understand that any false statement, misrepresentation, or omission may result in immediate rejection of submission, disciplinary proceedings, or termination of appointment in accordance with PIRNAV College service regulations.
                </label>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setProfileTab("docs")}>
                  <ArrowLeft size={14} /> Back to Documents
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="faculty-btn faculty-btn-ghost" onClick={handleSaveProfileDraft}>
                    <Save size={14} /> Save Draft
                  </button>
                  <button
                    type="button"
                    className="faculty-btn faculty-btn-primary"
                    style={{ padding: "10px 24px", fontSize: "13px" }}
                    onClick={handleSubmitProfile}
                  >
                    <CheckCircle size={15} /> Submit Profile for Administrative Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: ADD / EDIT QUALIFICATION */}
        {showQualModal && (
          <div className="faculty-modal-overlay">
            <div className="faculty-modal-box">
              <div className="faculty-modal-header">
                <h3 className="faculty-modal-title">
                  {editingQualId ? "Edit Educational Qualification" : "Add Educational Qualification"}
                </h3>
                <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setShowQualModal(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleSaveQual}>
                <div className="faculty-form-grid-2" style={{ gap: "12px" }}>
                  <div className="faculty-form-group">
                    <label>Qualification Level <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <select
                      value={qualForm.level}
                      onChange={(e) => setQualForm({ ...qualForm, level: e.target.value })}
                    >
                      <option value="Post Graduation">Post Graduation (M.Sc / M.Tech / M.A)</option>
                      <option value="Graduation">Graduation (B.Sc / B.Tech / B.A)</option>
                      <option value="B.Ed">B.Ed (Bachelor of Education)</option>
                      <option value="Ph.D">Ph.D / Doctorate</option>
                      <option value="M.Phil">M.Phil</option>
                      <option value="NET / SET">CSIR / UGC NET / SET / GATE</option>
                      <option value="Intermediate / 12th">Intermediate / 12th Standard</option>
                      <option value="10th / SSC">10th / SSC</option>
                      <option value="Other Certification">Other Certification</option>
                    </select>
                  </div>
                  <div className="faculty-form-group">
                    <label>Degree / Certificate Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="text"
                      placeholder="e.g. M.Sc Pure Mathematics"
                      value={qualForm.degree}
                      onChange={(e) => setQualForm({ ...qualForm, degree: e.target.value })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>College / Institution Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="text"
                      placeholder="e.g. University College of Science"
                      value={qualForm.institution}
                      onChange={(e) => setQualForm({ ...qualForm, institution: e.target.value })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>University / Board</label>
                    <input
                      type="text"
                      placeholder="e.g. Osmania University"
                      value={qualForm.university}
                      onChange={(e) => setQualForm({ ...qualForm, university: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Specialization / Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Pure & Applied Mathematics"
                      value={qualForm.specialization}
                      onChange={(e) => setQualForm({ ...qualForm, specialization: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Year of Passing <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 2018"
                      value={qualForm.passingYear}
                      onChange={(e) => setQualForm({ ...qualForm, passingYear: e.target.value.replace(/\D/g, "") })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Score (Percentage / CGPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. 88.5% or 8.85 CGPA"
                      value={qualForm.percentage}
                      onChange={(e) => setQualForm({ ...qualForm, percentage: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Study Mode</label>
                    <select
                      value={qualForm.studyMode}
                      onChange={(e) => setQualForm({ ...qualForm, studyMode: e.target.value })}
                    >
                      <option value="Full-Time">Full-Time Regular</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Distance / Online">Distance / Correspondence</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setShowQualModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="faculty-btn faculty-btn-primary">
                    <Save size={13} /> {editingQualId ? "Update Qualification" : "Add Qualification"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT EXPERIENCE */}
        {showExpModal && (
          <div className="faculty-modal-overlay">
            <div className="faculty-modal-box">
              <div className="faculty-modal-header">
                <h3 className="faculty-modal-title">
                  {editingExpId ? "Edit Experience Record" : "Add Previous Experience Record"}
                </h3>
                <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setShowExpModal(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleSaveExp}>
                <div className="faculty-form-grid-2" style={{ gap: "12px" }}>
                  <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Institution / Organization Name <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="text"
                      placeholder="e.g. Sri Chaitanya Junior College"
                      value={expForm.institution}
                      onChange={(e) => setExpForm({ ...expForm, institution: e.target.value })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Designation / Role <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="text"
                      placeholder="e.g. Lecturer in Mathematics"
                      value={expForm.designation}
                      onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics / Sciences"
                      value={expForm.department}
                      onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>From (Month / Year) <strong style={{ color: "var(--faculty-primary)" }}>*</strong></label>
                    <input
                      type="month"
                      value={expForm.fromDate}
                      onChange={(e) => setExpForm({ ...expForm, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="faculty-form-group">
                    <label>To (Month / Year)</label>
                    <input
                      type="month"
                      disabled={expForm.isCurrent}
                      value={expForm.toDate}
                      onChange={(e) => setExpForm({ ...expForm, toDate: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Key Responsibilities & Classes Taught</label>
                    <textarea
                      rows={2}
                      placeholder="Curriculum delivery, intermediate batches mentored, exam results achieved..."
                      value={expForm.responsibilities}
                      onChange={(e) => setExpForm({ ...expForm, responsibilities: e.target.value })}
                    />
                  </div>
                  <div className="faculty-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Reason for Leaving</label>
                    <input
                      type="text"
                      placeholder="e.g. Joined PIRNAV College for career growth"
                      value={expForm.reasonForLeaving}
                      onChange={(e) => setExpForm({ ...expForm, reasonForLeaving: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setShowExpModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="faculty-btn faculty-btn-primary">
                    <Save size={13} /> {editingExpId ? "Update Record" : "Save Experience Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DOCUMENT PREVIEW */}
        {previewDoc && (
          <div className="faculty-modal-overlay" onClick={() => setPreviewDoc(null)}>
            <div className="faculty-modal-box" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
              <div className="faculty-modal-header">
                <h3 className="faculty-modal-title"><FileText size={16} /> {previewDoc.name}</h3>
                <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setPreviewDoc(null)}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: "30px 20px", background: "var(--faculty-subtle)", borderRadius: "10px", margin: "16px 0" }}>
                <FileCheck size={48} style={{ color: "var(--faculty-primary)", margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 800, fontSize: "16px" }}>{previewDoc.name}</div>
                <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "4px" }}>
                  File Size: {previewDoc.size} • Uploaded On: {previewDoc.uploadedAt} • Status: {previewDoc.status || "Verified"}
                </div>
                <div style={{ marginTop: "16px" }}>
                  <span className="faculty-badge paid">Document Authenticated</span>
                </div>
              </div>
              <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 3 — MY TIMETABLE VIEW
  // ------------------------------------------------------------------------
  const renderTimetableView = () => (
    <div>
      {renderHeader("My Timetable", "View your weekly teaching schedule.")}

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700 }}>Board:</span>
          <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "12px" }}>
            <option value="BIEAP">BIEAP</option>
            <option value="TSBIE">TSBIE</option>
            <option value="CBSE">CBSE</option>
          </select>

          <span style={{ fontSize: "12px", fontWeight: 700, marginLeft: "8px" }}>Academic Year:</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "12px" }}>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </div>

        <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>
          Total Assigned Teaching Workload: <strong>18 Hours / Week</strong>
        </div>
      </div>

      <div className="faculty-card" style={{ padding: "14px" }}>
        <div className="faculty-timetable-grid">
          <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--faculty-muted)", padding: "10px" }}>TIME</div>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div key={d} style={{ fontWeight: 800, fontSize: "12px", color: "var(--faculty-primary-dark)", padding: "10px", textAlign: "center" }}>{d}</div>
          ))}

          {mockTimetableSlots.map((row, idx) => (
            <React.Fragment key={idx}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)", padding: "10px 4px", display: "flex", alignItems: "center" }}>
                {row.time}
              </div>
              {["mon", "tue", "wed", "thu", "fri", "sat"].map((dayKey) => {
                const slot = row[dayKey];
                return (
                  <div key={dayKey} className={`faculty-timetable-cell ${slot ? "class-slot" : ""}`}>
                    {slot ? (
                      <div>
                        <strong style={{ color: "var(--faculty-primary-dark)" }}>{slot.subject}</strong>
                        <div style={{ fontSize: "11px", fontWeight: 600 }}>{slot.class} ({slot.sec})</div>
                        <div style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>{slot.room}</div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--faculty-border)", fontSize: "10px" }}>Free Slot</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 4 — MY CLASSES VIEW
  // ------------------------------------------------------------------------
  const renderClassesView = () => (
    <div>
      {renderHeader("My Classes", "Manage your assigned class sections and student rosters.")}

      <div className="faculty-form-grid-2" style={{ marginBottom: "20px" }}>
        {mockClassesList.map((cls) => (
          <div key={cls.id} className="faculty-card" style={{ marginBottom: 0 }}>
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><BookOpen size={16} /> {cls.className} ({cls.sec})</h3>
              <span className="faculty-badge active">{cls.group}</span>
            </div>
            <div className="faculty-breakdown-list" style={{ marginBottom: "14px" }}>
              <div className="faculty-breakdown-item"><span>Subject</span><strong>{cls.subject}</strong></div>
              <div className="faculty-breakdown-item"><span>Academic Level</span><span>{cls.level}</span></div>
              <div className="faculty-breakdown-item"><span>Total Students</span><strong>{cls.totalStudents} Students</strong></div>
              <div className="faculty-breakdown-item"><span>Today's Attendance</span><strong style={{ color: "var(--faculty-success)" }}>{cls.todayAttendance}</strong></div>
              <div className="faculty-breakdown-item"><span>Next Class</span><span>{cls.nextClass}</span></div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="faculty-btn faculty-btn-primary faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setSelectedClassDetail(cls)}
              >
                <Users size={12} /> View Roster
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => handleNavClick("attendance")}
              >
                <UserCheck size={12} /> Attendance
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => handleNavClick("marks")}
              >
                <ClipboardCheck size={12} /> Marks
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedClassDetail && (
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><Users size={16} /> Student Roster — {selectedClassDetail.className} ({selectedClassDetail.sec})</h3>
            <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setSelectedClassDetail(null)}>Close Roster</button>
          </div>
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Attendance %</th>
                  <th>Internal Marks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockStudentsList.map((s) => (
                  <tr key={s.rollNo}>
                    <td><strong>{s.rollNo}</strong></td>
                    <td>{s.name}</td>
                    <td><strong style={{ color: "var(--faculty-success)" }}>{s.attendancePct}</strong></td>
                    <td>{s.marks} / 50</td>
                    <td>{renderStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 5 — ATTENDANCE VIEW
  // ------------------------------------------------------------------------
  const renderAttendanceView = () => {
    const handleToggleAllPresent = () => {
      setAttendanceState((prev) => prev.map((s) => ({ ...s, status: "Present" })));
      showToast("All students marked Present.");
    };

    const handleSaveAttendance = () => {
      import('@/api/attendanceService.js').then(({ attendanceService }) => {
        const payload = attendanceState.map(s => ({
          studentId: s.studentId || 1, // Fallback if missing
          attendanceDate: attendanceDate,
          morningStatus: s.status === "Present" ? 1 : s.status === "Absent" ? 2 : 3,
          afternoonStatus: s.status === "Present" ? 1 : s.status === "Absent" ? 2 : 3,
        }));
        attendanceService.saveFacultySubjectAttendance(payload).then(() => {
          showToast("Attendance saved successfully!");
        }).catch(() => {
          showToast("Attendance saved (mock)!");
        });
      });
    };

    return (
      <div>
        {renderHeader("Student Attendance", "Mark and review attendance for your assigned classes.")}

        <div className="faculty-card" style={{ marginBottom: "16px" }}>
          <div className="faculty-form-grid-3">
            <div className="faculty-form-group">
              <label>Select Date</label>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            <div className="faculty-form-group">
              <label>Class Section</label>
              <select value={attendanceSection} onChange={(e) => setAttendanceSection(e.target.value)}>
                <option value="c1">MPC 1st Year — Section A</option>
                <option value="c2">MPC 2nd Year — Section B</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Subject</label>
              <input type="text" value="Mathematics I-A" readOnly />
            </div>
          </div>
        </div>

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><UserCheck size={16} /> Mark Attendance Roster ({attendanceDate})</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={handleToggleAllPresent} disabled={isAttendanceLoading}>Mark All Present</button>
              <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleSaveAttendance} disabled={isAttendanceLoading}>{isAttendanceLoading ? "Loading..." : "Save Attendance"}</button>
            </div>
          </div>

          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Status Toggle</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceState.map((st, idx) => (
                  <tr key={st.rollNo}>
                    <td><strong>{st.rollNo}</strong></td>
                    <td>{st.name}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {["Present", "Absent", "Late"].map((stt) => (
                          <label key={stt} style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              type="radio"
                              name={`att-${st.rollNo}`}
                              checked={st.status === stt}
                              onChange={() => {
                                const copy = [...attendanceState];
                                copy[idx].status = stt;
                                setAttendanceState(copy);
                              }}
                            />
                            <span style={{ fontWeight: st.status === stt ? 700 : 400 }}>{stt}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        style={{ padding: "3px 8px", fontSize: "12px", border: "1px solid var(--faculty-border)", borderRadius: "6px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 6 — STUDENT FEEDBACK VIEW
  // ------------------------------------------------------------------------
  const renderStudentFeedbackView = () => (
    <div>
      {renderHeader("Student Feedback", "Review student evaluation scores and anonymous feedback comments.")}

      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green">
          <div className="faculty-kpi-icon"><Award size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Overall Rating</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary-dark)" }}>4.8 / 5.0</span>
            <span className="faculty-kpi-sub">Top 5% Faculty</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><BookOpen size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Teaching Quality</span>
            <span className="faculty-kpi-value">4.9 / 5</span>
            <span className="faculty-kpi-sub">Clarity & Examples</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><Clock size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Punctuality</span>
            <span className="faculty-kpi-value">4.8 / 5</span>
            <span className="faculty-kpi-sub">Class Timing</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><Users size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Student Engagement</span>
            <span className="faculty-kpi-value">4.7 / 5</span>
            <span className="faculty-kpi-sub">Interactive Session</span>
          </div>
        </div>
      </div>

      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><MessageSquareQuote size={16} /> Recent Student Feedback Reviews</h3>
        </div>
        <div className="faculty-form-grid-2">
          {mockFeedbackData.reviews.map((rev) => (
            <div key={rev.id} style={{ padding: "14px", border: "1px solid var(--faculty-border)", borderRadius: "10px", background: "var(--faculty-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px" }}>{rev.anonymous ? "Anonymous Student" : "Student"}</strong>
                <span style={{ color: "var(--faculty-warning)", fontWeight: 700 }}>★ {rev.rating}.0 / 5.0</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--faculty-text)", margin: "0 0 8px 0" }}>"{rev.comment}"</p>
              <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>
                Category: <strong>{rev.category}</strong> • Date: {rev.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 7 — INTERNAL MARKS VIEW
  // ------------------------------------------------------------------------
  const renderInternalMarksView = () => {
    const handleMarksChange = (idx, val) => {
      const num = Number(val);
      if (num < 0 || num > 50) {
        showToast("Validation Error: Marks must be between 0 and 50.");
        return;
      }
      const copy = [...marksState];
      copy[idx].marks = num;
      setMarksState(copy);
    };

    const handleSaveMarks = () => {
      showToast("Internal Marks submitted successfully!");
    };

    return (
      <div>
        {renderHeader("Internal Marks", "Enter and submit internal test assessment marks.")}

        <div className="faculty-card" style={{ marginBottom: "16px" }}>
          <div className="faculty-form-grid-3">
            <div className="faculty-form-group">
              <label>Class & Section</label>
              <select defaultValue="MPC 1st Year Sec A">
                <option value="MPC 1st Year Sec A">MPC 1st Year — Sec A</option>
                <option value="MPC 2nd Year Sec B">MPC 2nd Year — Sec B</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Assessment Type</label>
              <select defaultValue="Unit Test 2">
                <option value="Unit Test 1">Unit Test 1</option>
                <option value="Unit Test 2">Unit Test 2</option>
                <option value="Mid Term">Mid Term Exam</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Max Marks</label>
              <input type="number" value={50} readOnly />
            </div>
          </div>
        </div>

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><ClipboardCheck size={16} /> Unit Test 2 Marks Entry (Max 50)</h3>
            <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleSaveMarks}>
              Submit Marks
            </button>
          </div>

          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Max Marks</th>
                  <th>Marks Obtained</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {marksState.map((st, idx) => (
                  <tr key={st.rollNo}>
                    <td><strong>{st.rollNo}</strong></td>
                    <td>{st.name}</td>
                    <td>50</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={st.marks}
                        onChange={(e) => handleMarksChange(idx, e.target.value)}
                        style={{ width: "80px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "13px", fontWeight: 700 }}
                      />
                    </td>
                    <td><strong>{Math.round((st.marks / 50) * 100)}%</strong></td>
                    <td>{renderStatusBadge(st.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 8 — EXAM DUTIES VIEW
  // ------------------------------------------------------------------------
  const renderExamDutiesView = () => {
    const handleConfirmDuty = (dutyId) => {
      setExamDutiesState((prev) =>
        prev.map((d) => (d.id === dutyId ? { ...d, status: "Confirmed" } : d))
      );
      showToast("Exam Duty confirmed successfully!");
    };

    return (
      <div>
        {renderHeader("Exam Duties", "Review assigned invigilation and evaluation duties.")}

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><GraduationCap size={16} /> Assigned Examination Duties</h3>
          </div>
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Venue</th>
                  <th>Duty Type</th>
                  <th>Reporting</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {examDutiesState.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.exam}</strong></td>
                    <td>{d.date}</td>
                    <td>{d.time}</td>
                    <td>{d.venue}</td>
                    <td><span className="faculty-badge active">{d.type}</span></td>
                    <td>{d.reportingTime}</td>
                    <td>{renderStatusBadge(d.status)}</td>
                    <td>
                      {d.status === "Pending" ? (
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-primary faculty-btn-sm"
                          onClick={() => handleConfirmDuty(d.id)}
                        >
                          Confirm Duty
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Confirmed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 9 — SALARY DETAILS VIEW
  // ------------------------------------------------------------------------
  const renderSalaryDetailsView = () => (
    <div>
      {renderHeader("Salary Details", "View your salary structure, monthly earnings and statutory deductions.")}

      {/* STRUCTURE HEADER BANNER */}
      <div className="faculty-card" style={{ background: "var(--faculty-subtle)", borderLeft: "4px solid var(--faculty-primary)" }}>
        <div className="faculty-form-grid-3">
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Current Structure</span><div><strong>Junior Lecturer Structure Grade A</strong></div></div>
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Effective From</span><div><strong>01 Apr 2025</strong></div></div>
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Payment Mode</span><div><strong>Bank Transfer (SBI)</strong></div></div>
        </div>
      </div>

      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green">
          <div className="faculty-kpi-icon"><Wallet size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Basic Pay</span>
            <span className="faculty-kpi-value">₹52,000</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><DollarSign size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Gross Salary</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><TrendingUp size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Total Deductions</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-danger)" }}>₹13,740</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-blue">
          <div className="faculty-kpi-icon"><CheckCircle size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Net Salary</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-success)" }}>₹58,460</span>
          </div>
        </div>
      </div>

      <div className="faculty-form-grid-2">
        {/* EARNINGS */}
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title" style={{ color: "var(--faculty-primary)" }}>Full Monthly Earnings</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item"><span>Basic Pay</span><strong>₹52,000</strong></div>
            <div className="faculty-breakdown-item"><span>HRA (House Rent Allowance)</span><span>₹10,400</span></div>
            <div className="faculty-breakdown-item"><span>Dearness Allowance (DA)</span><span>₹5,200</span></div>
            <div className="faculty-breakdown-item"><span>Academic / Research Allowance</span><span>₹3,000</span></div>
            <div className="faculty-breakdown-item"><span>Transport Allowance</span><span>₹1,600</span></div>
            <div className="faculty-breakdown-item"><span>Other Allowances</span><span>₹1,000</span></div>
            <div className="faculty-breakdown-item total"><span>Gross Earnings</span><strong style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</strong></div>
          </div>
        </div>

        {/* DEDUCTIONS */}
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title" style={{ color: "var(--faculty-danger)" }}>Full Monthly Deductions</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item"><span>Provident Fund (PF @ 12%)</span><span>₹6,240</span></div>
            <div className="faculty-breakdown-item"><span>Professional Tax (PT)</span><span>₹200</span></div>
            <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
            <div className="faculty-breakdown-item"><span>Group Insurance</span><span>₹500</span></div>
            <div className="faculty-breakdown-item"><span>Loss of Pay (1 Day)</span><span>₹2,000</span></div>
            <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹1,000</span></div>
            <div className="faculty-breakdown-item total"><span>Total Deductions</span><strong style={{ color: "var(--faculty-danger)" }}>₹13,740</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 10 — PAYSLIPS VIEW & PREVIEW
  // ------------------------------------------------------------------------
  const renderPayslipsView = () => {
    if (selectedPayslip) {
      return (
        <div>
          <button
            type="button"
            className="faculty-btn faculty-btn-ghost"
            style={{ marginBottom: "16px" }}
            onClick={() => setSelectedPayslip(null)}
          >
            <ArrowLeft size={14} /> Back to All Payslips
          </button>

          <div className="faculty-payslip-paper">
            <div className="faculty-payslip-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "var(--faculty-primary-dark)" }}>PIRNAV COLLEGE MANAGEMENT SYSTEM</h2>
                <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Official Monthly Faculty Salary Voucher</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-primary)" }}>SALARY SLIP</div>
                <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Period: {selectedPayslip.month}</div>
              </div>
            </div>

            <div className="faculty-form-grid-3" style={{ background: "var(--faculty-subtle)", padding: "12px", borderRadius: "10px", marginBottom: "20px" }}>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employee Name</span><div><strong>{mockFaculty.fullName}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employee ID</span><div><strong>{mockFaculty.employeeId}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Designation</span><div><strong>{mockFaculty.designation}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Department</span><div><strong>{mockFaculty.department}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Bank Account</span><div><strong>{mockFaculty.accountMasked}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Txn Reference</span><div><strong>{selectedPayslip.txnRef}</strong></div></div>
            </div>

            <div className="faculty-form-grid-2">
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--faculty-primary)", marginBottom: "8px" }}>Earnings</div>
                <div className="faculty-breakdown-list">
                  <div className="faculty-breakdown-item"><span>Basic Pay</span><span>₹52,000</span></div>
                  <div className="faculty-breakdown-item"><span>HRA</span><span>₹10,400</span></div>
                  <div className="faculty-breakdown-item"><span>DA</span><span>₹5,200</span></div>
                  <div className="faculty-breakdown-item"><span>Allowances</span><span>₹5,600</span></div>
                  <div className="faculty-breakdown-item total"><span>Gross Earnings</span><strong>₹{selectedPayslip.grossSalary.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--faculty-danger)", marginBottom: "8px" }}>Deductions</div>
                <div className="faculty-breakdown-list">
                  <div className="faculty-breakdown-item"><span>PF Contribution</span><span>₹6,240</span></div>
                  <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
                  <div className="faculty-breakdown-item"><span>PT & Insurance</span><span>₹700</span></div>
                  <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹3,000</span></div>
                  <div className="faculty-breakdown-item total"><span>Total Deductions</span><strong style={{ color: "var(--faculty-danger)" }}>₹{selectedPayslip.totalDeductions.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px solid var(--faculty-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)", textTransform: "uppercase" }}>NET AMOUNT REMITTED</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--faculty-success)" }}>₹{selectedPayslip.netSalary.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Fifty Eight Thousand Four Hundred Sixty Rupees Only</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderHeader("My Payslips", "View, print and download monthly payslips.")}

        <div className="faculty-card">
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockPayslips.map((ps) => (
                  <tr key={ps.id}>
                    <td><strong>{ps.month}</strong></td>
                    <td>₹{ps.grossSalary.toLocaleString("en-IN")}</td>
                    <td style={{ color: "var(--faculty-danger)" }}>₹{ps.totalDeductions.toLocaleString("en-IN")}</td>
                    <td><strong style={{ color: "var(--faculty-success)" }}>₹{ps.netSalary.toLocaleString("en-IN")}</strong></td>
                    <td>{ps.paymentDate}</td>
                    <td>{renderStatusBadge(ps.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-primary faculty-btn-sm"
                          onClick={() => setSelectedPayslip(ps)}
                        >
                          <Eye size={12} /> View Slip
                        </button>
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                          onClick={() => showToast(`Downloaded ${ps.month} Payslip PDF!`)}
                        >
                          <Download size={12} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 11 — LEAVE REQUESTS VIEW
  // ------------------------------------------------------------------------
  const renderLeaveRequestsView = () => {
    const handleLeaveSubmit = (e) => {
      e.preventDefault();
      if (!leaveForm.reason.trim()) {
        showToast("Please enter a reason for leave application.");
        return;
      }
      const start = new Date(`${leaveForm.from}T00:00:00`);
      const end = new Date(`${leaveForm.to}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        showToast("Choose a valid leave date range.");
        return;
      }
      const requestedDays = Math.floor((end - start) / 86400000) + 1;
      const newLeave = submitLeaveRequest({
        staffId: mockFaculty.employeeId,
        staffName: mockFaculty.fullName,
        department: mockFaculty.department,
        staffType: "Teaching Staff",
        leaveType: leaveForm.type.replace(/ \([A-Z]+\)/, ""),
        fromDate: leaveForm.from,
        toDate: leaveForm.to,
        days: requestedDays,
        reason: leaveForm.reason,
      });
      setLeavesState((current) => [newLeave, ...current]);
      showToast("Leave request submitted successfully!");
      setLeaveForm({ ...leaveForm, reason: "" });
    };

    return (
      <div>
        {renderHeader("Leave Requests", "Apply for leave and track approval status.")}

        <div className="faculty-kpi-grid">
          <div className="faculty-kpi-card tint-green">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Casual Leave (CL)</span>
              <span className="faculty-kpi-value">4 / 8 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-blue">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Sick Leave (SL)</span>
              <span className="faculty-kpi-value">3 / 6 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-orange">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Earned Leave (EL)</span>
              <span className="faculty-kpi-value">1 / 4 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-purple">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Loss of Pay (LOP)</span>
              <span className="faculty-kpi-value">1 Day</span>
            </div>
          </div>
        </div>

        <div className="faculty-form-grid-2">
          {/* LEAVE FORM */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><CalendarOff size={16} /> Apply New Leave</h3>
            </div>
            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="faculty-form-group">
                <label>Leave Type *</label>
                <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                  <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                  <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                  <option value="Earned Leave (EL)">Earned Leave (EL)</option>
                </select>
              </div>

              <div className="faculty-form-grid-2">
                <div className="faculty-form-group">
                  <label>From Date *</label>
                  <input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })} />
                </div>
                <div className="faculty-form-group">
                  <label>To Date *</label>
                  <input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })} />
                </div>
              </div>

              <div className="faculty-form-group">
                <label>Reason *</label>
                <textarea
                  rows="3"
                  placeholder="Enter reason for leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>

              <button type="submit" className="faculty-btn faculty-btn-primary">
                Submit Leave Application
              </button>
            </form>
          </div>

          {/* LEAVE HISTORY TABLE */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><Clock size={16} /> Leave History & Approvals</h3>
            </div>
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesState.map((l) => (
                    <tr key={l.id}>
                      <td><strong>{l.leaveType}</strong></td>
                      <td>{l.fromDate}</td>
                      <td>{l.days} Day(s)</td>
                      <td>{renderStatusBadge(l.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 12 — REIMBURSEMENTS VIEW
  // ------------------------------------------------------------------------
  const renderReimbursementsView = () => {
    const handleReimbSubmit = (e) => {
      e.preventDefault();
      if (!reimbForm.amount) return;
      const newClaim = {
        id: `r-${Date.now()}`,
        claimId: `CLM${Math.floor(100000 + Math.random() * 900000)}`,
        type: reimbForm.type,
        claimAmount: Number(reimbForm.amount),
        approvedAmount: Number(reimbForm.amount),
        date: "Today",
        status: "Pending",
        month: "May 2025",
      };
      setReimbursementsState([newClaim, ...reimbursementsState]);
      showToast("Reimbursement claim submitted!");
      setReimbForm({ ...reimbForm, amount: 1500, desc: "" });
    };

    return (
      <div>
        {renderHeader("Reimbursements", "Apply for expense claims and view settlement history.")}

        <div className="faculty-form-grid-2">
          {/* CLAIM FORM */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><Receipt size={16} /> Apply for Reimbursement</h3>
            </div>
            <form onSubmit={handleReimbSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="faculty-form-group">
                <label>Reimbursement Category *</label>
                <select value={reimbForm.type} onChange={(e) => setReimbForm({ ...reimbForm, type: e.target.value })}>
                  <option value="Books & Journals">Books & Journals</option>
                  <option value="Academic Conference">Academic Conference</option>
                  <option value="Official Travel / Fuel">Official Travel / Fuel</option>
                  <option value="Internet Allowance">Internet Allowance</option>
                </select>
              </div>

              <div className="faculty-form-group">
                <label>Claim Amount (₹) *</label>
                <input
                  type="number"
                  value={reimbForm.amount}
                  onChange={(e) => setReimbForm({ ...reimbForm, amount: e.target.value })}
                />
              </div>

              <div className="faculty-form-group">
                <label>Description & Purpose</label>
                <textarea
                  rows="2"
                  placeholder="Enter details of expense..."
                  value={reimbForm.desc}
                  onChange={(e) => setReimbForm({ ...reimbForm, desc: e.target.value })}
                />
              </div>

              <button type="submit" className="faculty-btn faculty-btn-primary">
                Submit Reimbursement Claim
              </button>
            </form>
          </div>

          {/* CLAIM HISTORY TABLE */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><FileText size={16} /> Reimbursement Claims History</h3>
            </div>
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursementsState.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.claimId}</strong></td>
                      <td>{r.type}</td>
                      <td>₹{r.claimAmount.toLocaleString("en-IN")}</td>
                      <td>{renderStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 13 — NOTICES VIEW
  // ------------------------------------------------------------------------
  const renderNoticesView = () => (
    <div>
      {renderHeader("College Notices", "Official announcements and circulars.")}

      <div className="faculty-form-grid-2">
        {mockNoticesList.map((n) => (
          <div key={n.id} className="faculty-card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span className="faculty-badge active">{n.category}</span>
              <span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>{n.date}</span>
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px 0", color: "var(--faculty-text)" }}>{n.title}</h3>
            <p style={{ fontSize: "12px", color: "var(--faculty-muted)", margin: "0 0 10px 0", lineHeight: 1.5 }}>{n.desc}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span>Posted by: <strong>{n.postedBy}</strong></span>
              <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => showToast(`Opening Notice: ${n.title}`)}>
                Read Circular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 14 — MESSAGES VIEW
  // ------------------------------------------------------------------------
  const renderMessagesView = () => {
    const handleSendMessage = (e) => {
      e.preventDefault();
      if (!newMessageText.trim()) return;
      const newMsg = {
        id: `m-${Date.now()}`,
        sender: "Ravi Kumar",
        text: newMessageText,
        time: "Just now",
        self: true,
      };
      setMessagesState([...messagesState, newMsg]);
      setNewMessageText("");
    };

    return (
      <div>
        {renderHeader("Faculty Messages", "Internal communication with HOD and administration.")}

        <div className="faculty-card" style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr", height: "500px" }}>
          {/* CONVERSATION LIST */}
          <div style={{ borderRight: "1px solid var(--faculty-border)", background: "var(--faculty-subtle)" }}>
            <div style={{ padding: "14px", fontWeight: 800, borderBottom: "1px solid var(--faculty-border)", fontSize: "13px" }}>
              Conversations
            </div>
            <div>
              {mockConversationsList.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--faculty-border)",
                    background: i === 0 ? "var(--faculty-surface)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <strong style={{ fontSize: "13px" }}>{c.name}</strong>
                    <span style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--faculty-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.lastMsg}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHAT MESSAGES */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "14px", borderBottom: "1px solid var(--faculty-border)", fontWeight: 800, fontSize: "13px" }}>
              Chat with HOD - Mathematics
            </div>
            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {messagesState.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.self ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                    background: m.self ? "var(--faculty-primary)" : "var(--faculty-subtle)",
                    color: m.self ? "#ffffff" : "var(--faculty-text)",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                >
                  <div>{m.text}</div>
                  <div style={{ fontSize: "10px", opacity: 0.8, textAlign: "right", marginTop: "4px" }}>{m.time}</div>
                </div>
              ))}
            </div>

            {/* COMPOSER */}
            <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid var(--faculty-border)", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--faculty-border)", fontSize: "13px" }}
              />
              <button type="submit" className="faculty-btn faculty-btn-primary">
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // RENDER DYNAMIC MODULE CONTENT
  // ------------------------------------------------------------------------
  const renderModuleContent = () => {
    switch (activeModule) {
      case "dashboard": return renderDashboardView();
      case "profile": return renderProfileView();
      case "timetable": return renderTimetableView();
      case "classes": return renderClassesView();
      case "attendance": return renderAttendanceView();
      case "feedback": return renderStudentFeedbackView();
      case "marks": return renderInternalMarksView();
      case "exam-duties": return renderExamDutiesView();
      case "salary": return renderSalaryDetailsView();
      case "payslips": return renderPayslipsView();
      case "leave": return renderLeaveRequestsView();
      case "reimbursements": return renderReimbursementsView();
      case "notices": return renderNoticesView();
      case "messages": return renderMessagesView();
      default: return renderDashboardView();
    }
  };

  // ------------------------------------------------------------------------
  // MAIN RETURN JSX
  // ------------------------------------------------------------------------
  return (
    <div className={`faculty-dashboard ${isDarkMode ? "is-dark" : ""}`}>
      <div className="faculty-shell">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`faculty-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="faculty-sidebar-header">
            <div className="faculty-logo-icon">P</div>
            <div className="faculty-logo-text">
              <span className="faculty-logo-title">PIRNAV</span>
              <span className="faculty-logo-sub">Faculty Portal</span>
            </div>
          </div>

          <div className="faculty-sidebar-nav">
            <div>
              <div className="faculty-nav-group-title">Faculty Portal</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "dashboard" ? "active" : ""}`} onClick={() => handleNavClick("dashboard")}>
                    <LayoutDashboard size={16} /> Dashboard
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "profile" ? "active" : ""}`} onClick={() => handleNavClick("profile")}>
                    <User size={16} /> My Profile
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Academics</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "timetable" ? "active" : ""}`} onClick={() => handleNavClick("timetable")}>
                    <Calendar size={16} /> My Timetable
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "classes" ? "active" : ""}`} onClick={() => handleNavClick("classes")}>
                    <BookOpen size={16} /> My Classes
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "attendance" ? "active" : ""}`} onClick={() => handleNavClick("attendance")}>
                    <UserCheck size={16} /> Attendance
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "feedback" ? "active" : ""}`} onClick={() => handleNavClick("feedback")}>
                    <MessageSquareQuote size={16} /> Student Feedback
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Exam & Marks</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "marks" ? "active" : ""}`} onClick={() => handleNavClick("marks")}>
                    <ClipboardCheck size={16} /> Internal Marks
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "exam-duties" ? "active" : ""}`} onClick={() => handleNavClick("exam-duties")}>
                    <GraduationCap size={16} /> Exam Duties
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Payroll & Salary</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "salary" ? "active" : ""}`} onClick={() => handleNavClick("salary")}>
                    <Wallet size={16} /> Salary Details
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "payslips" ? "active" : ""}`} onClick={() => handleNavClick("payslips")}>
                    <FileText size={16} /> Payslips
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Requests</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "leave" ? "active" : ""}`} onClick={() => handleNavClick("leave")}>
                    <CalendarOff size={16} /> Leave Requests
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "reimbursements" ? "active" : ""}`} onClick={() => handleNavClick("reimbursements")}>
                    <Receipt size={16} /> Reimbursements
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Communication</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "notices" ? "active" : ""}`} onClick={() => handleNavClick("notices")}>
                    <Bell size={16} /> Notices
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "messages" ? "active" : ""}`} onClick={() => handleNavClick("messages")}>
                    <Send size={16} /> Messages
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="faculty-sidebar-footer">
            <button className="faculty-nav-btn" style={{ color: "var(--faculty-danger)" }} onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <div className="faculty-main">
          {/* TOP NAVBAR */}
          <header className="faculty-navbar">
            <div className="faculty-nav-left">
              <button type="button" className="faculty-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
              </button>

              <div className="faculty-search-box">
                <Search3DIcon size={15} />
                <input
                  type="text"
                  placeholder="Search classes, students, notices, payslips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="faculty-nav-right">
              {/* BOARD SELECTOR */}
              <div className="faculty-select-pill">
                <span>Board:</span>
                <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)}>
                  <option value="BIEAP">BIEAP</option>
                  <option value="TSBIE">TSBIE</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="NIOS">NIOS</option>
                </select>
              </div>

              {/* ACADEMIC YEAR SELECTOR */}
              <div className="faculty-select-pill">
                <span>Year:</span>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              {/* DARK MODE TOGGLE */}
              <button
                type="button"
                className="faculty-icon-btn"
                title="Toggle Dark Mode"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* NOTIFICATION BELL */}
              <button
                type="button"
                className="faculty-icon-btn"
                title="Notifications"
                onClick={() => handleNavClick("notices")}
              >
                <Bell size={17} />
                <span className="faculty-badge-dot" />
              </button>

              {/* FACULTY PROFILE DROPDOWN */}
              <div style={{ position: "relative" }}>
                <div className="faculty-user-menu" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                  <div className="faculty-avatar">
                    {facultyProfile.personal?.photoUrl ? (
                      <img src={facultyProfile.personal.photoUrl} alt="User" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
                    ) : (
                      (facultyProfile.baseline?.fullName || "Ravi Kumar").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="faculty-user-info">
                    <span className="faculty-user-name">{facultyProfile.baseline?.fullName || mockFaculty.fullName}</span>
                    <span className="faculty-user-role">{facultyProfile.baseline?.designation || mockFaculty.designation}</span>
                  </div>
                  <ChevronDown size={14} style={{ color: "var(--faculty-muted)", marginLeft: "2px" }} />
                </div>

                {isProfileDropdownOpen && (
                  <div className="faculty-user-dropdown-menu">
                    <div className="faculty-dropdown-header">
                      <div className="faculty-avatar" style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                        {(facultyProfile.baseline?.fullName || "Ravi Kumar").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{facultyProfile.baseline?.fullName || mockFaculty.fullName}</div>
                        <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>{facultyProfile.baseline?.primaryEmail || mockFaculty.email}</div>
                      </div>
                    </div>
                    <div className="faculty-dropdown-divider" />
                    <button
                      type="button"
                      className="faculty-dropdown-item"
                      onClick={() => handleNavClick("profile")}
                    >
                      <User size={14} /> My Profile
                    </button>
                    <button
                      type="button"
                      className="faculty-dropdown-item"
                      onClick={() => handleNavClick("profile")}
                    >
                      <Layers size={14} /> Account Settings
                    </button>
                    <div className="faculty-dropdown-divider" />
                    <button
                      type="button"
                      className="faculty-dropdown-item danger"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN PAGE CONTENT */}
          <main className="faculty-content">
            {renderModuleContent()}
          </main>
        </div>
      </div>

      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--faculty-text)",
          color: "var(--faculty-surface)",
          padding: "12px 18px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle size={16} style={{ color: "var(--faculty-primary)" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;

