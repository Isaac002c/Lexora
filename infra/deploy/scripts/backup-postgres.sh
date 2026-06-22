#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/srv/chronostek/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

docker compose --env-file .env.production -f compose.production.yaml exec -T postgres \
  pg_dump --format=custom --no-owner --username "$POSTGRES_USER" "$POSTGRES_DB" \
  > "$BACKUP_DIR/chronostek-$STAMP.dump"

find "$BACKUP_DIR" -type f -name 'chronostek-*.dump' -mtime "+$RETENTION_DAYS" -delete
