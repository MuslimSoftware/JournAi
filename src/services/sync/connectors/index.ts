import type { SyncConnector, SyncProvider, SyncProviderProfile } from '../../../types/sync';
import { createDropboxConnector } from './dropbox';
import { createGoogleDriveConnector } from './googleDrive';
import { createICloudConnector } from './iCloud';
import { createOneDriveConnector } from './oneDrive';
import { isAppleSyncPlatform } from '../platform';

export const SYNC_PROVIDER_PROFILES: SyncProviderProfile[] = [
  {
    provider: 'google_drive',
    label: 'Google Drive',
    description: 'Stores encrypted JournAi files in Drive app data.',
    authLabel: 'Connect with Google Drive',
    oauthClientIdEnv: 'VITE_GOOGLE_DRIVE_CLIENT_ID',
  },
  {
    provider: 'dropbox',
    label: 'Dropbox',
    description: 'Stores encrypted JournAi files in the app folder.',
    authLabel: 'Connect with Dropbox',
    oauthClientIdEnv: 'VITE_DROPBOX_CLIENT_ID',
  },
  {
    provider: 'onedrive',
    label: 'OneDrive',
    description: 'Stores encrypted JournAi files in the Microsoft app folder.',
    authLabel: 'Connect with OneDrive',
    oauthClientIdEnv: 'VITE_ONEDRIVE_CLIENT_ID',
  },
  {
    provider: 'icloud',
    label: 'iCloud',
    description: 'Uses the user private iCloud container once CloudKit is configured.',
    authLabel: 'iCloud account',
    configurationHint: 'Requires Apple CloudKit entitlements in the native app target.',
  },
];

export function getProviderProfile(provider: SyncProvider): SyncProviderProfile {
  return SYNC_PROVIDER_PROFILES.find((profile) => profile.provider === provider) ?? SYNC_PROVIDER_PROFILES[0];
}

export async function getAvailableProviderProfiles(): Promise<SyncProviderProfile[]> {
  const showICloud = await isAppleSyncPlatform();
  return SYNC_PROVIDER_PROFILES.filter((profile) => profile.provider !== 'icloud' || showICloud);
}

export function createSyncConnector(provider: SyncProvider): SyncConnector {
  switch (provider) {
    case 'google_drive':
      return createGoogleDriveConnector();
    case 'dropbox':
      return createDropboxConnector();
    case 'onedrive':
      return createOneDriveConnector();
    case 'icloud':
      return createICloudConnector();
    default:
      provider satisfies never;
      return createGoogleDriveConnector();
  }
}
