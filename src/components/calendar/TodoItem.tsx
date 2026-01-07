import { useState, useRef, useEffect } from 'react';
import { FiTrash2 } from 'react-icons/fi';
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

export default function TodoItem(props: TodoItemProps) {
  const { isNew } = props;

  const [content, setContent] = useState(isNew ? '' : props.todo.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNew]);

  const handleSave = () => {
    if (isNew) {
      props.onSaveNew(content);
    } else if (content.trim() !== props.todo.content) {
      props.onUpdate(props.todo.id, content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      if (isNew) {
        props.onCancelNew();
      } else {
        setContent(props.todo.content);
        inputRef.current?.blur();
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

      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={isNew ? 'What needs to be done?' : ''}
        className="todo-input"
      />

      {!isNew && (
        <button
          className="todo-delete-button"
          onClick={() => props.onDelete(props.todo.id)}
          aria-label="Delete todo"
        >
          <FiTrash2 size={14} />
        </button>
      )}
    </div>
  );
}
