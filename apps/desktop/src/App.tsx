import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DesktopLayout from './layouts/DesktopLayout';
import Entries from './pages/Entries';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <DesktopLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/entries" replace />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </DesktopLayout>
    </BrowserRouter>
  );
}

export default App;
