import { useEffect, useRef, useCallback, CSSProperties, forwardRef, useImperativeHandle } from 'react';
import type { HighlightRange } from '../../contexts/EntryNavigationContext';
import '../../styles/content-editable.css';

interface ContentEditableEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  highlightRange?: HighlightRange | null;
  onHighlightDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface ContentEditableEditorRef {
  focus: () => void;
  blur: () => void;
}

const supportsHighlightAPI = typeof CSS !== 'undefined' && 'highlights' in CSS;

function findTextNodeAndOffset(
  container: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  let currentOffset = 0;
  let node = walker.nextNode();
  let lastTextNode: Text | null = null;

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const nodeLength = textNode.textContent?.length ?? 0;
      if (currentOffset + nodeLength >= targetOffset) {
        return { node: textNode, offset: targetOffset - currentOffset };
      }
      currentOffset += nodeLength;
      lastTextNode = textNode;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === 'BR') {
        currentOffset += 1;
      } else if (el.tagName === 'DIV' && lastTextNode) {
        currentOffset += 1;
      }
    }
    node = walker.nextNode();
  }

  return null;
}

function createRangeForOffsets(
  container: HTMLElement,
  start: number,
  end: number
): Range | null {
  const startPoint = findTextNodeAndOffset(container, start);
  const endPoint = findTextNodeAndOffset(container, end);

  if (!startPoint || !endPoint) return null;

  const range = new Range();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  return range;
}

function applyHighlight(element: HTMLElement, highlightRange: HighlightRange) {
  if (!supportsHighlightAPI || !CSS.highlights) return;

  CSS.highlights.delete('insight-highlight');

  const { start, end } = highlightRange;
  const range = createRangeForOffsets(element, start, end);
  if (!range) return;

  const highlight = new Highlight(range);
  CSS.highlights.set('insight-highlight', highlight);
}

function clearHighlight() {
  if (!supportsHighlightAPI || !CSS.highlights) return;
  CSS.highlights.delete('insight-highlight');
}

function getTextContent(element: HTMLElement): string {
  return element.innerText || '';
}

function getCursorOffset(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const targetNode = range.startContainer;
  const targetOffset = range.startOffset;

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  let currentOffset = 0;
  let node = walker.nextNode();
  let lastTextNode: Node | null = null;

  while (node) {
    if (node === targetNode) {
      return currentOffset + (node.nodeType === Node.TEXT_NODE ? targetOffset : 0);
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentNode === targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
        return currentOffset;
      }
      currentOffset += node.textContent?.length ?? 0;
      lastTextNode = node;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === 'BR') {
        currentOffset += 1;
      } else if (el.tagName === 'DIV' && lastTextNode) {
        currentOffset += 1;
      }
    }
    node = walker.nextNode();
  }

  return currentOffset;
}

function setCursorOffset(element: HTMLElement, offset: number) {
  const result = findTextNodeAndOffset(element, offset);
  if (!result) return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(result.node, result.offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export const ContentEditableEditor = forwardRef<ContentEditableEditorRef, ContentEditableEditorProps>(
  function ContentEditableEditor(
    {
      value,
      onChange,
      onBlur,
      placeholder = 'Start writing...',
      highlightRange,
      onHighlightDismiss,
      className,
      style,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastValueRef = useRef(value);
    const isInternalChange = useRef(false);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
    }));

    useEffect(() => {
      if (!editorRef.current) return;
      if (isInternalChange.current) {
        isInternalChange.current = false;
        return;
      }

      if (value !== lastValueRef.current) {
        const cursorOffset = getCursorOffset(editorRef.current);
        editorRef.current.innerText = value;
        lastValueRef.current = value;

        if (document.activeElement === editorRef.current) {
          const safeOffset = Math.min(cursorOffset, value.length);
          requestAnimationFrame(() => {
            if (editorRef.current) {
              setCursorOffset(editorRef.current, safeOffset);
            }
          });
        }
      }
    }, [value]);

    useEffect(() => {
      if (!editorRef.current) return;

      if (highlightRange) {
        if (editorRef.current.innerText !== value) {
          editorRef.current.innerText = value;
          lastValueRef.current = value;
        }

        applyHighlight(editorRef.current, highlightRange);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!editorRef.current) return;
            const range = createRangeForOffsets(editorRef.current, highlightRange.start, highlightRange.end);
            if (!range) return;

            const rect = range.getBoundingClientRect();
            const scrollParent = editorRef.current.closest('.entries-content') || editorRef.current;

            if (scrollParent instanceof HTMLElement) {
              const targetScroll = rect.top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop - 100;
              scrollParent.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
            }
          });
        });
      } else {
        clearHighlight();
      }
    }, [highlightRange, value]);

    useEffect(() => {
      if (!highlightRange || !onHighlightDismiss) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onHighlightDismiss();
        }
      };

      const handleClickOutside = (_e: MouseEvent) => {
        if (!editorRef.current) return;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const selectionRange = selection.getRangeAt(0);
          if (selectionRange.collapsed) {
            const clickOffset = getCursorOffset(editorRef.current);
            if (clickOffset < highlightRange.start || clickOffset > highlightRange.end) {
              onHighlightDismiss();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('click', handleClickOutside);
      };
    }, [highlightRange, onHighlightDismiss]);

    const handleInput = useCallback(() => {
      if (!editorRef.current) return;

      let newValue = getTextContent(editorRef.current);

      if (editorRef.current.innerHTML === '<br>' || editorRef.current.innerHTML === '<div><br></div>') {
        editorRef.current.innerHTML = '';
        newValue = '';
      }

      isInternalChange.current = true;
      lastValueRef.current = newValue;
      onChange(newValue);
    }, [onChange]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    }, []);

    const editorStyle: CSSProperties = {
      outline: 'none',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      ...style,
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={className}
        style={editorStyle}
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={onBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
    );
  }
);
