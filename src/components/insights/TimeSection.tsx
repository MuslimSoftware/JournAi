import type { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../themed';

interface TimeSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

export default function TimeSection({ title, count, children }: TimeSectionProps) {
  const { theme } = useTheme();

  return (
    <div className="time-section">
      <div className="time-section-header">
        <Text
          className="time-section-title"
          style={{
            color: theme.colors.text.muted,
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </Text>
        <Text
          className="time-section-count"
          variant="muted"
          style={{ fontSize: '0.75rem' }}
        >
          {count} {count === 1 ? 'item' : 'items'}
        </Text>
      </div>
      {children}
    </div>
  );
}
