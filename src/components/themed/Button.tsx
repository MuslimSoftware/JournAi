import { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();

  const sizeStyles = {
    sm: { padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '0.875rem', gap: theme.spacing.xs },
    md: { padding: `${theme.spacing.xs} ${theme.spacing.md}`, fontSize: '1rem', gap: theme.spacing.sm },
    lg: { padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '1.125rem', gap: theme.spacing.sm },
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
    fontWeight: 500,
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    ...style,
  };

  return (
    <button style={buttonStyle} {...props}>
      {icon && iconPosition === 'left' && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span style={{ display: 'flex' }}>{icon}</span>}
    </button>
  );
}
