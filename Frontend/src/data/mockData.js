// Static mock data for the College Management System.
// Replace these arrays with API calls later - component structure stays the same.

export const boards = [
  { id: 1, name: "Central Board of Secondary Education", code: "CBSE", country: "India", state: "Delhi", structure: "10+2", status: "Active", created: "2023-04-12", pattern: "Semester", passPercentage: "35", grading: "Grade Points" },
  { id: 2, name: "Board of Intermediate Education AP", code: "BIEAP", country: "India", state: "Andhra Pradesh", structure: "Intermediate", status: "Active", created: "2023-05-02", pattern: "Annual", passPercentage: "35", grading: "Percentage" },
  { id: 3, name: "Telangana State Board of Intermediate", code: "TSBIE", country: "India", state: "Telangana", structure: "Intermediate", status: "Active", created: "2023-06-19", pattern: "Annual", passPercentage: "35", grading: "Percentage" },
  { id: 4, name: "Indian School Certificate Examination", code: "CISCE", country: "India", state: "West Bengal", structure: "10+2", status: "Inactive", created: "2022-11-08", pattern: "Semester", passPercentage: "40", grading: "Grade Points" },
  { id: 5, name: "Maharashtra State Board", code: "MSBSHSE", country: "India", state: "Maharashtra", structure: "Higher Secondary", status: "Active", created: "2024-01-21", pattern: "Annual", passPercentage: "35", grading: "Percentage" },
  { id: 6, name: "Karnataka PU Board", code: "KSEAB", country: "India", state: "Karnataka", structure: "PUC", status: "Active", created: "2024-02-15", pattern: "Annual", passPercentage: "35", grading: "Grade Points" },
];

export const academicYears = [
  { id: 1, name: "2024-2025", start: "2024-06-01", end: "2025-04-30", admissionStart: "2024-04-01", admissionEnd: "2024-07-15", status: "Active" },
  { id: 2, name: "2023-2024", start: "2023-06-01", end: "2024-04-30", admissionStart: "2023-04-01", admissionEnd: "2023-07-15", status: "Inactive" },
  { id: 3, name: "2022-2023", start: "2022-06-01", end: "2023-04-30", admissionStart: "2022-04-01", admissionEnd: "2022-07-10", status: "Inactive" },
  { id: 4, name: "2025-2026", start: "2025-06-01", end: "2026-04-30", admissionStart: "2025-03-25", admissionEnd: "2025-07-20", status: "Active" },
];

export const courses = [
  { id: 1, name: "MPC - Maths Physics Chemistry", code: "MPC", board: "BIEAP", level: "1st Year", subjects: 6, status: "Active" },
  { id: 2, name: "BiPC - Biology Physics Chemistry", code: "BIPC", board: "BIEAP", level: "1st Year", subjects: 6, status: "Active" },
  { id: 3, name: "CEC - Civics Economics Commerce", code: "CEC", board: "TSBIE", level: "2nd Year", subjects: 5, status: "Active" },
  { id: 4, name: "MEC - Maths Economics Commerce", code: "MEC", board: "TSBIE", level: "1st Year", subjects: 5, status: "Inactive" },
  { id: 5, name: "Science Stream", code: "SCI", board: "CBSE", level: "Class XI", subjects: 7, status: "Active" },
  { id: 6, name: "Commerce Stream", code: "COM", board: "CBSE", level: "Class XII", subjects: 6, status: "Active" },
];

