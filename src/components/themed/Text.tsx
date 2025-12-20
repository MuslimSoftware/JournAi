import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface TextProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  variant?: 'primary' | 'secondary' | 'muted' | 'accent';
  className?: string;
  style?: CSSProperties;
}

export default function Text({
  children,
  as: Component = 'p',
  variant = 'primary',
  className = '',
  style,
}: TextProps) {
  const { theme } = useTheme();

  const textStyle: CSSProperties = {
    color: theme.colors.text[variant],
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize[Component],
    fontWeight: theme.typography.fontWeight[Component],
    lineHeight: theme.typography.lineHeight[Component],
    ...style,
  };

  return (
    <Component className={className} style={textStyle}>
      {children}
    </Component>
  );
}
