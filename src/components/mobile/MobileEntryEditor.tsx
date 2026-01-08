import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { TextArea } from '../themed';

interface MobileEntryEditorProps {
  entry: JournalEntry;
  onBack: () => void;
  onUpdate: (id: string, updates: EntryUpdate) => void;
}

export default function MobileEntryEditor({
  entry,
  onBack,
  onUpdate,
}: MobileEntryEditorProps) {
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const [content, setContent] = useState(entry.content);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { progress: swipeProgress, isActive: isSwipeActive } = useSwipeNavigation({
    onSwipeBack: onBack,
    enabled: true,
    edgeWidth: 40,
    threshold: 70,
  });

  useEffect(() => {
    setContent(entry.content);
  }, [entry.id]);

  const saveContent = useCallback((newContent: string) => {
    if (newContent !== entry.content) {
      onUpdate(entry.id, { content: newContent });
    }
  }, [entry, onUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveContent(newContent), 500);
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  };

  const backButtonStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    left: '8px',
    background: 'none',
    border: 'none',
    padding: '8px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    zIndex: 10,
  };

  const editorStyle: CSSProperties = {
    flex: 1,
    width: '100%',
    padding: '60px 16px 20px',
    paddingBottom: isKeyboardOpen ? '20px' : 'calc(20px + var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
    background: 'transparent',
    border: 'none',
    color: theme.colors.text.primary,
    fontSize: '16px',
    lineHeight: 1.7,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    WebkitAppearance: 'none',
    transition: 'padding-bottom 0.25s ease-out',
  };

  const wrapperStyle: CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.background.primary,
  };

  const containerStyle: CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colors.background.primary,
    position: 'relative',
    transform: isSwipeActive ? `translateX(${swipeProgress * 30}px)` : 'translateX(0)',
    transition: isSwipeActive ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <div style={wrapperStyle}>
      <div style={containerStyle}>
        <button style={backButtonStyle} onClick={onBack} aria-label="Back">
          <FiArrowLeft size={22} />
        </button>

        <TextArea
          ref={textareaRef}
          style={editorStyle}
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
