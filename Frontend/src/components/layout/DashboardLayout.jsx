import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Landmark, BookOpen, Library, Layers3, Users, UserPlus,
  GraduationCap, CalendarClock, ClipboardCheck, FileText, FileSpreadsheet, PenLine,
  Award, ArrowUpRight, Wallet, ScrollText, BarChart3, Menu, Bell, Search, ChevronRight,
  ChevronDown, Settings, User, LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { useSidebar } from "@/hooks/useSidebar.js";
import { notifications } from "@/data/mockData.js";
import "./DashboardLayout.css";

export const menu = [
  { section: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Academics",
    items: [
      { to: "/dashboard/boards", label: "Board & Academic Year Management", icon: Landmark },
      { to: "/dashboard/courses", label: "Group Management", icon: BookOpen },
      { to: "/dashboard/subjects", label: "Subject Management", icon: Library },
      { to: "/dashboard/sections", label: "Section Management", icon: Layers3 },
    ],
  },
  {
    section: "People",
    items: [
      {
        to: "/dashboard/faculty",
        label: "Faculty Management",
        icon: Users,
      },
      { to: "/dashboard/admission", label: "Student Admission", icon: UserPlus },
      { to: "/dashboard/students", label: "Student Management", icon: GraduationCap },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/dashboard/timetable", label: "Timetable", icon: CalendarClock },
      { to: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck },
      { to: "/dashboard/assignments", label: "Assignments", icon: FileText, children: [{ to: "/dashboard/assignments", label: "Assignment Creation", icon: FileText }, { to: "/dashboard/assignments/submissions", label: "Submissions", icon: ClipboardCheck }] },
    ],
  },
  {
    section: "Examinations",
    items: [
      { to: "/dashboard/examinations", label: "Examination", icon: FileSpreadsheet },
      { to: "/dashboard/marks-entry", label: "Marks Evaluation", icon: PenLine },
      { to: "/dashboard/results", label: "Results", icon: Award },
      { to: "/dashboard/promotion", label: "Promotion", icon: ArrowUpRight },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/dashboard/fee-structure", label: "Fee Management", icon: Wallet },
      { to: "/dashboard/certificates", label: "Certificates", icon: ScrollText },
      { to: "/dashboard/reports", label: "Reports & Analytics", icon: BarChart3 },
    ],
  },
];

const SIDEBAR_SCROLL_KEY = "cms_sidebar_scroll_top";

