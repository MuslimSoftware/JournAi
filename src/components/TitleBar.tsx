import { getCurrentWindow } from "@tauri-apps/api/window";
import { VscChromeMinimize, VscChromeMaximize, VscChromeClose } from "react-icons/vsc";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <span className="titlebar-title" data-tauri-drag-region>JournAi</span>
      <div className="titlebar-controls">
        <button className="titlebar-button" onClick={() => appWindow.minimize()} aria-label="Minimize">
          <VscChromeMinimize size={14} />
        </button>
        <button className="titlebar-button" onClick={() => appWindow.toggleMaximize()} aria-label="Maximize">
          <VscChromeMaximize size={14} />
        </button>
        <button className="titlebar-button titlebar-button--close" onClick={() => appWindow.close()} aria-label="Close">
          <VscChromeClose size={14} />
        </button>
      </div>
    </div>
  );
}
