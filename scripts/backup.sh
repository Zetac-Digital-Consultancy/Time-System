#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
: "${BACKUP_DIR:?Set BACKUP_DIR to an absolute directory outside the database volume}"
[[ "$BACKUP_DIR" = /* ]] || { echo 'BACKUP_DIR must be absolute' >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
temporary=$(mktemp "$BACKUP_DIR/.zeittrack-XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$temporary"
test -s "$temporary"
docker compose exec -T db pg_restore --list < "$temporary" > /dev/null
destination="$BACKUP_DIR/zeittrack-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
mv -- "$temporary" "$destination"
echo "Backup created: $destination"
