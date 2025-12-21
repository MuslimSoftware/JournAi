import { useState } from 'react';
import { ThemeProvider } from '@journai/core';
import MobileLayout from './layouts/MobileLayout';
import Entries from './pages/Entries';
import Settings from './pages/Settings';

type Page = 'entries' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('entries');

  return (
    <ThemeProvider>
      <MobileLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'entries' && <Entries />}
        {currentPage === 'settings' && <Settings />}
      </MobileLayout>
    </ThemeProvider>
  );
}

export default App;
