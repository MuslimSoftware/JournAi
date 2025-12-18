import { useState } from "react";
import { Outlet } from "react-router-dom";
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoTrendingUpOutline, IoTrendingUp } from "react-icons/io5";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import { SidebarProvider } from "../contexts/SidebarContext";

const mainNavItems = [
  { path: "/calendar", label: "Calendar", icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: "/entries", label: "Entries", icon: IoBookOutline, iconFilled: IoBook },
  { path: "/chat", label: "Chat", icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: "/projections", label: "Projections", icon: IoTrendingUpOutline, iconFilled: IoTrendingUp },
];

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
