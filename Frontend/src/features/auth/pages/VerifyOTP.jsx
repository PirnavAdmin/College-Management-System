import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { verifyOtp } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";

const fields = [
  { name: "email", label: "Email Address", type: "email", required: true, full: true },
  { name: "otp", label: "OTP", required: true, full: true },
];

export default function VerifyOTP() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      await verifyOtp({ email: values.email, otp: values.otp });
      navigate("/reset-password");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Verify OTP" subtitle="Enter the OTP sent to your registered email.">
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Verifying..." : "Verify OTP"}</button>
      </form>
      <div className="cms-auth-links"><Link to="/login">Back to login</Link></div>
    </AuthLayout>
  );
}


