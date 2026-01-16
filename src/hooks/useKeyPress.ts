import { useEffect, useRef } from 'react';

interface KeyPressOptions {
  ignoreInputFields?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export function useKeyPress(
  targetKey: string,
  callback: (event: KeyboardEvent) => void,
  options: KeyPressOptions = {}
) {
  const {
    ignoreInputFields = true,
    preventDefault = true,
    stopPropagation = true,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
  } = options;

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (ignoreInputFields) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isInput =
          tagName === 'input' ||
          tagName === 'textarea' ||
          target.isContentEditable;

        if (isInput) return;
      }

      const keyMatch = event.key === targetKey;
      const ctrlMatch = ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = metaKey ? event.metaKey : !event.metaKey;
      const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = altKey ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        callbackRef.current(event);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [targetKey, ignoreInputFields, preventDefault, stopPropagation, ctrlKey, metaKey, shiftKey, altKey]);
}

export function useEscapeKey(
  callback: () => void,
  options?: Omit<KeyPressOptions, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>
) {
  useKeyPress('Escape', callback, options);
}
