import { useState, useRef, useCallback } from 'react';

interface SwipeState {
  offsetX: number;
  isDragging: boolean;
  isFullSwipe: boolean;
  isOpen: boolean;
}

interface UseSwipeActionOptions {
  actionThreshold?: number;
  fullSwipeThreshold?: number;
  openPosition?: number;
}

export function useSwipeAction(options: UseSwipeActionOptions = {}) {
  const {
    actionThreshold = 60,
    fullSwipeThreshold = 200,
    openPosition = 160
  } = options;

  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    isDragging: false,
    isFullSwipe: false,
    isOpen: false
  });
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const startOffset = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    startOffset.current = state.offsetX;
    setState(prev => ({ ...prev, isDragging: true }));
  }, [state.offsetX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    if (isHorizontalSwipe.current === null) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }

    if (!isHorizontalSwipe.current) return;

    e.preventDefault();

    const newOffset = startOffset.current + diffX;
    const clampedOffset = Math.max(-fullSwipeThreshold - 50, Math.min(0, newOffset));
    const isFullSwipe = Math.abs(clampedOffset) >= fullSwipeThreshold;

    setState(prev => ({ ...prev, offsetX: clampedOffset, isFullSwipe }));
  }, [state.isDragging, fullSwipeThreshold]);

  const handleTouchEnd = useCallback(() => {
    const absOffset = Math.abs(state.offsetX);
    const isFullSwipe = absOffset >= fullSwipeThreshold;

    let finalOffset = 0;
    let isOpen = false;

    if (isFullSwipe) {
      finalOffset = 0;
    } else if (absOffset >= actionThreshold) {
      finalOffset = -openPosition;
      isOpen = true;
    }

    setState({
      offsetX: finalOffset,
      isDragging: false,
      isFullSwipe: false,
      isOpen
    });
    isHorizontalSwipe.current = null;

    return { isFullSwipe };
  }, [state.offsetX, actionThreshold, fullSwipeThreshold, openPosition]);

  const close = useCallback(() => {
    setState({ offsetX: 0, isDragging: false, isFullSwipe: false, isOpen: false });
  }, []);

  return {
    offsetX: state.offsetX,
    isDragging: state.isDragging,
    isFullSwipe: state.isFullSwipe,
    isOpen: state.isOpen,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    close,
  };
}
