import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { resetPassword } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";

const fields = [
  { name: "password", label: "New Password", type: "password", required: true, full: true },
  { name: "confirmPassword", label: "Confirm Password", type: "password", required: true, full: true },
];

export default function ResetPassword() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const email = sessionStorage.getItem("password-reset-email") || "";

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    if (!email) {
      setFormError("Please verify your OTP before resetting your password.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setFormError("Password and Confirm Password must match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ email, password: values.password, confirmPassword: values.confirmPassword });
      sessionStorage.removeItem("password-reset-email");
      navigate("/login", { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create new password" subtitle="Set a secure password for your Pirnav Junior College account.">
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Resetting..." : "Reset Password"}</button>
      </form>
      <div className="cms-auth-links"><Link to="/login">Back to login</Link></div>
    </AuthLayout>
  );
}


