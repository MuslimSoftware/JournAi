import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import MobileNavDrawer from './MobileNavDrawer';
import SettingsModal from '../SettingsModal';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { MobileNavProvider } from '../../contexts/MobileNavContext';
import '../../styles/mobile.css';

function MobileLayoutInner() {
  const { isOpen: isSettingsOpen, closeSettings } = useSettings();
  const location = useLocation();

  useLayoutEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.getSelection()?.removeAllRanges();
  }, [location.pathname]);

  return (
    <div className="mobile-layout">
      <main className="mobile-layout__main mobile-main">
        <Outlet />
      </main>
      <MobileNavDrawer />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
    </div>
  );
}

export default function MobileLayout() {
  return (
    <SidebarProvider>
      <SettingsProvider>
        <MobileNavProvider>
          <MobileLayoutInner />
        </MobileNavProvider>
      </SettingsProvider>
    </SidebarProvider>
  );
}
