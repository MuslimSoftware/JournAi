import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Text } from '../themed';
import TodoItem from './TodoItem';
import type { Todo } from '../../types/todo';

interface TodoListProps {
  todos: Todo[];
  onCreateTodo: (content: string) => Promise<Todo | null>;
  onUpdateTodo: (id: string, updates: { content?: string; completed?: boolean }) => Promise<Todo | null>;
  onDeleteTodo: (id: string) => Promise<boolean>;
}

export default function TodoList({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo }: TodoListProps) {
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div className="todo-list-container">
      <div className="day-detail-section-header">
        <span className="section-indicator todo-indicator" />
        <Text as="h4" variant="secondary" className="todo-list-header">Todos</Text>
      </div>

      <div className="todo-list">
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={(id, completed) => onUpdateTodo(id, { completed })}
            onDelete={onDeleteTodo}
            onUpdate={(id, content) => onUpdateTodo(id, { content })}
          />
        ))}

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
