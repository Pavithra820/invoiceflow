import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
