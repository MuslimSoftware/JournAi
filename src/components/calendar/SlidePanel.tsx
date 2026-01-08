import { ReactNode } from 'react';

interface SlidePanelProps {
  children: ReactNode;
}

export default function SlidePanel({ children }: SlidePanelProps) {
  return (
    <div className="slide-panel open">
      <div className="slide-panel-content">
        {children}
      </div>
    </div>
  );
}
