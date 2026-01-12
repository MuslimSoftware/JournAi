import { useEffect, useRef, CSSProperties, RefObject } from 'react';
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

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
    if (!highlightRange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const mark = overlayRef.current?.querySelector('mark');
      if (mark && !mark.contains(target)) {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [highlightRange, onDismiss]);

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

  return (
    <div ref={overlayRef} className={className} style={overlayStyle}>
      {before}
      <mark style={markStyle} onClick={onDismiss}>
        {highlighted}
      </mark>
      {after}
    </div>
  );
}
