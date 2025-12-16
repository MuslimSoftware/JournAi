import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

const mainNavItems = [
  { path: "/calendar", label: "Calendar" },
  { path: "/entries", label: "Entries" },
  { path: "/chat", label: "Chat" },
  { path: "/projections", label: "Projections" },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar items={mainNavItems} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
