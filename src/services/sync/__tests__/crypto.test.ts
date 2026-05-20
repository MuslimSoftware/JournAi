import { describe, expect, it } from 'vitest';
import {
  createSyncKeyset,
  decryptJsonPayload,
  encryptJsonPayload,
  unlockSyncKeyset,
} from '../crypto';

describe('sync crypto', () => {
  it('wraps and unlocks a sync key with a passphrase', async () => {
    const { keyset, rawKeyB64 } = await createSyncKeyset('correct horse battery staple');

    const unlocked = await unlockSyncKeyset(keyset, 'correct horse battery staple');

    expect(unlocked).toBe(rawKeyB64);
  });

  it('encrypts and decrypts JSON payloads', async () => {
    const { rawKeyB64 } = await createSyncKeyset('correct horse battery staple');
    const payload = {
      id: 'entry-1',
      date: '2026-05-01',
      content: 'private journal text',
    };

    const encrypted = await encryptJsonPayload(rawKeyB64, payload);
    const decrypted = await decryptJsonPayload<typeof payload>(
      rawKeyB64,
      encrypted.ivB64,
      encrypted.ciphertextB64
    );

    expect(encrypted.ciphertextB64).not.toContain(payload.content);
    expect(decrypted).toEqual(payload);
  });

  it('rejects the wrong passphrase', async () => {
    const { keyset } = await createSyncKeyset('correct horse battery staple');

    await expect(unlockSyncKeyset(keyset, 'wrong horse battery staple')).rejects.toThrow();
  });
});
