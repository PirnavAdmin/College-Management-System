import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import LandingPage from "@/components/pages/LandingPage.jsx";
import DashboardPage from "@/components/pages/DashboardPage.jsx";
import ListPage from "@/components/pages/ListPage.jsx";
import FormPage from "@/components/pages/FormPage.jsx";
import BoardManagementPage, { pageConfig as boardManagementConfig } from "@/components/pages/BoardManagementPage.jsx";
import AcademicYearPage, { pageConfig as academicYearConfig } from "@/components/pages/AcademicYearPage.jsx";
import BoardAcademicYearManagementPage from "@/components/pages/BoardAcademicYearManagementPage.jsx";
import CourseGroupPage, { CourseGroupFormRoute, pageConfig as courseGroupConfig } from "@/components/pages/CourseGroupPage.jsx";
import SubjectManagementPage from "@/components/pages/SubjectManagementPage.jsx";
import SectionManagementPage, { pageConfig as sectionManagementConfig } from "@/components/pages/SectionManagementPage.jsx";
import StaffManagementPage from "@/components/pages/StaffManagementPage.jsx";
import StudentAdmissionPage from "@/components/pages/StudentAdmissionPage.jsx";
import StudentManagementPage, { pageConfig as studentManagementConfig } from "@/components/pages/StudentManagementPage.jsx";
import TimetablePage from "@/components/pages/TimetablePage.jsx";
import AttendancePage from "@/components/pages/AttendancePage.jsx";
import AssignmentsMaterialsPage, { pageConfig as assignmentsMaterialsConfig } from "@/components/pages/AssignmentsMaterialsPage.jsx";
import AssignmentSubmissionsPage from "@/components/pages/AssignmentSubmissionsPage.jsx";
import ExaminationPage, { pageConfig as examinationConfig } from "@/components/pages/ExaminationPage.jsx";
import MarksEntryPage from "@/components/pages/MarksEntryPage.jsx";
import ResultProcessingPage from "@/components/pages/ResultProcessingPage.jsx";
import PromotionPage from "@/components/pages/PromotionPage.jsx";
import FeeManagementPage from "@/components/pages/FeeManagementPage.jsx";
import CertificatesPage, { pageConfig as certificatesConfig } from "@/components/pages/CertificatesPage.jsx";
import ReportsAnalyticsPage from "@/components/pages/ReportsAnalyticsPage.jsx";
import StudentProfilePage from "@/components/pages/StudentProfilePage.jsx";
import Login from "@/features/auth/pages/Login.jsx";
import Register from "@/features/auth/pages/Register.jsx";
import ForgotPassword from "@/features/auth/pages/ForgotPassword.jsx";
import VerifyOTP from "@/features/auth/pages/VerifyOTP.jsx";
import ResetPassword from "@/features/auth/pages/ResetPassword.jsx";
import StudentDashboard from "@/Dashboard/StudentDashboard/StudentDashboard.jsx";
import ProtectedRoute, { PublicOnlyRoute } from "./ProtectedRoute.jsx";

const moduleConfigs = {
  courses: courseGroupConfig,
  subjects: SubjectManagementPage.pageConfig,
  sections: sectionManagementConfig,
  faculty: StaffManagementPage.pageConfig,
  "faculty-allocation": StaffManagementPage.facultySubjectAllocationConfig,
  assignments: assignmentsMaterialsConfig,
  examinations: examinationConfig,
  certificates: certificatesConfig,
  students: studentManagementConfig,
};

const listSlugs = Object.keys(moduleConfigs);

function ModuleListRoute({ slug }) {
  const config = moduleConfigs[slug];
  if (!config) return <Navigate to="/dashboard" replace />;
  return <ListPage slug={slug} config={config} />;
}

function ModuleFormRoute({ slug }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const secondary = searchParams.get("section") === "secondary";
  const config = moduleConfigs[slug];
  if (!config) return <Navigate to="/dashboard" replace />;
  return <FormPage slug={slug} config={config} id={id || null} secondary={secondary} listPath={`/dashboard/${slug}`} />;
}

