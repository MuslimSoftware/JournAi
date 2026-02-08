import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AiAccessGateModal from '../components/AiAccessGateModal';
import { getApiKey, subscribeToApiKeyChanges } from '../lib/secureStorage';
import { useSettings } from './SettingsContext';

interface AiAccessContextType {
  hasApiKey: boolean;
  requestAiAccess: (destinationLabel: string) => boolean;
}

const AiAccessContext = createContext<AiAccessContextType | undefined>(undefined);

function hasConfiguredApiKey(): boolean {
  const apiKey = getApiKey();
  return Boolean(apiKey && apiKey.trim().length > 0);
}

export function AiAccessProvider({ children }: { children: ReactNode }) {
  const { openSettings } = useSettings();
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => hasConfiguredApiKey());
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);

  useEffect(() => {
    setHasApiKey(hasConfiguredApiKey());

    return subscribeToApiKeyChanges(() => {
      setHasApiKey(hasConfiguredApiKey());
    });
  }, []);

  useEffect(() => {
    if (hasApiKey) {
      setDestinationLabel(null);
    }
  }, [hasApiKey]);

  const requestAiAccess = useCallback(
    (targetLabel: string): boolean => {
      if (hasApiKey) {
        return true;
      }

      setDestinationLabel(targetLabel);
      return false;
    },
    [hasApiKey],
  );

  const handleCloseModal = useCallback(() => {
    setDestinationLabel(null);
  }, []);

  const handleGoToSettings = useCallback(() => {
    setDestinationLabel(null);
    openSettings('ai');
  }, [openSettings]);

  const value = useMemo(
    () => ({
      hasApiKey,
      requestAiAccess,
    }),
    [hasApiKey, requestAiAccess],
  );

  return (
    <AiAccessContext.Provider value={value}>
      {children}
      <AiAccessGateModal
        isOpen={destinationLabel !== null}
        destinationLabel={destinationLabel}
        onCancel={handleCloseModal}
        onGoToSettings={handleGoToSettings}
      />
    </AiAccessContext.Provider>
  );
}

export function useAiAccess() {
  const context = useContext(AiAccessContext);
  if (!context) {
    throw new Error('useAiAccess must be used within AiAccessProvider');
  }
  return context;
}
