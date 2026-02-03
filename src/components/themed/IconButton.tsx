import { CSSProperties, ReactNode, ButtonHTMLAttributes, useState, cloneElement, isValidElement } from 'react';
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
  disabled,
  ...props
}: IconButtonProps) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const sizeStyles = {
    sm: { padding: theme.spacing.sm, fontSize: '1rem' },
    md: { padding: theme.spacing.sm, fontSize: '1.25rem' },
    lg: { padding: theme.spacing.md, fontSize: '1.5rem' },
  };

  const getVariantStyles = (): CSSProperties => {
    const baseStyles: Record<string, CSSProperties> = {
      primary: {
        backgroundColor: theme.colors.text.primary,
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

    const hoverStyles: Record<string, CSSProperties> = {
      primary: {
        backgroundColor: theme.colors.text.secondary,
        color: theme.colors.background.primary,
        border: 'none',
      },
      secondary: {
        backgroundColor: theme.colors.background.tertiary,
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border.primary}`,
      },
      ghost: {
        backgroundColor: theme.colors.background.subtle,
        color: theme.colors.text.primary,
        border: 'none',
      },
    };

    if (disabled) {
      return {
        ...baseStyles[variant],
        opacity: 0.5,
        cursor: 'not-allowed',
      };
    }

    return isHovered ? hoverStyles[variant] : baseStyles[variant];
  };

  const buttonStyle: CSSProperties = {
    ...sizeStyles[size],
    ...getVariantStyles(),
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease-out',
    minWidth: size === 'sm' ? '44px' : size === 'md' ? '48px' : '56px',
    minHeight: size === 'sm' ? '44px' : size === 'md' ? '48px' : '56px',
    ...style,
  };

  const iconElement = isValidElement(icon)
    ? cloneElement(icon, {
        className: icon.props.className
          ? `app-icon ${icon.props.className}`
          : 'app-icon',
      })
    : icon;

  return (
    <button
      style={buttonStyle}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {iconElement}
    </button>
  );
}