export const subjects = [
  { id: 1, name: "Mathematics IA", code: "MAT1A", group: "MPC", level: "1st Year", type: "Theory", max: 75, pass: 26, status: "Active" },
  { id: 2, name: "Physics", code: "PHY1", group: "MPC", level: "1st Year", type: "Theory + Practical", max: 60, pass: 21, status: "Active" },
  { id: 3, name: "Chemistry", code: "CHE1", group: "BIPC", level: "1st Year", type: "Theory + Practical", max: 60, pass: 21, status: "Active" },
  { id: 4, name: "Botany", code: "BOT1", group: "BIPC", level: "1st Year", type: "Theory + Practical", max: 60, pass: 21, status: "Active" },
  { id: 5, name: "English", code: "ENG1", group: "All Groups", level: "1st Year", type: "Language", max: 100, pass: 35, status: "Active" },
  { id: 6, name: "Economics", code: "ECO2", group: "MEC", level: "2nd Year", type: "Theory", max: 100, pass: 35, status: "Inactive" },
  { id: 7, name: "Computer Science", code: "CSC2", group: "MPC", level: "2nd Year", type: "Elective", max: 100, pass: 35, status: "Active" },
];

export const sections = [
  { id: 1, name: "Section A", group: "MPC", level: "1st Year", room: "R-101", teacher: "Dr. Anitha Rao", strength: 60, status: "Active" },
  { id: 2, name: "Section B", group: "MPC", level: "1st Year", room: "R-102", teacher: "Mr. Suresh Kumar", strength: 60, status: "Active" },
  { id: 3, name: "Section A", group: "BIPC", level: "2nd Year", room: "R-201", teacher: "Mrs. Lakshmi Devi", strength: 55, status: "Active" },
  { id: 4, name: "Section C", group: "CEC", level: "1st Year", room: "R-105", teacher: "Mr. Ravi Teja", strength: 50, status: "Inactive" },
];

export const faculty = [
  { id: 1, empId: "EMP-1001", name: "Dr. Anitha Rao", mobile: "9848012345", email: "anitha.rao@college.edu", department: "Mathematics", designation: "Professor", qualification: "Ph.D", status: "Active" },
  { id: 2, empId: "EMP-1002", name: "Mr. Suresh Kumar", mobile: "9848023456", email: "suresh.k@college.edu", department: "Physics", designation: "Senior Lecturer", qualification: "M.Sc", status: "Active" },
  { id: 3, empId: "EMP-1003", name: "Mrs. Lakshmi Devi", mobile: "9848034567", email: "lakshmi.d@college.edu", department: "Chemistry", designation: "Lecturer", qualification: "M.Sc, B.Ed", status: "Active" },
  { id: 4, empId: "EMP-1004", name: "Mr. Ravi Teja", mobile: "9848045678", email: "ravi.teja@college.edu", department: "Commerce", designation: "Lecturer", qualification: "M.Com", status: "Inactive" },
  { id: 5, empId: "EMP-1005", name: "Ms. Priya Sharma", mobile: "9848056789", email: "priya.s@college.edu", department: "English", designation: "Assistant Professor", qualification: "M.A, NET", status: "Active" },
  { id: 6, empId: "EMP-1006", name: "Dr. Karthik Nair", mobile: "9848067890", email: "karthik.n@college.edu", department: "Biology", designation: "Professor", qualification: "Ph.D", status: "Active" },
];

export const facultyAllocations = [
  { id: 1, faculty: "Dr. Anitha Rao", board: "BIEAP", year: "2024-2025", group: "MPC", level: "1st Year", section: "Section A", subject: "Mathematics IA", status: "Active" },
  { id: 2, faculty: "Mr. Suresh Kumar", board: "BIEAP", year: "2024-2025", group: "MPC", level: "1st Year", section: "Section B", subject: "Physics", status: "Active" },
  { id: 3, faculty: "Mrs. Lakshmi Devi", board: "TSBIE", year: "2024-2025", group: "BIPC", level: "2nd Year", section: "Section A", subject: "Chemistry", status: "Active" },
  { id: 4, faculty: "Ms. Priya Sharma", board: "CBSE", year: "2024-2025", group: "SCI", level: "Class XI", section: "Section A", subject: "English", status: "Inactive" },
];

