import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMoon,
  FiSearch,
  FiMenu,
  FiSun,
  FiX,
  FiUserPlus,
  FiUsers,
  FiBell,
} from "react-icons/fi";
import "./Dashboard.css";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: FiHome, path: "/dashboard" },
  { id: "boards", label: "Board Management", icon: FiAward, children: [{ label: "Board List", to: "/dashboard/boards" }, { label: "Add/Edit Board", to: "/dashboard/boards/new" }] },
  { id: "academicYears", label: "Academic Year", icon: FiCalendar, children: [{ label: "Academic Year List", to: "/dashboard/academic-years" }, { label: "Add Academic Year", to: "/dashboard/academic-years/new" }] },
  { id: "courses", label: "Group Management", icon: FiLayers, children: [{ label: "Group List", to: "/dashboard/groups" }, { label: "Add Group", to: "/dashboard/groups/add" }] },
  { id: "subjects", label: "Subject Management", icon: FiBookOpen, children: [{ label: "Subject List", to: "/dashboard/subjects" }, { label: "Add Subject", to: "/dashboard/subjects/new" }] },
  { id: "sections", label: "Section Management", icon: FiGrid, children: [{ label: "Section Management", to: "/dashboard/sections" }] },
  { id: "faculty", label: "Faculty Management", icon: FiUsers, children: [{ label: "Faculty List", to: "/dashboard/faculty" }, { label: "Add Faculty", to: "/dashboard/faculty/new" }, { label: "Faculty Subject Allocation", to: "/dashboard/faculty/subject-allocation" }] },
  { id: "admissions", label: "Student Admission", icon: FiUserPlus, children: [{ label: "Admission Form", to: "/dashboard/admissions/new" }] },
  { id: "students", label: "Student Management", icon: FiUsers, children: [{ label: "Student Profile", to: "/dashboard/students" }] },
  { id: "timetable", label: "Timetable", icon: FiCalendar, children: [{ label: "Create Timetable", to: "/dashboard/timetable" }] },
  { id: "attendance", label: "Attendance", icon: FiClipboard, children: [{ label: "Take Attendance", to: "/dashboard/attendance" }] },
  { id: "assignments", label: "Assignment", icon: FiFileText, children: [{ label: "Create Assignment", to: "/dashboard/assignments/new" }] },
  { id: "examinations", label: "Examination", icon: FiFileText, children: [{ label: "Create Examination", to: "/dashboard/examinations/new" }, { label: "Exam Schedule", to: "/dashboard/examinations/schedule" }] },
  { id: "marksEntry", label: "Marks Entry", icon: FiClipboard, children: [{ label: "Marks Entry", to: "/dashboard/marks-entry" }] },
  { id: "results", label: "Results", icon: FiBarChart2, children: [{ label: "Publish Results", to: "/dashboard/results/publish" }, { label: "Student Result", to: "/dashboard/results/student" }] },
  { id: "promotion", label: "Promotion", icon: FiAward, children: [{ label: "Promote Students", to: "/dashboard/promotions" }] },
  { id: "fees", label: "Fee Management", icon: FiCreditCard, children: [{ label: "Fee Structure", to: "/dashboard/fees/structure" }, { label: "Fee Collection", to: "/dashboard/fees/collection" }] },
  { id: "certificates", label: "Certificates", icon: FiAward, children: [{ label: "Generate Certificate", to: "/dashboard/certificates/generate" }] },
  { id: "reports", label: "Reports", icon: FiBarChart2, children: [{ label: "Reports", to: "/dashboard/reports" }] },
];

const moduleSearchItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Board List", path: "/dashboard/boards" },
  { label: "Add/Edit Board", path: "/dashboard/boards/add" },
  { label: "Academic Year", path: "/dashboard/academic-years" },
  { label: "Group List", path: "/dashboard/groups" },
  { label: "Add Group", path: "/dashboard/groups/add" },
  { label: "Subject List", path: "/dashboard/subjects" },
  { label: "Add Subject", path: "/dashboard/subjects/add" },
  { label: "Section Management", path: "/dashboard/sections" },
  { label: "Faculty List", path: "/dashboard/faculty" },
  { label: "Faculty Subject Allocation", path: "/dashboard/faculty/subject-allocation" },
  { label: "Student Admission", path: "/dashboard/admissions" },
  { label: "Student Management", path: "/dashboard/students" },
  { label: "Timetable", path: "/dashboard/timetable" },
  { label: "Attendance", path: "/dashboard/attendance" },
  { label: "Assignments", path: "/dashboard/assignments" },
  { label: "Examinations", path: "/dashboard/examinations" },
  { label: "Exam Schedule", path: "/dashboard/examinations/schedule" },
  { label: "Marks Entry", path: "/dashboard/marks-entry" },
  { label: "Publish Results", path: "/dashboard/results/publish" },
  { label: "Student Result", path: "/dashboard/results/student" },
  { label: "Promotion", path: "/dashboard/promotion" },
  { label: "Fee Structure", path: "/dashboard/fees/structure" },
  { label: "Fee Collection", path: "/dashboard/fees/collection" },
  { label: "Certificates", path: "/dashboard/certificates" },
  { label: "Reports", path: "/dashboard/reports" },
];

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedModule, setExpandedModule] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("cms_theme") || "light");
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const activeModuleId = useMemo(() => getActiveModuleId(location.pathname), [location.pathname]);
  const user = readStoredUser();
  const userName =
    user?.name && user.name !== user?.email
      ? user.name
      : user?.role === "admin"
        ? "CMS Admin"
        : "CMS User";
  const userEmail = user?.email || "";
  const userRole = user?.role || "admin";

  useEffect(() => {
    const activeModule = navigation.find((module) => module.id === activeModuleId);
    if (activeModule?.children) setExpandedModule(activeModuleId);
  }, [activeModuleId]);

  useEffect(() => {
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    localStorage.setItem("cms_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setSearchOpen(false);
        setProfileOpen(false);
      }
    };
    const onPointerDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return moduleSearchItems;
    return moduleSearchItems.filter((item) => item.label.toLowerCase().includes(term));
  }, [search]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const toggleModule = (module) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedModule(module.id);
      return;
    }
    setExpandedModule((current) => (current === module.id ? "" : module.id));
  };

  const openModule = (path) => {
    navigate(path);
    setSearch("");
    setSearchOpen(false);
    setDrawerOpen(false);
  };

  const closeDrawer = () => setDrawerOpen(false);
  const handleSidebarToggle = () => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setDrawerOpen(true);
      return;
    }
    setCollapsed((current) => !current);
  };
  const isExactActive = (path) => location.pathname === path;
  const isGroupActive = (item) => {
    if (!item.children) return isExactActive(item.path);
    return item.children.some((child) => isExactActive(child.to));
  };

  return (
    <div className={`dashboardLayout ${collapsed ? "isCollapsed" : ""}`}>
      <aside id="dashboard-navigation" className={`dashboardSidebar ${drawerOpen ? "isDrawerOpen" : ""}`} aria-label="Dashboard navigation">
        <div className="sidebarHeader">
          <Link className="sidebarBrand" to="/dashboard" onClick={() => setDrawerOpen(false)}>
            <span className="brandMark">CMS</span>
            <span className="brandText"><strong>CMS Admin</strong><small>Intermediate College</small></span>
          </Link>
          {/* <button className="sidebarCloseButton" type="button" aria-label="Close navigation" onClick={closeDrawer}><FiX /></button> */}
        </div>

        <nav className="sidebarNavigation" aria-label="Main modules">
          {navigation.map((module) => {
            const Icon = module.icon;
            const active = module.children ? activeModuleId === module.id : isGroupActive(module);
            if (!module.children) {
              return <Link className={`navParent navDirect ${isExactActive(module.path) ? "isActive" : ""}`} key={module.id} title={collapsed ? module.label : undefined} to={module.path} onClick={closeDrawer}><Icon /><span>{module.label}</span></Link>;
            }
            const expanded = (expandedModule === module.id || activeModuleId === module.id) && !collapsed;
            return (
              <div className="navModule" key={module.id}>
                <button className={`navParent ${active ? "isActive" : ""}`} type="button" aria-expanded={expanded} title={collapsed ? module.label : undefined} onClick={() => toggleModule(module)}><Icon /><span>{module.label}</span><FiChevronDown className={`navChevron ${expanded ? "isOpen" : ""}`} /></button>
                <div className={`navChildren ${expanded ? "isOpen" : ""}`}>{module.children.map((child) => <Link className={`navChild ${isExactActive(child.to) ? "active" : ""}`} key={child.to} to={child.to} onClick={closeDrawer}>{child.label}</Link>)}</div>
              </div>
            );
          })}
        </nav>
      </aside>

      {drawerOpen ? <button className="drawerBackdrop" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} /> : null}

      <div className="dashboardMain">
        <header className="dashboardTopbar">
          <div className="topbarInner">
            <button className="dashboardMenuToggle" type="button" aria-label={drawerOpen ? "Close navigation" : "Open navigation"} aria-controls="dashboard-navigation" aria-expanded={drawerOpen} onClick={handleSidebarToggle}><FiMenu /></button>
            <div className="moduleSearch" ref={searchRef}>
              <FiSearch className="moduleSearchIcon" />
              <input value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} placeholder="Search..." />
              {searchOpen ? <div className="moduleSearchMenu">{filteredModules.length ? filteredModules.map((item) => <button key={item.path} type="button" onClick={() => openModule(item.path)}>{item.label}</button>) : <p>No modules found</p>}</div> : null}
            </div>
            <div className="topbarSpacer" />
          </div>
          <button className="topbarIconButton" type="button" aria-label="Notifications"><FiBell /></button>
          <button className="topbarIconButton" type="button" aria-label="Toggle theme" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? <FiSun /> : <FiMoon />}</button>
          <div className="topbarProfile" ref={profileRef}>
            <button className="profileButton" type="button" aria-label="Open profile" onClick={() => setProfileOpen((current) => !current)}>
              <span className="profileAvatarFallback" aria-hidden="true">{getInitials(userName)}</span>
              <span className="profileName">{userName}</span>
            </button>
            {profileOpen ? <div className="profileMenu"><strong>{userName}</strong>{userEmail ? <span>{userEmail}</span> : null}<small>{userRole}</small><button type="button" onClick={logout}><FiLogOut /> Logout</button></div> : null}
          </div>
        </header>
        <main className="dashboardContent"><Outlet /></main>
      </div>
    </div>
  );
}

function getActiveModuleId(pathname) {
  const module = navigation.find((item) => item.children ? item.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`)) : pathname === item.path);
  return module?.id || "dashboard";
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




