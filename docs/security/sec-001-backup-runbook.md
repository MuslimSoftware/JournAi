# SEC-001 Backup Runbook (Mandatory Pre-Migration Step)

Run this before any database encryption migration or schema operation that can affect data durability.

## 1. Create backup

```bash
scripts/security/backup_db.sh \
  --db "/path/to/journai.db" \
  --backup-root "/path/to/backup-root" \
  --reason "pre-encryption-migration"
```

Expected result:

- Backup directory created under `--backup-root`
- `manifest.txt` generated
- SHA-256 copy verification passed
- `PRAGMA quick_check` returned `ok`

## 2. Perform migration/change

Only proceed if Step 1 succeeds.

## 3. Rollback/restore if needed

```bash
scripts/security/restore_db.sh \
  --backup-dir "/path/to/backup-root/<timestamp>-pre-encryption-migration" \
  --target-db "/path/to/journai.db" \
  --allow-overwrite
```

Expected result:

- Target DB restored from backup
- Pre-restore snapshot created when overwriting existing DB
- SHA-256 restore verification passed
- `PRAGMA quick_check` returned `ok`

## 4. Scenario validation command

```bash
scripts/security/validate_backup_restore.sh
```

This simulates one desktop path and one mobile path and verifies restore integrity.
