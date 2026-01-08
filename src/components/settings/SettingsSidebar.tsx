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
    width: '180px',
    borderRight: `1px solid ${theme.colors.border.primary}`,
    padding: '12px',
  };

  const itemStyle: CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '6px',
    marginBottom: '4px',
    color: theme.colors.text.secondary,
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.15s',
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
