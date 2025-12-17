import { NavLink } from "react-router-dom";
import { IoSettingsOutline } from "react-icons/io5";
import IconButton from "./themed/IconButton";

interface NavItem {
  path: string;
  label: string;
}

interface SidebarProps {
  items: NavItem[];
  onOpenSettings: () => void;
}

export default function Sidebar({ items, onOpenSettings }: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav>
        <ul className="sidebar-nav">
          {items.map((item) => (
            <li key={item.path} className="sidebar-nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? "active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <IconButton
          icon={<IoSettingsOutline />}
          label="Settings"
          onClick={onOpenSettings}
          variant="ghost"
        />
      </div>
    </aside>
  );
}
