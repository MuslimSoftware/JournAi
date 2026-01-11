import { useEffect, useRef, useState, CSSProperties, RefObject } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { HighlightRange } from '../../hooks/useEntries';

interface HighlightOverlayProps {
  content: string;
  highlightRange: HighlightRange | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onDismiss: () => void;
  className?: string;
  style?: CSSProperties;
}

export function HighlightOverlay({
  content,
  highlightRange,
  textareaRef,
  onDismiss,
  className,
  style,
}: HighlightOverlayProps) {
  const { theme } = useTheme();
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;

    const syncScroll = () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', syncScroll);
    return () => textarea.removeEventListener('scroll', syncScroll);
  }, [textareaRef]);

  useEffect(() => {
    if (!highlightRange || hasScrolledRef.current) return;

    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;

    const mark = overlay.querySelector('mark');
    if (mark) {
      const textareaRect = textarea.getBoundingClientRect();
      const markRect = mark.getBoundingClientRect();
      const scrollOffset = markRect.top - textareaRect.top + textarea.scrollTop - 100;

      textarea.scrollTop = Math.max(0, scrollOffset);
      hasScrolledRef.current = true;
    }
  }, [highlightRange, textareaRef]);

  useEffect(() => {
    if (highlightRange) {
      hasScrolledRef.current = false;
    }
  }, [highlightRange]);

  useEffect(() => {
    if (!isHovered || !markRef.current || !overlayRef.current) {
      setButtonPosition(null);
      return;
    }

    const mark = markRef.current;
    const overlay = overlayRef.current;
    const markRect = mark.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    setButtonPosition({
      top: markRect.top - overlayRect.top - 8,
      left: markRect.right - overlayRect.left - 8,
    });
  }, [isHovered]);

  if (!highlightRange) return null;

  const { start, end } = highlightRange;
  const before = content.slice(0, start);
  const highlighted = content.slice(start, end);
  const after = content.slice(end);

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    color: 'transparent',
    ...style,
  };

  const markStyle: CSSProperties = {
    backgroundColor: 'rgba(250, 204, 21, 0.4)',
    color: 'transparent',
    borderRadius: '2px',
    boxShadow: '0 0 0 2px rgba(250, 204, 21, 0.4)',
    pointerEvents: 'auto',
    cursor: 'pointer',
  };

  const dismissButtonStyle: CSSProperties = {
    position: 'absolute',
    top: buttonPosition?.top ?? 0,
    left: buttonPosition?.left ?? 0,
    width: '18px',
    height: '18px',
    padding: 0,
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
    textAlign: 'center',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.secondary,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: '50%',
    cursor: 'pointer',
    pointerEvents: 'auto',
    zIndex: 10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div ref={overlayRef} className={className} style={overlayStyle}>
      {before}
      <mark
        ref={markRef}
        style={markStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onDismiss}
      >
        {highlighted}
      </mark>
      {after}
      {isHovered && buttonPosition && (
        <button
          style={dismissButtonStyle}
          onClick={onDismiss}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Clear highlight"
        >
          ×
        </button>
      )}
    </div>
  );
}
