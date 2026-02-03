import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { TrashButton } from '../themed';
import type { Todo } from '../../types/todo';

interface TodoItemPropsBase {
  isNew?: boolean;
}

interface ExistingTodoProps extends TodoItemPropsBase {
  isNew?: false;
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onSaveNew?: never;
  onCancelNew?: never;
}

interface NewTodoProps extends TodoItemPropsBase {
  isNew: true;
  todo?: never;
  onToggle?: never;
  onDelete?: never;
  onUpdate?: never;
  onSaveNew: (content: string) => void;
  onCancelNew: () => void;
}

type TodoItemProps = ExistingTodoProps | NewTodoProps;

export interface TodoItemHandle {
  focus: () => void;
}

const TodoItem = forwardRef<TodoItemHandle, TodoItemProps>(function TodoItem(props, ref) {
  const { isNew } = props;

  const [content, setContent] = useState(isNew ? '' : props.todo.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    },
  }), []);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (isNew && textareaRef.current) {
      textareaRef.current.focus();
    }
    autoResize();
  }, [isNew, autoResize]);

  useEffect(() => {
    autoResize();
  }, [content, autoResize]);

  const handleSave = () => {
    if (isNew) {
      props.onSaveNew(content);
    } else if (content.trim() !== props.todo.content) {
      props.onUpdate(props.todo.id, content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      if (isNew) {
        props.onCancelNew();
      } else {
        setContent(props.todo.content);
        textareaRef.current?.blur();
      }
    }
  };

  const completed = !isNew && props.todo.completed;

  return (
    <div className={`todo-item ${completed ? 'completed' : ''} ${isNew ? 'todo-item-new' : ''}`}>
      <label className="todo-checkbox-wrapper">
        <input
          type="checkbox"
          checked={completed}
          onChange={() => !isNew && props.onToggle(props.todo.id, !props.todo.completed)}
          disabled={isNew}
          className="todo-checkbox-input"
        />
        <span className={`todo-checkbox ${isNew ? 'disabled' : ''}`}>
          <svg className="todo-checkbox-icon" viewBox="0 0 12 10">
            <polyline points="1.5 6 4.5 9 10.5 1" />
          </svg>
        </span>
      </label>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={isNew ? 'What needs to be done?' : ''}
        className="todo-input"
        rows={1}
      />

      {!isNew && (
        <TrashButton
          className="todo-delete-button"
          label="Delete todo"
          size="sm"
          iconSize={14}
          onClick={() => props.onDelete(props.todo.id)}
        />
      )}
    </div>
  );
});

export default TodoItem;
