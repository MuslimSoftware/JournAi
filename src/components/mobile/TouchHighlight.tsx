import { CSSProperties, ReactNode, useState, useCallback, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme } from '../../theme/tokens';

interface TouchHighlightProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  highlightColor?: string;
  activeOpacity?: number;
  scaleFactor?: number;
}

export default function TouchHighlight({
  children,
  onPress,
  disabled = false,
  style,
  className = '',
  highlightColor,
  activeOpacity = 0.7,
  scaleFactor = 0.98,
}: TouchHighlightProps) {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; size: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLight = theme === lightTheme;
  const defaultHighlight = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const highlight = highlightColor || defaultHighlight;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    setIsPressed(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;
      setRipple({ x, y, size });
    }

    pressTimer.current = setTimeout(() => {
      setRipple(null);
    }, 400);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }

    setTimeout(() => setRipple(null), 200);

    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
    setRipple(null);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  }, []);

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    cursor: disabled ? 'default' : 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    opacity: isPressed ? activeOpacity : 1,
    transform: isPressed ? `scale(${scaleFactor})` : 'scale(1)',
    transition: 'opacity 0.15s ease-out, transform 0.1s ease-out',
    ...style,
  };

  const rippleStyle: CSSProperties = ripple ? {
    position: 'absolute',
    left: ripple.x - ripple.size / 2,
    top: ripple.y - ripple.size / 2,
    width: ripple.size,
    height: ripple.size,
    borderRadius: '50%',
    backgroundColor: highlight,
    pointerEvents: 'none',
    transform: isPressed ? 'scale(1)' : 'scale(0)',
    opacity: isPressed ? 1 : 0,
    transition: 'transform 0.3s ease-out, opacity 0.2s ease-out',
  } : {};

  return (
    <div
      ref={containerRef}
      className={`touch-highlight ${className}`}
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={disabled ? undefined : onPress}
    >
      {ripple && <div style={rippleStyle} />}
      {children}
    </div>
  );
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 200,
  style,
  className = '',
}: FadeInProps) {
  const fadeStyle: CSSProperties = {
    animation: `fadeIn ${duration}ms ease-out ${delay}ms both`,
    ...style,
  };

  return (
    <div className={className} style={fadeStyle}>
      {children}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

interface ContentTransitionProps {
  children: ReactNode;
  isLoading: boolean;
  skeleton: ReactNode;
  delay?: number;
}

export function ContentTransition({
  children,
  isLoading,
  skeleton,
  delay = 0,
}: ContentTransitionProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }

  return <FadeIn delay={delay}>{children}</FadeIn>;
}