export const students = [
  { id: 1, admissionNo: "ADM-2024-001", name: "Aarav Reddy", roll: "24MPC001", group: "MPC", level: "1st Year", section: "A", gender: "Male", father: "Mahesh Reddy", mobile: "9000012345", status: "Active", attendance: 94, fee: "Paid", percentage: 88 },
  { id: 2, admissionNo: "ADM-2024-002", name: "Diya Sharma", roll: "24MPC002", group: "MPC", level: "1st Year", section: "A", gender: "Female", father: "Rakesh Sharma", mobile: "9000023456", status: "Active", attendance: 91, fee: "Partial", percentage: 92 },
  { id: 3, admissionNo: "ADM-2024-003", name: "Vihaan Patel", roll: "24BPC001", group: "BIPC", level: "1st Year", section: "B", gender: "Male", father: "Nirav Patel", mobile: "9000034567", status: "Active", attendance: 87, fee: "Paid", percentage: 79 },
  { id: 4, admissionNo: "ADM-2023-041", name: "Ananya Iyer", roll: "23CEC010", group: "CEC", level: "2nd Year", section: "C", gender: "Female", father: "Sundar Iyer", mobile: "9000045678", status: "Inactive", attendance: 68, fee: "Due", percentage: 61 },
  { id: 5, admissionNo: "ADM-2024-004", name: "Ishaan Verma", roll: "24MPC003", group: "MPC", level: "1st Year", section: "A", gender: "Male", father: "Alok Verma", mobile: "9000056789", status: "Active", attendance: 96, fee: "Paid", percentage: 95 },
  { id: 6, admissionNo: "ADM-2024-005", name: "Saanvi Nair", roll: "24BPC002", group: "BIPC", level: "1st Year", section: "B", gender: "Female", father: "Gopal Nair", mobile: "9000067890", status: "Active", attendance: 89, fee: "Partial", percentage: 84 },
  { id: 7, admissionNo: "ADM-2023-058", name: "Arjun Menon", roll: "23MEC021", group: "MEC", level: "2nd Year", section: "A", gender: "Male", father: "Rajan Menon", mobile: "9000078901", status: "Active", attendance: 77, fee: "Due", percentage: 70 },
  { id: 8, admissionNo: "ADM-2024-006", name: "Meera Joshi", roll: "24MPC004", group: "MPC", level: "1st Year", section: "A", gender: "Female", father: "Vinay Joshi", mobile: "9000089012", status: "Active", attendance: 93, fee: "Paid", percentage: 90 },
];

// Certificate fixtures keep the certificate screens testable when the API is
// unavailable. IDs are deliberately prefixed so UI-only workflow transitions
// never get sent to the backend.
export const certificates = [
  { id: "mock-cert-001", certificateNo: "CERT-2026-001", studentId: 1, admissionNo: "ADM-2024-001", studentName: "Aarav Reddy", group: "MPC", level: "1st Year", academicYear: "2025-2026", certificateType: "Bonafide Certificate", purpose: "Scholarship application", requestDate: "2026-08-12", issueDate: "2026-08-12", status: "Generated", remarks: "Demo record ready for review" },
  { id: "mock-cert-002", certificateNo: "CERT-2026-002", studentId: 2, admissionNo: "ADM-2024-002", studentName: "Diya Sharma", group: "MPC", level: "1st Year", academicYear: "2025-2026", certificateType: "Study Certificate", purpose: "Education loan documentation", requestDate: "2026-08-11", issueDate: "2026-08-11", status: "Reviewed", remarks: "Demo record ready for approval" },
  { id: "mock-cert-003", certificateNo: "CERT-2026-003", studentId: 3, admissionNo: "ADM-2024-003", studentName: "Vihaan Patel", group: "BIPC", level: "1st Year", academicYear: "2025-2026", certificateType: "Conduct Certificate", purpose: "University admission", requestDate: "2026-08-10", issueDate: "2026-08-10", status: "Approved", remarks: "Demo record ready to issue" },
  { id: "mock-cert-004", certificateNo: "CERT-2026-004", studentId: 5, admissionNo: "ADM-2024-004", studentName: "Ishaan Verma", group: "MPC", level: "1st Year", academicYear: "2025-2026", certificateType: "Sports Participation Certificate", purpose: "District sports registration", requestDate: "2026-08-09", issueDate: "2026-08-09", status: "Issued", remarks: "Example certificate created through the Other flow" },
];

