import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MobileLayout from "./components/mobile/MobileLayout";
import { useIsMobile } from "./hooks/useMediaQuery";
import Calendar from "./pages/Calendar";
import Entries from "./pages/Entries";
import Chat from "./pages/Chat";
import Insights from "./pages/Insights";
import { startBackgroundEmbedding, stopBackgroundEmbedding } from "./services/embeddings";
import { processUnprocessedEntriesOnLaunch } from "./services/entryAnalysis";
import "./App.css";
import "./styles/layout.css";
import "./styles/mobile.css";

function App() {
  const isMobile = useIsMobile();
  const LayoutComponent = isMobile ? MobileLayout : Layout;

  useEffect(() => {
    startBackgroundEmbedding();

    // Process any unprocessed entries on app launch
    processUnprocessedEntriesOnLaunch().catch((error) => {
      console.error('[App] Failed to process unprocessed entries on launch:', error);
    });

    return () => stopBackgroundEmbedding();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LayoutComponent />}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="entries" element={<Entries />} />
        <Route path="chat" element={<Chat />} />
        <Route path="insights" element={<Insights />} />
      </Route>
    </Routes>
  );
}

export default App;
