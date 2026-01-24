import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SourceRange } from '../types/analytics';

interface NavigationTarget {
  entryId: string;
  sourceRange?: SourceRange;
}

interface EntryNavigationContextType {
  target: NavigationTarget | null;
  navigateToEntry: (entryId: string, sourceRange?: SourceRange) => void;
  clearTarget: () => void;
}

const EntryNavigationContext = createContext<EntryNavigationContextType | undefined>(undefined);

export function EntryNavigationProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<NavigationTarget | null>(null);

  const navigateToEntry = useCallback((entryId: string, sourceRange?: SourceRange) => {
    setTarget({ entryId, sourceRange });
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
