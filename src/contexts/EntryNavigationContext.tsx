import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface HighlightRange {
  start: number;
  end: number;
}

interface NavigationTarget {
  entryId: string;
  highlight?: HighlightRange;
}

interface EntryNavigationContextType {
  target: NavigationTarget | null;
  navigateToEntry: (entryId: string, highlight?: HighlightRange) => void;
  clearTarget: () => void;
}

const EntryNavigationContext = createContext<EntryNavigationContextType | undefined>(undefined);

export function EntryNavigationProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<NavigationTarget | null>(null);

  const navigateToEntry = useCallback((entryId: string, highlight?: HighlightRange) => {
    setTarget({ entryId, highlight });
  }, []);

  const clearTarget = useCallback(() => {
    setTarget(null);
  }, []);

  return (
    <EntryNavigationContext.Provider value={{ target, navigateToEntry, clearTarget }}>
      {children}
    </EntryNavigationContext.Provider>
  );
}

export function useEntryNavigation() {
  const context = useContext(EntryNavigationContext);
  if (!context) {
    throw new Error('useEntryNavigation must be used within an EntryNavigationProvider');
  }
  return context;
}
