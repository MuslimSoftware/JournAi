import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit3, FiX } from 'react-icons/fi';
import { Text, Button, IconButton, Card } from '../themed';
import { ContentEditableEditor } from './ContentEditableEditor';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import { formatEntryDate } from '../../utils/date';
import { useFocusMode } from '../../contexts/FocusModeContext';

const { AUTOSAVE_DELAY_MS } = ENTRIES_CONSTANTS;

interface EntryDetailProps {
  entry: JournalEntry | null;
  hasEntries: boolean;
  recentEntries?: JournalEntry[];
  onUpdate: (id: string, updates: EntryUpdate) => void;
  onCreateEntry: () => void;
  onClearSelection?: () => void;
  onSelectEntry?: (id: string) => void;
}

export default function EntryDetail({ entry, hasEntries, recentEntries = [], onUpdate, onCreateEntry, onClearSelection, onSelectEntry }: EntryDetailProps) {
  const [content, setContent] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isFocusMode } = useFocusMode();

  useEffect(() => {
    setContent(entry?.content ?? '');
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
    const displayedEntries = recentEntries.slice(0, 6);

    return (
      <div className="entries-empty-state">
        {hasEntries ? (
          <>
            <div className="empty-state-icon">
              <FiEdit3 size={40} strokeWidth={1.5} />
            </div>
            <Text variant="secondary" className="entries-empty-state-title">
              Ready to write?
            </Text>
            <Text variant="muted" className="entries-empty-state-subtitle">
              Start a new entry or continue with a recent one.
            </Text>
            <div className="empty-state-actions">
              <Button
                variant="primary"
                size="sm"
                icon={<FiPlus size={16} />}
                onClick={() => void onCreateEntry()}
              >
                New Entry
              </Button>
            </div>

            {displayedEntries.length > 0 && (
              <div className="recent-entries-section">
                <Text variant="muted" className="recent-entries-header">
                  Recent entries
                </Text>
                <div className="recent-entries-grid">
                  {displayedEntries.map((recentEntry) => (
                    <Card
                      key={recentEntry.id}
                      padding="md"
                      className="recent-entry-card"
                      onClick={() => onSelectEntry?.(recentEntry.id)}
                    >
                      <Text variant="muted" className="recent-entry-date">
                        {formatEntryDate(recentEntry.date)}
                      </Text>
                      <Text variant="secondary" className="recent-entry-preview">
                        {recentEntry.preview}
                      </Text>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="empty-state-icon">
              <FiEdit3 size={40} strokeWidth={1.5} />
            </div>
            <Text variant="secondary" className="entries-empty-state-title">Welcome to your journal</Text>
            <Text variant="muted" className="entries-empty-state-subtitle">
              Capture your thoughts, ideas, and reflections. Your entries are stored locally and never leave your device.
            </Text>
            <Button
              variant="primary"
              size="sm"
              icon={<FiPlus size={16} />}
              onClick={() => void onCreateEntry()}
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
      {onClearSelection && !isFocusMode && (
        <div className="entry-detail-header">
          <IconButton
            icon={<FiX size={18} />}
            label="Close entry"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="entry-close-button"
          />
        </div>
      )}
      <ContentEditableEditor
        value={content}
        onChange={handleContentChange}
        onBlur={handleBlur}
        placeholder="Start writing..."
        className="entry-content-editor scrollbar-hidden"
      />
    </div>
  );
}
