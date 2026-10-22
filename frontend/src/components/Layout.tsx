import { Link, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/invoices" className="brand">
          InvoiceFlow
        </Link>
        <div className="topbar-right">
          <span>{user?.email}</span>
          <span className="badge badge-role">{user?.role}</span>
          <button className="button button-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
