import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";

const mainNavItems = [
  { path: "/calendar", label: "Calendar" },
  { path: "/entries", label: "Entries" },
  { path: "/chat", label: "Chat" },
  { path: "/projections", label: "Projections" },
];

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        items={mainNavItems}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="main-content">
        <Outlet />
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
