import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import MobileEntries from '../MobileEntries';

const {
  mockLoadMore,
  mockUseEntries,
  pullToRefreshContainerRef,
} = vi.hoisted(() => {
  return {
    mockLoadMore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    mockUseEntries: vi.fn(),
    pullToRefreshContainerRef: { current: null as HTMLDivElement | null },
  };
});

const entries = Array.from({ length: 40 }, (_, index) => ({
  id: `entry-${index + 1}`,
  date: '2026-02-01',
  preview: `Entry ${index + 1}`,
  content: `Content ${index + 1}`,
}));

vi.mock('../../../hooks/useEntries', () => ({
  useEntries: () => mockUseEntries(),
}));

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { primary: '#fff', secondary: '#f4f4f4' },
        text: { primary: '#111', secondary: '#333', muted: '#777', accent: '#0066ff' },
      },
      typography: {
        fontFamily: 'system-ui',
        fontSize: {
          h1: '1rem',
          h2: '1rem',
          h3: '1rem',
          h4: '1rem',
          h5: '1rem',
          h6: '1rem',
          p: '1rem',
          span: '1rem',
        },
        fontWeight: {
          h1: 600,
          h2: 600,
          h3: 600,
          h4: 600,
          h5: 600,
          h6: 600,
          p: 400,
          span: 400,
        },
        lineHeight: {
          h1: '1.2',
          h2: '1.2',
          h3: '1.2',
          h4: '1.2',
          h5: '1.2',
          h6: '1.2',
          p: '1.4',
          span: '1.4',
        },
      },
    },
  }),
}));

vi.mock('../../../contexts/EntryNavigationContext', () => ({
  useEntryNavigation: () => ({ target: null }),
}));

vi.mock('../../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullDistance: 0,
    isRefreshing: false,
    isPulling: false,
    canRelease: false,
    containerRef: pullToRefreshContainerRef,
    handlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('../../../hooks/useHaptics', () => ({
  hapticImpact: vi.fn(),
  hapticSelection: vi.fn(),
}));

vi.mock('../MobileEntryEditor', () => ({
  default: () => null,
}));

vi.mock('../MobilePageHeader', () => ({
  default: ({ title, rightContent }: { title: string; rightContent?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {rightContent}
    </header>
  ),
}));

vi.mock('../BottomSheet', () => ({
  default: () => null,
}));

describe('MobileEntries lazy load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pullToRefreshContainerRef.current = null;
    mockLoadMore.mockResolvedValue(undefined);
    mockUseEntries.mockReturnValue({
      entries,
      selectedEntry: null,
      selectedEntryId: null,
      isLoading: false,
      isResolvingTarget: false,
      isLoadingMore: false,
      hasMore: true,
      selectEntry: vi.fn(),
      createEntry: vi.fn().mockResolvedValue(entries[0]),
      updateEntry: vi.fn().mockResolvedValue(undefined),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      loadMore: mockLoadMore,
      refreshEntries: vi.fn().mockResolvedValue(entries),
    });
  });

  it('loads more when the user scrolls near the bottom of the list', () => {
    const { container } = render(<MobileEntries />);
    const list = container.querySelector('.mobile-entries-list');
    expect(list).toBeTruthy();

    mockLoadMore.mockClear();

    Object.defineProperty(list!, 'scrollHeight', { value: 1200, configurable: true });
    Object.defineProperty(list!, 'clientHeight', { value: 700, configurable: true });
    Object.defineProperty(list!, 'scrollTop', { value: 420, configurable: true });

    fireEvent.scroll(list!);

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load more while a search filter is active', () => {
    const { container } = render(<MobileEntries />);
    const list = container.querySelector('.mobile-entries-list');
    expect(list).toBeTruthy();

    mockLoadMore.mockClear();

    fireEvent.click(screen.getByLabelText('Search'));
    fireEvent.change(screen.getByPlaceholderText('Search entries...'), {
      target: { value: 'content' },
    });

    Object.defineProperty(list!, 'scrollHeight', { value: 1200, configurable: true });
    Object.defineProperty(list!, 'clientHeight', { value: 700, configurable: true });
    Object.defineProperty(list!, 'scrollTop', { value: 420, configurable: true });

    fireEvent.scroll(list!);

    expect(mockLoadMore).not.toHaveBeenCalled();
  });
});
