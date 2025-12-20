import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Text } from '../themed';
import { JournalEntry, EntryUpdate } from '../../types/entry';

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

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveContent(newContent), 500);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentChange(e.target.value);
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
            <button className="entries-empty-state-action" onClick={() => onCreateEntry()}>
              <FiPlus size={16} />
              Create your first entry
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="entries-content">
      <textarea
        className="entry-content-editor"
        value={content}
        onChange={handleTextareaChange}
        onBlur={handleBlur}
        placeholder="Start writing..."
      />
    </div>
  );
}
