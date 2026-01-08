import { useState, useRef, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { Text } from '../themed';
import TodoItem from './TodoItem';
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
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const DRAG_THRESHOLD = 8;

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

    if (!dragState.isDragging && Math.abs(deltaY) < DRAG_THRESHOLD) {
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
      return {
        transform: `translateY(${currentY - startY}px) scale(1.02)`,
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


  return (
    <div className="todo-list-container">
      <div className="day-detail-section-header">
        <span className="section-indicator todo-indicator" />
        <Text as="h4" variant="secondary" className="todo-list-header">Todos</Text>
      </div>

      <div className="todo-list" ref={listRef}>

        {todos.map((todo, index) => {
          const isDraggedItem = dragState?.draggedIndex === index;
          const isActivelyDragging = isDraggedItem && dragState?.isDragging;
          const isRecentlyDropped = todo.id === recentlyDroppedId;

          return (
            <div key={todo.id} className="todo-item-slot">
              <div
                ref={(el) => {
                  if (el) itemRefs.current.set(todo.id, el);
                  else itemRefs.current.delete(todo.id);
                }}
                className={`todo-item-wrapper ${isActivelyDragging ? 'dragging' : ''} ${isRecentlyDropped ? 'just-dropped' : ''}`}
                style={getItemStyle(index)}
                onPointerMove={isDraggedItem ? handlePointerMove : undefined}
                onPointerUp={isDraggedItem ? handlePointerUp : undefined}
                onPointerCancel={isDraggedItem ? handlePointerUp : undefined}
              >
                <div
                  className="todo-drag-handle"
                  onPointerDown={(e) => handlePointerDown(e, index)}
                >
                  <MdDragIndicator size={16} />
                </div>
                <TodoItem
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
          <TodoItem
            isNew
            onSaveNew={handleNewTodoSave}
            onCancelNew={handleNewTodoCancel}
          />
        )}
      </div>

      {!isAdding && (
        <button className="todo-add-button" onClick={handleAddClick}>
          <FiPlus size={16} />
          <span>Add todo</span>
        </button>
      )}
    </div>
  );
}
