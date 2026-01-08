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
    sm: { padding: '6px 12px', fontSize: '0.8125rem', gap: '6px', minHeight: '28px' },
    md: { padding: '8px 16px', fontSize: '0.875rem', gap: '8px', minHeight: '32px' },
    lg: { padding: '10px 20px', fontSize: '0.9375rem', gap: '8px', minHeight: '40px' },
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
