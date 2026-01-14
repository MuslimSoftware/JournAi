import { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme } from '../../theme/tokens';
import '../../styles/skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  className = '',
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const isLight = theme === lightTheme;

  const shimmerGradient = isLight
    ? 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.06) 50%, transparent 100%)'
    : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)';

  const skeletonStyle: CSSProperties = {
    width,
    height,
    borderRadius,
    backgroundColor: theme.colors.background.secondary,
    '--skeleton-shimmer-gradient': shimmerGradient,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={skeletonStyle}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  lineHeight?: string | number;
  gap?: string | number;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = '14px',
  gap = '8px',
}: SkeletonTextProps) {
  return (
    <div className="skeleton-text" style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  size?: string | number;
}

export function SkeletonCircle({ size = '40px' }: SkeletonCircleProps) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}

interface SkeletonListItemProps {
  hasAvatar?: boolean;
  lines?: number;
}

export function SkeletonListItem({ hasAvatar = false, lines = 2 }: SkeletonListItemProps) {
  const { theme } = useTheme();

  return (
    <div className="skeleton-list-item" style={{ gap: theme.spacing.md }}>
      {hasAvatar && <SkeletonCircle size="40px" />}
      <div className="skeleton-list-item__content">
        <SkeletonText lines={lines} lastLineWidth="40%" />
      </div>
    </div>
  );
}

interface SkeletonEntryItemProps {
  count?: number;
}

export function SkeletonEntryList({ count = 5 }: SkeletonEntryItemProps) {
  return (
    <div>
      <div className="skeleton-entry-list__header">
        <Skeleton width="80px" height="11px" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-entry-item">
          <Skeleton width="60px" height="12px" />
          <Skeleton width="100%" height="16px" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonChatMessageProps {
  isUser?: boolean;
}

export function SkeletonChatMessage({ isUser = false }: SkeletonChatMessageProps) {
  const { theme } = useTheme();

  return (
    <div className={`skeleton-chat-message ${isUser ? 'skeleton-chat-message--user' : 'skeleton-chat-message--assistant'}`}>
      <div
        className="skeleton-chat-bubble"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        <SkeletonText
          lines={isUser ? 1 : 2}
          lastLineWidth={isUser ? '100%' : '70%'}
          lineHeight="14px"
        />
      </div>
    </div>
  );
}

export function SkeletonChatList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-chat-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChatMessage key={i} isUser={i % 2 === 0} />
      ))}
    </div>
  );
}

interface SkeletonGroupProps {
  children: ReactNode;
  isLoading: boolean;
}

export function SkeletonGroup({ children, isLoading }: SkeletonGroupProps) {
  if (isLoading) {
    return <>{children}</>;
  }
  return null;
}

export function SkeletonCalendarGrid() {
  return (
    <div className="skeleton-calendar">
      <div className="skeleton-calendar__header">
        <Skeleton width="120px" height="24px" />
        <div className="skeleton-calendar__nav">
          <Skeleton width="32px" height="32px" borderRadius="8px" />
          <Skeleton width="32px" height="32px" borderRadius="8px" />
        </div>
      </div>
      <div className="skeleton-calendar__grid">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`header-${i}`} className="skeleton-calendar__day-header">
            <Skeleton width="24px" height="12px" style={{ margin: '0 auto' }} />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={`day-${i}`} className="skeleton-calendar__day">
            <Skeleton width="32px" height="32px" borderRadius="50%" />
          </div>
        ))}
      </div>
    </div>
  );
}
