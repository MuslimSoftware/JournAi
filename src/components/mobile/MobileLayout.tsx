import { useState, CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoTrendingUpOutline, IoTrendingUp } from 'react-icons/io5';
import BottomNav from './BottomNav';
import SettingsModal from '../SettingsModal';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';

const mobileNavItems = [
  { path: '/calendar', label: 'Calendar', icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: '/entries', label: 'Entries', icon: IoBookOutline, iconFilled: IoBook },
  { path: '/chat', label: 'Chat', icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: '/projections', label: 'Trends', icon: IoTrendingUpOutline, iconFilled: IoTrendingUp },
];

export default function MobileLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();

  const layoutStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    paddingTop: 'var(--mobile-safe-area-top)',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: isKeyboardOpen ? '20px' : 'calc(var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
    transition: 'padding-bottom 0.25s ease-out',
  };

  return (
    <SidebarProvider>
      <div style={layoutStyle} className="mobile-layout">
        <main style={mainStyle} className="mobile-main">
          <Outlet />
        </main>
        {!isKeyboardOpen && (
          <BottomNav
            items={mobileNavItems}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        )}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </SidebarProvider>
  );
}
