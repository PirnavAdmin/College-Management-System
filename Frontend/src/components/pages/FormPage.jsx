import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import { addRow, configFor, getRow, updateRow } from "@/data/store.js";

export default function FormPage({ slug, id = null, secondary = false, listPath }) {
  const config = configFor(slug, secondary);
  const navigate = useNavigate();
  const existing = id ? getRow(slug, secondary, id) : null;
  const { values, errors, setValue, validate } = useForm(config.fields, existing || {});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const mode = id ? "Edit" : "Add";
  const label = (config.addLabel || config.title).replace(/^Add\s+/, "");

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      if (id) updateRow(slug, secondary, id, values);
      else addRow(slug, secondary, values);
      setToast(`${label} ${id ? "updated" : "created"} successfully`);
      setSaving(false);
      navigate(listPath);
    }, 400);
  };

  return (
    <DashboardLayout title={`${mode} ${label}`} subtitle={`Fill in the details below and save to ${id ? "update this" : "create a new"} record.`} breadcrumb={[config.title]}>
      <div className="cms-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to {config.title}</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            <div className="cms-form-grid">
              {config.fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
            </div>
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving}>{saving ? "Saving..." : `Save ${label}`}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


