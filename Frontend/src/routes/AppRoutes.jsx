import { Routes, Route } from "react-router-dom";

import Register from "../pages/Register";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import VerifyOTP from "../pages/VerifyOTP";
import ResetPassword from "../pages/ResetPassword";

import SubjectList from "../Dashboard/Subject Management/SubjectList";
import AddSubject from "../Dashboard/Subject Management/AddSubject";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={<SubjectList />} />

      <Route path="/subjects" element={<SubjectList />} />
      <Route path="/subjects/add" element={<AddSubject />} />

    </Routes>
  );
}

export default AppRoutes;