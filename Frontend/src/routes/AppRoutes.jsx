import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "../pages/Register";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import VerifyOTP from "../pages/VerifyOTP";
import ResetPassword from "../pages/ResetPassword";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;