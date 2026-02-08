import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit3, FiX } from 'react-icons/fi';
import { Text, Button, IconButton, Card, Spinner } from '../themed';
import { useTheme } from '../../contexts/ThemeContext';
import { ContentEditableEditor, ContentEditableEditorRef } from './ContentEditableEditor';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import { formatEntryDate } from '../../utils/date';
import { useFocusMode } from '../../contexts/FocusModeContext';
import { useEntryNavigation } from '../../contexts/EntryNavigationContext';

const { AUTOSAVE_DELAY_MS } = ENTRIES_CONSTANTS;

interface EntryDetailProps {
  entry: JournalEntry | null;
  hasEntries: boolean;
  isResolvingEntry?: boolean;
  recentEntries?: JournalEntry[];
  onUpdate: (id: string, updates: EntryUpdate) => void;
  onCreateEntry: () => void;
  onClearSelection?: () => void;
  onSelectEntry?: (id: string) => void;
}

function findTextNodeAndOffset(
  container: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  let currentOffset = 0;
  let node = walker.nextNode();
  let lastTextNode: Text | null = null;

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const nodeLength = textNode.textContent?.length ?? 0;
      if (currentOffset + nodeLength >= targetOffset) {
        return { node: textNode, offset: targetOffset - currentOffset };
      }
      currentOffset += nodeLength;
      lastTextNode = textNode;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === 'BR') {
        currentOffset += 1;
      } else if (el.tagName === 'DIV' && lastTextNode) {
        currentOffset += 1;
      }
    }
    node = walker.nextNode();
  }

  return null;
}

export default function EntryDetail({
  entry,
  hasEntries,
  isResolvingEntry = false,
  recentEntries = [],
  onUpdate,
  onCreateEntry,
  onClearSelection,
  onSelectEntry,
}: EntryDetailProps) {
  const [content, setContent] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ContentEditableEditorRef>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { isFocusMode } = useFocusMode();
  const { target, clearTarget } = useEntryNavigation();
  const { theme } = useTheme();
  const appliedHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    setContent(entry?.content ?? '');
  }, [entry?.id]);

  useEffect(() => {
    if (!entry || !target?.sourceRange || target.entryId !== entry.id) {
      return;
    }

    const highlightKey = `${entry.id}-${target.sourceRange.start}-${target.sourceRange.end}`;
    if (appliedHighlightRef.current === highlightKey) {
      return;
    }

    const applyHighlight = () => {
      const editorElement = editorContainerRef.current?.querySelector('[contenteditable]') as HTMLElement | null;
      if (!editorElement || !target.sourceRange) return;

      const { start, end } = target.sourceRange;

      if (start < 0 || end > content.length || start >= end) {
        clearTarget();
        return;
      }

      try {
        const startResult = findTextNodeAndOffset(editorElement, start);
        const endResult = findTextNodeAndOffset(editorElement, end);

        if (!startResult || !endResult) {
          clearTarget();
          return;
        }

        const range = new Range();
        range.setStart(startResult.node, startResult.offset);
        range.setEnd(endResult.node, endResult.offset);

        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'insight-highlight-span';
        highlightSpan.setAttribute('data-insight-highlight', 'true');

        highlightSpan.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        highlightSpan.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (highlightSpan.parentNode) {
            const parent = highlightSpan.parentNode;
            while (highlightSpan.firstChild) {
              parent.insertBefore(highlightSpan.firstChild, highlightSpan);
            }
            parent.removeChild(highlightSpan);
            parent.normalize();
          }
          appliedHighlightRef.current = null;
        });

        range.surroundContents(highlightSpan);

        appliedHighlightRef.current = highlightKey;

        highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const selection = window.getSelection();
        selection?.removeAllRanges();

        clearTarget();
      } catch {
        clearTarget();
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyHighlight);
    });
  }, [entry, target, content, clearTarget]);

  useEffect(() => {
    return () => {
      const editorElement = editorContainerRef.current?.querySelector('[contenteditable]') as HTMLElement | null;
      if (editorElement) {
        const highlightSpan = editorElement.querySelector('[data-insight-highlight]');
        if (highlightSpan && highlightSpan.parentNode) {
          const parent = highlightSpan.parentNode;
          while (highlightSpan.firstChild) {
            parent.insertBefore(highlightSpan.firstChild, highlightSpan);
          }
          parent.removeChild(highlightSpan);
        }
      }
      if (CSS.highlights) {
        CSS.highlights.delete('insight-highlight');
      }
      appliedHighlightRef.current = null;
    };
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
    if (isResolvingEntry) {
      return (
        <div
          className="entries-empty-state"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
        >
          <Spinner size="md" />
          <Text variant="muted">Loading entry...</Text>
        </div>
      );
    }

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
                variant="secondary"
                size="sm"
                icon={<FiPlus size={16} />}
                onClick={() => void onCreateEntry()}
                style={{
                  backgroundColor: theme.colors.text.primary,
                  color: theme.colors.background.primary,
                  border: 'none',
                }}
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
              variant="secondary"
              size="sm"
              icon={<FiPlus size={16} />}
              onClick={() => void onCreateEntry()}
              style={{
                backgroundColor: theme.colors.text.primary,
                color: theme.colors.background.primary,
                border: 'none',
              }}
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
      <div ref={editorContainerRef} className="entry-content-editor-wrapper">
        <ContentEditableEditor
          ref={editorRef}
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder="Start writing..."
          className="entry-content-editor scrollbar-hidden"
        />
      </div>
    </div>
  );
}
