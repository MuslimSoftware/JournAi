import type { SyncKeyset } from '../../types/sync';

const SYNC_KEY_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const DEFAULT_KDF_ITERATIONS = 310_000;

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is required for encrypted sync.');
  }
  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await getCrypto().subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return getCrypto().subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export function encodeKey(rawKey: Uint8Array): string {
  return bytesToBase64(rawKey);
}

export function decodeKey(encodedKey: string): Uint8Array {
  const bytes = base64ToBytes(encodedKey);
  if (bytes.byteLength !== SYNC_KEY_BYTES) {
    throw new Error('Invalid sync key length.');
  }
  return bytes;
}

export async function createSyncKeyset(passphrase: string): Promise<{ keyset: SyncKeyset; rawKeyB64: string }> {
  if (passphrase.trim().length < 12) {
    throw new Error('Sync passphrase must be at least 12 characters.');
  }

  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const rawKey = randomBytes(SYNC_KEY_BYTES);
  const wrappingKey = await deriveWrappingKey(passphrase, salt, DEFAULT_KDF_ITERATIONS);
  const wrappedKey = new Uint8Array(await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawKey
  ));

  return {
    rawKeyB64: encodeKey(rawKey),
    keyset: {
      schemaVersion: 1,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: DEFAULT_KDF_ITERATIONS,
      saltB64: bytesToBase64(salt),
      wrappedKeyB64: bytesToBase64(wrappedKey),
      ivB64: bytesToBase64(iv),
      createdAt: new Date().toISOString(),
    },
  };
}

export async function unlockSyncKeyset(keyset: SyncKeyset, passphrase: string): Promise<string> {
  const salt = base64ToBytes(keyset.saltB64);
  const iv = base64ToBytes(keyset.ivB64);
  const wrappedKey = base64ToBytes(keyset.wrappedKeyB64);
  const wrappingKey = await deriveWrappingKey(passphrase, salt, keyset.iterations);
  const rawKey = new Uint8Array(await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    wrappedKey
  ));

  return encodeKey(rawKey);
}

export async function encryptJsonPayload(rawKeyB64: string, value: unknown): Promise<{ ivB64: string; ciphertextB64: string; hash: string }> {
  const rawKey = decodeKey(rawKeyB64);
  const key = await importAesKey(rawKey);
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  ));
  const hashBytes = new Uint8Array(await getCrypto().subtle.digest('SHA-256', plaintext));

  return {
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(ciphertext),
    hash: bytesToBase64(hashBytes),
  };
}

export async function decryptJsonPayload<T>(rawKeyB64: string, ivB64: string, ciphertextB64: string): Promise<T> {
  const rawKey = decodeKey(rawKeyB64);
  const key = await importAesKey(rawKey);
  const plaintext = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivB64) },
    key,
    base64ToBytes(ciphertextB64)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function hashJsonPayload(value: unknown): Promise<string> {
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const hashBytes = new Uint8Array(await getCrypto().subtle.digest('SHA-256', plaintext));
  return bytesToBase64(hashBytes);
}
