import { IoChevronForward } from 'react-icons/io5';
import type { TimeGroupedInsight } from '../../types/analytics';
import { parseLocalDate } from '../../utils/date';
import '../../styles/insights.css';

function getSentimentColor(sentiment: string): string {
  if (sentiment === 'positive') return 'var(--status-success)';
  if (sentiment === 'negative') return 'var(--status-error)';
  return 'var(--text-muted)';
}

function getIntensityColor(intensity: number): string {
  if (intensity <= 3) return 'var(--status-success)';
  if (intensity <= 6) return 'var(--status-warning)';
  return 'var(--status-error)';
}

function formatShortDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface EmotionCardProps {
  insight: TimeGroupedInsight;
  onClick: () => void;
}

export default function EmotionCard({ insight, onClick }: EmotionCardProps) {
  return (
    <div onClick={onClick} className="insight-card">
      <div
        className="insight-card__sentiment-indicator"
        style={{ backgroundColor: getSentimentColor(insight.sentiment) }}
      />
      <div className="insight-card__header">
        <span className="insight-card__title">{insight.emotion}</span>
        <IoChevronForward size={16} className="insight-card__chevron" />
      </div>
      <div className="insight-card__content">
        <div className="insight-card__meta-row">
          <span className="insight-card__date">{formatShortDate(insight.entryDate)}</span>
          <div className="insight-card__intensity-wrapper">
            <div className="insight-card__intensity-bars">
              {Array.from({ length: 10 }, (_, idx) => {
                const fullBars = Math.floor(insight.intensity);
                const partialFill = insight.intensity % 1;
                const color = getIntensityColor(insight.intensity);

                let background: string | undefined;
                if (idx < fullBars) {
                  background = color;
                } else if (idx === fullBars && partialFill > 0) {
                  background = `linear-gradient(to right, ${color} ${partialFill * 100}%, var(--bg-primary) ${partialFill * 100}%)`;
                }

                return (
                  <div
                    key={idx}
                    className="insight-card__intensity-bar"
                    style={{ backgroundColor: idx < fullBars ? color : undefined, background }}
                  />
                );
              })}
            </div>
            <span className="insight-card__intensity-value" style={{ color: getIntensityColor(insight.intensity) }}>
              {insight.intensity}
            </span>
          </div>
        </div>
        {insight.trigger && <div className="insight-card__trigger">{insight.trigger}</div>}
      </div>
    </div>
  );
}
