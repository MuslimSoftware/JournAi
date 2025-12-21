import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface SettingsContextType {
  isOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSettings = useCallback(() => setIsOpen(true), []);
  const closeSettings = useCallback(() => setIsOpen(false), []);

  return (
    <SettingsContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return { isOpen: false, openSettings: () => {}, closeSettings: () => {} };
  }
  return context;
}
