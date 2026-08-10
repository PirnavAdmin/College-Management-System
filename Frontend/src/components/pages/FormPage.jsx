import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { addRow, configFor, getRow, updateRow } from "@/data/store.js";

export default function FormPage({ slug, config, id = null, secondary = false, listPath }) {
  const sectionConfig = configFor(config, secondary);
  const navigate = useNavigate();
  const usesApi = Boolean(sectionConfig?.api);
  const existing = !usesApi && id ? getRow(slug, secondary, id, config) : null;
  const [fields, setFields] = useState(sectionConfig.fields);
  const { values, errors, setValue, validate, setValues, setErrors } = useForm(fields, existing || {});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(usesApi && Boolean(id));
  const [toast, setToast] = useState("");

  const mode = id ? "Edit" : "Add";
  const label = sectionConfig.formLabel || (sectionConfig.addLabel || sectionConfig.title).replace(/^Add\s+/, "").replace(/^Create\s+/, "");
  const submitLabel = id ? sectionConfig.updateLabel || `Update ${label}` : sectionConfig.saveLabel || `Save ${label}`;
  const backLabel = sectionConfig.backLabel || sectionConfig.title;

  useEffect(() => {
    let ignore = false;

    const loadFormData = async () => {
      setLoading(Boolean(id));
      try {
        const [baseFields, loadedRecord] = await Promise.all([
          usesApi && sectionConfig.api.loadFields ? sectionConfig.api.loadFields(sectionConfig.fields) : sectionConfig.fields,
          usesApi && id && sectionConfig.api.fetchRow
            ? sectionConfig.api.fetchRow(id)
            : usesApi && id && sectionConfig.api.getById
              ? sectionConfig.api.getById(id).then((response) => sectionConfig.api.toRow ? sectionConfig.api.toRow(response.data) : response.data)
              : null,
        ]);
        const loadedFields = await Promise.all(baseFields.map(async (field) => {
          if (!field.loadOptions) return field;
          try {
            const response = await field.loadOptions();
            const options = field.getOptions ? field.getOptions(response) : response.data;
            return Array.isArray(options) ? { ...field, options } : field;
          } catch {
            // Keep the form usable if one dynamic option source is unavailable.
            return field;
          }
        }));
        if (ignore) return;
        setFields(loadedFields);
        if (loadedRecord) setValues(loadedRecord);
      } catch (error) {
        if (!ignore) setToast(getApiErrorMessage(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadFormData();
    return () => { ignore = true; };
  }, [id, sectionConfig, setValues, usesApi]);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (usesApi) {
        if (sectionConfig.api.validateValues) {
          const validationErrors = await sectionConfig.api.validateValues(values, id);
          if (validationErrors && Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
          }
        }
        if (sectionConfig.api.saveRow) {
          await sectionConfig.api.saveRow(values, id);
        } else {
          const payload = sectionConfig.api.toPayload ? sectionConfig.api.toPayload(values) : values;
          if (id && sectionConfig.api.update) await sectionConfig.api.update(id, payload);
          else if (sectionConfig.api.create) await sectionConfig.api.create(payload);
        }
      } else if (id) {
        updateRow(slug, secondary, id, values, config);
      } else {
        addRow(slug, secondary, values, config);
      }
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
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to {backLabel}</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            {loading ? (
              <div className="cms-empty">Loading record...</div>
            ) : (
              <div className="cms-form-grid">
                {fields.map((field) => <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setValue} />)}
              </div>
            )}
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || loading}>{saving ? "Saving..." : submitLabel}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
