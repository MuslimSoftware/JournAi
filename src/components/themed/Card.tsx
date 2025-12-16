import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof import('../../theme/tokens').lightTheme.spacing;
  style?: CSSProperties;
}

export default function Card({
  children,
  className = '',
  padding = 'lg',
  style,
}: CardProps) {
  const { theme } = useTheme();

  const cardStyle: CSSProperties = {
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: '8px',
    padding: theme.spacing[padding],
    ...style,
  };

  return (
    <div className={className} style={cardStyle}>
      {children}
    </div>
  );
}
