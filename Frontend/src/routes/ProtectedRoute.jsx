import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ children, requireAdmin = false, requireStudent = false, requireFaculty = false }) {
  const token = localStorage.getItem("token");
  const user = readStoredUser();
  const role = localStorage.getItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyRole(role);

  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to={isFaculty ? "/faculty-dashboard" : "/student-dashboard"} replace />;
  if (requireStudent && isAdmin) return <Navigate to="/dashboard" replace />;
  if (requireFaculty && !isFaculty && !isAdmin) return <Navigate to="/student-dashboard" replace />;

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = readStoredUser();
  const role = localStorage.getItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyRole(role);

  if (token) return <Navigate to={isAdmin ? "/dashboard" : isFaculty ? "/faculty-dashboard" : "/student-dashboard"} replace />;
  return children || <Outlet />;
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "super admin";
}

function isFacultyRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return ["faculty", "teacher", "teaching", "teaching staff", "staff"].includes(normalized);
}


