import { Navigate, Routes, Route } from "react-router-dom";

// Auth Pages
import Register from "../pages/Register";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import VerifyOTP from "../pages/VerifyOTP";
import ResetPassword from "../pages/ResetPassword";

// Dashboard Layout
import DashboardLayout from "../Dashboard/DashboardLayout";

// Subject Management
import SubjectList from "../Dashboard/Subject Management/SubjectList";
import AddSubject from "../Dashboard/Subject Management/AddSubject";

// Faculty Management
import FacultyList from "../Dashboard/Faculty Management/FacultyList";
import FacultySubjectAllocation from "../Dashboard/Faculty Management/FacultySubjectAllocation";

function AppRoutes() {
  return (
    <Routes>

      {/* Authentication Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Keep previously shared/bookmarked faculty URLs working. */}
      <Route
        path="/faculty/subject-allocation"
        element={<Navigate to="/dashboard/faculty/subject-allocation" replace />}
      />

      {/* Dashboard Layout */}
      <Route path="/dashboard" element={<DashboardLayout />}>

  <Route index element={<SubjectList />} />

  <Route path="subjects" element={<SubjectList />} />
  <Route path="subjects/add" element={<AddSubject />} />

  <Route path="faculty" element={<FacultyList />} />
  <Route
    path="faculty/subject-allocation"
    element={<FacultySubjectAllocation />}
  />

</Route>

    </Routes>
  );
}

export default AppRoutes;
