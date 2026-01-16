import { CSSProperties, ReactNode, ButtonHTMLAttributes, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '0.8125rem', gap: '6px', minHeight: '28px' },
    md: { padding: '8px 16px', fontSize: '0.875rem', gap: '8px', minHeight: '32px' },
    lg: { padding: '10px 20px', fontSize: '0.9375rem', gap: '8px', minHeight: '40px' },
  };

  const getVariantStyle = (variant: string): CSSProperties => {
    const isHovering = !props.disabled && (isHovered || isActive);

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isHovering ? theme.colors.button.primaryHover : theme.colors.button.primary,
          color: theme.colors.background.primary,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: isHovering ? theme.colors.button.secondaryHover : theme.colors.button.secondary,
          color: theme.colors.text.primary,
          border: `1px solid ${theme.colors.border.primary}`,
        };
      case 'ghost':
        return {
          backgroundColor: isHovering ? theme.colors.button.ghostHover : theme.colors.button.ghost,
          color: theme.colors.text.secondary,
          border: 'none',
        };
      case 'danger':
        return {
          backgroundColor: isHovering ? theme.colors.danger.backgroundHover : theme.colors.danger.background,
          color: theme.colors.danger.text,
          border: `1px solid ${isHovering ? theme.colors.danger.backgroundHover : theme.colors.danger.background}`,
        };
      default:
        return {};
    }
  };

  const variantStyles = getVariantStyle(variant);

  const buttonStyle: CSSProperties = {
    ...sizeStyles[size],
    ...variantStyles,
    borderRadius: '8px',
    fontWeight: 500,
    fontFamily: theme.typography.fontFamily,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    opacity: props.disabled ? 0.5 : 1,
    ...style,
  };

  return (
    <button
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...props}
    >
      {icon && iconPosition === 'left' && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span style={{ display: 'flex' }}>{icon}</span>}
    </button>
  );
}
