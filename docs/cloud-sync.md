# Cloud Sync

This document describes the current JournAi cloud sync implementation. Sync is local-first: journal data is stored in the local SQLCipher database and optionally copied to a user-owned cloud provider as encrypted JSON objects.

## Supported Surface

- Visible provider: Google Drive.
- Implemented connector scaffolding: Google Drive, Dropbox, OneDrive, iCloud placeholder.
- Synced collections: `entries`, `todos`, and `sticky_notes`.
- Not synced: chats, chat messages, embeddings, analytics, app settings, API keys, and app lock state.

## Main Files

- `src/components/settings/SyncCard.tsx`: Settings UI for provider connection, passphrase setup, manual sync, and conflict entry point.
- `src/contexts/SyncContext.tsx`: Global sync state, startup sync, debounced local-change sync, periodic sync, keyset setup state, and conflict resolution actions.
- `src/services/sync/oauth.ts`: OAuth PKCE flow, token refresh, account labels, loopback and deep-link callback handling.
- `src/services/sync/engine.ts`: Pull-then-push sync engine.
- `src/services/sync/localRepository.ts`: Local sync metadata, dirty/deleted markers, remote apply, and conflict persistence.
- `src/services/sync/crypto.ts`: Passphrase wrapping and AES-GCM payload encryption.
- `src/services/sync/connectors/googleDrive.ts`: Google Drive `appDataFolder` object operations.
- `src-tauri/src/lib.rs`: Desktop OAuth loopback listener and sync metadata database migration.

## OAuth

Google Drive uses OAuth authorization code flow with PKCE. The renderer stores provider auth in OS secure storage through `secureStorage`.

Required environment:

```bash
VITE_GOOGLE_DRIVE_CLIENT_ID=<oauth-client-id>
```

Optional redirect override:

```bash
VITE_GOOGLE_DRIVE_REDIRECT_URI=<registered-redirect-uri>
```

Default redirects:

- Desktop: `http://127.0.0.1:53683/sync/oauth/callback`
- Mobile: `journai://sync/oauth/callback`

The app does not use a bundled Google OAuth client secret. The client must be configured for a native/installed-app PKCE flow.

Scopes:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/drive.appdata`

Desktop OAuth starts a local loopback listener in Tauri. Mobile OAuth listens for the configured `journai://` deep link through `@tauri-apps/plugin-deep-link`.

## Encryption Model

The user creates or unlocks a private sync passphrase. This passphrase is not uploaded.

Key setup:

1. `createSyncKeyset(passphrase)` creates a random 256-bit raw sync key.
2. PBKDF2-SHA-256 derives a wrapping key from the passphrase.
3. AES-256-GCM wraps the raw sync key into a `SyncKeyset`.
4. The raw key and wrapped keyset are stored locally in OS secure storage.
5. The wrapped keyset is uploaded to the provider at `manifest/sync-key.json`.

Payload encryption:

- Each synced record is serialized to JSON.
- The JSON plaintext is encrypted with AES-256-GCM using the raw sync key.
- Each record envelope stores IV, ciphertext, payload hash, collection, record ID, version, updated timestamp, deleted flag, and device ID.

Remote keyset safety:

- If the provider already has `manifest/sync-key.json`, a new device must unlock that remote keyset.
- Creating a different local keyset is blocked while a remote keyset exists.
- Sync aborts if the local keyset differs from the remote keyset.

## Remote Object Layout

Logical paths:

```text
manifest/sync-key.json
records/entries/<entry-id>.json
records/todos/<todo-id>.json
records/sticky_notes/<note-id>.json
```

Google Drive stores these in `appDataFolder`. Because Drive `appDataFolder` does not have normal nested paths, logical paths are converted into provider-safe filenames by `remotePathToFileName()`:

```text
journai-sync-<base64url(logical-path)>.json
```

The connector lists files whose names start with `journai-sync-`, decodes them back to logical paths, and keeps the newest object if Drive returns duplicate filenames.

## Local Metadata

Migration 19 creates two sync tables.

