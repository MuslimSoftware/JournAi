import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

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
        <Outlet />
      </main>
    </div>
  );
}
