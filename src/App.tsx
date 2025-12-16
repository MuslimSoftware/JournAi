import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Calendar from "./pages/Calendar";
import Entries from "./pages/Entries";
import Chat from "./pages/Chat";
import Projections from "./pages/Projections";
import "./App.css";
import "./styles/layout.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="entries" element={<Entries />} />
        <Route path="chat" element={<Chat />} />
        <Route path="projections" element={<Projections />} />
      </Route>
    </Routes>
  );
}

export default App;