export const admissions = [
  { id: 1, admissionNo: "ADM-2024-006", name: "Meera Joshi", group: "MPC", date: "2024-06-18", quota: "Merit", status: "Active" },
  { id: 2, admissionNo: "ADM-2024-005", name: "Saanvi Nair", group: "BIPC", date: "2024-06-15", quota: "Management", status: "Active" },
  { id: 3, admissionNo: "ADM-2024-004", name: "Ishaan Verma", group: "MPC", date: "2024-06-12", quota: "Merit", status: "Active" },
  { id: 4, admissionNo: "ADM-2024-003", name: "Vihaan Patel", group: "BIPC", date: "2024-06-10", quota: "Sports", status: "Inactive" },
];

export const assignments = [
  { id: 1, title: "Integration Practice Set", academicYear: "2025-2026", academicLevel: "First Year", group: "MPC", subject: "Mathematics IA", faculty: "Dr. Anitha Rao", due: "2025-01-20", attachment: "integration-practice.pdf", max: 25, description: "Practice problems covering integration methods." },
  { id: 2, title: "Semiconductor Physics Report", academicYear: "2025-2026", academicLevel: "First Year", group: "MPC", subject: "Physics", faculty: "Mr. Suresh Kumar", due: "2025-01-25", attachment: "semiconductor-report.docx", max: 20, description: "Submit a short report on semiconductor applications." },
  { id: 3, title: "Organic Chemistry Worksheet", academicYear: "2025-2026", academicLevel: "First Year", group: "BiPC", subject: "Chemistry", faculty: "Mrs. Lakshmi Devi", due: "2025-01-18", attachment: "organic-worksheet.pdf", max: 15, description: "Worksheet for organic chemistry fundamentals." },
  { id: 4, title: "Essay: Modern Literature", academicYear: "2024-2025", academicLevel: "Second Year", group: "CEC", subject: "English", faculty: "Ms. Priya Sharma", due: "2025-02-02", attachment: "", max: 10, description: "Write an essay on modern literature themes." },
];

export const examinations = [
  { id: 1, name: "Quarterly Examination 2024", board: "BIEAP", year: "2024-2025", level: "1st Year", group: "MPC", type: "Quarterly", start: "2024-09-02", end: "2024-09-12", status: "Active" },
  { id: 2, name: "Half Yearly Examination 2024", board: "TSBIE", year: "2024-2025", level: "2nd Year", group: "BIPC", type: "Half Yearly", start: "2024-12-05", end: "2024-12-16", status: "Active" },
  { id: 3, name: "Pre-Final Examination", board: "CBSE", year: "2024-2025", level: "Class XII", group: "SCI", type: "Pre-Final", start: "2025-01-20", end: "2025-01-31", status: "Inactive" },
];

export const examSchedule = [
  { id: 1, subject: "Mathematics IA", date: "2024-09-02", time: "09:30 - 12:30", hall: "Hall-1", invigilator: "Ms. Priya Sharma", status: "Active" },
  { id: 2, subject: "Physics", date: "2024-09-04", time: "09:30 - 12:30", hall: "Hall-2", invigilator: "Dr. Karthik Nair", status: "Active" },
  { id: 3, subject: "Chemistry", date: "2024-09-06", time: "09:30 - 12:30", hall: "Hall-1", invigilator: "Mr. Ravi Teja", status: "Active" },
  { id: 4, subject: "English", date: "2024-09-09", time: "09:30 - 12:30", hall: "Hall-3", invigilator: "Mr. Suresh Kumar", status: "Inactive" },
];

