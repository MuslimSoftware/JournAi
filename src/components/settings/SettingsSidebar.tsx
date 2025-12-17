import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarItem {
  id: string;
  label: string;
}

interface SettingsSidebarProps {
  items: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function SettingsSidebar({ items, activeId, onSelect }: SettingsSidebarProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    width: '200px',
    borderRight: `1px solid ${theme.colors.border.primary}`,
    padding: theme.spacing.md,
  };

  const itemStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    cursor: 'pointer',
    borderRadius: '6px',
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.secondary,
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const activeItemStyle: CSSProperties = {
    ...itemStyle,
    backgroundColor: theme.colors.background.subtle,
    color: theme.colors.text.emphasis,
  };

  return (
    <div style={containerStyle}>
      {items.map((item) => (
        <div
          key={item.id}
          style={activeId === item.id ? activeItemStyle : itemStyle}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
