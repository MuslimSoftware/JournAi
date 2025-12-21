import { ReactNode } from 'react';
import './mobile-layout.css';

interface MobileLayoutProps {
  children: ReactNode;
  currentPage: 'entries' | 'settings';
  onNavigate: (page: 'entries' | 'settings') => void;
}

export default function MobileLayout({ children, currentPage, onNavigate }: MobileLayoutProps) {
  return (
    <div className="mobile-layout">
      <main className="mobile-content">
        {children}
      </main>
      <nav className="mobile-bottom-nav">
        <button
          className={`nav-item ${currentPage === 'entries' ? 'active' : ''}`}
          onClick={() => onNavigate('entries')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Entries</span>
        </button>
        <button
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m0-12l-4 2m8 4l-4 2m0-8l4 2m-8 4l4 2"/>
            <path d="M19.07 4.93a10 10 0 1 0 0 14.14"/>
          </svg>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