export const marks = students.slice(0, 6).map((s, i) => ({
  id: s.id,
  roll: s.roll,
  name: s.name,
  internal: 18 + (i % 3),
  practical: 25 + (i % 5),
  theory: 52 + ((i * 4) % 20),
}));

export const results = students.slice(0, 6).map((s, i) => {
  const internal = 18 + (i % 3);
  const practical = 25 + (i % 5);
  const external = 52 + ((i * 4) % 20);
  const total = internal + practical + external;
  return {
    id: s.id,
    name: s.name,
    roll: s.roll,
    subject: i % 2 === 0 ? "Mathematics IA" : "Physics",
    internal,
    practical,
    external,
    total,
    grade: total > 90 ? "A+" : total > 80 ? "A" : total > 70 ? "B" : "C",
    result: total > 60 ? "Pass" : "Fail",
  };
});

export const fees = [
  { id: 1, board: "BIEAP", year: "2024-2025", group: "MPC", type: "Tuition Fee", amount: 45000, due: "2024-07-31", status: "Active" },
  { id: 2, board: "BIEAP", year: "2024-2025", group: "BIPC", type: "Laboratory Fee", amount: 8000, due: "2024-08-15", status: "Active" },
  { id: 3, board: "TSBIE", year: "2024-2025", group: "CEC", type: "Hostel Fee", amount: 62000, due: "2024-07-10", status: "Inactive" },
  { id: 4, board: "CBSE", year: "2024-2025", group: "SCI", type: "Transport Fee", amount: 15000, due: "2024-09-01", status: "Active" },
];

export const feeCollections = [
  { id: 1, receipt: "RCT-90121", student: "Aarav Reddy", date: "2024-07-04", amount: 45000, discount: 2000, fine: 0, mode: "UPI", txn: "TXN8891234", status: "Active" },
  { id: 2, receipt: "RCT-90122", student: "Diya Sharma", date: "2024-07-11", amount: 25000, discount: 0, fine: 500, mode: "Card", txn: "TXN8891987", status: "Active" },
  { id: 3, receipt: "RCT-90123", student: "Arjun Menon", date: "2024-08-02", amount: 12000, discount: 0, fine: 1000, mode: "Cash", txn: "-", status: "Inactive" },
];

export const promotions = [
  { id: 1, roll: "24MPC001", name: "Aarav Reddy", from: "1st Year", to: "2nd Year", status: "Active" },
  { id: 2, roll: "24MPC002", name: "Diya Sharma", from: "1st Year", to: "2nd Year", status: "Active" },
  { id: 3, roll: "24BPC001", name: "Vihaan Patel", from: "1st Year", to: "2nd Year", status: "Active" },
];

export const timetableGrid = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  periods: ["09:00 - 09:50", "09:50 - 10:40", "11:00 - 11:50", "11:50 - 12:40", "13:30 - 14:20", "14:20 - 15:10"],
  cells: {
    Monday: ["Mathematics IA|Dr. Anitha Rao|R-101", "Physics|Mr. Suresh Kumar|Lab-1", "English|Ms. Priya Sharma|R-101", "Chemistry|Mrs. Lakshmi Devi|Lab-2", "Library|-|Library", "Mathematics IB|Dr. Anitha Rao|R-101"],
    Tuesday: ["Physics|Mr. Suresh Kumar|R-102", "Chemistry|Mrs. Lakshmi Devi|Lab-2", "Mathematics IA|Dr. Anitha Rao|R-101", "English|Ms. Priya Sharma|R-101", "Sports|-|Ground", "Physics Practical|Mr. Suresh Kumar|Lab-1"],
    Wednesday: ["English|Ms. Priya Sharma|R-101", "Mathematics IA|Dr. Anitha Rao|R-101", "Botany|Dr. Karthik Nair|Lab-3", "Physics|Mr. Suresh Kumar|R-102", "Chemistry|Mrs. Lakshmi Devi|Lab-2", "Mentoring|Dr. Anitha Rao|R-101"],
    Thursday: ["Chemistry|Mrs. Lakshmi Devi|Lab-2", "English|Ms. Priya Sharma|R-101", "Physics|Mr. Suresh Kumar|R-102", "Mathematics IB|Dr. Anitha Rao|R-101", "Computer Science|Mr. Ravi Teja|Lab-4", "Library|-|Library"],
    Friday: ["Mathematics IA|Dr. Anitha Rao|R-101", "Botany|Dr. Karthik Nair|Lab-3", "Chemistry Practical|Mrs. Lakshmi Devi|Lab-2", "English|Ms. Priya Sharma|R-101", "Physics|Mr. Suresh Kumar|R-102", "Sports|-|Ground"],
    Saturday: ["Revision|Dr. Anitha Rao|R-101", "Physics|Mr. Suresh Kumar|R-102", "Mathematics IB|Dr. Anitha Rao|R-101", "Chemistry|Mrs. Lakshmi Devi|Lab-2", "-|-|-", "-|-|-"],
  },
};

