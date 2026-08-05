export default function Card({ children, className = "", padded = true, ...props }) {
  return (
    <section className={`card ${padded ? "card-pad" : ""} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
