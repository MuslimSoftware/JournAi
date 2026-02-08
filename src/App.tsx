import { useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import MobileLayout from "./components/mobile/MobileLayout";
import { useIsMobile } from "./hooks/useMediaQuery";
import { useProcessing } from "./contexts/ProcessingContext";
import { useAiAccess } from "./contexts/AiAccessContext";
import Calendar from "./pages/Calendar";
import Entries from "./pages/Entries";
import Chat from "./pages/Chat";
import Insights from "./pages/Insights";
import { startBackgroundEmbedding, stopBackgroundEmbedding } from "./services/embeddings";
import { processUnprocessedEntriesOnLaunch } from "./services/entryAnalysis";
import "./App.css";
import "./styles/layout.css";
import "./styles/mobile.css";

function RequireAiAccessRoute({
  destinationLabel,
  children,
}: {
  destinationLabel: string;
  children: ReactNode;
}) {
  const { hasApiKey, requestAiAccess } = useAiAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasApiKey) {
      requestAiAccess(destinationLabel);
      navigate("/calendar", { replace: true });
    }
  }, [destinationLabel, hasApiKey, navigate, requestAiAccess]);

  if (!hasApiKey) {
    return null;
  }

  return <>{children}</>;
}

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
        <Route
          path="chat"
          element={(
            <RequireAiAccessRoute destinationLabel="Chat">
              <Chat />
            </RequireAiAccessRoute>
          )}
        />
        <Route
          path="insights"
          element={(
            <RequireAiAccessRoute destinationLabel="Insights">
              <Insights />
            </RequireAiAccessRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
