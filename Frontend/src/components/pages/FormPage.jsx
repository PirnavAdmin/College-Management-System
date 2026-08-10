import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import { addRow, configFor, getRow, updateRow } from "@/data/store.js";
import { getApiErrorMessage } from "@/api/axios.js";

export default function FormPage({ slug, config, id = null, secondary = false, listPath }) {
  const sectionConfig = configFor(config, secondary);
  const navigate = useNavigate();
  const existing = id ? getRow(slug, secondary, id, config) : null;
  const { values, errors, setValue, setValues, validate } = useForm(sectionConfig.fields, existing || {});
  const [fields, setFields] = useState(sectionConfig.fields);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const mode = id ? "Edit" : "Add";
  const label = (sectionConfig.addLabel || sectionConfig.title).replace(/^Add\s+/, "");

  useEffect(() => {
    let active = true;
    const fieldsWithLoaders = sectionConfig.fields.filter((field) => field.loadOptions);

    fieldsWithLoaders.forEach((field) => {
      field.loadOptions()
        .then((response) => {
          if (!active) return;
          const options = field.getOptions ? field.getOptions(response) : response.data;
          if (!Array.isArray(options)) return;
          setFields((current) => current.map((currentField) => (
            currentField.name === field.name ? { ...currentField, options } : currentField
          )));
        })
        .catch(() => {
          // Keep the existing form usable if a dynamic option source is unavailable.
        });
    });

    return () => { active = false; };
  }, [sectionConfig]);

  useEffect(() => {
    if (!id || !sectionConfig.api?.getById) return undefined;
    let active = true;

    sectionConfig.api.getById(id)
      .then((response) => {
        if (active) setValues(sectionConfig.api.toRow(response.data));
      })
      .catch((error) => {
        if (active) setToast(getApiErrorMessage(error));
      });

    return () => { active = false; };
  }, [id, sectionConfig, setValues]);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const api = sectionConfig.api;
      const payload = api?.toPayload ? api.toPayload(values) : values;
      const response = id && api?.update
        ? await api.update(id, payload)
        : api?.create
          ? await api.create(payload)
          : null;
      const row = api?.toRow && response?.data ? api.toRow(response.data) : values;

      if (id) updateRow(slug, secondary, id, row, config);
      else addRow(slug, secondary, row, config);
      setToast(`${label} ${id ? "updated" : "created"} successfully`);
      navigate(listPath);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={`${mode} ${label}`} subtitle={`Fill in the details below and save to ${id ? "update this" : "create a new"} record.`} breadcrumb={[sectionConfig.title]}>
      <div className="cms-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to {sectionConfig.title}</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            <div className="cms-form-grid">
              {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
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
