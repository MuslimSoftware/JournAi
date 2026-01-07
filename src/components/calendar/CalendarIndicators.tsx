import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();

  const pendingTodos = todosCount ? todosCount.total - todosCount.completed : 0;
  const completedTodos = todosCount?.completed ?? 0;

  return (
    <div className="calendar-indicators">
      {hasEntry && (
        <span
          className="calendar-indicator entry-indicator"
          style={{ backgroundColor: theme.colors.text.accent }}
        />
      )}
      {hasStickyNote && (
        <span className="calendar-indicator sticky-note-indicator" />
      )}
      {completedTodos > 0 && (
        <span
          className="calendar-indicator todo-indicator filled"
          style={{ backgroundColor: theme.colors.text.muted }}
        />
      )}
      {pendingTodos > 0 && (
        <span
          className="calendar-indicator todo-indicator hollow"
          style={{ borderColor: theme.colors.text.secondary }}
        />
      )}
    </div>
  );
}
