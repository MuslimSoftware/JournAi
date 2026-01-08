import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <CalendarProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CalendarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
