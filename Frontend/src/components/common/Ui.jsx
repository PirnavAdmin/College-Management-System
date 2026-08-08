import { useEffect, useState } from "react";
import { CheckCircle2, X, AlertTriangle, Eye, EyeOff } from "lucide-react";

export function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  let cls = "cms-badge-inactive";
  if (["active", "paid", "pass", "published", "present"].includes(v)) cls = "cms-badge-active";
  else if (["partial", "pending", "late"].includes(v)) cls = "cms-badge-warn";
  else if (["due", "fail", "absent"].includes(v)) cls = "cms-badge-danger";
  else if (["inactive"].includes(v)) cls = "cms-badge-inactive";
  return <span className={`cms-badge ${cls}`}>{value}</span>;
}

export function Loader({ label = "Loading data..." }) {
  return (
    <div className="cms-loader">
      <div className="cms-spinner" />
      <p style={{ margin: 0, color: "var(--cms-muted)", fontSize: 13 }}>{label}</p>
    </div>
  );
}

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="cms-toast" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  );
}

export function Modal({ title, children, footer, onClose, size }) {
  return (
    <div className="cms-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cms-modal ${size === "sm" ? "sm" : ""}`} role="dialog" aria-modal="true">
        <div className="cms-modal-head">
          <h3>{title}</h3>
          <button className="cms-action-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="cms-modal-body">{children}</div>
        {footer ? <div className="cms-modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = "Delete record", message, onCancel, onConfirm }) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="cms-btn cms-btn-danger" onClick={onConfirm}>Yes, delete</button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 12 }}>
        <span className="cms-stat-icon" style={{ background: "var(--cms-red-soft)", color: "var(--cms-red)" }}>
          <AlertTriangle size={20} />
        </span>
        <p style={{ margin: 0, color: "var(--cms-muted)" }}>
          {message || "This action cannot be undone. Are you sure you want to delete this record?"}
        </p>
      </div>
    </Modal>
  );
}

export function Field({ field, value, error, onChange }) {
  const { name, label, type = "text", options = [], required, placeholder, full } = field;
  const id = `f-${name}`;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={`cms-field ${full ? "full" : ""} ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      {type === "select" ? (
        <select id={id} value={value ?? ""} onChange={(e) => onChange(name, e.target.value)}>
          <option value="">Select {label}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(name, e.target.value)} />
      ) : type === "checkbox" ? (
        <span className="cms-check">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(name, e.target.checked)} />
          <span>{placeholder || "Yes"}</span>
        </span>
      ) : isPassword ? (
        <span className="cms-password">
          <input
            id={id}
            type={reveal ? "text" : "password"}
            value={value ?? ""}
            placeholder={placeholder || label}
            onChange={(e) => onChange(name, e.target.value)}
          />
          <button
            type="button"
            className="cms-eye-btn"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            title={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </span>
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ""}
          placeholder={placeholder || label}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

export function useForm(fields, initial) {
  const [values, setValues] = useState(initial || {});
  const [errors, setErrors] = useState({});
  const setValue = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const validate = () => {
    const next = {};
    fields.forEach((f) => {
      const val = values[f.name];
      if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
        next[f.name] = `${f.label} is required`;
      } else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        next[f.name] = "Enter a valid email address";
      } else if (f.type === "tel" && val && !/^[0-9]{10}$/.test(String(val))) {
        next[f.name] = "Enter a valid 10 digit mobile number";
      } else if (f.type === "number" && val && Number.isNaN(Number(val))) {
        next[f.name] = "Enter a valid number";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  return { values, errors, setValue, validate, setValues };
}

export function FormModal({ title, fields, initial, columns = 2, onCancel, onSave }) {
  const { values, errors, setValue, validate } = useForm(fields, initial);
  const [saving, setSaving] = useState(false);
  const submit = () => {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave(values);
    }, 500);
  };
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className={`cms-form-grid ${columns === 3 ? "cols-3" : ""}`}>
        {fields.map((f) => (
          <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
        ))}
      </div>
    </Modal>
  );
}

export function FilterBar({ fields, values, onChange, onApply }) {
  return (
    <div className="cms-card" style={{ marginBottom: 16 }}>
      <div className="cms-card-body">
        <div className="cms-filters">
          {fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} onChange={onChange} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="cms-btn cms-btn-primary" onClick={onApply}>Load Data</button>
          <button className="cms-btn cms-btn-ghost" onClick={() => onChange("__reset__", null)}>Reset</button>
        </div>
      </div>
    </div>
  );
}


