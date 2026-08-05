import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout";
import Button from "../../../shared/components/Button";
import FormField from "../../../shared/components/FormField";
import { getApiErrorMessage } from "../../../api/axios";
import { emailRegex } from "../../../shared/utils/validators";
import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      await forgotPassword({ email: email.trim() });
      navigate("/verify-otp", { state: { email: email.trim() } });
    } catch (forgotError) {
      setError(getApiErrorMessage(forgotError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="Request a one-time password.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <FormField label="Email Address">
          <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        <Button variant="primary" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</Button>
        <div className="auth-bottom">
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
