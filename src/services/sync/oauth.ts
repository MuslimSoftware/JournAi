import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import type { AppPlatform } from './platform';
import { getAppPlatform } from './platform';
import { getProviderAuth, saveProviderAuth } from './settings';
import type { SyncAuthState, SyncProvider } from '../../types/sync';

type SyncOAuthProvider = 'google_drive' | 'dropbox' | 'onedrive';

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientIdMobileEnv?: string;
  clientSecretEnv?: string;
  redirectUriEnv: string;
  scopes: string[];
  extraAuthorizeParams?: Record<string, string>;
  includeScopeInTokenRequest?: boolean;
}

interface OAuthCallbackPayload {
  state: string;
  code?: string | null;
  error?: string | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

const LOOPBACK_REDIRECT_URI = 'http://127.0.0.1:53683/sync/oauth/callback';
const DEFAULT_DEEP_LINK_REDIRECT_URI = 'journai://sync/oauth/callback';
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

const OAUTH_CONFIGS: Record<SyncOAuthProvider, OAuthConfig> = {
  google_drive: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'VITE_GOOGLE_DRIVE_CLIENT_ID',
    clientIdMobileEnv: 'VITE_GOOGLE_DRIVE_IOS_CLIENT_ID',
    clientSecretEnv: 'VITE_GOOGLE_DRIVE_CLIENT_SECRET',
    redirectUriEnv: 'VITE_GOOGLE_DRIVE_REDIRECT_URI',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.appdata',
    ],
    extraAuthorizeParams: {
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    },
  },
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientIdEnv: 'VITE_DROPBOX_CLIENT_ID',
    clientSecretEnv: 'VITE_DROPBOX_CLIENT_SECRET',
    redirectUriEnv: 'VITE_DROPBOX_REDIRECT_URI',
    scopes: [
      'account_info.read',
      'files.metadata.read',
      'files.content.read',
      'files.content.write',
    ],
    extraAuthorizeParams: {
      token_access_type: 'offline',
    },
  },
  onedrive: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientIdEnv: 'VITE_ONEDRIVE_CLIENT_ID',
    clientSecretEnv: 'VITE_ONEDRIVE_CLIENT_SECRET',
    redirectUriEnv: 'VITE_ONEDRIVE_REDIRECT_URI',
    scopes: [
      'offline_access',
      'User.Read',
      'Files.ReadWrite.AppFolder',
    ],
    extraAuthorizeParams: {
      response_mode: 'query',
    },
    includeScopeInTokenRequest: true,
  },
};

function isOAuthProvider(provider: string): provider is SyncOAuthProvider {
  return provider === 'google_drive' || provider === 'dropbox' || provider === 'onedrive';
}

function envValue(name: string): string {
  return ((import.meta.env as Record<string, string | undefined>)[name] ?? '').trim();
}

function oauthConfig(provider: SyncOAuthProvider): OAuthConfig {
  return OAUTH_CONFIGS[provider];
}

