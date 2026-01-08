import { CSSProperties } from 'react';
import { IoChevronDown, IoChevronForward, IoSparkles } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ThinkingBlock } from '../../types/chat';

interface ThinkingIndicatorProps {
  thinking: ThinkingBlock;
  onToggle?: () => void;
}

export default function ThinkingIndicator({ thinking, onToggle }: ThinkingIndicatorProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    maxWidth: 'min(80%, 600px)',
    borderRadius: '12px',
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
    fontSize: '0.875rem',
    color: theme.colors.text.secondary,
  };

  const iconStyle: CSSProperties = {
    color: theme.colors.text.secondary,
  };

  const contentStyle: CSSProperties = {
    padding: `0 ${theme.spacing.md} ${theme.spacing.sm}`,
    fontSize: '0.8125rem',
    color: theme.colors.text.muted,
    lineHeight: '1.5',
    borderTop: `1px solid ${theme.colors.border.secondary}`,
    paddingTop: theme.spacing.sm,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={onToggle}>
        <IoSparkles size={16} style={iconStyle} />
        <span style={{ flex: 1 }}>Thinking</span>
        {thinking.isExpanded ? <IoChevronDown size={16} /> : <IoChevronForward size={16} />}
      </div>
      {thinking.isExpanded && (
        <div style={contentStyle}>{thinking.content}</div>
      )}
    </div>
  );
}
