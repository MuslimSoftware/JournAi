import { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function IconButton({
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  style,
  ...props
}: IconButtonProps) {
  const { theme } = useTheme();

  const sizeStyles = {
    sm: { padding: theme.spacing.xs, fontSize: '1rem' },
    md: { padding: theme.spacing.sm, fontSize: '1.25rem' },
    lg: { padding: theme.spacing.md, fontSize: '1.5rem' },
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      backgroundColor: theme.colors.text.accent,
      color: theme.colors.background.primary,
      border: 'none',
    },
    secondary: {
      backgroundColor: theme.colors.interactive.default,
      color: theme.colors.text.primary,
      border: `1px solid ${theme.colors.border.primary}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
      border: 'none',
    },
  };

  const buttonStyle: CSSProperties = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    border: variant === 'secondary' ? `1px solid ${theme.colors.border.primary}` : 'none',
    minWidth: size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px',
    minHeight: size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px',
    ...style,
  };

  return (
    <button style={buttonStyle} aria-label={label} title={label} {...props}>
      {icon}
    </button>
  );
}