function StudentProfileRoute() {
  const { id } = useParams();
  return <StudentProfilePage id={id} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/board-academic-year" element={<BoardAcademicYearManagementPage />} />
        <Route path="/dashboard/boards" element={<Navigate to="/dashboard/board-academic-year" replace />} />
        <Route path="/dashboard/academic-years" element={<Navigate to="/dashboard/board-academic-year" replace />} />
        <Route path="/dashboard/courses" element={<CourseGroupPage />} />
        <Route path="/dashboard/courses/add" element={<CourseGroupFormRoute />} />
        <Route path="/dashboard/courses/:id/edit" element={<CourseGroupFormRoute />} />
        <Route path="/dashboard/subjects" element={<SubjectManagementPage />} />
        <Route path="/dashboard/subjects/add" element={<SubjectManagementPage screen="assign" />} />
        <Route path="/dashboard/subjects/assign" element={<SubjectManagementPage screen="assign" />} />
        <Route path="/dashboard/sections" element={<SectionManagementPage />} />
        <Route path="/dashboard/faculty" element={<StaffManagementPage />} />
        <Route path="/dashboard/faculty/add" element={<StaffManagementPage />} />
        <Route path="/dashboard/faculty/:id/edit" element={<StaffManagementPage />} />
        <Route path="/dashboard/faculty-allocation" element={<Navigate to="/dashboard/faculty" replace />} />
        <Route path="/dashboard/admission" element={<StudentAdmissionPage />} />
        <Route path="/dashboard/students" element={<StudentManagementPage />} />
        <Route path="/dashboard/timetable" element={<TimetablePage />} />
        <Route path="/dashboard/timetable/setup" element={<TimetablePage screen="setup" />} />
        <Route path="/dashboard/timetable/draft" element={<TimetablePage screen="draft" />} />
        <Route path="/dashboard/timetable/faculty" element={<TimetablePage screen="faculty" />} />
        <Route path="/dashboard/attendance" element={<AttendancePage />} />
        <Route path="/dashboard/assignments" element={<AssignmentsMaterialsPage />} />
        <Route path="/dashboard/assignments/submissions" element={<AssignmentSubmissionsPage />} />
        <Route path="/dashboard/assignments/add" element={<AssignmentsMaterialsPage />} />
        <Route path="/dashboard/assignments/:id/edit" element={<AssignmentsMaterialsPage />} />
        <Route path="/dashboard/examinations" element={<ExaminationPage />} />
        <Route path="/dashboard/examinations/add" element={<ExaminationPage />} />
        <Route path="/dashboard/marks-entry" element={<MarksEntryPage />} />
        <Route path="/dashboard/results" element={<ResultProcessingPage />} />
        <Route path="/dashboard/promotion" element={<PromotionPage />} />
        <Route path="/dashboard/fee-structure" element={<FeeManagementPage />} />
        <Route path="/dashboard/certificates" element={<CertificatesPage />} />
        <Route path="/dashboard/reports" element={<ReportsAnalyticsPage />} />
        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-add`} path={`/dashboard/${slug}/add`} element={<ModuleFormRoute slug={slug} />} />)}
        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-edit`} path={`/dashboard/${slug}/:id/edit`} element={<ModuleFormRoute slug={slug} />} />)}
        <Route path="/dashboard/students/:id" element={<StudentProfileRoute />} />
      </Route>

      <Route element={<ProtectedRoute requireStudent />}>
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Route>

      {listSlugs.map((slug) => <Route key={`${slug}-redirect`} path={`/${slug}`} element={<Navigate to={`/dashboard/${slug}`} replace />} />)}
      {listSlugs.map((slug) => <Route key={`${slug}-add-redirect`} path={`/${slug}/add`} element={<Navigate to={`/dashboard/${slug}/add`} replace />} />)}
      {listSlugs.map((slug) => <Route key={`${slug}-edit-redirect`} path={`/${slug}/:id/edit`} element={<Navigate to={`/dashboard/${slug}`} replace />} />)}
      <Route path="/admission" element={<Navigate to="/dashboard/admission" replace />} />
      <Route path="/attendance" element={<Navigate to="/dashboard/attendance" replace />} />
      <Route path="/assignments" element={<Navigate to="/dashboard/assignments" replace />} />
      <Route path="/assignments/add" element={<Navigate to="/dashboard/assignments/add" replace />} />
      <Route path="/timetable" element={<Navigate to="/dashboard/timetable" replace />} />
      <Route path="/marks-entry" element={<Navigate to="/dashboard/marks-entry" replace />} />
      <Route path="/results" element={<Navigate to="/dashboard/results" replace />} />
      <Route path="/promotion" element={<Navigate to="/dashboard/promotion" replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
