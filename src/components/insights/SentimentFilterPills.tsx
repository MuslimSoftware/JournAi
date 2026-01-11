import { useTheme } from '../../contexts/ThemeContext';
import type { SentimentFilter } from '../../types/analytics';

interface FilterCounts {
  all: number;
  positive: number;
  negative: number;
}

interface SentimentFilterPillsProps {
  activeFilter: SentimentFilter;
  onFilterChange: (filter: SentimentFilter) => void;
  counts: FilterCounts;
}

export default function SentimentFilterPills({
  activeFilter,
  onFilterChange,
  counts,
}: SentimentFilterPillsProps) {
  const { theme } = useTheme();

  const filters: { id: SentimentFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'positive', label: 'Positive' },
    { id: 'negative', label: 'Negative' },
  ];

  return (
    <div className="sentiment-filter-pills">
      {filters.map(filter => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id];

        return (
          <button
            key={filter.id}
            className={`sentiment-pill ${isActive ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
            style={{
              backgroundColor: isActive ? theme.colors.text.primary : theme.colors.background.secondary,
              color: isActive ? theme.colors.background.primary : theme.colors.text.secondary,
              border: `1px solid ${isActive ? theme.colors.text.primary : theme.colors.border.primary}`,
            }}
          >
            {filter.label}
            <span
              className="sentiment-pill-count"
              style={{
                opacity: isActive ? 0.8 : 0.6,
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
