import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Text, Button, TextArea } from '../themed';
import { HighlightOverlay } from './HighlightOverlay';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import type { HighlightRange } from '../../hooks/useEntries';

const { AUTOSAVE_DELAY_MS } = ENTRIES_CONSTANTS;

interface EntryDetailProps {
  entry: JournalEntry | null;
  hasEntries: boolean;
  highlightRange: HighlightRange | null;
  onUpdate: (id: string, updates: EntryUpdate) => void;
  onCreateEntry: () => void;
  onClearHighlight: () => void;
}

export default function EntryDetail({ entry, hasEntries, highlightRange, onUpdate, onCreateEntry, onClearHighlight }: EntryDetailProps) {
  const [content, setContent] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (entry) {
      setContent(entry.content);
    }
  }, [entry?.id]);

  const saveContent = useCallback((newContent: string) => {
    if (entry && newContent !== entry.content) {
      onUpdate(entry.id, { content: newContent });
    }
  }, [entry, onUpdate]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveContent(newContent), AUTOSAVE_DELAY_MS);
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (entry) {
      saveContent(content);
    }
  };

  if (!entry) {
    return (
      <div className="entries-empty-state">
        {hasEntries ? (
          <>
            <Text variant="secondary" className="entries-empty-state-title">No entry selected</Text>
            <Text variant="muted" className="entries-empty-state-subtitle">
              Select an entry from the sidebar to view and edit its content
            </Text>
          </>
        ) : (
          <>
            <Text variant="secondary" className="entries-empty-state-title">Welcome to your journal</Text>
            <Text variant="muted" className="entries-empty-state-subtitle">
              Capture your thoughts, ideas, and reflections. Your entries are stored locally and never leave your device.
            </Text>
            <Button
              variant="primary"
              size="sm"
              icon={<FiPlus size={16} />}
              onClick={onCreateEntry}
            >
              Create your first entry
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="entries-content">
      <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 'var(--entries-content-max-width)', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <HighlightOverlay
          content={content}
          highlightRange={highlightRange}
          textareaRef={textareaRef}
          onDismiss={onClearHighlight}
          className="entry-content-editor scrollbar-hidden"
        />
        <TextArea
          ref={textareaRef}
          className="entry-content-editor scrollbar-hidden"
          style={{ background: highlightRange ? 'transparent' : undefined }}
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
