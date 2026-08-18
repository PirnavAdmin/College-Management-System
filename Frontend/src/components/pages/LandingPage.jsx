import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, BookOpenCheck, CalendarClock, CheckCircle2, GraduationCap, ShieldCheck, Users, Wallet } from "lucide-react";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { heroCopy } from "@/data/heroSlides.js";
import logo from "@/assets/P_LOGO.png";
import "./LandingPage.css";

const features = [
  { icon: GraduationCap, title: "Students & Admissions", text: "Move from enquiry to enrollment with guided admissions, complete profiles, documents and promotion tracking.", link: "/login" },
  { icon: CalendarClock, title: "Academics & Timetable", text: "Plan boards, courses, subjects, sections, faculty allocation and conflict-aware weekly schedules.", link: "/login" },
  { icon: Wallet, title: "Fees & Certificates", text: "Manage fee structures, collections, receipts, dues and certificate workflows from one secure workspace.", link: "/login" },
  { icon: BarChart3, title: "Exams & Analytics", text: "Turn marks, attendance and results into timely insights with clear operational reports.", link: "/login" },
];

const highlights = [
  { icon: Users, value: "One", label: "Connected campus workspace" },
  { icon: BookOpenCheck, value: "End-to-end", label: "Academic workflows" },
  { icon: ShieldCheck, value: "Secure", label: "Role-based access" },
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
        <div className="landing-header-actions"><ThemeToggle /><Link to="/login" className="landing-login-btn">Login</Link></div>
      </header>

      <section className="landing-hero-banner">
        <HeroSlider variant="hero-bg" />
        <div className="landing-hero-content cms-anim-up">
          <span className="cms-eyebrow"><CheckCircle2 size={14} /> A smarter campus starts here</span>
          <h1>Learn, grow and succeed with a connected college experience.</h1>
          <p>Bring students, faculty, academics, examinations, fees and administration together in one clear, reliable platform built for Pirnav Junior College.</p>
          <div className="landing-trust-points" aria-label="Platform benefits">
            <span><CheckCircle2 size={15} /> Faster daily operations</span>
            <span><CheckCircle2 size={15} /> Clear academic visibility</span>
            <span><CheckCircle2 size={15} /> Better student outcomes</span>
          </div>
          <div className="cms-hero-actions landing-hero-actions">
            <Link to="/register" className="cms-btn landing-start-btn">Get Started <ArrowRight size={16} /></Link>
            <a href="#platform-features" className="landing-explore-btn">Explore the platform</a>
          </div>
        </div>
      </section>

      <section className="landing-highlight-strip" aria-label="Platform highlights">
        {highlights.map(({ icon: Icon, value, label }) => <article key={label} className="landing-highlight-item"><span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></article>)}
      </section>

      <section id="platform-features" className="landing-feature-section">
        <div className="landing-section-heading">
          <span className="cms-eyebrow">Everything in one place</span>
          <h2>Built around the way your college works</h2>
          <p>Simple tools for every team, connected by accurate data and consistent workflows.</p>
        </div>
        <div className="cms-feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return <article key={feature.title} className="cms-feature"><span className="cms-stat-icon"><Icon size={20} /></span><h3>{feature.title}</h3><p>{feature.text}</p><Link to={feature.link} className="landing-feature-link">Open module <ArrowRight size={14} /></Link></article>;
        })}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="cms-brand-mark logo-mark"><img src={logo} alt="Pirnav Junior College logo" /></span>
            <div>
              <strong>Pirnav Junior College</strong>
              <p>One connected platform for academics, admissions, administration and student success.</p>
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
