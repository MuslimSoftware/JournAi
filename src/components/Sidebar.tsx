import { NavLink } from "react-router-dom";
import { IoSettingsOutline } from "react-icons/io5";
import { TbPin, TbPinFilled } from "react-icons/tb";
import { IconType } from "react-icons";
import IconButton from "./themed/IconButton";
import { useSidebar } from "../contexts/SidebarContext";

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
  iconFilled: IconType;
}

interface SidebarProps {
  items: NavItem[];
  onOpenSettings: () => void;
}

export default function Sidebar({ items, onOpenSettings }: SidebarProps) {
  const { navPinned, toggleNavPin } = useSidebar();

  return (
    <aside className={`sidebar ${navPinned ? 'pinned' : ''}`}>
      <div className="sidebar-header">
        <IconButton
          icon={navPinned ? <TbPinFilled /> : <TbPin />}
          label={navPinned ? "Unpin sidebar" : "Pin sidebar"}
          onClick={toggleNavPin}
          variant="ghost"
          size="sm"
          className="sidebar-pin-button"
        />
      </div>
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
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <item.iconFilled className="sidebar-nav-icon" />
                    ) : (
                      <item.icon className="sidebar-nav-icon" />
                    )}
                    <span className="sidebar-nav-label">{item.label}</span>
                  </>
                )}
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
