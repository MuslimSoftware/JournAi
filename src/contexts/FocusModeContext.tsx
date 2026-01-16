import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { appStore } from '../lib/store';
import { useEscapeKey, useKeyPress } from '../hooks/useKeyPress';

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

const FOCUS_MODE_KEY = 'focus-mode-active';

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    appStore.get<boolean>(FOCUS_MODE_KEY).then((val) => {
      if (val === true) setIsFocusMode(true);
    });
  }, []);

  useEffect(() => {
    appStore.set(FOCUS_MODE_KEY, isFocusMode);
  }, [isFocusMode]);

  useEscapeKey(() => {
    if (isFocusMode) setIsFocusMode(false);
  });

  useKeyPress('f', () => setIsFocusMode((prev) => !prev), {
    ctrlKey: true,
    shiftKey: true,
  });

  useKeyPress('F', () => setIsFocusMode((prev) => !prev), {
    metaKey: true,
    shiftKey: true,
  });

  const toggleFocusMode = useCallback(() => setIsFocusMode((prev) => !prev), []);
  const enterFocusMode = useCallback(() => setIsFocusMode(true), []);
  const exitFocusMode = useCallback(() => setIsFocusMode(false), []);

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode, enterFocusMode, exitFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error('useFocusMode must be used within FocusModeProvider');
  }
  return context;
}
