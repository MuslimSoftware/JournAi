import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Text, Button } from '../themed';
import { ContentEditableEditor } from './ContentEditableEditor';
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

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveContent(newContent), AUTOSAVE_DELAY_MS);
  }, [saveContent]);

  const handleBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (entry) {
      saveContent(content);
    }
  }, [entry, saveContent, content]);

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
      <ContentEditableEditor
        value={content}
        onChange={handleContentChange}
        onBlur={handleBlur}
        placeholder="Start writing..."
        highlightRange={highlightRange}
        onHighlightDismiss={onClearHighlight}
        className="entry-content-editor scrollbar-hidden"
      />
    </div>
  );
}
