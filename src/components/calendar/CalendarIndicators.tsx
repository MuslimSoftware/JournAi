interface CalendarIndicatorsProps {
  hasEntry: boolean;
  hasStickyNote: boolean;
  todosCount?: { total: number; completed: number };
}

export default function CalendarIndicators({
  hasEntry,
  hasStickyNote,
  todosCount,
}: CalendarIndicatorsProps) {
  const completedTodos = todosCount?.completed ?? 0;
  const pendingTodos = todosCount ? todosCount.total - todosCount.completed : 0;
  const hasTodos = completedTodos > 0 || pendingTodos > 0;

  return (
    <div className="calendar-indicators-container">
      {(hasEntry || hasStickyNote) && (
        <div className="calendar-indicators">
          {hasEntry && (
            <span className="calendar-indicator entry-indicator" />
          )}
          {hasStickyNote && (
            <span className="calendar-indicator sticky-note-indicator" />
          )}
        </div>
      )}
      {hasTodos && (
        <div className="calendar-indicators">
          {Array.from({ length: completedTodos }).map((_, i) => (
            <span
              key={`completed-${i}`}
              className="calendar-indicator todo-indicator filled"
            />
          ))}
          {Array.from({ length: pendingTodos }).map((_, i) => (
            <span
              key={`pending-${i}`}
              className="calendar-indicator todo-indicator hollow"
            />
          ))}
        </div>
      )}
    </div>
  );
}
