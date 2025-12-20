import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { appStore } from '../lib/store';

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

  useEffect(() => {
    if (!isFocusMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFocusMode(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFocusMode]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

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
