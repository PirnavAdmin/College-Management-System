import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiUser } from "react-icons/fi";
import AuthLayout from "../../../layouts/AuthLayout";
import Button from "../../../shared/components/Button";
import { getApiErrorMessage } from "../../../api/axios";
import { emailRegex, mobileRegex } from "../../../shared/utils/validators";
import { registerUser } from "../services/authService";

const initialForm = { fullName: "", email: "", mobile: "", password: "", confirmPassword: "" };

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: key === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (Object.values(form).some((value) => !String(value).trim())) {
      setError("Please fill all required fields.");
      return;
    }
    if (!emailRegex.test(form.email) || !mobileRegex.test(form.mobile)) {
      setError("Please enter a valid email and 10 digit mobile number.");
      return;
    }
    if (form.password.length < 6 || form.password !== form.confirmPassword) {
      setError("Password must be at least 6 characters and both passwords must match.");
      return;
    }
    try {
      setLoading(true);
      const response = await registerUser({ role: "student", fullName: form.fullName, email: form.email, mobileNumber: form.mobile, password: form.password, confirmPassword: form.confirmPassword });
      const data = response.data || {};
      if (data.Status === false || data.status === false) {
        setError(data.Message || data.message || "Registration failed. Please check the entered details.");
        return;
      }
      setSuccess(data.Message || data.message || "Registration successful. Please login.");
      navigate("/login");
    } catch (registerError) {
      setError(getApiErrorMessage(registerError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card auth-register-card">
        <div className="auth-card-header"><h2>Create Account</h2><p>Register to access the College Management System</p></div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="notice notice-error">{error}</div> : null}
          {success ? <div className="notice">{success}</div> : null}
          <label className="auth-field"><span>Full Name</span><div className="auth-input-wrap"><FiUser className="auth-input-icon" /><input placeholder="Enter Full Name" value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} /></div></label>
          <label className="auth-field"><span>Email Address</span><div className="auth-input-wrap"><FiMail className="auth-input-icon" /><input placeholder="Enter Email Address" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></div></label>
          <label className="auth-field"><span>Mobile Number</span><div className="auth-input-wrap"><FiPhone className="auth-input-icon" /><input placeholder="Enter Mobile Number" value={form.mobile} onChange={(event) => setField("mobile", event.target.value)} /></div></label>
          <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><FiLock className="auth-input-icon" /><input placeholder="Enter Password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setField("password", event.target.value)} /><button className="auth-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></label>
          <label className="auth-field"><span>Confirm Password</span><div className="auth-input-wrap"><FiLock className="auth-input-icon" /><input placeholder="Confirm Password" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => setField("confirmPassword", event.target.value)} /><button className="auth-password-toggle" type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button></div></label>
          <Button className="auth-submit" variant="primary" disabled={loading}>{loading ? "Submitting..." : "Register"}</Button>
          <div className="auth-bottom">Already have an account? <Link to="/login">Login</Link></div>
        </form>
      </div>
    </AuthLayout>
  );
}
