import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { hapticImpact } from './useHaptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
  canRelease: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 120,
    disabled = false,
  } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [canRelease, setCanRelease] = useState(false);

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hadHapticFeedback = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setIsPulling(true);
    hadHapticFeedback.current = false;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff <= 0) {
      setPullDistance(0);
      setCanRelease(false);
      return;
    }

    const resistance = 0.5;
    const pullAmount = Math.min(diff * resistance, maxPull);
    setPullDistance(pullAmount);

    const reachedThreshold = pullAmount >= threshold;
    if (reachedThreshold && !hadHapticFeedback.current) {
      hapticImpact('medium');
      hadHapticFeedback.current = true;
    }
    setCanRelease(reachedThreshold);
  }, [isPulling, disabled, isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (canRelease && !isRefreshing) {
      setIsRefreshing(true);
      hapticImpact('light');

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRelease(false);
      }
    } else {
      setPullDistance(0);
      setCanRelease(false);
    }
  }, [isPulling, canRelease, isRefreshing, onRefresh]);

  useEffect(() => {
    if (isRefreshing) {
      setPullDistance(threshold * 0.6);
    }
  }, [isRefreshing, threshold]);

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    canRelease,
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
