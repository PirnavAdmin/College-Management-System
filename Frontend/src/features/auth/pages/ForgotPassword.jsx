import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { forgotPassword } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";

const fields = [{ name: "email", label: "Registered Email", type: "email", required: true, full: true }];

export default function ForgotPassword() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    try {
      await forgotPassword({ email: String(values.email || "").trim() });
      setSent(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We will send reset instructions to your registered email.">
      {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
      {sent ? (
        <div className="cms-empty" role="status">Reset instructions have been sent to {values.email}.</div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="cms-form-grid">
            {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
          </div>
          <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }}>Send reset link</button>
        </form>
      )}
      <div className="cms-auth-links">
        <Link to="/login">Back to login</Link>
        <Link to="/register">Create an account</Link>
      </div>
    </AuthLayout>
  );
}


