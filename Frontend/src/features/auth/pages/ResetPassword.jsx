import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout";
import Button from "../../../shared/components/Button";
import FormField from "../../../shared/components/FormField";
import { getApiErrorMessage } from "../../../api/axios";
import { resetPassword } from "../services/authService";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;
  const otp = state?.otp;
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email || !otp || form.password.length < 6 || form.password !== form.confirmPassword) {
      setError("Reset details are missing or passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword({
        email,
        otp,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate("/login");
    } catch (resetError) {
      setError(getApiErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Create a new secure password.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <FormField label="New Password">
          <input className="input" type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} />
        </FormField>
        <FormField label="Confirm Password">
          <input className="input" type="password" value={form.confirmPassword} onChange={(event) => setField("confirmPassword", event.target.value)} />
        </FormField>
        <Button variant="primary" disabled={loading}>{loading ? "Resetting..." : "Reset Password"}</Button>
      </form>
    </AuthLayout>
  );
}
