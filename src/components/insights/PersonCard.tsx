import { IoChevronForward } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import type { TimeGroupedPerson, RelationshipSentiment } from '../../types/analytics';
import { parseLocalDate } from '../../utils/date';

function getSentimentColor(sentiment: RelationshipSentiment, theme: ReturnType<typeof useTheme>['theme']): string {
  if (sentiment === 'positive') return theme.colors.status.success;
  if (sentiment === 'negative' || sentiment === 'tense') return theme.colors.status.error;
  if (sentiment === 'mixed') return theme.colors.status.warning;
  return theme.colors.text.muted;
}

function formatShortDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PersonCardProps {
  person: TimeGroupedPerson;
  onClick: () => void;
}

export default function PersonCard({ person, onClick }: PersonCardProps) {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      className="insight-card"
      style={{
        padding: '14px',
        borderRadius: '10px',
        backgroundColor: theme.colors.background.subtle,
        border: `1px solid ${theme.colors.border.secondary}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.subtle;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: getSentimentColor(person.sentiment, theme),
          borderRadius: '10px 0 0 10px',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9rem' }}>
            {person.name}
          </span>
          {person.relationship && (
            <span style={{ fontSize: '0.7rem', color: theme.colors.text.muted, marginLeft: '6px' }}>
              ({person.relationship})
            </span>
          )}
        </div>
        <IoChevronForward size={14} color={theme.colors.text.muted} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.7rem', color: theme.colors.text.muted }}>
          {formatShortDate(person.entryDate)}
        </span>
        <div
          style={{
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: `${getSentimentColor(person.sentiment, theme)}20`,
            color: getSentimentColor(person.sentiment, theme),
            textTransform: 'capitalize',
            fontWeight: 500,
          }}
        >
          {person.sentiment}
        </div>
      </div>
      {person.context && (
        <div
          style={{
            fontSize: '0.75rem',
            color: theme.colors.text.muted,
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            flex: 1,
          }}
        >
          {person.context}
        </div>
      )}
    </div>
  );
}
