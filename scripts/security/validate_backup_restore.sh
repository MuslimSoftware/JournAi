#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_script="$script_dir/backup_db.sh"
restore_script="$script_dir/restore_db.sh"

if [[ ! -f "$backup_script" || ! -f "$restore_script" ]]; then
  echo "Missing backup/restore scripts in $script_dir" >&2
  exit 1
fi

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/journai-sec-001.XXXXXX")"
trap 'rm -rf "$tmp_root"' EXIT

run_scenario() {
  local scenario="$1"
  local db_path="$2"
  local backup_root="$tmp_root/backups/$scenario"
  local expected_seed="$scenario-seed-row"

  mkdir -p "$(dirname "$db_path")" "$backup_root"

  sqlite3 "$db_path" <<EOF
CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL
);
INSERT INTO entries (id, content) VALUES ('1', '$expected_seed');
EOF

  local source_checksum
  source_checksum="$(shasum -a 256 "$db_path" | awk '{ print $1 }')"

  local backup_output
  backup_output="$("$backup_script" \
    --db "$db_path" \
    --backup-root "$backup_root" \
    --reason "pre-encryption-migration-$scenario")"

  local backup_dir
  backup_dir="$(echo "$backup_output" | awk -F= '/^backup_dir=/{print $2}')"
  if [[ -z "$backup_dir" ]]; then
    echo "Failed to capture backup_dir for scenario $scenario" >&2
    exit 1
  fi

  sqlite3 "$db_path" "INSERT INTO entries (id, content) VALUES ('2', 'mutated-before-restore');"

  "$restore_script" --backup-dir "$backup_dir" --target-db "$db_path" --allow-overwrite >/dev/null

  local row_count
  row_count="$(sqlite3 "$db_path" "SELECT COUNT(*) FROM entries;" | tr -d '\r\n')"
  local restored_seed
  restored_seed="$(sqlite3 "$db_path" "SELECT content FROM entries WHERE id = '1';" | tr -d '\r\n')"
  local restored_checksum
  restored_checksum="$(shasum -a 256 "$db_path" | awk '{ print $1 }')"

  if [[ "$row_count" != "1" ]]; then
    echo "Scenario $scenario failed: expected 1 row after restore, got $row_count" >&2
    exit 1
  fi
  if [[ "$restored_seed" != "$expected_seed" ]]; then
    echo "Scenario $scenario failed: restored seed mismatch" >&2
    exit 1
  fi
  if [[ "$restored_checksum" != "$source_checksum" ]]; then
    echo "Scenario $scenario failed: checksum mismatch after restore" >&2
    exit 1
  fi

  local quick_check
  quick_check="$(sqlite3 "$db_path" "PRAGMA quick_check;" | tr -d '\r\n')"
  if [[ "$quick_check" != "ok" ]]; then
    echo "Scenario $scenario failed: quick_check=$quick_check" >&2
    exit 1
  fi

  echo "scenario=$scenario"
  echo "db_path=$db_path"
  echo "backup_dir=$backup_dir"
  echo "row_count_after_restore=$row_count"
  echo "quick_check=$quick_check"
  echo "sha256=$restored_checksum"
  echo "---"
}

desktop_db="$tmp_root/desktop/Library/Application Support/com.journai.app/journai.db"
mobile_db="$tmp_root/mobile/data/user/0/com.journai.app/files/databases/journai.db"

run_scenario "desktop" "$desktop_db"
run_scenario "mobile" "$mobile_db"

echo "all_scenarios=passed"
