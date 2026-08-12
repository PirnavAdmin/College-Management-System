import { Link } from "react-router-dom";
import { GraduationCap, CalendarClock, Wallet, BarChart3, ArrowRight } from "lucide-react";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { heroCopy } from "@/data/heroSlides.js";
import logo from "@/assets/P_LOGO.png";
import "./LandingPage.css";

const features = [
  { icon: GraduationCap, title: "Students & Admissions", text: "Guided admission workflow, student profiles, documents and promotion tracking." },
  { icon: CalendarClock, title: "Academics & Timetable", text: "Boards, courses, subjects, sections, faculty allocation and weekly schedules." },
  { icon: Wallet, title: "Fees & Certificates", text: "Fee structures, receipts, dues tracking and certificate issuance in one place." },
  { icon: BarChart3, title: "Exams & Analytics", text: "Marks entry, result processing and reports on attendance and collections." },
];

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register" },
  { label: "Dashboard", to: "/dashboard" },
];

const modules = ["Admissions", "Attendance", "Exams", "Fees", "Reports"];

export default function LandingPage() {
  return (
    <div className="cms-landing">
      <header className="cms-landing-nav">
        <div className="cms-landing-brand">
          <span className="cms-brand-mark logo-mark"><img src={logo} alt="Pirnav Junior College logo" /></span>
          <span><strong>{heroCopy.title}</strong><span>College Management System</span></span>
        </div>
        <div className="landing-header-actions"><ThemeToggle /><Link to="/login" className="cms-btn landing-login-btn">Login</Link></div>
      </header>

      <section className="landing-hero-banner">
        <HeroSlider variant="hero-bg" />
        <div className="landing-hero-content cms-anim-up">
          <span className="cms-eyebrow">Pirnav Junior College</span>
          <h1>Its a new opportunity </h1>
          <h1>To learn, grow & succeed</h1>
          <h1>Join Pirnav Junior College</h1>
          <p>Manage academics, students, faculty, examinations, and administration from one centralized platform.</p>
          <div className="cms-hero-actions landing-hero-actions">
            <Link to="/login" className="cms-btn landing-login-btn">Login <ArrowRight size={15} /></Link>
            <Link to="/register" className="cms-btn landing-start-btn">Get Started</Link>
          </div>
        </div>
      </section>

      <section className="cms-feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return <article key={feature.title} className="cms-feature"><span className="cms-stat-icon"><Icon size={20} /></span><h3>{feature.title}</h3><p>{feature.text}</p></article>;
        })}
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="cms-brand-mark logo-mark"><img src={logo} alt="Pirnav Junior College logo" /></span>
            <div>
              <strong>Pirnav Junior College</strong>
              <p>A centralized platform for academics, admissions and reports.</p>
            </div>
          </div>
          <div className="landing-footer-col">
            <h2>Quick Links</h2>
            {quickLinks.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          </div>
          <div className="landing-footer-col">
            <h2>Modules</h2>
            {modules.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="landing-footer-col">
            <h2>Contact</h2>
            <span>Vijayawada, Andhra Pradesh</span>
            <a href="mailto:support@pirnavcollege.com">support@pirnavcollege.com</a>
            <a href="tel:+919398649798">+91 9398649798</a>
          </div>
        </div>
        <div className="landing-footer-bottom">&copy; 2026 Pirnav Junior College. All rights reserved.</div>
      </footer>
    </div>
  );
}
