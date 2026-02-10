import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoSparklesOutline, IoSparkles, IoSync, IoClose } from "react-icons/io5";
import { listen } from "@tauri-apps/api/event";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import { SidebarProvider } from "../contexts/SidebarContext";
import { FocusModeProvider, useFocusMode } from "../contexts/FocusModeContext";
import { useProcessing } from "../contexts/ProcessingContext";
import { SettingsProvider, useSettings } from "../contexts/SettingsContext";
import { AiAccessProvider } from "../contexts/AiAccessContext";

const mainNavItems = [
  { path: "/calendar", label: "Calendar", icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: "/entries", label: "Entries", icon: IoBookOutline, iconFilled: IoBook },
  { path: "/chat", label: "Chat", icon: IoChatbubbleOutline, iconFilled: IoChatbubble, requiresApiKey: true },
  { path: "/insights", label: "Insights", icon: IoSparklesOutline, iconFilled: IoSparkles, requiresApiKey: true },
];

function LayoutContent() {
  const { isFocusMode } = useFocusMode();
  const { isProcessing, progress, cancelRequested, requestCancel } = useProcessing();
  const {
    isOpen: isSettingsOpen,
    closeSettings,
    openSettings,
    initialSection,
    openSignal,
  } = useSettings();

  useEffect(() => {
    const unlisten = listen("open-settings", () => openSettings());
    return () => { unlisten.then(fn => fn()); };
  }, [openSettings]);

  return (
    <div className={`app-layout ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <Sidebar
        items={mainNavItems}
        onOpenSettings={() => openSettings()}
      />
      <main className="main-content">
        <Outlet />
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        initialSection={initialSection}
        openSignal={openSignal}
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
      <SettingsProvider>
        <AiAccessProvider>
          <FocusModeProvider>
            <LayoutContent />
          </FocusModeProvider>
        </AiAccessProvider>
      </SettingsProvider>
    </SidebarProvider>
  );
}
