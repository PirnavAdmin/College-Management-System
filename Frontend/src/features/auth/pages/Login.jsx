import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import AuthLayout from "../../../layouts/AuthLayout";
import Button from "../../../shared/components/Button";
import { getApiErrorMessage } from "../../../api/axios";
import { loginUser } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter Email/Mobile and Password.");
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser({
        emailOrMobile: form.email.trim(),
        password: form.password,
      });
      const data = response.data || {};
      const token = data.token || data.jwt || data.accessToken || data.data?.token;
      const user = data.user || data.userInfo || data.data?.user;

      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (loginError) {
      setError(getApiErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <div className="auth-card auth-login-card">
        <div className="auth-card-header">
          <h2>Welcome Back</h2>
          <p>Login to your College Management System account</p>
        </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <label className="auth-field">
          <span>Email Address</span>
          <div className="auth-input-wrap">
            <FiMail className="auth-input-icon" />
            <input
              name="email"
              placeholder="Enter your email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input-wrap">
            <FiLock className="auth-input-icon" />
            <input
              name="password"
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
            />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </label>
        <div className="auth-link-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setField("remember", event.target.checked)}
            />{" "}
            Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button className="auth-submit" variant="primary" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
        <div className="auth-bottom">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </div>
      </form>
      </div>
    </AuthLayout>
  );
}
