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
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
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
    <div
      style={{
        display: 'flex',
        gap: theme.spacing.md,
        padding: '14px 16px',
        alignItems: 'flex-start',
      }}
    >
      {hasAvatar && <SkeletonCircle size="40px" />}
      <div style={{ flex: 1 }}>
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
      <div style={{ padding: '24px 16px 8px' }}>
        <Skeleton width="80px" height="11px" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderRadius: '8px',
            margin: '0 8px',
          }}
        >
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
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        padding: '8px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '12px 16px',
          backgroundColor: theme.colors.background.secondary,
          borderRadius: '16px',
        }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
    <div style={{ padding: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Skeleton width="120px" height="24px" />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="32px" height="32px" borderRadius="8px" />
          <Skeleton width="32px" height="32px" borderRadius="8px" />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`header-${i}`} style={{ textAlign: 'center', padding: '8px' }}>
            <Skeleton width="24px" height="12px" style={{ margin: '0 auto' }} />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`day-${i}`}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Skeleton width="32px" height="32px" borderRadius="50%" />
          </div>
        ))}
      </div>
    </div>
  );
}
