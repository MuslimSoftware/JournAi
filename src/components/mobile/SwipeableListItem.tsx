import { ReactNode, useState, useRef, useEffect } from 'react';
import { FiTrash2, FiCalendar } from 'react-icons/fi';
import { useSwipeAction } from '../../hooks/useSwipeAction';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import { lightTheme } from '../../theme/tokens';

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
  const hadThresholdHaptic = useRef(false);
  const hadFullSwipeHaptic = useRef(false);

  const { offsetX, isDragging, isFullSwipe, isOpen, handlers, close } = useSwipeAction({
    actionThreshold: 60,
    fullSwipeThreshold: 200,
    openPosition: 160,
  });

  const revealedOffset = Math.abs(offsetX);

  useEffect(() => {
    if (revealedOffset > 60 && !hadThresholdHaptic.current) {
      hapticSelection();
      hadThresholdHaptic.current = true;
    }
    if (revealedOffset < 50) {
      hadThresholdHaptic.current = false;
    }

    if (isFullSwipe && !hadFullSwipeHaptic.current) {
      hapticImpact('medium');
      hadFullSwipeHaptic.current = true;
    }
    if (!isFullSwipe) {
      hadFullSwipeHaptic.current = false;
    }
  }, [revealedOffset, isFullSwipe]);

  const handleTouchEnd = () => {
    const result = handlers.onTouchEnd();
    if (result.isFullSwipe && onDelete) {
      hapticImpact('heavy');
      setShowDeleteConfirm(true);
    }
  };

  const handleDelete = () => {
    hapticImpact('medium');
    close();
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  const handleCancelDelete = () => {
    hapticImpact('light');
    close();
    setShowDeleteConfirm(false);
  };

  const handleEditDate = () => {
    hapticSelection();
    close();
    onEditDate?.();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (isOpen) {
      e.stopPropagation();
      close();
    }
  };

  const actionsWidth = isOpen ? 160 : Math.min(revealedOffset, 160);
  const isLightMode = theme === lightTheme;
  const deleteColor = isLightMode ? '#dc2626' : '#ef4444';
  const editDateColor = isLightMode ? '#6b7280' : '#9ca3af';
  const swipeProgress = Math.min(revealedOffset / 200, 1);
  const showActions = revealedOffset > 20;

  const contentClass = `swipeable-content${isDragging ? '' : ' swipeable-content--animated'}`;
  const fullOverlayClass = `swipeable-full-overlay${isFullSwipe ? ' swipeable-full-overlay--active' : ''}${isDragging ? '' : ' swipeable-full-overlay--animated'}`;

  return (
    <div className={`swipeable-container swipeable-item ${className}`}>
      {showDeleteConfirm && (
        <div className="swipeable-delete-confirm" style={{ backgroundColor: deleteColor }}>
          <span className="swipeable-delete-confirm__text">Delete this entry?</span>
          <div className="swipeable-delete-confirm__buttons">
            <button className="swipeable-button-cancel" onClick={handleCancelDelete}>
              Cancel
            </button>
            <button className="swipeable-button-confirm" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
      {(showActions || isOpen) && !showDeleteConfirm && (
        <div className="swipeable-actions" style={{ width: `${actionsWidth}px` }}>
          {onEditDate && (actionsWidth >= 120 || isOpen) && (
            <button
              className="swipeable-action-button"
              style={{ backgroundColor: editDateColor }}
              onClick={handleEditDate}
              aria-label="Edit date"
            >
              <FiCalendar size={22} />
            </button>
          )}
          {onDelete && (
            <button
              className="swipeable-action-button"
              style={{ backgroundColor: deleteColor }}
              onClick={handleDelete}
              aria-label="Delete"
            >
              <FiTrash2 size={22} />
            </button>
          )}
        </div>
      )}
      {isFullSwipe && !showDeleteConfirm && (
        <div
          className={fullOverlayClass}
          style={{
            backgroundColor: deleteColor,
            opacity: swipeProgress > 0.5 ? (swipeProgress - 0.5) * 2 : 0,
            transform: `scale(${isFullSwipe ? 1 : 0.95 + swipeProgress * 0.05})`,
          }}
        >
          <FiTrash2 size={22} />
          <span>Release to Delete</span>
        </div>
      )}
      <div
        className={contentClass}
        style={{ transform: `translateX(${offsetX}px)` }}
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
