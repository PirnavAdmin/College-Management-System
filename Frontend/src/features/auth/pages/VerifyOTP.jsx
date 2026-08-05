import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout";
import Button from "../../../shared/components/Button";
import FormField from "../../../shared/components/FormField";
import { getApiErrorMessage } from "../../../api/axios";
import { verifyOtp } from "../services/authService";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email || otp.length !== 6) {
      setError("Please enter the 6 digit OTP sent to your email.");
      return;
    }
    try {
      setLoading(true);
      await verifyOtp({ email, otp });
      navigate("/reset-password", { state: { email, otp } });
    } catch (otpError) {
      setError(getApiErrorMessage(otpError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Verify OTP" subtitle="Enter the verification code.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <FormField label="OTP">
          <input
            className="input"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          />
        </FormField>
        <Button variant="primary" disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</Button>
        <div className="auth-bottom">
          Did not receive OTP? <Link to="/forgot-password">Resend OTP</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
