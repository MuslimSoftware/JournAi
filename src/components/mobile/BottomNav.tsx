import { NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CSSProperties } from 'react';

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
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: theme.colors.background.primary,
    borderTop: `1px solid ${theme.colors.border.primary}`,
    paddingBottom: 'var(--mobile-safe-area-bottom)',
  };

  const navStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
    height: 'var(--mobile-nav-height)',
  };

  const linkStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    textDecoration: 'none',
    color: theme.colors.text.muted,
    transition: 'color 0.2s',
    background: 'transparent',
    border: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  const activeLinkStyle: CSSProperties = {
    ...linkStyle,
    color: theme.colors.text.primary,
  };

  return (
    <div style={containerStyle} className="bottom-nav-container">
      <nav style={navStyle} className="bottom-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
            aria-label={item.label}
          >
            {({ isActive }) => (
              isActive ? <item.iconFilled size={26} /> : <item.icon size={26} />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
