export default function FormField({
  label,
  error,
  required = false,
  children,
  className = "",
}) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <label>
        {label}
        {required ? <span className="required">*</span> : null}
      </label>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
