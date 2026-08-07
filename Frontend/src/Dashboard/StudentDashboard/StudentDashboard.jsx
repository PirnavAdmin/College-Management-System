import { useNavigate } from "react-router-dom";
import { FiBell, FiBookOpen, FiClipboard, FiCreditCard, FiLogOut, FiUser } from "react-icons/fi";
import "./StudentDashboard.css";

const cards = [
  { title: "My Profile", icon: FiUser },
  { title: "Attendance", icon: FiClipboard },
  { title: "Assignments", icon: FiBookOpen },
  { title: "Results", icon: FiClipboard },
  { title: "Fee Details", icon: FiCreditCard },
  { title: "Announcements", icon: FiBell },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = readStoredUser();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  return (
    <main className="studentDashboard">
      <header className="studentTopbar">
        <div>
          <h1>Student Dashboard</h1>
          <p>Welcome to your college portal.</p>
        </div>
        <div className="studentProfile">
          <span className="studentAvatar">{getInitials(user?.name)}</span>
          <div>
            <strong>{user?.name || "CMS User"}</strong>
            <small>{user?.email || "Student"}</small>
          </div>
          <button type="button" onClick={logout}><FiLogOut /> Logout</button>
        </div>
      </header>

      <section className="studentGrid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="studentCard" key={card.title}>
              <span><Icon /></span>
              <h2>{card.title}</h2>
              <p>Implementation pending</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getInitials(name = "CMS User") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}
