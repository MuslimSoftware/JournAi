import { ReactNode, CSSProperties, useState } from 'react';
import { FiTrash2, FiCalendar } from 'react-icons/fi';
import { useSwipeAction } from '../../hooks/useSwipeAction';
import { useTheme } from '../../contexts/ThemeContext';

interface SwipeableListItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onEditDate?: () => void;
  className?: string;
}

export default function SwipeableListItem({
  children,
  onDelete,
  onEditDate,
  className = '',
}: SwipeableListItemProps) {
  const { theme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { offsetX, isDragging, isFullSwipe, isOpen, handlers, close } = useSwipeAction({
    actionThreshold: 60,
    fullSwipeThreshold: 200,
    openPosition: 160,
  });

  const handleTouchEnd = () => {
    const result = handlers.onTouchEnd();
    if (result.isFullSwipe && onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleDelete = () => {
    close();
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  const handleCancelDelete = () => {
    close();
    setShowDeleteConfirm(false);
  };

  const handleEditDate = () => {
    close();
    onEditDate?.();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (isOpen) {
      e.stopPropagation();
      close();
    }
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
  };

  const revealedOffset = Math.abs(offsetX);
  const actionsWidth = isOpen ? 160 : Math.min(revealedOffset, 160);

  const contentStyle: CSSProperties = {
    transform: `translateX(${offsetX}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease',
    backgroundColor: theme.colors.background.primary,
    position: 'relative',
    zIndex: 1,
  };

  const actionsContainerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: `${actionsWidth}px`,
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
  };

  const actionButtonStyle = (bgColor: string): CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bgColor,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    minWidth: '60px',
  });

  const fullSwipeOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1rem',
    zIndex: 2,
    transition: isDragging ? 'none' : 'opacity 0.2s ease',
    opacity: isFullSwipe ? 1 : 0,
    pointerEvents: isFullSwipe ? 'auto' : 'none',
  };

  const deleteConfirmOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    color: '#ffffff',
    zIndex: 3,
  };

  const confirmButtonStyle: CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #ffffff',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  };

  const cancelButtonStyle: CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
  };

  const showActions = revealedOffset > 20;

  return (
    <div style={containerStyle} className={`swipeable-item ${className}`}>
      {showDeleteConfirm && (
        <div style={deleteConfirmOverlayStyle}>
          <span style={{ fontWeight: 600 }}>Delete this entry?</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={cancelButtonStyle} onClick={handleCancelDelete}>
              Cancel
            </button>
            <button style={confirmButtonStyle} onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
      {(showActions || isOpen) && !showDeleteConfirm && (
        <div style={actionsContainerStyle}>
          {onEditDate && (actionsWidth >= 120 || isOpen) && (
            <button
              style={actionButtonStyle(theme.colors.text.accent)}
              onClick={handleEditDate}
              aria-label="Edit date"
            >
              <FiCalendar size={22} />
            </button>
          )}
          {onDelete && (
            <button
              style={actionButtonStyle('#ef4444')}
              onClick={handleDelete}
              aria-label="Delete"
            >
              <FiTrash2 size={22} />
            </button>
          )}
        </div>
      )}
      {isFullSwipe && !showDeleteConfirm && (
        <div style={fullSwipeOverlayStyle}>
          <FiTrash2 size={22} />
          <span>Release to Delete</span>
        </div>
      )}
      <div
        style={contentStyle}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
