import authImage from "../assets/college.jpg";
import "../styles/Auth.css";

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-container">
      <div className="background-wrapper">

        <img
          src={authImage}
          alt="College"
          className="background-image"
        />

        <div className="overlay"></div>

        {/* Left Side */}
        <div className="hero-content">
          <h1>College Management System</h1>

          <h3>Smart Campus • Smart Future</h3>

          <p>
            A modern College Management System designed to simplify
            academic and administrative operations through one secure
            platform.
          </p>

          <div className="feature-list">
            <div className="feature-card">🎓 Student Management</div>
            <div className="feature-card">👨‍🏫 Faculty Portal</div>
            <div className="feature-card">📅 Attendance Tracking</div>
            <div className="feature-card">📊 Results & Reports</div>
            <div className="feature-card">🔐 Secure Authentication</div>
            <div className="feature-card">📚 Course Management</div>
          </div>
        </div>

        {/* Right Side */}
        <div className="form-section">
          <div className="auth-card">
            <h2>{title}</h2>
            <p>{subtitle}</p>

            {children}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AuthLayout;