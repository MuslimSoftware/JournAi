import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { CSSProperties } from 'react';
import '../../styles/bottom-sheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto'
}: BottomSheetProps) {
  const { theme } = useTheme();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  };

  const heightMap = {
    auto: 'auto',
    half: '50dvh',
    full: 'calc(100dvh - var(--mobile-safe-area-top) - 20px)',
  };

  const sheetStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: heightMap[height],
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    zIndex: 2001,
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease',
    paddingBottom: 'var(--mobile-safe-area-bottom)',
  };

  const handleStyle: CSSProperties = {
    width: '36px',
    height: '4px',
    backgroundColor: theme.colors.border.primary,
    borderRadius: '2px',
    margin: '12px auto',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px 12px',
    borderBottom: title ? `1px solid ${theme.colors.border.primary}` : 'none',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: theme.colors.text.primary,
  };

  const contentStyle: CSSProperties = {
    padding: '16px',
    overflowY: 'auto',
    maxHeight: height === 'full' ? 'calc(100vh - 120px)' : 'calc(50vh - 80px)',
  };

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div
        ref={sheetRef}
        style={sheetStyle}
        className="bottom-sheet"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={handleStyle} className="bottom-sheet-handle" />
        {title && (
          <div style={headerStyle}>
            <span style={titleStyle}>{title}</span>
          </div>
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    </>,
    document.body
  );
}
