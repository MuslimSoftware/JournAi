import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import { InsightsProvider } from "./contexts/InsightsContext";
import { EntryNavigationProvider } from "./contexts/EntryNavigationContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <CalendarProvider>
        <InsightsProvider>
          <EntryNavigationProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </EntryNavigationProvider>
        </InsightsProvider>
      </CalendarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
