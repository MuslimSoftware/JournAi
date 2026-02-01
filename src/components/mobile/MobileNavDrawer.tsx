import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IoCalendarOutline, IoCalendar, IoBookOutline, IoBook, IoChatbubbleOutline, IoChatbubble, IoSparklesOutline, IoSparkles, IoSettingsOutline } from 'react-icons/io5';
import { useMobileNav } from '../../contexts/MobileNavContext';
import { useSettings } from '../../contexts/SettingsContext';
import { hapticSelection } from '../../hooks/useHaptics';
import SideDrawer from './SideDrawer';
import { Text } from '../themed';

const navItems = [
  { path: '/calendar', label: 'Calendar', icon: IoCalendarOutline, iconFilled: IoCalendar },
  { path: '/entries', label: 'Entries', icon: IoBookOutline, iconFilled: IoBook },
  { path: '/chat', label: 'Chat', icon: IoChatbubbleOutline, iconFilled: IoChatbubble },
  { path: '/insights', label: 'Insights', icon: IoSparklesOutline, iconFilled: IoSparkles },
];

export default function MobileNavDrawer() {
  const { isNavOpen, closeNav } = useMobileNav();
  const { openSettings } = useSettings();
  const location = useLocation();

  const handleNavClick = useCallback((path: string) => {
    if (path !== location.pathname) {
      hapticSelection();
    }
    closeNav();
  }, [location.pathname, closeNav]);

  const handleSettingsClick = useCallback(() => {
    hapticSelection();
    closeNav();
    openSettings();
  }, [closeNav, openSettings]);

  return (
    <SideDrawer isOpen={isNavOpen} onClose={closeNav} width={280}>
      <div className="mobile-nav-drawer">
        <nav className="mobile-nav-drawer__list">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`mobile-nav-drawer__item${isActive ? ' mobile-nav-drawer__item--active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                {isActive ? <item.iconFilled size={22} /> : <item.icon size={22} />}
                <Text variant={isActive ? 'primary' : 'secondary'} className="mobile-nav-drawer__label">
                  {item.label}
                </Text>
              </NavLink>
            );
          })}
        </nav>
        <div className="mobile-nav-drawer__footer">
          <button
            className="mobile-nav-drawer__item mobile-nav-drawer__settings"
            onClick={handleSettingsClick}
          >
            <IoSettingsOutline size={22} />
            <Text variant="secondary" className="mobile-nav-drawer__label">Settings</Text>
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}
