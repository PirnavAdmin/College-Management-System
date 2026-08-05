import { useEffect, useMemo, useState } from "react";
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
  FiMenu,
  FiSidebar,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { env } from "../config/env";
import "./Dashboard.css";

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FiHome,
    path: "/dashboard",
  },
  {
    id: "boards",
    label: "Board Management",
    icon: FiAward,
    children: [
      { label: "Board List", to: "/dashboard/boards" },
      { label: "Add/Edit Board", to: "/dashboard/boards/new" },
    ],
  },
  {
    id: "academicYears",
    label: "Academic Year",
    icon: FiCalendar,
    children: [
      { label: "Academic Year List", to: "/dashboard/academic-years" },
      { label: "Add Academic Year", to: "/dashboard/academic-years/new" },
    ],
  },
  {
    id: "courses",
    label: "Group Management",
    icon: FiLayers,
    children: [
      { label: "Group List", to: "/dashboard/groups" },
      { label: "Add Group", to: "/dashboard/groups/add" },
    ],
  },
  {
    id: "subjects",
    label: "Subject Management",
    icon: FiBookOpen,
    children: [
      { label: "Subject List", to: "/dashboard/subjects" },
      { label: "Add Subject", to: "/dashboard/subjects/new" },
    ],
  },
  {
    id: "sections",
    label: "Section Management",
    icon: FiGrid,
    children: [{ label: "Section Management", to: "/dashboard/sections" }],
  },
  {
    id: "faculty",
    label: "Faculty Management",
    icon: FiUsers,
    children: [
      { label: "Faculty List", to: "/dashboard/faculty" },
      { label: "Add Faculty", to: "/dashboard/faculty/new" },
      { label: "Faculty Subject Allocation", to: "/dashboard/faculty/subject-allocation" },
    ],
  },
  {
    id: "admissions",
    label: "Student Admission",
    icon: FiUserPlus,
    children: [{ label: "Admission Form", to: "/dashboard/admissions/new" }],
  },
  {
    id: "students",
    label: "Student Management",
    icon: FiUsers,
    children: [{ label: "Student Profile", to: "/dashboard/students" }],
  },
  {
    id: "timetable",
    label: "Timetable",
    icon: FiCalendar,
    children: [{ label: "Create Timetable", to: "/dashboard/timetable" }],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: FiClipboard,
    children: [{ label: "Take Attendance", to: "/dashboard/attendance" }],
  },
  {
    id: "assignments",
    label: "Assignment",
    icon: FiFileText,
    children: [{ label: "Create Assignment", to: "/dashboard/assignments/new" }],
  },
  {
    id: "examinations",
    label: "Examination",
    icon: FiFileText,
    children: [
      { label: "Create Examination", to: "/dashboard/examinations/new" },
      { label: "Exam Schedule", to: "/dashboard/examinations/schedule" },
    ],
  },
  {
    id: "marksEntry",
    label: "Marks Entry",
    icon: FiClipboard,
    children: [{ label: "Marks Entry", to: "/dashboard/marks-entry" }],
  },
  {
    id: "results",
    label: "Results",
    icon: FiBarChart2,
    children: [
      { label: "Publish Results", to: "/dashboard/results/publish" },
      { label: "Student Result", to: "/dashboard/results/student" },
    ],
  },
  {
    id: "promotion",
    label: "Promotion",
    icon: FiAward,
    children: [{ label: "Promote Students", to: "/dashboard/promotions" }],
  },
  {
    id: "fees",
    label: "Fee Management",
    icon: FiCreditCard,
    children: [
      { label: "Fee Structure", to: "/dashboard/fees/structure" },
      { label: "Fee Collection", to: "/dashboard/fees/collection" },
    ],
  },
  {
    id: "certificates",
    label: "Certificates",
    icon: FiAward,
    children: [{ label: "Generate Certificate", to: "/dashboard/certificates/generate" }],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FiBarChart2,
    children: [{ label: "Reports", to: "/dashboard/reports" }],
  },
];

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeModuleId = useMemo(() => getActiveModuleId(location.pathname), [location.pathname]);
  const [expandedModule, setExpandedModule] = useState(activeModuleId);
  const user = readStoredUser();

  useEffect(() => {
    const activeModule = navigation.find((module) => module.id === activeModuleId);
    if (activeModule?.children) setExpandedModule(activeModuleId);
  }, [activeModuleId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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

  const closeDrawer = () => setDrawerOpen(false);
  const isExactActive = (path) => location.pathname === path;
  const isGroupActive = (item) => {
    if (!item.children) return isExactActive(item.path);
    return item.children.some((child) => isExactActive(child.to));
  };

  return (
    <div className={`dashboardLayout ${collapsed ? "isCollapsed" : ""}`}>
      <aside className={`dashboardSidebar ${drawerOpen ? "isDrawerOpen" : ""}`}>
        <div className="sidebarHeader">
          <Link className="sidebarBrand" to="/dashboard" onClick={() => setDrawerOpen(false)}>
            <span className="brandMark">CM</span>
            <span className="brandText">
              <strong>CMS Admin</strong>
              <small>Intermediate College</small>
            </span>
          </Link>
          <button
            className="sidebarCollapseButton"
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((current) => !current)}
          >
            <FiSidebar />
          </button>
        </div>

        <nav className="sidebarNavigation" aria-label="Main modules">
          {navigation.map((module) => {
            const Icon = module.icon;
            const active = module.children ? activeModuleId === module.id : isGroupActive(module);
            if (!module.children) {
              return (
                <Link
                  className={`navParent navDirect ${isExactActive(module.path) ? "isActive" : ""}`}
                  key={module.id}
                  title={collapsed ? module.label : undefined}
                  to={module.path}
                  onClick={closeDrawer}
                >
                  <Icon />
                  <span>{module.label}</span>
                </Link>
              );
            }
            const expanded = (expandedModule === module.id || activeModuleId === module.id) && !collapsed;
            return (
              <div className="navModule" key={module.id}>
                <button
                  className={`navParent ${active ? "isActive" : ""}`}
                  type="button"
                  aria-expanded={expanded}
                  title={collapsed ? module.label : undefined}
                  onClick={() => toggleModule(module)}
                >
                  <Icon />
                  <span>{module.label}</span>
                  <FiChevronDown className={`navChevron ${expanded ? "isOpen" : ""}`} />
                </button>
                <div className={`navChildren ${expanded ? "isOpen" : ""}`}>
                  {module.children.map((child) => (
                    <Link
                      className={`navChild ${isExactActive(child.to) ? "active" : ""}`}
                      key={child.to}
                      to={child.to}
                      onClick={closeDrawer}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <footer className="sidebarFooter">
          <div className="sidebarUser">
            <span className="sidebarAvatar">{getInitials(user?.name)}</span>
            <span className="sidebarUserText">
              <strong>{user?.name || "CMS User"}</strong>
              <small>{user?.role || "Administrator"}</small>
            </span>
          </div>
          <button className="sidebarLogout" type="button" onClick={logout} title="Logout">
            <FiLogOut />
            <span>Logout</span>
          </button>
        </footer>
      </aside>

      {drawerOpen ? (
        <button className="drawerBackdrop" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
      ) : null}

      <div className="dashboardMain">
        <header className="dashboardTopbar">
          <button className="mobileMenuButton" type="button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
            <FiMenu />
          </button>
          <div className="topbarTitle">
            <strong>College Management System</strong>
            <span>Administrative workspace</span>
          </div>
          <div className="topbarSpacer" />
          {env.enableMockAuth ? <span className="demoModeBadge">Demo Mode</span> : null}
        </header>
        <main className="dashboardContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getActiveModuleId(pathname) {
  const module = navigation.find((item) =>
    item.children
      ? item.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))
      : pathname === item.path,
  );
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
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
