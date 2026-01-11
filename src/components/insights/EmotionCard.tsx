import { IoChevronForward } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import type { TimeGroupedInsight } from '../../types/analytics';
import { parseLocalDate } from '../../utils/date';

function getSentimentColor(sentiment: string, theme: ReturnType<typeof useTheme>['theme']): string {
  if (sentiment === 'positive') return theme.colors.status.success;
  if (sentiment === 'negative') return theme.colors.status.error;
  return theme.colors.text.muted;
}

function getIntensityColor(intensity: number, theme: ReturnType<typeof useTheme>['theme']): string {
  if (intensity <= 3) return theme.colors.status.success;
  if (intensity <= 6) return theme.colors.status.warning;
  return theme.colors.status.error;
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
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      className="insight-card"
      style={{
        padding: '16px',
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
          backgroundColor: getSentimentColor(insight.sentiment, theme),
          borderRadius: '10px 0 0 10px',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
          {insight.emotion}
        </span>
        <IoChevronForward size={16} color={theme.colors.text.muted} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: theme.colors.text.muted }}>
            {formatShortDate(insight.entryDate)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: 10 }, (_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    backgroundColor: idx < insight.intensity
                      ? getIntensityColor(insight.intensity, theme)
                      : theme.colors.background.primary,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: getIntensityColor(insight.intensity, theme) }}>
              {insight.intensity}
            </span>
          </div>
        </div>
        {insight.trigger && (
          <div
            style={{
              fontSize: '0.875rem',
              color: theme.colors.text.secondary,
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              flex: 1,
            }}
          >
            {insight.trigger}
          </div>
        )}
      </div>
    </div>
  );
}
