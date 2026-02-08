#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  backup_db.sh --db <db_path> --backup-root <dir> --reason <label>

Description:
  Creates a mandatory pre-change backup for the SQLite database, including
  WAL/SHM companions when present. Verifies checksum + SQLite quick_check.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

checksum_file() {
  shasum -a 256 "$1" | awk '{ print $1 }'
}

DB_PATH=""
BACKUP_ROOT=""
REASON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)
      DB_PATH="${2:-}"
      shift 2
      ;;
    --backup-root)
      BACKUP_ROOT="${2:-}"
      shift 2
      ;;
    --reason)
      REASON="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DB_PATH" || -z "$BACKUP_ROOT" || -z "$REASON" ]]; then
  echo "Error: --db, --backup-root, and --reason are required." >&2
  usage
  exit 1
fi

require_cmd sqlite3
require_cmd shasum

if [[ ! -f "$DB_PATH" ]]; then
  echo "Error: database file not found: $DB_PATH" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
safe_reason="$(echo "$REASON" | tr -c 'a-zA-Z0-9._-' '-' | sed -E 's/-+/-/g; s/^-+//; s/-+$//')"
if [[ -z "$safe_reason" ]]; then
  safe_reason="backup"
fi
backup_dir="$BACKUP_ROOT/${timestamp}-${safe_reason}"
db_base="$(basename "$DB_PATH")"
backup_db_path="$backup_dir/$db_base"

mkdir -p "$backup_dir"
cp "$DB_PATH" "$backup_db_path"

copied_wal=0
copied_shm=0
for suffix in -wal -shm; do
  source_companion="${DB_PATH}${suffix}"
  if [[ -f "$source_companion" ]]; then
    cp "$source_companion" "${backup_db_path}${suffix}"
    if [[ "$suffix" == "-wal" ]]; then
      copied_wal=1
    else
      copied_shm=1
    fi
  fi
done

source_checksum="$(checksum_file "$DB_PATH")"
backup_checksum="$(checksum_file "$backup_db_path")"
if [[ "$source_checksum" != "$backup_checksum" ]]; then
  echo "Error: checksum mismatch after backup copy." >&2
  exit 1
fi

integrity_result="$(sqlite3 "$backup_db_path" "PRAGMA quick_check;" | tr -d '\r\n')"
if [[ "$integrity_result" != "ok" ]]; then
  echo "Error: backup quick_check failed: $integrity_result" >&2
  exit 1
fi

manifest_path="$backup_dir/manifest.txt"
cat >"$manifest_path" <<EOF
created_at_utc=$timestamp
reason=$REASON
source_db=$DB_PATH
backup_db=$backup_db_path
backup_db_basename=$db_base
sha256=$backup_checksum
copied_wal=$copied_wal
copied_shm=$copied_shm
EOF

echo "backup_dir=$backup_dir"
echo "manifest=$manifest_path"
echo "backup_db=$backup_db_path"
echo "sha256=$backup_checksum"
