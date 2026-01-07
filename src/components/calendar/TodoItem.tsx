import { useState } from 'react';
import { FiTrash2, FiClock } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { IconButton } from '../themed';
import type { Todo } from '../../types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateContent: (id: string, content: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdateContent }: TodoItemProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(todo.content);

  const handleBlur = () => {
    setIsEditing(false);
    if (editContent.trim() !== todo.content) {
      onUpdateContent(todo.id, editContent.trim());
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <button
        className="todo-checkbox"
        onClick={() => onToggle(todo.id, !todo.completed)}
        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
        style={{
          borderColor: theme.colors.text.secondary,
          backgroundColor: todo.completed ? theme.colors.text.muted : 'transparent',
        }}
      >
        {todo.completed && <span className="todo-checkmark">✓</span>}
      </button>
      <div className="todo-content">
        {isEditing ? (
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
            className="todo-edit-input"
          />
        ) : (
          <span
            className="todo-text"
            onClick={() => setIsEditing(true)}
            style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
          >
            {todo.content}
          </span>
        )}
        {todo.scheduledTime && (
          <span className="todo-time">
            <FiClock size={12} />
            {formatTime(todo.scheduledTime)}
          </span>
        )}
      </div>
      <IconButton
        icon={<FiTrash2 size={14} />}
        label="Delete todo"
        variant="ghost"
        size="sm"
        onClick={() => onDelete(todo.id)}
        className="todo-delete-button"
      />
    </div>
  );
}
