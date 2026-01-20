import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ProcessingProgress } from '../services/entryAnalysis';

const CANCEL_KEY = 'journai-cancel-processing';

interface ProcessingContextType {
  isProcessing: boolean;
  progress: ProcessingProgress | null;
  cancelRequested: boolean;
  startProcessing: (total: number) => void;
  updateProgress: (progress: ProcessingProgress) => void;
  finishProcessing: () => void;
  requestCancel: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const startProcessing = useCallback((total: number) => {
    sessionStorage.removeItem(CANCEL_KEY);
    setCancelRequested(false);
    setIsProcessing(true);
    setProgress({ total, processed: 0, errors: [] });
  }, []);

  const updateProgress = useCallback((newProgress: ProcessingProgress) => {
    setProgress({ ...newProgress });
  }, []);

  const finishProcessing = useCallback(() => {
    sessionStorage.removeItem(CANCEL_KEY);
    setCancelRequested(false);
    setIsProcessing(false);
    setProgress(null);
  }, []);

  const requestCancel = useCallback(() => {
    sessionStorage.setItem(CANCEL_KEY, 'true');
    setCancelRequested(true);
  }, []);

  return (
    <ProcessingContext.Provider
      value={{
        isProcessing,
        progress,
        cancelRequested,
        startProcessing,
        updateProgress,
        finishProcessing,
        requestCancel,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within ProcessingProvider');
  }
  return context;
}
