import { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft, FiMoreHorizontal, FiCalendar, FiTrash2 } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import { useEntryNavigation } from '../../contexts/EntryNavigationContext';
import { Text } from '../themed';
import { ContentEditableEditor } from '../entries/ContentEditableEditor';
import BottomSheet from './BottomSheet';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import '../../styles/mobile.css';
import '../../styles/entries.css';
import 'react-day-picker/style.css';

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

interface MobileEntryEditorProps {
  entry: JournalEntry;
  onBack: () => void;
  onUpdate: (id: string, updates: EntryUpdate) => void;
  onDelete?: (id: string) => void;
}

export default function MobileEntryEditor({
  entry,
  onBack,
  onUpdate,
  onDelete,
}: MobileEntryEditorProps) {
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const { target, clearTarget } = useEntryNavigation();
  const [content, setContent] = useState(entry.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const appliedHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    setContent(entry.content);
  }, [entry.id]);

  useEffect(() => {
    if (!target?.sourceRange || target.entryId !== entry.id) {
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
  }, [entry.id]);

  const saveContent = useCallback((newContent: string) => {
    if (newContent !== entry.content) {
      onUpdate(entry.id, { content: newContent });
    }
  }, [entry, onUpdate]);

  const handleChange = useCallback((newContent: string) => {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(
      () => saveContent(newContent),
      ENTRIES_CONSTANTS.AUTOSAVE_DELAY_MS
    );
  }, [saveContent]);

  const handleBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  }, [saveContent, content]);

  const handleBack = useCallback(() => {
    hapticImpact('light');
    onBack();
  }, [onBack]);

  const handleMenuOpen = useCallback(() => {
    if (!isKeyboardOpen) {
      hapticSelection();
      setShowMenu(true);
    }
  }, [isKeyboardOpen]);

  const handleDateSelect = useCallback(async (date: Date | undefined) => {
    if (date) {
      const newDate = format(date, 'yyyy-MM-dd');
      await onUpdate(entry.id, { date: newDate });
      hapticImpact('light');
      setShowDatePicker(false);
      setShowMenu(false);
    }
  }, [entry.id, onUpdate]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      hapticImpact('medium');
      onDelete(entry.id);
    }
  }, [entry.id, onDelete]);

  return (
    <div
      className="mobile-editor-container"
      style={{
        height: '100%',
        backgroundColor: theme.colors.background.primary,
      }}
    >
      <header
        className="mobile-editor-header"
        style={{ backgroundColor: theme.colors.background.primary }}
      >
        <button
          className="mobile-editor-icon-button"
          style={{ color: theme.colors.text.primary }}
          onClick={handleBack}
          aria-label="Back"
        >
          <FiArrowLeft size={22} />
        </button>

        <Text className="mobile-editor-date">{format(parseISO(entry.date), 'MMMM d, yyyy')}</Text>

        {!isKeyboardOpen && (
          <button
            className="mobile-editor-icon-button"
            style={{ color: theme.colors.text.primary }}
            onClick={handleMenuOpen}
            aria-label="More options"
          >
            <FiMoreHorizontal size={22} />
          </button>
        )}
        {isKeyboardOpen && <div className="mobile-editor-spacer" />}
      </header>

      <div className="mobile-editor-content-wrapper" ref={editorContainerRef}>
        <ContentEditableEditor
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Start writing..."
          className="mobile-editor-textarea"
          style={{
            color: theme.colors.text.primary,
            padding: '0 16px',
            paddingBottom: isKeyboardOpen
              ? '20px'
              : 'calc(20px + var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
          }}
        />
      </div>

      <BottomSheet
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        title="Entry Options"
      >
        <EntryMenu
          onChangeDate={() => {
            setShowDatePicker(true);
            setShowMenu(false);
          }}
          onDelete={() => {
            setShowDeleteConfirm(true);
            setShowMenu(false);
          }}
          hasDelete={!!onDelete}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        title="Change Date"
      >
        <div className="mobile-date-picker-container">
          <DayPicker
            mode="single"
            selected={parseISO(entry.date)}
            onSelect={handleDateSelect}
            defaultMonth={parseISO(entry.date)}
            style={{
              '--rdp-accent-color': theme.colors.text.accent,
              '--rdp-background-color': theme.colors.background.secondary,
            } as React.CSSProperties}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Entry?"
      >
        <DeleteConfirmation
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </BottomSheet>
    </div>
  );
}

interface EntryMenuProps {
  onChangeDate: () => void;
  onDelete: () => void;
  hasDelete: boolean;
}

function EntryMenu({ onChangeDate, onDelete, hasDelete }: EntryMenuProps) {
  const { theme } = useTheme();

  return (
    <div>
      <button
        className="mobile-menu-item"
        style={{ color: theme.colors.text.primary }}
        onClick={onChangeDate}
      >
        <FiCalendar size={20} />
        <span>Change date</span>
      </button>
      {hasDelete && (
        <button className="mobile-menu-item mobile-menu-item--delete" onClick={onDelete}>
          <FiTrash2 size={20} />
          <span>Delete entry</span>
        </button>
      )}
    </div>
  );
}

interface DeleteConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmation({ onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div>
      <Text variant="secondary" className="mobile-confirm-text">
        This action cannot be undone.
      </Text>
      <div className="mobile-confirm-buttons">
        <button className="mobile-confirm-button mobile-confirm-button--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="mobile-confirm-button mobile-confirm-button--delete" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  );
}
