import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { forgotPassword, verifyOtp } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";

const fields = [
  { name: "otp", label: "OTP", required: true, full: true },
];

export default function VerifyOTP() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem("password-reset-email") || "";

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      if (!email) {
        setFormError("Please request an OTP first.");
        return;
      }
      await verifyOtp({ email, otp: values.otp });
      sessionStorage.setItem("password-reset-email", email);
      navigate("/reset-password");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }
    setFormError("");
    setResending(true);
    try {
      await forgotPassword({ email });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Verify OTP" subtitle={email ? `Enter the OTP sent to ${email}.` : "Enter the OTP sent to your registered email."}>
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Verifying..." : "Verify OTP"}</button>
      </form>
      <div className="cms-auth-links auth-secondary-actions"><button type="button" className="cms-btn cms-btn-ghost auth-resend-btn" onClick={resendOtp} disabled={resending}>{resending ? "Resending..." : "Resend OTP"}</button><Link to="/login">Back to login</Link></div>
    </AuthLayout>
  );
}


