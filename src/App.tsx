import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MobileLayout from "./components/mobile/MobileLayout";
import { useIsMobile } from "./hooks/useMediaQuery";
import { useProcessing } from "./contexts/ProcessingContext";
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
  const { startProcessing, updateProgress, finishProcessing } = useProcessing();

  useEffect(() => {
    startBackgroundEmbedding();

    processUnprocessedEntriesOnLaunch((progress) => {
      if (progress.total > 0) {
        if (progress.processed === 0) {
          startProcessing(progress.total);
        }
        updateProgress(progress);
      }
    }).then(() => {
      finishProcessing();
    }).catch((error) => {
      console.error('[App] Failed to process unprocessed entries on launch:', error);
      finishProcessing();
    });

    return () => stopBackgroundEmbedding();
  }, [startProcessing, updateProgress, finishProcessing]);

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
