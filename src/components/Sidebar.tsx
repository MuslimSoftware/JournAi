import { NavLink } from "react-router-dom";
import { IoLockClosedOutline, IoSettingsOutline } from "react-icons/io5";
import { TbPin, TbPinFilled } from "react-icons/tb";
import { IconType } from "react-icons";
import IconButton from "./themed/IconButton";
import { useSidebar } from "../contexts/SidebarContext";
import { useAiAccess } from "../contexts/AiAccessContext";

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
  iconFilled: IconType;
  requiresApiKey?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  onOpenSettings: () => void;
}

export default function Sidebar({ items, onOpenSettings }: SidebarProps) {
  const { navPinned, toggleNavPin } = useSidebar();
  const { hasApiKey, requestAiAccess } = useAiAccess();

  return (
    <aside className={`sidebar ${navPinned ? 'pinned' : ''}`}>
      <div className="sidebar-header">
        <IconButton
          icon={navPinned ? <TbPinFilled size={18} /> : <TbPin size={18} />}
          label={navPinned ? "Unpin sidebar" : "Pin sidebar"}
          onClick={toggleNavPin}
          variant="ghost"
          size="sm"
          className="sidebar-pin-button"
        />
      </div>
      <nav>
        <ul className="sidebar-nav">
          {items.map((item) => {
            const isLocked = Boolean(item.requiresApiKey && !hasApiKey);

            return (
              <li key={item.path} className="sidebar-nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? "active" : ""}${isLocked ? " sidebar-nav-link--locked" : ""}`
                  }
                  onClick={(event) => {
                    if (isLocked) {
                      event.preventDefault();
                      requestAiAccess(item.label);
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      {isLocked ? (
                        <IoLockClosedOutline className="sidebar-nav-icon sidebar-nav-lock-icon" />
                      ) : isActive ? (
                        <item.iconFilled className="sidebar-nav-icon" />
                      ) : (
                        <item.icon className="sidebar-nav-icon" />
                      )}
                      <span className="sidebar-nav-label">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <IconButton
          icon={<IoSettingsOutline size="1.25rem" />}
          label="Settings"
          onClick={onOpenSettings}
          variant="ghost"
          className="sidebar-settings-button"
        />
      </div>
    </aside>
  );
}
