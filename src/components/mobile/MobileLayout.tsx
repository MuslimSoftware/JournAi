import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoSparklesOutline, IoSparkles } from 'react-icons/io5';
import BottomNav from './BottomNav';
import SettingsModal from '../SettingsModal';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import '../../styles/mobile.css';

const mobileNavItems = [
  { path: '/calendar', label: 'Calendar', icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: '/entries', label: 'Entries', icon: IoBookOutline, iconFilled: IoBook },
  { path: '/chat', label: 'Chat', icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: '/insights', label: 'Insights', icon: IoSparklesOutline, iconFilled: IoSparkles },
];

function MobileLayoutInner() {
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useSettings();
  const location = useLocation();

  useLayoutEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.getSelection()?.removeAllRanges();
  }, [location.pathname]);

  const mainPadding = isKeyboardOpen ? '20px' : 'calc(var(--mobile-nav-height) + var(--mobile-safe-area-bottom))';

  return (
    <div className="mobile-layout">
      <main className="mobile-layout__main mobile-main" style={{ paddingBottom: mainPadding }}>
        <Outlet />
      </main>
      {!isKeyboardOpen && (
        <BottomNav
          items={mobileNavItems}
          onSettingsClick={openSettings}
        />
      )}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
    </div>
  );
}

export default function MobileLayout() {
  return (
    <SidebarProvider>
      <SettingsProvider>
        <MobileLayoutInner />
      </SettingsProvider>
    </SidebarProvider>
  );
}
