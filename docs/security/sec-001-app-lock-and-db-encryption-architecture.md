# SEC-001: App Lock and Database Encryption Architecture

## Scope

This document defines a concrete security architecture for:

1. Password-based app unlock (`AuthGate`)
2. Database-at-rest encryption/decryption (`DatabaseLayer`)
3. Security settings UX (`SecuritySettings`)
4. Mandatory pre-change backups and restore (`BackupService`)

It is intentionally phase-based so we can ship safely without risking data loss.

## Current Baseline

- Database: SQLite via `tauri-plugin-sql` (`sqlite:journai.db`)
- API key storage: desktop keyring bridge exists (`src-tauri/src/secure_storage.rs`)
- Mobile secure storage bridge is currently a stub and returns unavailable

## Threat Model and Assumptions

### In scope

- Lost/stolen device where attacker can copy app data at rest
- Offline inspection of SQLite database files
- Accidental corruption during encryption migration

### Out of scope (for this phase)

- Fully compromised OS/runtime while app is unlocked
- Rooted/jailbroken devices bypassing platform keystores
- Hardware-level attacks and cold-boot memory attacks

### Security goals

- Require successful app unlock before any journal data is shown
- Keep journal database unreadable at rest without unlock material
- Prevent irreversible data loss during migration via mandatory backup/restore

## Encrypted SQLite Evaluation

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| SQLCipher | Mature, widely used, open source core, strong docs, predictable cross-platform support (desktop + iOS + Android), supports key rotation and KDF tuning | Integration requires replacing default SQLite linkage and controlled build setup | **Selected** |
| SQLite SEE | Official SQLite extension, clean upstream compatibility | Commercial license cost/constraints, fewer public examples for Tauri/mobile pipelines, less team familiarity | Not selected |

### Selection rationale

SQLCipher is selected because it best balances security maturity, cross-platform delivery risk, and maintainability for a Tauri v2 app that must run on desktop and mobile from one architecture.

## Component Architecture

### `SecuritySettings`

- Add a new Settings section to:
  - Enable/disable app lock
  - Set/change lock passphrase
  - Trigger and display mandatory pre-migration backup status
  - Show lock timeout setting (immediate, 1 minute, 5 minutes)
- Security-sensitive actions require current passphrase re-auth.

### `AuthGate`

- Introduce locked state at app bootstrap before routing to content pages.
- Unlock flow:
  1. User enters passphrase
  2. Passphrase is verified via Argon2id verifier
  3. Wrapped database key is decrypted in memory
  4. Decrypted key is handed to `DatabaseLayer` for connection open
- On lock timeout/app background, in-memory key material is cleared and gate reappears.

### `DatabaseLayer`

- Move encrypted DB access behind explicit open/close lifecycle:
  - `openEncryptedDb(unwrappedKey)`
  - `closeEncryptedDb()`
- SQLCipher connection must be keyed before first query.
- Reads/writes occur normally once keyed; encryption/decryption is transparent at the SQLite page layer.
- Migration path:
  1. Open plaintext DB
  2. Attach encrypted DB
  3. Export data to encrypted DB
  4. Integrity + row-count verification
  5. Atomic file swap only after verification succeeds

### `BackupService`

- Mandatory preflight gate for any encryption or schema migration:
  - Migration is blocked unless backup succeeds.
- Script implementation added in this story:
  - `scripts/security/backup_db.sh`
  - `scripts/security/restore_db.sh`
  - `scripts/security/validate_backup_restore.sh`
- Backups include DB + WAL/SHM (if present), SHA-256 verification, and `PRAGMA quick_check`.

## Key Derivation and Key Storage Strategy

### Key derivation

- Use `Argon2id` for passphrase-based derivation with persisted parameters:
  - Desktop target: memory 64 MiB, iterations 3, parallelism 1
  - Mobile target: memory 32 MiB, iterations 3, parallelism 1
- Store random 16-byte salt and Argon2 parameters with encrypted key metadata.

### Key hierarchy

- `DEK` (data encryption key): random 32-byte key used to open SQLCipher DB.
- `KEK` (key encryption key): derived from user passphrase via Argon2id.
- Persist only wrapped/encrypted DEK; never persist plaintext DEK.

### Storage by platform

- Desktop:
  - Wrapped DEK metadata in app data directory (`security/keyset.json`)
  - Optional keyring-backed secret for device binding using existing secure storage bridge
- Mobile:
  - Wrapped DEK metadata in app-private storage
  - Device-bound secret material in iOS Keychain / Android Keystore bridge

## Phased Rollout Plan

1. Phase 0 (this story): architecture + backup/restore tooling + validation evidence
2. Phase 1: `SecuritySettings` UI and passphrase setup/update flows
3. Phase 2: `AuthGate` lock screen + lifecycle lock/unlock behavior
4. Phase 3: SQLCipher integration and migration from plaintext DB
5. Phase 4: hardening, telemetry, and failure recovery UX

## Migration Safety Checks

All checks are required before marking migration complete:

1. Backup exists and verification passed (`sha256`, `quick_check`)
2. Encrypted DB export completed without SQL errors
3. Table counts match pre/post migration
4. Spot-check queries on entries/chats/todos succeed
5. App restart opens encrypted DB with correct key
6. Restore drill from produced backup succeeds
7. If any check fails, rollback to backup and keep app in read-only safe mode

## Validation Evidence

Execution evidence for desktop + mobile backup/restore scenarios is in:

- `docs/security/sec-001-backup-validation.md`