const searchIndex = menu.flatMap((g) =>
  g.items.flatMap((item) => [
    { to: item.to, label: item.label, section: g.section },
    ...(item.children || []).map((c) => ({ to: c.to, label: c.label, section: item.label })),
  ]),
);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function initials(name = "CMS Admin") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardLayout({ title, subtitle, breadcrumb = [], actions, children }) {
  const { ready, navOpen, setNavOpen, facultyOpen, setFacultyOpen, assignmentsOpen, setAssignmentsOpen } = useSidebar();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const actionsRef = useRef(null);
  const searchRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const savedScrollTopRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const user = readUser();
  const profileName = user?.name && user.name !== user?.email ? user.name : "CMS Admin";
  const profileEmail = user?.email || "Admin@CMS.com";
  const profileRole = user?.role || "admin";

  const rememberSidebarScroll = () => {
    const scrollTop = sidebarNavRef.current?.scrollTop || 0;
    savedScrollTopRef.current = scrollTop;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
    } catch {
      // Session storage can be unavailable in private browsing modes.
    }
  };

  useEffect(() => {
    let storedScrollTop = savedScrollTopRef.current;
    try {
      const stored = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY));
      storedScrollTop = Number.isFinite(stored) ? stored : storedScrollTop;
    } catch {
      storedScrollTop = savedScrollTopRef.current;
    }
    savedScrollTopRef.current = storedScrollTop;
    const frame = requestAnimationFrame(() => {
      if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = savedScrollTopRef.current;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(() => {
    if (pathname.startsWith("/dashboard/faculty")) setFacultyOpen(true);
    if (pathname.startsWith("/dashboard/assignments")) setAssignmentsOpen(true);
  }, [pathname, setAssignmentsOpen, setFacultyOpen]);

  useEffect(() => {
    const onPointer = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? searchIndex.filter((i) => i.label.toLowerCase().includes(q)) : searchIndex;
    return list.slice(0, 8);
  }, [query]);

  const goTo = (to) => {
    rememberSidebarScroll();
    setSearchOpen(false);
    setQuery("");
    navigate(to);
  };

  const closeOnMobile = () => {
    rememberSidebarScroll();
    if (typeof window !== "undefined" && window.innerWidth <= 992) setNavOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const isActive = (to) => (to === "/dashboard" ? pathname === "/dashboard" : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <div className={`cms-shell ${ready ? "is-ready" : ""} ${navOpen ? "" : "nav-closed"}`}>
      <aside className={`cms-sidebar ${ready && navOpen ? "is-open" : ""}`}>
        <div className="cms-brand">
          <h1 className="cms-brand-title">Pirnav Junior College</h1>
        </div>
        <nav className="cms-nav" ref={sidebarNavRef} onScroll={rememberSidebarScroll}>
          {menu.map((group) => (
            <div key={group.section}>
              <div className="cms-nav-group">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                if (item.children) {
                  const isFacultyMenu = item.to === "/dashboard/faculty";
                  const isOpen = isFacultyMenu ? facultyOpen : assignmentsOpen;
                  const setOpen = isFacultyMenu ? setFacultyOpen : setAssignmentsOpen;
                  const childIsActive = (child) => child.to === "/dashboard/assignments" ? pathname === child.to : isActive(child.to);
                  return (
                    <div key={item.to}>
                      <div className="cms-nav-parent">
                        <Link to={item.to} className={`cms-nav-link ${active && !item.children.some(childIsActive) ? "is-active" : ""}`} onClick={closeOnMobile}>
                          <Icon size={17} /> {item.label}
                        </Link>
                        <button type="button" className={`cms-nav-caret ${isOpen ? "is-open" : ""}`} aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`} aria-expanded={isOpen} onClick={() => setOpen((v) => !v)}>
                          <ChevronDown size={15} />
                        </button>
                      </div>
                      {isOpen
                        ? item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return <Link key={child.to} to={child.to} className={`cms-nav-link cms-nav-sub ${childIsActive(child) ? "is-active" : ""}`} onClick={closeOnMobile}><ChildIcon size={15} /> {child.label}</Link>;
                          })
                        : null}
                    </div>
                  );
                }
                return <Link key={item.to} to={item.to} className={`cms-nav-link ${active ? "is-active" : ""}`} onClick={closeOnMobile}><Icon size={17} /> {item.label}</Link>;
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className={`cms-backdrop-mobile ${ready && navOpen ? "is-open" : ""}`} onClick={() => setNavOpen(false)} />

      <div className="cms-main">
        <header className="cms-topbar">
          <button className="cms-icon-btn" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={navOpen}><Menu size={18} /></button>
          <div className="cms-search-wrap" ref={searchRef}>
            <div className="cms-search-top">
              <Search size={16} />
              <input placeholder="Search pages and modules..." value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label="Search pages" />
            </div>
            {searchOpen ? (
              <div className="cms-search-panel">
                {suggestions.length ? suggestions.map((s) => (
                  <button key={s.to} type="button" className="cms-search-item" onMouseDown={(e) => e.preventDefault()} onClick={() => goTo(s.to)}>
                    <span>{s.label}</span><small>{s.section}</small>
                  </button>
                )) : <div className="cms-search-empty">No matching pages</div>}
              </div>
            ) : null}
          </div>
          <div className="cms-top-actions" ref={actionsRef}>
            <ThemeToggle />
            <button className="cms-icon-btn" aria-label="Notifications" aria-expanded={notifOpen} onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}>
              <Bell size={18} /><span className="cms-dot" />
            </button>
            <button className="cms-profile-btn" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
              <span className="cms-avatar">{initials(profileName)}</span>
              <span className="cms-profile-meta"><strong>{profileName}</strong><span>{profileRole}</span></span>
            </button>

            {notifOpen ? <div className="cms-dropdown"><div className="cms-dropdown-head"><strong>Notifications</strong></div>{notifications.map((n) => <div key={n.id} className="cms-notif-item"><p>{n.title}</p><span>{n.time}</span></div>)}</div> : null}

            {profileOpen ? (
              <div className="cms-dropdown">
                <div className="cms-dropdown-head"><strong>{profileName}</strong><div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{profileEmail}</div><div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 3 }}>{profileRole}</div></div>
                <button className="cms-dropdown-item"><User size={15} /> My Profile</button>
                <button className="cms-dropdown-item"><Settings size={15} /> Settings</button>
                <button type="button" className="cms-dropdown-item danger" onClick={logout}><LogOut size={15} /> Logout</button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="cms-content">
          <div className="cms-breadcrumb">
            <Link to="/dashboard">Home</Link>
            {breadcrumb.map((b) => <span key={b} style={{ display: "flex", alignItems: "center", gap: 6 }}><ChevronRight size={13} /> <span>{b}</span></span>)}
            <ChevronRight size={13} /><strong>{title}</strong>
          </div>

          <div className="cms-page-head">
            <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
            {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}