function providerLabel(provider: SyncOAuthProvider): string {
  switch (provider) {
    case 'google_drive':
      return 'Google Drive';
    case 'dropbox':
      return 'Dropbox';
    case 'onedrive':
      return 'OneDrive';
    default:
      provider satisfies never;
      return 'Cloud provider';
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return base64Url(new Uint8Array(digest));
}

function expiresAtFromSeconds(expiresIn?: number): string | undefined {
  if (!expiresIn) {
    return undefined;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function isExpiring(auth: SyncAuthState): boolean {
  if (!auth.expiresAt) {
    return false;
  }

  return Date.parse(auth.expiresAt) <= Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

function isMobileRedirectPlatform(platform: AppPlatform): boolean {
  return platform === 'ios' || platform === 'android';
}

function reverseClientIdScheme(clientId: string): string {
  return clientId.split('.').reverse().join('.');
}

function mobileRedirectUri(provider: SyncOAuthProvider): string {
  const { clientIdMobileEnv } = oauthConfig(provider);
  if (clientIdMobileEnv) {
    const mobileClientId = envValue(clientIdMobileEnv);
    if (mobileClientId) {
      return `${reverseClientIdScheme(mobileClientId)}:/oauth2redirect`;
    }
  }
  return DEFAULT_DEEP_LINK_REDIRECT_URI;
}

function getClientIdForPlatform(provider: SyncOAuthProvider, platform: AppPlatform): string | null {
  const config = oauthConfig(provider);
  if (isMobileRedirectPlatform(platform) && config.clientIdMobileEnv) {
    const mobileId = envValue(config.clientIdMobileEnv);
    if (mobileId) return mobileId;
  }
  return envValue(config.clientIdEnv) || null;
}

function isMobileClientId(provider: SyncOAuthProvider, clientId: string): boolean {
  const config = oauthConfig(provider);
  if (!config.clientIdMobileEnv) return false;
  const mobileId = envValue(config.clientIdMobileEnv);
  return Boolean(mobileId) && mobileId === clientId;
}

function getRedirectUri(provider: SyncOAuthProvider, platform: AppPlatform): string {
  const config = oauthConfig(provider);
  const configured = envValue(config.redirectUriEnv);
  if (configured) {
    return configured;
  }

  return isMobileRedirectPlatform(platform) ? mobileRedirectUri(provider) : LOOPBACK_REDIRECT_URI;
}

function isLoopbackRedirectUri(redirectUri: string): boolean {
  try {
    const parsed = new URL(redirectUri);
    return parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function validateLoopbackRedirectUri(redirectUri: string): void {
  const parsed = new URL(redirectUri);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '53683' || parsed.pathname !== '/sync/oauth/callback') {
    throw new Error(`Desktop OAuth redirect URI must be ${LOOPBACK_REDIRECT_URI}.`);
  }
}

function parseOAuthCallbackUrl(value: string): OAuthCallbackPayload | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const code = parsed.searchParams.get('code');
  const error = parsed.searchParams.get('error') ?? parsed.searchParams.get('error_description');
  const state = parsed.searchParams.get('state');
  if (!state || (!code && !error)) {
    return null;
  }

  return { state, code, error };
}

function waitForDeepLinkCallback(expectedState: string): Promise<OAuthCallbackPayload> {
  return new Promise((resolve, reject) => {
    let unlisten: (() => void) | null = null;
    let settled = false;
    const timeout = window.setTimeout(() => {
      finish(new Error('Timed out waiting for OAuth redirect.'), true);
    }, 300_000);

    const finish = (value: OAuthCallbackPayload | Error, rejected = false) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      unlisten?.();
      if (rejected) {
        reject(value);
      } else {
        resolve(value as OAuthCallbackPayload);
      }
    };

    const inspectUrls = (urls: string[] | null) => {
      for (const url of urls ?? []) {
        const callback = parseOAuthCallbackUrl(url);
        if (!callback) {
          continue;
        }
        if (callback.state !== expectedState) {
          finish(new Error('OAuth callback state mismatch.'), true);
          return;
        }
        finish(callback);
        return;
      }
    };

    void onOpenUrl(inspectUrls)
      .then((nextUnlisten) => {
        unlisten = nextUnlisten;
        return getCurrent();
      })
      .then((urls) => {
        inspectUrls(urls);
      })
      .catch((error) => {
        finish(error instanceof Error ? error : new Error('Failed to listen for OAuth redirect.'), true);
      });
  });
}

function waitForLoopbackCallback(expectedState: string): Promise<OAuthCallbackPayload> {
  return invoke<OAuthCallbackPayload>('sync_oauth_wait_for_loopback_callback', {
    expectedState,
    timeoutSeconds: 300,
  });
}

function buildAuthorizationUrl(
  provider: SyncOAuthProvider,
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const config = oauthConfig(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...config.extraAuthorizeParams,
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function exchangeAuthorizationCode(
  provider: SyncOAuthProvider,
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const config = oauthConfig(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  });

  // iOS/Android clients have no client secret; only include it for desktop clients
  if (!isMobileClientId(provider, clientId)) {
    const clientSecret = getOAuthClientSecret(provider);
    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }
  }

  if (config.includeScopeInTokenRequest) {
    params.set('scope', config.scopes.join(' '));
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const token = await response.json() as TokenResponse;
  if (!response.ok || token.error) {
    throw new Error(token.error_description ?? token.error ?? `${providerLabel(provider)} OAuth token exchange failed.`);
  }

  return token;
}

async function refreshAccessToken(provider: SyncOAuthProvider, auth: SyncAuthState): Promise<SyncAuthState> {
  if (!auth.refreshToken) {
    throw new Error(`Connect ${providerLabel(provider)} again to refresh sync access.`);
  }

  const config = oauthConfig(provider);
  const platform = await getAppPlatform();
  const clientId = getClientIdForPlatform(provider, platform);
  if (!clientId) {
    throw new Error(`Set ${config.clientIdEnv} to refresh ${providerLabel(provider)} sync access.`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: auth.refreshToken,
    grant_type: 'refresh_token',
  });

  // iOS/Android clients have no client secret; only include it for desktop clients
  if (!isMobileClientId(provider, clientId)) {
    const clientSecret = getOAuthClientSecret(provider);
    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const token = await response.json() as TokenResponse;
  if (!response.ok || token.error || !token.access_token) {
    throw new Error(token.error_description ?? token.error ?? `Failed to refresh ${providerLabel(provider)} sync access.`);
  }

  const refreshed: SyncAuthState = {
    ...auth,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? auth.refreshToken,
    expiresAt: expiresAtFromSeconds(token.expires_in),
    tokenType: token.token_type ?? auth.tokenType,
  };
  await saveProviderAuth(provider as SyncProvider, refreshed);
  return refreshed;
}

async function getGoogleAccountLabel(accessToken: string): Promise<string | undefined> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    return undefined;
  }
  const body = await response.json() as { email?: string; name?: string };
  return body.email ?? body.name;
}

async function getDropboxAccountLabel(accessToken: string): Promise<string | undefined> {
  const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: 'null',
  });
  if (!response.ok) {
    return undefined;
  }
  const body = await response.json() as { email?: string; name?: { display_name?: string } };
  return body.email ?? body.name?.display_name;
}

async function getOneDriveAccountLabel(accessToken: string): Promise<string | undefined> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName,mail', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    return undefined;
  }
  const body = await response.json() as { displayName?: string; userPrincipalName?: string; mail?: string };
  return body.mail ?? body.userPrincipalName ?? body.displayName;
}

