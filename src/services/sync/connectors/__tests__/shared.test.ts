import { describe, expect, it } from 'vitest';
import { fileNameToRemotePath, remotePathToFileName, requireOk } from '../shared';

describe('sync connector shared path mapping', () => {
  it('round-trips remote paths through provider-safe file names', () => {
    const path = 'records/entries/entry-123.json';

    const fileName = remotePathToFileName(path);

    expect(fileName).toMatch(/^journai-sync-/);
    expect(fileNameToRemotePath(fileName)).toBe(path);
  });

  it('rejects unrelated file names', () => {
    expect(fileNameToRemotePath('notes.json')).toBeNull();
  });

  it('summarizes disabled Google API responses', async () => {
    const response = new Response(JSON.stringify({
      error: {
        code: 403,
        message: 'Google Drive API has not been used before or it is disabled.',
        status: 'PERMISSION_DENIED',
        details: [
          {
            reason: 'SERVICE_DISABLED',
            metadata: {
              serviceTitle: 'Google Drive API',
              activationUrl: 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=159585421383',
              consumer: 'projects/159585421383',
            },
          },
        ],
      },
    }), { status: 403, statusText: 'Forbidden' });

    await expect(requireOk(response, 'Google Drive file lookup')).rejects.toThrow(
      'Google Drive file lookup failed (403): Google Drive API is disabled for Google Cloud project 159585421383.'
    );
  });
});