`sync_state` tracks one row per synced record:

- `collection`
- `record_id`
- `dirty`: local change needs upload
- `deleted`: local tombstone needs upload or remote tombstone was applied
- `local_version`: increments on local edits/deletes
- `remote_version`: newest remote version known locally
- `updated_at`: local or remote record timestamp used for ordering/conflict checks
- `synced_at`: provider modified timestamp from the last accepted sync
- `remote_updated_at`
- `payload_hash`

`sync_conflicts` stores unresolved local/remote payload pairs:

- `collection`
- `record_id`
- `local_payload`
- `remote_payload`
- `created_at`
- `resolved`

Local writes call `markRecordDirty()` or `markRecordDeleted()` from the entries, todo, and sticky note services. Existing records without sync state are initialized as dirty before the first sync, after keyset compatibility is confirmed.

## Sync Flow

`syncNow()` runs a single global sync at a time.

1. Load sync settings and provider.
2. Verify provider connection.
3. Load raw sync key and local keyset.
4. Verify or upload the remote keyset.
5. Initialize missing local sync state rows as dirty.
6. List remote objects.
7. Pull remote records.
8. Query dirty local records that do not have unresolved conflicts.
9. Push dirty local records.
10. Save the app-level last synced timestamp.

The engine pulls before pushing so it can detect remote edits before overwriting them.

## Pull Behavior

For each remote record envelope:

1. Skip if local state already knows an equal or newer remote version and the record is not dirty.
2. Decrypt the remote payload.
3. If the local record is dirty, save a conflict.
4. If there is no local dirty state, apply the remote upsert or remote tombstone.
5. Update `sync_state` to reflect the remote version and provider modified timestamp.

Remote apply resets derived entry fields such as processing status and content hash so downstream analysis can re-run.

## Push Behavior

Dirty local records are selected from `sync_state` with a guard that excludes records with unresolved conflicts.

Each upload writes an encrypted envelope to:

```text
records/<collection>/<record-id>.json
```

After upload, `markRecordSynced()` clears `dirty` only if `local_version` still matches the version that was uploaded. If a user edits the same record while upload is in flight, the newer local version remains dirty for the next sync. Deletion uploads preserve tombstone state.

## Conflict Handling

A conflict is created when a remote record arrives while the same local record is dirty.

Conflict rules:

- An unresolved conflict blocks pushing that same record.
- Duplicate unresolved conflict rows for the same collection and record are not created.
- The Settings UI shows unresolved conflicts and opens `ConflictResolutionModal`.
- Choosing the cloud version applies the remote payload or remote deletion locally.
- Choosing the local version keeps the local row dirty and bumps `local_version` so it uploads on the next sync.
- After resolving a conflict, the context triggers a background sync to propagate the selected version.

## Automatic Sync

`SyncContext` triggers sync in three cases:

- On startup, if sync is enabled, a provider is connected, and the sync key is unlocked.
- After local dirty-record events, debounced by 15 seconds.
- Every 10 minutes while sync is configured and unlocked.

Manual sync is available from the Settings sync card.

## Security Notes

- Record contents are encrypted before upload.
- OAuth tokens and sync keys are stored through OS secure storage.
- The remote keyset is passphrase-wrapped and is not enough to decrypt records without the passphrase.
- Google Drive uses `appDataFolder`, so files are hidden from the user's normal Drive UI.
- The app does not write sync debug logs to plaintext files.

## iPhone Development Notes

The repo script for iPhone development is:

```bash
bun run tauri:dev:ios
```

This must be run on macOS with Xcode command line tools available. A Linux machine cannot deploy to an attached iPhone because the Tauri iOS pipeline depends on Xcode tooling such as `xcrun`.

On non-macOS hosts, the installed Tauri CLI may not expose the `ios` subcommand at all. That is expected; move the checkout to macOS for physical iPhone deployment.

The iPhone must be trusted, unlocked, and visible to Xcode. The app identifier is configured in `src-tauri/tauri.conf.json` as `com.younesbenketira.journai`.
