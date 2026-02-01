import { ReactNode, useCallback } from 'react';
import { HiMenuAlt2 } from 'react-icons/hi';
import { useMobileNav } from '../../contexts/MobileNavContext';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticSelection } from '../../hooks/useHaptics';
import { Text } from '../themed';

interface MobilePageHeaderProps {
  title?: string;
  rightContent?: ReactNode;
  centerContent?: ReactNode;
}

export default function MobilePageHeader({ title, rightContent, centerContent }: MobilePageHeaderProps) {
  const { openNav } = useMobileNav();
  const { theme } = useTheme();

  const handleMenuClick = useCallback(() => {
    hapticSelection();
    openNav();
  }, [openNav]);

  return (
    <header
      className="mobile-page-header"
      style={{ backgroundColor: theme.colors.background.primary }}
    >
      <button
        className="mobile-page-header__menu-button"
        onClick={handleMenuClick}
        aria-label="Open navigation"
        style={{ color: theme.colors.text.primary }}
      >
        <HiMenuAlt2 size={22} />
      </button>
      {centerContent || (title && (
        <Text variant="primary" className="mobile-page-header__title">
          {title}
        </Text>
      ))}
      <div className="mobile-page-header__right">
        {rightContent}
      </div>
    </header>
  );
}
