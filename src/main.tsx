import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import { InsightsProvider } from "./contexts/InsightsContext";
import { EntryNavigationProvider } from "./contexts/EntryNavigationContext";
import { EntriesStateProvider } from "./contexts/EntriesStateContext";
import { ProcessingProvider } from "./contexts/ProcessingContext";
import { AppLockProvider, useAppLock } from "./contexts/AppLockContext";
import AppLockScreen from "./components/AppLockScreen";
import { secureStorage } from "./lib/secureStorage";
import App from "./App";

function AppBootstrap() {
  const { isReady, isLocked } = useAppLock();
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (!isReady || isLocked) return;
    secureStorage.isAvailable().then(() => setStorageReady(true));
  }, [isReady, isLocked]);

  if (!isReady) {
    return <div className="app-lock-screen" />;
  }

  if (isLocked) {
    return <AppLockScreen />;
  }

  if (!storageReady) {
    return <div className="app-lock-screen" />;
  }

  return (
    <ProcessingProvider>
      <CalendarProvider>
        <InsightsProvider>
          <EntryNavigationProvider>
            <EntriesStateProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </EntriesStateProvider>
          </EntryNavigationProvider>
        </InsightsProvider>
      </CalendarProvider>
    </ProcessingProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppLockProvider>
        <AppBootstrap />
      </AppLockProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
