import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof import('../../theme/tokens').lightTheme.spacing;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  padding = 'lg',
  style,
  onClick,
}: CardProps) {
  const { theme } = useTheme();

  const cardStyle: CSSProperties = {
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: '8px',
    padding: theme.spacing[padding],
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <div className={className} style={cardStyle} onClick={onClick}>
      {children}
    </div>
  );
}
