import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
  });

  const updateKeyboardState = useCallback(() => {
    if (!window.visualViewport) return;

    const windowHeight = window.innerHeight;
    const viewportHeight = window.visualViewport.height;
    const keyboardHeight = Math.max(0, windowHeight - viewportHeight);
    const threshold = 150;
    const isOpen = keyboardHeight > threshold;

    setState({ isOpen, height: keyboardHeight });

    document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);

    if (isOpen) {
      document.documentElement.classList.add('keyboard-open');
    } else {
      document.documentElement.classList.remove('keyboard-open');
    }
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;

    updateKeyboardState();

    window.visualViewport.addEventListener('resize', updateKeyboardState);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardState);
      }
      document.documentElement.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, [updateKeyboardState]);

  return state;
}

export function useKeyboardAwareHeight(): number {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setHeight(window.visualViewport.height);
      } else {
        setHeight(window.innerHeight);
      }
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      return () => window.visualViewport?.removeEventListener('resize', updateHeight);
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return height;
}

export function scrollToFocusedInput(offset = 20): void {
  const activeElement = document.activeElement as HTMLElement;
  if (!activeElement || !('tagName' in activeElement)) return;

  const tagName = activeElement.tagName.toLowerCase();
  if (tagName !== 'input' && tagName !== 'textarea') return;

  requestAnimationFrame(() => {
    const rect = activeElement.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;

    if (rect.bottom > viewportHeight - offset) {
      const scrollBy = rect.bottom - viewportHeight + offset;
      const scrollableParent = findScrollableParent(activeElement);
      if (scrollableParent) {
        scrollableParent.scrollBy({ top: scrollBy, behavior: 'smooth' });
      }
    }
  });
}

function findScrollableParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
