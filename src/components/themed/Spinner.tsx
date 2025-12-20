import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const { theme } = useTheme();

  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  const spinnerStyle: CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    border: `2px solid ${theme.colors.border.primary}`,
    borderTopColor: theme.colors.text.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className={className} style={spinnerStyle} role="status" aria-label="Loading" />
    </>
  );
}
