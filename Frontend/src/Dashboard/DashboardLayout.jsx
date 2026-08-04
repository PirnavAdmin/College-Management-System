import { Outlet, NavLink } from "react-router-dom";
import "./Dashboard.css";

function DashboardLayout() {
  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <aside className="dashboard-sidebar">

        <div className="sidebar-logo">
          CMS
        </div>

        <nav className="sidebar-menu">

          <NavLink to="/dashboard" end>
            Dashboard
          </NavLink>

          <div className="sidebar-title">
            Academic Management
          </div>

          <NavLink to="/dashboard/subjects">
            Subjects
          </NavLink>

          <NavLink to="/dashboard/subjects/add">
            Add Subject
          </NavLink>

          <div className="sidebar-title">
            Faculty Management
          </div>

          <NavLink to="/dashboard/faculty">
            Faculty List
          </NavLink>

          <NavLink to="/dashboard/faculty/subject-allocation">
            Faculty Subject Allocation
          </NavLink>

</nav>

      </aside>

      {/* Main Content */}
      <div className="dashboard-main">


        <main className="dashboard-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;