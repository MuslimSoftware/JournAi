import { useState } from "react";
import { Outlet } from "react-router-dom";
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoTrendingUpOutline, IoTrendingUp } from "react-icons/io5";
import Sidebar from "../components/Sidebar";
import SettingsModal from "../components/SettingsModal";
import { SidebarProvider } from "../contexts/SidebarContext";
import { FocusModeProvider, useFocusMode } from "../contexts/FocusModeContext";

const mainNavItems = [
  { path: "/calendar", label: "Calendar", icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: "/entries", label: "Entries", icon: IoBookOutline, iconFilled: IoBook },
  { path: "/chat", label: "Chat", icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: "/projections", label: "Projections", icon: IoTrendingUpOutline, iconFilled: IoTrendingUp },
];

function LayoutContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isFocusMode } = useFocusMode();

  return (
    <div className={`app-layout ${isFocusMode ? 'focus-mode-active' : ''}`}>
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

export default function DesktopLayout() {
  return (
    <SidebarProvider>
      <FocusModeProvider>
        <LayoutContent />
      </FocusModeProvider>
    </SidebarProvider>
  );
}
