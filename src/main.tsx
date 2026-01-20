import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import { InsightsProvider } from "./contexts/InsightsContext";
import { EntryNavigationProvider } from "./contexts/EntryNavigationContext";
import { EntriesStateProvider } from "./contexts/EntriesStateContext";
import { ProcessingProvider } from "./contexts/ProcessingContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
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
    </ThemeProvider>
  </React.StrictMode>,
);
