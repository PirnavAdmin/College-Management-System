import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import LandingPage from "@/components/pages/LandingPage.jsx";
import DashboardPage from "@/components/pages/DashboardPage.jsx";
import ListPage from "@/components/pages/ListPage.jsx";
import FormPage from "@/components/pages/FormPage.jsx";
import AdmissionPage from "@/components/pages/AdmissionPage.jsx";
import AttendancePage from "@/components/pages/AttendancePage.jsx";
import TimetablePage from "@/components/pages/TimetablePage.jsx";
import MarksEntryPage from "@/components/pages/MarksEntryPage.jsx";
import ResultsPage from "@/components/pages/ResultsPage.jsx";
import PromotionPage from "@/components/pages/PromotionPage.jsx";
import ReportsPage from "@/components/pages/ReportsPage.jsx";
import StudentProfilePage from "@/components/pages/StudentProfilePage.jsx";
import Login from "@/features/auth/pages/Login.jsx";
import Register from "@/features/auth/pages/Register.jsx";
import ForgotPassword from "@/features/auth/pages/ForgotPassword.jsx";
import VerifyOTP from "@/features/auth/pages/VerifyOTP.jsx";
import ResetPassword from "@/features/auth/pages/ResetPassword.jsx";
import StudentDashboard from "@/Dashboard/StudentDashboard/StudentDashboard.jsx";
import ProtectedRoute, { PublicOnlyRoute } from "./ProtectedRoute.jsx";
import { modules } from "@/config/modules.js";

const listSlugs = ["boards", "academic-years", "courses", "subjects", "sections", "faculty", "faculty-allocation", "assignments", "examinations", "fee-structure", "certificates", "students"];

function ModuleListRoute({ slug }) {
  if (!modules[slug]) return <Navigate to="/dashboard" replace />;
  return <ListPage slug={slug} />;
}

function ModuleFormRoute({ slug }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const secondary = searchParams.get("section") === "secondary";
  if (!modules[slug]) return <Navigate to="/dashboard" replace />;
  return <FormPage slug={slug} id={id || null} secondary={secondary} listPath={`/dashboard/${slug}`} />;
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
        {listSlugs.map((slug) => <Route key={slug} path={`/dashboard/${slug}`} element={<ModuleListRoute slug={slug} />} />)}
        {listSlugs.map((slug) => <Route key={`${slug}-add`} path={`/dashboard/${slug}/add`} element={<ModuleFormRoute slug={slug} />} />)}
        {listSlugs.map((slug) => <Route key={`${slug}-edit`} path={`/dashboard/${slug}/:id/edit`} element={<ModuleFormRoute slug={slug} />} />)}
        <Route path="/dashboard/admission" element={<AdmissionPage />} />
        <Route path="/dashboard/timetable" element={<TimetablePage />} />
        <Route path="/dashboard/attendance" element={<AttendancePage />} />
        <Route path="/dashboard/marks-entry" element={<MarksEntryPage />} />
        <Route path="/dashboard/results" element={<ResultsPage />} />
        <Route path="/dashboard/promotion" element={<PromotionPage />} />
        <Route path="/dashboard/reports" element={<ReportsPage />} />
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
      <Route path="/timetable" element={<Navigate to="/dashboard/timetable" replace />} />
      <Route path="/marks-entry" element={<Navigate to="/dashboard/marks-entry" replace />} />
      <Route path="/results" element={<Navigate to="/dashboard/results" replace />} />
      <Route path="/promotion" element={<Navigate to="/dashboard/promotion" replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