export const attendanceRoster = students.map((s) => ({ id: s.id, roll: s.roll, name: s.name, mark: "Present" }));

export const dashboardStats = [
  { label: "Total Students", value: "1,482", delta: "+4.2%", tone: "blue" },
  { label: "Faculty Members", value: "96", delta: "+1.1%", tone: "green" },
];

export const admissionTrend = [
  { month: "Apr", admissions: 62, target: 70 },
  { month: "May", admissions: 128, target: 120 },
  { month: "Jun", admissions: 204, target: 190 },
  { month: "Jul", admissions: 158, target: 160 },
  { month: "Aug", admissions: 96, target: 100 },
  { month: "Sep", admissions: 54, target: 60 },
];

export const feeTrend = [
  { month: "Jun", collected: 42, due: 12 },
  { month: "Jul", collected: 58, due: 9 },
  { month: "Aug", collected: 36, due: 15 },
  { month: "Sep", collected: 44, due: 11 },
  { month: "Oct", collected: 51, due: 7 },
  { month: "Nov", collected: 47, due: 10 },
];

export const groupDistribution = [
  { name: "MPC", value: 520 },
  { name: "BiPC", value: 410 },
  { name: "CEC", value: 285 },
  { name: "MEC", value: 267 },
];

export const notifications = [
  { id: 1, title: "Fee reminder sent to 42 students", time: "10 min ago" },
  { id: 2, title: "Quarterly exam schedule published", time: "1 hour ago" },
  { id: 3, title: "New faculty onboarding pending", time: "Yesterday" },
];

export const options = {
  board: boards.map((b) => b.code),
  year: academicYears.map((y) => y.name),
  assignmentAcademicYear: ["2024-2025", "2025-2026", "2026-2027"],
  level: ["1st Year", "2nd Year", "Class XI", "Class XII"],
  assignmentAcademicLevel: ["First Year", "Second Year"],
  group: courses.map((c) => c.code),
  assignmentGroup: ["MPC", "BiPC", "CEC", "MEC", "HEC"],
  section: ["Section A", "Section B", "Section C"],
  subject: subjects.map((s) => s.name),
  faculty: faculty.map((f) => f.name),
  student: students.map((s) => s.name),
  status: ["Active", "Inactive"],
  gender: ["Male", "Female", "Other"],
  paymentMode: ["Cash", "UPI", "Card", "Net Banking", "Cheque"],
  certificateType: ["Bonafide Certificate", "Transfer Certificate", "Study Certificate", "Conduct Certificate", "Others"],
  examType: ["Unit Test", "Quarterly", "Half Yearly", "Pre-Final", "Annual"],
  subjectType: ["Theory", "Practical", "Theory + Practical", "Language", "Elective"],
  feeType: ["Tuition Fee", "Laboratory Fee", "Hostel Fee", "Transport Fee", "Exam Fee"],
  department: ["Mathematics", "Physics", "Chemistry", "Biology", "Commerce", "English"],
  bloodGroup: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
};



