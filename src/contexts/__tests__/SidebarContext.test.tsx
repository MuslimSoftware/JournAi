import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../SidebarContext';

const mockStore = { get: vi.fn(), set: vi.fn() };
vi.mock('../../lib/store', () => ({
  appStore: { get: (...args: unknown[]) => mockStore.get(...args), set: (...args: unknown[]) => mockStore.set(...args) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

describe('SidebarContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
  });

  describe('Nav Sidebar Pin', () => {
    it('defaults to unpinned', async () => {
      const { result } = renderHook(() => useSidebar(), { wrapper });
      await waitFor(() => expect(result.current.navPinned).toBe(false));
    });

    it('toggles pin state', async () => {
      const { result } = renderHook(() => useSidebar(), { wrapper });
      await waitFor(() => expect(result.current.navPinned).toBe(false));

      act(() => result.current.toggleNavPin());
      expect(result.current.navPinned).toBe(true);

      act(() => result.current.toggleNavPin());
      expect(result.current.navPinned).toBe(false);
    });

    it('persists to store on toggle', async () => {
      const { result } = renderHook(() => useSidebar(), { wrapper });
      act(() => result.current.toggleNavPin());
      expect(mockStore.set).toHaveBeenCalledWith('nav-sidebar-pinned', true);
    });

    it('loads pinned state from store', async () => {
      mockStore.get.mockImplementation((key: string) =>
        key === 'nav-sidebar-pinned' ? Promise.resolve(true) : Promise.resolve(null)
      );
      const { result } = renderHook(() => useSidebar(), { wrapper });
      await waitFor(() => expect(result.current.navPinned).toBe(true));
    });
  });

  describe('Entries Sidebar Pin', () => {
    it('toggles entries pin independently', async () => {
      const { result } = renderHook(() => useSidebar(), { wrapper });
      await waitFor(() => expect(result.current.entriesPinned).toBe(false));

      act(() => result.current.toggleEntriesPin());
      expect(result.current.entriesPinned).toBe(true);
      expect(result.current.navPinned).toBe(false);
    });

    it('persists entries pin to correct key', async () => {
      const { result } = renderHook(() => useSidebar(), { wrapper });
      act(() => result.current.toggleEntriesPin());
      expect(mockStore.set).toHaveBeenCalledWith('entries-sidebar-pinned', true);
    });
  });
});
