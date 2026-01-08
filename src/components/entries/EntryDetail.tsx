import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Text, Button, TextArea } from '../themed';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { ENTRIES_CONSTANTS } from '../../constants/entries';

const { AUTOSAVE_DELAY_MS } = ENTRIES_CONSTANTS;

interface EntryDetailProps {
  entry: JournalEntry | null;
  hasEntries: boolean;
  onUpdate: (id: string, updates: EntryUpdate) => void;
  onCreateEntry: () => void;
}

export default function EntryDetail({ entry, hasEntries, onUpdate, onCreateEntry }: EntryDetailProps) {
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
      <TextArea
        className="entry-content-editor scrollbar-hidden"
        value={content}
        onChange={handleContentChange}
        onBlur={handleBlur}
        placeholder="Start writing..."
      />
    </div>
  );
}
