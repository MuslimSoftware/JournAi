import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeNavigationState {
  progress: number;
  isActive: boolean;
}

interface UseSwipeNavigationOptions {
  edgeWidth?: number;
  threshold?: number;
  onSwipeBack?: () => void;
  enabled?: boolean;
}

export function useSwipeNavigation(options: UseSwipeNavigationOptions = {}) {
  const {
    edgeWidth = 20,
    threshold = 100,
    onSwipeBack,
    enabled = true,
  } = options;

  const [state, setState] = useState<SwipeNavigationState>({
    progress: 0,
    isActive: false,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const isEdgeSwipe = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isEdgeSwipe.current = touch.clientX <= edgeWidth;
    isHorizontal.current = null;

    if (isEdgeSwipe.current) {
      setState({ progress: 0, isActive: true });
    }
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isEdgeSwipe.current) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;

    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
    }

    if (!isHorizontal.current) {
      isEdgeSwipe.current = false;
      setState({ progress: 0, isActive: false });
      return;
    }

    if (diffX > 0) {
      e.preventDefault();
      const progress = Math.min(diffX / threshold, 1);
      setState({ progress, isActive: true });
    }
  }, [enabled, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isEdgeSwipe.current) return;

    if (state.progress >= 1 && onSwipeBack) {
      onSwipeBack();
    }

    setState({ progress: 0, isActive: false });
    isEdgeSwipe.current = false;
    isHorizontal.current = null;
  }, [enabled, state.progress, onSwipeBack]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    progress: state.progress,
    isActive: state.isActive,
  };
}
