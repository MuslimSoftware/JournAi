import { describe, expect, it } from 'vitest';
import {
  generateSyncKey,
  decryptJsonPayload,
  encryptJsonPayload,
} from '../crypto';

describe('sync crypto', () => {
  it('generates a sync key with a valid manifest', async () => {
    const { manifest, rawKeyB64 } = await generateSyncKey();

    expect(manifest.v).toBe(1);
    expect(manifest.keyB64).toBe(rawKeyB64);
    expect(manifest.createdAt).toBeTruthy();
    expect(rawKeyB64.length).toBeGreaterThan(0);
  });

  it('encrypts and decrypts JSON payloads', async () => {
    const { rawKeyB64 } = await generateSyncKey();
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

  it('rejects decryption with a different key', async () => {
    const { rawKeyB64: key1 } = await generateSyncKey();
    const { rawKeyB64: key2 } = await generateSyncKey();
    const payload = { content: 'secret' };

    const encrypted = await encryptJsonPayload(key1, payload);

    await expect(
      decryptJsonPayload(key2, encrypted.ivB64, encrypted.ciphertextB64)
    ).rejects.toThrow();
  });
});
