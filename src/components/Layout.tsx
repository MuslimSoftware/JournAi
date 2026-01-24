import { useState } from "react";
import { Outlet } from "react-router-dom";
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoSparklesOutline, IoSparkles, IoSync, IoClose } from "react-icons/io5";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import { SidebarProvider } from "../contexts/SidebarContext";
import { FocusModeProvider, useFocusMode } from "../contexts/FocusModeContext";
import { useProcessing } from "../contexts/ProcessingContext";

const mainNavItems = [
  { path: "/calendar", label: "Calendar", icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: "/entries", label: "Entries", icon: IoBookOutline, iconFilled: IoBook },
  { path: "/chat", label: "Chat", icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: "/insights", label: "Insights", icon: IoSparklesOutline, iconFilled: IoSparkles },
];

function LayoutContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isFocusMode } = useFocusMode();
  const { isProcessing, progress, cancelRequested, requestCancel } = useProcessing();

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
      {isProcessing && progress && (
        <div className={`processing-toast ${cancelRequested ? 'cancelling' : ''}`}>
          <IoSync className="spin" size={14} />
          <span>
            {cancelRequested
              ? 'Cancelling...'
              : `Analyzing entries (${progress.processed}/${progress.total})`}
          </span>
          {!cancelRequested && (
            <button
              className="processing-toast-cancel"
              onClick={requestCancel}
              aria-label="Cancel processing"
            >
              <IoClose size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <FocusModeProvider>
        <LayoutContent />
      </FocusModeProvider>
    </SidebarProvider>
  );
}
