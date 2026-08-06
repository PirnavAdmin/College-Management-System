import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Dashboard from "../Dashboard/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import VerifyOTP from "../features/auth/pages/VerifyOTP";
import ResetPassword from "../features/auth/pages/ResetPassword";
import DashboardHome from "../Dashboard/DashboardHome";
import BoardList from "../Dashboard/Board Management/BoardList";
import AddEditBoard from "../Dashboard/Board Management/AddEditBoard";
import AcademicYearList from "../Dashboard/Academic Year/AcademicYearList";
import AddAcademicYear from "../Dashboard/Academic Year/AddAcademicYear";
import GroupList from "../Dashboard/Group Management/GroupList";
import AddGroup from "../Dashboard/Group Management/AddGroup";
import SectionManagement from "../Dashboard/Section Management/SectionManagement";
import SubjectList from "../Dashboard/Subject Management/SubjectList";
import AddSubject from "../Dashboard/Subject Management/AddSubject";
import FacultyList from "../Dashboard/Faculty Management/FacultyList";
import AddFaculty from "../Dashboard/Faculty Management/AddFaculty";
import FacultySubjectAllocation from "../Dashboard/Faculty Management/FacultySubjectAllocation";
import AdmissionForm from "../Dashboard/Student Admission/AdmissionForm";
import StudentProfile from "../Dashboard/Student Management/StudentProfile";
import CreateTimetable from "../Dashboard/Timetable/CreateTimetable";
import TakeAttendance from "../Dashboard/Attendance/TakeAttendance";
import CreateAssignment from "../Dashboard/Assignment/CreateAssignment";
import CreateExamination from "../Dashboard/Examination/CreateExamination";
import ExamSchedule from "../Dashboard/Examination/ExamSchedule";
import MarksEntry from "../Dashboard/Marks Entry/MarksEntry";
import PublishResults from "../Dashboard/Results/PublishResults";
import StudentResult from "../Dashboard/Results/StudentResult";
import PromoteStudents from "../Dashboard/Promotion/PromoteStudents";
import FeeStructure from "../Dashboard/Fee Management/FeeStructure";
import FeeCollection from "../Dashboard/Fee Management/FeeCollection";
import GenerateCertificate from "../Dashboard/Certificates/GenerateCertificate";
import Reports from "../Dashboard/Reports/Reports";
import StudentDashboard from "../Dashboard/StudentDashboard/StudentDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/faculty/subject-allocation"
        element={<Navigate to="/dashboard/faculty/subject-allocation" replace />}
      />

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHome />} />
          <Route path="boards" element={<BoardList />} />
          <Route path="boards/new" element={<AddEditBoard />} />
          <Route path="boards/add" element={<Navigate to="/dashboard/boards/new" replace />} />
          <Route path="boards/:boardId/edit" element={<AddEditBoard />} />
          <Route path="academic-years" element={<AcademicYearList />} />
          <Route path="academic-years/new" element={<AddAcademicYear />} />
          <Route path="academic-years/add" element={<Navigate to="/dashboard/academic-years/new" replace />} />
          <Route path="groups" element={<GroupList />} />
          <Route path="groups/add" element={<AddGroup />} />
          <Route path="groups/edit/:groupId" element={<AddGroup />} />
          <Route path="course-management" element={<Navigate to="/dashboard/groups" replace />} />
          <Route path="course-management/add" element={<Navigate to="/dashboard/groups/add" replace />} />
          <Route path="course-management/edit/:groupId" element={<CourseManagementEditRedirect />} />
          <Route path="courses" element={<Navigate to="/dashboard/groups" replace />} />
          <Route path="courses/new" element={<Navigate to="/dashboard/groups/add" replace />} />
          <Route path="courses/edit/:groupId" element={<CourseManagementEditRedirect />} />
          <Route path="sections" element={<SectionManagement />} />
          <Route path="subjects" element={<SubjectList />} />
          <Route path="subjects/new" element={<AddSubject />} />
          <Route path="subjects/add" element={<Navigate to="/dashboard/subjects/new" replace />} />
          <Route path="subjects/:subjectId/edit" element={<AddSubject />} />
          <Route path="faculty" element={<FacultyList />} />
          <Route path="faculty/new" element={<AddFaculty />} />
          <Route path="faculty/:facultyId/edit" element={<AddFaculty />} />
          <Route path="faculty/subject-allocation" element={<FacultySubjectAllocation />} />
          <Route path="admissions" element={<Navigate to="/dashboard/admissions/new" replace />} />
          <Route path="admissions/new" element={<AdmissionForm />} />
          <Route path="students" element={<StudentProfile />} />
          <Route path="students/:studentId" element={<StudentProfile />} />
          <Route path="timetable" element={<CreateTimetable />} />
          <Route path="attendance" element={<TakeAttendance />} />
          <Route path="assignments" element={<Navigate to="/dashboard/assignments/new" replace />} />
          <Route path="assignments/new" element={<CreateAssignment />} />
          <Route path="examinations" element={<Navigate to="/dashboard/examinations/new" replace />} />
          <Route path="examinations/new" element={<CreateExamination />} />
          <Route path="examinations/schedule" element={<ExamSchedule />} />
          <Route path="marks-entry" element={<MarksEntry />} />
          <Route path="results" element={<Navigate to="/dashboard/results/publish" replace />} />
          <Route path="results/publish" element={<PublishResults />} />
          <Route path="results/student" element={<StudentResult />} />
          <Route path="promotion" element={<Navigate to="/dashboard/promotions" replace />} />
          <Route path="promotions" element={<PromoteStudents />} />
          <Route path="fees/structure" element={<FeeStructure />} />
          <Route path="fees/collection" element={<FeeCollection />} />
          <Route path="certificates" element={<Navigate to="/dashboard/certificates/generate" replace />} />
          <Route path="certificates/generate" element={<GenerateCertificate />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requireStudent />}>
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function CourseManagementEditRedirect() {
  const { groupId } = useParams();
  return <Navigate to={`/dashboard/groups/edit/${groupId}`} replace />;
}

