import { NavLink } from "react-router-dom";
import { IoLockClosedOutline, IoSettingsOutline } from "react-icons/io5";
import { TbPin, TbPinFilled } from "react-icons/tb";
import { IconType } from "react-icons";
import IconButton from "./themed/IconButton";
import { useSidebar } from "../contexts/SidebarContext";
import { useAiAccess } from "../contexts/AiAccessContext";
import { useUpdate } from "../contexts/UpdateContext";

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

function UpdateBadge() {
  const { updateInfo, downloading, downloaded, downloadUpdate, restartApp } = useUpdate();

  const version = `v${updateInfo?.version}`;
  const actionLabel = downloaded ? 'Restart' : downloading ? 'Updating...' : `Update to ${version}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloaded) restartApp();
    else if (!downloading) downloadUpdate();
  };

  return (
    <button
      className={`sidebar-update-badge ${downloaded ? 'sidebar-update-badge--restart' : ''}`}
      onClick={handleClick}
    >
      <span className="sidebar-update-badge__version">{version}</span>
      <span className="sidebar-update-badge__action">{actionLabel}</span>
    </button>
  );
}

export default function Sidebar({ items, onOpenSettings }: SidebarProps) {
  const { navPinned, toggleNavPin } = useSidebar();
  const { hasApiKey, requestAiAccess } = useAiAccess();
  const { updateAvailable } = useUpdate();

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
        <div className="sidebar-settings-row">
          <IconButton
            icon={<IoSettingsOutline size={20} />}
            label="Settings"
            onClick={onOpenSettings}
            variant="ghost"
            className="sidebar-settings-button"
          />
        </div>
        {updateAvailable && <UpdateBadge />}
      </div>
    </aside>
  );
}
