import collegeImage from "../assets/college.jpg";
import "../features/auth/styles/auth.css";

const features = [
  { icon: "🎓", label: "Student Management" },
  { icon: "👨‍🏫", label: "Faculty Portal" },
  { icon: "🗓️", label: "Attendance Tracking" },
  { icon: "📊", label: "Results & Reports" },
  { icon: "🔐", label: "Secure Authentication" },
  { icon: "📚", label: "Group Management" },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-page">
      <img className="auth-background" src={collegeImage} alt="College campus" />
      <div className="auth-overlay" />
      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="College Management System">
          <h1>College Management System</h1>
          <h2>Smart Campus • Smart Future</h2>
          <p>
            A modern College Management System designed to simplify academic
            and administrative operations through one secure platform.
          </p>
          <div className="auth-feature-grid">
            {features.map((feature) => (
              <div className="auth-feature-card" key={feature.label}>
                <span aria-hidden="true">{feature.icon}</span>
                <strong>{feature.label}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="auth-form-panel">
          {title || subtitle ? (
            <div className="auth-card">
              <div className="auth-card-header">
                {title ? <h2>{title}</h2> : null}
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
              {children}
            </div>
          ) : (
            children
          )}
        </section>
      </div>
    </main>
  );
}
