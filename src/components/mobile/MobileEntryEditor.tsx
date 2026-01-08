import { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { TextArea } from '../themed';
import { ENTRIES_CONSTANTS, MOBILE_ENTRIES_CONSTANTS } from '../../constants/entries';

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
    edgeWidth: MOBILE_ENTRIES_CONSTANTS.SWIPE_EDGE_WIDTH,
    threshold: MOBILE_ENTRIES_CONSTANTS.SWIPE_THRESHOLD,
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
    saveTimeoutRef.current = setTimeout(
      () => saveContent(newContent),
      ENTRIES_CONSTANTS.AUTOSAVE_DELAY_MS
    );
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  };

  const containerTransform = isSwipeActive
    ? `translateX(${swipeProgress * 30}px)`
    : 'translateX(0)';

  return (
    <div style={{ height: '100%', backgroundColor: theme.colors.background.primary }}>
      <div
        className="mobile-editor-container"
        style={{
          backgroundColor: theme.colors.background.primary,
          transform: containerTransform,
          transition: isSwipeActive ? 'none' : undefined,
        }}
      >
        <button
          className="mobile-editor-back"
          onClick={onBack}
          aria-label="Back"
          style={{ color: theme.colors.text.primary }}
        >
          <FiArrowLeft size={22} />
        </button>

        <TextArea
          ref={textareaRef}
          className="mobile-editor-textarea"
          style={{
            color: theme.colors.text.primary,
            paddingBottom: isKeyboardOpen
              ? '20px'
              : 'calc(20px + var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
          }}
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
