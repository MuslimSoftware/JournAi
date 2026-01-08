import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoScrollOptions {
  enabled?: boolean;
  threshold?: number;
  behavior?: ScrollBehavior;
  deps?: unknown[];
}

interface UseAutoScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: () => void;
  enableAutoScroll: () => void;
  disableAutoScroll: () => void;
}

const DEFAULT_THRESHOLD = 100;

export function useAutoScroll(options: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const {
    enabled = true,
    threshold = DEFAULT_THRESHOLD,
    behavior = 'smooth',
    deps = [],
  } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(enabled);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkIfAtBottom = useCallback((): boolean => {
    const element = scrollRef.current;
    if (!element) return false;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  const scrollToBottom = useCallback((immediate = false) => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: immediate ? 'auto' : behavior,
    });

    setIsAtBottom(true);
  }, [behavior]);

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);

    if (!atBottom && !isUserScrollingRef.current) {
      isUserScrollingRef.current = true;
      setAutoScrollEnabled(false);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;

      if (checkIfAtBottom()) {
        setAutoScrollEnabled(true);
      }
    }, 150);
  }, [checkIfAtBottom]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    if (autoScrollEnabled && enabled) {
      scrollToBottom();
    }
  }, [autoScrollEnabled, enabled, scrollToBottom]);

  useEffect(() => {
    if (deps.length > 0 && autoScrollEnabled && enabled) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const enableAutoScroll = useCallback(() => {
    setAutoScrollEnabled(true);
    scrollToBottom();
  }, [scrollToBottom]);

  const disableAutoScroll = useCallback(() => {
    setAutoScrollEnabled(false);
  }, []);

  return {
    scrollRef,
    isAtBottom,
    scrollToBottom,
    enableAutoScroll,
    disableAutoScroll,
  };
}

export function useScrollToBottom(containerRef: React.RefObject<HTMLElement>, dependencies: any[] = []): void {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const scrollToBottom = () => {
      element.scrollTop = element.scrollHeight;
    };

    requestAnimationFrame(scrollToBottom);
  }, dependencies);
}
