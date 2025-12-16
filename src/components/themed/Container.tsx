import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  padding?: keyof typeof import('../../theme/tokens').lightTheme.spacing;
  style?: CSSProperties;
}

export default function Container({
  children,
  className = '',
  variant = 'primary',
  padding = 'md',
  style,
}: ContainerProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    backgroundColor: theme.colors.background[variant],
    padding: theme.spacing[padding],
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
}
