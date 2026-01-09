import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { FiArrowLeft, FiMoreHorizontal, FiCalendar, FiTrash2 } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import { TextArea, Text } from '../themed';
import BottomSheet from './BottomSheet';
import { ENTRIES_CONSTANTS, MOBILE_ENTRIES_CONSTANTS } from '../../constants/entries';
import 'react-day-picker/style.css';

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
  const [content, setContent] = useState(entry.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { progress: swipeProgress, isActive: isSwipeActive } = useSwipeNavigation({
    onSwipeBack: () => {
      hapticImpact('light');
      onBack();
    },
    enabled: !isKeyboardOpen,
    edgeWidth: MOBILE_ENTRIES_CONSTANTS.SWIPE_EDGE_WIDTH,
    threshold: MOBILE_ENTRIES_CONSTANTS.SWIPE_THRESHOLD,
  });

  useEffect(() => {
    setContent(entry.content);
  }, [entry.id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 300);
    return () => clearTimeout(timer);
  }, []);

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

  const containerTransform = isSwipeActive
    ? `translateX(${swipeProgress * 50}px)`
    : 'translateX(0)';

  const containerOpacity = isSwipeActive ? 1 - swipeProgress * 0.3 : 1;

  const containerStyle: CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    transform: isEntering ? 'translateX(100%)' : containerTransform,
    opacity: containerOpacity,
    transition: isEntering
      ? 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
      : isSwipeActive
        ? 'none'
        : 'transform 0.2s ease-out, opacity 0.2s ease-out',
  };

  const edgeIndicatorStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: theme.colors.text.muted,
    opacity: isSwipeActive ? Math.min(swipeProgress * 2, 0.4) : 0,
    transform: `scaleX(${swipeProgress >= 1 ? 1.5 : 1})`,
    transition: isSwipeActive ? 'none' : 'opacity 0.2s ease-out, transform 0.1s ease-out',
    zIndex: 20,
    borderRadius: '0 2px 2px 0',
  };

  const swipeOverlayStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${swipeProgress * 100}px`,
    background: `linear-gradient(90deg, rgba(128, 128, 128, ${swipeProgress * 0.1}) 0%, transparent 100%)`,
    pointerEvents: 'none',
    zIndex: 15,
    opacity: isSwipeActive ? 1 : 0,
    transition: isSwipeActive ? 'none' : 'opacity 0.2s ease-out',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 8px 8px 4px',
    backgroundColor: theme.colors.background.primary,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };

  const iconButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '12px',
    cursor: 'pointer',
    color: theme.colors.text.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    WebkitTapHighlightColor: 'transparent',
    minWidth: '48px',
    minHeight: '48px',
  };

  const dateStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: theme.colors.text.muted,
  };

  return (
    <div style={containerStyle} className="mobile-editor-container">
      {isSwipeActive && <div style={edgeIndicatorStyle} />}
      {isSwipeActive && <div style={swipeOverlayStyle} />}
      <header style={headerStyle}>
        <button style={iconButtonStyle} onClick={handleBack} aria-label="Back">
          <FiArrowLeft size={22} />
        </button>

        <Text style={dateStyle}>{format(parseISO(entry.date), 'MMMM d, yyyy')}</Text>

        {!isKeyboardOpen && (
          <button style={iconButtonStyle} onClick={handleMenuOpen} aria-label="More options">
            <FiMoreHorizontal size={22} />
          </button>
        )}
        {isKeyboardOpen && <div style={{ width: '48px' }} />}
      </header>

      <TextArea
        ref={textareaRef}
        className="mobile-editor-textarea"
        style={{
          color: theme.colors.text.primary,
          padding: '0 16px',
          paddingBottom: isKeyboardOpen
            ? '20px'
            : 'calc(20px + var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
        }}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Start writing..."
      />

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

  const menuItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.text.primary,
    fontSize: '1rem',
    WebkitTapHighlightColor: 'transparent',
  };

  const deleteItemStyle: CSSProperties = {
    ...menuItemStyle,
    color: '#ef4444',
  };

  return (
    <div>
      <button style={menuItemStyle} onClick={onChangeDate}>
        <FiCalendar size={20} />
        <span>Change date</span>
      </button>
      {hasDelete && (
        <button style={deleteItemStyle} onClick={onDelete}>
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
  const { theme } = useTheme();

  const buttonContainerStyle: CSSProperties = {
    display: 'flex',
    gap: '12px',
    padding: '8px 0',
  };

  const buttonBaseStyle: CSSProperties = {
    flex: 1,
    padding: '14px 24px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  const cancelButtonStyle: CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  };

  const deleteButtonStyle: CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff',
  };

  return (
    <div>
      <Text variant="secondary" style={{ marginBottom: '16px', textAlign: 'center' }}>
        This action cannot be undone.
      </Text>
      <div style={buttonContainerStyle}>
        <button style={cancelButtonStyle} onClick={onCancel}>
          Cancel
        </button>
        <button style={deleteButtonStyle} onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  );
}
