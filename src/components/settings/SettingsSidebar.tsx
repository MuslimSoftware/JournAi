import '../../styles/settings.css';

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
  return (
    <div className="settings-sidebar">
      {items.map((item) => (
        <div
          key={item.id}
          className={`settings-sidebar-item${activeId === item.id ? ' settings-sidebar-item--active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
