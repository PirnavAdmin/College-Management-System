import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ children, requireAdmin = false, requireStudent = false }) {
  const token = localStorage.getItem("token");
  const user = readStoredUser();
  const role = localStorage.getItem("role") || user?.role;
  const isAdmin = user?.isAdmin || role === "admin";

  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/student-dashboard" replace />;
  if (requireStudent && isAdmin) return <Navigate to="/dashboard" replace />;

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
