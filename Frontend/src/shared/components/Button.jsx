export default function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
