import { ReactNode } from 'react';

interface SlidePanelProps {
  isOpen: boolean;
  children: ReactNode;
}

export default function SlidePanel({ isOpen, children }: SlidePanelProps) {
  return (
    <div className={`slide-panel ${isOpen ? 'open' : ''}`}>
      <div className="slide-panel-content">
        {children}
      </div>
    </div>
  );
}
