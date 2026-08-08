import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { loginUser } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";

const fields = [
  { name: "email", label: "Email or Mobile", type: "text", required: true, placeholder: "Admin@CMS.com", full: true },
  { name: "password", label: "Password", type: "password", required: true, placeholder: "Password", full: true },
];

const REMEMBER_KEY = "pirnav-remember-email";

export default function Login() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState("");
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
    setFormError("");
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
        setFormError("Login succeeded but token was not returned by the server.");
        return;
      }
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("role", result.user.role);
      navigate(result.user.isAdmin || result.user.role === "admin" ? "/dashboard" : "/student-dashboard", { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to the Pirnav Junior College management system.">
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
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