async function getAccountLabel(provider: SyncOAuthProvider, accessToken: string): Promise<string | undefined> {
  try {
    switch (provider) {
      case 'google_drive':
        return await getGoogleAccountLabel(accessToken);
      case 'dropbox':
        return await getDropboxAccountLabel(accessToken);
      case 'onedrive':
        return await getOneDriveAccountLabel(accessToken);
      default:
        provider satisfies never;
        return undefined;
    }
  } catch {
    return undefined;
  }
}

export function getOAuthClientId(provider: SyncProvider): string | null {
  if (!isOAuthProvider(provider)) {
    return null;
  }

  return envValue(oauthConfig(provider).clientIdEnv) || null;
}

export function getOAuthClientIdEnv(provider: SyncProvider): string | null {
  if (!isOAuthProvider(provider)) {
    return null;
  }

  return oauthConfig(provider).clientIdEnv;
}

function getOAuthClientSecret(provider: SyncOAuthProvider): string | null {
  const { clientSecretEnv } = oauthConfig(provider);
  return clientSecretEnv ? envValue(clientSecretEnv) || null : null;
}

export function isOAuthConfigured(provider: SyncProvider): boolean {
  return Boolean(getOAuthClientId(provider));
}

export async function connectProviderWithOAuth(provider: SyncProvider): Promise<SyncAuthState> {
  if (!isOAuthProvider(provider)) {
    throw new Error('This provider does not use OAuth.');
  }

  const platform = await getAppPlatform();
  const clientId = getClientIdForPlatform(provider, platform);
  if (!clientId) {
    throw new Error(`Set ${oauthConfig(provider).clientIdEnv} before connecting ${providerLabel(provider)}.`);
  }
  const redirectUri = getRedirectUri(provider, platform);
  const loopback = isLoopbackRedirectUri(redirectUri);
  if (loopback) {
    validateLoopbackRedirectUri(redirectUri);
  }

  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const authorizationUrl = buildAuthorizationUrl(provider, clientId, redirectUri, state, codeChallenge);
  const callbackPromise = loopback ? waitForLoopbackCallback(state) : waitForDeepLinkCallback(state);

  if (loopback) {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  await openUrl(authorizationUrl);

  const callback = await callbackPromise;
  if (callback.error) {
    throw new Error(callback.error);
  }
  if (!callback.code) {
    throw new Error(`${providerLabel(provider)} did not return an OAuth code.`);
  }

  const token = await exchangeAuthorizationCode(provider, clientId, redirectUri, callback.code, codeVerifier);
  if (!token.access_token) {
    throw new Error(`${providerLabel(provider)} did not return an access token.`);
  }

  const accountLabel = await getAccountLabel(provider, token.access_token);
  const auth: SyncAuthState = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: expiresAtFromSeconds(token.expires_in),
    tokenType: token.token_type,
    accountLabel,
  };
  await saveProviderAuth(provider, auth);
  return auth;
}

export async function getValidProviderAuth(provider: SyncProvider): Promise<SyncAuthState | null> {
  const auth = await getProviderAuth(provider);
  if (!auth?.accessToken) {
    return null;
  }

  if (!isOAuthProvider(provider) || !isExpiring(auth)) {
    return auth;
  }

  return refreshAccessToken(provider, auth);
}
