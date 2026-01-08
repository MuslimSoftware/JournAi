import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeOptionProps {
  label: string;
  icon: ReactNode;
  isSelected: boolean;
  onClick: () => void;
  previewColors: {
    background: string;
    text: string;
  };
}

export default function ThemeOption({
  label,
  icon,
  isSelected,
  onClick,
  previewColors,
}: ThemeOptionProps) {
  const { theme } = useTheme();

  const cardStyle: CSSProperties = {
    flex: 1,
    padding: '12px',
    border: `1.5px solid ${isSelected ? theme.colors.text.primary : theme.colors.border.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: isSelected ? theme.colors.background.secondary : 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  };

  const iconStyle: CSSProperties = {
    fontSize: '1.25rem',
    color: theme.colors.text.primary,
  };

  const previewStyle: CSSProperties = {
    width: '100%',
    height: '32px',
    borderRadius: '4px',
    backgroundColor: previewColors.background,
    border: `1px solid ${theme.colors.border.primary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const previewTextStyle: CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: previewColors.text,
    letterSpacing: '0.5px',
  };

  const labelStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: theme.colors.text.primary,
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={iconStyle}>{icon}</div>
      <div style={previewStyle}>
        <span style={previewTextStyle}>Aa</span>
      </div>
      <div style={labelStyle}>{label}</div>
    </div>
  );
}
