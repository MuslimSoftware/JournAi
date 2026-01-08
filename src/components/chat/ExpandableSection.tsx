import { CSSProperties, ReactNode } from 'react';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { CHAT } from './constants';

interface ExpandableSectionProps {
  icon: ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  borderRadius?: string;
}

export default function ExpandableSection({
  icon,
  title,
  isExpanded,
  onToggle,
  children,
  borderRadius = CHAT.expandable.borderRadius,
}: ExpandableSectionProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    borderRadius,
    backgroundColor: theme.colors.background.tertiary,
    border: `1px solid ${theme.colors.border.secondary}`,
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    cursor: 'pointer',
    fontSize: CHAT.fontSize.small,
    color: theme.colors.text.secondary,
  };

  const contentStyle: CSSProperties = {
    padding: `0 ${theme.spacing.md} ${theme.spacing.sm}`,
    fontSize: CHAT.fontSize.xsmall,
    color: theme.colors.text.muted,
    lineHeight: '1.5',
    borderTop: `1px solid ${theme.colors.border.secondary}`,
    paddingTop: theme.spacing.sm,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={onToggle}>
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {isExpanded ? (
          <IoChevronDown size={CHAT.iconSize.md} />
        ) : (
          <IoChevronForward size={CHAT.iconSize.md} />
        )}
      </div>
      {isExpanded && <div style={contentStyle}>{children}</div>}
    </div>
  );
}
