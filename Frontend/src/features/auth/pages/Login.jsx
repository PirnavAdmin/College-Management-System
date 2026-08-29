import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { loginUser } from "@/features/auth/services/authService.js";

const fields = [
  { name: "email", label: "Email or Mobile", type: "text", required: true, placeholder: "Admin@CMS.com", full: true },
  { name: "password", label: "Password", type: "password", required: true, placeholder: "Password", full: true },
];

const REMEMBER_KEY = "pirnav-remember-email";

export default function Login() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setValue("email", saved);
        setRemember(true);
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, String(values.email || ""));
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage unavailable */
    }

    setBusy(true);
    try {
      const result = await loginUser({ emailOrMobile: String(values.email || "").trim(), password: values.password });
      if (!result.token) {
        setError("Unable to sign in right now. Please try again.");
        return;
      }
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("role", result.user.role);
      navigate(result.user.isAdmin ? "/dashboard" : "/student-dashboard", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);

      if (error.response?.status === 401) {
        setError("Invalid username or password. Please try again.");
      } else if ([500, 502, 503, 504].includes(error.response?.status)) {
        setError("Unable to sign in right now. Please try again in a few moments.");
      } else if (!error.response) {
        setError("Unable to connect to the service. Please check your internet connection.");
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to the Pirnav College management system.">
      <form onSubmit={submit} noValidate>
        {error ? <div className="cms-alert-error" role="alert">{error}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
          ))}
        </div>
        <div className="cms-auth-row">
          <label className="cms-check" htmlFor="remember-me">
            <input id="remember-me" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="cms-btn cms-btn-primary auth-submit-btn" disabled={busy}>
          {busy ? "Signing in..." : "Login"}
        </button>
      </form>
      <div className="cms-auth-links">
        <span style={{ color: "var(--cms-muted)" }}>New here?</span>
        <Link to="/register">Create an account</Link>
      </div>
    </AuthLayout>
  );
}




