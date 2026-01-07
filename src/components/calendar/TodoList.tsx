import { useState } from 'react';
import { FiPlus, FiClock } from 'react-icons/fi';
import { Text } from '../themed';
import TodoItem from './TodoItem';
import type { Todo } from '../../types/todo';

interface TodoListProps {
  todos: Todo[];
  onCreateTodo: (content: string, scheduledTime?: string) => Promise<Todo | null>;
  onUpdateTodo: (id: string, updates: { content?: string; completed?: boolean }) => Promise<Todo | null>;
  onDeleteTodo: (id: string) => Promise<boolean>;
}

export default function TodoList({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo }: TodoListProps) {
  const [newTodoContent, setNewTodoContent] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoContent.trim()) return;

    await onCreateTodo(newTodoContent.trim(), newTodoTime || undefined);
    setNewTodoContent('');
    setNewTodoTime('');
    setShowTimeInput(false);
  };

  return (
    <div className="todo-list-container">
      <div className="day-detail-section-header">
        <span className="section-indicator todo-indicator" />
        <Text as="h4" variant="secondary" className="todo-list-header">Todos</Text>
      </div>

      <form onSubmit={handleSubmit} className="todo-add-form">
        <input
          type="text"
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
          placeholder="Add a todo..."
          className="todo-add-input"
        />
        <div className="todo-add-actions">
          <button
            type="button"
            onClick={() => setShowTimeInput(!showTimeInput)}
            className="todo-time-toggle"
            aria-label="Set time"
          >
            <FiClock size={16} />
          </button>
          <button type="submit" className="todo-add-button" disabled={!newTodoContent.trim()}>
            <FiPlus size={16} />
          </button>
        </div>
      </form>

      {showTimeInput && (
        <input
          type="time"
          value={newTodoTime}
          onChange={(e) => setNewTodoTime(e.target.value)}
          className="todo-time-input"
        />
      )}

      <div className="todo-list">
        {todos.length === 0 ? (
          <Text variant="muted" className="todo-empty">No todos for this day</Text>
        ) : (
          todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={(id, completed) => onUpdateTodo(id, { completed })}
              onDelete={onDeleteTodo}
              onUpdateContent={(id, content) => onUpdateTodo(id, { content })}
            />
          ))
        )}
      </div>
    </div>
  );
}
