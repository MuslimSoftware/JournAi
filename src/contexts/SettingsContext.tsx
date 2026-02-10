import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type SettingsSection = 'personalization' | 'security' | 'ai' | 'memory' | 'data-management';

interface SettingsContextType {
  isOpen: boolean;
  initialSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialSection, setInitialSection] = useState<SettingsSection>('personalization');

  const openSettings = useCallback((section: SettingsSection = 'personalization') => {
    setInitialSection(section);
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
    setInitialSection('personalization');
  }, []);

  return (
    <SettingsContext.Provider value={{ isOpen, initialSection, openSettings, closeSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      isOpen: false,
      initialSection: 'personalization' as SettingsSection,
      openSettings: () => {},
      closeSettings: () => {},
    };
  }
  return context;
}
