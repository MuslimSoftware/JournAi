import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { Text, Card, Spinner } from '../themed';
import TodoList from './TodoList';
import StickyNote from './StickyNote';
import { createEntry } from '../../services/entries';
import type { DayData, Todo, StickyNote as StickyNoteType } from '../../types/todo';

interface DayDetailProps {
  dayData: DayData | null;
  isLoading: boolean;
  stickyNote: StickyNoteType | null;
  onCreateTodo: (content: string, scheduledTime?: string) => Promise<Todo | null>;
  onUpdateTodo: (id: string, updates: { content?: string; scheduledTime?: string | null; completed?: boolean }) => Promise<Todo | null>;
  onDeleteTodo: (id: string) => Promise<boolean>;
  onReorderTodos: (todoIds: string[], reorderedTodos: Todo[]) => Promise<void>;
  onUpdateStickyNote: (id: string, content: string) => Promise<StickyNoteType | null>;
}

export default function DayDetail({
  dayData,
  isLoading,
  stickyNote,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onReorderTodos,
  onUpdateStickyNote,
}: DayDetailProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="day-detail-loading">
        <Spinner size="md" />
      </div>
    );
  }

  if (!dayData) {
    return (
      <div className="day-detail-empty">
        <Text variant="muted">Select a day to view details</Text>
      </div>
    );
  }

  return (
    <div className="day-detail">
      <div className="day-detail-section">
        <div className="day-detail-section-header">
          <span className="section-indicator entry-indicator" />
          <Text as="h4" variant="secondary">Journal Entry</Text>
        </div>
        {dayData.hasEntry ? (
          <Card
            padding="md"
            className="day-detail-entry-card"
            onClick={() => navigate('/entries')}
          >
            <Text variant="secondary" className="day-detail-entry-preview">
              {dayData.entryPreview}
            </Text>
          </Card>
        ) : (
          <button
            className="entry-add-button"
            onClick={async () => {
              await createEntry(dayData.date);
              navigate('/entries');
            }}
          >
            <FiPlus size={16} />
            <span>Add entry</span>
          </button>
        )}
      </div>

      <TodoList
        todos={dayData.todos}
        onCreateTodo={onCreateTodo}
        onUpdateTodo={onUpdateTodo}
        onDeleteTodo={onDeleteTodo}
        onReorderTodos={onReorderTodos}
      />

      <div className="sticky-note-section">
        <div className="day-detail-section-header">
          <span className="section-indicator sticky-note-indicator" />
          <Text as="h4" variant="secondary">Sticky Note</Text>
        </div>
        {stickyNote && (
          <StickyNote
            id={stickyNote.id}
            content={stickyNote.content}
            onUpdate={onUpdateStickyNote}
          />
        )}
      </div>
    </div>
  );
}
