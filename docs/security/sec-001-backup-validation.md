# SEC-001 Backup/Restore Validation Evidence

## Execution Metadata

- Date (UTC): 2026-02-08
- Command:

```bash
scripts/security/validate_backup_restore.sh
```

## Command Output

```text
scenario=desktop
db_path=/var/folders/5f/m3ttcs713lz58qg7dj0h4w880000gn/T//journai-sec-001.opb35x/desktop/Library/Application Support/com.journai.app/journai.db
backup_dir=/var/folders/5f/m3ttcs713lz58qg7dj0h4w880000gn/T//journai-sec-001.opb35x/backups/desktop/20260208T160230Z-pre-encryption-migration-desktop
row_count_after_restore=1
quick_check=ok
sha256=689197322e623160923827682b4960da41ea64a9a75ee0aeed9f85c199c211a3
---
scenario=mobile
db_path=/var/folders/5f/m3ttcs713lz58qg7dj0h4w880000gn/T//journai-sec-001.opb35x/mobile/data/user/0/com.journai.app/files/databases/journai.db
backup_dir=/var/folders/5f/m3ttcs713lz58qg7dj0h4w880000gn/T//journai-sec-001.opb35x/backups/mobile/20260208T160230Z-pre-encryption-migration-mobile
row_count_after_restore=1
quick_check=ok
sha256=5bb9e8ca89dcb41d32d952e90a4ad5156f87fe45a9bbab9aed0442874c6fe86c
---
all_scenarios=passed
```

## Validation Conclusion

- Desktop-style path restore: passed
- Mobile-style path restore: passed
- Backup + restore integrity checks (`sha256`, `PRAGMA quick_check`) succeeded in both scenarios
