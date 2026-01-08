import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { appStore } from '../lib/store';

interface SidebarContextType {
  navPinned: boolean;
  entriesPinned: boolean;
  chatPinned: boolean;
  toggleNavPin: () => void;
  toggleEntriesPin: () => void;
  toggleChatPin: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const NAV_SIDEBAR_PIN_KEY = 'nav-sidebar-pinned';
const ENTRIES_SIDEBAR_PIN_KEY = 'entries-sidebar-pinned';
const CHAT_SIDEBAR_PIN_KEY = 'chat-sidebar-pinned';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [navPinned, setNavPinned] = useState(false);
  const [entriesPinned, setEntriesPinned] = useState(false);
  const [chatPinned, setChatPinned] = useState(false);

  useEffect(() => {
    appStore.get<boolean>(NAV_SIDEBAR_PIN_KEY).then((val) => {
      if (val !== null) setNavPinned(val);
    });
    appStore.get<boolean>(ENTRIES_SIDEBAR_PIN_KEY).then((val) => {
      if (val !== null) setEntriesPinned(val);
    });
    appStore.get<boolean>(CHAT_SIDEBAR_PIN_KEY).then((val) => {
      if (val !== null) setChatPinned(val);
    });
  }, []);

  const toggleNavPin = useCallback(() => {
    setNavPinned((prev) => {
      const next = !prev;
      appStore.set(NAV_SIDEBAR_PIN_KEY, next);
      return next;
    });
  }, []);

  const toggleEntriesPin = useCallback(() => {
    setEntriesPinned((prev) => {
      const next = !prev;
      appStore.set(ENTRIES_SIDEBAR_PIN_KEY, next);
      return next;
    });
  }, []);

  const toggleChatPin = useCallback(() => {
    setChatPinned((prev) => {
      const next = !prev;
      appStore.set(CHAT_SIDEBAR_PIN_KEY, next);
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        navPinned,
        entriesPinned,
        chatPinned,
        toggleNavPin,
        toggleEntriesPin,
        toggleChatPin,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
