import { useState, useRef, useCallback, useEffect } from 'react';
import { MdDragIndicator } from 'react-icons/md';
import TodoItem, { TodoItemHandle } from './TodoItem';
import SectionHeader from './SectionHeader';
import AddItemButton from './AddItemButton';
import { DRAG_THRESHOLD_PX } from './constants';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { hapticImpact } from '../../hooks/useHaptics';
import type { Todo } from '../../types/todo';

interface TodoListProps {
  todos: Todo[];
  onCreateTodo: (content: string) => Promise<Todo | null>;
  onUpdateTodo: (id: string, updates: { content?: string; completed?: boolean }) => Promise<Todo | null>;
  onDeleteTodo: (id: string) => Promise<boolean>;
  onReorderTodos: (todoIds: string[], reorderedTodos: Todo[]) => Promise<void>;
}

interface DragState {
  draggedIndex: number;
  targetIndex: number;
  startY: number;
  currentY: number;
  itemHeight: number;
  isDropping: boolean;
  isDragging: boolean;
  itemCenters: number[];
}

export default function TodoList({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo, onReorderTodos }: TodoListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const todoItemRefs = useRef<Map<string, TodoItemHandle>>(new Map());
  const isMobile = useIsMobile();
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTouchRef = useRef<{ index: number; startY: number; startX: number; pointerId: number; wasDrag: boolean; didMove: boolean } | null>(null);

  const handleAddClick = () => {
    setIsAdding(true);
  };

  const handleNewTodoSave = async (content: string) => {
    if (content.trim()) {
      await onCreateTodo(content.trim());
    }
    setIsAdding(false);
  };

  const handleNewTodoCancel = () => {
    setIsAdding(false);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const wrapper = target.closest('.todo-item-wrapper') as HTMLElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    wrapper.setPointerCapture(e.pointerId);

    const itemCenters: number[] = [];
    const slots = listRef.current?.querySelectorAll('.todo-item-slot');
    slots?.forEach((slot) => {
      const slotRect = slot.getBoundingClientRect();
      itemCenters.push(slotRect.top + slotRect.height / 2);
    });

    setDragState({
      draggedIndex: index,
      targetIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
      itemHeight: rect.height + 4,
      isDropping: false,
      isDragging: false,
      itemCenters,
    });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState || dragState.isDropping) return;

    const deltaY = e.clientY - dragState.startY;

    if (!dragState.isDragging && Math.abs(deltaY) < DRAG_THRESHOLD_PX) {
      return;
    }

    const draggedItemCenter = e.clientY;
    let newTargetIndex = dragState.draggedIndex;
    const sensitivityOffset = dragState.itemHeight * 0.3;

    for (let i = 0; i < dragState.itemCenters.length; i++) {
      if (i === dragState.draggedIndex) continue;

      const center = dragState.itemCenters[i];
      if (i < dragState.draggedIndex) {
        if (draggedItemCenter < center + sensitivityOffset) {
          newTargetIndex = i;
          break;
        }
      } else {
        if (draggedItemCenter > center - sensitivityOffset) {
          newTargetIndex = i;
        }
      }
    }

    setDragState(prev => prev ? {
      ...prev,
      currentY: e.clientY,
      targetIndex: newTargetIndex,
      isDragging: true,
    } : null);
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    if (!dragState || dragState.isDropping) return;

    if (!dragState.isDragging) {
      setDragState(null);
      return;
    }

    const { draggedIndex, targetIndex } = dragState;
    const draggedTodoId = todos[draggedIndex]?.id;

    if (draggedIndex !== targetIndex) {
      setDragState(prev => prev ? { ...prev, isDropping: true } : null);
      setRecentlyDroppedId(draggedTodoId);

      setTimeout(() => {
        const reordered = [...todos];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, moved);

        setDragState(null);
        onReorderTodos(reordered.map(t => t.id), reordered);
        setTimeout(() => setRecentlyDroppedId(null), 150);
      }, 100);
    } else {
      setDragState(null);
      setRecentlyDroppedId(draggedTodoId);
      setTimeout(() => setRecentlyDroppedId(null), 150);
    }
  }, [dragState, todos, onReorderTodos]);

  const getItemStyle = (index: number): React.CSSProperties => {
    if (!dragState || !dragState.isDragging) return {};

    const { draggedIndex, targetIndex, currentY, startY, itemHeight, isDropping } = dragState;

    if (index === draggedIndex) {
      if (isDropping) {
        const dropOffset = (targetIndex - draggedIndex) * itemHeight;
        return {
          transform: `translateY(${dropOffset}px) scale(1)`,
          zIndex: 9999,
          position: 'relative',
          transition: 'transform 100ms cubic-bezier(0.2, 0, 0, 1), box-shadow 100ms ease-out',
        };
      }
      const rawOffset = currentY - startY;
      const minOffset = -draggedIndex * itemHeight;
      const maxOffset = (todos.length - 1 - draggedIndex) * itemHeight;
      const clampedOffset = Math.max(minOffset, Math.min(maxOffset, rawOffset));
      return {
        transform: `translateY(${clampedOffset}px) scale(1.02)`,
        zIndex: 9999,
        position: 'relative',
      };
    }

    const baseTransition = 'transform 100ms cubic-bezier(0.25, 0.1, 0.25, 1)';

    if (draggedIndex < targetIndex) {
      if (index > draggedIndex && index <= targetIndex) {
        return {
          transform: `translateY(-${itemHeight}px)`,
          transition: baseTransition,
        };
      }
    } else if (draggedIndex > targetIndex) {
      if (index >= targetIndex && index < draggedIndex) {
        return {
          transform: `translateY(${itemHeight}px)`,
          transition: baseTransition,
        };
      }
    }

    return { transition: baseTransition };
  };

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const initiateMobileDrag = useCallback((index: number, clientY: number) => {
    const wrapper = wrapperRefs.current.get(todos[index]?.id);
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const itemCenters: number[] = [];
    const slots = listRef.current?.querySelectorAll('.todo-item-slot');
    slots?.forEach((slot) => {
      const slotRect = slot.getBoundingClientRect();
      itemCenters.push(slotRect.top + slotRect.height / 2);
    });

    hapticImpact('medium');

    if (longPressTouchRef.current) {
      longPressTouchRef.current.wasDrag = true;
    }

    setDragState({
      draggedIndex: index,
      targetIndex: index,
      startY: clientY,
      currentY: clientY,
      itemHeight: rect.height + 4,
      isDropping: false,
      isDragging: true,
      itemCenters,
    });
  }, [todos]);

  const handleMobileTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (!isMobile) return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('.todo-checkbox-wrapper')) {
      return;
    }

    if (target.tagName === 'TEXTAREA') {
      e.preventDefault();
    }

    const touch = e.touches[0];
    longPressTouchRef.current = {
      index,
      startY: touch.clientY,
      startX: touch.clientX,
      pointerId: touch.identifier,
      wasDrag: false,
      didMove: false,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressTouchRef.current && longPressTouchRef.current.index === index) {
        initiateMobileDrag(index, longPressTouchRef.current.startY);
      }
    }, 400);
  }, [isMobile, initiateMobileDrag]);

  const handleMobileTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    const touch = Array.from(e.touches).find(
      t => t.identifier === longPressTouchRef.current?.pointerId
    );
    if (!touch) return;

    if (!dragState) {
      const startY = longPressTouchRef.current?.startY ?? 0;
      const startX = longPressTouchRef.current?.startX ?? 0;
      const deltaY = Math.abs(touch.clientY - startY);
      const deltaX = Math.abs(touch.clientX - startX);
      if (deltaY > 10 || deltaX > 10) {
        clearLongPressTimer();
        if (longPressTouchRef.current) {
          longPressTouchRef.current.didMove = true;
        }
      }
      return;
    }

    e.preventDefault();

    if (dragState.isDropping) return;

    const draggedItemCenter = touch.clientY;
    let newTargetIndex = dragState.draggedIndex;
    const sensitivityOffset = dragState.itemHeight * 0.3;

    for (let i = 0; i < dragState.itemCenters.length; i++) {
      if (i === dragState.draggedIndex) continue;

      const center = dragState.itemCenters[i];
      if (i < dragState.draggedIndex) {
        if (draggedItemCenter < center + sensitivityOffset) {
          newTargetIndex = i;
          break;
        }
      } else {
        if (draggedItemCenter > center - sensitivityOffset) {
          newTargetIndex = i;
        }
      }
    }

    setDragState(prev => prev ? {
      ...prev,
      currentY: touch.clientY,
      targetIndex: newTargetIndex,
    } : null);
  }, [isMobile, dragState, clearLongPressTimer]);

  const handleMobileTouchEnd = useCallback((index: number) => {
    if (!isMobile) return;

    const touchRef = longPressTouchRef.current;
    clearLongPressTimer();

    if (dragState) {
      if (dragState.isDropping) return;

      const { draggedIndex, targetIndex } = dragState;
      const draggedTodoId = todos[draggedIndex]?.id;

      if (draggedIndex !== targetIndex) {
        setDragState(prev => prev ? { ...prev, isDropping: true } : null);
        setRecentlyDroppedId(draggedTodoId);
        hapticImpact('light');

        setTimeout(() => {
          const reordered = [...todos];
          const [moved] = reordered.splice(draggedIndex, 1);
          reordered.splice(targetIndex, 0, moved);

          setDragState(null);
          onReorderTodos(reordered.map(t => t.id), reordered);
          setTimeout(() => setRecentlyDroppedId(null), 150);
        }, 100);
      } else {
        setDragState(null);
      }
    } else if (touchRef && !touchRef.wasDrag && !touchRef.didMove) {
      const todoId = todos[index]?.id;
      if (todoId) {
        const todoItemRef = todoItemRefs.current.get(todoId);
        todoItemRef?.focus();
      }
    }

    longPressTouchRef.current = null;
  }, [isMobile, dragState, todos, onReorderTodos, clearLongPressTimer]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !dragState?.isDragging) return;

    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isMobile, dragState?.isDragging]);

  return (
    <div className={`todo-list-container${isMobile ? ' mobile' : ''}`}>
      <SectionHeader title="Todos" indicatorType="todo" />
      <div className="todo-list" ref={listRef}>

        {todos.map((todo, index) => {
          const isDraggedItem = dragState?.draggedIndex === index;
          const isActivelyDragging = isDraggedItem && dragState?.isDragging;
          const isRecentlyDropped = todo.id === recentlyDroppedId;

          return (
            <div key={todo.id} className="todo-item-slot">
              <div
                ref={(el) => {
                  if (el) wrapperRefs.current.set(todo.id, el);
                  else wrapperRefs.current.delete(todo.id);
                }}
                className={`todo-item-wrapper ${isActivelyDragging ? 'dragging' : ''} ${isRecentlyDropped ? 'just-dropped' : ''}`}
                style={getItemStyle(index)}
                onPointerMove={!isMobile && isDraggedItem ? handlePointerMove : undefined}
                onPointerUp={!isMobile && isDraggedItem ? handlePointerUp : undefined}
                onPointerCancel={!isMobile && isDraggedItem ? handlePointerUp : undefined}
                onTouchStart={isMobile ? (e) => handleMobileTouchStart(e, index) : undefined}
                onTouchMove={isMobile ? handleMobileTouchMove : undefined}
                onTouchEnd={isMobile ? () => handleMobileTouchEnd(index) : undefined}
                onTouchCancel={isMobile ? () => { clearLongPressTimer(); longPressTouchRef.current = null; } : undefined}
              >
                {!isMobile && (
                  <div
                    className="todo-drag-handle"
                    onPointerDown={(e) => handlePointerDown(e, index)}
                  >
                    <MdDragIndicator size={16} />
                  </div>
                )}
                <TodoItem
                  ref={(handle) => {
                    if (handle) todoItemRefs.current.set(todo.id, handle);
                    else todoItemRefs.current.delete(todo.id);
                  }}
                  todo={todo}
                  onToggle={(id, completed) => onUpdateTodo(id, { completed })}
                  onDelete={onDeleteTodo}
                  onUpdate={(id, content) => onUpdateTodo(id, { content })}
                />
              </div>
            </div>
          );
        })}

        {isAdding && (
          <div className="todo-item-slot">
            <div className="todo-item-wrapper">
              {!isMobile && <div className="todo-drag-handle" />}
              <TodoItem
                isNew
                onSaveNew={handleNewTodoSave}
                onCancelNew={handleNewTodoCancel}
              />
            </div>
          </div>
        )}
      </div>

      {!isAdding && (
        <AddItemButton label="Add todo" onClick={handleAddClick} />
      )}
    </div>
  );
}
