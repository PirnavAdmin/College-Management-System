import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Landmark, BookOpen, Library, Layers3, Users, UserPlus,
  GraduationCap, CalendarClock, ClipboardCheck, FileText, FileSpreadsheet, PenLine,
  Award, ArrowUpRight, Wallet, ScrollText, BarChart3, PanelLeft, Bell, Search, ChevronRight,
  ChevronDown, Settings, User, LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { useSidebar } from "@/hooks/useSidebar.js";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import "./DashboardLayout.css";

export const menu = [
  { section: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Academics",
    items: [
      { to: "/dashboard/board-academic-year", label: "Board & Academic Year Management", icon: Landmark },
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
        label: "Staff Management",
        icon: Users,
      },
      { to: "/dashboard/admission", label: "Student Admission", icon: UserPlus },
      { to: "/dashboard/section-allocation", label: "Section Allocation", icon: Layers3 },
      { to: "/dashboard/students", label: "Student Management", icon: GraduationCap },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/dashboard/timetable", label: "Timetable", icon: CalendarClock },
      { to: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck, children: [
        { to: "/dashboard/attendance/student", label: "Student", icon: ClipboardCheck },
        { to: "/dashboard/attendance/staff", label: "Staff", icon: ClipboardCheck },
      ] },
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
const NOTIFICATION_REFRESH_INTERVAL = 60_000;
const EMPTY_NOTIFICATION_SOURCES = [];
const PENDING_STATUSES = new Set(["pending", "draft", "requested", "generated", "reviewed", "new", "created", "incomplete", "unpublished"]);

const unwrapNotificationPayload = (payload) => {
  let value = payload;
  const seen = new Set();
  while (value && typeof value === "object" && !Array.isArray(value) && !seen.has(value)) {
    seen.add(value);
    const next = value.data ?? value.Data ?? value.result ?? value.Result;
    if (next === undefined || next === value) break;
    value = next;
  }
  return value;
};

const notificationRows = (payload) => {
  const value = unwrapNotificationPayload(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const notificationStatus = (item = {}) => String(item.status ?? item.Status ?? item.workflowStatus ?? item.WorkflowStatus ?? "").trim().toLowerCase();
const pendingRowCount = (payload, predicate = (item) => PENDING_STATUSES.has(notificationStatus(item))) => notificationRows(payload).filter(predicate).length;

const pendingActionSources = [
  {
    id: "admissions",
    endpoint: apiEndpoints.admissions.getAll,
    to: "/dashboard/admission",
    label: "admission",
    count: (payload) => pendingRowCount(payload),
  },
  {
    id: "fees",
    endpoint: apiEndpoints.fee.getDue,
    to: "/dashboard/fee-structure",
    label: "fee account",
    count: (payload) => pendingRowCount(payload, (item) => !["paid", "completed", "settled"].includes(notificationStatus(item))),
  },
  {
    id: "assignments",
    endpoint: apiEndpoints.assignments.adminList,
    to: "/dashboard/assignments",
    label: "assignment",
    count: (payload) => pendingRowCount(payload, (item) => item.isPublished === false || item.IsPublished === false || PENDING_STATUSES.has(notificationStatus(item))),
  },
];

const searchIndex = menu.flatMap((g) =>
  g.items.flatMap((item) => [
    { to: item.to, label: item.label, section: g.section },
    ...(item.children || []).map((c) => ({ to: c.to, label: c.label, section: item.label })),
  ]),
);

const normalizeBreadcrumbLabel = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const breadcrumbKey = (value) => normalizeBreadcrumbLabel(value).toLowerCase();

const menuBreadcrumbForPath = (pathname) => {
  let bestMatch = null;
  const consider = (to, labels) => {
    const matches = pathname === to || pathname.startsWith(`${to}/`);
    if (!matches) return;
    const score = to.length + (pathname === to ? 10_000 : 0);
    if (!bestMatch || score > bestMatch.score) bestMatch = { to, labels, score };
  };

  menu.forEach((group) => {
    group.items.forEach((item) => {
      consider(item.to, [group.section, item.label]);
      (item.children || []).forEach((child) => {
        if (child.to !== item.to) consider(child.to, [group.section, item.label, child.label]);
      });
    });
  });

  return bestMatch;
};

const uniqueBreadcrumbLabels = (labels, currentTitle) => {
  const titleKey = breadcrumbKey(currentTitle);
  const seen = new Set();
  return labels.flatMap((label) => {
    const normalized = normalizeBreadcrumbLabel(label);
    const key = breadcrumbKey(normalized);
    if (!key || key === "home" || key === titleKey || seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
};

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

export default function DashboardLayout({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  children,
  excludeNotificationSources = EMPTY_NOTIFICATION_SOURCES,
}) {
  const { ready, navOpen, setNavOpen, facultyOpen, setFacultyOpen, assignmentsOpen, setAssignmentsOpen } = useSidebar();
  const [attendanceOpen, setAttendanceOpen] = useState(false);
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
  const resolvedBreadcrumb = useMemo(() => {
    const provided = Array.isArray(breadcrumb) ? breadcrumb : [];
    const menuLabels = menuBreadcrumbForPath(pathname)?.labels ?? [];
    return uniqueBreadcrumbLabels(provided.length ? provided : menuLabels, title);
  }, [breadcrumb, pathname, title]);
  const user = readUser();
  const profileName = user?.name && user.name !== user?.email ? user.name : "CMS Admin";
  const profileEmail = user?.email || "Admin@CMS.com";
  const profileRole = user?.role || "admin";
  const pendingActionCount = MOCK_NOTIFICATIONS.reduce((total, item) => total + item.count, 0);

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
  }, [pathname, setFacultyOpen]);
  useEffect(() => {
    if (pathname.startsWith("/dashboard/attendance/")) setAttendanceOpen(true);
  }, [pathname]);

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
          <img className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
          <button className="cms-icon-btn cms-menu-toggle cms-brand-toggle" type="button" onClick={() => setNavOpen(false)} aria-label="Close sidebar" aria-expanded={navOpen}><PanelLeft aria-hidden="true" /></button>
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
                  const isAttendanceMenu = item.to === "/dashboard/attendance";
                  const isOpen = isFacultyMenu ? facultyOpen : isAttendanceMenu ? attendanceOpen : assignmentsOpen;
                  const setOpen = isFacultyMenu ? setFacultyOpen : isAttendanceMenu ? setAttendanceOpen : setAssignmentsOpen;
                  const childIsActive = (child) => child.to === "/dashboard/assignments" ? pathname === child.to : isActive(child.to);
                  return (
                    <div key={item.to}>
                      <div className="cms-nav-parent">
                        <Link
                          to={item.to}
                          className={`cms-nav-link ${active && !item.children.some(childIsActive) ? "is-active" : ""}`}
                          onClick={(event) => {
                            if (isAttendanceMenu) {
                              event.preventDefault();
                              setOpen((v) => !v);
                            }
                            closeOnMobile();
                          }}
                        >
                          <Icon size={17} /> {item.label}
                        </Link>
                        <button type="button" className={`cms-nav-caret ${isOpen ? "is-open" : ""}`} aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`} aria-expanded={isOpen} onClick={() => setOpen((v) => !v)}>
                          <ChevronDown size={15} />
                        </button>
                      </div>
                      {isOpen
                        ? item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return <Link key={child.to} to={child.to} className={`cms-nav-link cms-nav-sub ${childIsActive(child) ? "is-active" : ""}`} onClick={() => { if (item.to === "/dashboard/assignments") setAssignmentsOpen(false); if (item.to === "/dashboard/attendance") setAttendanceOpen(false); closeOnMobile(); }}><ChildIcon size={15} /> {child.label}</Link>;
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
          {!navOpen ? <button className="cms-icon-btn cms-menu-toggle" type="button" onClick={() => setNavOpen(true)} aria-label="Open sidebar" aria-expanded={navOpen}><PanelLeft aria-hidden="true" /></button> : null}
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
            <button className="cms-icon-btn" aria-label={`${pendingActionCount} sample notifications`} aria-expanded={notifOpen} onClick={() => { setNotifOpen((open) => !open); setProfileOpen(false); }}>
              <Bell size={18} />{pendingActionCount > 0 ? <span className="cms-notification-badge">{pendingActionCount > 99 ? "99+" : pendingActionCount}</span> : null}
            </button>
            <button className="cms-profile-btn" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
              <span className="cms-avatar">{initials(profileName)}</span>
              <span className="cms-profile-meta"><strong>{profileName}</strong><span>{profileRole}</span></span>
            </button>

            {notifOpen ? (
              <div className="cms-dropdown cms-notifications-dropdown">
                <div className="cms-dropdown-head cms-notifications-head">
                  <div><strong>Notifications</strong><small>Sample activity</small></div>
                </div>
                {MOCK_NOTIFICATIONS.map((notification) => (
                  <button key={notification.id} type="button" className="cms-notif-item" onClick={() => { setNotifOpen(false); goTo(notification.to); }}>
                    <span className="cms-notif-count">{notification.count}</span>
                    <span><p>{notification.title}</p><small>Open {notification.label}s</small></span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}

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
          <nav className="cms-breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard">Home</Link>
            {resolvedBreadcrumb.map((label) => <span key={label} className="cms-breadcrumb-step"><ChevronRight size={13} aria-hidden="true" /><span>{label}</span></span>)}
            <ChevronRight size={13} aria-hidden="true" /><strong aria-current="page">{title}</strong>
          </nav>

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


