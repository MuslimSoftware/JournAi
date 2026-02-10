import { IoLockClosedOutline } from 'react-icons/io5';
import '../../styles/settings.css';

interface SidebarItem {
  id: string;
  label: string;
  locked?: boolean;
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
          className={`settings-sidebar-item${activeId === item.id ? ' settings-sidebar-item--active' : ''}${item.locked ? ' settings-sidebar-item--locked' : ''}`}
          aria-disabled={item.locked ? 'true' : undefined}
          onClick={() => onSelect(item.id)}
        >
          <span>{item.label}</span>
          {item.locked ? <IoLockClosedOutline className="settings-sidebar-lock-icon" size={14} /> : null}
        </div>
      ))}
    </div>
  );
}
