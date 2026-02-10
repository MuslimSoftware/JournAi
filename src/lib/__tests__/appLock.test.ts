import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('appLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns default unlocked state when command is unavailable', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('command not found'));

    const { getAppLockStatus } = await import('../appLock');
    await expect(getAppLockStatus()).resolves.toEqual({ configured: false, unlocked: true });
  });

  it('configures app lock with passphrase', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    const { configureAppLock } = await import('../appLock');
    await configureAppLock('super-secret');

    expect(mockInvoke).toHaveBeenCalledWith('app_lock_configure', { passphrase: 'super-secret' });
  });

  it('locks and unlocks app lock state', async () => {
    mockInvoke
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(undefined);

    const { unlockAppLock, lockApp } = await import('../appLock');
    await expect(unlockAppLock('test-passphrase')).resolves.toBe(true);
    await lockApp();

    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'app_lock_unlock', { passphrase: 'test-passphrase' });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'app_lock_lock');
  });
});
