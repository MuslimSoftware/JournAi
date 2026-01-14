import { NavLink, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { useCallback, useRef } from 'react';
import '../../styles/mobile.css';

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
  iconFilled: IconType;
}

interface BottomNavProps {
  items: NavItem[];
  onSettingsClick?: () => void;
}

export default function BottomNav({ items }: BottomNavProps) {
  const location = useLocation();
  const lastPath = useRef(location.pathname);

  const handleNavClick = useCallback((path: string) => {
    if (path !== lastPath.current) {
      hapticSelection();
      lastPath.current = path;
    }
  }, []);

  return (
    <div className="bottom-nav-wrapper bottom-nav-container">
      <nav className="bottom-nav-inner bottom-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav-link${isActive ? ' bottom-nav-link--active' : ''}`
            }
            aria-label={item.label}
            onClick={() => handleNavClick(item.path)}
          >
            {({ isActive }) => (
              <div className={`bottom-nav-icon-wrapper${isActive ? ' bottom-nav-icon-wrapper--active' : ''}`}>
                {isActive ? <item.iconFilled size={26} /> : <item.icon size={26} />}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
