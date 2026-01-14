import { IoChevronForward } from 'react-icons/io5';
import type { TimeGroupedPerson, RelationshipSentiment } from '../../types/analytics';
import { parseLocalDate } from '../../utils/date';
import '../../styles/insights.css';

function getSentimentColor(sentiment: RelationshipSentiment): string {
  if (sentiment === 'positive') return 'var(--status-success)';
  if (sentiment === 'negative' || sentiment === 'tense') return 'var(--status-error)';
  if (sentiment === 'mixed') return 'var(--status-warning)';
  return 'var(--text-muted)';
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
  const sentimentColor = getSentimentColor(person.sentiment);

  return (
    <div onClick={onClick} className="insight-card insight-card--person">
      <div className="insight-card__sentiment-indicator" style={{ backgroundColor: sentimentColor }} />
      <div className="insight-card__header insight-card__header--person">
        <div>
          <span className="insight-card__title insight-card__title--person">{person.name}</span>
          {person.relationship && (
            <span className="insight-card__relationship">({person.relationship})</span>
          )}
        </div>
        <IoChevronForward size={14} className="insight-card__chevron" />
      </div>
      <div className="insight-card__meta-row insight-card__meta-row--person">
        <span className="insight-card__date insight-card__date--person">
          {formatShortDate(person.entryDate)}
        </span>
        <div
          className="insight-card__sentiment-badge"
          style={{
            backgroundColor: `color-mix(in srgb, ${sentimentColor} 20%, transparent)`,
            color: sentimentColor,
          }}
        >
          {person.sentiment}
        </div>
      </div>
      {person.context && <div className="insight-card__context">{person.context}</div>}
    </div>
  );
}
