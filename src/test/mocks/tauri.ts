import { vi } from 'vitest';

export const mockInvoke = vi.fn();

export function setupInvokeMock(handlers: Record<string, (args: unknown) => unknown>) {
  mockInvoke.mockImplementation((cmd: string, args: unknown) => {
    const handler = handlers[cmd];
    if (handler) return Promise.resolve(handler(args));
    return Promise.reject(new Error(`Unknown command: ${cmd}`));
  });
}

export function resetInvokeMock() {
  mockInvoke.mockReset();
}

export const invoke = mockInvoke;

export function mockWindows(current: string, ...others: string[]) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: current }, windows: [current, ...others].map(l => ({ label: l })) },
  };
}

export function clearMocks() {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  mockInvoke.mockReset();
}
