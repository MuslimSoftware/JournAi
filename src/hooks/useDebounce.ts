import { useEffect, useRef } from 'react';

interface DebounceOptions {
  delay: number;
}

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  options: DebounceOptions
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return ((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, options.delay);
  }) as T;
}
